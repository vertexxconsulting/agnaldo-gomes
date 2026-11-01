'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { SectionTitle } from '@/components/SectionTitle';
import { ReadOnlyNotice } from '@/components/ReadOnlyNotice';
import { useModulePermission } from '@/lib/use-module-permission';
import { CardGlass } from '@/components/CardGlass';
import { Button } from '@/components/Button';
import { ViewToggle } from '@/components/ViewToggle';
import { ProductSearchSelect } from '@/components/ProductSearchSelect';
import { fetchAgendamentos, fetchProfissionais, fetchBloqueios, fetchClientes, fetchServicos, fetchProfissionalServico, fetchEstoque, fetchTodosServicoProdutos, registrarMovimentacao, criarComissao, criarComissoesAtendimentoCompartilhado, fetchItensComanda, fetchTaxasPagamento, calcularTaxaMaquininha, finalizarRecebimentoAgendamento, fetchRegrasComissao, salvarInsumoTempoRealProcedimento, removerInsumoTempoRealProcedimento, editarInsumoTempoRealProcedimento } from '@/lib/supabase-queries';
import {
  STATUS_LABELS, STATUS_COLORS, getServicoDuracao, getServicoPreco,
  getClienteNome, getServicoNome, getProfissionalNome
} from '@/lib/mock-data';
import type { Agendamento, BloqueioAgenda, StatusAgendamento, Cliente, Servico, ProfissionalServico, ProdutoEstoque, ServicoProduto, InsumoAtendimento, FormaPagamento, PaymentFee, RegraComissao, ProcedimentoComanda, ComandaMultiProfissional } from '@/lib/gestao-types';
import type { Profissional } from '@/lib/gestao-types';
import { CalendarDays, Clock, User2, Users, Check, X, CheckCircle2, AlertCircle, AlertTriangle, Sparkles, Beaker, CreditCard, Banknote, Smartphone, ShoppingBag, Search, UserPlus, Phone, Percent, Tag, Trash2, Plus, Pencil, Scale, DollarSign, Bell, RefreshCw, Scissors, LayoutGrid, Columns3 } from 'lucide-react';
import { toast } from 'sonner';
import { obterHorariosSalao, DEFAULT_HORARIOS_SALAO } from '@/lib/ia-config';
import { supabase } from '@/lib/supabase';
import { ROLES, getUserRole, isOwner } from '@/lib/auth';

/**
 * Cores por segmento de fluxo da Agenda (definidas por processo):
 * - Agendado (pendente): Fundo branco clean com borda neutra suave
 * - Pra ser atendido (confirmado): Amarelo pastel suave com texto de alto contraste
 * - Em atendimento (em_atendimento): Verde menta pastel suave com texto nítido
 * - Finalizou e vai para pagamento (concluido): Azul pastel suave com texto nítido
 */
export interface EstiloProcessoAgenda {
  label: string;
  barColor: string;
  dotColor: string;
  cardClass: string;
  ongoingClass: string;
  badgeClass: string;
  servicoClass: string;
  textCliente: string;
  textHora: string;
}

const CORES_PROCESSO_AGENDA: Record<StatusAgendamento, EstiloProcessoAgenda> = {
  pendente: {
    label: 'Agendado',
    barColor: '#94a3b8',
    dotColor: '#64748b',
    cardClass: 'bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 shadow-xs',
    ongoingClass: 'bg-slate-50/90 dark:bg-zinc-900/60 border-slate-300 dark:border-zinc-800',
    badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700',
    servicoClass: 'text-slate-600 dark:text-slate-400',
    textCliente: 'text-slate-900 dark:text-slate-100',
    textHora: 'text-slate-500 dark:text-slate-400',
  },
  confirmado: {
    label: 'Pra Atender',
    barColor: '#eab308',
    dotColor: '#ca8a04',
    cardClass: 'bg-[#fefce8] dark:bg-amber-950/25 border-amber-300/80 dark:border-amber-600/40 shadow-xs',
    ongoingClass: 'bg-[#fefce8]/70 dark:bg-amber-950/15 border-amber-300/60 dark:border-amber-700/30',
    badgeClass: 'bg-amber-100 dark:bg-amber-900/50 text-amber-950 dark:text-amber-200 border-amber-300/80 dark:border-amber-600/50',
    servicoClass: 'text-amber-800 dark:text-amber-300',
    textCliente: 'text-slate-900 dark:text-slate-100',
    textHora: 'text-amber-800/80 dark:text-amber-300/80',
  },
  em_atendimento: {
    label: 'Em Atendimento',
    barColor: '#10b981',
    dotColor: '#059669',
    cardClass: 'bg-[#f0fdf4] dark:bg-emerald-950/25 border-emerald-300/80 dark:border-emerald-600/40 shadow-xs',
    ongoingClass: 'bg-[#f0fdf4]/70 dark:bg-emerald-950/15 border-emerald-300/60 dark:border-emerald-700/30',
    badgeClass: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-950 dark:text-emerald-200 border-emerald-300/80 dark:border-emerald-600/50',
    servicoClass: 'text-emerald-800 dark:text-emerald-300',
    textCliente: 'text-slate-900 dark:text-slate-100',
    textHora: 'text-emerald-800/80 dark:text-emerald-300/80',
  },
  concluido: {
    label: 'Pagamento',
    barColor: '#3b82f6',
    dotColor: '#2563eb',
    cardClass: 'bg-[#eff6ff] dark:bg-blue-950/25 border-blue-300/80 dark:border-blue-600/40 shadow-xs',
    ongoingClass: 'bg-[#eff6ff]/70 dark:bg-blue-950/15 border-blue-300/60 dark:border-blue-700/30',
    badgeClass: 'bg-blue-100 dark:bg-blue-900/50 text-blue-950 dark:text-blue-200 border-blue-300/80 dark:border-blue-600/50',
    servicoClass: 'text-blue-800 dark:text-blue-300',
    textCliente: 'text-slate-900 dark:text-slate-100',
    textHora: 'text-blue-800/80 dark:text-blue-300/80',
  },
  cancelado: {
    label: 'Cancelado',
    barColor: '#ef4444',
    dotColor: '#dc2626',
    cardClass: 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30 opacity-75',
    ongoingClass: 'bg-red-50/30 dark:bg-red-950/10 border-red-200/50 dark:border-red-900/20 opacity-60',
    badgeClass: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800',
    servicoClass: 'text-red-700/80 dark:text-red-400',
    textCliente: 'text-slate-500 line-through',
    textHora: 'text-slate-400 font-mono',
  },
  no_show: {
    label: 'No-Show',
    barColor: '#a855f7',
    dotColor: '#9333ea',
    cardClass: 'bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/30 opacity-75',
    ongoingClass: 'bg-purple-50/30 dark:bg-purple-950/10 border-purple-200/50 dark:border-purple-900/20 opacity-60',
    badgeClass: 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    servicoClass: 'text-purple-700/80 dark:text-purple-400',
    textCliente: 'text-slate-500 line-through',
    textHora: 'text-slate-400 font-mono',
  },
};

function getEstiloProcesso(status?: StatusAgendamento): EstiloProcessoAgenda {
  if (status && CORES_PROCESSO_AGENDA[status]) {
    return CORES_PROCESSO_AGENDA[status];
  }
  return CORES_PROCESSO_AGENDA.pendente;
}

/**
 * Container com rolagem horizontal por "clicar, segurar e arrastar".
 * Usa `overflow-x: clip` + translateX (em vez de um container rolável) para que
 * elementos `sticky` internos (cabeçalhos dos profissionais) grudem na rolagem
 * vertical da página.
 */
function DragScrollX({ className = '', children }: { className?: string; children: React.ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const offset = useRef(0);
  const state = useRef({ down: false, pointerId: -1, startX: 0, startOffset: 0, moved: false });
  const [dragging, setDragging] = useState(false);

  const applyOffset = (value: number) => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const max = Math.max(0, inner.scrollWidth - outer.clientWidth);
    offset.current = Math.min(max, Math.max(0, value));
    inner.style.transform = `translateX(${-offset.current}px)`;
  };

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    // Reajusta o limite quando a tela/conteúdo muda de tamanho
    const ro = new ResizeObserver(() => applyOffset(offset.current));
    ro.observe(outer);
    ro.observe(inner);

    // Suporte a swipe horizontal no trackpad / Shift + roda do mouse
    const onWheel = (e: WheelEvent) => {
      const dx = e.shiftKey && e.deltaX === 0 ? e.deltaY : e.deltaX;
      if (Math.abs(dx) <= Math.abs(e.shiftKey ? 0 : e.deltaY)) return;
      const before = offset.current;
      applyOffset(before + dx);
      if (offset.current !== before) e.preventDefault();
    };
    outer.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      ro.disconnect();
      outer.removeEventListener('wheel', onWheel);
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"]')) return;
    state.current = { down: true, pointerId: e.pointerId, startX: e.clientX, startOffset: offset.current, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = state.current;
    if (!s.down || e.pointerId !== s.pointerId) return;
    const dx = e.clientX - s.startX;
    if (!s.moved && Math.abs(dx) > 5) {
      s.moved = true;
      setDragging(true);
      outerRef.current?.setPointerCapture(e.pointerId);
    }
    if (s.moved) applyOffset(s.startOffset - dx);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = state.current;
    if (!s.down || e.pointerId !== s.pointerId) return;
    s.down = false;
    if (outerRef.current?.hasPointerCapture(e.pointerId)) outerRef.current.releasePointerCapture(e.pointerId);
    setDragging(false);
  };

  // Evita que soltar o mouse após arrastar dispare o clique de um card/botão
  const onClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (state.current.moved) {
      e.stopPropagation();
      e.preventDefault();
      state.current.moved = false;
    }
  };

  return (
    <div
      ref={outerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClickCapture={onClickCapture}
      onDragStart={(e) => e.preventDefault()}
      style={{ overflowX: 'clip', touchAction: 'pan-y' }}
      className={`${dragging ? 'cursor-grabbing select-none' : 'cursor-grab'} ${className}`}
    >
      <div ref={innerRef} className="w-max min-w-full will-change-transform">
        {children}
      </div>
    </div>
  );
}

