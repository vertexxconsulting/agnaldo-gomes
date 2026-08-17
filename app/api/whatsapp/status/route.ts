import { NextResponse } from 'next/server';

const API_URL = process.env.EVOLUTION_API_URL;
const API_KEY = process.env.EVOLUTION_API_KEY;

const PROTECTION_KEY = process.env.WHATSAPP_WEBHOOK_KEY;

function checkAuth(request: Request) {
  if (PROTECTION_KEY) {
    const provided = request.headers.get('x-api-key');
    if (provided !== PROTECTION_KEY) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const authError = checkAuth(request);
    if (authError) return authError;

    if (!API_URL || !API_KEY) {
      return NextResponse.json({ error: 'Evolution API não configurada no .env' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const instanceName = searchParams.get('instanceName');

    if (!instanceName) {
      return NextResponse.json({ error: 'Nome da instância é obrigatório' }, { status: 400 });
    }

    // Tentar pegar o status da conexão
    const statusResponse = await fetch(`${API_URL}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': API_KEY,
      },
    });

    if (!statusResponse.ok) {
      if (statusResponse.status === 404) {
        return NextResponse.json({ state: 'not_found' });
      }
      const data = await statusResponse.json();
      return NextResponse.json({ error: data.response?.message || 'Erro ao buscar status' }, { status: statusResponse.status });
    }

    const statusData = await statusResponse.json();
    const state = statusData.instance?.state || 'unknown';

    let qrcodeBase64 = null;

    // Se estiver conectando e aguardando ler QR code, podemos tentar pegar o QR code
    if (state === 'connecting') {
      try {
        const qrResponse = await fetch(`${API_URL}/instance/connect/${instanceName}`, {
          method: 'GET',
          headers: {
            'apikey': API_KEY,
          },
        });
        
        if (qrResponse.ok) {
          const qrData = await qrResponse.json();
          qrcodeBase64 = qrData.base64 || null;
        }
      } catch (e) {
        console.error('Erro ao buscar QR code:', e);
      }
    }

    return NextResponse.json({
      state,
      qrcodeBase64
    });

  } catch (error) {
    console.error('Erro no GET /api/whatsapp/status:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
