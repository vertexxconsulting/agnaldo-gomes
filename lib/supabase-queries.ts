/**
 * Queries Supabase para o Sistema de Gestão.
 * Centraliza todas as chamadas ao backend — cada função tenta
 * buscar dados reais e pode ser estendida para escrita.
 */
import { supabase } from './supabase';
import type {
  Cliente, Profissional, Servico, ProfissionalServico,
  Agendamento, BloqueioAgenda,
} from './gestao-types';

// Função auxiliar para silenciar erros esperados de tabelas não criadas (fallback para mock)
function logSupabaseError(context: string, error: any) {
  if (error?.message?.includes('Could not find the table') || error?.code === '42P01') return;
  console.error(context, error?.message || error);
}

// ── CLIENTES ─────────────────────────────────────────────

export async function fetchClientes(): Promise<Cliente[]> {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .order('nome');

  if (error) {
    logSupabaseError('[supabase] fetchClientes error:', error);
    return [];
  }
  return data ?? [];
}

export async function fetchClientePorId(id: string): Promise<Cliente | null> {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`[supabase] fetchClientePorId(${id}) error:`, error.message);
    return null;
  }
  return data;
}

// ── PROFISSIONAIS ────────────────────────────────────────

export async function fetchProfissionais(): Promise<Profissional[]> {
  const { data, error } = await supabase
    .from('profissionais')
    .select('*')
    .order('nome');

  if (error) {
    logSupabaseError('[supabase] fetchProfissionais error:', error);
    return [];
  }
  return data ?? [];
}

export async function fetchProfissionalPorId(id: string): Promise<Profissional | null> {
  const { data, error } = await supabase
    .from('profissionais')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`[supabase] fetchProfissionalPorId(${id}) error:`, error.message);
    return null;
  }
  return data;
}

// ── SERVIÇOS ─────────────────────────────────────────────

export async function fetchServicos(ativoOnly = false): Promise<Servico[]> {
  let query = supabase.from('servicos').select('*').order('categoria').order('nome');
  if (ativoOnly) query = query.eq('ativo', true);

  const { data, error } = await query;
  if (error) {
    logSupabaseError('[supabase] fetchServicos error:', error);
    return [];
  }
  return data ?? [];
}

export async function fetchServicoPorId(id: string): Promise<Servico | null> {
  const { data, error } = await supabase
    .from('servicos')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`[supabase] fetchServicoPorId(${id}) error:`, error.message);
    return null;
  }
  return data;
}

// ── VÍNCULO PROFISSIONAL ↔ SERVIÇO ───────────────────────

export async function fetchProfissionalServico(): Promise<ProfissionalServico[]> {
  const { data, error } = await supabase.from('profissional_servicos').select('*');
  if (error) {
    logSupabaseError('[supabase] fetchProfissionalServico error:', error);
    return [];
  }
  return data ?? [];
}

// ── AGENDAMENTOS ─────────────────────────────────────────

export async function fetchAgendamentos(filtro?: {
  data?: string;
  profissional_id?: string;
  status?: string;
}): Promise<Agendamento[]> {
  let query = supabase.from('agendamentos').select('*').order('data', { ascending: false }).order('hora_inicio');

  if (filtro?.data) query = query.eq('data', filtro.data);
  if (filtro?.profissional_id) query = query.eq('profissional_id', filtro.profissional_id);
  if (filtro?.status) query = query.eq('status', filtro.status);

  const { data, error } = await query;
  if (error) {
    logSupabaseError('[supabase] fetchAgendamentos error:', error);
    return [];
  }
  return data ?? [];
}

export async function fetchAgendamentoPorId(id: string): Promise<Agendamento | null> {
  const { data, error } = await supabase
    .from('agendamentos')
    .select('*, cliente:clientes(*), profissional:profissionais(*), servico:servicos(*)')
    .eq('id', id)
    .single();

  if (error) {
    logSupabaseError(`[supabase] fetchAgendamentoPorId(${id}) error:`, error);
    return null;
  }
  return data;
}

