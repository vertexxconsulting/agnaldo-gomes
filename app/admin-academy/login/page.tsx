'use client';

import { SplitLogin } from '@/components/SplitLogin';
import { ROLES } from '@/lib/auth';

/**
 * Login do ADMIN ACADEMY — split layout com logo em fundo preto à esquerda
 * (preto + dourado) e formulário à direita.
 * Redireciona para /admin-academy após login.
 */
export default function AdminAcademyLoginPage() {
  return (
    <SplitLogin
      logoSrc="/opt/logo-hero.png"
      sideBg="dark"
      sideBgImage="/Metodo-AG.webp"
      centeredCard={true}
      title="Gestão Academy"
      subtitle="Controle total sobre alunos, cursos, aulas e relatórios financeiros da plataforma educacional."
      formTitle="Administração Academy"
      formSubtitle="Acesse o painel administrativo de cursos, alunos e certificados"
      cta="Acessar Painel"
      redirectTo="/admin-academy"
      requiredRole={ROLES.ACADEMY_ADMIN}
    />
  );
}
