import {
  calcDiscountPct,
  cleanMlProductTitle,
  normalizeShopImageUrl,
} from '@/lib/shop-utils';

export interface ExtractedMLProduct {
  name: string;
  description: string;
  price: number;
  original_price: number | null;
  discount_pct: number | null;
  image_url: string;
  images: string[];
  ml_link: string;
  category: string;
  ml_id: string | null;
  source: 'social_json' | 'social_dom' | 'pdp_dom' | 'meta_fallback';
}

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
};

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
}

function getMetaContent(html: string, key: string): string {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const p1 = new RegExp(
    `<meta[^>]+(?:property|name|itemprop)=["']${escapedKey}["'][^>]+content=["']([^"']+)["']`,
    'i'
  );
  const m1 = html.match(p1);
  if (m1?.[1]) return decodeHtmlEntities(m1[1].trim());

  const p2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name|itemprop)=["']${escapedKey}["']`,
    'i'
  );
  const m2 = html.match(p2);
  return m2?.[1] ? decodeHtmlEntities(m2[1].trim()) : '';
}

function parseAndesMoney(fragment: string): number | null {
  if (!fragment) return null;
  const fracMatch = fragment.match(
    /class="[^"]*andes-money-amount__fraction[^"]*"[^>]*>([\d.,]+)<\/span>/i
  );
  if (!fracMatch?.[1]) return null;

  const integerPart = fracMatch[1].replace(/\./g, '').replace(',', '.');
  const centsMatch = fragment.match(
    /class="[^"]*andes-money-amount__cents[^"]*"[^>]*>(\d{1,2})<\/span>/i
  );

  const numericStr = centsMatch?.[1]
    ? `${integerPart}.${centsMatch[1].padStart(2, '0')}`
    : integerPart;

  const val = Number(numericStr);
  return Number.isFinite(val) && val > 0 ? Number(val.toFixed(2)) : null;
}

/**
 * Extrai o objeto JSON balanceado `{...}` ao redor da primeira ocorrência de `"current_price"`
 * dentro de páginas `/social/...` do Mercado Livre.
 */