// ── BLOQUEIOS ────────────────────────────────────────────

export async function fetchBloqueios(data?: string): Promise<BloqueioAgenda[]> {
  let query = supabase.from('bloqueios').select('*').order('data_inicio');
  if (data) query = query.eq('data_inicio', data);

  const { data: bloqueios, error } = await query;
  if (error) {
    logSupabaseError('[supabase] fetchBloqueios error:', error);
    return [];
  }
  return bloqueios ?? [];
}

// ── MUTATIONS ────────────────────────────────────────────

export async function criarAgendamento(payload: {
  cliente_id: string;
  profissional_id: string;
  servico_id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  canal?: 'online' | 'recepcao';
}): Promise<{ id: string } | null> {
  const { data, error } = await supabase.from('agendamentos').insert({
    ...payload,
    canal: payload.canal || 'online',
    status: 'pendente',
  }).select('id').single();

  if (error) {
    logSupabaseError('[supabase] criarAgendamento error:', error);
    return null;
  }
  return data;
}

export async function atualizarStatusAgendamento(id: string, status: string): Promise<boolean> {
  const { error } = await supabase
    .from('agendamentos')
    .update({ status })
    .eq('id', id);

  if (error) {
    logSupabaseError(`[supabase] atualizarStatusAgendamento(${id}) error:`, error);
    return false;
  }
  return true;
}

// ── PROFISSIONAIS MUTATIONS ──────────────────────────────

export async function criarProfissional(payload: {
  nome: string;
  foto_url?: string | null;
  especialidades?: string[];
  ativo?: boolean;
  jornada_semanal?: Record<number, { inicio: string; fim: string }>;
  profile_id?: string | null;
}): Promise<{ id: string } | null> {
  const { data, error } = await supabase.from('profissionais').insert({
    nome: payload.nome,
    foto_url: payload.foto_url ?? null,
    especialidades: payload.especialidades ?? [],
    ativo: payload.ativo ?? true,
    jornada_semanal: payload.jornada_semanal ?? {},
    profile_id: payload.profile_id ?? null,
  }).select('id').single();

  if (error) {
    logSupabaseError('[supabase] criarProfissional error:', error);
    return null;
  }
  return data;
}

export async function atualizarProfissional(id: string, payload: Partial<{
  nome: string;
  foto_url: string | null;
  especialidades: string[];
  ativo: boolean;
  jornada_semanal: Record<number, { inicio: string; fim: string }>;
}>): Promise<boolean> {
  const { error } = await supabase
    .from('profissionais')
    .update(payload)
    .eq('id', id);

  if (error) {
    logSupabaseError(`[supabase] atualizarProfissional(${id}) error:`, error);
    return false;
  }
  return true;
}

export async function excluirProfissional(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('profissionais')
    .delete()
    .eq('id', id);

  if (error) {
    logSupabaseError(`[supabase] excluirProfissional(${id}) error:`, error);
    return false;
  }
  return true;
}

export async function vincularProfissionalServicos(profissionalId: string, servicoIds: string[]): Promise<boolean> {
  // Remove antigos vínculos
  const { error: deleteError } = await supabase
    .from('profissional_servicos')
    .delete()
    .eq('profissional_id', profissionalId);

  if (deleteError) {
    logSupabaseError(`[supabase] vincularProfissionalServicos delete error:`, deleteError);
    return false;
  }

  // Adiciona novos vínculos
  if (servicoIds.length > 0) {
    const vinculos = servicoIds.map(servico_id => ({
      profissional_id: profissionalId,
      servico_id,
    }));

    const { error: insertError } = await supabase
      .from('profissional_servicos')
      .insert(vinculos);

    if (insertError) {
      logSupabaseError(`[supabase] vincularProfissionalServicos insert error:`, insertError);
      return false;
    }
  }

  return true;
}
