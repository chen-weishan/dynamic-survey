/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  darkMode: 'class',
  corePlugins: {
    // Angular Material 有自己的 reset，Tailwind preflight 會把 mat-* 元件的
    // 邊框、字級、button 樣式打壞，必須關閉。
    preflight: false,
  },
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Noto Sans TC', 'sans-serif'],
      },
      colors: {
        // 玻璃表面用的 token，實際值由 styles.scss 的 CSS custom properties
        // 依淺色/深色模式提供，Tailwind 只負責把它們接出來。
        glass: {
          DEFAULT: 'var(--glass-bg)',
          strong: 'var(--glass-bg-strong)',
          border: 'var(--glass-border)',
          highlight: 'var(--glass-highlight)',
        },
      },
      backdropBlur: {
        glass: 'var(--glass-blur)',
      },
      boxShadow: {
        glass: 'var(--glass-shadow)',
        'glass-inset': 'inset 0 1px 0 0 var(--glass-highlight)',
      },
      borderRadius: {
        glass: '1.5rem',
      },
    },
  },
  plugins: [],
};
