/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // NEXOVA Design System - Dark Green Palette
        primary: {
          50:  '#f0faf4',
          100: '#dcf2e6',
          200: '#bbe5cf',
          300: '#8cd1b0',
          400: '#56b58a',
          500: '#40916c',
          600: '#2d6a4f',  // sidebar bg
          700: '#1b4332',  // sidebar dark
          800: '#163828',
          900: '#0f2d1e',
        },
        sidebar: '#2D6A4F',
        sidebarDark: '#1B4332',
        sidebarLight: '#40916C',
        surface: '#F5F5F5',
        card: '#FFFFFF',
        alert: '#E63946',
        alertLight: '#FFF5F5',
        success: '#52B788',
        warning: '#F4A261',
        info: '#457B9D',
        border: '#E5E7EB',
        muted: '#6B7280',
        text: {
          primary: '#1B1B1B',
          secondary: '#6B7280',
          inverse: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.12)',
        sidebar: '2px 0 8px rgba(0,0,0,0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}
