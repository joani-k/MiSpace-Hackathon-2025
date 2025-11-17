// /src/components/ThemeToggle.jsx
export default function ThemeToggle({ value, onChange }) {
  return (
    <button
      type="button"
      className="glass px-3 py-1 rounded-md text-sm"
      onClick={() => onChange(!value)}
      aria-pressed={value}
      title="Toggle dark/light"
    >
      {value ? 'Dark' : 'Light'}
    </button>
  )
}
