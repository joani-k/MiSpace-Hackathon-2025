// /src/components/ColorBlindToggle.jsx
export default function ColorBlindToggle({ value, onChange }) {
  return (
    <button
      type="button"
      className="glass px-3 py-1 rounded-md text-sm"
      onClick={() => onChange(!value)}
      aria-pressed={value}
      title="Toggle color-blind palette"
    >
      {value ? 'CB-Off' : 'CB-On'}
    </button>
  )
}
