import { NextRequest, NextResponse } from 'next/server';
import { requireAcademyAuth } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAcademyAuth();
    if (!admin) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { title } = await req.json();

    const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
    const apiKey = process.env.BUNNY_API_KEY;

    if (!libraryId || !apiKey) {
      return NextResponse.json({ error: 'Integração Bunny não configurada nas variáveis de ambiente' }, { status: 400 });
    }

    const options = {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        AccessKey: apiKey
      },
      body: JSON.stringify({ title: title || 'Novo Vídeo Academy' })
    };

    const response = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos`, options);
    
    if (!response.ok) {
      const errText = await response.text();
      console.error('Bunny API Error:', errText);
      return NextResponse.json({ error: 'Erro ao criar vídeo no Bunny: ' + errText }, { status: response.status });
    }

    const data = await response.json();
    
    // Retornamos os dados incluindo a apiKey temporariamente para o upload via frontend (admin)
    return NextResponse.json({ 
      guid: data.guid,
      libraryId,
      apiKey
    });

  } catch (error: any) {
    console.error('Erro na API Bunny Create Video:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
