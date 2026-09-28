import { NextRequest, NextResponse } from 'next/server';
import { requireAcademyAuth } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const auth = await requireAcademyAuth();
  if (auth.error) return auth.error;

  const { supabase } = auth;
  if (!supabase) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }

  try {
    const [
      { count: totalAlunos },
      { count: alunosAtivos },
      { count: cursosPublicados },
      { count: totalMatriculas },
      { data: progressoData },
      { data: receitaData },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'STUDENT'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'STUDENT'),
      supabase.from('courses').select('*', { count: 'exact', head: true }).eq('status', 'PUBLISHED'),
      supabase.from('course_enrollments').select('*', { count: 'exact', head: true }),
      supabase
        .from('lesson_progress')
        .select('user_id, lesson_id, completed')
        .eq('completed', true),
      supabase
        .from('course_enrollments')
        .select('course_id, courses(price)')
        .not('courses.price', 'is', null)
        .gt('courses.price', 0),
    ]);

    const aulasConcluidas = progressoData?.length ?? 0;
    const totalAulasPorCurso = await supabase
      .from('lessons')
      .select('id, modules!inner(course_id)');
    
    const totalAulas = totalAulasPorCurso.data?.length ?? 0;
    const taxaConclusao = totalAulas > 0 ? Math.round((aulasConcluidas / totalAulas) * 100) : 0;

    const receitaTotal = receitaData?.reduce((sum: number, e: { courses?: { price?: number | string } | null }) => sum + Number(e.courses?.price || 0), 0) ?? 0;

    return NextResponse.json({
      totalAlunos: totalAlunos ?? 0,
      alunosAtivos: alunosAtivos ?? 0,
      cursosPublicados: cursosPublicados ?? 0,
      totalMatriculas: totalMatriculas ?? 0,
      taxaConclusao,
      receitaTotal,
      aulasConcluidas,
      totalAulas,
    });
  } catch (error) {
    console.error('[admin-academy/dashboard/stats] Erro:', error);
    return NextResponse.json({ error: 'Erro ao buscar estatísticas' }, { status: 500 });
  }
}