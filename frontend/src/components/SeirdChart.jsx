import React, { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import { useStore } from '../store'
import './Panel.css'

const COLORS = { S: '#3b82f6', E: '#f59e0b', I: '#ef4444', R: '#22c55e', D: '#6b7280' }

export default function SeirdChart() {
  const { predictions, selectedDay, selectedZone } = useStore()

  const chartData = useMemo(() => {
    if (!predictions) return []
    const nodes = selectedZone
      ? predictions.nodes.filter(n => n.zone === selectedZone)
      : predictions.nodes
    const n = nodes.length

    return Array.from({ length: 30 }, (_, t) => {
      const row = { day: t + 1, S: 0, E: 0, I: 0, R: 0, D: 0 }
      nodes.forEach(node => {
        const d = node.days[t]
        row.S += d.S; row.E += d.E; row.I += d.I; row.R += d.R; row.D += d.D
      })
      row.S = +(row.S / n * 100).toFixed(2)
      row.E = +(row.E / n * 100).toFixed(2)
      row.I = +(row.I / n * 100).toFixed(2)
      row.R = +(row.R / n * 100).toFixed(2)
      row.D = +(row.D / n * 100).toFixed(2)
      return row
    })
  }, [predictions, selectedZone])

  return (
    <div className="panel">
      <div className="panel-title">
        SEIRD curve {selectedZone ? `— Zone ${selectedZone}` : '— All zones'}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
          <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#666' }} />
          <YAxis tick={{ fontSize: 10, fill: '#666' }} unit="%" />
          <Tooltip
            contentStyle={{ background: '#1a1d27', border: '1px solid #2a2d3a', fontSize: 11 }}
            formatter={(v, name) => [`${v}%`, name]}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine x={selectedDay} stroke="#fff" strokeDasharray="3 3" strokeOpacity={0.4} />
          {Object.entries(COLORS).map(([k, c]) => (
            <Line key={k} type="monotone" dataKey={k} stroke={c}
                  dot={false} strokeWidth={1.5} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}