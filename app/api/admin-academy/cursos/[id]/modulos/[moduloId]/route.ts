import { NextResponse } from 'next/server';
import { requireAcademyAuth } from '@/lib/api-auth';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; moduloId: string }> }) {
  const auth = await requireAcademyAuth();
  if (auth.error) return auth.error;

  const { moduloId } = await params;

  try {
    const body = await req.json();
    const { title } = body;

    const payload: Record<string, unknown> = {};
    if (title !== undefined) payload.title = String(title).trim();

    const { data, error } = await auth.supabase!
      .from('modules')
      .update(payload)
      .eq('id', moduloId)
      .select('*')
      .single();

    if (error) {
      console.error('[api/admin-academy/cursos/[id]/modulos/[moduloId]] Erro ao atualizar módulo:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, modulo: data });
  } catch (err) {
    console.error('[api/admin-academy/cursos/[id]/modulos/[moduloId]] Erro inesperado:', err);
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; moduloId: string }> }) {
  const auth = await requireAcademyAuth();
  if (auth.error) return auth.error;

  const { moduloId } = await params;

  try {
    // Delete lessons first
    await auth.supabase!.from('lessons').delete().eq('module_id', moduloId);

    const { error } = await auth.supabase!
      .from('modules')
      .delete()
      .eq('id', moduloId);

    if (error) {
      console.error('[api/admin-academy/cursos/[id]/modulos/[moduloId]] Erro ao excluir módulo:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[api/admin-academy/cursos/[id]/modulos/[moduloId]] Erro inesperado:', err);
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}