/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#77dcbf', // bermuda
          DEFAULT: '#14cca4', // java
          dark: '#0c7c74', // surfie-green
        },
        secondary: {
          light: '#c7e7df', // skeptic
          DEFAULT: '#5cd6b3', // downy
          dark: '#43948c', // viridian
        },
        accent: {
          light: '#68a59f', // breaker-bay
          DEFAULT: '#338981', // paradiso
          dark: '#1f8279', // elm
        },
        white: '#FFFFFF',
      },
    },
  },
  plugins: [],
} 