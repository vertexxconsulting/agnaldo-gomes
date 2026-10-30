import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { instance } = await request.json();
    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;

    if (!apiUrl || !apiKey) {
      return NextResponse.json({ error: 'Evolution API não configurada no .env' }, { status: 400 });
    }

    const instanceName = instance || process.env.EVOLUTION_INSTANCE || 'agnaldo';

    const res = await fetch(`${apiUrl.replace(/\/$/, '')}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
      },
    });

    if (res.status === 404) {
      // Instância não existe ainda, mas a API está online!
      return NextResponse.json({ ok: true, state: 'not_found', message: 'API online, instância pronta para criação' });
    }

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `Evolution ${res.status}: ${errText}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ ok: true, state: data.instance?.state || 'unknown', data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao conectar à Evolution API' }, { status: 500 });
  }
}

