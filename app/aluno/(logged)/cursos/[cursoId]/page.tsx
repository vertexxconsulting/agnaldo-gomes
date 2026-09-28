import { requireEnrollment } from '@/lib/api-auth';
import { notFound } from 'next/navigation';
import CursoDetalhesPage from './page-client';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export default async function CursoDetalhesWrapper({ params }: { params: Promise<{ cursoId: string }> }) {
  const { cursoId } = await params;
  const auth = await requireEnrollment(cursoId);

  const supabase = await getSupabaseServerClient();
  const { data: cursoDb } = await supabase
    .from('courses')
    .select('price')
    .eq('id', cursoId)
    .single();

  const price = cursoDb?.price ? Number(cursoDb.price) : 97.0;

  if (auth.error) {
    if (auth.error.status === 401) {
      return (
        <div className="flex flex-col min-h-screen bg-background pb-20">
          <div className="absolute top-24 left-4 sm:left-8 z-20">
            <a href="/academy/login" className="flex items-center gap-2 text-foreground/70 hover:text-foreground transition-colors bg-gold/10 px-3 py-1.5 rounded-full backdrop-blur-md">
              <span className="text-sm font-medium">Faça login para acessar</span>
            </a>
          </div>
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center p-8">
              <h1 className="text-2xl font-bold text-foreground mb-4">Acesso Negado</h1>
              <p className="text-foreground/60 mb-6">Você precisa fazer login para acessar este curso.</p>
              <a href="/academy/login" className="bg-gold text-foreground px-6 py-3 rounded font-bold hover:bg-gold-dim transition-colors focus:outline-none focus:ring-2 focus:ring-gold">Entrar</a>
            </div>
          </div>
        </div>
      );
    }
    // Para 403 (Sem matrícula), não bloqueamos mais a tela. 
    // Renderizamos a vitrine do curso bloqueado.
  }

  return <CursoDetalhesPage params={params} hasAccess={!auth.error} price={price} />;
}
