/** @type {import('tailwindcss').Config} */
export default {
  content: ["./client/src/**/*.{ts,tsx}", "./client/index.html"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#fdf8f0",
          100: "#faeedd",
          200: "#f4d9b0",
          300: "#ebbf78",
          400: "#e09f3e",
          500: "#c87f22",
          600: "#a8631a",
          700: "#92400e",
          800: "#78350f",
          900: "#451a03",
        },
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
