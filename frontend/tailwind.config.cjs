/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0ea5e9',
        success: '#22c55e',
        danger: '#ef4444',
        warning: '#f59e0b',
        neutral: '#94a3b8',
        sidebar: '#0f172a',
        header: '#f8fafc',
        content: '#eef3f8',
      },
      boxShadow: {
        card: '0 4px 20px rgba(15, 23, 42, 0.08)',
      },
      borderRadius: {
        xl: '1rem',
        lg: '0.75rem',
      },
    },
  },
  plugins: [],
};
