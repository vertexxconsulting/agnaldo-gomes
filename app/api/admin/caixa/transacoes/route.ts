import { NextResponse } from 'next/server';
import { requireStudioAuth } from '@/lib/api-auth';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const auth = await requireStudioAuth();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const caixaId = searchParams.get('caixa_id');

    if (!caixaId) {
      return NextResponse.json({ error: 'caixa_id é obrigatório.' }, { status: 400 });
    }

    const supabase = await getSupabaseServiceClient();

    const { data: transacoes, error } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('caixa_id', caixaId)
      .order('transaction_date', { ascending: false });

    if (error) {
      console.error('[api/admin/caixa/transacoes] Erro ao buscar transações:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ transacoes: transacoes || [] });
  } catch (err: any) {
    console.error('[api/admin/caixa/transacoes] Erro no GET:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireStudioAuth();
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const {
      caixa_id,
      type,
      category,
      description,
      amount,
      payment_method = 'DINHEIRO',
      status = 'PAID',
    } = body;

    if (!caixa_id || !type || !description || amount == null) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: caixa_id, type, description, amount.' },
        { status: 400 }
      );
    }

    const valorNum = parseFloat(String(amount).replace(',', '.'));
    if (isNaN(valorNum) || valorNum <= 0) {
      return NextResponse.json({ error: 'Valor da transação inválido.' }, { status: 400 });
    }

    const supabase = await getSupabaseServiceClient();

    const { data, error } = await supabase
      .from('financial_transactions')
      .insert([
        {
          caixa_id,
          type,
          category: category || 'OTHER',
          description,
          amount: valorNum,
          payment_method,
          status,
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('[api/admin/caixa/transacoes] Erro ao lançar transação:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, transacao: data });
  } catch (err: any) {
    console.error('[api/admin/caixa/transacoes] Erro no POST:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
