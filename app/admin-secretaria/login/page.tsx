'use client';
import { SplitLogin } from '@/components/SplitLogin';
import { ROLES } from '@/lib/auth';

/**
 * Login da SECRETARIA do salão — papel studio_secretaria.
 * Acesso somente ao Studio (agenda, clientes, profissionais, serviços).
 * Sem Academy e sem Loja.
 */
export default function LoginSecretariaPage() {
  return (
    <SplitLogin
      logoSrc="/logo-agnaldo.png"
      sideBg="light"
      title="Agnaldo Gomes"
      subtitle="Secretaria · Agenda, clientes e atendimento do salão"
      formTitle="Bem-vinda de volta"
      formSubtitle="Acesse o painel da secretaria do Studio"
      cta="Acessar Painel"
      redirectTo="/hub"
      requiredRole={ROLES.STUDIO_SECRETARIA}
    />
  );
}
