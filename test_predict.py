import requests
import json

url = "http://localhost:8000/api/predict"
payload = {
    "graph_id": "266920d0",
    "interventions": {
        "mask_mandate": 50.0,
        "school_closure": True,
        "lockdown": False
    }
}

print(f"Sending prediction request for graph_id: {payload['graph_id']}...")
try:
    response = requests.post(url, json=payload, timeout=300)
    if response.status_code == 200:
        data = response.json()
        print("Success!")
        print(f"Received data for {len(data['nodes'])} nodes and {len(data['zones'])} zones.")
        # Print first node history sample
        sample_node = data['nodes'][0]
        print(f"Sample node ID: {sample_node['id']}, 30-day history size: {len(sample_node['days'])}")
        print(f"Day 0 state: {sample_node['days'][0]}")
    else:
        print(f"Failed with status code: {response.status_code}")
        print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
