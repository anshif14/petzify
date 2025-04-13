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
      animation: {
        'fadeIn': 'fadeIn 0.5s ease-in-out',
        'fadeOut': 'fadeOut 0.5s ease-in-out',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce': 'bounce 1s infinite',
        'reveal': 'reveal 1.5s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        reveal: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
} 