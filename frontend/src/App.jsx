import { useStore } from './store';
import UploadView from './components/UploadView.jsx';
import GraphView from './components/GraphView.jsx';
import MapView from './components/MapView.jsx';
import Timeline from './components/Timeline.jsx';
import StatsSidebar from './components/StatsSidebar.jsx';
import AnalyticsPanel from './components/AnalyticsPanel.jsx';
import InterventionPanel from './components/InterventionPanel.jsx';
import VirusLoader from './components/VirusLoader.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

const TABS = [
  { key: 'upload', label: 'Upload', icon: '↑' },
  { key: 'graph', label: 'Network Graph', icon: '⊛' },
  { key: 'map', label: 'Map View', icon: '◈' },
];

export default function App() {
  const activeView = useStore((s) => s.activeView);
  const setActiveView = useStore((s) => s.setActiveView);
  const isLoading = useStore((s) => s.isLoading);
  const nodes = useStore((s) => s.nodes);
  const hasData = nodes.length > 0;
  const isComparing = useStore((s) => s.isComparing);
  const hasInsights = useStore((s) => !!s.zoneInsights);

  const [panelsOpen, setPanelsOpen] = useState(true);

  return (
    <div className="relative h-screen w-screen bg-[#030305] overflow-hidden text-slate-100 selection:bg-indigo-500/30">
      
      {/* Ambient Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[150px] rounded-full" />
      </div>

      {/* ── Main Full-Screen Visualization Area ── */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeView}-${isComparing}`}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="h-full w-full"
          >
            {activeView === 'upload' && <UploadView />}
            {(activeView === 'graph' || (activeView === 'graph' && isLoading)) && (
              <ErrorBoundary>
                <GraphView />
              </ErrorBoundary>
            )}
            {activeView === 'map' && hasData && (
              isComparing ? (
                <div className="grid grid-cols-2 h-full gap-px bg-white/5 pt-24 pb-36">
                  <MapView source="baseline" />
                  <MapView source="scenario" />
                </div>
              ) : (
                <div className="h-full w-full pt-24 pb-36">
                  <MapView source="baseline" />
                </div>
              )
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Top Floating Nav Bar ── */}
      <nav className="absolute top-0 left-0 right-0 h-24 z-50 flex items-center justify-between px-8 lg:px-12 bg-gradient-to-b from-[#030305]/90 to-transparent pointer-events-none">
        <div className="flex items-center gap-4 pointer-events-auto">
          <div className="w-12 h-12 rounded-[18px] bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-xl font-heading font-black shadow-[0_0_24px_rgba(99,102,241,0.4)] border border-white/20">
            E
          </div>
          <div>
            <h1 className="text-2xl font-heading font-black tracking-tight leading-none text-white">
              <span className="text-indigo-400">Epi</span>Scope
            </h1>
            <div className="text-[10px] text-indigo-300/70 font-mono font-bold uppercase tracking-[0.25em] mt-1">
              Neural ODE Engine
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 glass-panel rounded-2xl p-1.5 pointer-events-auto">
          {TABS.map((tab) => {
            const disabled = tab.key !== 'upload' && !hasData;
            return (
              <button
                key={tab.key}
                disabled={disabled}
                onClick={() => !disabled && setActiveView(tab.key)}
                className={`
                  px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-500 flex items-center gap-2.5
                  ${activeView === tab.key
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 shadow-[0_0_16px_rgba(99,102,241,0.2)]'
                    : disabled
                      ? 'text-slate-600 cursor-not-allowed opacity-40'
                      : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }
                `}
              >
                <span className="text-lg">{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
          {(hasData && activeView !== 'upload') && (
            <div className="w-px h-8 bg-white/10 mx-2" />
          )}
          {(hasData && activeView !== 'upload') && (
            <button
              onClick={() => setPanelsOpen(!panelsOpen)}
              className={`
                px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-500 flex items-center gap-2 border
                ${panelsOpen 
                  ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30 hover:bg-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
                  : 'text-slate-400 bg-white/5 border-transparent hover:bg-white/10 hover:text-white'}
              `}
            >
              <span className="text-lg">{panelsOpen ? '◨' : '◧'}</span>
              {panelsOpen ? 'Hide UI' : 'Show UI'}
            </button>
          )}
        </div>

        <div className="hidden md:flex flex-col items-end pointer-events-auto">
          <div className="text-sm font-heading font-bold text-white text-glow">
            {hasData ? `${nodes.length.toLocaleString()} Nodes Active` : 'System Standby'}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${hasData ? 'bg-emerald-400 text-emerald-400 animate-pulse' : 'bg-amber-500 text-amber-500'}`} />
            <div className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-widest">
              {hasData ? (isComparing ? 'Comparison Mode' : 'Live Stream') : 'Awaiting Input'}
            </div>
          </div>
        </div>
      </nav>

      {/* ── Floating HUD Panels ── */}
      <AnimatePresence mode="wait">
        {(hasData || isLoading) && activeView !== 'upload' && panelsOpen && (
          <>
            {/* Left Panel */}
            <motion.div
              key={hasInsights ? 'intervention' : 'stats'}
              initial={{ opacity: 0, x: -40, filter: 'blur(10px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: -40, filter: 'blur(10px)' }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-6 top-28 bottom-36 w-[420px] z-20 pointer-events-auto"
            >
              <div className="h-full w-full glass-panel rounded-[32px] overflow-hidden flex flex-col">
                {hasInsights ? <InterventionPanel /> : <StatsSidebar />}
              </div>
            </motion.div>

            {/* Right Panel */}
            <motion.div
              initial={{ opacity: 0, x: 40, filter: 'blur(10px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: 40, filter: 'blur(10px)' }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              className="absolute right-6 top-28 bottom-36 w-[420px] z-20 pointer-events-auto"
            >
              <div className="h-full w-full glass-panel rounded-[32px] overflow-hidden flex flex-col">
                <AnalyticsPanel />
              </div>
            </motion.div>

            {/* Bottom Timeline */}
            <motion.div
              initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              className="absolute left-1/2 -translate-x-1/2 bottom-8 w-[calc(100%-48px)] max-w-[1200px] h-[100px] z-30 pointer-events-auto"
            >
              <Timeline />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Loading Overlay ── */}
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(32px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#030305]/80"
          >
            <VirusLoader />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
