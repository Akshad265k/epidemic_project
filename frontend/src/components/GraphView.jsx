import React, { useEffect, useRef, useMemo } from 'react'
import * as d3 from 'd3'
import { useStore } from '../store'
import './GraphView.css'

const STATE_COLORS = {
  S: '#ffffff',
  E: '#f59e0b',
  I: '#ef4444',
  R: '#22c55e',
  D: '#374151',
}

function dominantState(s) {
  if (!s) return 'S'
  const vals = [s.S, s.E, s.I, s.R, s.D]
  const keys  = ['S', 'E', 'I', 'R', 'D']
  return keys[vals.indexOf(Math.max(...vals))]
}

export default function GraphView() {
  const { predictions, selectedDay, selectedZone, setSelectedZone, getNodeState } = useStore()
  const canvasRef = useRef()
  const simRef    = useRef()
  const nodesRef  = useRef([])
  const t = selectedDay - 1

  const zoneList = useMemo(() => {
    if (!predictions) return []
    return [...new Set(predictions.nodes.map(n => n.zone))].sort((a, b) => a - b)
  }, [predictions])

  // Build nodes + edges for current zone/selection
  const { simNodes, simEdges } = useMemo(() => {
    if (!predictions) return { simNodes: [], simEdges: [] }

    const filtered = selectedZone
      ? predictions.nodes.filter(n => n.zone === selectedZone)
      : predictions.nodes.slice(0, 400)

    const idSet = new Set(filtered.map(n => n.id))

    // Build proximity-based edges using lat/lng distance
    // Two nodes are connected if they are within a distance threshold
    const edges = []
    const arr   = filtered
    const threshold = selectedZone ? 0.015 : 0.008

    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const dlat = arr[i].lat - arr[j].lat
        const dlng = arr[i].lng - arr[j].lng
        const dist  = Math.sqrt(dlat * dlat + dlng * dlng)
        if (dist < threshold) {
          edges.push({ source: i, target: j, strength: 1 - dist / threshold })
        }
      }
    }

    return {
      simNodes: filtered.map((n, i) => ({ ...n, _idx: i })),
      simEdges: edges,
    }
  }, [predictions, selectedZone])

  // Run D3 simulation
  useEffect(() => {
    if (!simNodes.length || !canvasRef.current) return
    const canvas = canvasRef.current
    const parent = canvas.parentElement
    const W = parent.clientWidth
    const H = parent.clientHeight - 44 // subtract zone bar height
    canvas.width  = W
    canvas.height = H

    const ctx = canvas.getContext('2d')
    if (simRef.current) simRef.current.stop()

    const nodes = simNodes.map(n => ({
      ...n,
      x: W / 2 + (Math.random() - 0.5) * W * 0.6,
      y: H / 2 + (Math.random() - 0.5) * H * 0.6,
    }))

    const links = simEdges.map(e => ({
      source: nodes[e.source],
      target: nodes[e.target],
      strength: e.strength,
    }))

    nodesRef.current = nodes

    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d._idx)
        .distance(40).strength(d => d.strength * 0.4))
      .force('charge', d3.forceManyBody().strength(selectedZone ? -60 : -25))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide(selectedZone ? 8 : 5))
      .alphaDecay(0.02)

    simRef.current = sim

    function draw() {
      ctx.clearRect(0, 0, W, H)

      // Draw edges first
      links.forEach(link => {
        const src = link.source
        const tgt = link.target
        if (!src || !tgt || isNaN(src.x) || isNaN(tgt.x)) return
        const state = getNodeState(src.id, t)
        const dom   = dominantState(state)
        const alpha = dom === 'I' ? 0.55 : dom === 'E' ? 0.35 : 0.12

        ctx.beginPath()
        ctx.moveTo(src.x, src.y)
        ctx.lineTo(tgt.x, tgt.y)
        ctx.strokeStyle = dom === 'I' ? `rgba(239,68,68,${alpha})`
                        : dom === 'E' ? `rgba(245,158,11,${alpha})`
                        : `rgba(100,116,139,${alpha})`
        ctx.lineWidth = link.strength * 1.5
        ctx.stroke()
      })

      // Draw nodes
      nodes.forEach(n => {
        if (isNaN(n.x) || isNaN(n.y)) return
        const state = getNodeState(n.id, t)
        const dom   = dominantState(state)
        const color = STATE_COLORS[dom]
        const r     = dom === 'I' ? 6 : dom === 'E' ? 5 : 4

        // Glow for infected nodes
        if (dom === 'I') {
          ctx.beginPath()
          ctx.arc(n.x, n.y, r + 4, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(239,68,68,0.2)'
          ctx.fill()
        }

        ctx.beginPath()
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.globalAlpha = 0.9
        ctx.fill()

        // Outline
        ctx.strokeStyle = 'rgba(0,0,0,0.4)'
        ctx.lineWidth = 0.5
        ctx.stroke()
      })
      ctx.globalAlpha = 1
    }

    sim.on('tick', draw)

    return () => sim.stop()
  }, [simNodes, simEdges])

  // Redraw on day change (don't restart sim, just redraw)
  useEffect(() => {
    if (!nodesRef.current.length || !canvasRef.current) return
    const canvas = canvasRef.current
    const W = canvas.width
    const H = canvas.height
    const ctx = canvas.getContext('2d')
    const nodes = nodesRef.current

    ctx.clearRect(0, 0, W, H)
    nodes.forEach(n => {
      if (isNaN(n.x) || isNaN(n.y)) return
      const state = getNodeState(n.id, t)
      const dom   = dominantState(state)
      const color = STATE_COLORS[dom]
      const r     = dom === 'I' ? 6 : dom === 'E' ? 5 : 4

      if (dom === 'I') {
        ctx.beginPath()
        ctx.arc(n.x, n.y, r + 4, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(239,68,68,0.2)'
        ctx.fill()
      }

      ctx.beginPath()
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.globalAlpha = 0.9
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'
      ctx.lineWidth = 0.5
      ctx.stroke()
    })
    ctx.globalAlpha = 1
  }, [selectedDay])

  if (!predictions) return null

  return (
    <div className="graph-wrap">
      <div className="zone-selector">
        <span className="zone-label">Zone:</span>
        <button
          className={!selectedZone ? 'zb active' : 'zb'}
          onClick={() => setSelectedZone(null)}
        >
          All
        </button>
        {zoneList.map(z => (
          <button
            key={z}
            className={selectedZone === z ? 'zb active' : 'zb'}
            onClick={() => setSelectedZone(selectedZone === z ? null : z)}
          >
            {z}
          </button>
        ))}
      </div>

      <canvas ref={canvasRef} className="graph-canvas" />

      <div className="graph-legend">
        {Object.entries(STATE_COLORS).map(([k, c]) => (
          <span key={k} className="gl-item">
            <span className="gl-dot" style={{ background: c,
              border: k === 'S' ? '1px solid #555' : 'none' }} />
            {k}
          </span>
        ))}
      </div>

      {!selectedZone && (
        <div className="graph-hint">Select a zone above to see individual connections</div>
      )}
    </div>
  )
}

