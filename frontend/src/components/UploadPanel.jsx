import React, { useRef } from 'react'
import { useStore } from '../store'
import './Panel.css'

export default function UploadPanel() {
  const { uploadAndPredict, loading, interventions } = useStore()
  const fileRef = useRef()

  const handleRun = () => {
    const file = fileRef.current?.files[0]
    if (!file) return alert('Select a CSV file first')
    uploadAndPredict(file, interventions)
  }

  return (
    <div className="panel">
      <div className="panel-title">Upload</div>
      <p className="panel-hint">CSV with columns: node_id, infected (0 or 1)</p>
      <input ref={fileRef} type="file" accept=".csv" className="file-input" />
      <button className="run-btn" onClick={handleRun} disabled={loading}>
        {loading ? 'Predicting...' : 'Run Prediction'}
      </button>
    </div>
  )
}