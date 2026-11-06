/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        fintech: {
          bg: '#f8fafc',             // Light, refined off-white page background
          card: '#ffffff',           // Pure white card surfaces
          border: '#e2e8f0',         // Hairline 1px border (slate-200)
          borderStrong: '#cbd5e1',   // Defined separator border (slate-300)
          ink: '#0f172a',            // Deep slate-900 for high-contrast legible headings
          body: '#334155',           // Slate-700 for 7:1 readable body copy
          muted: '#64748b',          // Slate-500 for meta labels and dates
          primary: '#1d4ed8',        // Cobalt / Royal Sapphire Blue
          primaryHover: '#1e40af',   // Deep Blue on hover
          primaryLight: '#eff6ff',   // Soft blue tint
          primaryBorder: '#bfdbfe',
          itc: '#059669',            // Emerald (Input Tax Credit)
          itcLight: '#ecfdf5',
          itcBorder: '#a7f3d0',
          liability: '#d97706',      // Amber (Tax payable / Action)
          liabilityLight: '#fffbeb',
          liabilityBorder: '#fde68a',
          danger: '#dc2626',         // Rose (Errors / Overdue)
          dangerLight: '#fff1f2',
          dangerBorder: '#fecdd3',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'Menlo', 'monospace'],
        serif: ['"Cormorant Garamond"', '"Newsreader"', 'Georgia', 'serif'],
        display: ['"Newsreader"', '"Cormorant Garamond"', 'Georgia', 'serif'],
      },
      boxShadow: {
        'taste': '0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.04)',
        'taste-hover': '0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
        'taste-card': '0 0 0 1px rgba(15, 23, 42, 0.06), 0 1px 2px 0 rgba(15, 23, 42, 0.04)',
      },
      screens: {
        'xs': '390px',
      }
    },
  },
  plugins: [],
}
