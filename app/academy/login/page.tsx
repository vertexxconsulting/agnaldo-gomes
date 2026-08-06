'use client';

import { SplitLogin } from '@/components/SplitLogin';

/**
 * Login da ACADEMY — split layout com logo em fundo preto à esquerda
 * (preto + dourado) e formulário à direita.
 * Login em MODO TESTE (sem Supabase).
 */
export default function AcademyLoginPage() {
  return (
    <SplitLogin
      logoSrc="/opt/logo-studio.webp"
      sideBg="dark"
      title="Academy AG"
      subtitle="Formação e educação de elite. Acesse seus cursos e certificados."
      formTitle="Área do Aluno"
      formSubtitle="Acesse seus cursos online e acompanhe seu progresso"
      cta="Entrar nos Cursos"
      redirectTo="/aluno"
      hint="Modo TESTE: use qualquer e-mail válido e senha com 6+ caracteres. O acesso via Supabase será configurado em seguida."
    />
  );
}