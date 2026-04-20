import React, { useMemo, useRef, useEffect } from 'react'
import {
  MapContainer, TileLayer, CircleMarker,
  Tooltip, useMap, useMapEvents
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useStore } from '../store'
import './MapView.css'

// Interpolate color: green -> yellow -> orange -> red
function severityColor(v) {
  // v: 0 to 1
  if (v < 0.02) return { fill: '#22c55e', opacity: 0.5 }
  if (v < 0.08) return { fill: '#84cc16', opacity: 0.55 }
  if (v < 0.2)  return { fill: '#eab308', opacity: 0.6 }
  if (v < 0.4)  return { fill: '#f97316', opacity: 0.65 }
  if (v < 0.6)  return { fill: '#ef4444', opacity: 0.7 }
  return { fill: '#991b1b', opacity: 0.8 }
}

function nodeColor(I) {
  if (I > 0.6)  return '#ef4444'
  if (I > 0.3)  return '#f97316'
  if (I > 0.1)  return '#eab308'
  if (I > 0.02) return '#84cc16'
  return '#22c55e'
}

// Heatmap canvas overlay drawn manually over the map
function HeatmapCanvas({ zones, selectedDay }) {
  const map = useMap()
  const canvasRef = useRef()
  const t = selectedDay - 1

  useEffect(() => {
    if (!canvasRef.current || !zones.length) return

    const canvas = canvasRef.current
    const size   = map.getSize()
    canvas.width  = size.x
    canvas.height = size.y
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, size.x, size.y)

    zones.forEach(z => {
      const severity = z.severity[t]
      if (severity < 0.01) return

      const point  = map.latLngToContainerPoint([z.clat, z.clng])
      const radius = 60 + severity * 120

      const gradient = ctx.createRadialGradient(
        point.x, point.y, 0,
        point.x, point.y, radius
      )

      // Red-orange-yellow-transparent gradient
      const alpha = Math.min(0.7, severity * 1.5)
      gradient.addColorStop(0,   `rgba(220, 38, 38, ${alpha})`)
      gradient.addColorStop(0.3, `rgba(234, 88, 12, ${alpha * 0.8})`)
      gradient.addColorStop(0.6, `rgba(234, 179, 8, ${alpha * 0.5})`)
      gradient.addColorStop(1,   `rgba(34, 197, 94, 0)`)

      ctx.beginPath()
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()
    })
  }, [zones, selectedDay, map])

  // Reposition canvas on map move/zoom
  useMapEvents({
    move:    () => repositionCanvas(),
    zoom:    () => repositionCanvas(),
    resize:  () => repositionCanvas(),
  })

  function repositionCanvas() {
    if (!canvasRef.current) return
    const size = map.getSize()
    canvasRef.current.width  = size.x
    canvasRef.current.height = size.y

    const ctx = canvasRef.current.getContext('2d')
    ctx.clearRect(0, 0, size.x, size.y)

    zones.forEach(z => {
      const severity = z.severity[selectedDay - 1]
      if (severity < 0.01) return
      const point  = map.latLngToContainerPoint([z.clat, z.clng])
      const radius = 60 + severity * 120
      const alpha  = Math.min(0.7, severity * 1.5)
      const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius)
      gradient.addColorStop(0,   `rgba(220, 38, 38, ${alpha})`)
      gradient.addColorStop(0.3, `rgba(234, 88, 12, ${alpha * 0.8})`)
      gradient.addColorStop(0.6, `rgba(234, 179, 8, ${alpha * 0.5})`)
      gradient.addColorStop(1,   'rgba(34, 197, 94, 0)')
      ctx.beginPath()
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()
    })
  }

  // Position canvas absolutely over the map container
  const mapContainer = map.getContainer()
  const style = {
    position: 'absolute',
    top: 0, left: 0,
    pointerEvents: 'none',
    zIndex: 400,
  }

  return (
    <canvas
      ref={canvasRef}
      style={style}
      width={mapContainer.clientWidth}
      height={mapContainer.clientHeight}
    />
  )
}

// Zoom into zone on click
function ZoneZoomer({ zones, selectedZone, setSelectedZone }) {
  const map = useMap()

  useMapEvents({
    click: () => setSelectedZone(null),
  })

  useEffect(() => {
    if (!selectedZone) return
    const zone = zones.find(z => z.zone === selectedZone)
    if (!zone) return
    map.flyTo([zone.clat, zone.clng], 15, { animate: true, duration: 0.8 })
  }, [selectedZone])

  return null
}

export default function MapView() {
  const {
    predictions, selectedDay, selectedZone,
    setSelectedZone, getNodeState
  } = useStore()
  const t = selectedDay - 1

  const nodeDots = useMemo(() => {
    if (!predictions || !selectedZone) return []
    return predictions.nodes
      .filter(n => n.zone === selectedZone)
      .map(n => {
        const s = getNodeState(n.id, t)
        return { id: n.id, lat: n.lat, lng: n.lng, I: s ? s.I : n.days[t].I }
      })
  }, [predictions, selectedDay, selectedZone])

  if (!predictions) return null
  const center = [predictions.zones[0].clat, predictions.zones[0].clng]

  return (
    <div className="map-wrap">
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com">CARTO</a>'
        />

        <HeatmapCanvas zones={predictions.zones} selectedDay={selectedDay} />
        <ZoneZoomer
          zones={predictions.zones}
          selectedZone={selectedZone}
          setSelectedZone={setSelectedZone}
        />

        {/* Zone circle markers */}
        {predictions.zones.map(z => {
          const sev = z.severity[t]
          const { fill, opacity } = severityColor(sev)
          return (
            <CircleMarker
              key={z.zone}
              center={[z.clat, z.clng]}
              radius={14 + sev * 40}
              fillColor={fill}
              fillOpacity={opacity}
              color={fill}
              weight={2}
              opacity={0.9}
              eventHandlers={{
                click: (e) => {
                  e.originalEvent.stopPropagation()
                  setSelectedZone(z.zone === selectedZone ? null : z.zone)
                }
              }}
            >
              <Tooltip direction="top" permanent={false} sticky={false}>
                <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                  <b>Zone {z.zone}</b><br />
                  Severity: {(sev * 100).toFixed(1)}%<br />
                  Peak: day {z.peak_day}
                </div>
              </Tooltip>
            </CircleMarker>
          )
        })}

        {/* Individual nodes when zoomed into a zone */}
        {nodeDots.map(n => (
          <CircleMarker
            key={n.id}
            center={[n.lat, n.lng]}
            radius={5}
            fillColor={nodeColor(n.I)}
            fillOpacity={0.85}
            color={'#000'}
            weight={0.5}
          >
            <Tooltip>
              <div style={{ fontSize: 11 }}>
                Node {n.id} — I: {(n.I * 100).toFixed(1)}%
              </div>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Legend */}
      <div className="map-legend">
        <div className="legend-title">Infection severity</div>
        {[
          ['#22c55e', '< 2%'],
          ['#84cc16', '2–8%'],
          ['#eab308', '8–20%'],
          ['#f97316', '20–40%'],
          ['#ef4444', '40–60%'],
          ['#991b1b', '> 60%'],
        ].map(([c, l]) => (
          <div key={l} className="legend-row">
            <span className="legend-dot" style={{ background: c }} />
            <span>{l}</span>
          </div>
        ))}
        <div className="legend-hint">Click zone to zoom in</div>
      </div>

      {selectedZone && (
        <div className="zone-badge">
          Zone {selectedZone} — {nodeDots.length} nodes
          <button onClick={() => setSelectedZone(null)}>✕</button>
        </div>
      )}
    </div>
  )
}

