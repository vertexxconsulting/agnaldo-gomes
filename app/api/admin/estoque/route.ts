import { NextResponse } from 'next/server';
import { requireStudioAuth } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: Request) {
  const auth = await requireStudioAuth();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const apenasAtivos = searchParams.get('apenasAtivos') === 'true';

    let query = supabaseAdmin
      .from('salon_inventory')
      .select('*')
      .order('name');

    if (apenasAtivos) {
      query = query.eq('active', true);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[api/admin/estoque GET]', error);
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
    const { id, ...payload } = body;

    if (id) {
      const { data, error } = await supabaseAdmin
        .from('salon_inventory')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('[api/admin/estoque POST update]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, id, data });
    } else {
      const { data, error } = await supabaseAdmin
        .from('salon_inventory')
        .insert(payload)
        .select('*')
        .single();

      if (error) {
        console.error('[api/admin/estoque POST insert]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, id: data?.id, data });
    }
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
      return NextResponse.json({ error: 'ID do produto é obrigatório.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('salon_inventory')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[api/admin/estoque DELETE]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

