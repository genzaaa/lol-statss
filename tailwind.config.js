/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0b0f1a',
        panel: '#131826',
        panel2: '#1a2033',
        line: '#232b42',
        accent: '#c89b3c',
        accent2: '#f0e6d2',
        win: '#28c76f',
        loss: '#ea5455',
      },
      fontFamily: {
        display: ['Beaufort', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
