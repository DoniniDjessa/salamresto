import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Marmite d'Or",
    short_name: "Marmite d'Or",
    description: "Système de gestion de restaurant – commandes, cuisine, livraisons",
    start_url: '/',
    display: 'standalone',
    orientation: 'landscape',
    background_color: '#F8F8F8',
    theme_color: '#F97316',
    icons: [
      { src: '/icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'maskable' },
      { src: '/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
    ],
    categories: ['business', 'food'],
    shortcuts: [
      { name: 'Caisse (POS)', url: '/pos',      icons: [{ src: '/icon-192.svg', sizes: '192x192' }] },
      { name: 'Cuisine',      url: '/kitchen',  icons: [{ src: '/icon-192.svg', sizes: '192x192' }] },
      { name: 'Livraisons',   url: '/delivery', icons: [{ src: '/icon-192.svg', sizes: '192x192' }] },
    ],
  };
}
