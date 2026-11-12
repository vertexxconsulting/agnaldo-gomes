import { supabase } from '@/lib/supabase';
import { ShopProduct } from '@/lib/shop-mock';
import { mapDbProductToShopProduct } from '@/lib/shop-utils';

/**
 * Query: lista todos os produtos ativos.
 * Se a coluna 'featured' não existir no DB (migration pendente),
 * todos os produtos retornam com featured=false via mapRowToProduct.
 */
const hasStock = (p: ShopProduct) => p.type === 'AFFILIATE_ML' || (p.stock_quantity ?? 0) > 0;
const PRODUCT_SELECT = '*, salon_inventory(id, name, stock_qty, image_url)';

export async function getAllProducts(): Promise<ShopProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('active', true);
  if (error || !data) return [];
  return data.map(mapRowToProduct).filter(hasStock);
}

/**
 * Query: produto por ID.
 */
export async function getProductById(id: string): Promise<ShopProduct | null> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return mapRowToProduct(data);
}

/**
 * Query: produtos por categoria.
 */
export async function getProductsByCategory(category: string): Promise<ShopProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('category', category)
    .eq('active', true);
  if (error || !data) return [];
  return data.map(mapRowToProduct).filter(hasStock);
}

/**
 * Query: produtos em destaque (featured = true).
 *
 * NOTA: Se a coluna 'featured' ainda não existir no DB
 * (migration de colunas extras pendente), esta função retorna
 * sempre [] porque a query filtra por featured=true.
 *
 * Após rodar a migration, produ-zes com featured=true aparecerão aqui.
 * Enquanto a migration não é executada, use getAllProducts() e
 * filtre manualmente no front-end se necessário.
 */
export async function getFeaturedProducts(): Promise<ShopProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('featured', true)
    .eq('active', true)
    .limit(4);
  if (error || !data) return [];
  return data.map(mapRowToProduct).filter(hasStock);
}

/**
 * Query: produtos relacionados (mesma categoria, exclui o atual).
 */
export async function getRelatedProducts(
  productId: string,
  category: string
): Promise<ShopProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('category', category)
    .neq('id', productId)
    .eq('active', true)
    .limit(8);
  if (error || !data) return [];
  return data.map(mapRowToProduct).filter(hasStock);
}

/**
 * Query: verifica estoque de um produto.
 */
export async function checkStock(productId: string) {
  const { data, error } = await supabase
    .from('products')
    .select('stock_quantity, type, salon_inventory(stock_qty)')
    .eq('id', productId)
    .single();

  if (error || !data) return { available: false, count: 0 };
  const mapped = mapRowToProduct(data as Record<string, unknown>);
  return {
    available: mapped.type === 'AFFILIATE_ML' || mapped.stock_quantity > 0,
    count: mapped.stock_quantity,
  };
}

/**
 * Converte uma linha do Supabase em ShopProduct.
 *
 * Lida com campos opcionais que podem não existir no DB:
 * - rating (numeric 3,1) → fallback 4.8
 * - reviews (integer)    → fallback aleatório 20-119
 * - featured (boolean)   → fallback false
 * - tagline (text)       → fallback null
 *
 * O Supabase retorna undefined para colunas que não existem
 * na tabela, então o operador ?? do TypeScript cuida do fallback.
 */
function mapRowToProduct(row: Record<string, unknown>): ShopProduct {
  return mapDbProductToShopProduct(row);
}
