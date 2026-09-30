import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Margin Monitor',
    short_name: 'Margin Monitor',
    description: 'Billing & finance platform: projections, billing and margins in one place.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#0b0e1a',
    theme_color: '#0b0e1a',
    categories: ['finance', 'business', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Add Projection', url: '/dashboard/projections/add', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Convert to Billing', url: '/dashboard/billing/convert', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Finance', url: '/dashboard/finance', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
