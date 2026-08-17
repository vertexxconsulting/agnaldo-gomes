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
// SERVIÇOS
// ────────────────────────────────────────────
export const MOCK_SERVICOS: Servico[] = [
  { id: 's1', nome: 'Corte Feminino', categoria: 'Cabelo', duracao_min: 45, preco: 70, ativo: true, visivel_app: true },
  { id: 's2', nome: 'Corte Masculino', categoria: 'Cabelo', duracao_min: 30, preco: 50, ativo: true, visivel_app: true },
  { id: 's3', nome: 'Corte Infantil', categoria: 'Cabelo', duracao_min: 25, preco: 45, ativo: true, visivel_app: true },
  { id: 's4', nome: 'Coloração Completa', categoria: 'Coloração', duracao_min: 120, preco: 250, ativo: true, visivel_app: true },
  { id: 's5', nome: 'Mechas / Luzes', categoria: 'Coloração', duracao_min: 150, preco: 350, ativo: true, visivel_app: true },
  { id: 's6', nome: 'Morena Iluminada', categoria: 'Coloração', duracao_min: 180, preco: 320, ativo: true, visivel_app: true },
  { id: 's7', nome: 'Terapia Capilar', categoria: 'Tratamento', duracao_min: 60, preco: 120, ativo: true, visivel_app: true },
  { id: 's8', nome: 'Escova Progressiva', categoria: 'Tratamento', duracao_min: 90, preco: 180, ativo: true, visivel_app: true },
  { id: 's9', nome: 'Manicure', categoria: 'Unhas', duracao_min: 40, preco: 40, ativo: true, visivel_app: true },
  { id: 's10', nome: 'Pedicure', categoria: 'Unhas', duracao_min: 50, preco: 50, ativo: true, visivel_app: true },
  { id: 's11', nome: 'Design de Sobrancelhas', categoria: 'Estética', duracao_min: 30, preco: 35, ativo: true, visivel_app: true },
  { id: 's12', nome: 'Barba', categoria: 'Barbearia', duracao_min: 20, preco: 30, ativo: true, visivel_app: true },
];

// ────────────────────────────────────────────
// PROFISSIONAIS
// ────────────────────────────────────────────
export const MOCK_PROFISSIONAIS: Profissional[] = [
  {
    id: 'p1', nome: 'Agnaldo Gomes', foto_url: '/perfil.jpg',
    especialidades: ['Visagismo', 'Coloração', 'Corte'],
    ativo: true,
    jornada_semanal: { 1: { inicio: '09:00', fim: '19:00' }, 2: { inicio: '09:00', fim: '19:00' }, 3: { inicio: '09:00', fim: '19:00' }, 4: { inicio: '09:00', fim: '19:00' }, 5: { inicio: '09:00', fim: '19:00' }, 6: { inicio: '08:00', fim: '17:00' } },
    criado_em: '2024-01-01T00:00:00Z',
  },
  {
    id: 'p2', nome: 'Camila Ferreira', foto_url: null,
    especialidades: ['Coloração', 'Tratamento Capilar'],
    ativo: true,
    jornada_semanal: { 1: { inicio: '09:00', fim: '18:00' }, 2: { inicio: '09:00', fim: '18:00' }, 3: { inicio: '09:00', fim: '18:00' }, 4: { inicio: '09:00', fim: '18:00' }, 5: { inicio: '09:00', fim: '18:00' } },
    criado_em: '2024-03-10T00:00:00Z',
  },
  {
    id: 'p3', nome: 'Lucas Oliveira', foto_url: null,
    especialidades: ['Corte Masculino', 'Barba'],
    ativo: true,
    jornada_semanal: { 1: { inicio: '10:00', fim: '20:00' }, 2: { inicio: '10:00', fim: '20:00' }, 3: { inicio: '10:00', fim: '20:00' }, 4: { inicio: '10:00', fim: '20:00' }, 5: { inicio: '10:00', fim: '20:00' }, 6: { inicio: '09:00', fim: '16:00' } },
    criado_em: '2024-05-20T00:00:00Z',
  },
  {
    id: 'p4', nome: 'Juliana Santos', foto_url: null,
    especialidades: ['Unhas', 'Estética'],
    ativo: true,
    jornada_semanal: { 1: { inicio: '08:00', fim: '17:00' }, 2: { inicio: '08:00', fim: '17:00' }, 3: { inicio: '08:00', fim: '17:00' }, 4: { inicio: '08:00', fim: '17:00' }, 5: { inicio: '08:00', fim: '17:00' } },
    criado_em: '2024-06-01T00:00:00Z',
  },
];

