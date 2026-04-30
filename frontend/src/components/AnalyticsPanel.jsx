import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store';
import { STATE_HEX } from '../utils/colors';
import ExpandedAnalytics from './ExpandedAnalytics.jsx';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine
} from 'recharts';

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
    
    // Cumulative deaths at day 30
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
      icu: Math.round(bPeakCount * 0.15), // 15% of peak infections need ICU
      deaths: bTotalDeaths,
      cfr: bCFR,
      comparison
    };
  }, [chartData, currentDay, baseline, scenario, N]);

  if (!metrics) return null;

  const sPeakCount = metrics.comparison?.sPeakCount || 0;

  return (
    <div className="h-full w-full bg-[#0a0a0f]/40 backdrop-blur-3xl rounded-[40px] flex flex-col overflow-hidden border border-white/10 shadow-2xl relative">
      {isExpanded && createPortal(
        <ExpandedAnalytics onClose={() => setIsExpanded(false)} />,
        document.body
      )}
      
      <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-widest mb-1">Medical Analytics</h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            Clinical Decision Support System
          </p>
        </div>
        <button 
          onClick={() => setIsExpanded(true)}
          className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-white hover:bg-white/10 transition-all"
        >
          Expand Analysis
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-hide">
        {/* Metric Grid */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
             <MetricCard 
              label="Peak Concurrent" 
              baseline={metrics.peak.toLocaleString()} 
              scenario={isComparing ? (metrics.comparison?.sPeakCount || 0).toLocaleString() : null}
              sub="Max Infectious Pool"
            />
            <MetricCard 
              label="ICU Bed Demand" 
              baseline={metrics.icu.toLocaleString()} 
              scenario={isComparing ? Math.round((metrics.comparison?.sPeakCount || 0) * 0.15).toLocaleString() : null}
              sub="Est. 15% of Peak"
              color="text-rose-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <MetricCard 
              label="Current Active" 
              baseline={Math.round((baseline?.global_totals[currentDay]?.I || 0) * N).toLocaleString()} 
              scenario={isComparing ? Math.round((scenario?.global_totals[currentDay]?.I || 0) * N).toLocaleString() : null}
              sub={`Day ${currentDay} Status`}
              color="text-white"
            />
            <MetricCard 
              label="Remaining Risk" 
              baseline={Math.round((baseline?.global_totals[30]?.S || 0) * N).toLocaleString()} 
              scenario={isComparing ? Math.round((scenario?.global_totals[30]?.S || 0) * N).toLocaleString() : null}
              sub="Susceptible Pool"
              color="text-emerald-400"
            />
          </div>
        </div>

        {/* Comparison Summary */}
        {isComparing && metrics.comparison && (
          <div className="p-6 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 shadow-lg space-y-6">
            <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Policy Efficacy</h4>
              <span className="text-[10px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">Compared to Baseline</span>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-2xl font-black text-emerald-400 tracking-tighter">-{metrics.comparison.peakReduction}%</div>
                <div className="text-[8px] text-slate-500 font-bold uppercase mt-1">Peak Reduction</div>
              </div>
              <div>
                <div className="text-2xl font-black text-white tracking-tighter">-{metrics.comparison.currentDiff}%</div>
                <div className="text-[8px] text-slate-500 font-bold uppercase mt-1">Active Case Delta</div>
              </div>
            </div>
          </div>
        )}



        {/* Chart */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h4 className="text-[10px] font-black text-white uppercase tracking-wider">
              {isComparing ? 'Scenario Comparison (Global I)' : 'Infection Trajectory'}
            </h4>
            <div className="flex gap-4">
               <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                  <span className="text-[8px] font-black text-slate-500 uppercase">Baseline</span>
                </div>
                {isComparing && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    <span className="text-[8px] font-black text-indigo-400 uppercase">Policy Test</span>
                  </div>
                )}
            </div>
          </div>
          
          <div className="h-48 w-full bg-[#0a0a0f]/60 rounded-3xl p-4 border border-white/5 shadow-inner">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorBaseline" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#64748b" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#64748b" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorScenario" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="day" hide />
                <Tooltip 
                  contentStyle={{ background: '#12121a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }}
                />
                <Area type="monotone" dataKey="baseline_I" stroke="#64748b" fill="url(#colorBaseline)" strokeWidth={2} strokeDasharray="5 5" isAnimationActive={false} />
                {isComparing && (
                  <Area type="monotone" dataKey="scenario_I" stroke="#818cf8" fill="url(#colorScenario)" strokeWidth={3} isAnimationActive={false} />
                )}
                <ReferenceLine 
                  x={currentDay} 
                  stroke="#fff" 
                  strokeOpacity={0.3} 
                  label={{ value: `D${currentDay}`, position: 'top', fill: '#fff', fontSize: 10, fontWeight: '900' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, baseline, scenario, sub, color = "text-white" }) {
  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-5 hover:bg-white/[0.06] transition-all group duration-300">
      <div className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-2">{label}</div>
      <div className="flex items-baseline gap-4">
        <div>
          <div className={`text-lg font-black ${color} tracking-tighter`}>{baseline}</div>
          {scenario && <div className="text-[8px] font-black text-slate-600 uppercase">Baseline</div>}
        </div>
        {scenario && (
          <div className="pl-4 border-l border-white/5">
            <div className="text-lg font-black text-indigo-400 tracking-tighter">{scenario}</div>
            <div className="text-[8px] font-black text-indigo-600 uppercase">Scenario</div>
          </div>
        )}
      </div>
      <div className="text-[9px] font-bold text-slate-600 leading-none mt-2">{sub}</div>
    </div>
  );
}
