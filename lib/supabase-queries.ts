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
  ProdutoEstoque, MovimentacaoEstoque, ServicoProduto,
  RegraComissao, Comissao, ParcelaComissao, FormaPagamento,
  InsumoAtendimento, ItemComanda, PaymentFee, ConfigTaxas,
  PeriodoRecebimentoComissao, ComandaMultiProfissional, ProcedimentoComanda
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
  appointment_items: 'salon_appointment_items',
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
    codigo: r.codigo,
    nome: r.name ?? '',
    telefone: r.phone ?? '',
    email: r.email ?? null,
    cpf: r.cpf ?? null,
    endereco: r.address ?? null,
    nascimento: r.birth_date ?? r.data_nascimento ?? null,
    observacoes: r.notes ?? null,
    criado_em: r.created_at ?? '',
    atualizado_em: r.updated_at ?? undefined,
    loyalty_points: r.loyalty_points ?? 0,
  };
}

function mapProfissional(r: Row): Profissional {
  const sched = (r.weekly_schedule ?? {}) as any;
  const metaPin = sched?._meta?.stock_pin;
  const metaPeriodo = sched?._meta?.periodo_recebimento;
  return {
    id: r.id,
    nome: r.name ?? '',
    foto_url: r.photo_url ?? null,
    categoria: r.categoria ?? r.category ?? null,
    especialidades: r.specialties ?? [],
    ativo: r.active ?? true,
    jornada_semanal: sched as Profissional['jornada_semanal'],
    stock_pin: r.stock_pin || metaPin || null,
    periodo_recebimento: (r.commission_frequency || metaPeriodo || 'semanal') as PeriodoRecebimentoComissao,
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
    preco_maximo: r.price_max != null ? Number(r.price_max) : null,
    preco_variavel: r.is_variable_price ?? false,
    ativo: r.active ?? true,
    visivel_app: r.visible_in_app ?? true,
    points_reward: r.points_reward ?? 0,
    points_cost: r.points_cost ?? 0,
    is_addon: r.is_addon ?? false,
  };
}

function mapProfServico(r: Row): ProfissionalServico {
  return { profissional_id: r.professional_id, servico_id: r.service_id };
}

function mapAgendamento(r: Row): Agendamento {
  const rawSubs = Array.isArray(r.sub_services) ? r.sub_services : [];
  const metaObj = rawSubs.find((s: any) => s?._meta) || {};
  const metaAllowOverlap = Boolean(metaObj.allow_overlap);
  const cleanSubs = rawSubs.filter((s: any) => !s?._meta);

  // Status financeiro: PENDING_CONFIRMATION (Pré-fechamento pela secretaria) ou CONFIRMED (Confirmado pela gestão)
  let finStatus = 'PENDING_CONFIRMATION';
  if (r.financial_status === 'CONFIRMED' || metaObj.financial_status === 'CONFIRMED') {
    finStatus = 'CONFIRMED';
  } else if (r.financial_status === 'PENDING_CONFIRMATION' || metaObj.financial_status === 'PENDING_CONFIRMATION') {
    finStatus = 'PENDING_CONFIRMATION';
  } else if (r.payment_method && r.status === 'COMPLETED') {
    finStatus = 'CONFIRMED';
  }

  // Auxiliares (assistant_ids na coluna dedicada ou em _meta.auxiliares_ids)
  const auxiliares: string[] = Array.isArray(r.assistant_ids) && r.assistant_ids.length > 0
    ? r.assistant_ids
    : (Array.isArray(metaObj.auxiliares_ids) ? metaObj.auxiliares_ids : []);

  const prodCost = r.product_cost != null 
    ? Number(r.product_cost) 
    : (metaObj.product_cost != null ? Number(metaObj.product_cost) : 0);

  const insumosDet = Array.isArray(metaObj.insumos_procedimento) 
    ? metaObj.insumos_procedimento 
    : [];

  return {
    id: r.id,
    cliente_id: r.customer_id,
    profissional_id: r.professional_id,
    servico_id: r.service_id,
    sub_servicos: cleanSubs,
    auxiliares_ids: auxiliares,
    allow_overlap: Boolean(r.allow_overlap || metaAllowOverlap),
    is_fixed: Boolean(r.is_fixed),
    recurrence_type: r.recurrence_type || null,
    recurrence_custom_day: r.recurrence_custom_day != null ? Number(r.recurrence_custom_day) : null,
    data: r.date ?? '',
    hora_inicio: horaCurta(r.start_time),
    hora_fim: horaCurta(r.end_time),
    status: STATUS_FROM_DB[r.status] ?? 'pendente',
    canal: CANAL_FROM_DB[r.channel] ?? 'online',
    payment_method: r.payment_method ?? null,
    total_amount: r.total_amount != null ? Number(r.total_amount) : null,
    product_cost: prodCost,
    insumos_detalhes: insumosDet,
    split_comissao: metaObj.split_comissao || undefined,
    comanda_unificada: metaObj.comanda_unificada || undefined,
    unificado_em_id: metaObj.unificado_em_id || null,
    financial_status: finStatus,
    desconto_valor: metaObj.desconto_valor != null ? Number(metaObj.desconto_valor) : undefined,
    desconto_pct: metaObj.desconto_pct != null ? Number(metaObj.desconto_pct) : undefined,
    pacote_utilizado_id: metaObj.pacote_utilizado_id || undefined,
    pacote_nome: metaObj.pacote_nome || undefined,
    descontado_pacote: Boolean(metaObj.descontado_pacote),
    agnaldo_recebe_comissao: metaObj.agnaldo_recebe_comissao !== undefined ? Boolean(metaObj.agnaldo_recebe_comissao) : true,
    confirmed_at: r.confirmed_at || metaObj.confirmed_at || null,
    confirmed_by: r.confirmed_by || metaObj.confirmed_by || null,
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
  try {
    const res = await fetch('/api/clientes');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map(mapCliente);
      }
    }
  } catch (err) {
    console.warn('[fetchClientes] API server falhou, tentando client-side:', err);
  }

  const { count, error: countErr } = await supabase
    .from(TBL.clientes)
    .select('*', { count: 'exact', head: true });

  if (countErr) {
    logSupabaseError('[supabase] fetchClientes count error:', countErr);
    return [];
  }

  const total = count || 0;
  const pages = Math.ceil(total / 1000);

  const promises = Array.from({ length: pages }, (_, i) => {
    const from = i * 1000;
    return supabase
      .from(TBL.clientes)
      .select('*')
      .order('name')
      .range(from, from + 999);
  });

  const results = await Promise.all(promises);
  let all: any[] = [];
  for (const res of results) {
    if (res.error) {
      logSupabaseError('[supabase] fetchClientes batch error:', res.error);
    } else {
      all = all.concat(res.data || []);
    }
  }

  return all.map(mapCliente);
}

export async function fetchClientePorId(id: string): Promise<Cliente | null> {
  const { data, error } = await supabase
    .from(TBL.clientes)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('[supabase] fetchClientePorId error for id', id, ':', error.message);
    return null;
  }
  return mapCliente(data);
}

// ── PROFISSIONAIS ────────────────────────────────────────

export async function fetchProfissionais(): Promise<Profissional[]> {
  try {
    const res = await fetch('/api/profissionais');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map(mapProfissional);
      }
    }
  } catch (err) {
    console.warn('[fetchProfissionais] API server falhou, tentando client-side:', err);
  }

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
    console.error('[supabase] fetchProfissionalPorId error for id', id, ':', error.message);
    return null;
  }
  return mapProfissional(data);
}

// ── SERVIÇOS ─────────────────────────────────────────────

export async function fetchServicos(ativoOnly = false): Promise<Servico[]> {
  try {
    const res = await fetch('/api/servicos');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        let list = data.map(mapServico);
        if (ativoOnly) list = list.filter(s => s.ativo);
        return list;
      }
    }
  } catch (err) {
    console.warn('[fetchServicos] API server falhou, tentando client-side:', err);
  }

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
    console.error('[supabase] fetchServicoPorId error for id', id, ':', error.message);
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
  try {
    let url = '/api/agendamentos/admin';
    const params = new URLSearchParams();
    if (filtro?.data) params.append('data', filtro.data);
    if (filtro?.profissional_id) params.append('profissional_id', filtro.profissional_id);
    const qs = params.toString();
    if (qs) url += `?${qs}`;

    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        let list = data.map(mapAgendamento);
        if (filtro?.status) list = list.filter(a => a.status === filtro.status);
        return list;
      }
    }
  } catch (err) {
    console.warn('[fetchAgendamentos] API server falhou, tentando client-side:', err);
  }

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

export async function fetchPendenciasAgendamentosProfissional(profId: string): Promise<Agendamento[]> {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from(TBL.agendamentos)
      .select('*')
      .eq('professional_id', profId)
      .lt('date', hoje)
      .in('status', ['IN_PROGRESS', 'CONFIRMED', 'PENDING'])
      .order('date', { ascending: false });

    if (error) {
      logSupabaseError('[fetchPendenciasAgendamentosProfissional] error:', error);
      return [];
    }
    return (data ?? []).map(mapAgendamento);
  } catch (err) {
    console.warn('[fetchPendenciasAgendamentosProfissional] erro:', err);
    return [];
  }
}

export async function fetchAgendamentoPorId(id: string): Promise<Agendamento | null> {
  try {
    const res = await fetch(`/api/agendamentos/admin?id=${encodeURIComponent(id)}`);
    if (res.ok) {
      const data = await res.json();
      if (data) return mapAgendamento(data);
    }
  } catch (err) {
    console.warn('[fetchAgendamentoPorId] API server falhou, tentando client-side:', err);
  }

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
  try {
    const res = await fetch('/api/agendamentos/bloqueios');
    if (res.ok) {
      const dbData = await res.json();
      if (Array.isArray(dbData)) {
        let lista = dbData.map(mapBloqueio);
        if (data) lista = lista.filter(b => b.data_inicio === data || b.data_fim === data ||
          (b.data_inicio <= data && b.data_fim >= data));
        return lista;
      }
    }
  } catch (err) {
    console.warn('[fetchBloqueios] API server falhou, tentando client-side:', err);
  }

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
  try {
    const res = await fetch('/api/agendamentos/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const resp = await res.json();
      if (resp?.agendamento?.id) return { id: resp.agendamento.id };
      if (Array.isArray(resp?.agendamentos) && resp.agendamentos[0]?.id) return { id: resp.agendamentos[0].id };
    }
  } catch (err) {
    console.warn('[criarAgendamento] API server falhou, tentando client-side:', err);
  }

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
  try {
    const res = await fetch('/api/agendamentos/admin', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) return true;
  } catch (err) {
    console.warn('[atualizarStatusAgendamento] API server falhou, tentando client-side:', err);
  }

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

export async function atualizarProcedimentoCadeiraAgendamento(params: {
  id: string;
  servico_id: string;
  sub_servicos?: any[];
  total_amount?: number;
  product_cost?: number;
}): Promise<boolean> {
  try {
    const res = await fetch('/api/agendamentos/admin', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (res.ok) return true;
  } catch (err) {
    console.warn('[atualizarProcedimentoCadeiraAgendamento] API server falhou:', err);
  }

  const patch: Row = {
    service_id: params.servico_id,
  };
  if (params.sub_servicos) patch.sub_services = params.sub_servicos;
  if (params.total_amount != null) patch.total_amount = params.total_amount;
  if (params.product_cost != null) patch.product_cost = params.product_cost;

  const { error } = await supabase.from(TBL.agendamentos).update(patch).eq('id', params.id);
  return !error;
}

export async function excluirAgendamentoAdmin(id: string): Promise<boolean> {
  try {
    const res = await fetch('/api/agendamentos/admin', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, modo: 'apenas_dia', excluir_atual: true }),
    });
    if (res.ok) return true;
  } catch (err) {
    console.warn('[excluirAgendamentoAdmin] API server falhou:', err);
  }
  const { error } = await supabase.from(TBL.agendamentos).delete().eq('id', id);
  return !error;
}

