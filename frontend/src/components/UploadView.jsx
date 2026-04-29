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
    <div className="relative min-h-[calc(100vh-64px)] w-full flex items-center justify-center p-8 overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
        
        {/* Floating Particles Animation */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full"
            initial={{ 
              x: Math.random() * 100 + '%', 
              y: Math.random() * 100 + '%',
              opacity: Math.random() * 0.5
            }}
            animate={{ 
              y: [null, '-20%', '20%'],
              opacity: [0.2, 0.5, 0.2]
            }}
            transition={{ 
              duration: 5 + Math.random() * 10, 
              repeat: Infinity,
              ease: "linear"
            }}
          />
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-5 gap-12"
      >
        {/* Left Column: Title & Upload */}
        <div className="lg:col-span-3 flex flex-col justify-center">
          <div className="mb-12">
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-7xl font-black mb-6 tracking-tight leading-none"
            >
              <span className="text-white">Epi</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Scope</span>
            </motion.h1>
            <p className="text-xl text-[var(--color-text-secondary)] max-w-xl leading-relaxed">
              Advanced Neural ODE-based epidemic forecasting platform. 
              Upload your population data to simulate transmission dynamics across thousands of nodes in real-time.
            </p>
          </div>

          <label
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`
              relative group cursor-pointer transition-all duration-500
              aspect-video w-full max-w-2xl rounded-[40px] border-2 border-dashed
              flex flex-col items-center justify-center p-12 overflow-hidden
              ${dragOver 
                ? 'border-indigo-400 bg-indigo-400/5 scale-[1.01]' 
                : file 
                  ? 'border-emerald-500/30 bg-emerald-500/5' 
                  : 'border-[var(--color-border)] hover:border-indigo-400/50 bg-white/[0.02]'}
            `}
          >
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              onChange={handleFileInput} 
            />
            
            <AnimatePresence mode="wait">
              {file ? (
                <motion.div 
                  key="file"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center"
                >
                  <div className="w-24 h-24 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <div className="text-3xl font-bold text-white mb-2">{file.name}</div>
                  <div className="text-[var(--color-text-muted)]">{(file.size / 1024).toFixed(1)} KB — click to swap dataset</div>
                </motion.div>
              ) : (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center"
                >
                  <div className="w-20 h-20 bg-white/5 text-[var(--color-text-muted)] rounded-full flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-500">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                  </div>
                  <div className="text-3xl font-bold text-white mb-3">Drop CSV Data</div>
                  <div className="text-[var(--color-text-secondary)]">
                    Expects <code className="text-indigo-400 font-mono">node_id</code> and <code className="text-indigo-400 font-mono">infected</code>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Subtle corner accents */}
            <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-transparent group-hover:border-indigo-500/30 transition-colors" />
            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-transparent group-hover:border-indigo-500/30 transition-colors" />
          </label>
        </div>

        {/* Right Column: Configuration */}
        <div className="lg:col-span-2">
          <div className="glass rounded-[40px] p-10 h-full flex flex-col shadow-2xl border border-white/5">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-2xl font-bold flex items-center gap-3">
                <span className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center text-lg">⚙</span>
                Parameters
              </h3>
              <div className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest">
                v2.0 Beta
              </div>
            </div>

            <div className="space-y-10 flex-grow">
              {/* Mask Mandate */}
              <div className="space-y-5">
                <div className="flex justify-between items-end">
                  <div>
                    <label className="block text-sm font-bold text-white mb-1">Mask Mandate</label>
                    <p className="text-xs text-[var(--color-text-muted)]">Reduces transmission probability coefficient</p>
                  </div>
                  <span className="text-indigo-400 font-mono font-bold text-lg">{interventions.mask_mandate}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="100" 
                  value={interventions.mask_mandate}
                  onChange={(e) => setInterventions({ mask_mandate: Number(e.target.value) })}
                  className="w-full accent-indigo-500 h-2 bg-white/10 rounded-full appearance-none cursor-pointer"
                />
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 gap-4">
                {[
                  { id: 'school_closure', label: 'School Closure', icon: '🏫', desc: 'Restricts local youth contact nodes' },
                  { id: 'lockdown', label: 'Strict Lockdown', icon: '🔒', desc: 'Enforces stay-at-home graph constraints' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setInterventions({ [item.id]: !interventions[item.id] })}
                    className={`
                      relative p-5 rounded-[24px] text-left transition-all duration-300 border-2 flex items-center gap-5
                      ${interventions[item.id] 
                        ? 'bg-indigo-500/10 border-indigo-500/50 text-white' 
                        : 'bg-white/[0.02] border-transparent text-[var(--color-text-secondary)] hover:bg-white/[0.04]'}
                    `}
                  >
                    <div className="text-3xl">{item.icon}</div>
                    <div>
                      <div className="font-bold mb-0.5">{item.label}</div>
                      <div className="text-[10px] opacity-60 leading-tight">{item.desc}</div>
                    </div>
                    {interventions[item.id] && (
                      <div className="absolute top-4 right-4 w-2.5 h-2.5 bg-indigo-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(129,140,248,0.5)]" />
                    )}
                  </button>
                ))}
              </div>

              {/* Model Info Card */}
              <div className="p-6 rounded-[24px] bg-white/[0.03] border border-white/5 space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-400/80">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                  Neural ODE Engine
                </div>
                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                  The simulation will perform a 30-day temporal rollout over the selected graph topology, 
                  applying SEIRD state transitions at every timestep.
                </p>
              </div>
            </div>

            <div className="space-y-4 mt-12">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-3"
                >
                  <span>⚠</span> {error}
                </motion.div>
              )}
              
              <button 
                disabled={!file || loading}
                onClick={uploadAndPredict}
                className={`
                  w-full py-6 rounded-[24px] font-black text-xl flex items-center justify-center gap-4 transition-all duration-500
                  ${file && !loading
                    ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-2xl shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]'
                    : 'bg-white/5 text-white/20 cursor-not-allowed'}
                `}
              >
                {loading ? (
                  <>
                    <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>🚀 Run Simulation</>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
