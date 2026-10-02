/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        elevated: token('elevated'),
        fg: token('fg'),
        muted: token('muted'),
        accent: token('accent'),
        ion: token('ion'),
        mint: token('mint'),
        coral: token('coral'),
        lilac: token('lilac'),
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        soft: '0 1px 0 0 rgb(255 255 255 / 0.04) inset, 0 24px 48px -28px rgb(0 0 0 / 0.45)',
        glow: '0 0 0 1px rgb(var(--accent) / 0.35), 0 12px 40px -10px rgb(var(--accent) / 0.55)',
      },
      keyframes: {
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        ping2: { '75%, 100%': { transform: 'scale(2.2)', opacity: '0' } },
      },
      animation: {
        'spin-slow': 'spin-slow 18s linear infinite',
        'spin-slower': 'spin-slow 32s linear infinite reverse',
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 2.4s linear infinite',
        ping2: 'ping2 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
    },
  },
  plugins: [],
};
