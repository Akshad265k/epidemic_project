import { useStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';

export default function InterventionPanel() {
  const insights = useStore((s) => s.zoneInsights);
  const interventions = useStore((s) => s.interventions);
  const setInterventions = useStore((s) => s.setInterventions);
  const zoneInterventions = useStore((s) => s.zoneInterventions);
  const setZoneIntervention = useStore((s) => s.setZoneIntervention);
  const uploadAndPredict = useStore((s) => s.uploadAndPredict);
  const baseline = useStore((s) => s.baseline);
  const isComparing = useStore((s) => s.isComparing);
  const setIsComparing = useStore((s) => s.setIsComparing);

  if (!insights) return null;

  return (
    <div className="h-full w-full bg-[#0a0a0f]/40 backdrop-blur-3xl rounded-[40px] flex flex-col overflow-hidden border border-white/10 shadow-2xl">
      <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-widest">Policy Intervention</h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Neural ODE Simulator</p>
        </div>
        <button 
          onClick={() => setIsComparing(!isComparing)}
          disabled={!baseline}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
            ${isComparing ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
        >
          {isComparing ? 'Exit Comparison' : 'Enter Comparison'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-10 scrollbar-hide">
        {/* ── Global Policies ── */}
        <section className="space-y-6">
          <div className="flex justify-between items-end px-1">
            <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Global Policies</h4>
            <span className="text-[8px] font-bold text-slate-500 uppercase">City-wide Impact</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setInterventions({ lockdown: !interventions.lockdown })}
              className={`p-4 rounded-2xl border transition-all flex flex-col gap-2 text-left
                ${interventions.lockdown 
                  ? 'bg-red-500/10 border-red-500/40 text-red-400' 
                  : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
            >
              <span className="text-lg">{interventions.lockdown ? '🔒' : '🔓'}</span>
              <span className="text-[10px] font-black uppercase tracking-tighter">City Lockdown</span>
            </button>
            
            <button
              onClick={() => setInterventions({ school_closure: !interventions.school_closure })}
              className={`p-4 rounded-2xl border transition-all flex flex-col gap-2 text-left
                ${interventions.school_closure 
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-400' 
                  : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
            >
              <span className="text-lg">🏫</span>
              <span className="text-[10px] font-black uppercase tracking-tighter">School Closure</span>
            </button>
          </div>

          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase">
              <span>Mask Mandate</span>
              <span className="text-indigo-400">{interventions.mask_mandate}%</span>
            </div>
            <input
              type="range" min="0" max="100" step="10"
              value={interventions.mask_mandate}
              onChange={(e) => setInterventions({ mask_mandate: Number(e.target.value) })}
              className="w-full accent-indigo-500 h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
            />
          </div>
        </section>

        <div className="h-px bg-white/5" />

        {/* ── Targeted Sections ── */}
        {/* <RankSection 
          title="Active Hotspots" 
          zones={insights.by_transmitters.slice(0, 3)} 
          metric="transmitters"
          label="Current I-state Sum"
          color="text-red-400"
        /> */}

        {/* <RankSection 
          title="High Susceptibility" 
          zones={insights.by_susceptibility.slice(0, 3)} 
          metric="susceptible"
          label="Remaining S-state Sum"
          color="text-emerald-400"
        /> */}
      </div>

      <div className="p-6 border-t border-white/5 bg-[#0a0a0f]/60">
        <button
          onClick={uploadAndPredict}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          🚀 Run Policy Test
        </button>
      </div>
    </div>
  );
}

function RankSection({ title, zones, metric, label, color }) {
  const zoneInterventions = useStore((s) => s.zoneInterventions);
  const setZoneIntervention = useStore((s) => s.setZoneIntervention);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end px-1">
        <h4 className="text-[10px] font-black text-white uppercase tracking-widest">{title}</h4>
        <span className="text-[8px] font-bold text-slate-500 uppercase">{label}</span>
      </div>
      <div className="space-y-2">
        {zones.map((z) => {
          const zi = zoneInterventions[z.zone] || { lockdown: false, mask_mandate: 0 };
          return (
            <div key={z.zone} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 group hover:bg-white/[0.05] transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-xs font-black text-indigo-400">
                    {z.zone}
                  </div>
                  <div>
                    <div className={`text-sm font-black font-mono ${color}`}>{Math.round(z[metric]).toLocaleString()}</div>
                    <div className="text-[8px] text-slate-500 font-bold uppercase">Zone Identifier</div>
                  </div>
                </div>
                <button
                  onClick={() => setZoneIntervention(z.zone, { lockdown: !zi.lockdown })}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all
                    ${zi.lockdown ? 'bg-red-500 text-white' : 'bg-white/5 text-slate-500 hover:text-white'}`}
                >
                  {zi.lockdown ? '🔒 Locked' : '🔓 Open'}
                </button>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-1.5">
                  <div className="flex justify-between text-[8px] font-black text-slate-500 uppercase">
                    <span>Targeted Masking</span>
                    <span className="text-white">{zi.mask_mandate}%</span>
                  </div>
                  <input
                    type="range" min="0" max="100" step="10"
                    value={zi.mask_mandate}
                    onChange={(e) => setZoneIntervention(z.zone, { mask_mandate: Number(e.target.value) })}
                    className="w-full accent-indigo-500 h-1 bg-white/5 rounded-full appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
