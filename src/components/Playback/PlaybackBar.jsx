// /src/components/Playback/PlaybackBar.jsx
import { useMemo, useState } from 'react'

export default function PlaybackBar({ frames, index, setIndex, playing, toggle, setSpeed }) {
  const [fps, setFps] = useState(4)

  const stamp = useMemo(() => {
    if (!frames.length) return '—'
    const t = frames[index]
    try {
      const d = new Date(t)
      return d.toLocaleString(undefined, { hour12: false })
    } catch {
      return t
    }
  }, [frames, index])

  return (
    <div className="glass rounded-xl p-3 flex flex-wrap items-center gap-3">
      <button
        className="px-3 py-1 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
        onClick={toggle}
        aria-label="Play/Pause"
      >
        {playing ? 'Pause' : 'Play'}
      </button>

      <input
        type="range"
        min={0}
        max={Math.max(0, frames.length - 1)}
        value={index}
        onChange={e => setIndex(Number(e.target.value))}
        className="w-64"
        aria-label="Timeline"
      />

      <div className="text-sm opacity-80">{stamp}</div>

      <label className="text-sm flex items-center gap-2">
        FPS
        <input
          type="number"
          min={0.5}
          max={12}
          step={0.5}
          value={fps}
          onChange={e => {
            const v = Number(e.target.value)
            setFps(v)
            setSpeed(v)
          }}
          className="w-16 glass px-2 py-1 rounded-md"
        />
      </label>
    </div>
  )
}
