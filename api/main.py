import os
import json
import uuid
import time
import io
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
import pandas as pd
from fastapi import FastAPI, UploadFile, File, Body, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from torch_geometric.nn import GATv2Conv
from torchdiffeq import odeint

# ─────────────────────────────────────────────────────────────────────────────
# PATHS — adjust these to wherever your files live locally
# ─────────────────────────────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join("model", "tgn_best.pt")
GRAPHS_DIR = os.path.join("graphs")

device = torch.device("cpu")

ZONE_CENTROIDS = {
    1:(18.5204,73.8567), 2:(18.5314,73.8446), 3:(18.5089,73.8741),
    4:(18.4968,73.8631), 5:(18.5421,73.8789), 6:(18.5612,73.8234),
    7:(18.4823,73.9012), 8:(18.5198,73.9156), 9:(18.4712,73.8345),
    10:(18.5534,73.8678),11:(18.4634,73.8912),12:(18.5023,73.8123),
    13:(18.5756,73.8456),14:(18.4891,73.8234),15:(18.5345,73.9234),
    16:(18.5067,73.7987),17:(18.4756,73.9345),18:(18.5589,73.8012),
    19:(18.4623,73.8678),20:(18.5234,73.8901),
}

# ─────────────────────────────────────────────────────────────────────────────
# MODEL DEFINITION — must match training exactly
# ─────────────────────────────────────────────────────────────────────────────
class SEIRDDerivative(nn.Module):
    def __init__(self, node_feat_dim=9, state_dim=5, hidden_dim=64):
        super().__init__()
        gat_in = state_dim + node_feat_dim   # 14
        self.gat1 = GATv2Conv(
            gat_in, hidden_dim, heads=1, concat=False,
            edge_dim=1, dropout=0.0, add_self_loops=True
        )
        self.gat2 = GATv2Conv(
            hidden_dim, hidden_dim, heads=1, concat=False,
            edge_dim=1, dropout=0.0, add_self_loops=True
        )
        self.norm1 = nn.LayerNorm(hidden_dim)
        self.norm2 = nn.LayerNorm(hidden_dim)
        self.deriv_head = nn.Sequential(
            nn.Linear(hidden_dim + state_dim + node_feat_dim, hidden_dim),
            nn.Tanh(),
            nn.Linear(hidden_dim, state_dim),
        )
        self._node_feats = None
        self._edge_index = None
        self._edge_attr  = None

    def forward(self, t, x):
        x  = x.float()
        nf = self._node_feats
        ei = self._edge_index
        ea = self._edge_attr

        h = torch.cat([x, nf], dim=-1)
        h = self.norm1(F.elu(self.gat1(h, ei, ea)))
        h = self.norm2(F.elu(self.gat2(h, ei, ea)))

        hf   = torch.cat([h, x, nf], dim=-1)
        dxdt = self.deriv_head(hf)

        return torch.stack([
            -F.softplus(dxdt[:, 0]),
             dxdt[:, 1],
             dxdt[:, 2],
             dxdt[:, 3],
             F.softplus(dxdt[:, 4]),
        ], dim=-1)

    def set_graph(self, node_feats, edge_index, edge_attr):
        self._node_feats = node_feats.float()
        self._edge_index = edge_index
        self._edge_attr  = edge_attr.float()


class EpidemicNODE(nn.Module):
    def __init__(self, node_feat_dim=9, state_dim=5, hidden_dim=64):
        super().__init__()
        self.ode_func = SEIRDDerivative(node_feat_dim, state_dim, hidden_dim)
        # No x0_encoder — not present in trained checkpoint

    def forward(self, x0, node_feats, edge_index, edge_attr, t_span):
        self.ode_func.set_graph(node_feats, edge_index, edge_attr)

        traj = odeint(
            self.ode_func,
            x0.float(),
            t_span.to(x0.device),
            method="rk4",
            options={"step_size": 1.0},
        )

        traj = traj.clamp(min=0.0)
        traj = traj / traj.sum(dim=-1, keepdim=True).clamp(min=1e-8)
        return traj


# ─────────────────────────────────────────────────────────────────────────────
# STARTUP — load graphs and model once
# ─────────────────────────────────────────────────────────────────────────────
print("Loading graphs...")
GRAPH_STORE = {}
for fname in sorted(os.listdir(GRAPHS_DIR)):
    if not fname.endswith(".pt"):
        continue
    seed = int(fname.replace("graph_seed", "").replace(".pt", ""))
    g    = torch.load(os.path.join(GRAPHS_DIR, fname), map_location=device, weights_only=False)
    GRAPH_STORE[seed] = {
        "edge_index": g.edge_index,
        "edge_attr":  g.edge_attr,
        "node_feats": g.x,
        "pos":        g.pos.numpy(),    # (N, 2) lat/lng
        "zone":       g.zone.numpy(),   # (N,)   zone id per node
        "N":          g.num_nodes,
    }
    print(f"  seed={seed}: N={g.num_nodes}, E={g.edge_index.shape[1]}")

