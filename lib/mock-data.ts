/**
 * Dados mock centralizados para o painel de gestão (Fase 1).
 * Simula registros que viriam do Supabase.
 * Quando o backend estiver conectado, estes dados serão substituídos por queries reais.
 */

import type {
  Cliente, Profissional, Servico, ProfissionalServico,
  Agendamento, BloqueioAgenda, StatusAgendamento,
} from './gestao-types';

// Re-exportar tipos para consumers que importam do mock-data
export type { Cliente, Profissional, Servico, ProfissionalServico, Agendamento, BloqueioAgenda, StatusAgendamento };
import { supabase } from './supabase';
import {
  fetchClientes, fetchProfissionais, fetchServicos,
  fetchProfissionalServico, fetchAgendamentos, fetchBloqueios,
} from './supabase-queries';

// ────────────────────────────────────────────
// SERVIÇOS (Tabela Oficial do Salão — sempre "a partir de")
// ────────────────────────────────────────────
export const MOCK_SERVICOS: Servico[] = [
  // Cabelo & Cortes
  { id: 'b0000001-0000-0000-0000-000000000001', nome: 'Corte Masculino (Equipe)', categoria: 'Cortes', duracao_min: 30, preco: 50, ativo: true, visivel_app: true },
  { id: 'b0000001-0000-0000-0000-000000000002', nome: 'Corte Masculino (com Agnaldo Gomes)', categoria: 'Cortes', duracao_min: 35, preco: 60, ativo: true, visivel_app: true },
  { id: 'b0000001-0000-0000-0000-000000000003', nome: 'Corte Feminino', categoria: 'Cortes', duracao_min: 45, preco: 140, ativo: true, visivel_app: true },
  { id: 'b0000001-0000-0000-0000-000000000004', nome: 'Corte Feminino com Escova', categoria: 'Cortes', duracao_min: 60, preco: 160, ativo: true, visivel_app: true },
  { id: 'b0000001-0000-0000-0000-000000000005', nome: 'Escova', categoria: 'Cortes', duracao_min: 30, preco: 45, ativo: true, visivel_app: true },
  { id: 'b0000001-0000-0000-0000-000000000006', nome: 'Penteado', categoria: 'Cortes', duracao_min: 60, preco: 140, ativo: true, visivel_app: true },

  // Coloração & Mechas
  { id: 'b0000001-0000-0000-0000-000000000007', nome: 'Mechas (R$ 480 a R$ 1.080)', categoria: 'Coloração', duracao_min: 180, preco: 480, ativo: true, visivel_app: true },
  { id: 'b0000001-0000-0000-0000-000000000008', nome: 'Coloração (R$ 160 a R$ 580)', categoria: 'Coloração', duracao_min: 90, preco: 160, ativo: true, visivel_app: true },

  // Tratamentos & Terapia Capilar
  { id: 'b0000001-0000-0000-0000-000000000009', nome: 'Hidratação', categoria: 'Tratamentos', duracao_min: 40, preco: 95, ativo: true, visivel_app: true },
  { id: 'b0000001-0000-0000-0000-000000000010', nome: 'Selamento Térmico', categoria: 'Tratamentos', duracao_min: 60, preco: 120, ativo: true, visivel_app: true },
  { id: 'b0000001-0000-0000-0000-000000000011', nome: 'Reconstrução', categoria: 'Tratamentos', duracao_min: 50, preco: 120, ativo: true, visivel_app: true },
  { id: 'b0000001-0000-0000-0000-000000000012', nome: 'Ozônio Terapia', categoria: 'Tratamentos', duracao_min: 50, preco: 160, ativo: true, visivel_app: true },
  { id: 'b0000001-0000-0000-0000-000000000013', nome: 'Micro Mist - Terapia Capilar', categoria: 'Tratamentos', duracao_min: 60, preco: 180, ativo: true, visivel_app: true },
  { id: 'b0000001-0000-0000-0000-000000000014', nome: 'Terapia Capilar Personalizada (R$ 190 a R$ 420)', categoria: 'Tratamentos', duracao_min: 60, preco: 190, ativo: true, visivel_app: true },

  // Barbearia & Rosto
  { id: 'b0000001-0000-0000-0000-000000000015', nome: 'Barba', categoria: 'Barbearia', duracao_min: 30, preco: 45, ativo: true, visivel_app: true },
  { id: 'b0000001-0000-0000-0000-000000000016', nome: 'Sobrancelha', categoria: 'Estética Facial', duracao_min: 20, preco: 55, ativo: true, visivel_app: true },
  { id: 'b0000001-0000-0000-0000-000000000017', nome: 'Maquiagem', categoria: 'Maquiagem', duracao_min: 60, preco: 160, ativo: true, visivel_app: true },
  { id: 'b0000001-0000-0000-0000-000000000018', nome: 'Limpeza de Pele (Sob consulta)', categoria: 'Estética Facial', duracao_min: 60, preco: 120, ativo: true, visivel_app: true },

  // Manicure, Pedicure & Podologia
  { id: 'b0000001-0000-0000-0000-000000000019', nome: 'Mão', categoria: 'Unhas', duracao_min: 40, preco: 40, ativo: true, visivel_app: true },
  { id: 'b0000001-0000-0000-0000-000000000020', nome: 'Pé', categoria: 'Unhas', duracao_min: 45, preco: 45, ativo: true, visivel_app: true },
  { id: 'b0000001-0000-0000-0000-000000000021', nome: 'Podologia', categoria: 'Podologia', duracao_min: 60, preco: 90, ativo: true, visivel_app: true },

  // Estética Corporal
  { id: 'b0000001-0000-0000-0000-000000000022', nome: 'Drenagem Linfática', categoria: 'Estética Corporal', duracao_min: 60, preco: 180, ativo: true, visivel_app: true },

  // Noivas
  { id: 'b0000001-0000-0000-0000-000000000023', nome: 'Noivas — Cabelo e Maquiagem (sem teste)', categoria: 'Noivas', duracao_min: 180, preco: 980, ativo: true, visivel_app: true },
  { id: 'b0000001-0000-0000-0000-000000000024', nome: 'Noivas — Pé e mão, Sobrancelha, teste de make/cabelo e dia da noiva', categoria: 'Noivas', duracao_min: 360, preco: 2499, ativo: true, visivel_app: true },
];

