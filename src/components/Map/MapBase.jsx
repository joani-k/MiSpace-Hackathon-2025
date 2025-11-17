// /src/components/Map/MapBase.jsx
import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MAP } from '../../data/api.js'

export default function MapBase({ onReady, children, cbFriendly }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const roRef = useRef(null)

  // "Old colored" MapLibre demo style (very first version with colors)
  const CLASSIC_STYLE_URL = MAP.CLASSIC_STYLE || 'https://demotiles.maplibre.org/style.json'

  // Persist user choice to use the classic colored style
  const [classic, setClassic] = useState(() => localStorage.getItem('classicStyle') === '1')

  const pickStyle = (cb) =>
    (classic && CLASSIC_STYLE_URL) ||
    ((cb && (MAP.CB_STYLE || MAP.FALLBACK_STYLE)) ||
      MAP.STYLE ||
      CLASSIC_STYLE_URL)

  // Initial mount
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    let usedFallback = false
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: pickStyle(cbFriendly),
      center: MAP.CENTER,
      zoom: MAP.ZOOM,
      attributionControl: true,
      preserveDrawingBuffer: true,
      failIfMajorPerformanceCaveat: false,
    })
    mapRef.current = map

    const kick = () => {
      requestAnimationFrame(() => {
        map.resize()
        requestAnimationFrame(() => map.resize())
      })
    }

    // If style/sources error → try fallback once (prefer classic if user asked for it)
    const onError = () => {
      if (usedFallback) return
      usedFallback = true
      const fb = classic ? CLASSIC_STYLE_URL : (MAP.FALLBACK_STYLE || CLASSIC_STYLE_URL)
      try { map.setStyle(fb) } catch {}
    }
    map.on('error', onError)

    const onLoad = () => {
      kick()
      onReady?.(map) // style is ready; children can safely add sources/layers
    }
    if (map.isStyleLoaded?.()) onLoad()
    else map.once('load', onLoad)

    // Resize hooks
    const onWinResize = () => map.resize()
    window.addEventListener('resize', onWinResize)

    if ('ResizeObserver' in window) {
      roRef.current = new ResizeObserver(() => map.resize())
      roRef.current.observe(containerRef.current)
    }

    return () => {
      window.removeEventListener('resize', onWinResize)
      try { roRef.current?.disconnect() } catch {}
      try { map.remove() } catch {}
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // mount once

  // Hot-swap style when cbFriendly or classic toggles
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const targetStyle = pickStyle(cbFriendly)

    // Re-run onReady when the new style is loaded so children can re-add layers
    let readded = false
    const handle = () => {
      if (readded) return
      readded = true
      onReady?.(map)
    }
    map.once('load', handle)
    try { map.setStyle(targetStyle) } catch {}
    return () => map.off('load', handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cbFriendly, classic])

  // Toggle handler for classic vs default styles
  const toggleClassic = () => {
    setClassic((v) => {
      const next = !v
      localStorage.setItem('classicStyle', next ? '1' : '0')
      return next
    })
  }

  // Focus Great Lakes bbox (try MAP.GREAT_LAKES_BBOX first, else fallback)
  const focusGreatLakes = () => {
    const map = mapRef.current
    if (!map) return
    const bbox =
      MAP.GREAT_LAKES_BBOX || [[-93.8, 40.2], [-74.0, 49.6]] // [west,south] .. [east,north]
    try {
      map.fitBounds(bbox, { padding: 40, duration: 400 })
    } catch {}
  }

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full" />

      {/* Overlay buttons: Classic style toggle + Great Lakes focus */}
      <div className="absolute bottom-4 left-4 z-40 flex gap-2">
        <button
          type="button"
          className="glass px-3 py-1 rounded-md text-sm"
          onClick={toggleClassic}
          aria-pressed={classic}
          title={classic ? 'Switch to default style' : 'Switch to classic colored style'}
        >
          {classic ? 'Default map' : 'Classic color map'}
        </button>

        <button
          type="button"
          className="glass px-3 py-1 rounded-md text-sm"
          onClick={focusGreatLakes}
          title="Zoom to Great Lakes"
          aria-label="Zoom to Great Lakes"
        >
          Great Lakes
        </button>
      </div>

      {mapRef.current && children?.(mapRef.current)}
    </div>
  )
}

/*
Note: If /src/pages/IceForecast.jsx still renders its own “Great Lakes” button,
you will see two buttons. Remove the page-level one to avoid duplication.
*/
