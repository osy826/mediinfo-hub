/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1a73e8',
        secondary: '#34a853',
        surface: '#ffffff',
        background: '#f8f9fa',
      }
    },
  },
  plugins: [],
}