// ────────────────────────────────────────────
// PROFISSIONAIS
// ────────────────────────────────────────────
export const MOCK_PROFISSIONAIS: Profissional[] = [
  {
    id: 'a0000001-0000-0000-0000-000000000001',
    nome: 'Agnaldo Gomes',
    foto_url: '/agnaldo1.webp',
    especialidades: ['Cortes', 'Coloração', 'Mechas', 'Terapia Capilar', 'Noivas'],
    ativo: true,
    jornada_semanal: {
      seg: { ativo: false, inicio: '09:00', fim: '19:00' },
      ter: { ativo: true, inicio: '09:00', fim: '19:00' },
      qua: { ativo: true, inicio: '09:00', fim: '19:00' },
      qui: { ativo: true, inicio: '09:00', fim: '19:00' },
      sex: { ativo: true, inicio: '09:00', fim: '19:00' },
      sab: { ativo: true, inicio: '08:00', fim: '17:00' },
      dom: { ativo: false, inicio: '09:00', fim: '13:00' },
    },
    criado_em: new Date().toISOString(),
  },
  {
    id: 'a0000001-0000-0000-0000-000000000002',
    nome: 'Equipe Studio',
    foto_url: '/agnaldo2.webp',
    especialidades: ['Cortes', 'Escova', 'Tratamentos', 'Barbearia', 'Unhas', 'Podologia', 'Estética'],
    ativo: true,
    jornada_semanal: {
      seg: { ativo: true, inicio: '09:00', fim: '19:00' },
      ter: { ativo: true, inicio: '09:00', fim: '19:00' },
      qua: { ativo: true, inicio: '09:00', fim: '19:00' },
      qui: { ativo: true, inicio: '09:00', fim: '19:00' },
      sex: { ativo: true, inicio: '09:00', fim: '19:00' },
      sab: { ativo: true, inicio: '08:00', fim: '17:00' },
      dom: { ativo: false, inicio: '09:00', fim: '13:00' },
    },
    criado_em: new Date().toISOString(),
  },
];

