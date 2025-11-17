// /src/pages/RoutePlanner.jsx

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react'
import maplibregl from 'maplibre-gl'

import MapBase from '../components/Map/MapBase.jsx'
import RouteLayer from '../components/Map/RouteLayer.jsx'
import IceLayer from '../components/Map/IceLayer.jsx'
import { API } from '../data/api.js'

// Ports used in the presets dropdown
const PORTS = [
  { name: 'Detroit, MI', lon: -83.0458, lat: 42.3314 },
  { name: 'Cleveland, OH', lon: -81.6954, lat: 41.4993 },
  { name: 'Toledo, OH', lon: -83.5379, lat: 41.6528 },
  { name: 'Chicago, IL', lon: -87.6298, lat: 41.8781 },
  { name: 'Milwaukee, WI', lon: -87.9065, lat: 43.0389 },
  { name: 'Green Bay, WI', lon: -88.0198, lat: 44.5133 },
  { name: 'Duluth, MN', lon: -92.1005, lat: 46.7867 },
  { name: 'Sault Ste. Marie, MI', lon: -84.3453, lat: 46.4953 },
  { name: 'Thunder Bay, ON', lon: -89.2477, lat: 48.3809 },
]

// Great Lakes bounding box: [minLon, minLat, maxLon, maxLat]
const GREAT_LAKES_BBOX = [-93.5, 40.2, -74.0, 50.5]

// For now we route on the first forecast day
// (must match one of the ISO timestamps in frames.forecast.json)
const ROUTE_TIME_ISO = '2025-02-10T00:00:00Z'

// ---------------------------------------------------------------------
// Simple distance helpers (for info in the side panel)
// ---------------------------------------------------------------------
const toRad = (d) => (d * Math.PI) / 180

function distKm(a, b) {
  const R = 6371
  const dLat = toRad(b[1] - a[1])
  const dLon = toRad(b[0] - a[0])
  const lat1 = toRad(a[1])
  const lat2 = toRad(b[1])
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(s))
}

function lineDistanceKm(geojson) {
  if (!geojson) return 0
  const lines = []
  if (geojson.type === 'FeatureCollection') {
    for (const f of geojson.features) {
      if (f.geometry?.type === 'LineString') lines.push(f.geometry.coordinates)
    }
  } else if (geojson.type === 'Feature' && geojson.geometry?.type === 'LineString') {
    lines.push(geojson.geometry.coordinates)
  }
  let total = 0
  for (const coords of lines) {
    for (let i = 1; i < coords.length; i++) {
      total += distKm(coords[i - 1], coords[i])
    }
  }
  return total
}

// ---------------------------------------------------------------------
// Small layout helpers
// ---------------------------------------------------------------------
const Section = ({ title, right, children }) => (
  <section className="space-y-2">
    <div className="flex items-center justify-between">
      <h3 className="font-medium">{title}</h3>
      {right}
    </div>
    {children}
  </section>
)

const Field = ({ label, children }) => (
  <label className="text-sm flex items-center justify-between gap-2">
    <span className="opacity-80">{label}</span>
    {children}
  </label>
)

// Simple in-memory cache (still useful if backend is slow)
const routeCache = new Map()
const cacheKey = (s, d, v) =>
  [
    s.lon.toFixed(4),
    s.lat.toFixed(4),
    d.lon.toFixed(4),
    d.lat.toFixed(4),
    v.draft_m,
    v.ice_class,
    v.speed_knots,
    ROUTE_TIME_ISO,
  ].join('|')

