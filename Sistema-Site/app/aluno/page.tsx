'use client';

import { SplitLogin } from '@/components/SplitLogin';
import { ROLES } from '@/lib/auth';

export default function AlunoPage() {
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
      redirectTo="/aluno/dashboard"
      requiredRole={ROLES.ALUNO}
    />
  );
}
