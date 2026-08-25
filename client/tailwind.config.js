/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        risk: {
          ontrack: "#16a34a",
          atrisk: "#d97706",
          overdue: "#dc2626",
          unknown: "#6b7280",
        },
      },
    },
  },
  plugins: [],
};
