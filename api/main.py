import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import GATv2Conv
from torchdiffeq import odeint_adjoint as odeint
import pandas as pd
import numpy as np
import uuid
import os
import io
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from pydantic import BaseModel
from fastapi.responses import ORJSONResponse
from typing import Dict, Optional

app = FastAPI()

# Enable CORS for your Vite frontend
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
MODEL_PATH = "model/tgn_best.pt"
GRAPHS_DIR = "graphs"
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

# --- MODEL DEFINITION ---
class SEIRDDerivative(nn.Module):
    def __init__(self, node_feat_dim=9, state_dim=5, hidden_dim=32):
        super().__init__()
        self.state_dim    = state_dim
        self.node_feat_dim = node_feat_dim
        gat_in = state_dim + node_feat_dim
        self.gat1 = GATv2Conv(gat_in, hidden_dim, heads=1, concat=False,
                              edge_dim=1, dropout=0.0, add_self_loops=True)
        self.gat2 = GATv2Conv(hidden_dim, hidden_dim, heads=1, concat=False,
                              edge_dim=1, dropout=0.0, add_self_loops=True)
        self.norm1 = nn.LayerNorm(hidden_dim)
        self.norm2 = nn.LayerNorm(hidden_dim)
        self.deriv_head = nn.Sequential(
            nn.Linear(hidden_dim + state_dim + node_feat_dim, hidden_dim),
            nn.Tanh(),
            nn.Linear(hidden_dim, state_dim)
        )

    def forward(self, t, x):
        x = x.float()
        node_feats = self._node_feats
        edge_index = self._edge_index
        edge_attr  = self._edge_attr
        h = torch.cat([x, node_feats], dim=-1)
        h = self.norm1(F.elu(self.gat1(h, edge_index, edge_attr)))
        h = self.norm2(F.elu(self.gat2(h, edge_index, edge_attr)))
        h_full = torch.cat([h, x, node_feats], dim=-1)
        dxdt   = self.deriv_head(h_full)
        dxdt_constrained = torch.stack([
            -F.softplus(dxdt[:, 0]),
             dxdt[:, 1],
             dxdt[:, 2],
             dxdt[:, 3],
             F.softplus(dxdt[:, 4]),
        ], dim=-1)
        return dxdt_constrained

    def set_graph(self, node_feats, edge_index, edge_attr):
        self._node_feats  = node_feats.float()
        self._edge_index  = edge_index
        self._edge_attr   = edge_attr.float()

class EpidemicNODE(nn.Module):
    def __init__(self, node_feat_dim=9, state_dim=5, hidden_dim=64):
        super().__init__()
        self.ode_func = SEIRDDerivative(node_feat_dim, state_dim, hidden_dim)

    def forward(self, x0, node_feats, edge_index, edge_attr, t_span):
        self.ode_func.set_graph(node_feats, edge_index, edge_attr)
        trajectory = odeint(
            self.ode_func,
            x0.float(),
            t_span.to(x0.device),
            method='rk4',
            options={'step_size': 0.5}
        )
        trajectory = trajectory.clamp(min=0.0)
        row_sums   = trajectory.sum(dim=-1, keepdim=True).clamp(min=1e-8)
        trajectory = trajectory / row_sums
        return trajectory
        
    def rollout(self, x0, node_feats, edge_index, edge_attr, n_days=30):
        t_span = torch.arange(0, n_days + 1).float().to(x0.device)
        return self.forward(x0, node_feats, edge_index, edge_attr, t_span)[1:]

# --- LOAD GRAPHS ---
print("Loading graphs...")
graphs = {}
for fname in os.listdir(GRAPHS_DIR):
    if not fname.endswith(".pt"): continue
    seed = int(fname.replace("graph_seed","").replace(".pt",""))
    g = torch.load(os.path.join(GRAPHS_DIR, fname), map_location=device, weights_only=False)
    graphs[seed] = {
        "edge_index": g.edge_index,
        "edge_attr":  g.edge_attr,
        "node_feats": g.x,
        "pos":        g.pos,
        "zone":       g.zone,
        "N":          g.num_nodes,
    }
    print(f"  Graph seed={seed}: N={g.num_nodes}")

# Default inference graph (largest one)
default_seed = max(graphs.keys(), key=lambda s: graphs[s]["N"])
print(f"Default inference graph: seed={default_seed}, N={graphs[default_seed]['N']}")

# --- LOAD MODEL ---
print("Loading model...")
model = EpidemicNODE()
try:
    state_dict = torch.load(MODEL_PATH, map_location=device, weights_only=False)
    # Check if it is a checkpoint or just weights
    if "model" in state_dict:
        model.load_state_dict(state_dict["model"])
    else:
        model.load_state_dict(state_dict)
    print("Model loaded successfully.")
except Exception as e:
    print(f"Error loading model: {e}")