function extractBalancedJsonObjectAround(html: string, anchor: string): Record<string, unknown> | null {
  const idx = html.indexOf(anchor);
  if (idx === -1) return null;

  // Recua até a chave `{` que abre o objeto contendo o anchor
  let start = idx;
  let depthBack = 0;
  while (start > 0 && idx - start < 4000) {
    start--;
    const ch = html[start];
    if (ch === '}') depthBack++;
    else if (ch === '{') {
      if (depthBack === 0) break;
      depthBack--;
    }
  }
  if (html[start] !== '{') return null;

  // Avança contando chaves até fechar o objeto
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < Math.min(html.length, start + 6000); i++) {
    const ch = html[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        const slice = html.slice(start, i + 1);
        try {
          return JSON.parse(slice) as Record<string, unknown>;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/**
 * Extrai o primeiro card `.poly-card` (produto em destaque em links `/social/...`),
 * garantindo que preços riscados de cards vizinhos não contaminem o produto principal.
 */
function getFirstPolyCardSlice(html: string): string {
  const start = html.search(/class="[^"]*poly-card(?:\s|")/i);
  if (start === -1) return '';
  const rest = html.slice(start + 10);
  const nextCardOffset = rest.search(/class="[^"]*poly-card(?:\s|")/i);
  const end =
    nextCardOffset !== -1
      ? Math.min(nextCardOffset + 10, 6000)
      : 6000;
  return html.slice(start, start + end);
}

function buildMlPictureVariants(urlOrId: string): string[] {
  const clean = normalizeShopImageUrl(urlOrId);
  if (!clean) return [];

  // Identifica padrão mlstatic: D_NQ_NP_746985-MLA118135705364_102026-P.webp ou similar
  const idMatch = clean.match(
    /mlstatic\.com\/D_(?:NQ_NP|Q_NP)(?:_2X)?_([A-Z0-9_-]+)-[A-Z]\.(?:webp|jpg|jpeg|png)/i
  );
  if (idMatch?.[1]) {
    const picId = idMatch[1];
    return [
      `https://http2.mlstatic.com/D_NQ_NP_${picId}-O.webp`,
      clean,
    ];
  }

  // Se for ID puro (ex: "746985-MLA118135705364_102026")
  if (/^\d+-[A-Z0-9_]+$/i.test(clean)) {
    return [`https://http2.mlstatic.com/D_NQ_NP_${clean}-O.webp`];
  }

  return [clean];
}

function extractImagesFromHtml(html: string, firstCardSlice: string): string[] {
  const candidates: string[] = [];

  const pushUrl = (raw?: string | null) => {
    if (!raw) return;
    for (const variant of buildMlPictureVariants(raw)) {
      if (
        variant.startsWith('http') &&
        !/avatar|logo|sprite|icon|placeholder|favicon|profile|meli-social/i.test(variant) &&
        !candidates.includes(variant)
      ) {
        candidates.push(variant);
      }
    }
  };

  // 1. og:image (em links /social/ e PDPs é sempre a imagem principal do anúncio)
  const ogImg = getMetaContent(html, 'og:image');
  if (ogImg) pushUrl(ogImg);

  // 2. Imagem do primeiro card (.poly-component__picture)
  if (firstCardSlice) {
    const polyImgMatches = firstCardSlice.matchAll(
      /<img[^>]+class="[^"]*poly-component__picture[^"]*"[^>]+(?:data-src|src)="([^"]+)"/gi
    );
    for (const m of polyImgMatches) {
      pushUrl(m[1]);
    }
  }

  // 3. Galeria PDP (.ui-pdp-gallery__figure__image)
  const pdpMatches = html.matchAll(
    /<img[^>]+class="[^"]*ui-pdp-gallery__figure__image[^"]*"[^>]+(?:data-zoom|src)="([^"]+)"/gi
  );
  for (const m of pdpMatches) {
    pushUrl(m[1]);
  }

  // 4. Bloco JSON "pictures":{"pictures":[{"id":"..."}]} próximo do card principal
  const picBlock = extractBalancedJsonObjectAround(html, '"pictures":[{');
  const picList = picBlock?.pictures;
  if (Array.isArray(picList)) {
    for (const item of picList.slice(0, 6)) {
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        if (typeof obj.id === 'string') {
          pushUrl(obj.id);
        } else if (typeof obj.url === 'string') {
          pushUrl(obj.url);
        }
      }
    }
  }

  return candidates.slice(0, 8);
}

export function extractMlItemId(url: string, html = ''): string | null {
  const patterns = [
    /(?:MLB|MLA|MLM)-?\d{7,}/i,
    /\/p\/(MLB\d+)/i,
    /\/up\/(MLBU\d+)/i,
  ];
  for (const source of [url, html]) {
    if (!source) continue;
    for (const p of patterns) {
      const m = source.match(p);
      if (m) {
        return (m[1] || m[0]).replace('-', '').toUpperCase();
      }
    }
  }
  return null;
}

export function inferShopCategory(title: string, description = ''): string {
  const text = `${title} ${description}`.toLowerCase();
  if (/(secador|prancha|chapinha|babyliss|modelador|maquina|tesoura|escova|pente|borrifador|kit sal)/i.test(text)) {
    return 'equipamentos';
  }
  if (/(alisamento|progressiva|selagem|botox|btx|defrizante|formol|organica)/i.test(text)) {
    return 'alisamento';
  }
  if (/(tintura|colora|tonalizante|descolorante|ox\b|agua oxigenada|matizador)/i.test(text)) {
    return 'coloracao';
  }
  if (/(oleo|oil|reparador|serum|sérum|spray|pomada|cera|gel|finalizador|leave-in|termo|protetor termico)/i.test(text)) {
    return 'finalizadores';
  }
  return 'tratamento';
}

