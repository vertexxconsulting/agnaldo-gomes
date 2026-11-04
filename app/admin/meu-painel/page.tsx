'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Clock, CheckCircle2, Play, Plus, X, ShoppingBag, Share2, Beaker, DollarSign, CalendarDays, Percent, Users, Sparkles, Trash2, User2, Pencil,
  CreditCard, Banknote, Smartphone, RefreshCw, ShieldAlert, ArrowUpRight, Scissors, Package, Check, ChevronRight, ChevronLeft, Calendar, AlertTriangle, Link as LinkIcon
} from 'lucide-react';
import { SectionHeader, Panel } from '@/components/ui/Panel';
import { CardGlass } from '@/components/CardGlass';
import { Button } from '@/components/Button';
import { ProductSearchSelect } from '@/components/ProductSearchSelect';
import { ReadOnlyNotice } from '@/components/ReadOnlyNotice';
import { useModulePermission } from '@/lib/use-module-permission';
import { 
  fetchClientes, 
  fetchAgendamentos, 
  fetchServicos, 
  fetchEstoque,
  fetchProfissionais,
  fetchPendenciasAgendamentosProfissional,
  salvarItemComanda,
  excluirItemComanda,
  fetchItensComanda,
  atualizarStatusAgendamento,
  atualizarProcedimentoCadeiraAgendamento,
  atualizarConfiguracaoAgendamentoCadeira,
  excluirAgendamentoAdmin,
  criarAgendamento,
  finalizarRecebimentoAgendamento,
  fetchRegrasComissao,
  salvarInsumoTempoRealProcedimento,
  removerInsumoTempoRealProcedimento,
  editarInsumoTempoRealProcedimento,
  atualizarPeriodoRecebimentoProfissional,
  fetchComissoes,
  fetchParcelasPendentes,
  sincronizarComissoesDoAgendamento
} from '@/lib/supabase-queries';
import { fetchPacotesClientes, salvarPacoteCliente, abaterSessaoPacote, estornarSessaoPacote } from '@/lib/pacotes';
import type { Cliente, Agendamento, Servico, ProdutoEstoque, ItemComanda, Profissional, InsumoAtendimento, PeriodoRecebimentoComissao, Comissao, FormaPagamento, PacoteCliente, RegraComissao, ComandaMultiProfissional } from '@/lib/gestao-types';
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

