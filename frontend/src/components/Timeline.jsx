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

  // Playback loop
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

  // Aggregate SEIRD for mini chart
  const aggregates = useRef([]);
  useEffect(() => {
    if (!nodes.length) return;
    const agg = [];
    for (let d = 0; d < 30; d++) {
      const totals = { S: 0, E: 0, I: 0, R: 0, D: 0 };
      for (const n of nodes) {
        if (!n.days[d]) continue;
        totals.S += n.days[d].S;
        totals.E += n.days[d].E;
        totals.I += n.days[d].I;
        totals.R += n.days[d].R;
        totals.D += n.days[d].D;
      }
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
    <div className="glass-strong h-20 shrink-0 z-50 flex items-center px-6 gap-4">
      {/* Play/Pause */}
      <button
        onClick={togglePlay}
        className="w-10 h-10 rounded-xl bg-[var(--color-accent)] flex items-center justify-center
                   hover:bg-[var(--color-accent-light)] transition-colors shadow-lg shadow-indigo-500/20"
      >
        <span className="text-white text-lg">{isPlaying ? '⏸' : '▶'}</span>
      </button>

      {/* Speed */}
      <button
        onClick={() => {
          const idx = speeds.indexOf(playbackSpeed);
          setPlaybackSpeed(speeds[(idx + 1) % speeds.length]);
        }}
        className="text-xs font-mono px-2 py-1 rounded-lg bg-[var(--color-bg-primary)]
                   text-[var(--color-text-secondary)] hover:text-white transition-colors min-w-[40px]"
      >
        {playbackSpeed}x
      </button>

      {/* Track */}
      <div className="flex-1 relative h-10 cursor-pointer group" onMouseDown={(e) => {
        handleScrub(e);
        const move = (ev) => handleScrub(ev);
        const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
      }}>
        {/* Mini area chart background */}
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
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
                fill={STATE_HEX[state]}
                opacity="0.15"
              />
            );
          })}
        </svg>

        {/* Track line */}
        <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 bg-[var(--color-border)] rounded-full">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-[width] duration-75"
            style={{ width: `${(currentDay / 29) * 100}%` }}
          />
        </div>

        {/* Tick marks */}
        {[0, 5, 10, 15, 20, 25, 29].map((d) => (
          <div key={d} className="absolute top-1/2 -translate-y-1/2"
            style={{ left: `${(d / 29) * 100}%` }}>
            <div className="w-px h-3 bg-[var(--color-border-light)] mx-auto" />
            <div className="text-[9px] text-[var(--color-text-muted)] text-center mt-0.5 font-mono">
              {d + 1}
            </div>
          </div>
        ))}

        {/* Playhead */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-[left] duration-75"
          style={{ left: `${(currentDay / 29) * 100}%` }}
        >
          <div className="w-4 h-4 rounded-full bg-white shadow-lg shadow-white/20
                          group-hover:scale-125 transition-transform" />
          <div className="absolute -top-6 left-1/2 -translate-x-1/2
                          bg-[var(--color-accent)] text-white text-[10px] font-bold
                          px-1.5 py-0.5 rounded-md whitespace-nowrap">
            Day {currentDay + 1}
          </div>
        </div>
      </div>

      {/* Day display */}
      <div className="text-right min-w-[60px]">
        <div className="text-lg font-bold font-mono">{currentDay + 1}</div>
        <div className="text-[10px] text-[var(--color-text-muted)]">/ 30</div>
      </div>
    </div>
  );
}
