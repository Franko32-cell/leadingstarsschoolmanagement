/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0a1f44",
        gold: "#c8962a",
        cream: "#faf8f3",
      },
      fontFamily: {
        display: ["Playfair Display", "serif"],
        sans: ["DM Sans", "sans-serif"],
      },
      boxShadow: {
        luxury: "0 24px 64px rgba(0,0,0,.16)",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};