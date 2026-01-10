
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
        // Fintech Palette Refined
        primary: { 
          light: '#F8FAFC', // Slate 50 (Soft Background)
          dark: '#020617'   // Slate 950 (Deep Background)
        }, 
        surface: {
          light: '#FFFFFF', // Pure White (Cards)
          dark: '#0F172A'   // Slate 900 (Dark Cards)
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
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)', // Soft shadow
        'card-dark': '0 0 0 1px rgba(255,255,255,0.05), 0 4px 6px -1px rgba(0, 0, 0, 0.3)',
      }
    }
  },
  plugins: [],
}
