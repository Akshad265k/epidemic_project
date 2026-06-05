import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store';
import { STATE_HEX } from '../utils/colors';
import ExpandedAnalytics from './ExpandedAnalytics.jsx';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine
} from 'recharts';
import { motion } from 'framer-motion';

export default function AnalyticsPanel() {
  const currentDay = useStore((s) => s.currentDay);
  const baseline = useStore((s) => s.baseline);
  const scenario = useStore((s) => s.scenario);
  const isComparing = useStore((s) => s.isComparing);
  const nodes = useStore((s) => s.nodes);
  const N = nodes.length;
  const [isExpanded, setIsExpanded] = useState(false);

  const chartData = useMemo(() => {
    const data = [];
    for (let d = 0; d < 31; d++) {
      const entry = { day: d };
      
      if (baseline?.global_totals?.[d]) {
        entry.baseline_I = baseline.global_totals[d].I;
        entry.baseline_D = baseline.global_totals[d].D;
      }
      
      if (scenario?.global_totals?.[d]) {
        entry.scenario_I = scenario.global_totals[d].I;
        entry.scenario_D = scenario.global_totals[d].D;
      }
      data.push(entry);
    }
    return data;
  }, [baseline, scenario]);

  const metrics = useMemo(() => {
    if (!baseline?.global_totals) return null;
    const bToday = chartData[currentDay];
    const bPeakFraction = Math.max(...chartData.map(d => d.baseline_I || 0));
    const bPeakCount = Math.round(bPeakFraction * N);
    
    const bTotalDeaths = Math.round((baseline.global_totals[30]?.D || 0) * N);
    const bTotalInfected = (baseline.global_totals[30]?.I || 0) + (baseline.global_totals[30]?.R || 0) + (baseline.global_totals[30]?.D || 0);
    const bCFR = bTotalInfected > 0 ? ((baseline.global_totals[30]?.D || 0) / bTotalInfected * 100).toFixed(2) : "0.00";

    let comparison = null;
    if (scenario?.global_totals) {
      const sPeakFraction = Math.max(...chartData.map(d => d.scenario_I || 0));
      const sPeakCount = Math.round(sPeakFraction * N);
      const sTotalDeaths = Math.round((scenario.global_totals[30]?.D || 0) * N);
      comparison = {
        peakReduction: ((bPeakCount - sPeakCount) / (bPeakCount || 1) * 100).toFixed(1),
        currentDiff: (( (bToday?.baseline_I || 0) - (bToday?.scenario_I || 0) ) / (bToday?.baseline_I || 1) * 100).toFixed(1),
        deathReduction: ((bTotalDeaths - sTotalDeaths) / (bTotalDeaths || 1) * 100).toFixed(1),
        sPeakCount
      };
    }
    
    return {
      peak: bPeakCount,
      icu: Math.round(bPeakCount * 0.15),
      deaths: bTotalDeaths,
      cfr: bCFR,
      comparison
    };
  }, [chartData, currentDay, baseline, scenario, N]);

  if (!metrics) return null;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: 20 },
    show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="h-full w-full flex flex-col relative overflow-hidden">
      {isExpanded && createPortal(
        <ExpandedAnalytics onClose={() => setIsExpanded(false)} />,
        document.body
      )}
      
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none" />

      <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between relative z-10">
        <div>
          <h3 className="text-sm font-heading font-black text-white uppercase tracking-widest text-glow mb-1">Medical Analytics</h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            Clinical Decision Support System
          </p>
        </div>
        <button 
          onClick={() => setIsExpanded(true)}
          className="px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-white hover:bg-indigo-500 hover:border-indigo-400 transition-all shadow-[0_0_15px_rgba(99,102,241,0.2)]"
        >
          Expand
        </button>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide relative z-10"
      >
        {/* Metric Grid */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
             <MetricCard 
              variants={itemVariants}
              label="Peak Concurrent" 
              baseline={metrics.peak.toLocaleString()} 
              scenario={isComparing ? (metrics.comparison?.sPeakCount || 0).toLocaleString() : null}
              sub="Max Infectious Pool"
            />
            <MetricCard 
              variants={itemVariants}
              label="ICU Bed Demand" 
              baseline={metrics.icu.toLocaleString()} 
              scenario={isComparing ? Math.round((metrics.comparison?.sPeakCount || 0) * 0.15).toLocaleString() : null}
              sub="Est. 15% of Peak"
              color="text-rose-400 text-glow"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <MetricCard 
              variants={itemVariants}
              label="Current Active" 
              baseline={Math.round((baseline?.global_totals[currentDay]?.I || 0) * N).toLocaleString()} 
              scenario={isComparing ? Math.round((scenario?.global_totals[currentDay]?.I || 0) * N).toLocaleString() : null}
              sub={`Day ${currentDay} Status`}
              color="text-indigo-300 text-glow"
            />
            <MetricCard 
              variants={itemVariants}
              label="Remaining Risk" 
              baseline={Math.round((baseline?.global_totals[30]?.S || 0) * N).toLocaleString()} 
              scenario={isComparing ? Math.round((scenario?.global_totals[30]?.S || 0) * N).toLocaleString() : null}
              sub="Susceptible Pool"
              color="text-emerald-400 text-glow"
            />
          </div>
        </div>

        {/* Comparison Summary */}
        {isComparing && metrics.comparison && (
          <motion.div variants={itemVariants} className="p-5 rounded-[24px] bg-indigo-500/10 border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.15)] space-y-5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent pointer-events-none" />
            <div className="flex justify-between items-center relative z-10">
              <h4 className="text-[10px] font-heading font-black text-indigo-400 uppercase tracking-widest text-glow">Policy Efficacy</h4>
              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md border border-emerald-400/20 shadow-[0_0_10px_rgba(52,211,153,0.2)]">Compared to Baseline</span>
            </div>
            <div className="grid grid-cols-2 gap-4 relative z-10">
              <div>
                <div className="text-3xl font-heading font-black text-emerald-400 tracking-tighter text-glow">-{metrics.comparison.peakReduction}%</div>
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Peak Reduction</div>
              </div>
              <div>
                <div className="text-3xl font-heading font-black text-white tracking-tighter text-glow">-{metrics.comparison.currentDiff}%</div>
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Active Case Delta</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Chart */}
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h4 className="text-[10px] font-heading font-black text-white uppercase tracking-widest text-glow">
              {isComparing ? 'Infection Comparison' : 'Infection Trajectory'}
            </h4>
            <div className="flex gap-4">
               <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-slate-500 shadow-[0_0_8px_rgba(100,116,139,0.8)]" />
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Baseline</span>
                </div>
                {isComparing && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)] animate-pulse" />
                    <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider">Policy Test</span>
                  </div>
                )}
            </div>
          </div>
          
          <div className="h-56 w-full glass-card rounded-[24px] p-4 border border-white/5 shadow-inner">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorBaseline" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#64748b" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#64748b" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorScenario" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="day" hide />
                <Tooltip 
                  contentStyle={{ background: 'rgba(10,10,15,0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', fontSize: '11px', fontWeight: 'bold', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="baseline_I" stroke="#64748b" fill="url(#colorBaseline)" strokeWidth={2} strokeDasharray="5 5" isAnimationActive={false} />
                {isComparing && (
                  <Area type="monotone" dataKey="scenario_I" stroke="#818cf8" fill="url(#colorScenario)" strokeWidth={3} isAnimationActive={false} style={{ filter: 'drop-shadow(0 0 8px rgba(129,140,248,0.5))' }} />
                )}
                <ReferenceLine 
                  x={currentDay} 
                  stroke="rgba(255,255,255,0.5)" 
                  strokeDasharray="3 3"
                  label={{ value: `DAY ${currentDay}`, position: 'top', fill: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '900', fontFamily: 'JetBrains Mono' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

function MetricCard({ label, baseline, scenario, sub, color = "text-white text-glow", variants }) {
  return (
    <motion.div variants={variants} className="glass-card rounded-[20px] p-5 hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300 group">
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{label}</div>
      <div className="flex items-baseline gap-4">
        <div>
          <div className={`text-xl font-heading font-black ${color} tracking-tighter`}>{baseline}</div>
          {scenario && <div className="text-[8px] font-bold text-slate-500 uppercase mt-0.5">Baseline</div>}
        </div>
        {scenario && (
          <div className="pl-4 border-l border-white/10">
            <div className="text-xl font-heading font-black text-indigo-400 tracking-tighter text-glow">{scenario}</div>
            <div className="text-[8px] font-bold text-indigo-500 uppercase mt-0.5">Scenario</div>
          </div>
        )}
      </div>
      <div className="text-[9px] font-mono text-slate-500 font-bold leading-none mt-3">{sub}</div>
    </motion.div>
  );
}
