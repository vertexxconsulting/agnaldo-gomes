import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Agendamento - Agnaldo Gomes',
    short_name: 'Agendar',
    description: 'Agende seu horário com Agnaldo Gomes Studio.',
    start_url: '/',
    display: 'standalone',
    background_color: '#faf8f3', // bg-background do tema
    theme_color: '#D4AF37', // gold
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
