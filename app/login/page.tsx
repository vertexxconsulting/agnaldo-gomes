'use client';

import { SplitLogin } from '@/components/SplitLogin';
import { ROLES } from '@/lib/auth';

/**
 * Login do APP DO SALÃO — split: logo à esquerda, formulário à direita.
 * Login em MODO TESTE (sem Supabase). Qualquer e-mail válido + senha 6+ entra.
 */
export default function LoginPage() {
  return (
    <SplitLogin
      logoSrc="/logo-agnaldo.png"
      sideBg="light"
      title="Agnaldo Gomes"
      subtitle="Painel do Studio · Gestão de agenda, clientes e faturamento"
      formTitle="Bem-vindo de volta"
      formSubtitle="Acesse o painel de gestão do salão"
      cta="Acessar Painel"
      redirectTo="/admin"
      requiredRole={ROLES.STUDIO_ADMIN}
    />
  );
}
