'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  DollarSign, Clock, CheckCircle2, AlertTriangle, User2,
  Plus, Edit, Trash2, X, TrendingUp, CreditCard,
  Banknote, Smartphone, RefreshCw, Filter, SlidersHorizontal,
  CalendarDays, Calendar, ChevronLeft, ChevronRight, Info,
  Check, Copy, Printer, Sparkles, Share2, Search, ArrowRight
} from 'lucide-react';
import { SectionTitle } from '@/components/SectionTitle';
import { CardGlass } from '@/components/CardGlass';
import { Button } from '@/components/Button';
import {
  fetchRegrasComissao, salvarRegraComissao, excluirRegraComissao,
  fetchComissoes, fetchParcelasPendentes, pagarParcela, pagarLoteParcelas,
  fetchProfissionais, fetchServicos,
} from '@/lib/supabase-queries';
import type {
  RegraComissao, Comissao, ParcelaComissao, FormaPagamento,
  Profissional, Servico
} from '@/lib/gestao-types';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtDate = (d: string) => {
  if (!d) return '—';
  const clean = d.includes('T') ? d.slice(0, 10) : d;
  const [ano, mes, dia] = clean.split('-');
  if (!ano || !mes || !dia) return d;
  return `${dia}/${mes}/${ano}`;
};

type Aba = 'resumo' | 'fechamento' | 'recebiveis' | 'parcelas' | 'historico' | 'regras' | 'taxas';

