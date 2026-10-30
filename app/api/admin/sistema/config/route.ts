import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    instance: process.env.EVOLUTION_INSTANCE || 'agnaldo',
    apiUrl: process.env.EVOLUTION_API_URL ? 'Configurada' : '',
  });
}

export async function POST(request: Request) {
  try {
    const { instance } = await request.json();
    return NextResponse.json({ ok: true, instance: instance || 'agnaldo' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

