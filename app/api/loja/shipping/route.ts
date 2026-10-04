import { NextResponse } from 'next/server';
import { calculateShippingRates } from '@/lib/melhorenvio';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { cep, items } = await request.json();

    if (!cep || !items || items.length === 0) {
      return NextResponse.json({ error: 'CEP e itens são obrigatórios' }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();
    
    // Obter o CEP de origem da loja (salvo no banco ou variável de ambiente)
    const { data: config } = await supabase.from('loja_settings').select('cep_origem').single();
    // Default fallback to Telêmaco Borba se não configurado
    const fromCep = config?.cep_origem || '84261000'; 

    const rates = await calculateShippingRates({
      fromCep,
      toCep: cep,
      items
    });

    return NextResponse.json({ rates });
  } catch (error) {
    console.error('Erro ao calcular frete:', error);
    return NextResponse.json({ error: 'Erro ao calcular frete' }, { status: 500 });
  }
}
