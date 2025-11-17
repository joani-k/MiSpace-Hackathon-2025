// /src/pages/AlertsMap.jsx
import { useCallback, useEffect, useMemo, useState } from 'react'
import MapBase from '../components/Map/MapBase.jsx'

/* Great Lakes bounds */
const GL_BOUNDS = [[-93.5, 40.0], [-74.0, 49.5]]

/* URL param presets from navbar */
const KIND_KEYWORDS = {
  temperature: ['temperature', 'cold', 'heat', 'freeze', 'freez', 'frost', 'wind chill', 'extreme cold'],
  wind_chill: ['wind chill'],
  freeze_warning: ['freeze', 'hard freeze', 'frost'],
  extreme_cold: ['extreme cold', 'dangerous cold', 'life threatening cold'],
}

/* bbox helper */
function featureBBox(geom) {
  if (!geom) return null
  const push = (x, y, b) => { b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y) }
  const walk = (g, b) => {
    const { type, coordinates } = g
    if (!coordinates) return
    if (type === 'Point') push(coordinates[0], coordinates[1], b)
    else if (type === 'MultiPoint' || type === 'LineString') for (const c of coordinates) push(c[0], c[1], b)
    else if (type === 'Polygon' || type === 'MultiLineString') for (const ring of coordinates) for (const c of ring) push(c[0], c[1], b)
    else if (type === 'MultiPolygon') for (const poly of coordinates) for (const ring of poly) for (const c of ring) push(c[0], c[1], b)
    else if (type === 'GeometryCollection') for (const gg of g.geometries || []) walk(gg, b)
  }
  const b = [Infinity, Infinity, -Infinity, -Infinity]
  walk(geom, b)
  return b[0] === Infinity ? null : [[b[0], b[1]], [b[2], b[3]]]
}

/* normalize helpers */
function sevRank(sev) {
  const s = String(sev || '').toLowerCase()
  if (s === 'extreme') return 4
  if (s === 'severe')  return 3
  if (s === 'moderate')return 2
  if (s === 'minor')   return 1
  return 0
}
function tagFromEvent(ev) {
  const e = String(ev || '').toLowerCase()
  if (e.includes('marine') || e.includes('gale') || e.includes('small craft') || e.includes('spray')) return 'marine'
  if (e.includes('flood')) return 'flood'
  if (e.includes('wind') || e.includes('storm')) return 'wind'
  if (e.includes('snow') || e.includes('blizzard') || e.includes('winter') || e.includes('ice') || e.includes('freez') || e.includes('cold')) return 'winter'
  return 'other'
}
function colorForSev(r) {
  if (r >= 4) return '#ef4444'
  if (r === 3) return '#f97316'
  if (r === 2) return '#f59e0b'
  if (r === 1) return '#eab308'
  return '#64748b'
}
const TAG_META = {
  winter: { label: 'winter', emoji: '❄️', color: 'bg-sky-500/20 text-sky-300' },
  wind:   { label: 'wind',   emoji: '🌬️', color: 'bg-indigo-500/20 text-indigo-300' },
  marine: { label: 'marine', emoji: '🚤',  color: 'bg-teal-500/20 text-teal-300' },
  flood:  { label: 'flood',  emoji: '🌊',  color: 'bg-cyan-500/20 text-cyan-300' },
  other:  { label: 'other',  emoji: '⚠️',  color: 'bg-zinc-500/20 text-zinc-300' },
}

/* ECCC feed base */
const ECCC_URL =
  'https://geo.weather.gc.ca/geomet/features/collections/alerts/items?f=json&lang=en&limit=500&bbox=-93.5,40,-74,49.5'

