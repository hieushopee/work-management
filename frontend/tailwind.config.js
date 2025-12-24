/** @type {import('tailwindcss').Config} */
import tailwindScrollbar from 'tailwind-scrollbar';
import defaultTheme from 'tailwindcss/defaultTheme';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Montserrat', ...defaultTheme.fontFamily.sans],
        heading: ['Montserrat', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        // Primary Accent (Orange) - Use as bg-primary, text-primary, etc.
        primary: {
          DEFAULT: '#FF8C00',
          light: '#FFD8A8',
          hover: '#FF7700',
          active: '#E67300',
          50: '#FFF8F0',
          100: '#FFE5CC',
          200: '#FFCC99',
          300: '#FFB366',
          400: '#FF9933',
          500: '#FF8C00',
          600: '#E67300',
          700: '#CC6600',
          800: '#B35900',
          900: '#994D00',
        },
        // Background Colors - Use as bg-bg-main
        'bg-main': '#FFFFFF',
        'bg-secondary': '#F9FAFB',
        'bg-hover': '#F3F4F6',
        'bg-active': '#E5E7EB',
        // Text Colors - Use as text-text-main
        'text-main': '#1F2937',
        'text-secondary': '#6B7280',
        'text-muted': '#9CA3AF',
        'text-inverse': '#FFFFFF',
        // Border Colors - Use as border-border-light
        'border-light': '#E5E7EB',
        'border-medium': '#D1D5DB',
        'border-dark': '#9CA3AF',
      },
      boxShadow: {
        'soft': '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        'soft-md': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'soft-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.03)',
        'soft-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)',
      },
    },
  },
  plugins: [
    tailwindScrollbar,
  ],
}
