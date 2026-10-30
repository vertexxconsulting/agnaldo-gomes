import { NextResponse } from 'next/server';
import { getMarketingConfig, saveMarketingConfig } from '@/lib/marketing-control';

export async function GET() {
  try {
    const config = await getMarketingConfig();
    return NextResponse.json({ ok: true, config });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
    }

    const res = await saveMarketingConfig(body);
    if (!res.ok) {
      return NextResponse.json({ error: res.error || 'Erro ao salvar configurações' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: 'Configurações de automação salvas com sucesso!' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

