import { requireEnrollment } from '@/lib/api-auth';
import { notFound } from 'next/navigation';
import CursoDetalhesPage from './page-client';

export default async function CursoDetalhesWrapper({ params }: { params: Promise<{ cursoId: string }> }) {
  const { cursoId } = await params;
  const auth = await requireEnrollment(cursoId);
  
  if (auth.error) {
    if (auth.error.status === 401) {
      return (
        <div className="flex flex-col min-h-screen bg-[#141414] pb-20">
          <div className="absolute top-24 left-4 sm:left-8 z-20">
            <a href="/academy/login" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md">
              <span className="text-sm font-medium">Faça login para acessar</span>
            </a>
          </div>
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center p-8">
              <h1 className="text-2xl font-bold text-white mb-4">Acesso Negado</h1>
              <p className="text-white/60 mb-6">Você precisa fazer login para acessar este curso.</p>
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

  return <CursoDetalhesPage params={params} />;
}