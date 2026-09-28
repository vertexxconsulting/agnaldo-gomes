import { NextRequest, NextResponse } from 'next/server';
import { getVimeoSettings, saveVimeoSettings } from '@/lib/vimeo-settings';

export async function GET() {
  try {
    const settings = await getVimeoSettings();
    if (!settings) {
      return NextResponse.json({ error: 'Configurações não encontradas' }, { status: 404 });
    }

    // BLINDAGEM: Mascarar credenciais antes de enviar para o front-end
    const maskedSettings = {
      ...settings,
      client_id: settings.client_id ? 'Configurado' : null,
      client_secret: settings.client_secret ? '••••••••••••' : null,
      access_token: settings.access_token ? '••••••••••••' : null,
    };

    return NextResponse.json(maskedSettings);
  } catch (error: any) {
    console.error('Erro na API Vimeo GET:', error);
    return NextResponse.json({ error: 'Erro interno ao carregar configurações' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const settings = await req.json();
    const result = await saveVimeoSettings(settings);
    
    if (result.ok) {
      return NextResponse.json({ success: true, message: result.msg });
    } else {
      return NextResponse.json({ error: result.msg }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Erro na API Vimeo POST:', error);
    return NextResponse.json({ error: 'Erro interno ao salvar configurações' }, { status: 500 });
  }
}
