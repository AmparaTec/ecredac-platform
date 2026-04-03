/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        brand: {
          50: '#eef7ff',
          100: '#d9edff',
          200: '#bce0ff',
          300: '#8eccff',
          400: '#59b0ff',
          500: '#338dff',
          600: '#1a6ff5',
          700: '#1359e1',
          800: '#1648b6',
          900: '#183f8f',
          950: '#132857',
        },
        accent: {
          50: '#fdf4ff',
          100: '#fbe8ff',
          200: '#f6d0fe',
          300: '#efabfc',
          400: '#e478f9',
          500: '#d546f0',
          600: '#b926d3',
          700: '#9c1caf',
          800: '#811990',
          900: '#6b1a76',
        },
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
}
