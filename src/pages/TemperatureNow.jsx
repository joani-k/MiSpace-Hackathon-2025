// /src/pages/TemperatureNow.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import MapBase from '../components/Map/MapBase.jsx'
import maplibregl from 'maplibre-gl'

/* Open-Meteo endpoints */
const OM_GEOCODE = 'https://geocoding-api.open-meteo.com/v1/search'
const OM_REVERSE = 'https://geocoding-api.open-meteo.com/v1/reverse'
const OM_FORECAST = 'https://api.open-meteo.com/v1/forecast'

/* Great Lakes quick-pick presets */
const PRESETS = [
  { name: 'Detroit, MI',         lat: 42.3314, lon: -83.0458 },
  { name: 'Cleveland, OH',       lat: 41.4993, lon: -81.6954 },
  { name: 'Toledo, OH',          lat: 41.6528, lon: -83.5379 },
  { name: 'Chicago, IL',         lat: 41.8781, lon: -87.6298 },
  { name: 'Milwaukee, WI',       lat: 43.0389, lon: -87.9065 },
  { name: 'Green Bay, WI',       lat: 44.5133, lon: -88.0198 },
  { name: 'Duluth, MN',          lat: 46.7867, lon: -92.1005 },
  { name: 'Sault Ste. Marie',    lat: 46.4953, lon: -84.3453 },
  { name: 'Thunder Bay, ON',     lat: 48.3809, lon: -89.2477 },
  { name: 'Mackinac Island, MI', lat: 45.8492, lon: -84.6189 },
]

/* Sparkline mini-chart */
function Sparkline({ series, labels, unit = '°F', height = 140 }) {
  if (!series?.length || !labels?.length) return null
  const [hover, setHover] = useState(null)
  const H = height
  const W = Math.min(720, Math.max(320, series.length * 10))
  const pad = 16
  const min = Math.min(...series)
  const max = Math.max(...series)
  const span = Math.max(1e-6, max - min)
  const sx = (i) => pad + (i * (W - 2 * pad)) / Math.max(1, series.length - 1)
  const sy = (v) => pad + (H - 2 * pad) * (1 - (v - min) / span)
  const d = series.map((v, i) => `${i ? 'L' : 'M'} ${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`).join(' ')
  const area = `M ${sx(0)} ${sy(series[0])} ${series.map((v, i) => `L ${sx(i)} ${sy(v)}`).join(' ')} L ${sx(series.length - 1)} ${H - pad} L ${sx(0)} ${H - pad} Z`
  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const i = Math.round(((x - pad) / (W - 2 * pad)) * (series.length - 1))
    if (i >= 0 && i < series.length) setHover({ i, x: sx(i), y: sy(series[i]) })
  }
  return (
    <div className="w-full overflow-auto">
      <svg width={W} height={H} role="img" aria-label="Hourly temperature" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="tempFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.04" />
          </linearGradient>
        </defs>
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="currentColor" opacity="0.25" />
        <line x1={pad} y1={pad} x2={W - pad} y2={pad} stroke="currentColor" opacity="0.12" />
        <path d={area} fill="url(#tempFill)" />
        <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2" />
        {hover && (
          <>
            <line x1={hover.x} x2={hover.x} y1={pad} y2={H - pad} stroke="currentColor" opacity="0.28" />
            <circle cx={hover.x} cy={hover.y} r="3.8" fill="var(--accent)" />
          </>
        )}
      </svg>
      <div className="mt-1 text-xs opacity-80">
        {hover ? `${labels[hover.i]} • ${series[hover.i].toFixed(1)}${unit}` : `${labels[0]} → ${labels[labels.length - 1]}`}
      </div>
    </div>
  )
}