export function upsertMockProfissional(prof: Profissional) {
  const idx = MOCK_PROFISSIONAIS.findIndex(p => p.id === prof.id);
  if (idx >= 0) {
    MOCK_PROFISSIONAIS[idx] = prof;
  } else {
    MOCK_PROFISSIONAIS.push(prof);
  }
}

export function deleteMockProfissional(id: string) {
  const idx = MOCK_PROFISSIONAIS.findIndex(p => p.id === id);
  if (idx >= 0) MOCK_PROFISSIONAIS.splice(idx, 1);
}

// ────────────────────────────────────────────
// VÍNCULO PROFISSIONAL ↔ SERVIÇO
// ────────────────────────────────────────────
export const MOCK_PROF_SERVICO: ProfissionalServico[] = [
  // Agnaldo Gomes
  { profissional_id: 'a0000001-0000-0000-0000-000000000001', servico_id: 'b0000001-0000-0000-0000-000000000002' },
  { profissional_id: 'a0000001-0000-0000-0000-000000000001', servico_id: 'b0000001-0000-0000-0000-000000000003' },
  { profissional_id: 'a0000001-0000-0000-0000-000000000001', servico_id: 'b0000001-0000-0000-0000-000000000004' },
  { profissional_id: 'a0000001-0000-0000-0000-000000000001', servico_id: 'b0000001-0000-0000-0000-000000000007' },
  { profissional_id: 'a0000001-0000-0000-0000-000000000001', servico_id: 'b0000001-0000-0000-0000-000000000008' },
  { profissional_id: 'a0000001-0000-0000-0000-000000000001', servico_id: 'b0000001-0000-0000-0000-000000000006' },
  { profissional_id: 'a0000001-0000-0000-0000-000000000001', servico_id: 'b0000001-0000-0000-0000-000000000013' },
  { profissional_id: 'a0000001-0000-0000-0000-000000000001', servico_id: 'b0000001-0000-0000-0000-000000000014' },
  { profissional_id: 'a0000001-0000-0000-0000-000000000001', servico_id: 'b0000001-0000-0000-0000-000000000023' },
  { profissional_id: 'a0000001-0000-0000-0000-000000000001', servico_id: 'b0000001-0000-0000-0000-000000000024' },

  // Equipe
  { profissional_id: 'a0000001-0000-0000-0000-000000000002', servico_id: 'b0000001-0000-0000-0000-000000000001' },
  { profissional_id: 'a0000001-0000-0000-0000-000000000002', servico_id: 'b0000001-0000-0000-0000-000000000003' },
  { profissional_id: 'a0000001-0000-0000-0000-000000000002', servico_id: 'b0000001-0000-0000-0000-000000000004' },
  { profissional_id: 'a0000001-0000-0000-0000-000000000002', servico_id: 'b0000001-0000-0000-0000-000000000005' },
  { profissional_id: 'a0000001-0000-0000-0000-000000000002', servico_id: 'b0000001-0000-0000-0000-000000000006' },
  { profissional_id: 'a0000001-0000-0000-0000-000000000002', servico_id: 'b0000001-0000-0000-0000-000000000009' },
  { profissional_id: 'a0000001-0000-0000-0000-000000000002', servico_id: 'b0000001-0000-0000-0000-000000000010' },
  { profissional_id: 'a0000001-0000-0000-0000-000000000002', servico_id: 'b0000001-0000-0000-0000-000000000011' },
  { profissional_id: 'a0000001-0000-0000-0000-000000000002', servico_id: 'b0000001-0000-0000-0000-000000000012' },
  { profissional_id: 'a0000001-0000-0000-0000-000000000002', servico_id: 'b0000001-0000-0000-0000-000000000013' },
  { profissional_id: 'a0000001-0000-0000-0000-000000000002', servico_id: 'b0000001-0000-0000-0000-000000000015' },
  { profissional_id: 'a0000001-0000-0000-0000-000000000002', servico_id: 'b0000001-0000-0000-0000-000000000016' },
  { profissional_id: 'a0000001-0000-0000-0000-000000000002', servico_id: 'b0000001-0000-0000-0000-000000000017' },
  { profissional_id: 'a0000001-0000-0000-0000-000000000002', servico_id: 'b0000001-0000-0000-0000-000000000018' },
  { profissional_id: 'a0000001-0000-0000-0000-000000000002', servico_id: 'b0000001-0000-0000-0000-000000000019' },
  { profissional_id: 'a0000001-0000-0000-0000-000000000002', servico_id: 'b0000001-0000-0000-0000-000000000020' },
  { profissional_id: 'a0000001-0000-0000-0000-000000000002', servico_id: 'b0000001-0000-0000-0000-000000000021' },
  { profissional_id: 'a0000001-0000-0000-0000-000000000002', servico_id: 'b0000001-0000-0000-0000-000000000022' },
];