// ---------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------
export default function RoutePlanner({ cbFriendly = false }) {
  const [map, setMap] = useState(null)
  const [isPending, startTransition] = useTransition()

  const [leftOpen, setLeftOpen] = useState(
    () => localStorage.getItem('routeLeftOpen') !== '0'
  )
  useEffect(
    () => localStorage.setItem('routeLeftOpen', leftOpen ? '1' : '0'),
    [leftOpen]
  )

  const [tab, setTab] = useState('points')

  const startMarkerRef = useRef(null)
  const destMarkerRef = useRef(null)

  // Default: Detroit → Chicago
  const [start, setStart] = useState({ lon: -83.0458, lat: 42.3314 })
  const [dest, setDest] = useState({ lon: -87.6298, lat: 41.8781 })
  const [activePick, setActivePick] = useState('start')

  const [vessel, setVessel] = useState({
    draft_m: 7,
    ice_class: 'light',
    speed_knots: 12,
  })

  const [route, setRoute] = useState(null)
  const [notes, setNotes] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  // -------------------------------------------------------------------
  // Init from URL if present
  // -------------------------------------------------------------------
  useEffect(() => {
    const u = new URL(window.location.href)
    const gs = (k, def) => Number(u.searchParams.get(k) ?? def)
    const sLon = u.searchParams.get('slon')
    const sLat = u.searchParams.get('slat')
    const dLon = u.searchParams.get('dlon')
    const dLat = u.searchParams.get('dlat')
    const spd = gs('spd', vessel.speed_knots)
    const dr = gs('draft', vessel.draft_m)
    const ic = u.searchParams.get('ic') || vessel.ice_class
    if (sLon && sLat && dLon && dLat) {
      setStart({ lon: Number(sLon), lat: Number(sLat) })
      setDest({ lon: Number(dLon), lat: Number(dLat) })
    }
    setVessel((v) => ({ ...v, speed_knots: spd, draft_m: dr, ice_class: ic }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setUrl = useCallback(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('slon', String(start.lon))
    url.searchParams.set('slat', String(start.lat))
    url.searchParams.set('dlon', String(dest.lon))
    url.searchParams.set('dlat', String(dest.lat))
    url.searchParams.set('draft', String(vessel.draft_m))
    url.searchParams.set('ic', vessel.ice_class)
    url.searchParams.set('spd', String(vessel.speed_knots))
    url.searchParams.set('time', ROUTE_TIME_ISO)
    window.history.replaceState(null, '', url.toString())
  }, [start, dest, vessel])
  useEffect(() => {
    setUrl()
  }, [setUrl])

  // -------------------------------------------------------------------
  // Map controls (only once)
  // -------------------------------------------------------------------
  const controlsAdded = useRef(false)
  useEffect(() => {
    if (!map || controlsAdded.current) return
    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right')
    map.addControl(
      new maplibregl.GeolocateControl({ trackUserLocation: true }),
      'top-right'
    )
    controlsAdded.current = true
  }, [map])

  // -------------------------------------------------------------------
  // Markers + click-to-pick behaviour
  // -------------------------------------------------------------------
  useEffect(() => {
    if (!map) return

    const mk = (coords, color) =>
      new maplibregl.Marker({ color, draggable: true })
        .setLngLat([coords.lon, coords.lat])
        .addTo(map)

    if (!startMarkerRef.current) startMarkerRef.current = mk(start, '#2a9d8f')
    if (!destMarkerRef.current) destMarkerRef.current = mk(dest, '#e85d04')

    const onDragEndStart = () => {
      const p = startMarkerRef.current.getLngLat()
      setStart({ lon: +p.lng.toFixed(5), lat: +p.lat.toFixed(5) })
    }
    const onDragEndDest = () => {
      const p = destMarkerRef.current.getLngLat()
      setDest({ lon: +p.lng.toFixed(5), lat: +p.lat.toFixed(5) })
    }

    startMarkerRef.current.on('dragend', onDragEndStart)
    destMarkerRef.current.on('dragend', onDragEndDest)

    const onClick = (e) => {
      const { lng, lat } = e.lngLat
      const point = { lon: +lng.toFixed(5), lat: +lat.toFixed(5) }
      if (activePick === 'start') {
        setStart(point)
        startMarkerRef.current.setLngLat([point.lon, point.lat])
      } else {
        setDest(point)
        destMarkerRef.current.setLngLat([point.lon, point.lat])
      }
    }
    map.on('click', onClick)

    return () => {
      map.off('click', onClick)
      startMarkerRef.current?.remove()
      destMarkerRef.current?.remove()
      startMarkerRef.current = null
      destMarkerRef.current = null
    }
  }, [map, activePick])

  useEffect(() => {
    if (map && startMarkerRef.current)
      startMarkerRef.current.setLngLat([start.lon, start.lat])
    if (map && destMarkerRef.current)
      destMarkerRef.current.setLngLat([dest.lon, dest.lat])
  }, [map, start, dest])

  useEffect(() => {
    if (map) map.resize()
  }, [map])

  useEffect(() => {
    if (!map) return
    const id = setTimeout(() => map.resize(), 320)
    return () => clearTimeout(id)
  }, [leftOpen, map])

  // -------------------------------------------------------------------
  // Fetch route from backend – avoid land & minimize ice
  // -------------------------------------------------------------------
  const debounceRef = useRef(null)
  const abortRef = useRef(null)

  useEffect(() => {
    if (!map) return
    clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      const key = cacheKey(start, dest, vessel)
      const cached = routeCache.get(key)
      if (cached) {
        startTransition(() => {
          setRoute(cached.route)
          setNotes(cached.notes || '')
        })
        return
      }

      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      setBusy(true)
      setErr('')

      try {
        const d = await API.bestRoute({
          startLon: start.lon,
          startLat: start.lat,
          destLon: dest.lon,
          destLat: dest.lat,
          vessel,
          timeIso: ROUTE_TIME_ISO,
          objective: 'min_ice',
          signal: ctrl.signal,
        })

        const bbox = routeToBbox(d.route)
        routeCache.set(key, { route: d.route, notes: d.notes || '', bbox })

        startTransition(() => {
          setRoute(d.route)
          setNotes(d.notes || '')
        })
      } catch (e) {
        if (e?.name !== 'AbortError') {
          setErr(e?.message || 'Route fetch failed')
          setRoute(null)
          setNotes('')
        }
      } finally {
        setBusy(false)
      }
    }, 250)

    return () => clearTimeout(debounceRef.current)
  }, [map, start, dest, vessel])

  function routeToBbox(geo) {
    if (!geo) return null
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity
    const push = (x, y) => {
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
    const scan = (g) => {
      if (g.type === 'LineString')
        for (const [x, y] of g.coordinates) push(x, y)
      if (g.type === 'MultiLineString')
        for (const ls of g.coordinates) for (const [x, y] of ls) push(x, y)
    }
    if (geo.type === 'Feature') scan(geo.geometry)
    if (geo.type === 'FeatureCollection')
      for (const f of geo.features) scan(f.geometry)
    if (!isFinite(minX)) return null
    return [minX, minY, maxX, maxY]
  }

  const distanceKm = useMemo(() => lineDistanceKm(route), [route])
  const etaHours = useMemo(() => {
    const kmph = Math.max(1e-6, vessel.speed_knots * 1.852)
    return distanceKm / kmph
  }, [distanceKm, vessel.speed_knots])

  const swap = () => {
    setStart(dest)
    setDest(start)
  }

  const setFromPort = (setter) => (e) => {
    const p = PORTS.find((x) => x.name === e.target.value)
    if (p) setter({ lon: p.lon, lat: p.lat })
  }

  const startPortName =
    PORTS.find((p) => p.lon === start.lon && p.lat === start.lat)?.name || ''
  const destPortName =
    PORTS.find((p) => p.lon === dest.lon && p.lat === dest.lat)?.name || ''

  const exportGeoJSON = () => {
    if (!route) return
    const blob = new Blob([JSON.stringify(route, null, 2)], {
      type: 'application/geo+json',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'route.geojson'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {}
  }

  // Focus map on Great Lakes
  const focusGreatLakes = useCallback(() => {
    if (!map) return
    map.fitBounds(
      [
        [GREAT_LAKES_BBOX[0], GREAT_LAKES_BBOX[1]],
        [GREAT_LAKES_BBOX[2], GREAT_LAKES_BBOX[3]],
      ],
      { padding: 40, duration: 450, pitch: 0, bearing: 0 }
    )
  }, [map])

  useEffect(() => {
    const onKey = (e) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return
      if (e.key === 'Escape') setLeftOpen(false)
      if (e.key.toLowerCase() === 'o') setLeftOpen(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const isLoading = !map || busy || isPending

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------
  return (
    <div className="relative h-[calc(100vh-120px)]">
      {/* LEFT DRAWER */}
      <aside
        className={`absolute top-4 left-4 z-40 w-[20rem] max-w-[90vw] transition-transform duration-300
        ${leftOpen ? 'translate-x-0' : '-translate-x-[calc(100%+1rem)]'}`}
        aria-hidden={!leftOpen}
      >
        <div className="glass rounded-xl p-3 text-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Route Planner</div>
            <div className="flex items-center gap-2">
              <div className="text-[11px] opacity-70">
                {isLoading ? (
                  'Loading…'
                ) : err ? (
                  <span className="text-red-500">Error</span>
                ) : (
                  'Ready'
                )}
              </div>
              <button
                onClick={() => setLeftOpen(false)}
                className="glass px-2 py-0.5 rounded-md text-xs"
                aria-label="Collapse panel"
                title="Collapse"
              >
                ←
              </button>
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Route planner sections"
            className="grid grid-cols-3 gap-1"
          >
            {['points', 'vessel', 'share'].map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`px-2 py-1 rounded-md capitalize ${
                  tab === t
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'glass'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'points' && (
            <div className="space-y-4">
              <Section
                title="Start"
                right={
                  <div className="flex items-center gap-2">
                    <button
                      className={`px-2 py-0.5 rounded-md ${
                        activePick === 'start'
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                          : 'glass'
                      }`}
                      onClick={() => setActivePick('start')}
                      aria-pressed={activePick === 'start'}
                    >
                      Pick
                    </button>
                    <select
                      className="glass px-2 py-1 rounded-md"
                      onChange={setFromPort(setStart)}
                      value={startPortName}
                      aria-label="Start port preset"
                    >
                      <option value="" disabled={startPortName !== ''}>
                        Presets
                      </option>
                      {PORTS.map((p) => (
                        <option key={p.name} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                }
              >
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Longitude">
                    <input
                      type="number"
                      step="0.0001"
                      value={start.lon}
                      onChange={(e) =>
                        setStart((s) => ({
                          ...s,
                          lon: Number(e.target.value),
                        }))
                      }
                      className="w-full glass px-2 py-1 rounded-md"
                    />
                  </Field>
                  <Field label="Latitude">
                    <input
                      type="number"
                      step="0.0001"
                      value={start.lat}
                      onChange={(e) =>
                        setStart((s) => ({
                          ...s,
                          lat: Number(e.target.value),
                        }))
                      }
                      className="w-full glass px-2 py-1 rounded-md"
                    />
                  </Field>
                </div>
              </Section>

              <Section
                title="Destination"
                right={
                  <div className="flex items-center gap-2">
                    <button
                      className={`px-2 py-0.5 rounded-md ${
                        activePick === 'dest'
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                          : 'glass'
                      }`}
                      onClick={() => setActivePick('dest')}
                      aria-pressed={activePick === 'dest'}
                    >
                      Pick
                    </button>
                    <select
                      className="glass px-2 py-1 rounded-md"
                      onChange={setFromPort(setDest)}
                      value={destPortName}
                      aria-label="Destination port preset"
                    >
                      <option value="" disabled={destPortName !== ''}>
                        Presets
                      </option>
                      {PORTS.map((p) => (
                        <option key={p.name} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                }
              >
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Longitude">
                    <input
                      type="number"
                      step="0.0001"
                      value={dest.lon}
                      onChange={(e) =>
                        setDest((d) => ({
                          ...d,
                          lon: Number(e.target.value),
                        }))
                      }
                      className="w-full glass px-2 py-1 rounded-md"
                    />
                  </Field>
                  <Field label="Latitude">
                    <input
                      type="number"
                      step="0.0001"
                      value={dest.lat}
                      onChange={(e) =>
                        setDest((d) => ({
                          ...d,
                          lat: Number(e.target.value),
                        }))
                      }
                      className="w-full glass px-2 py-1 rounded-md"
                    />
                  </Field>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={swap}
                    className="px-3 py-1 rounded-md glass"
                    title="Swap start and destination"
                  >
                    Swap ↔
                  </button>
                </div>
              </Section>

              <div className="text-xs opacity-80 grid grid-cols-2 gap-2">
                <div>
                  Distance:{' '}
                  {distanceKm ? `${distanceKm.toFixed(1)} km` : '—'}
                </div>
                <div>
                  ETA @ {vessel.speed_knots} kn:{' '}
                  {distanceKm ? `${etaHours.toFixed(1)} h` : '—'}
                </div>
              </div>
            </div>
          )}

          {tab === 'vessel' && (
            <div className="space-y-3">
              <Section title="Vessel parameters">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Draft (m)">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      className="w-full glass px-2 py-1 rounded-md"
                      value={vessel.draft_m}
                      onChange={(e) =>
                        setVessel((v) => ({
                          ...v,
                          draft_m: Number(e.target.value),
                        }))
                      }
                    />
                  </Field>
                  <Field label="Speed (kn)">
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      className="w-full glass px-2 py-1 rounded-md"
                      value={vessel.speed_knots}
                      onChange={(e) =>
                        setVessel((v) => ({
                          ...v,
                          speed_knots: Number(e.target.value),
                        }))
                      }
                    />
                  </Field>
                  <Field label="Ice class">
                    <select
                      className="w-full glass px-2 py-1 rounded-md"
                      value={vessel.ice_class}
                      onChange={(e) =>
                        setVessel((v) => ({
                          ...v,
                          ice_class: e.target.value,
                        }))
                      }
                    >
                      <option value="none">None</option>
                      <option value="light">Light</option>
                      <option value="medium">Medium</option>
                      <option value="heavy">Heavy</option>
                    </select>
                  </Field>
                </div>
              </Section>

              <div className="text-xs opacity-70">
                Draft and ice class may constrain channels under heavy ice.
              </div>
            </div>
          )}

          {tab === 'share' && (
            <div className="space-y-3">
              <Section title="Export">
                <div className="flex gap-2">
                  <button
                    onClick={exportGeoJSON}
                    className="px-3 py-1 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    disabled={!route}
                  >
                    Export GeoJSON
                  </button>
                  <button
                    onClick={async () => {
                      if (!map) return
                      const a = document.createElement('a')
                      a.href = map.getCanvas().toDataURL('image/png')
                      a.download = 'route_snapshot.png'
                      a.click()
                    }}
                    className="px-3 py-1 rounded-md glass"
                  >
                    Save snapshot
                  </button>
                </div>
              </Section>

              <Section title="Share link">
                <div className="flex gap-2">
                  <input
                    className="flex-1 glass px-2 py-1 rounded-md text-xs"
                    readOnly
                    value={window.location.href}
                  />
                  <button
                    onClick={copyLink}
                    className="px-3 py-1 rounded-md glass"
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </Section>

              {notes && (
                <div className="text-xs opacity-75">{notes}</div>
              )}
              {err && <div className="text-xs text-red-500">{err}</div>}
            </div>
          )}
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

      {/* Bottom-left focus button */}
      <button
        onClick={focusGreatLakes}
        className="absolute bottom-4 left-4 z-40 glass px-3 py-1 rounded-md text-sm"
        title="Focus on Great Lakes"
        aria-label="Focus on Great Lakes"
      >
        Great Lakes
      </button>

      {/* Loading overlay */}
      {isLoading && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-zinc-950/60">
          <div className="flex flex-col items-center gap-2 text-sm">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/40 border-t-transparent" />
            <span className="opacity-80">
              {!map ? 'Loading map…' : 'Computing route…'}
            </span>
          </div>
        </div>
      )}

      {/* MAP + LAYERS */}
      <MapBase cbFriendly={cbFriendly} onReady={setMap}>
        {(m) => (
          <>
            {/* Ice layer underneath */}
            {m && (
              <IceLayer
                map={m}
                product="ice_concentration"
                isoTime={ROUTE_TIME_ISO}
                paletteName={cbFriendly ? 'cb' : 'default'}
                opacity={0.9}
                legend={undefined}
              />
            )}

            {/* Route line on top */}
            {m && route && (
              <RouteLayer map={m} geojson={route} cbFriendly={cbFriendly} />
            )}
          </>
        )}
      </MapBase>
    </div>
  )
}