export function parseMercadoLivreHtml(
  html: string,
  originalUrl: string,
  finalUrl: string
): ExtractedMLProduct {
  const firstCard = getFirstPolyCardSlice(html);

  // 1. Nome do produto
  let rawName = '';
  const twitterTitle = getMetaContent(html, 'twitter:title');
  const ogTitle = getMetaContent(html, 'og:title');
  const h1Pdp = html.match(/<h1[^>]*class="[^"]*ui-pdp-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const polyTitle = firstCard.match(
    /<a[^>]*class="[^"]*poly-component__title[^"]*"[^>]*>([\s\S]*?)<\/a>/i
  )?.[1];
  const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];

  rawName =
    h1Pdp ||
    polyTitle ||
    twitterTitle ||
    ogTitle ||
    titleTag ||
    'Produto Mercado Livre';
  rawName = decodeHtmlEntities(rawName.replace(/<[^>]+>/g, ''));
  const name = cleanMlProductTitle(rawName) || 'Produto Mercado Livre';

  // 2. Preço atual (promocional) e preço original (De:)
  let currentPrice: number | null = null;
  let originalPrice: number | null = null;
  let discountPct: number | null = null;
  let source: ExtractedMLProduct['source'] = 'meta_fallback';

  // 2a. JSON estruturado do primeiro item (/social/... ou preloaded state)
  const priceJson = extractBalancedJsonObjectAround(html, '"current_price"');
  if (priceJson) {
    const cur = (priceJson.current_price as { value?: unknown } | undefined)?.value;
    const prev = (priceJson.previous_price as { value?: unknown } | undefined)?.value;
    const pct = priceJson.discount_pct;

    if (typeof cur === 'number' && cur > 0) {
      currentPrice = Number(cur.toFixed(2));
      source = 'social_json';
    }
    if (typeof prev === 'number' && currentPrice && prev > currentPrice) {
      originalPrice = Number(prev.toFixed(2));
    }
    if (typeof pct === 'number' && pct > 0 && pct < 100 && originalPrice) {
      discountPct = Math.round(pct);
    }
  }

  // 2b. DOM do primeiro `.poly-card` (garante leitura mesmo se JSON mudar de shape)
  if ((!currentPrice || !originalPrice) && firstCard) {
    const prevBlock = firstCard.match(
      /<(?:s|del|span|div)[^>]*class="[^"]*(?:poly-price__previous|andes-money-amount--previous)[^"]*"[^>]*>[\s\S]*?<\/(?:s|del|span|div)>/i
    )?.[0];
    const curBlock = firstCard.match(
      /<div[^>]*class="[^"]*poly-price__current[^"]*"[^>]*>[\s\S]*?(?=<div[^>]*class="[^"]*poly-component__|<\/div>\s*<\/div>|$)/i
    )?.[0];

    const domCur = curBlock ? parseAndesMoney(curBlock) : null;
    const domPrev = prevBlock ? parseAndesMoney(prevBlock) : null;

    if (!currentPrice && domCur) {
      currentPrice = domCur;
      source = 'social_dom';
    }
    if (!originalPrice && domPrev && currentPrice && domPrev > currentPrice) {
      originalPrice = domPrev;
    }

    const discLabel = firstCard.match(
      /(?:poly-price__disc_label|andes-money-amount__discount)[^>]*>([^<]*\d+\s*%[^<]*)</i
    )?.[1];
    const pctMatch = discLabel?.match(/(\d+)\s*%/);
    if (!discountPct && pctMatch?.[1] && originalPrice) {
      discountPct = Number(pctMatch[1]);
    }
  }

  // 2c. DOM PDP padrão (`.ui-pdp-price`)
  if (!currentPrice) {
    const pdpIdx = html.search(/class="[^"]*ui-pdp-price(?:\s|")/i);
    if (pdpIdx !== -1) {
      const pdpSlice = html.slice(pdpIdx, pdpIdx + 3500);
      const prevBlock = pdpSlice.match(
        /<s[^>]*class="[^"]*andes-money-amount--previous[^"]*"[^>]*>[\s\S]*?<\/s>/i
      )?.[0];
      const secondLine = pdpSlice.match(
        /class="[^"]*ui-pdp-price__second-line[^"]*"[\s\S]{0,1200}/i
      )?.[0];

      const domCur = parseAndesMoney(secondLine || pdpSlice.replace(/<s[^>]*andes-money-amount--previous[\s\S]*?<\/s>/gi, ''));
      const domPrev = prevBlock ? parseAndesMoney(prevBlock) : null;

      if (domCur) {
        currentPrice = domCur;
        source = 'pdp_dom';
      }
      if (domPrev && currentPrice && domPrev > currentPrice) {
        originalPrice = domPrev;
      }

      const discMatch = pdpSlice.match(/(\d{1,2})\s*%\s*OFF/i);
      if (!discountPct && discMatch?.[1] && originalPrice) {
        discountPct = Number(discMatch[1]);
      }
    }
  }

  // 2d. Fallback meta itemprop="price" ou og:title "... - R$ 499,99"
  if (!currentPrice) {
    const metaPrice = getMetaContent(html, 'price');
    if (metaPrice) {
      const p = Number(metaPrice.replace(',', '.'));
      if (Number.isFinite(p) && p > 0) currentPrice = Number(p.toFixed(2));
    }
  }
  if (!currentPrice && ogTitle) {
    const titlePrice = ogTitle.match(/R\$\s*([\d.]+(?:,\d{2})?)/i);
    if (titlePrice?.[1]) {
      const p = Number(titlePrice[1].replace(/\./g, '').replace(',', '.'));
      if (Number.isFinite(p) && p > 0) currentPrice = Number(p.toFixed(2));
    }
  }

  if (originalPrice && currentPrice && originalPrice <= currentPrice) {
    originalPrice = null;
    discountPct = null;
  } else if (originalPrice && currentPrice && !discountPct) {
    discountPct = calcDiscountPct(currentPrice, originalPrice);
  }

  // 3. Imagens limpas
  const images = extractImagesFromHtml(html, firstCard);
  const imageUrl = images[0] || '';

  // 4. Descrição e categoria
  const ogDesc = getMetaContent(html, 'og:description') || getMetaContent(html, 'description');
  const cleanDesc =
    ogDesc && !/compre no mercado livre|frete gr[aá]tis/i.test(ogDesc)
      ? ogDesc
      : `${name} — Produto selecionado para você no Mercado Livre.`;

  const mlId = extractMlItemId(finalUrl, html) || extractMlItemId(originalUrl);
  const category = inferShopCategory(name, cleanDesc);

  return {
    name,
    description: cleanDesc,
    price: currentPrice ?? 0,
    original_price: originalPrice,
    discount_pct: discountPct,
    image_url: imageUrl,
    images,
    ml_link: originalUrl,
    category,
    ml_id: mlId,
    source,
  };
}

export async function fetchAndExtractMercadoLivreProduct(
  rawUrl: string
): Promise<ExtractedMLProduct> {
  const url = rawUrl.trim();
  const res = await fetch(url, {
    method: 'GET',
    redirect: 'follow',
    headers: BROWSER_HEADERS,
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ao acessar o link do Mercado Livre`);
  }

  const finalUrl = res.url || url;
  const html = await res.text();

  // Detecta página de verificação anti-bot do Mercado Livre
  if (
    finalUrl.includes('/gz/account-verification') ||
    (html.includes('account-verification') && !html.includes('poly-card') && !html.includes('ui-pdp-title'))
  ) {
    throw new Error(
      'O Mercado Livre solicitou verificação temporária nesta página. Tente usar o link curto de afiliado (meli.la/...).'
    );
  }

  return parseMercadoLivreHtml(html, url, finalUrl);
}
