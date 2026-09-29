import { NextResponse } from 'next/server';

interface MLProductData {
  title?: string;
  description?: string;
  price?: number | null;
  currency?: string;
  image?: string;
  thumbnail?: string;
  pictures?: Array<{ url: string }>;
  images?: string[];
  name?: string;
  offers?: { price?: string | number; priceCurrency?: string; availability?: string };
  item?: MLProductData;
  product?: MLProductData;
  data?: { item?: MLProductData };
  priceMetadata?: { amount?: number };
  [key: string]: unknown;
}

interface ExtractedProduct {
  name: string;
  description: string;
  price: number | null;
  image_url: string;
  images: string[];
  ml_link: string;
  category: string;
  ml_id: string;
  raw_data: MLProductData;
}

/**
 * Extrai ID do produto Mercado Livre de várias URLs possíveis
 * Exemplos suportados:
 * - https://produto.mercadolivre.com.br/MLB-1234567890
 * - https://produto.mercadolivre.com.br/MLB-1234567890-nome-do-produto
 * - https://www.mercadolivre.com.br/produto-1234567890
 * - https://produto.mercadolivre.com.br/MLB-1234567890?_tm=12345
 * - https://mercadolivre.com.br/MLB-1234567890
 */
function extractMLId(url: string): string | null {
  try {
    // Normaliza a URL
    const cleanUrl = url.trim();
    
    // Padrão principal: MLB-XXXXXXXXXX ou MLBXXXXXXXXXX
    const mainPattern = /MLB-?\d{8,12}/i;
    const match = cleanUrl.match(mainPattern);
    if (match) {
      let id = match[0].toUpperCase();
      if (!id.includes('-')) id = id.replace('MLB', 'MLB-');
      return id;
    }
    
    // Padrão alternativo: apenas números no path
    const altPattern = /mercadolivre\.com\.br\/p\/MLB(\d{8,12})/i;
    const altMatch = cleanUrl.match(altPattern);
    if (altMatch) return `MLB-${altMatch[1]}`;

    const altPattern2 = /mercadolivre\.com\.br\/(\d{8,12})/i;
    const altMatch2 = cleanUrl.match(altPattern2);
    if (altMatch2) return `MLB-${altMatch2[1]}`;
    
    // Padrão: produto/MLB-XXXXXXXXXX
    const produtoPattern = /produto\/MLB-?\d{8,12}/i;
    const produtoMatch = cleanUrl.match(produtoPattern);
    if (produtoMatch) {
      let id = produtoMatch[0].replace(/produto\//i, '').toUpperCase();
      if (!id.includes('-')) id = id.replace('MLB', 'MLB-');
      return id;
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Busca dados do produto via API pública do Mercado Livre
 * Usa a API oficial não autenticada (limitada)
 */
async function fetchFromMLAPI(mlId: string): Promise<MLProductData | null> {
  const url = `https://api.mercadolibre.com/items/${mlId}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AgnaldoGomes-Store/1.0',
      },
      // Timeout de 10 segundos
      signal: AbortSignal.timeout(10000),
    });
    
    if (!response.ok) {
      throw new Error(`ML API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data as MLProductData;
  } catch (error) {
    console.warn('[ML Extract] API oficial falhou, tentando scraping:', error);
    return null;
  }
}

/**
 * Fallback: scraping da página do produto
 */
async function scrapeMLProduct(mlId: string, htmlStr?: string, originalUrl?: string): Promise<MLProductData | null> {
  const url = originalUrl || `https://produto.mercadolivre.com.br/${mlId}`;
  let html = htmlStr || '';
  
  try {
    if (!html) {
      const response = await fetch(url, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        },
        signal: AbortSignal.timeout(15000),
      });
      
      if (!response.ok) {
        throw new Error(`Scraping error: ${response.status}`);
      }
      
      html = await response.text();
    }
    
    const data: MLProductData = { mlId, price: null, images: [] };
    
    // 1. Extração do PREÇO EXATO da Buy Box principal
    // No Mercado Livre, o preço principal com desconto fica em <div class="ui-pdp-price__second-line">
    // ou diretamente no primeiro meta tag do produto.
    const fractionMatch = html.match(/<span[^>]*class="[^"]*andes-money-amount__fraction[^"]*"[^>]*>([^<]+)<\/span>/i);
    const centsMatch = html.match(/<span[^>]*class="[^"]*andes-money-amount__cents[^"]*"[^>]*>([^<]+)<\/span>/i);
    
    if (fractionMatch) {
       const fraction = fractionMatch[1].replace(/\D/g, ''); // 503
       const cents = centsMatch ? centsMatch[1].replace(/\D/g, '') : '00'; // 13
       data.price = parseFloat(`${fraction}.${cents}`);
    } else {
       // Tenta meta tag se não achar os spans
       const metaPrice = html.match(/<meta[^>]+(?:itemprop="price"|property="product:price:amount")[^>]+content="([0-9.]+)"/i) || 
                         html.match(/<meta[^>]+content="([0-9.]+)"[^>]+(?:itemprop="price"|property="product:price:amount")/i);
       if (metaPrice) data.price = parseFloat(metaPrice[1]);
    }

    // 2. Extrai título
    const titleMatch = html.match(/<h1 class="ui-pdp-title">([^<]+)<\/h1>/i) || 
                       html.match(/<meta property="og:title" content="([^"]+)"/i);
    if (titleMatch) data.title = titleMatch[1].replace(' | Mercado Livre', '').trim();

    // 3. Extrai imagens (Galeria completa)
    // Procuramos pelas imagens de alta resolução no array de imagens (ui-pdp-gallery)
    const galleryMatches = html.matchAll(/data-zoom="([^"]+)"/gi);
    const zoomImages = Array.from(galleryMatches).map(m => m[1]);
    
    if (zoomImages.length > 0) {
      data.images = [...new Set(zoomImages)].slice(0, 10);
      data.image = data.images[0];
    } else {
      // Fallback para og:image e regex de imagens
      const imgMatches = html.matchAll(/"url"\s*:\s*"([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi);
      const images = Array.from(imgMatches).map(m => m[1]).filter(url => !url.includes('svg')).filter((v, i, a) => a.indexOf(v) === i);
      if (images.length > 0) {
        // Tenta pegar a versão maior das imagens
        data.images = images.slice(0, 10);
        data.image = data.images[0];
      }
      
      if (!data.image) {
        const ogImage = html.match(/<meta property="og:image" content="([^"]+)"/i);
        if (ogImage) {
          data.image = ogImage[1];
          data.images = [ogImage[1]];
        }
      }
    }
    
    // 4. Extrai descrição
    const descMatch = html.match(/<p class="ui-pdp-description__content">([\s\S]*?)<\/p>/i);
    if (descMatch) {
      data.description = descMatch[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
    } else {
      const ogDesc = html.match(/<meta property="og:description" content="([^"]+)"/i);
      if (ogDesc) data.description = ogDesc[1];
    }
    
    return data;
  } catch (error) {
    console.warn('[ML Extract] Scraping falhou:', error);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL do Mercado Livre é obrigatória.' },
        { status: 400 }
      );
    }
    
    let finalUrl = url;
    
    // Resolve links curtos (ex: meli.la)
    if (url.includes('meli.la') || url.includes('mercadolivre.com/')) {
      try {
        const redirectRes = await fetch(url, { redirect: 'follow', method: 'GET' });
        finalUrl = redirectRes.url;
        console.log(`[ML Extract] Link curto resolvido para: ${finalUrl}`);
      } catch (e) {
        console.warn('[ML Extract] Erro ao resolver link curto:', e);
      }
    }

    // 1. Extrai ID do produto
    let mlId = extractMLId(finalUrl);
    let fetchedHtml = '';
    
    // Se não achou na URL (ex: link de afiliado puro), tenta procurar o código MLB dentro do HTML da página
    if (!mlId) {
      try {
        console.log(`[ML Extract] Tentando extrair MLB do HTML para: ${finalUrl}`);
        const response = await fetch(finalUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          },
          signal: AbortSignal.timeout(10000),
        });
        fetchedHtml = await response.text();
        const mlbMatch = fetchedHtml.match(/MLB-?\d{8,12}/i);
        if (mlbMatch) {
          let id = mlbMatch[0].toUpperCase();
          if (!id.includes('-')) id = id.replace('MLB', 'MLB-');
          mlId = id;
          console.log(`[ML Extract] MLB encontrado no HTML: ${mlId}`);
        }
      } catch (e) {
        console.warn('[ML Extract] Erro ao buscar HTML para extrair MLB:', e);
      }
    }

    if (!mlId) {
      return NextResponse.json(
        { error: 'Não foi possível identificar o código do produto neste link. Tente inserir outro link ou preencha manualmente.' },
        { status: 400 }
      );
    }
    
    console.log(`[ML Extract] Processando: ${mlId}`);
    
    // 2. Tenta Scraping primeiro (para pegar o preço exato da Buy Box e todas as imagens)
    // Buscamos o HTML se já não tivermos buscado
    if (!fetchedHtml) {
      try {
        const response = await fetch(finalUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          signal: AbortSignal.timeout(10000),
        });
        fetchedHtml = await response.text();
      } catch (e) {
        console.warn('Erro ao buscar HTML principal:', e);
      }
    }
    
    let productData = await scrapeMLProduct(mlId, fetchedHtml, finalUrl);
    
    // 3. Se o scraping falhar ou faltar dados vitais, tenta a API oficial como fallback
    if (!productData || !productData.title || !productData.price) {
      const apiData = await fetchFromMLAPI(mlId);
      if (apiData) {
        if (!productData) productData = apiData;
        else {
          productData.title = productData.title || apiData.title;
          productData.price = productData.price || (apiData.price ? Number(apiData.price) : null);
          productData.description = productData.description || apiData.description;
          if (!productData.image) productData.image = apiData.thumbnail || apiData.pictures?.[0]?.url;
          if (!productData.images || productData.images.length === 0) {
            productData.images = apiData.pictures?.map((p: any) => p.url) || [];
          }
        }
      }
    }
    
    // 4. Se ainda não tiver dados mínimos, retorna erro
    if (!productData || !productData.title) {
      return NextResponse.json(
        { error: 'Não foi possível extrair dados deste produto. Verifique se o link está correto e o produto está ativo.' },
        { status: 422 }
      );
    }
    
    // 5. Normaliza dados para o formato da loja
    const normalized = {
      name: productData.title?.trim() || '',
      description: productData.description?.trim() || '',
      price: productData.price ? Number(productData.price) : null,
      image_url: productData.image || productData.thumbnail || productData.pictures?.[0]?.url || productData.images?.[0] || '',
      images: productData.images || (productData.pictures?.map((p: MLProductData) => p.url) || []),
      ml_link: url, // Usa o link original para preservar a indicação de afiliado
      category: 'Geral', // Será ajustado manualmente
      ml_id: mlId,
      raw_data: productData, // Para debug se necessário
    };
    
    // Validações básicas
    if (!normalized.name || normalized.name.length < 3) {
      return NextResponse.json(
        { error: 'Nome do produto não pôde ser extraído.' },
        { status: 422 }
      );
    }
    
    return NextResponse.json({
      success: true,
      product: normalized,
      message: 'Dados extraídos com sucesso! Revise e ajuste as informações antes de salvar.',
    });
    
  } catch (error: any) {
    console.error('[ML Extract] Erro:', error);
    return NextResponse.json(
      { error: `Erro ao processar link: ${error.message || 'Erro desconhecido'}` },
      { status: 500 }
    );
  }
}