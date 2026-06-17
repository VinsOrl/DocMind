/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        base: "#141210",
        surface: "#1e1b18",
        raised: "#262118",
        border: "#3a3228",
        primary: "#c9a96e",
        "primary-hover": "#d4b87a",
        "primary-muted": "#8a6f3e",
        "text-main": "#e8e0d5",
        "text-muted": "#9a8f82",
        "text-faint": "#5a5248",
        success: "#7ab87a",
        warning: "#c9a040",
        error: "#c97070",
      },
      fontFamily: {
        sans: ["'IBM Plex Sans'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      width: {
        70: "17.5rem",
      },
    },
  },
  plugins: [],
};
