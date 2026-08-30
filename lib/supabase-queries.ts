/**
 * Queries Supabase para o Sistema de Gestão.
 * Centraliza todas as chamadas ao backend.
 *
 * IMPORTANTE: o banco real usa o schema `supabase_schema_full.sql` — tabelas
 * `salon_*` com colunas em inglês. Esta camada traduz entre os tipos do app
 * (gestao-types, em português) e as tabelas reais, para que as telas não
 * precisem conhecer o schema físico.
 */
import { supabase } from './supabase';
import type {
  Cliente, Profissional, Servico, ProfissionalServico,
  Agendamento, BloqueioAgenda, StatusAgendamento, CanalAgendamento,
} from './gestao-types';

export function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// Função auxiliar para silenciar erros esperados de tabelas não criadas ou IDs não-UUID (fallback para mock)
function logSupabaseError(context: string, error: any) {
  if (
    error?.message?.includes('Could not find the table') || 
    error?.code === '42P01' || 
    error?.code === '22P02' ||
    error?.message?.includes('invalid input syntax for type uuid')
  ) return;
  console.error(context, error?.message || error);
}

// ── TABELAS REAIS (schema full) ────────────────────────────
const TBL = {
  clientes: 'salon_customers',
  profissionais: 'salon_professionals',
  servicos: 'salon_services',
  profServicos: 'salon_professional_services',
  agendamentos: 'salon_appointments',
  bloqueios: 'salon_schedule_blocks',
} as const;

// ── ENUMS (DB usa UPPERCASE, app usa minúsculas) ───────────
const STATUS_TO_DB: Record<StatusAgendamento, string> = {
  pendente: 'PENDING',
  confirmado: 'CONFIRMED',
  em_atendimento: 'IN_PROGRESS',
  concluido: 'COMPLETED',
  cancelado: 'CANCELLED',
  no_show: 'NO_SHOW',
};
const STATUS_FROM_DB: Record<string, StatusAgendamento> = {
  PENDING: 'pendente',
  CONFIRMED: 'confirmado',
  IN_PROGRESS: 'em_atendimento',
  COMPLETED: 'concluido',
  CANCELLED: 'cancelado',
  NO_SHOW: 'no_show',
};
const CANAL_TO_DB: Record<CanalAgendamento, string> = {
  online: 'ONLINE',
  recepcao: 'RECEPTION',
  manual: 'MANUAL',
};
const CANAL_FROM_DB: Record<string, CanalAgendamento> = {
  ONLINE: 'online',
  RECEPTION: 'recepcao',
  MANUAL: 'manual',
};

function horaCurta(t: string | null | undefined): string {
  if (!t) return '';
  return t.slice(0, 5);
}

// ── MAPPERS row → app type ─────────────────────────────────

type Row = Record<string, any>;

function mapCliente(r: Row): Cliente {
  return {
    id: r.id,
    nome: r.name ?? '',
    telefone: r.phone ?? '',
    email: r.email ?? null,
    nascimento: r.birth_date ?? r.data_nascimento ?? null,
    observacoes: r.notes ?? null,
    criado_em: r.created_at ?? '',
    atualizado_em: r.updated_at ?? undefined,
  };
}

function mapProfissional(r: Row): Profissional {
  return {
    id: r.id,
    nome: r.name ?? '',
    foto_url: r.photo_url ?? null,
    especialidades: r.specialties ?? [],
    ativo: r.active ?? true,
    jornada_semanal: (r.weekly_schedule ?? {}) as Profissional['jornada_semanal'],
    criado_em: r.created_at ?? '',
    atualizado_em: r.updated_at ?? undefined,
  };
}

function mapServico(r: Row): Servico {
  return {
    id: r.id,
    nome: r.name ?? '',
    categoria: r.category ?? 'Geral',
    duracao_min: r.duration_minutes ?? 30,
    preco: Number(r.price ?? 0),
    ativo: r.active ?? true,
    visivel_app: r.visible_in_app ?? true,
  };
}

function mapProfServico(r: Row): ProfissionalServico {
  return { profissional_id: r.professional_id, servico_id: r.service_id };
}

