import { supabase } from '@/lib/supabase';
import {
  calcDiscountPct,
  formatPromoTagline,
  inferShopCategoryFromText,
  normalizeShopImageUrl,
} from '@/lib/shop-utils';
import type { SalonInventoryResaleItem } from '@/components/admin-loja/SalonInventoryPicker';

export interface SaveAdminProductParams {
  id?: string;
  type: 'AFFILIATE_ML' | 'LOCAL_STOCK';
  name: string;
  description: string;
  category: string;
  image_url: string;
  active: boolean;
  ml_link: string | null;
  price: number;
  original_price: number | null;
  stock_quantity: number;
  salon_inventory_id?: string | null;
}

function isMissingColumnError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  return (
    err.code === 'PGRST204' ||
    err.code === '42703' ||
    msg.includes('original_price') ||
    msg.includes('discount_pct') ||
    msg.includes('column')
  );
}

export async function saveAdminProduct(params: SaveAdminProductParams): Promise<{
  error: { message: string } | null;
  usedTaglineFallback: boolean;
}> {
  const validOriginal =
    params.original_price && params.original_price > params.price
      ? Number(params.original_price.toFixed(2))
      : null;
  const discountPct = calcDiscountPct(params.price, validOriginal);
  const cleanImageUrl = normalizeShopImageUrl(params.image_url);

  const basePayload: Record<string, unknown> = {
    type: params.type,
    name: params.name.trim(),
    description: params.description.trim(),
    category: params.category,
    image_url: cleanImageUrl,
    active: params.active,
    ml_link: params.type === 'AFFILIATE_ML' ? params.ml_link?.trim() || null : null,
    price: Number(params.price.toFixed(2)),
    stock_quantity: params.type === 'LOCAL_STOCK' ? params.stock_quantity : 0,
    updated_at: new Date().toISOString(),
  };

  if (params.salon_inventory_id !== undefined) {
    basePayload.salon_inventory_id =
      params.type === 'LOCAL_STOCK' ? params.salon_inventory_id || null : null;
  }

  const promoPayload: Record<string, unknown> = {
    ...basePayload,
    original_price: validOriginal,
    discount_pct: discountPct,
  };

  const runMutation = async (data: Record<string, unknown>) => {
    if (params.id) {
      return supabase.from('products').update(data).eq('id', params.id);
    }
    return supabase.from('products').insert([data]);
  };

  const firstAttempt = await runMutation(promoPayload);
  if (!firstAttempt.error) {
    return { error: null, usedTaglineFallback: false };
  }

  // Fallback resiliente caso a migration 009 (original_price / discount_pct) ainda não tenha sido aplicada
  if (isMissingColumnError(firstAttempt.error)) {
    const fallbackPayload: Record<string, unknown> = {
      ...basePayload,
      tagline: formatPromoTagline(discountPct, validOriginal),
    };
    const retry = await runMutation(fallbackPayload);
    return {
      error: retry.error ? { message: retry.error.message } : null,
      usedTaglineFallback: !retry.error,
    };
  }

  return {
    error: { message: firstAttempt.error.message },
    usedTaglineFallback: false,
  };
}

export interface ExtractedFormValues {
  name: string;
  description: string;
  price: string;
  original_price: string;
  discount_pct: number | null;
  image_url: string;
  ml_link: string;
  category: string;
  message: string;
}

export async function extractMlFromApi(rawUrl: string): Promise<ExtractedFormValues> {
  const url = rawUrl.trim();
  if (!url) {
    throw new Error('Por favor, insira o link do Mercado Livre primeiro.');
  }

  const res = await fetch('/api/mercadolivre/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao extrair dados do Mercado Livre.');
  }

  const product = data.product || data.data || {};
  const priceNum = Number(product.price || 0);
  const origNum =
    product.original_price && Number(product.original_price) > priceNum
      ? Number(product.original_price)
      : null;

  return {
    name: product.name || '',
    description: product.description || '',
    price: priceNum > 0 ? priceNum.toString() : '',
    original_price: origNum ? origNum.toString() : '',
    discount_pct: calcDiscountPct(priceNum, origNum),
    image_url: normalizeShopImageUrl(product.image_url || ''),
    ml_link: product.ml_link || url,
    category: product.category || '',
    message: data.message || 'Dados extraídos com sucesso!',
  };
}

export async function fetchResaleInventoryItems(): Promise<SalonInventoryResaleItem[]> {
  try {
    const res = await fetch('/api/admin-loja/estoque-revenda');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data as SalonInventoryResaleItem[];
    }
  } catch {
    // Fallback client-side abaixo
  }

  const { data, error } = await supabase
    .from('salon_inventory')
    .select(
      'id, name, brand, category, unit, stock_qty, sale_price, allow_sale, active, image_url, notes'
    )
    .eq('allow_sale', true)
    .eq('active', true)
    .order('name');

  if (error || !data) {
    console.error('[fetchResaleInventoryItems] Erro ao buscar estoque de revenda:', error);
    return [];
  }
  return data as SalonInventoryResaleItem[];
}

export function buildInventoryFormPatch(
  item: SalonInventoryResaleItem,
  options?: { preserveCustomName?: boolean; currentName?: string; currentDescription?: string; currentImageUrl?: string }
) {
  const cleanInvImage = normalizeShopImageUrl(item.image_url);
  const nextStock = String(Math.max(0, Math.floor(Number(item.stock_qty ?? 0))));
  const nextPrice =
    item.sale_price != null && Number(item.sale_price) > 0
      ? Number(item.sale_price).toFixed(2)
      : undefined;

  return {
    salon_inventory_id: item.id,
    name:
      options?.preserveCustomName && options.currentName?.trim()
        ? options.currentName
        : item.name,
    category: inferShopCategoryFromText(item.name, item.category || ''),
    ...(nextPrice !== undefined ? { price: nextPrice } : {}),
    stock: nextStock,
    image_url: cleanInvImage || options?.currentImageUrl || '',
    description:
      options?.currentDescription?.trim() ||
      item.notes?.trim() ||
      (item.brand ? `${item.name} — ${item.brand}` : ''),
  };
}
