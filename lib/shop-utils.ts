/**
 * Helpers compartilhados da Loja e do extrator do Mercado Livre.
 */
import type { ShopProduct } from '@/lib/shop-mock';

export function normalizeShopImageUrl(raw?: string | null): string {
  if (!raw) return '';
  let url = String(raw).trim();
  if (!url) return '';

  // Remove aspas acidentais nas extremidades
  if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
    url = url.slice(1, -1).trim();
  }

  // Decodifica escapes Unicode/JSON comuns salvos em scripts HTML (\u002F, \u0026, \/)
  url = url
    .replace(/\\u002[fF]/g, '/')
    .replace(/\\u0026/g, '&')
    .replace(/\\u003[dD]/g, '=')
    .replace(/\\\//g, '/')
    .replace(/&amp;/g, '&');

  // Se vier protocol-relative (//http2.mlstatic.com/...)
  if (url.startsWith('//')) {
    url = `https:${url}`;
  }

  // Evita mixed content / bloqueios usando HTTPS para CDNs do Mercado Livre e Unsplash
  if (url.startsWith('http://') && (url.includes('mlstatic.com') || url.includes('mercadolivre') || url.includes('unsplash.com'))) {
    url = `https://${url.slice('http://'.length)}`;
  }

  return url;
}

export function calcDiscountPct(price?: number | null, originalPrice?: number | null): number | null {
  const p = Number(price);
  const orig = Number(originalPrice);
  if (!Number.isFinite(p) || !Number.isFinite(orig) || p <= 0 || orig <= p) {
    return null;
  }
  const pct = Math.round(((orig - p) / orig) * 100);
  return pct > 0 && pct < 100 ? pct : null;
}

export function parseBrazilianPriceInput(raw?: string | number | null): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw > 0 ? Number(raw.toFixed(2)) : null;
  }
  const cleaned = String(raw).trim().replace(/R\$\s*/gi, '').replace(/\s+/g, '');
  if (!cleaned) return null;

  // Se tiver vírgula, assume formato BR (1.234,56)
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned;

  const num = Number(normalized);
  return Number.isFinite(num) && num > 0 ? Number(num.toFixed(2)) : null;
}

export function formatPromoTagline(discountPct: number | null, originalPrice: number | null): string | null {
  if (!originalPrice || originalPrice <= 0) return null;
  const origFmt = originalPrice.toFixed(2).replace('.', ',');
  if (discountPct && discountPct > 0) {
    return `${discountPct}% OFF • De R$ ${origFmt}`;
  }
  return `De R$ ${origFmt}`;
}

export function extractPromoFromRow(row: {
  price?: unknown;
  original_price?: unknown;
  discount_pct?: unknown;
  tagline?: unknown;
}): {
  original_price: number | null;
  discount_pct: number | null;
  cleanTagline?: string;
} {
  const price = row.price != null ? Number(row.price) : null;
  let originalPrice = row.original_price != null ? Number(row.original_price) : null;
  if (originalPrice !== null && (!Number.isFinite(originalPrice) || !price || originalPrice <= price)) {
    originalPrice = null;
  }

  let rawTagline = row.tagline ? String(row.tagline).trim() : '';

  // Fallback: caso a coluna original_price ainda não exista no banco, recupera de tagline ("24% OFF • De R$ 658,73")
  if (originalPrice === null && rawTagline && price && price > 0) {
    const m = rawTagline.match(/De\s*R\$\s*([\d.,]+)/i);
    if (m?.[1]) {
      const parsed = parseBrazilianPriceInput(m[1]);
      if (parsed && parsed > price) {
        originalPrice = parsed;
      }
    }
  }

  let discountPct = row.discount_pct != null ? Number(row.discount_pct) : null;
  if (discountPct === null || !Number.isFinite(discountPct) || discountPct <= 0) {
    discountPct = calcDiscountPct(price, originalPrice);
  }

  // Limpa a tagline automática para não duplicar texto quando o badge de desconto é exibido
  let cleanTagline: string | undefined = rawTagline || undefined;
  if (cleanTagline && /^(?:\d+%\s*OFF\s*•\s*)?De\s*R\$\s*[\d.,]+$/i.test(cleanTagline)) {
    cleanTagline = undefined;
  }

  return {
    original_price: originalPrice,
    discount_pct: originalPrice ? discountPct : null,
    cleanTagline,
  };
}

