import { NextResponse } from 'next/server';
import { hojeBRT } from '@/lib/cron-auth';
import { registrarDisparoHoje } from '@/lib/marketing-control';

export async function POST(req: Request) {
  try {
    const { chaveUnica, dataISO } = await req.json();
    if (!chaveUnica) {
      return NextResponse.json({ error: 'chaveUnica é obrigatória' }, { status: 400 });
    }
    const data = dataISO || hojeBRT();
    await registrarDisparoHoje(chaveUnica, data);
    return NextResponse.json({ ok: true, chaveUnica, data });
  } catch (err: any) {
    console.error('[registrar-disparo]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

