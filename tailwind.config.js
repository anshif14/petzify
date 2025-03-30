/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#F8F0E3',
          DEFAULT: '#8B5A2B',
          dark: '#5D3A1D',
        },
        secondary: {
          light: '#FFFFFF',
          DEFAULT: '#F5F5F5',
          dark: '#E0E0E0',
        },
      },
    },
  },
  plugins: [],
} 