function mapAgendamento(r: Row): Agendamento {
  return {
    id: r.id,
    cliente_id: r.customer_id,
    profissional_id: r.professional_id,
    servico_id: r.service_id,
    data: r.date ?? '',
    hora_inicio: horaCurta(r.start_time),
    hora_fim: horaCurta(r.end_time),
    status: STATUS_FROM_DB[r.status] ?? 'pendente',
    canal: CANAL_FROM_DB[r.channel] ?? 'online',
    observacoes: null,
    criado_em: r.created_at ?? '',
    atualizado_em: r.updated_at ?? undefined,
  };
}

function mapBloqueio(r: Row): BloqueioAgenda {
  return {
    id: r.id,
    profissional_id: r.professional_id,
    data_inicio: (r.start_time ?? '').slice(0, 10),
    data_fim: (r.end_time ?? '').slice(0, 10),
    motivo: r.reason ?? '',
    criado_em: r.created_at ?? '',
  };
}

// ── CLIENTES ─────────────────────────────────────────────

export async function fetchClientes(): Promise<Cliente[]> {
  const { data, error } = await supabase
    .from(TBL.clientes)
    .select('*')
    .order('name');

  if (error) {
    logSupabaseError('[supabase] fetchClientes error:', error);
    return [];
  }
  return (data ?? []).map(mapCliente);
}

export async function fetchClientePorId(id: string): Promise<Cliente | null> {
  const { data, error } = await supabase
    .from(TBL.clientes)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`[supabase] fetchClientePorId(${id}) error:`, error.message);
    return null;
  }
  return mapCliente(data);
}

// ── PROFISSIONAIS ────────────────────────────────────────

export async function fetchProfissionais(): Promise<Profissional[]> {
  const { data, error } = await supabase
    .from(TBL.profissionais)
    .select('*')
    .order('name');

  if (error) {
    logSupabaseError('[supabase] fetchProfissionais error:', error);
    return [];
  }
  return (data ?? []).map(mapProfissional);
}

export async function fetchProfissionalPorId(id: string): Promise<Profissional | null> {
  const { data, error } = await supabase
    .from(TBL.profissionais)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`[supabase] fetchProfissionalPorId(${id}) error:`, error.message);
    return null;
  }
  return mapProfissional(data);
}

// ── SERVIÇOS ─────────────────────────────────────────────

export async function fetchServicos(ativoOnly = false): Promise<Servico[]> {
  let query = supabase.from(TBL.servicos).select('*').order('category').order('name');
  if (ativoOnly) query = query.eq('active', true);

  const { data, error } = await query;
  if (error) {
    logSupabaseError('[supabase] fetchServicos error:', error);
    return [];
  }
  return (data ?? []).map(mapServico);
}

export async function fetchServicoPorId(id: string): Promise<Servico | null> {
  const { data, error } = await supabase
    .from(TBL.servicos)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`[supabase] fetchServicoPorId(${id}) error:`, error.message);
    return null;
  }
  return mapServico(data);
}

// ── VÍNCULO PROFISSIONAL ↔ SERVIÇO ───────────────────────

export async function fetchProfissionalServico(): Promise<ProfissionalServico[]> {
  const { data, error } = await supabase.from(TBL.profServicos).select('*');
  if (error) {
    logSupabaseError('[supabase] fetchProfissionalServico error:', error);
    return [];
  }
  return (data ?? []).map(mapProfServico);
}

// ── AGENDAMENTOS ─────────────────────────────────────────

export async function fetchAgendamentos(filtro?: {
  data?: string;
  profissional_id?: string;
  status?: string;
}): Promise<Agendamento[]> {
  let query = supabase.from(TBL.agendamentos).select('*')
    .order('date', { ascending: false })
    .order('start_time');

  if (filtro?.data) query = query.eq('date', filtro.data);
  if (filtro?.profissional_id) query = query.eq('professional_id', filtro.profissional_id);
  if (filtro?.status) {
    const st = STATUS_TO_DB[filtro.status as StatusAgendamento];
    if (st) query = query.eq('status', st);
  }

  const { data, error } = await query;
  if (error) {
    logSupabaseError('[supabase] fetchAgendamentos error:', error);
    return [];
  }
  return (data ?? []).map(mapAgendamento);
}

