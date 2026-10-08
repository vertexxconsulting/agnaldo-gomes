import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { cookies } from 'next/headers';

const CART_SESSION_COOKIE = 'cart_session_id';

async function getOrCreateCart(userId: string | null): Promise<string> {
  if (userId) {
    // Usuário logado: buscar ou criar carrinho por user_id
    let { data: cart } = await supabaseAdmin
      .from('carts')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (!cart) {
      const { data: newCart, error } = await supabaseAdmin
        .from('carts')
        .insert({ user_id: userId })
        .select('id')
        .single();
      if (error) throw error;
      cart = newCart;
    }
    return cart.id;
  } else {
    // Usuário anônimo: usar session_id do cookie
    const cookieStore = await cookies();
    let sessionId = cookieStore.get(CART_SESSION_COOKIE)?.value;

    if (!sessionId) {
      sessionId = crypto.randomUUID();
      cookieStore.set(CART_SESSION_COOKIE, sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 dias
        path: '/',
      });
    }

    let { data: cart } = await supabaseAdmin
      .from('carts')
      .select('id')
      .eq('session_id', sessionId)
      .is('user_id', null)
      .eq('status', 'active')
      .maybeSingle();

    if (!cart) {
      const { data: newCart, error } = await supabaseAdmin
        .from('carts')
        .insert({ session_id: sessionId })
        .select('id')
        .single();
      if (error) throw error;
      cart = newCart;
    }
    return cart.id;
  }
}

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  try {
    const cartId = await getOrCreateCart(user?.id ?? null);

    const { data: items, error } = await supabaseAdmin
      .from('cart_items')
      .select(`
        *,
        products!product_id (
          id, name, description, image_url, price, stock_quantity, type, weight_kg
        )
      `)
      .eq('cart_id', cartId);

    if (error) throw error;

    const total = items?.reduce((sum: number, item: any) => sum + Number(item.unit_price) * item.quantity, 0) ?? 0;
    const itemCount = items?.reduce((sum: number, item: any) => sum + item.quantity, 0) ?? 0;

    return NextResponse.json({
      cartId,
      items: items ?? [],
      total,
      itemCount,
    });
  } catch (error) {
    console.error('[api/cart GET] Erro:', error);
    return NextResponse.json({ error: 'Erro ao buscar carrinho' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  try {
    const body = await request.json();
    const { productId, quantity = 1 } = body;

    if (!productId || quantity < 1) {
      return NextResponse.json({ error: 'productId e quantity são obrigatórios' }, { status: 400 });
    }

    const cartId = await getOrCreateCart(user?.id ?? null);

    // Buscar preço atual do produto
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('id, price, stock_quantity, type')
      .eq('id', productId)
      .maybeSingle();

    if (productError || !product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    // Verificar estoque se LOCAL_STOCK
    if (product.type === 'LOCAL_STOCK' && (product.stock_quantity || 0) < quantity) {
      return NextResponse.json({ 
        error: 'Estoque insuficiente', 
        available: product.stock_quantity ?? 0 
      }, { status: 409 });
    }

    // Upsert item no carrinho
    const { data: item, error: itemError } = await supabaseAdmin
      .from('cart_items')
      .upsert({
        cart_id: cartId,
        product_id: productId,
        quantity,
        unit_price: product.price,
      }, { onConflict: 'cart_id,product_id' })
      .select(`
        *,
        products!product_id (id, name, image_url, price, type)
      `)
      .single();

    if (itemError) throw itemError;

    return NextResponse.json({ item });
  } catch (error) {
    console.error('[api/cart POST] Erro:', error);
    return NextResponse.json({ error: 'Erro ao adicionar ao carrinho' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  try {
    const body = await request.json();
    const { productId, quantity } = body;

    if (!productId || quantity < 0) {
      return NextResponse.json({ error: 'productId e quantity são obrigatórios' }, { status: 400 });
    }

    const cartId = await getOrCreateCart(user?.id ?? null);

    if (quantity === 0) {
      // Remover item
      const { error } = await supabaseAdmin
        .from('cart_items')
        .delete()
        .eq('cart_id', cartId)
        .eq('product_id', productId);
      if (error) throw error;
      return NextResponse.json({ success: true, removed: true });
    }

    // Verificar estoque
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('stock_quantity, type')
      .eq('id', productId)
      .maybeSingle();

    if (product?.type === 'LOCAL_STOCK' && (product.stock_quantity || 0) < quantity) {
      return NextResponse.json({ 
        error: 'Estoque insuficiente', 
        available: product.stock_quantity ?? 0 
      }, { status: 409 });
    }

    // Atualizar quantidade
    const { data: item, error } = await supabaseAdmin
      .from('cart_items')
      .update({ quantity, updated_at: new Date().toISOString() })
      .eq('cart_id', cartId)
      .eq('product_id', productId)
      .select(`
        *,
        products!product_id (id, name, image_url, price, type)
      `)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ item });
  } catch (error) {
    console.error('[api/cart PATCH] Erro:', error);
    return NextResponse.json({ error: 'Erro ao atualizar carrinho' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    const cartId = await getOrCreateCart(user?.id ?? null);

    if (productId) {
      // Remover item específico
      const { error } = await supabaseAdmin
        .from('cart_items')
        .delete()
        .eq('cart_id', cartId)
        .eq('product_id', productId);
      if (error) throw error;
    } else {
      // Limpar carrinho inteiro
      const { error } = await supabaseAdmin
        .from('cart_items')
        .delete()
        .eq('cart_id', cartId);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[api/cart DELETE] Erro:', error);
    return NextResponse.json({ error: 'Erro ao remover do carrinho' }, { status: 500 });
  }
}