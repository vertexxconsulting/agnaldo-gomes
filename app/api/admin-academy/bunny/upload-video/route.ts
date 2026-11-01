import { NextRequest, NextResponse } from 'next/server';
import { requireAcademyAuth } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAcademyAuth();
    if (!admin) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const guid = formData.get('guid') as string;
    const libraryId = formData.get('libraryId') as string;

    if (!file || !guid || !libraryId) {
      return NextResponse.json({ error: 'Dados incompletos para upload' }, { status: 400 });
    }

    const apiKey = process.env.BUNNY_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Bunny.net não configurado nas variáveis de ambiente' }, { status: 500 });
    }

    const response = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/${guid}`, {
      method: 'PUT',
      headers: {
        'AccessKey': apiKey,
        'Content-Type': 'application/octet-stream',
      },
      body: file,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Bunny Upload Error:', errText);
      return NextResponse.json({ error: 'Erro ao fazer upload para o Bunny: ' + errText }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      videoUrl: `https://iframe.mediadelivery.net/embed/${libraryId}/${guid}`,
    });
  } catch (error: any) {
    console.error('Erro no upload Bunny:', error);
    return NextResponse.json({ error: 'Erro interno no upload de vídeo' }, { status: 500 });
  }
}
