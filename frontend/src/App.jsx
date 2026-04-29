import { useStore } from './store';
import UploadView from './components/UploadView';
import GraphView from './components/GraphView';
import MapView from './components/MapView';
import Timeline from './components/Timeline';
import StatsSidebar from './components/StatsSidebar';
import VirusLoader from './components/VirusLoader';

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

  return (
    <div className="flex flex-col h-screen w-screen bg-[var(--color-bg-primary)]">
      {/* ── Top Nav Bar ── */}
      <nav className="glass-strong flex items-center justify-between px-6 h-14 shrink-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold">
            E
          </div>
          <h1 className="text-base font-semibold tracking-tight">
            <span className="text-[var(--color-accent-light)]">Epi</span>Scope
          </h1>
        </div>

        <div className="flex items-center gap-1 bg-[var(--color-bg-primary)] rounded-xl p-1">
          {TABS.map((tab) => {
            const disabled = tab.key !== 'upload' && !hasData;
            return (
              <button
                key={tab.key}
                disabled={disabled}
                onClick={() => !disabled && setActiveView(tab.key)}
                className={`
                  px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
                  ${activeView === tab.key
                    ? 'bg-[var(--color-accent)] text-white shadow-lg shadow-indigo-500/20'
                    : disabled
                      ? 'text-[var(--color-text-muted)] cursor-not-allowed opacity-40'
                      : 'text-[var(--color-text-secondary)] hover:text-white hover:bg-[var(--color-bg-hover)]'
                  }
                `}
              >
                <span className="mr-1.5">{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="text-xs text-[var(--color-text-muted)] font-mono">
          {hasData ? `${nodes.length.toLocaleString()} nodes` : 'No data loaded'}
        </div>
      </nav>

      {/* ── Main Content ── */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Stats Sidebar (only when data exists and not on upload view) */}
        {hasData && activeView !== 'upload' && <StatsSidebar />}

        {/* View Area */}
        <div className="flex-1 relative min-w-0">
          {activeView === 'upload' && <UploadView />}
          {activeView === 'graph' && hasData && <GraphView />}
          {activeView === 'map' && hasData && <MapView />}
        </div>
      </div>

      {/* ── Timeline (only when data exists and not on upload) ── */}
      {hasData && activeView !== 'upload' && <Timeline />}

      {/* ── Loading Overlay ── */}
      {isLoading && <VirusLoader />}
    </div>
  );
}
