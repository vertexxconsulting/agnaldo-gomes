/**
 * Módulo Dia da Noiva — tipos, pacotes, pagamentos e camada de dados.
 * Regra de negócio: todo agendamento de noiva exige sinal mínimo de 50%
 * do valor total antes de ser considerado confirmado. Sem sinal ≥50%,
 * a data fica apenas reservada como "sinal_pendente" e pode ser cancelada
 * para liberar a agenda.
 */

export interface NoivaPacote {
  id: string;
  nome: string;
  descricao: string;
  preco: number; // valor total BRL
  duracao_min: number; // duração total do atendimento
  itens: string[];
  ativo: boolean;
}

export type StatusPagamentoNoiva = 'pendente' | 'pago';
export type StatusAgendamentoNoiva = 'sinal_pendente' | 'sinal_pago' | 'confirmado' | 'concluido' | 'cancelado';

export interface PagamentoNoiva {
  id: string;
  agendamento_id: string;
  tipo: 'sinal' | 'complemento' | 'final';
  valor: number;
  forma: 'pix' | 'cartao' | 'dinheiro' | 'transferencia';
  status: StatusPagamentoNoiva;
  pixCopiaCola?: string | null;
  comprovante?: string | null; // base64 ou url
  data_pagamento?: string | null;
  criado_em: string;
}

export interface AgendamentoNoiva {
  id: string;
  pacote_id: string;
  nome_noiva: string;
  telefone: string;
  email?: string | null;
  data_evento: string; // date do casamento
  data_agendamento: string; // date da prova/serviço
  hora: string;
  profissional_id: string;
  status: StatusAgendamentoNoiva;
  sinal_percentual: number; // mínimo 50
  observacoes?: string | null;
  criado_em: string;
}

/** Pacotes oficiais Dia da Noiva */
export const NOIVA_PACOTES: NoivaPacote[] = [
  {
    id: 'noiva-essencial',
    nome: 'Noivas — Cabelo e Maquiagem (sem teste)',
    descricao: 'Produção completa de penteado e maquiagem profissional no grande dia.',
    preco: 980,
    duracao_min: 180,
    itens: [
      'Penteado exclusivo para o grande dia',
      'Maquiagem profissional com produtos premium',
      'Cílios postiços e fixação de alta durabilidade',
      'Retoque final antes da saída para a cerimônia',
    ],
    ativo: true,
  },
  {
    id: 'noiva-premium-completo',
    nome: 'Noivas — Pacote Completo Premium',
    descricao: 'A experiência dos sonhos: Pé e mão, Sobrancelha, teste completo antecipado de maquiagem e cabelo + produção do Dia do Casamento.',
    preco: 2499,
    duracao_min: 360,
    itens: [
      'Pé e Mão com esmaltação especial',
      'Design de Sobrancelha personalizado',
      'Ensaio / Teste prévio de Cabelo e Maquiagem',
      'Cabelo e Maquiagem definitiva no Dia da Noiva',
      'Acompanhamento e suporte exclusivo até a saída',
    ],
    ativo: true,
  },
  {
    id: 'noiva-penteado',
    nome: 'Penteado de Noiva',
    descricao: 'Penteado exclusivo desenhado no visagismo da noiva com fixação de alta duração.',
    preco: 140,
    duracao_min: 60,
    itens: ['Visagismo personalizado', 'Penteado exclusivo', 'Fixação profissional de longa duração'],
    ativo: true,
  },
  {
    id: 'noiva-makeup',
    nome: 'Maquiagem Profissional',
    descricao: 'Maquiagem profissional com produtos premium resistentes a lágrimas e calor.',
    preco: 160,
    duracao_min: 60,
    itens: ['Makeup de longa duração', 'Produtos de alta performance', 'Cílios inclusos'],
    ativo: true,
  },
];

