import pandas as pd
import numpy as np

# This script generates a test CSV to seed infections in the EpidemicNODE model via the API.
# The API will map these node_ids to the actual nodes in the loaded graph.

n_total_nodes = 11690  # Approximate size of the largest graph (seed 99)
n_seed_infections = 50

# Randomly select some node IDs to be initially infected
infected_node_ids = np.random.choice(range(n_total_nodes), size=n_seed_infections, replace=False)

data = []
for i in range(n_total_nodes):
    # We only need to report nodes that have a specific state if we want,
    # but for seeding, we usually just need node_id and infected=1.
    # To keep the file small, we can just list the infected nodes.
    if i in infected_node_ids:
        data.append({
            "node_id": i,
            "infected": 1
        })
    # else:
    #     data.append({"node_id": i, "infected": 0})

df = pd.DataFrame(data)

# Save to CSV
df.to_csv("population_data.csv", index=False)
print(f"Generated population_data.csv with {n_seed_infections} seeded infections.")