function getCategoriaProfissional(p: Profissional): string {
  if (p.categoria && p.categoria.trim()) {
    return p.categoria.trim();
  }
  if (p.especialidades && p.especialidades.length > 0) {
    const tags = p.especialidades.map(e => e.toLowerCase()).join(' ');
    if (tags.includes('unha') || tags.includes('manicure') || tags.includes('pedicure') || tags.includes('esmalte') || tags.includes('podolog')) {
      return 'Manicure';
    }
  }
  const nomeLower = (p.nome || '').toLowerCase();
  if (nomeLower.includes('unha') || nomeLower.includes('manicure') || nomeLower.includes('camila')) {
    return 'Manicure';
  }
  return 'Cabeleireiro(a)';
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

  // Permissão de leitura/escrita do módulo Agenda (usa para o meu-painel)
  const { isReadOnly, loading: permLoading } = useModulePermission('agenda');

  // Modals state
  const [insumosModalOpen, setInsumosModalOpen] = useState(false);
  const [upsellModalOpen, setUpsellModalOpen] = useState(false);
  const [catalogoModalOpen, setCatalogoModalOpen] = useState(false);
  const [activeAgendamento, setActiveAgendamento] = useState<Agendamento | null>(null);

  // Comanda state
  const [comandaAtual, setComandaAtual] = useState<ItemComanda[]>([]);
  const [insumoSelecionado, setInsumoSelecionado] = useState('');
  const [insumoQty, setInsumoQty] = useState('');
  const [insumoProfId, setInsumoProfId] = useState('');
  const [insumoLoading, setInsumoLoading] = useState(false);
  const [excluindoItemUpsellId, setExcluindoItemUpsellId] = useState<string | null>(null);
  const [agendaConfigOpen, setAgendaConfigOpen] = useState(false);
  const [agendaConfigAllowOverlap, setAgendaConfigAllowOverlap] = useState(false);
  const [agendaConfigAuxiliares, setAgendaConfigAuxiliares] = useState<string[]>([]);
  const [editingInsumoIndex, setEditingInsumoIndex] = useState<number | null>(null);
  const [produtoSelecionado, setProdutoSelecionado] = useState('');
  const [produtoQty, setProdutoQty] = useState('1');
  const [produtoProfId, setProdutoProfId] = useState('');
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
  const [subServicoBuscaId, setSubServicoBuscaId] = useState('');
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

  // 4. Modal de Novo Agendamento Rápido pelo Profissional
  const [novoAgModalOpen, setNovoAgModalOpen] = useState(false);
  const [novoAgClienteId, setNovoAgClienteId] = useState('');
  const [novoAgServicoId, setNovoAgServicoId] = useState('');
  const [novoAgData, setNovoAgData] = useState(new Date().toISOString().split('T')[0]);
  const [novoAgHoraInicio, setNovoAgHoraInicio] = useState('10:00');
  const [novoAgDuracaoMin, setNovoAgDuracaoMin] = useState('60');
  const [novoAgBuscaCliente, setNovoAgBuscaCliente] = useState('');
  const [novoAgCadastrandoCliente, setNovoAgCadastrandoCliente] = useState(false);
  const [novoAgNovoCliNome, setNovoAgNovoCliNome] = useState('');
  const [novoAgNovoCliTel, setNovoAgNovoCliTel] = useState('');
  const [novoAgSalvandoCliente, setNovoAgSalvandoCliente] = useState(false);
  const [novoAgIniciarNaCadeira, setNovoAgIniciarNaCadeira] = useState(false);
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
        const profsAtivos = (profs || []).filter(p => p.ativo);
        setProfissionais(profsAtivos);
        const targetId = profsAtivos.length > 0 ? profsAtivos[0].id : '';
        setSelectedProfId(prev => prev || targetId);
        if (targetId) {
          carregarComissoesProf(targetId);
          buscarPendenciasPassadas(targetId);
        }
      } else if (isProfissionalUser || (matched && !isFullAdmin)) {
        setIsAuxiliarCabelo(false);
        setIsRestrictedProfissional(true);
        const profsAtivos = (profs || []).filter(p => p.ativo);
        if (matched) {
          setSelectedProfId(matched.id);
          setProfissionais(profsAtivos);
          carregarComissoesProf(matched.id);
          buscarPendenciasPassadas(matched.id);
        } else {
          setProfissionais([]);
          setSelectedProfId('');
        }
      } else {
        setIsAuxiliarCabelo(false);
        setIsRestrictedProfissional(false);
        const profsAtivos = (profs || []).filter(p => p.ativo);
        setProfissionais(profsAtivos);
        const targetId = matched ? matched.id : (profsAtivos.length > 0 ? profsAtivos[0].id : '');
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
    const c = clientes.find(c => c.id === id);
    if (!c) return 'Cliente não encontrado';
    const tel = (c as any).telefone || (c as any).phone || (c as any).celular || '';
    return tel ? `${c.nome} (${tel})` : c.nome;
  }
  function getClienteNomeSimples(id: string): string {
    return clientes.find(c => c.id === id)?.nome || 'Cliente não encontrado';
  }
  function getServicoNome(id: string): string {
    return servicos.find(s => s.id === id)?.nome || 'Serviço excluído';
  }

  const extratoComissoes = useMemo(() => {
    const getCli = (id: string) => {
      const c = clientes.find(c => c.id === id);
      if (!c) return 'Cliente não encontrado';
      const tel = (c as any).telefone || (c as any).phone || (c as any).celular || '';
      return tel ? `${c.nome} (${tel})` : c.nome;
    };
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
    const precoBase = (ag.comanda_unificada?.total_bruto_servicos != null && ag.comanda_unificada.total_bruto_servicos > 0)
      ? Number(ag.comanda_unificada.total_bruto_servicos)
      : (ag.total_amount != null && ag.total_amount > 0 && !ag.pre_fechado_em)
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

  // --- HANDLERS: AGENDA DO PROFISSIONAL (SISTEMA RÁPIDO DE AGENDAMENTO & ENCAIXE AUTOMÁTICO) ---
  const obterHorarioAtualFormatado = () => {
    const agora = new Date();
    const h = String(agora.getHours()).padStart(2, '0');
    const m = String(agora.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  const abrirModalNovoAgendamento = () => {
    const horaAtual = obterHorarioAtualFormatado();
    const firstServ = servicos[0];
    setNovoAgData(selectedDate || hoje);
    setNovoAgHoraInicio(horaAtual);
    setNovoAgClienteId(clientes[0]?.id || '');
    setNovoAgServicoId(firstServ?.id || '');
    setNovoAgDuracaoMin(String(firstServ?.duracao_min || 60));
    setNovoAgBuscaCliente('');
    setNovoAgCadastrandoCliente(false);
    setNovoAgNovoCliNome('');
    setNovoAgNovoCliTel('');
    setNovoAgIniciarNaCadeira(false);
    setNovoAgModalOpen(true);
  };

  const ajustarHorarioNovoAg = (deltaMinutos: number) => {
    const [h, m] = (novoAgHoraInicio || obterHorarioAtualFormatado()).split(':').map(Number);
    const total = Math.max(0, Math.min(23 * 60 + 59, (h || 0) * 60 + (m || 0) + deltaMinutos));
    const nh = String(Math.floor(total / 60)).padStart(2, '0');
    const nm = String(total % 60).padStart(2, '0');
    setNovoAgHoraInicio(`${nh}:${nm}`);
  };

  const handleCadastrarClienteRapidoPainel = async () => {
    const nome = novoAgNovoCliNome.trim();
    const telefone = novoAgNovoCliTel.trim();
    if (!nome || !telefone) {
      alert('Informe o nome e o telefone do cliente.');
      return;
    }
    setNovoAgSalvandoCliente(true);
    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, telefone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar cliente');
      const novoCli: Cliente = {
        id: data.cliente?.id || `cli_${Date.now()}`,
        nome: data.cliente?.nome || data.cliente?.name || nome,
        telefone: data.cliente?.telefone || data.cliente?.phone || telefone,
        criado_em: new Date().toISOString(),
      };
      setClientes(prev => [novoCli, ...prev]);
      setNovoAgClienteId(novoCli.id);
      setNovoAgCadastrandoCliente(false);
      setNovoAgNovoCliNome('');
      setNovoAgNovoCliTel('');
      setNovoAgBuscaCliente('');
    } catch (err: any) {
      alert('Erro ao cadastrar cliente: ' + (err.message || 'Tente novamente'));
    } finally {
      setNovoAgSalvandoCliente(false);
    }
  };

  const clientesFiltradosNovoAg = useMemo(() => {
    const termo = novoAgBuscaCliente.toLowerCase().trim();
    const digitos = termo.replace(/\D/g, '');
    if (!termo) return clientes;
    return clientes.filter(c => {
      const n = (c.nome || '').toLowerCase().includes(termo);
      const t = digitos
        ? (c.telefone || '').replace(/\D/g, '').includes(digitos)
        : (c.telefone || '').toLowerCase().includes(termo);
      return n || t;
    });
  }, [clientes, novoAgBuscaCliente]);

  // Calcula término previsto e detecta automaticamente se o horário está livre (normal)
  // ou se sobrepõe a um cliente na cadeira / horário já agendado (encaixe automático)
  const analiseHorarioNovoAg = useMemo(() => {
    const toMins = (t?: string | null) => {
      if (!t) return 0;
      const [hh, mm] = String(t).slice(0, 5).split(':').map(Number);
      return (hh || 0) * 60 + (mm || 0);
    };
    const fromMins = (total: number) => {
      const clamped = ((total % 1440) + 1440) % 1440;
      const hh = String(Math.floor(clamped / 60)).padStart(2, '0');
      const mm = String(clamped % 60).padStart(2, '0');
      return `${hh}:${mm}`;
    };

    const srv = servicos.find(s => s.id === novoAgServicoId);
    const durMin = Math.max(5, parseInt(novoAgDuracaoMin) || srv?.duracao_min || 60);
    const inicioMin = toMins(novoAgHoraInicio);
    const fimMin = inicioMin + durMin;
    const horaFim = fromMins(fimMin);

    const agsDoProfNoDia = agendamentos.filter(a => {
      if (a.data !== (novoAgData || selectedDate)) return false;
      if (a.status === 'cancelado' || a.status === 'no_show' || a.status === 'concluido') return false;
      const isTitular = a.profissional_id === selectedProfId;
      const isAux = Array.isArray(a.auxiliares_ids) && a.auxiliares_ids.includes(selectedProfId);
      return isTitular || isAux;
    });

    const sobrepostos = agsDoProfNoDia.filter(a => {
      const aIni = toMins(a.hora_inicio);
      let aFim = toMins(a.hora_fim);
      if (!aFim || aFim <= aIni) {
        const aSrv = servicos.find(s => s.id === a.servico_id);
        aFim = aIni + (aSrv?.duracao_min || 60);
      }
      return inicioMin < aFim && fimMin > aIni;
    });

    const clienteNaCadeiraSobreposto = sobrepostos.find(a => a.status === 'em_atendimento') || null;
    const isEncaixe = sobrepostos.length > 0;

    return {
      durMin,
      horaFim,
      isEncaixe,
      sobrepostos,
      clienteNaCadeiraSobreposto,
      principalConflito: clienteNaCadeiraSobreposto || sobrepostos[0] || null,
    };
  }, [novoAgHoraInicio, novoAgDuracaoMin, novoAgServicoId, novoAgData, selectedDate, agendamentos, selectedProfId, servicos]);

  const handleCriarNovoAgendamento = async () => {
    if (!novoAgClienteId || !novoAgServicoId || !novoAgHoraInicio || !selectedProfId) {
      alert('Preencha cliente, serviço e horário.');
      return;
    }
    setNovoAgLoading(true);
    try {
      const { horaFim, isEncaixe, sobrepostos } = analiseHorarioNovoAg;
      const dataTarget = novoAgData || selectedDate || hoje;
      const statusInicial = novoAgIniciarNaCadeira ? 'em_atendimento' : 'confirmado';

      const res = await criarAgendamento({
        cliente_id: novoAgClienteId,
        profissional_id: selectedProfId,
        servico_id: novoAgServicoId,
        data: dataTarget,
        hora_inicio: novoAgHoraInicio,
        hora_fim: horaFim,
        canal: 'recepcao',
        status: statusInicial,
        allow_overlap: isEncaixe,
      });

      if (res?.id) {
        // Se foi reconhecido como encaixe sobre um agendamento que ainda não estava com allow_overlap,
        // garante a marcação de encaixe no atendimento existente também
        if (isEncaixe && sobrepostos.length > 0) {
          for (const agConflito of sobrepostos) {
            if (!agConflito.allow_overlap) {
              await atualizarConfiguracaoAgendamentoCadeira({
                id: agConflito.id,
                allow_overlap: true,
                auxiliares_ids: agConflito.auxiliares_ids || [],
              });
            }
          }
        }

        if (dataTarget !== selectedDate) {
          setSelectedDate(dataTarget);
        }
        setNovoAgModalOpen(false);
        const ags = await fetchAgendamentos({ data: dataTarget });
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
    setInsumoProfId(selectedProfId || ag.profissional_id);
    setInsumoSelecionado('');
    setInsumoQty('');
    const itens = await fetchItensComanda(ag.id);
    setComandaAtual(itens);
    setInsumosModalOpen(true);
  };

  const abrirModalUpsell = async (ag: Agendamento) => {
    setActiveAgendamento(ag);
    setProdutoProfId(selectedProfId || ag.profissional_id);
    setProdutoSelecionado('');
    setProdutoQty('1');
    setProdutoDescPct('');
    setProdutoDescValor('');
    const itens = await fetchItensComanda(ag.id);
    setComandaAtual(itens);
    setUpsellModalOpen(true);
  };

  const abrirModalAgendaConfig = (ag: Agendamento) => {
    setActiveAgendamento(ag);
    setAgendaConfigAllowOverlap(Boolean(ag.allow_overlap));
    setAgendaConfigAuxiliares(Array.isArray(ag.auxiliares_ids) ? [...ag.auxiliares_ids] : []);
    setAgendaConfigOpen(true);
  };

  const handleSalvarAgendaConfig = async () => {
    if (!activeAgendamento) return;
    setInsumoLoading(true);
    try {
      const ok = await atualizarConfiguracaoAgendamentoCadeira({
        id: activeAgendamento.id,
        allow_overlap: agendaConfigAllowOverlap,
        auxiliares_ids: agendaConfigAuxiliares.length > 0 ? agendaConfigAuxiliares : [],
      });
      if (ok) {
        const updated: Agendamento = {
          ...activeAgendamento,
          allow_overlap: agendaConfigAllowOverlap,
          auxiliares_ids: agendaConfigAuxiliares.length > 0 ? agendaConfigAuxiliares : [],
        };
        setActiveAgendamento(updated);
        setAgendamentos(prev => prev.map(a => a.id === updated.id ? updated : a));
        setAgendaConfigOpen(false);
      } else {
        alert('Erro ao atualizar configuração da agenda.');
      }
    } catch (err: any) {
      alert('Erro: ' + (err.message || 'Falha ao salvar'));
    } finally {
      setInsumoLoading(false);
    }
  };

  const handleEditarInsumo = (index: number) => {
    if (!activeAgendamento || !activeAgendamento.insumos_detalhes?.[index]) return;
    const item = activeAgendamento.insumos_detalhes[index];
    setEditingInsumoIndex(index);
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

  const prodSelMeuPainel = estoque.find(p => p.id === produtoSelecionado);
  const qNumMeuPainel = Math.max(1, parseInt(produtoQty) || 1);
  const subtotalProdMeuPainel = (prodSelMeuPainel?.sale_price || 0) * qNumMeuPainel;

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

    const prod = estoque.find(p => p.id === produtoSelecionado);
    if (!prod) return;

    const stockDisponivel = Number(prod.stock_qty ?? 0);
    if (stockDisponivel <= 0) {
      alert('Produto com estoque zerado no momento. Não é possível lançar.');
      return;
    }

    const finalQty = Math.min(qtyNum, stockDisponivel);
    const precoBase = prod.sale_price ?? 0;
    const sub = precoBase * finalQty;
    const descVal = Math.min(sub, Math.max(0, parseFloat(produtoDescValor) || 0));
    const precoFinalUnit = (sub - descVal) / finalQty;
    const vendedorId = produtoProfId || selectedProfId || activeAgendamento.profissional_id;
    const vendedorNome = profissionais.find(p => p.id === vendedorId)?.nome || 'Profissional';

    await salvarItemComanda(activeAgendamento.id, {
      inventory_id: produtoSelecionado,
      type: 'PRODUTO',
      qty: finalQty,
      price: precoFinalUnit,
      profissional_id: vendedorId,
      profissional_nome: vendedorNome,
    });

    const itens = await fetchItensComanda(activeAgendamento.id);
    setComandaAtual(itens);
    setProdutoSelecionado('');
    setProdutoQty('1');
    setProdutoDescPct('');
    setProdutoDescValor('');
  };

  const handleExcluirItemUpsell = async (itemId: string) => {
    if (!activeAgendamento) return;
    setExcluindoItemUpsellId(itemId);
    try {
      const ok = await excluirItemComanda(itemId);
      if (ok) {
        const itens = await fetchItensComanda(activeAgendamento.id);
        setComandaAtual(itens);
      } else {
        alert('Erro ao excluir item da comanda.');
      }
    } catch (err: any) {
      alert('Erro: ' + (err.message || 'Falha ao excluir item'));
    } finally {
      setExcluindoItemUpsellId(null);
    }
  };

  const insumosDoEstoque = estoque.filter(p => p.allow_procedure_use && (p.stock_qty ?? 0) > 0);
  const produtosDeVenda = estoque.filter(p => p.allow_sale && (p.stock_qty ?? 0) > 0);

  if (loading) {
    return <div className="p-8 text-center text-foreground/50">Carregando painel...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {isReadOnly && !permLoading && (
        <ReadOnlyNotice modulo="Meu Painel / Agenda" />
      )}
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
              Profissional / Cadeira Atuante:
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
                    {p.nome}
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
                    
                    <div className="p-5 sm:p-6">
                      <div className="flex justify-between items-start gap-4 mb-4">
                        <div className="min-w-0 flex-1">
                          {isAuxiliar && (
                            <span className="px-2 py-0.5 rounded bg-gold/15 text-gold-dim dark:text-gold font-bold text-[10px] border border-gold/30 flex items-center gap-1 w-fit mb-1.5">
                              <Users size={11} className="text-gold shrink-0" /> Auxiliar de {titularNome}
                            </span>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-xl sm:text-2xl font-bold text-foreground leading-tight break-words">
                              {getClienteNome(ag.cliente_id)}
                            </h3>
                            {ag.descontado_pacote && (
                              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 font-bold text-xs border border-purple-500/30 flex items-center gap-1 shrink-0">
                                <Package size={12} /> {ag.pacote_nome || 'Pacote Pré-Pago'}
                              </span>
                            )}
                          </div>
                          <p className="text-foreground/70 font-medium mt-1 text-sm sm:text-base">
                            {getServicoNome(ag.servico_id)}
                            {Array.isArray(ag.sub_servicos) && ag.sub_servicos.length > 0 && (
                              <span className="text-xs text-foreground/50 ml-1">
                                + {ag.sub_servicos.map(s => typeof s === 'string' ? getServicoNome(s) : s.nome || getServicoNome(s.id)).join(' + ')}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="text-right shrink-0 pl-2">
                          <p className="text-xs text-foreground/50 whitespace-nowrap">Iniciado às</p>
                          <p className="text-xl font-mono text-foreground font-bold whitespace-nowrap">{ag.hora_inicio}</p>
                          {ag.product_cost != null && Number(ag.product_cost) > 0 && (
                            <p className="text-xs font-mono text-emerald-500 font-bold mt-1 flex items-center justify-end gap-1 whitespace-nowrap">
                              <Beaker size={12} className="shrink-0" /> {fmt(Number(ag.product_cost))}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* AS 4 OPÇÕES DA CADEIRA: PRODUTO (INSUMOS), SERVIÇO, AGENDA E PACOTE */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-foreground/[0.02] border border-[var(--border-subtle)] mt-4">
                        {/* OPÇÃO 1: PRODUTO (INSUMOS) - sempre primeiro */}
                        <button
                          type="button"
                          onClick={() => abrirModalInsumos(ag)}
                          className="p-3.5 rounded-xl border border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-500/10 text-left transition-all flex flex-col justify-between group cursor-pointer overflow-hidden bg-background/60"
                        >
                          <div className="flex items-center justify-between gap-2 w-full">
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 min-w-0">
                              <Beaker size={14} className="shrink-0" />
                              <span className="truncate">Produto (Insumos)</span>
                            </span>
                            {ag.insumos_detalhes && ag.insumos_detalhes.length > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 shrink-0 whitespace-nowrap">
                                {ag.insumos_detalhes.length} {ag.insumos_detalhes.length === 1 ? 'item' : 'itens'}
                              </span>
                            )}
                          </div>
                          <div className="mt-2.5">
                            <p className="text-sm font-bold text-foreground truncate">
                              {ag.product_cost && Number(ag.product_cost) > 0 ? fmt(Number(ag.product_cost)) : 'Nenhum lançado'}
                            </p>
                            <p className="text-[11px] text-foreground/50 mt-0.5 truncate">Lançar produtos da etapa e pesar</p>
                          </div>
                        </button>

                        {/* OPÇÃO 2: SERVIÇO (tempo/serviço) */}
                        <button
                          type="button"
                          onClick={() => abrirModalServico(ag)}
                          className="p-3.5 rounded-xl border border-gold/30 hover:border-gold hover:bg-gold/10 text-left transition-all flex flex-col justify-between group cursor-pointer overflow-hidden bg-background/60"
                        >
                          <div className="flex items-center justify-between gap-2 w-full">
                            <span className="text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-1.5 min-w-0">
                              <Clock size={14} className="shrink-0" />
                              <span className="truncate">Serviço / Tempo</span>
                            </span>
                            <Pencil size={13} className="text-foreground/40 group-hover:text-gold shrink-0" />
                          </div>
                          <div className="mt-2.5">
                            <p className="text-sm font-bold text-foreground truncate">{getServicoNome(ag.servico_id)}</p>
                            <p className="text-[11px] text-foreground/50 mt-0.5 truncate">
                              {ag.total_amount != null && ag.total_amount > 0 ? fmt(ag.total_amount) : 'Preço de Tabela'} • Alterar/Ajustar
                            </p>
                          </div>
                        </button>

                        {/* OPÇÃO 3: AGENDA (encaixe / auxiliar) */}
                        <button
                          type="button"
                          onClick={() => abrirModalAgendaConfig(ag)}
                          className="p-3.5 rounded-xl border border-blue-500/30 hover:border-blue-500 hover:bg-blue-500/10 text-left transition-all flex flex-col justify-between group cursor-pointer overflow-hidden bg-background/60"
                        >
                          <div className="flex items-center justify-between gap-2 w-full">
                            <span className="text-xs font-bold uppercase tracking-wider text-blue-500 dark:text-blue-400 flex items-center gap-1.5 min-w-0">
                              <LinkIcon size={14} className="shrink-0" />
                              <span className="truncate">Agenda / Auxiliar</span>
                            </span>
                            {ag.allow_overlap ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-600 dark:text-blue-300 shrink-0 whitespace-nowrap">
                                Encaixe ON
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-2.5">
                            <p className="text-sm font-bold text-foreground truncate">
                              {ag.auxiliares_ids && ag.auxiliares_ids.length > 0
                                ? ag.auxiliares_ids.map(id => profissionais.find(p => p.id === id)?.nome).filter(Boolean).join(', ')
                                : 'Sem auxiliar'}
                            </p>
                            <p className="text-[11px] text-foreground/50 mt-0.5 truncate">
                              {ag.allow_overlap ? 'Encaixe liberado' : 'Sem sobreposição'} • Alterar auxiliar
                            </p>
                          </div>
                        </button>

                        {/* OPÇÃO 4: PACOTE */}
                        <button
                          type="button"
                          onClick={() => abrirModalPacotes(ag)}
                          className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between group cursor-pointer overflow-hidden bg-background/60 ${
                            ag.descontado_pacote 
                              ? 'border-purple-500 bg-purple-500/15 ring-1 ring-purple-500/40' 
                              : 'border-purple-500/30 hover:border-purple-500 hover:bg-purple-500/10'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 w-full">
                            <span className="text-xs font-bold uppercase tracking-wider text-purple-500 dark:text-purple-400 flex items-center gap-1.5 min-w-0">
                              <Package size={14} className="shrink-0" />
                              <span className="truncate">Pacote</span>
                            </span>
                            {ag.descontado_pacote ? (
                              <CheckCircle2 size={15} className="text-purple-400 shrink-0" />
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] text-purple-500 dark:text-purple-300 bg-purple-500/10 font-mono font-semibold shrink-0 whitespace-nowrap">
                                Pré-pago
                              </span>
                            )}
                          </div>
                          <div className="mt-2.5">
                            <p className="text-sm font-bold text-foreground truncate">
                              {ag.descontado_pacote ? (ag.pacote_nome || 'Pacote Abatido') : 'Consultar Pacote'}
                            </p>
                            <p className="text-[11px] text-foreground/50 mt-0.5 truncate">
                              {ag.descontado_pacote ? 'Sessão descontada ✓' : 'Descontar sessão pré-paga'}
                            </p>
                          </div>
                        </button>
                      </div>

                      {/* BOTÕES DE VENDER PRODUTO, EXCLUIR & PRÉ-FECHAMENTO */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4 pt-4 border-t border-[var(--border-subtle)]">
                        <Button 
                          variant="secondary" 
                          onClick={() => abrirModalUpsell(ag)}
                          className="w-full justify-center border border-[var(--border-subtle)] hover:border-gold/40 flex items-center gap-2 py-2.5 text-xs sm:text-sm font-semibold"
                        >
                          <ShoppingBag size={16} className="text-gold shrink-0" /> Vender Produto (Upsell)
                        </Button>

                        <Button 
                          variant="outline"
                          onClick={() => abrirModalExcluirAgendamento(ag)}
                          className="w-full justify-center border border-red-500/30 hover:border-red-500 hover:bg-red-500/10 text-red-500 dark:text-red-400 flex items-center gap-2 py-2.5 text-xs sm:text-sm font-semibold"
                        >
                          <Trash2 size={16} className="shrink-0" /> Excluir Agendamento
                        </Button>

                        <Button 
                          variant="primary" 
                          onClick={() => abrirPreFechamento(ag)}
                          className="sm:col-span-2 w-full justify-center bg-gold hover:bg-gold-dim text-white font-bold flex items-center gap-2 px-5 py-3 shadow-md text-sm"
                        >
                          <CheckCircle2 size={17} className="shrink-0" /> Encerrar Atendimento (Pré-Fechamento)
                        </Button>
                      </div>
                    </div>
                  </CardGlass>
                );
              })}
            </div>
          )}
          
          <>
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
            </>
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
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <div className="text-center font-mono text-sm text-foreground/50 font-bold shrink-0">
                        {ag.hora_inicio}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold truncate text-sm">{getClienteNome(ag.cliente_id)}</p>
                          {ag.allow_overlap && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[9px] font-extrabold uppercase tracking-wider shrink-0">
                              ⚡ Encaixe
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-foreground/50 truncate">{getServicoNome(ag.servico_id)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 w-full">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={isReadOnly}
                        onClick={isReadOnly ? undefined : () => iniciarAtendimento(ag.id)}
                        className={`flex-1 px-2.5 py-1 text-xs border-gold/40 hover:bg-gold/10 text-gold flex items-center justify-center gap-1 font-semibold ${isReadOnly ? 'opacity-50 cursor-not-allowed border-gold/20' : ''}`}
                      >
                        <Play size={13} /> Puxar
                      </Button>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        disabled={isReadOnly}
                        onClick={isReadOnly ? undefined : () => abrirPreFechamento(ag)}
                        className={`flex-1 px-2.5 py-1 text-xs border border-[var(--border-subtle)] hover:border-gold/40 text-foreground flex items-center justify-center gap-1 font-semibold ${isReadOnly ? 'opacity-50 cursor-not-allowed border-foreground/10' : ''}`}
                      >
                        <CheckCircle2 size={13} className="text-gold" /> Fechar
                      </Button>
                      <button
                        type="button"
                        disabled={isReadOnly}
                        title={isReadOnly ? 'Ação bloqueada: somente leitura' : 'Excluir ou Cancelar Atendimento'}
                        onClick={isReadOnly ? undefined : () => abrirModalExcluirAgendamento(ag)}
                        className={`shrink-0 px-2.5 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/10 text-red-400 hover:text-red-500 transition-colors cursor-pointer flex items-center justify-center ${isReadOnly ? 'opacity-50 cursor-not-allowed border-red-500/10 text-foreground/40' : ''}`}
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

              {/* Produto e Quantidade */}
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

              {/* Quem Aplicou */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

      {/* MODAL AGENDA CONFIG (ENCAIXE / AUXILIAR) */}
      {agendaConfigOpen && activeAgendamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <CardGlass className="w-full max-w-md p-6 border border-blue-500/30 shadow-2xl">
            <div className="flex justify-between items-start mb-4 border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  <LinkIcon size={20} />
                </span>
                <div>
                  <h3 className="text-xl font-bold font-serif text-foreground">Configurar Agenda</h3>
                  <p className="text-xs text-foreground/60">
                    Encaixe, sobreposição e auxiliar deste atendimento
                  </p>
                </div>
              </div>
              <button onClick={() => setAgendaConfigOpen(false)} className="text-foreground/50 hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Encaixe */}
              <div className="p-3 rounded-lg border border-[var(--border-subtle)] bg-foreground/[0.02]">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase text-foreground/70 block">Encaixe / Sobreposição</label>
                  <button
                    type="button"
                    onClick={() => setAgendaConfigAllowOverlap(prev => !prev)}
                    className={`p-1 rounded transition-all ${agendaConfigAllowOverlap ? 'bg-blue-500 text-white border-blue-500' : 'text-foreground/40 border-foreground/20 border'}`}
                  >
                    {agendaConfigAllowOverlap ? <Check size={14} /> : <X size={14} />}
                  </button>
                </div>
                <p className="text-[11px] text-foreground/50">
                  {agendaConfigAllowOverlap
                    ? 'Este horário poderá ser sobreposto por outro agendamento.'
                    : 'Este horário ficará bloqueado para sobreposição.'}
                </p>
              </div>

              {/* Auxiliar */}
              <div className="p-3 rounded-lg border border-[var(--border-subtle)] bg-foreground/[0.02]">
                <label className="text-xs font-bold uppercase text-foreground/70 block mb-3">Auxiliar na Cadeira</label>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-foreground/5 transition-colors">
                    <input
                      type="checkbox"
                      checked={agendaConfigAuxiliares.length === 0}
                      onChange={() => setAgendaConfigAuxiliares([])}
                      className="accent-blue-500"
                    />
                    <span className="text-sm text-foreground">Nenhum (somente titular)</span>
                  </label>
                  {[...profissionais]
                    .filter(p => p.id !== activeAgendamento?.profissional_id && p.ativo !== false)
                    .sort((a, b) => {
                      const aAux = Boolean(a.is_auxiliar || a.cargo?.toLowerCase().includes('auxiliar') || a.role_title?.toLowerCase().includes('auxiliar') || a.especialidades?.some(e => e.toLowerCase().includes('auxiliar')));
                      const bAux = Boolean(b.is_auxiliar || b.cargo?.toLowerCase().includes('auxiliar') || b.role_title?.toLowerCase().includes('auxiliar') || b.especialidades?.some(e => e.toLowerCase().includes('auxiliar')));
                      if (aAux && !bAux) return -1;
                      if (!aAux && bAux) return 1;
                      return (a.nome || '').localeCompare(b.nome || '');
                    })
                    .map(p => {
                      const isSelected = agendaConfigAuxiliares.includes(p.id);
                      const isAuxCabelo = Boolean(p.is_auxiliar || p.cargo?.toLowerCase().includes('auxiliar') || p.role_title?.toLowerCase().includes('auxiliar') || p.especialidades?.some(e => e.toLowerCase().includes('auxiliar')));
                      return (
                        <label key={p.id} className="flex items-center justify-between gap-2 cursor-pointer p-2 rounded hover:bg-foreground/5 transition-colors">
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                if (isSelected) {
                                  setAgendaConfigAuxiliares(agendaConfigAuxiliares.filter(id => id !== p.id));
                                } else {
                                  setAgendaConfigAuxiliares([...agendaConfigAuxiliares, p.id]);
                                }
                              }}
                              className="accent-blue-500 shrink-0"
                            />
                            <span className="text-sm text-foreground truncate">{p.nome}</span>
                          </div>
                          {isAuxCabelo ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 shrink-0">
                              Auxiliar (Cabelo)
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-foreground/5 text-foreground/60 border border-[var(--border-subtle)] shrink-0">
                              {p.cargo || p.role_title || getCategoriaProfissional(p)}
                            </span>
                          )}
                        </label>
                      );
                    })}
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border-subtle)] flex justify-end gap-3">
                <Button variant="outline" onClick={() => setAgendaConfigOpen(false)}>Cancelar</Button>
                <Button
                  variant="primary"
                  disabled={insumoLoading}
                  onClick={handleSalvarAgendaConfig}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-6 py-2"
                >
                  {insumoLoading ? '...' : 'Salvar Configuração'}
                </Button>
              </div>
            </div>
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
              A comissão da venda será lançada na conta do profissional selecionado após a cliente pagar no caixa.
            </p>
            
            <div className="space-y-4 mb-6">
              <div className="space-y-3 p-3 bg-foreground/[0.02] border border-[var(--border-subtle)] rounded-lg">
                <div>
                  <label className="text-xs font-semibold text-foreground/70 mb-1 block">
                    Profissional que está realizando a venda:
                  </label>
                  <select
                    className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-xs font-semibold text-foreground focus:outline-none focus:border-gold"
                    value={produtoProfId || activeAgendamento.profissional_id}
                    onChange={e => setProdutoProfId(e.target.value)}
                  >
                    <option value={activeAgendamento.profissional_id}>
                      ⭐ {profissionais.find(p => p.id === activeAgendamento.profissional_id)?.nome || 'Titular'} (Titular)
                    </option>
                    {Array.isArray(activeAgendamento.auxiliares_ids) && activeAgendamento.auxiliares_ids.map(aid => (
                      <option key={aid} value={aid}>
                        👥 {profissionais.find(p => p.id === aid)?.nome || 'Auxiliar'} (Auxiliar na Cadeira)
                      </option>
                    ))}
                    {profissionais
                      .filter(p => p.ativo !== false && p.id !== activeAgendamento.profissional_id && !(activeAgendamento.auxiliares_ids || []).includes(p.id))
                      .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
                      .map(p => {
                        const isAux = Boolean(p.is_auxiliar || p.cargo?.toLowerCase().includes('auxiliar') || p.role_title?.toLowerCase().includes('auxiliar') || p.especialidades?.some(e => e.toLowerCase().includes('auxiliar')));
                        return (
                          <option key={p.id} value={p.id}>
                            👤 {p.nome} ({isAux ? 'Auxiliar' : (p.cargo || p.role_title || getCategoriaProfissional(p))})
                          </option>
                        );
                      })}
                  </select>
                </div>

                <div className="flex gap-2">
                  <ProductSearchSelect
                    mode="sale"
                    products={produtosDeVenda}
                    value={produtoSelecionado}
                    onChange={(pid) => {
                      setProdutoSelecionado(pid);
                      if (produtoDescPct) {
                        const p = estoque.find(x => x.id === pid);
                        const sub = (p?.sale_price || 0) * (Math.max(1, parseInt(produtoQty) || 1));
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
                        const p = estoque.find(x => x.id === produtoSelecionado);
                        const sub = (p?.sale_price || 0) * (Math.max(1, parseInt(q) || 1));
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
                    const prod = estoque.find(p => p.id === item.inventory_id);
                    const precoOrig = prod?.sale_price || 0;
                    const temDesc = precoOrig > item.price;
                    const vendedorNome = item.profissional_nome || profissionais.find(p => p.id === (item.profissional_id || activeAgendamento.profissional_id))?.nome || 'Profissional';
                    return (
                      <div key={item.id} className="p-2.5 text-sm border-t border-[var(--border-subtle)] flex justify-between items-center">
                        <div className="flex-1 pr-2">
                          <span className="flex items-center gap-2 font-medium">
                            <ShoppingBag size={14} className="text-gold"/> {prod?.name}
                          </span>
                          <p className="text-[11px] text-foreground/60 ml-5 mt-0.5">
                            Vendido por: <strong className="text-foreground/80">{vendedorNome}</strong>
                          </p>
                          {temDesc && (
                            <p className="text-xs text-foreground/50 ml-5 mt-0.5 flex items-center gap-1.5">
                              <span className="line-through">R$ {precoOrig.toFixed(2)}</span>
                              <span className="text-emerald-800 dark:text-emerald-400 font-semibold">R$ {item.price.toFixed(2)} un.</span>
                            </p>
                          )}
                        </div>
                        <div className="text-right flex flex-col gap-1">
                          <div>
                            <span className="font-mono text-foreground/70">{item.qty}x</span>
                            <p className="text-xs font-bold text-gold font-mono">R$ {(item.price * item.qty).toFixed(2)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleExcluirItemUpsell(item.id)}
                            disabled={excluindoItemUpsellId === item.id}
                            className="p-1 rounded text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 transition-colors shrink-0"
                            title="Excluir item"
                          >
                            {excluindoItemUpsellId === item.id ? (
                              <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                              <Trash2 size={14} className="text-foreground/40 hover:text-red-500" />
                            )}
                          </button>
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
                  onChange={isReadOnly ? undefined : (e) => {
                    const novoId = e.target.value;
                    setServicoEditandoId(novoId);
                    const s = servicos.find(srv => srv.id === novoId);
                    if (s) setServicoPrecoEditado(String(s.preco || 0));
                  }}
                  disabled={isReadOnly}
                  className={`w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm font-semibold text-foreground focus:outline-none focus:border-gold cursor-pointer ${isReadOnly ? 'opacity-50 cursor-not-allowed bg-foreground/[0.05]' : ''}`}
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
                    onChange={isReadOnly ? undefined : (e) => setServicoPrecoEditado(e.target.value)}
                    disabled={isReadOnly}
                    className={`w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg py-2 pl-9 pr-3 text-sm font-mono font-bold text-foreground focus:outline-none focus:border-gold ${isReadOnly ? 'opacity-50 cursor-not-allowed bg-foreground/[0.05]' : ''}`}
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
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase text-foreground/70 block mb-1">
                    Procedimentos Adicionais / Sub-serviços
                  </label>
                  {!isReadOnly && (
                    <span className="text-[10px] text-foreground/40 font-mono">
                      {subServicosEditados.length} selecionado(s)
                    </span>
                  )}
                </div>

                {/* Campo de busca pronto para digitar */}
                <ProductSearchSelect
                  mode="auto"
                  products={servicos.filter(s => s.id !== servicoEditandoId).map(s => ({
                    id: s.id,
                    name: s.nome,
                    price: s.preco,
                  }))}
                  value={subServicoBuscaId}
                  onChange={(pid, prod) => {
                    if (!pid) return;
                    const existe = subServicosEditados.some(sub => (typeof sub === 'string' ? sub === pid : sub?.id === pid));
                    if (!existe && prod) {
                      setSubServicosEditados(prev => [...prev, { id: prod.id, nome: prod.name, preco: prod.price }]);
                    }
                    setSubServicoBuscaId('');
                  }}
                  placeholder="Buscar procedimento adicional..."
                  autoFocus
                  className="w-full"
                  disabled={isReadOnly}
                />

                {/* Chips dos sub-serviços selecionados */}
                {subServicosEditados.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {subServicosEditados.map((sub, idx) => {
                      const sId = typeof sub === 'string' ? sub : sub.id;
                      const s = servicos.find(srv => srv.id === sId);
                      return (
                        <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gold/20 border border-gold/30 text-xs">
                          <span className="font-semibold text-foreground truncate max-w-[120px]">
                            {sub.nome || (s?.nome || 'Procedimento')}
                          </span>
                          <span className="font-mono text-gold font-bold">+{fmt(typeof sub === 'string' ? (s?.preco || 0) : sub.preco)}</span>
                          <button
                            type="button"
                            onClick={() => setSubServicosEditados(prev => prev.filter((_, i) => i !== idx))}
                            className="p-0.5 text-foreground/40 hover:text-red-500 rounded hover:bg-red-500/10 transition-colors"
                            title="Remover"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {!isReadOnly && subServicosEditados.length === 0 && (
                  <p className="text-[11px] text-foreground/50 mt-2">Nenhum procedimento adicional selecionado. Digite acima para buscar e adicionar.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
              <Button variant="outline" onClick={() => setServicoModalOpen(false)} disabled={isReadOnly}>Cancelar</Button>
              <Button variant="primary" disabled={isReadOnly || salvandoServico} onClick={isReadOnly ? undefined : handleSalvarServico} className={`bg-gold hover:bg-gold-dim text-white font-bold ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {salvandoServico ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
              {!isReadOnly && (
                <Button variant="outline" size="sm" onClick={() => {
                  setServicoModalOpen(false);
                  setPacoteModalOpen(true);
                  setLoadingPacotes(true);
                  setPacoteModalOpen(true);
                  setCriandoNovoPacote(false);
                  setNovoPacoteNome('');
                  setNovoPacoteServicoId(activeAgendamento?.servico_id || '');
                  setNovoPacoteSessoes('4');
                  setNovoPacoteValor('');
                  fetchPacotesClientes(activeAgendamento.cliente_id).then(pacs => {
                    setPacotesCliente(pacs);
                    setLoadingPacotes(false);
                  }).catch(() => setLoadingPacotes(false));
                }} className="border-purple-500/40 text-purple-400 hover:bg-purple-500/10 text-xs font-bold flex items-center gap-1">
                  <Package size={13} className="mr-1" /> Criar Pacote Pré-Pago
                </Button>
              )}
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
                    disabled={isReadOnly}
                    onClick={isReadOnly ? undefined : handleEstornarPacote}
                    className={`text-[11px] text-red-400 hover:underline mt-1 block cursor-pointer font-semibold ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                      disabled={isReadOnly}
                      onClick={isReadOnly ? undefined : () => setCriandoNovoPacote(true)}
                      className={`text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                      disabled={isReadOnly}
                      onClick={isReadOnly ? undefined : () => setCriandoNovoPacote(true)}
                      className={`border-purple-500/40 text-purple-400 hover:bg-purple-500/10 text-xs ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                                  disabled={isReadOnly || p.sessoes_restantes <= 0}
                                  onClick={isReadOnly ? undefined : () => handleAbaterPacote(p)}
                                  className={`bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-xs ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
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
        const descPctEfetivo = parseFloat(preFechamentoDescontoPct) || (precoBaseServico > 0 ? Number(((descValor / precoBaseServico) * 100).toFixed(1)) : 0);
        const valorServicoLiquido = activeAgendamento.descontado_pacote 
          ? 0 
          : Math.max(0, precoBaseServico - descValor);

        // Valor fracionado usado dos insumos (custo unitário × quantidade usada), não o custo total do produto
        const custoInsumosUsado = Number(
          (Array.isArray(activeAgendamento.insumos_detalhes)
            ? activeAgendamento.insumos_detalhes.reduce(
                (acc, item) => acc + Number(item.custo_unitario || item.price_per_gram || 0) * Number(item.qty_used || 0),
                0
              )
            : 0).toFixed(2)
        );
        const custoInsumos = custoInsumosUsado > 0 ? custoInsumosUsado : Number(activeAgendamento.product_cost || 0);

        // Itens de produto de balcão (upsell)
        const itensUpsell = comandaAtual.filter(i => i.type === 'PRODUTO');
        const totalUpsell = Number(itensUpsell.reduce((acc, i) => acc + (i.price * i.qty), 0).toFixed(2));

        // TOTAL COBRADO DA CLIENTE NO CAIXA
        const totalCobradoCliente = Number((valorServicoLiquido + totalUpsell).toFixed(2));

        // 1ª PARTE: INSUMOS (RECOMPRA DE ESTOQUE)
        const parte1InsumosRecompra = custoInsumos;

        // Base para cálculo da comissão do serviço: Valor Líquido do Serviço - Insumos
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

        // Regras de comissão do serviço
        const regraTitular = regrasComissao.find(r => r.professional_id === activeAgendamento.profissional_id && (r.service_id === activeAgendamento.servico_id || !r.service_id) && r.active);
        const pctComissaoBase = regraTitular?.commission_pct ?? titular?.comissao_padrao ?? 50;

        const totalComissaoBancada = Number(((baseCalculoComissao * pctComissaoBase) / 100).toFixed(2));

        // Divisão entre os profissionais (Serviço + Produtos Vendidos):
        const comissoesIndividuais: Array<{
          profissionalId: string;
          nome: string;
          isAgnaldo: boolean;
          isAuxiliar: boolean;
          pct: number;
          valorServico: number;
          valorProduto: number;
          pctProduto?: number;
          valor: number;
          observacao?: string;
        }> = [];

        if (titularesEAuxiliares.length === 1) {
          const pid = titularesEAuxiliares[0];
          const pNome = profissionais.find(p => p.id === pid)?.nome || 'Profissional';
          const isAg = pNome.toLowerCase().includes('agnaldo');
          const valSrv = (isAg && !preFechamentoAgnaldoRecebe) ? 0 : totalComissaoBancada;
          comissoesIndividuais.push({
            profissionalId: pid,
            nome: pNome,
            isAgnaldo: isAg,
            isAuxiliar: false,
            pct: (isAg && !preFechamentoAgnaldoRecebe) ? 0 : pctComissaoBase,
            valorServico: valSrv,
            valorProduto: 0,
            valor: valSrv,
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
              valorServico: 0,
              valorProduto: 0,
              valor: 0,
              observacao: 'Cedeu a comissão para o(s) auxiliar(es)',
            });
            const valorPorAux = Number((totalComissaoBancada / auxiliares.length).toFixed(2));
            auxiliares.forEach((auxId, idx) => {
              const auxNome = profissionais.find(p => p.id === auxId)?.nome || 'Auxiliar';
              const valAux = idx === 0 ? Number((totalComissaoBancada - valorPorAux * (auxiliares.length - 1)).toFixed(2)) : valorPorAux;
              comissoesIndividuais.push({
                profissionalId: auxId,
                nome: auxNome,
                isAgnaldo: false,
                isAuxiliar: true,
                pct: pctComissaoBase,
                valorServico: valAux,
                valorProduto: 0,
                valor: valAux,
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
                valorServico: valorCom,
                valorProduto: 0,
                valor: valorCom,
              });
            });
          }
        }

        // Contabilizar comissão sobre venda de produtos (Upsell) para o profissional vendedor de cada item
        let totalComissaoProdutos = 0;
        const produtosVendaDetalhados = itensUpsell.map(item => {
          const prodEstoque = estoque.find(e => e.id === item.inventory_id);
          const vendId = item.profissional_id || activeAgendamento.profissional_id;
          const vendObj = profissionais.find(p => p.id === vendId);
          const vendNome = item.profissional_nome || vendObj?.nome || 'Profissional';
          const pctProd = (vendObj?.product_commission_pct != null && Number(vendObj.product_commission_pct) > 0)
            ? Number(vendObj.product_commission_pct)
            : 10;
          const subtotalItem = Number((item.price * item.qty).toFixed(2));
          const comissaoItem = Number(((subtotalItem * pctProd) / 100).toFixed(2));
          totalComissaoProdutos = Number((totalComissaoProdutos + comissaoItem).toFixed(2));

          const existente = comissoesIndividuais.find(c => c.profissionalId === vendId);
          if (existente) {
            existente.valorProduto = Number((existente.valorProduto + comissaoItem).toFixed(2));
            existente.pctProduto = pctProd;
            existente.valor = Number((existente.valorServico + existente.valorProduto).toFixed(2));
          } else {
            comissoesIndividuais.push({
              profissionalId: vendId,
              nome: vendNome,
              isAgnaldo: vendNome.toLowerCase().includes('agnaldo'),
              isAuxiliar: vendId !== activeAgendamento.profissional_id,
              pct: 0,
              valorServico: 0,
              valorProduto: comissaoItem,
              pctProduto: pctProd,
              valor: comissaoItem,
              observacao: `Comissão venda de produto (${pctProd}%)`,
            });
          }

          return {
            inventory_id: item.inventory_id,
            name: prodEstoque?.name || 'Produto',
            nome: prodEstoque?.name || 'Produto',
            qty: item.qty,
            quantidade: item.qty,
            precoOriginal: prodEstoque?.sale_price || item.price,
            preco: item.price,
            preco_unitario: item.price,
            profissional_id: vendId,
            profissional_nome: vendNome,
            comissao_pct: pctProd,
            comissao_valor: comissaoItem,
          };
        });

        const parte2ComissoesTotal = Number(comissoesIndividuais.reduce((sum, c) => sum + c.valor, 0).toFixed(2));

        // 3ª PARTE: SALÃO / STUDIO (Total cobrado - 1ª Parte Insumos - 2ª Parte Comissões Serviço + Produtos)
        const parte3Salao = Number(Math.max(0, totalCobradoCliente - parte1InsumosRecompra - parte2ComissoesTotal).toFixed(2));

        const handleConfirmar = async () => {
          setPreFechamentoLoading(true);
          try {
            const splitCustom: Record<string, number> = {};
            comissoesIndividuais.forEach(c => {
              splitCustom[c.profissionalId] = c.valor;
            });

            const nomeCliente = getClienteNome(activeAgendamento.cliente_id);
            const nomeServico = getServicoNome(activeAgendamento.servico_id);

            const comandaObj: ComandaMultiProfissional = {
              cliente_id: activeAgendamento.cliente_id,
              cliente_nome: nomeCliente,
              data: activeAgendamento.data,
              procedimentos: [
                {
                  id: 'proc_principal_' + activeAgendamento.id,
                  servico_id: activeAgendamento.servico_id,
                  servico_nome: nomeServico,
                  profissional_id: activeAgendamento.profissional_id,
                  profissional_nome: titularNome,
                  preco_tabela: precoBaseServico,
                  desconto_valor: descValor,
                  desconto_pct: descPctEfetivo,
                  valor_final: valorServicoLiquido,
                  insumos_custo: parte1InsumosRecompra,
                  agendamento_id: activeAgendamento.id,
                },
              ],
              insumos: activeAgendamento.insumos_detalhes || [],
              produtos_venda: produtosVendaDetalhados.map(p => ({
                inventory_id: p.inventory_id,
                name: p.name,
                qty: p.qty,
                precoOriginal: p.precoOriginal,
                preco: p.preco,
                profissional_id: p.profissional_id,
                profissional_nome: p.profissional_nome,
                comissao_pct: p.comissao_pct,
                comissao_valor: p.comissao_valor,
              })),
              produtos_comprados: produtosVendaDetalhados.map(p => ({
                inventory_id: p.inventory_id,
                nome: p.nome,
                quantidade: p.quantidade,
                preco_unitario: p.preco_unitario,
                profissional_id: p.profissional_id,
                profissional_nome: p.profissional_nome,
                comissao_pct: p.comissao_pct,
                comissao_valor: p.comissao_valor,
              })),
              total_bruto_servicos: precoBaseServico,
              total_descontos_servicos: descValor,
              total_liquido_servicos: valorServicoLiquido,
              total_produtos_venda: totalUpsell,
              total_insumos: parte1InsumosRecompra,
              total_pago_cliente: totalCobradoCliente,
              payment_method: activeAgendamento.descontado_pacote ? 'PACOTE' : (activeAgendamento.payment_method || 'DINHEIRO'),
              installments: 1,
              agendamentos_unificados_ids: [activeAgendamento.id],
              fechado_em: new Date().toISOString(),
            };

            const ok = await finalizarRecebimentoAgendamento({
              id: activeAgendamento.id,
              paymentMethod: activeAgendamento.descontado_pacote ? 'PACOTE' : (activeAgendamento.payment_method || 'DINHEIRO'),
              totalAmount: totalCobradoCliente,
              productCost: parte1InsumosRecompra,
              insumosDetalhes: activeAgendamento.insumos_detalhes,
              splitComissao: splitCustom,
              auxiliaresIds: activeAgendamento.auxiliares_ids,
              comandaUnificada: comandaObj,
              financialStatus: 'PENDING_CONFIRMATION',
              descontoValor: descValor,
              descontoPct: descPctEfetivo,
              pacoteUtilizadoId: activeAgendamento.pacote_utilizado_id || undefined,
              pacoteNome: activeAgendamento.pacote_nome || undefined,
              descontadoPacote: activeAgendamento.descontado_pacote || false,
              agnaldoRecebeComissao: preFechamentoAgnaldoRecebe,
              preFechadoPor: 'Profissional',
            });

            if (ok) {
              await sincronizarComissoesDoAgendamento({
                appointmentId: activeAgendamento.id,
                appointmentDate: activeAgendamento.data,
                serviceId: activeAgendamento.servico_id,
                paymentMethod: activeAgendamento.descontado_pacote ? 'DINHEIRO' : (activeAgendamento.payment_method || 'DINHEIRO'),
                installments: 1,
                comissoes: comissoesIndividuais
                  .filter(c => c.valor > 0)
                  .map(c => {
                    const partesNota: string[] = [];
                    if (c.valorServico > 0) {
                      partesNota.push(`Serviço (${nomeServico}): R$ ${c.valorServico.toFixed(2)}`);
                    }
                    if (c.valorProduto > 0) {
                      partesNota.push(`Venda de Produto (${c.pctProduto ?? 10}%): R$ ${c.valorProduto.toFixed(2)}`);
                    }
                    return {
                      professionalId: c.profissionalId,
                      totalAmount: totalCobradoCliente,
                      commissionAmount: c.valor,
                      commissionPct: c.pct || (c.pctProduto ?? 10),
                      notes: `Pré-Fechamento [${nomeCliente}]: ${partesNota.join(' + ')}`,
                    };
                  }),
              });

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

              {/* DETALHAMENTO DE VALORES: SERVIÇO - DESCONTO + PRODUTOS BALCÃO = TOTAL FINAL */}
              <div className="p-4 rounded-xl bg-foreground/[0.03] border border-[var(--border-subtle)] space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/70 flex items-center gap-1.5">
                  <DollarSign size={14} className="text-gold" /> Resumo de Valores do Atendimento
                </h4>

                {/* Valor do Serviço */}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-foreground/60">Valor do Serviço (Tabela)</span>
                  <span className="font-mono font-bold text-foreground">{fmt(precoBaseServico)}</span>
                </div>

                {/* Desconto */}
                {descValor > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-foreground/60">
                      Desconto no Serviço {descPctEfetivo > 0 ? `(${descPctEfetivo}%)` : ''}
                    </span>
                    <span className="font-mono font-bold text-red-500">
                      - {fmt(descValor)}
                    </span>
                  </div>
                )}

                {/* Valor Líquido do Serviço */}
                <div className="flex justify-between items-center text-sm border-t border-[var(--border-subtle)] pt-2">
                  <span className="text-foreground font-medium">Valor Líquido do Serviço</span>
                  <span className="font-mono font-bold text-foreground">{fmt(valorServicoLiquido)}</span>
                </div>

                {/* Produtos Balcão / Home Care */}
                {totalUpsell > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-foreground/60">Produtos Vendidos (Balcão / Home Care)</span>
                    <span className="font-mono font-bold text-gold">+ {fmt(totalUpsell)}</span>
                  </div>
                )}

                {/* Detalhe dos Insumos (1ª Parte - Absorvido no Serviço) */}
                {parte1InsumosRecompra > 0 && (
                  <div className="flex justify-between items-center text-xs text-emerald-500 pt-1 border-t border-[var(--border-subtle)]">
                    <span>Insumos Utilizados (1ª Parte • Absorvido no serviço)</span>
                    <span className="font-mono font-bold">{fmt(parte1InsumosRecompra)} (deduzido da base de comissão)</span>
                  </div>
                )}

                {/* Total Final */}
                <div className="flex justify-between items-center text-base border-t border-[var(--border-subtle)] pt-2 mt-2">
                  <span className="text-foreground font-bold">TOTAL FINAL A COBRAR</span>
                  <span className="font-black font-mono text-gold text-lg">{fmt(totalCobradoCliente)}</span>
                </div>
              </div>

              {/* ✨ DEMONSTRATIVO DA DIVISÃO EM 3 PARTES (INSUMOS + COMISSÕES + SALÃO) */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-gold/10 via-foreground/[0.02] to-background border border-gold/30 space-y-3">
                <div className="flex justify-between items-center border-b border-gold/20 pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-1.5">
                    <Sparkles size={14} /> Demonstrativo da Divisão em 3 Partes
                  </h4>
                  <span className="text-[11px] text-foreground/60 font-mono">
                    Total: {fmt(totalCobradoCliente)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-2.5 rounded-lg bg-foreground/[0.03] border border-emerald-500/30 space-y-0.5">
                    <span className="text-[10px] font-bold uppercase text-emerald-500 block">1ª Parte • Insumos</span>
                    <p className="text-sm font-bold font-mono text-emerald-500">{fmt(parte1InsumosRecompra)}</p>
                    <p className="text-[10px] text-foreground/50">Recompra de estoque usado</p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-foreground/[0.03] border border-blue-500/30 space-y-0.5">
                    <span className="text-[10px] font-bold uppercase text-blue-500 block">2ª Parte • Comissões</span>
                    <p className="text-sm font-bold font-mono text-blue-500">{fmt(parte2ComissoesTotal)}</p>
                    <p className="text-[10px] text-foreground/50">
                      Serviço ({fmt(totalComissaoBancada)})
                      {totalComissaoProdutos > 0 ? ` + Prod. (${fmt(totalComissaoProdutos)})` : ''}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-foreground/[0.03] border border-gold/30 space-y-0.5">
                    <span className="text-[10px] font-bold uppercase text-gold block">3ª Parte • Salão</span>
                    <p className="text-sm font-bold font-mono text-gold">{fmt(parte3Salao)}</p>
                    <p className="text-[10px] text-foreground/50">Receita líquida do Studio</p>
                  </div>
                </div>

                {/* Distribuição por profissional (Serviço + Venda de Produto) */}
                <div className="space-y-1.5 pt-2 border-t border-gold/20">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/60 block">
                    Comissão por Profissional (Serviço + Venda de Produtos):
                  </span>
                  {comissoesIndividuais.map((c, idx) => (
                    <div key={idx} className="flex flex-wrap justify-between items-center text-xs p-2 rounded-lg bg-foreground/[0.03] border border-[var(--border-subtle)] gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Users size={13} className="text-gold" />
                        <span className="font-bold text-foreground">{c.nome}</span>
                        {c.isAuxiliar && (
                          <span className="px-1.5 py-0.2 rounded bg-gold/15 text-gold text-[9px] font-bold">Auxiliar</span>
                        )}
                        {c.observacao && (
                          <span className="text-[10px] text-amber-500 font-medium">({c.observacao})</span>
                        )}
                      </div>
                      <div className="text-right font-mono">
                        <span className="font-bold text-foreground">{fmt(c.valor)}</span>
                        {(c.valorServico > 0 && c.valorProduto > 0) && (
                          <span className="block text-[10px] text-foreground/60">
                            Serv.: {fmt(c.valorServico)} + Prod. ({c.pctProduto ?? 10}%): {fmt(c.valorProduto)}
                          </span>
                        )}
                        {(c.valorServico === 0 && c.valorProduto > 0) && (
                          <span className="block text-[10px] text-gold">
                            Venda Produto ({c.pctProduto ?? 10}%): {fmt(c.valorProduto)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
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

              {/* DETALHAMENTO DE INSUMOS E PRODUTOS DO ATENDIMENTO */}
              {((activeAgendamento.insumos_detalhes && activeAgendamento.insumos_detalhes.length > 0) || itensUpsell.length > 0) && (
                <div className="p-3.5 rounded-xl bg-foreground/[0.02] border border-[var(--border-subtle)] space-y-2 text-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-foreground/60 block">
                    Produtos e Insumos do Atendimento
                  </span>
                  {activeAgendamento.insumos_detalhes && activeAgendamento.insumos_detalhes.length > 0 && (
                    <div className="space-y-1.5 mt-1">
                      <div className="flex justify-between items-center text-[10px] font-bold text-foreground/60 border-b border-[var(--border-subtle)] pb-1 mb-1">
                        <span>Insumo</span>
                        <span className="text-right">Qtd</span>
                        <span className="text-right">Valor Unit.</span>
                        <span className="text-right">Total</span>
                      </div>
                      {activeAgendamento.insumos_detalhes.map((item, idx) => {
                        const itemTotal = Number((Number(item.custo_unitario || item.price_per_gram || 0) * Number(item.qty_used || 0)).toFixed(2));
                        const itemUnit = Number((item.custo_unitario || item.price_per_gram || 0).toFixed(4));
                        return (
                          <div key={idx} className="flex justify-between items-center text-xs text-foreground/80 py-0.5">
                            <span className="truncate max-w-[40%]">{item.name}</span>
                            <span className="text-right w-12 font-mono">{Number(item.qty_used || 0)}{item.unit}</span>
                            <span className="text-right w-16 font-mono text-foreground/60">R$ {itemUnit.toFixed(2)}</span>
                            <span className="text-right w-16 font-mono font-bold text-emerald-500">R$ {itemTotal.toFixed(2)}</span>
                          </div>
                        );
                      })}
                      <div className="flex justify-between items-center text-[10px] font-bold text-foreground border-t border-[var(--border-subtle)] pt-1 mt-1">
                        <span>Total Insumos</span>
                        <span className="text-right w-16 font-mono font-bold text-emerald-500">R$ {custoInsumosUsado.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                  {itensUpsell.length > 0 && (
                    <div className="space-y-1 mt-2 pt-2 border-t border-[var(--border-subtle)]">
                      <div className="flex items-center justify-between text-[10px] font-bold text-foreground/60 border-b border-[var(--border-subtle)] pb-1 mb-1">
                        <span>Produto Balcão</span>
                        <span className="text-right">Qtd</span>
                        <span className="text-right">Total</span>
                      </div>
                      {itensUpsell.map((item, idx) => {
                        const prod = estoque.find(p => p.id === item.inventory_id);
                        const vendedorNome = item.profissional_nome || profissionais.find(p => p.id === (item.profissional_id || activeAgendamento.profissional_id))?.nome || 'Profissional';
                        return (
                          <div key={idx} className="flex justify-between items-center text-xs text-foreground/80 py-0.5">
                            <span className="truncate max-w-[55%]">
                              {prod?.name || 'Produto'} <span className="text-[10px] text-foreground/50">(Por: {vendedorNome})</span>
                            </span>
                            <span className="text-right w-12 font-mono">{item.qty}</span>
                            <span className="text-right w-16 font-mono font-bold text-gold">R$ {(item.price * item.qty).toFixed(2)}</span>
                          </div>
                        );
                      })}
                      <div className="flex justify-between items-center text-[10px] font-bold text-foreground border-t border-[var(--border-subtle)] pt-1 mt-1">
                        <span>Total Balcão</span>
                        <span className="text-right w-16 font-mono font-bold text-gold">R$ {totalUpsell.toFixed(2)}</span>
                      </div>
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

      {/* 4. MODAL NOVO AGENDAMENTO RÁPIDO PELO PROFISSIONAL (HORÁRIO ATUAL + DETECÇÃO AUTOMÁTICA DE ENCAIXE) */}
      {novoAgModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <CardGlass className="w-full max-w-lg p-6 max-h-[92vh] overflow-y-auto border border-gold/30 shadow-2xl space-y-4">
            <div className="flex justify-between items-start border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-gold/15 text-gold border border-gold/30">
                  <CalendarDays size={20} />
                </span>
                <div>
                  <h3 className="text-xl font-bold font-serif text-foreground">Agendamento Rápido na Cadeira</h3>
                  <p className="text-xs text-foreground/60">
                    Abre no horário atual • Reconhece horário livre ou encaixe automaticamente
                  </p>
                </div>
              </div>
              <button onClick={() => setNovoAgModalOpen(false)} className="text-foreground/50 hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* 1. CLIENTE (BUSCA RÁPIDA + CADASTRO INSTANTÂNEO) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase text-foreground/70">1. Cliente</label>
                  <button
                    type="button"
                    onClick={() => setNovoAgCadastrandoCliente(prev => !prev)}
                    className="text-[11px] font-bold text-gold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {novoAgCadastrandoCliente ? 'Selecionar cliente existente' : '+ Cadastrar Novo Cliente'}
                  </button>
                </div>

                {novoAgCadastrandoCliente ? (
                  <div className="p-3 rounded-xl bg-gold/5 border border-gold/30 space-y-2.5">
                    <p className="text-[11px] font-bold text-gold uppercase">Cadastro Rápido de Cliente</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Nome da cliente *"
                        value={novoAgNovoCliNome}
                        onChange={e => setNovoAgNovoCliNome(e.target.value)}
                        className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2 text-xs font-semibold text-foreground focus:outline-none focus:border-gold"
                      />
                      <input
                        type="text"
                        placeholder="WhatsApp / Telefone *"
                        value={novoAgNovoCliTel}
                        onChange={e => setNovoAgNovoCliTel(e.target.value)}
                        className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2 text-xs font-mono text-foreground focus:outline-none focus:border-gold"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setNovoAgCadastrandoCliente(false)}
                        className="text-xs"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={novoAgSalvandoCliente}
                        onClick={handleCadastrarClienteRapidoPainel}
                        className="bg-gold hover:bg-gold-dim text-white text-xs font-bold"
                      >
                        {novoAgSalvandoCliente ? 'Salvando...' : 'Salvar e Selecionar'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      placeholder="Buscar cliente por nome ou telefone..."
                      value={novoAgBuscaCliente}
                      onChange={e => {
                        const val = e.target.value;
                        setNovoAgBuscaCliente(val);
                        const termo = val.toLowerCase().trim();
                        if (termo) {
                          const match = clientes.find(c =>
                            (c.nome || '').toLowerCase().includes(termo) ||
                            (c.telefone || '').includes(termo)
                          );
                          if (match) setNovoAgClienteId(match.id);
                        }
                      }}
                      className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-gold"
                    />
                    <select
                      value={novoAgClienteId}
                      onChange={e => setNovoAgClienteId(e.target.value)}
                      className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm font-semibold text-foreground focus:outline-none focus:border-gold cursor-pointer"
                    >
                      {clientesFiltradosNovoAg.length === 0 ? (
                        <option value="">Nenhum cliente encontrado</option>
                      ) : (
                        clientesFiltradosNovoAg.map(c => (
                          <option key={c.id} value={c.id}>{c.nome} ({c.telefone || 'Sem tel'})</option>
                        ))
                      )}
                    </select>
                  </div>
                )}
              </div>

              {/* 2. SERVIÇO E DURAÇÃO */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold uppercase text-foreground/70 block mb-1">2. Serviço / Procedimento</label>
                  <select
                    value={novoAgServicoId}
                    onChange={e => {
                      const sid = e.target.value;
                      setNovoAgServicoId(sid);
                      const srv = servicos.find(s => s.id === sid);
                      if (srv?.duracao_min) {
                        setNovoAgDuracaoMin(String(srv.duracao_min));
                      }
                    }}
                    className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm font-semibold text-foreground focus:outline-none focus:border-gold cursor-pointer"
                  >
                    {servicos.map(s => (
                      <option key={s.id} value={s.id}>{s.nome} — {fmt(s.preco)} ({s.duracao_min || 60} min)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-foreground/70 block mb-1">Duração (min)</label>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={novoAgDuracaoMin}
                    onChange={e => setNovoAgDuracaoMin(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm font-mono font-bold text-center text-foreground focus:outline-none focus:border-gold"
                  />
                </div>
              </div>

              {/* 3. DATA E HORÁRIO COM AJUSTE RÁPIDO A PARTIR DO HORÁRIO ATUAL */}
              <div className="p-3 rounded-xl bg-foreground/[0.02] border border-[var(--border-subtle)] space-y-2.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-xs font-bold uppercase text-foreground/70 block mb-1">3. Data</label>
                    <input
                      type="date"
                      value={novoAgData}
                      onChange={e => {
                        const novaData = e.target.value;
                        setNovoAgData(novaData);
                        if (novaData) setSelectedDate(novaData);
                      }}
                      className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2 text-xs font-mono font-bold text-foreground focus:outline-none focus:border-gold"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold uppercase text-foreground/70">Horário de Início</label>
                      <span className="text-[10px] font-mono text-foreground/50">
                        Fim: <strong>{analiseHorarioNovoAg.horaFim}</strong>
                      </span>
                    </div>
                    <input
                      type="time"
                      value={novoAgHoraInicio}
                      onChange={e => setNovoAgHoraInicio(e.target.value)}
                      className="w-full bg-[var(--background)] border border-gold/50 rounded-lg p-2 text-sm font-mono font-bold text-foreground focus:outline-none focus:border-gold"
                    />
                  </div>
                </div>

                {/* Botões de ajuste rápido de horário */}
                <div className="flex items-center justify-between gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] font-semibold text-foreground/50 uppercase">Ajuste rápido:</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setNovoAgHoraInicio(obterHorarioAtualFormatado())}
                      className="px-2 py-1 rounded bg-gold/15 hover:bg-gold/25 text-gold border border-gold/30 text-[10px] font-bold transition-colors cursor-pointer"
                    >
                      Agora ({obterHorarioAtualFormatado()})
                    </button>
                    <button
                      type="button"
                      onClick={() => ajustarHorarioNovoAg(-15)}
                      className="px-2 py-1 rounded bg-foreground/5 hover:bg-foreground/10 text-foreground/80 border border-[var(--border-subtle)] text-[10px] font-mono font-semibold transition-colors cursor-pointer"
                    >
                      -15m
                    </button>
                    <button
                      type="button"
                      onClick={() => ajustarHorarioNovoAg(15)}
                      className="px-2 py-1 rounded bg-foreground/5 hover:bg-foreground/10 text-foreground/80 border border-[var(--border-subtle)] text-[10px] font-mono font-semibold transition-colors cursor-pointer"
                    >
                      +15m
                    </button>
                    <button
                      type="button"
                      onClick={() => ajustarHorarioNovoAg(30)}
                      className="px-2 py-1 rounded bg-foreground/5 hover:bg-foreground/10 text-foreground/80 border border-[var(--border-subtle)] text-[10px] font-mono font-semibold transition-colors cursor-pointer"
                    >
                      +30m
                    </button>
                  </div>
                </div>
              </div>

              {/* 4. RECONHECIMENTO AUTOMÁTICO: HORÁRIO LIVRE (NORMAL) VS. ENCAIXE AUTOMÁTICO */}
              {analiseHorarioNovoAg.isEncaixe ? (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/40 space-y-1.5 animate-in fade-in">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <Sparkles size={15} /> ⚡ Encaixe Automático Reconhecido
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                      {novoAgHoraInicio} às {analiseHorarioNovoAg.horaFim}
                    </span>
                  </div>
                  <p className="text-xs text-foreground/80 leading-relaxed">
                    {analiseHorarioNovoAg.clienteNaCadeiraSobreposto ? (
                      <>
                        Você já está com <strong>{getClienteNomeSimples(analiseHorarioNovoAg.clienteNaCadeiraSobreposto.cliente_id)}</strong> na cadeira ({analiseHorarioNovoAg.clienteNaCadeiraSobreposto.hora_inicio} às {analiseHorarioNovoAg.clienteNaCadeiraSobreposto.hora_fim}). Este agendamento será inserido automaticamente como <strong>Encaixe</strong> na sua agenda!
                      </>
                    ) : (
                      <>
                        Horário sobreposto ao atendimento de <strong>{getClienteNomeSimples(analiseHorarioNovoAg.principalConflito?.cliente_id || '')}</strong> ({analiseHorarioNovoAg.principalConflito?.hora_inicio} às {analiseHorarioNovoAg.principalConflito?.hora_fim}). Será adicionado automaticamente como <strong>Encaixe</strong> na agenda!
                      </>
                    )}
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-2 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        Horário Livre na Agenda ({novoAgHoraInicio} às {analiseHorarioNovoAg.horaFim})
                      </p>
                      <p className="text-[11px] text-foreground/60">
                        Será inserido normalmente na sua agenda.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* OPÇÃO RÁPIDA: JÁ COLOCAR NA CADEIRA AGORA */}
              <label className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-subtle)] bg-foreground/[0.02] hover:bg-foreground/[0.04] cursor-pointer transition-colors">
                <div>
                  <span className="text-xs font-bold text-foreground block">Iniciar atendimento na cadeira imediatamente?</span>
                  <span className="text-[11px] text-foreground/50">
                    {novoAgIniciarNaCadeira
                      ? 'A cliente entrará direto em "Na Cadeira Agora" (Em Atendimento).'
                      : 'A cliente ficará em "Próximos Hoje" aguardando você clicar em Puxar.'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={novoAgIniciarNaCadeira}
                  onChange={e => setNovoAgIniciarNaCadeira(e.target.checked)}
                  className="w-4 h-4 accent-gold rounded cursor-pointer shrink-0"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
              <Button variant="outline" onClick={() => setNovoAgModalOpen(false)}>Cancelar</Button>
              <Button
                variant="primary"
                disabled={novoAgLoading || !novoAgClienteId || !novoAgServicoId}
                onClick={handleCriarNovoAgendamento}
                className="bg-gold hover:bg-gold-dim text-white font-bold px-5"
              >
                {novoAgLoading
                  ? 'Salvando...'
                  : analiseHorarioNovoAg.isEncaixe
                    ? '⚡ Agendar como Encaixe'
                    : 'Agendar Cliente'}
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
