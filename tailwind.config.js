/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        'heading': ['BBH Sans Bartle', 'sans-serif'],
        'body': ['Rubik', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