const PAGAMENTO_CONFIG: Record<FormaPagamento, { label: string; icon: typeof Banknote; cor: string; badge: string }> = {
  DINHEIRO: { label: 'Dinheiro', icon: Banknote, cor: 'text-emerald-400', badge: 'Imediato' },
  PIX: { label: 'PIX', icon: Smartphone, cor: 'text-blue-400', badge: 'Imediato' },
  DEBITO: { label: 'Débito', icon: CreditCard, cor: 'text-purple-400', badge: 'Imediato' },
  CREDITO: { label: 'Crédito', icon: CreditCard, cor: 'text-amber-400', badge: 'D+30' },
  BOLETO: { label: 'Boleto', icon: Banknote, cor: 'text-gray-400', badge: 'D+3' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = {
    PENDING: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
    PARTIAL: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
    PAID: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
    OVERDUE: 'bg-red-500/15 text-red-400 border border-red-500/20',
  }[status] ?? 'bg-foreground/10 text-foreground/50';
  const label = { PENDING: 'Pendente', PARTIAL: 'Parcial', PAID: 'Pago', OVERDUE: 'Atrasado' }[status] ?? status;
  return <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${cfg}`}>{label}</span>;
}

// Retorna início (segunda) e fim (domingo) da semana de uma data de referência
function getSemanaRange(refDate: Date = new Date()): { inicio: string; fim: string; label: string } {
  const d = new Date(refDate);
  const day = d.getDay(); // 0 dom, 1 seg, ...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const toIso = (dt: Date) => dt.toISOString().split('T')[0];
  const toBr = (dt: Date) => dt.toLocaleDateString('pt-BR');

  return {
    inicio: toIso(monday),
    fim: toIso(sunday),
    label: `${toBr(monday)} a ${toBr(sunday)}`,
  };
}

function getPeriodoPreset(tipo: 'esta_semana' | 'semana_passada' | 'proxima_semana' | 'este_mes' | 'mes_passado') {
  const hoje = new Date();
  if (tipo === 'esta_semana') {
    return getSemanaRange(hoje);
  }
  if (tipo === 'semana_passada') {
    const d = new Date(hoje);
    d.setDate(d.getDate() - 7);
    return getSemanaRange(d);
  }
  if (tipo === 'proxima_semana') {
    const d = new Date(hoje);
    d.setDate(d.getDate() + 7);
    return getSemanaRange(d);
  }
  if (tipo === 'este_mes') {
    const y = hoje.getFullYear();
    const m = hoje.getMonth();
    const pri = new Date(y, m, 1);
    const ult = new Date(y, m + 1, 0);
    const toIso = (dt: Date) => dt.toISOString().split('T')[0];
    const toBr = (dt: Date) => dt.toLocaleDateString('pt-BR');
    return {
      inicio: toIso(pri),
      fim: toIso(ult),
      label: `${toBr(pri)} a ${toBr(ult)}`,
    };
  }
  if (tipo === 'mes_passado') {
    const y = hoje.getFullYear();
    const m = hoje.getMonth() - 1;
    const pri = new Date(y, m, 1);
    const ult = new Date(y, m + 1, 0);
    const toIso = (dt: Date) => dt.toISOString().split('T')[0];
    const toBr = (dt: Date) => dt.toLocaleDateString('pt-BR');
    return {
      inicio: toIso(pri),
      fim: toIso(ult),
      label: `${toBr(pri)} a ${toBr(ult)}`,
    };
  }
  return getSemanaRange(hoje);
}

// Analisador do status de carência D+30 para recebíveis
function getD30Status(item: { due_date: string; payment_method: FormaPagamento; status: string }) {
  if (item.status === 'PAID') {
    return { 
      tipo: 'PAGO', 
      label: 'Quitado / Pago', 
      badge: 'Pago',
      cor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
    };
  }
  const hoje = new Date().toISOString().split('T')[0];
  if (item.payment_method === 'CREDITO') {
    if (item.due_date <= hoje) {
      return { 
        tipo: 'LIBERADO_D30', 
        label: 'Liberado (D+30 Cumprido)', 
        badge: 'Liberado D+30',
        cor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
      };
    }
    const diffMs = new Date(item.due_date + 'T12:00:00').getTime() - new Date(hoje + 'T12:00:00').getTime();
    const diasRestantes = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    return { 
      tipo: 'CARENCIA_D30', 
      label: `Carência D+30 (Faltam ${diasRestantes} dias · ${fmtDate(item.due_date)})`, 
      badge: `D+30 (${diasRestantes}d)`,
      cor: 'text-amber-400 bg-amber-500/10 border-amber-500/20' 
    };
  }
  return { 
    tipo: 'LIBERADO_IMEDIATO', 
    label: 'Liberado Imediato', 
    badge: 'Liberado',
    cor: 'text-blue-400 bg-blue-500/10 border-blue-500/20' 
  };
}

export default function ComissoesPage() {
  const [aba, setAba] = useState<Aba>('fechamento');
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [regras, setRegras] = useState<RegraComissao[]>([]);
  const [comissoes, setComissoes] = useState<Comissao[]>([]);
  const [parcelas, setParcelas] = useState<(ParcelaComissao & { professional_id: string; payment_method?: FormaPagamento })[]>([]);
  const [loading, setLoading] = useState(true);
  const [profFiltro, setProfFiltro] = useState('todos');
  const [pagando, setPagando] = useState<string | null>(null);

  // Estados do Fechamento Semanal de Caixa
  const [semanaOffset, setSemanaOffset] = useState(0); // 0 = atual, -1 = anterior, +1 = proxima
  const [profFiltroFechamento, setProfFiltroFechamento] = useState('todos');
  const [fechandoLote, setFechandoLote] = useState(false);
  const [reciboModalData, setReciboModalData] = useState<any | null>(null);
  const [whatsAppCopiado, setWhatsAppCopiado] = useState(false);

  // Estados dos Recebíveis por Período
  const semanaAtualPadrao = useMemo(() => getSemanaRange(), []);
  const [periodoTipo, setPeriodoTipo] = useState<'esta_semana' | 'semana_passada' | 'proxima_semana' | 'este_mes' | 'mes_passado' | 'custom'>('esta_semana');
  const [dataInicio, setDataInicio] = useState(semanaAtualPadrao.inicio);
  const [dataFim, setDataFim] = useState(semanaAtualPadrao.fim);
  const [profFiltroRecebiveis, setProfFiltroRecebiveis] = useState('todos');
  const [statusFiltroRecebiveis, setStatusFiltroRecebiveis] = useState<'todos' | 'liberados' | 'carencia' | 'pagos'>('todos');
  const [metodoFiltroRecebiveis, setMetodoFiltroRecebiveis] = useState<string>('todos');
  const [filtroBaseData, setFiltroBaseData] = useState<'atendimento' | 'vencimento'>('atendimento');

  // Form regra
  const [showRegra, setShowRegra] = useState(false);
  const [editRegra, setEditRegra] = useState<RegraComissao | null>(null);
  const [formRegra, setFormRegra] = useState({ professional_id: '', service_id: '', commission_pct: 40, notes: '' });
  const [salvandoRegra, setSalvandoRegra] = useState(false);
  const [erroModal, setErroModal] = useState<string | null>(null);

  useEffect(() => {
    carregarDados();
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const tab = p.get('aba') as Aba;
      if (tab && ['resumo', 'fechamento', 'recebiveis', 'parcelas', 'historico', 'regras', 'taxas'].includes(tab)) {
        setAba(tab);
      }
      const prof = p.get('prof');
      if (prof) {
        setProfFiltro(prof);
        setProfFiltroFechamento(prof);
        setProfFiltroRecebiveis(prof);
      }
    }
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    const [profs, svcs, rgs, coms, parcs] = await Promise.all([
      fetchProfissionais(), fetchServicos(), fetchRegrasComissao(),
      fetchComissoes(), fetchParcelasPendentes(),
    ]);
    setProfissionais(profs.filter(p => p.ativo));
    setServicos(svcs.filter(s => s.ativo));
    setRegras(rgs);
    setComissoes(coms);
    setParcelas(parcs as any);
    setLoading(false);
  };

  const getProfNome = (id: string) => profissionais.find(p => p.id === id)?.nome ?? id.slice(0, 8);
  const getProfCategoria = (profId: string) => {
    const p = profissionais.find(pr => pr.id === profId);
    if (!p) return 'Cabelo';
    if (p.categoria) return p.categoria;
    const tags = (p.especialidades || []).join(' ').toLowerCase();
    if (tags.includes('unha') || tags.includes('manicure') || (p.nome || '').toLowerCase().includes('camila')) return 'Unhas';
    return 'Cabelo';
  };
  const getSvcNome = (id?: string | null) => id ? (servicos.find(s => s.id === id)?.nome ?? '—') : '(Todos os serviços)';

  // Intervalo da semana selecionada no Fechamento Semanal
  const semanaAtualRange = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + semanaOffset * 7);
    return getSemanaRange(d);
  }, [semanaOffset]);

  // Lista unificada de todos os recebíveis detalhados
  const todosRecebiveis = useMemo(() => {
    return comissoes.flatMap(c => {
      const prof = profissionais.find(p => p.id === c.professional_id);
      const dataAtendimento = c.created_at.slice(0, 10);
      return (c.parcelas ?? []).map(p => {
        const d30Info = getD30Status({ due_date: p.due_date, payment_method: c.payment_method, status: p.status });
        return {
          id: p.id,
          commission_id: c.id,
          appointment_id: c.appointment_id,
          professional_id: c.professional_id,
          prof_nome: prof?.nome ?? 'Profissional',
          prof_foto: prof?.foto_url ?? null,
          prof_categoria: getProfCategoria(c.professional_id),
          data_atendimento: dataAtendimento,
          due_date: p.due_date,
          payment_method: c.payment_method,
          total_amount: c.total_amount,
          commission_pct: c.commission_pct,
          amount: p.amount,
          installment_number: p.installment_number,
          total_installments: c.installments,
          status: p.status,
          paid_at: p.paid_at,
          d30Info,
        };
      });
    });
  }, [comissoes, profissionais]);

  // Fechamento semanal consolidado por profissional
  const fechamentoSemanalData = useMemo(() => {
    const { inicio: semIni, fim: semFim } = semanaAtualRange;

    return profissionais.map(prof => {
      // 1. Atendimentos realizados na semana
      const comsNaSemana = comissoes.filter(c => {
        const d = c.created_at.slice(0, 10);
        return c.professional_id === prof.id && d >= semIni && d <= semFim;
      });
      const totalBrutoSemana = comsNaSemana.reduce((sum, c) => sum + c.total_amount, 0);

      // 2. Parcelas liberadas para pagamento nesta semana:
      // - Dinheiro, PIX, Débito feitos nesta semana (liberação imediata)
      // - Crédito cujo prazo de 30 dias (due_date) amadureceu e venceu nesta semana!
      const todasParcelasProf = comissoes
        .filter(c => c.professional_id === prof.id)
        .flatMap(c => (c.parcelas ?? []).map(p => ({
          ...p,
          payment_method: c.payment_method,
          appointment_date: c.created_at.slice(0, 10),
          total_amount: c.total_amount,
          commission_pct: c.commission_pct,
        })));

      const parcelasLiberadasNaSemana = todasParcelasProf.filter(p => {
        if (p.payment_method === 'CREDITO') {
          // Vencimento de crédito caiu nesta semana (D+30 concluído)
          return p.due_date >= semIni && p.due_date <= semFim;
        } else {
          // Dinheiro, PIX, Débito: atendimento realizado nesta semana
          return p.appointment_date >= semIni && p.appointment_date <= semFim;
        }
      });

      const totalLiberadoSemana = parcelasLiberadasNaSemana.reduce((sum, p) => sum + p.amount, 0);
      const parcelasPendentes = parcelasLiberadasNaSemana.filter(p => p.status === 'PENDING');
      const parcelasPagas = parcelasLiberadasNaSemana.filter(p => p.status === 'PAID');
      const totalPendenteSemana = parcelasPendentes.reduce((sum, p) => sum + p.amount, 0);
      const totalPagoSemana = parcelasPagas.reduce((sum, p) => sum + p.amount, 0);

      // 3. Comissões em carência D+30 (atendimentos em crédito desta semana que vencerão após o fim da semana)
      const parcelasRetidasD30 = todasParcelasProf.filter(p => {
        return p.payment_method === 'CREDITO' && 
               p.appointment_date >= semIni && 
               p.appointment_date <= semFim && 
               p.due_date > semFim;
      });
      const totalRetidoD30 = parcelasRetidasD30.reduce((sum, p) => sum + p.amount, 0);

      const statusFechamento: 'QUITADO' | 'PENDENTE' | 'SEM_MOVIMENTO' = 
        parcelasLiberadasNaSemana.length === 0 && comsNaSemana.length === 0
          ? 'SEM_MOVIMENTO'
          : parcelasPendentes.length === 0
            ? 'QUITADO'
            : 'PENDENTE';

      return {
        prof,
        totalBrutoSemana,
        qtdAtendimentos: comsNaSemana.length,
        totalLiberadoSemana,
        totalPendenteSemana,
        totalPagoSemana,
        totalRetidoD30,
        parcelasLiberadasNaSemana,
        parcelasPendentes,
        parcelasRetidasD30,
        comsNaSemana,
        statusFechamento,
      };
    });
  }, [semanaAtualRange, profissionais, comissoes]);

  // Filtragem na aba Recebíveis por Período
  const recebiveisFiltrados = useMemo(() => {
    return todosRecebiveis.filter(item => {
      if (profFiltroRecebiveis !== 'todos' && item.professional_id !== profFiltroRecebiveis) {
        return false;
      }
      const dataRef = filtroBaseData === 'atendimento' ? item.data_atendimento : item.due_date;
      if (dataInicio && dataRef < dataInicio) return false;
      if (dataFim && dataRef > dataFim) return false;

      if (metodoFiltroRecebiveis !== 'todos' && item.payment_method !== metodoFiltroRecebiveis) {
        return false;
      }

      if (statusFiltroRecebiveis === 'liberados' && (item.status === 'PAID' || item.d30Info.tipo === 'CARENCIA_D30')) {
        return false;
      }
      if (statusFiltroRecebiveis === 'carencia' && item.d30Info.tipo !== 'CARENCIA_D30') {
        return false;
      }
      if (statusFiltroRecebiveis === 'pagos' && item.status !== 'PAID') {
        return false;
      }

      return true;
    }).sort((a, b) => b.data_atendimento.localeCompare(a.data_atendimento));
  }, [todosRecebiveis, profFiltroRecebiveis, filtroBaseData, dataInicio, dataFim, metodoFiltroRecebiveis, statusFiltroRecebiveis]);

  // Resumo clássico por profissional
  const resumoPorProfissional = useMemo(() => {
    return profissionais.map(prof => {
      const coms = comissoes.filter(c => c.professional_id === prof.id);
      const totalPendente = coms
        .flatMap(c => c.parcelas ?? [])
        .filter(p => p.status === 'PENDING')
        .reduce((s, p) => s + p.amount, 0);
      const mesAtual = new Date().toISOString().slice(0, 7);
      const pagaMes = coms
        .flatMap(c => c.parcelas ?? [])
        .filter(p => p.status === 'PAID' && (p.paid_at ?? '').slice(0, 7) === mesAtual)
        .reduce((s, p) => s + p.amount, 0);
      const regra = regras.find(r => r.professional_id === prof.id && !r.service_id);
      return { prof, totalPendente, pagaMes, pct: regra?.commission_pct ?? null, qtdComs: coms.length };
    });
  }, [profissionais, comissoes, regras]);

  const parcelasFiltradas = useMemo(() => {
    if (profFiltro === 'todos') return parcelas;
    return parcelas.filter(p => p.professional_id === profFiltro);
  }, [parcelas, profFiltro]);

  const comissoesFiltradas = useMemo(() => {
    if (profFiltro === 'todos') return comissoes;
    return comissoes.filter(c => c.professional_id === profFiltro);
  }, [comissoes, profFiltro]);

  const isVencida = (dueDate: string) => new Date(dueDate) < new Date();

  const marcarPago = async (parcelaId: string) => {
    setPagando(parcelaId);
    const res = await pagarParcela(parcelaId);
    if (res.ok) await carregarDados();
    else alert(`Erro: ${res.error}`);
    setPagando(null);
  };

  const handleFecharCaixaProfissional = async (item: typeof fechamentoSemanalData[0]) => {
    const ids = item.parcelasPendentes.map(p => p.id);
    if (ids.length === 0) {
      alert('Não há parcelas pendentes para fechar nesta semana.');
      return;
    }
    if (!confirm(`Confirmar fechamento e pagamento da comissão semanal de ${fmt(item.totalPendenteSemana)} para ${item.prof.nome}?`)) {
      return;
    }
    setFechandoLote(true);
    const res = await pagarLoteParcelas(ids);
    if (res.ok) {
      await carregarDados();
      alert(`Fechamento da semana de ${item.prof.nome} concluído com sucesso! Valor quitado: ${fmt(item.totalPendenteSemana)}.`);
    } else {
      alert(`Erro ao fechar caixa: ${res.error}`);
    }
    setFechandoLote(false);
  };

  const handleFecharTodosCaixasSemana = async () => {
    const todosIdsPendentes = fechamentoSemanalData.flatMap(f => f.parcelasPendentes.map(p => p.id));
    if (todosIdsPendentes.length === 0) {
      alert('Todos os profissionais já estão quitados nesta semana.');
      return;
    }
    const totalGeral = fechamentoSemanalData.reduce((s, f) => s + f.totalPendenteSemana, 0);
    if (!confirm(`Deseja fechar o caixa semanal de TODOS os profissionais e quitar ${fmt(totalGeral)}?`)) {
      return;
    }
    setFechandoLote(true);
    const res = await pagarLoteParcelas(todosIdsPendentes);
    if (res.ok) {
      await carregarDados();
      alert(`Fechamento geral da semana concluído com sucesso!`);
    } else {
      alert(`Erro ao fechar caixa: ${res.error}`);
    }
    setFechandoLote(false);
  };

  const abrirRegra = (r?: RegraComissao, profIdDefault?: string) => {
    setErroModal(null);
    if (r) {
      setEditRegra(r);
      setFormRegra({ professional_id: r.professional_id, service_id: r.service_id ?? '', commission_pct: r.commission_pct, notes: r.notes ?? '' });
    } else {
      setEditRegra(null);
      setFormRegra({ professional_id: profIdDefault || '', service_id: '', commission_pct: 40, notes: '' });
    }
    setShowRegra(true);
  };

  const salvarRegra = async () => {
    setErroModal(null);
    if (!formRegra.professional_id) {
      setErroModal('Selecione um profissional.');
      return;
    }
    if (formRegra.commission_pct <= 0 || formRegra.commission_pct > 100) {
      setErroModal('Percentual inválido. Digite um valor entre 1% e 100%.');
      return;
    }
    setSalvandoRegra(true);
    const payload: Omit<RegraComissao, 'id' | 'created_at'> = {
      professional_id: formRegra.professional_id,
      service_id: formRegra.service_id || null,
      commission_pct: Number(formRegra.commission_pct),
      active: true,
      notes: formRegra.notes || null,
    };
    const res = await salvarRegraComissao(payload, editRegra?.id);
    if (res.ok) {
      await carregarDados();
      setShowRegra(false);
    } else {
      setErroModal(res.error || 'Ocorreu um erro ao salvar a regra.');
    }
    setSalvandoRegra(false);
  };

  const excluirRegra = async (id: string) => {
    if (!confirm('Deseja excluir esta regra de comissão?')) return;
    const res = await excluirRegraComissao(id);
    if (res.ok) {
      await carregarDados();
    } else {
      alert(`Erro: ${res.error}`);
    }
  };

  const copiarWhatsAppRecibo = () => {
    if (!reciboModalData) return;
    const { prof, totalBrutoSemana, totalLiberadoSemana, totalRetidoD30, parcelasLiberadasNaSemana, statusFechamento } = reciboModalData;
    const cat = getProfCategoria(prof.id);
    const texto = `🌟 *STUDIO AGNALDO GOMES — FECHAMENTO SEMANAL* 🌟\n\n` +
      `👤 *Profissional:* ${prof.nome} (${cat})\n` +
      `📅 *Período:* ${semanaAtualRange.label}\n` +
      `-----------------------------------------\n` +
      `💈 *Produção Bruta da Semana:* ${fmt(totalBrutoSemana)}\n` +
      `✅ *Comissão Liberada p/ Repasse:* ${fmt(totalLiberadoSemana)}\n` +
      `⏳ *Carência Cartão (D+30 a Liberar):* ${fmt(totalRetidoD30)}\n` +
      `📌 *Status do Fechamento:* ${statusFechamento === 'QUITADO' ? 'PAGO & FECHADO' : 'PENDENTE DE PAGAMENTO'}\n` +
      `-----------------------------------------\n` +
      `*Atendimentos Liberados na Semana:*\n` +
      parcelasLiberadasNaSemana.map((p: any) => `• ${fmtDate(p.due_date || p.appointment_date)} - ${PAGAMENTO_CONFIG[p.payment_method as FormaPagamento]?.label ?? p.payment_method}: ${fmt(p.amount)} (${p.status === 'PAID' ? 'Pago' : 'Pendente'})`).join('\n') +
      `\n\n_Comissões em cartão de crédito são pagas 30 dias após o recebimento (D+30)._`;

    navigator.clipboard.writeText(texto);
    setWhatsAppCopiado(true);
    setTimeout(() => setWhatsAppCopiado(false), 3000);
  };

  // KPIs globais
  const totalPendente = parcelas.reduce((s, p) => s + p.amount, 0);
  const mesAtual = new Date().toISOString().slice(0, 7);
  const totalPagoMes = comissoes
    .flatMap(c => c.parcelas ?? [])
    .filter(p => p.status === 'PAID' && (p.paid_at ?? '').slice(0, 7) === mesAtual)
    .reduce((s, p) => s + p.amount, 0);
  const vencidas = parcelas.filter(p => isVencida(p.due_date)).length;

  return (
    <div className="py-8">
      <div className="container mx-auto px-6">
        <SectionTitle title="Comissões de Profissionais" subtitle="Fechamento Semanal · Recebíveis D+30 · Repasses Financeiros" align="left" />

        {/* ALERTA DE REGRA DE NEGÓCIO OFICIAL */}
        <div className="mt-6 mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-gold/10 to-transparent border border-amber-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
              <CreditCard size={18} />
            </div>
            <div>
              <p className="font-bold text-foreground text-sm flex items-center gap-2">
                <span>Regra Oficial de Repasse: Cartão de Crédito em D+30</span>
                <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">Regra Salão</span>
              </p>
              <p className="text-foreground/70 mt-0.5 leading-relaxed">
                As comissões de recebimentos em <strong>Cartão de Crédito</strong> são pagas <strong>30 dias após o recebimento</strong>. 
                Atendimentos em <strong>Dinheiro, PIX e Débito</strong> são liberados imediatamente no fechamento semanal da própria semana.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setAba('fechamento')}
              className="px-3 py-1.5 rounded-lg bg-gold text-background font-bold hover:bg-gold-dim transition-colors text-xs"
            >
              Ir para Fechamento Semanal →
            </button>
          </div>
        </div>

        {/* KPIs Globais */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Clock, label: 'A Pagar (Total Geral)', value: fmt(totalPendente), cor: 'text-amber-400' },
            { icon: CheckCircle2, label: 'Pago (Mês Atual)', value: fmt(totalPagoMes), cor: 'text-emerald-400' },
            { icon: AlertTriangle, label: 'Parcelas Vencidas', value: vencidas, cor: vencidas > 0 ? 'text-red-400' : 'text-foreground/40' },
            { icon: User2, label: 'Profissionais Ativos', value: profissionais.length, cor: 'text-gold' },
          ].map((k, i) => (
            <CardGlass key={i} className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-foreground/5 shrink-0">
                <k.icon size={22} className={k.cor} />
              </div>
              <div>
                <p className="text-xs text-foreground/50">{k.label}</p>
                <p className={`text-lg font-bold ${k.cor}`}>{k.value}</p>
              </div>
            </CardGlass>
          ))}
        </div>

        {/* NAVEGAÇÃO DE ABAS PADRONIZADA */}
        <div className="border-b border-[var(--border-subtle)] mb-8">
          <nav className="flex space-x-2 sm:space-x-6 -mb-px overflow-x-auto scrollbar-none" aria-label="Abas de Comissões">
            {[
              { id: 'fechamento', label: 'Fechamento Semanal', icon: CalendarDays, highlight: true },
              { id: 'recebiveis', label: 'Recebíveis por Período', icon: Search },
              { id: 'resumo', label: 'Resumo por Profissional', icon: TrendingUp },
              { id: 'parcelas', label: 'A Pagar', icon: Clock, badge: parcelas.length },
              { id: 'historico', label: 'Histórico', icon: CreditCard, badge: comissoes.length },
              { id: 'regras', label: 'Regras de Comissão', icon: DollarSign, badge: regras.length },
              { id: 'taxas', label: 'Taxas e Maquininhas', icon: Banknote },
            ].map(tabItem => {
              const active = aba === tabItem.id;
              const Icon = tabItem.icon;
              return (
                <button
                  key={tabItem.id}
                  onClick={() => setAba(tabItem.id as Aba)}
                  className={`group inline-flex items-center gap-2 py-3 px-3 sm:px-1 border-b-2 text-sm font-medium whitespace-nowrap transition-all ${
                    active
                      ? 'border-gold text-gold font-semibold'
                      : 'border-transparent text-foreground/50 hover:text-foreground hover:border-foreground/20'
                  }`}
                >
                  <Icon size={16} className={active ? 'text-gold' : 'text-foreground/40 group-hover:text-foreground/70'} />
                  <span>{tabItem.label}</span>
                  {tabItem.highlight && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold uppercase bg-gold/20 text-gold border border-gold/30">
                      Semana
                    </span>
                  )}
                  {tabItem.badge !== undefined && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold transition-colors ${
                      active ? 'bg-gold/15 text-gold' : 'bg-foreground/5 text-foreground/50 group-hover:bg-foreground/10'
                    }`}>
                      {tabItem.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {loading && (
          <div className="text-center py-16 text-foreground/40 flex flex-col items-center gap-3">
            <RefreshCw size={24} className="animate-spin text-gold" />
            <p className="text-sm">Carregando dados financeiros...</p>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            ABA 1: FECHAMENTO SEMANAL DE CAIXA
           ══════════════════════════════════════════════════════════════ */}
        {!loading && aba === 'fechamento' && (
          <div className="space-y-6">
            {/* Seletor da Semana */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 rounded-xl bg-[var(--color-card)] border border-[var(--border-subtle)]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-bold tracking-wider text-gold flex items-center gap-1">
                    <CalendarDays size={14} /> Fechamento de Caixa Semanal
                  </span>
                  {semanaOffset === 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold uppercase">
                      Semana Atual
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold font-serif text-foreground mt-0.5">
                  {semanaAtualRange.label}
                </h3>
              </div>

              {/* Controles de Navegação da Semana */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setSemanaOffset(prev => prev - 1)}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-foreground/70 hover:text-foreground hover:bg-white/5 text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft size={14} /> Semana Anterior
                </button>
                {semanaOffset !== 0 && (
                  <button
                    onClick={() => setSemanaOffset(0)}
                    className="px-3 py-1.5 rounded-lg bg-gold/15 text-gold border border-gold/30 hover:bg-gold hover:text-background text-xs font-bold transition-colors"
                  >
                    Semana Atual
                  </button>
                )}
                <button
                  onClick={() => setSemanaOffset(prev => prev + 1)}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-foreground/70 hover:text-foreground hover:bg-white/5 text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  Próxima Semana <ChevronRight size={14} />
                </button>

                <Button
                  variant="primary"
                  onClick={handleFecharTodosCaixasSemana}
                  disabled={fechandoLote || fechamentoSemanalData.every(f => f.statusFechamento === 'QUITADO' || f.statusFechamento === 'SEM_MOVIMENTO')}
                  className="ml-2 text-xs"
                >
                  <CheckCircle2 size={15} className="mr-1.5" /> Fechar Caixa da Semana (Geral)
                </Button>
              </div>
            </div>

            {/* KPIs da Semana Selecionada */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <CardGlass className="p-4 border-l-4 border-l-blue-400">
                <p className="text-xs text-foreground/50">Faturamento Bruto da Semana</p>
                <p className="text-xl font-bold text-foreground mt-1">
                  {fmt(fechamentoSemanalData.reduce((s, f) => s + f.totalBrutoSemana, 0))}
                </p>
                <p className="text-[11px] text-foreground/50 mt-1">
                  {fechamentoSemanalData.reduce((s, f) => s + f.qtdAtendimentos, 0)} atendimentos realizados
                </p>
              </CardGlass>

              <CardGlass className="p-4 border-l-4 border-l-emerald-400">
                <p className="text-xs text-foreground/50">Comissões Liberadas na Semana</p>
                <p className="text-xl font-bold text-emerald-400 mt-1">
                  {fmt(fechamentoSemanalData.reduce((s, f) => s + f.totalLiberadoSemana, 0))}
                </p>
                <p className="text-[11px] text-emerald-400/80 mt-1">
                  Dinheiro/PIX/Débito + Crédito D+30
                </p>
              </CardGlass>

              <CardGlass className="p-4 border-l-4 border-l-amber-400">
                <p className="text-xs text-foreground/50">Aguardando Prazo Cartão (D+30)</p>
                <p className="text-xl font-bold text-amber-400 mt-1">
                  {fmt(fechamentoSemanalData.reduce((s, f) => s + f.totalRetidoD30, 0))}
                </p>
                <p className="text-[11px] text-amber-400/80 mt-1">
                  Liberado 30 dias após o atendimento
                </p>
              </CardGlass>

              <CardGlass className="p-4 border-l-4 border-l-gold">
                <p className="text-xs text-foreground/50">Pendente de Repasse (Semana)</p>
                <p className="text-xl font-bold text-gold mt-1">
                  {fmt(fechamentoSemanalData.reduce((s, f) => s + f.totalPendenteSemana, 0))}
                </p>
                <p className="text-[11px] text-foreground/50 mt-1">
                  {fechamentoSemanalData.filter(f => f.statusFechamento === 'PENDENTE').length} profissionais a pagar
                </p>
              </CardGlass>
            </div>

            {/* Tabela dos Profissionais no Fechamento */}
            <CardGlass className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-foreground/40 text-xs uppercase tracking-wider border-b border-[var(--border-subtle)]">
                    <th className="py-3 px-4">Profissional</th>
                    <th className="py-3 px-4">Atendimentos</th>
                    <th className="py-3 px-4">Faturamento Bruto</th>
                    <th className="py-3 px-4">Liberado na Semana</th>
                    <th className="py-3 px-4">Carência Cartão (D+30)</th>
                    <th className="py-3 px-4">Status Caixa</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {fechamentoSemanalData.map(item => {
                    const cat = getProfCategoria(item.prof.id);
                    return (
                      <tr key={item.prof.id} className="hover:bg-foreground/5 transition-colors">
                        <td className="py-3.5 px-4 font-semibold">
                          <div className="flex items-center gap-3">
                            {item.prof.foto_url ? (
                              <img src={item.prof.foto_url} alt={item.prof.nome} className="w-9 h-9 rounded-full object-cover border border-[var(--border-subtle)]" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-gold/15 flex items-center justify-center text-gold font-bold">
                                {item.prof.nome.charAt(0)}
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-foreground">{item.prof.nome}</p>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-gold/15 text-gold font-bold">
                                {cat === 'Unhas' ? '💅 Unhas' : '✂️ Cabelo'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-foreground/70 font-mono">
                          {item.qtdAtendimentos} serv.
                        </td>
                        <td className="py-3.5 px-4 font-medium text-foreground">
                          {fmt(item.totalBrutoSemana)}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-emerald-400">
                          {fmt(item.totalLiberadoSemana)}
                          {item.totalPendenteSemana > 0 && (
                            <span className="block text-[10px] text-amber-400 font-normal">
                              ({fmt(item.totalPendenteSemana)} pendente)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-amber-400/90">
                          {fmt(item.totalRetidoD30)}
                          {item.totalRetidoD30 > 0 && (
                            <span className="block text-[10px] text-foreground/40 font-normal">
                              libera em 30 dias
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {item.statusFechamento === 'QUITADO' && (
                            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 size={12} /> Quitado
                            </span>
                          )}
                          {item.statusFechamento === 'PENDENTE' && (
                            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                              <Clock size={12} /> Aberto
                            </span>
                          )}
                          {item.statusFechamento === 'SEM_MOVIMENTO' && (
                            <span className="text-xs px-2.5 py-1 rounded-full text-foreground/40 bg-foreground/5">
                              Sem Movimento
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => setReciboModalData(item)}
                              title="Ver Extrato e Recibo Semanal"
                              className="px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] text-xs text-foreground/70 hover:text-gold hover:border-gold/30 font-semibold transition-colors flex items-center gap-1"
                            >
                              <Printer size={13} /> Extrato
                            </button>

                            {item.statusFechamento === 'PENDENTE' && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleFecharCaixaProfissional(item)}
                                disabled={fechandoLote}
                                className="text-xs"
                              >
                                <Check size={13} className="mr-1" /> Dar Baixa
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardGlass>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            ABA 2: RECEBÍVEIS POR PERÍODO
           ══════════════════════════════════════════════════════════════ */}
        {!loading && aba === 'recebiveis' && (
          <div className="space-y-6">
            {/* Barra de Filtros e Busca por Período */}
            <CardGlass className="p-5 space-y-4">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
                    <Search size={18} className="text-gold" /> Consulta de Recebíveis
                  </h3>
                  <p className="text-xs text-foreground/50">
                    Filtre os recebíveis semanais ou mensais dos profissionais com cálculo exato de carência em cartão de crédito (D+30).
                  </p>
                </div>

                {/* Atalhos Rápidos de Período */}
                <div className="inline-flex p-1 bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl gap-1 overflow-x-auto max-w-full">
                  {[
                    ['esta_semana', 'Esta Semana'],
                    ['semana_passada', 'Semana Passada'],
                    ['proxima_semana', 'Próxima Semana'],
                    ['este_mes', 'Este Mês'],
                    ['mes_passado', 'Mês Passado'],
                  ].map(([tipo, label]) => (
                    <button
                      key={tipo}
                      onClick={() => {
                        setPeriodoTipo(tipo as any);
                        const range = getPeriodoPreset(tipo as any);
                        setDataInicio(range.inicio);
                        setDataFim(range.fim);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                        periodoTipo === tipo 
                          ? 'bg-gold text-background shadow' 
                          : 'text-foreground/70 hover:text-foreground hover:bg-white/5'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filtros em Linha */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-[var(--border-subtle)]">
                <div>
                  <label className="block text-xs text-foreground/50 mb-1">Data Início</label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={e => { setDataInicio(e.target.value); setPeriodoTipo('custom'); }}
                    className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2 text-xs focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="block text-xs text-foreground/50 mb-1">Data Fim</label>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={e => { setDataFim(e.target.value); setPeriodoTipo('custom'); }}
                    className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2 text-xs focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="block text-xs text-foreground/50 mb-1">Profissional</label>
                  <select
                    value={profFiltroRecebiveis}
                    onChange={e => setProfFiltroRecebiveis(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2 text-xs focus:outline-none focus:border-gold"
                  >
                    <option value="todos">Todos os profissionais</option>
                    {profissionais.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nome} ({getProfCategoria(p.id)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-foreground/50 mb-1">Forma Pagamento</label>
                  <select
                    value={metodoFiltroRecebiveis}
                    onChange={e => setMetodoFiltroRecebiveis(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2 text-xs focus:outline-none focus:border-gold"
                  >
                    <option value="todos">Todas as formas</option>
                    <option value="CREDITO">💳 Cartão de Crédito (D+30)</option>
                    <option value="PIX">📱 PIX (Imediato)</option>
                    <option value="DINHEIRO">💵 Dinheiro (Imediato)</option>
                    <option value="DEBITO">💳 Débito (Imediato)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-foreground/50 mb-1">Status de Liberação</label>
                  <select
                    value={statusFiltroRecebiveis}
                    onChange={e => setStatusFiltroRecebiveis(e.target.value as any)}
                    className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2 text-xs focus:outline-none focus:border-gold"
                  >
                    <option value="todos">Todos os status</option>
                    <option value="liberados">🟢 Liberados p/ Pagamento</option>
                    <option value="carencia">🟡 Carência Cartão (D+30)</option>
                    <option value="pagos">🔵 Já Quitados / Pagos</option>
                  </select>
                </div>
              </div>
            </CardGlass>

            {/* Indicadores do Período */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <CardGlass className="p-4 border-l-4 border-l-blue-400">
                <p className="text-xs text-foreground/50">Faturamento no Período</p>
                <p className="text-xl font-bold text-foreground mt-1">
                  {fmt(recebiveisFiltrados.reduce((s, i) => s + (i.installment_number === 1 ? i.total_amount : 0), 0))}
                </p>
                <p className="text-[11px] text-foreground/50 mt-1">
                  {recebiveisFiltrados.length} lançamentos encontrados
                </p>
              </CardGlass>

              <CardGlass className="p-4 border-l-4 border-l-emerald-400">
                <p className="text-xs text-foreground/50">Liberado p/ Pagamento</p>
                <p className="text-xl font-bold text-emerald-400 mt-1">
                  {fmt(recebiveisFiltrados.filter(i => i.status === 'PENDING' && i.d30Info.tipo !== 'CARENCIA_D30').reduce((s, i) => s + i.amount, 0))}
                </p>
                <p className="text-[11px] text-emerald-400/80 mt-1">
                  Disponível para repasse imediato
                </p>
              </CardGlass>

              <CardGlass className="p-4 border-l-4 border-l-amber-400">
                <p className="text-xs text-foreground/50">Carência Cartão (D+30)</p>
                <p className="text-xl font-bold text-amber-400 mt-1">
                  {fmt(recebiveisFiltrados.filter(i => i.d30Info.tipo === 'CARENCIA_D30').reduce((s, i) => s + i.amount, 0))}
                </p>
                <p className="text-[11px] text-amber-400/80 mt-1">
                  Liberado 30 dias após o atendimento
                </p>
              </CardGlass>

              <CardGlass className="p-4 border-l-4 border-l-purple-400">
                <p className="text-xs text-foreground/50">Já Quitado no Período</p>
                <p className="text-xl font-bold text-purple-400 mt-1">
                  {fmt(recebiveisFiltrados.filter(i => i.status === 'PAID').reduce((s, i) => s + i.amount, 0))}
                </p>
                <p className="text-[11px] text-foreground/50 mt-1">
                  Comissões já repassadas
                </p>
              </CardGlass>
            </div>

            {/* Listagem Detalhada de Recebíveis */}
            <CardGlass className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-foreground/40 text-xs uppercase tracking-wider border-b border-[var(--border-subtle)]">
                    <th className="py-3 px-4">Profissional</th>
                    <th className="py-3 px-4">Data Atendimento</th>
                    <th className="py-3 px-4">Forma Pagamento</th>
                    <th className="py-3 px-4">Valor Total</th>
                    <th className="py-3 px-4">Comissão Líquida</th>
                    <th className="py-3 px-4">Liberação (Prazo)</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {recebiveisFiltrados.map(item => {
                    const PagIcon = PAGAMENTO_CONFIG[item.payment_method]?.icon ?? CreditCard;
                    const pagCor = PAGAMENTO_CONFIG[item.payment_method]?.cor ?? 'text-foreground/70';
                    return (
                      <tr key={item.id} className="hover:bg-foreground/5 transition-colors">
                        <td className="py-3.5 px-4 font-semibold">
                          <div className="flex items-center gap-2">
                            <span>{item.prof_nome}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-gold/15 text-gold font-bold">
                              {item.prof_categoria === 'Unhas' ? '💅 Unhas' : '✂️ Cabelo'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-foreground/70 font-mono text-xs">
                          {fmtDate(item.data_atendimento)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                            <PagIcon size={14} className={pagCor} />
                            <span>{PAGAMENTO_CONFIG[item.payment_method]?.label ?? item.payment_method}</span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                              item.payment_method === 'CREDITO' ? 'bg-amber-500/20 text-amber-400' : 'bg-foreground/10 text-foreground/60'
                            }`}>
                              {PAGAMENTO_CONFIG[item.payment_method]?.badge}
                            </span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-foreground/80 font-medium">
                          {fmt(item.total_amount)}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-gold">
                          {fmt(item.amount)}
                          <span className="text-[10px] text-foreground/40 font-normal ml-1">
                            ({item.commission_pct}%)
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold border ${item.d30Info.cor}`}>
                            {item.d30Info.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {item.status === 'PENDING' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => marcarPago(item.id)}
                              disabled={pagando === item.id}
                              className="text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 text-xs"
                            >
                              <CheckCircle2 size={13} className="mr-1" />
                              {pagando === item.id ? 'Baixando...' : 'Pagar'}
                            </Button>
                          )}
                          {item.status === 'PAID' && (
                            <span className="text-xs text-emerald-400 font-semibold">
                              ✓ Quitado
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {recebiveisFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-foreground/40">
                        <Calendar size={36} className="mx-auto mb-2 text-gold opacity-40" />
                        <p className="font-semibold text-foreground/70">Nenhum recebível encontrado no período selecionado.</p>
                        <p className="text-xs text-foreground/40 mt-1">Tente ajustar as datas inicial e final ou mudar o filtro de profissional.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardGlass>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            ABA 3: RESUMO POR PROFISSIONAL
           ══════════════════════════════════════════════════════════════ */}
        {!loading && aba === 'resumo' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold">Visão Consolidada por Profissional</h3>
                <p className="text-xs text-foreground/50">Valores a repassar e porcentagem de comissão ativa de cada membro da equipe.</p>
              </div>
              <Button variant="primary" onClick={() => abrirRegra()}>
                <Plus size={16} className="mr-1.5" /> Nova Regra de Comissão
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {resumoPorProfissional.map(({ prof, totalPendente, pagaMes, pct }) => {
                const cat = getProfCategoria(prof.id);
                return (
                  <CardGlass key={prof.id} className="p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          {prof.foto_url ? (
                            <img src={prof.foto_url} alt={prof.nome} className="w-11 h-11 rounded-full object-cover border border-[var(--border-subtle)]" />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-gold/15 flex items-center justify-center border border-gold/20">
                              <User2 size={20} className="text-gold" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-base">{prof.nome}</p>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-gold/15 text-gold font-bold">
                              {cat === 'Unhas' ? '💅 Unhas' : '✂️ Cabelo'}
                            </span>
                          </div>
                        </div>

                        {/* Percentual badge */}
                        {pct != null ? (
                          <button
                            onClick={() => {
                              const r = regras.find(reg => reg.professional_id === prof.id && !reg.service_id);
                              abrirRegra(r);
                            }}
                            title="Clique para editar a comissão"
                            className="px-2.5 py-1 rounded-lg bg-gold/10 text-gold border border-gold/30 hover:bg-gold/20 text-xs font-bold transition-colors flex items-center gap-1"
                          >
                            {pct}% <Edit size={11} />
                          </button>
                        ) : (
                          <button
                            onClick={() => abrirRegra(undefined, prof.id)}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 text-xs font-medium transition-colors"
                          >
                            + Definir %
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="p-3 bg-amber-500/8 rounded-lg border border-amber-500/15">
                          <p className="text-xs text-foreground/50 mb-0.5">A Pagar Total</p>
                          <p className="font-bold text-amber-400 text-base">{fmt(totalPendente)}</p>
                        </div>
                        <div className="p-3 bg-emerald-500/8 rounded-lg border border-emerald-500/15">
                          <p className="text-xs text-foreground/50 mb-0.5">Pago (Mês Atual)</p>
                          <p className="font-bold text-emerald-400 text-base">{fmt(pagaMes)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => { setProfFiltroFechamento(prof.id); setAba('fechamento'); }}
                        className="flex-1 py-2 text-xs text-gold border border-gold/30 rounded-lg hover:bg-gold/10 transition-colors font-medium flex items-center justify-center gap-1"
                      >
                        Fechamento Semanal →
                      </button>
                      <button
                        onClick={() => { setProfFiltroRecebiveis(prof.id); setAba('recebiveis'); }}
                        className="py-2 px-3 text-xs border border-[var(--border-subtle)] rounded-lg hover:bg-white/5 transition-colors font-medium"
                        title="Consultar recebíveis"
                      >
                        Recebíveis
                      </button>
                    </div>
                  </CardGlass>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            ABA 4: PARCELAS A PAGAR
           ══════════════════════════════════════════════════════════════ */}
        {!loading && aba === 'parcelas' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold">Parcelas Pendentes de Repasse</h3>
                <p className="text-xs text-foreground/50">Confirme o pagamento de cada parcela à medida que os valores forem repassados aos profissionais.</p>
              </div>

              {/* Filtro contextual */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs text-foreground/50">
                  <Filter size={14} /> Profissional:
                </div>
                <select
                  value={profFiltro}
                  onChange={e => setProfFiltro(e.target.value)}
                  className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-gold"
                >
                  <option value="todos">Todos os profissionais</option>
                  {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
                <button onClick={carregarDados} title="Atualizar" className="p-1.5 rounded-lg border border-[var(--border-subtle)] text-foreground/60 hover:text-gold transition-colors">
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            <CardGlass className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-foreground/40 text-xs uppercase tracking-wider border-b border-[var(--border-subtle)]">
                    <th className="py-3 px-4">Profissional</th>
                    <th className="py-3 px-4">Vencimento</th>
                    <th className="py-3 px-4">Parcela</th>
                    <th className="py-3 px-4">Valor da Comissão</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {parcelasFiltradas.map(p => {
                    const vencida = isVencida(p.due_date);
                    return (
                      <tr key={p.id} className={`border-b border-[var(--border-subtle)] last:border-0 hover:bg-foreground/5 transition-colors ${vencida ? 'bg-red-500/5' : ''}`}>
                        <td className="py-3 px-4 font-semibold">{getProfNome(p.professional_id)}</td>
                        <td className="py-3 px-4">
                          <span className={vencida ? 'text-red-400 font-semibold' : 'text-foreground/70'}>
                            {fmtDate(p.due_date)}
                            {vencida && <AlertTriangle size={13} className="inline ml-1.5 text-red-400" />}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-foreground/60">Parcela {p.installment_number}</td>
                        <td className="py-3 px-4 font-bold text-gold">{fmt(p.amount)}</td>
                        <td className="py-3 px-4">
                          <StatusBadge status={vencida && p.status === 'PENDING' ? 'OVERDUE' : p.status} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => marcarPago(p.id)}
                            disabled={pagando === p.id}
                            className="text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                          >
                            <CheckCircle2 size={13} className="mr-1" />
                            {pagando === p.id ? 'Baixando...' : 'Marcar como Pago'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {parcelasFiltradas.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-foreground/40">
                        <CheckCircle2 size={40} className="mx-auto mb-2 text-emerald-400 opacity-60" />
                        <p className="font-medium text-foreground/70">Nenhuma parcela pendente!</p>
                        <p className="text-xs text-foreground/40 mt-1">Todos os repasses de comissão deste filtro estão quitados.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardGlass>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            ABA 5: HISTÓRICO
           ══════════════════════════════════════════════════════════════ */}
        {!loading && aba === 'historico' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold">Histórico de Atendimentos e Repasses</h3>
                <p className="text-xs text-foreground/50">Registro completo de comissões geradas pelos atendimentos da agenda.</p>
              </div>

              {/* Filtro contextual */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs text-foreground/50">
                  <Filter size={14} /> Profissional:
                </div>
                <select
                  value={profFiltro}
                  onChange={e => setProfFiltro(e.target.value)}
                  className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-gold"
                >
                  <option value="todos">Todos os profissionais</option>
                  {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
                <button onClick={carregarDados} title="Atualizar" className="p-1.5 rounded-lg border border-[var(--border-subtle)] text-foreground/60 hover:text-gold transition-colors">
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {comissoesFiltradas.length === 0 ? (
                <CardGlass className="text-center py-12 text-foreground/40">
                  <CreditCard size={36} className="mx-auto mb-2 opacity-30 text-gold" />
                  <p>Nenhuma comissão registrada até o momento.</p>
                </CardGlass>
              ) : comissoesFiltradas.map(c => {
                const PagIcon = PAGAMENTO_CONFIG[c.payment_method]?.icon ?? CreditCard;
                const pagCor = PAGAMENTO_CONFIG[c.payment_method]?.cor ?? 'text-foreground/60';
                return (
                  <CardGlass key={c.id} className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gold/15 flex items-center justify-center shrink-0 border border-gold/20">
                          <User2 size={18} className="text-gold" />
                        </div>
                        <div>
                          <p className="font-semibold">{getProfNome(c.professional_id)}</p>
                          <p className="text-xs text-foreground/50 flex items-center gap-1.5 mt-0.5">
                            <span>{new Date(c.created_at).toLocaleDateString('pt-BR')}</span>
                            <span>•</span>
                            <PagIcon size={12} className={pagCor} />
                            <span>{PAGAMENTO_CONFIG[c.payment_method]?.label ?? c.payment_method}</span>
                            {c.payment_method === 'CREDITO' && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                                D+30
                              </span>
                            )}
                            {c.installments > 1 && <span>({c.installments}x)</span>}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-5">
                        <div className="text-right">
                          <p className="text-xs text-foreground/50">Valor Atendimento</p>
                          <p className="font-medium text-sm">{fmt(c.total_amount)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-foreground/50">{c.commission_pct}% comissão</p>
                          <p className="font-bold text-gold text-base">{fmt(c.total_commission)}</p>
                        </div>
                        <StatusBadge status={c.status} />
                      </div>
                    </div>

                    {/* Parcelas fracionadas */}
                    {c.parcelas && c.parcelas.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex flex-wrap gap-2">
                        {c.parcelas.map(p => (
                          <div
                            key={p.id}
                            className={`text-xs px-2.5 py-1 rounded-md border font-mono ${
                              p.status === 'PAID'
                                ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5'
                                : 'border-amber-500/30 text-amber-400 bg-amber-500/5'
                            }`}
                          >
                            P{p.installment_number}/{c.parcelas!.length}: {fmt(p.amount)} · Venc: {fmtDate(p.due_date)}
                            {p.status === 'PAID' && ' ✓'}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardGlass>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            ABA 6: REGRAS DE COMISSÃO
           ══════════════════════════════════════════════════════════════ */}
        {!loading && aba === 'regras' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold">Regras e Percentuais de Repasse</h3>
                <p className="text-xs text-foreground/50">
                  Configure o percentual padrão de cada profissional ou regras específicas por serviço.
                </p>
              </div>
              <Button variant="primary" onClick={() => abrirRegra()}>
                <Plus size={16} className="mr-1.5" /> Nova Regra
              </Button>
            </div>

            {/* Regras gerais */}
            <div className="mb-8">
              <h4 className="text-xs font-semibold text-foreground/50 mb-3 uppercase tracking-wider">
                Regras Gerais por Profissional (Válidas para todos os serviços)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {regras.filter(r => !r.service_id).map(r => (
                  <CardGlass key={r.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gold/15 flex items-center justify-center border border-gold/20">
                        <User2 size={16} className="text-gold" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{getProfNome(r.professional_id)}</p>
                        <p className="text-xs text-foreground/50">Regra geral (todos os serviços)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-gold">{r.commission_pct}%</span>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => abrirRegra(r)}
                          title="Editar regra"
                          className="p-1 rounded text-foreground/50 hover:text-gold transition-colors"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => excluirRegra(r.id)}
                          title="Excluir regra"
                          className="p-1 rounded text-foreground/50 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </CardGlass>
                ))}

                {regras.filter(r => !r.service_id).length === 0 && (
                  <div className="col-span-3 text-center py-8 text-foreground/40 border border-dashed border-[var(--border-subtle)] rounded-xl">
                    <SlidersHorizontal size={28} className="mx-auto mb-2 opacity-30 text-gold" />
                    <p className="text-sm">Nenhuma regra geral configurada ainda.</p>
                    <p className="text-xs text-foreground/40 mt-0.5">Clique em "Nova Regra" acima para definir a comissão dos profissionais.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Regras específicas por serviço */}
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-3">
                <h4 className="text-xs font-semibold text-foreground/50 uppercase tracking-wider">
                  Regras Específicas por Serviço (Prioridade sobre a regra geral)
                </h4>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-xs text-foreground/50">
                    <Filter size={14} /> Filtrar Profissional:
                  </div>
                  <select
                    value={profFiltro}
                    onChange={e => setProfFiltro(e.target.value)}
                    className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-gold"
                  >
                    <option value="todos">Todos os profissionais</option>
                    {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
              </div>

              {regras.filter(r => !!r.service_id && (profFiltro === 'todos' || r.professional_id === profFiltro)).length > 0 ? (
                <CardGlass className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-foreground/40 text-xs uppercase tracking-wider border-b border-[var(--border-subtle)]">
                        {profFiltro === 'todos' && <th className="py-3 px-4">Profissional</th>}
                        <th className="py-3 px-4">Serviço Específico</th>
                        <th className="py-3 px-4">Comissão Aplicada</th>
                        <th className="py-3 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {regras.filter(r => !!r.service_id && (profFiltro === 'todos' || r.professional_id === profFiltro)).map(r => (
                        <tr key={r.id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-foreground/5">
                          {profFiltro === 'todos' && <td className="py-3 px-4 font-semibold">{getProfNome(r.professional_id)}</td>}
                          <td className="py-3 px-4 text-foreground/80">{getSvcNome(r.service_id)}</td>
                          <td className="py-3 px-4 font-bold text-gold text-base">{r.commission_pct}%</td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex gap-1">
                              <button
                                onClick={() => abrirRegra(r)}
                                title="Editar regra"
                                className="p-1.5 rounded hover:bg-foreground/5 text-foreground/60 hover:text-gold"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => excluirRegra(r.id)}
                                title="Excluir regra"
                                className="p-1.5 rounded hover:bg-red-500/10 text-foreground/60 hover:text-red-400"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardGlass>
              ) : (
                <div className="text-center py-6 text-foreground/40 text-xs border border-dashed border-[var(--border-subtle)] rounded-xl">
                  Nenhuma regra específica por serviço cadastrada. Quando cadastrada, ela prevalece sobre a regra geral.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            ABA 7: TAXAS E MAQUININHAS
           ══════════════════════════════════════════════════════════════ */}
        {!loading && aba === 'taxas' && (
          <div>
            <div className="flex flex-col justify-between items-start mb-6">
              <h3 className="text-lg font-bold">Taxas de Pagamento e Maquininhas</h3>
              <p className="text-xs text-foreground/50">
                Configure as taxas cobradas pelos meios de pagamento (cartão de crédito, débito, pix).
                Isso permite descontar a taxa da operadora ANTES de calcular a comissão do profissional,
                garantindo que o salão não pague a comissão sobre um valor que ficou com a maquininha.
              </p>
            </div>

            <CardGlass className="p-12 text-center text-foreground/40 border border-dashed border-[var(--border-subtle)] rounded-xl">
              <Banknote size={40} className="mx-auto mb-3 opacity-30 text-gold" />
              <h4 className="text-lg font-semibold text-foreground/70 mb-2">Configuração de Taxas e Split de Pagamentos</h4>
              <p className="max-w-md mx-auto text-sm">
                As taxas das operadoras (ex: Débito 1,99%, Crédito à vista 3,19%, Crédito 2x-6x 4,99%) são aplicadas no cálculo das comissões com abatimento do valor bruto antes da partilha com o profissional.
              </p>
            </CardGlass>
          </div>
        )}
      </div>

      {/* MODAL: RECIBO / EXTRATO DE FECHAMENTO SEMANAL */}
      {reciboModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 print:p-0">
          <CardGlass className="w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 animate-in fade-in zoom-in-95 border border-gold/40 shadow-2xl print:border-none print:shadow-none print:bg-white print:text-black">
            <div className="flex justify-between items-start mb-6 border-b border-[var(--border-subtle)] pb-4 print:border-black/20">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-gold print:text-black">
                  Studio Agnaldo Gomes • Gestão Financeira
                </span>
                <h3 className="text-2xl font-bold font-serif text-foreground print:text-black">
                  Extrato de Fechamento Semanal
                </h3>
                <p className="text-xs text-foreground/60 print:text-black/60 mt-0.5">
                  Período: <strong>{semanaAtualRange.label}</strong> • Emissão: {new Date().toLocaleDateString('pt-BR')}
                </p>
              </div>
              <button 
                onClick={() => setReciboModalData(null)} 
                className="text-foreground/50 hover:text-foreground print:hidden p-1 rounded-lg"
              >
                <X size={22} />
              </button>
            </div>

            {/* Informações do Profissional */}
            <div className="p-4 rounded-xl bg-gold/5 border border-gold/20 mb-6 flex items-center justify-between print:border-black/20 print:bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gold/20 text-gold font-bold text-lg flex items-center justify-center border border-gold/30 print:bg-gray-200 print:text-black">
                  {reciboModalData.prof.nome.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-lg text-foreground print:text-black leading-tight">
                    {reciboModalData.prof.nome}
                  </h4>
                  <p className="text-xs text-foreground/60 print:text-black/60">
                    Categoria: <strong>{getProfCategoria(reciboModalData.prof.id) === 'Unhas' ? '💅 Unhas' : '✂️ Cabelo'}</strong>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${
                  reciboModalData.statusFechamento === 'QUITADO' 
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 print:bg-emerald-100 print:text-emerald-800' 
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/20 print:bg-amber-100 print:text-amber-800'
                }`}>
                  {reciboModalData.statusFechamento === 'QUITADO' ? '✅ Quitado' : '⏳ Em Aberto'}
                </span>
              </div>
            </div>

            {/* Totais do Recibo */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="p-3 rounded-lg bg-[var(--background)] border border-[var(--border-subtle)] text-center print:border-black/20">
                <p className="text-[11px] text-foreground/50 print:text-black/60">Produção Bruta</p>
                <p className="text-base font-bold text-foreground print:text-black mt-0.5">
                  {fmt(reciboModalData.totalBrutoSemana)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-center print:border-black/20 print:bg-emerald-50">
                <p className="text-[11px] text-emerald-400 print:text-emerald-800 font-bold">Comissão Liberada</p>
                <p className="text-base font-bold text-emerald-400 print:text-emerald-900 mt-0.5">
                  {fmt(reciboModalData.totalLiberadoSemana)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-center print:border-black/20 print:bg-amber-50">
                <p className="text-[11px] text-amber-400 print:text-amber-800 font-bold">Carência D+30 (Futuro)</p>
                <p className="text-base font-bold text-amber-400 print:text-amber-900 mt-0.5">
                  {fmt(reciboModalData.totalRetidoD30)}
                </p>
              </div>
            </div>

            {/* Tabela dos Lançamentos Liberados Nesta Semana */}
            <div className="mb-6">
              <h5 className="text-xs font-bold uppercase tracking-wider text-foreground/70 print:text-black mb-2 flex items-center justify-between">
                <span>Comissões Liberadas Para Pagamento Nesta Semana</span>
                <span className="text-[11px] font-normal text-gold print:text-black">
                  {reciboModalData.parcelasLiberadasNaSemana.length} lançamentos
                </span>
              </h5>

              {reciboModalData.parcelasLiberadasNaSemana.length > 0 ? (
                <div className="border border-[var(--border-subtle)] rounded-lg overflow-hidden text-xs print:border-black/20">
                  <table className="w-full">
                    <thead className="bg-foreground/5 text-foreground/60 print:bg-gray-100 print:text-black">
                      <tr>
                        <th className="py-2 px-3 text-left">Data</th>
                        <th className="py-2 px-3 text-left">Forma</th>
                        <th className="py-2 px-3 text-right">Comissão</th>
                        <th className="py-2 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)] print:divide-black/10">
                      {reciboModalData.parcelasLiberadasNaSemana.map((p: any) => (
                        <tr key={p.id} className="hover:bg-foreground/5">
                          <td className="py-2 px-3 font-mono">{fmtDate(p.due_date || p.appointment_date)}</td>
                          <td className="py-2 px-3">
                            <span className="font-semibold">{PAGAMENTO_CONFIG[p.payment_method as FormaPagamento]?.label ?? p.payment_method}</span>
                            {p.payment_method === 'CREDITO' && <span className="ml-1 text-[10px] text-amber-400 font-bold">(D+30)</span>}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-gold print:text-black">
                            {fmt(p.amount)}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.status === 'PAID' ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'
                            }`}>
                              {p.status === 'PAID' ? 'Pago' : 'Pendente'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-foreground/40 border border-dashed border-[var(--border-subtle)] rounded-lg">
                  Nenhum repasse liberado nesta semana.
                </div>
              )}
            </div>

            {/* Lançamentos em Carência D+30 (Futuros) */}
            {reciboModalData.parcelasRetidasD30.length > 0 && (
              <div className="mb-6">
                <h5 className="text-xs font-bold uppercase tracking-wider text-amber-400 print:text-black mb-2 flex items-center justify-between">
                  <span>Vendas em Cartão D+30 (Aguardando Prazo de 30 Dias)</span>
                  <span className="text-[11px] font-normal text-amber-300 print:text-black font-mono">
                    Total: {fmt(reciboModalData.totalRetidoD30)}
                  </span>
                </h5>
                <div className="border border-amber-500/20 rounded-lg overflow-hidden text-xs print:border-black/20">
                  <table className="w-full">
                    <thead className="bg-amber-500/10 text-amber-300 print:bg-gray-100 print:text-black">
                      <tr>
                        <th className="py-2 px-3 text-left">Data Atendimento</th>
                        <th className="py-2 px-3 text-left">Previsão Liberação</th>
                        <th className="py-2 px-3 text-right">Valor Comissão</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {reciboModalData.parcelasRetidasD30.map((p: any) => (
                        <tr key={p.id}>
                          <td className="py-2 px-3 font-mono">{fmtDate(p.appointment_date)}</td>
                          <td className="py-2 px-3 text-amber-400 font-semibold">{fmtDate(p.due_date)} (D+30)</td>
                          <td className="py-2 px-3 text-right font-bold text-foreground/80">{fmt(p.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Rodapé e Ações do Modal */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-[var(--border-subtle)] print:hidden">
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copiarWhatsAppRecibo}
                  className="flex-1 sm:flex-none text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 text-xs"
                >
                  {whatsAppCopiado ? <Check size={14} className="mr-1.5" /> : <Share2 size={14} className="mr-1.5" />}
                  {whatsAppCopiado ? 'Copiado para o WhatsApp!' : 'Copiar p/ WhatsApp'}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="flex-1 sm:flex-none text-xs"
                >
                  <Printer size={14} className="mr-1.5" /> Imprimir / PDF
                </Button>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                {reciboModalData.statusFechamento === 'PENDENTE' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      handleFecharCaixaProfissional(reciboModalData);
                      setReciboModalData(null);
                    }}
                    className="flex-1 sm:flex-none text-xs"
                  >
                    <CheckCircle2 size={14} className="mr-1.5" /> Dar Baixa e Quitar Semana
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReciboModalData(null)}
                  className="flex-1 sm:flex-none text-xs"
                >
                  Fechar
                </Button>
              </div>
            </div>
          </CardGlass>
        </div>
      )}

      {/* MODAL: Regra de Comissão */}
      {showRegra && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <CardGlass className="w-full max-w-md p-6 animate-in fade-in zoom-in-95 border border-gold/30 shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold font-serif">{editRegra ? 'Editar Regra' : 'Nova Regra de Comissão'}</h3>
              <button onClick={() => setShowRegra(false)} className="text-foreground/50 hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            {erroModal && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs leading-relaxed">
                <strong>Atenção:</strong> {erroModal}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-foreground/60 mb-1">Profissional *</label>
                <select
                  value={formRegra.professional_id}
                  onChange={e => setFormRegra(f => ({ ...f, professional_id: e.target.value }))}
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm focus:outline-none focus:border-gold"
                >
                  <option value="">Selecione o profissional...</option>
                  {profissionais.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nome} ({getProfCategoria(p.id)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-foreground/60 mb-1">
                  Serviço <span className="text-foreground/40">(Em branco = regra geral para todos os serviços)</span>
                </label>
                <select
                  value={formRegra.service_id}
                  onChange={e => setFormRegra(f => ({ ...f, service_id: e.target.value }))}
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm focus:outline-none focus:border-gold"
                >
                  <option value="">— Todos os serviços (Regra Geral) —</option>
                  {servicos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-foreground/60 mb-1">Percentual de Comissão (%) *</label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    step={0.5}
                    value={formRegra.commission_pct}
                    onChange={e => setFormRegra(f => ({ ...f, commission_pct: Number(e.target.value) }))}
                    className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 pr-8 text-sm focus:outline-none focus:border-gold"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/50 font-bold">%</span>
                </div>
                {formRegra.commission_pct > 0 && (
                  <p className="text-xs text-foreground/50 mt-1">
                    Ex: para um serviço de R$ 200 → comissão de {fmt(200 * formRegra.commission_pct / 100)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs text-foreground/60 mb-1">Observação interna</label>
                <input
                  value={formRegra.notes}
                  onChange={e => setFormRegra(f => ({ ...f, notes: e.target.value }))}
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm focus:outline-none focus:border-gold"
                  placeholder="Ex: Acordo 2026, comissão especial, etc."
                />
              </div>
            </div>

            <div className="p-3 bg-gold/5 border border-gold/20 rounded-lg mt-4 text-xs text-foreground/70 leading-relaxed">
              <strong>Regra de Parcelamento & Cartão:</strong> Vendas em Cartão de Crédito são disponibilizadas 30 dias após o atendimento (D+30). Vendas em PIX, Dinheiro e Débito geram liberação imediata no fechamento semanal corrente.
            </div>

            <div className="flex gap-3 mt-5">
              <Button variant="ghost" className="flex-1" onClick={() => setShowRegra(false)}>
                Cancelar
              </Button>
              <Button variant="primary" className="flex-1" onClick={salvarRegra} disabled={salvandoRegra}>
                {salvandoRegra ? 'Salvando...' : editRegra ? 'Salvar Alterações' : 'Criar Regra'}
              </Button>
            </div>
          </CardGlass>
        </div>
      )}
    </div>
  );
}
