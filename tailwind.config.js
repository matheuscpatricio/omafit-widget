/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#810707',
          50: '#fdf2f2',
          100: '#fbe2e2',
          200: '#f7c9c9',
          300: '#f09a9a',
          400: '#e66a6a',
          500: '#c52121',
          600: '#a71414',
          700: '#810707',
          800: '#6b0505',
          900: '#4a0303',
        },
        ink: {
          DEFAULT: '#1A1A1A',
          50: '#f7f7f7',
          100: '#ededed',
          200: '#d6d6d6',
          300: '#b3b3b3',
          400: '#8a8a8a',
          500: '#5e5e5e',
          600: '#3d3d3d',
          700: '#2a2a2a',
          800: '#1A1A1A',
          900: '#0a0a0a',
        },
      },
      animation: {
        spotlight: 'spotlight 2s ease .75s 1 forwards',
        'float-slow': 'floatSlow 6s ease-in-out infinite',
        'float-medium': 'floatMedium 4s ease-in-out infinite',
        'gradient-x': 'gradientX 6s ease infinite',
        marquee: 'marquee 28s linear infinite',
        'marquee-reverse': 'marqueeReverse 28s linear infinite',
        'shimmer-bg': 'shimmerBg 5s ease-in-out infinite',
      },
      keyframes: {
        spotlight: {
          '0%': { opacity: '0', transform: 'translate(-72%, -62%) scale(0.5)' },
          '100%': { opacity: '1', transform: 'translate(-50%,-40%) scale(1)' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-16px)' },
        },
        floatMedium: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        gradientX: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        marqueeReverse: {
          '0%': { transform: 'translateX(-50%)' },
          '100%': { transform: 'translateX(0)' },
        },
        shimmerBg: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        heading: ['Inter', 'BBH Sans Bartle', 'sans-serif'],
        body: ['Inter', 'Rubik', 'sans-serif'],
        bungee: ['Bungee', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.05em',
        tighter: '-0.035em',
        tight: '-0.02em',
      },
      boxShadow: {
        'elegant': '0 1px 2px rgba(26,26,26,0.04), 0 8px 24px rgba(26,26,26,0.06)',
        'elegant-lg': '0 1px 2px rgba(26,26,26,0.04), 0 24px 60px -12px rgba(26,26,26,0.12)',
        'brand-glow': '0 10px 40px -10px rgba(129,7,7,0.45)',
      },
      backgroundImage: {
        'grid-faint': 'linear-gradient(to right, rgba(26,26,26,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(26,26,26,0.05) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
};
