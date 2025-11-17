// /src/pages/IceForecast.jsx
import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import MapBase from '../components/Map/MapBase.jsx'
import IceLayer from '../components/Map/IceLayer.jsx'
import Legend from '../components/Legend.jsx'
import TimeWindowToggle from '../components/Controls/TimeWindowToggle.jsx'
import LayerSwitcher from '../components/Controls/LayerSwitcher.jsx'
import PlaybackBar from '../components/Playback/PlaybackBar.jsx'
import { useIceFrames } from '../hooks/useIceFrames.js'
import { API } from '../data/api.js'
import { PALETTES } from '../utils/palettes.js'
import maplibregl from 'maplibre-gl'

function fallbackLegendFor(product) {
  if (product === 'ice_thickness') {
    return {
      title: 'Ice thickness',
      unit: 'm',
      breaks: [0, 0.1, 0.3, 0.6, 1.0, 1.5, 2.0, 3.0],
      labels: ['0','0.1','0.3','0.6','1.0','1.5','2.0','3.0'],
      colors: [
        '#f7fcfd','#e5f5f9','#ccece6','#99d8c9',
        '#66c2a4','#41ae76','#238b45','#005824',
      ],
    }
  }
  if (product === 'ice_type') {
    return {
      title: 'Ice type',
      unit: '',
      breaks: [0, 10, 40, 70, 95, 100],
      labels: ['Open water','New/grey','First-year','Thick first-year','Multi-year',''],
      colors: ['#f0f9ff','#c7e9b4','#7fcdbb','#41b6c4','#2c7fb8','#253494'],
    }
  }
  return {
    title: (product || '').replace(/_/g, ' ') || 'ice',
    unit: '%',
    breaks: [0,10,20,30,40,50,60,70,80,90,100],
    labels: ['0','10','20','30','40','50','60','70','80','90','100'],
    colors: [
      '#f7fbff','#deebf7','#c6dbef','#9ecae1','#6baed6',
      '#4292c6','#2171b5','#08519c','#08306b','#041b4d','#02102e',
    ],
  }
}

