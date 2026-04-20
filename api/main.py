import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import GATv2Conv
from torch_geometric.data import Data
import pandas as pd
import numpy as np
import json, gzip, io, os, uuid
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional, Dict

# ── Paths ──────────────────────────────────────────────────────────────────
BASE      = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE, 'model', 'tgn_best.pt')
GRAPH_PATH = os.path.join(BASE, 'data',  'graph.pt')
POP_PATH   = os.path.join(BASE, 'data',  'population.parquet')

device = torch.device('cpu')

# ── Model definition (must match training exactly) ─────────────────────────
class NodeMemory(nn.Module):
    def __init__(self, n_nodes, mem_dim):
        super().__init__()
        self.n_nodes = n_nodes
        self.mem_dim = mem_dim
        self.register_buffer('memory', torch.zeros(n_nodes, mem_dim))

    def get(self):       return self.memory
    def reset(self):     self.memory.zero_()
    def update(self, m): self.memory = m.detach()


class EpidemicTGN(nn.Module):
    def __init__(self, n_nodes, node_feat_dim=9, mem_dim=32, state_dim=5):
        super().__init__()
        self.n_nodes   = n_nodes
        self.mem_dim   = mem_dim
        self.state_dim = state_dim
        self.memory    = NodeMemory(n_nodes, mem_dim)

        msg_in = mem_dim * 2 + 1 + state_dim
        self.msg_fn = nn.Sequential(
            nn.Linear(msg_in, 64), nn.ReLU(), nn.Linear(64, mem_dim)
        )
        self.mem_updater = nn.GRUCell(mem_dim, mem_dim)

        gat_in = mem_dim + node_feat_dim + state_dim
        self.gat1  = GATv2Conv(gat_in, 32, heads=2, concat=False,
                               edge_dim=1, dropout=0.0, add_self_loops=True)
        self.gat2  = GATv2Conv(32, 32, heads=2, concat=False,
                               edge_dim=1, dropout=0.0, add_self_loops=True)
        self.norm1 = nn.LayerNorm(32)
        self.norm2 = nn.LayerNorm(32)
        self.predictor = nn.Sequential(
            nn.Linear(32, 64), nn.LayerNorm(64), nn.ReLU(),
            nn.Dropout(0.0), nn.Linear(64, state_dim)
        )

    def _step(self, x_state, node_feats, edge_index, edge_attr):
        x_state    = x_state.float()
        node_feats = node_feats.float()
        edge_attr  = edge_attr.float()
        src, dst   = edge_index[0], edge_index[1]
        mem        = self.memory.get().float()

        e_w = edge_attr.squeeze(1) if edge_attr.dim() == 2 else edge_attr
        msg_input = torch.cat([mem[src], mem[dst],
                                e_w.unsqueeze(1), x_state[src]], dim=-1)
        msgs = self.msg_fn(msg_input).float()

        agg = torch.zeros(self.n_nodes, self.mem_dim, dtype=torch.float32)
        idx = dst.unsqueeze(1).expand(dst.shape[0], self.mem_dim)
        agg.scatter_add_(0, idx, msgs)

        new_mem = self.mem_updater(agg, mem)
        self.memory.update(new_mem)

        e_2d = edge_attr if edge_attr.dim() == 2 else edge_attr.unsqueeze(1)
        h = torch.cat([new_mem, node_feats, x_state], dim=-1)
        h = self.norm1(F.elu(self.gat1(h, edge_index, e_2d)))
        h = self.norm2(F.elu(self.gat2(h, edge_index, e_2d)))
        return F.softmax(self.predictor(h), dim=-1)

    @torch.no_grad()
    def rollout(self, x0, node_feats, edge_index, edge_attr, n_days=30):
        self.memory.reset()
        preds = []
        x = x0.float()
        for _ in range(n_days):
            x = self._step(x, node_feats, edge_index, edge_attr)
            preds.append(x)
        return torch.stack(preds, dim=0)  # (30, N, 5)


# ── Load graph and model once at startup ───────────────────────────────────
print('Loading graph...')
graph      = torch.load(GRAPH_PATH, map_location=device)
edge_index = graph.edge_index
edge_attr  = graph.edge_attr
node_feats = graph.x
node_pos   = graph.pos.numpy()    # (N, 2) lat/lng
node_zone  = graph.zone.numpy()   # (N,)
N          = graph.num_nodes

df_pop = pd.read_parquet(POP_PATH)

print('Loading model...')
model = EpidemicTGN(n_nodes=N).to(device)
model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
model.eval()
print(f'Ready. N={N} nodes.')

