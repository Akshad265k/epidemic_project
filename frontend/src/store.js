import { create } from 'zustand';
import { uploadDataset, runPrediction } from './utils/api';

export const useStore = create((set, get) => ({
  // --- View ---
  activeView: 'upload', // 'upload' | 'graph' | 'map'
  setActiveView: (v) => set({ activeView: v }),

  // --- Upload ---
  file: null,
  graphId: null,
  nNodes: 0,
  nInfected: 0,
  setFile: (f) => set({ file: f }),

  // --- Interventions ---
  interventions: { mask_mandate: 0, school_closure: false, lockdown: false },
  setInterventions: (iv) => set({ interventions: { ...get().interventions, ...iv } }),

  // --- Prediction Data ---
  nodes: [],
  zones: [],
  edgesSrc: [],
  edgesDst: [],
  isLoading: false,
  error: null,

  // --- Timeline ---
  currentDay: 0,
  isPlaying: false,
  playbackSpeed: 1,
  setCurrentDay: (d) => set({ currentDay: d }),
  setIsPlaying: (p) => set({ isPlaying: p }),
  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setPlaybackSpeed: (sp) => set({ playbackSpeed: sp }),

  // --- Graph Navigation ---
  currentClusterId: null,
  breadcrumbs: [{ id: null, label: 'All Nodes' }],
  drillInto: (clusterId, label) => set((s) => ({
    currentClusterId: clusterId,
    breadcrumbs: [...s.breadcrumbs, { id: clusterId, label }],
  })),
  navigateTo: (index) => set((s) => ({
    currentClusterId: s.breadcrumbs[index].id,
    breadcrumbs: s.breadcrumbs.slice(0, index + 1),
  })),
  resetNavigation: () => set({
    currentClusterId: null,
    breadcrumbs: [{ id: null, label: 'All Nodes' }],
  }),

  // --- Actions ---
  uploadAndPredict: async () => {
    const { file, interventions } = get();
    if (!file) return;

    set({ isLoading: true, error: null, activeView: 'graph' });

    try {
      // Step 1: Upload
      const uploadResult = await uploadDataset(file);
      set({
        graphId: uploadResult.graph_id,
        nNodes: uploadResult.n_nodes,
        nInfected: uploadResult.n_infected,
      });

      // Step 2: Predict
      const prediction = await runPrediction(uploadResult.graph_id, interventions);
      set({
        nodes: prediction.nodes,
        zones: prediction.zones,
        edgesSrc: prediction.edges_src || [],
        edgesDst: prediction.edges_dst || [],
        isLoading: false,
        currentDay: 0,
        isPlaying: false,
        currentClusterId: null,
        breadcrumbs: [{ id: null, label: 'All Nodes' }],
      });
    } catch (err) {
      console.error('Upload/Predict error:', err);
      set({
        isLoading: false,
        error: err?.response?.data?.detail || err.message || 'Prediction failed',
        activeView: 'upload',
      });
    }
  },
}));
