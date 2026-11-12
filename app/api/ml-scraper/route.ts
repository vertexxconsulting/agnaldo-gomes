import { NextRequest, NextResponse } from 'next/server';
import { fetchAndExtractMercadoLivreProduct } from '@/lib/ml-extractor';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    const extracted = await fetchAndExtractMercadoLivreProduct(targetUrl);
    return NextResponse.json({
      title: extracted.name,
      price: extracted.price,
      original_price: extracted.original_price,
      discount_pct: extracted.discount_pct,
      image: extracted.image_url,
      images: extracted.images,
      link: extracted.ml_link,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: 'Scraping failed',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
