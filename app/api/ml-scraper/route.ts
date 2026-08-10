import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
      next: { revalidate: 3600 } // Cache for 1 hour to avoid being blocked
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();

    // Regex simples para capturar tags og:title, og:image e meta price (se existir)
    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i);
    const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
    
    // Tentativa de pegar o preço no Mercado Livre (tem uma tag específica)
    // <meta itemprop="price" content="249.9">
    const priceMatch = html.match(/<meta itemprop="price" content="([^"]+)"/i);

    let title = titleMatch ? titleMatch[1] : '';
    const image = imageMatch ? imageMatch[1] : '';
    const price = priceMatch ? priceMatch[1] : '';

    // Limpar o " | MercadoLivre" do final do título, caso tenha
    if (title) {
      title = title.replace(/\s*\|\s*Mercado\s*Livre\s*$/i, '');
      title = title.replace(/\s*-\s*Frete grátis\s*$/i, ''); // Tentar limpar mais sugeiras
    }

    // Se o ML retornar a imagem em tamanho muito pequeno ou grande, tentamos manter o formato .webp
    // ML OG image is usually good quality.

    return NextResponse.json({
      title,
      image,
      price: price ? parseFloat(price) : null,
      success: true,
    });
  } catch (error) {
    console.error('Scraper Error:', error);
    return NextResponse.json(
      { error: 'Failed to scrape the provided URL. The site might be blocking the request.' },
      { status: 500 }
    );
  }
}
