import torch
import os
from torch_geometric.nn import GATv2Conv
from torchdiffeq import odeint_adjoint as odeint
import torch.nn as nn
import torch.nn.functional as F

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
        return x

class EpidemicNODE(nn.Module):
    def __init__(self, node_feat_dim=9, state_dim=5, hidden_dim=64):
        super().__init__()
        self.ode_func = SEIRDDerivative(node_feat_dim, state_dim, hidden_dim)

print("Testing model load...")
model = EpidemicNODE()
try:
    state_dict = torch.load("model/tgn_best.pt", map_location="cpu", weights_only=False)
    if "model" in state_dict:
        model.load_state_dict(state_dict["model"])
    else:
        model.load_state_dict(state_dict)
    print("Model loaded successfully.")
except Exception as e:
    print(f"Error loading model: {e}")

print("Testing graph load...")
GRAPHS_DIR = "graphs"
fnames = [f for f in os.listdir(GRAPHS_DIR) if f.endswith(".pt")]
if fnames:
    g = torch.load(os.path.join(GRAPHS_DIR, fnames[0]), map_location="cpu", weights_only=False)
    print(f"Graph {fnames[0]} loaded successfully. N={g.num_nodes}")
    print(f"Attributes: {dir(g)}")
    if hasattr(g, "pos"):
        print(f"pos shape: {g.pos.shape}")
    else:
        print("pos attribute missing")
    if hasattr(g, "zone"):
        print(f"zone shape: {g.zone.shape}")
    else:
        print("zone attribute missing")
