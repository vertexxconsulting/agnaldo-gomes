import { NextRequest, NextResponse } from 'next/server';
import { getLojaSettings, saveLojaSettings } from '@/lib/loja-settings';

export async function GET() {
  try {
    const settings = await getLojaSettings();
    if (!settings) {
      return NextResponse.json({ error: 'Configurações não encontradas' }, { status: 404 });
    }
    return NextResponse.json(settings);
  } catch (error: any) {
    console.error('Erro na API Loja Settings GET:', error);
    return NextResponse.json({ error: 'Erro interno ao carregar configurações' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const settings = await req.json();
    const result = await saveLojaSettings(settings);
    
    if (result.success) {
      return NextResponse.json({ success: true, message: 'Configurações salvas com sucesso!' });
    } else {
      return NextResponse.json({ error: 'Erro ao salvar configurações' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Erro na API Loja Settings POST:', error);
    return NextResponse.json({ error: 'Erro interno ao salvar configurações' }, { status: 500 });
  }
}
