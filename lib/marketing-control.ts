import { getSupabaseServiceClient } from '@/lib/supabase/server';
import {
  SessaoMarketingConfig, MarketingAutomacaoConfig, CONFIG_PADRAO_MARKETING
} from './marketing-types';

export * from './marketing-types';

const SETTING_KEY_CONFIG = 'marketing_automacao_config';
const SETTING_KEY_LAST_SENT = 'marketing_ultimo_disparo_ts';

/**
 * Retorna a hora atual no fuso horário do Brasil (BRT, UTC-3) no formato "HH:MM"
 */
export function horaAtualBRT(): string {
  const agora = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return agora.toISOString().slice(11, 16);
}

/**
 * Retorna as configurações de automação de marketing armazenadas no banco
 */
export async function getMarketingConfig(): Promise<MarketingAutomacaoConfig> {
  try {
    const supabase = await getSupabaseServiceClient();
    const { data } = await supabase
      .from('salon_system_settings')
      .select('value')
      .eq('key', SETTING_KEY_CONFIG)
      .maybeSingle();

    if (data?.value) {
      const parsed = JSON.parse(data.value);
      return {
        aniversarios: {
          ativo: Boolean(parsed.aniversarios?.ativo),
          horario: parsed.aniversarios?.horario || '09:00',
        },
        agenda_confirmacao: {
          ativo: Boolean(parsed.agenda_confirmacao?.ativo),
          horario: parsed.agenda_confirmacao?.horario || '09:30',
        },
        agenda_lembrete: {
          ativo: Boolean(parsed.agenda_lembrete?.ativo),
          horario: parsed.agenda_lembrete?.horario || '08:30',
        },
        feedback: {
          ativo: Boolean(parsed.feedback?.ativo),
          horario: parsed.feedback?.horario || '16:00',
          tipo_filtro: parsed.feedback?.tipo_filtro === 'selecionados' ? 'selecionados' : 'todos',
          servicos_permitidos: Array.isArray(parsed.feedback?.servicos_permitidos) ? parsed.feedback.servicos_permitidos : [],
          categorias_permitidas: Array.isArray(parsed.feedback?.categorias_permitidas) ? parsed.feedback.categorias_permitidas : [],
        },
        reativacao: {
          ativo: Boolean(parsed.reativacao?.ativo),
          horario: parsed.reativacao?.horario || '11:00',
        },
        intervalo_segundos: Math.max(60, Number(parsed.intervalo_segundos) || 60),
      };
    }
  } catch (err) {
    console.error('[marketing-control] Erro ao carregar config:', err);
  }

  return { ...CONFIG_PADRAO_MARKETING };
}

/**
 * Salva as configurações de automação no banco
 */
