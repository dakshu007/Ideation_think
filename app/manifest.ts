import type { MetadataRoute } from 'next';

// Lets users "Add to Home Screen" so TestLoop opens like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TestLoop',
    short_name: 'TestLoop',
    description: 'Get your 12 Google Play testers by swapping tests with real developers.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#F7F7F2',
    theme_color: '#0E7A5A',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
