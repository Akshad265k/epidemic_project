import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store';
import { STATE_HEX } from '../utils/colors';

export default function Timeline() {
  const currentDay = useStore((s) => s.currentDay);
  const setCurrentDay = useStore((s) => s.setCurrentDay);
  const isPlaying = useStore((s) => s.isPlaying);
  const togglePlay = useStore((s) => s.togglePlay);
  const playbackSpeed = useStore((s) => s.playbackSpeed);
  const setPlaybackSpeed = useStore((s) => s.setPlaybackSpeed);
  const nodes = useStore((s) => s.nodes);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(null);
  const fractionalDay = useRef(0);

  useEffect(() => {
    if (!isPlaying) {
      lastTimeRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    fractionalDay.current = currentDay;
    const tick = (timestamp) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const dt = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;
      fractionalDay.current += dt * playbackSpeed;

      if (fractionalDay.current >= 29) {
        setCurrentDay(29);
        useStore.getState().setIsPlaying(false);
        return;
      }
      setCurrentDay(Math.floor(fractionalDay.current));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isPlaying, playbackSpeed]);

  const aggregates = useRef([]);
  useEffect(() => {
    if (!nodes.length) return;
    const agg = [];
    for (let d = 0; d < 30; d++) {
      const totals = { S: 0, E: 0, I: 0, R: 0, D: 0 };
      nodes.forEach(n => {
        if (!n.days[d]) return;
        totals.S += n.days[d].S;
        totals.E += n.days[d].E;
        totals.I += n.days[d].I;
        totals.R += n.days[d].R;
        totals.D += n.days[d].D;
      });
      const N = nodes.length;
      agg.push({ S: totals.S / N, E: totals.E / N, I: totals.I / N, R: totals.R / N, D: totals.D / N });
    }
    aggregates.current = agg;
  }, [nodes]);

  const handleScrub = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const day = Math.round(pct * 29);
    setCurrentDay(day);
    fractionalDay.current = day;
  }, [setCurrentDay]);

  const speeds = [0.5, 1, 2, 4];

  return (
    <div className="h-full w-full glass-panel rounded-[32px] flex items-center px-10 gap-8 overflow-hidden relative">
      {/* Background Area Chart */}
      <div className="absolute inset-x-10 inset-y-4 opacity-20 pointer-events-none">
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}>
          {aggregates.current.length > 0 && ['D', 'R', 'I', 'E', 'S'].map((state) => {
            const pts = aggregates.current.map((a, i) => {
              const x = (i / 29) * 100;
              let y0 = 0;
              const order = ['S', 'E', 'I', 'R', 'D'];
              for (const s of order) {
                if (s === state) break;
                y0 += a[s];
              }
              const y1 = y0 + a[state];
              return { x, y0: (1 - y0) * 100, y1: (1 - y1) * 100 };
            });
            const top = pts.map(p => `${p.x},${p.y1}`).join(' ');
            const bottom = [...pts].reverse().map(p => `${p.x},${p.y0}`).join(' ');
            return (
              <polygon
                key={state}
                points={`${top} ${bottom}`}
                fill={state === 'D' ? '#fff' : STATE_HEX[state]}
                className="transition-all duration-300"
              />
            );
          })}
        </svg>
      </div>

      {/* Controls Group */}
      <div className="flex items-center gap-4 z-10 bg-black/20 p-2 rounded-2xl border border-white/5 backdrop-blur-md">
        <button
          onClick={togglePlay}
          className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 active:scale-95
                     ${isPlaying 
                       ? 'bg-white/10 text-white border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)]' 
                       : 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/30'}`}
        >
          <span className="text-2xl">{isPlaying ? '⏸' : '▶'}</span>
        </button>

        <button
          onClick={() => {
            const idx = speeds.indexOf(playbackSpeed);
            setPlaybackSpeed(speeds[(idx + 1) % speeds.length]);
          }}
          className="text-xs font-mono font-bold px-4 py-2.5 rounded-lg bg-white/5 border border-white/10
                     text-slate-300 hover:text-white hover:bg-white/10 transition-all tracking-wider shadow-inner"
        >
          {playbackSpeed}x
        </button>
      </div>

      {/* Track */}
      <div className="flex-1 relative h-16 cursor-pointer group z-10 flex items-center" onMouseDown={(e) => {
        handleScrub(e);
        const move = (ev) => handleScrub(ev);
        const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
      }}>
        {/* Track line (background) */}
        <div className="absolute left-0 right-0 h-2 bg-black/40 rounded-full border border-white/5 shadow-inner" />
        
        {/* Active Track Fill */}
        <div className="absolute left-0 h-2 rounded-full overflow-hidden pointer-events-none" style={{ width: `${(currentDay / 29) * 100}%` }}>
          <div className="w-full h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.8)]" />
        </div>

        {/* Tick marks */}
        {[0, 5, 10, 15, 20, 25, 29].map((d) => (
          <div key={d} className="absolute pointer-events-none flex flex-col items-center" style={{ left: `${(d / 29) * 100}%` }}>
            <div className="w-px h-2 bg-white/20 mb-1" />
            <div className="text-[9px] font-mono text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2">{d+1}</div>
          </div>
        ))}

        {/* Playhead */}
        <div
          className="absolute -translate-x-1/2 pointer-events-none transition-[left] duration-75"
          style={{ left: `${(currentDay / 29) * 100}%` }}
        >
          {/* Thumb */}
          <div className="w-6 h-6 rounded-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.6)] group-hover:scale-125 transition-transform border-4 border-indigo-500 flex items-center justify-center">
             <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
          </div>
          
          {/* Tooltip */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2
                          bg-[#08080c] text-white text-[10px] font-mono font-bold uppercase tracking-widest
                          px-3 py-1.5 rounded-lg whitespace-nowrap shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-indigo-500/30 opacity-0 group-hover:opacity-100 transition-opacity group-hover:-translate-y-2">
            Day {currentDay + 1}
          </div>
        </div>
      </div>

      {/* Day display */}
      <div className="text-right min-w-[90px] shrink-0 z-10 bg-black/20 p-3 rounded-2xl border border-white/5 backdrop-blur-md">
        <div className="text-4xl font-heading font-black leading-none text-white tracking-tighter text-glow">{currentDay + 1}</div>
        <div className="text-[10px] text-indigo-400 font-mono font-bold uppercase tracking-[0.2em] mt-1">/ 30 Days</div>
      </div>
    </div>
  );
}
