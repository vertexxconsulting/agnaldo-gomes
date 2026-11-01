'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Clock, CheckCircle2, Play, Plus, X, ShoppingBag, Share2, Beaker, DollarSign, CalendarDays, Percent, Users, Sparkles, Trash2, User2, Pencil,
  CreditCard, Banknote, Smartphone, RefreshCw, ShieldAlert, ArrowUpRight, Scissors, Package, Check, ChevronRight, ChevronLeft, Calendar, AlertTriangle
} from 'lucide-react';
import { SectionHeader, Panel } from '@/components/ui/Panel';
import { CardGlass } from '@/components/CardGlass';
import { Button } from '@/components/Button';
import { ProductSearchSelect } from '@/components/ProductSearchSelect';
import { 
  fetchClientes, 
  fetchAgendamentos, 
  fetchServicos, 
  fetchEstoque,
  fetchProfissionais,
  fetchPendenciasAgendamentosProfissional,
  salvarItemComanda,
  fetchItensComanda,
  atualizarStatusAgendamento,
  atualizarProcedimentoCadeiraAgendamento,
  excluirAgendamentoAdmin,
  criarAgendamento,
  finalizarRecebimentoAgendamento,
  fetchRegrasComissao,
  salvarInsumoTempoRealProcedimento,
  removerInsumoTempoRealProcedimento,
  editarInsumoTempoRealProcedimento,
  atualizarPeriodoRecebimentoProfissional,
  fetchComissoes,
  fetchParcelasPendentes
} from '@/lib/supabase-queries';
import { fetchPacotesClientes, salvarPacoteCliente, abaterSessaoPacote, estornarSessaoPacote } from '@/lib/pacotes';
import type { Cliente, Agendamento, Servico, ProdutoEstoque, ItemComanda, Profissional, InsumoAtendimento, PeriodoRecebimentoComissao, Comissao, FormaPagamento, PacoteCliente, RegraComissao } from '@/lib/gestao-types';
import { supabase } from '@/lib/supabase';
import { getUserRole, isOwner, ROLES } from '@/lib/auth';