# Use the graph with the most nodes for inference
DEFAULT_SEED = max(GRAPH_STORE, key=lambda s: GRAPH_STORE[s]["N"])
print(f"Default inference graph: seed={DEFAULT_SEED}, N={GRAPH_STORE[DEFAULT_SEED]['N']}")

print("Loading model...")
model = EpidemicNODE()
model.load_state_dict(
    torch.load(MODEL_PATH, map_location=device, weights_only=False)
)
model.eval()
print("Model ready.\n")

# Pre-built t_span reused every request (avoids reallocation)
T_SPAN = torch.arange(0, 31, dtype=torch.float)

# In-memory store for uploaded initial states: graph_id -> x0 tensor
SESSION_STORE = {}


# ─────────────────────────────────────────────────────────────────────────────
# FASTAPI APP
# ─────────────────────────────────────────────────────────────────────────────
app = FastAPI(title="EpidemicNODE API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status":       "ok",
        "default_seed": DEFAULT_SEED,
        "N":            GRAPH_STORE[DEFAULT_SEED]["N"],
        "graphs":       list(GRAPH_STORE.keys()),
    }


# ── Upload ────────────────────────────────────────────────────────────────────
@app.post("/api/upload")
async def upload_dataset(file: UploadFile = File(...)):
    """
    Accepts a CSV with at minimum columns: node_id, infected (0 or 1).
    Optional columns for display: lat, lng — if absent, graph positions are used.

    Returns graph_id to use in /api/predict.
    """
    t0       = time.time()
    contents = await file.read()

    try:
        df = pd.read_csv(io.StringIO(contents.decode()))
    except Exception as e:
        raise HTTPException(400, f"Could not parse CSV: {e}")

    g  = GRAPH_STORE[DEFAULT_SEED]
    N  = g["N"]

    # Build initial state tensor — everyone susceptible by default
    x0 = torch.zeros(N, 5)
    x0[:, 0] = 1.0

    # Mark infected nodes from CSV
    n_infected = 0
    if "node_id" in df.columns and "infected" in df.columns:
        infected_df = df[df["infected"] == 1]
        for _, row in infected_df.iterrows():
            nid = int(row["node_id"])
            if 0 <= nid < N:
                x0[nid, 0] = 0.0
                x0[nid, 2] = 1.0
                n_infected += 1

    graph_id = str(uuid.uuid4())[:8]
    SESSION_STORE[graph_id] = {"x0": x0, "seed": DEFAULT_SEED}

    print(f"Upload [{graph_id}]: {n_infected} infected nodes, {time.time()-t0:.2f}s")
    return {
        "graph_id":   graph_id,
        "n_nodes":    N,
        "n_infected": n_infected,
    }


