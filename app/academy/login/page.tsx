'use client';

import { SplitLogin } from '@/components/SplitLogin';
import { ROLES } from '@/lib/auth';

/**
 * Login da ACADEMY — split layout com logo em fundo preto à esquerda
 * (preto + dourado) e formulário à direita.
 * Login em MODO TESTE (sem Supabase).
 */
export default function AcademyLoginPage() {
  return (
    <SplitLogin
      logoSrc="/opt/logo-hero.png"
      sideBg="light"
      title="Academy AG"
      titleClassName="text-gradient"
      subtitle="Formação e educação de elite. Acesse seus cursos e certificados."
      formTitle="Área do Aluno"
      formSubtitle="Acesse seus cursos online e acompanhe seu progresso"
      cta="Entrar nos Cursos"
      redirectTo="/aluno/dashboard"
      requiredRole={ROLES.ALUNO}
    />
  );
}
