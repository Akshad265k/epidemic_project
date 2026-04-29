import { useEffect, useRef, useMemo, useState } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useStore } from '../store';
import { getNodeColorHex, getSeverityColor } from '../utils/colors';

// Pune center
const CENTER = [18.52, 73.86];
const NODE_ZOOM_THRESHOLD = 14;

export default function MapView() {
  return (
    <div className="w-full h-full">
      <MapContainer
        center={CENTER}
        zoom={12}
        className="w-full h-full"
        zoomControl={true}
        attributionControl={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        <HeatmapOverlay />
        <NodeMarkers />
      </MapContainer>
    </div>
  );
}

/* ───── Heatmap Canvas Overlay ───── */
function HeatmapOverlay() {
  const map = useMap();
  const canvasRef = useRef(null);
  const zones = useStore((s) => s.zones);
  const currentDay = useStore((s) => s.currentDay);
  const [zoom, setZoom] = useState(map.getZoom());

  useMapEvents({
    zoom: () => setZoom(map.getZoom()),
    move: () => drawHeatmap(),
    zoomend: () => drawHeatmap(),
  });

  useEffect(() => {
    // Create canvas overlay
    const pane = map.createPane('heatmapPane');
    pane.style.zIndex = '350';
    pane.style.pointerEvents = 'none';

    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.zIndex = '350';
    canvas.style.pointerEvents = 'none';
    pane.appendChild(canvas);
    canvasRef.current = canvas;

    const onMove = () => drawHeatmap();
    map.on('move zoom viewreset resize', onMove);
    drawHeatmap();

    return () => {
      map.off('move zoom viewreset resize', onMove);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
  }, [map]);

  useEffect(() => { drawHeatmap(); }, [currentDay, zones, zoom]);

  function drawHeatmap() {
    const canvas = canvasRef.current;
    if (!canvas || !zones.length) return;

    if (map.getZoom() >= NODE_ZOOM_THRESHOLD) {
      canvas.style.display = 'none';
      return;
    }
    canvas.style.display = 'block';

    const size = map.getSize();
    if (canvas.width !== size.x || canvas.height !== size.y) {
      canvas.width = size.x;
      canvas.height = size.y;
    }

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const day = useStore.getState().currentDay;

    for (const zone of zones) {
      const severity = zone.severity?.[day] ?? 0;
      if (severity < 0.001) continue;

      // Use ContainerPoint directly to avoid parallax
      const pt = map.latLngToContainerPoint([zone.clat, zone.clng]);
      const px = pt.x;
      const py = pt.y;

      const baseRadius = 80;
      const zoomFactor = Math.pow(2, map.getZoom() - 12);
      const radius = baseRadius * zoomFactor;

      const gradient = ctx.createRadialGradient(px, py, 0, px, py, radius);
      gradient.addColorStop(0, getSeverityColor(severity, 0.5));
      gradient.addColorStop(0.5, getSeverityColor(severity, 0.2));
      gradient.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }
  }

  return null;
}

/* ───── Individual Node Markers ───── */
function NodeMarkers() {
  const map = useMap();
  const nodes = useStore((s) => s.nodes);
  const currentDay = useStore((s) => s.currentDay);
  const layerGroupRef = useRef(null);
  const [zoom, setZoom] = useState(map.getZoom());

  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
  });

  useEffect(() => {
    if (!layerGroupRef.current) {
      layerGroupRef.current = L.layerGroup().addTo(map);
    }
    return () => {
      if (layerGroupRef.current) {
        layerGroupRef.current.clearLayers();
        map.removeLayer(layerGroupRef.current);
      }
    };
  }, [map]);

  // Visible nodes in viewport
  const visibleNodes = useMemo(() => {
    if (zoom < NODE_ZOOM_THRESHOLD || !nodes.length) return [];
    const bounds = map.getBounds();
    const inBounds = nodes.filter((n) =>
      n.lat >= bounds.getSouth() && n.lat <= bounds.getNorth() &&
      n.lng >= bounds.getWest() && n.lng <= bounds.getEast()
    );
    // Limit to 200
    return inBounds.slice(0, 200);
  }, [zoom, nodes, currentDay]);

  useEffect(() => {
    const lg = layerGroupRef.current;
    if (!lg) return;
    lg.clearLayers();

    if (zoom < NODE_ZOOM_THRESHOLD) return;

    for (const node of visibleNodes) {
      const state = node.days?.[currentDay];
      const color = getNodeColorHex(state);
      const isDead = state && state.D > 0.5;

      const marker = L.circleMarker([node.lat, node.lng], {
        radius: 5,
        fillColor: color,
        color: 'rgba(255,255,255,0.2)',
        weight: 1,
        fillOpacity: 0.85,
      });

      const tooltipContent = `
        <div style="font-family:Inter,sans-serif;font-size:11px;line-height:1.4">
          <strong>Node #${node.id}</strong> · Zone ${node.zone}<br/>
          <span style="color:#22c55e">S</span> ${((state?.S || 0) * 100).toFixed(1)}%
          <span style="color:#f59e0b">E</span> ${((state?.E || 0) * 100).toFixed(1)}%
          <span style="color:#ef4444">I</span> ${((state?.I || 0) * 100).toFixed(1)}%
          <span style="color:#3b82f6">R</span> ${((state?.R || 0) * 100).toFixed(1)}%
          <span style="color:#666">D</span> ${((state?.D || 0) * 100).toFixed(1)}%
        </div>
      `;

      marker.bindTooltip(tooltipContent, {
        className: 'custom-tooltip',
        direction: 'top',
        offset: [0, -8],
      });

      lg.addLayer(marker);
    }
  }, [visibleNodes, currentDay, zoom]);

  return null;
}
