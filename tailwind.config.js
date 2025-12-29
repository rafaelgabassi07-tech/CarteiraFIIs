/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./App.tsx",
    "./index.tsx",
    "./types.ts",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./contexts/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        primary: { light: '#f8fafc', dark: '#020617' },
        secondary: { light: '#ffffff', dark: '#0f172a' },
        accent: 'rgb(var(--color-accent-rgb) / <alpha-value>)',
      },
      transitionTimingFunction: {
        'out-quint': 'var(--ease-out-quint)',
      },
      fontSize: {
        xxs: ['0.625rem', '0.75rem'],
      },
    },
  },
  plugins: [],
}