export default function TemperatureNow() {
  /* search + location state */
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [coords, setCoords] = useState({ lat: 45, lon: -85 }) /* center of GL region */
  const [place, setPlace] = useState('Great Lakes')           /* human-friendly name always shown */
  const [unit, setUnit] = useState('fahrenheit')              /* 'fahrenheit' | 'celsius' */

  /* data + status */
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [wx, setWx] = useState(null)

  /* background map */
  const [map, setMap] = useState(null)
  const markerRef = useRef(null)
  const markerPopupRef = useRef(null)

  /* initialize from URL if present */
  useEffect(() => {
    try {
      const u = new URL(window.location.href)
      const lat = parseFloat(u.searchParams.get('lat'))
      const lon = parseFloat(u.searchParams.get('lon'))
      const uu  = u.searchParams.get('u')
      if (Number.isFinite(lat) && Number.isFinite(lon)) setCoords({ lat, lon })
      if (uu === 'c') setUnit('celsius')
      if (uu === 'f') setUnit('fahrenheit')
    } catch {/* ignore */}
  }, [])

  /* map + marker wiring */
  useEffect(() => {
    if (!map) return
    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right')

    /* create or update marker */
    if (!markerRef.current) {
      markerRef.current = new maplibregl.Marker({ color: '#0ea5e9', draggable: true })
        .setLngLat([coords.lon, coords.lat])
        .addTo(map)
        .on('dragend', () => {
          const p = markerRef.current.getLngLat()
          const lat = +p.lat.toFixed(5), lon = +p.lng.toFixed(5)
          setCoords({ lat, lon })
        })
    } else {
      markerRef.current.setLngLat([coords.lon, coords.lat])
    }

    /* click to move */
    const onClick = (e) => {
      const { lng, lat } = e.lngLat
      const point = { lon: +lng.toFixed(5), lat: +lat.toFixed(5) }
      setCoords({ lat: point.lat, lon: point.lon })
      markerRef.current.setLngLat([point.lon, point.lat])
    }
    map.on('click', onClick)
    return () => map.off('click', onClick)
  }, [map, coords.lat, coords.lon])

  /* smooth pan when coords change */
  useEffect(() => {
    if (!map) return
    map.easeTo({ center: [coords.lon, coords.lat], duration: 400 })
  }, [map, coords.lat, coords.lon])

  /* geocode search (debounced + abortable) */
  const searchCtl = useRef(null)
  useEffect(() => {
    if (!query.trim()) { setSuggestions([]); return }
    if (searchCtl.current) searchCtl.current.abort()
    const ctl = new AbortController()
    searchCtl.current = ctl
    const id = setTimeout(async () => {
      try {
        const u = new URL(OM_GEOCODE)
        u.searchParams.set('name', query)
        u.searchParams.set('count', '8')
        u.searchParams.set('language', 'en')
        u.searchParams.set('format', 'json')
        const r = await fetch(u, { signal: ctl.signal })
        const j = await r.json()
        setSuggestions(
          (j?.results || []).map((x) => ({
            key: `${x.name}${x.admin1 ? `, ${x.admin1}` : ''}, ${x.country}`,
            lat: x.latitude,
            lon: x.longitude,
          }))
        )
      } catch {/* ignore */}
    }, 220)
    return () => { clearTimeout(id); ctl.abort() }
  }, [query])

  /* reverse geocode whenever coords change to SHOW current city name */
  const revCtl = useRef(null)
  useEffect(() => {
    if (revCtl.current) revCtl.current.abort()
    const ctl = new AbortController()
    revCtl.current = ctl
    ;(async () => {
      try {
        const u = new URL(OM_REVERSE)
        u.searchParams.set('latitude', String(coords.lat))
        u.searchParams.set('longitude', String(coords.lon))
        u.searchParams.set('language', 'en')
        u.searchParams.set('format', 'json')
        const r = await fetch(u, { signal: ctl.signal })
        const j = await r.json()
        const res = j?.results?.[0]
        if (res) {
          const label =
            `${res.name}${res.admin1 ? `, ${res.admin1}` : ''}` +
            `${res.country_code ? `, ${res.country_code}` : res.country ? `, ${res.country}` : ''}`
          setPlace(label)
        } else {
          setPlace(`${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`)
        }
      } catch {
        setPlace(`${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`)
      }
    })()
    return () => ctl.abort()
  }, [coords.lat, coords.lon])

  /* keep a popup over the marker showing the CITY NAME */
  useEffect(() => {
    if (!map || !markerRef.current) return
    if (!markerPopupRef.current) {
      markerPopupRef.current = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 14,
        className: 'city-label'
      })
    }
    markerPopupRef.current.setText(place)
    markerRef.current.setPopup(markerPopupRef.current)
    const popup = markerRef.current.getPopup()
    if (popup && !popup.isOpen()) {
      markerRef.current.togglePopup()
    }
  }, [map, place])

  /* weather fetch */
  const load = useCallback(async (lat, lon, u = unit) => {
    setBusy(true); setErr('')
    const ctl = new AbortController()
    try {
      const url = new URL(OM_FORECAST)
      url.searchParams.set('latitude', String(lat))
      url.searchParams.set('longitude', String(lon))
      url.searchParams.set('current', 'temperature_2m,apparent_temperature,wind_speed_10m,relative_humidity_2m')
      url.searchParams.set('hourly', 'temperature_2m,apparent_temperature')
      url.searchParams.set('temperature_unit', u)
      url.searchParams.set('forecast_days', '3')
      url.searchParams.set('timezone', 'auto')
      const r = await fetch(url, { signal: ctl.signal, cache: 'no-store' })
      if (!r.ok) throw new Error('fetch failed')
      const j = await r.json()
      setWx(j)
    } catch {
      setErr('Failed to load weather.')
    } finally {
      setBusy(false)
    }
    return () => ctl.abort()
  }, [unit])

  /* initial and refetch on unit/coords */
  useEffect(() => { load(coords.lat, coords.lon, unit) }, [coords, unit, load])

  /* auto refresh every 10 min */
  useEffect(() => {
    const id = setInterval(() => load(coords.lat, coords.lon, unit), 600000)
    return () => clearInterval(id)
  }, [coords, unit, load])

  /* device location */
  const useMyLocation = () => {
    if (!navigator.geolocation) { setErr('Geolocation not available'); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: +pos.coords.latitude, lon: +pos.coords.longitude }),
      () => setErr('Location denied')
    )
  }

  /* derived display */
  const isF = unit === 'fahrenheit'
  const curr = wx?.current
  const hourly = wx?.hourly
  const unitChar = isF ? '°F' : '°C'

  const next48 = useMemo(() => {
    if (!hourly) return null
    const n = Math.min(48, hourly.time.length)
    const times = hourly.time.slice(0, n).map((t) =>
      new Date(t).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', hour12: false })
    )
    return {
      times,
      temps: hourly.temperature_2m.slice(0, n).map(Number),
      feels: hourly.apparent_temperature.slice(0, n).map(Number),
    }
  }, [hourly])

  /* share params in URL */
  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('lat', String(coords.lat))
    url.searchParams.set('lon', String(coords.lon))
    url.searchParams.set('u', unit === 'fahrenheit' ? 'f' : 'c')
    window.history.replaceState(null, '', url.toString())
  }, [coords, unit])

  return (
    <div className="relative h-[calc(100vh-120px)]">
      {/* Background map fills page */}
      <MapBase onReady={setMap} />

      {/* Centered card */}
      <div className="absolute inset-0 z-40 grid place-items-center pointer-events-none">
        <div className="pointer-events-auto glass rounded-2xl p-4 w-[44rem] max-w-[94vw]">
          {/* Header shows CITY NAME and coordinates */}
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="font-semibold">Real-time Temperature</div>
              <div className="text-xs opacity-80">{busy ? 'Loading…' : err ? <span className="text-red-500">Error</span> : 'Live'}</div>
            </div>
            <div className="text-right text-sm">
              <div className="font-medium truncate max-w-[22rem]" title={place}>{place}</div>
              <div className="text-xs opacity-70">{coords.lat.toFixed(4)}, {coords.lon.toFixed(4)}</div>
            </div>
          </div>

          {/* Search + actions */}
          <div className="flex gap-2">
            <input
              className="flex-1 glass px-3 py-2 rounded-md"
              placeholder="Search city or port (e.g., Detroit)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search place"
            />
            <button className="glass px-3 py-2 rounded-md" onClick={useMyLocation} title="Use my location">📍</button>
            <button
              className="px-3 py-2 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              onClick={() => load(coords.lat, coords.lon)}
            >
              Refresh
            </button>
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <ul className="mt-2 max-h-40 overflow-auto rounded-md border border-white/20">
              {suggestions.map((s) => (
                <li key={`${s.key}-${s.lat}-${s.lon}`}>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                    onClick={() => { setCoords({ lat: s.lat, lon: s.lon }); setPlace(s.key); setSuggestions([]); setQuery('') }}
                  >
                    {s.key}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Preset chips */}
          <div className="mt-3 flex flex-wrap gap-2">
            {PRESETS.map(p => (
              <button
                key={p.name}
                className="chip glass px-2 py-1 rounded-md text-xs"
                onClick={() => { setCoords({ lat: p.lat, lon: p.lon }); setPlace(p.name) }}
                title={`Jump to ${p.name}`}
              >
                {p.name}
              </button>
            ))}
          </div>

          {/* Unit toggle */}
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="opacity-80">Units:</span>
            <button
              className={`px-2 py-1 rounded-md ${isF ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'glass'}`}
              onClick={() => setUnit('fahrenheit')}
            >
              °F
            </button>
            <button
              className={`px-2 py-1 rounded-md ${!isF ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'glass'}`}
              onClick={() => setUnit('celsius')}
            >
              °C
            </button>
          </div>

          {/* Current conditions */}
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            <div className="glass rounded-lg p-3">
              <div className="opacity-70 text-xs">Air</div>
              <div className="text-2xl font-semibold">
                {curr ? `${curr.temperature_2m.toFixed(1)}${unitChar}` : '—'}
              </div>
            </div>
            <div className="glass rounded-lg p-3">
              <div className="opacity-70 text-xs">Feels like</div>
              <div className="text-2xl font-semibold">
                {curr ? `${curr.apparent_temperature.toFixed(1)}${unitChar}` : '—'}
              </div>
            </div>
            <div className="glass rounded-lg p-3">
              <div className="opacity-70 text-xs">Wind</div>
              <div className="text-2xl font-semibold">
                {curr ? `${curr.wind_speed_10m.toFixed(0)} ${isF ? 'mph' : 'km/h'}` : '—'}
              </div>
            </div>
            <div className="glass rounded-lg p-3">
              <div className="opacity-70 text-xs">Humidity</div>
              <div className="text-2xl font-semibold">
                {curr?.relative_humidity_2m != null ? `${curr.relative_humidity_2m.toFixed(0)}%` : '—'}
              </div>
            </div>
          </div>

          {/* Forecast chart */}
          {next48 && (
            <div className="mt-3 glass rounded-lg p-3">
              <div className="mb-1 text-sm font-medium">Next 48 hours</div>
              <Sparkline series={next48.temps} labels={next48.times} unit={unitChar} />
            </div>
          )}

          {/* Footer */}
          <div className="mt-2 text-[11px] opacity-70 flex items-center justify-between">
            <span>
              Source: <a className="underline" href="https://open-meteo.com" target="_blank" rel="noreferrer">Open-Meteo</a> (no key)
            </span>
            <span>Tip: click or drag the pin on the map</span>
          </div>

          {/* Error */}
          {err && <div className="mt-2 text-xs text-red-500">{err}</div>}
        </div>
      </div>
    </div>
  )
}
