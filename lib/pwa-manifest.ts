export interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}

export interface ManifestShortcut {
  name: string;
  short_name: string;
  description?: string;
  url: string;
  icons?: Array<{ src: string; sizes: string }>;
}

export interface ManifestData {
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  id: string;
  scope: string;
  display: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  display_override?: string[];
  background_color: string;
  theme_color: string;
  orientation?: 'any' | 'portrait' | 'landscape';
  lang?: string;
  categories?: string[];
  icons: ManifestIcon[];
  shortcuts?: ManifestShortcut[];
}

const defaultIcons: ManifestIcon[] = [
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
];

/**
 * Constrói dinamicamente o Web App Manifest de acordo com a URL/rota
 * a partir da qual o usuário está solicitando a instalação.
 * 
 * Garante que:
 * - /admin (e sub-rotas como /admin/agenda) abra no Admin
 * - /academy e /aluno abram na Academy
 * - /loja abra na Loja
 * - /agendamento abra no Agendamento
 * - / (home) abra na Home (não força agendamento!)
 */
export function buildManifestForUrl(rawUrl?: string | null): ManifestData {
  let path = '/';
  if (rawUrl) {
    try {
      if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
        const parsed = new URL(rawUrl);
        path = parsed.pathname + parsed.search;
      } else {
        path = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
      }
    } catch {
      path = '/';
    }
  }

  const cleanPath = path.split('?')[0].toLowerCase();

  // 1. Área de Gestão / Admin do Studio
  if (cleanPath.startsWith('/admin') || cleanPath === '/hub' || cleanPath.startsWith('/admin-')) {
    return {
      name: 'AG Studio — Admin',
      short_name: 'AG Admin',
      description: 'Painel administrativo e gestão — Studio Agnaldo Gomes',
      start_url: path,
      id: '/admin',
      scope: '/',
      display: 'standalone',
      display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
      background_color: '#0d0d0d',
      theme_color: '#D4AF37',
      orientation: 'any',
      lang: 'pt-BR',
      categories: ['business', 'productivity'],
      icons: defaultIcons,
      shortcuts: [
        {
          name: 'Agenda',
          short_name: 'Agenda',
          description: 'Ver agenda do dia',
          url: '/admin/agenda',
          icons: [{ src: '/icon-192x192.png', sizes: '96x96' }],
        },
        {
          name: 'Clientes',
          short_name: 'Clientes',
          description: 'CRM de clientes',
          url: '/admin/clientes',
          icons: [{ src: '/icon-192x192.png', sizes: '96x96' }],
        },
        {
          name: 'Mensagens WhatsApp',
          short_name: 'Mensagens',
          description: 'Disparos e confirmações',
          url: '/admin/marketing',
          icons: [{ src: '/icon-192x192.png', sizes: '96x96' }],
        },
        {
          name: 'Estoque',
          short_name: 'Estoque',
          description: 'Controle de estoque e produtos',
          url: '/admin/estoque',
          icons: [{ src: '/icon-192x192.png', sizes: '96x96' }],
        },
      ],
    };
  }

  // 2. Área Academy / Aluno
  if (cleanPath.startsWith('/academy') || cleanPath.startsWith('/aluno')) {
    return {
      name: 'AG Academy',
      short_name: 'AG Academy',
      description: 'Academy de cursos e treinamentos — Agnaldo Gomes',
      start_url: path,
      id: '/academy',
      scope: '/',
      display: 'standalone',
      display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
      background_color: '#0d0d0d',
      theme_color: '#D4AF37',
      orientation: 'any',
      lang: 'pt-BR',
      categories: ['education'],
      icons: defaultIcons,
      shortcuts: [
        {
          name: 'Meus Cursos',
          short_name: 'Cursos',
          description: 'Acessar meus cursos e aulas',
          url: '/aluno',
          icons: [{ src: '/icon-192x192.png', sizes: '96x96' }],
        },
        {
          name: 'Catálogo de Cursos',
          short_name: 'Catálogo',
          description: 'Ver todos os cursos',
          url: '/academy',
          icons: [{ src: '/icon-192x192.png', sizes: '96x96' }],
        },
      ],
    };
  }

  // 3. Área de Agendamento Online
  if (cleanPath.startsWith('/agendamento')) {
    return {
      name: 'Agnaldo Gomes Studio — Agendamento',
      short_name: 'AG Agendamento',
      description: 'Agende seu horário online no Studio de Beleza Agnaldo Gomes',
      start_url: path,
      id: '/agendamento',
      scope: '/',
      display: 'standalone',
      display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
      background_color: '#faf8f3',
      theme_color: '#D4AF37',
      orientation: 'any',
      lang: 'pt-BR',
      categories: ['beauty', 'lifestyle'],
      icons: defaultIcons,
      shortcuts: [
        {
          name: 'Agendar Novo',
          short_name: 'Agendar',
          description: 'Agende um novo horário',
          url: '/agendamento',
          icons: [{ src: '/icon-192x192.png', sizes: '96x96' }],
        },
        {
          name: 'Meus Agendamentos',
          short_name: 'Meus Horários',
          description: 'Consultar agendamentos marcados',
          url: '/agendamento/meus-horarios',
          icons: [{ src: '/icon-192x192.png', sizes: '96x96' }],
        },
      ],
    };
  }

  // 4. Loja / E-commerce
  if (cleanPath.startsWith('/loja') || cleanPath.startsWith('/carrinho')) {
    return {
      name: 'Loja — Agnaldo Gomes Studio',
      short_name: 'AG Loja',
      description: 'Compre produtos profissionais — Studio Agnaldo Gomes',
      start_url: path,
      id: '/loja',
      scope: '/',
      display: 'standalone',
      display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
      background_color: '#faf8f3',
      theme_color: '#D4AF37',
      orientation: 'any',
      lang: 'pt-BR',
      categories: ['shopping', 'beauty'],
      icons: defaultIcons,
      shortcuts: [
        {
          name: 'Produtos',
          short_name: 'Loja',
          description: 'Ver catálogo de produtos',
          url: '/loja',
          icons: [{ src: '/icon-192x192.png', sizes: '96x96' }],
        },
      ],
    };
  }

  // 5. Home / Geral (instalado a partir da home ou de outra página pública)
  return {
    name: 'Agnaldo Gomes Studio',
    short_name: 'AG Studio',
    description: 'Studio de Beleza Agnaldo Gomes — Cabeleireiro, Educador e Artista',
    start_url: path,
    id: path === '/' ? '/' : path,
    scope: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
    background_color: '#faf8f3',
    theme_color: '#D4AF37',
    orientation: 'any',
    lang: 'pt-BR',
    categories: ['beauty', 'lifestyle', 'shopping'],
    icons: defaultIcons,
    shortcuts: [
      {
        name: 'Agendar Horário',
        short_name: 'Agendar',
        description: 'Agende seu atendimento online',
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
