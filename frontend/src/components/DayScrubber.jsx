import React, { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import './DayScrubber.css'

export default function DayScrubber() {
  const { selectedDay, setSelectedDay } = useStore()
  const [playing, setPlaying]   = useState(false)
  const [speed, setSpeed]       = useState(600) // ms per day
  const intervalRef = useRef(null)

  function startPlay() {
    setPlaying(true)
  }

  function stopPlay() {
    setPlaying(false)
    clearInterval(intervalRef.current)
  }

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setSelectedDay(prev => {
          if (prev >= 30) {
            setPlaying(false)
            clearInterval(intervalRef.current)
            return 30
          }
          return prev + 1
        })
      }, speed)
    }
    return () => clearInterval(intervalRef.current)
  }, [playing, speed])

  const progress = ((selectedDay - 1) / 29) * 100

  return (
    <div className="scrubber">
      <button
        className={`play-btn ${playing ? 'pause' : 'play'}`}
        onClick={playing ? stopPlay : startPlay}
        title={playing ? 'Pause' : 'Play'}
      >
        {playing
          ? <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
            </svg>
          : <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <polygon points="5,3 19,12 5,21"/>
            </svg>
        }
      </button>

      <button
        className="reset-btn"
        onClick={() => { stopPlay(); setSelectedDay(1) }}
        title="Reset to day 1"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
        </svg>
      </button>

      <span className="scrubber-label">Day</span>

      <div className="slider-wrap">
        <div className="slider-track">
          <div className="slider-fill" style={{ width: `${progress}%` }} />
        </div>
        <input
          type="range"
          min="1" max="30"
          value={selectedDay}
          onChange={e => { stopPlay(); setSelectedDay(+e.target.value) }}
          className="slider-input"
        />
        {/* Day markers */}
        <div className="day-markers">
          {[1,5,10,15,20,25,30].map(d => (
            <span key={d} style={{ left: `${((d-1)/29)*100}%` }}>{d}</span>
          ))}
        </div>
      </div>

      <span className="scrubber-day">{selectedDay}</span>

      {/* Speed control */}
      <select
        className="speed-select"
        value={speed}
        onChange={e => setSpeed(+e.target.value)}
        title="Playback speed"
      >
        <option value={1000}>0.5×</option>
        <option value={600}>1×</option>
        <option value={300}>2×</option>
        <option value={150}>4×</option>
      </select>
    </div>
  )
}