// ────────────────────────────────────────────
// VÍNCULO PROFISSIONAL ↔ SERVIÇO
// ────────────────────────────────────────────
export const MOCK_PROF_SERVICO: ProfissionalServico[] = [
  // Agnaldo: cortes + coloração + tratamento
  { profissional_id: 'p1', servico_id: 's1' }, { profissional_id: 'p1', servico_id: 's2' },
  { profissional_id: 'p1', servico_id: 's4' }, { profissional_id: 'p1', servico_id: 's5' },
  { profissional_id: 'p1', servico_id: 's6' }, { profissional_id: 'p1', servico_id: 's7' },
  // Camila: coloração + tratamento
  { profissional_id: 'p2', servico_id: 's4' }, { profissional_id: 'p2', servico_id: 's5' },
  { profissional_id: 'p2', servico_id: 's6' }, { profissional_id: 'p2', servico_id: 's7' },
  { profissional_id: 'p2', servico_id: 's8' },
  // Lucas: corte masc + barba
  { profissional_id: 'p3', servico_id: 's2' }, { profissional_id: 'p3', servico_id: 's3' },
  { profissional_id: 'p3', servico_id: 's12' },
  // Juliana: unhas + estética
  { profissional_id: 'p4', servico_id: 's9' }, { profissional_id: 'p4', servico_id: 's10' },
  { profissional_id: 'p4', servico_id: 's11' },
];

// ────────────────────────────────────────────
// CLIENTES
// ────────────────────────────────────────────
export const MOCK_CLIENTES: Cliente[] = [
  { id: 'c1', nome: 'Maria Silva', telefone: '42998112233', email: 'maria@email.com', nascimento: '1988-03-22', observacoes: 'Alergia a amônia', criado_em: '2024-06-15T10:00:00Z' },
  { id: 'c2', nome: 'João Pereira', telefone: '42999441100', email: 'joao@email.com', nascimento: '1995-11-10', criado_em: '2024-07-01T14:00:00Z' },
  { id: 'c3', nome: 'Ana Costa', telefone: '42997778899', email: 'ana@email.com', nascimento: '1992-08-05', criado_em: '2024-07-20T09:00:00Z' },
  { id: 'c4', nome: 'Carlos Souza', telefone: '42996665544', email: 'carlos@email.com', nascimento: '1985-01-30', criado_em: '2024-08-10T11:00:00Z' },
  { id: 'c5', nome: 'Beatriz Lima', telefone: '42995553322', email: 'bia@email.com', nascimento: '2000-12-18', observacoes: 'Prefere Camila para coloração', criado_em: '2024-09-05T16:00:00Z' },
  { id: 'c6', nome: 'Fernanda Alves', telefone: '42993332211', email: 'fe@email.com', nascimento: '1990-06-27', criado_em: '2024-10-12T13:00:00Z' },
];

// ────────────────────────────────────────────
// AGENDAMENTOS
// ────────────────────────────────────────────
const hoje = new Date().toISOString().split('T')[0];
export const MOCK_AGENDAMENTOS: Agendamento[] = [
  { id: 'ag1', cliente_id: 'c1', profissional_id: 'p1', servico_id: 's5', data: hoje, hora_inicio: '09:00', hora_fim: '11:30', status: 'confirmado', canal: 'online', criado_em: '2026-08-01T10:00:00Z' },
  { id: 'ag2', cliente_id: 'c2', profissional_id: 'p3', servico_id: 's2', data: hoje, hora_inicio: '10:00', hora_fim: '10:30', status: 'em_atendimento', canal: 'recepcao', criado_em: '2026-08-02T14:00:00Z' },
  { id: 'ag3', cliente_id: 'c3', profissional_id: 'p2', servico_id: 's6', data: hoje, hora_inicio: '14:00', hora_fim: '17:00', status: 'pendente', canal: 'online', criado_em: '2026-08-03T16:00:00Z' },
  { id: 'ag4', cliente_id: 'c4', profissional_id: 'p3', servico_id: 's12', data: hoje, hora_inicio: '11:00', hora_fim: '11:20', status: 'concluido', canal: 'recepcao', criado_em: '2026-08-04T09:00:00Z' },
  { id: 'ag5', cliente_id: 'c5', profissional_id: 'p2', servico_id: 's7', data: hoje, hora_inicio: '09:00', hora_fim: '10:00', status: 'concluido', canal: 'online', criado_em: '2026-08-05T11:00:00Z' },
  { id: 'ag6', cliente_id: 'c6', profissional_id: 'p4', servico_id: 's9', data: hoje, hora_inicio: '08:00', hora_fim: '08:40', status: 'cancelado', canal: 'online', criado_em: '2026-08-06T08:00:00Z' },
  { id: 'ag7', cliente_id: 'c1', profissional_id: 'p1', servico_id: 's1', data: '2026-07-20', hora_inicio: '10:00', hora_fim: '10:45', status: 'concluido', canal: 'recepcao', criado_em: '2026-07-20T10:00:00Z' },
  { id: 'ag8', cliente_id: 'c3', profissional_id: 'p1', servico_id: 's4', data: '2026-07-15', hora_inicio: '14:00', hora_fim: '16:00', status: 'concluido', canal: 'online', criado_em: '2026-07-15T14:00:00Z' },
  { id: 'ag9', cliente_id: 'c2', profissional_id: 'p3', servico_id: 's2', data: '2026-07-10', hora_inicio: '15:00', hora_fim: '15:30', status: 'no_show', canal: 'online', criado_em: '2026-07-10T15:00:00Z' },
];