export const NOIVA_STATUS_LABEL: Record<StatusAgendamentoNoiva, string> = {
  sinal_pendente: 'Sinal Pendente',
  sinal_pago: 'Sinal Pago',
  confirmado: 'Confirmado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

export const NOIVA_STATUS_COLOR: Record<StatusAgendamentoNoiva, string> = {
  sinal_pendente: 'bg-amber-100 text-amber-700 border border-amber-200',
  sinal_pago: 'bg-blue-50 text-blue-700 border border-blue-200',
  confirmado: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  concluido: 'bg-slate-100 text-slate-600 border border-slate-200',
  cancelado: 'bg-red-50 text-red-600 border border-red-200',
};

/** Percentual mínimo de sinal para serviços de noiva */
export const NOIVA_SINAL_MIN_PCT = 50;

// ─────────────────────────────────────────────────────────────────────
// Camada de dados: Conectado ao Supabase com fallback de memória para UI síncrona
// ─────────────────────────────────────────────────────────────────────

import { supabase } from './supabase';

interface NoivasState {
  agendamentos: AgendamentoNoiva[];
  pagamentos: PagamentoNoiva[];
}

let state: NoivasState = { agendamentos: [], pagamentos: [] };
let subscribers: (() => void)[] = [];

export async function fetchNoivaDadosDB() {
  if (typeof window === 'undefined') return;
  try {
    const [resAg, resPg] = await Promise.all([
      supabase.from('salon_bride_appointments').select('*').order('data_agendamento', { ascending: true }),
      supabase.from('salon_bride_payments').select('*').order('created_at', { ascending: true })
    ]);
    
    if (resAg.data && resPg.data) {
       state.agendamentos = resAg.data.map((r: any) => ({
         id: r.id,
         pacote_id: r.pacote_id,
         nome_noiva: r.nome_noiva,
         telefone: r.telefone,
         email: r.email,
         data_evento: r.data_evento,
         data_agendamento: r.data_agendamento,
         hora: r.hora,
         profissional_id: r.profissional_id,
         status: r.status,
         sinal_percentual: r.sinal_percentual,
         observacoes: r.observacoes,
         criado_em: r.created_at,
       }));
       state.pagamentos = resPg.data.map((r: any) => ({
         id: r.id,
         agendamento_id: r.agendamento_id,
         tipo: r.tipo,
         valor: Number(r.valor),
         forma: r.forma,
         status: r.status,
         pixCopiaCola: r.pix_copia_cola,
         comprovante: r.comprovante_url,
         data_pagamento: r.data_pagamento,
         criado_em: r.created_at,
       }));
       notifySubscribers();
    }
  } catch(e) { console.error('Erro ao buscar dados de noivas', e) }
}

function notifySubscribers() {
  subscribers.forEach(cb => cb());
}

export function subscribeNoivas(cb: () => void): () => void {
  subscribers.push(cb);
  fetchNoivaDadosDB();
  
  const channel = supabase.channel('noivas_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'salon_bride_appointments' }, () => fetchNoivaDadosDB())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'salon_bride_payments' }, () => fetchNoivaDadosDB())
    .subscribe();

  return () => {
    subscribers = subscribers.filter(s => s !== cb);
    if (subscribers.length === 0) {
       supabase.removeChannel(channel);
    }
  };
}

export function getNoivaPacotes(): NoivaPacote[] {
  return NOIVA_PACOTES.filter(p => p.ativo);
}

export function getNoivaAgendamentos(): AgendamentoNoiva[] {
  return state.agendamentos;
}

export function getNoivaPagamentos(agendamentoId: string): PagamentoNoiva[] {
  return state.pagamentos.filter(p => p.agendamento_id === agendamentoId);
}

export async function criarAgendamentoNoiva(
  params: Omit<AgendamentoNoiva, 'id' | 'status' | 'criado_em'>
): Promise<AgendamentoNoiva> {
  const { data, error } = await supabase.from('salon_bride_appointments').insert({
    pacote_id: params.pacote_id,
    nome_noiva: params.nome_noiva,
    telefone: params.telefone,
    email: params.email,
    data_evento: params.data_evento,
    data_agendamento: params.data_agendamento,
    hora: params.hora,
    profissional_id: params.profissional_id,
    status: 'sinal_pendente',
    sinal_percentual: params.sinal_percentual,
    observacoes: params.observacoes,
  }).select().single();

  if (error || !data) throw new Error(error?.message || 'Erro ao criar agendamento');
  
  const novo = { ...data, criado_em: data.created_at } as unknown as AgendamentoNoiva;
  await fetchNoivaDadosDB();
  return novo;
}

export async function atualizarStatusNoiva(id: string, status: StatusAgendamentoNoiva) {
  await supabase.from('salon_bride_appointments').update({ status }).eq('id', id);
  await fetchNoivaDadosDB();
}

export async function excluirAgendamentoNoiva(id: string) {
  await supabase.from('salon_bride_appointments').delete().eq('id', id);
  await fetchNoivaDadosDB();
}

/** Valor total já pago de um agendamento */
export function totalPago(agendamentoId: string): number {
  return state.pagamentos
    .filter(p => p.agendamento_id === agendamentoId && p.status === 'pago')
    .reduce((s, p) => s + p.valor, 0);
}

/** Regra: sinal mínimo de 50% — o agendamento só pode ser confirmado se o total pago ≥ 50% do pacote */
export function podeConfirmar(agendamentoId: string): boolean {
  const ag = state.agendamentos.find(a => a.id === agendamentoId);
  if (!ag) return false;
  const pacote = NOIVA_PACOTES.find(p => p.id === ag.pacote_id);
  if (!pacote) return false;
  return totalPago(agendamentoId) >= (pacote.preco * NOIVA_SINAL_MIN_PCT) / 100;
}

/** Gera código PIX copia e cola simulado (BR Code) para o sinal */
export function gerarPixCopiaCola(valor: number, descricao: string): string {
  const valorStr = valor.toFixed(2);
  const idPayload = descricao.slice(0, 50);
  const payload = [
    '000201',
    '26' + String(38 + idPayload.length).padStart(2, '0') + '0014br.gov.bcb.pix2512agnaldogomes.com.br/qr/pix',
    '52040000',
    '5303986',
    '54' + String(valorStr.length + 2).padStart(2, '0') + valorStr,
    '5802BR',
    '5913AGNALDO GOMES',
    '6009SAO PAULO',
    '62' + String(7 + idPayload.length).padStart(2, '0') + '05' + String(idPayload.length).padStart(2, '0') + idPayload,
    '6304',
  ].join('');
  // CRC16 CCITT do payload (simplificado: calculado)
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return payload + crc.toString(16).toUpperCase().padStart(4, '0');
}

export async function registrarPagamentoNoiva(params: {
  agendamento_id: string;
  tipo: 'sinal' | 'complemento' | 'final';
  valor: number;
  forma: 'pix' | 'cartao' | 'dinheiro' | 'transferencia';
  comprovante?: string | null;
  pixCopiaCola?: string | null;
}): Promise<PagamentoNoiva> {
  const { data, error } = await supabase.from('salon_bride_payments').insert({
    agendamento_id: params.agendamento_id,
    tipo: params.tipo,
    valor: params.valor,
    forma: params.forma,
    status: 'pago',
    pix_copia_cola: params.pixCopiaCola || null,
    comprovante_url: params.comprovante || null,
    data_pagamento: new Date().toISOString()
  }).select().single();

  if (error || !data) throw new Error(error?.message || 'Erro ao registrar pagamento');

  await fetchNoivaDadosDB();

  // Auto-atualizar status do agendamento conforme a regra do sinal de 50%
  const ag = state.agendamentos.find(a => a.id === params.agendamento_id);
  if (ag && ag.status === 'sinal_pendente' && podeConfirmar(params.agendamento_id)) {
    await atualizarStatusNoiva(params.agendamento_id, 'sinal_pago');
  }
  
  return { ...data, criado_em: data.created_at, pixCopiaCola: data.pix_copia_cola } as unknown as PagamentoNoiva;
}

// ─────────────────────────────────────────────────────────────────────
// Dados de exemplo (demonstração)
// ─────────────────────────────────────────────────────────────────────
function seedAgendamentos(): AgendamentoNoiva[] {
  return [];
}

export function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