export async function saveMarketingConfig(
  config: MarketingAutomacaoConfig
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseServiceClient();
    const sanitizado: MarketingAutomacaoConfig = {
      aniversarios: {
        ativo: Boolean(config.aniversarios?.ativo),
        horario: config.aniversarios?.horario || '09:00',
      },
      agenda_confirmacao: {
        ativo: Boolean(config.agenda_confirmacao?.ativo),
        horario: config.agenda_confirmacao?.horario || '09:30',
      },
      agenda_lembrete: {
        ativo: Boolean(config.agenda_lembrete?.ativo),
        horario: config.agenda_lembrete?.horario || '08:30',
      },
      feedback: {
        ativo: Boolean(config.feedback?.ativo),
        horario: config.feedback?.horario || '16:00',
        tipo_filtro: config.feedback?.tipo_filtro === 'selecionados' ? 'selecionados' : 'todos',
        servicos_permitidos: Array.isArray(config.feedback?.servicos_permitidos) ? config.feedback.servicos_permitidos : [],
        categorias_permitidas: Array.isArray(config.feedback?.categorias_permitidas) ? config.feedback.categorias_permitidas : [],
      },
      reativacao: {
        ativo: Boolean(config.reativacao?.ativo),
        horario: config.reativacao?.horario || '11:00',
      },
      intervalo_segundos: Math.max(60, Number(config.intervalo_segundos) || 60),
    };

    const { error } = await supabase
      .from('salon_system_settings')
      .upsert(
        {
          key: SETTING_KEY_CONFIG,
          value: JSON.stringify(sanitizado),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

    if (error) throw error;
    return { ok: true };
  } catch (err: any) {
    console.error('[marketing-control] Erro ao salvar config:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Retorna o conjunto de chaves únicas já disparadas na data ISO (YYYY-MM-DD)
 */
export async function getDisparosHoje(dataISO: string): Promise<Set<string>> {
  try {
    const supabase = await getSupabaseServiceClient();
    const chaveSetting = `marketing_disparos_${dataISO}`;
    const { data } = await supabase
      .from('salon_system_settings')
      .select('value')
      .eq('key', chaveSetting)
      .maybeSingle();

    if (data?.value) {
      const lista: string[] = JSON.parse(data.value);
      return new Set(lista);
    }
  } catch (err) {
    console.error('[marketing-control] Erro ao buscar disparos de hoje:', err);
  }
  return new Set();
}

// Timestamp em memória do último disparo (complementado pelo banco)
let ultimoDisparoMemoriaTs = 0;

/**
 * Obtém o timestamp (ms) do último disparo realizado (banco + memória)
 */
export async function getUltimoDisparoTs(): Promise<number> {
  try {
    const supabase = await getSupabaseServiceClient();
    const { data } = await supabase
      .from('salon_system_settings')
      .select('value')
      .eq('key', SETTING_KEY_LAST_SENT)
      .maybeSingle();

    const dbTs = data?.value ? Number(data.value) || 0 : 0;
    return Math.max(ultimoDisparoMemoriaTs, dbTs);
  } catch {
    return ultimoDisparoMemoriaTs;
  }
}

/**
 * Aguarda apenas o tempo restante para completar o intervalo mínimo (pelo menos 60s)
 * desde o último disparo registrado.
 * Assim, a 1ª mensagem sai imediatamente se não houve envio no último minuto,
 * e a função NUNCA fica esperando 60s à toa depois de enviar a última mensagem!
 */
export async function aguardarJanelaSeguraAntesDoDisparo(intervaloSegundos: number): Promise<void> {
  const intervaloMs = Math.max(60, Number(intervaloSegundos) || 60) * 1000;
  const ultimoTs = await getUltimoDisparoTs();
  if (ultimoTs > 0) {
    const decorrido = Date.now() - ultimoTs;
    if (decorrido < intervaloMs) {
      const restanteMs = intervaloMs - decorrido;
      await new Promise(resolve => setTimeout(resolve, restanteMs));
    }
  }
}

/**
 * Registra um envio no log do dia para prevenir qualquer duplicidade
 * e atualiza o timestamp global do último disparo.
 */
export async function registrarDisparoHoje(chaveUnica: string, dataISO: string): Promise<void> {
  const agoraTs = Date.now();
  ultimoDisparoMemoriaTs = agoraTs;
  try {
    const supabase = await getSupabaseServiceClient();
    const chaveSetting = `marketing_disparos_${dataISO}`;
    const setExistente = await getDisparosHoje(dataISO);
    setExistente.add(chaveUnica);

    const isoNow = new Date(agoraTs).toISOString();
    await Promise.all([
      supabase
        .from('salon_system_settings')
        .upsert(
          {
            key: chaveSetting,
            value: JSON.stringify(Array.from(setExistente)),
            updated_at: isoNow,
          },
          { onConflict: 'key' }
        ),
      supabase
        .from('salon_system_settings')
        .upsert(
          {
            key: SETTING_KEY_LAST_SENT,
            value: String(agoraTs),
            updated_at: isoNow,
          },
          { onConflict: 'key' }
        ),
    ]);
  } catch (err) {
    console.error('[marketing-control] Erro ao registrar disparo:', err);
  }
}

/**
 * Aguarda o intervalo de segurança configurado (mínimo de 60 segundos)
 */
export async function esperarIntervaloSeguro(intervaloSegundos: number): Promise<void> {
  const tempoMs = Math.max(60, Number(intervaloSegundos) || 60) * 1000;
  await new Promise(resolve => setTimeout(resolve, tempoMs));
}

// Mutex em memória com expiração automática de segurança (3 min)
let lockDisparoTimestamp = 0;
const LOCK_TTL_MS = 3 * 60 * 1000;

export function tentarObterLockDisparo(): boolean {
  const agora = Date.now();
  if (lockDisparoTimestamp > 0 && agora - lockDisparoTimestamp < LOCK_TTL_MS) {
    return false;
  }
  lockDisparoTimestamp = agora;
  return true;
}

export function liberarLockDisparo(): void {
  lockDisparoTimestamp = 0;
}
