import { NextResponse } from 'next/server';
import { requireAcademyAuth } from '@/lib/api-auth';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAcademyAuth();
  if (auth.error) return auth.error;

  const { id } = await params;

  try {
    // 1. Buscar todos os cursos disponíveis
    const { data: cursos, error: cursosError } = await auth.supabase!
      .from('courses')
      .select('id, title')
      .order('title');

    if (cursosError) {
      return NextResponse.json({ error: 'Erro ao buscar cursos' }, { status: 500 });
    }

    // 2. Buscar acessos atuais do usuário
    const { data: acessos, error: acessosError } = await auth.supabase!
      .from('course_enrollments')
      .select('course_id')
      .eq('user_id', id);

    if (acessosError) {
      return NextResponse.json({ error: 'Erro ao buscar acessos do usuário' }, { status: 500 });
    }

    const acessosAtuais = acessos?.map((a: { course_id: string }) => a.course_id) ?? [];

    return NextResponse.json({
      cursos: cursos || [],
      acessos: acessosAtuais,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAcademyAuth();
  if (auth.error) return auth.error;

  const { id } = await params;

  try {
    const body = await req.json();
    const { courseIds } = body;

    if (!Array.isArray(courseIds)) {
      return NextResponse.json({ error: 'Formato inválido para courseIds' }, { status: 400 });
    }

    // 1. Remover todos os acessos atuais do usuário
    const { error: deleteError } = await auth.supabase!
      .from('course_enrollments')
      .delete()
      .eq('user_id', id);

    if (deleteError) {
      return NextResponse.json({ error: 'Erro ao redefinir acessos' }, { status: 500 });
    }

    // 2. Inserir novos acessos
    if (courseIds.length > 0) {
      const novasMatriculas = courseIds.map(courseId => ({
        user_id: id,
        course_id: courseId,
      }));

      const { error: insertError } = await auth.supabase!
        .from('course_enrollments')
        .insert(novasMatriculas);

      if (insertError) {
        return NextResponse.json({ error: 'Erro ao salvar novos acessos' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
