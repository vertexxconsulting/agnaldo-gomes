import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Tradutor amigável de erros do Supabase / Postgres
function traduzirErroDB(error: any): string {
  const msg = error?.message || String(error);
  if (
    msg.includes('Could not find the table') ||
    msg.includes('relation "payment_fees" does not exist') ||
    error?.code === '42P01'
  ) {
    return "A tabela 'payment_fees' ainda não existe no seu Supabase. Por favor, execute o script 'supabase_migration_comissoes_produtos.sql' no SQL Editor do seu painel Supabase.";
  }
  if (msg.includes('row-level security') || msg.includes('permission denied')) {
    return 'Permissão negada pelo banco de dados. Verifique as políticas de RLS ou faça login como administrador.';
  }
  return msg;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const apenasAtivos = searchParams.get('ativos') === 'true';

    // 1. Buscar regras de taxas cadastradas
    let query = supabaseAdmin
      .from('payment_fees')
      .select('*')
      .order('active', { ascending: false })
      .order('payment_type', { ascending: true })
      .order('fee_percentage', { ascending: true });

    if (apenasAtivos) {
      query = query.eq('active', true);
    }

    const { data: taxas, error } = await query;

    if (error) {
      return NextResponse.json({ error: traduzirErroDB(error) }, { status: 400 });
    }

    // 2. Buscar configurações gerais de taxas em salon_system_settings
    let descontarTaxaComissao = true;
    try {
      const { data: settingData } = await supabaseAdmin
        .from('salon_system_settings')
        .select('value')
        .eq('key', 'descontar_taxa_cartao_comissao')
        .maybeSingle();

      if (settingData && settingData.value !== undefined) {
        descontarTaxaComissao = settingData.value === 'true' || settingData.value === true;
      }
    } catch (e) {
      console.warn('Erro ao carregar setting descontar_taxa_cartao_comissao:', e);
    }

    return NextResponse.json({
      taxas: taxas || [],
      config: {
        descontarTaxaComissao,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: traduzirErroDB(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      id,
      name,
      payment_type,
      fee_percentage,
      fee_fixed,
      days_to_receive,
      active,
    } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'O nome da regra de taxa é obrigatório.' }, { status: 400 });
    }

    const tiposValidos = ['credito', 'debito', 'pix', 'dinheiro', 'boleto'];
    if (!payment_type || !tiposValidos.includes(String(payment_type).toLowerCase())) {
      return NextResponse.json({
        error: `Tipo de pagamento inválido. Escolha entre: ${tiposValidos.join(', ')}.`,
      }, { status: 400 });
    }

    const pct = Number(fee_percentage);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      return NextResponse.json({ error: 'A porcentagem da taxa deve estar entre 0% e 100%.' }, { status: 400 });
    }

    const fixed = Number(fee_fixed ?? 0);
    if (isNaN(fixed) || fixed < 0) {
      return NextResponse.json({ error: 'A taxa fixa não pode ser negativa.' }, { status: 400 });
    }

    const days = parseInt(String(days_to_receive ?? 0), 10);
    if (isNaN(days) || days < 0) {
      return NextResponse.json({ error: 'O prazo de recebimento em dias não pode ser negativo.' }, { status: 400 });
    }

    const rowData = {
      name: name.trim(),
      payment_type: String(payment_type).toLowerCase(),
      fee_percentage: pct,
      fee_fixed: fixed,
      days_to_receive: days,
      active: active ?? true,
      updated_at: new Date().toISOString(),
    };

    // 1. Se veio ID, atualiza
    if (id) {
      const { data, error } = await supabaseAdmin
        .from('payment_fees')
        .update(rowData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        return NextResponse.json({ error: traduzirErroDB(error) }, { status: 400 });
      }
      return NextResponse.json({ success: true, taxa: data });
    }

    // 2. Se não veio ID, insere nova regra
    const { data, error } = await supabaseAdmin
      .from('payment_fees')
      .insert({
        ...rowData,
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: traduzirErroDB(error) }, { status: 400 });
    }

    return NextResponse.json({ success: true, taxa: data });
  } catch (err: any) {
    return NextResponse.json({ error: traduzirErroDB(err) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    // 1. Atualizar configuração global de desconto de taxa nas comissões
    if (body.descontarTaxaComissao !== undefined) {
      const valStr = String(Boolean(body.descontarTaxaComissao));
      const { error } = await supabaseAdmin
        .from('salon_system_settings')
        .upsert({
          key: 'descontar_taxa_cartao_comissao',
          value: valStr,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        return NextResponse.json({ error: traduzirErroDB(error) }, { status: 400 });
      }

      return NextResponse.json({ success: true, descontarTaxaComissao: Boolean(body.descontarTaxaComissao) });
    }

    // 2. Alternar status ativo/inativo de uma regra individual
    if (body.id && body.active !== undefined) {
      const { data, error } = await supabaseAdmin
        .from('payment_fees')
        .update({
          active: Boolean(body.active),
          updated_at: new Date().toISOString(),
        })
        .eq('id', body.id)
        .select('*')
        .single();

      if (error) {
        return NextResponse.json({ error: traduzirErroDB(error) }, { status: 400 });
      }

      return NextResponse.json({ success: true, taxa: data });
    }

    return NextResponse.json({ error: 'Parâmetros inválidos para atualização.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: traduzirErroDB(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID da regra de taxa é obrigatório.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('payment_fees')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: traduzirErroDB(error) }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Regra de taxa excluída com sucesso.' });
  } catch (err: any) {
    return NextResponse.json({ error: traduzirErroDB(err) }, { status: 500 });
  }
}
