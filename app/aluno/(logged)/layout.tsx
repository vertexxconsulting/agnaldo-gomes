import { requireAlunoAuth } from '@/lib/api-auth';
import { redirect } from 'next/navigation';
import ClientLayout from './ClientLayout';

export default async function AlunoLoggedLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireAlunoAuth();
  
  // Se não estiver autenticado ou não tiver permissão, redireciona para login
  if (auth.error) {
    redirect('/academy/login');
  }

  return <ClientLayout>{children}</ClientLayout>;
}
