import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/loja-settings'; // reusing the admin client
import { getVimeoSettings } from '@/lib/vimeo-settings';
import { verificarStatusWhatsApp } from '@/lib/evolution';

export async function GET() {
  const results: Record<string, { status: 'ok' | 'error' | 'warning' | 'idle', msg: string }> = {
    evolution: { status: 'idle', msg: 'Verificando...' },
    asaas: { status: 'idle', msg: 'Verificando...' },
    vimeo: { status: 'idle', msg: 'Verificando...' },
    bolten: { status: 'idle', msg: 'Verificando...' },
    stripe: { status: 'idle', msg: 'Verificando...' },
    bunny: { status: 'idle', msg: 'Verificando...' },
    melhorenvio: { status: 'idle', msg: 'Verificando...' },
  };

  try {
    const supabase = await getSupabaseAdmin();

    // 1. Check Evolution
    try {
      const wa = await verificarStatusWhatsApp();
      if (wa.conectado) {
        results.evolution = { status: 'ok', msg: 'WhatsApp Conectado e Ativo' };
      } else if (wa.online) {
        results.evolution = { 
          status: 'warning', 
          msg: wa.state === 'connecting' ? 'Aguardando leitura do QR Code' : 'Instância desconectada' 
        };
      } else {
        results.evolution = { status: 'error', msg: 'Servidor Evolution Offline' };
      }
    } catch {
      results.evolution = { status: 'error', msg: 'Falha ao consultar Evolution API' };
    }

    // 2. Check Asaas
    const asaasKey = process.env.ASAAS_API_KEY;
    if (asaasKey) {
      if (asaasKey.includes('sandbox')) {
        results.asaas = { status: 'warning', msg: 'Modo Sandbox (Teste)' };
      } else {
        results.asaas = { status: 'ok', msg: 'Chave detectada' };
      }
    } else {
      results.asaas = { status: 'error', msg: 'Chave ausente' };
    }

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

    // 7. Check Melhor Envio
    const { data: shippingConfig } = await supabase.from('shipping_config').select('melhor_envio_token').single();
    if (shippingConfig && shippingConfig.melhor_envio_token) {
      results.melhorenvio = { status: 'ok', msg: 'Token detectado' };
    } else if (process.env.MELHOR_ENVIO_TOKEN) {
      results.melhorenvio = { status: 'ok', msg: 'Via .env' };
    } else {
      results.melhorenvio = { status: 'error', msg: 'Token ausente' };
    }

  } catch (error) {
    console.error('Erro no Health Check:', error);
  }

  return NextResponse.json(results);
}