# ── Zone centroids (must match what you used in data generation) ───────────
ZONE_CENTROIDS = {
    1:(18.5204,73.8567), 2:(18.5314,73.8446), 3:(18.5089,73.8741),
    4:(18.4968,73.8631), 5:(18.5421,73.8789), 6:(18.5612,73.8234),
    7:(18.4823,73.9012), 8:(18.5198,73.9156), 9:(18.4712,73.8345),
    10:(18.5534,73.8678),11:(18.4634,73.8912),12:(18.5023,73.8123),
    13:(18.5756,73.8456),14:(18.4891,73.8234),15:(18.5345,73.9234),
    16:(18.5067,73.7987),17:(18.4756,73.9345),18:(18.5589,73.8012),
    19:(18.4623,73.8678),20:(18.5234,73.8901),
}

# ── In-memory store for uploaded graphs ───────────────────────────────────
graphs_store: Dict[str, torch.Tensor] = {}

# ── FastAPI app ────────────────────────────────────────────────────────────
app = FastAPI()
app.add_middleware(CORSMiddleware,
                   allow_origins=["*"],
                   allow_methods=["*"],
                   allow_headers=["*"])


class PredictRequest(BaseModel):
    graph_id: str
    interventions: Optional[dict] = {}


@app.get("/health")
def health():
    return {"status": "ok", "nodes": N}


@app.post("/api/upload")
async def upload(file: UploadFile = File(...)):
    contents = await file.read()
    try:
        df = pd.read_csv(io.StringIO(contents.decode()))
    except Exception as e:
        raise HTTPException(400, f"Could not parse CSV: {e}")

    x0 = torch.zeros(N, 5)
    x0[:, 0] = 1.0  # all susceptible

    if 'node_id' in df.columns and 'infected' in df.columns:
        infected_ids = df[df['infected'] == 1]['node_id'].values
        for nid in infected_ids:
            if int(nid) < N:
                x0[int(nid), 0] = 0.0
                x0[int(nid), 2] = 1.0

    gid = str(uuid.uuid4())[:8]
    graphs_store[gid] = x0

    n_infected = int((x0[:, 2] > 0).sum())
    return {"graph_id": gid, "n_infected": n_infected, "n_nodes": N}


@app.post("/api/predict")
def predict(req: PredictRequest):
    if req.graph_id not in graphs_store:
        raise HTTPException(404, "graph_id not found. Call /api/upload first.")

    x0 = graphs_store[req.graph_id]

    # Apply interventions
    ea = edge_attr.clone()
    iv = req.interventions or {}
    if iv.get("mask_mandate"):
        compliance = float(iv["mask_mandate"]) / 100.0
        ea = ea * (1 - 0.5 * compliance)
    if iv.get("school_closure"):
        ea = ea * 0.7
    if iv.get("lockdown"):
        ea = ea * 0.4

    # Run MC dropout for uncertainty (10 passes — fast on CPU)
    N_MC  = 10
    preds = []
    model.train()  # dropout active
    with torch.no_grad():
        for _ in range(N_MC):
            p = model.rollout(x0, node_feats, edge_index, ea, n_days=30)
            preds.append(p.numpy())
    model.eval()

    preds_arr = np.stack(preds, axis=0)    # (10, 30, N, 5)
    mean_pred = preds_arr.mean(axis=0)     # (30, N, 5)
    std_pred  = preds_arr.std(axis=0)      # (30, N, 5)

    # Build node-level response
    nodes_out = []
    for i in range(N):
        nodes_out.append({
            "id":   i,
            "lat":  round(float(node_pos[i, 0]), 6),
            "lng":  round(float(node_pos[i, 1]), 6),
            "zone": int(node_zone[i]),
            "days": [
                {
                    "S": round(float(mean_pred[t, i, 0]), 4),
                    "E": round(float(mean_pred[t, i, 1]), 4),
                    "I": round(float(mean_pred[t, i, 2]), 4),
                    "R": round(float(mean_pred[t, i, 3]), 4),
                    "D": round(float(mean_pred[t, i, 4]), 4),
                    "u": round(float(std_pred[t,  i, 2]), 4),
                }
                for t in range(30)
            ]
        })

    # Zone summaries
    zones_out = []
    for z in range(1, 21):
        mask = node_zone == z
        if not mask.any():
            continue
        zone_I = mean_pred[:, mask, 2].mean(axis=1)  # (30,)
        clat, clng = ZONE_CENTROIDS.get(z, (0.0, 0.0))
        zones_out.append({
            "zone":     z,
            "clat":     clat,
            "clng":     clng,
            "severity": [round(float(v), 4) for v in zone_I],
            "peak_day": int(zone_I.argmax()) + 1,
        })

    result     = json.dumps({"nodes": nodes_out, "zones": zones_out})
    compressed = gzip.compress(result.encode())
    return Response(
        content=compressed,
        media_type="application/json",
        headers={"Content-Encoding": "gzip"}
    )