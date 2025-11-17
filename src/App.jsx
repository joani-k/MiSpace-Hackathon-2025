// /src/App.jsx
import { useEffect, useState, lazy, Suspense, useCallback, useRef } from 'react'
import { Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom'
import ThemeToggle from './components/ThemeToggle.jsx'
import ColorBlindToggle from './components/ColorBlindToggle.jsx'
import { useDarkMode } from './hooks/useDarkMode.js'
import { API } from './data/api.js'

function lazyWithPreload(factory) {
  const C = lazy(factory)
  C.preload = factory
  return C
}

const IceForecast    = lazyWithPreload(() => import('./pages/IceForecast.jsx'))
const RoutePlanner   = lazyWithPreload(() => import('./pages/RoutePlanner.jsx'))
const TemperatureNow = lazyWithPreload(() => import('./pages/TemperatureNow.jsx'))
const AboutTool      = lazyWithPreload(() => import('./pages/AboutTool.jsx'))
const AlertsMap      = lazyWithPreload(() => import('./pages/AlertsMap.jsx'))

function Loading() {
  return (
    <div className="absolute inset-0 flex items-center justify-center" aria-busy="true">
      <div className="glass px-4 py-2 rounded-xl text-sm">Loading…</div>
    </div>
  )
}

function NavButton({ to, end, children, label, onClick, onHover }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `relative px-3 py-1 rounded-md text-sm transition-colors
         ${isActive
           ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
           : 'hover:bg-zinc-200 dark:hover:bg-zinc-800'}`
      }
      aria-label={label}
      onClick={onClick}
      onMouseEnter={onHover}
      onFocus={onHover}
    >
      {({ isActive }) => (
        <>
          <span>{children}</span>
          <span
            className={`absolute left-2 right-2 -bottom-1 h-0.5 rounded-full transition-opacity
            ${isActive ? 'opacity-100 bg-accent' : 'opacity-0'}`}
            aria-hidden="true"
          />
        </>
      )}
    </NavLink>
  )
}

function StatusPill({ status }) {
  const cls =
    status === 'ok'
      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
      : status === 'down'
      ? 'bg-red-500/15 text-red-600 dark:text-red-400'
      : 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400'
  const dot =
    status === 'ok' ? 'bg-emerald-500' : status === 'down' ? 'bg-red-500' : 'bg-zinc-400'
  const label = status === 'ok' ? 'API online' : status === 'down' ? 'API down' : 'Checking'
  return (
    <span className={`ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${cls}`} aria-live="polite">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  )
}

