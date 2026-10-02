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
  '/admin/login',
  '/admin-academy/login',
  '/admin-loja/login',
  '/admin-secretaria/login',
  '/academy/login',
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
  const url = request.nextUrl;
  const hostname = request.headers.get('host') || '';
  const pathname = url.pathname;

  const isAcademy = hostname.includes('academy.agnaldogomes.com') || hostname.includes('academy.localhost');
  const isLoja = hostname.includes('loja.agnaldogomes.com') || hostname.includes('loja.localhost');
  const isAgenda = hostname.includes('agenda.agnaldogomes.com') || hostname.includes('agenda.localhost');
  const isAdmin = hostname.includes('admin.agnaldogomes.com') || hostname.includes('admin.localhost');
  const isMain = !isAcademy && !isLoja && !isAgenda && !isAdmin;

  // --- REDIRECIONAMENTOS DE DOMÍNIO PRINCIPAL ---
  if (isMain && !hostname.includes('vercel.app')) {
    const scheme = hostname.includes('localhost') ? 'http' : 'https';
    let baseDomain = hostname.replace('www.', ''); 
    
    if (pathname === '/academy') {
      return NextResponse.redirect(`${scheme}://academy.${baseDomain}/`);
    }
    if (pathname.startsWith('/aluno') || pathname.startsWith('/admin-academy') || pathname === '/login') {
      return NextResponse.redirect(`${scheme}://academy.${baseDomain}${pathname}`);
    }
    if (pathname.startsWith('/loja')) {
      const newPath = pathname.replace('/loja', '') || '/';
      return NextResponse.redirect(`${scheme}://loja.${baseDomain}${newPath}`);
    }
    if (pathname.startsWith('/agendamento')) {
      const newPath = pathname.replace('/agendamento', '') || '/';
      return NextResponse.redirect(`${scheme}://agenda.${baseDomain}${newPath}`);
    }
    if (pathname.startsWith('/admin')) {
      const isPrincipal = pathname === '/admin' || pathname.startsWith('/admin/');
      const newPath = isPrincipal ? (pathname.replace('/admin', '') || '/') : pathname;
      return NextResponse.redirect(`${scheme}://admin.${baseDomain}${newPath}`);
    }
  }

  // --- REWRITES PARA SUBDOMÍNIOS ---
  let targetUrl = request.nextUrl.clone();
  let willRewrite = false;

  // Rotas que NÃO devem ser reescritas para /admin/* no subdomínio admin
  const ADMIN_SKIP_REWRITES = [
    '/login', '/hub', '/loja', '/agendamento', '/academy', '/aluno',
    '/studio', '/sobre', '/contato', '/perfil', '/proposta',
    '/esqueci-senha', '/atualizar-senha', '/signup', '/reset-password',
    '/politica-de-privacidade', '/termos-de-uso', '/maintenance',
  ];
  const skipAdminRewrite = ADMIN_SKIP_REWRITES.some(r => pathname === r || pathname.startsWith(r + '/'));

  if (isAdmin) {
    if (!pathname.startsWith('/admin-academy') && !pathname.startsWith('/admin-loja') && !pathname.startsWith('/admin-secretaria')) {
      if (!pathname.startsWith('/admin') && !skipAdminRewrite) {
        targetUrl.pathname = `/admin${pathname === '/' ? '' : pathname}`;
        willRewrite = true;
      }
    }
  } else if (isAgenda) {
    if (!pathname.startsWith('/agendamento')) {
      targetUrl.pathname = `/agendamento${pathname === '/' ? '' : pathname}`;
      willRewrite = true;
    }
  } else if (isLoja) {
    if (!pathname.startsWith('/loja')) {
      targetUrl.pathname = `/loja${pathname === '/' ? '' : pathname}`;
      willRewrite = true;
    }
  } else if (isAcademy) {
    if (!pathname.startsWith('/academy') && !pathname.startsWith('/aluno')) {
      targetUrl.pathname = `/academy${pathname === '/' ? '' : pathname}`;
      willRewrite = true;
    }
  }

  const finalPathname = willRewrite ? targetUrl.pathname : pathname;

  // --- GATE DE MANUTENÇÃO ---
  // Se manutenção está ativa e a rota NÃO é pública → redireciona para /maintenance
  if (maintenanceMode && !isPublicRoute(finalPathname)) {
    const maintenanceUrl = new URL('/maintenance', request.url);
    return NextResponse.redirect(maintenanceUrl);
  }

  if (isPublicRoute(finalPathname)) {
    return willRewrite ? NextResponse.rewrite(targetUrl) : NextResponse.next();
  }

  // Client Supabase server-side
  let supabaseResponse = willRewrite ? NextResponse.rewrite(targetUrl) : NextResponse.next({ request });

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
          supabaseResponse = willRewrite ? NextResponse.rewrite(targetUrl) : NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });
  }

  const { data: { user } } = await supabase.auth.getUser();

  const area = getArea(finalPathname);

  if (!area) {
    return supabaseResponse;
  }

  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', finalPathname);
    return NextResponse.redirect(loginUrl);
  }

  const requiredRole = AREA_ROLES[area];
  const role = getUserRole(user);

  // /hub e /admin aceitam tanto o admin quanto a secretária do Studio
  // owner tem acesso ilimitado a tudo
  const allowedStudioRoles: Role[] | null = (area === '/hub' || area === '/admin')
    ? [ROLES.STUDIO_ADMIN, ROLES.STUDIO_SECRETARIA]
    : null;
  const userIsOwner = isOwner(user);

  // Se o usuário é owner, ou se o role está na lista de permissões da área, deixa passar
  const hasAccess =
    userIsOwner ||
    (allowedStudioRoles !== null
      ? allowedStudioRoles.includes(role as Role)
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
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js)).*)',
  ],
};
