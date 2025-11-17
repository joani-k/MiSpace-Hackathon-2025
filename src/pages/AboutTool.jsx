// /src/pages/AboutTool.jsx
export default function AboutTool() {
  return (
    <div className="relative">
      {/* Decorative backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-r from-sky-500/15 via-emerald-500/15 to-fuchsia-500/15 blur-xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 right-0 h-48 w-48 rounded-full bg-emerald-400/10 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 left-10 h-40 w-40 rounded-full bg-sky-400/10 blur-2xl"
      />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-12 pb-6">
        <div className="glass rounded-2xl p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500/20 to-emerald-500/20 px-3 py-1 text-[11px]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Active prototype
              </div>
              <h1 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight">
                GL Ice Ops
              </h1>
              <p className="mt-2 text-sm md:text-base opacity-90">
                IceScope GL is an active prototype for Great Lakes ice operations. It provides
                4-day ice forecasts, advisory routing, and lake temperature outlooks in one
                interface. Built with a people-first engineering mindset at the University of
                Michigan, the tool emphasizes clarity, speed, and color-blind-safe visualization.
                Frontend: React • Vite • Tailwind • MapLibre. Backend: a Python data pipeline
                generating tiles, legends, GeoJSON, and narrative summaries for the UI.
              </p>

              {/* Quick actions */}
              <div className="mt-5 flex flex-wrap gap-2">
                <A href="/" label="Open Ice Forecast" />
                <A href="/routes" label="Open Best Route" />
                <A href="/temps" label="Open Temps" />
                <A href="/alerts" label="Open Alerts" />
              </div>
            </div>

            {/* Hackathon card */}
            <div className="w-full md:w-auto">
              <a
                href="https://devpost.com/"
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl ring-1 ring-white/10 p-4 glass hover:opacity-100"
                title="MiSpace Hackathon 2025"
              >
                <div className="text-xs opacity-80">Built for</div>
                <div className="mt-1 font-semibold">MiSpace Hackathon 2025</div>
                <div className="mt-2 text-xs opacity-75 inline-flex items-center gap-1">
                  Learn more <span aria-hidden>↗</span>
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="mx-auto max-w-6xl px-4 pb-6">
        <div className="grid gap-4 md:grid-cols-3">
          <FeatureCard
            icon="🧊"
            title="Ice Forecast"
            desc="Step frames, switch products, export snapshots. Palettes adapt for color-blind viewers."
            items={[
              'Concentration • Thickness • Type',
              'Playback with speed control',
              'Legend fetched from backend',
            ]}
          />
          <FeatureCard
            icon="🧭"
            title="Best Route"
            desc="Advisory routing with port presets and ETA at vessel speed."
            items={[
              'Start/Dest markers + swap',
              'Draft and ice class inputs',
              'GeoJSON export • shareable URLs',
            ]}
          />
          <FeatureCard
            icon="🌡️"
            title="Temps"
            desc="Realtime temperature and 48-hour outlook via Open-Meteo."
            items={[
              '°F / °C toggle',
              'Great Lakes quick-pick chips',
              'No API key required',
            ]}
          />
        </div>
      </section>

      {/* Highlight strip */}
      <section className="mx-auto max-w-6xl px-4 pb-6">
        <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-sky-500/10 via-emerald-500/10 to-fuchsia-500/10 ring-1 ring-white/10">
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat title="UI latency" value="<100 ms" foot="Local interactions" />
            <Stat title="Tile backend" value="/data/tiles/ice" foot="Server provided" />
            <Stat title="Accessibility" value="CB-friendly" foot="High-contrast palettes" />
          </div>
        </div>
      </section>

      {/* Data + API notes */}
      <section className="mx-auto max-w-6xl px-4 pb-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="glass rounded-2xl p-5">
            <h2 className="font-semibold">Acknowledgment</h2>
            <p className="mt-2 text-sm opacity-90">
              Built for <strong>MiSpace Hackathon 2025</strong>. Thanks to organizers, mentors,
              and data providers. This tool is for demonstration and research use.
            </p>
            <ul className="mt-4 text-sm list-disc pl-5 space-y-1">
              <li>Design favors clarity, speed, and accessible contrast.</li>
              <li>Routing is advisory. Validate with official notices and conditions.</li>
              <li>Backend endpoints are configurable and framework-agnostic.</li>
            </ul>
          </div>

          <div className="glass rounded-2xl p-5">
            <h2 className="font-semibold">Data Notes</h2>
            <ul className="mt-2 text-sm space-y-3">
              <li>
                Temps:{' '}
                <a className="underline" href="https://open-meteo.com" target="_blank" rel="noreferrer">
                  Open-Meteo
                </a>{' '}
                <span className="ml-2 text-xs opacity-80">current + hourly forecast</span>
              </li>
              <li>
                Legends: <Code>/data/legend</Code>
              </li>
              <li>
                Frames: <Code>/data/frames</Code>
              </li>
              <li>
                Ice tiles: <Code>/data/tiles/ice</Code>
              </li>
              <li>
                Routing: <Code>/data/route/best</Code>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Modeling approach */}
      <section className="mx-auto max-w-6xl px-4 pb-6">
        <div className="glass rounded-2xl p-5">
          <h2 className="font-semibold">
            How We Built the Ice Forecast and Routing System – Our Modeling Approach
          </h2>

          <p className="mt-3 text-sm opacity-90 leading-relaxed">
            We approached the problem like an operations team would: start from the data you can trust,
            then layer on simple, explainable models that run fast. We used 21 days of GLSEA lake-surface
            temperature NetCDF data as our training window and fit a global AR(1) model{' '}
            <Code>T_{'{'}t+1{'}'} = αT_t + β</Code> to forecast surface temperatures four days ahead.
          </p>

          <p className="mt-3 text-sm opacity-90 leading-relaxed">
            For the test period, we took the provided GLSEA initial condition, ran the AR(1) model forward,
            and applied a physics-motivated heuristic to convert near-freezing water into ice concentration,
            thickness, and coarse ice-type classes. Those gridded fields were downsampled into GeoJSON polygons
            tagged by product and forecast time, which the frontend renders into interactive layers.
          </p>

          <p className="mt-3 text-sm opacity-90 leading-relaxed">
            For routing, we combined a land mask (land = impassable) with the forecasted ice polygons to
            generate a cost grid where heavier ice means higher cost. An A* pathfinding algorithm then
            produces advisory tracks that avoid land and prefer lighter-ice corridors. The result is a
            lightweight, fully local pipeline that connects raw Great Lakes datasets to clear maps, narrative
            summaries, and routing suggestions directly in the browser.
          </p>

          <p className="mt-3 text-sm opacity-90 leading-relaxed">
            Following a people-first engineering mindset at the University of Michigan, we built the interface
            to be usable under pressure: readable layers, accessible labels, and a color-blind-friendly mode
            so analysts, operators, and students can all use IceScope GL without barriers.
          </p>
        </div>
      </section>

      {/* Keyboard shortcuts */}
      <section className="mx-auto max-w-6xl px-4 pb-6">
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Keyboard Shortcuts</h2>
            <span className="text-[11px] opacity-70">Focus a page, then use keys</span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            <KbdRow keys={['G']} label="Go to Ice Forecast" />
            <KbdRow keys={['R']} label="Go to Best Route" />
            <KbdRow keys={['M']} label="Go to Temps" />
            <KbdRow keys={['L']} label="Go to Alerts" />
            <KbdRow keys={['T']} label="Toggle Theme" />
            <KbdRow keys={['C']} label="Toggle CB Palette" />
            <KbdRow keys={['⌘', 'K']} label="Command Palette" />
            <KbdRow keys={['←', '→']} label="Prev/Next frame (Forecast)" />
          </div>
        </div>
      </section>

      {/* Credits */}
      <section className="mx-auto max-w-6xl px-4 pb-12">
        <div className="glass rounded-2xl p-5">
          <h2 className="font-semibold">Credits</h2>
          <ul className="mt-2 text-sm list-disc pl-5 space-y-1">
            <li>Map rendering: MapLibre GL JS.</li>
            <li>Weather: Open-Meteo API.</li>
            <li>UI: Tailwind with glass panels and accessible contrast.</li>
          </ul>
          <div className="mt-4 text-xs opacity-75">
            This prototype stores minimal client preferences in <code>localStorage</code> (theme, palette) and
            does not collect analytics.
          </div>
        </div>
      </section>
    </div>
  )
}