export function updateMockProfissionalServicos(profissionalId: string, servicoIds: string[]) {
  // Remove antigos
  let i = MOCK_PROF_SERVICO.length;
  while (i--) {
    if (MOCK_PROF_SERVICO[i].profissional_id === profissionalId) {
      MOCK_PROF_SERVICO.splice(i, 1);
    }
  }
  // Adiciona novos
  servicoIds.forEach(servico_id => {
    MOCK_PROF_SERVICO.push({ profissional_id: profissionalId, servico_id });
  });
}

// ────────────────────────────────────────────
// CLIENTES
// ────────────────────────────────────────────
export const MOCK_CLIENTES: Cliente[] = [];

// ────────────────────────────────────────────
// AGENDAMENTOS
// ────────────────────────────────────────────
const hoje = new Date().toISOString().split('T')[0];
export const MOCK_AGENDAMENTOS: Agendamento[] = [];

// ────────────────────────────────────────────
// BLOQUEIOS DE AGENDA
// ────────────────────────────────────────────
export const MOCK_BLOQUEIOS: BloqueioAgenda[] = [];

// ────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────
export const STATUS_LABELS: Record<StatusAgendamento, string> = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  em_atendimento: 'Em Atendimento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
  no_show: 'No-Show',
};

export const STATUS_COLORS: Record<StatusAgendamento, string> = {
  pendente: '#F59E0B',
  confirmado: '#10B981',
  em_atendimento: '#3B82F6',
  concluido: '#0ea5e9',
  cancelado: '#EF4444',
  no_show: '#9333EA',
};

export function getClienteNome(id: string): string {
  return MOCK_CLIENTES.find(c => c.id === id)?.nome ?? 'Desconhecido';
}

export function getProfissionalNome(id: string): string {
  return MOCK_PROFISSIONAIS.find(p => p.id === id)?.nome ?? 'Desconhecido';
}

export function getServicoNome(id: string): string {
  return MOCK_SERVICOS.find(s => s.id === id)?.nome ?? 'Desconhecido';
}

export function getServicoPreco(id: string): number {
  return MOCK_SERVICOS.find(s => s.id === id)?.preco ?? 0;
}

export function getServicoDuracao(id: string): number {
  return MOCK_SERVICOS.find(s => s.id === id)?.duracao_min ?? 0;
}

/** Categorias únicas dos serviços ativos */
export function getCategorias(): string[] {
  return [...new Set(MOCK_SERVICOS.filter(s => s.ativo).map(s => s.categoria))];
}

/** Profissionais que executam um serviço */
export function getProfissionaisPorServico(servicoId: string): Profissional[] {
  const ids = MOCK_PROF_SERVICO.filter(ps => ps.servico_id === servicoId).map(ps => ps.profissional_id);
  return MOCK_PROFISSIONAIS.filter(p => ids.includes(p.id) && p.ativo);
}

