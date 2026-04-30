import { useMemo } from 'react';
import { useStore } from '../store';
import { STATE_HEX, STATE_NAMES, STATE_LABELS } from '../utils/colors';

export default function StatsSidebar() {
  const nodes = useStore((s) => s.nodes);
  const currentDay = useStore((s) => s.currentDay);

  const stats = useMemo(() => {
    if (!nodes.length) return null;
    const totals = { S: 0, E: 0, I: 0, R: 0, D: 0 };
    let count = 0;
    for (const n of nodes) {
      const d = n.days?.[currentDay];
      if (!d) continue;
      totals.S += d.S;
      totals.E += d.E;
      totals.I += d.I;
      totals.R += d.R;
      totals.D += d.D;
      count++;
    }

    let prevI = 0;
    if (currentDay > 0) {
      for (const n of nodes) {
        prevI += n.days?.[currentDay - 1]?.I || 0;
      }
    }

    return {
      counts: {
        S: Math.round(totals.S),
        E: Math.round(totals.E),
        I: Math.round(totals.I),
        R: Math.round(totals.R),
        D: Math.round(totals.D),
      },
      pcts: {
        S: ((totals.S / count) * 100).toFixed(1),
        E: ((totals.E / count) * 100).toFixed(1),
        I: ((totals.I / count) * 100).toFixed(1),
        R: ((totals.R / count) * 100).toFixed(1),
        D: ((totals.D / count) * 100).toFixed(1),
      },
      deltaI: Math.round(totals.I) - Math.round(prevI),
      total: count,
    };
  }, [nodes, currentDay]);

  if (!stats) return null;

  return (
    <div className="h-full w-full bg-[#0a0a0f]/40 backdrop-blur-3xl rounded-[40px] flex flex-col overflow-hidden border border-white/10 shadow-2xl">
      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-black text-white uppercase tracking-widest">
            Population
          </h3>
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-500/10 rounded-full border border-indigo-500/20">
            <div className="w-1 h-1 bg-indigo-400 rounded-full animate-pulse" />
            <span className="text-[8px] font-black text-indigo-400 uppercase tracking-tighter">Live</span>
          </div>
        </div>
        <p className="text-xs text-slate-500 font-bold">
          Day {currentDay + 1} · {stats.total.toLocaleString()} Nodes
        </p>
      </div>

      {/* SEIRD Cards */}
      <div className="p-6 space-y-3 flex-1 overflow-y-auto scrollbar-hide">
        {STATE_LABELS.map((key) => (
          <div key={key} className="rounded-2xl p-4 bg-white/[0.03] border border-white/5 group hover:bg-white/[0.05] transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor]" style={{ color: key === 'D' ? '#fff' : STATE_HEX[key], background: key === 'D' ? '#fff' : STATE_HEX[key] }} />
                <span className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">{STATE_NAMES[key]}</span>
              </div>
              <span className="text-[10px] font-black font-mono text-slate-500">{stats.pcts[key]}%</span>
            </div>
            <div className="text-2xl font-black font-mono tracking-tighter" style={{ color: key === 'D' ? '#fff' : STATE_HEX[key] }}>
              {stats.counts[key].toLocaleString()}
            </div>
            {/* Mini bar */}
            <div className="mt-3 h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(255,255,255,0.1)]"
                style={{ width: `${stats.pcts[key]}%`, background: key === 'D' ? '#fff' : STATE_HEX[key] }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Infection delta */}
      <div className="p-6 border-t border-white/5 bg-[#0a0a0f]/60">
        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Daily Growth</div>
        <div className="flex items-end gap-2">
          <div className={`text-xl font-black font-mono leading-none ${stats.deltaI > 0 ? 'text-red-400' : stats.deltaI < 0 ? 'text-emerald-400' : 'text-indigo-400'}`}>
            {stats.deltaI > 0 ? '↑' : stats.deltaI < 0 ? '↓' : ''}{Math.abs(stats.deltaI).toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500 font-bold mb-0.5">/ 24h</span>
        </div>
      </div>
    </div>
  );
}
