import { NextResponse } from 'next/server';
import { requireStudioAuth } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  const auth = await requireStudioAuth();
  if (auth.error) return auth.error;

  try {
    const { data, error } = await supabaseAdmin
      .from('salon_schedule_blocks')
      .select('*')
      .order('start_time');

    if (error) {
      console.error('[api/agendamentos/bloqueios GET]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireStudioAuth();
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { professional_id, start_time, end_time, reason } = body;

    if (!professional_id || !start_time || !end_time) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('salon_schedule_blocks')
      .insert({
        professional_id,
        start_time,
        end_time,
        reason: reason || null,
      })
      .select('*')
      .single();

    if (error) {
      console.error('[api/agendamentos/bloqueios POST]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireStudioAuth();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do bloqueio é obrigatório.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('salon_schedule_blocks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[api/agendamentos/bloqueios DELETE]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