export async function finalizarRecebimentoAgendamento(params: {
  id: string;
  paymentMethod: string;
  installments?: number;
  totalAmount: number;
  productCost?: number;
  insumosDetalhes?: InsumoAtendimento[] | any[];
  splitComissao?: Record<string, number>;
  auxiliaresIds?: string[];
  comandaUnificada?: ComandaMultiProfissional;
  unificadoEmId?: string;
  financialStatus?: 'PENDING_CONFIRMATION' | 'CONFIRMED';
  descontoValor?: number;
  descontoPct?: number;
  pacoteUtilizadoId?: string;
  pacoteNome?: string;
  descontadoPacote?: boolean;
  agnaldoRecebeComissao?: boolean;
  preFechadoPor?: string;
}): Promise<boolean> {
  const finStatus = params.financialStatus || 'PENDING_CONFIRMATION';

  // Buscar subs atuais para anexar _meta
  const { data: current } = await supabase
    .from(TBL.agendamentos)
    .select('sub_services')
    .eq('id', params.id)
    .maybeSingle();

  const currentSubs = Array.isArray(current?.sub_services) ? current.sub_services : [];
  const metaObj = currentSubs.find((s: any) => s?._meta) || { _meta: true };
  metaObj.financial_status = finStatus;
  metaObj.product_cost = params.productCost || 0;
  if (params.insumosDetalhes && params.insumosDetalhes.length > 0) {
    metaObj.insumos_procedimento = params.insumosDetalhes;
  }
  if (params.splitComissao) {
    metaObj.split_comissao = params.splitComissao;
  }
  if (params.auxiliaresIds && params.auxiliaresIds.length > 0) {
    metaObj.auxiliares_ids = params.auxiliaresIds;
  }
  if (params.comandaUnificada) {
    metaObj.comanda_unificada = params.comandaUnificada;
    metaObj.comanda_multi_profissional = true;
  }
  if (params.unificadoEmId) {
    metaObj.unificado_em_id = params.unificadoEmId;
  }
  if (params.descontoValor != null) metaObj.desconto_valor = params.descontoValor;
  if (params.descontoPct != null) metaObj.desconto_pct = params.descontoPct;
  if (params.pacoteUtilizadoId) metaObj.pacote_utilizado_id = params.pacoteUtilizadoId;
  if (params.pacoteNome) metaObj.pacote_nome = params.pacoteNome;
  if (params.descontadoPacote != null) metaObj.descontado_pacote = params.descontadoPacote;
  if (params.agnaldoRecebeComissao != null) metaObj.agnaldo_recebe_comissao = params.agnaldoRecebeComissao;

  if (finStatus === 'CONFIRMED') {
    metaObj.confirmed_at = new Date().toISOString();
    metaObj.confirmed_by = 'Gestão';
  } else {
    metaObj.pre_fechado_em = new Date().toISOString();
    metaObj.pre_fechado_por = params.preFechadoPor || 'Profissional';
  }

  const cleanSubs = currentSubs.filter((s: any) => !s?._meta);
  cleanSubs.push(metaObj);

  const patch: Row = {
    status: 'COMPLETED',
    payment_method: params.paymentMethod,
    installments: params.installments || 1,
    total_amount: params.totalAmount,
    product_cost: params.productCost || 0,
    sub_services: cleanSubs,
  };

  if (params.auxiliaresIds && params.auxiliaresIds.length > 0) {
    patch.assistant_ids = params.auxiliaresIds;
  }

  try {
    const res = await fetch('/api/agendamentos/admin', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: params.id, ...patch }),
    });
    if (res.ok) return true;
  } catch (err) {
    console.warn('[finalizarRecebimentoAgendamento] API server falhou, tentando client-side:', err);
  }

  const { error } = await supabase
    .from(TBL.agendamentos)
    .update(patch)
    .eq('id', params.id);

  if (error) {
    if (error.message?.includes('assistant_ids') || error.message?.includes('product_cost')) {
      const fallbackPatch = { ...patch };
      delete fallbackPatch.assistant_ids;
      delete fallbackPatch.product_cost;
      const { error: errRetry } = await supabase
        .from(TBL.agendamentos)
        .update(fallbackPatch)
        .eq('id', params.id);
      if (errRetry) {
        logSupabaseError(`[supabase] finalizarRecebimentoAgendamento retry(${params.id}) error:`, errRetry);
        return false;
      }
      return true;
    }
    logSupabaseError(`[supabase] finalizarRecebimentoAgendamento(${params.id}) error:`, error);
    return false;
  }
  return true;
}

export async function confirmarFechamentoGestao(params: {
  id: string;
  paymentMethod?: string;
  totalAmount?: number;
  confirmedBy?: string;
  agendamentosUnificadosIds?: string[];
}): Promise<boolean> {
  // 1. Prioriza a rota de API segura no servidor para garantir execução com privilégios de serviço
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/admin/pagamentos/confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        return true;
      }
      const errData = await res.json().catch(() => ({}));
      console.warn('[confirmarFechamentoGestao] API retornou erro, tentando fallback:', errData);
    } catch (apiErr) {
      console.warn('[confirmarFechamentoGestao] Falha de rede na API, tentando fallback direto:', apiErr);
    }
  }

  // 2. Fallback direto caso esteja fora do navegador ou a API esteja indisponível
  const { data: current } = await supabase
    .from(TBL.agendamentos)
    .select('sub_services, payment_method, total_amount')
    .eq('id', params.id)
    .maybeSingle();

  const currentSubs = Array.isArray(current?.sub_services) ? current.sub_services : [];
  const metaObj = currentSubs.find((s: any) => s?._meta) || { _meta: true };
  const nowIso = new Date().toISOString();
  const confirmedByStr = params.confirmedBy || 'Gestão';

  metaObj.financial_status = 'CONFIRMED';
  metaObj.confirmed_at = nowIso;
  metaObj.confirmed_by = confirmedByStr;

  const cleanSubs = currentSubs.filter((s: any) => !s?._meta);
  cleanSubs.push(metaObj);

  const patch: Row = {
    status: 'COMPLETED',
    financial_status: 'CONFIRMED',
    confirmed_at: nowIso,
    confirmed_by: confirmedByStr,
    sub_services: cleanSubs,
  };

  if (params.paymentMethod) patch.payment_method = params.paymentMethod;
  if (params.totalAmount != null) patch.total_amount = params.totalAmount;

  const { error } = await supabase
    .from(TBL.agendamentos)
    .update(patch)
    .eq('id', params.id);

  if (error) {
    logSupabaseError(`[supabase] confirmarFechamentoGestao(${params.id}) error:`, error);
    return false;
  }

  // Se houver agendamentos secundários unificados nesta comanda, confirma-os também com total_amount: 0
  if (params.agendamentosUnificadosIds && params.agendamentosUnificadosIds.length > 0) {
    for (const secId of params.agendamentosUnificadosIds) {
      if (secId && secId !== params.id) {
        try {
          const { data: secCurrent } = await supabase
            .from(TBL.agendamentos)
            .select('sub_services')
            .eq('id', secId)
            .maybeSingle();
          const secSubs = Array.isArray(secCurrent?.sub_services) ? secCurrent.sub_services : [];
          const secMeta = secSubs.find((s: any) => s?._meta) || { _meta: true };
          secMeta.financial_status = 'CONFIRMED';
          secMeta.confirmed_at = nowIso;
          secMeta.confirmed_by = confirmedByStr;
          const cleanSecSubs = secSubs.filter((s: any) => !s?._meta);
          cleanSecSubs.push(secMeta);

          await supabase
            .from(TBL.agendamentos)
            .update({
              status: 'COMPLETED',
              financial_status: 'CONFIRMED',
              confirmed_at: nowIso,
              confirmed_by: confirmedByStr,
              total_amount: 0,
              payment_method: params.paymentMethod || 'UNIFICADO',
              sub_services: cleanSecSubs
            })
            .eq('id', secId);
        } catch (secErr) {
          console.warn('Erro ao sincronizar agendamento unificado secundário:', secId, secErr);
        }
      }
    }
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
  categoria?: string | null;
  especialidades?: string[];
  ativo?: boolean;
  jornada_semanal?: Record<number, { inicio: string; fim: string }> | any;
  product_commission_pct?: number;
  stock_pin?: string | null;
  periodo_recebimento?: PeriodoRecebimentoComissao | null;
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

  const sched = (payload.jornada_semanal ?? {}) as any;
  if (payload.stock_pin) {
    sched._meta = { ...sched._meta, stock_pin: payload.stock_pin };
  }
  if (payload.periodo_recebimento) {
    sched._meta = { ...sched._meta, periodo_recebimento: payload.periodo_recebimento };
  }

  const insert: Row = {
    name: payload.nome,
    photo_url: payload.foto_url ?? null,
    categoria: payload.categoria ?? null,
    specialties: payload.especialidades ?? [],
    active: payload.ativo ?? true,
    weekly_schedule: sched,
    product_commission_pct: payload.product_commission_pct ?? 0,
  };
  if (payload.stock_pin) insert.stock_pin = payload.stock_pin;
  if (payload.periodo_recebimento) insert.commission_frequency = payload.periodo_recebimento;
  if (payload.profile_id) insert.user_id = payload.profile_id;

  let { data, error } = await supabase
    .from(TBL.profissionais)
    .insert(insert)
    .select('id')
    .single();

  if (error && (error.message?.includes('stock_pin') || error.message?.includes('commission_frequency'))) {
    delete insert.stock_pin;
    delete insert.commission_frequency;
    const retry = await supabase.from(TBL.profissionais).insert(insert).select('id').single();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    logSupabaseError('[supabase] criarProfissional error:', error);
    return { error: traduzirErro(error) };
  }
  return { id: data.id };
}

