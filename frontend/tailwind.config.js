/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        line: "#d8dee9",
        mint: "#0f9f8f",
        coral: "#ef6f61",
      },
    },
  },
  plugins: [],
};
