'use client';

import { SplitLogin } from '@/components/SplitLogin';
import { ROLES } from '@/lib/auth';

export default function AdminLojaLoginPage() {
  return (
    <SplitLogin
      logoSrc="/logo-agnaldo.png"
      sideBg="dark"
      title="Store Admin"
      subtitle="Painel de controle do e-commerce Agnaldo Gomes."
      formTitle="Acesso Administrativo"
      formSubtitle="Gerencie produtos, pedidos e integrações."
      cta="Acessar Loja"
      redirectTo="/admin-loja"
      requiredRole={ROLES.LOJA_ADMIN}
      hint="Digite o e-mail e senha cadastrados no Supabase para acessar o painel administrativo da loja."
      backHref="/loja"
      backLabel="Voltar à loja"
    />
  );
}