/* --- Subcomponents --- */

function A({ href, label }) {
  return (
    <a
      href={href}
      className="rounded-md px-3 py-2 text-sm ring-1 ring-white/10 glass hover:bg-white/10"
    >
      {label}
    </a>
  )
}

function Code({ children }) {
  return (
    <code className="px-1 rounded bg-black/10 dark:bg-white/10">{children}</code>
  )
}

function FeatureCard({ icon, title, desc, items = [] }) {
  return (
    <div className="group h-full rounded-2xl p-5 glass ring-1 ring-white/10">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-tr from-sky-500/20 to-emerald-500/20 text-base">
          <span aria-hidden>{icon}</span>
        </span>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="mt-2 text-sm opacity-90">{desc}</p>
      <ul className="mt-3 text-sm space-y-1">
        {items.map((t) => (
          <li key={t} className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" aria-hidden />
            <span>{t}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 h-px w-full bg-white/15" />
      <div className="mt-3 text-xs opacity-70">Accessible by design</div>
    </div>
  )
}

function Stat({ title, value, foot }) {
  return (
    <div className="rounded-xl p-4 glass ring-1 ring-white/10">
      <div className="text-xs opacity-75">{title}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs opacity-70">{foot}</div>
    </div>
  )
}

function KbdRow({ keys, label }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 glass ring-1 ring-white/10">
      <div className="text-sm opacity-90">{label}</div>
      <div className="flex items-center gap-1">
        {keys.map((k, i) => (
          <kbd key={`${k}-${i}`} className="px-2 py-1 rounded-md text-xs glass ring-1 ring-white/10">
            {k}
          </kbd>
        ))}
      </div>
    </div>
  )
}
