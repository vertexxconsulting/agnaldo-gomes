import { NextResponse } from 'next/server';
import { requireStudioAuth } from '@/lib/api-auth';

export async function GET() {
  const auth = await requireStudioAuth();
  if (auth.error) return auth.error;

  try {
    const { data, error } = await auth.supabase!
      .from('salon_professionals')
      .select('*')
      .order('name');

    if (error) {
      console.error('[api/profissionais] Erro ao buscar profissionais:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erro interno' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireStudioAuth();
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { id, nome, foto_url, especialidades, ativo, jornada_semanal } = body;

    if (!nome) {
      return NextResponse.json({ error: 'Nome do profissional é obrigatório.' }, { status: 400 });
    }

    const payload: any = {
      name: String(nome).trim(),
      photo_url: foto_url || null,
      specialties: Array.isArray(especialidades) ? especialidades : [],
      active: ativo ?? true,
      weekly_schedule: jornada_semanal || {},
    };

    const isUUID = id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (isUUID) {
      const { data, error } = await auth.supabase!
        .from('salon_professionals')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('[api/profissionais] Erro ao atualizar profissional:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, profissional: data });
    } else {
      const { data, error } = await auth.supabase!
        .from('salon_professionals')
        .insert(payload)
        .select('*')
        .single();

      if (error) {
        console.error('[api/profissionais] Erro ao criar profissional:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, profissional: data });
    }
  } catch (err: any) {
    console.error('[api/profissionais] Erro inesperado:', err);
    return NextResponse.json({ error: err?.message || 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireStudioAuth();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do profissional é obrigatório.' }, { status: 400 });
    }

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUUID) {
      return NextResponse.json({ success: true, message: 'Mock id ignorado' });
    }

    // 1. Remove vínculos
    await auth.supabase!.from('salon_professional_services').delete().eq('professional_id', id);

    // 2. Remove o profissional
    const { error } = await auth.supabase!
      .from('salon_professionals')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[api/profissionais] Erro ao excluir profissional:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[api/profissionais] Erro inesperado ao excluir profissional:', err);
    return NextResponse.json({ error: err?.message || 'Erro interno' }, { status: 500 });
  }
}