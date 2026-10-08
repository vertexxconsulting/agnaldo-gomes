import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { buscarClientePorTelefone } from '@/lib/crm-sync';

function validateOrigin(req: Request): boolean {
  const origin = req.headers.get('origin') || req.headers.get('referer') || '';
  if (!origin) return true; // Requisição interna/direta da aplicação
  return (
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    origin.includes('agnaldogomes.com') ||
    origin.includes('vercel.app')
  );
}

export async function POST(req: Request) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'Origem não permitida' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { telefone } = body || {};

    if (!telefone || typeof telefone !== 'string') {
      return NextResponse.json({ found: false, error: 'Telefone não informado' }, { status: 400 });
    }

    const clean = telefone.replace(/\D/g, '');
    if (clean.length < 10) {
      return NextResponse.json({ found: false, error: 'Telefone incompleto' }, { status: 400 });
    }

    const supabase = await getSupabaseServiceClient();
    if (!supabase) {
      console.warn('[verificar-cliente] Supabase service client indisponível.');
      return NextResponse.json({ found: false });
    }

    const cliente = await buscarClientePorTelefone(supabase, clean);

    if (cliente) {
      return NextResponse.json({
        found: true,
        cliente: {
          id: cliente.id,
          nome: cliente.name,
          telefone: cliente.phone,
          email: cliente.email || '',
          cpf: cliente.cpf || '',
          endereco: cliente.address || '',
        }
      });
    }

    return NextResponse.json({ found: false });
  } catch (err: any) {
    console.error('[verificar-cliente] Erro ao verificar telefone:', err);
    return NextResponse.json({ found: false, error: err?.message || 'Erro interno' }, { status: 500 });
  }
}
