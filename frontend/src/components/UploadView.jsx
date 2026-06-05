import { useCallback, useState } from 'react';
import { useStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';

export default function UploadView() {
  const file = useStore((s) => s.file);
  const setFile = useStore((s) => s.setFile);
  const interventions = useStore((s) => s.interventions);
  const setInterventions = useStore((s) => s.setInterventions);
  const uploadAndPredict = useStore((s) => s.uploadAndPredict);
  const error = useStore((s) => s.error);
  const loading = useStore((s) => s.loading);

  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith('.csv')) setFile(f);
  }, [setFile]);

  const handleFileInput = useCallback((e) => {
    const f = e.target.files[0];
    if (f) setFile(f);
  }, [setFile]);

  return (
    <div className="relative h-full w-full flex items-center justify-center overflow-hidden">
      {/* Dynamic Background Grid & Glow */}
      <div className="absolute inset-0 pointer-events-none opacity-20"
           style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '48px 48px' }} />
      
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 bg-indigo-400/30 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.8)]"
            initial={{ x: Math.random() * 100 + '%', y: Math.random() * 100 + '%' }}
            animate={{ y: [null, '-20%', '20%'], opacity: [0, 1, 0] }}
            transition={{ duration: 15 + Math.random() * 10, repeat: Infinity, ease: 'linear' }}
          />
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[1400px] grid grid-cols-1 lg:grid-cols-5 gap-16 px-12"
      >
        {/* Left Column: Title & Upload */}
        <div className="lg:col-span-3 flex flex-col justify-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="mb-12"
          >
            <h1 className="text-7xl font-heading font-black mb-6 tracking-tighter leading-none text-white text-glow">
              <span className="text-indigo-400 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">Epi</span>Scope
            </h1>
            <p className="text-xl text-slate-400 max-w-xl leading-relaxed font-medium">
              Advanced Neural ODE forecasting engine. Upload your population nodes to simulate transmission dynamics at global scale.
            </p>
          </motion.div>

          <motion.label
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`
              relative group cursor-pointer transition-all duration-500
              aspect-[21/9] w-full max-w-2xl rounded-[32px]
              flex flex-col items-center justify-center p-12 overflow-hidden
              glass-card
              ${dragOver 
                ? 'bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_40px_rgba(99,102,241,0.2)]' 
                : file 
                  ? 'bg-emerald-500/5 border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)]' 
                  : 'hover:bg-white/5 hover:border-indigo-500/30'}
            `}
          >
            <input type="file" accept=".csv" className="hidden" onChange={handleFileInput} />
            
            {/* Dashed Border Overlay */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none rounded-[32px]" style={{ zIndex: 0 }}>
              <rect x="2" y="2" width="calc(100% - 4px)" height="calc(100% - 4px)" rx="30" fill="none" stroke={dragOver ? '#6366f1' : file ? '#10b981' : 'rgba(255,255,255,0.1)'} strokeWidth="2" strokeDasharray="12 12" className="transition-colors duration-500" />
            </svg>

            <AnimatePresence mode="wait">
              {file ? (
                <motion.div key="file" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center z-10">
                  <div className="w-24 h-24 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)] border border-emerald-500/30">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <div className="text-3xl font-heading font-bold text-white mb-2">{file.name}</div>
                  <div className="text-emerald-400/70 font-mono font-bold uppercase tracking-[0.2em] text-[10px]">Dataset Ready for Simulation</div>
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center z-10">
                  <div className="w-20 h-20 glass-panel text-indigo-300 rounded-full flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-500 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                  </div>
                  <div className="text-3xl font-heading font-black text-white mb-3 tracking-tight">Drop Population Data</div>
                  <div className="text-slate-500 font-medium">CSV with <span className="text-indigo-400 font-mono bg-indigo-500/10 px-2 py-0.5 rounded">node_id</span> and <span className="text-indigo-400 font-mono bg-indigo-500/10 px-2 py-0.5 rounded">infected</span></div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.label>
        </div>

        {/* Right Column: Configuration */}
        <motion.div 
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="lg:col-span-2"
        >
          <div className="glass-panel rounded-[40px] p-10 h-full flex flex-col relative overflow-hidden">
            {/* Top right glow */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-500/20 blur-[80px] rounded-full pointer-events-none" />

            <div className="flex items-center justify-between mb-12 relative z-10">
              <h3 className="text-2xl font-heading font-black flex items-center gap-4 text-white">
                <span className="w-12 h-12 bg-white/5 border border-white/10 text-indigo-400 rounded-2xl flex items-center justify-center text-xl shadow-inner">⚙</span>
                Initial Parameters
              </h3>
            </div>

            <div className="space-y-12 flex-grow relative z-10">
              <div className="space-y-6">
                <div className="flex justify-between items-end">
                  <div className="text-sm font-bold text-slate-300 uppercase tracking-widest">Mask Mandate</div>
                  <span className="text-indigo-400 font-mono font-black text-2xl text-glow">{interventions.mask_mandate}%</span>
                </div>
                {/* Neumorphic Slider */}
                <div className="relative h-3 bg-black/40 rounded-full border border-white/5 shadow-inner overflow-hidden">
                  <motion.div 
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]"
                    style={{ width: `${interventions.mask_mandate}%` }}
                  />
                  <input 
                    type="range" min="0" max="100" 
                    value={interventions.mask_mandate}
                    onChange={(e) => setInterventions({ mask_mandate: Number(e.target.value) })}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5">
                {[
                  { id: 'school_closure', label: 'School Closure', icon: '🏫' },
                  { id: 'lockdown', label: 'Strict Lockdown', icon: '🔒' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setInterventions({ [item.id]: !interventions[item.id] })}
                    className={`
                      relative p-6 rounded-[24px] text-left transition-all duration-300 flex items-center gap-5 overflow-hidden
                      ${interventions[item.id] 
                        ? 'bg-indigo-500/20 border border-indigo-500/50 text-white shadow-[0_0_20px_rgba(99,102,241,0.2)]' 
                        : 'bg-white/5 border border-white/5 text-slate-400 hover:bg-white/10 hover:border-white/10'}
                    `}
                  >
                    {interventions[item.id] && <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent pointer-events-none" />}
                    <div className="text-3xl relative z-10">{item.icon}</div>
                    <div className="font-heading font-bold text-base uppercase tracking-wide relative z-10">{item.label}</div>
                    <div className={`ml-auto w-3 h-3 rounded-full transition-colors relative z-10 shadow-[0_0_10px_currentColor] ${interventions[item.id] ? 'bg-indigo-400 text-indigo-400' : 'bg-slate-700 text-transparent shadow-none'}`} />
                  </button>
                ))}
              </div>
            </div>

            <motion.button 
              disabled={!file || loading}
              onClick={uploadAndPredict}
              whileHover={file && !loading ? { scale: 1.02, filter: 'brightness(1.1)' } : {}}
              whileTap={file && !loading ? { scale: 0.98 } : {}}
              className={`
                mt-12 w-full py-6 rounded-[24px] font-heading font-black text-xl flex items-center justify-center gap-4 transition-all duration-500 relative z-10 overflow-hidden
                ${file && !loading
                  ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-[0_0_40px_rgba(99,102,241,0.5)] border border-white/20'
                  : 'bg-white/5 text-slate-600 cursor-not-allowed border border-white/5'}
              `}
            >
              {file && !loading && (
                <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] -translate-x-[150%] hover:translate-x-[150%] transition-transform duration-1000 ease-in-out" />
              )}
              {loading ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Running Simulation...
                </div>
              ) : "🚀 Execute Simulation"}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
