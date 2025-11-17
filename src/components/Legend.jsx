// /src/components/Legend.jsx
export default function Legend({ legend }) {
  if (!legend) return null
  const { breaks = [], colors = [], labels = [] } = legend

  return (
    <div className="glass rounded-xl p-3 text-sm">
      <div className="font-semibold mb-2">Legend</div>
      <div className="flex items-center gap-2">
        {colors.map((c, i) => (
          <div key={i} className="flex flex-col items-center">
            <div className="w-6 h-3 rounded-sm" style={{ background: c }} />
            <div className="text-[10px] opacity-75">{labels[i] ?? breaks[i] ?? ''}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