export async function fetchAgendamentoPorId(id: string): Promise<Agendamento | null> {
  const { data, error } = await supabase
    .from(TBL.agendamentos)
    .select(`
      *,
      cliente:${TBL.clientes}(id, name, phone, email),
      profissional:${TBL.profissionais}(id, name),
      servico:${TBL.servicos}(id, name, price, duration_minutes)
    `)
    .eq('id', id)
    .single();

  if (error) {
    logSupabaseError(`[supabase] fetchAgendamentoPorId(${id}) error:`, error);
    return null;
  }
  return mapAgendamento(data);
}

// ── BLOQUEIOS ────────────────────────────────────────────

export async function fetchBloqueios(data?: string): Promise<BloqueioAgenda[]> {
  let query = supabase.from(TBL.bloqueios).select('*').order('start_time');

  const { data: bloqueios, error } = await query;
  if (error) {
    logSupabaseError('[supabase] fetchBloqueios error:', error);
    return [];
  }
  let lista: BloqueioAgenda[] = (bloqueios ?? []).map(mapBloqueio);
  // Filtro por data é aplicado no app (coluna real é timestamptz)
  if (data) lista = lista.filter(b => b.data_inicio === data || b.data_fim === data ||
    (b.data_inicio <= data && b.data_fim >= data));
  return lista;
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
  const { data, error } = await supabase.from(TBL.agendamentos).insert({
    customer_id: payload.cliente_id,
    professional_id: payload.profissional_id,
    service_id: payload.servico_id,
    date: payload.data,
    start_time: payload.hora_inicio,
    end_time: payload.hora_fim,
    channel: CANAL_TO_DB[payload.canal || 'online'],
    status: 'PENDING',
  }).select('id').single();

  if (error) {
    logSupabaseError('[supabase] criarAgendamento error:', error);
    return null;
  }
  return data;
}

export async function atualizarStatusAgendamento(id: string, status: string): Promise<boolean> {
  const dbStatus = STATUS_TO_DB[status as StatusAgendamento] ?? status;
  const patch: Row = { status: dbStatus };

  if (dbStatus === 'CANCELLED') {
    patch.cancelado_em = new Date().toISOString();
  }

  const { error } = await supabase
    .from(TBL.agendamentos)
    .update(patch)
    .eq('id', id);

  if (error) {
    logSupabaseError(`[supabase] atualizarStatusAgendamento(${id}) error:`, error);
    return false;
  }
  return true;
}

// ── PROFISSIONAIS MUTATIONS ──────────────────────────────

/** Traduz erros comuns do Supabase/RLS para mensagens amigáveis */
function traduzirErro(error: any): string {
  const msg: string = error?.message ?? String(error);
  if (msg.includes('row-level security') || msg.includes('permission denied')) {
    return 'Permissão negada pelo banco. Faça login no painel (/login) com uma conta ADMIN.';
  }
  if (msg.includes('duplicate key')) {
    return 'Já existe um registro com esses dados.';
  }
  if (msg.includes('Could not find the table')) {
    return 'Tabela não encontrada no banco — rode o schema SQL.';
  }
  return msg;
}

// ── CLIENTES MUTATIONS ────────────────────────────────────

export async function criarCliente(payload: {
  nome: string;
  telefone: string;
  email?: string | null;
  nascimento?: string | null;
  observacoes?: string | null;
}): Promise<{ id?: string; error?: string }> {
  try {
    const res = await fetch('/api/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error || 'Erro ao criar cliente' };
    return { id: data.cliente?.id };
  } catch (err: any) {
    return { error: err?.message || 'Erro de conexão' };
  }
}

export async function atualizarCliente(id: string, payload: Partial<{
  nome: string;
  telefone: string;
  email: string | null;
  nascimento: string | null;
  observacoes: string | null;
}>): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...payload }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || 'Erro ao atualizar cliente' };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Erro de conexão' };
  }
}

export async function excluirCliente(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/clientes?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || 'Erro ao excluir cliente' };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Erro de conexão' };
  }
}

// ── PROFISSIONAIS MUTATIONS ──────────────────────────────

