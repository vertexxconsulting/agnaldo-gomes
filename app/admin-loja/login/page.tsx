'use client';

import { SplitLogin } from '@/components/SplitLogin';

export default function AdminLojaLoginPage() {
  return (
    <SplitLogin
      logoSrc="/opt/logo-branca.webp"
      sideBg="dark"
      title="Store Admin"
      subtitle="Painel de controle do e-commerce Agnaldo Gomes."
      formTitle="Acesso Administrativo"
      formSubtitle="Gerencie produtos, pedidos e integrações."
      cta="Acessar Loja"
      redirectTo="/admin-loja"
      hint="Digite o e-mail e senha cadastrados no Supabase para acessar o painel administrativo da loja."
    />
  );
}
