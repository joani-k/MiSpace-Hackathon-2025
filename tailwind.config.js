/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        glass: '0 8px 32px 0 rgba(31,38,135,0.25)',
      },
      colors: {
        accent: { DEFAULT: '#3a86ff', cb: '#2c7bb6' },
      },
    },
  },
  plugins: [],
}
