import { NextResponse } from 'next/server';
import { requireAcademyAuth } from '@/lib/api-auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAcademyAuth();
  if (auth.error) return auth.error;

  const { id } = await params; // curso de destino

  try {
    const body = await req.json();
    const { sourceCourseId, sourceModuleId } = body;

    if (!sourceCourseId || !sourceModuleId) {
      return NextResponse.json({ error: 'Curso de origem e módulo de origem são obrigatórios.' }, { status: 400 });
    }

    // Buscar o módulo de origem com suas aulas
    const { data: sourceModule, error: moduleError } = await auth.supabase!
      .from('modules')
      .select('*')
      .eq('id', sourceModuleId)
      .eq('course_id', sourceCourseId)
      .single();

    if (moduleError || !sourceModule) {
      return NextResponse.json({ error: 'Módulo de origem não encontrado.' }, { status: 404 });
    }

    // Buscar as aulas do módulo de origem
    const { data: sourceLessons, error: lessonsError } = await auth.supabase!
      .from('lessons')
      .select('*')
      .eq('module_id', sourceModuleId)
      .order('order_index');

    if (lessonsError) {
      return NextResponse.json({ error: lessonsError.message }, { status: 500 });
    }

    // Obter o próximo order_index no curso de destino
    const { data: lastModule } = await auth.supabase!
      .from('modules')
      .select('order_index')
      .eq('course_id', id)
      .order('order_index', { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (lastModule?.order_index ?? 0) + 1;

    // Criar o novo módulo no curso de destino
    const { data: newModule, error: newModuleError } = await auth.supabase!
      .from('modules')
      .insert({
        course_id: id,
        title: `${sourceModule.title} (Cópia)`,
        order_index: nextOrder,
      })
      .select('*')
      .single();

    if (newModuleError) {
      return NextResponse.json({ error: newModuleError.message }, { status: 500 });
    }

    // Copiar as aulas para o novo módulo
    if (sourceLessons && sourceLessons.length > 0) {
      const lessonsToInsert = sourceLessons.map((lesson, index) => ({
        module_id: newModule.id,
        title: lesson.title,
        video_url: lesson.video_url || '',
        duration_minutes: Number(lesson.duration_minutes) || 0,
        order_index: lesson.order_index ?? index + 1,
      }));

      const { error: insertLessonsError } = await auth.supabase!
        .from('lessons')
        .insert(lessonsToInsert);

      if (insertLessonsError) {
        return NextResponse.json({ error: insertLessonsError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, modulo: newModule });
  } catch (err) {
    console.error('[api/admin-academy/cursos/[id]/modulos/replicate] Erro:', err);
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
