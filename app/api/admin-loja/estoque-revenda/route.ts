import { NextResponse } from 'next/server';
import { requireLojaAuth } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  const auth = await requireLojaAuth();
  if (auth.error) return auth.error;

  try {
    const { data, error } = await supabaseAdmin
      .from('salon_inventory')
      .select(
        'id, name, brand, category, unit, stock_qty, sale_price, allow_sale, active, image_url, notes'
      )
      .eq('allow_sale', true)
      .eq('active', true)
      .order('name');

    if (error) {
      console.error('[api/admin-loja/estoque-revenda GET]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao carregar estoque de revenda.' },
      { status: 500 }
    );
  }
}
