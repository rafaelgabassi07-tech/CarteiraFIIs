
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
        // Fintech Palette Refined (Solid Grays/Zinc)
        primary: { 
          light: '#F4F4F5', // Zinc 100 (Solid Light Gray)
          dark: '#09090b'   // Zinc 950 (Solid Dark Gray)
        }, 
        surface: {
          light: '#FFFFFF', // Pure White
          dark: '#18181b'   // Zinc 900 (Solid Card)
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
        'card': '0 1px 2px 0 rgba(0, 0, 0, 0.05)', // Minimal solid shadow
        'card-dark': '0 0 0 1px #27272a', // Zinc 800 border instead of shadow
      }
    }
  },
  plugins: [],
}