export function cleanMlProductTitle(rawTitle?: string | null): string {
  if (!rawTitle) return '';
  return rawTitle
    // Remove sufixo " - R$ 499,99" ou " | MercadoLivre"
    .replace(/\s*[-–|]\s*R\$\s*[\d.,]+\s*$/i, '')
    .replace(/\s*[-–|]\s*Mercado\s*Livre.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function inferShopCategoryFromText(title: string, descriptionOrHint = ''): string {
  const text = `${title} ${descriptionOrHint}`.toLowerCase();
  if (/(secador|prancha|chapinha|babyliss|modelador|maquina|máquina|tesoura|escova|pente|borrifador|kit sal)/i.test(text)) {
    return 'equipamentos';
  }
  if (/(alisamento|progressiva|selagem|botox|btx|defrizante|formol|organica|orgânica)/i.test(text)) {
    return 'alisamento';
  }
  if (/(tintura|colora|tonalizante|descolorante|ox\b|agua oxigenada|água oxigenada|matizador)/i.test(text)) {
    return 'coloracao';
  }
  if (/(oleo|óleo|oil|reparador|serum|sérum|spray|pomada|cera|gel|finalizador|leave-in|termo|protetor|perfume|protect)/i.test(text)) {
    return 'finalizadores';
  }
  return 'tratamento';
}

export function mapDbProductToShopProduct(row: Record<string, unknown>): ShopProduct {
  const price =
    row.price !== null && row.price !== undefined
      ? Number(row.price)
      : null;
  const promo = extractPromoFromRow({
    price,
    original_price: row.original_price,
    discount_pct: row.discount_pct,
    tagline: row.tagline,
  });

  const type = row.type === 'AFFILIATE_ML' ? 'AFFILIATE_ML' : 'LOCAL_STOCK';
  const rawInv = row.salon_inventory as
    | { stock_qty?: unknown; image_url?: unknown }
    | Array<{ stock_qty?: unknown; image_url?: unknown }>
    | null
    | undefined;
  const linkedInv = Array.isArray(rawInv) ? rawInv[0] : rawInv;

  const syncedStock =
    type === 'LOCAL_STOCK' && linkedInv && linkedInv.stock_qty !== undefined && linkedInv.stock_qty !== null
      ? Math.max(0, Math.floor(Number(linkedInv.stock_qty)))
      : Number(row.stock_quantity ?? 0);

  const primaryImg = normalizeShopImageUrl(row.image_url ? String(row.image_url) : '');
  const invImg =
    linkedInv && linkedInv.image_url
      ? normalizeShopImageUrl(String(linkedInv.image_url))
      : '';

  return {
    id: String(row.id ?? ''),
    type,
    name: String(row.name ?? 'Sem nome'),
    description: String(row.description ?? ''),
    category: String(row.category ?? 'Geral'),
    image_url: primaryImg || invImg,
    active: Boolean(row.active ?? true),
    ml_link: row.ml_link ? String(row.ml_link) : null,
    price,
    original_price: promo.original_price,
    discount_pct: promo.discount_pct,
    stock_quantity: syncedStock,
    rating:
      row.rating !== null && row.rating !== undefined
        ? Number(row.rating)
        : 4.8,
    reviews:
      row.reviews !== null && row.reviews !== undefined
        ? Number(row.reviews)
        : 0,
    featured: Boolean(row.featured ?? false),
    tagline: promo.cleanTagline,
  };
}
