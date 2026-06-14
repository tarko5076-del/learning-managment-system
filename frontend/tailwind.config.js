/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1e1b4b",
        line: "#e2e8f0",
        mint: "#4f20f0",
        coral: "#45c3b8",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        header: ["'Plus Jakarta Sans'", "sans-serif"],
      },
    },
  },
  plugins: [],
};
