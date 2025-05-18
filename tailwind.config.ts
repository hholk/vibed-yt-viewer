import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: 'hsl(var(--brand-hue) var(--brand-saturation) var(--brand-lightness))',
      },
      fontSize: {
        'fluid-base': 'var(--font-size-fluid-base)',
      },
      // Design tokens will be added here for Task 2
    },
  },
  plugins: [
    // require('tailwindcss-animate') // shadcn/ui might need this, or it's handled by tw-animate-css in globals.css
  ],
};
export default config;
