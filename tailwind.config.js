export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Sora", "sans-serif"],
      },
      colors: {
        afiya: {
          green:        "#047857",
          "green-dark": "#064E3B",
          "green-light":"#ECFDF5",
          "green-mid":  "#059669",
          sand:         "#F5F0E8",
          "sand-border":"#E8E0D0",
          "sand-sep":   "#F0EAE0",
          gold:         "#C47820",
          "gold-light": "#FDF3DC",
          ink:          "#1C1410",
          muted:        "#7C6F5E",
          subtle:       "#A39887",
        }
      }
    }
  },
  plugins: []
}