// ────────────────────────────────────────────
// BLOQUEIOS DE AGENDA
// ────────────────────────────────────────────
export const MOCK_BLOQUEIOS: BloqueioAgenda[] = [
  { id: 'b1', profissional_id: 'p1', data_inicio: `${hoje}T12:00`, data_fim: `${hoje}T13:00`, motivo: 'Almoço', criado_em: hoje },
  { id: 'b2', profissional_id: 'p2', data_inicio: `${hoje}T12:00`, data_fim: `${hoje}T13:30`, motivo: 'Almoço', criado_em: hoje },
  { id: 'b3', profissional_id: 'p3', data_inicio: `${hoje}T12:30`, data_fim: `${hoje}T13:30`, motivo: 'Almoço', criado_em: hoje },
];

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
  const fallback = ativoOnly ? MOCK_SERVICOS.filter(s => s.ativo) : MOCK_SERVICOS;
  return real.length > 0 ? real : fallback;
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
  // Aulas Modulo 1
  {
    id: 'aula_1', modulo_id: 'mod_1', titulo: 'O que é colorimetria?', ordem: 1, duracaoMinutos: 15,
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    descricao: 'Nesta aula vamos entender a ciência por trás das cores e como elas se comportam nos fios.',
    materiais: [{ titulo: 'Apostila Modulo 1 (PDF)', url: '#', tipo: 'pdf' }]
  },
  {
    id: 'aula_2', modulo_id: 'mod_1', titulo: 'Cores Primárias e Secundárias', ordem: 2, duracaoMinutos: 22,
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    descricao: 'A base da criação de qualquer cor.',
  },
  {
    id: 'aula_3', modulo_id: 'mod_1', titulo: 'Fundo de Clareamento', ordem: 3, duracaoMinutos: 30,
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    descricao: 'Entendendo a base do cabelo e os tons subjacentes.',
  },
  // Aulas Modulo 2
  {
    id: 'aula_4', modulo_id: 'mod_2', titulo: 'Neutralização de Cores Indesejadas', ordem: 1, duracaoMinutos: 28,
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    descricao: 'Como usar a estrela de Oswald para neutralizar tons alaranjados e amarelados.',
  },
  {
    id: 'aula_5', modulo_id: 'mod_2', titulo: 'Criando Cores Frias', ordem: 2, duracaoMinutos: 25,
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
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
// ────────────────────────────────────────────
async function fetchCursos(): Promise<Curso[]> {
  try {
    const { data, error } = await supabase.from('cursos').select('*').order('titulo');
    if (error) return [];
    return data || [];
  } catch { return []; }
}

async function fetchModulos(): Promise<Modulo[]> {
  try {
    const { data, error } = await supabase.from('modulos').select('*').order('curso_id, ordem');
    if (error) return [];
    return data || [];
  } catch { return []; }
}

async function fetchAulas(): Promise<Aula[]> {
  try {
    const { data, error } = await supabase.from('aulas').select('*').order('modulo_id, ordem');
    if (error) return [];
    return data || [];
  } catch { return []; }
}

async function fetchProgressoAluno(): Promise<Progresso[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('progresso_aluno')
      .select('*')
      .eq('user_id', user.id);
    if (error) return [];
    return data || [];
  } catch { return []; }
}
