import { useStore } from '../store';
import { motion } from 'framer-motion';

export default function InterventionPanel() {
  const insights = useStore((s) => s.zoneInsights);
  const interventions = useStore((s) => s.interventions);
  const setInterventions = useStore((s) => s.setInterventions);
  const uploadAndPredict = useStore((s) => s.uploadAndPredict);
  const baseline = useStore((s) => s.baseline);
  const isComparing = useStore((s) => s.isComparing);
  const setIsComparing = useStore((s) => s.setIsComparing);

  if (!insights) return null;

  return (
    <div className="h-full w-full flex flex-col">
      <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
        <div>
          <h3 className="text-sm font-heading font-black text-white uppercase tracking-widest text-glow">Policy Intervention</h3>
          <p className="text-[10px] text-indigo-400/80 font-mono font-bold uppercase tracking-wider mt-1">Neural ODE Simulator</p>
        </div>
        <button 
          onClick={() => setIsComparing(!isComparing)}
          disabled={!baseline}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg
            ${isComparing 
              ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)] border border-indigo-400' 
              : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/20'}`}
        >
          {isComparing ? 'Exit Comparison' : 'Enter Comparison'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-10 scrollbar-hide">
        {/* ── Global Policies ── */}
        <section className="space-y-6">
          <div className="flex justify-between items-end px-1">
            <h4 className="text-[11px] font-heading font-black text-indigo-400 uppercase tracking-widest text-glow">Global Policies</h4>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">City-wide Impact</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setInterventions({ lockdown: !interventions.lockdown })}
              className={`p-5 rounded-[24px] border transition-all flex flex-col gap-3 text-left relative overflow-hidden
                ${interventions.lockdown 
                  ? 'bg-rose-500/10 border-rose-500/50 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.2)]' 
                  : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:border-white/20'}`}
            >
              {interventions.lockdown && <div className="absolute inset-0 bg-gradient-to-br from-rose-500/20 to-transparent pointer-events-none" />}
              <span className="text-2xl relative z-10">{interventions.lockdown ? '🔒' : '🔓'}</span>
              <span className="text-[11px] font-heading font-black uppercase tracking-widest relative z-10">City Lockdown</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setInterventions({ school_closure: !interventions.school_closure })}
              className={`p-5 rounded-[24px] border transition-all flex flex-col gap-3 text-left relative overflow-hidden
                ${interventions.school_closure 
                  ? 'bg-amber-500/10 border-amber-500/50 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]' 
                  : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:border-white/20'}`}
            >
              {interventions.school_closure && <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-transparent pointer-events-none" />}
              <span className="text-2xl relative z-10">🏫</span>
              <span className="text-[11px] font-heading font-black uppercase tracking-widest relative z-10">School Closure</span>
            </motion.button>
          </div>

          <div className="glass-card rounded-[24px] p-6 space-y-4">
            <div className="flex justify-between text-[11px] font-bold text-slate-300 uppercase tracking-widest">
              <span>Mask Mandate</span>
              <span className="text-indigo-400 font-mono text-glow">{interventions.mask_mandate}%</span>
            </div>
            
            <div className="relative h-2.5 bg-black/40 rounded-full border border-white/5 shadow-inner overflow-hidden">
              <motion.div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]"
                style={{ width: `${interventions.mask_mandate}%` }}
              />
              <input
                type="range" min="0" max="100" step="10"
                value={interventions.mask_mandate}
                onChange={(e) => setInterventions({ mask_mandate: Number(e.target.value) })}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>
        </section>

        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        
        {/* Placeholder for future zone-specific interventions */}
        <div className="text-center p-4">
           <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest border border-dashed border-white/10 px-4 py-2 rounded-lg">Zone Policies Disabled</span>
        </div>
      </div>

      <div className="p-6 border-t border-white/5 bg-black/20 backdrop-blur-md">
        <motion.button
          whileHover={{ scale: 1.02, filter: 'brightness(1.1)' }}
          whileTap={{ scale: 0.98 }}
          onClick={uploadAndPredict}
          className="w-full py-5 rounded-[20px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-heading font-black uppercase tracking-[0.25em] text-[11px] shadow-[0_0_30px_rgba(99,102,241,0.4)] border border-white/20 transition-all relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out" />
          🚀 Execute Policy Test
        </motion.button>
      </div>
    </div>
  );
}