// ────────────────────────────────────────────
// ADAPTER LAYER: fallback para Supabase real
// ────────────────────────────────────────────
// Estas funções tentam buscar dados do Supabase primeiro. Se falhar
// (credenciais não configuradas, tabelas não criadas, etc.),
// caem automaticamente no mock. Ideal para desenvolvimento incremental.

export async function getClientes(): Promise<Cliente[]> {
  const real = await fetchClientes();
  return real.length > 0 ? real : MOCK_CLIENTES;
}

export async function getProfissionais(): Promise<Profissional[]> {
  const real = await fetchProfissionais();
  return real.length > 0 ? real : MOCK_PROFISSIONAIS;
}

export async function getServicos(ativoOnly = false): Promise<Servico[]> {
  const real = await fetchServicos(ativoOnly);
  if (real.length > 0) return real;
  return ativoOnly ? MOCK_SERVICOS.filter(s => s.ativo) : MOCK_SERVICOS;
}

export async function getProfissionalServico(): Promise<ProfissionalServico[]> {
  const real = await fetchProfissionalServico();
  return real.length > 0 ? real : MOCK_PROF_SERVICO;
}

export async function getAgendamentos(filtro?: {
  data?: string;
  profissional_id?: string;
  status?: string;
}): Promise<Agendamento[]> {
  const real = await fetchAgendamentos(filtro);
  if (real.length > 0) return real;
  // Fallback mock com filtro básico
  let result = MOCK_AGENDAMENTOS;
  if (filtro?.data) result = result.filter(a => a.data === filtro.data);
  if (filtro?.profissional_id) result = result.filter(a => a.profissional_id === filtro.profissional_id);
  if (filtro?.status) result = result.filter(a => a.status === filtro.status);
  return result;
}

export async function getBloqueios(data?: string): Promise<BloqueioAgenda[]> {
  const real = await fetchBloqueios(data);
  if (real.length > 0) return real;
  // Fallback mock com filtro básico por data
  if (data) return MOCK_BLOQUEIOS.filter(b => b.data_inicio.startsWith(data));
  return MOCK_BLOQUEIOS;
}

// ────────────────────────────────────────────
// PLATAFORMA DE CURSOS (ÁREA DE MEMBROS - NETFLIX STYLE)
// ────────────────────────────────────────────

export interface Curso {
  id: string;
  titulo: string;
  descricao: string;
  professor: string;
  capaUrl: string;
  duracaoHoras: number;
  totalAulas: number;
  nivel: 'Iniciante' | 'Intermediário' | 'Avançado';
  tags: string[];
}

export interface Modulo {
  id: string;
  curso_id: string;
  titulo: string;
  ordem: number;
}

export interface Aula {
  id: string;
  modulo_id: string;
  titulo: string;
  ordem: number;
  duracaoMinutos: number;
  videoUrl: string;
  materiais?: { titulo: string; url: string; tipo: 'pdf' | 'link' }[];
  descricao: string;
}

export interface Progresso {
  aula_id: string;
  concluida: boolean;
  assistidoSegundos: number;
}

export const MOCK_CURSOS: Curso[] = [
  {
    id: 'course_1',
    titulo: 'Masterclass de Colorimetria',
    descricao: 'Aprenda os segredos da colorimetria capilar do absoluto zero ao avançado. Domine as misturas de cores e crie resultados incríveis.',
    professor: 'Agnaldo Gomes',
    capaUrl: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&q=80&w=600&h=400',
    duracaoHoras: 12,
    totalAulas: 24,
    nivel: 'Avançado',
    tags: ['Colorimetria', 'Cabelo', 'Técnica']
  },
  {
    id: 'course_2',
    titulo: 'Cortes Modernos 2026',
    descricao: 'As principais tendências de cortes curtos e médios. Técnicas de visagismo e finalização.',
    professor: 'Agnaldo Gomes',
    capaUrl: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?auto=format&fit=crop&q=80&w=600&h=400',
    duracaoHoras: 8,
    totalAulas: 16,
    nivel: 'Intermediário',
    tags: ['Corte', 'Tendência', 'Feminino']
  },
  {
    id: 'course_3',
    titulo: 'Gestão de Salão de Beleza',
    descricao: 'Como administrar seu salão, gerenciar clientes, profissionais e aumentar seu faturamento mensal.',
    professor: 'Agnaldo Gomes',
    capaUrl: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=600&h=400',
    duracaoHoras: 5,
    totalAulas: 10,
    nivel: 'Iniciante',
    tags: ['Negócios', 'Gestão', 'Vendas']
  }
];