/* ---------- DEMO TEST ALERTS (synthetic) ---------- */
const DEMO_EVENTS = [
  { event: 'DEMO: Extreme Cold Warning',   sev: 'Extreme' , tagHint: 'winter' },
  { event: 'DEMO: Wind Chill Advisory',    sev: 'Moderate', tagHint: 'winter' },
  { event: 'DEMO: Gale Warning',           sev: 'Severe'  , tagHint: 'marine' },
  { event: 'DEMO: Lakeshore Flood Watch',  sev: 'Moderate', tagHint: 'flood'  },
  { event: 'DEMO: High Wind Warning',      sev: 'Severe'  , tagHint: 'wind'   },
]
function rand(min, max) { return Math.random() * (max - min) + min }
function randInt(min, max) { return Math.floor(rand(min, max + 1)) }
function randomLonLatWithin(bounds) {
  const [[x0, y0], [x1, y1]] = bounds
  return [rand(x0, x1), rand(y0, y1)]
}
function rectAround([lon, lat], dx = 0.4, dy = 0.25) {
  return [[
    [lon - dx, lat - dy],
    [lon + dx, lat - dy],
    [lon + dx, lat + dy],
    [lon - dx, lat + dy],
    [lon - dx, lat - dy],
  ]]
}
function makeDemoAlerts(count = 10) {
  const out = []
  const now = Date.now()
  for (let i = 0; i < count; i++) {
    const center = randomLonLatWithin(GL_BOUNDS)
    const pick   = DEMO_EVENTS[randInt(0, DEMO_EVENTS.length - 1)]
    const sev    = pick.sev
    const id     = `demo-${now}-${i}`
    const poly = i % 2 === 0
    const geometry = poly
      ? { type: 'Polygon', coordinates: rectAround(center, rand(0.15, 0.5), rand(0.1, 0.35)) }
      : { type: 'Point', coordinates: center }
    out.push({
      type: 'Feature',
      geometry,
      properties: {
        _src: 'DEMO',
        _status: 'test',
        _sev: sevRank(sev),
        _tag: pick.tagHint,
        id,
        url: null,
        event: pick.event,
        headline: 'Demo data seeded locally to showcase UI behavior.',
        severity: sev,
        area: 'Great Lakes (demo)',
        effective: new Date(now).toISOString(),
        expires: new Date(now + 3 * 3600 * 1000).toISOString(),
        sender: 'Local Demo',
      }
    })
  }
  return out
}
/* -------------------------------------------------- */

