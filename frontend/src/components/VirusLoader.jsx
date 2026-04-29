import { motion } from 'framer-motion';

export default function VirusLoader() {
  const spikes = Array.from({ length: 12 });
  const particles = Array.from({ length: 6 });
  const dots = [0, 1, 2];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{ background: 'rgba(6,6,12,0.92)', backdropFilter: 'blur(20px)' }}
    >
      <div className="relative w-40 h-40 mb-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          className="w-full h-full"
        >
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <circle cx="100" cy="100" r="32" fill="url(#vg)" opacity="0.9" />
            {spikes.map((_, i) => {
              const a = (i * 30 * Math.PI) / 180;
              return (
                <g key={i}>
                  <line
                    x1={100 + Math.cos(a) * 34} y1={100 + Math.sin(a) * 34}
                    x2={100 + Math.cos(a) * 62} y2={100 + Math.sin(a) * 62}
                    stroke="rgba(167,139,250,0.6)" strokeWidth="2.5" strokeLinecap="round"
                  />
                  <circle cx={100 + Math.cos(a) * 68} cy={100 + Math.sin(a) * 68} r="5" fill="rgba(167,139,250,0.8)">
                    <animate attributeName="r" values="4;6;4" dur="1.5s" repeatCount="indefinite" begin={`${i * 0.12}s`} />
                  </circle>
                </g>
              );
            })}
            <circle cx="90" cy="92" r="5" fill="rgba(99,102,241,0.5)" />
            <circle cx="112" cy="96" r="4" fill="rgba(139,92,246,0.5)" />
            <defs>
              <radialGradient id="vg" cx="40%" cy="40%">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#6366f1" />
              </radialGradient>
            </defs>
          </svg>
        </motion.div>
        {particles.map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-indigo-400/40"
            style={{ top: '50%', left: '50%' }}
            animate={{
              x: [0, Math.cos(i * 60 * Math.PI / 180) * 80],
              y: [0, Math.sin(i * 60 * Math.PI / 180) * 80],
              opacity: [0.8, 0], scale: [1, 0.3],
            }}
            transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4, ease: 'easeOut' }}
          />
        ))}
      </div>
      <motion.h2
        className="text-xl font-semibold text-[var(--color-text-primary)] mb-2"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        Simulating epidemic spread
      </motion.h2>
      <p className="text-sm text-[var(--color-text-muted)]">Running Neural ODE model over 30 days…</p>
      <div className="flex gap-1.5 mt-6">
        {dots.map((i) => (
          <motion.div key={i} className="w-2 h-2 rounded-full bg-[var(--color-accent)]"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </motion.div>
  );
}