export const MOCK_MODULOS: Modulo[] = [
  // Módulos Colorimetria
  { id: 'mod_1', curso_id: 'course_1', titulo: 'Fundamentos da Cor', ordem: 1 },
  { id: 'mod_2', curso_id: 'course_1', titulo: 'Estrela de Oswald', ordem: 2 },
  { id: 'mod_3', curso_id: 'course_1', titulo: 'Técnicas Avançadas', ordem: 3 },
  // Módulos Cortes
  { id: 'mod_4', curso_id: 'course_2', titulo: 'Visagismo', ordem: 1 },
  { id: 'mod_5', curso_id: 'course_2', titulo: 'Corte Bob e Pixie', ordem: 2 },
];

export const MOCK_AULAS: Aula[] = [
  // Aulas Modulo 1 (demonstração: player público do Vimeo)
  {
    id: 'aula_1', modulo_id: 'mod_1', titulo: 'O que é colorimetria?', ordem: 1, duracaoMinutos: 15,
    videoUrl: 'https://vimeo.com/347119375',
    descricao: 'Nesta aula vamos entender a ciência por trás das cores e como elas se comportam nos fios.',
    materiais: [{ titulo: 'Apostila Modulo 1 (PDF)', url: '#', tipo: 'pdf' }]
  },
  {
    id: 'aula_2', modulo_id: 'mod_1', titulo: 'Cores Primárias e Secundárias', ordem: 2, duracaoMinutos: 22,
    videoUrl: 'https://vimeo.com/76979871',
    descricao: 'A base da criação de qualquer cor.',
  },
  {
    id: 'aula_3', modulo_id: 'mod_1', titulo: 'Fundo de Clareamento', ordem: 3, duracaoMinutos: 30,
    videoUrl: 'https://vimeo.com/880821222',
    descricao: 'Entendendo a base do cabelo e os tons subjacentes.',
  },
  // Aulas Modulo 2
  {
    id: 'aula_4', modulo_id: 'mod_2', titulo: 'Neutralização de Cores Indesejadas', ordem: 1, duracaoMinutos: 28,
    videoUrl: 'https://vimeo.com/347119375',
    descricao: 'Como usar a estrela de Oswald para neutralizar tons alaranjados e amarelados.',
  },
  {
    id: 'aula_5', modulo_id: 'mod_2', titulo: 'Criando Cores Frias', ordem: 2, duracaoMinutos: 25,
    videoUrl: 'https://vimeo.com/76979871',
    descricao: 'Dicas práticas de coloração.',
  },
];

export const MOCK_PROGRESSO_ALUNO: Progresso[] = [
  { aula_id: 'aula_1', concluida: true, assistidoSegundos: 900 },
  { aula_id: 'aula_2', concluida: true, assistidoSegundos: 1320 },
  { aula_id: 'aula_3', concluida: false, assistidoSegundos: 450 }, // Parou na metade
];

// ────────────────────────────────────────────
// ADAPTERS ASSYNC PARA CURSOS (fallback automático)
// ────────────────────────────────────────────
export async function getCursos(): Promise<Curso[]> {
  const real = await fetchCursos();
  return real.length > 0 ? real : MOCK_CURSOS;
}

