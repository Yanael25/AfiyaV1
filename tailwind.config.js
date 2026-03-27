/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        brand: {
          green:       '#047857',
          'green-mid': '#059669',
          'green-light':'#ECFDF5',
          gold:        '#D97706',
          'gold-light':'#FEF3C7',
        }
      }
    },
  },
  plugins: [],
}