export async function atualizarProfissional(id: string, payload: Partial<{
  nome: string;
  foto_url: string | null;
  categoria: string | null;
  especialidades: string[];
  ativo: boolean;
  jornada_semanal: Record<number, { inicio: string; fim: string }> | any;
  product_commission_pct: number;
  stock_pin: string | null;
  periodo_recebimento: PeriodoRecebimentoComissao;
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
  if (payload.categoria !== undefined) patch.categoria = payload.categoria;
  if (payload.especialidades !== undefined) patch.specialties = payload.especialidades;
  if (payload.ativo !== undefined) patch.active = payload.ativo;
  if (payload.product_commission_pct !== undefined) patch.product_commission_pct = payload.product_commission_pct;

  if (payload.jornada_semanal !== undefined || payload.stock_pin !== undefined || payload.periodo_recebimento !== undefined) {
    const sched = (payload.jornada_semanal ? { ...payload.jornada_semanal } : {}) as any;
    if (payload.stock_pin !== undefined) {
      sched._meta = { ...sched._meta, stock_pin: payload.stock_pin };
      patch.stock_pin = payload.stock_pin;
    }
    if (payload.periodo_recebimento !== undefined) {
      sched._meta = { ...sched._meta, periodo_recebimento: payload.periodo_recebimento };
      patch.commission_frequency = payload.periodo_recebimento;
    }
    patch.weekly_schedule = sched;
  }

  let { error } = await supabase
    .from(TBL.profissionais)
    .update(patch)
    .eq('id', id);

  if (error && (error.message?.includes('stock_pin') || error.message?.includes('commission_frequency'))) {
    delete patch.stock_pin;
    delete patch.commission_frequency;
    const retry = await supabase.from(TBL.profissionais).update(patch).eq('id', id);
    error = retry.error;
  }

  if (error) {
    logSupabaseError(`[supabase] atualizarProfissional(${id}) error:`, error);
    if (error.code === '22P02' || error.message?.includes('invalid input syntax for type uuid')) {
      return { ok: true };
    }
    return { ok: false, error: traduzirErro(error) };
  }
  return { ok: true };
}

export async function atualizarPeriodoRecebimentoProfissional(
  id: string,
  periodo: PeriodoRecebimentoComissao
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data: current } = await supabase
      .from(TBL.profissionais)
      .select('weekly_schedule')
      .eq('id', id)
      .maybeSingle();

    const sched = (current?.weekly_schedule ? { ...current.weekly_schedule } : {}) as any;
    sched._meta = { ...(sched._meta || {}), periodo_recebimento: periodo };

    return atualizarProfissional(id, {
      jornada_semanal: sched,
      periodo_recebimento: periodo,
    });
  } catch (err: any) {
    console.error('Erro ao atualizar período de recebimento:', err);
    return { ok: false, error: err?.message || 'Erro inesperado' };
  }
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
  points_reward?: number;
  points_cost?: number;
  preco_variavel?: boolean;
  preco_maximo?: number | null;
  default_commission_pct?: number;
  is_addon?: boolean;
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

  const insertPayload: any = {
    name: payload.nome,
    category: payload.categoria,
    duration_minutes: payload.duracao_min,
    price: payload.preco,
    active: payload.ativo ?? true,
    visible_in_app: payload.visivel_app ?? true,
  };
  if (payload.points_reward !== undefined) insertPayload.points_reward = payload.points_reward;
  if (payload.points_cost !== undefined) insertPayload.points_cost = payload.points_cost;
  if (payload.preco_variavel !== undefined) insertPayload.preco_variavel = payload.preco_variavel;
  if (payload.preco_maximo !== undefined) insertPayload.preco_maximo = payload.preco_maximo;
  if (payload.default_commission_pct !== undefined) insertPayload.default_commission_pct = payload.default_commission_pct;
  if (payload.is_addon !== undefined) insertPayload.is_addon = payload.is_addon;

  const { data, error } = await supabase
    .from(TBL.servicos)
    .insert(insertPayload)
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
  points_reward: number;
  points_cost: number;
  preco_variavel: boolean;
  preco_maximo: number | null;
  default_commission_pct: number;
  is_addon: boolean;
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
  if (payload.points_reward !== undefined) patch.points_reward = payload.points_reward;
  if (payload.points_cost !== undefined) patch.points_cost = payload.points_cost;
  if (payload.preco_variavel !== undefined) patch.preco_variavel = payload.preco_variavel;
  if (payload.preco_maximo !== undefined) patch.preco_maximo = payload.preco_maximo;
  if (payload.default_commission_pct !== undefined) patch.default_commission_pct = payload.default_commission_pct;
  if (payload.is_addon !== undefined) patch.is_addon = payload.is_addon;

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

// ══════════════════════════════════════════════════════════════
// ESTOQUE DO SALÃO
// ══════════════════════════════════════════════════════════════

const TBL_INV = {
  inventory: 'salon_inventory',
  movements: 'salon_inventory_movements',
  serviceProducts: 'salon_service_products',
} as const;

function mapProdutoEstoque(r: Row): ProdutoEstoque {
  return {
    id: r.id,
    name: r.name ?? '',
    brand: r.brand ?? null,
    category: r.category ?? 'Geral',
    unit: r.unit ?? 'g',
    stock_qty: Number(r.stock_qty ?? 0),
    stock_alert_qty: r.stock_alert_qty != null ? Number(r.stock_alert_qty) : null,
    cost_price: Number(r.cost_price ?? 0),
    sale_price: r.sale_price != null ? Number(r.sale_price) : null,
    price_per_gram: r.price_per_gram != null ? Number(r.price_per_gram) : null,
    allow_sale: r.allow_sale ?? false,
    allow_procedure_use: r.allow_procedure_use ?? true,
    active: r.active ?? true,
    image_url: r.image_url ?? null,
    notes: r.notes ?? null,
    created_at: r.created_at ?? '',
    updated_at: r.updated_at ?? undefined,
    points_cost: r.points_cost != null ? Number(r.points_cost) : null,
  };
}

function mapMovimentacao(r: Row): MovimentacaoEstoque {
  return {
    id: r.id,
    inventory_id: r.inventory_id,
    type: r.type,
    qty: Number(r.qty ?? 0),
    unit_cost: r.unit_cost != null ? Number(r.unit_cost) : null,
    appointment_id: r.appointment_id ?? null,
    notes: r.notes ?? null,
    created_by: r.created_by ?? null,
    created_at: r.created_at ?? '',
  };
}

function mapServicoProduto(r: Row): ServicoProduto {
  return {
    id: r.id,
    service_id: r.service_id,
    inventory_id: r.inventory_id,
    default_qty_g: Number(r.default_qty_g ?? 0),
    is_required: r.is_required ?? false,
  };
}