function fmt(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function fmtDate(d: string): string {
  if (!d) return '—';
  const clean = d.includes('T') ? d.slice(0, 10) : d;
  const [ano, mes, dia] = clean.split('-');
  if (!ano || !mes || !dia) return d;
  return `${dia}/${mes}/${ano}`;
}

const PAGAMENTO_CONFIG: Record<FormaPagamento, { label: string; icon: any; cor: string; badge: string }> = {
  DINHEIRO: { label: 'Dinheiro', icon: Banknote, cor: 'text-emerald-500', badge: 'Imediato' },
  PIX: { label: 'PIX', icon: Smartphone, cor: 'text-blue-500', badge: 'Imediato' },
  DEBITO: { label: 'Débito', icon: CreditCard, cor: 'text-purple-500', badge: 'Imediato' },
  CREDITO: { label: 'Crédito', icon: CreditCard, cor: 'text-amber-500', badge: 'D+30' },
  BOLETO: { label: 'Boleto', icon: Banknote, cor: 'text-gray-500', badge: 'D+3' },
};

function getCategoriaProfissional(p: Profissional): 'Cabelo' | 'Unhas' | string {
  if (p.categoria) {
    const catNorm = p.categoria.trim().toLowerCase();
    if (catNorm.includes('unha') || catNorm.includes('manicure') || catNorm.includes('pedic')) return 'Unhas';
    if (catNorm.includes('cabelo') || catNorm.includes('capilar')) return 'Cabelo';
    return p.categoria;
  }
  if (p.especialidades && p.especialidades.length > 0) {
    const tags = p.especialidades.map(e => e.toLowerCase()).join(' ');
    if (tags.includes('unha') || tags.includes('manicure') || tags.includes('pedicure') || tags.includes('esmalte') || tags.includes('podolog')) {
      return 'Unhas';
    }
  }
  const nomeLower = (p.nome || '').toLowerCase();
  if (nomeLower.includes('unha') || nomeLower.includes('manicure') || nomeLower.includes('camila')) {
    return 'Unhas';
  }
  return 'Cabelo';
}

export default function MeuPainelPage() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [estoque, setEstoque] = useState<ProdutoEstoque[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [selectedProfId, setSelectedProfId] = useState<string>('');
  const [isRestrictedProfissional, setIsRestrictedProfissional] = useState(false);
  const [isAuxiliarCabelo, setIsAuxiliarCabelo] = useState(false);
  const [produtosLoja, setProdutosLoja] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [insumosModalOpen, setInsumosModalOpen] = useState(false);
  const [upsellModalOpen, setUpsellModalOpen] = useState(false);
  const [catalogoModalOpen, setCatalogoModalOpen] = useState(false);
  const [activeAgendamento, setActiveAgendamento] = useState<Agendamento | null>(null);

  // Comanda state
  const [comandaAtual, setComandaAtual] = useState<ItemComanda[]>([]);
  const [insumoSelecionado, setInsumoSelecionado] = useState('');
  const [insumoQty, setInsumoQty] = useState('');
  const [insumoEtapa, setInsumoEtapa] = useState('Etapa 1 - Descoloração / Mechas');
  const [insumoProfId, setInsumoProfId] = useState('');
  const [insumoLoading, setInsumoLoading] = useState(false);
  const [editingInsumoIndex, setEditingInsumoIndex] = useState<number | null>(null);
  const [produtoSelecionado, setProdutoSelecionado] = useState('');
  const [produtoQty, setProdutoQty] = useState('1');
  const [produtoDescPct, setProdutoDescPct] = useState('');
  const [produtoDescValor, setProdutoDescValor] = useState('');
  const [salvandoPeriodo, setSalvandoPeriodo] = useState(false);
  const [minhasComissoes, setMinhasComissoes] = useState<Comissao[]>([]);
  const [minhasParcelasPendentes, setMinhasParcelasPendentes] = useState<any[]>([]);
  const [loadingComissoes, setLoadingComissoes] = useState(false);
  const [filtroExtrato, setFiltroExtrato] = useState<'todos' | 'liberados' | 'carencia' | 'pagos'>('liberados');

  // --- NOVOS ESTADOS PARA AS 3 OPÇÕES DA CADEIRA & PRÉ-FECHAMENTO & AGENDA ---
  // 1. Modal de Serviço
  const [servicoModalOpen, setServicoModalOpen] = useState(false);
  const [servicoEditandoId, setServicoEditandoId] = useState('');
  const [servicoPrecoEditado, setServicoPrecoEditado] = useState('');
  const [subServicosEditados, setSubServicosEditados] = useState<any[]>([]);
  const [salvandoServico, setSalvandoServico] = useState(false);

  // 2. Modal de Pacote
  const [pacoteModalOpen, setPacoteModalOpen] = useState(false);
  const [pacotesCliente, setPacotesCliente] = useState<PacoteCliente[]>([]);
  const [loadingPacotes, setLoadingPacotes] = useState(false);
  const [novoPacoteNome, setNovoPacoteNome] = useState('');
  const [novoPacoteServicoId, setNovoPacoteServicoId] = useState('');
  const [novoPacoteSessoes, setNovoPacoteSessoes] = useState('4');
  const [novoPacoteValor, setNovoPacoteValor] = useState('');
  const [criandoNovoPacote, setCriandoNovoPacote] = useState(false);

  // 3. Modal de Pré-Fechamento da Cadeira
  const [preFechamentoModalOpen, setPreFechamentoModalOpen] = useState(false);
  const [preFechamentoPrecoServico, setPreFechamentoPrecoServico] = useState<number>(0);
  const [preFechamentoDescontoValor, setPreFechamentoDescontoValor] = useState<string>('');
  const [preFechamentoDescontoPct, setPreFechamentoDescontoPct] = useState<string>('');
  const [preFechamentoAgnaldoRecebe, setPreFechamentoAgnaldoRecebe] = useState<boolean>(true);
  const [preFechamentoLoading, setPreFechamentoLoading] = useState(false);

  // 4. Modal de Novo Agendamento pelo Profissional
  const [novoAgModalOpen, setNovoAgModalOpen] = useState(false);
  const [novoAgClienteId, setNovoAgClienteId] = useState('');
  const [novoAgServicoId, setNovoAgServicoId] = useState('');
  const [novoAgData, setNovoAgData] = useState(new Date().toISOString().split('T')[0]);
  const [novoAgHoraInicio, setNovoAgHoraInicio] = useState('10:00');
  const [novoAgLoading, setNovoAgLoading] = useState(false);

  // 5. Modal de Excluir Agendamento
  const [cancelarAgModalOpen, setCancelarAgModalOpen] = useState(false);
  const [apptParaExcluir, setApptParaExcluir] = useState<Agendamento | null>(null);
  const [excluindoAgLoading, setExcluindoAgLoading] = useState(false);

  // Regras de comissão
  const [regrasComissao, setRegrasComissao] = useState<RegraComissao[]>([]);

  const hoje = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(hoje);
  const [loadingAgendamentos, setLoadingAgendamentos] = useState<boolean>(false);
  const [pendenciasPassadas, setPendenciasPassadas] = useState<Agendamento[]>([]);

  const mudarData = (deltaDias: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + deltaDias);
    const ano = dt.getFullYear();
    const mes = String(dt.getMonth() + 1).padStart(2, '0');
    const dia = String(dt.getDate()).padStart(2, '0');
    setSelectedDate(`${ano}-${mes}-${dia}`);
  };

  const carregarAgendamentosData = async (dataTarget: string) => {
    setLoadingAgendamentos(true);
    try {
      const ags = await fetchAgendamentos({ data: dataTarget });
      setAgendamentos(ags || []);
    } catch (err) {
      console.error('Erro ao carregar agendamentos da data:', err);
    } finally {
      setLoadingAgendamentos(false);
    }
  };

  const buscarPendenciasPassadas = async (profId: string) => {
    if (!profId) return;
    try {
      const pend = await fetchPendenciasAgendamentosProfissional(profId);
      setPendenciasPassadas(pend || []);
    } catch (e) {
      console.warn('Aviso ao buscar pendências passadas:', e);
    }
  };

  const handleAlterarMeuPeriodo = async (novoPeriodo: PeriodoRecebimentoComissao) => {
    if (!selectedProfId) return;
    setSalvandoPeriodo(true);
    const res = await atualizarPeriodoRecebimentoProfissional(selectedProfId, novoPeriodo);
    if (res.ok) {
      setProfissionais(prev => prev.map(p => p.id === selectedProfId ? { ...p, periodo_recebimento: novoPeriodo } : p));
    } else {
      alert(`Erro ao salvar preferência de recebimento: ${res.error}`);
    }
    setSalvandoPeriodo(false);
  };

  const carregarComissoesProf = async (profId: string) => {
    if (!profId) return;
    setLoadingComissoes(true);
    try {
      const [coms, parcs] = await Promise.all([
        fetchComissoes(profId),
        fetchParcelasPendentes(profId)
      ]);
      setMinhasComissoes(coms || []);
      setMinhasParcelasPendentes(parcs || []);
    } catch (err) {
      console.error('Erro ao carregar comissões do profissional:', err);
    } finally {
      setLoadingComissoes(false);
    }
  };

  useEffect(() => {
    if (selectedProfId) {
      carregarComissoesProf(selectedProfId);
      buscarPendenciasPassadas(selectedProfId);
    }
  }, [selectedProfId]);

  useEffect(() => {
    if (selectedDate) {
      carregarAgendamentosData(selectedDate);
    }
  }, [selectedDate]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [ags, cls, srvs, est, profs, regras] = await Promise.all([
        fetchAgendamentos({ data: selectedDate }),
        fetchClientes(),
        fetchServicos(),
        fetchEstoque(),
        fetchProfissionais(),
        fetchRegrasComissao(),
      ]);
      const { data: prods } = await supabase.from('products').select('*').eq('active', true).order('name');
      
      setAgendamentos(ags);
      setClientes(cls);
      setServicos(srvs);
      setEstoque(est);
      setRegrasComissao(regras || []);

      const { data: { user } } = await supabase.auth.getUser();
      const userMeta = user?.user_metadata;
      const owner = user ? isOwner(user) : false;
      const role = user ? getUserRole(user) : '';

      const { data: profProfile } = user ? await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle() : { data: null };

      const effectiveRole = profProfile?.role || role;
      const isFullAdmin = owner ||
        effectiveRole === ROLES.ADMIN ||
        effectiveRole === ROLES.STUDIO_ADMIN ||
        effectiveRole === ROLES.STUDIO_SECRETARIA ||
        userMeta?.role === 'admin' ||
        userMeta?.isOwner === true;

      const isAuxiliarUser = !owner && !isFullAdmin && (
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

      const normalizeText = (text?: string | null) => {
        if (!text) return '';
        return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      };

      const profIdFromPerm = profProfile?.permissions?.professional_id || userMeta?.permissions?.professional_id || userMeta?.professional_id || (profProfile as any)?.professional_id;

      let matched: Profissional | undefined;
      if (profs && profs.length > 0) {
        matched = profs.find(p => profIdFromPerm && p.id === profIdFromPerm);
        if (!matched && user?.id) {
          matched = profs.find(p => p.user_id && p.user_id === user.id);
        }
        if (!matched && user?.email) {
          const uEmail = user.email.toLowerCase().trim();
          matched = profs.find(p => p.email && p.email.toLowerCase().trim() === uEmail);
        }
        const uNameNorm = normalizeText(userMeta?.full_name || profProfile?.full_name || user?.email?.split('@')[0]);
        if (!matched && uNameNorm) {
          matched = profs.find(p => normalizeText(p.nome) === uNameNorm);
        }
        if (!matched && uNameNorm) {
          matched = profs.find(p => {
            const pNorm = normalizeText(p.nome);
            return pNorm.includes(uNameNorm) || uNameNorm.includes(pNorm);
          });
        }
      }

      if (isAuxiliarUser) {
        setIsAuxiliarCabelo(true);
        setIsRestrictedProfissional(false);
        const profsCabelo = (profs || []).filter(p => p.ativo && getCategoriaProfissional(p) === 'Cabelo');
        setProfissionais(profsCabelo);
        const targetId = profsCabelo.length > 0 ? profsCabelo[0].id : '';
        setSelectedProfId(prev => prev || targetId);
        if (targetId) {
          carregarComissoesProf(targetId);
          buscarPendenciasPassadas(targetId);
        }
      } else if (isProfissionalUser || (matched && !isFullAdmin)) {
        setIsAuxiliarCabelo(false);
        setIsRestrictedProfissional(true);
        if (matched) {
          setSelectedProfId(matched.id);
          setProfissionais([matched]);
          carregarComissoesProf(matched.id);
          buscarPendenciasPassadas(matched.id);
        } else {
          setProfissionais([]);
          setSelectedProfId('');
        }
      } else {
        setIsAuxiliarCabelo(false);
        setIsRestrictedProfissional(false);
        setProfissionais(profs || []);
        const targetId = matched ? matched.id : (profs && profs.length > 0 ? profs[0].id : '');
        setSelectedProfId(prev => prev || targetId);
        if (targetId) {
          carregarComissoesProf(targetId);
          buscarPendenciasPassadas(targetId);
        }
      }
      setProdutosLoja(prods || []);
      setLoading(false);
    }
    loadData();
  }, []);

  function getClienteNome(id: string): string {
    return clientes.find(c => c.id === id)?.nome || 'Cliente não encontrado';
  }
  function getServicoNome(id: string): string {
    return servicos.find(s => s.id === id)?.nome || 'Serviço excluído';
  }

  const extratoComissoes = useMemo(() => {
    const getCli = (id: string) => clientes.find(c => c.id === id)?.nome || 'Cliente não encontrado';
    const getSrv = (id: string) => servicos.find(s => s.id === id)?.nome || 'Serviço excluído';
    const list: {
      id: string;
      data: string;
      cliente: string;
      servico: string;
      valorServico: number;
      comissaoPct: number;
      valorComissao: number;
      formaPagamento: FormaPagamento;
      dueDate: string;
      status: 'LIBERADO' | 'CARENCIA_D30' | 'PAGO';
      labelStatus: string;
      badgeCor: string;
      diasRestantes?: number;
    }[] = [];

    minhasComissoes.forEach(c => {
      const cliNome = (c as any).client_name || getCli((c as any).client_id) || 'Cliente';
      const srvNome = (c as any).service_name || getSrv((c as any).service_id) || 'Serviço';
      const dataCriacao = c.created_at ? c.created_at.split('T')[0] : hoje;

      if (c.parcelas && c.parcelas.length > 0) {
        c.parcelas.forEach(p => {
          let statusItem: 'LIBERADO' | 'CARENCIA_D30' | 'PAGO' = 'LIBERADO';
          let label = 'Liberado no Período';
          let cor = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
          let diasRestantes: number | undefined;

          if (p.status === 'PAID') {
            statusItem = 'PAGO';
            label = 'Pago / Quitado';
            cor = 'text-foreground/60 bg-foreground/5 border-foreground/20';
          } else if (c.payment_method === 'CREDITO') {
            if (p.due_date <= hoje) {
              statusItem = 'LIBERADO';
              label = 'Liberado (D+30 Cumprido)';
              cor = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
            } else {
              statusItem = 'CARENCIA_D30';
              const diffMs = new Date(p.due_date + 'T12:00:00').getTime() - new Date(hoje + 'T12:00:00').getTime();
              diasRestantes = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
              label = `Carência (${diasRestantes}d · ${fmtDate(p.due_date)})`;
              cor = 'text-amber-500 bg-amber-500/10 border-amber-500/30';
            }
          }

          list.push({
            id: `${c.id}-p${p.installment_number}`,
            data: dataCriacao,
            cliente: cliNome,
            servico: `${srvNome} (Parc. ${p.installment_number}/${c.installments || 1})`,
            valorServico: c.total_amount,
            comissaoPct: c.commission_pct,
            valorComissao: p.amount,
            formaPagamento: c.payment_method,
            dueDate: p.due_date,
            status: statusItem,
            labelStatus: label,
            badgeCor: cor,
            diasRestantes,
          });
        });
      } else {
        let statusItem: 'LIBERADO' | 'CARENCIA_D30' | 'PAGO' = 'LIBERADO';
        let label = 'Liberado no Período';
        let cor = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
        let diasRestantes: number | undefined;
        let dueDate = dataCriacao;

        if (c.status === 'PAID') {
          statusItem = 'PAGO';
          label = 'Pago / Quitado';
          cor = 'text-foreground/60 bg-foreground/5 border-foreground/20';
        } else if (c.payment_method === 'CREDITO') {
          const d = new Date(dataCriacao + 'T12:00:00');
          d.setDate(d.getDate() + 30);
          dueDate = d.toISOString().split('T')[0];
          if (dueDate <= hoje) {
            statusItem = 'LIBERADO';
            label = 'Liberado (D+30 Cumprido)';
            cor = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
          } else {
            statusItem = 'CARENCIA_D30';
            const diffMs = new Date(dueDate + 'T12:00:00').getTime() - new Date(hoje + 'T12:00:00').getTime();
            diasRestantes = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
            label = `Carência (${diasRestantes}d · ${fmtDate(dueDate)})`;
            cor = 'text-amber-500 bg-amber-500/10 border-amber-500/30';
          }
        }

        list.push({
          id: c.id,
          data: dataCriacao,
          cliente: cliNome,
          servico: srvNome,
          valorServico: c.total_amount,
          comissaoPct: c.commission_pct,
          valorComissao: c.total_commission,
          formaPagamento: c.payment_method,
          dueDate,
          status: statusItem,
          labelStatus: label,
          badgeCor: cor,
          diasRestantes,
        });
      }
    });

    return list.sort((a, b) => b.data.localeCompare(a.data));
  }, [minhasComissoes, hoje, clientes, servicos]);

  const totalLiberado = useMemo(() => {
    return extratoComissoes
      .filter(item => item.status === 'LIBERADO')
      .reduce((acc, item) => acc + item.valorComissao, 0);
  }, [extratoComissoes]);

  const totalCarenciaD30 = useMemo(() => {
    return extratoComissoes
      .filter(item => item.status === 'CARENCIA_D30')
      .reduce((acc, item) => acc + item.valorComissao, 0);
  }, [extratoComissoes]);

  const totalAReceber = useMemo(() => {
    return totalLiberado + totalCarenciaD30;
  }, [totalLiberado, totalCarenciaD30]);

  const totalPago = useMemo(() => {
    return extratoComissoes
      .filter(item => item.status === 'PAGO')
      .reduce((acc, item) => acc + item.valorComissao, 0);
  }, [extratoComissoes]);

  const itensFiltrados = useMemo(() => {
    if (filtroExtrato === 'liberados') return extratoComissoes.filter(i => i.status === 'LIBERADO');
    if (filtroExtrato === 'carencia') return extratoComissoes.filter(i => i.status === 'CARENCIA_D30');
    if (filtroExtrato === 'pagos') return extratoComissoes.filter(i => i.status === 'PAGO');
    return extratoComissoes;
  }, [extratoComissoes, filtroExtrato]);

  const meusAgendamentosHoje = useMemo(() => {
    if (!selectedProfId) return [];
    return agendamentos
      .filter(a => (a.profissional_id === selectedProfId || (Array.isArray(a.auxiliares_ids) && a.auxiliares_ids.includes(selectedProfId))) && a.data === selectedDate)
      .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
  }, [agendamentos, selectedDate, selectedProfId]);

  const emAtendimento = meusAgendamentosHoje.filter(a => a.status === 'em_atendimento');
  const proximos = meusAgendamentosHoje.filter(a => a.status === 'pendente' || a.status === 'confirmado');
  const concluidos = meusAgendamentosHoje.filter(a => a.status === 'concluido');

  const iniciarAtendimento = async (id: string) => {
    const success = await atualizarStatusAgendamento(id, 'em_atendimento');
    if (success) {
      setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status: 'em_atendimento' } : a));
    }
  };

  const encerrarAtendimento = async (id: string) => {
    const ag = agendamentos.find(a => a.id === id);
    if (ag) {
      abrirPreFechamento(ag);
    } else {
      const success = await atualizarStatusAgendamento(id, 'concluido');
      if (success) {
        setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status: 'concluido' } : a));
      }
    }
  };

  // --- HANDLERS: SERVIÇO NA CADEIRA ---
  const abrirModalServico = (ag: Agendamento) => {
    setActiveAgendamento(ag);
    setServicoEditandoId(ag.servico_id);
    const srvAtual = servicos.find(s => s.id === ag.servico_id);
    const precoAtual = (ag.total_amount != null && ag.total_amount > 0) ? ag.total_amount : (srvAtual?.preco || 0);
    setServicoPrecoEditado(String(precoAtual));
    setSubServicosEditados(Array.isArray(ag.sub_servicos) ? [...ag.sub_servicos] : []);
    setServicoModalOpen(true);
  };

  const handleSalvarServico = async () => {
    if (!activeAgendamento || !servicoEditandoId) return;
    setSalvandoServico(true);
    try {
      const novoPreco = parseFloat(servicoPrecoEditado) || 0;
      const ok = await atualizarProcedimentoCadeiraAgendamento({
        id: activeAgendamento.id,
        servico_id: servicoEditandoId,
        sub_servicos: subServicosEditados,
        total_amount: novoPreco,
      });
      if (ok) {
        const updated: Agendamento = {
          ...activeAgendamento,
          servico_id: servicoEditandoId,
          sub_servicos: subServicosEditados,
          total_amount: novoPreco,
        };
        setActiveAgendamento(updated);
        setAgendamentos(prev => prev.map(a => a.id === updated.id ? updated : a));
        setServicoModalOpen(false);
      } else {
        alert('Erro ao atualizar serviço na cadeira.');
      }
    } catch (err: any) {
      alert('Erro: ' + (err.message || 'Falha ao salvar'));
    } finally {
      setSalvandoServico(false);
    }
  };

  // --- HANDLERS: PACOTES DA CLIENTE ---
  const abrirModalPacotes = async (ag: Agendamento) => {
    setActiveAgendamento(ag);
    setLoadingPacotes(true);
    setPacoteModalOpen(true);
    setCriandoNovoPacote(false);
    setNovoPacoteNome('');
    setNovoPacoteServicoId(ag.servico_id);
    setNovoPacoteSessoes('4');
    setNovoPacoteValor('');
    try {
      const pacs = await fetchPacotesClientes(ag.cliente_id);
      setPacotesCliente(pacs);
    } catch (err) {
      console.error('Erro ao carregar pacotes:', err);
    } finally {
      setLoadingPacotes(false);
    }
  };

  const handleAbaterPacote = async (pacote: PacoteCliente) => {
    if (!activeAgendamento) return;
    const res = await abaterSessaoPacote(pacote.id, activeAgendamento.id);
    if (res.ok) {
      const updated: Agendamento = {
        ...activeAgendamento,
        descontado_pacote: true,
        pacote_utilizado_id: pacote.id,
        pacote_nome: pacote.nome_pacote,
        total_amount: 0,
      };
      await atualizarProcedimentoCadeiraAgendamento({
        id: activeAgendamento.id,
        servico_id: activeAgendamento.servico_id,
        total_amount: 0,
      });
      setActiveAgendamento(updated);
      setAgendamentos(prev => prev.map(a => a.id === updated.id ? updated : a));
      const pacs = await fetchPacotesClientes(activeAgendamento.cliente_id);
      setPacotesCliente(pacs);
    } else {
      alert('Erro ao abater sessão: ' + (res.error || 'Tente novamente'));
    }
  };

  const handleEstornarPacote = async () => {
    if (!activeAgendamento?.pacote_utilizado_id) return;
    const ok = await estornarSessaoPacote(activeAgendamento.pacote_utilizado_id);
    if (ok) {
      const srv = servicos.find(s => s.id === activeAgendamento.servico_id);
      const precoTabela = srv?.preco || 0;
      const updated: Agendamento = {
        ...activeAgendamento,
        descontado_pacote: false,
        pacote_utilizado_id: undefined,
        pacote_nome: undefined,
        total_amount: precoTabela,
      };
      await atualizarProcedimentoCadeiraAgendamento({
        id: activeAgendamento.id,
        servico_id: activeAgendamento.servico_id,
        total_amount: precoTabela,
      });
      setActiveAgendamento(updated);
      setAgendamentos(prev => prev.map(a => a.id === updated.id ? updated : a));
      const pacs = await fetchPacotesClientes(activeAgendamento.cliente_id);
      setPacotesCliente(pacs);
    }
  };

  const handleCriarPacote = async () => {
    if (!activeAgendamento || !novoPacoteNome || !novoPacoteServicoId) {
      alert('Preencha o nome do pacote e selecione o serviço.');
      return;
    }
    const sessoes = parseInt(novoPacoteSessoes) || 4;
    const valor = parseFloat(novoPacoteValor) || 0;
    const novo: PacoteCliente = {
      id: 'pac_' + Date.now(),
      cliente_id: activeAgendamento.cliente_id,
      servico_id: novoPacoteServicoId,
      nome_pacote: novoPacoteNome,
      sessoes_total: sessoes,
      sessoes_utilizadas: 0,
      sessoes_restantes: sessoes,
      valor_total_pago: valor,
      data_aquisicao: new Date().toISOString().split('T')[0],
      status: 'ATIVO',
    };
    const ok = await salvarPacoteCliente(novo);
    if (ok) {
      setCriandoNovoPacote(false);
      const pacs = await fetchPacotesClientes(activeAgendamento.cliente_id);
      setPacotesCliente(pacs);
    } else {
      alert('Erro ao salvar pacote da cliente.');
    }
  };

  // --- HANDLERS: PRÉ-FECHAMENTO DA CADEIRA ---
  const abrirPreFechamento = async (ag: Agendamento) => {
    setActiveAgendamento(ag);
    const srv = servicos.find(s => s.id === ag.servico_id);
    const precoBase = (ag.total_amount != null && ag.total_amount > 0)
      ? Number(ag.total_amount)
      : (srv?.preco || 0);
    setPreFechamentoPrecoServico(precoBase);
    setPreFechamentoDescontoValor(ag.desconto_valor ? String(ag.desconto_valor) : '');
    setPreFechamentoDescontoPct(ag.desconto_pct ? String(ag.desconto_pct) : '');
    setPreFechamentoAgnaldoRecebe(ag.agnaldo_recebe_comissao !== false);
    const itens = await fetchItensComanda(ag.id);
    setComandaAtual(itens);
    setPreFechamentoModalOpen(true);
  };

  // --- HANDLERS: AGENDA DO PROFISSIONAL (MARCAR & EXCLUIR) ---
  const abrirModalNovoAgendamento = () => {
    setNovoAgData(selectedDate);
    setNovoAgHoraInicio('10:00');
    setNovoAgClienteId(clientes[0]?.id || '');
    setNovoAgServicoId(servicos[0]?.id || '');
    setNovoAgModalOpen(true);
  };

  const handleCriarNovoAgendamento = async () => {
    if (!novoAgClienteId || !novoAgServicoId || !novoAgHoraInicio || !selectedProfId) {
      alert('Preencha cliente, serviço e horário.');
      return;
    }
    setNovoAgLoading(true);
    try {
      const srv = servicos.find(s => s.id === novoAgServicoId);
      const durMin = srv?.duracao_min || 60;
      const [h, m] = novoAgHoraInicio.split(':').map(Number);
      const dt = new Date();
      dt.setHours(h, (m || 0) + durMin, 0);
      const horaFim = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      const res = await criarAgendamento({
        cliente_id: novoAgClienteId,
        profissional_id: selectedProfId,
        servico_id: novoAgServicoId,
        data: novoAgData || hoje,
        hora_inicio: novoAgHoraInicio,
        hora_fim: horaFim,
        canal: 'recepcao',
      });

      if (res?.id) {
        setNovoAgModalOpen(false);
        const ags = await fetchAgendamentos({ data: novoAgData || hoje });
        setAgendamentos(ags);
      } else {
        alert('Não foi possível criar o agendamento.');
      }
    } catch (err: any) {
      alert('Erro: ' + (err.message || 'Erro ao agendar'));
    } finally {
      setNovoAgLoading(false);
    }
  };

  const abrirModalExcluirAgendamento = (ag: Agendamento) => {
    setApptParaExcluir(ag);
    setCancelarAgModalOpen(true);
  };

  const handleConfirmarExclusaoAgendamento = async () => {
    if (!apptParaExcluir) return;
    setExcluindoAgLoading(true);
    try {
      const ok = await excluirAgendamentoAdmin(apptParaExcluir.id);
      if (ok) {
        setAgendamentos(prev => prev.filter(a => a.id !== apptParaExcluir.id));
        setCancelarAgModalOpen(false);
        setApptParaExcluir(null);
      } else {
        alert('Erro ao excluir agendamento.');
      }
    } catch (err: any) {
      alert('Erro: ' + (err.message || 'Falha ao excluir'));
    } finally {
      setExcluindoAgLoading(false);
    }
  };

  const abrirModalInsumos = async (ag: Agendamento) => {
    setActiveAgendamento(ag);
    setEditingInsumoIndex(null);
    setInsumoEtapa('Etapa 1 - Descoloração / Mechas');
    setInsumoProfId(selectedProfId || ag.profissional_id);
    setInsumoSelecionado('');
    setInsumoQty('');
    const itens = await fetchItensComanda(ag.id);
    setComandaAtual(itens);
    setInsumosModalOpen(true);
  };

  const abrirModalUpsell = async (ag: Agendamento) => {
    setActiveAgendamento(ag);
    const itens = await fetchItensComanda(ag.id);
    setComandaAtual(itens);
    setUpsellModalOpen(true);
  };

  const handleEditarInsumo = (index: number) => {
    if (!activeAgendamento || !activeAgendamento.insumos_detalhes?.[index]) return;
    const item = activeAgendamento.insumos_detalhes[index];
    setEditingInsumoIndex(index);
    setInsumoEtapa(item.etapa || 'Etapa 1 - Descoloração / Mechas');
    setInsumoProfId(item.profissional_id || activeAgendamento.profissional_id);
    setInsumoSelecionado(item.inventory_id);
    setInsumoQty(String(item.qty_used));
  };

  const handleCancelarEdicaoInsumo = () => {
    setEditingInsumoIndex(null);
    setInsumoSelecionado('');
    setInsumoQty('');
  };

  const handleSalvarInsumo = async () => {
    if (!activeAgendamento || !insumoSelecionado || !insumoQty) return;
    
    const qtyNum = parseFloat(insumoQty);
    if (isNaN(qtyNum) || qtyNum <= 0) return;

    const prod = estoque.find(p => p.id === insumoSelecionado);
    if (!prod) return;

    const custoUn = (prod.price_per_gram && prod.price_per_gram > 0)
      ? prod.price_per_gram
      : ((prod.cost_price && prod.cost_price > 0) ? prod.cost_price / 500 : 0.10);

    const profId = insumoProfId || selectedProfId || activeAgendamento.profissional_id;
    const profNome = profissionais.find(p => p.id === profId)?.nome || 'Profissional';
    const cliNome = getClienteNome(activeAgendamento.cliente_id);

    const itemEditando = (editingInsumoIndex !== null && activeAgendamento.insumos_detalhes)
      ? activeAgendamento.insumos_detalhes[editingInsumoIndex]
      : null;

    const novoItem: InsumoAtendimento = {
      inventory_id: prod.id,
      name: prod.name,
      unit: prod.unit || 'g',
      price_per_gram: custoUn,
      custo_unitario: custoUn,
      qty_used: qtyNum,
      custo_total: Number((custoUn * qtyNum).toFixed(2)),
      etapa: insumoEtapa,
      profissional_id: profId,
      horario: itemEditando?.horario || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setInsumoLoading(true);
    try {
      if (editingInsumoIndex !== null && itemEditando) {
        // Modo Edição
        const res = await editarInsumoTempoRealProcedimento({
          appointmentId: activeAgendamento.id,
          index: editingInsumoIndex,
          novoInsumo: novoItem,
          nomeProfissional: profNome,
          nomeCliente: cliNome,
        });

        if (res.ok) {
          const updatedAg: Agendamento = {
            ...activeAgendamento,
            insumos_detalhes: res.insumosAtualizados,
            product_cost: res.productCost,
          };
          setActiveAgendamento(updatedAg);
          setAgendamentos(prev => prev.map(a => a.id === updatedAg.id ? updatedAg : a));
          const itens = await fetchItensComanda(activeAgendamento.id);
          setComandaAtual(itens);
          setEditingInsumoIndex(null);
          setInsumoSelecionado('');
          setInsumoQty('');
        } else {
          alert('Erro ao atualizar insumo: ' + (res.error || 'Tente novamente'));
        }
      } else {
        // Modo Novo Insumo
        const res = await salvarInsumoTempoRealProcedimento({
          appointmentId: activeAgendamento.id,
          insumo: novoItem,
          nomeProfissional: profNome,
          nomeCliente: cliNome,
        });

        if (res.ok) {
          const updatedAg: Agendamento = {
            ...activeAgendamento,
            insumos_detalhes: res.insumosAtualizados,
            product_cost: res.productCost,
          };
          setActiveAgendamento(updatedAg);
          setAgendamentos(prev => prev.map(a => a.id === updatedAg.id ? updatedAg : a));
          const itens = await fetchItensComanda(activeAgendamento.id);
          setComandaAtual(itens);
          setInsumoSelecionado('');
          setInsumoQty('');
        } else {
          alert('Erro ao registrar aplicação: ' + (res.error || 'Tente novamente'));
        }
      }
    } catch (err: any) {
      alert('Erro ao registrar aplicação: ' + err?.message);
    } finally {
      setInsumoLoading(false);
    }
  };

  const handleRemoverInsumo = async (index: number) => {
    if (!activeAgendamento) return;
    if (!confirm('Deseja estornar esta aplicação do produto?')) return;

    setInsumoLoading(true);
    try {
      const res = await removerInsumoTempoRealProcedimento({
        appointmentId: activeAgendamento.id,
        index,
        nomeProfissional: profissionais.find(p => p.id === selectedProfId)?.nome,
      });

      if (res.ok) {
        const updatedAg: Agendamento = {
          ...activeAgendamento,
          insumos_detalhes: res.insumosAtualizados,
          product_cost: res.productCost,
        };
        setActiveAgendamento(updatedAg);
        setAgendamentos(prev => prev.map(a => a.id === updatedAg.id ? updatedAg : a));
        const itens = await fetchItensComanda(activeAgendamento.id);
        setComandaAtual(itens);

        if (editingInsumoIndex === index) {
          setEditingInsumoIndex(null);
          setInsumoSelecionado('');
          setInsumoQty('');
        }
      }
    } catch (err: any) {
      alert('Erro ao remover: ' + err?.message);
    } finally {
      setInsumoLoading(false);
    }
  };

  const prodSelMeuPainel = produtosLoja.find(p => p.id === produtoSelecionado);
  const qNumMeuPainel = Math.max(1, parseInt(produtoQty) || 1);
  const subtotalProdMeuPainel = (prodSelMeuPainel?.price || 0) * qNumMeuPainel;

  const handleProdDescPct = (pctStr: string) => {
    setProdutoDescPct(pctStr);
    const p = parseFloat(pctStr);
    if (isNaN(p) || p <= 0) {
      setProdutoDescValor('');
    } else {
      const clamped = Math.min(100, Math.max(0, p));
      const val = (subtotalProdMeuPainel * clamped) / 100;
      setProdutoDescValor(val.toFixed(2));
    }
  };

  const handleProdDescValor = (valStr: string) => {
    setProdutoDescValor(valStr);
    const v = parseFloat(valStr);
    if (isNaN(v) || v <= 0 || subtotalProdMeuPainel <= 0) {
      setProdutoDescPct('');
    } else {
      const clampedVal = Math.min(subtotalProdMeuPainel, Math.max(0, v));
      const p = (clampedVal / subtotalProdMeuPainel) * 100;
      setProdutoDescPct(p % 1 === 0 ? p.toFixed(0) : p.toFixed(1));
    }
  };

  const handleSalvarProduto = async () => {
    if (!activeAgendamento || !produtoSelecionado || !produtoQty) return;
    
    const qtyNum = parseInt(produtoQty);
    if (isNaN(qtyNum) || qtyNum <= 0) return;

    const prod = produtosLoja.find(p => p.id === produtoSelecionado);
    if (!prod) return;

    const stockDisponivel = Number(prod.stock_quantity ?? (prod as any).stock ?? (prod as any).stock_qty ?? 0);
    if (stockDisponivel <= 0) {
      alert('Produto com estoque zerado no momento. Não é possível lançar.');
      return;
    }

    const finalQty = Math.min(qtyNum, stockDisponivel);
    const precoBase = prod.price ?? 0;
    const sub = precoBase * finalQty;
    const descVal = Math.min(sub, Math.max(0, parseFloat(produtoDescValor) || 0));
    const precoFinalUnit = (sub - descVal) / finalQty;

    await salvarItemComanda(activeAgendamento.id, {
      inventory_id: produtoSelecionado,
      type: 'PRODUTO',
      qty: finalQty,
      price: precoFinalUnit
    });

    const itens = await fetchItensComanda(activeAgendamento.id);
    setComandaAtual(itens);
    setProdutoSelecionado('');
    setProdutoQty('1');
    setProdutoDescPct('');
    setProdutoDescValor('');
  };

  const insumosDoEstoque = estoque.filter(p => p.allow_procedure_use && (p.stock_qty ?? 0) > 0);
  const produtosDeVenda = estoque.filter(p => p.allow_sale && (p.stock_qty ?? 0) > 0);

  if (loading) {
    return <div className="p-8 text-center text-foreground/50">Carregando painel...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <SectionHeader
        title="Meu Painel Interativo"
        description="Controle seus atendimentos em andamento, lance insumos e feche as comandas da sua cadeira."
      />

      {/* Seletor do Profissional / Auxiliar Atuante */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-foreground/[0.03] border border-[var(--border-subtle)] p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-gold shrink-0">
            <User2 size={20} />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-foreground/50 uppercase tracking-wider block">
              {isAuxiliarCabelo ? 'Cadeira em Atendimento (Auxiliar de Cabelo):' : 'Profissional / Cadeira Atuante:'}
            </label>
            {isRestrictedProfissional ? (
              <div className="bg-[var(--background)] border border-gold/40 rounded-lg px-3 py-1.5 text-sm font-bold text-foreground flex items-center gap-2">
                <span>{profissionais.find(p => p.id === selectedProfId)?.nome || 'Sua Cadeira'}</span>
                <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-gold/15 text-gold font-extrabold tracking-wider border border-gold/30">
                  Sua Cadeira
                </span>
              </div>
            ) : (
              <select
                className="bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm font-bold text-foreground focus:outline-none focus:border-gold cursor-pointer"
                value={selectedProfId}
                onChange={e => setSelectedProfId(e.target.value)}
              >
                {profissionais.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nome} {isAuxiliarCabelo ? '✂️' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        <div className="text-xs text-foreground/60 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
          <span>Insumos lançados aqui dão baixa e sincronizam em tempo real</span>
        </div>
      </div>

      {/* Alerta de Atendimentos Pendentes de Fechamento de Dias Anteriores */}
      {pendenciasPassadas.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-500 shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>{pendenciasPassadas.length} cliente(s) de dias anteriores sem fechamento</span>
                <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 font-extrabold tracking-wider">
                  Pendente
                </span>
              </p>
              <p className="text-xs text-foreground/60 mt-0.5">
                Estes atendimentos ficaram em aberto. Clique no cliente abaixo para abrir a data e fechar:
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {pendenciasPassadas.slice(0, 4).map(pen => (
              <button
                key={pen.id}
                type="button"
                onClick={() => {
                  setSelectedDate(pen.data);
                  abrirPreFechamento(pen);
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 font-bold text-xs border border-amber-500/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Calendar size={13} /> {fmtDate(pen.data)} · {getClienteNome(pen.cliente_id).split(' ')[0]} (Fechar)
              </button>
            ))}
            {pendenciasPassadas.length > 4 && (
              <span className="text-xs text-foreground/50">+{pendenciasPassadas.length - 4} mais</span>
            )}
          </div>
        </div>
      )}

      {/* Seletor de Data da Cadeira & Agenda */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-foreground/[0.03] border border-[var(--border-subtle)] p-3.5 rounded-xl">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-foreground/60 uppercase tracking-wider flex items-center gap-1.5 mr-1">
            <Calendar size={15} className="text-gold" /> Data da Cadeira & Agenda:
          </span>

          <div className="flex items-center gap-1 bg-background border border-[var(--border-subtle)] rounded-lg p-0.5 shadow-2xs">
            <button
              type="button"
              title="Dia Anterior"
              onClick={() => mudarData(-1)}
              className="p-1.5 rounded-md hover:bg-foreground/5 text-foreground/70 hover:text-foreground transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>

            <button
              type="button"
              onClick={() => setSelectedDate(hoje)}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                selectedDate === hoje
                  ? 'bg-gold text-white shadow-2xs'
                  : 'hover:bg-foreground/5 text-foreground/70'
              }`}
            >
              Hoje
            </button>

            <button
              type="button"
              title="Próximo Dia"
              onClick={() => mudarData(1)}
              className="p-1.5 rounded-md hover:bg-foreground/5 text-foreground/70 hover:text-foreground transition-colors cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="relative flex items-center">
            <input
              type="date"
              value={selectedDate}
              onChange={e => e.target.value && setSelectedDate(e.target.value)}
              className="bg-background border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-xs font-bold text-foreground focus:outline-none focus:border-gold cursor-pointer"
            />
          </div>

          {selectedDate !== hoje && (
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-lg font-bold text-xs border flex items-center gap-1.5 ${
                selectedDate < hoje
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                  : 'bg-blue-500/15 text-blue-500 border-blue-500/30'
              }`}>
                <Clock size={13} />
                {selectedDate < hoje ? `Data Passada (${fmtDate(selectedDate)}) • Modo Fechamento Retroativo` : `Data Futura (${fmtDate(selectedDate)})`}
              </span>
              <button
                type="button"
                onClick={() => setSelectedDate(hoje)}
                className="text-xs text-gold hover:underline font-bold cursor-pointer"
              >
                Voltar para Hoje
              </button>
            </div>
          )}
        </div>

        {loadingAgendamentos && (
          <span className="text-xs text-gold flex items-center gap-1.5 animate-pulse font-medium">
            <RefreshCw size={13} className="animate-spin" /> Atualizando atendimentos...
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUNA ESQUERDA: Cadeira Atual & Multitarefas */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            Na Cadeira {selectedDate !== hoje ? `(${fmtDate(selectedDate)})` : 'Agora'}
          </h2>

          {emAtendimento.length === 0 ? (
            <CardGlass className="p-8 text-center text-foreground/50 border-dashed">
              {selectedDate === hoje 
                ? 'Nenhuma cliente na cadeira no momento para este profissional.'
                : `Nenhuma cliente em atendimento na cadeira na data ${fmtDate(selectedDate)}.`}
            </CardGlass>
          ) : (
            <div className="space-y-4">
              {emAtendimento.map(ag => {
                const isAuxiliar = ag.profissional_id !== selectedProfId && Array.isArray(ag.auxiliares_ids) && ag.auxiliares_ids.includes(selectedProfId);
                const titularNome = profissionais.find(p => p.id === ag.profissional_id)?.nome || 'Titular';

                return (
                  <CardGlass key={ag.id} className="p-0 overflow-hidden relative border-[var(--border-subtle)]">
                    <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
                    
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          {isAuxiliar && (
                            <span className="px-2 py-0.5 rounded bg-gold/15 text-gold-dim dark:text-gold font-bold text-[10px] border border-gold/30 flex items-center gap-1 w-fit mb-1.5">
                              <Users size={11} className="text-gold" /> Auxiliar de {titularNome}
                            </span>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-2xl font-bold text-foreground">
                              {getClienteNome(ag.cliente_id)}
                            </h3>
                            {ag.descontado_pacote && (
                              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 font-bold text-xs border border-purple-500/30 flex items-center gap-1">
                                <Package size={12} /> {ag.pacote_nome || 'Pacote Pré-Pago'}
                              </span>
                            )}
                          </div>
                          <p className="text-foreground/70 font-medium mt-0.5">
                            {getServicoNome(ag.servico_id)}
                            {Array.isArray(ag.sub_servicos) && ag.sub_servicos.length > 0 && (
                              <span className="text-xs text-foreground/50 ml-1">
                                + {ag.sub_servicos.map(s => typeof s === 'string' ? getServicoNome(s) : s.nome || getServicoNome(s.id)).join(' + ')}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-foreground/50">Iniciado às</p>
                          <p className="text-xl font-mono text-foreground font-bold">{ag.hora_inicio}</p>
                          {ag.product_cost != null && Number(ag.product_cost) > 0 && (
                            <p className="text-xs font-mono text-emerald-500 font-bold mt-1 flex items-center justify-end gap-1">
                              <Beaker size={12} /> R$ {Number(ag.product_cost).toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* AS 3 OPÇÕES DA CADEIRA: SERVIÇO, PRODUTO (INSUMOS) E PACOTE */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-foreground/[0.02] border border-[var(--border-subtle)] mt-4">
                        {/* OPÇÃO 1: SERVIÇO */}
                        <button
                          type="button"
                          onClick={() => abrirModalServico(ag)}
                          className="p-3 rounded-lg border border-gold/30 hover:border-gold hover:bg-gold/10 text-left transition-all flex flex-col justify-between group cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-1.5">
                              <Scissors size={14} /> Serviço
                            </span>
                            <Pencil size={13} className="text-foreground/40 group-hover:text-gold" />
                          </div>
                          <div className="mt-2">
                            <p className="text-sm font-semibold text-foreground truncate">{getServicoNome(ag.servico_id)}</p>
                            <p className="text-[11px] text-foreground/50">
                              {ag.total_amount != null && ag.total_amount > 0 ? fmt(ag.total_amount) : 'Preço de Tabela'} • Alterar/Ajustar
                            </p>
                          </div>
                        </button>

                        {/* OPÇÃO 2: PRODUTO (INSUMOS) */}
                        <button
                          type="button"
                          onClick={() => abrirModalInsumos(ag)}
                          className="p-3 rounded-lg border border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-500/10 text-left transition-all flex flex-col justify-between group cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                              <Beaker size={14} /> Produto (Insumos)
                            </span>
                            {ag.insumos_detalhes && ag.insumos_detalhes.length > 0 && (
                              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400">
                                {ag.insumos_detalhes.length} itens
                              </span>
                            )}
                          </div>
                          <div className="mt-2">
                            <p className="text-sm font-semibold text-foreground">
                              {ag.product_cost && Number(ag.product_cost) > 0 ? fmt(Number(ag.product_cost)) : 'Nenhum lançado'}
                            </p>
                            <p className="text-[11px] text-foreground/50">Lançar produtos da etapa e pesar</p>
                          </div>
                        </button>

                        {/* OPÇÃO 3: PACOTE */}
                        <button
                          type="button"
                          onClick={() => abrirModalPacotes(ag)}
                          className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between group cursor-pointer ${
                            ag.descontado_pacote 
                              ? 'border-purple-500 bg-purple-500/15 ring-1 ring-purple-500/40' 
                              : 'border-purple-500/30 hover:border-purple-500 hover:bg-purple-500/10'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                              <Package size={14} /> Pacote
                            </span>
                            {ag.descontado_pacote ? (
                              <CheckCircle2 size={15} className="text-purple-400" />
                            ) : (
                              <span className="text-[10px] text-foreground/40 font-mono">Pré-pago</span>
                            )}
                          </div>
                          <div className="mt-2">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {ag.descontado_pacote ? (ag.pacote_nome || 'Pacote Abatido') : 'Consultar Pacote'}
                            </p>
                            <p className="text-[11px] text-foreground/50">
                              {ag.descontado_pacote ? 'Sessão descontada ✓' : 'Descontar sessão pré-paga'}
                            </p>
                          </div>
                        </button>
                      </div>

                      {/* BOTÕES DE VENDER PRODUTO & PRÉ-FECHAMENTO */}
                      <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-[var(--border-subtle)]">
                        <Button 
                          variant="secondary" 
                          onClick={() => abrirModalUpsell(ag)}
                          className="border border-[var(--border-subtle)] hover:border-gold/40 flex items-center gap-2"
                        >
                          <ShoppingBag size={16} className="text-gold" /> Vender Produto (Upsell)
                        </Button>

                        <Button 
                          variant="primary" 
                          onClick={() => abrirPreFechamento(ag)}
                          className="bg-gold hover:bg-gold-dim text-white font-bold flex items-center gap-2 px-5 py-2.5 shadow-md"
                        >
                          <CheckCircle2 size={16} /> Encerrar Atendimento (Pré-Fechamento)
                        </Button>
                      </div>
                    </div>
                  </CardGlass>
                );
              })}
            </div>
          )}

          <h2 className="text-xl font-bold mt-8">Vitrine de Afiliado</h2>
          <CardGlass className="p-6">
            <p className="text-sm text-foreground/70 mb-4">
              Gere links de produtos para suas clientes com seu código de comissão embutido.
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setCatalogoModalOpen(true)}>
                <Share2 size={16} /> Abrir Catálogo para Compartilhar
              </Button>
            </div>
          </CardGlass>

          <h2 className="text-xl font-bold mt-8 flex items-center gap-2">
            <DollarSign className="text-gold" />
            Minhas Comissões & Fechamento
          </h2>
          <CardGlass className="p-6 space-y-5 shadow-sm">
            {/* Cabeçalho do Período */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
              <div>
                <p className="text-xs uppercase font-bold tracking-wider text-foreground/50">Seu Período de Recebimento</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">
                  Como você prefere receber o fechamento das suas comissões?
                </p>
              </div>
              {(() => {
                const profAtivo = profissionais.find(p => p.id === selectedProfId);
                const periodo = profAtivo?.periodo_recebimento || 'semanal';
                return (
                  <span className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 border ${
                    periodo === 'quinzenal'
                      ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                      : periodo === 'mensal'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                  }`}>
                    {periodo === 'quinzenal' ? '🌓 Quinzenal (15 dias)' : periodo === 'mensal' ? '📅 Mensal (Mês)' : '🗓️ Semanal (7 dias)'}
                  </span>
                );
              })()}
            </div>

            {/* Seletor Interativo do Profissional */}
            <div>
              <p className="text-xs text-foreground/60 mb-2">Clique para definir sua frequência de recebimento:</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  { id: 'semanal', label: 'Semanal', desc: 'A cada 7 dias (Toda semana)', icon: '🗓️' },
                  { id: 'quinzenal', label: 'Quinzenal', desc: 'A cada 15 dias (Quinzena)', icon: '🌓' },
                  { id: 'mensal', label: 'Mensal', desc: 'A cada mês (Fechamento do mês)', icon: '📅' },
                ].map(item => {
                  const profAtivo = profissionais.find(p => p.id === selectedProfId);
                  const isSelected = (profAtivo?.periodo_recebimento || 'semanal') === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={salvandoPeriodo}
                      onClick={() => handleAlterarMeuPeriodo(item.id as PeriodoRecebimentoComissao)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-gold/15 border-gold text-foreground shadow-sm ring-1 ring-gold/40'
                          : 'bg-foreground/[0.02] border-[var(--border-subtle)] text-foreground/70 hover:border-gold/30 hover:bg-foreground/[0.05]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold flex items-center gap-1.5">
                          <span>{item.icon}</span> {item.label}
                        </span>
                        {isSelected && <CheckCircle2 size={15} className="text-gold" />}
                      </div>
                      <p className="text-[10px] text-foreground/50 mt-1">{item.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PRÉVIA DOS VALORES A RECEBER (CARDS DE RESUMO) */}
            <div className="pt-2 border-t border-[var(--border-subtle)] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles size={16} className="text-gold" />
                    Prévia dos Valores a Receber
                  </h3>
                  <p className="text-xs text-foreground/60">
                    Valores apurados em tempo real das suas comissões e recebíveis do Studio.
                  </p>
                </div>
                {loadingComissoes && (
                  <span className="text-xs text-gold flex items-center gap-1 animate-pulse">
                    <RefreshCw size={12} className="animate-spin" /> Atualizando...
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Liberado no Período */}
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400">
                    <span>Liberado p/ Fechamento</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  </div>
                  <div className="my-2">
                    <span className="text-xl font-bold font-mono text-emerald-400 tracking-tight">
                      {fmt(totalLiberado)}
                    </span>
                  </div>
                  <span className="text-[10px] text-foreground/50">
                    {extratoComissoes.filter(i => i.status === 'LIBERADO').length} item(ns) liberados
                  </span>
                </div>

                {/* 2. Em Carência D+30 */}
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[11px] font-bold text-amber-400">
                    <span>Carência Cartão (D+30)</span>
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  </div>
                  <div className="my-2">
                    <span className="text-xl font-bold font-mono text-amber-400 tracking-tight">
                      {fmt(totalCarenciaD30)}
                    </span>
                  </div>
                  <span className="text-[10px] text-foreground/50">
                    {extratoComissoes.filter(i => i.status === 'CARENCIA_D30').length} parcela(s) futuras
                  </span>
                </div>

                {/* 3. Total a Receber */}
                <div className="p-3.5 rounded-xl bg-gold/10 border border-gold/30 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[11px] font-bold text-gold">
                    <span>Total a Receber</span>
                    <DollarSign size={14} className="text-gold" />
                  </div>
                  <div className="my-2">
                    <span className="text-xl font-bold font-mono text-foreground tracking-tight">
                      {fmt(totalAReceber)}
                    </span>
                  </div>
                  <span className="text-[10px] text-foreground/50">
                    Liberados + futuros de cartão
                  </span>
                </div>

                {/* 4. Histórico Quitado */}
                <div className="p-3.5 rounded-xl bg-foreground/[0.03] border border-[var(--border-subtle)] shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[11px] font-bold text-foreground/60">
                    <span>Já Pago (Histórico)</span>
                    <CheckCircle2 size={13} className="text-foreground/40" />
                  </div>
                  <div className="my-2">
                    <span className="text-xl font-bold font-mono text-foreground/70 tracking-tight">
                      {fmt(totalPago)}
                    </span>
                  </div>
                  <span className="text-[10px] text-foreground/50">
                    {extratoComissoes.filter(i => i.status === 'PAGO').length} pagamento(s) quitados
                  </span>
                </div>
              </div>
            </div>

            {/* AÇÕES DE FILTRO RÁPIDO DO EXTRATO (SEM NAVEGAR PARA FORA) */}
            <div className="pt-2 flex flex-wrap items-center gap-2">
              {(() => {
                const profAtivo = profissionais.find(p => p.id === selectedProfId);
                const periodo = profAtivo?.periodo_recebimento || 'semanal';
                const labelFechamento = periodo === 'quinzenal' ? 'Fechamento Quinzenal' : periodo === 'mensal' ? 'Fechamento Mensal' : 'Fechamento Semanal';
                return (
                  <Button 
                    type="button"
                    variant={filtroExtrato === 'liberados' ? 'primary' : 'secondary'} 
                    className="flex-1 text-xs font-bold"
                    onClick={() => setFiltroExtrato('liberados')}
                  >
                    <CalendarDays size={15} />
                    <span>{labelFechamento} ({fmt(totalLiberado)})</span>
                  </Button>
                );
              })()}
              <Button 
                type="button"
                variant={filtroExtrato === 'carencia' ? 'primary' : 'outline'} 
                className="flex-1 text-xs font-bold border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
                onClick={() => setFiltroExtrato('carencia')}
              >
                <CreditCard size={15} />
                <span>Consultar Recebíveis (D+30: {fmt(totalCarenciaD30)})</span>
              </Button>
              <Button 
                type="button"
                variant={filtroExtrato === 'todos' ? 'primary' : 'outline'} 
                className="text-xs"
                onClick={() => setFiltroExtrato('todos')}
              >
                Todos ({extratoComissoes.length})
              </Button>
            </div>

            {/* EXTRATO DISCRIMINADO DA PRÉVIA */}
            <div className="pt-3 border-t border-[var(--border-subtle)] space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Extrato Discriminado · {
                    filtroExtrato === 'liberados' ? 'Liberados para Fechamento' :
                    filtroExtrato === 'carencia' ? 'Em Carência de Cartão (D+30)' :
                    filtroExtrato === 'pagos' ? 'Histórico Quitado' : 'Todas as Comissões'
                  }
                </p>
                <span className="text-[11px] text-foreground/50">
                  {itensFiltrados.length} registro(s)
                </span>
              </div>

              {itensFiltrados.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-foreground/[0.02] border border-dashed border-[var(--border-subtle)]">
                  <p className="text-xs text-foreground/50 font-medium">
                    Nenhuma comissão encontrada para este filtro no momento.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {itensFiltrados.map((item) => {
                    const cfgPgto = PAGAMENTO_CONFIG[item.formaPagamento] || PAGAMENTO_CONFIG.DINHEIRO;
                    const IconPgto = cfgPgto.icon;
                    return (
                      <div 
                        key={item.id}
                        className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--background)] hover:border-gold/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-foreground truncate">{item.cliente}</span>
                            <span className="text-[10px] font-mono text-foreground/50">· {fmtDate(item.data)}</span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${item.badgeCor}`}>
                              {item.labelStatus}
                            </span>
                          </div>
                          <p className="text-[11px] text-foreground/70 truncate mt-0.5">{item.servico}</p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-foreground/50 flex-wrap">
                            <span className="flex items-center gap-1 font-medium">
                              <IconPgto size={12} className={cfgPgto.cor} />
                              {cfgPgto.label} ({cfgPgto.badge})
                            </span>
                            <span>•</span>
                            <span>Serviço: {fmt(item.valorServico)} ({item.comissaoPct}%)</span>
                            {item.status === 'CARENCIA_D30' && item.diasRestantes && (
                              <>
                                <span>•</span>
                                <span className="text-amber-500 font-medium">Liberação prevista: {fmtDate(item.dueDate)}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="text-left sm:text-right shrink-0">
                          <p className="text-[10px] uppercase font-bold text-foreground/50">Sua Comissão</p>
                          <p className="text-base font-bold font-mono text-gold tracking-tight">
                            {fmt(item.valorComissao)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardGlass>
        </div>

        {/* COLUNA DIREITA: Atendimentos da Data */}
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Clock className="text-foreground/50" />
                {selectedDate === hoje ? 'Próximos Hoje' : `Atendimentos de ${fmtDate(selectedDate)}`}
              </h2>
              {selectedDate !== hoje && (
                <p className="text-[11px] text-foreground/50 mt-0.5">
                  {selectedDate < hoje ? 'Fechamento retroativo de clientes da data' : 'Agendamentos futuros'}
                </p>
              )}
            </div>
            <Button 
              variant="primary" 
              size="sm" 
              onClick={abrirModalNovoAgendamento}
              className="bg-gold hover:bg-gold-dim text-white font-bold text-xs flex items-center gap-1 shadow-xs"
            >
              <Plus size={14} /> Marcar Cliente
            </Button>
          </div>

          <div className="space-y-3">
            {proximos.length === 0 ? (
              <p className="text-sm text-foreground/50 text-center py-4">
                {selectedDate === hoje ? 'Agenda livre hoje.' : `Nenhum agendamento pendente em ${fmtDate(selectedDate)}.`}
              </p>
            ) : (
              proximos.map(ag => (
                <CardGlass key={ag.id} className="p-4 hover:border-foreground/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="text-center font-mono text-sm text-foreground/50 font-bold shrink-0">
                      {ag.hora_inicio}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate text-sm">{getClienteNome(ag.cliente_id)}</p>
                      <p className="text-xs text-foreground/50 truncate">{getServicoNome(ag.servico_id)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="px-2.5 py-1 text-xs border-gold/40 hover:bg-gold/10 text-gold flex items-center gap-1 font-semibold"
                        onClick={() => iniciarAtendimento(ag.id)}
                      >
                        <Play size={13} /> Puxar
                      </Button>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="px-2.5 py-1 text-xs border border-[var(--border-subtle)] hover:border-gold/40 text-foreground flex items-center gap-1 font-semibold"
                        onClick={() => abrirPreFechamento(ag)}
                      >
                        <CheckCircle2 size={13} className="text-gold" /> Fechar
                      </Button>
                      <button
                        type="button"
                        title="Excluir ou Cancelar Atendimento"
                        onClick={() => abrirModalExcluirAgendamento(ag)}
                        className="p-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/10 text-red-400 hover:text-red-500 transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </CardGlass>
              ))
            )}
          </div>

          <h2 className="text-lg font-bold mt-8 pt-6 border-t border-[var(--border-subtle)]">Concluídos</h2>
          <div className="space-y-2 mt-4">
            {concluidos.length === 0 ? (
              <p className="text-xs text-foreground/50">Nenhum ainda.</p>
            ) : (
              concluidos.map(ag => (
                <div key={ag.id} className="flex justify-between items-center text-sm p-2 rounded-md bg-foreground/5">
                  <span className="text-foreground/50">{ag.hora_inicio}</span>
                  <span className="truncate flex-1 px-3 text-foreground/80">{getClienteNome(ag.cliente_id)}</span>
                  <CheckCircle2 size={14} className="text-green-500" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* MODAL INSUMOS EM TEMPO REAL */}
      {insumosModalOpen && activeAgendamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <CardGlass className="w-full max-w-xl p-6 max-h-[92vh] overflow-y-auto border border-[var(--border-subtle)] shadow-2xl">
            <div className="flex justify-between items-start mb-4 border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-gold/15 text-gold border border-gold/30">
                  <Beaker size={20} />
                </span>
                <div>
                  <h3 className="text-xl font-bold font-serif text-foreground">Lançar Produtos da Etapa</h3>
                  <p className="text-xs text-foreground/60">
                    Aplicação em tempo real • Baixa no estoque imediata
                  </p>
                </div>
              </div>
              <button onClick={() => setInsumosModalOpen(false)}>
                <X className="text-foreground/50 hover:text-foreground" />
              </button>
            </div>

            <div className="bg-foreground/[0.03] border border-[var(--border-subtle)] rounded-xl p-3.5 mb-4 flex justify-between items-center text-xs">
              <div>
                <span className="text-foreground/50 block text-[11px] uppercase font-semibold">Cliente & Procedimento</span>
                <span className="font-bold text-foreground text-base block">{getClienteNome(activeAgendamento.cliente_id)}</span>
                <span className="text-foreground/80 block font-medium mt-0.5">{getServicoNome(activeAgendamento.servico_id)}</span>
              </div>
              <div className="text-right">
                <span className="text-foreground/50 block text-[11px] uppercase font-semibold">Custo Acumulado</span>
                <span className="font-mono font-bold text-foreground text-lg block">
                  R$ {Number(activeAgendamento.product_cost || 0).toFixed(2)}
                </span>
              </div>
            </div>
            
            <div className={`border rounded-xl p-4 mb-6 space-y-3.5 transition-all ${
              editingInsumoIndex !== null 
                ? 'bg-gold/10 border-gold/40 shadow-sm' 
                : 'bg-foreground/[0.02] border-[var(--border-subtle)]'
            }`}>
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                  {editingInsumoIndex !== null ? (
                    <>
                      <Pencil size={13} className="text-gold stroke-[2.5]" />
                      <span>Editando Insumo #{editingInsumoIndex + 1}</span>
                    </>
                  ) : (
                    <span>Registrar Insumo da Etapa</span>
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
                  <label className="text-xs font-semibold text-foreground/70 mb-1 block">Etapa:</label>
                  <select
                    className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2 text-xs text-foreground focus:outline-none focus:border-gold"
                    value={insumoEtapa}
                    onChange={e => setInsumoEtapa(e.target.value)}
                  >
                    <option value="Etapa 1 - Descoloração / Mechas">Etapa 1 - Descoloração / Mechas</option>
                    <option value="Etapa 2 - Tonalização / Matização">Etapa 2 - Tonalização / Matização</option>
                    <option value="Etapa 3 - Lavatório / Tratamento">Etapa 3 - Lavatório / Tratamento</option>
                    <option value="Etapa 4 - Escova / Modelagem">Etapa 4 - Escova / Modelagem</option>
                    <option value="Etapa 5 - Finalização / Óleos">Etapa 5 - Finalização / Óleos</option>
                  </select>
                </div>

                {/* 2. Quem Aplicou */}
                <div>
                  <label className="text-xs font-semibold text-foreground/70 mb-1 block">Quem Aplicou:</label>
                  <select
                    className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2 text-xs text-foreground focus:outline-none focus:border-gold"
                    value={insumoProfId}
                    onChange={e => setInsumoProfId(e.target.value)}
                  >
                    <option value={activeAgendamento.profissional_id}>
                      ⭐ {profissionais.find(p => p.id === activeAgendamento.profissional_id)?.nome || 'Titular'} (Titular)
                    </option>
                    {Array.isArray(activeAgendamento.auxiliares_ids) && activeAgendamento.auxiliares_ids.map(aid => (
                      <option key={aid} value={aid}>
                        👥 {profissionais.find(p => p.id === aid)?.nome || 'Auxiliar'} (Auxiliar)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. Produto e Quantidade */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-8">
                  <label className="text-xs font-semibold text-foreground/70 mb-1 block">Produto (Estoque):</label>
                  <ProductSearchSelect
                    mode="procedure"
                    products={insumosDoEstoque}
                    value={insumoSelecionado}
                    onChange={(id) => setInsumoSelecionado(id)}
                    placeholder="Digitar nome do insumo do estoque..."
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="text-xs font-semibold text-foreground/70 mb-1 block">Qtd (g/ml):</label>
                  <div className="flex gap-1.5">
                    <input 
                      type="number"
                      step="any"
                      min="0.1"
                      placeholder="Qtd"
                      className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2 text-xs text-center font-mono focus:outline-none focus:border-gold"
                      value={insumoQty}
                      onChange={e => setInsumoQty(e.target.value)}
                    />
                    {editingInsumoIndex !== null && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-xs px-2 shrink-0 border border-[var(--border-subtle)]"
                        onClick={handleCancelarEdicaoInsumo}
                      >
                        Cancelar
                      </Button>
                    )}
                    <Button 
                      variant="primary" 
                      className="bg-gold hover:bg-gold-dim text-white shrink-0 px-3 text-xs font-bold shadow-sm"
                      onClick={handleSalvarInsumo}
                      disabled={insumoLoading || !insumoSelecionado || !insumoQty}
                    >
                      {insumoLoading ? '...' : (editingInsumoIndex !== null ? 'Salvar Edição' : '+ Lançar')}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Botões rápidos */}
              <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                <span className="text-[10px] text-foreground/50">Atalhos rápidos:</span>
                {[10, 20, 30, 45, 60, 90].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setInsumoQty(String(v))}
                    className="px-2 py-0.5 rounded bg-foreground/5 hover:bg-gold/15 hover:text-gold text-[10px] text-foreground/70 border border-foreground/10 transition-colors"
                  >
                    +{v}g
                  </button>
                ))}
              </div>
            </div>

            {/* Insumos já aplicados */}
            <div className="space-y-2 mb-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/70">
                Insumos Aplicados neste Procedimento:
              </h4>

              {(!activeAgendamento.insumos_detalhes || activeAgendamento.insumos_detalhes.length === 0) ? (
                <p className="text-xs text-foreground/40 text-center py-3 border border-dashed border-[var(--border-subtle)] rounded-lg">
                  Nenhum produto registrado ainda.
                </p>
              ) : (
                <div className="border border-[var(--border-subtle)] rounded-lg overflow-hidden divide-y divide-[var(--border-subtle)] max-h-48 overflow-y-auto">
                  {activeAgendamento.insumos_detalhes.map((item, idx) => {
                    const pNome = profissionais.find(p => p.id === item.profissional_id)?.nome || 'Equipe';
                    const isBeingEdited = editingInsumoIndex === idx;

                    return (
                      <div key={idx} className={`p-2.5 text-xs flex justify-between items-center gap-2 transition-colors ${
                        isBeingEdited ? 'bg-gold/15 border-l-4 border-l-gold' : 'hover:bg-foreground/[0.02]'
                      }`}>
                        <div>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="px-1.5 py-0.5 rounded bg-foreground/5 text-foreground text-[9px] font-bold border border-[var(--border-subtle)]">
                              {item.etapa || 'Procedimento'}
                            </span>
                            <span className="text-[10px] text-foreground/50">
                              Por: {pNome}
                            </span>
                            {isBeingEdited && (
                              <span className="text-[9px] font-bold text-gold uppercase bg-gold/20 px-1.5 py-0.2 rounded">
                                Em edição
                              </span>
                            )}
                          </div>
                          <span className="font-bold text-foreground">{item.name}</span>
                          <span className="font-mono text-foreground/70 ml-2">({item.qty_used}{item.unit})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-foreground">R$ {Number(item.custo_total || 0).toFixed(2)}</span>
                          <button
                            type="button"
                            title="Editar este insumo"
                            onClick={() => handleEditarInsumo(idx)}
                            disabled={insumoLoading}
                            className={`p-1 rounded transition-colors ${
                              isBeingEdited ? 'text-gold bg-gold/25' : 'text-foreground/50 hover:text-gold'
                            }`}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            title="Remover e estornar ao estoque"
                            onClick={() => handleRemoverInsumo(idx)}
                            disabled={insumoLoading}
                            className="p-1 text-foreground/40 hover:text-red-400 rounded transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Button variant="outline" className="w-full text-xs font-semibold" onClick={() => setInsumosModalOpen(false)}>
              Fechar e Continuar Atendimento
            </Button>
          </CardGlass>
        </div>
      )}

      {/* MODAL UPSELL */}
      {upsellModalOpen && activeAgendamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <CardGlass className="w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Vender Produto (Upsell)</h3>
              <button onClick={() => setUpsellModalOpen(false)}><X className="text-foreground/50 hover:text-foreground" /></button>
            </div>
            <p className="text-sm text-foreground/60 mb-4">
              A comissão da venda será lançada na sua conta após a cliente pagar no caixa.
            </p>
            
            <div className="space-y-4 mb-6">
              <div className="space-y-3 p-3 bg-foreground/[0.02] border border-[var(--border-subtle)] rounded-lg">
                <div className="flex gap-2">
                  <ProductSearchSelect
                    mode="sale"
                    products={produtosLoja.filter(p => (Number(p.stock_quantity ?? p.stock ?? p.stock_qty ?? 0)) > 0)}
                    value={produtoSelecionado}
                    onChange={(pid) => {
                      setProdutoSelecionado(pid);
                      if (produtoDescPct) {
                        const p = produtosLoja.find(x => x.id === pid);
                        const sub = (p?.price || 0) * (Math.max(1, parseInt(produtoQty) || 1));
                        const pct = parseFloat(produtoDescPct) || 0;
                        const val = (sub * pct) / 100;
                        setProdutoDescValor(val > 0 ? val.toFixed(2) : '');
                      }
                    }}
                    placeholder="Digitar nome do produto..."
                    className="flex-1"
                  />
                  <input 
                    type="number"
                    placeholder="Qtd"
                    min="1"
                    className="w-16 bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm text-center font-mono focus:outline-none focus:border-gold"
                    value={produtoQty}
                    onChange={e => {
                      const q = e.target.value;
                      setProdutoQty(q);
                      if (produtoDescPct) {
                        const p = produtosLoja.find(x => x.id === produtoSelecionado);
                        const sub = (p?.price || 0) * (Math.max(1, parseInt(q) || 1));
                        const pct = parseFloat(produtoDescPct) || 0;
                        const val = (sub * pct) / 100;
                        setProdutoDescValor(val > 0 ? val.toFixed(2) : '');
                      }
                    }}
                  />
                </div>

                {/* Seção de Desconto no Produto */}
                {produtoSelecionado && (() => {
                  const prod = estoque.find(p => p.id === produtoSelecionado);
                  const q = Math.max(1, parseInt(produtoQty) || 1);
                  const subItem = (prod?.sale_price || 0) * q;
                  const descVal = Math.min(subItem, Math.max(0, parseFloat(produtoDescValor) || 0));
                  const totalItem = Math.max(0, subItem - descVal);

                  return (
                    <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2.5">
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
                              value={produtoDescPct}
                              onChange={e => handleProdDescPct(e.target.value)}
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
                              value={produtoDescValor}
                              onChange={e => handleProdDescValor(e.target.value)}
                              className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg py-1.5 pl-7 pr-2 text-xs focus:outline-none focus:border-emerald-500 font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Atalhos Rápidos */}
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[10px] text-foreground/40 mr-1">Atalhos:</span>
                        {[
                          { label: '0%', val: '0' },
                          { label: '5%', val: '5' },
                          { label: '10%', val: '10' },
                          { label: '15%', val: '15' },
                          { label: '20%', val: '20' },
                        ].map(b => (
                          <button
                            key={b.val}
                            type="button"
                            onClick={() => handleProdDescPct(b.val === '0' ? '' : b.val)}
                            className={`text-[10px] px-2 py-0.5 rounded border transition-all ${
                              (b.val === '0' && !produtoDescPct) || (produtoDescPct === b.val)
                                ? 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-400 dark:border-emerald-600 text-emerald-900 dark:text-emerald-200 font-bold'
                                : 'border-[var(--border-subtle)] text-foreground/60 hover:border-emerald-500/30'
                            }`}
                          >
                            {b.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex justify-between items-center pt-1 text-xs">
                        <span className="text-foreground/70">
                          Total do item: <strong className="text-foreground font-mono">R$ {totalItem.toFixed(2)}</strong>
                          {descVal > 0 && <span className="text-emerald-800 dark:text-emerald-400 ml-1.5 font-semibold">(-R$ {descVal.toFixed(2)})</span>}
                        </span>
                        <Button variant="primary" size="sm" onClick={handleSalvarProduto} className="text-xs py-1 px-3">
                          <ShoppingBag size={13} className="mr-1" /> Lançar
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {comandaAtual.filter(i => i.type === 'PRODUTO').length > 0 && (
                <div className="border border-[var(--border-subtle)] rounded-lg overflow-hidden">
                  <div className="bg-foreground/5 p-2 text-xs font-bold uppercase text-foreground/60">Itens na Comanda</div>
                  {comandaAtual.filter(i => i.type === 'PRODUTO').map(item => {
                    const prod = produtosLoja.find(p => p.id === item.inventory_id);
                    const precoOrig = prod?.price || 0;
                    const temDesc = precoOrig > item.price;
                    return (
                      <div key={item.id} className="p-2.5 text-sm border-t border-[var(--border-subtle)] flex justify-between items-center">
                        <div className="flex-1 pr-2">
                          <span className="flex items-center gap-2 font-medium">
                            <ShoppingBag size={14} className="text-gold"/> {prod?.name}
                          </span>
                          {temDesc && (
                            <p className="text-xs text-foreground/50 ml-5 mt-0.5 flex items-center gap-1.5">
                              <span className="line-through">R$ {precoOrig.toFixed(2)}</span>
                              <span className="text-emerald-800 dark:text-emerald-400 font-semibold">R$ {item.price.toFixed(2)} un.</span>
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-foreground/70">{item.qty}x</span>
                          <p className="text-xs font-bold text-gold font-mono">R$ {(item.price * item.qty).toFixed(2)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Button variant="outline" className="w-full" onClick={() => setUpsellModalOpen(false)}>Pronto</Button>
          </CardGlass>
        </div>
      )}

      {/* MODAL CATÁLOGO AFILIADO */}
      {catalogoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <CardGlass className="w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Share2 className="text-gold" />
                Catálogo de Produtos
              </h3>
              <button onClick={() => setCatalogoModalOpen(false)}><X className="text-foreground/50 hover:text-foreground" /></button>
            </div>
            <p className="text-sm text-foreground/60 mb-6">
              Compartilhe os links no WhatsApp. Quando a cliente comprar, o sistema registrará a comissão automaticamente para você.
            </p>
            
            <div className="space-y-4 mb-6">
              {produtosLoja.length === 0 ? (
                <div className="text-center p-4 border border-dashed border-[var(--border-subtle)] text-foreground/50 rounded">
                  Nenhum produto disponível na loja.
                </div>
              ) : (
                produtosLoja.map(p => {
                  const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/loja/produto/${p.id}?ref=${selectedProfId}`;
                  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`Oie! Dá uma olhada nesse produto maravilhoso que separei pra você: ${p.name} - R$ ${p.price}\n\nCompre por aqui: ${url}`)}`;
                  
                  return (
                    <div key={p.id} className="flex justify-between items-center p-3 bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg">
                      <div className="flex-1 pr-4">
                        <p className="font-bold text-foreground">{p.name}</p>
                        <p className="text-sm text-gold font-mono">R$ {p.price}</p>
                      </div>
                      <a 
                        href={whatsappUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-md transition-colors"
                        title="Compartilhar no WhatsApp"
                      >
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="css-i6dzq1"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                      </a>
                    </div>
                  );
                })
              )}
            </div>

            <Button variant="outline" className="w-full" onClick={() => setCatalogoModalOpen(false)}>Fechar</Button>
          </CardGlass>
        </div>
      )}

      {/* 1. MODAL ALTERAR / AJUSTAR SERVIÇO NA CADEIRA */}
      {servicoModalOpen && activeAgendamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <CardGlass className="w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto border border-gold/30 shadow-2xl space-y-4">
            <div className="flex justify-between items-start border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-gold/15 text-gold border border-gold/30">
                  <Scissors size={20} />
                </span>
                <div>
                  <h3 className="text-xl font-bold font-serif text-foreground">Definir / Alterar Serviço</h3>
                  <p className="text-xs text-foreground/60">
                    Definido inicialmente pela recepção • Ajuste para o procedimento real da cadeira
                  </p>
                </div>
              </div>
              <button onClick={() => setServicoModalOpen(false)} className="text-foreground/50 hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <div className="bg-foreground/[0.03] p-3 rounded-xl border border-[var(--border-subtle)] text-xs space-y-1">
              <span className="text-foreground/50 uppercase font-semibold text-[10px]">Cliente</span>
              <p className="text-base font-bold text-foreground">{getClienteNome(activeAgendamento.cliente_id)}</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase text-foreground/70 block mb-1">
                  Serviço Principal Realizado
                </label>
                <select
                  value={servicoEditandoId}
                  onChange={(e) => {
                    const novoId = e.target.value;
                    setServicoEditandoId(novoId);
                    const s = servicos.find(srv => srv.id === novoId);
                    if (s) setServicoPrecoEditado(String(s.preco || 0));
                  }}
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm font-semibold text-foreground focus:outline-none focus:border-gold cursor-pointer"
                >
                  {servicos.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.nome} — {fmt(s.preco)} {s.preco_variavel ? `(até ${fmt(s.preco_maximo || 0)})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-foreground/70 block mb-1">
                  Valor do Serviço (R$) — Fixo ou Ajustado
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-foreground/40 text-sm">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={servicoPrecoEditado}
                    onChange={(e) => setServicoPrecoEditado(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg py-2 pl-9 pr-3 text-sm font-mono font-bold text-foreground focus:outline-none focus:border-gold"
                    placeholder="0.00"
                  />
                </div>
                {(() => {
                  const s = servicos.find(srv => srv.id === servicoEditandoId);
                  if (s?.preco_variavel) {
                    return (
                      <p className="text-[11px] text-amber-500 font-medium mt-1">
                        ℹ️ Este serviço possui faixa de preço variável (Tabela: {fmt(s.preco)} a {fmt(s.preco_maximo || 0)}). Ajuste conforme tamanho/volume do cabelo.
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Sub-serviços adicionais */}
              <div className="pt-2 border-t border-[var(--border-subtle)]">
                <label className="text-xs font-bold uppercase text-foreground/70 block mb-1.5">
                  Procedimentos Adicionais / Sub-serviços
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {servicos.filter(s => s.id !== servicoEditandoId).map(s => {
                    const isAdded = subServicosEditados.some(sub => (typeof sub === 'string' ? sub === s.id : sub?.id === s.id));
                    return (
                      <label 
                        key={s.id} 
                        className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                          isAdded ? 'bg-gold/15 border-gold text-foreground' : 'bg-foreground/[0.02] border-[var(--border-subtle)] text-foreground/70 hover:bg-foreground/[0.05]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isAdded}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSubServicosEditados(prev => [...prev, { id: s.id, nome: s.nome, preco: s.preco }]);
                              } else {
                                setSubServicosEditados(prev => prev.filter(sub => (typeof sub === 'string' ? sub !== s.id : sub?.id !== s.id)));
                              }
                            }}
                            className="rounded accent-gold"
                          />
                          <span className="font-semibold">{s.nome}</span>
                        </div>
                        <span className="font-mono text-gold font-bold">+{fmt(s.preco)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
              <Button variant="outline" onClick={() => setServicoModalOpen(false)}>Cancelar</Button>
              <Button variant="primary" disabled={salvandoServico} onClick={handleSalvarServico} className="bg-gold hover:bg-gold-dim text-white font-bold">
                {salvandoServico ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </CardGlass>
        </div>
      )}

      {/* 2. MODAL PACOTES DA CLIENTE */}
      {pacoteModalOpen && activeAgendamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <CardGlass className="w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto border border-purple-500/40 shadow-2xl space-y-4">
            <div className="flex justify-between items-start border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
                  <Package size={20} />
                </span>
                <div>
                  <h3 className="text-xl font-bold font-serif text-foreground">Pacotes Pré-Pagos da Cliente</h3>
                  <p className="text-xs text-foreground/60">
                    Sessões pagas antecipadamente para abater no atendimento
                  </p>
                </div>
              </div>
              <button onClick={() => setPacoteModalOpen(false)} className="text-foreground/50 hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <div className="bg-foreground/[0.03] p-3 rounded-xl border border-[var(--border-subtle)] text-xs flex justify-between items-center">
              <div>
                <span className="text-foreground/50 uppercase font-semibold text-[10px]">Cliente</span>
                <p className="text-base font-bold text-foreground">{getClienteNome(activeAgendamento.cliente_id)}</p>
                <p className="text-xs text-foreground/70">{getServicoNome(activeAgendamento.servico_id)}</p>
              </div>
              {activeAgendamento.descontado_pacote && (
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-400 border border-purple-500/40 block">
                    ✓ Sessão Abatida
                  </span>
                  <button
                    type="button"
                    onClick={handleEstornarPacote}
                    className="text-[11px] text-red-400 hover:underline mt-1 block cursor-pointer font-semibold"
                  >
                    Estornar / Desvincular
                  </button>
                </div>
              )}
            </div>

            {loadingPacotes ? (
              <div className="p-6 text-center text-foreground/50 text-xs">Carregando pacotes da cliente...</div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/60">
                    Pacotes Ativos Disponíveis
                  </h4>
                  {!criandoNovoPacote && (
                    <button
                      type="button"
                      onClick={() => setCriandoNovoPacote(true)}
                      className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={13} /> Novo Pacote
                    </button>
                  )}
                </div>

                {pacotesCliente.length === 0 && !criandoNovoPacote ? (
                  <div className="p-6 text-center border border-dashed border-[var(--border-subtle)] rounded-xl text-foreground/50 space-y-2">
                    <Package size={28} className="mx-auto text-foreground/30" />
                    <p className="text-xs">Esta cliente não possui pacotes ativos registrados.</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCriandoNovoPacote(true)}
                      className="border-purple-500/40 text-purple-400 hover:bg-purple-500/10 text-xs"
                    >
                      <Plus size={13} className="mr-1" /> Cadastrar Pacote Pré-Pago
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {pacotesCliente.map(p => {
                      const isEste = activeAgendamento.pacote_utilizado_id === p.id;
                      return (
                        <div
                          key={p.id}
                          className={`p-3.5 rounded-xl border transition-all ${
                            isEste 
                              ? 'bg-purple-500/15 border-purple-500 ring-1 ring-purple-500/40' 
                              : 'bg-foreground/[0.02] border-[var(--border-subtle)] hover:border-purple-500/40'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h5 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                <Package size={14} className="text-purple-400" /> {p.nome_pacote}
                              </h5>
                              <p className="text-xs text-foreground/60 mt-0.5">
                                Serviço: <strong>{getServicoNome(p.servico_id)}</strong> • Adquirido em {fmtDate(p.data_aquisicao)}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  {p.sessoes_restantes} de {p.sessoes_total} sessões restantes
                                </span>
                                {p.valor_total_pago > 0 && (
                                  <span className="text-[11px] text-foreground/50 font-mono">
                                    Total pago: {fmt(p.valor_total_pago)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div>
                              {isEste ? (
                                <span className="text-xs font-bold text-purple-400 bg-purple-500/20 px-2.5 py-1 rounded-lg border border-purple-500/30">
                                  ✓ Vinculado
                                </span>
                              ) : (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  disabled={p.sessoes_restantes <= 0}
                                  onClick={() => handleAbaterPacote(p)}
                                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-xs"
                                >
                                  Abater Sessão
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* FORMULÁRIO DE NOVO PACOTE */}
                {criandoNovoPacote && (
                  <div className="p-4 bg-purple-500/5 border border-purple-500/30 rounded-xl space-y-3 mt-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-purple-400">
                        Cadastrar Novo Pacote Pré-Pago
                      </h5>
                      <button onClick={() => setCriandoNovoPacote(false)} className="text-foreground/40 hover:text-foreground text-xs">
                        Fechar
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="text-[11px] font-bold text-foreground/70 block">Nome do Pacote</label>
                        <input
                          type="text"
                          placeholder="Ex: Pacote 4 Escovas Curtas"
                          value={novoPacoteNome}
                          onChange={e => setNovoPacoteNome(e.target.value)}
                          className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded p-2 text-xs font-medium text-foreground focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-bold text-foreground/70 block">Serviço do Pacote</label>
                          <select
                            value={novoPacoteServicoId}
                            onChange={e => setNovoPacoteServicoId(e.target.value)}
                            className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded p-2 text-xs font-medium text-foreground focus:outline-none focus:border-purple-500 cursor-pointer"
                          >
                            {servicos.map(s => (
                              <option key={s.id} value={s.id}>{s.nome} ({fmt(s.preco)})</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-foreground/70 block">Qtd. de Sessões</label>
                          <input
                            type="number"
                            min="1"
                            value={novoPacoteSessoes}
                            onChange={e => setNovoPacoteSessoes(e.target.value)}
                            className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded p-2 text-xs font-mono font-bold text-foreground focus:outline-none focus:border-purple-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-foreground/70 block">Valor Total Pago Antecipadamente (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Ex: 200.00"
                          value={novoPacoteValor}
                          onChange={e => setNovoPacoteValor(e.target.value)}
                          className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded p-2 text-xs font-mono font-bold text-foreground focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" size="sm" onClick={() => setCriandoNovoPacote(false)}>Cancelar</Button>
                        <Button variant="primary" size="sm" onClick={handleCriarPacote} className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs">
                          Salvar Pacote
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-[var(--border-subtle)]">
              <Button variant="outline" onClick={() => setPacoteModalOpen(false)}>Concluído</Button>
            </div>
          </CardGlass>
        </div>
      )}

      {/* 3. MODAL DE PRÉ-FECHAMENTO DA CADEIRA (VISÃO COMPLETA DAS 3 PARTES) */}
      {preFechamentoModalOpen && activeAgendamento && (() => {
        const precoBaseServico = preFechamentoPrecoServico;
        const descValor = Math.max(0, parseFloat(preFechamentoDescontoValor) || 0);
        const valorServicoLiquido = activeAgendamento.descontado_pacote 
          ? 0 
          : Math.max(0, precoBaseServico - descValor);

        const custoInsumos = Number(activeAgendamento.product_cost || 0);

        // Itens de produto de balcão (upsell)
        const itensUpsell = comandaAtual.filter(i => i.type === 'PRODUTO');
        const totalUpsell = itensUpsell.reduce((acc, i) => acc + (i.price * i.qty), 0);

        // TOTAL COBRADO DA CLIENTE NO CAIXA
        const totalCobradoCliente = valorServicoLiquido + totalUpsell;

        // 1ª PARTE: INSUMOS (RECOMPRA DE ESTOQUE)
        const parte1InsumosRecompra = custoInsumos;

        // Base para cálculo da comissão: Valor Líquido do Serviço - Insumos
        const baseCalculoComissao = Math.max(0, (activeAgendamento.descontado_pacote ? precoBaseServico : valorServicoLiquido) - custoInsumos);

        // Identificação dos profissionais envolvidos:
        const titular = profissionais.find(p => p.id === activeAgendamento.profissional_id);
        const titularNome = titular?.nome || 'Titular';
        const titularesEAuxiliares = [
          activeAgendamento.profissional_id,
          ...(activeAgendamento.auxiliares_ids || [])
        ].filter(Boolean) as string[];

        const isAgnaldoEnvolvido = titularesEAuxiliares.some(id => {
          const p = profissionais.find(pr => pr.id === id);
          return p?.nome?.toLowerCase().includes('agnaldo');
        });
        const agnaldoId = titularesEAuxiliares.find(id => {
          const p = profissionais.find(pr => pr.id === id);
          return p?.nome?.toLowerCase().includes('agnaldo');
        });
        const auxiliares = (activeAgendamento.auxiliares_ids || []);
        const temAuxiliares = auxiliares.length > 0;

        // Regras de comissão
        const regraTitular = regrasComissao.find(r => r.professional_id === activeAgendamento.profissional_id && (r.service_id === activeAgendamento.servico_id || !r.service_id) && r.active);
        const pctComissaoBase = regraTitular?.commission_pct ?? titular?.comissao_padrao ?? 40;

        const totalComissaoBancada = Number(((baseCalculoComissao * pctComissaoBase) / 100).toFixed(2));

        // Divisão entre os profissionais:
        const comissoesIndividuais: Array<{
          profissionalId: string;
          nome: string;
          isAgnaldo: boolean;
          isAuxiliar: boolean;
          pct: number;
          valor: number;
          observacao?: string;
        }> = [];

        if (titularesEAuxiliares.length === 1) {
          const pid = titularesEAuxiliares[0];
          const pNome = profissionais.find(p => p.id === pid)?.nome || 'Profissional';
          const isAg = pNome.toLowerCase().includes('agnaldo');
          const val = (isAg && !preFechamentoAgnaldoRecebe) ? 0 : totalComissaoBancada;
          comissoesIndividuais.push({
            profissionalId: pid,
            nome: pNome,
            isAgnaldo: isAg,
            isAuxiliar: false,
            pct: (isAg && !preFechamentoAgnaldoRecebe) ? 0 : pctComissaoBase,
            valor: val,
            observacao: (!preFechamentoAgnaldoRecebe && isAg) ? 'Comissão não retida' : undefined,
          });
        } else {
          if (isAgnaldoEnvolvido && !preFechamentoAgnaldoRecebe && agnaldoId) {
            // Agnaldo cede a comissão para o(s) auxiliar(es)
            const agNome = profissionais.find(p => p.id === agnaldoId)?.nome || 'Agnaldo Gomes';
            comissoesIndividuais.push({
              profissionalId: agnaldoId,
              nome: agNome,
              isAgnaldo: true,
              isAuxiliar: false,
              pct: 0,
              valor: 0,
              observacao: 'Cedeu a comissão para o(s) auxiliar(es)',
            });
            const valorPorAux = Number((totalComissaoBancada / auxiliares.length).toFixed(2));
            auxiliares.forEach((auxId, idx) => {
              const auxNome = profissionais.find(p => p.id === auxId)?.nome || 'Auxiliar';
              comissoesIndividuais.push({
                profissionalId: auxId,
                nome: auxNome,
                isAgnaldo: false,
                isAuxiliar: true,
                pct: pctComissaoBase,
                valor: idx === 0 ? Number((totalComissaoBancada - valorPorAux * (auxiliares.length - 1)).toFixed(2)) : valorPorAux,
                observacao: 'Recebe a comissão integral repassada',
              });
            });
          } else {
            titularesEAuxiliares.forEach((pid) => {
              const pNome = profissionais.find(p => p.id === pid)?.nome || 'Profissional';
              const isAg = pNome.toLowerCase().includes('agnaldo');
              const isAux = pid !== activeAgendamento.profissional_id;
              const valorCom = Number(((totalComissaoBancada / titularesEAuxiliares.length)).toFixed(2));
              comissoesIndividuais.push({
                profissionalId: pid,
                nome: pNome,
                isAgnaldo: isAg,
                isAuxiliar: isAux,
                pct: Number((pctComissaoBase / titularesEAuxiliares.length).toFixed(1)),
                valor: valorCom,
              });
            });
          }
        }

        const parte2ComissoesTotal = comissoesIndividuais.reduce((sum, c) => sum + c.valor, 0);

        // 3ª PARTE: SALÃO / STUDIO
        const parte3Salao = Number(Math.max(0, valorServicoLiquido - parte1InsumosRecompra - parte2ComissoesTotal + (totalUpsell * 0.4)).toFixed(2));

        const handleConfirmar = async () => {
          setPreFechamentoLoading(true);
          try {
            const splitCustom: Record<string, number> = {};
            comissoesIndividuais.forEach(c => {
              splitCustom[c.profissionalId] = c.valor;
            });

            const ok = await finalizarRecebimentoAgendamento({
              id: activeAgendamento.id,
              paymentMethod: activeAgendamento.descontado_pacote ? 'PACOTE' : 'DINHEIRO',
              totalAmount: totalCobradoCliente,
              productCost: parte1InsumosRecompra,
              insumosDetalhes: activeAgendamento.insumos_detalhes,
              splitComissao: splitCustom,
              auxiliaresIds: activeAgendamento.auxiliares_ids,
              financialStatus: 'PENDING_CONFIRMATION',
              descontoValor: descValor,
              descontoPct: parseFloat(preFechamentoDescontoPct) || 0,
              pacoteUtilizadoId: activeAgendamento.pacote_utilizado_id || undefined,
              pacoteNome: activeAgendamento.pacote_nome || undefined,
              descontadoPacote: activeAgendamento.descontado_pacote || false,
              agnaldoRecebeComissao: preFechamentoAgnaldoRecebe,
              preFechadoPor: 'Profissional',
            });

            if (ok) {
              setPreFechamentoModalOpen(false);
              await carregarAgendamentosData(selectedDate);
              if (selectedProfId) {
                buscarPendenciasPassadas(selectedProfId);
                carregarComissoesProf(selectedProfId);
              }
              alert('Atendimento pré-fechado com sucesso e enviado para a recepção / caixa!');
            } else {
              alert('Erro ao finalizar pré-fechamento.');
            }
          } catch (err: any) {
            alert('Erro: ' + (err.message || 'Falha ao pré-fechar'));
          } finally {
            setPreFechamentoLoading(false);
          }
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <CardGlass className="w-full max-w-2xl p-6 max-h-[92vh] overflow-y-auto border border-gold/40 shadow-2xl space-y-5">
              <div className="flex justify-between items-start border-b border-[var(--border-subtle)] pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="p-2.5 rounded-xl bg-gold/15 text-gold border border-gold/30">
                    <CheckCircle2 size={22} />
                  </span>
                  <div>
                    <h3 className="text-xl font-bold font-serif text-foreground">Pré-Fechamento da Cadeira</h3>
                    <p className="text-xs text-foreground/60">
                      Conferência final do procedimento, desconto e divisão transparente das 3 partes
                    </p>
                  </div>
                </div>
                <button onClick={() => setPreFechamentoModalOpen(false)} className="text-foreground/50 hover:text-foreground">
                  <X size={20} />
                </button>
              </div>

              {/* DADOS DO CLIENTE & SERVIÇO */}
              <div className="bg-foreground/[0.03] p-4 rounded-xl border border-[var(--border-subtle)] space-y-3">
                <div className="flex flex-wrap justify-between items-start gap-2">
                  <div>
                    <span className="text-foreground/50 uppercase font-semibold text-[10px]">Cliente Atendida</span>
                    <h4 className="text-lg font-bold text-foreground">{getClienteNome(activeAgendamento.cliente_id)}</h4>
                    <p className="text-xs text-foreground/70 font-medium">
                      Procedimento: <strong>{getServicoNome(activeAgendamento.servico_id)}</strong>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-foreground/50 uppercase font-semibold text-[10px]">Profissional Titular</span>
                    <p className="text-sm font-bold text-foreground">{titularNome}</p>
                    {temAuxiliares && (
                      <p className="text-xs text-gold font-semibold">
                        Auxiliar(es): {auxiliares.map(id => profissionais.find(p => p.id === id)?.nome).filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                </div>

                {activeAgendamento.descontado_pacote && (
                  <div className="p-2.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs flex items-center gap-2">
                    <Package size={16} className="shrink-0 text-purple-400" />
                    <span>
                      <strong>Procedimento Coberto por Pacote Pré-Pago:</strong> {activeAgendamento.pacote_nome}. O cliente não paga pelo serviço no caixa (já quitado antecipadamente).
                    </span>
                  </div>
                )}
              </div>

              {/* AJUSTE DE VALOR & DESCONTO */}
              <div className="p-4 rounded-xl bg-foreground/[0.02] border border-[var(--border-subtle)] space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/70 flex items-center gap-1.5">
                  <DollarSign size={14} className="text-gold" /> Ajuste de Valor e Desconto do Serviço
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-foreground/60 block mb-1">
                      Valor do Serviço (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      disabled={activeAgendamento.descontado_pacote || false}
                      value={preFechamentoPrecoServico}
                      onChange={e => {
                        const novoPreco = parseFloat(e.target.value) || 0;
                        setPreFechamentoPrecoServico(novoPreco);
                        const pct = parseFloat(preFechamentoDescontoPct);
                        if (!isNaN(pct) && pct > 0 && novoPreco > 0) {
                          setPreFechamentoDescontoValor(((novoPreco * pct) / 100).toFixed(2));
                        }
                      }}
                      className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2 text-sm font-mono font-bold text-foreground focus:outline-none focus:border-gold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-foreground/60 block mb-1">
                      Desconto no Serviço (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        disabled={activeAgendamento.descontado_pacote || false}
                        placeholder="0"
                        value={preFechamentoDescontoPct}
                        onChange={e => {
                          const val = e.target.value;
                          setPreFechamentoDescontoPct(val);
                          const pct = parseFloat(val);
                          if (!isNaN(pct) && preFechamentoPrecoServico > 0) {
                            const desc = Number(((preFechamentoPrecoServico * pct) / 100).toFixed(2));
                            setPreFechamentoDescontoValor(desc > 0 ? String(desc) : '');
                          } else if (val === '') {
                            setPreFechamentoDescontoValor('');
                          }
                        }}
                        className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2 pr-7 text-sm font-mono font-bold text-foreground focus:outline-none focus:border-gold"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-foreground/40 pointer-events-none">
                        %
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-foreground/60 block mb-1">
                      Desconto no Serviço (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      disabled={activeAgendamento.descontado_pacote || false}
                      placeholder="0.00"
                      value={preFechamentoDescontoValor}
                      onChange={e => {
                        const val = e.target.value;
                        setPreFechamentoDescontoValor(val);
                        const desc = parseFloat(val);
                        if (!isNaN(desc) && preFechamentoPrecoServico > 0) {
                          const pct = Number(((desc / preFechamentoPrecoServico) * 100).toFixed(1));
                          setPreFechamentoDescontoPct(pct > 0 ? String(pct) : '');
                        } else if (val === '') {
                          setPreFechamentoDescontoPct('');
                        }
                      }}
                      className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2 text-sm font-mono font-bold text-foreground focus:outline-none focus:border-gold"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-[var(--border-subtle)] text-xs">
                  <span className="text-foreground/60">Valor Líquido do Serviço:</span>
                  <span className="text-sm font-bold font-mono text-foreground">
                    {fmt(valorServicoLiquido)}
                  </span>
                </div>
              </div>

              {/* CENÁRIO ESPECIAL: AGNALDO + AUXILIAR */}
              {isAgnaldoEnvolvido && temAuxiliares && (
                <div className="p-4 rounded-xl bg-gold/10 border border-gold/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-gold" />
                      <div>
                        <h4 className="text-xs font-bold uppercase text-foreground">
                          Comissão do Agnaldo Gomes
                        </h4>
                        <p className="text-[11px] text-foreground/60">
                          Procedimento com auxiliar(es) envolvido(s)
                        </p>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <span className="text-xs font-bold text-foreground">
                        {preFechamentoAgnaldoRecebe ? 'Agnaldo Recebe' : 'Agnaldo Cede p/ Auxiliar'}
                      </span>
                      <input
                        type="checkbox"
                        checked={preFechamentoAgnaldoRecebe}
                        onChange={e => setPreFechamentoAgnaldoRecebe(e.target.checked)}
                        className="w-4 h-4 rounded accent-gold cursor-pointer"
                      />
                    </label>
                  </div>
                  {!preFechamentoAgnaldoRecebe && (
                    <p className="text-[11px] text-amber-500 font-medium bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                      ✨ O Agnaldo abriu mão da comissão neste atendimento. 100% da comissão da bancada ({fmt(totalComissaoBancada)}) será repassada integralmente para o(s) auxiliar(es)!
                    </p>
                  )}
                </div>
              )}

              {/* RESUMO SIMPLES DE INSUMOS E PRODUTOS (SEM DETALHAMENTO DE SALÃO/MARGEM) */}
              {((activeAgendamento.insumos_detalhes && activeAgendamento.insumos_detalhes.length > 0) || itensUpsell.length > 0) && (
                <div className="p-3.5 rounded-xl bg-foreground/[0.02] border border-[var(--border-subtle)] space-y-2 text-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-foreground/60 block">
                    Produtos e Insumos do Atendimento
                  </span>
                  {activeAgendamento.insumos_detalhes && activeAgendamento.insumos_detalhes.length > 0 && (
                    <div className="flex items-center justify-between text-foreground/80">
                      <span className="flex items-center gap-1.5">
                        <Beaker size={13} className="text-emerald-500" />
                        Insumos de Apoio / Procedimento ({activeAgendamento.insumos_detalhes.length} itens aplicados)
                      </span>
                      <span className="font-semibold text-emerald-500 text-[11px]">Lançado na comanda</span>
                    </div>
                  )}
                  {itensUpsell.length > 0 && (
                    <div className="flex items-center justify-between text-foreground/80 pt-1 border-t border-[var(--border-subtle)]">
                      <span className="flex items-center gap-1.5">
                        <ShoppingBag size={13} className="text-gold" />
                        Produtos de Balcão (Venda Upsell - {itensUpsell.length} item(s))
                      </span>
                      <span className="font-mono font-bold text-gold">+{fmt(totalUpsell)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* TOTAL NO CAIXA */}
              <div className="p-4 rounded-xl bg-foreground/[0.04] border border-[var(--border-subtle)] flex justify-between items-center">
                <div>
                  <span className="text-xs uppercase font-bold text-foreground/60 block">Total a Cobrar da Cliente no Caixa</span>
                  <span className="text-[11px] text-foreground/50">
                    {activeAgendamento.descontado_pacote ? 'Serviço coberto pelo pacote pré-pago' : 'Serviço líquido'}
                    {totalUpsell > 0 ? ` + Produtos (${fmt(totalUpsell)})` : ''}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black font-mono text-gold block">
                    {fmt(totalCobradoCliente)}
                  </span>
                </div>
              </div>

              {/* BOTÕES DE AÇÃO */}
              <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
                <Button variant="outline" onClick={() => setPreFechamentoModalOpen(false)}>
                  Voltar
                </Button>
                <Button
                  variant="primary"
                  disabled={preFechamentoLoading}
                  onClick={handleConfirmar}
                  className="bg-gold hover:bg-gold-dim text-white font-bold px-6 py-2.5 shadow-lg flex items-center gap-2"
                >
                  <CheckCircle2 size={18} />
                  {preFechamentoLoading ? 'Enviando...' : 'Confirmar Pré-Fechamento e Enviar ao Caixa'}
                </Button>
              </div>
            </CardGlass>
          </div>
        );
      })()}

      {/* 4. MODAL NOVO AGENDAMENTO PELO PROFISSIONAL (LIBERDADE DE AGENDA) */}
      {novoAgModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <CardGlass className="w-full max-w-md p-6 max-h-[90vh] overflow-y-auto border border-gold/30 shadow-2xl space-y-4">
            <div className="flex justify-between items-start border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-gold/15 text-gold border border-gold/30">
                  <CalendarDays size={20} />
                </span>
                <div>
                  <h3 className="text-xl font-bold font-serif text-foreground">Marcar Cliente na Minha Agenda</h3>
                  <p className="text-xs text-foreground/60">
                    Adicione um horário diretamente para você
                  </p>
                </div>
              </div>
              <button onClick={() => setNovoAgModalOpen(false)} className="text-foreground/50 hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase text-foreground/70 block mb-1">Cliente</label>
                <select
                  value={novoAgClienteId}
                  onChange={e => setNovoAgClienteId(e.target.value)}
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm font-semibold text-foreground focus:outline-none focus:border-gold cursor-pointer"
                >
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nome} ({c.telefone || 'Sem tel'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-foreground/70 block mb-1">Serviço</label>
                <select
                  value={novoAgServicoId}
                  onChange={e => setNovoAgServicoId(e.target.value)}
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm font-semibold text-foreground focus:outline-none focus:border-gold cursor-pointer"
                >
                  {servicos.map(s => (
                    <option key={s.id} value={s.id}>{s.nome} — {fmt(s.preco)}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold uppercase text-foreground/70 block mb-1">Data</label>
                  <input
                    type="date"
                    value={novoAgData}
                    onChange={e => setNovoAgData(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2 text-xs font-mono font-bold text-foreground focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-foreground/70 block mb-1">Horário de Início</label>
                  <input
                    type="time"
                    value={novoAgHoraInicio}
                    onChange={e => setNovoAgHoraInicio(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2 text-xs font-mono font-bold text-foreground focus:outline-none focus:border-gold"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
              <Button variant="outline" onClick={() => setNovoAgModalOpen(false)}>Cancelar</Button>
              <Button
                variant="primary"
                disabled={novoAgLoading}
                onClick={handleCriarNovoAgendamento}
                className="bg-gold hover:bg-gold-dim text-white font-bold"
              >
                {novoAgLoading ? 'Salvando...' : 'Agendar Cliente'}
              </Button>
            </div>
          </CardGlass>
        </div>
      )}

      {/* 5. MODAL EXCLUIR / CANCELAR AGENDAMENTO PELO PROFISSIONAL */}
      {cancelarAgModalOpen && apptParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <CardGlass className="w-full max-w-sm p-6 border border-red-500/30 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-red-500">
              <span className="p-2 rounded-xl bg-red-500/15 border border-red-500/30">
                <Trash2 size={20} />
              </span>
              <h3 className="text-lg font-bold">Excluir Atendimento</h3>
            </div>

            <p className="text-xs text-foreground/70">
              Tem certeza que deseja excluir o agendamento de <strong>{getClienteNome(apptParaExcluir.cliente_id)}</strong> às <strong>{apptParaExcluir.hora_inicio}</strong> ({getServicoNome(apptParaExcluir.servico_id)}) da sua agenda?
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
              <Button variant="outline" size="sm" onClick={() => { setCancelarAgModalOpen(false); setApptParaExcluir(null); }}>
                Voltar
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={excluindoAgLoading}
                onClick={handleConfirmarExclusaoAgendamento}
                className="bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                {excluindoAgLoading ? 'Excluindo...' : 'Sim, Excluir'}
              </Button>
            </div>
          </CardGlass>
        </div>
      )}

    </div>
  );
}
