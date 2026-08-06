'use client';

import { SplitLogin } from '@/components/SplitLogin';

/**
 * Login do APP DO SALÃO — split: logo à esquerda, formulário à direita.
 * Login em MODO TESTE (sem Supabase). Qualquer e-mail válido + senha 6+ entra.
 */
export default function LoginPage() {
  return (
    <SplitLogin
      logoSrc="/opt/logo-branca.webp"
      sideBg="light"
      title="Agnaldo Gomes"
      subtitle="Painel do Studio · Gestão de agenda, clientes e faturamento"
      formTitle="Bem-vindo de volta"
      formSubtitle="Acesse o painel de gestão do salão"
      cta="Acessar Painel"
      redirectTo="/admin"
      registerHref="/cadastro"
      registerLabel="Solicitar acesso"
      hint="Modo TESTE: use qualquer e-mail válido e senha com 6+ caracteres. O acesso via Supabase será configurado em seguida."
    />
  );
}