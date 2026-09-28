import { NextResponse } from 'next/server';
import { requireAcademyAuth } from '@/lib/api-auth';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAcademyAuth();
  if (auth.error) return auth.error;

  const { id } = await params;

  try {
    const { data, error } = await auth.supabase!
      .from('modules')
      .select('*')
      .eq('course_id', id)
      .order('order_index');

    if (error) {
      console.error('[api/admin-academy/cursos/[id]/modulos] Erro ao buscar módulos:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAcademyAuth();
  if (auth.error) return auth.error;

  const { id } = await params;

  try {
    const body = await req.json();
    const { title } = body;

    if (!title) {
      return NextResponse.json({ error: 'Título do módulo é obrigatório.' }, { status: 400 });
    }

    // Get the next order_index
    const { data: lastModule } = await auth.supabase!
      .from('modules')
      .select('order_index')
      .eq('course_id', id)
      .order('order_index', { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (lastModule?.order_index ?? 0) + 1;

    const { data, error } = await auth.supabase!
      .from('modules')
      .insert({
        course_id: id,
        title: String(title).trim(),
        order_index: nextOrder,
      })
      .select('*')
      .single();

    if (error) {
      console.error('[api/admin-academy/cursos/[id]/modulos] Erro ao criar módulo:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, modulo: data });
  } catch (err) {
    console.error('[api/admin-academy/cursos/[id]/modulos] Erro inesperado:', err);
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAcademyAuth();
  if (auth.error) return auth.error;

  await params; // Acknowledge params but not used - modules contain their own IDs

  try {
    const body = await req.json();
    const { modules } = body; // Array of { id, order_index } for reordering

    if (!Array.isArray(modules)) {
      return NextResponse.json({ error: 'Formato inválido. Envie array de módulos com id e order_index.' }, { status: 400 });
    }

    const updates = modules.map((m, idx) => 
      auth.supabase!.from('modules').update({ order_index: m.order_index ?? idx + 1 }).eq('id', m.id)
    );

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[api/admin-academy/cursos/[id]/modulos] Erro inesperado:', err);
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}