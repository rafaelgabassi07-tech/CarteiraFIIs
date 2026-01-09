
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'] },
      colors: {
        // Fintech Palette
        primary: { 
          light: '#F2F5F9', // Cool Grey Light Background
          dark: '#02040A'   // Deep Navy/Black Background
        }, 
        surface: {
          light: '#FFFFFF',
          dark: '#0B101A'   // Lighter Navy for cards
        },
        accent: 'rgb(var(--color-accent-rgb) / <alpha-value>)', 
      },
      transitionTimingFunction: {
        'out-quint': 'var(--ease-out-quint)',
      },
      fontSize: {
        xxs: ['0.625rem', '0.75rem'], 
      },
      boxShadow: {
        'glow': '0 0 20px -5px var(--color-accent)',
        'card': '0 2px 8px -2px rgba(0, 0, 0, 0.05), 0 0 1px rgba(0,0,0,0.1)',
        'card-dark': '0 4px 20px -5px rgba(0, 0, 0, 0.3), 0 0 1px rgba(255,255,255,0.1)',
      }
    }
  },
  plugins: [],
}
