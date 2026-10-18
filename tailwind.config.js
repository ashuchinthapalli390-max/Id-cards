/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#070707',
        card: '#0C0C0C',
        secondaryDark: '#141414',
        crimson: '#D90429',
        brightRed: '#FF1E3C',
        deepRed: '#63000F',
        white: '#F7F7F7',
        secondaryText: '#A5A5A5',
        mutedText: '#666666',
        borderMuted: 'rgba(217, 4, 41, 0.2)',
        borderBright: 'rgba(255, 30, 60, 0.55)',
        success: '#10B981',
        surface: {
          DEFAULT: '#0C0C0C',
          subtle: '#141414',
          border: 'rgba(217, 4, 41, 0.2)',
          hover: '#1b0609',
        },
        codexa: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#FF1E3C',
          600: '#D90429',
          700: '#b90322',
          800: '#99021b',
          900: '#63000F',
          950: '#350007',
        },
      },
      fontFamily: {
        heading: ['Orbitron', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        body: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glow-red': '0 0 25px rgba(255, 30, 60, 0.35)',
        'glow-red-sm': '0 0 14px rgba(255, 30, 60, 0.25)',
        'glow-crimson': '0 0 20px rgba(217, 4, 41, 0.4)',
        'cyber-card': '0 12px 35px -5px rgba(217, 4, 41, 0.25), 0 0 20px rgba(255, 30, 60, 0.15)',
      },
      borderRadius: {
        card: '1.25rem',
        btn: '0.625rem',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-dot': 'pulse-dot 1.8s infinite',
      },
      keyframes: {
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.4', transform: 'scale(0.85)' },
        },
      },
    },
  },
  plugins: [],
};
