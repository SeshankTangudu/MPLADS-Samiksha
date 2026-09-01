/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gov: {
          navy: '#1B3A5C',
          navyDark: '#0E2338',
          navyLight: '#2C5A8A',
          amber: '#D97706',
          red: '#DC2626',
          green: '#16A34A',
          slate: '#F8FAFC',
          border: '#E2E8F0',
          muted: '#64748B'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
