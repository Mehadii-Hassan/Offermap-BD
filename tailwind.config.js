/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        base: {
          DEFAULT: "#0b0812",
          alt: "#141021",
        },
        accent: {
          orange: "#ff7a18",
          pink: "#ff3d77",
          purple: "#a855f7",
        },
      },
      animation: {
        "pulse-slow": "pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        blob: "blob 14s ease-in-out infinite",
      },
      keyframes: {
        blob: {
          "0%, 100%": { transform: "translate(0,0) scale(1)" },
          "33%": { transform: "translate(40px,-40px) scale(1.1)" },
          "66%": { transform: "translate(-30px,20px) scale(0.9)" },
        },
      },
    },
  },
  plugins: [],
};