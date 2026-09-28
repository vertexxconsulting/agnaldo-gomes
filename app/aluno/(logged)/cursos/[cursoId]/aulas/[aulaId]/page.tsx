import { requireEnrollment } from '@/lib/api-auth';
import { notFound } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import EpisodioPage, { Aula, Modulo, Curso } from './page-client';

export default async function EpisodioWrapper({ params }: { params: Promise<{ cursoId: string; aulaId: string }> }) {
  const { cursoId, aulaId } = await params;
  const auth = await requireEnrollment(cursoId);
  
  if (auth.error) {
    if (auth.error.status === 401) {
      return (
        <div className="flex flex-col min-h-screen bg-background">
          <div className="flex items-center justify-between p-4 bg-foreground border-b border-gold/20">
            <a href="/academy/login" className="text-foreground/70 hover:text-foreground">Faça login</a>
          </div>
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center p-8">
              <h1 className="text-2xl font-bold text-foreground mb-4">Acesso Negado</h1>
              <p className="text-foreground/60 mb-6">Você precisa fazer login para acessar esta aula.</p>
              <a href="/academy/login" className="bg-gold text-foreground px-6 py-3 rounded font-bold">Entrar</a>
            </div>
          </div>
        </div>
      );
    }
    if (auth.error.status === 403) {
      return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
          <div className="flex items-center justify-between p-4 bg-foreground border-b border-gold/20">
            <a href="/aluno/cursos" className="text-foreground/70 hover:text-foreground">← Voltar para Cursos</a>
          </div>
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center p-8 max-w-md">
              <h1 className="text-2xl font-bold mb-4">Matrícula Necessária</h1>
              <p className="text-foreground/60 mb-6">Você precisa estar matriculado neste curso para assistir a esta aula.</p>
              <a href={`/aluno/cursos/${cursoId}`} className="bg-gold text-black px-6 py-3 rounded font-bold hover:brightness-110 transition-all inline-block">
                Ver Detalhes do Curso
              </a>
            </div>
          </div>
        </div>
      );
    }
  }

  const { supabase, user } = auth;
  if (!supabase || !user) {
    notFound();
  }

  // Fetch lesson data server-side
  const [aulaRes, moduloRes, cursoRes, modulosRes, aulasRes] = await Promise.all([
    supabase.from('lessons').select('*').eq('id', aulaId).maybeSingle(),
    supabase.from('modules').select('*').eq('id', (await supabase.from('lessons').select('module_id').eq('id', aulaId).maybeSingle()).data?.module_id ?? '').maybeSingle(),
    supabase.from('courses').select('id, title, thumbnail_url').eq('id', cursoId).maybeSingle(),
    supabase.from('modules').select('*').eq('course_id', cursoId).order('order_index'),
    supabase.from('lessons').select('*').in('module_id', (await supabase.from('modules').select('id').eq('course_id', cursoId)).data?.map((m: { id: string }) => m.id) ?? []).order('order_index'),
  ]);

  if (!aulaRes.data) notFound();

  const aula: Aula = aulaRes.data;
  const modulo: Modulo | null = moduloRes.data;
  const curso: Curso | null = cursoRes.data;
  const modulos = modulosRes.data ?? [];
  const aulas: Array<{ id: string; module_id: string; order_index: number; title: string; duration_minutes: number; description: string | null }> = aulasRes.data ?? [];

  // Find aulas do modulo atual
  const aulasDoModulo: Aula[] = aulas
    .filter((a) => a.module_id === aula.modulo_id)
    .sort((a, b) => a.order_index - b.order_index)
    .map((a) => ({
      id: a.id,
      modulo_id: a.module_id,
      title: a.title,
      video_url: null,
      duration_minutes: a.duration_minutes,
      order_index: a.order_index,
      description: a.description,
    }));
  const idxAtual = aulasDoModulo.findIndex((a) => a.id === aulaId);
  const proximaAula = idxAtual >= 0 && idxAtual < aulasDoModulo.length - 1 ? aulasDoModulo[idxAtual + 1] : null;

  // Fetch user progress for this module
  const { data: progressoData } = await supabase
    .from('lesson_progress')
    .select('lesson_id, completed, completed_at')
    .eq('user_id', user.id)
    .in('lesson_id', aulasDoModulo.map((a) => a.id));

  // Fetch user notes for this lesson
  const { data: notaData } = await supabase
    .from('lesson_notes')
    .select('content')
    .eq('user_id', user.id)
    .eq('lesson_id', aulaId)
    .maybeSingle();

  const concluida = progressoData?.some((p: { lesson_id: string; completed: boolean }) => p.lesson_id === aulaId && p.completed) ?? false;

  return <EpisodioPage 
    aula={aula}
    modulo={modulo}
    curso={curso}
    aulasDoModulo={aulasDoModulo}
    proximaAula={proximaAula}
    concluida={concluida}
    notaAluno={notaData?.content ?? ''}
    progressoMap={new Map((progressoData ?? []).map((p: { lesson_id: string; completed: boolean }) => [p.lesson_id, p.completed] as [string, boolean]))}
  />;
}