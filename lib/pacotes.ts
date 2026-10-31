import { supabase } from '@/lib/supabase';
import type { PacoteCliente } from '@/lib/gestao-types';

const SETTING_KEY = 'clientes_pacotes';

/**
 * Busca todos os pacotes ativos ou filtrados por cliente_id
 */
export async function fetchPacotesClientes(clienteId?: string): Promise<PacoteCliente[]> {
  try {
    const { data, error } = await supabase
      .from('salon_system_settings')
      .select('value')
      .eq('key', SETTING_KEY)
      .maybeSingle();

    if (error || !data?.value) {
      return [];
    }

    const pacotes: PacoteCliente[] = JSON.parse(data.value);
    if (!Array.isArray(pacotes)) return [];

    if (clienteId) {
      return pacotes.filter(p => p.cliente_id === clienteId && p.status === 'ATIVO');
    }
    return pacotes;
  } catch (err) {
    console.error('Erro ao buscar pacotes de clientes:', err);
    return [];
  }
}

/**
 * Salva ou atualiza um pacote de cliente
 */
export async function salvarPacoteCliente(pacote: PacoteCliente): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('salon_system_settings')
      .select('value')
      .eq('key', SETTING_KEY)
      .maybeSingle();

    let lista: PacoteCliente[] = [];
    if (data?.value) {
      try {
        lista = JSON.parse(data.value);
      } catch {
        lista = [];
      }
    }

    const index = lista.findIndex(p => p.id === pacote.id);
    if (index >= 0) {
      lista[index] = pacote;
    } else {
      lista.unshift(pacote);
    }

    const { error } = await supabase
      .from('salon_system_settings')
      .upsert({ key: SETTING_KEY, value: JSON.stringify(lista) }, { onConflict: 'key' });

    return !error;
  } catch (err) {
    console.error('Erro ao salvar pacote de cliente:', err);
    return false;
  }
}

/**
 * Abate 1 sessão do pacote para um atendimento
 */
export async function abaterSessaoPacote(pacoteId: string, agendamentoId: string): Promise<{ ok: boolean; pacote?: PacoteCliente; error?: string }> {
  try {
    const { data } = await supabase
      .from('salon_system_settings')
      .select('value')
      .eq('key', SETTING_KEY)
      .maybeSingle();

    if (!data?.value) {
      return { ok: false, error: 'Nenhum pacote encontrado.' };
    }

    const lista: PacoteCliente[] = JSON.parse(data.value);
    const pacote = lista.find(p => p.id === pacoteId);
    if (!pacote) {
      return { ok: false, error: 'Pacote não localizado.' };
    }

    if (pacote.sessoes_restantes <= 0) {
      return { ok: false, error: 'Este pacote não possui mais sessões disponíveis.' };
    }

    pacote.sessoes_utilizadas += 1;
    pacote.sessoes_restantes = Math.max(0, pacote.sessoes_total - pacote.sessoes_utilizadas);
    if (pacote.sessoes_restantes === 0) {
      pacote.status = 'CONCLUIDO';
    }

    const { error } = await supabase
      .from('salon_system_settings')
      .upsert({ key: SETTING_KEY, value: JSON.stringify(lista) }, { onConflict: 'key' });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, pacote };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Erro inesperado ao abater pacote.' };
  }
}

/**
 * Estorna 1 sessão do pacote caso o procedimento seja desvinculado
 */
export async function estornarSessaoPacote(pacoteId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('salon_system_settings')
      .select('value')
      .eq('key', SETTING_KEY)
      .maybeSingle();

    if (!data?.value) return false;

    const lista: PacoteCliente[] = JSON.parse(data.value);
    const pacote = lista.find(p => p.id === pacoteId);
    if (!pacote) return false;

    if (pacote.sessoes_utilizadas > 0) {
      pacote.sessoes_utilizadas -= 1;
      pacote.sessoes_restantes = Math.max(0, pacote.sessoes_total - pacote.sessoes_utilizadas);
      pacote.status = 'ATIVO';
    }

    const { error } = await supabase
      .from('salon_system_settings')
      .upsert({ key: SETTING_KEY, value: JSON.stringify(lista) }, { onConflict: 'key' });

    return !error;
  } catch {
    return false;
  }
}

