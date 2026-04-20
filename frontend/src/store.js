import { create } from 'zustand'

export const useStore = create((set, get) => ({
  // API state
  graphId:     null,
  predictions: null,   // full response {nodes, zones}
  loading:     false,
  error:       null,

  // UI state
  selectedDay:  1,
  selectedZone: null,
  view:         'map',   // 'map' | 'graph'
  interventions: { mask_mandate: 0, school_closure: false, lockdown: false },

  // Flat Float32Array for fast day scrubbing: [node][day][state]
  // shape: N * 30 * 6  (S,E,I,R,D,u)
  stateBuffer: null,

  setSelectedDay:  (d) => set({ selectedDay: d }),
  setSelectedZone: (z) => set({ selectedZone: z }),
  setView:         (v) => set({ view: v }),
  setIntervention: (k, v) => set(s => ({
    interventions: { ...s.interventions, [k]: v }
  })),

  uploadAndPredict: async (file, interventions) => {
    set({ loading: true, error: null })
    const API = import.meta.env.VITE_API_URL

    try {
      // Upload
      const form = new FormData()
      form.append('file', file)
      const r1 = await fetch(`${API}/api/upload`, { method: 'POST', body: form })
      const { graph_id } = await r1.json()

      // Predict
      const r2 = await fetch(`${API}/api/predict`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ graph_id, interventions })
      })
      const data = await r2.json()

      // Build flat buffer for O(1) day scrubbing
      const N      = data.nodes.length
      const buffer = new Float32Array(N * 30 * 6)
      data.nodes.forEach((node, i) => {
        node.days.forEach((d, t) => {
          const off = i * 30 * 6 + t * 6
          buffer[off]   = d.S
          buffer[off+1] = d.E
          buffer[off+2] = d.I
          buffer[off+3] = d.R
          buffer[off+4] = d.D
          buffer[off+5] = d.u
        })
      })

      set({ predictions: data, stateBuffer: buffer, graphId: graph_id,
            loading: false, selectedDay: 1 })
    } catch (e) {
      set({ error: e.message, loading: false })
    }
  },

  // Get state for node i at day t (0-indexed)
  getNodeState: (i, t) => {
    const buf = get().stateBuffer
    if (!buf) return null
    const off = i * 30 * 6 + t * 6
    return { S: buf[off], E: buf[off+1], I: buf[off+2],
             R: buf[off+3], D: buf[off+4], u: buf[off+5] }
  },
}))