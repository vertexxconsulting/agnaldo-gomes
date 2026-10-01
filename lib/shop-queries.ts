import { supabase } from '@/lib/supabase';
import { ShopProduct } from '@/lib/shop-mock';

/**
 * Query: lista todos os produtos ativos.
 * Se a coluna 'featured' não existir no DB (migration pendente),
 * todos os produtos retornam com featured=false via mapRowToProduct.
 */
export async function getAllProducts(): Promise<ShopProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('active', true);
  if (error || !data) return [];
  return data.map(mapRowToProduct);
}

/**
 * Query: produto por ID.
 */
export async function getProductById(id: string): Promise<ShopProduct | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
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
    .select('*')
    .eq('category', category)
    .eq('active', true);
  if (error || !data) return [];
  return data.map(mapRowToProduct);
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
    .select('*')
    .eq('featured', true)
    .eq('active', true)
    .limit(4);
  if (error || !data) return [];
  return data.map(mapRowToProduct);
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
    .select('*')
    .eq('category', category)
    .neq('id', productId)
    .eq('active', true)
    .limit(8);
  if (error || !data) return [];
  return data.map(mapRowToProduct);
}

/**
 * Query: verifica estoque de um produto.
 */
export async function checkStock(productId: string) {
  const { data, error } = await supabase
    .from('products')
    .select('stock_quantity')
    .eq('id', productId)
    .single();

  if (error || !data) return { available: false, count: 0 };
  return {
    available: data.stock_quantity > 0,
    count: data.stock_quantity,
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
  return {
    id: String(row.id ?? ''),
    type: (row.type as 'AFFILIATE_ML' | 'LOCAL_STOCK') ?? 'LOCAL_STOCK',
    name: String(row.name ?? 'Sem nome'),
    description: String(row.description ?? ''),
    category: String(row.category ?? 'Geral'),
    image_url: String(row.image_url ?? ''),
    active: Boolean(row.active ?? true),
    ml_link: row.ml_link ? String(row.ml_link) : null,
    price:
      row.price !== null && row.price !== undefined
        ? Number(row.price)
        : null,
    stock_quantity: Number(row.stock_quantity ?? 0),
    rating:
      row.rating !== null && row.rating !== undefined
        ? Number(row.rating)
        : 4.8,
    reviews:
      row.reviews !== null && row.reviews !== undefined
        ? Number(row.reviews)
        : (Date.now() % 100) + 20,
    featured: Boolean(row.featured ?? false),
    tagline: row.tagline ? String(row.tagline) : undefined,
  };
}