export async function getModulos(cursoId?: string): Promise<Modulo[]> {
  const real = await fetchModulos();
  if (real.length > 0) {
    return cursoId ? real.filter(m => m.curso_id === cursoId) : real;
  }
  const fallback = MOCK_MODULOS;
  return cursoId ? fallback.filter(m => m.curso_id === cursoId) : fallback;
}

export async function getAulas(moduloId?: string): Promise<Aula[]> {
  const real = await fetchAulas();
  if (real.length > 0) {
    return moduloId ? real.filter(a => a.modulo_id === moduloId) : real;
  }
  const fallback = MOCK_AULAS;
  return moduloId ? fallback.filter(a => a.modulo_id === moduloId) : fallback;
}

export async function getProgressoAluno(): Promise<Progresso[]> {
  const real = await fetchProgressoAluno();
  return real.length > 0 ? real : MOCK_PROGRESSO_ALUNO;
}

// ────────────────────────────────────────────
// FETCH REAL (Supabase) — cai em mock se não configurado
// O banco real usa o schema full: courses/modules/lessons/lesson_progress.
// Os mappers traduzem para os tipos do app (Curso/Modulo/Aula/Progresso).
// ────────────────────────────────────────────
type Row = Record<string, any>;

function mapCurso(r: Row): Curso {
  return {
    id: r.id,
    titulo: r.title ?? '',
    descricao: r.description ?? '',
    professor: 'Agnaldo Gomes',
    capaUrl: r.thumbnail_url ?? '',
    duracaoHoras: 0,
    totalAulas: 0,
    nivel: 'Iniciante',
    tags: [],
  };
}

function mapModulo(r: Row): Modulo {
  return {
    id: r.id,
    curso_id: r.course_id,
    titulo: r.title ?? '',
    ordem: r.order_index ?? 1,
  };
}

function mapAula(r: Row): Aula {
  return {
    id: r.id,
    modulo_id: r.module_id,
    titulo: r.title ?? '',
    ordem: r.order_index ?? 1,
    duracaoMinutos: r.duration_minutes ?? 0,
    videoUrl: r.video_url ?? '',
    descricao: '',
  };
}

function mapProgresso(r: Row): Progresso {
  return {
    aula_id: r.lesson_id,
    concluida: r.completed ?? false,
    assistidoSegundos: 0,
  };
}

async function fetchCursos(): Promise<Curso[]> {
  try {
    const { data, error } = await supabase.from('courses').select('*').order('title');
    if (error) return [];
    return (data || []).map(mapCurso);
  } catch { return []; }
}

async function fetchModulos(): Promise<Modulo[]> {
  try {
    const { data, error } = await supabase.from('modules').select('*').order('course_id, order_index');
    if (error) return [];
    return (data || []).map(mapModulo);
  } catch { return []; }
}

async function fetchAulas(): Promise<Aula[]> {
  try {
    const { data, error } = await supabase.from('lessons').select('*').order('module_id, order_index');
    if (error) return [];
    return (data || []).map(mapAula);
  } catch { return []; }
}

async function fetchProgressoAluno(): Promise<Progresso[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', user.id);
    if (error) return [];
    return (data || []).map(mapProgresso);
  } catch { return []; }
}

/**
 * Marca/desmarca uma aula como concluída para o aluno logado.
 * lesson_progress não tem constraint única — faz select→update|insert.
 */
export async function salvarProgressoAula(aulaId: string, concluida: boolean): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data: existente } = await supabase
      .from('lesson_progress')
      .select('id')
      .eq('user_id', user.id)
      .eq('lesson_id', aulaId)
      .maybeSingle();
    if (existente?.id) {
      const { error } = await supabase
        .from('lesson_progress')
        .update({ completed: concluida, completed_at: concluida ? new Date().toISOString() : null })
        .eq('id', existente.id);
      return !error;
    }
    const { error } = await supabase
      .from('lesson_progress')
      .insert({
        user_id: user.id,
        lesson_id: aulaId,
        completed: concluida,
        completed_at: concluida ? new Date().toISOString() : null,
      });
    return !error;
  } catch {
    return false;
  }
}
