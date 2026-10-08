import { createClient } from '@supabase/supabase-js';

// Client administrativo para configurações da loja (Executado APENAS no servidor)
export async function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface LojaSettings {
  cep_origem: string;
  prazo_manuseio: string;
  frete_gratis: boolean;
  frete_gratis_acima_de: string;
  valor_motoboy: string;
  valor_correios: string;
  envio_automatico: boolean;
  envio_manual: boolean;
  fidelidade_ativa: boolean;
  agendamento_ativo: boolean;
  agendamento_direto?: boolean;
  whatsapp_contato?: string;
}

export async function getLojaSettings(): Promise<LojaSettings | null> {
  const supabaseAdmin = await getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('loja_settings')
    .select('*')
    .single();

  if (error || !data) return null;

  return {
    cep_origem: data.cep_origem,
    prazo_manuseio: data.prazo_manuseio,
    frete_gratis: data.frete_gratis,
    frete_gratis_acima_de: data.frete_gratis_acima_de,
    valor_motoboy: data.valor_motoboy,
    valor_correios: data.valor_correios,
    envio_automatico: data.envio_automatico ?? false,
    envio_manual: data.envio_manual ?? true,
    fidelidade_ativa: data.fidelidade_ativa ?? true,
    agendamento_ativo: data.agendamento_ativo ?? true,
    agendamento_direto: data.agendamento_direto ?? false,
    whatsapp_contato: data.whatsapp_contato || '',
  };
}

export async function saveLojaSettings(settings: LojaSettings) {
  const supabaseAdmin = await getSupabaseAdmin();
  const { error } = await supabaseAdmin
    .from('loja_settings')
    .upsert({
      id: 1, 
      ...settings,
      updated_at: new Date().toISOString(),
    });

  if (error) throw new Error(`Erro ao salvar configurações da loja: ${error.message}`);
  return { success: true };
}
