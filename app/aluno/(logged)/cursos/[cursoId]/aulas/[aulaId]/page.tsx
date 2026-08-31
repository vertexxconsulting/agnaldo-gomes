import { requireEnrollment } from '@/lib/api-auth';
import { notFound } from 'next/navigation';
import EpisodioPage from './page-client';

export default async function EpisodioWrapper({ params }: { params: Promise<{ cursoId: string; aulaId: string }> }) {
  const { cursoId } = await params;
  const auth = await requireEnrollment(cursoId);
  
  if (auth.error) {
    if (auth.error.status === 401) {
      return (
        <div className="flex flex-col min-h-screen bg-[#0a0a0a]">
          <div className="flex items-center justify-between p-4 bg-black border-b border-white/10">
            <a href="/academy/login" className="text-white/70 hover:text-white">Faça login</a>
          </div>
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center p-8">
              <h1 className="text-2xl font-bold text-white mb-4">Acesso Negado</h1>
              <p className="text-white/60 mb-6">Você precisa fazer login para acessar esta aula.</p>
              <a href="/academy/login" className="bg-white text-black px-6 py-3 rounded font-bold">Entrar</a>
            </div>
          </div>
        </div>
      );
    }
    if (auth.error.status === 403) {
      notFound();
    }
  }

  return <EpisodioPage params={params} />;
}