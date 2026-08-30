import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await getSupabaseServiceClient();
    const { data, error } = await supabase
      .from('salon_services')
      .select('*')
      .order('name');

    if (error) {
      console.error('[api/servicos] Erro ao buscar serviços:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erro interno' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, nome, categoria, duracao_min, preco, ativo, visivel_app } = body;

    if (!nome || preco === undefined) {
      return NextResponse.json({ error: 'Nome e Preço são obrigatórios.' }, { status: 400 });
    }

    const supabase = await getSupabaseServiceClient();
    const payload: any = {
      name: String(nome).trim(),
      category: String(categoria || 'Geral').trim(),
      duration_minutes: Number(duracao_min) || 60,
      price: Number(preco),
      active: ativo ?? true,
      visible_in_app: visivel_app ?? true,
    };

    const isUUID = id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (isUUID) {
      const { data, error } = await supabase
        .from('salon_services')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('[api/servicos] Erro ao atualizar serviço:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, servico: data });
    } else {
      const { data, error } = await supabase
        .from('salon_services')
        .insert(payload)
        .select('*')
        .single();

      if (error) {
        console.error('[api/servicos] Erro ao criar serviço:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, servico: data });
    }
  } catch (err: any) {
    console.error('[api/servicos] Erro inesperado:', err);
    return NextResponse.json({ error: err?.message || 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do serviço é obrigatório.' }, { status: 400 });
    }

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUUID) {
      return NextResponse.json({ success: true, message: 'Mock id ignorado' });
    }

    const supabase = await getSupabaseServiceClient();

    // 1. Remove vínculos primeiro
    await supabase.from('salon_professional_services').delete().eq('service_id', id);

    // 2. Remove o serviço
    const { error } = await supabase
      .from('salon_services')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[api/servicos] Erro ao excluir serviço:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[api/servicos] Erro inesperado ao excluir serviço:', err);
    return NextResponse.json({ error: err?.message || 'Erro interno' }, { status: 500 });
  }
}
