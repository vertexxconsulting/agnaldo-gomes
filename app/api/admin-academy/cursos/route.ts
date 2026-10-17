import { NextResponse } from 'next/server';
import { requireAcademyAuth } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAcademyAuth();
  if (auth.error) return auth.error;

  try {
    const { data: courses, error } = await auth.supabase!
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[api/admin-academy/cursos] Erro ao buscar cursos:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Contar aulas, matrículas e horas assistidas reais por curso
    const cursosComDadosReais = await Promise.all(
      (courses || []).map(async (c: any) => {
        const [modulesRes, enrollRes] = await Promise.all([
          auth.supabase!.from('modules').select('id').eq('course_id', c.id),
          auth.supabase!.from('course_enrollments').select('*', { count: 'exact', head: true }).eq('course_id', c.id),
        ]);

        const modIds = (modulesRes.data || []).map((m: any) => m.id);
        let totalAulas = 0;
        let horasAssistidas = 0;

        if (modIds.length > 0) {
          const { data: lessonsData, count } = await auth.supabase!
            .from('lessons')
            .select('id, duration_minutes', { count: 'exact' })
            .in('module_id', modIds);
          totalAulas = count || 0;

          const lessonIds = (lessonsData || []).map((l: any) => l.id);
          if (lessonIds.length > 0) {
            const { data: progressData } = await auth.supabase!
              .from('lesson_progress')
              .select('lesson_id, completed')
              .in('lesson_id', lessonIds)
              .eq('completed', true);

            if (progressData && progressData.length > 0) {
              const completedSet = new Set(progressData.map((p: any) => p.lesson_id));
              const totalMinutosAssistidos = (lessonsData || [])
                .filter((l: any) => completedSet.has(l.id))
                .reduce((acc: number, l: any) => acc + (Number(l.duration_minutes) || 15), 0);
              horasAssistidas = Math.round((totalMinutosAssistidos / 60) * 10) / 10;
            }
          }
        }

        return {
          ...c,
          totalAulas,
          enrollmentsCount: enrollRes.count || 0,
          horasAssistidas,
        };
      })
    );

    return NextResponse.json(cursosComDadosReais);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAcademyAuth();
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { title, description, thumbnail_url, duration_hours, level, tags } = body;

    if (!title) {
      return NextResponse.json({ error: 'Título do curso é obrigatório.' }, { status: 400 });
    }

    // Simple slug generator
    const slug = String(title)
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, '-')
      .replace(/[^\w-]+/g, '') + '-' + Date.now().toString().slice(-4);

    const payload = {
      title: String(title).trim(),
      slug: slug,
      description: description || '',
      thumbnail_url: thumbnail_url || '',
      status: 'DRAFT',
    };

    const { data, error } = await auth.supabase!
      .from('courses')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      console.error('[api/admin-academy/cursos] Erro ao criar curso:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, curso: data });
  } catch (err) {
    console.error('[api/admin-academy/cursos] Erro inesperado:', err);
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}