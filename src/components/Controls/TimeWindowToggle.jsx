// /src/components/Controls/TimeWindowToggle.jsx
import { API } from '../../data/api.js'

export default function TimeWindowToggle({ value, onChange }) {
  const opts = [API.WINDOWS.HOURS_24, API.WINDOWS.DAYS_6]
  return (
    <div className="glass rounded-xl p-1 flex gap-1">
      {opts.map((o, i) => {
        const active = value.beforeHours === o.beforeHours && value.afterHours === o.afterHours
        return (
          <button
            key={i}
            onClick={() => onChange(o)}
            className={`px-3 py-1 rounded-lg text-sm ${active ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : ''}`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
