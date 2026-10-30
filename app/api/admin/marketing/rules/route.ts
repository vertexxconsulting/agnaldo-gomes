import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/api-auth';

const ALLOWED_STAFF_ROLES = ['studio_admin', 'studio_secretaria', 'academy_admin', 'loja_admin'] as const;

export async function GET(req: Request) {
  const auth = await requireAuth([...ALLOWED_STAFF_ROLES]);
  if (auth.error) return auth.error;

  try {
    const supabase = await getSupabaseServiceClient();
    const { data, error } = await supabase
      .from('salon_marketing_rules')
      .select('*, service:salon_services(name)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[api/admin/marketing/rules GET]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth([...ALLOWED_STAFF_ROLES]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const supabase = await getSupabaseServiceClient();

    const { data, error } = await supabase
      .from('salon_marketing_rules')
      .insert(body)
      .select('*')
      .single();

    if (error) {
      console.error('[api/admin/marketing/rules POST]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await requireAuth([...ALLOWED_STAFF_ROLES]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { id, ...payload } = body;
    if (!id) {
      return NextResponse.json({ error: 'ID da regra é obrigatório' }, { status: 400 });
    }

    const supabase = await getSupabaseServiceClient();
    const { data, error } = await supabase
      .from('salon_marketing_rules')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('[api/admin/marketing/rules PUT]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAuth([...ALLOWED_STAFF_ROLES]);
  if (auth.error) return auth.error;

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID da regra é obrigatório' }, { status: 400 });
    }

    const supabase = await getSupabaseServiceClient();
    const { error } = await supabase
      .from('salon_marketing_rules')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[api/admin/marketing/rules DELETE]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