function formatPhone(val: string) {
  if (!val) return '';
  const clean = val.replace(/\D/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (clean.length === 10) {
    return clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return val;
}

function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.slice(0, 5).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesToTime(totalMins: number): string {
  const h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getAgendamentoHoraFim(a: Agendamento, servicosList: Servico[]): string {
  if (a.hora_fim && timeToMinutes(a.hora_fim) > timeToMinutes(a.hora_inicio)) {
    return a.hora_fim.slice(0, 5);
  }
  const mainServ = servicosList.find(s => s.id === a.servico_id);
  const durPrincipal = mainServ?.duracao_min ?? 30;
  const durSub = (a.sub_servicos || []).reduce((acc, sub) => {
    const sId = typeof sub === 'string' ? sub : sub?.id;
    const sObj = servicosList.find(s => s.id === sId);
    return acc + (sObj?.duracao_min ?? 0);
  }, 0);
  const totalMins = timeToMinutes(a.hora_inicio) + durPrincipal + durSub;
  return minutesToTime(totalMins);
}

const DIAS_CHAVE = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

function getCategoriaProfissional(p: Profissional): 'Cabelo' | 'Unhas' | string {
  if (p.categoria) {
    const catNorm = p.categoria.trim().toLowerCase();
    if (catNorm.includes('unha') || catNorm.includes('manicure') || catNorm.includes('pedic')) return 'Unhas';
    if (catNorm.includes('cabelo') || catNorm.includes('capilar')) return 'Cabelo';
    return p.categoria;
  }
  // Fallback por especialidades se a coluna ainda não estiver populada
  if (p.especialidades && p.especialidades.length > 0) {
    const tags = p.especialidades.map(e => e.toLowerCase()).join(' ');
    if (tags.includes('unha') || tags.includes('manicure') || tags.includes('pedicure') || tags.includes('esmalte') || tags.includes('podolog')) {
      return 'Unhas';
    }
  }
  // Fallback por nome
  const nomeLower = (p.nome || '').toLowerCase();
  if (nomeLower.includes('unha') || nomeLower.includes('manicure') || nomeLower.includes('camila')) {
    return 'Unhas';
  }
  return 'Cabelo';
}

function AgendaContent() {
  const { isReadOnly } = useModulePermission('agenda');
  const searchParams = useSearchParams();
  const hoje = new Date().toISOString().split('T')[0];
  const [dataSelecionada, setDataSelecionada] = useState(searchParams.get('date') || hoje);
  const [profFiltro, setProfFiltro] = useState<string>('todos');
  const [categoriaFiltro, setCategoriaFiltro] = useState<'todas' | 'Cabelo' | 'Unhas' | string>('todas');
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [bloqueiosDia, setBloqueiosDia] = useState<BloqueioAgenda[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [meuProfissional, setMeuProfissional] = useState<Profissional | null>(null);
  const [isRestrictedProfissional, setIsRestrictedProfissional] = useState(false);
  const [isAuxiliarCabelo, setIsAuxiliarCabelo] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [profServicos, setProfServicos] = useState<ProfissionalServico[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<string>('dia');
  const [densidade, setDensidade] = useState<'compacta' | 'expandida'>('expandida');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('agenda_densidade_cards');
      if (saved === 'expandida' || saved === 'compacta') {
        setDensidade(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleMudarDensidade = (novaDensidade: 'compacta' | 'expandida') => {
    setDensidade(novaDensidade);
    try {
      localStorage.setItem('agenda_densidade_cards', novaDensidade);
    } catch {
      // ignore
    }
  };
  const [showForm, setShowForm] = useState(false);
  const [disparandoLembretes, setDisparandoLembretes] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<Agendamento | null>(null);

  // Cancelamento com escopo (dia atual vs futuros / exclusao de futuros)
  const [apptParaCancelar, setApptParaCancelar] = useState<Agendamento | null>(null);
  const [futurosCliente, setFuturosCliente] = useState<{ loading: boolean; lista: any[] }>({ loading: false, lista: [] });
  const [modoCancelamento, setModoCancelamento] = useState<'apenas_dia' | 'cancelar_futuros' | 'excluir_futuros'>('apenas_dia');
  const [excluirDiaAtual, setExcluirDiaAtual] = useState(false);
  const [processandoCancelamento, setProcessandoCancelamento] = useState(false);
  const [editingApptId, setEditingApptId] = useState<string | null>(null);

  const calcularDuracaoTotal = (servicoId: string, subServicos: any[]): number => {
    const mainServ = servicos.find(s => s.id === servicoId);
    const durPrincipal = mainServ?.duracao_min ?? 60;
    const durSub = (subServicos || []).reduce((acc, sub) => {
      const sId = typeof sub === 'string' ? sub : sub?.id;
      const sObj = servicos.find(s => s.id === sId);
      return acc + (sObj?.duracao_min ?? 0);
    }, 0);
    return durPrincipal + durSub;
  };
  
  // Checkout / Recebimento
  const [checkoutAppt, setCheckoutAppt] = useState<Agendamento | null>(null);
  const [checkoutExtras, setCheckoutExtras] = useState<Array<{ id: string; servicoId: string; preco: number }>>([]);
  const [extraServiceSelect, setExtraServiceSelect] = useState<string>('');

  // Comanda Multi-Profissional da Cliente (procedimentos individuais por profissional com seus descontos)
  const [checkoutProcedimentos, setCheckoutProcedimentos] = useState<ProcedimentoComanda[]>([]);
  const [agendamentosUnificadosIds, setAgendamentosUnificadosIds] = useState<string[]>([]);
  const [novoProcServicoId, setNovoProcServicoId] = useState<string>('');
  const [novoProcProfId, setNovoProcProfId] = useState<string>('');
  // Insumos (pesagem por grama / ml)
  const [estoque, setEstoque] = useState<ProdutoEstoque[]>([]);
  const [servicoProdutos, setServicoProdutos] = useState<ServicoProduto[]>([]);
  const [checkoutInsumos, setCheckoutInsumos] = useState<InsumoAtendimento[]>([]);
  const [insumoEtapa, setInsumoEtapa] = useState<string>('Mechas - Descoloração');
  const [insumoProfissionalId, setInsumoProfissionalId] = useState<string>('');
  const [insumoNovoProdutoId, setInsumoNovoProdutoId] = useState<string>('');
  const [insumoNovoQtdG, setInsumoNovoQtdG] = useState<string>('');

  // Lançamento de Insumos em Tempo Real (Durante o Atendimento por Titular ou Auxiliar)
  const [liveInsumoAppt, setLiveInsumoAppt] = useState<Agendamento | null>(null);
  const [liveInsumoEtapa, setLiveInsumoEtapa] = useState<string>('Etapa 1 - Descoloração / Mechas');
  const [liveInsumoEtapaCustom, setLiveInsumoEtapaCustom] = useState<string>('');
  const [liveInsumoProfId, setLiveInsumoProfId] = useState<string>('');
  const [liveInsumoProdId, setLiveInsumoProdId] = useState<string>('');
  const [liveInsumoQtd, setLiveInsumoQtd] = useState<string>('');
  const [liveInsumoLoading, setLiveInsumoLoading] = useState<boolean>(false);
  const [editingInsumoIndex, setEditingInsumoIndex] = useState<number | null>(null);
  const [isGestoraOuAdmin, setIsGestoraOuAdmin] = useState<boolean>(false);
  const [isSecretaria, setIsSecretaria] = useState<boolean>(false);

  // Rateio / Split de comissões da equipe
  const [splitComissaoCustom, setSplitComissaoCustom] = useState<Record<string, number>>({});
  const [regrasComissao, setRegrasComissao] = useState<RegraComissao[]>([]);

  const [checkoutProdutos, setCheckoutProdutos] = useState<Array<{ 
    id: string; 
    inventory_id: string; 
    qty: number; 
    precoOriginal: number;
    preco: number; 
    descontoPct?: number; 
    descontoValor?: number; 
  }>>([]);
  // Pagamento e comissão
  const [checkoutPagamento, setCheckoutPagamento] = useState<FormaPagamento>('DINHEIRO');
  const [checkoutParcelas, setCheckoutParcelas] = useState<number>(1);
  const [taxasPagamento, setTaxasPagamento] = useState<PaymentFee[]>([]);

  // Desconto no Atendimento (com ajuste sincronizado entre % e R$)
  const [checkoutDescontoPct, setCheckoutDescontoPct] = useState<string>('');
  const [checkoutDescontoValor, setCheckoutDescontoValor] = useState<string>('');
  const [checkoutValorFinalManual, setCheckoutValorFinalManual] = useState<string>('');
  const [checkoutDescontoMotivo, setCheckoutDescontoMotivo] = useState<string>('');

  // Adicionar Produto de Salão no Checkout
  const [checkoutNovoProdId, setCheckoutNovoProdId] = useState<string>('');
  const [checkoutNovoProdQty, setCheckoutNovoProdQty] = useState<string>('1');
  const [checkoutNovoProdDescPct, setCheckoutNovoProdDescPct] = useState<string>('');
  const [checkoutNovoProdDescValor, setCheckoutNovoProdDescValor] = useState<string>('');

  const [formData, setFormData] = useState({
    cliente_id: '',
    profissional_id: '',
    servico_id: '',
    sub_servicos: [] as any[],
    auxiliares_ids: [] as string[],
    data: hoje,
    hora_inicio: '09:00',
    duracao_min: '',
    is_fixed: false,
    recurrence_type: 'WEEKLY',
    recurrence_custom_day: '',
    allow_overlap: false,
    replicate_to_future: false,
  });

  // Busca e filtro de clientes no modal de agendamento
  const [buscaCliente, setBuscaCliente] = useState('');
  const [clienteDropdownAberto, setClienteDropdownAberto] = useState(false);
  const [cadastrandoNovoCliente, setCadastrandoNovoCliente] = useState(false);
  const [novoClienteNome, setNovoClienteNome] = useState('');
  const [novoClienteTelefone, setNovoClienteTelefone] = useState('');
  const [salvandoNovoCliente, setSalvandoNovoCliente] = useState(false);
  const clienteSearchContainerRef = useRef<HTMLDivElement>(null);

  // Busca de cliente na visualização da Agenda
  const [buscaClienteAgenda, setBuscaClienteAgenda] = useState('');

  // Fechar dropdown de clientes ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (clienteSearchContainerRef.current && !clienteSearchContainerRef.current.contains(event.target as Node)) {
        setClienteDropdownAberto(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const clienteSelecionado = useMemo(() => {
    return clientes.find(c => c.id === formData.cliente_id) || null;
  }, [clientes, formData.cliente_id]);

  const clientesFiltradosModal = useMemo(() => {
    const termo = buscaCliente.toLowerCase().trim();
    const termoApenasDigitos = termo.replace(/\D/g, '');

    if (!termo) {
      return [...clientes].sort((a, b) => (a.nome || '').localeCompare(b.nome || '')).slice(0, 20);
    }

    return clientes
      .filter(c => {
        const nomeMatch = (c.nome || '').toLowerCase().includes(termo);
        const emailMatch = (c.email || '').toLowerCase().includes(termo);
        const foneMatch = termoApenasDigitos
          ? (c.telefone || '').replace(/\D/g, '').includes(termoApenasDigitos)
          : (c.telefone || '').includes(termo);
        const codigoMatch = c.codigo ? String(c.codigo).includes(termo) : false;
        return nomeMatch || emailMatch || foneMatch || codigoMatch;
      })
      .sort((a, b) => {
        const aStarts = (a.nome || '').toLowerCase().startsWith(termo);
        const bStarts = (b.nome || '').toLowerCase().startsWith(termo);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return (a.nome || '').localeCompare(b.nome || '');
      })
      .slice(0, 30);
  }, [clientes, buscaCliente]);

  const handleSalvarNovoClienteRapido = async () => {
    const nome = novoClienteNome.trim();
    const telefone = novoClienteTelefone.trim();
    if (!nome || !telefone) {
      alert('Nome e Telefone são obrigatórios.');
      return;
    }

    setSalvandoNovoCliente(true);
    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, telefone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar cliente');

      const savedCliente: Cliente = data.cliente ? {
        id: data.cliente.id,
        codigo: data.cliente.codigo,
        nome: data.cliente.nome || data.cliente.name || nome,
        telefone: data.cliente.telefone || data.cliente.phone || telefone,
        email: data.cliente.email,
        cpf: data.cliente.cpf,
        endereco: data.cliente.endereco || data.cliente.address,
        nascimento: data.cliente.nascimento || data.cliente.birth_date,
        observacoes: data.cliente.observacoes || data.cliente.notes,
        criado_em: data.cliente.created_at || new Date().toISOString(),
      } : {
        id: `c_${Date.now()}`,
        nome,
        telefone,
        criado_em: new Date().toISOString(),
      };

      setClientes(prev => [savedCliente, ...prev]);
      setFormData(f => ({ ...f, cliente_id: savedCliente.id }));
      setCadastrandoNovoCliente(false);
      setNovoClienteNome('');
      setNovoClienteTelefone('');
      setBuscaCliente('');
      setClienteDropdownAberto(false);
    } catch (err: any) {
      console.error('Erro ao cadastrar cliente rápido:', err);
      alert(`Erro ao cadastrar cliente: ${err.message}`);
    } finally {
      setSalvandoNovoCliente(false);
    }
  };

  // Carregar dados do Supabase (com fallback para mock)
  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      
      const urlParams = new URLSearchParams(window.location.search);
      const agendamentoIdConfirmar = urlParams.get('confirmar');
      const agendamentoIdCancelar = urlParams.get('cancelar');

      if (agendamentoIdConfirmar) {
        await mudarStatus(agendamentoIdConfirmar, 'confirmado');
        window.history.replaceState({}, '', window.location.pathname);
      } else if (agendamentoIdCancelar) {
        await mudarStatus(agendamentoIdCancelar, 'cancelado');
        window.history.replaceState({}, '', window.location.pathname);
      }

      const [
        agendamentosData, 
        bloqueiosData, 
        profissionaisData, 
        clientesData, 
        servicosData, 
        profServData,
        estoqueData, 
        spData, 
        taxasData,
        regrasData
      ] = await Promise.all([
        fetchAgendamentos(),
        fetchBloqueios(),
        fetchProfissionais(),
        fetchClientes(),
        fetchServicos(),
        fetchProfissionalServico(),
        fetchEstoque(true),
        fetchTodosServicoProdutos(),
        fetchTaxasPagamento(),
        fetchRegrasComissao()
      ]);
      setClientes(clientesData);
      setServicos(servicosData);
      setProfServicos(profServData);
      setEstoque(estoqueData);
      setServicoProdutos(spData);
      setTaxasPagamento(taxasData.taxas);
      setRegrasComissao(regrasData);

      // Identificar o papel do usuário logado (ex: Agnaldo = Admin vê todos; Edinaldo/Elen/Erica/Walison = vê apenas a si mesmo)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser(user);
          const role = getUserRole(user);
          const owner = isOwner(user);
          const userMeta = (user.user_metadata || {}) as Record<string, any>;

          const { data: profProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          const effectiveRole = profProfile?.role || role;
          const isGestoraOrAdminUser = owner ||
            effectiveRole === ROLES.ADMIN ||
            effectiveRole === ROLES.STUDIO_ADMIN ||
            userMeta?.role === 'admin' ||
            userMeta?.isOwner === true;
          setIsGestoraOuAdmin(Boolean(isGestoraOrAdminUser));

          const isSecretariaUser = !isGestoraOrAdminUser && (
            effectiveRole === ROLES.STUDIO_SECRETARIA ||
            userMeta?.role === 'secretaria' ||
            userMeta?.role === 'studio_secretaria' ||
            profProfile?.role === 'studio_secretaria'
          );
          setIsSecretaria(Boolean(isSecretariaUser));

          const isFullAdmin = isGestoraOrAdminUser || isSecretariaUser;

          const isAuxiliarUser = !isGestoraOrAdminUser && !isSecretariaUser && (
            effectiveRole === ROLES.STUDIO_AUXILIAR ||
            effectiveRole === 'studio_auxiliar' ||
            effectiveRole === 'AUXILIAR' ||
            userMeta?.role === 'studio_auxiliar' ||
            userMeta?.role === 'auxiliar' ||
            profProfile?.role === 'studio_auxiliar' ||
            profProfile?.role === 'AUXILIAR' ||
            Boolean(userMeta?.is_auxiliar) ||
            Boolean(profProfile?.permissions?.is_auxiliar) ||
            userMeta?.cargo?.toLowerCase?.().includes('auxiliar') ||
            (profProfile?.permissions as any)?.cargo?.toLowerCase?.().includes('auxiliar')
          );

          const isProfissionalUser = !isFullAdmin && !isAuxiliarUser && (
            effectiveRole === ROLES.STUDIO_PROFISSIONAL ||
            effectiveRole === 'PROFESSIONAL' ||
            effectiveRole === 'studio_profissional' ||
            userMeta?.role === 'studio_profissional' ||
            userMeta?.role === 'PROFESSIONAL' ||
            userMeta?.role === 'profissional' ||
            userMeta?.role === 'professional' ||
            profProfile?.role === 'PROFESSIONAL' ||
            profProfile?.role === 'studio_profissional' ||
            Boolean(profProfile?.permissions?.professional_id) ||
            Boolean(userMeta?.permissions?.professional_id) ||
            Boolean(userMeta?.professional_id) ||
            Boolean((profProfile as any)?.professional_id)
          );

          if (!isFullAdmin) {
            const normalizeText = (text?: string | null) => {
              if (!text) return '';
              return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
            };

            const profIdFromPerm = profProfile?.permissions?.professional_id || userMeta?.permissions?.professional_id || userMeta?.professional_id || (profProfile as any)?.professional_id;
            const ativos = profissionaisData.filter((p: Profissional) => p.ativo);
            
            let matchedProf = ativos.find((p: Profissional) => profIdFromPerm && p.id === profIdFromPerm);
            if (!matchedProf) {
              matchedProf = ativos.find((p: Profissional) => p.user_id && p.user_id === user.id);
            }
            if (!matchedProf && user.email) {
              const uEmail = user.email.toLowerCase().trim();
              matchedProf = ativos.find((p: Profissional) => p.email && p.email.toLowerCase().trim() === uEmail);
            }
            const uNameNorm = normalizeText(userMeta?.full_name || profProfile?.full_name || user.email?.split('@')[0]);
            if (!matchedProf && uNameNorm) {
              matchedProf = ativos.find((p: Profissional) => normalizeText(p.nome) === uNameNorm);
            }
            if (!matchedProf && uNameNorm) {
              matchedProf = ativos.find((p: Profissional) => {
                const pNorm = normalizeText(p.nome);
                return pNorm.includes(uNameNorm) || uNameNorm.includes(pNorm);
              });
            }

            if (isAuxiliarUser) {
              // AUXILIAR DE CABELO: Acesso à agenda de todos os profissionais da sessão de CABELO
              setIsAuxiliarCabelo(true);
              setIsRestrictedProfissional(false);
              setCategoriaFiltro('Cabelo');
              if (matchedProf) {
                setMeuProfissional(matchedProf);
              }
              const profsCabelo = ativos.filter((p: Profissional) => getCategoriaProfissional(p) === 'Cabelo');
              setProfissionais(profsCabelo);
              setProfFiltro('todos');
              const idsCabelo = new Set(profsCabelo.map(p => p.id));
              setAgendamentos(agendamentosData.filter(a => idsCabelo.has(a.profissional_id) || (Array.isArray(a.auxiliares_ids) && a.auxiliares_ids.some(id => idsCabelo.has(id)))));
              setBloqueiosDia(bloqueiosData.filter(b => idsCabelo.has(b.profissional_id)));
            } else if (matchedProf || isProfissionalUser) {
              setIsRestrictedProfissional(true);
              setIsAuxiliarCabelo(false);
              if (matchedProf) {
                setMeuProfissional(matchedProf);
                setProfFiltro(matchedProf.id);
                // Exclusividade total: lista de profissionais contém estritamente o profissional logado
                setProfissionais([matchedProf]);
                // Filtrar agendamentos e bloqueios na memória apenas para este profissional (titular ou auxiliar)
                setAgendamentos(agendamentosData.filter(a => a.profissional_id === matchedProf.id || (Array.isArray(a.auxiliares_ids) && a.auxiliares_ids.includes(matchedProf.id))));
                setBloqueiosDia(bloqueiosData.filter(b => b.profissional_id === matchedProf.id));
              } else {
                setMeuProfissional(null);
                setProfFiltro('');
                setProfissionais([]);
                setAgendamentos([]);
                setBloqueiosDia([]);
              }
            } else {
              setIsRestrictedProfissional(false);
              setIsAuxiliarCabelo(false);
              setProfissionais(profissionaisData.filter(p => p.ativo));
              setAgendamentos(agendamentosData);
              setBloqueiosDia(bloqueiosData);
            }
          } else {
            setIsRestrictedProfissional(false);
            setIsAuxiliarCabelo(false);
            setProfissionais(profissionaisData.filter(p => p.ativo));
            setAgendamentos(agendamentosData);
            setBloqueiosDia(bloqueiosData);
          }
        } else {
          setProfissionais(profissionaisData.filter(p => p.ativo));
          setAgendamentos(agendamentosData);
          setBloqueiosDia(bloqueiosData);
        }
      } catch (authErr) {
        console.warn('Erro ao verificar perfil do usuário na agenda:', authErr);
        setProfissionais(profissionaisData.filter(p => p.ativo));
        setAgendamentos(agendamentosData);
        setBloqueiosDia(bloqueiosData);
      }

      setLoading(false);
    };
    carregarDados();
  }, [dataSelecionada]);

  // Contagem de profissionais por categoria
  const countPorCategoria = useMemo(() => {
    const counts: { todas: number; Cabelo: number; Unhas: number; [key: string]: number } = {
      todas: profissionais.length,
      Cabelo: 0,
      Unhas: 0
    };
    for (const p of profissionais) {
      const cat = getCategoriaProfissional(p);
      if (cat === 'Unhas') {
        counts.Unhas = (counts.Unhas || 0) + 1;
      } else if (cat === 'Cabelo') {
        counts.Cabelo = (counts.Cabelo || 0) + 1;
      } else {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    }
    return counts;
  }, [profissionais]);

  // Profissionais filtrados pela categoria selecionada (ou todas)
  const profissionaisFiltradosPorCategoria = useMemo(() => {
    if (categoriaFiltro === 'todas') return profissionais;
    return profissionais.filter(p => getCategoriaProfissional(p) === categoriaFiltro);
  }, [profissionais, categoriaFiltro]);

  // Troca de categoria com auto-reset do filtro de profissional se não pertencer à nova categoria
  const handleCategoriaChange = (cat: string) => {
    if (isRestrictedProfissional || isAuxiliarCabelo) return;
    setCategoriaFiltro(cat);
    if (profFiltro !== 'todos') {
      const prof = profissionais.find(p => p.id === profFiltro);
      if (prof && cat !== 'todas' && getCategoriaProfissional(prof) !== cat) {
        setProfFiltro('todos');
      }
    }
  };

  // Profissionais visíveis na agenda (colunas do Kanban)
  const profissionaisVisiveisNaAgenda = useMemo(() => {
    if (isRestrictedProfissional) {
      return meuProfissional ? [meuProfissional] : [];
    }
    if (isAuxiliarCabelo) {
      const cabeloProfs = profissionais.filter(p => getCategoriaProfissional(p) === 'Cabelo');
      if (profFiltro === 'todos') return cabeloProfs;
      return cabeloProfs.filter(p => p.id === profFiltro);
    }
    return profissionaisFiltradosPorCategoria.filter(p => profFiltro === 'todos' || p.id === profFiltro);
  }, [profissionaisFiltradosPorCategoria, profFiltro, isRestrictedProfissional, meuProfissional, isAuxiliarCabelo, profissionais]);

  const idsVisiveis = useMemo(() => new Set(profissionaisVisiveisNaAgenda.map(p => p.id)), [profissionaisVisiveisNaAgenda]);

  // Filtro por data e profissional na visualização respeitando a categoria ativa (Titular ou Auxiliar)
  const doDia = agendamentos.filter(a => a.data === dataSelecionada);
  let agendamentosFiltrados = doDia.filter(a => 
    idsVisiveis.has(a.profissional_id) || 
    (Array.isArray(a.auxiliares_ids) && a.auxiliares_ids.some(id => idsVisiveis.has(id)))
  );

  if (buscaClienteAgenda.trim()) {
    const termo = buscaClienteAgenda.toLowerCase().trim();
    const digitos = termo.replace(/\D/g, '');
    agendamentosFiltrados = agendamentosFiltrados.filter(a => {
      const c = clientes.find(cli => cli.id === a.cliente_id);
      if (!c) return false;
      const nomeMatch = (c.nome || '').toLowerCase().includes(termo);
      const foneMatch = digitos ? (c.telefone || '').replace(/\D/g, '').includes(digitos) : (c.telefone || '').includes(termo);
      const codMatch = c.codigo ? String(c.codigo).includes(termo) : false;
      return nomeMatch || foneMatch || codMatch;
    });
  }

  agendamentosFiltrados.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));

  const bloqueiosFiltrados = bloqueiosDia.filter(b => {
    const matchProf = idsVisiveis.has(b.profissional_id);
    const matchData = b.data_inicio.slice(0, 10) === dataSelecionada || b.data_fim.slice(0, 10) === dataSelecionada;
    return matchProf && matchData;
  });

  // Serviços filtrados pelo profissional selecionado no formulário
  const servicosDoProfissional = useMemo(() => {
    if (!formData.profissional_id) return [];
    const idsVinculados = profServicos
      .filter(ps => ps.profissional_id === formData.profissional_id)
      .map(ps => ps.servico_id);
    
    // Retorna EXCLUSIVAMENTE os procedimentos vinculados ao profissional (sem fallback geral)
    if (idsVinculados.length > 0) {
      return servicos.filter(s => s.ativo && idsVinculados.includes(s.id));
    }
    return [];
  }, [formData.profissional_id, profServicos, servicos]);

  // Horários disponíveis calculados cruzando Salão + Profissional + Agendamentos existentes (Titular ou Auxiliar)
  const { horariosDisponiveis, statusDiaInfo } = useMemo(() => {
    if (!formData.data || !formData.profissional_id) {
      return { horariosDisponiveis: [], statusDiaInfo: null };
    }

    const [ano, mes, dia] = formData.data.split('-').map(Number);
    const dataObj = new Date(ano, mes - 1, dia);
    const diaSemana = dataObj.getDay();
    const horariosSalao = typeof window !== 'undefined' ? obterHorariosSalao() : DEFAULT_HORARIOS_SALAO;
    const infoSalao = horariosSalao[diaSemana] || DEFAULT_HORARIOS_SALAO[diaSemana];
    const profSel = profissionais.find(p => p.id === formData.profissional_id);
    const jornadaProf = profSel?.jornada_semanal;

    // Verificar se o profissional trabalha neste dia
    let profAtende = false;
    let profInicio = infoSalao?.inicio || '09:00';
    let profFim = infoSalao?.fim || '19:00';

    if (jornadaProf) {
      const chaveStr = DIAS_CHAVE[diaSemana];
      const cfgDia = jornadaProf[diaSemana] || (chaveStr ? jornadaProf[chaveStr] : undefined);
      if (cfgDia) {
        if (cfgDia.ativo !== false) {
          profAtende = true;
          profInicio = cfgDia.inicio || profInicio;
          profFim = cfgDia.fim || profFim;
        }
      } else if (infoSalao.aberto) {
        profAtende = true;
      }
    } else if (infoSalao.aberto) {
      profAtende = true;
    }

    if (!profAtende && !infoSalao.aberto) {
      return {
        horariosDisponiveis: [],
        statusDiaInfo: { tipo: 'fechado', texto: `Salão e profissional fechados aos domingos/segundas.` }
      };
    }

    if (!profAtende) {
      return {
        horariosDisponiveis: [],
        statusDiaInfo: { tipo: 'folga', texto: `${profSel?.nome || 'Profissional'} não atende neste dia da semana.` }
      };
    }

    // Gerar slots de 30 em 30 minutos
    const [hIni, mIni] = profInicio.split(':').map(Number);
    const [hFim, mFim] = profFim.split(':').map(Number);
    const totalMinutosIni = hIni * 60 + mIni;
    const totalMinutosFim = hFim * 60 + mFim;

    // Agendamentos já marcados para o profissional nesta data considerando Titular OU Auxiliar
    const agendamentosAtivos = agendamentos.filter(a =>
      a.data === formData.data &&
      (a.profissional_id === formData.profissional_id || (Array.isArray(a.auxiliares_ids) && a.auxiliares_ids.includes(formData.profissional_id))) &&
      a.status !== 'cancelado' &&
      (!editingApptId || a.id !== editingApptId)
    );

    const isAgnaldo = (profSel?.nome || '').toLowerCase().includes('agnaldo') || profSel?.id === 'agnaldo';
    const interval = isAgnaldo ? 20 : 30;

    const slots: Array<{ hora: string; ocupado: boolean; permiteEncaixe?: boolean }> = [];
    for (let m = totalMinutosIni; m < totalMinutosFim; m += interval) {
      const hStr = String(Math.floor(m / 60)).padStart(2, '0');
      const minStr = String(m % 60).padStart(2, '0');
      const horaFormatada = `${hStr}:${minStr}`;

      const slotInicioMin = m;
      const slotFimMin = m + interval;

      const apptsNoSlot = agendamentosAtivos.filter(a => {
        const aInicioMin = timeToMinutes(a.hora_inicio);
        const aFimStr = getAgendamentoHoraFim(a, servicos);
        const aFimMin = timeToMinutes(aFimStr);
        return aInicioMin < slotFimMin && aFimMin > slotInicioMin;
      });

      const estaOcupado = apptsNoSlot.length > 0;
      const permiteEncaixe = apptsNoSlot.some(a => a.allow_overlap);

      slots.push({
        hora: horaFormatada,
        ocupado: estaOcupado,
        permiteEncaixe,
      });
    }

    return {
      horariosDisponiveis: slots,
      statusDiaInfo: {
        tipo: 'aberto',
        texto: `Horário do profissional: ${profInicio} às ${profFim}`
      }
    };
  }, [formData.data, formData.profissional_id, profissionais, agendamentos, servicos, editingApptId]);

  async function mudarStatus(id: string, status: StatusAgendamento) {
    if (isReadOnly) {
      toast.error('Ação bloqueada: seu perfil possui permissão somente de leitura na Agenda.');
      return;
    }
    try {
      const { atualizarStatusAgendamento } = await import('@/lib/supabase-queries');
      const success = await atualizarStatusAgendamento(id, status);
      
      if (success) {
        // Atualizar estado local
        setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status } : a));
        
        // Sincronizar com Bolten CRM (background, não bloqueia UI)
        try {
          await fetch('/api/bolten/sync-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agendamentoId: id, status }),
          });
        } catch (syncErr) {
          console.warn('[bolten-sync] Falha ao sincronizar status:', syncErr);
        }
      } else {
        setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      }
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    }
  }

  const abrirModalCancelar = async (appt: Agendamento) => {
    if (isReadOnly) {
      toast.error('Ação bloqueada: seu perfil possui permissão somente de leitura na Agenda.');
      return;
    }
    setApptParaCancelar(appt);
    setModoCancelamento('apenas_dia');
    setExcluirDiaAtual(false);
    setFuturosCliente({ loading: true, lista: [] });

    try {
      const res = await fetch(`/api/agendamentos/admin?cliente_id=${appt.cliente_id}&futuros_de=${appt.data}`);
      if (res.ok) {
        const dados = await res.json();
        const lista = Array.isArray(dados) ? dados : [];
        setFuturosCliente({ loading: false, lista });
        // Se a cliente possui agendamentos futuros e for recorrente/fixo, sugerir por padrão exclusão de futuros
        if (lista.length > 0 && appt.is_fixed) {
          setModoCancelamento('excluir_futuros');
        }
      } else {
        setFuturosCliente({ loading: false, lista: [] });
      }
    } catch (err) {
      console.warn('Erro ao carregar agendamentos futuros da cliente:', err);
      setFuturosCliente({ loading: false, lista: [] });
    }
  };

  const handleConfirmarCancelamento = async () => {
    if (isReadOnly || !apptParaCancelar) return;
    setProcessandoCancelamento(true);

    try {
      const res = await fetch('/api/agendamentos/admin', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: apptParaCancelar.id,
          modo: modoCancelamento,
          excluir_atual: excluirDiaAtual,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erro ao processar cancelamento.');
      }

      // Atualizar o estado local imediatamente
      if (modoCancelamento === 'apenas_dia') {
        if (excluirDiaAtual) {
          setAgendamentos(prev => prev.filter(a => a.id !== apptParaCancelar.id));
          toast.success('Atendimento excluído da agenda com sucesso!');
        } else {
          setAgendamentos(prev => prev.map(a => a.id === apptParaCancelar.id ? { ...a, status: 'cancelado' } : a));
          toast.success('Atendimento marcado como cancelado!');
        }
      } else if (modoCancelamento === 'cancelar_futuros') {
        setAgendamentos(prev => prev.map(a => {
          if (a.id === apptParaCancelar.id) {
            return excluirDiaAtual ? null : { ...a, status: 'cancelado' };
          }
          if (a.cliente_id === apptParaCancelar.cliente_id && a.data > apptParaCancelar.data && a.status !== 'concluido') {
            return { ...a, status: 'cancelado' };
          }
          return a;
        }).filter(Boolean) as Agendamento[]);

        const total = (data.cancelados || 1);
        toast.success(`Atendimento do dia e ${total - 1} agendamento(s) futuro(s) foram cancelados!`);
      } else if (modoCancelamento === 'excluir_futuros') {
        setAgendamentos(prev => prev.filter(a => {
          if (a.id === apptParaCancelar.id) {
            return !excluirDiaAtual;
          }
          if (a.cliente_id === apptParaCancelar.cliente_id && a.data > apptParaCancelar.data && a.status !== 'concluido') {
            return false;
          }
          return true;
        }).map(a => a.id === apptParaCancelar.id ? { ...a, status: 'cancelado' } : a));

        const excluidos = data.excluidos || 0;
        toast.success(`Atendimento do dia cancelado e ${excluidos} agendamento(s) futuro(s) excluídos da agenda!`);
      }

      setApptParaCancelar(null);
      fetchAgendamentos().then(setAgendamentos).catch(() => {});
    } catch (err: any) {
      console.error('Erro ao cancelar agendamento:', err);
      toast.error(err.message || 'Falha ao cancelar agendamento.');
    } finally {
      setProcessandoCancelamento(false);
    }
  };

  const abrirLancarInsumoTempoReal = async (appt: Agendamento) => {
    if (isSecretaria) return;
    setLiveInsumoAppt(appt);
    setEditingInsumoIndex(null);
    setLiveInsumoEtapa('Etapa 1 - Descoloração / Mechas');
    setLiveInsumoEtapaCustom('');
    setLiveInsumoProfId(appt.profissional_id);
    setLiveInsumoProdId('');
    setLiveInsumoQtd('');

    if (estoque.length === 0) {
      try {
        const estData = await fetchEstoque();
        if (estData) setEstoque(estData);
      } catch (e) {
        console.warn('Erro ao carregar estoque para insumos:', e);
      }
    }
  };

  const handleEditarInsumoTempoReal = (index: number) => {
    if (!liveInsumoAppt || !liveInsumoAppt.insumos_detalhes?.[index]) return;
    const item = liveInsumoAppt.insumos_detalhes[index];
    setEditingInsumoIndex(index);
    const etapasPadrao = [
      'Etapa 1 - Descoloração / Mechas',
      'Etapa 2 - Tonalização / Matização',
      'Etapa 3 - Lavatório / Tratamento',
      'Etapa 4 - Escova / Modelagem',
      'Etapa 5 - Finalização / Óleos'
    ];
    if (item.etapa && etapasPadrao.includes(item.etapa)) {
      setLiveInsumoEtapa(item.etapa);
      setLiveInsumoEtapaCustom('');
    } else {
      setLiveInsumoEtapa('Outra');
      setLiveInsumoEtapaCustom(item.etapa || '');
    }
    setLiveInsumoProfId(item.profissional_id || liveInsumoAppt.profissional_id);
    setLiveInsumoProdId(item.inventory_id);
    setLiveInsumoQtd(String(item.qty_used));
  };

  const handleCancelarEdicaoInsumo = () => {
    setEditingInsumoIndex(null);
    setLiveInsumoProdId('');
    setLiveInsumoQtd('');
    setLiveInsumoEtapaCustom('');
  };

  const handleRegistrarInsumoTempoReal = async () => {
    if (!liveInsumoAppt || !liveInsumoProdId || !liveInsumoQtd) {
      alert('Selecione o produto e informe a quantidade em gramas/ml.');
      return;
    }
    const qtdNum = parseFloat(liveInsumoQtd);
    if (isNaN(qtdNum) || qtdNum <= 0) {
      alert('Informe uma quantidade válida maior que zero.');
      return;
    }

    const prod = estoque.find(p => p.id === liveInsumoProdId);
    if (!prod) return;

    const custoUn = (prod.price_per_gram && prod.price_per_gram > 0)
      ? prod.price_per_gram
      : ((prod.cost_price && prod.cost_price > 0) ? prod.cost_price / 500 : 0.10);

    const custoTot = Number((custoUn * qtdNum).toFixed(2));
    const etapaFinal = liveInsumoEtapa === 'Outra' ? (liveInsumoEtapaCustom || 'Procedimento') : liveInsumoEtapa;
    const profId = liveInsumoProfId || liveInsumoAppt.profissional_id;
    const profNome = getProfissionalNome(profId, profissionais);
    const cliNome = getClienteNome(liveInsumoAppt.cliente_id, clientes);

    const itemEditando = (editingInsumoIndex !== null && liveInsumoAppt.insumos_detalhes)
      ? liveInsumoAppt.insumos_detalhes[editingInsumoIndex]
      : null;

    const novoItem: InsumoAtendimento = {
      inventory_id: prod.id,
      name: prod.name,
      unit: prod.unit || 'g',
      price_per_gram: custoUn,
      custo_unitario: custoUn,
      qty_used: qtdNum,
      custo_total: custoTot,
      etapa: etapaFinal,
      profissional_id: profId,
      horario: itemEditando?.horario || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setLiveInsumoLoading(true);
    try {
      if (editingInsumoIndex !== null && itemEditando) {
        // Modo Edição
        const res = await editarInsumoTempoRealProcedimento({
          appointmentId: liveInsumoAppt.id,
          index: editingInsumoIndex,
          novoInsumo: novoItem,
          nomeProfissional: profNome,
          nomeCliente: cliNome,
        });

        if (res.ok) {
          const updatedAppt: Agendamento = {
            ...liveInsumoAppt,
            insumos_detalhes: res.insumosAtualizados,
            product_cost: res.productCost,
          };
          setLiveInsumoAppt(updatedAppt);
          setAgendamentos(prev => prev.map(a => a.id === updatedAppt.id ? updatedAppt : a));

          // Ajuste de saldo no estoque local
          if (itemEditando.inventory_id !== prod.id) {
            setEstoque(prev => prev.map(p => {
              if (p.id === itemEditando.inventory_id) {
                return { ...p, stock_qty: (p.stock_qty || 0) + itemEditando.qty_used };
              }
              if (p.id === prod.id) {
                return { ...p, stock_qty: Math.max(0, (p.stock_qty || 0) - qtdNum) };
              }
              return p;
            }));
          } else {
            const diff = qtdNum - itemEditando.qty_used;
            setEstoque(prev => prev.map(p => {
              if (p.id === prod.id) {
                return { ...p, stock_qty: Math.max(0, (p.stock_qty || 0) - diff) };
              }
              return p;
            }));
          }

          setEditingInsumoIndex(null);
          setLiveInsumoProdId('');
          setLiveInsumoQtd('');
        } else {
          alert('Erro ao atualizar insumo: ' + (res.error || 'Tente novamente'));
        }
      } else {
        // Modo Novo Insumo
        const res = await salvarInsumoTempoRealProcedimento({
          appointmentId: liveInsumoAppt.id,
          insumo: novoItem,
          nomeProfissional: profNome,
          nomeCliente: cliNome,
        });

        if (res.ok) {
          const updatedAppt: Agendamento = {
            ...liveInsumoAppt,
            insumos_detalhes: res.insumosAtualizados,
            product_cost: res.productCost,
          };
          setLiveInsumoAppt(updatedAppt);
          setAgendamentos(prev => prev.map(a => a.id === updatedAppt.id ? updatedAppt : a));

          // Decrementa o saldo no estoque local para atualização imediata na tela
          setEstoque(prev => prev.map(p => {
            if (p.id === prod.id) {
              return { ...p, stock_qty: Math.max(0, (p.stock_qty || 0) - qtdNum) };
            }
            return p;
          }));

          setLiveInsumoProdId('');
          setLiveInsumoQtd('');
        } else {
          alert('Erro ao registrar aplicação: ' + (res.error || 'Tente novamente'));
        }
      }
    } catch (err: any) {
      alert('Erro ao registrar aplicação: ' + (err?.message || 'Erro inesperado'));
    } finally {
      setLiveInsumoLoading(false);
    }
  };

  const handleRemoverInsumoTempoReal = async (index: number) => {
    if (!liveInsumoAppt) return;
    const item = liveInsumoAppt.insumos_detalhes?.[index];
    if (!item) return;

    if (!confirm(`Deseja remover "${item.name} (${item.qty_used}${item.unit})" e estornar ao estoque?`)) {
      return;
    }

    setLiveInsumoLoading(true);
    try {
      const res = await removerInsumoTempoRealProcedimento({
        appointmentId: liveInsumoAppt.id,
        index,
        nomeProfissional: getProfissionalNome(liveInsumoProfId || liveInsumoAppt.profissional_id, profissionais),
      });

      if (res.ok) {
        const updatedAppt: Agendamento = {
          ...liveInsumoAppt,
          insumos_detalhes: res.insumosAtualizados,
          product_cost: res.productCost,
        };
        setLiveInsumoAppt(updatedAppt);
        setAgendamentos(prev => prev.map(a => a.id === updatedAppt.id ? updatedAppt : a));

        // Estorna o saldo no estoque local
        setEstoque(prev => prev.map(p => {
          if (p.id === item.inventory_id) {
            return { ...p, stock_qty: (p.stock_qty || 0) + item.qty_used };
          }
          return p;
        }));

        if (editingInsumoIndex === index) {
          setEditingInsumoIndex(null);
          setLiveInsumoProdId('');
          setLiveInsumoQtd('');
        }
      } else {
        alert('Erro ao estornar insumo: ' + (res.error || 'Tente novamente'));
      }
    } catch (err: any) {
      alert('Erro ao estornar insumo: ' + (err?.message || 'Erro inesperado'));
    } finally {
      setLiveInsumoLoading(false);
    }
  };

  const abrirCheckout = async (appt: Agendamento) => {
    if (isSecretaria) return;
    setCheckoutAppt(appt);
    setCheckoutExtras([]);
    setCheckoutInsumos([]);
    setCheckoutProdutos([]);
    setCheckoutPagamento('DINHEIRO');
    setCheckoutParcelas(1);
    setCheckoutDescontoPct('');
    setCheckoutDescontoValor('');
    setCheckoutDescontoMotivo('');
    setCheckoutNovoProdId('');
    setCheckoutNovoProdQty('1');
    setCheckoutNovoProdDescPct('');
    setCheckoutNovoProdDescValor('');
    setNovoProcServicoId('');
    setNovoProcProfId(appt.profissional_id);

    // 1. Montar lista de procedimentos a partir do agendamento principal
    const precoPrincipal = getServicoPreco(appt.servico_id, servicos);
    const listaProcedimentos: ProcedimentoComanda[] = [
      {
        id: 'proc_principal_' + appt.id,
        servico_id: appt.servico_id,
        servico_nome: getServicoNome(appt.servico_id, servicos),
        profissional_id: appt.profissional_id,
        profissional_nome: getProfissionalNome(appt.profissional_id, profissionais),
        preco_tabela: precoPrincipal,
        desconto_valor: 0,
        desconto_pct: 0,
        desconto_motivo: '',
        valor_final: precoPrincipal,
        agendamento_id: appt.id,
      }
    ];

    // Se houver sub_serviços no agendamento, adicionar como procedimentos
    if (Array.isArray(appt.sub_servicos) && appt.sub_servicos.length > 0) {
      appt.sub_servicos.forEach((sub, sIdx) => {
        const subId = typeof sub === 'string' ? sub : sub?.id;
        const subProfId = (typeof sub === 'object' && sub?.profissional_id) ? sub.profissional_id : appt.profissional_id;
        const subPreco = (typeof sub === 'object' && sub?.is_free) ? 0 : getServicoPreco(subId, servicos);
        if (subId) {
          listaProcedimentos.push({
            id: 'sub_' + sIdx + '_' + subId,
            servico_id: subId,
            servico_nome: getServicoNome(subId, servicos),
            profissional_id: subProfId,
            profissional_nome: getProfissionalNome(subProfId, profissionais),
            preco_tabela: subPreco,
            desconto_valor: 0,
            desconto_pct: 0,
            desconto_motivo: '',
            valor_final: subPreco,
            agendamento_id: appt.id,
          });
        }
      });
    }

    // 2. DETECÇÃO DE ATENDIMENTOS DA MESMA CLIENTE NO MESMO DIA (Multi-profissionais)
    // Ex: cliente fez coloração com um profissional e escova/unha com outro no mesmo dia!
    const outrosDaCliente = agendamentos.filter(a => 
      a.id !== appt.id &&
      a.cliente_id === appt.cliente_id &&
      a.data === appt.data &&
      a.status !== 'cancelado' &&
      a.status !== 'no_show'
    );

    const idsUnificados: string[] = [appt.id];

    // Unifica automaticamente os procedimentos dos outros agendamentos da cliente hoje
    outrosDaCliente.forEach(outro => {
      idsUnificados.push(outro.id);
      const prc = (outro.total_amount != null && Number(outro.total_amount) > 0)
        ? Number(outro.total_amount)
        : getServicoPreco(outro.servico_id, servicos);

      listaProcedimentos.push({
        id: 'outro_appt_' + outro.id,
        servico_id: outro.servico_id,
        servico_nome: getServicoNome(outro.servico_id, servicos),
        profissional_id: outro.profissional_id,
        profissional_nome: getProfissionalNome(outro.profissional_id, profissionais),
        preco_tabela: prc,
        desconto_valor: 0,
        desconto_pct: 0,
        desconto_motivo: '',
        valor_final: prc,
        agendamento_id: outro.id,
      });
    });

    setCheckoutProcedimentos(listaProcedimentos);
    setAgendamentosUnificadosIds(idsUnificados);

    // Prepara profissional padrão e etapa para o lançamento do insumo
    setInsumoProfissionalId(appt.profissional_id);
    setInsumoEtapa('Etapa 1 - Descoloração / Mechas');
    setInsumoNovoProdutoId('');
    setInsumoNovoQtdG('');

    // Inicializa divisão igualitária de comissão entre titular e auxiliares
    const allProfs = [appt.profissional_id, ...(appt.auxiliares_ids || [])].filter(Boolean);
    const count = allProfs.length;
    const initialSplit: Record<string, number> = {};
    if (count > 0) {
      const share = Number((100 / count).toFixed(1));
      allProfs.forEach((pid, idx) => {
        if (idx === 0) {
          initialSplit[pid] = Number((100 - share * (count - 1)).toFixed(1));
        } else {
          initialSplit[pid] = share;
        }
      });
    }
    if (appt.split_comissao && Object.keys(appt.split_comissao).length > 0) {
      setSplitComissaoCustom(appt.split_comissao);
    } else {
      setSplitComissaoCustom(initialSplit);
    }

    // Carregar insumos existentes salvos no agendamento, se houver
    let insumosCarregados: InsumoAtendimento[] = [];
    if (Array.isArray(appt.insumos_detalhes) && appt.insumos_detalhes.length > 0) {
      insumosCarregados = [...appt.insumos_detalhes];
    } else {
      const itens = await fetchItensComanda(appt.id);
      
      // Insumos da comanda
      const insumosDaComanda = itens.filter(i => i.type === 'INSUMO');
      insumosCarregados = insumosDaComanda.map(i => {
        const prod = estoque.find(p => p.id === i.inventory_id);
        const custoUn = (prod?.price_per_gram && prod.price_per_gram > 0)
          ? prod.price_per_gram
          : ((prod?.cost_price && prod.cost_price > 0) ? prod.cost_price / 500 : 0.10);
        return {
          inventory_id: i.inventory_id,
          name: prod?.name || 'Insumo',
          unit: prod?.unit || 'g',
          price_per_gram: custoUn,
          qty_used: i.qty,
          custo_unitario: custoUn,
          custo_total: Number((custoUn * i.qty).toFixed(2)),
          etapa: 'Procedimento',
          profissional_id: appt.profissional_id,
        };
      });

      // Produtos (Upsell)
      const produtosDaComanda = itens.filter(i => i.type === 'PRODUTO');
      const mapProdutos = produtosDaComanda.map(i => {
        const prod = estoque.find(p => p.id === i.inventory_id);
        const precoBase = i.price > 0 ? i.price : (prod?.sale_price || 0);
        return {
          id: Date.now().toString() + i.id,
          inventory_id: i.inventory_id,
          qty: i.qty,
          precoOriginal: precoBase,
          preco: precoBase,
          descontoPct: 0,
          descontoValor: 0,
        };
      });
      setCheckoutProdutos(mapProdutos);
    }

    // Se outros agendamentos unificados tinham insumos, agrega também!
    outrosDaCliente.forEach(outro => {
      if (Array.isArray(outro.insumos_detalhes) && outro.insumos_detalhes.length > 0) {
        insumosCarregados.push(...outro.insumos_detalhes);
      }
    });

    setCheckoutInsumos(insumosCarregados);
  };

  const fecharCheckout = () => {
    setCheckoutAppt(null);
    setCheckoutExtras([]);
    setCheckoutProcedimentos([]);
    setAgendamentosUnificadosIds([]);
    setNovoProcServicoId('');
    setNovoProcProfId('');
    setExtraServiceSelect('');
    setCheckoutInsumos([]);
    setCheckoutProdutos([]);
    setCheckoutPagamento('DINHEIRO');
    setCheckoutParcelas(1);
    setInsumoNovoProdutoId('');
    setInsumoNovoQtdG('');
    setSplitComissaoCustom({});
    setCheckoutDescontoPct('');
    setCheckoutDescontoValor('');
    setCheckoutDescontoMotivo('');
    setCheckoutNovoProdId('');
    setCheckoutNovoProdQty('1');
    setCheckoutNovoProdDescPct('');
    setCheckoutNovoProdDescValor('');
  };

  const adicionarProcedimentoComanda = () => {
    if (!novoProcServicoId || !novoProcProfId) return;
    const srv = servicos.find(s => s.id === novoProcServicoId);
    if (!srv) return;
    const novo: ProcedimentoComanda = {
      id: 'proc_extra_' + Date.now(),
      servico_id: srv.id,
      servico_nome: srv.nome,
      profissional_id: novoProcProfId,
      profissional_nome: getProfissionalNome(novoProcProfId, profissionais),
      preco_tabela: srv.preco,
      desconto_valor: 0,
      desconto_pct: 0,
      desconto_motivo: '',
      valor_final: srv.preco,
    };
    setCheckoutProcedimentos(prev => [...prev, novo]);
    setNovoProcServicoId('');
  };

  const removerProcedimentoComanda = (procId: string) => {
    if (checkoutProcedimentos.length <= 1) {
      alert('A comanda deve conter pelo menos 1 procedimento.');
      return;
    }
    setCheckoutProcedimentos(prev => prev.filter(p => p.id !== procId));
  };

  const handleProcedimentoDescontoPct = (procId: string, pctStr: string) => {
    setCheckoutProcedimentos(prev => prev.map(p => {
      if (p.id !== procId) return p;
      const pct = Math.min(100, Math.max(0, parseFloat(pctStr) || 0));
      const val = Number(((p.preco_tabela * pct) / 100).toFixed(2));
      return {
        ...p,
        desconto_pct: pct,
        desconto_valor: val,
        valor_final: Math.max(0, p.preco_tabela - val)
      };
    }));
  };

  const handleProcedimentoDescontoValor = (procId: string, valStr: string) => {
    setCheckoutProcedimentos(prev => prev.map(p => {
      if (p.id !== procId) return p;
      const val = Math.min(p.preco_tabela, Math.max(0, parseFloat(valStr) || 0));
      const pct = p.preco_tabela > 0 ? Number(((val / p.preco_tabela) * 100).toFixed(1)) : 0;
      return {
        ...p,
        desconto_pct: pct,
        desconto_valor: val,
        valor_final: Math.max(0, p.preco_tabela - val)
      };
    }));
  };

  const handleProcedimentoDescontoMotivo = (procId: string, motivo: string) => {
    setCheckoutProcedimentos(prev => prev.map(p => {
      if (p.id !== procId) return p;
      return { ...p, desconto_motivo: motivo };
    }));
  };

  const handleProcedimentoProfissional = (procId: string, profId: string) => {
    setCheckoutProcedimentos(prev => prev.map(p => {
      if (p.id !== procId) return p;
      return { 
        ...p, 
        profissional_id: profId,
        profissional_nome: getProfissionalNome(profId, profissionais)
      };
    }));
  };

  const adicionarInsumoPorGrama = () => {
    if (!insumoNovoProdutoId) {
      alert('Selecione um produto do estoque para lançar na etapa.');
      return;
    }
    const qty = parseFloat(insumoNovoQtdG);
    if (isNaN(qty) || qty <= 0) {
      alert('Informe uma quantidade válida em gramas (g) ou ml.');
      return;
    }
    const prod = estoque.find(p => p.id === insumoNovoProdutoId);
    if (!prod) return;

    const ppg = (prod.price_per_gram && prod.price_per_gram > 0)
      ? prod.price_per_gram
      : ((prod.cost_price && prod.cost_price > 0) ? prod.cost_price / 500 : 0.10);

    const custoTotal = Number((ppg * qty).toFixed(2));
    const profId = insumoProfissionalId || (checkoutAppt?.profissional_id ?? '');

    setCheckoutInsumos(prev => [
      ...prev,
      {
        inventory_id: prod.id,
        name: prod.name,
        unit: prod.unit || 'g',
        price_per_gram: ppg,
        qty_used: qty,
        custo_unitario: ppg,
        custo_total: custoTotal,
        etapa: insumoEtapa.trim() || 'Etapa Geral',
        profissional_id: profId,
      }
    ]);

    setInsumoNovoQtdG('');
    setInsumoNovoProdutoId('');
  };

  const removerInsumoPorGrama = (index: number) => {
    setCheckoutInsumos(prev => prev.filter((_, i) => i !== index));
  };

  // Funções de Desconto no Atendimento (com auto-ajuste sincronizado % <-> R$)
  const handleCheckoutDescontoPct = (pctStr: string, subtotal: number) => {
    setCheckoutDescontoPct(pctStr);
    const p = parseFloat(pctStr);
    if (isNaN(p) || p <= 0) {
      setCheckoutDescontoValor('');
    } else {
      const clamped = Math.min(100, Math.max(0, p));
      const val = (subtotal * clamped) / 100;
      setCheckoutDescontoValor(val.toFixed(2));
    }
  };

  const handleCheckoutDescontoValor = (valStr: string, subtotal: number) => {
    setCheckoutDescontoValor(valStr);
    const v = parseFloat(valStr);
    if (isNaN(v) || v <= 0 || subtotal <= 0) {
      setCheckoutDescontoPct('');
    } else {
      const clampedVal = Math.min(subtotal, Math.max(0, v));
      const p = (clampedVal / subtotal) * 100;
      setCheckoutDescontoPct(p % 1 === 0 ? p.toFixed(0) : p.toFixed(1));
    }
  };

  // Funções de Desconto para Produto adicionado no Checkout (com auto-ajuste sincronizado % <-> R$)
  const handleCheckoutNovoProdDescPct = (pctStr: string) => {
    setCheckoutNovoProdDescPct(pctStr);
    const prod = estoque.find(e => e.id === checkoutNovoProdId);
    const sub = (prod?.sale_price || 0) * (Math.max(1, parseInt(checkoutNovoProdQty) || 1));
    const p = parseFloat(pctStr);
    if (isNaN(p) || p <= 0) {
      setCheckoutNovoProdDescValor('');
    } else {
      const clamped = Math.min(100, Math.max(0, p));
      const val = (sub * clamped) / 100;
      setCheckoutNovoProdDescValor(val.toFixed(2));
    }
  };

  const handleCheckoutNovoProdDescValor = (valStr: string) => {
    setCheckoutNovoProdDescValor(valStr);
    const prod = estoque.find(e => e.id === checkoutNovoProdId);
    const sub = (prod?.sale_price || 0) * (Math.max(1, parseInt(checkoutNovoProdQty) || 1));
    const v = parseFloat(valStr);
    if (isNaN(v) || v <= 0 || sub <= 0) {
      setCheckoutNovoProdDescPct('');
    } else {
      const clamped = Math.min(sub, Math.max(0, v));
      const p = (clamped / sub) * 100;
      setCheckoutNovoProdDescPct(p % 1 === 0 ? p.toFixed(0) : p.toFixed(1));
    }
  };

  const adicionarProdutoAoCheckout = () => {
    if (!checkoutNovoProdId) return;
    const prod = estoque.find(e => e.id === checkoutNovoProdId);
    if (!prod || (prod.stock_qty ?? 0) <= 0) return;
    const maxDisponivel = prod.stock_qty ?? 1;
    const q = Math.min(maxDisponivel, Math.max(1, parseInt(checkoutNovoProdQty) || 1));
    const precoOriginal = prod.sale_price || 0;
    const subtotalItem = precoOriginal * q;
    const descVal = Math.min(subtotalItem, Math.max(0, parseFloat(checkoutNovoProdDescValor) || 0));
    const descPct = parseFloat(checkoutNovoProdDescPct) || (subtotalItem > 0 ? (descVal / subtotalItem) * 100 : 0);
    const precoUnitFinal = (subtotalItem - descVal) / q;

    setCheckoutProdutos(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        inventory_id: prod.id,
        qty: q,
        precoOriginal,
        preco: precoUnitFinal,
        descontoPct: descPct,
        descontoValor: descVal,
      }
    ]);

    setCheckoutNovoProdId('');
    setCheckoutNovoProdQty('1');
    setCheckoutNovoProdDescPct('');
    setCheckoutNovoProdDescValor('');
  };

  const handleDispararLembretesHoje = async () => {
    if (!confirm('Deseja iniciar agora o disparo manual dos lembretes de horário via WhatsApp para os clientes com agendamento HOJE?\n\n• As mensagens serão disparadas imediatamente, mesmo que antes do horário padrão configurado.\n• Clientes que já foram notificados hoje não receberão novamente (anti-duplicação).\n• Intervalo seguro anti-ban de 1 min entre envios.')) {
      return;
    }
    setDisparandoLembretes(true);
    toast.info('Iniciando ciclo de disparos de lembretes do dia...');
    try {
      const res = await fetch('/api/cron/agenda?execute=true&force=true&tipo=lembrete_hoje');
      const data = await res.json();
      if (res.ok && data.ok) {
        if (data.enviados_automaticos > 0) {
          toast.success(`${data.enviados_automaticos} lembrete(s) de hoje enviado(s) com sucesso!`);
        } else if ((data.itens?.length ?? 0) === 0) {
          toast.info('Nenhum agendamento ativo encontrado para o dia de hoje.');
        } else {
          toast.info('Todos os lembretes de hoje já haviam sido enviados anteriormente (anti-duplicação).');
        }
      } else {
        toast.error(data.error || 'Erro ao processar disparos de lembrete.');
      }
    } catch (err: any) {
      toast.error(`Falha no envio: ${err.message}`);
    } finally {
      setDisparandoLembretes(false);
    }
  };

  const abrirFormNovo = (hora?: string, profId = '', isEncaixe = false) => {
    if (isReadOnly) {
      toast.error('Ação bloqueada: seu perfil possui permissão somente de leitura na Agenda.');
      return;
    }
    const finalProfId = (isRestrictedProfissional && meuProfissional) ? meuProfissional.id : (profId || '');
    setEditingApptId(null);
    setFormData({
      cliente_id: '',
      profissional_id: finalProfId,
      servico_id: '',
      sub_servicos: [] as any[],
      auxiliares_ids: [] as string[],
      data: dataSelecionada,
      hora_inicio: hora || '09:00',
      duracao_min: '',
      is_fixed: false,
      recurrence_type: 'WEEKLY',
      recurrence_custom_day: '',
      allow_overlap: isEncaixe,
      replicate_to_future: false,
    });
    setBuscaCliente(buscaClienteAgenda || '');
    setClienteDropdownAberto(Boolean(buscaClienteAgenda));
    setCadastrandoNovoCliente(false);
    setShowForm(true);
  };

  const abrirEdicao = (appt: Agendamento) => {
    if (isReadOnly) {
      toast.error('Ação bloqueada: seu perfil possui permissão somente de leitura na Agenda.');
      return;
    }
    if (isRestrictedProfissional && meuProfissional) {
      const isMine = appt.profissional_id === meuProfissional.id || (Array.isArray(appt.auxiliares_ids) && appt.auxiliares_ids.includes(meuProfissional.id));
      if (!isMine) {
        alert('Você só possui permissão para editar agendamentos da sua própria agenda.');
        return;
      }
    }
    setEditingApptId(appt.id);
    const subList = Array.isArray(appt.sub_servicos) ? appt.sub_servicos : [];
    const durTotal = calcularDuracaoTotal(appt.servico_id, subList);
    let duracaoMinFinal = durTotal;
    if (appt.hora_inicio && appt.hora_fim) {
      const iniM = timeToMinutes(appt.hora_inicio);
      const fimM = timeToMinutes(appt.hora_fim);
      if (fimM > iniM) {
        duracaoMinFinal = fimM - iniM;
      }
    }

    setFormData({
      cliente_id: appt.cliente_id,
      profissional_id: appt.profissional_id,
      servico_id: appt.servico_id,
      sub_servicos: subList,
      auxiliares_ids: Array.isArray(appt.auxiliares_ids) ? [...appt.auxiliares_ids] : [],
      data: appt.data,
      hora_inicio: appt.hora_inicio.slice(0, 5),
      duracao_min: String(duracaoMinFinal),
      is_fixed: Boolean(appt.is_fixed),
      recurrence_type: appt.recurrence_type || 'WEEKLY',
      recurrence_custom_day: appt.recurrence_custom_day ? String(appt.recurrence_custom_day) : '',
      allow_overlap: Boolean(appt.allow_overlap),
      replicate_to_future: false,
    });

    const cli = clientes.find(c => c.id === appt.cliente_id);
    setBuscaCliente(cli?.nome || '');
    setClienteDropdownAberto(false);
    setCadastrandoNovoCliente(false);
    setSelectedAppt(null);
    setShowForm(true);
  };

  const handleSalvarAgendamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      toast.error('Ação bloqueada: seu perfil possui permissão somente de leitura na Agenda.');
      return;
    }
    if (!formData.cliente_id) {
      alert('Por favor, busque e selecione um cliente para o agendamento.');
      return;
    }
    const profIdFinal = (isRestrictedProfissional && meuProfissional) ? meuProfissional.id : formData.profissional_id;
    if (!profIdFinal || !formData.servico_id || !formData.data || !formData.hora_inicio) {
      alert('Preencha todos os campos obrigatórios (Profissional, Serviço, Data e Horário).');
      return;
    }

    const duracaoTotalCalc = calcularDuracaoTotal(formData.servico_id, formData.sub_servicos);
    const duracaoMin = formData.duracao_min ? parseInt(formData.duracao_min) : duracaoTotalCalc;
    const [h, m] = formData.hora_inicio.split(':').map(Number);
    const fim = new Date(2000, 0, 1, h, m + duracaoMin);
    const horaFim = `${String(fim.getHours()).padStart(2, '0')}:${String(fim.getMinutes()).padStart(2, '0')}`;
    
    if (editingApptId) {
      try {
        const res = await fetch('/api/agendamentos/admin', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingApptId,
            cliente_id: formData.cliente_id,
            profissional_id: profIdFinal,
            servico_id: formData.servico_id,
            sub_servicos: formData.sub_servicos,
            auxiliares_ids: formData.auxiliares_ids,
            data: formData.data,
            hora_inicio: formData.hora_inicio,
            hora_fim: horaFim,
            allow_overlap: formData.allow_overlap,
            is_fixed: formData.is_fixed,
            recurrence_type: formData.is_fixed ? formData.recurrence_type : null,
            recurrence_custom_day: (formData.is_fixed && formData.recurrence_type === 'CUSTOM') ? parseInt(formData.recurrence_custom_day) : null,
            replicate_to_future: formData.replicate_to_future,
          })
        });
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || 'Erro ao atualizar agendamento');

        const cleanSubs = formData.sub_servicos.filter(sub => typeof sub === 'string' ? sub.trim() !== '' : sub.id?.trim() !== '');

        setAgendamentos(prev => prev.map(a => {
          if (a.id === editingApptId) {
            return {
              ...a,
              cliente_id: formData.cliente_id,
              profissional_id: profIdFinal,
              servico_id: formData.servico_id,
              sub_servicos: cleanSubs,
              auxiliares_ids: formData.auxiliares_ids,
              data: formData.data,
              hora_inicio: formData.hora_inicio,
              hora_fim: horaFim,
              allow_overlap: formData.allow_overlap,
              is_fixed: formData.is_fixed,
              recurrence_type: formData.is_fixed ? formData.recurrence_type : null,
            };
          }
          if (
            formData.replicate_to_future &&
            a.cliente_id === formData.cliente_id &&
            a.data > formData.data &&
            a.status !== 'cancelado' &&
            (!profIdFinal || a.profissional_id === profIdFinal)
          ) {
            const [hFut, mFut] = a.hora_inicio.slice(0, 5).split(':').map(Number);
            const fimFut = new Date(2000, 0, 1, hFut, mFut + duracaoMin);
            const horaFimFut = `${String(fimFut.getHours()).padStart(2, '0')}:${String(fimFut.getMinutes()).padStart(2, '0')}`;
            return {
              ...a,
              servico_id: formData.servico_id,
              sub_servicos: cleanSubs,
              auxiliares_ids: formData.auxiliares_ids,
              hora_fim: horaFimFut,
            };
          }
          return a;
        }));

        setDataSelecionada(formData.data);
        setShowForm(false);
        setEditingApptId(null);
        setFormData({ cliente_id: '', profissional_id: '', servico_id: '', sub_servicos: [], auxiliares_ids: [], data: hoje, hora_inicio: '09:00', duracao_min: '', is_fixed: false, recurrence_type: 'WEEKLY', recurrence_custom_day: '', allow_overlap: false, replicate_to_future: false });
        setBuscaCliente('');
        setClienteDropdownAberto(false);
        setCadastrandoNovoCliente(false);
        if (resData.futuros_atualizados && resData.futuros_atualizados > 0) {
          alert(`Agendamento atualizado com sucesso!\nO serviço foi replicado para ${resData.futuros_atualizados} agendamento(s) futuro(s) deste cliente.`);
        } else {
          alert('Agendamento atualizado com sucesso!');
        }
        return;
      } catch (err: any) {
        console.error('Erro ao atualizar agendamento:', err);
        alert(`Erro ao atualizar no banco: ${err.message}`);
        return;
      }
    }

    try {
      const res = await fetch('/api/agendamentos/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: formData.cliente_id,
          profissional_id: profIdFinal,
          servico_id: formData.servico_id,
          sub_servicos: formData.sub_servicos,
          auxiliares_ids: formData.auxiliares_ids,
          data: formData.data,
          hora_inicio: formData.hora_inicio,
          hora_fim: horaFim,
          status: 'confirmado',
          canal: 'recepcao',
          is_fixed: formData.is_fixed,
          recurrence_type: formData.is_fixed ? formData.recurrence_type : null,
          recurrence_custom_day: (formData.is_fixed && formData.recurrence_type === 'CUSTOM') ? parseInt(formData.recurrence_custom_day) : null,
          allow_overlap: formData.allow_overlap
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar agendamento');

      const novoAgendamento: Agendamento = {
        id: data.agendamento?.id ?? Date.now().toString(36),
        cliente_id: formData.cliente_id,
        profissional_id: profIdFinal,
        servico_id: formData.servico_id,
        sub_servicos: formData.sub_servicos.filter(sub => typeof sub === 'string' ? sub.trim() !== '' : sub.id.trim() !== ''),
        auxiliares_ids: formData.auxiliares_ids,
        data: formData.data,
        hora_inicio: formData.hora_inicio,
        hora_fim: horaFim,
        status: 'confirmado',
        canal: 'recepcao',
        allow_overlap: formData.allow_overlap,
        criado_em: data.agendamento?.created_at ?? new Date().toISOString()
      };
      setAgendamentos(prev => [...prev, novoAgendamento]);
      setDataSelecionada(formData.data); // Navega automaticamente para o dia agendado
      setShowForm(false);
      setEditingApptId(null);
      setFormData({ cliente_id: '', profissional_id: '', servico_id: '', sub_servicos: [], auxiliares_ids: [], data: hoje, hora_inicio: '09:00', duracao_min: '', is_fixed: false, recurrence_type: 'WEEKLY', recurrence_custom_day: '', allow_overlap: false, replicate_to_future: false });
      setBuscaCliente('');
      setClienteDropdownAberto(false);
      setCadastrandoNovoCliente(false);
    } catch (err: any) {
      console.error('Erro ao salvar agendamento:', err);
      alert(`Erro ao salvar no banco: ${err.message}`);
    }
  };

  return (
    <div className="py-4">
      <SectionTitle title="Agenda do Salão" subtitle="Gerenciamento de horários e profissionais" align="left" />
      {isReadOnly && <ReadOnlyNotice modulo="Agenda" />}

      {/* Filtro por Categoria ou Card do Profissional Exclusivo */}
      <div className="mt-8 mb-4">
        {isRestrictedProfissional && meuProfissional ? (
          <div className="p-4 bg-gradient-to-r from-gold/15 via-[var(--color-card)] to-[var(--color-card)] border border-gold/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3.5">
              {meuProfissional.foto_url || meuProfissional.avatar_url ? (
                <img
                  src={meuProfissional.foto_url || meuProfissional.avatar_url || ''}
                  alt={meuProfissional.nome}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-gold shadow-md shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-gold/20 text-gold flex items-center justify-center font-extrabold text-xl border-2 border-gold/40 shadow-sm shrink-0">
                  {meuProfissional.nome.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-gold bg-gold/15 px-2.5 py-0.5 rounded-full border border-gold/30">
                    Sua Agenda Pessoal
                  </span>
                  <span className="text-xs font-semibold text-foreground/70 flex items-center gap-1">
                    {getCategoriaProfissional(meuProfissional) === 'Unhas' ? '💅 Unhas' : '✂️ Cabelo'}
                  </span>
                </div>
                <h2 className="text-lg font-black text-foreground mt-0.5 tracking-tight">
                  {meuProfissional.nome}
                </h2>
                <p className="text-xs text-foreground/60">
                  Visualização individual de atendimentos e horários do salão
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 self-end sm:self-auto bg-black/10 dark:bg-white/5 border border-[var(--border-subtle)] px-4 py-2.5 rounded-xl">
              <CalendarDays size={18} className="text-gold" />
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-foreground/50 tracking-wider">Atendimentos no Dia</div>
                <div className="text-base font-mono font-black text-gold">
                  {agendamentosFiltrados.length} {agendamentosFiltrados.length === 1 ? 'cliente' : 'clientes'}
                </div>
              </div>
            </div>
          </div>
        ) : isAuxiliarCabelo ? (
          <div className="p-4 bg-gradient-to-r from-amber-500/15 via-[var(--color-card)] to-[var(--color-card)] border border-amber-500/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-extrabold text-xl border-2 border-amber-500/40 shadow-sm shrink-0">
                <Sparkles size={26} className="text-amber-500" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-500 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                    Acesso Auxiliar • Sessão Cabelo
                  </span>
                  <span className="text-xs font-semibold text-foreground/70 flex items-center gap-1">
                    ✂️ Toda Equipe de Cabelo
                  </span>
                </div>
                <h2 className="text-lg font-black text-foreground mt-0.5 tracking-tight">
                  {currentUser?.user_metadata?.full_name || meuProfissional?.nome || 'Auxiliar do Salão'}
                </h2>
                <p className="text-xs text-foreground/60">
                  Agenda unificada para auxílio e suporte aos procedimentos da sessão de Cabelo
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <User2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none" />
                <select
                  value={profFiltro}
                  onChange={(e) => setProfFiltro(e.target.value)}
                  className="w-full bg-[var(--color-card)] border border-amber-500/40 focus:border-amber-500 rounded-xl pl-10 pr-10 py-2.5 text-xs font-bold text-foreground appearance-none shadow-sm cursor-pointer transition-colors"
                >
                  <option value="todos">Todos os Profissionais (Cabelo) ({profissionais.length})</option>
                  {profissionais.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-foreground/50">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Seletor de Categoria */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground/50 mr-1 flex items-center gap-1">
                <Sparkles size={13} className="text-gold" /> Categoria:
              </span>
              <div className="inline-flex p-1 bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-xl gap-1 shadow-sm">
                <button
                  onClick={() => handleCategoriaChange('todas')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    categoriaFiltro === 'todas'
                      ? 'bg-gold text-background shadow'
                      : 'text-foreground/70 hover:text-foreground hover:bg-white/5'
                  }`}
                >
                  <span>Todos os Atendimentos</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    categoriaFiltro === 'todas' ? 'bg-black/20 text-background' : 'bg-foreground/10 text-foreground/60'
                  }`}>
                    {countPorCategoria.todas || 0}
                  </span>
                </button>
                <button
                  onClick={() => handleCategoriaChange('Cabelo')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    categoriaFiltro === 'Cabelo'
                      ? 'bg-gold text-background shadow'
                      : 'text-foreground/70 hover:text-foreground hover:bg-white/5'
                  }`}
                >
                  <span>Cabelo</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    categoriaFiltro === 'Cabelo' ? 'bg-black/20 text-background' : 'bg-foreground/10 text-foreground/60'
                  }`}>
                    {countPorCategoria.Cabelo || 0}
                  </span>
                </button>
                <button
                  onClick={() => handleCategoriaChange('Unhas')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    categoriaFiltro === 'Unhas'
                      ? 'bg-gold text-background shadow'
                      : 'text-foreground/70 hover:text-foreground hover:bg-white/5'
                  }`}
                >
                  <span>Unhas</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    categoriaFiltro === 'Unhas' ? 'bg-black/20 text-background' : 'bg-foreground/10 text-foreground/60'
                  }`}>
                    {countPorCategoria.Unhas || 0}
                  </span>
                </button>
              </div>
            </div>

            {/* Filtro Profissionais (Select) */}
            <div className="relative w-full max-w-md">
              <User2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gold pointer-events-none" />
              <select
                value={profFiltro}
                onChange={(e) => setProfFiltro(e.target.value)}
                className="w-full bg-[var(--color-card)] border border-[var(--border-subtle)] focus:border-gold rounded-xl pl-10 pr-10 py-3 text-sm font-bold text-foreground appearance-none shadow-sm cursor-pointer transition-colors hover:border-gold/50"
              >
                <option value="todos" className="font-bold">
                  {categoriaFiltro === 'todas' ? 'Todos os Profissionais' : `Todos (${categoriaFiltro})`} ({profissionaisFiltradosPorCategoria.length})
                </option>
                {profissionaisFiltradosPorCategoria.map(p => {
                  const cat = getCategoriaProfissional(p);
                  return (
                    <option key={p.id} value={p.id} className="font-medium">
                      {p.nome} — {cat === 'Unhas' ? 'Unhas' : 'Cabelo'}
                    </option>
                  );
                })}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-foreground/50">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controles de Busca / Filtros */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="flex bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-lg p-1">
            <input
              type="date"
              value={dataSelecionada}
              onChange={(e) => setDataSelecionada(e.target.value)}
              onClick={(e) => {
                if (typeof (e.target as any).showPicker === 'function') {
                  (e.target as any).showPicker();
                }
              }}
              className="bg-transparent px-3 py-1.5 text-sm text-foreground focus:outline-none cursor-pointer w-full font-medium"
            />
          </div>
          {dataSelecionada !== hoje && (
            <button
              onClick={() => setDataSelecionada(hoje)}
              className="bg-gold/10 text-gold border border-gold/20 hover:bg-gold hover:text-background transition-colors text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg h-[38px]"
              title="Ir para hoje"
            >
              Hoje
            </button>
          )}
        </div>

        {/* Busca rápida por cliente na agenda */}
        <div className="relative w-full sm:w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none" />
          <input
            type="text"
            value={buscaClienteAgenda}
            onChange={e => setBuscaClienteAgenda(e.target.value)}
            placeholder="Buscar cliente na agenda..."
            className="w-full bg-[var(--color-card)] border border-[var(--border-subtle)] focus:border-gold rounded-lg pl-9 pr-8 py-2 text-xs text-foreground placeholder:text-foreground/40 focus:outline-none transition-colors shadow-sm"
          />
          {buscaClienteAgenda && (
            <button
              onClick={() => setBuscaClienteAgenda('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground p-0.5"
              title="Limpar filtro"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Controles de Visualização: Densidade (Quadrado vs Largo) e Modo (Dia vs Semana) */}
        <div className="sm:ml-auto flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Seletor de Densidade dos Cards dos Profissionais */}
          <div className="inline-flex p-1 bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-lg gap-1 shadow-xs" title="Ajuste a largura dos cards dos profissionais">
            <button
              type="button"
              onClick={() => handleMudarDensidade('expandida')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                densidade === 'expandida'
                  ? 'bg-gold text-background shadow-xs font-extrabold'
                  : 'text-foreground/70 hover:text-foreground hover:bg-foreground/5'
              }`}
              title="Cards mais largos: espaço confortável para ver opções, insumos e clientes sem espremer"
            >
              <Columns3 size={13} />
              <span>Cards Largos</span>
            </button>
            <button
              type="button"
              onClick={() => handleMudarDensidade('compacta')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                densidade === 'compacta'
                  ? 'bg-gold text-background shadow-xs font-extrabold'
                  : 'text-foreground/70 hover:text-foreground hover:bg-foreground/5'
              }`}
              title="Cards médios: formato equilibrado para ver mais colunas"
            >
              <LayoutGrid size={13} />
              <span>Cards Médios</span>
            </button>
          </div>

          <ViewToggle 
            options={[
              { id: 'dia', label: 'Dia' },
              { id: 'semana', label: 'Semana' },
            ]}
            selectedId={viewMode} 
            onChange={setViewMode} 
          />
          <Button 
            variant="outline"
            onClick={handleDispararLembretesHoje}
            disabled={disparandoLembretes}
            className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 flex items-center gap-1.5 text-xs font-bold"
            title="Dispara mensagens de lembrete pelo WhatsApp para todos os clientes agendados para hoje"
          >
            <Bell size={14} className={disparandoLembretes ? 'animate-bounce' : 'text-amber-400'} />
            <span className="hidden sm:inline">{disparandoLembretes ? 'Disparando...' : 'Lembretes de Hoje'}</span>
          </Button>
          {!isReadOnly && (
            <Button 
              variant="primary" 
              onClick={() => {
                abrirFormNovo();
              }}
            >
              + Novo Agendamento
            </Button>
          )}
        </div>
      </div>

      {/* Indicador de filtro ativo por cliente */}
      {buscaClienteAgenda.trim() && (
        <div className="mb-4 px-3.5 py-2.5 bg-gold/10 border border-gold/30 rounded-xl flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2 text-foreground">
            <Search size={14} className="text-gold shrink-0" />
            <span>
              Filtrando agenda por cliente: <strong className="text-gold">"{buscaClienteAgenda}"</strong>{' '}
              <span className="text-foreground/60 font-mono">
                ({agendamentosFiltrados.length} {agendamentosFiltrados.length === 1 ? 'horário encontrado' : 'horários encontrados'})
              </span>
            </span>
          </div>
          <button
            onClick={() => setBuscaClienteAgenda('')}
            className="text-xs font-bold text-gold hover:underline flex items-center gap-1 shrink-0 ml-2"
          >
            <X size={13} /> Limpar
          </button>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-foreground/50">Carregando horários...</div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {/* Bloqueios do Dia */}
          {bloqueiosFiltrados.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
              <h4 className="text-amber-500 font-bold text-sm mb-2 flex items-center gap-2">
                <AlertCircle size={16} /> Bloqueios de Horário
              </h4>
              <div className="flex flex-wrap gap-2">
                {bloqueiosFiltrados.map((b) => (
                  <span key={b.id} className="text-xs bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-md">
                    {getProfissionalNome(b.profissional_id, profissionais)}: {b.data_inicio.includes('T') ? b.data_inicio.slice(11, 16) : b.data_inicio} - {b.data_fim.includes('T') ? b.data_fim.slice(11, 16) : b.data_fim} ({b.motivo})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Legenda de Fluxo por Cores da Agenda */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-3.5 py-2.5 bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-xl shadow-xs text-xs mb-1">
            <span className="font-bold text-foreground/60 uppercase tracking-wider text-[10px] flex items-center gap-1.5 mr-1">
              <Sparkles size={13} className="text-gold" /> Fluxo da Agenda:
            </span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 shadow-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 border border-slate-400"></span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">Agendado</span>
              <span className="text-[10px] text-foreground/40 font-mono hidden md:inline">(Fundo Branco)</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#fefce8] dark:bg-amber-950/25 border border-amber-300/80 dark:border-amber-600/40 shadow-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <span className="font-bold text-amber-950 dark:text-amber-200 text-[11px]">Pra Atender</span>
              <span className="text-[10px] text-amber-700/60 dark:text-amber-300/60 font-mono hidden md:inline">(Amarelo)</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#f0fdf4] dark:bg-emerald-950/25 border border-emerald-300/80 dark:border-emerald-600/40 shadow-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="font-bold text-emerald-950 dark:text-emerald-200 text-[11px]">Em Atendimento</span>
              <span className="text-[10px] text-emerald-700/60 dark:text-emerald-300/60 font-mono hidden md:inline">(Verde)</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#eff6ff] dark:bg-blue-950/25 border border-blue-300/80 dark:border-blue-600/40 shadow-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span className="font-bold text-blue-950 dark:text-blue-200 text-[11px]">Pagamento / Caixa</span>
              <span className="text-[10px] text-blue-700/60 dark:text-blue-300/60 font-mono hidden md:inline">(Azul)</span>
            </div>
          </div>

          {/* Agenda Kanban (Colunas por Profissional) */}
          <DragScrollX className="w-full min-w-0 border border-[var(--border-subtle)] rounded-xl bg-[var(--color-card)] shadow-sm">
            {profissionaisVisiveisNaAgenda.length === 0 ? (
              <div className="p-12 text-center text-foreground/60">
                <p className="text-base font-semibold">
                  {isRestrictedProfissional
                    ? (meuProfissional ? 'Nenhum agendamento ativo na sua agenda.' : 'Seu usuário profissional não possui vínculo com um profissional ativo no sistema. Contate o administrador.')
                    : `Nenhum profissional encontrado na categoria "${categoriaFiltro}".`}
                </p>
                {!isRestrictedProfissional && (
                  <>
                    <p className="text-xs text-foreground/40 mt-1">Selecione "Todos os Atendimentos" ou cadastre um novo profissional na aba Profissionais.</p>
                    <button
                      onClick={() => { setCategoriaFiltro('todas'); setProfFiltro('todos'); }}
                      className="mt-4 px-4 py-2 bg-gold/15 text-gold hover:bg-gold hover:text-background font-bold text-xs rounded-lg transition-colors inline-block"
                    >
                      Ver todos os profissionais
                    </button>
                  </>
                )}
              </div>
            ) : (
            <div className="flex min-h-[600px] w-max min-w-full">
              {profissionaisVisiveisNaAgenda.map(prof => {
                const isAgnaldo = (prof.nome || '').toLowerCase().includes('agnaldo') || prof.id === 'agnaldo';
                const interval = isAgnaldo ? 20 : 30;

                const [ano, mes, dia] = dataSelecionada.split('-').map(Number);
                const dataObj = new Date(ano, mes - 1, dia);
                const diaSemana = dataObj.getDay();
                
                const horariosSalao = typeof window !== 'undefined' ? obterHorariosSalao() : DEFAULT_HORARIOS_SALAO;
                const infoSalao = horariosSalao[diaSemana] || DEFAULT_HORARIOS_SALAO[diaSemana];
                
                let profInicio = infoSalao?.inicio || '09:00';
                let profFim = infoSalao?.fim || '19:00';
                let profAtende = false;
                
                const jornadaProf = prof.jornada_semanal;
                let intInicio = '';
                let intFim = '';

                if (jornadaProf) {
                  const chaveStr = DIAS_CHAVE[diaSemana];
                  const cfgDia = jornadaProf[diaSemana] || (chaveStr ? jornadaProf[chaveStr] : undefined);
                  if (cfgDia) {
                    if (cfgDia.ativo !== false) {
                      profAtende = true;
                      profInicio = cfgDia.inicio || profInicio;
                      profFim = cfgDia.fim || profFim;
                      intInicio = cfgDia.intervalo_inicio || '';
                      intFim = cfgDia.intervalo_fim || '';
                    } else {
                      profAtende = false;
                    }
                  } else if (infoSalao.aberto) {
                    profAtende = true;
                  }
                } else if (infoSalao.aberto) {
                  profAtende = true;
                }

                const slots: string[] = [];
                if (profAtende) {
                  const [hIni, mIni] = profInicio.split(':').map(Number);
                  const [hFim, mFim] = profFim.split(':').map(Number);
                  const totalMinutosIni = hIni * 60 + mIni;
                  const totalMinutosFim = hFim * 60 + mFim;
                  
                  let totalIntIni = -1;
                  let totalIntFim = -1;
                  if (intInicio && intFim) {
                    const [hiI, miI] = intInicio.split(':').map(Number);
                    totalIntIni = hiI * 60 + miI;
                    const [hiF, miF] = intFim.split(':').map(Number);
                    totalIntFim = hiF * 60 + miF;
                  }

                  for (let m = totalMinutosIni; m < totalMinutosFim; m += interval) {
                    if (totalIntIni > -1 && m >= totalIntIni && m < totalIntFim) {
                      continue;
                    }
                    const hStr = String(Math.floor(m / 60)).padStart(2, '0');
                    const minStr = String(m % 60).padStart(2, '0');
                    slots.push(`${hStr}:${minStr}`);
                  }
                }

                return (
                  <div 
                    key={prof.id} 
                    className={`flex-1 ${
                      densidade === 'compacta' 
                        ? 'min-w-[290px] sm:min-w-[310px] md:min-w-[330px]' 
                        : 'min-w-[350px] sm:min-w-[390px] md:min-w-[430px]'
                    } border-r border-[var(--border-subtle)] last:border-0 flex flex-col bg-black/5 transition-all`}
                  >
                    {/* Cabeçalho do Profissional (Card do Profissional) */}
                    <div className={`border-b border-[var(--border-subtle)] bg-[var(--color-card)] sticky top-14 md:top-0 z-20 shadow-[0_4px_12px_-8px_rgba(0,0,0,0.25)] transition-all ${
                      densidade === 'compacta'
                        ? 'p-2.5 flex items-center gap-2.5'
                        : 'p-3 flex items-center gap-3'
                    }`}>
                      <div className="relative shrink-0 inline-block">
                        {prof.foto_url ? (
                          <img 
                            src={prof.foto_url} 
                            alt={prof.nome} 
                            className={`rounded-full object-cover border-2 border-gold/50 shadow-xs shrink-0 ${
                              densidade === 'compacta' ? 'w-9 h-9' : 'w-10 h-10'
                            }`} 
                          />
                        ) : (
                          <div className={`rounded-full bg-gold/10 border-2 border-gold/20 flex items-center justify-center shadow-xs shrink-0 ${
                            densidade === 'compacta' ? 'w-9 h-9' : 'w-10 h-10'
                          }`}>
                            <User2 size={densidade === 'compacta' ? 16 : 20} className="text-gold" />
                          </div>
                        )}
                        <span 
                          className="absolute -bottom-1 -right-1 text-[8px] px-1 py-0.2 rounded-full bg-gold text-white font-extrabold shadow-xs leading-none"
                          title={getCategoriaProfissional(prof)}
                        >
                          {getCategoriaProfissional(prof) === 'Unhas' ? '💅' : '✂️'}
                        </span>
                      </div>

                      <div className="w-full min-w-0 text-left">
                        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                          <span className="font-bold text-foreground text-xs uppercase tracking-tight truncate leading-tight" title={prof.nome}>
                            {prof.nome}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-gold/15 text-gold font-bold shrink-0">
                            {getCategoriaProfissional(prof) === 'Unhas' ? 'Unhas' : 'Cabelo'}
                          </span>
                        </div>
                        <div className="text-[9px] text-foreground/50 mt-0.5 truncate font-medium">
                          {profAtende ? `${profInicio} às ${profFim}` : 'Não atende'}
                          {intInicio && ` (Pausa: ${intInicio}-${intFim})`}
                        </div>
                      </div>
                    </div>

                    {/* Slots */}
                    <div className="flex flex-col p-1.5 gap-1.5 h-full relative">
                      {!profAtende && (
                        <div className="absolute inset-0 flex items-center justify-center text-foreground/30 text-xs font-mono bg-[var(--background)]">
                          INDISPONÍVEL
                        </div>
                      )}
                      {profAtende && slots.length === 0 && (
                        <div className="text-center text-xs text-foreground/50 mt-4">Nenhum horário disponível.</div>
                      )}
                      
                      {profAtende && slots.map(time => {
                        const slotMin = timeToMinutes(time);

                        // Agendamentos que INICIAM exatamente neste slot (Titular ou Auxiliar)
                        const startingAppts = agendamentosFiltrados.filter(
                          a => (a.profissional_id === prof.id || (Array.isArray(a.auxiliares_ids) && a.auxiliares_ids.includes(prof.id))) && a.hora_inicio === time && a.status !== 'cancelado'
                        );

                        // Agendamentos em ANDAMENTO (iniciaram antes e terminam depois deste slot)
                        const ongoingAppts = agendamentosFiltrados.filter(a => {
                          const isEnvolvido = a.profissional_id === prof.id || (Array.isArray(a.auxiliares_ids) && a.auxiliares_ids.includes(prof.id));
                          if (!isEnvolvido || a.status === 'cancelado') return false;
                          const aInicioMin = timeToMinutes(a.hora_inicio);
                          const aFimMin = timeToMinutes(getAgendamentoHoraFim(a, servicos));
                          return aInicioMin < slotMin && aFimMin > slotMin;
                        });

                        const temAgendamento = startingAppts.length > 0 || ongoingAppts.length > 0;
                        
                        return (
                          <div key={time} className={`flex border border-[var(--border-subtle)] rounded-lg bg-[var(--background)] shadow-sm ${
                            densidade === 'compacta' ? 'min-h-[64px]' : 'min-h-[74px]'
                          } group relative overflow-hidden transition-colors hover:border-gold/30`}>
                            {/* Left Time label */}
                            <div className={`${
                              densidade === 'compacta' ? 'w-11 text-[11px]' : 'w-13 text-[12px]'
                            } bg-black/5 border-r border-[var(--border-subtle)] flex items-center justify-center font-mono font-bold text-foreground/70 shrink-0`}>
                              {time}
                            </div>
                            
                            {/* Appts or Add */}
                            <div className="flex-1 p-1 flex flex-col justify-center relative gap-1 min-w-0">
                              {!temAgendamento ? (
                                !isReadOnly ? (
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/5 cursor-pointer" onClick={() => abrirFormNovo(time, prof.id)}>
                                    <span className="text-[10px] text-gold/80 hover:text-gold uppercase font-bold tracking-wider px-2 py-1 bg-gold/10 rounded">
                                      + Agendar
                                    </span>
                                  </div>
                                ) : null
                              ) : (
                                <>
                                  {startingAppts.map(a => {
                                    const cliente = getClienteNome(a.cliente_id, clientes);
                                    let servico = getServicoNome(a.servico_id, servicos);
                                    if (a.sub_servicos && a.sub_servicos.length > 0) {
                                      const subNomes = a.sub_servicos.map(sub => getServicoNome(typeof sub === 'string' ? sub : sub.id, servicos));
                                      servico += ' + ' + subNomes.join(' + ');
                                    }
                                    const horaFimDisplay = getAgendamentoHoraFim(a, servicos);
                                    const isAuxiliarNeste = a.profissional_id !== prof.id && Array.isArray(a.auxiliares_ids) && a.auxiliares_ids.includes(prof.id);
                                    const estilo = getEstiloProcesso(a.status);

                                    return (
                                      <div 
                                        key={a.id} 
                                        onClick={() => setSelectedAppt(a)}
                                        className={`text-xs border rounded-lg ${
                                          densidade === 'compacta' ? 'p-2' : 'p-2.5'
                                        } cursor-pointer hover:shadow-md hover:brightness-[0.98] transition-all relative overflow-hidden h-full flex flex-col justify-center min-w-0 ${estilo.cardClass}`}
                                      >
                                        <div 
                                          className="absolute left-0 top-0 bottom-0 w-1.5" 
                                          style={{ backgroundColor: isAuxiliarNeste ? '#C5A059' : estilo.barColor }}
                                        />
                                        <div className="pl-2">
                                          {isAuxiliarNeste && (
                                            <div className="flex items-center gap-1 text-[9px] font-bold text-foreground bg-gold/15 px-1.5 py-0.5 rounded border border-gold/30 mb-1 w-fit shrink-0 whitespace-nowrap">
                                              <Users size={10} className="text-gold" />
                                              <span>Auxiliar de {getProfissionalNome(a.profissional_id, profissionais)}</span>
                                            </div>
                                          )}
                                          <div className="flex items-center justify-between gap-1.5">
                                            <span className={`font-bold truncate leading-tight text-xs ${estilo.textCliente}`} title={cliente}>
                                              {cliente}
                                            </span>
                                            <div className="flex items-center gap-1 shrink-0">
                                              {a.allow_overlap && !isReadOnly && (
                                                <button
                                                  type="button"
                                                  title="Encaixar cliente neste horário (Pausa/Encaixe)"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    abrirFormNovo(time, prof.id, true);
                                                  }}
                                                  className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 hover:bg-gold hover:text-background text-foreground font-bold text-[10px] flex items-center gap-0.5 transition-all border border-foreground/20 shadow-xs cursor-pointer whitespace-nowrap shrink-0"
                                                >
                                                  <Plus size={11} className="stroke-[2.5]" />
                                                  <span>Encaixe</span>
                                                </button>
                                              )}
                                              <span className={`text-[10px] font-mono font-semibold whitespace-nowrap ${estilo.textHora}`}>{a.hora_inicio} - {horaFimDisplay}</span>
                                            </div>
                                          </div>
                                          <div className={`truncate text-[10px] font-medium leading-tight mt-1 ${estilo.servicoClass}`} title={servico}>
                                            {servico}
                                          </div>
                                          <div className="flex items-center justify-between mt-1.5 gap-1.5 flex-wrap">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border shadow-xs whitespace-nowrap shrink-0 ${estilo.badgeClass}`}>
                                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: estilo.dotColor }}></span>
                                                <span className="whitespace-nowrap">{estilo.label}</span>
                                              </div>
                                              {a.allow_overlap && (
                                                <span className="text-[8px] font-semibold text-gold/80 bg-gold/10 px-1.5 py-0.5 rounded border border-gold/20 whitespace-nowrap shrink-0">
                                                  Pausa liberada
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {ongoingAppts.map(a => {
                                    const cliente = getClienteNome(a.cliente_id, clientes);
                                    let servico = getServicoNome(a.servico_id, servicos);
                                    if (a.sub_servicos && a.sub_servicos.length > 0) {
                                      const subNomes = a.sub_servicos.map(sub => getServicoNome(typeof sub === 'string' ? sub : sub.id, servicos));
                                      servico += ' + ' + subNomes.join(' + ');
                                    }
                                    const horaFimDisplay = getAgendamentoHoraFim(a, servicos);
                                    const isAuxiliarNeste = a.profissional_id !== prof.id && Array.isArray(a.auxiliares_ids) && a.auxiliares_ids.includes(prof.id);
                                    const estilo = getEstiloProcesso(a.status);

                                    return (
                                      <div 
                                        key={`ongoing-${a.id}-${time}`} 
                                        onClick={() => setSelectedAppt(a)}
                                        className={`text-xs border border-dashed rounded-lg ${
                                          densidade === 'compacta' ? 'p-1.5' : 'p-2'
                                        } cursor-pointer transition-all shadow-xs relative overflow-hidden h-full flex flex-col justify-center hover:brightness-[0.97] min-w-0 ${estilo.ongoingClass}`}
                                        title={`Em andamento: ${cliente} (${a.hora_inicio} às ${horaFimDisplay}) - Status: ${estilo.label} - Clique para ver ou editar`}
                                      >
                                        <div 
                                          className="absolute left-0 top-0 bottom-0 w-1.5 opacity-70" 
                                          style={{ backgroundColor: isAuxiliarNeste ? '#C5A059' : estilo.barColor }}
                                        />
                                        <div className="pl-2">
                                          <div className="flex items-center justify-between gap-1.5">
                                            <span className={`font-semibold text-xs truncate leading-tight flex items-center gap-1 ${estilo.textCliente}`}>
                                              <span className="text-xs font-bold shrink-0" style={{ color: estilo.barColor }}>↳</span> <span className="truncate">{cliente}</span>
                                              {isAuxiliarNeste && (
                                                <span className="text-[9px] text-foreground font-bold bg-gold/15 px-1 rounded border border-gold/30 shrink-0">Auxiliar</span>
                                              )}
                                            </span>
                                            <div className="flex items-center gap-1 shrink-0">
                                              {a.allow_overlap && !isReadOnly && (
                                                <button
                                                  type="button"
                                                  title="Encaixar cliente neste horário (Pausa/Encaixe)"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    abrirFormNovo(time, prof.id, true);
                                                  }}
                                                  className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 hover:bg-gold hover:text-background text-foreground font-bold text-[10px] flex items-center gap-0.5 transition-all border border-foreground/20 shadow-xs cursor-pointer whitespace-nowrap shrink-0"
                                                >
                                                  <Plus size={11} className="stroke-[2.5]" />
                                                  <span>Encaixe</span>
                                                </button>
                                              )}
                                              <span className={`text-[10px] font-mono font-semibold whitespace-nowrap ${estilo.textHora}`}>{a.hora_inicio} às {horaFimDisplay}</span>
                                            </div>
                                          </div>
                                          <div className="flex items-center justify-between gap-1.5 mt-1 flex-wrap">
                                            <div className={`truncate text-[10px] font-medium ${estilo.servicoClass}`}>{servico}</div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                              <span 
                                                className={`text-[8px] font-bold uppercase px-1.5 py-0.2 rounded border whitespace-nowrap shrink-0 ${estilo.badgeClass}`}
                                              >
                                                {estilo.label}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </DragScrollX>
        </div>
      )}

      {/* Modal de Ações do Agendamento */}
      {selectedAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/[0.7] backdrop-blur-sm p-4">
          <CardGlass className="w-full max-w-sm p-6 animate-in fade-in zoom-in-95 max-h-[calc(100dvh-2rem)] flex flex-col">
            <div className="flex justify-between items-start mb-4 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-foreground mb-1">
                  {getClienteNome(selectedAppt.cliente_id, clientes)}
                </h3>
                <p className="text-sm text-gold">
                  {getServicoNome(selectedAppt.servico_id, servicos)}
                  {selectedAppt.sub_servicos && selectedAppt.sub_servicos.length > 0 && 
                    ' + ' + selectedAppt.sub_servicos.map(sub => getServicoNome(typeof sub === 'string' ? sub : sub.id, servicos)).join(' + ')
                  }
                </p>
              </div>
              <button onClick={() => setSelectedAppt(null)} className="text-foreground/50 hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            
            {/* Detalhes (rolável em telas baixas, para os botões de ação ficarem sempre visíveis) */}
            <div className="space-y-2 mb-4 text-sm text-foreground/80 flex-1 min-h-0 overflow-y-auto pr-1">
              <p><strong>Data:</strong> {new Date(`${selectedAppt.data}T12:00:00`).toLocaleDateString('pt-BR')}</p>
              <p><strong>Horário:</strong> {selectedAppt.hora_inicio} às {getAgendamentoHoraFim(selectedAppt, servicos)}</p>
              <p><strong>Profissional Titular:</strong> {getProfissionalNome(selectedAppt.profissional_id, profissionais)}</p>
              {selectedAppt.auxiliares_ids && selectedAppt.auxiliares_ids.length > 0 && (
                <div className="text-xs bg-foreground/[0.03] border border-[var(--border-subtle)] p-2.5 rounded-lg text-foreground space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5 text-foreground/80">
                    <Users size={13} className="text-gold" />
                    <span>Auxiliares Co-participantes:</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedAppt.auxiliares_ids.map(id => (
                      <span key={id} className="px-2 py-0.5 rounded bg-foreground/5 text-foreground text-[11px] font-semibold border border-[var(--border-subtle)]">
                        {getProfissionalNome(id, profissionais)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <strong>Status Atual:</strong>
                {(() => {
                  const est = getEstiloProcesso(selectedAppt.status);
                  return (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-bold border shadow-xs ${est.badgeClass}`}>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: est.dotColor }}></span>
                      <span>{est.label}</span>
                    </span>
                  );
                })()}
              </div>
              {selectedAppt.allow_overlap && (
                <div className="text-gold font-medium flex items-center gap-1.5 text-xs bg-gold/10 p-2 rounded-lg border border-gold/20">
                  <Sparkles size={14} className="shrink-0" />
                  <span>Permite sobreposição / encaixe durante pausas</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 shrink-0 pt-3 border-t border-[var(--border-subtle)]">
              {isReadOnly ? (
                <div className="text-center py-2.5 px-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-500">
                  Modo Somente Leitura — Edição e cancelamento desativados.
                </div>
              ) : (
                <>
                  {selectedAppt.status === 'pendente' && (
                    <Button variant="primary" onClick={() => { mudarStatus(selectedAppt.id, 'confirmado'); setSelectedAppt(null); }}>
                      <Check size={16} className="mr-2"/> Confirmar
                    </Button>
                  )}

                  <Button 
                    variant="outline" 
                    className="border-gold/40 text-gold hover:bg-gold/10 flex items-center justify-center gap-2"
                    onClick={() => abrirEdicao(selectedAppt)}
                  >
                    <Pencil size={15} /> Editar Agendamento
                  </Button>

                  {selectedAppt.status !== 'concluido' && selectedAppt.status !== 'cancelado' && selectedAppt.status !== 'no_show' && (
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <Button
                        variant="outline"
                        className="text-red-400 border-red-500/20 hover:bg-red-500/10 flex items-center justify-center gap-1.5"
                        onClick={() => {
                          const appt = selectedAppt;
                          setSelectedAppt(null);
                          abrirModalCancelar(appt);
                        }}
                      >
                        <Trash2 size={14} /> Cancelar
                      </Button>
                      <Button variant="outline" className="text-foreground/70 border-[var(--border-subtle)] hover:bg-foreground/5 font-semibold" onClick={() => { mudarStatus(selectedAppt.id, 'no_show'); setSelectedAppt(null); }}>
                        Faltou
                      </Button>
                    </div>
                  )}

                  {selectedAppt.status === 'cancelado' && (
                    <Button
                      variant="outline"
                      className="text-red-400 border-red-500/20 hover:bg-red-500/10 flex items-center justify-center gap-1.5 mt-1 text-xs"
                      onClick={() => {
                        const appt = selectedAppt;
                        setSelectedAppt(null);
                        abrirModalCancelar(appt);
                      }}
                    >
                      <Trash2 size={13} /> Opções de Cancelamento / Exclusão
                    </Button>
                  )}
                </>
              )}
            </div>
          </CardGlass>
        </div>
      )}

      {/* Modal de Cancelamento de Agendamento (com opção para atendimentos futuros) */}
      {apptParaCancelar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <CardGlass className="w-full max-w-lg p-6 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto border border-red-500/20 shadow-2xl">
            {/* Header */}
            <div className="flex justify-between items-start mb-4 border-b border-[var(--border-subtle)] pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Cancelar Agendamento</h3>
                  <p className="text-xs text-foreground/60">Selecione o escopo do cancelamento para a cliente</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApptParaCancelar(null)}
                className="text-foreground/40 hover:text-foreground p-1 rounded-lg hover:bg-foreground/5 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Resumo do Atendimento */}
            {(() => {
              const cli = clientes.find(c => c.id === apptParaCancelar.cliente_id);
              const serv = servicos.find(s => s.id === apptParaCancelar.servico_id);
              const prof = profissionais.find(p => p.id === apptParaCancelar.profissional_id);
              const dataFmt = apptParaCancelar.data.split('-').reverse().join('/');

              return (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-foreground/[0.03] border border-[var(--border-subtle)] space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-foreground">{cli?.nome || 'Cliente'}</span>
                      {apptParaCancelar.is_fixed && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gold/15 text-gold border border-gold/30">
                          Recorrente / Fixo
                        </span>
                      )}
                    </div>
                    <p className="text-foreground/70 flex items-center gap-2">
                      <CalendarDays size={13} className="text-foreground/40" />
                      <span>{dataFmt} às {apptParaCancelar.hora_inicio}</span>
                      <span>·</span>
                      <Scissors size={13} className="text-foreground/40" />
                      <span className="font-semibold text-foreground/90">{serv?.nome || 'Serviço'}</span>
                    </p>
                    {prof && (
                      <p className="text-foreground/50 text-[11px]">
                        Profissional: {prof.nome}
                      </p>
                    )}
                  </div>

                  {/* Informação sobre agendamentos futuros */}
                  {futurosCliente.loading ? (
                    <div className="py-4 text-center text-xs text-foreground/50 flex items-center justify-center gap-2">
                      <RefreshCw size={14} className="animate-spin text-gold" />
                      <span>Verificando agendamentos futuros da cliente...</span>
                    </div>
                  ) : futurosCliente.lista.length > 0 ? (
                    <div className="space-y-3">
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 space-y-2">
                        <div className="flex items-center gap-2 font-bold text-xs">
                          <AlertCircle size={15} className="shrink-0 text-amber-400" />
                          <span>Atenção: Cliente possui {futurosCliente.lista.length} agendamento(s) futuro(s)</span>
                        </div>
                        <p className="text-[11px] text-amber-200/80 leading-relaxed">
                          Além do atendimento de {dataFmt}, encontramos {futurosCliente.lista.length} data(s) futura(s) agendada(s) para esta cliente:
                        </p>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
                          {futurosCliente.lista.map((fut: any, idx: number) => {
                            const d = (fut.date || '').split('-').reverse().slice(0, 2).join('/');
                            const h = (fut.start_time || '').slice(0, 5);
                            return (
                              <span key={fut.id || idx} className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/30 border border-amber-500/20 text-amber-200">
                                {d} {h ? `às ${h}` : ''}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2 pt-1">
                        <label className="text-xs font-bold text-foreground/80 block">
                          O que você deseja fazer com a agenda desta cliente?
                        </label>

                        {/* Opção 1: Apenas o dia */}
                        <label
                          onClick={() => setModoCancelamento('apenas_dia')}
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            modoCancelamento === 'apenas_dia'
                              ? 'bg-amber-500/10 border-amber-500/50 text-foreground'
                              : 'bg-foreground/[0.02] border-[var(--border-subtle)] text-foreground/70 hover:bg-foreground/[0.04]'
                          }`}
                        >
                          <input
                            type="radio"
                            name="modoCancelamento"
                            checked={modoCancelamento === 'apenas_dia'}
                            onChange={() => setModoCancelamento('apenas_dia')}
                            className="mt-0.5 accent-gold"
                          />
                          <div className="text-xs space-y-0.5">
                            <p className="font-bold text-foreground">Cancelar apenas o atendimento deste dia ({dataFmt})</p>
                            <p className="text-[11px] text-foreground/55 leading-relaxed">
                              Cancela somente o agendamento selecionado. Os demais {futurosCliente.lista.length} agendamento(s) futuros permanecem confirmados na grade.
                            </p>
                          </div>
                        </label>

                        {/* Opção 2: Cancelar futuros */}
                        <label
                          onClick={() => setModoCancelamento('cancelar_futuros')}
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            modoCancelamento === 'cancelar_futuros'
                              ? 'bg-amber-500/10 border-amber-500/50 text-foreground'
                              : 'bg-foreground/[0.02] border-[var(--border-subtle)] text-foreground/70 hover:bg-foreground/[0.04]'
                          }`}
                        >
                          <input
                            type="radio"
                            name="modoCancelamento"
                            checked={modoCancelamento === 'cancelar_futuros'}
                            onChange={() => setModoCancelamento('cancelar_futuros')}
                            className="mt-0.5 accent-gold"
                          />
                          <div className="text-xs space-y-0.5">
                            <p className="font-bold text-foreground">Cancelar deste dia + cancelar atendimentos futuros</p>
                            <p className="text-[11px] text-foreground/55 leading-relaxed">
                              Altera o status deste dia e de todos os {futurosCliente.lista.length} agendamento(s) futuros para "Cancelado" no sistema.
                            </p>
                          </div>
                        </label>

                        {/* Opção 3: Excluir futuros da grade */}
                        <label
                          onClick={() => setModoCancelamento('excluir_futuros')}
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            modoCancelamento === 'excluir_futuros'
                              ? 'bg-red-500/10 border-red-500/50 text-foreground'
                              : 'bg-foreground/[0.02] border-[var(--border-subtle)] text-foreground/70 hover:bg-foreground/[0.04]'
                          }`}
                        >
                          <input
                            type="radio"
                            name="modoCancelamento"
                            checked={modoCancelamento === 'excluir_futuros'}
                            onChange={() => setModoCancelamento('excluir_futuros')}
                            className="mt-0.5 accent-red-500"
                          />
                          <div className="text-xs space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-red-400">Cancelar deste dia + EXCLUIR atendimentos futuros</p>
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-300">
                                Libera a agenda
                              </span>
                            </div>
                            <p className="text-[11px] text-foreground/55 leading-relaxed">
                              Cancela o atendimento de hoje e apaga/remove permanentemente todos os {futurosCliente.lista.length} agendamentos futuros da grade, liberando os horários dos profissionais.
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-foreground/[0.02] border border-[var(--border-subtle)] text-xs text-foreground/60 space-y-1">
                      <p className="font-semibold text-foreground/80">Nenhum agendamento futuro encontrado</p>
                      <p className="text-[11px]">Esta cliente não possui outros agendamentos cadastrados para datas posteriores.</p>
                    </div>
                  )}

                  {/* Opção para excluir o dia atual também */}
                  <label className="flex items-center gap-2 pt-2 border-t border-[var(--border-subtle)] text-xs text-foreground/75 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={excluirDiaAtual}
                      onChange={e => setExcluirDiaAtual(e.target.checked)}
                      className="rounded accent-red-500"
                    />
                    <span>Excluir também o atendimento de hoje da grade (ao invés de manter como "Cancelado")</span>
                  </label>

                  {/* Rodapé de Botões */}
                  <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setApptParaCancelar(null)}
                      disabled={processandoCancelamento}
                    >
                      Voltar
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      className="bg-red-600 hover:bg-red-700 text-white font-bold"
                      onClick={handleConfirmarCancelamento}
                      disabled={processandoCancelamento}
                    >
                      {processandoCancelamento ? (
                        <span className="flex items-center gap-2">
                          <RefreshCw size={14} className="animate-spin" /> Processando...
                        </span>
                      ) : modoCancelamento === 'excluir_futuros' ? (
                        'Confirmar e Excluir Futuros'
                      ) : modoCancelamento === 'cancelar_futuros' ? (
                        'Confirmar Cancelamento Geral'
                      ) : (
                        'Confirmar Cancelamento'
                      )}
                    </Button>
                  </div>
                </div>
              );
            })()}
          </CardGlass>
        </div>
      )}

      {/* Modal de Lançamento de Insumos em Tempo Real (Durante o Procedimento por Titular ou Auxiliar) */}
      {liveInsumoAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <CardGlass className="w-full max-w-2xl p-6 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto border border-[var(--border-subtle)] shadow-2xl">
            {/* Header */}
            <div className="flex justify-between items-start mb-4 border-b border-[var(--border-subtle)] pb-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-gold/15 text-gold border border-gold/30">
                    <Beaker size={22} />
                  </span>
                  <div>
                    <h3 className="text-xl font-bold font-serif text-foreground">
                      Lançamento de Produtos em Tempo Real
                    </h3>
                    <p className="text-xs text-foreground/60">
                      Registro de insumos aplicados etapa por etapa • Profissional Titular & Auxiliares
                    </p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setLiveInsumoAppt(null)} 
                className="text-foreground/50 hover:text-foreground p-1 rounded-lg hover:bg-foreground/5 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Resumo do Atendimento */}
            <div className="bg-foreground/[0.03] border border-[var(--border-subtle)] rounded-xl p-4 mb-5 flex flex-wrap items-center justify-between gap-3 text-sm">
              <div>
                <span className="text-[11px] text-foreground/50 uppercase font-semibold tracking-wider block">Cliente & Procedimento</span>
                <span className="font-bold text-foreground text-lg block">{getClienteNome(liveInsumoAppt.cliente_id, clientes)}</span>
                <span className="text-foreground/80 text-xs block font-medium mt-0.5">
                  {getServicoNome(liveInsumoAppt.servico_id, servicos)}
                  {liveInsumoAppt.sub_servicos && liveInsumoAppt.sub_servicos.length > 0 &&
                    ' + ' + liveInsumoAppt.sub_servicos.map(s => getServicoNome(typeof s === 'string' ? s : s.id, servicos)).join(' + ')
                  }
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-foreground/50 uppercase font-semibold tracking-wider block">Fundo de Insumos Acumulado</span>
                <span className="font-mono font-bold text-2xl text-foreground block">
                  R$ {Number(liveInsumoAppt.product_cost || 0).toFixed(2)}
                </span>
                <span className="text-[11px] text-foreground/60 block">
                  {(liveInsumoAppt.insumos_detalhes || []).length} aplicação(ões) registrada(s)
                </span>
              </div>
            </div>

            {/* Formulário de Nova Aplicação ou Edição */}
            <div className={`border rounded-xl p-4 mb-5 space-y-4 transition-all ${
              editingInsumoIndex !== null 
                ? 'bg-gold/10 border-gold/40 shadow-sm' 
                : 'bg-foreground/[0.02] border-[var(--border-subtle)]'
            }`}>
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                  {editingInsumoIndex !== null ? (
                    <>
                      <Pencil size={14} className="text-gold stroke-[2.5]" />
                      <span>Editando Insumo #{editingInsumoIndex + 1}</span>
                    </>
                  ) : (
                    <>
                      <Plus size={14} className="text-gold stroke-[2.5]" />
                      <span>Registrar Nova Aplicação no Procedimento</span>
                    </>
                  )}
                </h4>
                {editingInsumoIndex !== null && (
                  <button
                    type="button"
                    onClick={handleCancelarEdicaoInsumo}
                    className="text-[11px] text-foreground/60 hover:text-foreground font-semibold px-2 py-0.5 rounded hover:bg-foreground/5 transition-colors"
                  >
                    Cancelar Edição
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 1. Etapa */}
                <div>
                  <label className="text-xs font-semibold text-foreground/70 mb-1.5 block">
                    Etapa do Procedimento:
                  </label>
                  <select
                    className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:border-gold"
                    value={liveInsumoEtapa}
                    onChange={e => setLiveInsumoEtapa(e.target.value)}
                  >
                    <option value="Etapa 1 - Descoloração / Mechas">Etapa 1 - Descoloração / Mechas</option>
                    <option value="Etapa 2 - Tonalização / Matização">Etapa 2 - Tonalização / Matização</option>
                    <option value="Etapa 3 - Lavatório / Tratamento">Etapa 3 - Lavatório / Tratamento</option>
                    <option value="Etapa 4 - Escova / Modelagem">Etapa 4 - Escova / Modelagem</option>
                    <option value="Etapa 5 - Finalização / Óleos">Etapa 5 - Finalização / Óleos</option>
                    <option value="Outra">Outra etapa personalizada...</option>
                  </select>
                  {liveInsumoEtapa === 'Outra' && (
                    <input
                      type="text"
                      placeholder="Descreva a etapa (ex: Tonalizante extra)"
                      className="mt-2 w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2 text-xs text-foreground"
                      value={liveInsumoEtapaCustom}
                      onChange={e => setLiveInsumoEtapaCustom(e.target.value)}
                    />
                  )}
                </div>

                {/* 2. Quem aplicou (Titular + Auxiliares) */}
                <div>
                  <label className="text-xs font-semibold text-foreground/70 mb-1.5 block">
                    Profissional que Aplicou:
                  </label>
                  <select
                    className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:border-gold"
                    value={liveInsumoProfId}
                    onChange={e => setLiveInsumoProfId(e.target.value)}
                  >
                    <option value={liveInsumoAppt.profissional_id}>
                      ⭐ {getProfissionalNome(liveInsumoAppt.profissional_id, profissionais)} (Profissional Titular)
                    </option>
                    {Array.isArray(liveInsumoAppt.auxiliares_ids) && liveInsumoAppt.auxiliares_ids.map(aid => (
                      <option key={aid} value={aid}>
                        👥 {getProfissionalNome(aid, profissionais)} (Auxiliar)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. Seleção do Produto e Quantidade */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-7">
                  <label className="text-xs font-semibold text-foreground/70 mb-1.5 block">
                    Produto Utilizado (Estoque de Insumos):
                  </label>
                  <ProductSearchSelect
                    mode="procedure"
                    products={estoque.filter(p => p.allow_procedure_use && (p.stock_qty ?? 0) > 0)}
                    value={liveInsumoProdId}
                    onChange={(id) => setLiveInsumoProdId(id)}
                    placeholder="Digitar nome do produto do estoque..."
                  />
                </div>

                <div className="md:col-span-5">
                  <label className="text-xs font-semibold text-foreground/70 mb-1.5 flex justify-between">
                    <span>Quantidade:</span>
                    {liveInsumoProdId && liveInsumoQtd && (
                      <span className="text-gold font-mono font-bold">
                        Custo: R$ {(
                          (estoque.find(p => p.id === liveInsumoProdId)?.price_per_gram || 0.10) * 
                          (parseFloat(liveInsumoQtd) || 0)
                        ).toFixed(2)}
                      </span>
                    )}
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      placeholder="Qtd (g ou ml)"
                      className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-xs text-foreground font-mono focus:outline-none focus:border-gold"
                      value={liveInsumoQtd}
                      onChange={e => setLiveInsumoQtd(e.target.value)}
                    />
                    {editingInsumoIndex !== null && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-xs px-2.5 shrink-0 border border-[var(--border-subtle)]"
                        onClick={handleCancelarEdicaoInsumo}
                      >
                        Cancelar
                      </Button>
                    )}
                    <Button
                      variant="primary"
                      className="bg-gold hover:bg-gold-dim text-white shrink-0 px-4 text-xs font-bold shadow-sm"
                      onClick={handleRegistrarInsumoTempoReal}
                      disabled={liveInsumoLoading || !liveInsumoProdId || !liveInsumoQtd}
                    >
                      {liveInsumoLoading ? 'Salvando...' : (editingInsumoIndex !== null ? 'Salvar Edição' : '+ Aplicar')}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Botões Rápidos de Gramas */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="text-[11px] text-foreground/50">Atalhos rápidos:</span>
                {[10, 20, 30, 45, 60, 90, 120].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setLiveInsumoQtd(String(val))}
                    className="px-2.5 py-1 rounded bg-foreground/5 hover:bg-gold/15 hover:text-gold hover:border-gold/40 text-[11px] text-foreground/80 font-medium border border-foreground/10 transition-colors cursor-pointer"
                  >
                    +{val}g
                  </button>
                ))}
              </div>
            </div>

            {/* Lista dos Produtos já Aplicados neste Atendimento */}
            <div className="space-y-3 mb-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/70 flex items-center justify-between">
                <span>Insumos já aplicados neste procedimento</span>
                <span className="text-[11px] text-foreground/50 font-normal">
                  Total de {liveInsumoAppt.insumos_detalhes?.length || 0} produto(s)
                </span>
              </h4>

              {(!liveInsumoAppt.insumos_detalhes || liveInsumoAppt.insumos_detalhes.length === 0) ? (
                <div className="p-6 text-center border border-dashed border-[var(--border-subtle)] rounded-xl text-foreground/50 text-xs">
                  <Beaker size={26} className="mx-auto mb-2 opacity-30 text-foreground" />
                  Nenhum produto registrado ainda. Selecione a etapa e o produto acima para lançar no momento da aplicação.
                </div>
              ) : (
                <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden divide-y divide-[var(--border-subtle)] max-h-64 overflow-y-auto">
                  {liveInsumoAppt.insumos_detalhes.map((ins, idx) => {
                    const profNome = getProfissionalNome(ins.profissional_id || liveInsumoAppt.profissional_id, profissionais);
                    const isTitular = (ins.profissional_id || liveInsumoAppt.profissional_id) === liveInsumoAppt.profissional_id;
                    const isBeingEdited = editingInsumoIndex === idx;

                    return (
                      <div key={idx} className={`p-3 transition-colors flex items-center justify-between gap-3 text-xs ${
                        isBeingEdited 
                          ? 'bg-gold/15 border-l-4 border-l-gold' 
                          : 'bg-foreground/[0.015] hover:bg-foreground/[0.03]'
                      }`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="px-2 py-0.5 rounded bg-foreground/5 text-foreground font-semibold text-[10px] border border-[var(--border-subtle)]">
                              {ins.etapa || 'Procedimento'}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 ${
                              isTitular ? 'bg-gold/15 text-gold-dim dark:text-gold border border-gold/30' : 'bg-foreground/10 text-foreground border border-[var(--border-subtle)]'
                            }`}>
                              {isTitular ? <Sparkles size={10} /> : <Users size={10} />}
                              {profNome}
                            </span>
                            {ins.horario && (
                              <span className="text-[10px] text-foreground/40 font-mono flex items-center gap-1">
                                <Clock size={10} /> {ins.horario}
                              </span>
                            )}
                            {isBeingEdited && (
                              <span className="text-[10px] font-bold text-gold uppercase tracking-wider bg-gold/20 px-2 py-0.5 rounded">
                                Em edição
                              </span>
                            )}
                          </div>
                          <div className="font-bold text-foreground text-sm flex items-center gap-2">
                            <span>{ins.name}</span>
                            <span className="font-mono text-xs text-foreground/70 bg-foreground/5 px-1.5 py-0.5 rounded">
                              {ins.qty_used} {ins.unit}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0 flex items-center gap-2 sm:gap-3">
                          <div>
                            <div className="font-mono font-bold text-foreground text-sm">
                              R$ {Number(ins.custo_total || 0).toFixed(2)}
                            </div>
                            <div className="text-[10px] text-foreground/40">
                              R$ {Number(ins.price_per_gram || ins.custo_unitario || 0).toFixed(2)}/{ins.unit}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              title="Editar este insumo"
                              onClick={() => handleEditarInsumoTempoReal(idx)}
                              disabled={liveInsumoLoading}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isBeingEdited 
                                  ? 'text-gold bg-gold/25' 
                                  : 'text-foreground/50 hover:text-gold hover:bg-gold/10'
                              }`}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              title="Remover e estornar ao estoque"
                              onClick={() => handleRemoverInsumoTempoReal(idx)}
                              disabled={liveInsumoLoading}
                              className="p-1.5 text-foreground/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Aviso informativo e botão fechar */}
            <div className="bg-emerald-100/90 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 rounded-xl p-3.5 text-xs text-emerald-950 dark:text-emerald-100 flex items-start gap-2.5 mb-4 shadow-xs">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-700 dark:text-emerald-400 mt-0.5" />
              <span className="leading-relaxed">
                <strong className="text-emerald-900 dark:text-emerald-200 font-bold">Tudo sincronizado:</strong> A baixa no estoque é imediata. O atendimento continua em andamento normalmente e todos estes produtos já estarão pré-carregados quando a secretária abrir o Fechamento no Caixa.
              </span>
            </div>

            <button
              type="button"
              className="w-full py-3 text-sm font-bold bg-foreground text-background hover:bg-foreground/90 transition-all rounded-xl shadow-sm cursor-pointer"
              onClick={() => setLiveInsumoAppt(null)}
            >
              Concluir Lançamento da Etapa e Voltar para a Agenda
            </button>
          </CardGlass>
        </div>
      )}

      {/* Modal de Finalização (Checkout / Recebimento) */}
      {checkoutAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 overflow-y-auto">
          <CardGlass className="w-full max-w-5xl xl:max-w-6xl p-5 sm:p-7 animate-in fade-in zoom-in-95 my-auto max-h-[94vh] overflow-y-auto overflow-x-hidden border border-gold/40 shadow-2xl">
            <div className="flex justify-between items-start mb-6 pb-3 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <h3 className="text-xl sm:text-2xl font-bold font-serif text-foreground">Fechamento Prévio do Serviço (Secretaria)</h3>
                </div>
                <p className="text-xs sm:text-sm text-amber-500 font-medium mt-1">Envio para conferência e confirmação da Gestão Financeira</p>
              </div>
              <button onClick={fecharCheckout} className="text-foreground/50 hover:text-foreground p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                <X size={22} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* COLUNA ESQUERDA: Procedimentos, Insumos e Produtos */}
              <div className="lg:col-span-7 space-y-4 min-w-0">
                {/* Banner de Unificação Multi-Profissional da Cliente */}
              {agendamentosUnificadosIds.length > 1 && (
                <div className="p-3.5 bg-gold/10 border border-gold/30 rounded-xl flex items-start gap-3">
                  <div className="p-2 bg-gold/20 text-gold rounded-lg mt-0.5 shrink-0">
                    <Users size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Comanda Unificada Multi-Profissional</p>
                    <p className="text-xs text-foreground/80 mt-0.5">
                      Identificamos que <strong>{getClienteNome(checkoutAppt.cliente_id, clientes)}</strong> realizou {agendamentosUnificadosIds.length} procedimentos hoje com profissionais diferentes. Todos foram agrupados nesta comanda para cobrança e contabilização única na recepção!
                    </p>
                  </div>
                </div>
              )}

              {/* LISTA DE PROCEDIMENTOS REALIZADOS POR CADA PROFISSIONAL & DESCONTOS INDIVIDUAIS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Sparkles size={16} className="text-gold" />
                    Procedimentos Realizados pela Cliente
                  </h4>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gold/15 text-gold font-bold font-mono">
                    {checkoutProcedimentos.length} {checkoutProcedimentos.length === 1 ? 'procedimento' : 'procedimentos'}
                  </span>
                </div>

                <div className="space-y-3">
                  {checkoutProcedimentos.map((proc, pIdx) => {
                    const pNome = getProfissionalNome(proc.profissional_id, profissionais);
                    const sNome = proc.servico_nome || getServicoNome(proc.servico_id, servicos);
                    const temDesconto = proc.desconto_valor > 0;

                    return (
                      <div key={proc.id} className="p-3.5 bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl space-y-2.5 shadow-sm">
                        {/* Linha Topo: Serviço, Profissional Executor e Preço de Tabela */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <span className="w-6 h-6 rounded-full bg-gold/15 text-gold text-xs font-bold flex items-center justify-center shrink-0">
                              {pIdx + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-sm text-foreground truncate">{sNome}</p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                <span className="text-[11px] text-foreground/50">Executado por:</span>
                                <select
                                  value={proc.profissional_id}
                                  onChange={e => handleProcedimentoProfissional(proc.id, e.target.value)}
                                  className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded px-2 py-0.5 text-xs text-gold font-bold focus:outline-none focus:border-gold"
                                >
                                  {profissionais.filter(p => p.ativo).map(p => (
                                    <option key={p.id} value={p.id}>{p.nome}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                            <div className="text-right">
                              <p className="text-[10px] text-foreground/40 uppercase font-semibold">Tabela</p>
                              <p className={`font-mono text-sm font-bold ${temDesconto ? 'line-through text-foreground/40' : 'text-foreground'}`}>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proc.preco_tabela)}
                              </p>
                            </div>
                            {checkoutProcedimentos.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removerProcedimentoComanda(proc.id)}
                                className="p-1 rounded text-red-400 hover:bg-red-500/10 transition-colors"
                                title="Remover procedimento da comanda"
                              >
                                <X size={15} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* BLOCO DE DESCONTO INDIVIDUAL DO PROFISSIONAL NESTE PROCEDIMENTO */}
                        <div className="p-2.5 bg-foreground/[0.02] border border-border-subtle/70 rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 flex items-center gap-1">
                              <Tag size={12} /> Desconto do Profissional ({pNome}):
                            </span>
                            {temDesconto ? (
                              <span className="text-[11px] text-emerald-900 dark:text-emerald-300 font-mono font-bold bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-700/60">
                                -{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proc.desconto_valor)} ({proc.desconto_pct.toFixed(0)}%)
                              </span>
                            ) : (
                              <span className="text-[10px] text-foreground/40">Sem desconto aplicado</span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                            <div className="sm:col-span-3">
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="1"
                                  placeholder="0"
                                  value={proc.desconto_pct || ''}
                                  onChange={e => handleProcedimentoDescontoPct(proc.id, e.target.value)}
                                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded py-1 pl-2 pr-6 text-xs font-mono text-center focus:outline-none focus:border-emerald-500"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground/40 text-[10px] font-bold">%</span>
                              </div>
                            </div>

                            <div className="sm:col-span-4">
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-foreground/40 text-[10px] font-bold">R$</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  placeholder="0.00"
                                  value={proc.desconto_valor || ''}
                                  onChange={e => handleProcedimentoDescontoValor(proc.id, e.target.value)}
                                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded py-1 pl-7 pr-2 text-xs font-mono focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                            </div>

                            <div className="sm:col-span-5">
                              <input
                                type="text"
                                placeholder="Motivo (opcional, ex: Cliente fidelidade...)"
                                value={proc.desconto_motivo || ''}
                                onChange={e => handleProcedimentoDescontoMotivo(proc.id, e.target.value)}
                                className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded py-1 px-2 text-xs focus:outline-none focus:border-emerald-500 placeholder:text-foreground/30"
                              />
                            </div>
                          </div>

                          {/* Atalhos rápidos de % para este profissional */}
                          <div className="flex flex-wrap items-center gap-1 pt-0.5">
                            <span className="text-[10px] text-foreground/40 mr-1">Atalhos:</span>
                            {['0', '5', '10', '15', '20', '30'].map(pctVal => (
                              <button
                                key={pctVal}
                                type="button"
                                onClick={() => handleProcedimentoDescontoPct(proc.id, pctVal)}
                                className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                                  (pctVal === '0' && proc.desconto_pct === 0) || (proc.desconto_pct === parseFloat(pctVal))
                                    ? 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-400 dark:border-emerald-600 text-emerald-900 dark:text-emerald-200 font-bold'
                                    : 'border-[var(--border-subtle)] text-foreground/60 hover:text-foreground'
                                }`}
                              >
                                {pctVal === '0' ? 'Sem desc.' : `${pctVal}%`}
                              </button>
                            ))}
                          </div>

                          {/* Valor Final a Cobrar deste Procedimento */}
                          <div className="flex justify-between items-center pt-1 border-t border-[var(--border-subtle)] text-xs">
                            <span className="text-foreground/60">Subtotal deste procedimento:</span>
                            <span className="font-mono font-bold text-sm text-gold">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proc.valor_final)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ADICIONAR OUTRO PROCEDIMENTO / PROFISSIONAL */}
                <div className="p-3 bg-[var(--background)]/60 border border-dashed border-[var(--border-subtle)] rounded-xl space-y-2">
                  <p className="text-xs font-bold text-foreground/80 flex items-center gap-1.5">
                    <Plus size={14} className="text-gold" /> Adicionar Outro Procedimento / Profissional à Comanda:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-6">
                      <select
                        value={novoProcServicoId}
                        onChange={e => setNovoProcServicoId(e.target.value)}
                        className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2 text-xs focus:outline-none focus:border-gold"
                      >
                        <option value="">Selecione o serviço...</option>
                        {servicos.filter(s => s.ativo).map(s => (
                          <option key={s.id} value={s.id}>{s.nome} — R$ {s.preco.toFixed(2)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-4">
                      <select
                        value={novoProcProfId}
                        onChange={e => setNovoProcProfId(e.target.value)}
                        className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2 text-xs focus:outline-none focus:border-gold"
                      >
                        <option value="">Quem executou?</option>
                        {profissionais.filter(p => p.ativo).map(p => (
                          <option key={p.id} value={p.id}>{p.nome}</option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!novoProcServicoId || !novoProcProfId}
                        onClick={adicionarProcedimentoComanda}
                        className="w-full text-xs h-[34px] py-1 border-gold/40 text-gold hover:bg-gold/10"
                      >
                        Adicionar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* INSUMOS DO PROCEDIMENTO (Lançamento por Gramas / ml por Etapa e Profissional) */}
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Scale size={16} className="text-amber-700" />
                    Produtos Utilizados no Procedimento (Cobrança por Grama)
                  </h4>
                  {checkoutInsumos.length > 0 && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-950 font-bold border border-amber-300 font-mono">
                      {checkoutInsumos.length} {checkoutInsumos.length === 1 ? 'lançamento' : 'lançamentos'}
                    </span>
                  )}
                </div>

                <p className="text-xs text-foreground/70 font-medium">
                  Lançamento de cada produto consumido por etapa (ex: descoloração, tonalização, tratamento) e quem realizou. O custo por grama é calculado automaticamente.
                </p>

                {/* Formulário de Adicionar Insumo da Etapa */}
                <div className="p-3 bg-[var(--background)] border border-amber-500/30 rounded-lg space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-foreground/70 mb-1 block">Etapa do Serviço</label>
                      <input
                        type="text"
                        value={insumoEtapa}
                        onChange={e => setInsumoEtapa(e.target.value)}
                        placeholder="Ex: Etapa 1 - Mechas / Descoloração"
                        className="w-full bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-lg p-2 text-xs focus:outline-none focus:border-amber-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-foreground/70 mb-1 block">Profissional que Executou a Etapa</label>
                      <select
                        value={insumoProfissionalId}
                        onChange={e => setInsumoProfissionalId(e.target.value)}
                        className="w-full bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-lg p-2 text-xs focus:outline-none focus:border-amber-500 font-medium"
                      >
                        <option value={checkoutAppt.profissional_id}>
                          {getProfissionalNome(checkoutAppt.profissional_id, profissionais)} (Titular)
                        </option>
                        {(checkoutAppt.auxiliares_ids || []).map(aid => (
                          <option key={aid} value={aid}>
                            {getProfissionalNome(aid, profissionais)} (Auxiliar)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Atalhos de Etapas Frequentes */}
                  <div className="flex flex-wrap gap-1">
                    <span className="text-[10px] text-foreground/50 self-center mr-1 font-medium">Atalhos:</span>
                    {[
                      '1. Descoloração',
                      '2. Tonalização / Matização',
                      '3. Lavatório / Tratamento',
                      '4. Finalização / Escova'
                    ].map(etp => (
                      <button
                        key={etp}
                        type="button"
                        onClick={() => setInsumoEtapa(etp)}
                        className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                          insumoEtapa === etp 
                            ? 'bg-amber-100 text-amber-950 border-amber-400 font-bold'
                            : 'border-[var(--border-subtle)] text-foreground/70 hover:text-foreground font-medium'
                        }`}
                      >
                        {etp}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1 border-t border-[var(--border-subtle)]">
                    <div className="sm:col-span-7">
                      <label className="text-[11px] font-bold text-foreground/70 mb-1 block">Produto do Estoque</label>
                      <ProductSearchSelect
                        mode="procedure"
                        products={estoque.filter(p => p.active && (p.allow_procedure_use || !p.allow_sale) && (p.stock_qty ?? 0) > 0)}
                        value={insumoNovoProdutoId}
                        onChange={(id) => setInsumoNovoProdutoId(id)}
                        placeholder="Digitar nome do produto utilizado..."
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="text-[11px] font-bold text-foreground/70 mb-1 block">
                        Qtd. Usada ({estoque.find(e => e.id === insumoNovoProdutoId)?.unit || 'g/ml'})
                      </label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.5"
                        placeholder="Ex: 30"
                        value={insumoNovoQtdG}
                        onChange={e => setInsumoNovoQtdG(e.target.value)}
                        className="w-full bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-lg p-2 text-xs text-center focus:outline-none focus:border-amber-400 font-mono"
                      />
                    </div>

                    <div className="sm:col-span-2 flex items-end">
                      <button
                        type="button"
                        onClick={adicionarInsumoPorGrama}
                        disabled={!insumoNovoProdutoId || !insumoNovoQtdG}
                        className="w-full h-[34px] bg-amber-500 hover:bg-amber-400 text-background font-bold rounded-lg text-xs transition-colors disabled:opacity-40 flex items-center justify-center gap-1 shadow-sm"
                      >
                        <Plus size={14} /> Lançar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Lista de Produtos Lançados por Grama */}
                {checkoutInsumos.length > 0 ? (
                  <div className="space-y-2 mt-2">
                    {checkoutInsumos.map((ins, idx) => {
                      const profNome = getProfissionalNome(ins.profissional_id || '', profissionais);
                      const isTitular = ins.profissional_id === checkoutAppt.profissional_id;
                      return (
                        <div key={idx} className="flex justify-between items-center p-2.5 bg-[var(--background)] border border-amber-500/30 rounded-lg text-xs">
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                              <span className="font-bold text-foreground truncate">{ins.name}</span>
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-950 font-mono font-bold text-[10px] border border-amber-200">
                                {ins.qty_used} {ins.unit}
                              </span>
                              <span className="text-[10px] text-stone-500 font-mono font-medium">
                                (R$ {ins.price_per_gram.toFixed(4)}/{ins.unit})
                              </span>
                            </div>
                            <div className="text-[11px] text-foreground/60 flex flex-wrap items-center gap-2">
                              {ins.etapa && <span className="text-foreground/80 font-medium">📍 {ins.etapa}</span>}
                              {profNome && (
                                <span className={isTitular ? 'text-gold font-bold' : 'text-foreground/80 font-semibold'}>
                                  👤 {profNome} ({isTitular ? 'Titular' : 'Auxiliar'})
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-black font-mono text-amber-800 text-sm">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ins.custo_total)}
                            </span>
                            <button
                              type="button"
                              onClick={() => removerInsumoPorGrama(idx)}
                              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-500/10 transition-colors"
                              title="Remover este produto"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    <div className="p-2.5 bg-amber-500/15 border border-amber-500/40 rounded-lg flex items-center justify-between text-xs font-bold">
                      <span className="text-foreground/90 flex items-center gap-1.5">
                        <Beaker size={14} className="text-amber-700" />
                        Total Custo de Produtos do Atendimento:
                      </span>
                      <span className="text-amber-900 font-black font-mono text-sm">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(checkoutInsumos.reduce((acc, i) => acc + i.custo_total, 0))}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 text-center border border-dashed border-[var(--border-subtle)] rounded-lg text-xs text-foreground/40">
                    Nenhum produto lançado por grama ainda. Selecione o produto acima para registrar o custo da etapa.
                  </div>
                )}
              </div>

              {/* PRODUTOS DO SALÃO (Venda / Upsell / Balcão) */}
              <div className="p-4 bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <ShoppingBag size={16} className="text-gold" />
                    Produtos do Salão (Venda / Balcão)
                  </h4>
                  {checkoutProdutos.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gold/15 text-gold font-semibold">
                      {checkoutProdutos.length} {checkoutProdutos.length === 1 ? 'item' : 'itens'}
                    </span>
                  )}
                </div>

                {/* Lista de Produtos Adicionados */}
                {checkoutProdutos.length > 0 && (
                  <div className="space-y-2">
                    {checkoutProdutos.map((prod, idx) => {
                      const itemEstoque = estoque.find(e => e.id === prod.inventory_id);
                      const subOriginal = (prod.precoOriginal ?? prod.preco) * prod.qty;
                      const subFinal = prod.preco * prod.qty;
                      const temDesc = (prod.descontoValor != null && prod.descontoValor > 0) || subOriginal > subFinal;

                      return (
                        <div key={prod.id} className="flex justify-between items-center p-3 bg-gold/5 border border-gold/15 rounded-lg text-sm">
                          <div className="flex-1 min-w-0 pr-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground truncate">{itemEstoque?.name || 'Produto'}</span>
                              <span className="text-xs px-1.5 py-0.5 rounded bg-gold/15 text-gold font-mono">{prod.qty}x</span>
                            </div>
                            {temDesc ? (
                              <p className="text-xs text-foreground/50 mt-0.5 flex items-center gap-1.5">
                                <span className="line-through">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subOriginal)}</span>
                                <span className="text-emerald-800 dark:text-emerald-400 font-semibold">
                                  Desc: {prod.descontoPct ? `${prod.descontoPct.toFixed(0)}%` : ''} (-{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subOriginal - subFinal)})
                                </span>
                              </p>
                            ) : (
                              <p className="text-xs text-foreground/40 mt-0.5">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.preco)} un.
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-gold font-mono">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subFinal)}
                            </span>
                            <button
                              type="button"
                              onClick={() => setCheckoutProdutos(checkoutProdutos.filter((_, i) => i !== idx))}
                              className="text-red-400 hover:text-red-500 p-1 rounded hover:bg-red-500/10 transition-colors"
                              title="Remover produto"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Adicionar Produto no Checkout */}
                <div className="p-3 bg-foreground/[0.02] border border-[var(--border-subtle)] rounded-lg space-y-2.5">
                  <p className="text-xs font-semibold text-foreground/70">Adicionar produto ao atendimento:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-8">
                      <ProductSearchSelect
                        mode="sale"
                        products={estoque.filter(p => p.allow_sale && p.active && (p.stock_qty ?? 0) > 0)}
                        value={checkoutNovoProdId}
                        onChange={(pid) => {
                          setCheckoutNovoProdId(pid);
                          if (checkoutNovoProdDescPct) {
                            const p = estoque.find(x => x.id === pid);
                            const sub = (p?.sale_price || 0) * (Math.max(1, parseInt(checkoutNovoProdQty) || 1));
                            const pct = parseFloat(checkoutNovoProdDescPct) || 0;
                            const val = (sub * pct) / 100;
                            setCheckoutNovoProdDescValor(val > 0 ? val.toFixed(2) : '');
                          }
                        }}
                        placeholder="Digitar nome do produto para venda..."
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-foreground/50 whitespace-nowrap">Qtd:</span>
                        <input
                          type="number"
                          min="1"
                          value={checkoutNovoProdQty}
                          onChange={(e) => {
                            const q = e.target.value;
                            setCheckoutNovoProdQty(q);
                            if (checkoutNovoProdDescPct) {
                              const p = estoque.find(x => x.id === checkoutNovoProdId);
                              const sub = (p?.sale_price || 0) * (Math.max(1, parseInt(q) || 1));
                              const pct = parseFloat(checkoutNovoProdDescPct) || 0;
                              const val = (sub * pct) / 100;
                              setCheckoutNovoProdDescValor(val > 0 ? val.toFixed(2) : '');
                            }
                          }}
                          className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2 text-xs text-center focus:outline-none focus:border-gold font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Campos de Desconto do Produto adicionado */}
                  {checkoutNovoProdId && (() => {
                    const prodSel = estoque.find(p => p.id === checkoutNovoProdId);
                    const qSel = Math.max(1, parseInt(checkoutNovoProdQty) || 1);
                    const subItem = (prodSel?.sale_price || 0) * qSel;
                    const descValItem = Math.min(subItem, Math.max(0, parseFloat(checkoutNovoProdDescValor) || 0));
                    const totalItemFinal = Math.max(0, subItem - descValItem);

                    return (
                      <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] text-foreground/50 block mb-1">Desc. no Produto (%)</label>
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                placeholder="0"
                                value={checkoutNovoProdDescPct}
                                onChange={(e) => handleCheckoutNovoProdDescPct(e.target.value)}
                                className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg py-1.5 pl-2 pr-6 text-xs focus:outline-none focus:border-emerald-500 font-mono"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground/40 text-[10px] font-bold">%</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] text-foreground/50 block mb-1">Desc. no Produto (R$)</label>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-foreground/40 text-[10px] font-bold">R$</span>
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                placeholder="0.00"
                                value={checkoutNovoProdDescValor}
                                onChange={(e) => handleCheckoutNovoProdDescValor(e.target.value)}
                                className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg py-1.5 pl-7 pr-2 text-xs focus:outline-none focus:border-emerald-500 font-mono"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-xs pt-1">
                          <span className="text-foreground/60">
                            Total do item: <strong className="text-foreground font-mono">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalItemFinal)}</strong>
                            {descValItem > 0 && <span className="text-emerald-800 dark:text-emerald-400 ml-1.5 font-semibold">(-{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(descValItem)})</span>}
                          </span>
                          <Button
                            variant="primary"
                            size="sm"
                            type="button"
                            onClick={adicionarProdutoAoCheckout}
                            className="text-xs py-1 px-3"
                          >
                            <ShoppingBag size={12} className="mr-1" /> Adicionar
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* COLUNA DIREITA: Forma de Pagamento, Repartição Gestão e Resumo Financeiro */}
            <div className="lg:col-span-5 space-y-4 min-w-0 flex flex-col">
              {/* FORMA DE PAGAMENTO */}
              <div className="p-4 bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl space-y-3">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <CreditCard size={15} className="text-blue-400" />
                    Forma de Pagamento
                  </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                  {([
                    ['DINHEIRO', 'Dinheiro', Banknote, 'text-emerald-700 dark:text-emerald-400 border-emerald-400 dark:border-emerald-500/40'],
                    ['PIX', 'PIX', Smartphone, 'text-blue-700 dark:text-blue-400 border-blue-400 dark:border-blue-500/40'],
                    ['DEBITO', 'Débito', CreditCard, 'text-purple-800 dark:text-purple-300 border-purple-400 dark:border-purple-500/40'],
                    ['CREDITO', 'Crédito', CreditCard, 'text-amber-700 dark:text-amber-400 border-amber-400 dark:border-amber-500/40'],
                  ] as const).map(([val, label, Icon, cor]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => { setCheckoutPagamento(val); if (val !== 'CREDITO') setCheckoutParcelas(1); }}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 text-xs font-medium transition-all ${
                        checkoutPagamento === val
                          ? `${cor} bg-foreground/5`
                          : 'border-[var(--border-subtle)] text-foreground/50 hover:border-foreground/20'
                      }`}
                    >
                      <Icon size={18} />
                      {label}
                    </button>
                  ))}
                </div>
                
                {/* Parcelas — apenas para crédito */}
                {checkoutPagamento === 'CREDITO' && (
                  <div>
                    <p className="text-xs text-foreground/60 mb-2">Número de parcelas:</p>
                    <div className="flex flex-wrap gap-2">
                      {[1, 2, 3, 4, 5, 6, 10, 12].map(n => (
                        <button key={n} type="button"
                          onClick={() => setCheckoutParcelas(n)}
                          className={`w-10 h-10 rounded-lg text-sm font-bold border-2 transition-all ${
                            checkoutParcelas === n
                              ? 'border-amber-400 bg-amber-400/15 text-amber-400'
                              : 'border-[var(--border-subtle)] text-foreground/50 hover:border-foreground/20'
                          }`}
                        >
                          {n}x
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* TOTAL + REPARTIÇÃO MULTI-PROFISSIONAL DISCRIMINADA */}
              {(() => {
                const subtotalProcedimentosTabela = checkoutProcedimentos.reduce((sum, p) => sum + p.preco_tabela, 0);
                const totalDescontosProcedimentos = checkoutProcedimentos.reduce((sum, p) => sum + p.desconto_valor, 0);
                const totalProcedimentosLiquido = checkoutProcedimentos.reduce((sum, p) => sum + p.valor_final, 0);
                const totalInsumos = checkoutInsumos.reduce((acc, i) => acc + i.custo_total, 0);
                const totalProdutos = checkoutProdutos.reduce((acc, p) => acc + (p.preco * p.qty), 0);
                
                // O valor cobrado da cliente é a soma dos procedimentos líquidos + produtos de balcão
                const subtotalCobradoCliente = totalProcedimentosLiquido + totalProdutos;
                
                // Desconto global adicional (opcional, caso a gerência queira arredondar ou conceder extra)
                const valorDescontoGeral = Math.min(subtotalCobradoCliente, Math.max(0, parseFloat(checkoutDescontoValor) || 0));
                const totalCobradoClienteFinal = checkoutValorFinalManual !== ''
    ? Math.max(0, parseFloat(checkoutValorFinalManual.replace(',', '.')) || 0)
    : Math.max(0, subtotalCobradoCliente - valorDescontoGeral);
                const totalDescontosGerais = totalDescontosProcedimentos + valorDescontoGeral;
                
                const numParcelas = checkoutPagamento === 'CREDITO' ? checkoutParcelas : 1;
                const taxaMaq = calcularTaxaMaquininha(checkoutPagamento, numParcelas, totalCobradoClienteFinal, taxasPagamento);
                
                // === REPARTIÇÃO POR PROFISSIONAL INDIVIDUAL ===
                const porProfissional: Record<string, {
                  procedimentos: ProcedimentoComanda[];
                  subtotalTabela: number;
                  totalDesconto: number;
                  valorLiquido: number;
                  insumosCusto: number;
                  pctComissao: number;
                  comissaoEstimada: number;
                }> = {};

                checkoutProcedimentos.forEach(p => {
                  if (!porProfissional[p.profissional_id]) {
                    const regra = regrasComissao.find(r => r.professional_id === p.profissional_id && (r.service_id === p.servico_id || !r.service_id) && r.active);
                    const pct = regra?.commission_pct ?? 50;
                    porProfissional[p.profissional_id] = {
                      procedimentos: [],
                      subtotalTabela: 0,
                      totalDesconto: 0,
                      valorLiquido: 0,
                      insumosCusto: 0,
                      pctComissao: pct,
                      comissaoEstimada: 0,
                    };
                  }
                  porProfissional[p.profissional_id].procedimentos.push(p);
                  porProfissional[p.profissional_id].subtotalTabela += p.preco_tabela;
                  porProfissional[p.profissional_id].totalDesconto += p.desconto_valor;
                  porProfissional[p.profissional_id].valorLiquido += p.valor_final;
                });

                // Atribuir insumos a cada profissional
                checkoutInsumos.forEach(ins => {
                  const pid = ins.profissional_id || checkoutAppt.profissional_id;
                  if (porProfissional[pid]) {
                    porProfissional[pid].insumosCusto += ins.custo_total;
                  }
                });

                // Calcular comissão individual de cada profissional
                Object.keys(porProfissional).forEach(pid => {
                  const item = porProfissional[pid];
                  const baseComissao = Math.max(0, item.valorLiquido - item.insumosCusto);
                  item.comissaoEstimada = Number(((baseComissao * item.pctComissao) / 100).toFixed(2));
                });

                const comissaoTotalEquipe = Number(Object.values(porProfissional).reduce((sum, item) => sum + item.comissaoEstimada, 0).toFixed(2));
                const fundoReservaProdutos = Number(totalInsumos.toFixed(2));
                const margemProdutosVenda = totalProdutos > 0 ? (totalProdutos * 0.4) : 0;
                const faturamentoLiquidoSalao = Number(Math.max(0, totalProcedimentosLiquido - fundoReservaProdutos - comissaoTotalEquipe - (taxaMaq.valorTaxa || 0) + margemProdutosVenda).toFixed(2));

                return (
                  <div className="border-t border-[var(--border-subtle)] pt-4 space-y-4">
                    {/* DESCONTO GLOBAL ADICIONAL (OPCIONAL) */}
                    <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Percent size={14} className="text-emerald-700 dark:text-emerald-400" />
                          <span className="text-xs font-bold text-foreground">Desconto Geral Adicional na Conta <span className="text-foreground/40 font-normal">(opcional)</span></span>
                        </div>
                        {valorDescontoGeral > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold font-mono border border-emerald-300 dark:border-emerald-700/60">
                            -{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorDescontoGeral)}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="Desc. Geral (%)"
                            value={checkoutDescontoPct}
                            onChange={(e) => handleCheckoutDescontoPct(e.target.value, subtotalCobradoCliente)}
                            className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded py-1 pl-2 pr-6 text-xs focus:outline-none focus:border-emerald-500 font-mono"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground/40 text-[10px] font-bold">%</span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-foreground/40 text-[10px] font-bold">R$</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="Desc. Geral (R$)"
                            value={checkoutDescontoValor}
                            onChange={(e) => handleCheckoutDescontoValor(e.target.value, subtotalCobradoCliente)}
                            className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded py-1 pl-7 pr-2 text-xs focus:outline-none focus:border-emerald-500 font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* CARD EXCLUSIVO DE DEMONSTRATIVO PARA A GESTORA DO SALÃO (Aparece SOMENTE para Gestora / Admin; 100% oculto para Secretária) */}
                    {isGestoraOuAdmin && (
                      <div className="p-4 bg-gradient-to-br from-gold/10 to-background border-2 border-gold/40 rounded-2xl space-y-3 shadow-lg">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-gold/20 pb-2.5">
                          <div className="flex items-center gap-2">
                            <Sparkles size={18} className="text-gold" />
                            <h4 className="font-bold text-sm text-foreground uppercase tracking-wider">
                              Demonstrativo Discriminado para a Gestora do Salão
                            </h4>
                          </div>
                          <span className="text-[11px] text-gold font-bold px-2.5 py-0.5 bg-gold/15 rounded-full border border-gold/30 w-fit">
                            {Object.keys(porProfissional).length} {Object.keys(porProfissional).length === 1 ? 'Profissional' : 'Profissionais Envolvidos'}
                          </span>
                        </div>

                        {/* Lista de Procedimentos e Comissões por Profissional */}
                        <div className="space-y-2">
                          {Object.entries(porProfissional).map(([pid, dados]) => {
                            const pNome = getProfissionalNome(pid, profissionais);
                            return (
                              <div key={pid} className="p-3 bg-[var(--background)]/90 border border-gold/25 rounded-xl space-y-2 text-xs">
                                <div className="flex flex-wrap items-center justify-between border-b border-border-subtle/50 pb-1.5 gap-2">
                                  <span className="font-bold text-foreground text-sm flex items-center gap-1.5">
                                    👤 {pNome}
                                  </span>
                                  <span className="text-foreground font-mono font-bold text-xs bg-foreground/5 px-2.5 py-1 rounded border border-[var(--border-subtle)] whitespace-nowrap">
                                    Comissão Líquida: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dados.comissaoEstimada)} ({dados.pctComissao}%)
                                  </span>
                                </div>
                                
                                {/* Procedimentos deste profissional */}
                                <div className="space-y-1 text-foreground/80">
                                  {dados.procedimentos.map(proc => (
                                    <div key={proc.id} className="flex flex-wrap justify-between items-center text-[11px] gap-1">
                                      <span className="truncate pr-2">• {proc.servico_nome || getServicoNome(proc.servico_id, servicos)}</span>
                                      <span className="font-mono whitespace-nowrap">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proc.preco_tabela)}
                                        {proc.desconto_valor > 0 && (
                                          <span className="text-emerald-800 dark:text-emerald-400 ml-1 font-semibold">
                                            (-{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proc.desconto_valor)})
                                          </span>
                                        )}
                                        {' = '}
                                        <strong className="text-foreground">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proc.valor_final)}</strong>
                                      </span>
                                    </div>
                                  ))}
                                </div>

                                {/* Insumos deste profissional */}
                                {dados.insumosCusto > 0 && (
                                  <div className="flex flex-wrap justify-between items-center text-[11px] text-amber-800 dark:text-amber-400 pt-1 border-t border-border-subtle/30 font-bold gap-1">
                                    <span>Produtos/Insumos aplicados por {pNome}:</span>
                                    <span className="font-mono whitespace-nowrap">- R$ {dados.insumosCusto.toFixed(2)} (deduzido da base)</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Repartição Macro: Produtos, Comissões Equipe, Líquido Salão */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                          <div className="p-2.5 bg-[var(--background)]/80 border border-amber-500/30 rounded-xl space-y-0.5">
                            <div className="flex items-center justify-between text-amber-800 dark:text-amber-400 text-[11px] font-bold uppercase">
                              <span><Beaker size={12} className="inline mr-1 text-amber-700"/> Fundo Produtos</span>
                              <span className="text-[10px] font-mono">Reserva</span>
                            </div>
                            <p className="text-base font-black font-mono text-amber-800 dark:text-amber-300">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fundoReservaProdutos)}
                            </p>
                            <p className="text-[9px] text-foreground/60 font-medium">Custo de estoque consumido no serviço.</p>
                          </div>

                          <div className="p-2.5 bg-[var(--background)]/80 border border-[var(--border-subtle)] rounded-xl space-y-0.5">
                            <div className="flex items-center justify-between text-foreground/80 text-[11px] font-bold uppercase">
                              <span><Users size={12} className="inline mr-1 text-gold"/> Total Comissões</span>
                              <span className="text-[10px] font-mono">Equipe</span>
                            </div>
                            <p className="text-base font-black font-mono text-foreground">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(comissaoTotalEquipe)}
                            </p>
                            <p className="text-[9px] text-foreground/60 font-medium">Sobre o procedimento de cada profissional.</p>
                          </div>

                          <div className="p-2.5 bg-[var(--background)]/80 border border-emerald-300 dark:border-emerald-500/30 rounded-xl space-y-0.5">
                            <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-400 text-[11px] font-bold uppercase">
                              <span><DollarSign size={12} className="inline mr-1"/> Salão Líquido</span>
                              <span className="text-[10px] font-mono">Receita</span>
                            </div>
                            <p className="text-base font-black font-mono text-emerald-800 dark:text-emerald-300">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(faturamentoLiquidoSalao)}
                            </p>
                            <p className="text-[9px] text-foreground/60 font-medium">Faturamento líquido que fica com o salão.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Breakdown Financeiro da Comanda (Visão Resumida e Completa para Liberação da Cliente) */}
                    <div className="space-y-2 text-sm bg-foreground/[0.02] p-4 rounded-xl border border-[var(--border-subtle)]">
                      <div className="flex justify-between items-center text-foreground/80 font-medium">
                        <span>Subtotal dos Procedimentos (Tabela)</span>
                        <span className="font-mono font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotalProcedimentosTabela)}</span>
                      </div>
                      {totalDescontosProcedimentos > 0 && (
                        <div className="flex justify-between items-center text-emerald-800 dark:text-emerald-400 font-bold">
                          <span>Descontos Concedidos pelos Profissionais</span>
                          <span className="font-mono">- {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalDescontosProcedimentos)}</span>
                        </div>
                      )}
                      {valorDescontoGeral > 0 && (
                        <div className="flex justify-between items-center text-emerald-800 dark:text-emerald-400 font-bold">
                          <span>Desconto Adicional da Recepção</span>
                          <span className="font-mono">- {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorDescontoGeral)}</span>
                        </div>
                      )}
                      {totalProdutos > 0 && (
                        <div className="flex justify-between items-center text-gold font-bold">
                          <span>Produtos de Salão (Venda / Balcão)</span>
                          <span className="font-mono">+ {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalProdutos)}</span>
                        </div>
                      )}
                      {taxaMaq.valorTaxa > 0 && isGestoraOuAdmin && (
                        <div className="flex justify-between items-center text-amber-800 dark:text-amber-400 text-xs font-bold pt-1 border-t border-[var(--border-subtle)]">
                          <span>Taxa Maquininha ({taxaMaq.regraNome} {taxaMaq.feePercentage}%)</span>
                          <span className="font-mono">- {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(taxaMaq.valorTaxa)}</span>
                        </div>
                      )}
                      {totalInsumos > 0 && (
                        <div className="flex justify-between items-center text-amber-800 dark:text-amber-400 text-xs font-semibold pt-1 border-t border-[var(--border-subtle)]">
                          <span>Insumos Utilizados no Atendimento ({checkoutInsumos.length} itens)</span>
                          <span className="font-mono">R$ {totalInsumos.toFixed(2)} (absorvido no serviço)</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Card de Valor Total e Ações Finais: Total Destaque + Botões 100% Visíveis */}
                    <div className="space-y-3 pt-1">
                      <div className="p-3.5 bg-gold/10 border border-gold/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <p className="text-[11px] text-foreground/60 uppercase tracking-wider font-bold">Valor Total a Pagar pela Cliente</p>
                          {numParcelas > 1 && (
                            <p className="text-xs text-amber-800 dark:text-amber-400 font-bold mt-0.5">
                              {numParcelas}x de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCobradoClienteFinal / numParcelas)}
                            </p>
                          )}
                        </div>
                         <div className="text-right">
                           <input
                             type="number"
                             step="0.01"
                             min="0"
                             value={checkoutValorFinalManual || totalCobradoClienteFinal}
                             onChange={(e) => setCheckoutValorFinalManual(e.target.value)}
                             className="w-40 text-right text-2xl sm:text-3xl font-extrabold font-serif text-gold bg-[var(--background)] border border-gold/40 rounded-lg px-2 py-1 focus:outline-none focus:border-gold"
                           />
                         </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="sm:w-32 py-3 text-xs sm:text-sm font-semibold text-foreground/70 border-[var(--border-subtle)] hover:bg-foreground/5 justify-center" 
                          onClick={fecharCheckout}
                        >
                          Cancelar
                        </Button>
                        <Button 
                          type="button" 
                          variant="primary" 
                          className="flex-1 py-3 px-4 text-xs sm:text-sm font-bold bg-gold hover:bg-gold-dim text-white shadow-md justify-center text-center whitespace-normal leading-snug" 
                          onClick={async () => {
                          const nomeCliente = getClienteNome(checkoutAppt.cliente_id, clientes);
                          
                          // Objeto completo da comanda unificada para persistência
                          const comandaObj: ComandaMultiProfissional = {
                            cliente_id: checkoutAppt.cliente_id,
                            cliente_nome: nomeCliente,
                            data: checkoutAppt.data,
                            procedimentos: checkoutProcedimentos,
                            insumos: checkoutInsumos,
                            produtos_venda: checkoutProdutos.map(p => {
                              const prodEstoque = estoque.find(e => e.id === p.inventory_id);
                              return {
                                inventory_id: p.inventory_id,
                                name: prodEstoque?.name || 'Produto',
                                qty: p.qty,
                                precoOriginal: p.precoOriginal,
                                preco: p.preco,
                                descontoValor: p.descontoValor,
                                profissional_id: checkoutAppt.profissional_id,
                              };
                            }),
                            total_bruto_servicos: subtotalProcedimentosTabela,
                            total_descontos_servicos: totalDescontosGerais,
                            total_liquido_servicos: totalProcedimentosLiquido,
                            total_produtos_venda: totalProdutos,
                            total_insumos: totalInsumos,
                            total_pago_cliente: totalCobradoClienteFinal,
                            payment_method: checkoutPagamento,
                            installments: numParcelas,
                            agendamentos_unificados_ids: agendamentosUnificadosIds,
                            fechado_em: new Date().toISOString(),
                          };

                          // 1. Finalizar o atendimento principal com a comanda unificada
                          await finalizarRecebimentoAgendamento({
                            id: checkoutAppt.id,
                            paymentMethod: checkoutPagamento,
                            installments: numParcelas,
                            totalAmount: totalCobradoClienteFinal,
                            productCost: fundoReservaProdutos,
                            insumosDetalhes: checkoutInsumos,
                            comandaUnificada: comandaObj,
                            financialStatus: 'PENDING_CONFIRMATION',
                          });
                          await mudarStatus(checkoutAppt.id, 'concluido');
                          
                          // 2. Se múltiplos agendamentos da mesma cliente no dia foram unificados, marcá-los como concluídos vinculados
                          const outrosIds = agendamentosUnificadosIds.filter(id => id !== checkoutAppt.id);
                          for (const outroId of outrosIds) {
                            await finalizarRecebimentoAgendamento({
                              id: outroId,
                              paymentMethod: checkoutPagamento,
                              installments: 1,
                              totalAmount: 0, // Zerado para não duplicar faturamento no caixa
                              unificadoEmId: checkoutAppt.id,
                              financialStatus: 'PENDING_CONFIRMATION',
                            });
                            await mudarStatus(outroId, 'concluido');
                          }
                          
                          // 3. Baixar insumos do estoque registrando a etapa e profissional
                          for (const insumo of checkoutInsumos) {
                            if (insumo.qty_used > 0) {
                              const profInsumoNome = getProfissionalNome(insumo.profissional_id || checkoutAppt.profissional_id, profissionais);
                              await registrarMovimentacao(insumo.inventory_id, 'OUT_PROCEDURE', insumo.qty_used, {
                                appointmentId: checkoutAppt.id,
                                notes: `Comanda [${nomeCliente}] - Etapa: ${insumo.etapa || 'Procedimento'} (${insumo.qty_used}${insumo.unit}) - Executado por: ${profInsumoNome}`,
                                createdBy: profInsumoNome,
                              });
                            }
                          }
                          
                          // 3.5. Baixar produtos vendidos (Upsell / Salão)
                          const profAtendimentoNome = getProfissionalNome(checkoutAppt.profissional_id, profissionais);
                          for (const prod of checkoutProdutos) {
                            if (prod.qty > 0) {
                              const descNote = prod.descontoValor && prod.descontoValor > 0 
                                ? ` (Desc: -${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.descontoValor)})` 
                                : '';
                              await registrarMovimentacao(prod.inventory_id, 'OUT_SALE', prod.qty, {
                                appointmentId: checkoutAppt.id,
                                notes: `Venda Comanda [${nomeCliente}]: ${prod.qty}x un.${descNote}`,
                                createdBy: profAtendimentoNome,
                              });
                            }
                          }

                          // 4. Gerar comissões individuais para CADA profissional com base nos procedimentos por ele executados
                          for (const [profId, dados] of Object.entries(porProfissional)) {
                            if (dados.comissaoEstimada > 0) {
                              const servicoIdRef = dados.procedimentos[0]?.servico_id || checkoutAppt.servico_id;
                              const detalhesDesc = dados.procedimentos.map(p => {
                                const dStr = p.desconto_valor > 0 ? ` (desc: -R$${p.desconto_valor.toFixed(2)})` : '';
                                return `${p.servico_nome || getServicoNome(p.servico_id, servicos)}: R$${p.valor_final.toFixed(2)}${dStr}`;
                              }).join(' + ');

                              await criarComissao({
                                appointmentId: checkoutAppt.id,
                                professionalId: profId,
                                serviceId: servicoIdRef,
                                totalAmount: dados.valorLiquido,
                                paymentMethod: checkoutPagamento,
                                installments: numParcelas,
                                appointmentDate: checkoutAppt.data,
                                customCommissionAmount: dados.comissaoEstimada,
                                notes: `Comanda Multi-Profissional [${nomeCliente}]: ${detalhesDesc}`,
                                taxasCustom: taxasPagamento,
                              });
                            }
                          }
                          
                          fecharCheckout();
                          fetchAgendamentos().then(setAgendamentos);
                          alert(`Comanda Fechada com Sucesso!\n\nCliente liberada no caixa da recepção.\nCliente: ${nomeCliente}\nTotal Cobrado: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCobradoClienteFinal)}\n\nO atendimento foi enviado para a Gestora do Studio fechar e auditar o financeiro na aba "Financeiro e Caixa".`);
                        }}>
                          <CheckCircle2 size={16} className="inline mr-1.5 shrink-0" />
                          Liberar Cliente (Enviar p/ Gestão)
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })()}
              </div>
            </div>
          </CardGlass>
        </div>
      )}

      {/* Modal de Novo Agendamento Dinâmico (Profissional -> Serviço -> Horários) */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/[0.7] backdrop-blur-sm p-4">
          <CardGlass className="w-full max-w-2xl p-6 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold font-serif text-foreground">
                  {editingApptId ? 'Editar Agendamento' : 'Novo Agendamento'}
                </h3>
                <p className="text-xs text-foreground/50">
                  {editingApptId ? 'Ajuste os procedimentos, profissionais, horários ou adicione extras' : 'Selecione o profissional para filtrar os serviços e horários disponíveis'}
                </p>
              </div>
              <button onClick={() => { setShowForm(false); setEditingApptId(null); }} className="text-foreground/50 hover:text-foreground">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSalvarAgendamento} className="space-y-4">
              {/* 1. Cliente com Busca e Seleção Inteligente */}
              <div ref={clienteSearchContainerRef} className="space-y-1.5">
                <label className="block text-xs font-bold text-foreground/70 flex items-center justify-between">
                  <span>1. Cliente *</span>
                  {clienteSelecionado ? (
                    <span className="text-[11px] font-semibold text-emerald-500 flex items-center gap-1">
                      <Check size={12} /> Cliente selecionado
                    </span>
                  ) : (
                    <span className="text-[11px] font-normal text-foreground/50">
                      {clientes.length} clientes cadastrados
                    </span>
                  )}
                </label>

                <input type="hidden" name="cliente_id" value={formData.cliente_id} required />

                {clienteSelecionado ? (
                  /* Card do Cliente Selecionado */
                  <div className="p-3 bg-gold/10 border border-gold/40 rounded-xl flex items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gold text-background font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
                        {clienteSelecionado.nome.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-foreground flex items-center gap-2">
                          <span className="truncate">{clienteSelecionado.nome}</span>
                          {clienteSelecionado.codigo && (
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-gold/20 text-gold rounded shrink-0">
                              #{clienteSelecionado.codigo}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-foreground/60 flex items-center gap-2 mt-0.5">
                          {clienteSelecionado.telefone && (
                            <span className="flex items-center gap-1">
                              <Phone size={11} className="text-gold" />
                              {formatPhone(clienteSelecionado.telefone)}
                            </span>
                          )}
                          {clienteSelecionado.email && (
                            <span className="truncate max-w-[150px] hidden sm:inline text-foreground/40">
                              • {clienteSelecionado.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(f => ({ ...f, cliente_id: '' }));
                        setBuscaCliente('');
                        setClienteDropdownAberto(true);
                      }}
                      className="text-xs text-gold hover:text-gold-dim border border-gold/40 hover:border-gold px-3 py-1.5 rounded-lg transition-colors font-bold shrink-0 bg-background/50 hover:bg-background"
                    >
                      Trocar
                    </button>
                  </div>
                ) : cadastrandoNovoCliente ? (
                  /* Formulário de Cadastro Rápido de Novo Cliente */
                  <div className="p-3.5 bg-[var(--background)] border border-gold/40 rounded-xl space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
                      <span className="text-xs font-bold text-gold flex items-center gap-1.5">
                        <UserPlus size={14} /> Cadastrar Novo Cliente Rápido
                      </span>
                      <button
                        type="button"
                        onClick={() => setCadastrandoNovoCliente(false)}
                        className="text-xs text-foreground/50 hover:text-foreground"
                      >
                        Voltar à busca
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-foreground/70 mb-1">Nome Completo *</label>
                        <input
                          type="text"
                          value={novoClienteNome}
                          onChange={e => setNovoClienteNome(e.target.value)}
                          placeholder="Nome da cliente"
                          className="w-full bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-lg p-2 text-xs text-foreground focus:outline-none focus:border-gold"
                          required
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-foreground/70 mb-1">WhatsApp / Telefone *</label>
                        <input
                          type="tel"
                          value={novoClienteTelefone}
                          onChange={e => setNovoClienteTelefone(e.target.value)}
                          placeholder="(42) 99999-9999"
                          className="w-full bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-lg p-2 text-xs text-foreground focus:outline-none focus:border-gold font-mono"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setCadastrandoNovoCliente(false)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] text-foreground/70 hover:bg-white/5"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={salvandoNovoCliente || !novoClienteNome.trim() || !novoClienteTelefone.trim()}
                        onClick={handleSalvarNovoClienteRapido}
                        className="text-xs px-3 py-1.5 rounded-lg bg-gold text-background font-bold hover:bg-gold-dim transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                      >
                        {salvandoNovoCliente ? 'Salvando...' : 'Salvar e Selecionar'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Campo de Busca Interativo com Autocomplete */
                  <div className="relative">
                    <div className="flex items-center bg-[var(--background)] border border-[var(--border-subtle)] focus-within:border-gold rounded-lg px-3 py-2.5 transition-colors">
                      <Search size={16} className="text-foreground/40 shrink-0 mr-2" />
                      <input
                        type="text"
                        value={buscaCliente}
                        onChange={e => {
                          setBuscaCliente(e.target.value);
                          setClienteDropdownAberto(true);
                        }}
                        onFocus={() => setClienteDropdownAberto(true)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (clientesFiltradosModal.length > 0) {
                              const c = clientesFiltradosModal[0];
                              setFormData(f => ({ ...f, cliente_id: c.id }));
                              setClienteDropdownAberto(false);
                              setBuscaCliente('');
                            }
                          }
                        }}
                        placeholder="Buscar cliente por nome, telefone ou código..."
                        className="w-full bg-transparent text-sm text-foreground focus:outline-none placeholder:text-foreground/40"
                        autoFocus
                      />
                      {buscaCliente && (
                        <button
                          type="button"
                          onClick={() => setBuscaCliente('')}
                          className="text-foreground/40 hover:text-foreground p-0.5 shrink-0"
                          title="Limpar texto"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {/* Dropdown Flutuante */}
                    {clienteDropdownAberto && (
                      <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-[var(--border-subtle)] animate-in fade-in zoom-in-95">
                        {clientesFiltradosModal.length > 0 ? (
                          <>
                            <div className="p-2 text-[10px] font-bold text-foreground/50 uppercase tracking-wider bg-foreground/[0.02]">
                              {buscaCliente ? `Resultados (${clientesFiltradosModal.length}) — Pressione Enter para selecionar` : 'Clientes recentes / ordem alfabética'}
                            </div>
                            {clientesFiltradosModal.map(c => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setFormData(f => ({ ...f, cliente_id: c.id }));
                                  setClienteDropdownAberto(false);
                                  setBuscaCliente('');
                                }}
                                className="w-full text-left p-2.5 hover:bg-gold/10 transition-colors flex items-center justify-between gap-3 group"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-8 h-8 rounded-full bg-gold/15 text-gold font-bold text-xs flex items-center justify-center shrink-0">
                                    {c.nome.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-bold text-sm text-foreground truncate group-hover:text-gold transition-colors flex items-center gap-1.5">
                                      <span>{c.nome}</span>
                                      {c.codigo && (
                                        <span className="text-[10px] font-mono px-1.5 py-0.2 bg-foreground/10 text-foreground/70 rounded">
                                          #{c.codigo}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-foreground/50 flex items-center gap-2 mt-0.5">
                                      {c.telefone && <span>{formatPhone(c.telefone)}</span>}
                                      {c.email && <span className="truncate max-w-[140px] hidden sm:inline">• {c.email}</span>}
                                    </div>
                                  </div>
                                </div>
                                <span className="text-xs text-gold font-semibold shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  Selecionar →
                                </span>
                              </button>
                            ))}
                          </>
                        ) : (
                          <div className="p-4 text-center">
                            <p className="text-xs text-foreground/60 mb-2">
                              Nenhum cliente encontrado com "{buscaCliente}"
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setCadastrandoNovoCliente(true);
                                setNovoClienteNome(buscaCliente);
                                setClienteDropdownAberto(false);
                              }}
                              className="text-xs font-bold text-gold hover:underline flex items-center justify-center gap-1.5 mx-auto"
                            >
                              <UserPlus size={14} /> Cadastrar "{buscaCliente}" como novo cliente
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Botão Atalho para Cadastrar Novo */}
                    <div className="mt-1.5 flex justify-between items-center text-[11px]">
                      <span className="text-foreground/40 italic">
                        {buscaCliente ? 'Clique no cliente desejado' : 'Digite para buscar na lista'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setCadastrandoNovoCliente(true);
                          setNovoClienteNome(buscaCliente);
                          setClienteDropdownAberto(false);
                        }}
                        className="text-gold hover:underline flex items-center gap-1 font-bold"
                      >
                        <UserPlus size={12} /> + Novo cliente
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Profissional PRIMEIRO */}
              <div>
                <label className="block text-xs font-bold text-foreground/70 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <User2 size={14} className="text-gold" />
                    2. Profissional *
                  </span>
                  {categoriaFiltro !== 'todas' && !isRestrictedProfissional && (
                    <span className="text-[10px] text-gold font-medium">
                      Filtro ativo: {categoriaFiltro === 'Unhas' ? '💅 Unhas' : '✂️ Cabelo'}
                    </span>
                  )}
                </label>
                {isRestrictedProfissional && meuProfissional ? (
                  <div className="flex items-center gap-3 p-3 bg-gold/10 border border-gold/30 rounded-xl">
                    {meuProfissional.foto_url || meuProfissional.avatar_url ? (
                      <img
                        src={meuProfissional.foto_url || meuProfissional.avatar_url || ''}
                        alt={meuProfissional.nome}
                        className="w-10 h-10 rounded-xl object-cover border-2 border-gold/40 shadow-sm shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-gold/20 text-gold flex items-center justify-center font-extrabold text-sm border border-gold/30 shrink-0">
                        {meuProfissional.nome.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-foreground truncate">{meuProfissional.nome}</div>
                      <div className="text-xs text-foreground/60">{getCategoriaProfissional(meuProfissional) === 'Unhas' ? '💅 Unhas' : '✂️ Cabelo'} • Titular do Atendimento</div>
                    </div>
                    <span className="text-[10px] font-bold text-gold uppercase tracking-wider px-2 py-1 bg-gold/20 border border-gold/30 rounded-lg">
                      Sua Agenda
                    </span>
                  </div>
                ) : (
                  <select 
                    className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:border-gold font-semibold"
                    value={formData.profissional_id}
                    onChange={e => {
                      const profId = e.target.value;
                      setFormData(f => ({ ...f, profissional_id: profId, servico_id: '', sub_servicos: [] }));
                    }}
                    required
                  >
                    <option value="">Selecione quem irá atender</option>
                    {profissionais.some(p => getCategoriaProfissional(p) === 'Cabelo') && (
                      <optgroup label="✂️ Cabelo">
                        {profissionais.filter(p => getCategoriaProfissional(p) === 'Cabelo').map(p => (
                          <option key={p.id} value={p.id}>{p.nome}</option>
                        ))}
                      </optgroup>
                    )}
                    {profissionais.some(p => getCategoriaProfissional(p) === 'Unhas') && (
                      <optgroup label="💅 Unhas">
                        {profissionais.filter(p => getCategoriaProfissional(p) === 'Unhas').map(p => (
                          <option key={p.id} value={p.id}>{p.nome}</option>
                        ))}
                      </optgroup>
                    )}
                    {profissionais.some(p => !['Cabelo', 'Unhas'].includes(getCategoriaProfissional(p))) && (
                      <optgroup label="Outras Categorias">
                        {profissionais.filter(p => !['Cabelo', 'Unhas'].includes(getCategoriaProfissional(p))).map(p => (
                          <option key={p.id} value={p.id}>{p.nome}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                )}
              </div>

              {/* Auxiliares / Co-participantes do Procedimento */}
              <div className="p-3 bg-foreground/[0.02] border border-[var(--border-subtle)] rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Users size={14} className="text-gold" />
                    Auxiliares do Procedimento (Co-participantes)
                  </label>
                  <span className="text-[10px] text-foreground font-semibold px-2 py-0.5 bg-foreground/5 rounded-full border border-[var(--border-subtle)]">
                    Opcional • {formData.auxiliares_ids.length} selecionado(s)
                  </span>
                </div>
                <p className="text-[11px] text-foreground/50 leading-relaxed">
                  Selecione os profissionais que farão parte das etapas deste atendimento (ex: mechas, lavatório, finalização). A agenda de cada auxiliar será ocupada automaticamente por este atendimento e a comissão poderá ser repartida no fechamento.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {profissionais
                    .filter(p => p.id !== formData.profissional_id && p.ativo)
                    .map(p => {
                      const isSelected = formData.auxiliares_ids.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setFormData(f => ({
                              ...f,
                              auxiliares_ids: isSelected 
                                ? f.auxiliares_ids.filter(id => id !== p.id)
                                : [...f.auxiliares_ids, p.id]
                            }));
                          }}
                          className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 font-medium ${
                            isSelected
                              ? 'bg-gold/15 border-gold text-foreground font-bold shadow-xs'
                              : 'border-[var(--border-subtle)] text-foreground/70 hover:border-gold/40 hover:text-foreground bg-[var(--background)]'
                          }`}
                        >
                          {isSelected ? <Check size={12} className="text-gold" /> : <Plus size={12} className="text-foreground/40" />}
                          <span>{p.nome}</span>
                          {isSelected && <span className="text-[10px] text-gold font-normal">(Auxiliar)</span>}
                        </button>
                      );
                    })}
                </div>
                {formData.auxiliares_ids.length > 0 && (
                  <div className="p-2 bg-gold/10 border border-gold/25 rounded-lg text-[11px] text-foreground flex items-center gap-2">
                    <Sparkles size={14} className="shrink-0 text-gold" />
                    <span>
                      <strong>Equipe do Procedimento:</strong> {getProfissionalNome(formData.profissional_id, profissionais)} (Titular) + {formData.auxiliares_ids.map(id => getProfissionalNome(id, profissionais)).join(', ')} (Auxiliares).
                    </span>
                  </div>
                )}
              </div>

              {/* 3. Serviço FILTRADO pelo Profissional */}
              <div>
                <label className="block text-xs font-bold text-foreground/70 mb-1.5 flex items-center justify-between">
                  <span>3. Serviço *</span>
                  {formData.profissional_id && (
                    <span className="text-[11px] font-normal text-gold font-mono">
                      {servicosDoProfissional.length} serviços disponíveis para este profissional
                    </span>
                  )}
                </label>
                <select 
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:border-gold disabled:opacity-50"
                  value={formData.servico_id}
                  onChange={e => {
                    const servId = e.target.value;
                    const subsLimpas = formData.sub_servicos.filter(s => (typeof s === 'string' ? s : s.id) !== servId);
                    const novaDur = calcularDuracaoTotal(servId, subsLimpas);
                    setFormData(f => ({ ...f, servico_id: servId, sub_servicos: subsLimpas, duracao_min: String(novaDur) }));
                  }}
                  disabled={!formData.profissional_id}
                  required
                >
                  <option value="">
                    {!formData.profissional_id 
                      ? '← Selecione o profissional primeiro' 
                      : (servicosDoProfissional.length === 0
                          ? 'Nenhum procedimento vinculado a este profissional'
                          : 'Selecione o procedimento')}
                  </option>
                  {servicosDoProfissional.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.nome} — R$ {s.preco} ({s.duracao_min} min)
                    </option>
                  ))}
                </select>
              </div>

              {/* Sub-serviços (Adicionais) filtrados pelo profissional selecionado */}
              {formData.servico_id && (
                <div>
                  <label className="block text-xs font-bold text-foreground/70 mb-1.5 flex items-center justify-between">
                    <span>Adicionais / Subserviços (Soma tempo e valor)</span>
                    <span className="text-[10px] text-foreground/50">
                      Apenas procedimentos de {profissionais.find(p => p.id === formData.profissional_id)?.nome || 'este profissional'}
                    </span>
                  </label>
                  <div className="flex flex-col gap-2">
                    {formData.sub_servicos.map((subItem, index) => {
                      const subId = typeof subItem === 'string' ? subItem : subItem.id;
                      const isFree = typeof subItem === 'object' ? subItem.is_free : false;
                      const opcoesSub = servicosDoProfissional.filter(srv => 
                        srv.id !== formData.servico_id && 
                        (!formData.sub_servicos.some(s => (typeof s === 'string' ? s : s.id) === srv.id) || srv.id === subId)
                      );

                      return (
                        <div key={index} className="flex flex-col gap-2 p-3 bg-foreground/5 border border-[var(--border-subtle)] rounded-lg">
                          <div className="flex items-center gap-2">
                            <select
                              value={subId}
                              onChange={e => {
                                const novasubs = [...formData.sub_servicos];
                                novasubs[index] = { id: e.target.value, is_free: isFree };
                                const novaDur = calcularDuracaoTotal(formData.servico_id, novasubs);
                                setFormData(f => ({ ...f, sub_servicos: novasubs, duracao_min: String(novaDur) }));
                              }}
                              className="flex-1 bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2 text-sm text-foreground focus:outline-none focus:border-gold"
                            >
                              <option value="">Selecione o subserviço...</option>
                              {opcoesSub.map(srv => (
                                <option key={srv.id} value={srv.id}>{srv.nome} — R$ {srv.preco} (+{srv.duracao_min} min)</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => {
                                const novasubs = formData.sub_servicos.filter((_, i) => i !== index);
                                const novaDur = calcularDuracaoTotal(formData.servico_id, novasubs);
                                setFormData(f => ({ ...f, sub_servicos: novasubs, duracao_min: String(novaDur) }));
                              }}
                              className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          {subId && (
                            <label className="flex items-center gap-2 text-xs font-semibold text-foreground/70 cursor-pointer w-fit pl-1">
                              <input 
                                type="checkbox" 
                                checked={isFree} 
                                onChange={e => {
                                  const novasubs = [...formData.sub_servicos];
                                  novasubs[index] = { id: subId, is_free: e.target.checked };
                                  setFormData(f => ({ ...f, sub_servicos: novasubs }));
                                }}
                                className="accent-gold w-3.5 h-3.5" 
                              />
                              Marcar como Brinde (R$ 0 na comanda)
                            </label>
                          )}
                        </div>
                      );
                    })}

                    {servicosDoProfissional.filter(s => s.id !== formData.servico_id).length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setFormData(f => ({ ...f, sub_servicos: [...f.sub_servicos, { id: '', is_free: false }] }))}
                        className="text-xs font-bold text-gold hover:text-gold-dim self-start flex items-center gap-1 mt-1"
                      >
                        <Plus size={14} /> Adicionar subserviço (ex: Escova)
                      </button>
                    ) : (
                      <p className="text-[11px] text-foreground/40 italic mt-1">
                        Este profissional não possui outros procedimentos cadastrados para adicionar como subserviço.
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              
              {/* Edição de Tempo */}
              {formData.servico_id && (
                <div>
                  <label className="block text-xs font-bold text-foreground/70 mb-1.5 flex items-center justify-between">
                    <span>Tempo Exato (Minutos) *</span>
                    <span className="text-[11px] font-normal text-gold font-mono">Pode ser ajustado</span>
                  </label>
                  <input 
                    type="number"
                    value={formData.duracao_min}
                    onChange={e => setFormData(f => ({ ...f, duracao_min: e.target.value }))}
                    className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:border-gold font-mono"
                    placeholder="Ex: 45"
                    required
                  />
                </div>
              )}

              {/* Cliente Fixo (Apenas para novos agendamentos) */}
              {!editingApptId && (
                <div className="pt-4 border-t border-[var(--border-subtle)] space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={formData.is_fixed}
                      onChange={e => setFormData(f => ({ ...f, is_fixed: e.target.checked }))}
                      className="w-4 h-4 rounded border-[var(--border-subtle)] bg-[var(--background)] text-gold focus:ring-gold accent-gold"
                    />
                    <span className="text-sm font-bold text-foreground">Este é um horário fixo/recorrente do cliente?</span>
                  </label>
                  
                  {formData.is_fixed && (
                    <div className="pl-6 animate-in fade-in slide-in-from-top-2">
                      <label className="block text-xs font-bold text-foreground/70 mb-1.5">Frequência</label>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setFormData(f => ({ ...f, recurrence_type: 'WEEKLY' }))} className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg border transition-colors ${formData.recurrence_type === 'WEEKLY' ? 'border-gold bg-gold/10 text-gold' : 'border-[var(--border-subtle)] text-foreground/60'}`}>Semanal</button>
                        <button type="button" onClick={() => setFormData(f => ({ ...f, recurrence_type: 'BIWEEKLY' }))} className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg border transition-colors ${formData.recurrence_type === 'BIWEEKLY' ? 'border-gold bg-gold/10 text-gold' : 'border-[var(--border-subtle)] text-foreground/60'}`}>Quinzenal</button>
                        <button type="button" onClick={() => setFormData(f => ({ ...f, recurrence_type: 'MONTHLY' }))} className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg border transition-colors ${formData.recurrence_type === 'MONTHLY' ? 'border-gold bg-gold/10 text-gold' : 'border-[var(--border-subtle)] text-foreground/60'}`}>Mensal</button>
                        <button type="button" onClick={() => setFormData(f => ({ ...f, recurrence_type: 'CUSTOM' }))} className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg border transition-colors ${formData.recurrence_type === 'CUSTOM' ? 'border-gold bg-gold/10 text-gold' : 'border-[var(--border-subtle)] text-foreground/60'}`}>Todo Dia...</button>
                      </div>
                      {formData.recurrence_type === 'CUSTOM' && (
                        <div className="mt-3">
                          <label className="block text-[11px] font-bold text-foreground/70 mb-1">Qual o dia fixo do mês? (1 a 31)</label>
                          <input 
                            type="number"
                            min="1"
                            max="31"
                            required={formData.is_fixed && formData.recurrence_type === 'CUSTOM'}
                            placeholder="Ex: 5"
                            value={formData.recurrence_custom_day}
                            onChange={e => setFormData(f => ({ ...f, recurrence_custom_day: e.target.value }))}
                            className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2 text-sm text-foreground focus:outline-none focus:border-gold"
                          />
                        </div>
                      )}
                      <p className="text-[11px] text-foreground/50 mt-2">O sistema irá marcar este agendamento como fixo para o cliente.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Opção de Replicar Ajuste de Serviço para Agendamentos Recorrentes/Futuros */}
              {editingApptId && (
                <div className="pt-4 border-t border-[var(--border-subtle)] space-y-2 bg-gold/5 -mx-6 px-6 py-3.5 rounded-lg border border-gold/25">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={formData.replicate_to_future}
                      onChange={e => setFormData(f => ({ ...f, replicate_to_future: e.target.checked }))}
                      className="w-4 h-4 mt-0.5 rounded border-gold/40 bg-[var(--background)] text-gold focus:ring-gold accent-gold cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-foreground">
                          Replicar este procedimento/serviço para os próximos agendamentos
                        </span>
                        <RefreshCw size={13} className={`text-gold ${formData.replicate_to_future ? 'animate-spin' : ''}`} />
                      </div>
                      <p className="text-xs text-foreground/70 mt-1 leading-relaxed">
                        Ao salvar, a alteração do procedimento e adicionais será replicada automaticamente para as próximas datas recorrentes deste cliente.
                      </p>
                      {(() => {
                        const futuros = agendamentos.filter(a =>
                          a.cliente_id === formData.cliente_id &&
                          a.id !== editingApptId &&
                          a.data > formData.data &&
                          a.status !== 'cancelado' &&
                          (!formData.profissional_id || a.profissional_id === formData.profissional_id)
                        );
                        if (futuros.length > 0) {
                          return (
                            <div className="mt-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-md flex items-center gap-1.5">
                              <CheckCircle2 size={13} className="shrink-0" />
                              <span>{futuros.length} agendamento(s) futuro(s) encontrado(s) para este cliente na agenda.</span>
                            </div>
                          );
                        }
                        return (
                          <p className="mt-1 text-[11px] text-foreground/50">
                            (Aplica a todas as datas futuras cadastradas no banco de dados para este cliente com este profissional)
                          </p>
                        );
                      })()}
                    </div>
                  </label>
                </div>
              )}

              {/* Permitir sobreposição (Encaixe) */}
              <div className="pt-4 border-t border-[var(--border-subtle)] space-y-2 bg-gold/5 -mx-6 px-6 py-3 rounded-lg border border-gold/20">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={formData.allow_overlap}
                    onChange={e => setFormData(f => ({ ...f, allow_overlap: e.target.checked }))}
                    className="w-4 h-4 rounded border-gold/40 bg-[var(--background)] text-gold focus:ring-gold accent-gold cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-foreground">Permitir sobreposição (Encaixe / Pausa de procedimento)</span>
                    <Sparkles size={14} className="text-gold" />
                  </div>
                </label>
                <p className="text-[11px] text-foreground/60 ml-6">
                  Marque caso este atendimento ocorra no mesmo horário de outro já existente na agenda do profissional ou permita pausas para atender mais clientes simultaneamente.
                </p>
              </div>

              {/* 4. Data & Horário Inteligente */}
              <div className="space-y-2 pt-4 border-t border-[var(--border-subtle)]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-foreground/70 mb-1.5 flex items-center gap-1">
                      <CalendarDays size={14} className="text-gold" />
                      4. Data do Atendimento *
                    </label>
                    <input 
                      type="date"
                      value={formData.data}
                      onChange={e => setFormData(f => ({ ...f, data: e.target.value }))}
                      onClick={(e) => {
                        if (typeof (e.target as any).showPicker === 'function') {
                          (e.target as any).showPicker();
                        }
                      }}
                      min={hoje}
                      className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:border-gold cursor-pointer"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-foreground/70 mb-1.5 flex items-center gap-1">
                      <Clock size={14} className="text-gold" />
                      5. Horário Disponível *
                    </label>
                    
                    {horariosDisponiveis.length > 0 ? (
                      <select
                        value={formData.hora_inicio}
                        onChange={e => setFormData(f => ({ ...f, hora_inicio: e.target.value }))}
                        className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:border-gold font-mono"
                        required
                      >
                        {horariosDisponiveis.map(slot => {
                          const podeSelecionar = !slot.ocupado || formData.allow_overlap || slot.permiteEncaixe;
                          let labelTexto = '— Livre';
                          if (slot.ocupado) {
                            if (slot.permiteEncaixe) {
                              labelTexto = '— Encaixe liberado (Pausa)';
                            } else if (formData.allow_overlap) {
                              labelTexto = '— Encaixe';
                            } else {
                              labelTexto = '(Ocupado)';
                            }
                          }
                          return (
                            <option 
                              key={slot.hora} 
                              value={slot.hora} 
                              disabled={!podeSelecionar}
                            >
                              {slot.hora} {labelTexto}
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      <input 
                        type="time"
                        value={formData.hora_inicio}
                        onChange={e => setFormData(f => ({ ...f, hora_inicio: e.target.value }))}
                        className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:border-gold [color-scheme:dark]"
                        required
                      />
                    )}
                  </div>
                </div>

                {/* Status do Salão vs Profissional */}
                {statusDiaInfo && (
                  <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                    statusDiaInfo.tipo === 'aberto' 
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  }`}>
                    {statusDiaInfo.tipo === 'aberto' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                    <span>{statusDiaInfo.texto}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-[var(--border-subtle)]">
                {editingApptId ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="text-red-400 border-red-500/30 hover:bg-red-500/10 text-xs flex items-center gap-1.5"
                    onClick={() => {
                      const appt = agendamentos.find(a => a.id === editingApptId);
                      if (appt) {
                        setShowForm(false);
                        setEditingApptId(null);
                        abrirModalCancelar(appt);
                      }
                    }}
                  >
                    <Trash2 size={14} /> Cancelar / Excluir Atendimento
                  </Button>
                ) : <div />}
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingApptId(null); }}>
                    Voltar
                  </Button>
                  <Button type="submit" variant="primary" className="font-bold">
                    {editingApptId ? 'Salvar Alterações' : 'Salvar Agendamento'}
                  </Button>
                </div>
              </div>
            </form>
          </CardGlass>
        </div>
      )}
    </div>
  );
}

export default function AgendaPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-foreground/50">Carregando agenda...</div>}>
      <AgendaContent />
    </Suspense>
  );
}
