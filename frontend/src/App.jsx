import React, { useState } from 'react'
import { useStore } from './store'
import UploadPanel   from './components/UploadPanel'
import SeirdChart    from './components/SeirdChart'
import MapView       from './components/MapView'
import GraphView     from './components/GraphView'
import DayScrubber   from './components/DayScrubber'
import Interventions from './components/Interventions'
import './App.css'

export default function App() {
  const { predictions, loading, error, view, setView } = useStore()

  return (
    <div className="app">
      <header className="header">
        <span className="logo">EpidemicTGN</span>
        <div className="view-toggle">
          <button className={view === 'map'   ? 'active' : ''} onClick={() => setView('map')}>Map</button>
          <button className={view === 'graph' ? 'active' : ''} onClick={() => setView('graph')}>Graph</button>
        </div>
      </header>

      <div className="body">
        <aside className="sidebar">
          <UploadPanel />
          {predictions && <Interventions />}
          {predictions && <SeirdChart />}
        </aside>

        <main className="main">
          {!predictions && !loading && (
            <div className="empty">Upload a CSV to start prediction</div>
          )}
          {loading && (
            <div className="empty">Running prediction — this takes 2–5 minutes on CPU...</div>
          )}
          {error && (
            <div className="empty error">{error}</div>
          )}
          {predictions && view === 'map'   && <MapView />}
          {predictions && view === 'graph' && <GraphView />}
        </main>
      </div>

      {predictions && <DayScrubber />}
    </div>
  )
}