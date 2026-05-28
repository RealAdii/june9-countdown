import { useState, useEffect, useRef } from 'react'
import './App.css'

const START  = new Date('2026-05-27T00:00:00')
const TARGET = new Date('2026-06-09T00:00:00')

function getTimeLeft() {
  const diff = TARGET.getTime() - Date.now()
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  return {
    days:    Math.floor(diff / 86400000),
    hours:   Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000)  / 60000),
    seconds: Math.floor((diff % 60000)    / 1000),
  }
}

function getProgress() {
  const total   = TARGET.getTime() - START.getTime()
  const elapsed = Date.now() - START.getTime()
  return Math.min(Math.max((elapsed / total) * 100, 0), 100)
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function AnimatedNumber({ value }: { value: number }) {
  return (
    <div className="number">
      {pad(value).split('').map((char, i) => (
        <span key={`${i}-${char}`} className="digit">{char}</span>
      ))}
    </div>
  )
}

type TimeLeft = ReturnType<typeof getTimeLeft>

export default function App() {
  const [time, setTime]             = useState<TimeLeft>(getTimeLeft)
  const [progress, setProgress]     = useState(getProgress)
  const [muted, setMuted]           = useState(true)
  const [videoReady, setVideoReady] = useState(false)
  const [glitching, setGlitching]   = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const tickRef  = useRef<HTMLAudioElement>(null)

  // Countdown clock
  useEffect(() => {
    let id: ReturnType<typeof setTimeout>
    const tick = () => {
      setTime(getTimeLeft())
      setProgress(getProgress())
      id = setTimeout(tick, 1000 - (Date.now() % 1000))
    }
    id = setTimeout(tick, 1000 - (Date.now() % 1000))
    return () => clearTimeout(id)
  }, [])

  // Activate both audio sources on first interaction
  useEffect(() => {
    const activate = () => {
      const vid  = videoRef.current
      const tick = tickRef.current
      if (vid)  { vid.currentTime = 0; vid.muted = false }
      if (tick) { tick.currentTime = 0; tick.play() }
      setMuted(false)
    }
    document.addEventListener('click',      activate, { once: true })
    document.addEventListener('touchstart', activate, { once: true })
    document.addEventListener('keydown',    activate, { once: true })
    return () => {
      document.removeEventListener('click',      activate)
      document.removeEventListener('touchstart', activate)
      document.removeEventListener('keydown',    activate)
    }
  }, [])

  // Occasional glitch
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    const schedule = () => {
      timeout = setTimeout(() => {
        setGlitching(true)
        setTimeout(() => { setGlitching(false); schedule() }, 420)
      }, 8000 + Math.random() * 10000)
    }
    schedule()
    return () => clearTimeout(timeout)
  }, [])

  function toggleAudio() {
    const vid  = videoRef.current
    const tick = tickRef.current
    const next = !muted
    if (vid)  vid.muted  = next
    if (tick) tick.muted = next
    setMuted(next)
  }

  const units = [
    { key: 'days',    label: 'DAYS', value: time.days },
    { key: 'hours',   label: 'HRS',  value: time.hours },
    { key: 'minutes', label: 'MIN',  value: time.minutes },
    { key: 'seconds', label: 'SEC',  value: time.seconds },
  ]

  return (
    <div className="root">
      <video
        ref={videoRef}
        className={`bg-video${videoReady ? ' ready' : ''}`}
        src="/bg.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onCanPlayThrough={() => setVideoReady(true)}
      />

      {/* Tick audio — looping MP3, muted until user interaction */}
      <audio ref={tickRef} src="/tick.mp3" loop muted preload="auto" />

      <div className="grain" />

      <div className="content">
        <div className="eyebrow">COUNTING DOWN TO</div>

        <div className={`countdown ${glitching ? 'glitch' : ''}`}>
          {units.map(({ key, label, value }, i) => (
            <div key={key} style={{ display: 'contents' }}>
              <div className="unit">
                <div className="label">{label}</div>
                <AnimatedNumber value={value} />
              </div>
              {i < units.length - 1 && <div className="separator">:</div>}
            </div>
          ))}
        </div>

        <div className="date-line">
          <span className="date-text">JUNE 9, 2026</span>
        </div>
      </div>

      <div className="progress-wrap">
        <div className="progress-labels">
          <span />
          <span>JUN 9</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <button
        className="audio-btn"
        onClick={toggleAudio}
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            <line x1="23" y1="9" x2="17" y2="15"/>
            <line x1="17" y1="9" x2="23" y2="15"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
          </svg>
        )}
      </button>
    </div>
  )
}
