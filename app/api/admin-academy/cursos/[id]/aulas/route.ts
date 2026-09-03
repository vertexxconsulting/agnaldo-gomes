import { NextResponse } from 'next/server';
import { requireAcademyAuth } from '@/lib/api-auth';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAcademyAuth();
  if (auth.error) return auth.error;

  const { id } = await params;

  try {
    // Get modules for this course first
    const { data: modules } = await auth.supabase!
      .from('modules')
      .select('id')
      .eq('course_id', id);

    const moduleIds = modules?.map((m: { id: string }) => m.id) || [];

    if (moduleIds.length === 0) {
      return NextResponse.json([]);
    }

    const { data, error } = await auth.supabase!
      .from('lessons')
      .select('*')
      .in('module_id', moduleIds)
      .order('module_id')
      .order('order_index');

    if (error) {
      console.error('[api/admin-academy/cursos/[id]/aulas] Erro ao buscar aulas:', error);
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
    const { module_id, title, video_url, duration_minutes, description, materials, order_index } = body;

    if (!module_id || !title) {
      return NextResponse.json({ error: 'Módulo e título da aula são obrigatórios.' }, { status: 400 });
    }

    // Verify module belongs to this course
    const { data: module } = await auth.supabase!
      .from('modules')
      .select('id')
      .eq('id', module_id)
      .eq('course_id', id)
      .single();

    if (!module) {
      return NextResponse.json({ error: 'Módulo não encontrado neste curso.' }, { status: 400 });
    }

    // Get next order_index for this module
    const { data: lastLesson } = await auth.supabase!
      .from('lessons')
      .select('order_index')
      .eq('module_id', module_id)
      .order('order_index', { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (lastLesson?.order_index ?? 0) + 1;

    const { data, error } = await auth.supabase!
      .from('lessons')
      .insert({
        module_id,
        title: String(title).trim(),
        video_url: video_url || '',
        duration_minutes: Number(duration_minutes) || 0,
        order_index: order_index ?? nextOrder,
      })
      .select('*')
      .single();

    if (error) {
      console.error('[api/admin-academy/cursos/[id]/aulas] Erro ao criar aula:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, aula: data });
  } catch (err) {
    console.error('[api/admin-academy/cursos/[id]/aulas] Erro inesperado:', err);
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAcademyAuth();
  if (auth.error) return auth.error;

  await params; // Acknowledge params but not used - lessons contain their own IDs

  try {
    const body = await req.json();
    const { lessons } = body; // Array of { id, order_index, module_id } for reordering

    if (!Array.isArray(lessons)) {
      return NextResponse.json({ error: 'Formato inválido. Envie array de aulas.' }, { status: 400 });
    }

    const updates = lessons.map((l) => 
      auth.supabase!.from('lessons')
        .update({ 
          order_index: l.order_index, 
          module_id: l.module_id,
          title: l.title,
          video_url: l.video_url,
          duration_minutes: l.duration_minutes,
        })
        .eq('id', l.id)
    );

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[api/admin-academy/cursos/[id]/aulas] Erro inesperado:', err);
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}