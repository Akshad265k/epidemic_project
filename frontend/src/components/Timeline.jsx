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
    <div className="h-full w-full bg-[#0a0a0f]/40 backdrop-blur-3xl rounded-[40px] flex items-center px-10 gap-8 border border-white/10 shadow-2xl overflow-hidden relative">
      {/* Background Area Chart */}
      <div className="absolute inset-x-10 inset-y-4 opacity-10 pointer-events-none">
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
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
              />
            );
          })}
        </svg>
      </div>

      {/* Controls Group */}
      <div className="flex items-center gap-4 z-10">
        <button
          onClick={togglePlay}
          className="w-12 h-12 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white flex items-center justify-center
                     transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
        >
          <span className="text-xl">{isPlaying ? '⏸' : '▶'}</span>
        </button>

        <button
          onClick={() => {
            const idx = speeds.indexOf(playbackSpeed);
            setPlaybackSpeed(speeds[(idx + 1) % speeds.length]);
          }}
          className="text-[10px] font-black px-3 py-2 rounded-xl bg-white/5 border border-white/5
                     text-slate-400 hover:text-white hover:bg-white/10 transition-all uppercase tracking-tighter"
        >
          {playbackSpeed}x
        </button>
      </div>

      {/* Track */}
      <div className="flex-1 relative h-12 cursor-pointer group z-10" onMouseDown={(e) => {
        handleScrub(e);
        const move = (ev) => handleScrub(ev);
        const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
      }}>
        {/* Track line */}
        <div className="absolute top-1/2 left-0 right-0 h-1.5 -translate-y-1/2 bg-white/5 rounded-full">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-[width] duration-75 shadow-[0_0_12px_rgba(129,140,248,0.4)]"
            style={{ width: `${(currentDay / 29) * 100}%` }}
          />
        </div>

        {/* Tick marks */}
        {[0, 5, 10, 15, 20, 25, 29].map((d) => (
          <div key={d} className="absolute top-1/2 -translate-y-1/2" style={{ left: `${(d / 29) * 100}%` }}>
            <div className="w-px h-3 bg-white/10 mx-auto" />
          </div>
        ))}

        {/* Playhead */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-[left] duration-75"
          style={{ left: `${(currentDay / 29) * 100}%` }}
        >
          <div className="w-5 h-5 rounded-full bg-white shadow-xl group-hover:scale-125 transition-transform border-4 border-indigo-500" />
          <div className="absolute -top-10 left-1/2 -translate-x-1/2
                          bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest
                          px-2 py-1 rounded-lg whitespace-nowrap shadow-2xl">
            Day {currentDay + 1}
          </div>
        </div>
      </div>

      {/* Day display */}
      <div className="text-right min-w-[80px] shrink-0 z-10">
        <div className="text-3xl font-black font-mono leading-none text-white tracking-tighter">{currentDay + 1}</div>
        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">/ 30 Days</div>
      </div>
    </div>
  );
}
