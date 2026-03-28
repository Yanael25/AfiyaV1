/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Sora", "sans-serif"],
      },
      colors: {
        afiya: {
          "deep":        "#064E3B",
          "primary":     "#047857",
          "mid":         "#059669",
          "light":       "#ECFDF5",
          "sand":        "#F5F0E8",
          "sand-card":   "#FFFFFF",
          "sand-border": "#E8E0D0",
          "sand-sep":    "#F0EAE0",
          "gold":        "#C47820",
          "gold-light":  "#FDF3DC",
          "ink":         "#1C1410",
          "muted":       "#7C6F5E",
        }
      }
    },
  },
  plugins: [],
}
