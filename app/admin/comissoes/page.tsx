'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  DollarSign, Clock, CheckCircle2, AlertTriangle, User2,
  Plus, Edit, Trash2, X, TrendingUp, CreditCard,
  Banknote, Smartphone, RefreshCw, Filter, SlidersHorizontal
} from 'lucide-react';
import { SectionTitle } from '@/components/SectionTitle';
import { CardGlass } from '@/components/CardGlass';
import { Button } from '@/components/Button';
import {
  fetchRegrasComissao, salvarRegraComissao, excluirRegraComissao,
  fetchComissoes, fetchParcelasPendentes, pagarParcela,
  fetchProfissionais, fetchServicos,
} from '@/lib/supabase-queries';
import type {
  RegraComissao, Comissao, ParcelaComissao, FormaPagamento,
  Profissional, Servico
} from '@/lib/gestao-types';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR');

type Aba = 'resumo' | 'parcelas' | 'historico' | 'regras' | 'taxas';

const PAGAMENTO_CONFIG: Record<FormaPagamento, { label: string; icon: typeof Banknote; cor: string }> = {
  DINHEIRO: { label: 'Dinheiro', icon: Banknote, cor: 'text-emerald-400' },
  PIX: { label: 'PIX', icon: Smartphone, cor: 'text-blue-400' },
  DEBITO: { label: 'Débito', icon: CreditCard, cor: 'text-purple-400' },
  CREDITO: { label: 'Crédito', icon: CreditCard, cor: 'text-amber-400' },
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

export default function ComissoesPage() {
  const [aba, setAba] = useState<Aba>('resumo');
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [regras, setRegras] = useState<RegraComissao[]>([]);
  const [comissoes, setComissoes] = useState<Comissao[]>([]);
  const [parcelas, setParcelas] = useState<(ParcelaComissao & { professional_id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [profFiltro, setProfFiltro] = useState('todos');
  const [pagando, setPagando] = useState<string | null>(null);

  // Form regra
  const [showRegra, setShowRegra] = useState(false);
  const [editRegra, setEditRegra] = useState<RegraComissao | null>(null);
  const [formRegra, setFormRegra] = useState({ professional_id: '', service_id: '', commission_pct: 40, notes: '' });
  const [salvandoRegra, setSalvandoRegra] = useState(false);
  const [erroModal, setErroModal] = useState<string | null>(null);

  useEffect(() => { carregarDados(); }, []);

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
  const getSvcNome = (id?: string | null) => id ? (servicos.find(s => s.id === id)?.nome ?? '—') : '(Todos os serviços)';

  // Resumo por profissional
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
        <SectionTitle title="Comissões de Profissionais" subtitle="Regras · Parcelas · Pagamentos" align="left" />

        {/* KPIs Globais */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 mb-8">
          {[
            { icon: Clock, label: 'A Pagar (Total)', value: fmt(totalPendente), cor: 'text-amber-400' },
            { icon: CheckCircle2, label: 'Pago (Mês Atual)', value: fmt(totalPagoMes), cor: 'text-emerald-400' },
            { icon: AlertTriangle, label: 'Parcelas Vencidas', value: vencidas, cor: vencidas > 0 ? 'text-red-400' : 'text-foreground/40' },
            { icon: User2, label: 'Regras Definidas', value: regras.length, cor: 'text-gold' },
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
          <nav className="flex space-x-2 sm:space-x-8 -mb-px overflow-x-auto scrollbar-none" aria-label="Abas de Comissões">
            {[
              { id: 'resumo', label: 'Resumo Geral', icon: TrendingUp },
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
            ABA 1: RESUMO
           ══════════════════════════════════════════════════════════════ */}
        {!loading && aba === 'resumo' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold">Visão por Profissional</h3>
                <p className="text-xs text-foreground/50">Valores a repassar e porcentagem de comissão ativa de cada membro da equipe.</p>
              </div>
              <Button variant="primary" onClick={() => abrirRegra()}>
                <Plus size={16} className="mr-1.5" /> Nova Regra de Comissão
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {resumoPorProfissional.map(({ prof, totalPendente, pagaMes, pct }) => (
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
                          <p className="text-xs text-foreground/50 truncate max-w-[150px]">
                            {prof.especialidades?.join(', ') || 'Profissional'}
                          </p>
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
                        <p className="text-xs text-foreground/50 mb-0.5">A Pagar</p>
                        <p className="font-bold text-amber-400 text-base">{fmt(totalPendente)}</p>
                      </div>
                      <div className="p-3 bg-emerald-500/8 rounded-lg border border-emerald-500/15">
                        <p className="text-xs text-foreground/50 mb-0.5">Pago (mês)</p>
                        <p className="font-bold text-emerald-400 text-base">{fmt(pagaMes)}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    {totalPendente > 0 ? (
                      <button
                        onClick={() => { setProfFiltro(prof.id); setAba('parcelas'); }}
                        className="w-full py-2 text-xs text-gold border border-gold/30 rounded-lg hover:bg-gold/10 transition-colors font-medium flex items-center justify-center gap-1"
                      >
                        Ver {parcelas.filter(p => p.professional_id === prof.id && p.status === 'PENDING').length} parcelas pendentes →
                      </button>
                    ) : (
                      <div className="text-center py-2 text-xs text-foreground/40">
                        Nenhum repasse pendente
                      </div>
                    )}
                  </div>
                </CardGlass>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            ABA 2: PARCELAS A PAGAR
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
            ABA 3: HISTÓRICO
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
                    {c.parcelas && c.parcelas.length > 1 && (
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
            ABA 4: REGRAS DE COMISSÃO
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
                
                {/* Filtro contextual */}
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
            ABA 5: TAXAS E MAQUININHAS
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
              <h4 className="text-lg font-semibold text-foreground/70 mb-2">Configuração de Taxas</h4>
              <p className="max-w-md mx-auto text-sm">
                Estamos implementando o painel para você cadastrar cada bandeira de cartão e suas taxas. 
                Isso permitirá que o sistema calcule automaticamente o desconto da maquininha no momento do fechamento.
              </p>
            </CardGlass>
          </div>
        )}
      </div>

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
                  {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
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
                  placeholder="Ex: Acordo verbal 2026, comissão especial, etc."
                />
              </div>
            </div>

            <div className="p-3 bg-gold/5 border border-gold/20 rounded-lg mt-4 text-xs text-foreground/70 leading-relaxed">
              <strong>Regra de Parcelamento:</strong> Pagamentos no cartão de crédito parcelado (ex: 3x) dividem automaticamente a comissão do profissional nas mesmas parcelas e datas de vencimento. Pagamentos em PIX, dinheiro e débito geram comissão em parcela única.
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
