import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 300000, // 5 min for long predictions
});

export async function uploadDataset(file) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await API.post('/api/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data; // { graph_id, n_infected, n_nodes }
}

export async function runPrediction(graphId, interventions = {}) {
  const { data } = await API.post('/api/predict', {
    graph_id: graphId,
    interventions,
  });
  return data; // { nodes, zones, edges_src, edges_dst }
}

export async function healthCheck() {
  const { data } = await API.get('/health');
  return data;
}
