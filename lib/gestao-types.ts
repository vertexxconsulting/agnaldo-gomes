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

export type CanalAgendamento = 'online' | 'recepcao';

export interface Cliente {
  id: UUID;
  nome: string;
  telefone: string; // único, normalizado (apenas dígitos)
  email?: string | null;
  nascimento?: string | null; // date ISO YYYY-MM-DD
  observacoes?: string | null;
  criado_em: string; // timestamptz
  atualizado_em?: string;
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
  [dia: number]: { inicio: string; fim: string }; // 0=Sun..6=Sat, "09:00"
}

export interface Servico {
  id: UUID;
  nome: string;
  categoria: string;
  duracao_min: number;
  preco: number; // BRL, precisão 2
  ativo: boolean;
  visivel_app: boolean;
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
