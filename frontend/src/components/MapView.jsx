import { useRef, useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useStore } from '../store';
import { getSeverityColor, getNodeColor } from '../utils/colors';

// Pune center
const CENTER = [18.52, 73.86];
const NODE_ZOOM_THRESHOLD = 11;

export default function MapView({ source = 'baseline' }) {
  return (
    <div className="w-full h-full relative">
      <div className="absolute top-4 right-4 z-[400] bg-[#0a0a0f]/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[10px] font-black uppercase text-indigo-400 tracking-widest flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full ${source === 'baseline' ? 'bg-slate-400' : 'bg-indigo-400 animate-pulse'}`} />
        {source}
      </div>
      <MapContainer
        center={CENTER}
        zoom={12}
        className="w-full h-full"
        zoomControl={source === 'baseline'}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        <HeatmapOverlay source={source} />
        <NodeMarkers source={source} />
        <SyncMap />
      </MapContainer>
    </div>
  );
}

function SyncMap() {
  const map = useMap();
  // We can add cross-map synchronization here if desired
  return null;
}

/* ───── Heatmap Canvas Overlay ───── */
function HeatmapOverlay({ source }) {
  const map = useMap();
  const canvasRef = useRef(null);
  const data = useStore((s) => s[source]);
  const zones = data?.zones || [];
  const currentDay = useStore((s) => s.currentDay);

  useEffect(() => {
    // Create a custom canvas layer
    const CanvasLayer = L.Layer.extend({
      onAdd: function(map) {
        this._container = L.DomUtil.create('canvas', 'leaflet-heatmap-layer leaflet-layer');
        this._container.style.pointerEvents = 'none';
        this._container.style.zIndex = 300;
        map.getPanes().overlayPane.appendChild(this._container);
        this._map = map;
        this._draw();
        map.on('moveend zoomend viewreset', this._draw, this);
      },
      onRemove: function(map) {
        map.getPanes().overlayPane.removeChild(this._container);
        map.off('moveend zoomend viewreset', this._draw, this);
      },
      _draw: function() {
        if (!this._container || !this._map) return;
        const canvas = this._container;
        const ctx = canvas.getContext('2d');
        const size = this._map.getSize();
        canvas.width = size.x;
        canvas.height = size.y;
        
        const origin = this._map.getPixelOrigin();
        const panePos = L.DomUtil.getPosition(this._map.getPanes().mapPane);
        L.DomUtil.setPosition(canvas, { x: -panePos.x, y: -panePos.y });

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        zones.forEach((z) => {
          const severity = z.severity[currentDay] || 0;
          if (severity < 0.001) return;

          const point = this._map.latLngToContainerPoint([z.clat, z.clng]);
          const radius = Math.max(20, 100 * severity * (this._map.getZoom() / 10));
          
          const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
          const color = severity > 0.1 ? '255, 60, 100' : '129, 140, 248';
          gradient.addColorStop(0, `rgba(${color}, ${Math.min(0.6, severity * 4)})`);
          gradient.addColorStop(1, `rgba(${color}, 0)`);

          ctx.beginPath();
          ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
        });
      }
    });

    const layer = new CanvasLayer();
    layer.addTo(map);
    return () => {
      layer.remove();
    };
  }, [map, zones, currentDay]);

  return null;
}

/* ───── Individual Node Markers ───── */
function NodeMarkers({ source }) {
  const map = useMap();
  const data = useStore((s) => s[source]);
  const nodes = data?.nodes || [];
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

  const visibleNodes = useMemo(() => {
    if (zoom < NODE_ZOOM_THRESHOLD || !nodes.length) return [];
    const bounds = map.getBounds();
    return nodes.filter((n) =>
      n.lat >= bounds.getSouth() && n.lat <= bounds.getNorth() &&
      n.lng >= bounds.getWest() && n.lng <= bounds.getEast()
    ).slice(0, 400);
  }, [zoom, nodes, map]);

  useEffect(() => {
    const lg = layerGroupRef.current;
    if (!lg) return;
    lg.clearLayers();

    if (zoom < NODE_ZOOM_THRESHOLD) return;

    for (const node of visibleNodes) {
      const state = node.days?.[currentDay];
      if (!state) continue;

      const color = getNodeColor(state);
      const marker = L.circleMarker([node.lat, node.lng], {
        radius: 4,
        fillColor: color,
        color: '#fff',
        weight: 1,
        opacity: 0.3,
        fillOpacity: 0.8,
      });

      marker.bindTooltip(`Node #${node.id}<br/>I: ${(state.I * 100).toFixed(1)}%`, {
        className: 'custom-tooltip',
        direction: 'top',
        offset: [0, -5]
      });
      
      marker.addTo(lg);
    }
  }, [visibleNodes, currentDay, zoom]);

  return null;
}
