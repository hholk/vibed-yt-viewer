import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'YouTube Video Viewer',
    short_name: 'YT Viewer',
    description: 'View and curate your favorite YouTube videos',
    start_url: '/',
    display: 'standalone',
    background_color: '#121212',
    theme_color: '#1E1E1E',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/vercel.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
      },
      {
        src: '/vercel.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
      },
    ],
    categories: ['productivity', 'utilities', 'entertainment'],
  };
}