/** Lista todos os produtos do estoque */
export async function fetchEstoque(apenasAtivos = false): Promise<ProdutoEstoque[]> {
  try {
    const url = `/api/admin/estoque${apenasAtivos ? '?apenasAtivos=true' : ''}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map(mapProdutoEstoque);
      }
    }
  } catch (err) {
    console.warn('[fetchEstoque] API server falhou, tentando client-side:', err);
  }

  let q = supabase.from(TBL_INV.inventory).select('*').order('name');
  if (apenasAtivos) q = q.eq('active', true);
  const { data, error } = await q;
  if (error) { logSupabaseError('[fetchEstoque]', error); return []; }
  return (data ?? []).map(mapProdutoEstoque);
}

/** Busca produto por ID */
export async function fetchProdutoEstoqueById(id: string): Promise<ProdutoEstoque | null> {
  const { data, error } = await supabase.from(TBL_INV.inventory).select('*').eq('id', id).single();
  if (error) { logSupabaseError('[fetchProdutoEstoqueById]', error); return null; }
  return data ? mapProdutoEstoque(data) : null;
}

/** Cria ou atualiza produto no estoque */
export async function salvarProdutoEstoque(
  payload: Omit<ProdutoEstoque, 'id' | 'created_at' | 'updated_at'>,
  id?: string
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const row = {
    name: payload.name,
    brand: payload.brand,
    category: payload.category,
    unit: payload.unit,
    stock_qty: payload.stock_qty,
    stock_alert_qty: payload.stock_alert_qty,
    cost_price: payload.cost_price,
    sale_price: payload.sale_price,
    price_per_gram: payload.price_per_gram,
    allow_sale: payload.allow_sale,
    allow_procedure_use: payload.allow_procedure_use,
    active: payload.active,
    image_url: payload.image_url,
    notes: payload.notes,
    points_cost: payload.points_cost,
  };

  if (id) {
    try {
      const res = await fetch('/api/admin/estoque', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...row }),
      });
      if (res.ok) return { ok: true, id };
    } catch (err) {
      console.warn('[salvarProdutoEstoque update] API server falhou, tentando client-side:', err);
    }
    const { error } = await supabase.from(TBL_INV.inventory).update(row).eq('id', id);
    if (error) { logSupabaseError('[salvarProdutoEstoque update]', error); return { ok: false, error: error.message }; }
    return { ok: true, id };
  }
  try {
    const res = await fetch('/api/admin/estoque', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
    });
    if (res.ok) {
      const json = await res.json();
      return { ok: true, id: json.id };
    }
  } catch (err) {
    console.warn('[salvarProdutoEstoque insert] API server falhou, tentando client-side:', err);
  }
  const { data, error } = await supabase.from(TBL_INV.inventory).insert(row).select('id').single();
  if (error) { logSupabaseError('[salvarProdutoEstoque insert]', error); return { ok: false, error: error.message }; }
  return { ok: true, id: data?.id };
}

export async function atualizarProdutoEstoqueParcial(id: string, payload: Partial<ProdutoEstoque>): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/admin/estoque', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...payload }),
    });
    if (res.ok) return { ok: true };
  } catch (err) {
    console.warn('[atualizarProdutoEstoqueParcial] API server falhou, tentando client-side:', err);
  }
  const { error } = await supabase.from(TBL_INV.inventory).update(payload).eq('id', id);
  if (error) { logSupabaseError('[atualizarProdutoEstoqueParcial]', error); return { ok: false, error: error.message }; }
  return { ok: true };
}

/** Registra movimentação de estoque e atualiza stock_qty */
export async function registrarMovimentacao(
  inventoryId: string,
  type: MovimentacaoEstoque['type'],
  qty: number,
  opts?: { appointmentId?: string; notes?: string; createdBy?: string; unitCost?: number }
): Promise<{ ok: boolean; error?: string }> {
  // Calcula delta: IN = positivo, saídas = negativo
  const delta = type === 'IN' ? qty : -Math.abs(qty);

  const movRow: any = {
    inventory_id: inventoryId,
    type,
    qty: Math.abs(qty),
    unit_cost: opts?.unitCost ?? null,
    appointment_id: opts?.appointmentId ?? null,
    notes: opts?.notes ?? null,
    created_by: opts?.createdBy ?? null,
  };

  let { error: movErr } = await supabase.from(TBL_INV.movements).insert(movRow);
  if (movErr && movErr.message?.includes('created_by')) {
    delete movRow.created_by;
    if (opts?.createdBy) {
      movRow.notes = movRow.notes ? `[Resp: ${opts.createdBy}] ${movRow.notes}` : `[Resp: ${opts.createdBy}]`;
    }
    const retry = await supabase.from(TBL_INV.movements).insert(movRow);
    movErr = retry.error;
  }

  if (movErr) { logSupabaseError('[registrarMovimentacao insert]', movErr); return { ok: false, error: movErr.message }; }

  // Atualiza stock
  const { error: updErr } = await supabase.rpc('increment_inventory_stock', {
    p_id: inventoryId,
    p_delta: delta,
  }).maybeSingle();

  // Se RPC não existe, faz update manual
  if (updErr) {
    const { data: current } = await supabase.from(TBL_INV.inventory).select('stock_qty').eq('id', inventoryId).single();
    const newQty = Math.max(0, Number(current?.stock_qty ?? 0) + delta);
    await supabase.from(TBL_INV.inventory).update({ stock_qty: newQty }).eq('id', inventoryId);
  }
  return { ok: true };
}

/**
 * Valida a senha/PIN informada contra a senha do profissional.
 * Permite a senha cadastrada do profissional, ou o padrão inicial '1234',
 * ou senhas administrativas de contingência ('admin', 'admin123').
 */
export function validarSenhaProfissional(prof?: Profissional | null, senhaInformada?: string): boolean {
  if (!prof || !senhaInformada) return false;
  const pinCorreto = String(prof.stock_pin || (prof.jornada_semanal as any)?._meta?.stock_pin || '1234').trim();
  const digitado = String(senhaInformada).trim();
  return (
    digitado === pinCorreto ||
    digitado === '1234' ||
    digitado.toLowerCase() === 'admin' ||
    digitado.toLowerCase() === 'admin123'
  );
}

/** Busca movimentações de um produto */
export async function fetchMovimentacoes(inventoryId?: string): Promise<MovimentacaoEstoque[]> {
  let q = supabase.from(TBL_INV.movements).select('*').order('created_at', { ascending: false }).limit(200);
  if (inventoryId) q = q.eq('inventory_id', inventoryId);
  const { data, error } = await q;
  if (error) { logSupabaseError('[fetchMovimentacoes]', error); return []; }
  return (data ?? []).map(mapMovimentacao);
}

/** Produtos vinculados a um serviço (para pesagem no checkout) */
export async function fetchServicoProdutos(serviceId: string): Promise<ServicoProduto[]> {
  const { data, error } = await supabase
    .from(TBL_INV.serviceProducts)
    .select('*')
    .eq('service_id', serviceId);
  if (error) { logSupabaseError('[fetchServicoProdutos]', error); return []; }
  return (data ?? []).map(mapServicoProduto);
}

/** Todos os vínculos serviço-produto (para o formulário de serviços) */
export async function fetchTodosServicoProdutos(): Promise<ServicoProduto[]> {
  const { data, error } = await supabase.from(TBL_INV.serviceProducts).select('*');
  if (error) { logSupabaseError('[fetchTodosServicoProdutos]', error); return []; }
  return (data ?? []).map(mapServicoProduto);
}

/** Vincula produto ao serviço com pesagem */
export async function vincularProdutoServico(
  serviceId: string, inventoryId: string, defaultQtyG: number, isRequired: boolean
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from(TBL_INV.serviceProducts).upsert({
    service_id: serviceId,
    inventory_id: inventoryId,
    default_qty_g: defaultQtyG,
    is_required: isRequired,
  }, { onConflict: 'service_id,inventory_id' });
  if (error) { logSupabaseError('[vincularProdutoServico]', error); return { ok: false, error: error.message }; }
  return { ok: true };
}

/** Remove vínculo produto-serviço */
export async function desvincularProdutoServico(id: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from(TBL_INV.serviceProducts).delete().eq('id', id);
  if (error) { logSupabaseError('[desvincularProdutoServico]', error); return { ok: false, error: error.message }; }
  return { ok: true };
}

// ══════════════════════════════════════════════════════════════
// COMISSÕES DOS PROFISSIONAIS
// ══════════════════════════════════════════════════════════════

const TBL_COM = {
  rules: 'salon_commission_rules',
  commissions: 'salon_commissions',
  installments: 'salon_commission_installments',
} as const;

function mapRegraComissao(r: Row): RegraComissao {
  return {
    id: r.id,
    professional_id: r.professional_id,
    service_id: r.service_id ?? null,
    commission_pct: Number(r.commission_pct ?? 0),
    active: r.active ?? true,
    notes: r.notes ?? null,
    created_at: r.created_at ?? '',
  };
}

function mapComissao(r: Row): Comissao {
  return {
    id: r.id,
    appointment_id: r.appointment_id,
    professional_id: r.professional_id,
    total_amount: Number(r.total_amount ?? 0),
    commission_pct: Number(r.commission_pct ?? 0),
    total_commission: Number(r.total_commission ?? 0),
    installments: Number(r.installments ?? 1),
    payment_method: r.payment_method as FormaPagamento,
    status: r.status ?? 'PENDING',
    created_at: r.created_at ?? '',
    updated_at: r.updated_at ?? undefined,
  };
}

function mapParcela(r: Row): ParcelaComissao {
  return {
    id: r.id,
    commission_id: r.commission_id,
    installment_number: Number(r.installment_number ?? 1),
    amount: Number(r.amount ?? 0),
    due_date: r.due_date ?? '',
    paid_at: r.paid_at ?? null,
    status: r.status ?? 'PENDING',
    notes: r.notes ?? null,
    created_at: r.created_at ?? '',
  };
}

/** Busca regras de comissão (todas ou de um profissional) */
export async function fetchRegrasComissao(professionalId?: string): Promise<RegraComissao[]> {
  try {
    const url = '/api/admin/comissoes' + (professionalId ? `?professional_id=${encodeURIComponent(professionalId)}` : '');
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.rules)) {
        return json.rules.map(mapRegraComissao);
      }
    }
  } catch (e) {
    // Continua para fallback direto no supabase
  }

  let q = supabase.from(TBL_COM.rules).select('*').eq('active', true).order('created_at');
  if (professionalId) q = q.eq('professional_id', professionalId);
  const { data, error } = await q;
  if (error) { logSupabaseError('[fetchRegrasComissao]', error); return []; }
  return (data ?? []).map(mapRegraComissao);
}

/** Retorna % de comissão para um profissional+serviço (regra específica por serviço) */
export async function getComissaoPct(professionalId: string, serviceId: string): Promise<number> {
  const { data } = await supabase
    .from(TBL_COM.rules)
    .select('commission_pct, service_id')
    .eq('professional_id', professionalId)
    .eq('active', true);
  if (!data || data.length === 0) return 0;
  // Regra específica para o serviço
  const especifica = data.find((r: any) => r.service_id === serviceId);
  return especifica ? Number(especifica.commission_pct) : 0;
}

/** Salva ou atualiza uma regra de comissão via API e com fallback seguro */
export async function salvarRegraComissao(
  payload: Omit<RegraComissao, 'id' | 'created_at'>,
  id?: string
): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const res = await fetch('/api/admin/comissoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...payload }),
    });
    const json = await res.json();
    if (!res.ok) {
      return { ok: false, error: json.error || 'Erro ao salvar regra' };
    }
    return { ok: true, id: json.id };
  } catch (err: any) {
    // Fallback para cliente direto do Supabase com tratamento seguro de conflito
    const row = {
      professional_id: payload.professional_id,
      service_id: payload.service_id ?? null,
      commission_pct: payload.commission_pct,
      active: payload.active,
      notes: payload.notes,
    };
    if (id) {
      const { error } = await supabase.from(TBL_COM.rules).update(row).eq('id', id);
      if (error) { logSupabaseError('[salvarRegraComissao update]', error); return { ok: false, error: traduzirErro(error) }; }
      return { ok: true, id };
    }

    let checkQuery = supabase.from(TBL_COM.rules).select('id').eq('professional_id', row.professional_id);
    if (row.service_id) {
      checkQuery = checkQuery.eq('service_id', row.service_id);
    } else {
      checkQuery = checkQuery.is('service_id', null);
    }
    const { data: existing } = await checkQuery.maybeSingle();

    if (existing?.id) {
      const { error } = await supabase.from(TBL_COM.rules).update(row).eq('id', existing.id);
      if (error) { logSupabaseError('[salvarRegraComissao update]', error); return { ok: false, error: traduzirErro(error) }; }
      return { ok: true, id: existing.id };
    }

    const { data, error } = await supabase.from(TBL_COM.rules).insert(row).select('id').single();
    if (error) { logSupabaseError('[salvarRegraComissao insert]', error); return { ok: false, error: traduzirErro(error) }; }
    return { ok: true, id: data?.id };
  }
}

/** Exclui regra de comissão */
export async function excluirRegraComissao(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/admin/comissoes?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) {
      return { ok: false, error: json.error || 'Erro ao excluir regra' };
    }
    return { ok: true };
  } catch (e) {
    const { error } = await supabase.from(TBL_COM.rules).delete().eq('id', id);
    if (error) { logSupabaseError('[excluirRegraComissao]', error); return { ok: false, error: traduzirErro(error) }; }
    return { ok: true };
  }
}

// ══════════════════════════════════════════════════════════════
// TAXAS DE PAGAMENTO E MAQUININHAS (GATEWAYS / CARTÕES)
// ══════════════════════════════════════════════════════════════

export interface ResultadoCalculoTaxa {
  regra: PaymentFee | null;
  regraNome: string;
  feePercentage: number;
  feeFixed: number;
  daysToReceive: number;
  valorTaxa: number;
  valorLiquido: number;
}

/** Busca todas as regras de taxas de maquininhas e configurações gerais */
export async function fetchTaxasPagamento(): Promise<{ taxas: PaymentFee[]; config: ConfigTaxas }> {
  try {
    const res = await fetch('/api/admin/taxas');
    if (res.ok) {
      const data = await res.json();
      return {
        taxas: data.taxas ?? [],
        config: data.config ?? { descontarTaxaComissao: true },
      };
    }
  } catch (e) {
    console.warn('[fetchTaxasPagamento API error, fallback direto]', e);
  }

  // Fallback direto via Supabase client
  try {
    const { data, error } = await supabase
      .from('payment_fees')
      .select('*')
      .order('active', { ascending: false })
      .order('payment_type', { ascending: true })
      .order('fee_percentage', { ascending: true });
    if (!error && data) {
      return {
        taxas: data as PaymentFee[],
        config: { descontarTaxaComissao: true },
      };
    }
  } catch (err) {
    logSupabaseError('[fetchTaxasPagamento supabase]', err);
  }

  return {
    taxas: [
      { id: '1', name: 'Dinheiro', payment_type: 'dinheiro', fee_percentage: 0, fee_fixed: 0, days_to_receive: 0, active: true, created_at: '' },
      { id: '2', name: 'Pix', payment_type: 'pix', fee_percentage: 0.99, fee_fixed: 0, days_to_receive: 0, active: true, created_at: '' },
      { id: '3', name: 'Débito', payment_type: 'debito', fee_percentage: 1.99, fee_fixed: 0, days_to_receive: 1, active: true, created_at: '' },
      { id: '4', name: 'Crédito à Vista', payment_type: 'credito', fee_percentage: 3.19, fee_fixed: 0, days_to_receive: 30, active: true, created_at: '' },
      { id: '5', name: 'Crédito Parcelado', payment_type: 'credito', fee_percentage: 3.79, fee_fixed: 0, days_to_receive: 30, active: true, created_at: '' },
    ],
    config: { descontarTaxaComissao: true },
  };
}

/** Cria ou atualiza uma regra de taxa de maquininha */
export async function salvarTaxaPagamento(taxa: Partial<PaymentFee>): Promise<{ ok: boolean; taxa?: PaymentFee; error?: string }> {
  try {
    const res = await fetch('/api/admin/taxas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taxa),
    });
    const json = await res.json();
    if (!res.ok) {
      return { ok: false, error: json.error || 'Erro ao salvar regra de taxa.' };
    }
    return { ok: true, taxa: json.taxa };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Erro ao conectar ao servidor.' };
  }
}

/** Exclui uma regra de taxa de maquininha */
export async function excluirTaxaPagamento(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/admin/taxas?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    if (!res.ok) {
      return { ok: false, error: json.error || 'Erro ao excluir regra de taxa.' };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Erro ao excluir taxa.' };
  }
}

/** Atualiza configuração global (ex: descontar ou não taxa da comissão) */
export async function salvarConfigTaxas(config: ConfigTaxas): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/admin/taxas', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const json = await res.json();
    if (!res.ok) {
      return { ok: false, error: json.error || 'Erro ao salvar configuração.' };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Erro ao salvar configuração.' };
  }
}

/** Alterna status ativo/inativo de uma regra de taxa */
export async function alternarStatusTaxa(id: string, active: boolean): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/admin/taxas', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active }),
    });
    const json = await res.json();
    if (!res.ok) {
      return { ok: false, error: json.error || 'Erro ao alterar status da taxa.' };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Erro ao conectar.' };
  }
}

/** Calcula a taxa administrativa/maquininha com base na forma de pagamento e regras */
export function calcularTaxaMaquininha(
  method: FormaPagamento | string,
  parcelas: number = 1,
  valorBruto: number = 0,
  taxasCustom?: PaymentFee[]
): ResultadoCalculoTaxa {
  const normMethod = String(method || '').toUpperCase();
  const numParc = Math.max(1, parcelas || 1);

  if (normMethod === 'DINHEIRO') {
    return {
      regra: null,
      regraNome: 'Dinheiro',
      feePercentage: 0,
      feeFixed: 0,
      daysToReceive: 0,
      valorTaxa: 0,
      valorLiquido: valorBruto,
    };
  }

  // Se foram passadas regras customizadas (ou ativas carregadas do banco)
  if (taxasCustom && taxasCustom.length > 0) {
    const ativas = taxasCustom.filter(t => t.active);
    let matched: PaymentFee | undefined;

    if (normMethod === 'PIX') {
      matched = ativas.find(t => t.payment_type === 'pix');
    } else if (normMethod === 'DEBITO') {
      matched = ativas.find(t => t.payment_type === 'debito');
    } else if (normMethod === 'CREDITO') {
      if (numParc > 1) {
        matched = ativas.find(t => t.payment_type === 'credito' && /parcel/i.test(t.name))
          || ativas.filter(t => t.payment_type === 'credito').sort((a, b) => b.fee_percentage - a.fee_percentage)[0];
      } else {
        matched = ativas.find(t => t.payment_type === 'credito' && /vista/i.test(t.name))
          || ativas.find(t => t.payment_type === 'credito');
      }
    } else if (normMethod === 'BOLETO') {
      matched = ativas.find(t => t.payment_type === 'boleto');
    }

    if (matched) {
      const valorTaxa = Number(((valorBruto * (matched.fee_percentage / 100)) + (matched.fee_fixed || 0)).toFixed(2));
      const valorLiquido = Math.max(0, Number((valorBruto - valorTaxa).toFixed(2)));
      return {
        regra: matched,
        regraNome: matched.name,
        feePercentage: Number(matched.fee_percentage),
        feeFixed: Number(matched.fee_fixed || 0),
        daysToReceive: matched.days_to_receive,
        valorTaxa,
        valorLiquido,
      };
    }
  }

  // Fallbacks padrão inteligentes
  let pct = 0;
  let fixed = 0;
  let days = 0;
  let nome = normMethod;

  if (normMethod === 'PIX') {
    pct = 0.99;
    days = 0;
    nome = 'Pix';
  } else if (normMethod === 'DEBITO') {
    pct = 1.99;
    days = 1;
    nome = 'Débito';
  } else if (normMethod === 'CREDITO') {
    if (numParc <= 1) {
      pct = 3.19;
      days = 30;
      nome = 'Crédito à Vista';
    } else {
      pct = 3.79 + (0.5 * (numParc - 1));
      days = 30;
      nome = `Crédito Parcelado (${numParc}x)`;
    }
  }

  const valorTaxa = Number(((valorBruto * (pct / 100)) + fixed).toFixed(2));
  const valorLiquido = Math.max(0, Number((valorBruto - valorTaxa).toFixed(2)));

  return {
    regra: null,
    regraNome: nome,
    feePercentage: pct,
    feeFixed: fixed,
    daysToReceive: days,
    valorTaxa,
    valorLiquido,
  };
}

/** Calcula o percentual de taxa da maquininha (compatibilidade retroativa) */
export function getTaxaCartao(method: FormaPagamento, parcelas: number, taxas?: PaymentFee[]): number {
  return calcularTaxaMaquininha(method, parcelas, 100, taxas).feePercentage;
}

/** Cria comissão + parcelas ao finalizar atendimento */
export async function criarComissao(params: {
  appointmentId: string;
  professionalId: string;
  serviceId: string;
  totalAmount: number;
  paymentMethod: FormaPagamento;
  installments: number;
  appointmentDate: string; // YYYY-MM-DD
  taxasCustom?: PaymentFee[];
  descontarTaxaMaquininha?: boolean;
  customCommissionAmount?: number;
  customPct?: number;
  notes?: string;
}): Promise<{ ok: boolean; commissionId?: string; error?: string }> {
  const pct = params.customPct != null 
    ? params.customPct 
    : await getComissaoPct(params.professionalId, params.serviceId);

  if (pct === 0 && params.customCommissionAmount == null) return { ok: true }; // sem regra de comissão configurada

  let numParcelas = params.paymentMethod === 'CREDITO' ? Math.max(1, params.installments) : 1;

  // 1. Busca regras de taxas e configuração se não foram passadas
  let taxas = params.taxasCustom;
  let descontar = params.descontarTaxaMaquininha;

  if (!taxas || descontar === undefined) {
    try {
      const configData = await fetchTaxasPagamento();
      if (!taxas) taxas = configData.taxas;
      if (descontar === undefined) descontar = configData.config.descontarTaxaComissao;
    } catch {
      descontar = true;
    }
  }

  // 2. Lógica de Taxas do Cartão: Descontar a taxa da operadora antes de calcular a comissão
  const taxaCalc = calcularTaxaMaquininha(params.paymentMethod, numParcelas, params.totalAmount, taxas);
  const valorBaseSplit = descontar ? taxaCalc.valorLiquido : params.totalAmount;

  // 3. Calcula a comissão sobre a base (líquida após taxa da maquininha se ativo) ou usa valor explícito
  const totalComissao = params.customCommissionAmount != null
    ? params.customCommissionAmount
    : Number((valorBaseSplit * pct / 100).toFixed(2));
  const valorParcela = Number((totalComissao / numParcelas).toFixed(2));

  // 4. Insere comissão
  const { data: com, error: comErr } = await supabase.from(TBL_COM.commissions).insert({
    appointment_id: params.appointmentId,
    professional_id: params.professionalId,
    total_amount: params.totalAmount,
    commission_pct: pct,
    total_commission: totalComissao,
    installments: numParcelas,
    payment_method: params.paymentMethod,
    status: 'PENDING',
  }).select('id').single();

  if (comErr || !com?.id) {
    logSupabaseError('[criarComissao insert]', comErr);
    return { ok: false, error: comErr?.message };
  }

  // 5. Insere parcelas com data de vencimento baseada no prazo real de compensação
  const baseDate = new Date(params.appointmentDate + 'T12:00:00');
  const daysToReceive = taxaCalc.daysToReceive;

  const parcelas = Array.from({ length: numParcelas }, (_, i) => {
    const due = new Date(baseDate);
    if (params.paymentMethod === 'CREDITO') {
      // Usa o prazo da operadora (ex: D+30 por parcela)
      const diasPrazo = daysToReceive > 0 ? daysToReceive : 30;
      due.setDate(due.getDate() + diasPrazo * (i + 1));
    } else if (params.paymentMethod === 'DEBITO') {
      // Débito: D+1 ou D+0
      due.setDate(due.getDate() + daysToReceive);
    } else {
      // Dinheiro, PIX: disponível de imediato (D+0)
      if (i > 0) due.setMonth(due.getMonth() + i);
    }

    const noteTaxa = taxaCalc.valorTaxa > 0
      ? `Taxa ${taxaCalc.regraNome} (${taxaCalc.feePercentage}% = -${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(taxaCalc.valorTaxa)})${descontar ? ' descontada da base' : ' (salão absorveu)'}`
      : null;
    const finalNote = [params.notes, noteTaxa].filter(Boolean).join(' | ') || null;

    return {
      commission_id: com.id,
      installment_number: i + 1,
      amount: i === numParcelas - 1
        ? Number((totalComissao - valorParcela * (numParcelas - 1)).toFixed(2)) // ajuste de centavos
        : valorParcela,
      due_date: due.toISOString().split('T')[0],
      status: 'PENDING',
      notes: finalNote,
    };
  });

  const { error: parcErr } = await supabase.from(TBL_COM.installments).insert(parcelas);
  if (parcErr) { logSupabaseError('[criarComissao parcelas]', parcErr); }

  return { ok: true, commissionId: com.id };
}

/** 
 * Cria comissões rateadas para procedimentos compartilhados (Profissional Titular + Auxiliares).
 * Aplica a regra:
 * 1. Produto (Fundo Reserva por gramas) é reservado
 * 2. Comissão calculada pela porcentagem da regra do serviço
 * 3. Se houver mais de um profissional, reparte a comissão entre todos que fizeram o atendimento
 * 4. O saldo restante constitui o faturamento líquido do Salão
 */
export async function criarComissoesAtendimentoCompartilhado(params: {
  appointmentId: string;
  primaryProfessionalId: string;
  assistantIds?: string[];
  serviceId: string;
  totalAmount: number; // Valor cobrado da cliente (ex: R$ 200)
  productCost?: number; // Custo de produtos por grama (ex: R$ 20)
  paymentMethod: FormaPagamento;
  installments: number;
  appointmentDate: string;
  taxasCustom?: PaymentFee[];
  descontarTaxaMaquininha?: boolean;
  splitPercentages?: Record<string, number>; // Divisão customizada % (opcional)
}): Promise<{ ok: boolean; error?: string }> {
  const assistants = (params.assistantIds || []).filter(id => id && id !== params.primaryProfessionalId);
  const allProfs = [params.primaryProfessionalId, ...assistants];
  const count = allProfs.length;

  // Se só houver o profissional titular e sem auxiliares, fluxo padrão direto
  if (count <= 1) {
    return criarComissao({
      appointmentId: params.appointmentId,
      professionalId: params.primaryProfessionalId,
      serviceId: params.serviceId,
      totalAmount: params.totalAmount,
      paymentMethod: params.paymentMethod,
      installments: params.installments,
      appointmentDate: params.appointmentDate,
      taxasCustom: params.taxasCustom,
      descontarTaxaMaquininha: params.descontarTaxaMaquininha,
    });
  }

  // 1. Obter a % de comissão base do serviço para o titular
  const pctBase = await getComissaoPct(params.primaryProfessionalId, params.serviceId);
  if (pctBase === 0) return { ok: true };

  // 2. Base de cálculo do procedimento descontando o Fundo Reserva de Produtos
  const productCost = params.productCost || 0;
  const baseLiquidaProdutos = Math.max(0, params.totalAmount - productCost);

  let numParcelas = params.paymentMethod === 'CREDITO' ? Math.max(1, params.installments) : 1;
  let taxas = params.taxasCustom;
  let descontar = params.descontarTaxaMaquininha;

  if (!taxas || descontar === undefined) {
    try {
      const configData = await fetchTaxasPagamento();
      if (!taxas) taxas = configData.taxas;
      if (descontar === undefined) descontar = configData.config.descontarTaxaComissao;
    } catch {
      descontar = true;
    }
  }

  const taxaCalc = calcularTaxaMaquininha(params.paymentMethod, numParcelas, params.totalAmount, taxas);
  const baseCalculoComissao = descontar 
    ? Math.max(0, taxaCalc.valorLiquido - productCost) 
    : baseLiquidaProdutos;

  // Comissão total a ser repartida entre a equipe do procedimento
  const comissaoTotalEquipe = Number((baseCalculoComissao * pctBase / 100).toFixed(2));
  if (comissaoTotalEquipe <= 0) return { ok: true };

  // 3. Gerar comissão individual para cada participante
  for (let i = 0; i < allProfs.length; i++) {
    const profId = allProfs[i];
    const isTitular = profId === params.primaryProfessionalId;

    // Percentual de divisão da comissão (default: partes iguais)
    let sharePct = 100 / count;
    if (params.splitPercentages && params.splitPercentages[profId] != null) {
      sharePct = params.splitPercentages[profId];
    }

    const valorComissao = Number((comissaoTotalEquipe * (sharePct / 100)).toFixed(2));
    if (valorComissao <= 0) continue;

    const papel = isTitular ? 'Titular do Procedimento' : 'Auxiliar Co-participante';
    const splitLabel = `${papel} (${sharePct.toFixed(0)}% da comissão dividida)`;

    await criarComissao({
      appointmentId: params.appointmentId,
      professionalId: profId,
      serviceId: params.serviceId,
      totalAmount: params.totalAmount,
      paymentMethod: params.paymentMethod,
      installments: numParcelas,
      appointmentDate: params.appointmentDate,
      taxasCustom: taxas,
      descontarTaxaMaquininha: descontar,
      customCommissionAmount: valorComissao,
      customPct: Number((pctBase * (sharePct / 100)).toFixed(2)),
      notes: splitLabel,
    });
  }

  return { ok: true };
}

/** Mock de comissões com regra de Cartão de Crédito (D+30) e pagamentos imediatos para testes e fallback */
export function getMockComissoes(professionalId?: string): Comissao[] {
  const agora = new Date();
  const formatIso = (d: Date) => d.toISOString().split('T')[0];
  const offsetDias = (dias: number) => {
    const d = new Date(agora);
    d.setDate(d.getDate() + dias);
    return formatIso(d);
  };

  const MOCK_LIST: Comissao[] = [
    // Agnaldo Gomes: Cartão de Crédito recente (D+30 - Aguardando)
    {
      id: 'mock-com-1',
      appointment_id: 'app-mock-1',
      professional_id: 'e47b1a20-8d3f-4e92-91bc-3a817452d901',
      total_amount: 480.00,
      commission_pct: 50.00,
      total_commission: 240.00,
      installments: 1,
      payment_method: 'CREDITO',
      status: 'PENDING',
      created_at: `${offsetDias(-4)}T14:30:00Z`,
      parcelas: [
        {
          id: 'mock-parc-1',
          commission_id: 'mock-com-1',
          installment_number: 1,
          amount: 240.00,
          due_date: offsetDias(26), // 30 dias após offsetDias(-4) -> em carência
          status: 'PENDING',
        }
      ]
    },
    // Agnaldo Gomes: PIX nesta semana (Liberado Imediato)
    {
      id: 'mock-com-2',
      appointment_id: 'app-mock-2',
      professional_id: 'e47b1a20-8d3f-4e92-91bc-3a817452d901',
      total_amount: 140.00,
      commission_pct: 50.00,
      total_commission: 70.00,
      installments: 1,
      payment_method: 'PIX',
      status: 'PENDING',
      created_at: `${offsetDias(-1)}T10:00:00Z`,
      parcelas: [
        {
          id: 'mock-parc-2',
          commission_id: 'mock-com-2',
          installment_number: 1,
          amount: 70.00,
          due_date: offsetDias(-1), // Imediato
          status: 'PENDING',
        }
      ]
    },
    // Agnaldo Gomes: Cartão de Crédito feito há 33 dias atrás -> LIBERADO nesta semana (D+30 cumprido)
    {
      id: 'mock-com-3',
      appointment_id: 'app-mock-3',
      professional_id: 'e47b1a20-8d3f-4e92-91bc-3a817452d901',
      total_amount: 320.00,
      commission_pct: 50.00,
      total_commission: 160.00,
      installments: 1,
      payment_method: 'CREDITO',
      status: 'PENDING',
      created_at: `${offsetDias(-33)}T16:00:00Z`,
      parcelas: [
        {
          id: 'mock-parc-3',
          commission_id: 'mock-com-3',
          installment_number: 1,
          amount: 160.00,
          due_date: offsetDias(-3), // Venceu há 3 dias (nesta semana)
          status: 'PENDING',
        }
      ]
    },
    // Camila Silva (Unhas): PIX nesta semana (Liberado Imediato)
    {
      id: 'mock-com-4',
      appointment_id: 'app-mock-4',
      professional_id: 'b71a3c54-8e2d-4c91-95fe-4ba28574e303',
      total_amount: 90.00,
      commission_pct: 50.00,
      total_commission: 45.00,
      installments: 1,
      payment_method: 'PIX',
      status: 'PENDING',
      created_at: `${offsetDias(-2)}T11:00:00Z`,
      parcelas: [
        {
          id: 'mock-parc-4',
          commission_id: 'mock-com-4',
          installment_number: 1,
          amount: 45.00,
          due_date: offsetDias(-2),
          status: 'PENDING',
        }
      ]
    },
    // Camila Silva (Unhas): Cartão de Crédito recente (D+30 - Aguardando)
    {
      id: 'mock-com-5',
      appointment_id: 'app-mock-5',
      professional_id: 'b71a3c54-8e2d-4c91-95fe-4ba28574e303',
      total_amount: 130.00,
      commission_pct: 50.00,
      total_commission: 65.00,
      installments: 1,
      payment_method: 'CREDITO',
      status: 'PENDING',
      created_at: `${offsetDias(-3)}T15:00:00Z`,
      parcelas: [
        {
          id: 'mock-parc-5',
          commission_id: 'mock-com-5',
          installment_number: 1,
          amount: 65.00,
          due_date: offsetDias(27), // Carência D+30
          status: 'PENDING',
        }
      ]
    },
    // Camila Silva (Unhas): Cartão de Crédito feito há 31 dias atrás -> LIBERADO nesta semana (D+30 cumprido)
    {
      id: 'mock-com-6',
      appointment_id: 'app-mock-6',
      professional_id: 'b71a3c54-8e2d-4c91-95fe-4ba28574e303',
      total_amount: 80.00,
      commission_pct: 50.00,
      total_commission: 40.00,
      installments: 1,
      payment_method: 'CREDITO',
      status: 'PENDING',
      created_at: `${offsetDias(-31)}T17:00:00Z`,
      parcelas: [
        {
          id: 'mock-parc-6',
          commission_id: 'mock-com-6',
          installment_number: 1,
          amount: 40.00,
          due_date: offsetDias(-1), // Liberado ontem
          status: 'PENDING',
        }
      ]
    },
    // Equipe Studio: Débito e Dinheiro nesta semana (Liberados)
    {
      id: 'mock-com-7',
      appointment_id: 'app-mock-7',
      professional_id: 'f82c4d31-9a5e-4b73-82cd-4b928563e012',
      total_amount: 140.00,
      commission_pct: 40.00,
      total_commission: 56.00,
      installments: 1,
      payment_method: 'DEBITO',
      status: 'PENDING',
      created_at: `${offsetDias(-2)}T09:30:00Z`,
      parcelas: [
        {
          id: 'mock-parc-7',
          commission_id: 'mock-com-7',
          installment_number: 1,
          amount: 56.00,
          due_date: offsetDias(-2),
          status: 'PENDING',
        }
      ]
    },
    {
      id: 'mock-com-8',
      appointment_id: 'app-mock-8',
      professional_id: 'f82c4d31-9a5e-4b73-82cd-4b928563e012',
      total_amount: 50.00,
      commission_pct: 40.00,
      total_commission: 20.00,
      installments: 1,
      payment_method: 'DINHEIRO',
      status: 'PAID',
      created_at: `${offsetDias(-5)}T13:00:00Z`,
      parcelas: [
        {
          id: 'mock-parc-8',
          commission_id: 'mock-com-8',
          installment_number: 1,
          amount: 20.00,
          due_date: offsetDias(-5),
          paid_at: `${offsetDias(-5)}T18:00:00Z`,
          status: 'PAID',
        }
      ]
    }
  ];

  if (professionalId) {
    return MOCK_LIST.filter(c => c.professional_id === professionalId);
  }
  return MOCK_LIST;
}

/** Busca comissões com parcelas (todas ou por profissional) */
export async function fetchComissoes(professionalId?: string): Promise<Comissao[]> {
  try {
    let q = supabase.from(TBL_COM.commissions).select('*').order('created_at', { ascending: false });
    if (professionalId) q = q.eq('professional_id', professionalId);
    const { data, error } = await q;
    if (error || !data || data.length === 0) {
      if (error) logSupabaseError('[fetchComissoes]', error);
      return getMockComissoes(professionalId);
    }
    const comissoes = (data ?? []).map(mapComissao);

    // Carrega parcelas de todas de uma vez
    if (comissoes.length > 0) {
      const ids = comissoes.map((c: any) => c.id);
      const { data: parcData } = await supabase.from(TBL_COM.installments).select('*').in('commission_id', ids).order('installment_number');
      const parcMap = new Map<string, ParcelaComissao[]>();
      (parcData ?? []).forEach((r: any) => {
        const p = mapParcela(r);
        if (!parcMap.has(p.commission_id)) parcMap.set(p.commission_id, []);
        parcMap.get(p.commission_id)!.push(p);
      });
      comissoes.forEach((c: any) => { c.parcelas = parcMap.get(c.id) ?? []; });
    }
    return comissoes;
  } catch {
    return getMockComissoes(professionalId);
  }
}

/** Busca todas as parcelas pendentes (para o painel "A Pagar") */
export async function fetchParcelasPendentes(professionalId?: string): Promise<(ParcelaComissao & { professional_id: string; professional_name?: string; payment_method?: FormaPagamento; total_amount?: number; commission_pct?: number })[]> {
  try {
    let q = supabase
      .from(TBL_COM.installments)
      .select('*, salon_commissions(professional_id, payment_method, total_amount, commission_pct)')
      .eq('status', 'PENDING')
      .order('due_date');
    const { data, error } = await q;
    if (error || !data || data.length === 0) {
      if (error) logSupabaseError('[fetchParcelasPendentes]', error);
      const mockComs = getMockComissoes(professionalId);
      return mockComs
        .flatMap(c => (c.parcelas ?? []).map(p => ({
          ...p,
          professional_id: c.professional_id,
          payment_method: c.payment_method,
          total_amount: c.total_amount,
          commission_pct: c.commission_pct,
        })))
        .filter(p => p.status === 'PENDING')
        .filter(p => !professionalId || p.professional_id === professionalId);
    }
    return (data ?? [])
      .map((r: any) => ({
        ...mapParcela(r),
        professional_id: r.salon_commissions?.professional_id ?? '',
        payment_method: (r.salon_commissions?.payment_method ?? 'DINHEIRO') as FormaPagamento,
        total_amount: Number(r.salon_commissions?.total_amount ?? 0),
        commission_pct: Number(r.salon_commissions?.commission_pct ?? 0),
      }))
      .filter((p: any) => !professionalId || p.professional_id === professionalId);
  } catch {
    const mockComs = getMockComissoes(professionalId);
    return mockComs
      .flatMap(c => (c.parcelas ?? []).map(p => ({
        ...p,
        professional_id: c.professional_id,
        payment_method: c.payment_method,
        total_amount: c.total_amount,
        commission_pct: c.commission_pct,
      })))
      .filter(p => p.status === 'PENDING')
      .filter(p => !professionalId || p.professional_id === professionalId);
  }
}

/** Marca parcela como paga */
export async function pagarParcela(parcelaId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase.from(TBL_COM.installments)
      .update({ status: 'PAID', paid_at: new Date().toISOString() })
      .eq('id', parcelaId);
    if (error) { logSupabaseError('[pagarParcela]', error); return { ok: false, error: error.message }; }

    // Verifica se todas as parcelas da comissão foram pagas
    const { data: parc } = await supabase.from(TBL_COM.installments)
      .select('commission_id, status')
      .eq('id', parcelaId)
      .single();
    if (parc?.commission_id) {
      const { data: todas } = await supabase.from(TBL_COM.installments)
        .select('status')
        .eq('commission_id', parc.commission_id);
      const todasPagas = (todas ?? []).every((p: any) => p.status === 'PAID');
      const algumaPaga = (todas ?? []).some((p: any) => p.status === 'PAID');
      await supabase.from(TBL_COM.commissions)
        .update({ status: todasPagas ? 'PAID' : algumaPaga ? 'PARTIAL' : 'PENDING' })
        .eq('id', parc.commission_id);
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

/** Marca um lote de parcelas como pago de uma vez só (Fechamento Semanal) */
export async function pagarLoteParcelas(parcelaIds: string[]): Promise<{ ok: boolean; error?: string }> {
  if (parcelaIds.length === 0) return { ok: true };
  try {
    const now = new Date().toISOString();
    const { error } = await supabase.from(TBL_COM.installments)
      .update({ status: 'PAID', paid_at: now })
      .in('id', parcelaIds);
    if (error) { logSupabaseError('[pagarLoteParcelas]', error); return { ok: false, error: error.message }; }

    const { data: parcs } = await supabase.from(TBL_COM.installments)
      .select('commission_id')
      .in('id', parcelaIds);
    const comIds = Array.from(new Set((parcs ?? []).map((p: any) => p.commission_id).filter(Boolean)));
    for (const comId of comIds) {
      const { data: todas } = await supabase.from(TBL_COM.installments)
        .select('status')
        .eq('commission_id', comId);
      const todasPagas = (todas ?? []).every((p: any) => p.status === 'PAID');
      const algumaPaga = (todas ?? []).some((p: any) => p.status === 'PAID');
      await supabase.from(TBL_COM.commissions)
        .update({ status: todasPagas ? 'PAID' : algumaPaga ? 'PARTIAL' : 'PENDING' })
        .eq('id', comId);
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

// ── COMANDA DIGITAL (PAINEL DO PROFISSIONAL) ───────────────

function mapItemComanda(r: Row): ItemComanda {
  return {
    id: r.id,
    appointment_id: r.appointment_id,
    inventory_id: r.inventory_id,
    type: r.type,
    qty: Number(r.qty),
    price: Number(r.price),
  };
}

export async function fetchItensComanda(appointmentId: string): Promise<ItemComanda[]> {
  const { data, error } = await supabase
    .from(TBL.appointment_items)
    .select('*')
    .eq('appointment_id', appointmentId);
  if (error) {
    logSupabaseError('[fetchItensComanda]', error);
    return [];
  }
  return (data ?? []).map(mapItemComanda);
}

export async function salvarItemComanda(
  appointmentId: string, 
  item: Omit<ItemComanda, 'id' | 'appointment_id'>
): Promise<{ ok: boolean; error?: string }> {
  // Faz um upsert: se o mesmo inventory_id e type já existirem pro appointment_id, atualiza a quantidade
  const payload = {
    appointment_id: appointmentId,
    inventory_id: item.inventory_id,
    type: item.type,
    qty: item.qty,
    price: item.price
  };

  const { error } = await supabase
    .from(TBL.appointment_items)
    .upsert(payload, { onConflict: 'appointment_id,inventory_id,type' });

  if (error) {
    logSupabaseError('[salvarItemComanda]', error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/**
 * Salva um insumo aplicado em TEMPO REAL durante o procedimento (direto pelo profissional ou auxiliar).
 * Atualiza o _meta.insumos_procedimento do agendamento, dá baixa no estoque e sincroniza a comanda.
 */
export async function salvarInsumoTempoRealProcedimento(params: {
  appointmentId: string;
  insumo: InsumoAtendimento;
  nomeProfissional?: string;
  nomeCliente?: string;
}): Promise<{ ok: boolean; insumosAtualizados: InsumoAtendimento[]; productCost: number; error?: string }> {
  try {
    const { data: current } = await supabase
      .from(TBL.agendamentos)
      .select('sub_services, product_cost')
      .eq('id', params.appointmentId)
      .maybeSingle();

    const currentSubs = Array.isArray(current?.sub_services) ? current.sub_services : [];
    const metaObj = currentSubs.find((s: any) => s?._meta) || { _meta: true };
    const curList: InsumoAtendimento[] = Array.isArray(metaObj.insumos_procedimento) 
      ? metaObj.insumos_procedimento 
      : [];

    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const itemToAdd: InsumoAtendimento = {
      ...params.insumo,
      horario: params.insumo.horario || nowTime,
    };

    const updatedList = [...curList, itemToAdd];
    const totalCost = Number(
      updatedList.reduce((acc, it) => acc + (Number(it.custo_total) || 0), 0).toFixed(2)
    );

    metaObj.insumos_procedimento = updatedList;
    metaObj.product_cost = totalCost;

    const cleanSubs = currentSubs.filter((s: any) => !s?._meta);
    cleanSubs.push(metaObj);

    const patch: any = {
      sub_services: cleanSubs,
      product_cost: totalCost,
    };

    const { error: updErr } = await supabase
      .from(TBL.agendamentos)
      .update(patch)
      .eq('id', params.appointmentId);

    if (updErr) {
      if (updErr.message?.includes('product_cost')) {
        delete patch.product_cost;
        await supabase.from(TBL.agendamentos).update(patch).eq('id', params.appointmentId);
      } else {
        logSupabaseError('[salvarInsumoTempoRealProcedimento agendamento update]', updErr);
        return { ok: false, insumosAtualizados: curList, productCost: 0, error: updErr.message };
      }
    }

    // 1. Dar baixa no estoque em tempo real
    try {
      await registrarMovimentacao(
        params.insumo.inventory_id,
        'OUT_PROCEDURE',
        params.insumo.qty_used,
        {
          appointmentId: params.appointmentId,
          notes: `Aplicação em tempo real (${params.insumo.etapa || 'Procedimento'}) por ${params.nomeProfissional || 'Equipe'} no cliente ${params.nomeCliente || ''}`.trim(),
          createdBy: params.nomeProfissional,
        }
      );
    } catch (movErr) {
      console.warn('[salvarInsumoTempoRealProcedimento] Falha ao decrementar estoque:', movErr);
    }

    // 2. Sincronizar com a comanda de itens
    try {
      const totalQty = updatedList
        .filter(i => i.inventory_id === params.insumo.inventory_id)
        .reduce((sum, i) => sum + i.qty_used, 0);

      await salvarItemComanda(params.appointmentId, {
        inventory_id: params.insumo.inventory_id,
        type: 'INSUMO',
        qty: totalQty,
        price: 0,
      });
    } catch (comandaErr) {
      console.warn('[salvarInsumoTempoRealProcedimento] Falha ao sincronizar comanda:', comandaErr);
    }

    return { ok: true, insumosAtualizados: updatedList, productCost: totalCost };
  } catch (err: any) {
    logSupabaseError('[salvarInsumoTempoRealProcedimento]', err);
    return { ok: false, insumosAtualizados: [], productCost: 0, error: err?.message || 'Erro inesperado' };
  }
}

/**
 * Remove um insumo lançado por engano em tempo real e estorna o estoque correspondente.
 */
export async function removerInsumoTempoRealProcedimento(params: {
  appointmentId: string;
  index: number;
  nomeProfissional?: string;
}): Promise<{ ok: boolean; insumosAtualizados: InsumoAtendimento[]; productCost: number; error?: string }> {
  try {
    const { data: current } = await supabase
      .from(TBL.agendamentos)
      .select('sub_services, product_cost')
      .eq('id', params.appointmentId)
      .maybeSingle();

    const currentSubs = Array.isArray(current?.sub_services) ? current.sub_services : [];
    const metaObj = currentSubs.find((s: any) => s?._meta) || { _meta: true };
    const curList: InsumoAtendimento[] = Array.isArray(metaObj.insumos_procedimento) 
      ? metaObj.insumos_procedimento 
      : [];

    if (params.index < 0 || params.index >= curList.length) {
      return { ok: false, insumosAtualizados: curList, productCost: Number(metaObj.product_cost || 0), error: 'Índice de insumo inválido' };
    }

    const itemRemovido = curList[params.index];
    const updatedList = curList.filter((_, idx) => idx !== params.index);
    const totalCost = Number(
      updatedList.reduce((acc, it) => acc + (Number(it.custo_total) || 0), 0).toFixed(2)
    );

    metaObj.insumos_procedimento = updatedList;
    metaObj.product_cost = totalCost;

    const cleanSubs = currentSubs.filter((s: any) => !s?._meta);
    cleanSubs.push(metaObj);

    const patch: any = {
      sub_services: cleanSubs,
      product_cost: totalCost,
    };

    const { error: updErr } = await supabase
      .from(TBL.agendamentos)
      .update(patch)
      .eq('id', params.appointmentId);

    if (updErr) {
      if (updErr.message?.includes('product_cost')) {
        delete patch.product_cost;
        await supabase.from(TBL.agendamentos).update(patch).eq('id', params.appointmentId);
      } else {
        logSupabaseError('[removerInsumoTempoRealProcedimento]', updErr);
        return { ok: false, insumosAtualizados: curList, productCost: totalCost, error: updErr.message };
      }
    }

    // Estornar estoque
    try {
      await registrarMovimentacao(
        itemRemovido.inventory_id,
        'IN',
        itemRemovido.qty_used,
        {
          appointmentId: params.appointmentId,
          notes: `Estorno de insumo (${itemRemovido.name} - ${itemRemovido.qty_used}${itemRemovido.unit}) removido da aplicação em tempo real`,
          createdBy: params.nomeProfissional,
        }
      );
    } catch (movErr) {
      console.warn('[removerInsumoTempoRealProcedimento] Falha ao estornar estoque:', movErr);
    }

    // Sincronizar comanda
    try {
      const remainingQty = updatedList
        .filter(i => i.inventory_id === itemRemovido.inventory_id)
        .reduce((sum, i) => sum + i.qty_used, 0);

      if (remainingQty > 0) {
        await salvarItemComanda(params.appointmentId, {
          inventory_id: itemRemovido.inventory_id,
          type: 'INSUMO',
          qty: remainingQty,
          price: 0,
        });
      } else {
        await supabase
          .from(TBL.appointment_items)
          .delete()
          .eq('appointment_id', params.appointmentId)
          .eq('inventory_id', itemRemovido.inventory_id)
          .eq('type', 'INSUMO');
      }
    } catch (comandaErr) {
      console.warn('[removerInsumoTempoRealProcedimento] Falha ao sincronizar comanda:', comandaErr);
    }

    return { ok: true, insumosAtualizados: updatedList, productCost: totalCost };
  } catch (err: any) {
    logSupabaseError('[removerInsumoTempoRealProcedimento]', err);
    return { ok: false, insumosAtualizados: [], productCost: 0, error: err?.message || 'Erro inesperado' };
  }
}

/**
 * Edita um insumo já lançado em tempo real no procedimento (quantidade, etapa, produto ou profissional),
 * recalcula o custo e ajusta o estoque (estorno ou débito da diferença).
 */
export async function editarInsumoTempoRealProcedimento(params: {
  appointmentId: string;
  index: number;
  novoInsumo: InsumoAtendimento;
  nomeProfissional?: string;
  nomeCliente?: string;
}): Promise<{ ok: boolean; insumosAtualizados: InsumoAtendimento[]; productCost: number; error?: string }> {
  try {
    const { data: current } = await supabase
      .from(TBL.agendamentos)
      .select('sub_services, product_cost')
      .eq('id', params.appointmentId)
      .maybeSingle();

    const currentSubs = Array.isArray(current?.sub_services) ? current.sub_services : [];
    const metaObj = currentSubs.find((s: any) => s?._meta) || { _meta: true };
    const curList: InsumoAtendimento[] = Array.isArray(metaObj.insumos_procedimento) 
      ? metaObj.insumos_procedimento 
      : [];

    if (params.index < 0 || params.index >= curList.length) {
      return { ok: false, insumosAtualizados: curList, productCost: Number(metaObj.product_cost || 0), error: 'Índice de insumo inválido' };
    }

    const itemAntigo = curList[params.index];
    const itemAtualizado: InsumoAtendimento = {
      ...itemAntigo,
      ...params.novoInsumo,
      horario: itemAntigo.horario || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedList = [...curList];
    updatedList[params.index] = itemAtualizado;

    const totalCost = Number(
      updatedList.reduce((acc, it) => acc + (Number(it.custo_total) || 0), 0).toFixed(2)
    );

    metaObj.insumos_procedimento = updatedList;
    metaObj.product_cost = totalCost;

    const cleanSubs = currentSubs.filter((s: any) => !s?._meta);
    cleanSubs.push(metaObj);

    const patch: any = {
      sub_services: cleanSubs,
      product_cost: totalCost,
    };

    const { error: updErr } = await supabase
      .from(TBL.agendamentos)
      .update(patch)
      .eq('id', params.appointmentId);

    if (updErr) {
      if (updErr.message?.includes('product_cost')) {
        delete patch.product_cost;
        await supabase.from(TBL.agendamentos).update(patch).eq('id', params.appointmentId);
      } else {
        logSupabaseError('[editarInsumoTempoRealProcedimento agendamento update]', updErr);
        return { ok: false, insumosAtualizados: curList, productCost: totalCost, error: updErr.message };
      }
    }

    // Ajuste de Estoque
    if (itemAntigo.inventory_id !== itemAtualizado.inventory_id) {
      // Mudou o produto: estorna integralmente o anterior e debita o novo
      try {
        await registrarMovimentacao(
          itemAntigo.inventory_id,
          'IN',
          itemAntigo.qty_used,
          {
            appointmentId: params.appointmentId,
            notes: `Estorno por alteração de insumo no procedimento (${itemAntigo.name})`,
            createdBy: params.nomeProfissional,
          }
        );
        await registrarMovimentacao(
          itemAtualizado.inventory_id,
          'OUT_PROCEDURE',
          itemAtualizado.qty_used,
          {
            appointmentId: params.appointmentId,
            notes: `Aplicação por alteração de insumo no procedimento (${itemAtualizado.name})`,
            createdBy: params.nomeProfissional,
          }
        );
      } catch (movErr) {
        console.warn('[editarInsumoTempoRealProcedimento] Falha ao ajustar estoque de produtos trocados:', movErr);
      }
    } else {
      // Mesmo produto: calcular diferença
      const diff = Number(itemAtualizado.qty_used) - Number(itemAntigo.qty_used);
      if (diff > 0) {
        // Consumiu mais: debita a diferença
        try {
          await registrarMovimentacao(
            itemAtualizado.inventory_id,
            'OUT_PROCEDURE',
            diff,
            {
              appointmentId: params.appointmentId,
              notes: `Acréscimo de consumo de insumo (${itemAtualizado.name} +${diff}${itemAtualizado.unit})`,
              createdBy: params.nomeProfissional,
            }
          );
        } catch (movErr) {
          console.warn('[editarInsumoTempoRealProcedimento] Falha ao debitar acréscimo de estoque:', movErr);
        }
      } else if (diff < 0) {
        // Consumiu menos: estorna a diferença
        try {
          await registrarMovimentacao(
            itemAtualizado.inventory_id,
            'IN',
            Math.abs(diff),
            {
              appointmentId: params.appointmentId,
              notes: `Estorno de insumo por edição (${itemAtualizado.name} -${Math.abs(diff)}${itemAtualizado.unit})`,
              createdBy: params.nomeProfissional,
            }
          );
        } catch (movErr) {
          console.warn('[editarInsumoTempoRealProcedimento] Falha ao estornar decréscimo de estoque:', movErr);
        }
      }
    }

    // Sincronizar comanda de itens
    try {
      if (itemAntigo.inventory_id !== itemAtualizado.inventory_id) {
        const remainingOldQty = updatedList
          .filter(i => i.inventory_id === itemAntigo.inventory_id)
          .reduce((sum, i) => sum + i.qty_used, 0);

        if (remainingOldQty > 0) {
          await salvarItemComanda(params.appointmentId, {
            inventory_id: itemAntigo.inventory_id,
            type: 'INSUMO',
            qty: remainingOldQty,
            price: 0,
          });
        } else {
          await supabase
            .from(TBL.appointment_items)
            .delete()
            .eq('appointment_id', params.appointmentId)
            .eq('inventory_id', itemAntigo.inventory_id)
            .eq('type', 'INSUMO');
        }
      }

      const remainingNewQty = updatedList
        .filter(i => i.inventory_id === itemAtualizado.inventory_id)
        .reduce((sum, i) => sum + i.qty_used, 0);

      if (remainingNewQty > 0) {
        await salvarItemComanda(params.appointmentId, {
          inventory_id: itemAtualizado.inventory_id,
          type: 'INSUMO',
          qty: remainingNewQty,
          price: 0,
        });
      }
    } catch (comandaErr) {
      console.warn('[editarInsumoTempoRealProcedimento] Falha ao sincronizar comanda:', comandaErr);
    }

    return { ok: true, insumosAtualizados: updatedList, productCost: totalCost };
  } catch (err: any) {
    logSupabaseError('[editarInsumoTempoRealProcedimento]', err);
    return { ok: false, insumosAtualizados: [], productCost: 0, error: err?.message || 'Erro inesperado' };
  }
}

// --------------------------------------------------------------------------------
// CONFIGURAÇÕES DO SISTEMA
// --------------------------------------------------------------------------------

export async function fetchSystemSettings(): Promise<{key: string, value: string}[]> {
  const { data, error } = await supabase.from('salon_system_settings').select('*');
  if (error) {
    logSupabaseError('[fetchSystemSettings]', error);
    return [];
  }
  return data || [];
}

export async function updateSystemSetting(key: string, value: string): Promise<{ok: boolean, error?: string}> {
  const { error } = await supabase.from('salon_system_settings').upsert({ key, value }, { onConflict: 'key' });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// --------------------------------------------------------------------------------
// REGRAS DE MARKETING
// --------------------------------------------------------------------------------

export async function fetchMarketingRules(): Promise<any[]> {
  try {
    const res = await fetch('/api/admin/marketing/rules');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.warn('[fetchMarketingRules] API error, tentando client fallback:', err);
  }

  const { data, error } = await supabase
    .from('salon_marketing_rules')
    .select('*, service:salon_services(name)')
    .order('created_at', { ascending: false });

  if (error) {
    logSupabaseError('[fetchMarketingRules]', error);
    return [];
  }
  return data || [];
}

export async function createMarketingRule(payload: any): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/admin/marketing/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (res.ok) return { ok: true };
    return { ok: false, error: json.error || 'Erro ao criar regra' };
  } catch (err: any) {
    console.warn('[createMarketingRule] API error, tentando client fallback:', err);
  }

  const { error } = await supabase.from('salon_marketing_rules').insert(payload);
  if (error) {
    logSupabaseError('[createMarketingRule]', error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function updateMarketingRule(id: string, payload: any): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/admin/marketing/rules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...payload }),
    });
    const json = await res.json();
    if (res.ok) return { ok: true };
    return { ok: false, error: json.error || 'Erro ao atualizar regra' };
  } catch (err: any) {
    console.warn('[updateMarketingRule] API error, tentando client fallback:', err);
  }

  const { error } = await supabase.from('salon_marketing_rules').update(payload).eq('id', id);
  if (error) {
    logSupabaseError('[updateMarketingRule]', error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function deleteMarketingRule(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/admin/marketing/rules?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    if (res.ok) return { ok: true };
    return { ok: false, error: json.error || 'Erro ao excluir regra' };
  } catch (err: any) {
    console.warn('[deleteMarketingRule] API error, tentando client fallback:', err);
  }

  const { error } = await supabase.from('salon_marketing_rules').delete().eq('id', id);
  if (error) {
    logSupabaseError('[deleteMarketingRule]', error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
