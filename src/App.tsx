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
  const videoRef   = useRef<HTMLVideoElement>(null)
  const audioCtx   = useRef<AudioContext | null>(null)
  const mutedRef   = useRef(true)

  // Keep mutedRef in sync so the interval closure always has the current value
  useEffect(() => { mutedRef.current = muted }, [muted])

  // Deep heartbeat — single thump (lub) + softer echo (dub), 150ms apart
  function playHeartbeat() {
    if (mutedRef.current) return
    const ctx = audioCtx.current
    if (!ctx) return

    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -2
    comp.ratio.value     = 10
    comp.attack.value    = 0.001
    comp.release.value   = 0.15
    comp.connect(ctx.destination)

    function thump(when: number, freq: number, gain: number, decay: number) {
      const osc = ctx.createOscillator()
      const env = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, when)
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, when + decay)
      env.gain.setValueAtTime(gain, when)
      env.gain.exponentialRampToValueAtTime(0.001, when + decay)
      osc.connect(env)
      env.connect(comp)
      osc.start(when)
      osc.stop(when + decay)

      // Sub layer for physical weight
      const sub = ctx.createOscillator()
      const subEnv = ctx.createGain()
      sub.type = 'sine'
      sub.frequency.value = freq * 0.5
      subEnv.gain.setValueAtTime(gain * 0.7, when)
      subEnv.gain.exponentialRampToValueAtTime(0.001, when + decay * 0.7)
      sub.connect(subEnv)
      subEnv.connect(comp)
      sub.start(when)
      sub.stop(when + decay * 0.7)
    }

    const t = ctx.currentTime
    thump(t,        55, 1.0, 0.35)  // LUB — deep, heavy
    thump(t + 0.18, 70, 0.6, 0.25)  // dub — softer echo
  }

  // Countdown clock — synced to actual second boundary, not drifting interval
  useEffect(() => {
    let rafId: ReturnType<typeof setTimeout>

    const tick = () => {
      setTime(getTimeLeft())
      setProgress(getProgress())
      playHeartbeat()
      // Schedule next tick at the exact next second boundary
      const msUntilNext = 1000 - (Date.now() % 1000)
      rafId = setTimeout(tick, msUntilNext)
    }

    // Fire immediately at next second boundary
    const msUntilFirst = 1000 - (Date.now() % 1000)
    rafId = setTimeout(tick, msUntilFirst)
    return () => clearTimeout(rafId)
  }, [])

  // Unmute video + init AudioContext on first interaction
  useEffect(() => {
    const activate = () => {
      const vid = videoRef.current
      if (vid) {
        vid.currentTime = 0
        vid.muted = false
      }
      if (!audioCtx.current) {
        audioCtx.current = new AudioContext()
      }
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
    const vid = videoRef.current
    if (!vid) return
    const next = !vid.muted
    vid.muted = !vid.muted
    // Resume AudioContext if it was suspended
    if (!next && audioCtx.current?.state === 'suspended') {
      audioCtx.current.resume()
    }
    setMuted(!next)
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