export async function criarProfissional(payload: {
  nome: string;
  foto_url?: string | null;
  especialidades?: string[];
  ativo?: boolean;
  jornada_semanal?: Record<number, { inicio: string; fim: string }>;
  profile_id?: string | null;
}): Promise<{ id?: string; error?: string }> {
  try {
    const res = await fetch('/api/profissionais', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok && data.profissional?.id) {
      return { id: data.profissional.id };
    }
  } catch (err) {
    console.warn('[criarProfissional] API route falhou, tentando client-side:', err);
  }

  const insert: Row = {
    name: payload.nome,
    photo_url: payload.foto_url ?? null,
    specialties: payload.especialidades ?? [],
    active: payload.ativo ?? true,
    weekly_schedule: payload.jornada_semanal ?? {},
  };
  if (payload.profile_id) insert.user_id = payload.profile_id;

  const { data, error } = await supabase
    .from(TBL.profissionais)
    .insert(insert)
    .select('id')
    .single();

  if (error) {
    logSupabaseError('[supabase] criarProfissional error:', error);
    return { error: traduzirErro(error) };
  }
  return { id: data.id };
}

export async function atualizarProfissional(id: string, payload: Partial<{
  nome: string;
  foto_url: string | null;
  especialidades: string[];
  ativo: boolean;
  jornada_semanal: Record<number, { inicio: string; fim: string }>;
}>): Promise<{ ok: boolean; error?: string }> {
  if (!isUUID(id)) {
    return { ok: true };
  }

  try {
    const res = await fetch('/api/profissionais', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...payload }),
    });
    if (res.ok) return { ok: true };
  } catch (err) {
    console.warn('[atualizarProfissional] API route falhou, tentando client-side:', err);
  }

  const patch: Row = {};
  if (payload.nome !== undefined) patch.name = payload.nome;
  if (payload.foto_url !== undefined) patch.photo_url = payload.foto_url;
  if (payload.especialidades !== undefined) patch.specialties = payload.especialidades;
  if (payload.ativo !== undefined) patch.active = payload.ativo;
  if (payload.jornada_semanal !== undefined) patch.weekly_schedule = payload.jornada_semanal;

  const { error } = await supabase
    .from(TBL.profissionais)
    .update(patch)
    .eq('id', id);

  if (error) {
    logSupabaseError(`[supabase] atualizarProfissional(${id}) error:`, error);
    if (error.code === '22P02' || error.message?.includes('invalid input syntax for type uuid')) {
      return { ok: true };
    }
    return { ok: false, error: traduzirErro(error) };
  }
  return { ok: true };
}

export async function excluirProfissional(id: string): Promise<{ ok: boolean; error?: string }> {
  if (!isUUID(id)) {
    return { ok: true };
  }

  try {
    const res = await fetch(`/api/profissionais?id=${id}`, { method: 'DELETE' });
    if (res.ok) return { ok: true };
  } catch (err) {
    console.warn('[excluirProfissional] API route falhou, tentando client-side:', err);
  }

  // Remove vínculos antes (FK em salon_professional_services)
  await supabase.from(TBL.profServicos).delete().eq('professional_id', id);

  const { error } = await supabase
    .from(TBL.profissionais)
    .delete()
    .eq('id', id);

  if (error) {
    logSupabaseError(`[supabase] excluirProfissional(${id}) error:`, error);
    if (error.code === '22P02' || error.message?.includes('invalid input syntax for type uuid')) {
      return { ok: true };
    }
    return { ok: false, error: traduzirErro(error) };
  }
  return { ok: true };
}

