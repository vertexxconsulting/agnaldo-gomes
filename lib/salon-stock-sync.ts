import { supabaseAdmin } from '@/lib/supabase-admin';
import { normalizeShopImageUrl } from '@/lib/shop-utils';

/**
 * Sincroniza `products.stock_quantity` (e opcionalmente `image_url` vazia) a partir do
 * item vinculado em `salon_inventory`.
 */
export async function syncStoreProductsFromInventory(
  inventoryId: string,
  stockQty?: number | null,
  imageUrl?: string | null
): Promise<void> {
  if (!inventoryId) return;

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (stockQty !== undefined && stockQty !== null && Number.isFinite(Number(stockQty))) {
    updates.stock_quantity = Math.max(0, Math.floor(Number(stockQty)));
  }

  if (Object.keys(updates).length > 1) {
    await supabaseAdmin
      .from('products')
      .update(updates)
      .eq('salon_inventory_id', inventoryId)
      .eq('type', 'LOCAL_STOCK');
  }

  const cleanImg = normalizeShopImageUrl(imageUrl);
  if (cleanImg) {
    await supabaseAdmin
      .from('products')
      .update({ image_url: cleanImg, updated_at: new Date().toISOString() })
      .eq('salon_inventory_id', inventoryId)
      .eq('type', 'LOCAL_STOCK')
      .or('image_url.is.null,image_url.eq.');
  }
}

/**
 * Antes de validar estoque no checkout, garante que `products.stock_quantity`
 * reflita o saldo atual de `salon_inventory.stock_qty`.
 */
export async function syncInventoryToProductsBeforeCheckout(
  productIds: string[]
): Promise<void> {
  const uniqueIds = Array.from(new Set(productIds.filter(Boolean)));
  if (uniqueIds.length === 0) return;

  const { data: linkedProducts } = await supabaseAdmin
    .from('products')
    .select('id, salon_inventory_id, type')
    .in('id', uniqueIds)
    .eq('type', 'LOCAL_STOCK')
    .not('salon_inventory_id', 'is', null);

  if (!linkedProducts || linkedProducts.length === 0) return;

  const invIds = Array.from(
    new Set(linkedProducts.map((p) => p.salon_inventory_id).filter(Boolean) as string[])
  );
  if (invIds.length === 0) return;

  const { data: invRows } = await supabaseAdmin
    .from('salon_inventory')
    .select('id, stock_qty')
    .in('id', invIds);

  if (!invRows) return;
  const stockByInvId = new Map<string, number>(
    invRows.map((row) => [row.id, Math.max(0, Math.floor(Number(row.stock_qty ?? 0)))])
  );

  await Promise.all(
    linkedProducts.map(async (prod) => {
      if (!prod.salon_inventory_id) return;
      const liveQty = stockByInvId.get(prod.salon_inventory_id);
      if (liveQty === undefined) return;
      await supabaseAdmin
        .from('products')
        .update({ stock_quantity: liveQty, updated_at: new Date().toISOString() })
        .eq('id', prod.id);
    })
  );
}

/**
 * Garante baixa no `salon_inventory` quando um pedido da loja é pago (`PAID`),
 * de forma idempotente (evita baixa duplicada caso o trigger SQL já tenha executado).
 */
export async function deductSalonInventoryForPaidOrder(orderId: string): Promise<void> {
  if (!orderId) return;

  const movementMarker = `Pedido: ${orderId}`;
  const { data: existingMov } = await supabaseAdmin
    .from('salon_inventory_movements')
    .select('id')
    .ilike('notes', `%${movementMarker}%`)
    .limit(1);

  if (existingMov && existingMov.length > 0) {
    return;
  }

  const { data: orderItems } = await supabaseAdmin
    .from('order_items')
    .select('product_id, quantity')
    .eq('order_id', orderId);

  if (!orderItems || orderItems.length === 0) return;

  for (const item of orderItems) {
    if (!item.product_id || !item.quantity) continue;
    const { data: prod } = await supabaseAdmin
      .from('products')
      .select('salon_inventory_id, type')
      .eq('id', item.product_id)
      .maybeSingle();

    if (!prod || prod.type !== 'LOCAL_STOCK' || !prod.salon_inventory_id) continue;

    const { data: inv } = await supabaseAdmin
      .from('salon_inventory')
      .select('id, stock_qty')
      .eq('id', prod.salon_inventory_id)
      .maybeSingle();

    if (!inv) continue;

    const qty = Number(item.quantity);
    const nextQty = Math.max(0, Number(inv.stock_qty ?? 0) - qty);

    await supabaseAdmin.from('salon_inventory_movements').insert({
      inventory_id: inv.id,
      type: 'OUT_SALE',
      qty,
      notes: `Venda Loja Virtual - Pedido: ${orderId}`,
      created_by: 'SISTEMA LOJA',
    });

    await supabaseAdmin
      .from('salon_inventory')
      .update({ stock_qty: nextQty, updated_at: new Date().toISOString() })
      .eq('id', inv.id);

    await syncStoreProductsFromInventory(inv.id, nextQty);
  }
}
