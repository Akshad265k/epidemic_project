import { useMemo, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, ArcLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import MapGL from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useStore } from '../store';
import { getNodeColorHex, STATE_NAMES, STATE_HEX } from '../utils/colors';

const INITIAL_VIEW_STATE = {
  longitude: 73.86,
  latitude: 18.52,
  zoom: 12,
  pitch: 50,
  bearing: 0,
  maxZoom: 20,
  minZoom: 10
};

// Helper to convert hex to RGB array for DeckGL
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b, 255];
}

export default function GraphView() {
  const nodes = useStore((s) => s.nodes);
  const edgesSrc = useStore((s) => s.edgesSrc);
  const edgesDst = useStore((s) => s.edgesDst);
  const currentDay = useStore((s) => s.currentDay);

  const [tooltipInfo, setTooltipInfo] = useState(null);

  // Bypassing clustering entirely: Prepare ALL nodes
  const nodeLookup = useMemo(() => {
    const m = new Map();
    nodes.forEach(n => m.set(n.id, n));
    return m;
  }, [nodes]);

  // Create Arc data from edges
  const arcData = useMemo(() => {
    if (!edgesSrc.length) return [];
    const arcs = [];
    for (let i = 0; i < edgesSrc.length; i++) {
      const u = nodeLookup.get(edgesSrc[i]);
      const v = nodeLookup.get(edgesDst[i]);
      if (u && v) {
        arcs.push({
          source: [u.lng, u.lat],
          target: [v.lng, v.lat]
        });
      }
    }
    return arcs;
  }, [edgesSrc, edgesDst, nodeLookup]);

  const layers = [
    new ArcLayer({
      id: 'transmission-arcs',
      data: arcData,
      getSourcePosition: d => d.source,
      getTargetPosition: d => d.target,
      getSourceColor: [129, 140, 248, 15], // Indigo, highly translucent for glowing effect
      getTargetColor: [244, 63, 94, 15],   // Rose
      getWidth: 1,
      widthUnits: 'pixels'
    }),
    new HeatmapLayer({
      id: 'heatmap-layer',
      data: nodes,
      getPosition: d => [d.lng, d.lat],
      getWeight: d => {
        const state = d.days?.[currentDay];
        if (!state) return 0;
        // Heavily weight infected, somewhat weight exposed
        return (state.I || 0) * 10 + (state.E || 0) * 3;
      },
      radiusPixels: 50,
      intensity: 1.5,
      threshold: 0.05,
      colorRange: [
        [0, 0, 0, 0], // transparent
        [245, 158, 11, 40], // amber/orange
        [249, 115, 22, 80],
        [239, 68, 68, 150], // red
        [185, 28, 28, 200], // dark red
        [127, 29, 29, 255]
      ],
      updateTriggers: {
        getWeight: [currentDay]
      }
    }),
    new ScatterplotLayer({
      id: 'nodes-layer',
      data: nodes,
      getPosition: d => [d.lng, d.lat],
      getFillColor: d => {
        const state = d.days?.[currentDay];
        const hex = getNodeColorHex(state);
        return hexToRgb(hex);
      },
      getRadius: 15,
      radiusUnits: 'meters',
      radiusMinPixels: 2.5,
      radiusMaxPixels: 15,
      pickable: true,
      onHover: info => setTooltipInfo(info.object ? info : null),
      updateTriggers: {
        getFillColor: [currentDay]
      }
    })
  ];

  return (
    <div className="w-full h-full relative overflow-hidden bg-black">

      {/* 3D Context Badge */}
      <div className="absolute top-32 left-8 z-10 flex items-center gap-2 bg-[#0a0a0f]/80 backdrop-blur-2xl rounded-2xl px-5 py-3 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
        <span className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-widest mr-2">WebGL Hardware Acceleration</span>
        <span className="text-xs px-3 py-1.5 rounded-xl font-heading font-black text-indigo-400 bg-indigo-500/10 shadow-[0_0_10px_rgba(99,102,241,0.2)] border border-indigo-500/20">
          Hold Right-Click to Tilt 3D View
        </span>
      </div>

      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={layers}
        getCursor={({ isDragging, isHovering }) => (isDragging ? 'grabbing' : isHovering ? 'pointer' : 'grab')}
      >
        <MapGL
          mapLib={maplibregl}
          mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
          preventStyleDiffing={true}
        />
      </DeckGL>

      {/* Tooltip Overlay */}
      {tooltipInfo && tooltipInfo.object && (
        <div
          className="fixed z-[2000] bg-[#08080c]/95 backdrop-blur-3xl rounded-2xl p-5 pointer-events-none w-56 border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.6)]"
          style={{ left: tooltipInfo.x + 20, top: tooltipInfo.y - 20 }}
        >
          <div className="flex justify-between items-end mb-3 pb-3 border-b border-white/10">
            <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">Node ID</div>
            <div className="text-sm font-heading font-black text-indigo-400">#{tooltipInfo.object.id}</div>
          </div>
          <div className="grid grid-cols-5 gap-1 text-center">
            {['S', 'E', 'I', 'R', 'D'].map((k) => {
              const val = tooltipInfo.object.days?.[currentDay]?.[k] || 0;
              return (
                <div key={k}>
                  <div className="text-[10px] text-slate-500 font-bold mb-1">{k}</div>
                  <div className="text-[10px] font-black font-mono text-white">
                    {(val * 100).toFixed(0)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend Overlay */}
      <div className="absolute bottom-8 right-8 z-10 bg-[#0a0a0f]/80 backdrop-blur-2xl rounded-2xl p-4 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col gap-2 pointer-events-none">
        <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest mb-1 border-b border-white/10 pb-2">Node Status</div>
        {Object.entries(STATE_NAMES).map(([key, name]) => (
          <div key={key} className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor: STATE_HEX[key],
                boxShadow: `0 0 10px ${STATE_HEX[key]}80`
              }}
            />
            <span className="text-sm font-heading font-medium text-slate-300">{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
