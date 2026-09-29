import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - any file with an extension (e.g. .webp, .svg, .png, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)',
  ],
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || '';
  const path = url.pathname;

  // Extrair o subdomínio ignorando localhost e portas, e o domínio base
  const isAcademy = hostname.includes('academy.agnaldogomes.com') || hostname.includes('academy.localhost');
  const isLoja = hostname.includes('loja.agnaldogomes.com') || hostname.includes('loja.localhost');
  const isAgenda = hostname.includes('agenda.agnaldogomes.com') || hostname.includes('agenda.localhost');
  const isAdmin = hostname.includes('admin.agnaldogomes.com') || hostname.includes('admin.localhost');
  const isMain = !isAcademy && !isLoja && !isAgenda && !isAdmin;

  // Lógica para o subdomínio Admin
  if (isAdmin) {
    // Se estiver acessando os outros pains de admin (academy, loja, secretaria)
    if (path.startsWith('/admin-academy') || path.startsWith('/admin-loja') || path.startsWith('/admin-secretaria')) {
      return NextResponse.next();
    }
    // Para o admin principal, reescrevemos para incluir /admin invisivelmente
    if (!path.startsWith('/admin')) {
      return NextResponse.rewrite(new URL(`/admin${path === '/' ? '' : path}`, req.url));
    }
    return NextResponse.next();
  }

  // Lógica para o subdomínio da Agenda
  if (isAgenda) {
    if (!path.startsWith('/agendamento')) {
      return NextResponse.rewrite(new URL(`/agendamento${path === '/' ? '' : path}`, req.url));
    }
    return NextResponse.next();
  }

  // Lógica para o subdomínio da Loja
  if (isLoja) {
    // Se a pessoa tentar acessar algo que já começa com /loja, removemos do frontend para manter a URL limpa
    // mas se o acesso vier da Vercel ou internamente sem /loja, reescrevemos para /loja
    if (!path.startsWith('/loja')) {
      return NextResponse.rewrite(new URL(`/loja${path === '/' ? '' : path}`, req.url));
    }
    return NextResponse.next();
  }

  // Lógica para o subdomínio da Academy
  if (isAcademy) {
    if (path === '/') {
      return NextResponse.rewrite(new URL('/academy', req.url));
    }
    // Para rotas como /aluno, /admin-academy, /login, deixamos passar normalmente
    return NextResponse.next();
  }

  // Lógica para o domínio principal (agnaldogomes.com)
  if (isMain && !hostname.includes('vercel.app')) {
    const scheme = hostname.includes('localhost') ? 'http' : 'https';
    let baseDomain = hostname.replace('www.', ''); // remove www if present
    
    // Se tentarem acessar a raiz da Academy pelo domínio principal
    if (path === '/academy') {
      return NextResponse.redirect(`${scheme}://academy.${baseDomain}/`);
    }
    
    // Se tentarem acessar as rotas internas da Academy pelo domínio principal
    if (path.startsWith('/aluno') || path.startsWith('/admin-academy') || path === '/login') {
      return NextResponse.redirect(`${scheme}://academy.${baseDomain}${path}`);
    }

    // Se tentarem acessar a Loja pelo domínio principal
    if (path.startsWith('/loja')) {
      const newPath = path.replace('/loja', '') || '/';
      return NextResponse.redirect(`${scheme}://loja.${baseDomain}${newPath}`);
    }

    // Se tentarem acessar o Agendamento pelo domínio principal
    if (path.startsWith('/agendamento')) {
      const newPath = path.replace('/agendamento', '') || '/';
      return NextResponse.redirect(`${scheme}://agenda.${baseDomain}${newPath}`);
    }

    // Se tentarem acessar os Admins pelo domínio principal
    if (path.startsWith('/admin')) {
      // Se for /admin, vira /, se for /admin/agenda, vira /agenda. Se for /admin-academy, vira /admin-academy
      const isPrincipal = path === '/admin' || path.startsWith('/admin/');
      const newPath = isPrincipal ? (path.replace('/admin', '') || '/') : path;
      return NextResponse.redirect(`${scheme}://admin.${baseDomain}${newPath}`);
    }
  }

  return NextResponse.next();
}
