import { NextRequest, NextResponse } from 'next/server';
import { fetchAndExtractMercadoLivreProduct } from '@/lib/ml-extractor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body ?? {};

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL do Mercado Livre é obrigatória.' },
        { status: 400 }
      );
    }

    const trimmed = url.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
      return NextResponse.json(
        { error: 'Informe uma URL válida iniciando com http:// ou https://' },
        { status: 400 }
      );
    }

    const extracted = await fetchAndExtractMercadoLivreProduct(trimmed);

    if (!extracted.name && !extracted.image_url && extracted.price <= 0) {
      return NextResponse.json(
        {
          error:
            'Não foi possível extrair os dados deste link do Mercado Livre. Tente outro link ou preencha manualmente.',
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      product: extracted,
      data: extracted,
      message: extracted.original_price
        ? `Dados e promoção (${extracted.discount_pct ?? ''}% OFF) extraídos com sucesso!`
        : 'Dados extraídos com sucesso!',
    });
  } catch (error) {
    console.error('[ML Extract Error]', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Erro interno ao processar link do Mercado Livre.',
      },
      { status: 500 }
    );
  }
}
