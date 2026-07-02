/** @type {import('tailwindcss').Config} */
// Tailwind only dresses the flat UI chrome (loading doodle, nav hints).
// The desk itself is all Three.js, so the content globs stay narrow.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        hand: ['"Architects Daughter"', 'cursive'],
        type: ['"Special Elite"', 'monospace'],
        mono: ['"Cutive Mono"', 'monospace'],
      },
      colors: {
        ink: '#2b2620',
        vellum: '#f4ecd8',
      },
    },
  },
  plugins: [],
}
