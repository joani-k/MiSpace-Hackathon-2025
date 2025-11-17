// /src/hooks/useIceFrames.js
import { useEffect, useState, useMemo, useRef } from 'react'
import { API } from '../data/api.js'

export function useIceFrames(windowSpec) {
  const [frames, setFrames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)

  const rafRef = useRef(null)
  const lastTickRef = useRef(0)
  const speedRef = useRef(1) // frames per second

  // Load frames whenever the window changes
  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)

    const beforeHours = windowSpec?.beforeHours ?? 12
    const afterHours = windowSpec?.afterHours ?? 12

    API.listFrames({ beforeHours, afterHours })
      .then((d) => {
        if (!alive) return
        const arr = d?.frames || []
        setFrames(arr)
        // center at "now" (middle of array) if we have frames
        setIndex(arr.length ? Math.floor(arr.length / 2) : 0)
      })
      .catch((e) => {
        if (!alive) return
        setError(e?.message || 'Failed to load frames')
        setFrames([])
        setIndex(0)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => { alive = false }
  }, [windowSpec?.beforeHours, windowSpec?.afterHours])

  const currentTime = frames[index] || null

  const setSpeed = (fps) => {
    // Clamp between 0.1 and 12 fps
    speedRef.current = Math.max(0.1, Math.min(12, fps || 1))
  }

  const play = () => setPlaying(true)
  const pause = () => setPlaying(false)
  const toggle = () => setPlaying((p) => !p)

  // Playback loop using requestAnimationFrame
  useEffect(() => {
    if (!playing || frames.length === 0) return

    // reset tick when we start/restart playback
    lastTickRef.current = 0

    const loop = (ts) => {
      // initialize lastTick on first frame
      if (!lastTickRef.current) {
        lastTickRef.current = ts
      }
      const last = lastTickRef.current
      const dt = ts - last
      const msPerFrame = 1000 / speedRef.current

      if (dt >= msPerFrame) {
        setIndex((i) => {
          const n = frames.length
          if (n === 0) return 0
          return (i + 1) % n
        })
        lastTickRef.current = ts
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      lastTickRef.current = 0
    }
  }, [playing, frames.length])

  const api = useMemo(
    () => ({
      frames,
      index,
      setIndex,
      currentTime,
      loading,
      error,
      playing,
      play,
      pause,
      toggle,
      setSpeed,
    }),
    [frames, index, currentTime, loading, error, playing]
  )

  return api
}
