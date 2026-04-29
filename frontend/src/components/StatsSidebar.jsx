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

    // Previous day for delta
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
    <div className="w-56 shrink-0 glass-strong z-40 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--color-border)]">
        <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-widest">
          Population Stats
        </h3>
        <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
          Day {currentDay + 1} · {stats.total.toLocaleString()} nodes
        </p>
      </div>

      {/* SEIRD Cards */}
      <div className="p-3 space-y-2 flex-1">
        {STATE_LABELS.map((key) => (
          <div key={key} className="rounded-xl p-3 bg-[var(--color-bg-primary)] border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: STATE_HEX[key] }} />
                <span className="text-xs text-[var(--color-text-secondary)]">{STATE_NAMES[key]}</span>
              </div>
              <span className="text-xs font-mono text-[var(--color-text-muted)]">{stats.pcts[key]}%</span>
            </div>
            <div className="text-lg font-bold font-mono" style={{ color: STATE_HEX[key] }}>
              {stats.counts[key].toLocaleString()}
            </div>
            {/* Mini bar */}
            <div className="mt-1.5 h-1 bg-[var(--color-bg-card)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${stats.pcts[key]}%`, background: STATE_HEX[key] }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Infection delta */}
      <div className="px-4 py-3 border-t border-[var(--color-border)]">
        <div className="text-[10px] text-[var(--color-text-muted)] uppercase">Daily Δ Infected</div>
        <div className={`text-sm font-bold font-mono ${stats.deltaI > 0 ? 'text-red-400' : stats.deltaI < 0 ? 'text-emerald-400' : 'text-[var(--color-text-muted)]'}`}>
          {stats.deltaI > 0 ? '+' : ''}{stats.deltaI.toLocaleString()}
        </div>
      </div>
    </div>
  );
}
