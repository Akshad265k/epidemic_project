import { useMemo } from 'react';
import { useStore } from '../store';
import { STATE_HEX, STATE_NAMES, STATE_LABELS } from '../utils/colors';
import { motion } from 'framer-motion';

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

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-heading font-black text-white uppercase tracking-widest text-glow">
            Population Scope
          </h3>
          <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/10 rounded-full border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full shadow-[0_0_8px_currentColor] animate-pulse" />
            <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Live</span>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 font-bold font-mono">
          Day {currentDay + 1} · {stats.total.toLocaleString()} Nodes
        </p>
      </div>

      {/* SEIRD Cards */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="p-6 space-y-4 flex-1 overflow-y-auto scrollbar-hide"
      >
        {STATE_LABELS.map((key) => (
          <motion.div 
            variants={itemVariants}
            key={key} 
            className="rounded-3xl p-5 bg-white/[0.02] border border-white/5 group hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300 relative overflow-hidden"
          >
            {/* Subtle glow background */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 50%, ${key === 'D' ? '#fff' : STATE_HEX[key]}, transparent 70%)` }} />

            <div className="flex items-center justify-between mb-3 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor]" style={{ color: key === 'D' ? '#fff' : STATE_HEX[key], background: key === 'D' ? '#fff' : STATE_HEX[key] }} />
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">{STATE_NAMES[key]}</span>
              </div>
              <span className="text-[11px] font-black font-mono text-slate-500">{stats.pcts[key]}%</span>
            </div>
            
            <div className="text-3xl font-heading font-black tracking-tighter relative z-10" style={{ color: key === 'D' ? '#fff' : STATE_HEX[key], textShadow: `0 0 20px ${key === 'D' ? 'rgba(255,255,255,0.4)' : STATE_HEX[key]}40` }}>
              {stats.counts[key].toLocaleString()}
            </div>
            
            {/* Mini bar */}
            <div className="mt-4 h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5 relative z-10">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_currentColor]"
                style={{ width: `${stats.pcts[key]}%`, background: key === 'D' ? '#fff' : STATE_HEX[key], color: key === 'D' ? '#fff' : STATE_HEX[key] }}
              />
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Infection delta */}
      <div className="p-6 border-t border-white/5 bg-black/20 backdrop-blur-md">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Daily Infection Growth</div>
        <div className="flex items-end gap-3">
          <div className={`text-2xl font-heading font-black tracking-tighter ${stats.deltaI > 0 ? 'text-rose-400 text-glow' : stats.deltaI < 0 ? 'text-emerald-400 text-glow' : 'text-indigo-400 text-glow'}`}>
            {stats.deltaI > 0 ? '↑' : stats.deltaI < 0 ? '↓' : ''}{Math.abs(stats.deltaI).toLocaleString()}
          </div>
          <span className="text-[11px] font-mono text-slate-500 font-bold mb-1">/ 24h</span>
        </div>
      </div>
    </div>
  );
}