model.eval()

# In-memory storage for seeded initial states
store: Dict[str, torch.Tensor] = {}

class Interventions(BaseModel):
    mask_mandate: float = 0.0
    school_closure: bool = False
    lockdown: bool = False

class PredictRequest(BaseModel):
    graph_id: str
    interventions: Optional[Interventions]

# --- ENDPOINTS ---
@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "graphs_available": list(graphs.keys()),
        "default_seed": default_seed
    }

@app.post("/api/upload")
async def upload_graph(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode()))
        
        g = graphs[default_seed]
        N = g["N"]
        x0 = torch.zeros(N, 5)
        x0[:, 0] = 1.0 # All susceptible
        
        # Seed infections from CSV
        n_seeded = 0
        if "node_id" in df.columns and "infected" in df.columns:
            for _, row in df[df["infected"] == 1].iterrows():
                nid = int(row["node_id"])
                if nid < N:
                    x0[nid, 0] = 0.0
                    x0[nid, 2] = 1.0 # Set to Infected
                    n_seeded += 1
        
        graph_id = str(uuid.uuid4())[:8]
        store[graph_id] = x0
        print(f"Uploaded graph {graph_id}, seeded {n_seeded} infections.")
        
        return {
            "graph_id": graph_id,
            "n_infected": n_seeded,
            "n_nodes": N
        }
    except Exception as e:
        print(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/predict", response_class=ORJSONResponse)
async def predict(req: PredictRequest):
    if req.graph_id not in store:
        raise HTTPException(status_code=404, detail="graph_id not found")
        
    try:
        print(f"Starting prediction for {req.graph_id}...")
        g = graphs[default_seed]
        x0 = store[req.graph_id]
        ea = g["edge_attr"].clone()
        
        # Apply interventions
        iv = req.interventions
        if iv:
            if iv.mask_mandate > 0:
                ea = ea * (1 - 0.5 * iv.mask_mandate / 100.0)
            if iv.school_closure:
                ea = ea * 0.7
            if iv.lockdown:
                ea = ea * 0.4
                
        # Run rollout with MC Dropout for uncertainty
        N_MC = 2
        preds = []
        model.train() # Enable dropout for MC
        with torch.no_grad():
            for i in range(N_MC):
                print(f"  MC rollout {i+1}/{N_MC}...")
                p = model.rollout(x0, g["node_feats"], g["edge_index"], ea, n_days=30)
                preds.append(p.numpy())
        model.eval()
        
        preds_arr = np.stack(preds, axis=0) # (MC, 30, N, 5)
        mean_pred = np.round(preds_arr.mean(axis=0), 4)
        std_pred  = np.round(preds_arr.std(axis=0), 4)
        
        node_pos = np.round(g["pos"].numpy(), 6)
        node_zone = g["zone"].numpy()
        N = g["N"]
        
        output_nodes = []
        print("Formatting results...")
        for i in range(N):
            # Extract slices for this node to avoid repeated indexing
            node_mean = mean_pred[:, i, :]
            node_std = std_pred[:, i, 2]
            
            day_history = [
                {
                    "S": float(node_mean[t, 0]), 
                    "E": float(node_mean[t, 1]),
                    "I": float(node_mean[t, 2]),
                    "R": float(node_mean[t, 3]),
                    "D": float(node_mean[t, 4]),
                    "u": float(node_std[t])
                } for t in range(30)
            ]
            
            output_nodes.append({
                "id": i,
                "lat": float(node_pos[i, 0]),
                "lng": float(node_pos[i, 1]),
                "zone": int(node_zone[i]),
                "days": day_history
            })

        zones_out = []
        for z in range(1, 21):
            mask = (node_zone == z)
            if not mask.any(): continue
            
            zone_mean = mean_pred[:, mask, :].mean(axis=1)  # (30, 5)
            zone_I = np.round(zone_mean[:, 2], 4)
            clat, clng = ZONE_CENTROIDS.get(z, (0.0, 0.0))
            zones_out.append({
                "zone": z,
                "clat": clat,
                "clng": clng,
                "severity": [float(v) for v in zone_I],
                "peak_day": int(zone_I.argmax()) + 1,
                "days": [
                    {"S": float(zone_mean[t, 0]), "E": float(zone_mean[t, 1]),
                     "I": float(zone_mean[t, 2]), "R": float(zone_mean[t, 3]),
                     "D": float(zone_mean[t, 4])}
                    for t in range(30)
                ]
            })

        # Edge data for graph view
        ei = g["edge_index"].numpy()
        edges_src = ei[0].tolist()
        edges_dst = ei[1].tolist()

        print("Prediction complete.")
        return {"nodes": output_nodes, "zones": zones_out,
                "edges_src": edges_src, "edges_dst": edges_dst}
    except Exception as e:
        print(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)