# ── Predict ───────────────────────────────────────────────────────────────────
@app.post("/api/predict")
async def predict(req: dict = Body(...)):
    """
    Runs the Neural ODE forward pass and streams results as Server-Sent Events.

    Request body:
    {
        "graph_id": "abc12345",
        "interventions": {
            "mask_mandate":   50,      // 0-100 percent compliance
            "school_closure": true,
            "lockdown":       false
        },
        "zone_interventions": {
            "3": { "lockdown": true },
            "7": { "mask_mandate": 80 }
        }
    }

    Streams one SSE event with the full result:
    data: {"type": "result", "data": {...}}
    """
    async def event_generator():
        try:
            t0 = time.time()

            graph_id = req.get("graph_id")
            if not graph_id or graph_id not in SESSION_STORE:
                yield f"data: {json.dumps({'type': 'error', 'message': 'graph_id not found. Call /api/upload first.'})}\n\n"
                return

            session = SESSION_STORE[graph_id]
            g       = GRAPH_STORE[session["seed"]]
            x0      = session["x0"]
            ea      = g["edge_attr"].clone()

            # ── Global interventions ──────────────────────────────────────
            # Very subtle multipliers for minimal impact
            iv = req.get("interventions") or {}
            global_multiplier = 1.0
            
            if iv.get("mask_mandate", 0) > 0:
                compliance = float(iv["mask_mandate"]) / 100.0
                # Mask impact: up to 30% reduction
                global_multiplier *= (1 - 0.3 * compliance)
                ea = ea * (1 - 0.3 * compliance)
            if iv.get("school_closure"):
                # School closure: 15% reduction
                global_multiplier *= 0.85
                ea = ea * 0.85
            if iv.get("lockdown"):
                # Lockdown: 30% reduction
                global_multiplier *= 0.7
                ea = ea * 0.7




            # ── Zone-specific interventions ───────────────────────────────
            zone_iv = req.get("zone_interventions") or {}
            nf = g["node_feats"].clone()
            
            if zone_iv:
                node_zone = g["zone"]
                src_nodes = g["edge_index"][0].numpy()
                dst_nodes = g["edge_index"][1].numpy()

                for z_str, zi in zone_iv.items():
                    z_id = int(z_str)
                    edge_mask = torch.tensor(
                        (node_zone[src_nodes] == z_id) |
                        (node_zone[dst_nodes] == z_id),
                        dtype=torch.bool
                    )
                    node_mask = node_zone == z_id
                    
                    if zi.get("lockdown"):
                        ea[edge_mask] = ea[edge_mask] * 0.01
                        nf[node_mask] = nf[node_mask] * 0.2
                    elif zi.get("mask_mandate", 0) > 0:
                        c = float(zi["mask_mandate"]) / 100.0
                        ea[edge_mask] = ea[edge_mask] * (1 - 0.9 * c)
                        nf[node_mask] = nf[node_mask] * (1 - 0.3 * c)

            # ── Run Neural ODE with Policy Injection ────────
            print(f"Running inference for [{graph_id}] with global_multiplier={global_multiplier:.5f}...")
            
            # Hijack the derivative to apply the global multiplier
            # We must scale ONLY the infection rate (S -> E) to be realistic
            original_forward = model.ode_func.forward
            
            def policy_forward(t, x):
                # x: (N, 5) -> [S, E, I, R, D]
                dxdt = original_forward(t, x)
                
                # 1. Scale the infection rate (S decrease)
                # dS/dt is always negative, so we scale it directly
                dxdt_new = dxdt.clone()
                dxdt_new[:, 0] *= global_multiplier
                
                # 2. Scale the growth of E and I
                # We only scale the POSITIVE part of these derivatives.
                # If dE/dt or dI/dt is positive, it means the disease is growing in that pool.
                # If it's negative, it means people are recovering/dying/moving forward.
                # By only scaling the positive part, we let recovery happen at FULL SPEED
                # while stopping new infections at POLICY SPEED.
                
                # Scale E growth (new infections entering the exposed pool)
                dxdt_new[:, 1] = torch.where(dxdt[:, 1] > 0, dxdt[:, 1] * global_multiplier, dxdt[:, 1])
                
                # Scale I growth (exposed people becoming symptomatic/infectious)
                dxdt_new[:, 2] = torch.where(dxdt[:, 2] > 0, dxdt[:, 2] * global_multiplier, dxdt[:, 2])
                
                return dxdt_new
            
            model.ode_func.forward = policy_forward
            
            try:
                with torch.no_grad():
                    traj = model(
                        x0,
                        nf,
                        g["edge_index"],
                        ea,
                        T_SPAN,
                    )

            finally:
                # Always restore the original forward to avoid side effects
                model.ode_func.forward = original_forward


            # traj: (31, N, 5) — day 0 through day 30

            traj_np = traj.numpy()   # (31, N, 5)
            N       = g["N"]
            node_pos  = g["pos"]     # (N, 2)
            node_zone = g["zone"]    # (N,)

            print(f"Inference done in {time.time()-t0:.2f}s, building response...")

            # ── 1. Global population totals (all N nodes, all 31 days) ───
            # Used for the main SEIRD chart — accurate population fractions
            global_totals = []
            for d in range(31):
                day = traj_np[d]  # (N, 5)
                means = day.mean(axis=0)
                global_totals.append({
                    "S": round(float(means[0]), 5),
                    "E": round(float(means[1]), 5),
                    "I": round(float(means[2]), 5),
                    "R": round(float(means[3]), 5),
                    "D": round(float(means[4]), 5),
                })

            # ── 2. Node-level data (downsampled to 2000 for frontend) ────
            # Frontend clusters these into zones/sub-clusters/individuals
            # ── 2. Node-level data (Full population) ────
            # Returning all nodes as requested
            nodes_out = []
            for i in range(N):
                days_data = []
                for d in range(31):
                    s = traj_np[d, i]
                    days_data.append({
                        "S": round(float(s[0]), 4),
                        "E": round(float(s[1]), 4),
                        "I": round(float(s[2]), 4),
                        "R": round(float(s[3]), 4),
                        "D": round(float(s[4]), 4),
                    })
                nodes_out.append({
                    "id":   i,
                    "lat":  round(float(node_pos[i, 0]), 6),
                    "lng":  round(float(node_pos[i, 1]), 6),
                    "zone": int(node_zone[i]),
                    "days": days_data,
                })

            # ── 3. Zone-level severity (all 20 zones, all 31 days) ───────
            # Used for the heatmap overlay — mean I per zone per day
            zones_out = []
            for z in range(1, 21):
                mask = node_zone == z
                if not mask.any():
                    continue
                zone_traj = traj_np[:, mask, :]  # (31, zone_N, 5)
                zone_mean = zone_traj.mean(axis=1) # (31, 5)
                clat, clng = ZONE_CENTROIDS.get(z, (0.0, 0.0))
                zones_out.append({
                    "zone":     z,
                    "clat":     clat,
                    "clng":     clng,
                    # severity = mean I per day, all 31 days
                    "severity": [round(float(v), 5) for v in zone_mean[:, 2]],
                    "totals":   [
                        {
                            "S": round(float(zone_mean[d, 0]), 4),
                            "E": round(float(zone_mean[d, 1]), 4),
                            "I": round(float(zone_mean[d, 2]), 4),
                            "R": round(float(zone_mean[d, 3]), 4),
                            "D": round(float(zone_mean[d, 4]), 4),
                        }
                        for d in range(31)
                    ],
                    "peak_day": int(zone_mean[:, 2].argmax()),
                    "n_nodes":  int(mask.sum()),
                })

            # ── 4. Insights — superspreaders and zone risk ranking ────────
            out_degree = np.zeros(N)
            src = g["edge_index"][0].numpy()
            np.add.at(out_degree, src, 1)

            zone_insights = []
            for z in range(1, 21):
                mask = node_zone == z
                if not mask.any():
                    continue
                zone_insights.append({
                    "zone":          z,
                    "superspreaders": int((out_degree[mask] > 15).sum()),
                    "n_infected_d0":  int((x0[mask, 2] > 0.5).sum().item()),
                    "peak_I":         round(float(traj_np[:, mask, 2].mean(axis=1).max()), 4),
                    "peak_day":       int(traj_np[:, mask, 2].mean(axis=1).argmax()),
                })
            zone_insights.sort(key=lambda x: x["peak_I"], reverse=True)

            # ── 5. Edges for graph view wiring (Up to 15,000 for performance) ──
            ei_np = g["edge_index"].numpy()
            E_limit = min(ei_np.shape[1], 15000)
            result = {
                "nodes":        nodes_out,
                "zones":        zones_out,
                "global_totals": global_totals,
                "insights":     zone_insights,
                "edges_src":    ei_np[0, :E_limit].tolist(),
                "edges_dst":    ei_np[1, :E_limit].tolist(),
            }


            elapsed = time.time() - t0
            print(f"Response built in {elapsed:.2f}s total")

            yield f"data: {json.dumps({'type': 'result', 'data': result})}\n\n"

        except Exception as e:
            import traceback
            traceback.print_exc()
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# ── Insights endpoint (zone-level analytics) ──────────────────────────────────
@app.get("/api/insights/{graph_id}")
def get_insights(graph_id: str):
    """
    Returns zone-level analytics for a given graph_id.
    Use after /api/predict has been called so you have full trajectory data.
    """
    if graph_id not in SESSION_STORE:
        raise HTTPException(404, "graph_id not found")

    session  = SESSION_STORE[graph_id]
    g        = GRAPH_STORE[session["seed"]]
    x0       = session["x0"].numpy()
    ei       = g["edge_index"].numpy()
    zone_arr = g["zone"]
    N        = g["N"]

    out_degree = np.zeros(N)
    np.add.at(out_degree, ei[0], 1)

    by_transmitters   = []
    by_susceptibility = []

    for z in range(1, 21):
        mask = zone_arr == z
        if not mask.any():
            continue
        by_transmitters.append({
            "zone":        z,
            "transmitters": int((x0[mask, 2] > 0.5).sum()),
        })
        by_susceptibility.append({
            "zone":       z,
            "susceptible": int((x0[mask, 0] > 0.5).sum()),
        })

    return {
        "by_transmitters":   sorted(by_transmitters,   key=lambda x: x["transmitters"],   reverse=True),
        "by_susceptibility": sorted(by_susceptibility, key=lambda x: x["susceptible"],    reverse=True),
    }


# ── Run directly ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)