export async function vincularProfissionalServicos(profissionalId: string, servicoIds: string[]): Promise<{ ok: boolean; error?: string }> {
  if (!isUUID(profissionalId)) {
    return { ok: true };
  }

  // Tenta via API Server-side com service_role (garante sucesso independente de RLS)
  try {
    const res = await fetch('/api/profissionais/vinculos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profissionalId, servicoIds }),
    });
    if (res.ok) {
      return { ok: true };
    }
  } catch (apiErr) {
    console.warn('[vincularProfissionalServicos] Tentativa via API falhou, tentando fallback client:', apiErr);
  }

  // Fallback client-side
  const { error: deleteError } = await supabase
    .from(TBL.profServicos)
    .delete()
    .eq('professional_id', profissionalId);

  if (deleteError && deleteError.code !== '22P02' && deleteError.code !== '42501') {
    logSupabaseError(`[supabase] vincularProfissionalServicos delete error:`, deleteError);
  }

  const validServicoIds = servicoIds.filter(isUUID);
  if (validServicoIds.length > 0) {
    const vinculos = validServicoIds.map(service_id => ({
      professional_id: profissionalId,
      service_id,
    }));

    const { error: insertError } = await supabase
      .from(TBL.profServicos)
      .insert(vinculos);

    if (insertError && insertError.code !== '22P02') {
      logSupabaseError(`[supabase] vincularProfissionalServicos insert error:`, insertError);
      return { ok: false, error: traduzirErro(insertError) };
    }
  }

  return { ok: true };
}

// ── SERVIÇOS MUTATIONS ───────────────────────────────────

export async function criarServico(payload: {
  nome: string;
  categoria: string;
  duracao_min: number;
  preco: number;
  ativo?: boolean;
  visivel_app?: boolean;
}): Promise<{ id?: string; error?: string }> {
  try {
    const res = await fetch('/api/servicos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok && data.servico?.id) {
      return { id: data.servico.id };
    }
  } catch (err) {
    console.warn('[criarServico] API route falhou, tentando client-side:', err);
  }

  const { data, error } = await supabase
    .from(TBL.servicos)
    .insert({
      name: payload.nome,
      category: payload.categoria,
      duration_minutes: payload.duracao_min,
      price: payload.preco,
      active: payload.ativo ?? true,
      visible_in_app: payload.visivel_app ?? true,
    })
    .select('id')
    .single();

  if (error) {
    logSupabaseError('[supabase] criarServico error:', error);
    return { error: traduzirErro(error) };
  }
  return { id: data.id };
}

export async function atualizarServico(id: string, payload: Partial<{
  nome: string;
  categoria: string;
  duracao_min: number;
  preco: number;
  ativo: boolean;
  visivel_app: boolean;
}>): Promise<{ ok: boolean; error?: string }> {
  if (!isUUID(id)) {
    return { ok: true };
  }

  try {
    const res = await fetch('/api/servicos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...payload }),
    });
    if (res.ok) return { ok: true };
  } catch (err) {
    console.warn('[atualizarServico] API route falhou, tentando client-side:', err);
  }

  const patch: Row = {};
  if (payload.nome !== undefined) patch.name = payload.nome;
  if (payload.categoria !== undefined) patch.category = payload.categoria;
  if (payload.duracao_min !== undefined) patch.duration_minutes = payload.duracao_min;
  if (payload.preco !== undefined) patch.price = payload.preco;
  if (payload.ativo !== undefined) patch.active = payload.ativo;
  if (payload.visivel_app !== undefined) patch.visible_in_app = payload.visivel_app;

  const { error } = await supabase
    .from(TBL.servicos)
    .update(patch)
    .eq('id', id);

  if (error) {
    logSupabaseError(`[supabase] atualizarServico(${id}) error:`, error);
    if (error.code === '22P02' || error.message?.includes('invalid input syntax for type uuid')) {
      return { ok: true };
    }
    return { ok: false, error: traduzirErro(error) };
  }
  return { ok: true };
}

export async function excluirServico(id: string): Promise<{ ok: boolean; error?: string }> {
  if (!isUUID(id)) {
    return { ok: true };
  }

  try {
    const res = await fetch(`/api/servicos?id=${id}`, { method: 'DELETE' });
    if (res.ok) return { ok: true };
  } catch (err) {
    console.warn('[excluirServico] API route falhou, tentando client-side:', err);
  }

  // Remove vínculos antes (FK em salon_professional_services)
  await supabase.from(TBL.profServicos).delete().eq('service_id', id);

  const { error } = await supabase
    .from(TBL.servicos)
    .delete()
    .eq('id', id);

  if (error) {
    logSupabaseError(`[supabase] excluirServico(${id}) error:`, error);
    if (error.code === '22P02' || error.message?.includes('invalid input syntax for type uuid')) {
      return { ok: true };
    }
    return { ok: false, error: traduzirErro(error) };
  }
  return { ok: true };
}
