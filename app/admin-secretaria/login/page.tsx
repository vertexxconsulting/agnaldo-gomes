'use client';
import { SplitLogin } from '@/components/SplitLogin';
import { ROLES } from '@/lib/auth';

/**
 * Login da SECRETARIA do salão — papel studio_secretaria.
 * Acesso somente ao Studio (agenda, clientes, profissionais, serviços).
 * Sem Academy e sem Loja.
 */
export default function SecretariaLoginPage() {
  return (
    <SplitLogin
      logoSrc="/opt/logo-hero.png"
      sideBg="dark"
      sideBgImage="/Metodo-AG.webp"
      centeredCard={true}
      title="Studio Secretaria AG"
      subtitle="Gestão de agendamentos, clientes e comandas do Studio Agnaldo Gomes."
      formTitle="Bem-vinda de volta"
      formSubtitle="Acesse o painel da secretaria do Studio"
      cta="Acessar Painel"
      redirectTo="/hub"
      requiredRole={ROLES.STUDIO_SECRETARIA}
    />
  );
}
