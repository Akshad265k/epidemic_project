import React from 'react'
import { useStore } from '../store'
import './Panel.css'

export default function Interventions() {
  const { interventions, setIntervention, uploadAndPredict,
          loading, predictions } = useStore()

  const rerun = () => {
    const file = document.querySelector('.file-input')?.files[0]
    if (!file) return alert('Please re-select your CSV file')
    uploadAndPredict(file, interventions)
  }

  return (
    <div className="panel">
      <div className="panel-title">Interventions</div>

      <label className="slider-label">
        Mask compliance: {interventions.mask_mandate}%
        <input type="range" min="0" max="100" value={interventions.mask_mandate}
               onChange={e => setIntervention('mask_mandate', +e.target.value)} />
      </label>

      <label className="check-label">
        <input type="checkbox" checked={interventions.school_closure}
               onChange={e => setIntervention('school_closure', e.target.checked)} />
        School closure
      </label>

      <label className="check-label">
        <input type="checkbox" checked={interventions.lockdown}
               onChange={e => setIntervention('lockdown', e.target.checked)} />
        Lockdown (reduce all contacts 60%)
      </label>

      <button className="run-btn" onClick={rerun} disabled={loading}>
        {loading ? 'Running...' : 'Re-run with interventions'}
      </button>
    </div>
  )
}