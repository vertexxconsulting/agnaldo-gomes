import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getArea, getUserRole, isOwner, LOGIN_BY_AREA, AREA_ROLES, ROLES, Role } from '@/lib/auth';

/**
 * Proxy de proteção de rotas (Next.js 16 — antigo middleware).
 * - Rotas públicas: acessíveis por todos.
 * - Rotas de área (admin do Studio, admin da Academy, admin da Loja e Aluno):
 *   exigem sessão válida E o papel (role) correspondente à área.
 *   Um usuário com papel de uma área NÃO acessa as outras áreas.
 */

// Rotas que NÃO requerem autenticação
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/academy/login',
  '/admin-academy/login',
  '/admin-loja/login',
  '/admin-secretaria/login',
  '/cadastro',
  '/contato',
  '/sobre',
  '/studio',
  '/academy',
  '/proposta',
  '/politica-de-privacidade',
  '/termos-de-uso',
  '/loja',
  '/agendamento',
  '/perfil',
  '/api/',
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route =>
    route.endsWith('/')
      ? pathname === route || pathname.startsWith(route)
      : pathname === route || pathname.startsWith(route + '/')
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Client Supabase server-side que lê/renova a sessão nos cookies
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // Modo demonstração (sem credenciais): client no-op para não travar.
  let supabase: ReturnType<typeof createServerClient>;
  if (!supabaseUrl || !supabaseAnonKey) {
    const noop = () => Promise.resolve({ data: null, error: null });
    const chain = new Proxy({}, { get: () => chain });
    supabase = new Proxy(
      { auth: { getSession: noop, getUser: noop, signInWithPassword: noop, signOut: noop } },
      { get(_target, prop) { if (typeof prop === 'string' && prop.startsWith('_')) return undefined; return () => chain; } }
    ) as unknown as ReturnType<typeof createServerClient>;
  } else {
    supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
                },
      },
    });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log('[proxy-debug]', pathname, 'user=', user ? user.email : 'none', 'area=', getArea(pathname), 'role=', getUserRole(user));

  const area = getArea(pathname);

  // Rota sem área restrita — deixa passar (renovando a sessão se necessário)
  if (!area) {
    return supabaseResponse;
  }

  const requiredRole = AREA_ROLES[area];
  const role = getUserRole(user);

  // /hub aceita tanto o admin quanto a secretária do Studio (o hub filtra módulos por papel)
  const allowedHubRoles =
    area === '/hub' ? [ROLES.STUDIO_ADMIN, ROLES.STUDIO_SECRETARIA] : null;

  const userIsOwner = isOwner(user);

  if (!user || (!userIsOwner && (allowedHubRoles ? !(allowedHubRoles as Role[]).includes(role as Role) : role !== requiredRole))) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_BY_AREA[area];
    url.search = '';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Corresponde a todas as rotas, exceto:
     * - api (API routes)
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagem)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
