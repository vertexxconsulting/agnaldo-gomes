import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/loja-settings'; // reusing the admin client
import { getVimeoSettings } from '@/lib/vimeo-settings';

export async function GET() {
  const results: Record<string, { status: 'ok' | 'error' | 'warning' | 'idle', msg: string }> = {
    evolution: { status: 'idle', msg: 'Verificando...' },
    mercadopago: { status: 'idle', msg: 'Verificando...' },
    vimeo: { status: 'idle', msg: 'Verificando...' },
    bolten: { status: 'idle', msg: 'Verificando...' },
    stripe: { status: 'idle', msg: 'Verificando...' },
    bunny: { status: 'idle', msg: 'Verificando...' },
  };

  try {
    // 1. Check Evolution (Simulated/Internal check since we don't have a generic Evolution lib here)
    // In a real scenario, we'd call the Evolution API. For now, we check if config exists.
    const supabase = await getSupabaseAdmin();
    const { data: evoConfig } = await supabase.from('loja_settings').select('envio_automatico').single();
    results.evolution = evoConfig?.envio_automatico 
      ? { status: 'ok', msg: 'Configurado' } 
      : { status: 'error', msg: 'Não configurado' };

    // 2. Check Mercado Pago
    const mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN;
    results.mercadopago = mpToken 
      ? { status: 'ok', msg: 'Token detectado' } 
      : { status: 'error', msg: 'Token ausente' };

    // 3. Check Vimeo
    const vimeo = await getVimeoSettings();
    results.vimeo = (vimeo && vimeo.enabled) 
      ? { status: 'ok', msg: 'Ativo' } 
      : { status: 'error', msg: 'Inativo' };

    // 4. Check Bolten (Checking if it's configured in the API route logic)
    // Since Bolten uses separate envs, we check if the key is present in the environment
    results.bolten = process.env.BOLTEN_API_KEY 
      ? { status: 'ok', msg: 'Chave detectada' } 
      : { status: 'error', msg: 'Chave ausente' };

    // 5. Check Stripe
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (stripeKey) {
      if (stripeKey.startsWith('sk_test_')) {
        results.stripe = { status: 'warning', msg: 'Modo Teste' };
      } else {
        results.stripe = { status: 'ok', msg: 'Modo Produção' };
      }
    } else {
      results.stripe = { status: 'error', msg: 'Chave ausente' };
    }

    // 6. Check Bunny
    results.bunny = process.env.BUNNY_API_KEY
      ? { status: 'ok', msg: 'Chave detectada' }
      : { status: 'error', msg: 'Chave ausente' };

  } catch (error) {
    console.error('Erro no Health Check:', error);
  }

  return NextResponse.json(results);
}
