import { NextResponse } from 'next/server';
import { requireStudioAuth } from '@/lib/api-auth';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const auth = await requireStudioAuth();
  if (auth.error) return auth.error;

  try {
    const supabase = await getSupabaseServiceClient();
    
    // Busca o caixa aberto mais recente
    const { data: caixas, error } = await supabase
      .from('caixa_diario')
      .select('*')
      .eq('status', 'OPEN')
      .order('opened_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('[api/admin/caixa] Erro ao buscar caixa aberto:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const caixaAberto = caixas && caixas.length > 0 ? caixas[0] : null;
    return NextResponse.json({ caixa: caixaAberto });
  } catch (err: any) {
    console.error('[api/admin/caixa] Erro inesperado no GET:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireStudioAuth();
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { opening_balance = 0, notes = '' } = body;

    const valorNum = parseFloat(String(opening_balance).replace(',', '.'));
    if (isNaN(valorNum) || valorNum < 0) {
      return NextResponse.json({ error: 'Informe um valor de abertura válido.' }, { status: 400 });
    }

    const supabase = await getSupabaseServiceClient();

    // Verifica se já existe um caixa aberto
    const { data: caixasAbertos } = await supabase
      .from('caixa_diario')
      .select('id')
      .eq('status', 'OPEN')
      .limit(1);

    if (caixasAbertos && caixasAbertos.length > 0) {
      return NextResponse.json(
        { error: 'Já existe um caixa aberto no momento. Feche-o antes de abrir um novo.' },
        { status: 400 }
      );
    }

    const userName = auth.user?.email || 'Administrador';

    const { data, error } = await supabase
      .from('caixa_diario')
      .insert([
        {
          opening_balance: valorNum,
          status: 'OPEN',
          opened_by: userName,
          notes: notes || null,
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('[api/admin/caixa] Erro ao abrir caixa:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, caixa: data });
  } catch (err: any) {
    console.error('[api/admin/caixa] Erro inesperado no POST:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await requireStudioAuth();
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { id, closing_balance = 0, notes = '' } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID do caixa é obrigatório.' }, { status: 400 });
    }

    const supabase = await getSupabaseServiceClient();

    const { data, error } = await supabase
      .from('caixa_diario')
      .update({
        status: 'CLOSED',
        closed_at: new Date().toISOString(),
        closing_balance: Number(closing_balance),
        notes: notes || undefined,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[api/admin/caixa] Erro ao fechar caixa:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, caixa: data });
  } catch (err: any) {
    console.error('[api/admin/caixa] Erro inesperado no PUT:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
