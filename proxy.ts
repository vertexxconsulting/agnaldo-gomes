import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getArea, getUserRole, isOwner, AREA_ROLES, ROLES, Role } from '@/lib/auth';
import { maintenanceMode } from '@/lib/maintenance';

/**
 * Proxy de proteção de rotas (Next.js 16).
 *
 * PROTOCOLO:
 * 1. Se maintenanceMode === true, TODA rota não pública é redirecionada para /maintenance
 * 2. Se manutenção não está ativa, segue o protocolo normal: sessão + papel
 *
 * ATIVAR MANUTENÇÃO: altere lib/maintenance.ts para `export const maintenanceMode = true;`
 * DESATIVAR: altere para `export const maintenanceMode = false;`
 *
 * ROTAS PÚBLICAS (bypassam manutenção e login):
 *   /, /login, /reset-password, /signup, /esqueci-senha, /atualizar-senha,
 *   /contato, /sobre, /studio, /academy, /proposta, /politica-de-privacidade,
 *   /termos-de-uso, /loja, /agendamento, /perfil, /api/
 */

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/reset-password',
  '/signup',
  '/esqueci-senha',
  '/atualizar-senha',
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
  return PUBLIC_ROUTES.some((route) => {
    if (route === '/') return pathname === '/';
    return route.endsWith('/')
      ? pathname === route || pathname.startsWith(route)
      : pathname === route || pathname.startsWith(route + '/');
  });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- GATE DE MANUTENÇÃO ---
  // Se manutenção está ativa e a rota NÃO é pública → redireciona para /maintenance
  if (maintenanceMode && !isPublicRoute(pathname)) {
    const maintenanceUrl = new URL('/maintenance', request.url);
    return NextResponse.redirect(maintenanceUrl);
  }

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Client Supabase server-side
  let supabaseResponse: NextResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  let supabase: ReturnType<typeof createServerClient>;
  if (!supabaseUrl || !supabaseAnonKey) {
    const noop = () => Promise.resolve({ data: null, error: null });
    const chain = new Proxy({}, { get: () => chain });
    supabase = new Proxy(
      {
        auth: {
          getSession: noop,
          getUser: noop,
          signInWithPassword: noop,
          signOut: noop,
        },
      },
      { get(_target, prop) { if (typeof prop === 'string' && prop.startsWith('_')) return undefined; return () => chain; } }
    ) as unknown as ReturnType<typeof createServerClient>;
  } else {
    supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });
  }

  const { data: { user } } = await supabase.auth.getUser();

  const area = getArea(pathname);

  if (!area) {
    return supabaseResponse;
  }

  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const requiredRole = AREA_ROLES[area];
  const role = getUserRole(user);

  // /hub aceita tanto o admin quanto a secretária do Studio
  // owner tem acesso ilimitado a tudo
  const allowedHubRoles = area === '/hub' ? [ROLES.STUDIO_ADMIN, ROLES.STUDIO_SECRETARIA] : null;
  const userIsOwner = isOwner(user);

  // Se o usuário é owner, ou se o role está na lista de permissões da área, deixa passar
  const hasAccess =
    userIsOwner ||
    (allowedHubRoles !== null
      ? role === ROLES.STUDIO_ADMIN || role === ROLES.STUDIO_SECRETARIA
      : role === requiredRole);

  if (!hasAccess) {
    const url = request.nextUrl.clone();
    url.pathname = '/hub';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