function AppShell() {
  const location = useLocation()
  const navigate  = useNavigate()
  const { dark, setDark } = useDarkMode()
  const [mobileOpen, setMobileOpen] = useState(false)

  const [cbFriendly, setCbFriendly] = useState(() => {
    const url = new URL(window.location.href)
    const q = url.searchParams.get('cb')
    if (q === '1' || q === 'true') return true
    if (q === '0' || q === 'false') return false
    return localStorage.getItem('cbFriendly') === '1'
  })

  const [demo, setDemo] = useState(() => {
    const url = new URL(window.location.href)
    const q = url.searchParams.get('demo')
    if (q === '1' || q === 'true') return true
    if (q === '0' || q === 'false') return false
    return localStorage.getItem('demo') === '1'
  })

  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light' }, [dark])
  useEffect(() => { document.documentElement.dataset.cb    = cbFriendly ? 'true' : 'false' }, [cbFriendly])
  useEffect(() => { document.documentElement.dataset.demo  = demo ? 'true' : 'false' }, [demo])

  useEffect(() => {
    localStorage.setItem('cbFriendly', cbFriendly ? '1' : '0')
    const url = new URL(window.location.href)
    url.searchParams.set('cb', cbFriendly ? '1' : '0')
    window.history.replaceState(null, '', url.toString())
  }, [cbFriendly])

  useEffect(() => {
    localStorage.setItem('demo', demo ? '1' : '0')
    const url = new URL(window.location.href)
    if (demo) url.searchParams.set('demo', '1')
    else url.searchParams.delete('demo')
    window.history.replaceState(null, '', url.toString())
    window.dispatchEvent(new CustomEvent('demo-change', { detail: { enabled: demo } }))
  }, [demo])

  const [apiStatus, setApiStatus] = useState('checking')
  useEffect(() => {
    if (demo) { setApiStatus('ok'); return }
    let alive = true
    let controller = new AbortController()
    const ping = async () => {
      try {
        setApiStatus('checking')
        controller.abort()
        controller = new AbortController()
        const r = await fetch(`${API.BASE}/v1/healthz`, { cache: 'no-store', signal: controller.signal })
        if (!alive) return
        setApiStatus(r.ok ? 'ok' : 'down')
      } catch {
        if (!alive) return
        setApiStatus('down')
      }
    }
    ping()
    const id = setInterval(ping, 15000)
    return () => { alive = false; controller.abort(); clearInterval(id) }
  }, [demo])

  useEffect(() => {
    const p = location.pathname
    document.title =
      p === '/routes' ? 'Best Route — GL Ice Ops'
      : p === '/temps' ? 'Realtime Temps — GL Ice Ops'
      : p === '/about' ? 'About — GL Ice Ops'
      : p === '/alerts' ? 'Alerts — GL Ice Ops'
      : 'Ice Forecast — GL Ice Ops'
  }, [location.pathname])

  const [cmdOpen, setCmdOpen] = useState(false)
  const onKey = useCallback((e) => {
    const t = e.target
    if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t?.isContentEditable) return
    if (e.metaKey || e.ctrlKey) {
      if (e.key.toLowerCase() === 'k') { e.preventDefault(); setCmdOpen(true); return }
    }
    if (e.altKey || e.metaKey || e.ctrlKey) return
    const k = e.key.toLowerCase()
    if (k === 'g') navigate('/')
    else if (k === 'r') navigate('/routes')
    else if (k === 'm') navigate('/temps')
    else if (k === 'l') navigate('/alerts')
    else if (k === 'a') navigate('/about')
    else if (k === 't') setDark(v => !v)
    else if (k === 'c') setCbFriendly(v => !v)
  }, [navigate, setDark, setCbFriendly])
  useEffect(() => {
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onKey])

  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  const actions = [
    { id: 'go-forecast', label: 'Go to Ice Forecast', run: () => navigate('/') },
    { id: 'go-route',    label: 'Go to Route Planner', run: () => navigate('/routes') },
    { id: 'go-temps',    label: 'Go to Realtime Temps', run: () => navigate('/temps') },
    { id: 'go-alerts',   label: 'Go to Alerts', run: () => navigate('/alerts') },
    { id: 'go-about',    label: 'Go to About', run: () => navigate('/about') },
    { id: 'toggle-theme',label: 'Toggle Theme', run: () => setDark(v => !v) },
    { id: 'toggle-cb',   label: 'Toggle Color-blind Palette', run: () => setCbFriendly(v => !v) },
  ]
  const [cmdQuery, setCmdQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const filtered = actions.filter(a => a.label.toLowerCase().includes(cmdQuery.toLowerCase()))
  const cmdInputRef = useRef(null)
  const firstBtnRef  = useRef(null)
  const lastBtnRef   = useRef(null)

  useEffect(() => {
    if (!cmdOpen) return
    setTimeout(() => cmdInputRef.current?.focus(), 0)
    const trap = (e) => {
      if (e.key !== 'Tab') return
      const first = firstBtnRef.current, last = lastBtnRef.current
      if (!first || !last) return
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    const esc = (e) => { if (e.key === 'Escape') setCmdOpen(false) }
    window.addEventListener('keydown', trap)
    window.addEventListener('keydown', esc)
    return () => { window.removeEventListener('keydown', trap); window.removeEventListener('keydown', esc) }
  }, [cmdOpen])

  const onCmdKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      filtered[cursor]?.run()
      setCmdOpen(false)
      setCmdQuery('')
      setCursor(0)
    }
  }

  useEffect(() => {
    const p = location.pathname
    if (p === '/') {
      requestIdleCallback?.(() => { RoutePlanner.preload?.(); TemperatureNow.preload?.(); AlertsMap.preload?.(); AboutTool.preload?.() })
    } else if (p === '/routes') {
      requestIdleCallback?.(() => { IceForecast.preload?.(); TemperatureNow.preload?.(); AlertsMap.preload?.(); AboutTool.preload?.() })
    } else {
      requestIdleCallback?.(() => { IceForecast.preload?.(); RoutePlanner.preload?.(); AlertsMap.preload?.() })
    }
  }, [location.pathname])

  const goAlerts = (params = {}) => {
    const u = new URL(window.location.origin + '/alerts')
    Object.entries(params).forEach(([k, v]) => { if (v != null) u.searchParams.set(k, String(v)) })
    navigate(u.pathname + u.search)
  }

  const [jsonOpen, setJsonOpen] = useState(false)
  const [jsonState, setJsonState] = useState({ loading: false, error: '', frames: null, legend: null, narrative: null })
  const loadJsonOverview = useCallback(async () => {
    setJsonState((s) => ({ ...s, loading: true, error: '' }))
    const now = new Date().toISOString()
    try {
      const [frames, legend, narrative] = await Promise.all([
        API.listFrames({ beforeHours: 12, afterHours: 12 }),
        API.legend({ product: 'ice_concentration', palette: 'default' }),
        API.narrative({ isoTime: now }),
      ])
      setJsonState({ loading: false, error: '', frames, legend, narrative })
    } catch (e) {
      setJsonState({ loading: false, error: e?.message || 'Failed to load JSON', frames: null, legend: null, narrative: null })
    }
  }, [])
  useEffect(() => { if (jsonOpen) loadJsonOverview() }, [jsonOpen, loadJsonOverview])

  const pretty = (obj) => JSON.stringify(obj, null, 2)

  return (
    <div className="min-h-screen flex flex-col">
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 glass px-3 py-1 rounded-md">
        Skip to content
      </a>

      <header className="sticky top-0 z-50 glass">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3" role="navigation" aria-label="Primary">
          <div className="flex items-center gap-3">
            <span className="font-semibold tracking-tight">GL Ice Ops</span>
            <span className="text-xs opacity-70">Forecast &amp; Routing</span>
            <StatusPill status={apiStatus} />
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <NavButton to="/" end label="Ice Forecast view" onHover={() => IceForecast.preload?.()}>Ice Forecast</NavButton>
            <NavButton to="/routes" label="Best Route view" onHover={() => RoutePlanner.preload?.()}>Best Route</NavButton>
            <NavButton to="/temps" label="Realtime Temperatures" onHover={() => TemperatureNow.preload?.()}>Temps</NavButton>
            <NavButton to="/alerts" label="Alerts map" onHover={() => AlertsMap.preload?.()}>Alerts</NavButton>
            <NavButton to="/about" label="About this tool" onHover={() => AboutTool.preload?.()}>About</NavButton>

            <button className="glass px-3 py-1 rounded-md text-sm" onClick={() => setCmdOpen(true)} title="Command palette (⌘K / Ctrl+K)">⌘K</button>
            <ColorBlindToggle value={cbFriendly} onChange={setCbFriendly} aria-label="Toggle color-blind friendly palette" />
            <ThemeToggle value={dark} onChange={setDark} aria-label="Toggle dark/light theme" />
          </div>

          <button className="sm:hidden glass px-3 py-1 rounded-md text-sm" onClick={() => setMobileOpen(v => !v)} aria-expanded={mobileOpen} aria-controls="mobile-menu">
            Menu
          </button>
        </nav>

        <div id="mobile-menu" className={`sm:hidden px-4 pb-3 overflow-hidden will-change-[max-height,opacity] ${mobileOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'} transition-all duration-300`}>
          <div className="flex flex-col gap-2">
            <NavButton to="/" end label="Ice Forecast view" onClick={() => setMobileOpen(false)} onHover={() => IceForecast.preload?.()}>Ice Forecast</NavButton>
            <NavButton to="/routes" label="Best Route view" onClick={() => setMobileOpen(false)} onHover={() => RoutePlanner.preload?.()}>Best Route</NavButton>
            <NavButton to="/temps" label="Realtime Temperatures" onClick={() => setMobileOpen(false)} onHover={() => TemperatureNow.preload?.()}>Temps</NavButton>
            <NavButton to="/alerts" label="Alerts map" onClick={() => setMobileOpen(false)} onHover={() => AlertsMap.preload?.()}>Alerts</NavButton>

            <div className="mt-1 glass rounded-md p-2">
              <div className="text-[11px] uppercase tracking-wide opacity-60 mb-1">Temp alerts</div>
              <div className="grid grid-cols-2 gap-1">
                <button className="glass px-2 py-1 rounded text-xs" onClick={() => { setMobileOpen(false); goAlerts({ kind: 'temperature' }) }}>All temperature</button>
                <button className="glass px-2 py-1 rounded text-xs" onClick={() => { setMobileOpen(false); goAlerts({ kind: 'wind_chill' }) }}>Wind chill</button>
                <button className="glass px-2 py-1 rounded text-xs" onClick={() => { setMobileOpen(false); goAlerts({ kind: 'freeze_warning' }) }}>Freeze warn</button>
                <button className="glass px-2 py-1 rounded text-xs" onClick={() => { setMobileOpen(false); goAlerts({ kind: 'extreme_cold' }) }}>Extreme cold</button>
              </div>
            </div>

            <NavButton to="/about" label="About this tool" onClick={() => setMobileOpen(false)} onHover={() => AboutTool.preload?.()}>About</NavButton>

            <div className="flex gap-2">
              <button className="glass px-3 py-1 rounded-md text-sm" onClick={() => setCmdOpen(true)} title="Command palette (⌘K / Ctrl+K)">⌘K</button>
              <ColorBlindToggle value={cbFriendly} onChange={setCbFriendly} />
              <ThemeToggle value={dark} onChange={setDark} />
            </div>
          </div>
        </div>
      </header>

      <main id="content" className="relative flex-1">
        <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex justify-center">
          <div className="pointer-events-auto mt-3 glass px-3 py-1 rounded-full text-[11px]">
            Shortcuts: <kbd className="px-1">G</kbd> Forecast • <kbd className="px-1">R</kbd> Route • <kbd className="px-1">M</kbd> Temps • <kbd className="px-1">L</kbd> Alerts • <kbd className="px-1">A</kbd> About • <kbd className="px-1">T</kbd> Theme • <kbd className="px-1">C</kbd> CB • <kbd className="px-1">⌘K</kbd> Commands
          </div>
        </div>

        <Suspense fallback={<Loading />}>
          <Routes location={location} key={`${location.pathname}-${cbFriendly ? 'cb' : 'norm'}`}>
            <Route path="/"        element={<IceForecast    cbFriendly={cbFriendly} demoMode={demo} />} />
            <Route path="/routes"  element={<RoutePlanner   cbFriendly={cbFriendly} demo={demo} />} />
            <Route path="/temps"   element={<TemperatureNow cbFriendly={cbFriendly} demo={demo} />} />
            <Route path="/alerts"  element={<AlertsMap      cbFriendly={cbFriendly} demo={demo} />} />
            <Route path="/about"   element={<AboutTool      cbFriendly={cbFriendly} demo={demo} />} />
          </Routes>
        </Suspense>

        <div className="sr-only" aria-live="polite">
          {location.pathname === '/routes'
            ? 'Best Route'
            : location.pathname === '/temps'
            ? 'Realtime Temperatures'
            : location.pathname === '/alerts'
            ? 'Alerts'
            : location.pathname === '/about'
            ? 'About'
            : 'Ice Forecast'}
        </div>
      </main>

      <footer className="glass">
        <div className="mx-auto max-w-7xl px-4 py-3 text-xs opacity-70 flex items-center justify-between">
          <span>Data and tiles served by your backend. UI only.</span>
          <div className="flex items-center gap-3">
            <button className="underline opacity-70 hover:opacity-100" onClick={() => setJsonOpen(true)} title="Show sample JSON returned by the backend">
              View backend JSON
            </button>
            <a
              href="https://www.color-blindness.com/coblis-color-blindness-simulator/"
              target="_blank"
              rel="noreferrer"
              className="underline opacity-70 hover:opacity-100"
            >
              Check palettes
            </a>
          </div>
        </div>
      </footer>

      {/* Command palette modal */}
      {cmdOpen && (
        <div role="dialog" aria-modal="true" aria-label="Command palette" className="fixed inset-0 z-[60] grid place-items-center p-4" onClick={() => setCmdOpen(false)}>
          <div className="absolute inset-0 bg-black/20 dark:bg-black/40" aria-hidden="true" />
          <div className="relative w-full max-w-md glass rounded-xl p-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <input
                ref={cmdInputRef}
                value={cmdQuery}
                onChange={(e) => { setCmdQuery(e.target.value); setCursor(0) }}
                onKeyDown={onCmdKey}
                placeholder="Type a command…"
                className="flex-1 glass px-3 py-2 rounded-md outline-none"
                aria-label="Command input"
              />
              <button ref={firstBtnRef} className="glass px-2 py-1 rounded-md text-xs" onClick={() => setCmdOpen(false)}>Close</button>
            </div>
            <ul className="mt-2 max-h-64 overflow-auto">
              {filtered.length === 0 && <li className="px-3 py-2 text-sm opacity-70">No results</li>}
              {filtered.map((a, i) => (
                <li key={a.id}>
                  <button
                    className={`w-full text-left px-3 py-2 rounded-md text-sm ${i === cursor ? 'bg-zinc-200 dark:bg-zinc-800' : 'hover:bg-zinc-200 dark:hover:bg-zinc-800'}`}
                    onClick={() => { a.run(); setCmdOpen(false); setCmdQuery(''); setCursor(0) }}
                  >
                    {a.label}
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex items-center justify-between text-[11px] opacity-70">
              <span>Use ↑/↓ and Enter</span>
              <button ref={lastBtnRef} className="glass px-2 py-1 rounded-md text-xs" onClick={() => setCmdOpen(false)}>Esc</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AppShell
