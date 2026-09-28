import { NextResponse } from 'next/server';
import { requireAcademyAuth } from '@/lib/api-auth';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; aulaId: string }> }) {
  const auth = await requireAcademyAuth();
  if (auth.error) return auth.error;

  const { aulaId } = await params;

  try {
    const body = await req.json();
    const { title, video_url, duration_minutes, description, materials, order_index, module_id } = body;

    const payload: Record<string, unknown> = {};
    if (title !== undefined) payload.title = String(title).trim();
    if (video_url !== undefined) payload.video_url = video_url;
    if (duration_minutes !== undefined) payload.duration_minutes = Number(duration_minutes) || 0;
    if (order_index !== undefined) payload.order_index = order_index;
    if (module_id !== undefined) payload.module_id = module_id;

    const { data, error } = await auth.supabase!
      .from('lessons')
      .update(payload)
      .eq('id', aulaId)
      .select('*')
      .single();

    if (error) {
      console.error('[api/admin-academy/cursos/[id]/aulas/[aulaId]] Erro ao atualizar aula:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, aula: data });
  } catch (err) {
    console.error('[api/admin-academy/cursos/[id]/aulas/[aulaId]] Erro inesperado:', err);
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; aulaId: string }> }) {
  const auth = await requireAcademyAuth();
  if (auth.error) return auth.error;

  const { aulaId } = await params;

  try {
    const { error } = await auth.supabase!
      .from('lessons')
      .delete()
      .eq('id', aulaId);

    if (error) {
      console.error('[api/admin-academy/cursos/[id]/aulas/[aulaId]] Erro ao excluir aula:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[api/admin-academy/cursos/[id]/aulas/[aulaId]] Erro inesperado:', err);
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}