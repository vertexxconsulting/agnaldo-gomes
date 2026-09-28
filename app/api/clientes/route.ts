import { NextResponse } from 'next/server';
import { upsertClienteMae } from '@/lib/crm-sync';
import { requireStudioAuth } from '@/lib/api-auth';

export async function GET() {
  const auth = await requireStudioAuth();
  if (auth.error) return auth.error;

  try {
    const { data, error } = await auth.supabase!
      .from('salon_customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[api/clientes] Erro ao buscar clientes:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
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
    const { id, nome, telefone, email, nascimento, observacoes } = body;

    if (!nome || !telefone) {
      return NextResponse.json({ error: 'Nome e Telefone são obrigatórios.' }, { status: 400 });
    }

    const clienteSalvo = await upsertClienteMae({
      id,
      nome,
      telefone,
      email,
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