import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { requireAcademyAuth } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const auth = await requireAcademyAuth();
  if (auth.error) return auth.error;

  const { supabase } = auth;
  if (!supabase) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') ?? '';
  const withProgress = searchParams.get('withProgress') === 'true';

  try {
    let perfisQuery = supabase
      .from('profiles')
      .select('id, email, full_name, created_at, is_blocked')
      .eq('role', 'STUDENT')
      .order('full_name');

    if (search) {
      perfisQuery = perfisQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: perfisRaw, error: perfisError } = await perfisQuery;
    if (perfisError) throw perfisError;

    if (!perfisRaw || perfisRaw.length === 0) {
      return NextResponse.json({ alunos: [] });
    }

    const perfis: Array<{ id: string; email: string | null; full_name: string | null; created_at: string | null; is_blocked?: boolean }> = perfisRaw;
    const userIds = perfis.map((p) => p.id);

    const [matriculasRes, cursosRes, modulosRes, aulasRes] = await Promise.all([
      supabase.from('course_enrollments').select('user_id, course_id').in('user_id', userIds),
      supabase.from('courses').select('id, title, price'),
      supabase.from('modules').select('id, course_id'),
      supabase.from('lessons').select('id, module_id'),
    ]);

    if (matriculasRes.error) throw matriculasRes.error;
    if (cursosRes.error) throw cursosRes.error;
    if (modulosRes.error) throw modulosRes.error;
    if (aulasRes.error) throw aulasRes.error;

    const matriculas: Array<{ user_id: string; course_id: string }> = matriculasRes.data ?? [];
    const cursos: Array<{ id: string; title: string; price: number | string | null }> = cursosRes.data ?? [];
    const modulos: Array<{ id: string; course_id: string }> = modulosRes.data ?? [];
    const aulas: Array<{ id: string; module_id: string; order_index: number; title: string; duration_minutes: number; description: string | null; video_url: string | null }> = aulasRes.data ?? [];

    const cursoTitulo = new Map(cursos.map((c) => [c.id, c.title]));
    const cursoPreco = new Map(cursos.map((c) => [c.id, Number(c.price || 0)]));

    const aulasPorModulo = new Map<string, number>();
    aulas.forEach((a: { module_id: string }) => {
      aulasPorModulo.set(a.module_id, (aulasPorModulo.get(a.module_id) ?? 0) + 1);
    });

    const aulasPorCurso = new Map<string, number>();
    modulos.forEach((m: { id: string; course_id: string }) => {
      aulasPorCurso.set(m.course_id, (aulasPorCurso.get(m.course_id) ?? 0) + (aulasPorModulo.get(m.id) ?? 0));
    });

    let concluidasPorUsuario: Map<string, Set<string>> = new Map();
    let progressoPorCursoUsuario: Map<string, Map<string, number>> = new Map();

    if (withProgress) {
      const { data: progressoDataRaw, error: progressoError } = await supabase
        .from('lesson_progress')
        .select('user_id, lesson_id, completed')
        .in('user_id', userIds)
        .eq('completed', true);

      if (!progressoError && progressoDataRaw) {
        const progressoData: Array<{ user_id: string; lesson_id: string; completed: boolean }> = progressoDataRaw;
        const cursoDaAula = new Map<string, string>();
        modulos.forEach((m) => {
          aulas.filter((a) => a.module_id === m.id).forEach((a) => {
            cursoDaAula.set(a.id, m.course_id);
          });
        });

        progressoData.forEach((p) => {
          if (!concluidasPorUsuario.has(p.user_id)) {
            concluidasPorUsuario.set(p.user_id, new Set());
          }
          concluidasPorUsuario.get(p.user_id)!.add(p.lesson_id);
        });
      }
    }

    const alunos = perfis.map((p: { id: string; email: string | null; full_name: string | null; created_at: string | null; is_blocked?: boolean }) => {
      const matriculasAluno = matriculas.filter((e) => e.user_id === p.id);
      const cursosIds: string[] = Array.from(new Set(matriculasAluno.map((e) => String(e.course_id))));
      
      let progressoMax = 0;
      const cursosComProgresso: Record<string, { titulo: string; progresso: number; totalAulas: number; concluido: boolean }> = {};

      cursosIds.forEach((cid: string) => {
        const total = aulasPorCurso.get(cid) ?? 0;
        const titulo = cursoTitulo.get(cid) ?? cid;
        
        if (withProgress && total > 0) {
          const concluidas = [...(concluidasPorUsuario.get(p.id) ?? [])]
            .filter((aid: string) => {
              const aula = aulas.find((a: { id: string; module_id: string }) => a.id === aid);
              return aula?.module_id && modulos.find((m: { id: string; course_id: string }) => m.id === aula.module_id)?.course_id === cid;
            }).length;
          
          const progresso = Math.round((concluidas / total) * 100);
          progressoMax = Math.max(progressoMax, progresso);
          
          cursosComProgresso[cid] = {
            titulo,
            progresso,
            totalAulas: total,
            concluido: progresso >= 100,
          };
        } else {
          cursosComProgresso[cid] = {
            titulo,
            progresso: 0,
            totalAulas: total,
            concluido: false,
          };
        }
      });

      const status = p.is_blocked ? 'Bloqueado' : (progressoMax >= 100 ? 'Concluído' : (cursosIds.length > 0 ? 'Ativo' : 'Inativo'));

      return {
        id: p.id,
        user_id: p.id,
        nome: p.full_name || 'Sem nome',
        email: p.email || '',
        cursos: cursosIds.map(cid => cursoTitulo.get(cid) ?? cid),
        cursosDetalhados: withProgress ? cursosComProgresso : undefined,
        progresso: progressoMax,
        status,
        dataCadastro: p.created_at,
      };
    });

    return NextResponse.json({ alunos });
  } catch (error) {
    console.error('[admin-academy/alunos] Erro:', error);
    return NextResponse.json({ error: 'Erro ao buscar alunos' }, { status: 500 });
  }
}