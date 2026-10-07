/**
 * Tipos do Sistema de Gestão — refletem o modelo de dados da spec
 * `sistema-gestao-salao.md`. Todas as tabelas usam UUID (genrando default
 * `gen_random_uuid()`) e timestamps com timezone.
 */

export type UUID = string;

export type StatusAgendamento =
  | 'pendente'
  | 'confirmado'
  | 'em_atendimento'
  | 'concluido'
  | 'cancelado'
  | 'no_show';

export type CanalAgendamento = 'online' | 'recepcao' | 'manual';

export interface Cliente {
  id: UUID;
  nome: string;
  telefone: string; // único, normalizado (apenas dígitos)
  email?: string | null;
  cpf?: string | null;
  endereco?: string | null;
  nascimento?: string | null; // date ISO YYYY-MM-DD
  observacoes?: string | null;
  criado_em: string; // timestamptz
  atualizado_em?: string;
  loyalty_points?: number;
}

export interface Profissional {
  id: UUID;
  nome: string;
  foto_url?: string | null;
  especialidades?: string[] | null; // tags
  ativo: boolean;
  jornada_semanal: JornadaSemanal;
  criado_em: string;
  atualizado_em?: string;
}

export interface JornadaSemanal {
  [dia: number]: { inicio: string; fim: string; ativo?: boolean; intervalo_inicio?: string; intervalo_fim?: string };
  [diaStr: string]: { inicio: string; fim: string; ativo?: boolean; intervalo_inicio?: string; intervalo_fim?: string } | any;
}

export interface Servico {
  id: UUID;
  nome: string;
  categoria: string;
  duracao_min: number;
  preco: number; // BRL, precisão 2
  preco_maximo?: number | null; // Novo: Preço máximo se for variável
  preco_variavel?: boolean; // Novo: Indica se o serviço tem faixa de preço
  ativo: boolean;
  visivel_app: boolean;
  points_reward?: number;
  points_cost?: number;
}

export interface ProfissionalServico {
  profissional_id: UUID;
  servico_id: UUID;
}

export interface Agendamento {
  id: UUID;
  cliente_id: UUID;
  profissional_id: UUID;
  servico_id: UUID;
  data: string; // date YYYY-MM-DD
  hora_inicio: string; // "09:00"
  hora_fim: string;
  status: StatusAgendamento;
  canal: CanalAgendamento;
  observacoes?: string | null;
  criado_em: string;
  atualizado_em?: string;
}

export interface Avaliacao {
  id: UUID;
  agendamento_id: UUID;
  cliente_id: UUID;
  nota: number; // 1..5
  comentario?: string | null;
  criado_em: string;
}

export interface AvaliacaoEnvio {
  cliente_id: UUID;
  ultimo_envio_em: string;
}

export interface Transacao {
  id: UUID;
  agendamento_id: UUID;
  valor: number;
  forma_pagamento: 'dinheiro' | 'pix' | 'debito' | 'credito' | 'prepago';
  comissao_profissional: number;
  data: string;
}

export interface BloqueioAgenda {
  id: UUID;
  profissional_id: UUID;
  data_inicio: string;
  data_fim: string;
  motivo: string;
  criado_em: string;
}

/** Payload do app cliente pra agendar (sem autenticação) */
export interface AgendamentoApp {
  nome_cliente: string;
  telefone_cliente: string;
  servico_id: UUID;
  profissional_id: UUID;
  data: string;
  hora_inicio: string;
  email?: string | null;
  consentimento_lgpd: boolean;
}

/** Produto da loja (admin-loja) */
export interface Produto {
  id: UUID;
  name: string;
  category: string;
  type: 'LOCAL_STOCK' | 'AFFILIATE_ML';
  price: number;
  stock?: number;
  active: boolean;
  image_url?: string;
  link?: string;
}

// ── ESTOQUE DO SALÃO ────────────────────────────────────────

export type UnidadeEstoque = 'g' | 'ml' | 'un';

/** Produto do estoque interno do salão (insumo e/ou venda) */
export interface ProdutoEstoque {
  id: UUID;
  name: string;
  brand?: string | null;
  category: string;
  unit: UnidadeEstoque;
  stock_qty: number;
  stock_alert_qty?: number | null;
  cost_price: number;
  sale_price?: number | null;
  price_per_gram?: number | null;  // custo por grama/ml calculado
  allow_sale: boolean;
  allow_procedure_use: boolean;
  active: boolean;
  image_url?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
}

/** Movimentação de entrada/saída do estoque */
export interface MovimentacaoEstoque {
  id: UUID;
  inventory_id: UUID;
  type: 'IN' | 'OUT_SALE' | 'OUT_PROCEDURE' | 'ADJUSTMENT';
  qty: number;
  unit_cost?: number | null;
  appointment_id?: UUID | null;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
}

/** Vínculo entre serviço e produto usado com pesagem */
export interface ServicoProduto {
  id: UUID;
  service_id: UUID;
  inventory_id: UUID;
  default_qty_g: number;
  is_required: boolean;
}

/** Insumo usado no atendimento (para o checkout) */
export interface InsumoAtendimento {
  inventory_id: UUID;
  name: string;
  unit: UnidadeEstoque;
  price_per_gram: number;
  qty_used: number;   // quantidade usada em gramas/ml
  custo_total: number; // qty_used × price_per_gram
}

// ── COMISSÕES DOS PROFISSIONAIS ────────────────────────────

export type FormaPagamento = 'DINHEIRO' | 'PIX' | 'DEBITO' | 'CREDITO';

/** Regra de comissão: geral (service_id null) ou por serviço */
export interface RegraComissao {
  id: UUID;
  professional_id: UUID;
  service_id?: UUID | null;
  commission_pct: number;  // 0–100
  active: boolean;
  notes?: string | null;
  created_at?: string;
}

/** Registro de comissão gerado no fechamento do atendimento */
export interface Comissao {
  id: UUID;
  appointment_id: UUID;
  professional_id: UUID;
  total_amount: number;
  commission_pct: number;
  total_commission: number;
  installments: number;
  payment_method: FormaPagamento;
  status: 'PENDING' | 'PARTIAL' | 'PAID';
  created_at: string;
  updated_at?: string;
  parcelas?: ParcelaComissao[];
}

/** Parcela individual de comissão */
export interface ParcelaComissao {
  id: UUID;
  commission_id: UUID;
  installment_number: number;
  amount: number;
  due_date: string;        // YYYY-MM-DD
  paid_at?: string | null;
  status: 'PENDING' | 'PAID';
  notes?: string | null;
  created_at?: string;
}
