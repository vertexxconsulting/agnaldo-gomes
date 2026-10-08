import { NextResponse } from 'next/server';
import { upsertClienteMae } from '@/lib/crm-sync';
import { requireStudioAuth } from '@/lib/api-auth';

export async function GET(req: Request) {
  const auth = await requireStudioAuth();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search');

  try {
    const supabase = auth.supabase!;

    if (search && search.trim()) {
      const termo = search.trim();
      const cleanPhone = termo.replace(/\D/g, '');
      let query = supabase.from('salon_customers').select('*');
      if (cleanPhone.length >= 4) {
        query = query.or(`name.ilike.%${termo}%,phone.ilike.%${cleanPhone}%,cpf.ilike.%${termo}%`);
      } else {
        query = query.ilike('name', `%${termo}%`);
      }
      const { data, error } = await query.order('name').limit(100);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data || []);
    }

    // Conta o total de clientes para buscar as páginas concorrentemente
    const { count, error: countErr } = await supabase
      .from('salon_customers')
      .select('*', { count: 'exact', head: true });

    if (countErr) {
      console.error('[api/clientes] Erro ao contar clientes:', countErr);
      return NextResponse.json({ error: countErr.message }, { status: 500 });
    }

    const total = count || 0;
    const pages = Math.ceil(total / 1000);

    const promises = Array.from({ length: pages }, (_, i) => {
      const from = i * 1000;
      return supabase
        .from('salon_customers')
        .select('*')
        .order('name')
        .range(from, from + 999);
    });

    const results = await Promise.all(promises);
    
    let all: any[] = [];
    for (const res of results) {
      if (res.error) {
        console.error('[api/clientes] Erro em um dos lotes:', res.error);
      } else {
        all = all.concat(res.data || []);
      }
    }

    return NextResponse.json(all);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireStudioAuth();
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { id, codigo, nome, telefone, email, cpf, endereco, nascimento, observacoes } = body;

    if (!nome || !telefone) {
      return NextResponse.json({ error: 'Nome e Telefone são obrigatórios.' }, { status: 400 });
    }

    const clienteSalvo = await upsertClienteMae({
      id,
      codigo: codigo ? parseInt(codigo, 10) : undefined,
      nome,
      telefone,
      email,
      cpf,
      endereco,
      nascimento,
      observacoes,
    });

    return NextResponse.json({ success: true, cliente: clienteSalvo });
  } catch (err) {
    console.error('[api/clientes] Erro ao salvar cliente no sistema mãe:', err);
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireStudioAuth();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do cliente é obrigatório.' }, { status: 400 });
    }

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUUID) {
      return NextResponse.json({ success: true, message: 'Mock id ignorado' });
    }

    const supabase = auth.supabase!;

    // 1. Excluir agendamentos do cliente para evitar violação de FK
    const { error: agError } = await supabase
      .from('salon_appointments')
      .delete()
      .eq('customer_id', id);

    if (agError) {
      console.error('[api/clientes] Erro ao excluir agendamentos do cliente:', agError);
      return NextResponse.json({ error: `Erro ao remover agendamentos vinculados: ${agError.message}` }, { status: 500 });
    }

    // 2. Excluir o cliente
    const { error } = await supabase
      .from('salon_customers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[api/clientes] Erro ao excluir cliente:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[api/clientes] Erro inesperado ao excluir:', err);
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}