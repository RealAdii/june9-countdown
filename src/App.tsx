import { useState, useEffect, useRef } from 'react'
import './App.css'

const TARGET = new Date('2026-06-09T00:00:00')

function getTimeLeft() {
  const diff = TARGET.getTime() - Date.now()
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  }
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

type TimeLeft = ReturnType<typeof getTimeLeft>

export default function App() {
  const [time, setTime] = useState<TimeLeft>(getTimeLeft)
  const [flipping, setFlipping] = useState<Record<string, boolean>>({})
  const prevRef = useRef<TimeLeft>(getTimeLeft())

  useEffect(() => {
    const timer = setInterval(() => {
      const next = getTimeLeft()
      const prev = prevRef.current
      const newFlipping: Record<string, boolean> = {}
      const keys = ['days', 'hours', 'minutes', 'seconds'] as const
      keys.forEach(k => {
        if (prev[k] !== next[k]) newFlipping[k] = true
      })
      prevRef.current = next
      setFlipping(newFlipping)
      setTime(next)
      setTimeout(() => setFlipping({}), 600)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const units = [
    { key: 'days', label: 'DAYS', value: time.days },
    { key: 'hours', label: 'HRS', value: time.hours },
    { key: 'minutes', label: 'MIN', value: time.minutes },
    { key: 'seconds', label: 'SEC', value: time.seconds },
  ]

  return (
    <div className="root">
      <video
        className="bg-video"
        src="/bg.mp4"
        autoPlay
        muted
        loop
        playsInline
      />
      <div className="overlay" />

      <div className="content">
        <div className="eyebrow">COUNTING DOWN TO</div>

        <div className="countdown">
          {units.map(({ key, label, value }, i) => (
            <>
              <div key={key} className={`unit ${flipping[key] ? 'flip' : ''}`}>
                <div className="card">
                  <div className="number">{pad(value)}</div>
                </div>
                <div className="label">{label}</div>
              </div>
              {i < units.length - 1 && (
                <div key={`sep-${i}`} className="separator">:</div>
              )}
            </>
          ))}
        </div>

        <div className="date-line">
          <span className="date-text">JUNE 9, 2026</span>
        </div>
      </div>
    </div>
  )
}