export default function AlertsMap() {
  const [map, setMap] = useState(null)
  const [styleReady, setStyleReady] = useState(false)

  const [alerts, setAlerts] = useState([])
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [leftOpen, setLeftOpen] = useState(() => localStorage.getItem('alertsLeftOpen') !== '0')

  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ marine: true, winter: true, wind: true, flood: true, other: true })
  const [minSev, setMinSev] = useState(0)
  const [opacity, setOpacity] = useState(0.22)
  const [includeTests, setIncludeTests] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)

  /* small top-right detail box */
  const [selected, setSelected] = useState(null) // stores the clicked Feature

  /* URL params */
  const [kindParam, setKindParam] = useState(null)
  const [bboxParam, setBboxParam] = useState(null)
  useEffect(() => {
    const u = new URL(window.location.href)
    const kind = u.searchParams.get('kind')
    const bbox = u.searchParams.get('bbox')
    if (kind && KIND_KEYWORDS[kind]) setKindParam(kind)
    if (bbox) {
      const parts = bbox.split(',').map(Number)
      if (parts.length === 4 && parts.every(n => !isNaN(n))) {
        setBboxParam([[parts[0], parts[1]], [parts[2], parts[3]]])
      }
    }
  }, [])

  const kindFilter = useMemo(() => {
    if (!kindParam) return null
    const kws = KIND_KEYWORDS[kindParam].map(s => s.toLowerCase())
    return (p) => {
      const hay = `${p.event || ''} ${p.headline || ''}`.toLowerCase()
      return kws.some(k => hay.includes(k))
    }
  }, [kindParam])

  /* fetch + optionally inject demo tests */
  const load = useCallback(async (opts = { seedDemo: false }) => {
    setBusy(true); setErr('')
    const ctlUS = new AbortController()
    const ctlCA = new AbortController()
    try {
      const AREA = 'MI,WI,IL,IN,OH,PA,NY,MN'
      const usActualP = fetch(
        `https://api.weather.gov/alerts/active?message_type=alert&area=${AREA}&limit=500`,
        { signal: ctlUS.signal, headers: { 'Accept': 'application/geo+json' } }
      ).then(r => r.json()).catch(() => ({ features: [] }))
      const usTestsP = includeTests
        ? fetch(
            `https://api.weather.gov/alerts?status=test&message_type=alert&active=1&limit=500`,
            { signal: ctlUS.signal, headers: { 'Accept': 'application/geo+json' } }
          ).then(r => r.json()).catch(() => ({ features: [] }))
        : Promise.resolve({ features: [] })
      const caP = fetch(ECCC_URL, { signal: ctlCA.signal }).then(r => r.json()).catch(() => ({ features: [] }))
      const [usActual, usTests, ca] = await Promise.all([usActualP, usTestsP, caP])

      const normalizeUS = (coll) => (coll.features || []).map(f => {
        const p = f.properties || {}
        return {
          type: 'Feature',
          geometry: f.geometry || null,
          properties: {
            _src: 'NWS',
            _sev: sevRank(p.severity),
            _tag: tagFromEvent(p.event),
            _status: String(p.status || ''),
            id: p.id || f.id,
            url: p.id || p['@id'] || null,
            event: p.event,
            headline: p.headline || p.description?.slice(0, 140),
            severity: p.severity,
            area: p.areaDesc,
            effective: p.effective,
            expires: p.ends || p.expires,
            sender: p.senderName
          }
        }
      })
      const normalizeCA = (coll) => (coll.features || []).map(f => {
        const p = f.properties || {}
        const event = p.cap_event || p.event || p.title || p.headline
        const sev = p.cap_severity || p.severity
        const link = p.cap_id || p.id || p.link
        const status = p.cap_status || p.status || ''
        return {
          type: 'Feature',
          geometry: f.geometry || null,
          properties: {
            _src: 'ECCC',
            _sev: sevRank(sev),
            _tag: tagFromEvent(event),
            _status: String(status),
            id: link || f.id,
            url: link || null,
            event,
            headline: p.headline || p.cap_headline || p.cap_title || '',
            severity: sev,
            area: p.cap_areaDesc || p.areaDesc || p.cap_geo || '',
            effective: p.cap_effective || p.effective || p.sent,
            expires: p.cap_expires || p.expires,
            sender: p.sender || 'ECCC'
          }
        }
      })

      const inGL = (feat) => {
        const bb = featureBBox(feat.geometry)
        if (!bb) return true
        const [[minx, miny], [maxx, maxy]] = bb
        const [[gx0, gy0], [gx1, gy1]] = GL_BOUNDS
        return !(maxx < gx0 || minx > gx1 || maxy < gy0 || miny > gy1)
      }

      const mergedBase = [
        ...normalizeUS(usActual),
        ...normalizeUS(usTests),
        ...normalizeCA(ca),
      ].filter(inGL)

      const demos = includeTests && (opts.seedDemo || true) ? makeDemoAlerts(12) : []

      const byId = new Map()
      for (const f of [...mergedBase, ...demos]) {
        const id = f?.properties?.id || `anon-${Math.random()}`
        if (!byId.has(id)) byId.set(id, f)
      }
      const merged = Array.from(byId.values())

      setAlerts(merged)
      setLastUpdated(new Date().toISOString())
    } catch {
      setErr('Failed to load alerts.')
    } finally {
      setBusy(false)
    }
    return () => { ctlUS.abort(); ctlCA.abort() }
  }, [includeTests])

  useEffect(() => {
    load()
    const id = setInterval(() => load(), 4 * 60 * 1000)
    return () => clearInterval(id)
  }, [load])

  useEffect(() => {
    localStorage.setItem('alertsLeftOpen', leftOpen ? '1' : '0')
  }, [leftOpen])

  /* map setup */
  const [setupDone, setSetupDone] = useState(false)
  useEffect(() => {
    if (!map || setupDone) return
    const onLoad = () => {
      setStyleReady(true)
      const targetBounds = bboxParam || GL_BOUNDS
      map.fitBounds(targetBounds, { padding: 40, duration: 0 })

      if (!map.getSource('alerts_src')) {
        map.addSource('alerts_src', {
          type: 'geojson',
          promoteId: 'id',
          data: { type: 'FeatureCollection', features: [] }
        })

        const ribbon = document.createElement('div')
        ribbon.className = 'pointer-events-none absolute left-0 right-0 top-0 h-1.5 z-[1] bg-gradient-to-r from-sky-500/60 via-emerald-500/60 to-fuchsia-500/60'
        map.getContainer().appendChild(ribbon)

        map.addLayer({
          id: 'alerts-fill',
          type: 'fill',
          source: 'alerts_src',
          filter: ['==', ['geometry-type'], 'Polygon'],
          paint: {
            'fill-color': [
              'case',
              ['>=', ['get', '_sev'], 4], '#ef4444',
              ['>=', ['get', '_sev'], 3], '#f97316',
              ['>=', ['get', '_sev'], 2], '#f59e0b',
              ['>=', ['get', '_sev'], 1], '#eab308',
              '#64748b'
            ],
            'fill-opacity': 0.22
          }
        })
        map.addLayer({
          id: 'alerts-line',
          type: 'line',
          source: 'alerts_src',
          filter: ['any', ['==', ['geometry-type'], 'Polygon'], ['==', ['geometry-type'], 'LineString']],
          paint: {
            'line-color': [
              'case',
              ['>=', ['get', '_sev'], 4], '#ef4444',
              ['>=', ['get', '_sev'], 3], '#f97316',
              ['>=', ['get', '_sev'], 2], '#f59e0b',
              ['>=', ['get', '_sev'], 1], '#eab308',
              '#94a3b8'
            ],
            'line-opacity': 0.8,
            'line-width': 1.2
          }
        })
        map.addLayer({
          id: 'alerts-pts',
          type: 'circle',
          source: 'alerts_src',
          filter: ['==', ['geometry-type'], 'Point'],
          paint: {
            'circle-radius': ['case', ['>=', ['get', '_sev'], 4], 6.5, ['>=', ['get', '_sev'], 3], 6, 5],
            'circle-color': [
              'case',
              ['>=', ['get', '_sev'], 4], '#ef4444',
              ['>=', ['get', '_sev'], 3], '#f97316',
              ['>=', ['get', '_sev'], 2], '#f59e0b',
              ['>=', ['get', '_sev'], 1], '#eab308',
              '#64748b'
            ],
            'circle-opacity': 0.95,
            'circle-stroke-color': '#0b1220',
            'circle-stroke-width': 1.2
          }
        })

        /* map click -> open small details box (no popup) */
        const clickHandler = (e) => {
          const fs = map.queryRenderedFeatures(e.point, { layers: ['alerts-fill', 'alerts-line', 'alerts-pts'] })
          const f = fs[0]; if (!f) return
          setSelected(f)
        }
        map.on('click', 'alerts-fill', clickHandler)
        map.on('click', 'alerts-line', clickHandler)
        map.on('click', 'alerts-pts',  clickHandler)
      }
      setSetupDone(true)
    }

    if (map.isStyleLoaded()) onLoad()
    else map.once('load', onLoad)
  }, [map, setupDone, bboxParam])

  /* Update fill opacity live */
  useEffect(() => {
    if (!map || !styleReady) return
    if (map.getLayer('alerts-fill')) map.setPaintProperty('alerts-fill', 'fill-opacity', opacity)
  }, [map, styleReady, opacity])

  /* feed filtered data */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return alerts
      .filter(a => filters[a.properties._tag])
      .filter(a => a.properties._sev >= minSev)
      .filter(a => {
        if (kindFilter && !kindFilter(a.properties)) return false
        if (!q) return true
        const p = a.properties
        return (
          String(p.event || '').toLowerCase().includes(q) ||
          String(p.headline || '').toLowerCase().includes(q) ||
          String(p.area || '').toLowerCase().includes(q)
        )
      })
      .sort((a, b) => (b.properties._sev - a.properties._sev) || (new Date(a.properties.expires || 0) - new Date(b.properties.expires || 0)))
      .slice(0, 120)
  }, [alerts, filters, minSev, search, kindFilter])

  useEffect(() => {
    if (!map || !styleReady) return
    const src = map.getSource('alerts_src')
    if (!src) return
    src.setData({ type: 'FeatureCollection', features: filtered.filter(f => f.geometry) })
  }, [map, styleReady, filtered])

  const focusFeature = (f) => {
    const bb = featureBBox(f.geometry)
    if (bb && map) map.fitBounds(bb, { padding: 40, duration: 500 })
  }

  const countByTag = useMemo(() => {
    const c = { marine:0, winter:0, wind:0, flood:0, other:0 }
    for (const a of alerts) c[a.properties._tag] = (c[a.properties._tag]||0)+1
    return c
  }, [alerts])

  const sevLabel = ['Any','Minor','Moderate','Severe','Extreme'][minSev]

  return (
    <div className="relative h-[calc(100vh-120px)]">
      {/* left panel */}
      <aside
        className={`absolute top-4 left-4 z-40 w-[28rem] max-w-[94vw] transition-transform duration-300
        ${leftOpen ? 'translate-x-0' : '-translate-x-[calc(100%+1rem)]'}`}
        aria-hidden={!leftOpen}
      >
        <div className="rounded-xl p-0 overflow-hidden shadow-xl ring-1 ring-white/10 bg-gradient-to-br from-zinc-900/60 via-zinc-900/40 to-zinc-800/50 backdrop-blur-md">
          {/* header */}
          <div className="px-4 py-3 border-b border-white/10 bg-gradient-to-r from-sky-500/20 via-emerald-500/15 to-fuchsia-500/20">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Great Lakes Alerts</div>
              <div className="flex items-center gap-2">
                <div className="text-[11px]">
                  <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1 ${busy ? 'bg-yellow-400' : err ? 'bg-red-500' : 'bg-emerald-400'}`} />
                  {busy ? 'Loading…' : err ? 'Error' : 'Live'}
                </div>
                <button
                  className="glass px-2 py-0.5 rounded-md text-xs"
                  onClick={() => setLeftOpen(false)}
                  aria-label="Collapse"
                  title="Collapse"
                >
                  ←
                </button>
              </div>
            </div>
          </div>

          {/* controls */}
          <div className="px-4 py-3 space-y-3">
            {/* search + refresh + test toggle + demo seed */}
            <div className="flex gap-2 items-center">
              <input
                className="flex-1 glass px-3 py-2 rounded-md text-sm"
                placeholder="Search event, headline, or area"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button
                className="px-3 py-2 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-sm"
                onClick={() => load()}
                title="Refresh feeds"
              >
                Refresh
              </button>
              <button
                onClick={() => { setIncludeTests(v => !v); setTimeout(() => load({ seedDemo: true }), 0) }}
                title="Enable/disable test warnings and demo data"
                className={`px-2 py-2 rounded-md text-xs border border-white/10 ${includeTests ? 'bg-emerald-500/20 text-emerald-200' : 'glass'}`}
                aria-pressed={includeTests}
              >
                Tests {includeTests ? 'On' : 'Off'}
              </button>
              <button
                onClick={() => load({ seedDemo: true })}
                className="px-2 py-2 rounded-md text-xs glass"
                title="Seed random demo alerts"
              >
                Seed demo
              </button>
            </div>

            {/* tag filters */}
            <div className="flex flex-wrap gap-2 text-xs">
              {Object.keys(TAG_META).map(key => {
                const meta = TAG_META[key]
                const on = filters[key]
                return (
                  <button
                    key={key}
                    onClick={() => setFilters(f => ({ ...f, [key]: !f[key] }))}
                    className={`px-2 py-1 rounded-full border border-white/10 ${on ? meta.color : 'glass opacity-80'}`}
                    title={`${countByTag[key] || 0} alerts`}
                  >
                    <span className="mr-1">{meta.emoji}</span>{meta.label} ({countByTag[key] || 0})
                  </button>
                )
              })}
            </div>

            {/* severity + opacity */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="glass rounded-lg p-2 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="opacity-80">Min severity</span>
                  <span className="font-medium">{sevLabel}</span>
                </div>
                <input
                  type="range"
                  min="0" max="4" step="1"
                  value={minSev}
                  onChange={(e) => setMinSev(Number(e.target.value))}
                />
                <div className="flex justify-between opacity-70">
                  {['Any','1','2','3','4'].map((t,i)=><span key={i}>{t}</span>)}
                </div>
              </label>
              <label className="glass rounded-lg p-2 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="opacity-80">Fill opacity</span>
                  <span className="font-medium">{Math.round(opacity*100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.05" max="0.6" step="0.01"
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                />
              </label>
            </div>

            {/* list */}
            <div className="rounded-lg border border-white/10 overflow-hidden">
              <div className="px-3 py-2 text-[11px] uppercase tracking-wide bg-white/5">Active alerts</div>
              <ul className="max-h-[42vh] overflow-auto divide-y divide-white/10">
                {filtered.map((f) => {
                  const p = f.properties
                  const color = colorForSev(p._sev)
                  const meta = TAG_META[p._tag] || TAG_META.other
                  const status = String(p._status || '').toLowerCase()
                  return (
                    <li key={p.id}>
                      <button
                        className="w-full text-left py-2 px-3 hover:bg-zinc-200/40 dark:hover:bg-zinc-800/60"
                        onClick={() => { setSelected(f); focusFeature(f) }}
                        title="Open details and zoom"
                      >
                        <div className="flex items-start gap-2">
                          <span className="mt-1 h-2 w-2 rounded-full" style={{ background: color }} aria-hidden />
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">
                              {p.event || 'Alert'}
                              <span className="ml-2 text-[10px] px-1 py-0.5 rounded-full border border-white/10 opacity-90">
                                {p._src}
                              </span>
                              {status === 'test' && (
                                <span className="ml-2 text-[10px] px-1 py-0.5 rounded-full bg-purple-500/20 text-purple-200 border border-white/10">
                                  TEST
                                </span>
                              )}
                              <span className={`ml-2 text-[10px] px-1 py-0.5 rounded-full ${meta.color} border border-white/10`}>
                                {meta.emoji} {p._tag}
                              </span>
                            </div>
                            {p.headline && <div className="text-xs opacity-80 line-clamp-2">{p.headline}</div>}
                            <div className="mt-1 text-[11px] opacity-70">
                              {p.severity || 'Unknown'}{p.expires ? ` • Expires ${new Date(p.expires).toLocaleString(undefined, { hour12:false })}` : '' }
                            </div>
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
                {filtered.length === 0 && (
                  <li className="py-6 text-center text-sm opacity-70">No active alerts matching filters.</li>
                )}
              </ul>
            </div>

            <div className="text-[11px] opacity-70 flex items-center justify-between">
              <span>Sources: NWS (US), ECCC (CA){includeTests ? ' • tests: on' : ''}</span>
              <span>{lastUpdated ? `Updated ${new Date(lastUpdated).toLocaleTimeString([], { hour12:false })}` : ''}</span>
            </div>
          </div>
        </div>
      </aside>

      {!leftOpen && (
        <button
          onClick={() => setLeftOpen(true)}
          className="absolute top-4 left-0 z-40 -translate-x-1/2 glass px-2 py-2 rounded-r-xl text-xs"
          aria-label="Expand panel"
          title="Expand panel"
        >
          ➤
        </button>
      )}

      {/* Map */}
      <MapBase onReady={setMap}>
        {() => (
          <>
            {/* Legend */}
            <div className="pointer-events-none absolute bottom-4 right-4 z-30">
              <div className="pointer-events-auto glass rounded-lg p-3 text-xs min-w-[180px]">
                <div className="font-medium mb-1">Severity</div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{background:'#ef4444'}} /> Extreme</div>
                  <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{background:'#f97316'}} /> Severe</div>
                  <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{background:'#f59e0b'}} /> Moderate</div>
                  <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{background:'#eab308'}} /> Minor</div>
                  <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{background:'#64748b'}} /> Unknown</div>
                </div>
              </div>
            </div>

            {/* Top-right details box */}
            {selected && (
              <div className="absolute top-4 right-4 z-40">
                <div className="glass rounded-xl p-3 w-[22rem] max-w-[92vw] shadow-lg ring-1 ring-white/10">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: colorForSev(selected.properties._sev) }} />
                        <div className="text-sm font-semibold truncate" title={selected.properties.event || 'Alert'}>
                          {selected.properties.event || 'Alert'}
                        </div>
                        <span className="text-[10px] px-1 py-0.5 rounded border border-white/10">
                          {selected.properties._src}
                        </span>
                        {String(selected.properties._status || '').toLowerCase() === 'test' && (
                          <span className="text-[10px] px-1 py-0.5 rounded bg-purple-500/20 text-purple-200 border border-white/10">
                            TEST
                          </span>
                        )}
                      </div>
                      {selected.properties.headline && (
                        <div className="mt-1 text-xs opacity-80 line-clamp-3">{selected.properties.headline}</div>
                      )}
                    </div>
                    <button
                      className="glass px-2 py-1 rounded-md text-xs shrink-0"
                      onClick={() => setSelected(null)}
                      aria-label="Close details"
                      title="Close"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="mt-2 text-[11px] opacity-80 space-y-1">
                    <div><span className="opacity-70">Severity:</span> {selected.properties.severity || 'Unknown'}</div>
                    {selected.properties.expires && (
                      <div><span className="opacity-70">Expires:</span> {new Date(selected.properties.expires).toLocaleString([], { hour12:false })}</div>
                    )}
                    {selected.properties.area && (
                      <div className="line-clamp-2"><span className="opacity-70">Area:</span> {selected.properties.area}</div>
                    )}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      className="px-2 py-1 rounded-md text-xs bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      onClick={() => focusFeature(selected)}
                    >
                      Zoom
                    </button>
                    {selected.properties.url && (
                      <a
                        href={selected.properties.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 rounded-md text-xs glass underline"
                      >
                        View source
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </MapBase>
    </div>
  )
}