export default function IceForecast({ cbFriendly, demoMode }) {
  const [map, setMap] = useState(null)
  const [product, setProduct] = useState('ice_concentration')
  const [mode, setMode] = useState('ice')
  const [legend, setLegend] = useState(null)
  const [windowSpec, setWindowSpec] = useState(
    API.WINDOWS?.HOURS_24 || { id: '24h', label: 'Last 24h' }
  )
  const [opacity, setOpacity] = useState(1.0)   // start at fully opaque
  const [narrative, setNarrative] = useState('')
  const [uiMsg, setUiMsg] = useState('')
  const [leftOpen, setLeftOpen] = useState(
    () => localStorage.getItem('leftOpen') !== '0'
  )

  const pal = useMemo(() => {
    const normal = PALETTES?.normal?.name || 'default'
    const cb     = PALETTES?.cb?.name || normal
    return cbFriendly ? cb : normal
  }, [cbFriendly])

  const {
    frames, index, setIndex, currentTime, loading, error,
    playing, toggle, setSpeed,
  } = useIceFrames(windowSpec)

  // Legend from src/sample_data, with API fallback
  useEffect(() => {
    let alive = true
    const loadLegend = async () => {
      try {
        const legendUrl = new URL(
          `../sample_data/legend.${product}.json`,
          import.meta.url
        ).href
        const res = await fetch(legendUrl, { cache: 'no-store' })
        if (res.ok) {
          const d = await res.json()
          if (alive) { setLegend(d); return }
        }
      } catch {
        // ignore and fall through
      }

      try {
        if (API.legend) {
          const d = await API.legend({ product, palette: pal })
          if (alive) { setLegend(d); return }
        }
      } catch {
        // ignore
      }

      if (alive) setLegend(fallbackLegendFor(product))
    }

    loadLegend()
    return () => { alive = false }
  }, [product, pal])

  const safeLegend = useMemo(
    () => legend || fallbackLegendFor(product),
    [legend, product]
  )

  // Narrative from src/sample_data with API fallback
  useEffect(() => {
    let alive = true
    if (!currentTime) { setNarrative(''); return }

    const loadNarrative = async () => {
      try {
        const url = new URL(
          '../sample_data/narrative.json',
          import.meta.url
        ).href
        const res = await fetch(url, { cache: 'no-store' })
        if (res.ok) {
          const j = await res.json()
          if (!alive) return
          if (j[currentTime]) {
            setNarrative(j[currentTime])
            return
          }
        }
      } catch {
        // ignore
      }

      try {
        if (API.narrative) {
          const d = await API.narrative({ isoTime: currentTime })
          if (!alive) return
          setNarrative(d?.text || '')
          return
        }
      } catch {
        // ignore
      }

      if (alive) setNarrative('')
    }

    loadNarrative()
    return () => { alive = false }
  }, [currentTime])

  // Map controls + status
  const addedControls = useRef(false)
  useEffect(() => {
    if (!map) return
    const addControls = () => {
      if (addedControls.current) return
      map.addControl(
        new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }),
        'bottom-right'
      )
      addedControls.current = true
      const onMove = () => {
        const c = map.getCenter()
        setUiMsg(
          `Lon ${c.lng.toFixed(3)} • Lat ${c.lat.toFixed(3)} • Z ${map
            .getZoom()
            .toFixed(1)}`
        )
      }
      map.on('move', onMove)
      onMove()
    }
    if (map.isStyleLoaded?.()) addControls()
    else map.once('styledata', addControls)
  }, [map])

  // Resize
  useEffect(() => {
    if (!map) return
    const kick = () => { map.resize(); setTimeout(() => map.resize(), 60) }
    kick()
    const onResize = () => kick()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [map])

  useEffect(() => {
    if (!map) return
    const id = setTimeout(() => map.resize(), 220)
    return () => clearTimeout(id)
  }, [map, leftOpen])

  // Frame stepping
  const stepFrame = useCallback(
    (delta) => {
      if (!frames?.length) return
      setIndex((i) => {
        const n = frames.length
        return (i + delta + n) % n
      })
    },
    [frames?.length, setIndex]
  )

  useEffect(() => {
    const onKey = (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowRight') { e.preventDefault(); stepFrame(1) }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); stepFrame(-1) }
      if (e.key === 'Escape') setLeftOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stepFrame])

  useEffect(() => {
    localStorage.setItem('leftOpen', leftOpen ? '1' : '0')
  }, [leftOpen])

  const snapshot = () => {
    if (!map) return
    const a = document.createElement('a')
    a.href = map.getCanvas().toDataURL('image/png')
    a.download = `ice_${product}_${currentTime || 'now'}.png`
    a.click()
  }

  const focusGreatLakes = useCallback(() => {
    if (!map) return
    const bbox = [[-93.8, 40.2], [-74.0, 49.6]]
    map.fitBounds(bbox, { padding: 40, duration: 400 })
  }, [map])

  useEffect(() => {
    if (!map) return
    const run = () => focusGreatLakes()
    if (map.loaded?.()) run()
    else map.once('load', run)
    return () => map.off?.('load', run)
  }, [map, focusGreatLakes])

  useEffect(() => {
    if (demoMode) setMode('ice')
  }, [demoMode])

  return (
    <div className="absolute inset-0">
      {/* Left panel */}
      <aside
        className={`absolute top-4 left-4 z-40 w-[22rem] max-w-[90vw] transition-transform duration-300
        ${leftOpen ? 'translate-x-0' : '-translate-x-[calc(100%+1rem)]'}`}
        aria-hidden={!leftOpen}
      >
        <div className="glass rounded-xl p-3 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Ice map</div>
            <button
              onClick={() => setLeftOpen(false)}
              className="glass px-2 py-0.5 rounded-md text-xs"
              aria-label="Collapse panel"
              title="Collapse"
            >
              ←
            </button>
          </div>

          <LayerSwitcher mode={mode} onChange={setMode} />
          <TimeWindowToggle value={windowSpec} onChange={setWindowSpec} />

          {/* Product + opacity */}
          <div className="glass rounded-lg p-2 space-y-2">
            <label className="text-sm block">
              Product
              <select
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                className="ml-2 glass px-2 py-1 rounded-md"
              >
                <option value="ice_concentration">Concentration</option>
                <option value="ice_thickness">Thickness</option>
                <option value="ice_type">Type</option>
              </select>
            </label>

            <label className="text-sm flex items-center gap-3">
              Opacity
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="w-40"
              />
              <span className="text-xs opacity-75 w-8">
                {Math.round(opacity * 100)}%
              </span>
            </label>

            <div className="flex flex-wrap gap-2">
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800">
                {cbFriendly ? 'CB Palette' : 'Default Palette'}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800">
                {windowSpec.label}
              </span>
            </div>
          </div>

          <Legend key={`${product}-${pal}`} legend={safeLegend} />

          <div className="flex justify-between items-center">
            <button
              className="px-3 py-1 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-sm"
              onClick={snapshot}
            >
              Export snapshot
            </button>
          </div>
        </div>
      </aside>

      {!leftOpen && (
        <button
          onClick={() => setLeftOpen(true)}
          className="absolute top-4 left-0 z-40 -translate-x-1/2 glass px-2 py-2 rounded-r-xl text-xs"
          aria-label="Expand panel"
          title="Expand"
        >
          ➤
        </button>
      )}

      {/* Bottom playback */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40">
        <div className="flex flex-col items-center">
          <div className="mb-2 flex items-center gap-2">
            <button
              onClick={() => stepFrame(-1)}
              className="glass px-3 py-1 rounded-md text-sm"
              aria-label="Previous frame"
            >
              ◀
            </button>
            <PlaybackBar
              frames={frames}
              index={index}
              setIndex={setIndex}
              playing={playing}
              toggle={toggle}
              setSpeed={setSpeed}
            />
            <button
              onClick={() => stepFrame(1)}
              className="glass px-3 py-1 rounded-md text-sm"
              aria-label="Next frame"
            >
              ▶
            </button>
          </div>
          <div className="text-center text-xs opacity-75 h-4">
            {loading ? 'Loading frames…' : error ? `Error: ${error}` : ''}
          </div>
        </div>
      </div>

      {/* Bottom-left: focus Great Lakes */}
      <div className="absolute bottom-4 left-4 z-40">
        <button
          onClick={focusGreatLakes}
          className="glass px-3 py-1 rounded-md text-sm"
          aria-label="Zoom to Great Lakes"
          title="Zoom to Great Lakes"
        >
          Great Lakes
        </button>
      </div>

      {/* Right narrative */}
      <div className="absolute top-4 right-4 z-40 w-[22rem] max-w-[90vw]">
        <div className="glass rounded-xl p-3">
          <div className="flex items-center justify-between mb-1">
            <div className="font-semibold text-sm">Narrative</div>
            <div className="text-[10px] opacity-70">
              {currentTime
                ? new Date(currentTime).toLocaleString(undefined, { hour12: false })
                : '—'}
            </div>
          </div>
          <p className="text-sm leading-snug whitespace-pre-line">
            {narrative || 'No narrative available for this time.'}
          </p>
        </div>
      </div>

      {/* Top center status */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-40 flex justify-center">
        <div className="pointer-events-auto mt-3 glass px-3 py-1 rounded-full text-[11px]">
          {uiMsg || '—'}
        </div>
      </div>

      {/* Map + ice layer */}
      <MapBase cbFriendly={cbFriendly} onReady={setMap}>
        {(m) => (
          <>
            {m && mode === 'ice' && (
              <IceLayer
              map={m}
              product={product}
              // new: pass the current frame index so we can filter on "step"
              frameIndex={index}
              // keep isoTime for future / narrative if you want
              isoTime={currentTime}
              paletteName={pal}
              opacity={opacity}
              legend={safeLegend}
            />
            
            )}
          </>
        )}
      </MapBase>
    </div>
  )
}


