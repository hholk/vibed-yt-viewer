import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
    './src/shared/**/*.{js,ts,jsx,tsx,mdx}',
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: 'hsl(var(--brand-hue) var(--brand-saturation) var(--brand-lightness))',
      },
      fontSize: {
        'fluid-base': 'var(--font-size-fluid-base)',
      },
      fontFamily: {
        sans: ['var(--font-ibm-plex-sans)', 'sans-serif'],
        serif: ['var(--font-ibm-plex-serif)', 'serif'],
        mono: ['var(--font-ibm-plex-mono)', 'monospace'],
      },
      // Design tokens will be added here for Task 2
    },
  },
  plugins: [
    // require('tailwindcss-animate') // shadcn/ui might need this, or it's handled by tw-animate-css in globals.css
  ],
};
export default config;
