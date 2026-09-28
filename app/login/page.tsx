import { SplitLogin } from '@/components/SplitLogin';
import { ROLES } from '@/lib/auth';

/**
 * Login unificado — Área do Aluno ou Gestão AG.
 *
 * Roteamento do título:
 * - ?next=/hub ou ?next=/admin-* → "Gestão AG" (STUDIO_ADMIN + STUDIO_SECRETARIA)
 * - ?next=/aluno/* → "Área do Aluno" (ALUNO)
 * - Sem next → "Gestão AG" (padrão; valida role pós-login, aluno é expulso)
 *
 * High-Contrast Minimalist: Obsidian Ink (#0a0a0a) + Rich Gold (#b8860b).
 * Todas as telas usam /Metodo-AG.webp como background dark.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = params?.next ?? '';

  const adminRoutes = ['/hub', '/admin-academy', '/admin-loja', '/admin-secretaria', '/studio'];
  const alunoRoutes = ['/aluno', '/academy/curso'];
  const isAdminArea = adminRoutes.some((route) => next.startsWith(route));
  const isAlunoArea = alunoRoutes.some((route) => next.startsWith(route));

  if (isAdminArea) {
    return (
      <SplitLogin
        logoSrc="/logo-branca.png"
        sideBg="dark"
        sideBgImage="/Metodo-AG.webp"
        centeredCard={true}
        title="Gestão AG"
        formTitle="Gestão AG"
        formSubtitle="Acesse o painel administrativo e de gestão do Studio."
        cta="Acessar Gestão"
        redirectTo={next || '/hub'}
        allowedRoles={[ROLES.STUDIO_ADMIN, ROLES.STUDIO_SECRETARIA]}
      />
    );
  }

  if (isAlunoArea) {
    return (
      <SplitLogin
        logoSrc="/logo-branca.png"
        sideBg="dark"
        sideBgImage="/Metodo-AG.webp"
        centeredCard={true}
        title="Área do Aluno"
        formTitle="Área do Aluno"
        formSubtitle="Acesse seus cursos online e acompanhe seu progresso"
        cta="Entrar nos Cursos"
        redirectTo={next || '/hub'}
        requiredRole={ROLES.ALUNO}
      />
    );
  }

  // Sem next: padrão Gestão AG (admin + secretaria)
  return (
    <SplitLogin
      logoSrc="/logo-branca.png"
      sideBg="dark"
      sideBgImage="/Metodo-AG.webp"
      centeredCard={true}
      title="Gestão AG"
      formTitle="Gestão AG"
      formSubtitle="Acesse o painel administrativo e de gestão do Studio."
      cta="Acessar Gestão"
      redirectTo={next || '/hub'}
      allowedRoles={[ROLES.STUDIO_ADMIN, ROLES.STUDIO_SECRETARIA]}
    />
  );
}
