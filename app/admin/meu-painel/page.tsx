'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Clock, CheckCircle2, Play, Plus, X, ShoppingBag, Share2, Beaker, DollarSign, CalendarDays, Percent, Users, Sparkles, Trash2, User2
} from 'lucide-react';
import { SectionHeader, Panel } from '@/components/ui/Panel';
import { CardGlass } from '@/components/CardGlass';
import { Button } from '@/components/Button';
import { 
  fetchClientes, 
  fetchAgendamentos, 
  fetchServicos, 
  fetchEstoque,
  fetchProfissionais,
  salvarItemComanda,
  fetchItensComanda,
  atualizarStatusAgendamento,
  salvarInsumoTempoRealProcedimento,
  removerInsumoTempoRealProcedimento,
  atualizarPeriodoRecebimentoProfissional
} from '@/lib/supabase-queries';
import type { Cliente, Agendamento, Servico, ProdutoEstoque, ItemComanda, Profissional, InsumoAtendimento, PeriodoRecebimentoComissao } from '@/lib/gestao-types';
import { supabase } from '@/lib/supabase';

export default function MeuPainelPage() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [estoque, setEstoque] = useState<ProdutoEstoque[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [selectedProfId, setSelectedProfId] = useState<string>('');
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
  const [produtoSelecionado, setProdutoSelecionado] = useState('');
  const [produtoQty, setProdutoQty] = useState('1');
  const [produtoDescPct, setProdutoDescPct] = useState('');
  const [produtoDescValor, setProdutoDescValor] = useState('');
  const [salvandoPeriodo, setSalvandoPeriodo] = useState(false);

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

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [ags, cls, srvs, est, profs] = await Promise.all([
        fetchAgendamentos({ data: new Date().toISOString().split('T')[0] }),
        fetchClientes(),
        fetchServicos(),
        fetchEstoque(),
        fetchProfissionais(),
      ]);
      const { data: prods } = await supabase.from('products').select('*').eq('active', true).order('name');
      
      setAgendamentos(ags);
      setClientes(cls);
      setServicos(srvs);
      setEstoque(est);
      setProfissionais(profs || []);
      if (profs && profs.length > 0) {
        setSelectedProfId(prev => prev || profs[0].id);
      }
      setProdutosLoja(prods || []);
      setLoading(false);
    }
    loadData();
  }, []);

  const hoje = new Date().toISOString().split('T')[0];

  const meusAgendamentosHoje = useMemo(() => {
    if (!selectedProfId) return [];
    return agendamentos
      .filter(a => (a.profissional_id === selectedProfId || (Array.isArray(a.auxiliares_ids) && a.auxiliares_ids.includes(selectedProfId))) && a.data === hoje)
      .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
  }, [agendamentos, hoje, selectedProfId]);

  const emAtendimento = meusAgendamentosHoje.filter(a => a.status === 'em_atendimento');
  const proximos = meusAgendamentosHoje.filter(a => a.status === 'pendente' || a.status === 'confirmado');
  const concluidos = meusAgendamentosHoje.filter(a => a.status === 'concluido');

  const getClienteNome = (id: string) => clientes.find(c => c.id === id)?.nome || 'Cliente não encontrado';
  const getServicoNome = (id: string) => servicos.find(s => s.id === id)?.nome || 'Serviço excluído';

  const iniciarAtendimento = async (id: string) => {
    const success = await atualizarStatusAgendamento(id, 'em_atendimento');
    if (success) {
      setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status: 'em_atendimento' } : a));
    }
  };

  const encerrarAtendimento = async (id: string) => {
    const success = await atualizarStatusAgendamento(id, 'concluido');
    if (success) {
      setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status: 'concluido' } : a));
      alert('Atendimento encerrado e enviado para a recepção (Aguardando Pagamento)!');
    }
  };

  const abrirModalInsumos = async (ag: Agendamento) => {
    setActiveAgendamento(ag);
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
      horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setInsumoLoading(true);
    try {
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
            <label className="text-[11px] font-semibold text-foreground/50 uppercase tracking-wider block">Profissional / Cadeira Atuante:</label>
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
          </div>
        </div>
        <div className="text-xs text-foreground/60 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
          <span>Insumos lançados aqui dão baixa e sincronizam em tempo real</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUNA ESQUERDA: Cadeira Atual & Multitarefas */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            Na Cadeira Agora
          </h2>

          {emAtendimento.length === 0 ? (
            <CardGlass className="p-8 text-center text-foreground/50 border-dashed">
              Nenhuma cliente na cadeira no momento para este profissional.
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
                          <h3 className="text-2xl font-bold text-foreground">
                            {getClienteNome(ag.cliente_id)}
                          </h3>
                          <p className="text-foreground/70">{getServicoNome(ag.servico_id)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-foreground/50">Iniciado às</p>
                          <p className="text-xl font-mono text-foreground">{ag.hora_inicio}</p>
                          {ag.product_cost != null && Number(ag.product_cost) > 0 && (
                            <p className="text-xs font-mono text-gold font-bold mt-1">
                              Insumos: R$ {Number(ag.product_cost).toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 mt-6">
                      <Button 
                        variant="secondary" 
                        className="bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
                        onClick={() => abrirModalInsumos(ag)}
                      >
                        <Plus size={16} /> Lançar Insumos
                      </Button>

                      <Button 
                        variant="secondary" 
                        onClick={() => abrirModalUpsell(ag)}
                      >
                        <ShoppingBag size={16} /> Vender Produto (Upsell)
                      </Button>

                      <div className="flex-1" />

                      <Button 
                        variant="primary" 
                        onClick={() => encerrarAtendimento(ag.id)}
                      >
                        <CheckCircle2 size={16} /> Encerrar Atendimento
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
          <CardGlass className="p-6 space-y-4">
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
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${
                    periodo === 'quinzenal'
                      ? 'bg-purple-100 text-purple-950 border border-purple-300'
                      : periodo === 'mensal'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-blue-100 text-blue-900 border border-blue-300'
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
                      className={`p-3 rounded-xl border text-left transition-all ${
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

            <p className="text-xs text-foreground/60 pt-2 border-t border-[var(--border-subtle)]">
              Consulte seus recebíveis, comissões liberadas no período e valores em carência de cartão de crédito (D+30).
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {(() => {
                const profAtivo = profissionais.find(p => p.id === selectedProfId);
                const periodo = profAtivo?.periodo_recebimento || 'semanal';
                const labelFechamento = periodo === 'quinzenal' ? 'Fechamento Quinzenal' : periodo === 'mensal' ? 'Fechamento Mensal' : 'Fechamento Semanal';
                return (
                  <Link href={`/admin/comissoes?aba=fechamento&prof=${selectedProfId}&periodo=${periodo}`} className="flex-1">
                    <Button variant="secondary" className="w-full text-xs">
                      <CalendarDays size={15} /> {labelFechamento}
                    </Button>
                  </Link>
                );
              })()}
              <Link href={`/admin/comissoes?aba=recebiveis&prof=${selectedProfId}`} className="flex-1">
                <Button variant="primary" className="w-full text-xs">
                  <DollarSign size={15} /> Consultar Recebíveis (D+30)
                </Button>
              </Link>
            </div>
          </CardGlass>
        </div>

        {/* COLUNA DIREITA: Próximos Atendimentos */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Clock className="text-foreground/50" />
            Próximos Hoje
          </h2>

          <div className="space-y-3">
            {proximos.length === 0 ? (
              <p className="text-sm text-foreground/50 text-center py-4">Agenda livre.</p>
            ) : (
              proximos.map(ag => (
                <CardGlass key={ag.id} className="p-4 hover:border-foreground/20 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="text-center font-mono text-sm text-foreground/50">
                      {ag.hora_inicio}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{getClienteNome(ag.cliente_id)}</p>
                      <p className="text-xs text-foreground/50 truncate">{getServicoNome(ag.servico_id)}</p>
                    </div>
                    <Button variant="outline" size="sm" className="px-2" onClick={() => iniciarAtendimento(ag.id)}>
                      <Play size={14} /> Puxar
                    </Button>
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
            
            <div className="space-y-3.5 mb-6 bg-foreground/[0.02] border border-[var(--border-subtle)] rounded-xl p-4">
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
                  <select 
                    className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2 text-xs focus:outline-none focus:border-gold text-foreground"
                    value={insumoSelecionado}
                    onChange={e => setInsumoSelecionado(e.target.value)}
                  >
                    <option value="">Selecione o Insumo...</option>
                    {insumosDoEstoque.map(p => {
                      const custo = (p.price_per_gram && p.price_per_gram > 0)
                        ? p.price_per_gram
                        : ((p.cost_price && p.cost_price > 0) ? p.cost_price / 500 : 0.10);
                      return (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.stock_qty ?? 0}{p.unit}) — R$ {custo.toFixed(2)}/{p.unit}
                        </option>
                      );
                    })}
                  </select>
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
                    <Button 
                      variant="primary" 
                      className="bg-gold hover:bg-gold-dim text-white shrink-0 px-3 text-xs font-bold shadow-sm"
                      onClick={handleSalvarInsumo}
                      disabled={insumoLoading || !insumoSelecionado || !insumoQty}
                    >
                      {insumoLoading ? '...' : '+ Lançar'}
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
                    return (
                      <div key={idx} className="p-2.5 text-xs flex justify-between items-center gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="px-1.5 py-0.5 rounded bg-foreground/5 text-foreground text-[9px] font-bold border border-[var(--border-subtle)]">
                              {item.etapa || 'Procedimento'}
                            </span>
                            <span className="text-[10px] text-foreground/50">
                              Por: {pNome}
                            </span>
                          </div>
                          <span className="font-bold text-foreground">{item.name}</span>
                          <span className="font-mono text-foreground/70 ml-2">({item.qty_used}{item.unit})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-foreground">R$ {Number(item.custo_total || 0).toFixed(2)}</span>
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
                  <select 
                    className="flex-1 bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm focus:outline-none focus:border-gold"
                    value={produtoSelecionado}
                    onChange={e => {
                      const pid = e.target.value;
                      setProdutoSelecionado(pid);
                      if (produtoDescPct) {
                        const p = produtosLoja.find(x => x.id === pid);
                        const sub = (p?.price || 0) * (Math.max(1, parseInt(produtoQty) || 1));
                        const pct = parseFloat(produtoDescPct) || 0;
                        const val = (sub * pct) / 100;
                        setProdutoDescValor(val > 0 ? val.toFixed(2) : '');
                      }
                    }}
                  >
                    <option value="">Selecione o Produto...</option>
                    {produtosLoja.filter(p => (Number(p.stock_quantity ?? p.stock ?? p.stock_qty ?? 0)) > 0).map(p => (
                      <option key={p.id} value={p.id}>{p.name} — R$ {p.price} ({p.stock_quantity ?? p.stock ?? p.stock_qty ?? 0} un)</option>
                    ))}
                  </select>
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

    </div>
  );
}
