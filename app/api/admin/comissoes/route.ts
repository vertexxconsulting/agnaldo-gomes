import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Tradutor amigável de erros do Supabase / Postgres
function traduzirErroDB(error: any): string {
  const msg = error?.message || String(error);
  if (
    msg.includes('Could not find the table') ||
    msg.includes('relation "salon_commission_rules" does not exist') ||
    error?.code === '42P01'
  ) {
    return "A tabela 'salon_commission_rules' ainda não existe no seu Supabase. Por favor, execute o script 'supabase_migration_comissoes.sql' no SQL Editor do seu painel Supabase.";
  }
  if (msg.includes('row-level security') || msg.includes('permission denied')) {
    return 'Permissão negada pelo banco de dados. Verifique as políticas de RLS ou faça login como administrador.';
  }
  return msg;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const profId = searchParams.get('professional_id');

    let query = supabaseAdmin
      .from('salon_commission_rules')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: true });

    if (profId) {
      query = query.eq('professional_id', profId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: traduzirErroDB(error) }, { status: 400 });
    }

    return NextResponse.json({ rules: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: traduzirErroDB(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, professional_id, service_id, commission_pct, active, notes } = body;

    if (!professional_id) {
      return NextResponse.json({ error: 'Profissional é obrigatório.' }, { status: 400 });
    }

    const pct = Number(commission_pct);
    if (isNaN(pct) || pct <= 0 || pct > 100) {
      return NextResponse.json({ error: 'Percentual de comissão deve estar entre 1 e 100.' }, { status: 400 });
    }

    const rowData = {
      professional_id,
      service_id: service_id || null,
      commission_pct: pct,
      active: active ?? true,
      notes: notes || null,
    };

    // 1. Se veio ID, atualiza diretamente
    if (id) {
      const { data, error } = await supabaseAdmin
        .from('salon_commission_rules')
        .update(rowData)
        .eq('id', id)
        .select('id')
        .single();

      if (error) {
        return NextResponse.json({ error: traduzirErroDB(error) }, { status: 400 });
      }
      return NextResponse.json({ success: true, id: data?.id || id });
    }

    // 2. Se não veio ID, verifica se já existe regra para este par (profissional, serviço)
    let checkQuery = supabaseAdmin
      .from('salon_commission_rules')
      .select('id')
      .eq('professional_id', professional_id);

    if (rowData.service_id) {
      checkQuery = checkQuery.eq('service_id', rowData.service_id);
    } else {
      checkQuery = checkQuery.is('service_id', null);
    }

    const { data: existing, error: checkError } = await checkQuery.maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      // Se deu erro de tabela inexistente, já traduz
      return NextResponse.json({ error: traduzirErroDB(checkError) }, { status: 400 });
    }

    if (existing?.id) {
      // Já existe uma regra para este profissional/serviço -> Atualiza
      const { data, error } = await supabaseAdmin
        .from('salon_commission_rules')
        .update(rowData)
        .eq('id', existing.id)
        .select('id')
        .single();

      if (error) {
        return NextResponse.json({ error: traduzirErroDB(error) }, { status: 400 });
      }
      return NextResponse.json({ success: true, id: data?.id || existing.id, updated: true });
    }

    // Não existe -> Insere nova regra
    const { data, error } = await supabaseAdmin
      .from('salon_commission_rules')
      .insert(rowData)
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ error: traduzirErroDB(error) }, { status: 400 });
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (err: any) {
    return NextResponse.json({ error: traduzirErroDB(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID da regra não fornecido.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('salon_commission_rules')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: traduzirErroDB(error) }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: traduzirErroDB(err) }, { status: 500 });
  }
}
