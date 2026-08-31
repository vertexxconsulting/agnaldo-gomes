import { NextResponse } from 'next/server';
import { requireAcademyAuth } from '@/lib/api-auth';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAcademyAuth();
  if (auth.error) return auth.error;

  const { id } = await params;

  try {
    const { data, error } = await auth.supabase!
      .from('courses')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[api/admin-academy/cursos/[id]] Erro ao buscar curso:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
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
    const { title, description, thumbnail_url, duration_hours, level, tags } = body;

    const payload: Record<string, unknown> = {};
    if (title !== undefined) payload.title = String(title).trim();
    if (description !== undefined) payload.description = description;
    if (thumbnail_url !== undefined) payload.thumbnail_url = thumbnail_url;
    if (duration_hours !== undefined) payload.duration_hours = Number(duration_hours) || 0;
    if (level !== undefined) payload.level = level;
    if (tags !== undefined) payload.tags = Array.isArray(tags) ? tags : [];

    const { data, error } = await auth.supabase!
      .from('courses')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('[api/admin-academy/cursos/[id]] Erro ao atualizar curso:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, curso: data });
  } catch (err) {
    console.error('[api/admin-academy/cursos/[id]] Erro inesperado:', err);
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAcademyAuth();
  if (auth.error) return auth.error;

  const { id } = await params;

  try {
    // Cascade delete: modules -> lessons -> course
    await auth.supabase!.from('lessons').delete().in('module_id', 
      (await auth.supabase!.from('modules').select('id').eq('course_id', id)).data?.map((m: { id: string }) => m.id) || []
    );
    await auth.supabase!.from('modules').delete().eq('course_id', id);
    
    const { error } = await auth.supabase!
      .from('courses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[api/admin-academy/cursos/[id]] Erro ao excluir curso:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[api/admin-academy/cursos/[id]] Erro inesperado:', err);
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}