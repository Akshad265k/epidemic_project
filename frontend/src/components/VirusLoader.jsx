import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const STAGES = [
  { text: "Initializing analysis engine", limit: 15 },
  { text: "Uploading population dataset", limit: 30 },
  { text: "Constructing contact network", limit: 50 },
  { text: "Solving Neural ODE trajectories", limit: 80 },
  { text: "Optimizing spatio-temporal layers", limit: 95 },
  { text: "Finalizing dashboard", limit: 100 }
];

export default function VirusLoader() {
  const [progress, setProgress] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 100;
        // Natural slowing as it nears completion
        const inc = Math.max(0.1, (100 - prev) / 20);
        const next = prev + inc;

        // Update stage text based on limits
        const nextStage = STAGES.findIndex(s => next < s.limit);
        if (nextStage !== -1 && nextStage !== stageIndex) {
          setStageIndex(nextStage);
        }

        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [stageIndex]);

  const spikes = Array.from({ length: 12 });
  const dots = [0, 1, 2];

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center max-w-md w-full">
      {/* Animated Virus Graphic */}
      <div className="relative w-32 h-32 mb-12">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          className="w-full h-full"
        >
          <svg viewBox="0 0 200 200" className="w-full h-full filter drop-shadow-[0_0_20px_rgba(129,140,248,0.4)]">
            <circle cx="100" cy="100" r="32" fill="url(#vg)" opacity="0.9" />
            {spikes.map((_, i) => {
              const a = (i * 30 * Math.PI) / 180;
              return (
                <g key={i}>
                  <line
                    x1={100 + Math.cos(a) * 34} y1={100 + Math.sin(a) * 34}
                    x2={100 + Math.cos(a) * 62} y2={100 + Math.sin(a) * 62}
                    stroke="rgba(167,139,250,0.4)" strokeWidth="3" strokeLinecap="round"
                  />
                  <circle cx={100 + Math.cos(a) * 68} cy={100 + Math.sin(a) * 68} r="5" fill="rgba(167,139,250,0.8)">
                    <animate attributeName="r" values="3;6;3" dur="2s" repeatCount="indefinite" begin={`${i * 0.15}s`} />
                  </circle>
                </g>
              );
            })}
            <defs>
              <radialGradient id="vg" cx="40%" cy="40%">
                <stop offset="0%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#4f46e5" />
              </radialGradient>
            </defs>
          </svg>
        </motion.div>
      </div>

      {/* Status Info */}
      <div className="w-full space-y-6">
        <div className="space-y-2">
          <motion.h2
            key={stageIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xl font-black text-white tracking-tight"
          >
            {STAGES[stageIndex].text}
          </motion.h2>
          <div className="flex items-center justify-center gap-1.5">
            <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">
              Processing Phase {stageIndex + 1}/6
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative pt-1">
          <div className="flex mb-2 items-center justify-between">
            <div>
              <span className="text-[10px] font-black inline-block py-1 px-2 uppercase rounded-full text-indigo-400 bg-indigo-500/10 border border-indigo-500/20">
                System Active
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-black text-white">
                {Math.round(progress)}%
              </span>
            </div>
          </div>
          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded-full bg-white/5 border border-white/5">
            <motion.div
              animate={{ width: `${progress}%` }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            />
          </div>
        </div>

        <p className="text-xs text-slate-500 font-medium italic">
          Please wait while our Neural ODE solver predicts the 30-day temporal trajectory for the population nodes.
        </p>
      </div>
    </div>
  );
}
