import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Status do Bunny Stream
// 0: Queued, 1: Processing, 2: Encoding, 3: Finished, 4: Resolution Finished, 5: Failed
const STATUS_DESCRICAO: Record<number, string> = {
  0: 'Na Fila',
  1: 'Processando',
  2: 'Codificando',
  3: 'Concluído (Pronto)',
  4: 'Resoluções Geradas',
  5: 'Falha na Codificação',
  6: 'Upload Iniciado',
  7: 'Falha no Upload',
  8: 'Upload Concluído'
};

export async function GET() {
  return NextResponse.json({
    status: 'online',
    service: 'Bunny.net Stream Webhook Receiver',
    timestamp: new Date().toISOString()
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const videoGuid = body.VideoGuid || body.videoGuid || body.guid;
    const libraryId = body.VideoLibraryId || body.videoLibraryId;
    const status = body.Status ?? body.status;
    const durationSec = Number(body.Duration ?? body.duration ?? 0);
    const title = body.Title || body.title || '';

    console.log(`[Bunny Webhook] Vídeo ${videoGuid} | Status: ${status} (${STATUS_DESCRICAO[status] || 'Desconhecido'}) | Duração: ${durationSec}s`);

    if (!videoGuid) {
      return NextResponse.json({ error: 'VideoGuid ausente' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Se o vídeo foi concluído (Status 3 ou 4) e tem duração informada
    if ((status === 3 || status === 4) && durationSec > 0) {
      const duracaoMinutos = Math.max(1, Math.round(durationSec / 60));

      // Busca aulas que utilizam este vídeo (pelo GUID ou link)
      const { data: aulas, error: searchError } = await supabaseAdmin
        .from('lessons')
        .select('id, title, duration_minutes, video_url')
        .ilike('video_url', `%${videoGuid}%`);

      if (!searchError && aulas && aulas.length > 0) {
        for (const aula of aulas) {
          // Atualiza a duração na aula caso esteja zerada ou vazia
          if (!aula.duration_minutes || aula.duration_minutes === 0) {
            await supabaseAdmin
              .from('lessons')
              .update({ duration_minutes: duracaoMinutos })
              .eq('id', aula.id);

            console.log(`[Bunny Webhook] Duração da aula "${aula.title}" atualizada para ${duracaoMinutos} min.`);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      received: {
        videoGuid,
        status: STATUS_DESCRICAO[status] || status,
        durationSeconds: durationSec
      }
    });

  } catch (error: any) {
    console.error('[Bunny Webhook] Erro ao processar webhook:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar webhook', details: error.message },
      { status: 500 }
    );
  }
}

