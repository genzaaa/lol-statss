/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink:     'rgb(var(--color-ink) / <alpha-value>)',
        panel:   'rgb(var(--color-panel) / <alpha-value>)',
        panel2:  'rgb(var(--color-panel2) / <alpha-value>)',
        line:    'rgb(var(--color-line) / <alpha-value>)',
        accent:  'rgb(var(--color-accent) / <alpha-value>)',
        accent2: 'rgb(var(--color-accent2) / <alpha-value>)',
        win:     'rgb(var(--color-win) / <alpha-value>)',
        loss:    'rgb(var(--color-loss) / <alpha-value>)',
      },
      fontFamily: {
        display: ['Beaufort', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
