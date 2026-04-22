import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          950: '#0a0a0f',
          900: '#0f0f1a',
          800: '#16161f',
          700: '#1e1e2e',
          600: '#27273a',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
