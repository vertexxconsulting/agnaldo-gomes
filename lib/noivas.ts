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
// Camada de dados: memória (persiste em memória da sessão + localStorage)
// Quando o Supabase estiver conectado, substituir por queries reais.
// ─────────────────────────────────────────────────────────────────────

const LS_KEY = 'ag_noivas_state';

interface NoivasState {
  agendamentos: AgendamentoNoiva[];
  pagamentos: PagamentoNoiva[];
}

function loadState(): NoivasState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as NoivasState;
      // Remove os dados de exemplo antigos para garantir que a lista fique limpa
      parsed.agendamentos = parsed.agendamentos.filter(a => !a.id.startsWith('n-seed-'));
      return parsed;
    }
  } catch {}
  return { agendamentos: seedAgendamentos(), pagamentos: [] };
}

function saveState(state: NoivasState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {}
}

let state: NoivasState =
  typeof window !== 'undefined' ? loadState() : { agendamentos: [], pagamentos: [] };

export function subscribeNoivas(cb: () => void): () => void {
  const id = setInterval(() => {
    if (typeof window !== 'undefined') {
      const next = loadState();
      if (next !== state) {
        state = next;
        cb();
      }
    }
  }, 1500);
  return () => clearInterval(id);
}

export function getNoivaPacotes(): NoivaPacote[] {
  return NOIVA_PACOTES.filter(p => p.ativo);
}

export function getNoivaAgendamentos(): AgendamentoNoiva[] {
  state = typeof window !== 'undefined' ? loadState() : state;
  return state.agendamentos;
}

export function getNoivaPagamentos(agendamentoId: string): PagamentoNoiva[] {
  state = typeof window !== 'undefined' ? loadState() : state;
  return state.pagamentos.filter(p => p.agendamento_id === agendamentoId);
}

function setState(next: NoivasState) {
  state = next;
  saveState(next);
}

export function criarAgendamentoNoiva(
  params: Omit<AgendamentoNoiva, 'id' | 'status' | 'criado_em'>
): AgendamentoNoiva {
  const novo: AgendamentoNoiva = {
    ...params,
    id: `n${Date.now()}`,
    status: 'sinal_pendente',
    criado_em: new Date().toISOString(),
  };
  const next = { agendamentos: [...state.agendamentos, novo], pagamentos: state.pagamentos };
  setState(next);
  return novo;
}

export function atualizarStatusNoiva(id: string, status: StatusAgendamentoNoiva) {
  const next = {
    agendamentos: state.agendamentos.map(a => (a.id === id ? { ...a, status } : a)),
    pagamentos: state.pagamentos,
  };
  setState(next);
}

export function excluirAgendamentoNoiva(id: string) {
  setState({
    agendamentos: state.agendamentos.filter(a => a.id !== id),
    pagamentos: state.pagamentos.filter(p => p.agendamento_id !== id),
  });
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

export function registrarPagamentoNoiva(params: {
  agendamento_id: string;
  tipo: 'sinal' | 'complemento' | 'final';
  valor: number;
  forma: 'pix' | 'cartao' | 'dinheiro' | 'transferencia';
  comprovante?: string | null;
  pixCopiaCola?: string | null;
}): PagamentoNoiva {
  const pagamento: PagamentoNoiva = {
    id: `pg${Date.now()}`,
    status: 'pago',
    criado_em: new Date().toISOString(),
    data_pagamento: new Date().toISOString(),
    ...params,
  };
  setState({ agendamentos: state.agendamentos, pagamentos: [...state.pagamentos, pagamento] });

  // Auto-atualizar status do agendamento conforme a regra do sinal de 50%
  const ag = state.agendamentos.find(a => a.id === pagamento.agendamento_id);
  if (ag && ag.status === 'sinal_pendente' && podeConfirmar(pagamento.agendamento_id)) {
    setState({
      agendamentos: state.agendamentos.map(a =>
        a.id === pagamento.agendamento_id ? { ...a, status: 'sinal_pago' as StatusAgendamentoNoiva } : a
      ),
      pagamentos: state.pagamentos,
    });
  }
  return pagamento;
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
