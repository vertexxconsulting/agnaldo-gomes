import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Agnaldo Gomes Studio',
    short_name: 'AG Studio',
    description: 'Studio de Beleza Agnaldo Gomes — Agendamento, Academy e Loja. Mais de 30 anos transformando vidas pela beleza.',
    start_url: '/',
    id: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
    background_color: '#faf8f3',
    theme_color: '#D4AF37',
    orientation: 'any',
    lang: 'pt-BR',
    categories: ['beauty', 'lifestyle', 'shopping'],
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    shortcuts: [
      {
        name: 'Agendar',
        short_name: 'Agendar',
        description: 'Agende seu horário no Studio',
        url: '/agendamento',
        icons: [{ src: '/icon-192x192.png', sizes: '96x96' }],
      },
      {
        name: 'Loja',
        short_name: 'Loja',
        description: 'Compre produtos profissionais',
        url: '/loja',
        icons: [{ src: '/icon-192x192.png', sizes: '96x96' }],
      },
      {
        name: 'Academy',
        short_name: 'Academy',
        description: 'Cursos e treinamentos',
        url: '/academy',
        icons: [{ src: '/icon-192x192.png', sizes: '96x96' }],
      },
    ],
  };
}
