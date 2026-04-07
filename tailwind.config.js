export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Manrope", "sans-serif"],
      },
      colors: {
        afiya: {
          green:         "#047857",
          "green-dark":  "#064E3B",
          "green-mid":   "#059669",
          "green-light": "#ECFDF5",
          sand:          "#F5F0E8",
          border:        "#E8E0D0",
          sep:           "#F0EAE0",
          gold:          "#C47820",
          "gold-light":  "#FDF3DC",
          ink:           "#1C1410",
          muted:         "#7C6F5E",
          subtle:        "#A39887",
        }
      }
    }
  },
  plugins: []
}
