import { NextResponse } from 'next/server';

const API_URL = process.env.EVOLUTION_API_URL;
const API_KEY = process.env.EVOLUTION_API_KEY;

// Chave opcional de proteção para evitar uso não autorizado
const PROTECTION_KEY = process.env.WHATSAPP_WEBHOOK_KEY;

function checkAuth(request: Request) {
  // Se PROTECTION_KEY estiver configurada, requer header x-api-key
  if (PROTECTION_KEY) {
    const provided = request.headers.get('x-api-key');
    if (provided !== PROTECTION_KEY) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const authError = checkAuth(request);
    if (authError) return authError;

    if (!API_URL || !API_KEY) {
      return NextResponse.json({ error: 'Evolution API não configurada no .env' }, { status: 500 });
    }

    const { instanceName } = await request.json();

    if (!instanceName) {
      return NextResponse.json({ error: 'Nome da instância é obrigatório' }, { status: 400 });
    }

    const response = await fetch(`${API_URL}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': API_KEY,
      },
      body: JSON.stringify({
        instanceName: instanceName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.response?.message || 'Erro ao criar instância' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Erro no POST /api/whatsapp/instance:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
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

    // Primeiro faz logout
    await fetch(`${API_URL}/instance/logout/${instanceName}`, {
      method: 'DELETE',
      headers: {
        'apikey': API_KEY,
      },
    });

    // Depois deleta a instância
    const response = await fetch(`${API_URL}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers: {
        'apikey': API_KEY,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.response?.message || 'Erro ao deletar instância' }, { status: response.status });
    }

    return NextResponse.json({ success: true, message: 'Instância deletada com sucesso' });
  } catch (error) {
    console.error('Erro no DELETE /api/whatsapp/instance:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
