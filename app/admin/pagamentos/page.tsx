'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Wallet, DollarSign, ArrowDownRight, Plus, AlertTriangle, Coffee, Wrench, Users, Receipt, Archive, LockOpen, Lock,
  Calendar, CheckCircle, FileText, ArrowUpRight, Search, CreditCard, Banknote, Smartphone, ExternalLink,
  CheckCircle2, Clock, ShieldCheck, AlertCircle, Edit3, X, CheckCheck, RefreshCw, Filter, Sparkles, Scale, Beaker,
  Scissors, Percent, ShoppingBag, Eye, Printer, Layers
} from 'lucide-react';
import { CardGlass } from '@/components/CardGlass';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { fetchAgendamentos, fetchClientes, fetchServicos, fetchProfissionais, confirmarFechamentoGestao } from '@/lib/supabase-queries';
import { getServicoNome, getProfissionalNome, getServicoPreco, STATUS_LABELS } from '@/lib/mock-data';
import type { Agendamento, Cliente, Servico, Profissional } from '@/lib/gestao-types';

// Categorias de despesa e seus ícones
const EXPENSE_CATEGORIES: Record<string, { label: string; icon: any; color: string }> = {
  PAYROLL: { label: 'Pagamento de Funcionários', icon: Users, color: 'text-blue-500 bg-blue-500/10' },
  MAINTENANCE: { label: 'Manutenção do Salão', icon: Wrench, color: 'text-amber-500 bg-amber-500/10' },
  SUPPLIES: { label: 'Alimentação / Insumos', icon: Coffee, color: 'text-orange-500 bg-orange-500/10' },
  BILLS: { label: 'Contas (Água, Luz, Internet)', icon: Receipt, color: 'text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-500/10' },
  OTHER: { label: 'Outras Despesas', icon: Archive, color: 'text-slate-500 bg-slate-500/10' }
};

export default function AdminFinanceiro() {
  const [loading, setLoading] = useState(true);
  const [caixaAberto, setCaixaAberto] = useState<any>(null);
  const [transacoes, setTransacoes] = useState<any[]>([]);

  // Estados de Atendimentos e Recebimentos do Salão
  const [dataFiltro, setDataFiltro] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [agendamentosDia, setAgendamentosDia] = useState<Agendamento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loadingAtendimentos, setLoadingAtendimentos] = useState<boolean>(true);

  // Estados do Fechamento e Contabilização da Gestão
  const [filtroStatus, setFiltroStatus] = useState<'TODOS' | 'PENDING_CONFIRMATION' | 'CONFIRMED'>('TODOS');
  const [editingApptGestao, setEditingApptGestao] = useState<Agendamento | null>(null);
  const [extratoComandaAppt, setExtratoComandaAppt] = useState<Agendamento | null>(null);
  const [modalMetodo, setModalMetodo] = useState<string>('DINHEIRO');
  const [modalValor, setModalValor] = useState<string>('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState<boolean>(false);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [formCat, setFormCat] = useState('MAINTENANCE');
  const [formDesc, setFormDesc] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formMethod, setFormMethod] = useState('DINHEIRO');

  // Caixa form
  const [abrirCaixaValor, setAbrirCaixaValor] = useState('');

  // Action loading state
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadFinanceiro();
    carregarAtendimentosDia(dataFiltro);
  }, []);

  const carregarAtendimentosDia = async (dataStr: string) => {
    setLoadingAtendimentos(true);
    try {
      const [ags, cls, srvs, profs] = await Promise.all([
        fetchAgendamentos({ data: dataStr }),
        fetchClientes(),
        fetchServicos(),
        fetchProfissionais(),
      ]);
      setAgendamentosDia(ags);
      setClientes(cls);
      setServicos(srvs);
      setProfissionais(profs);
    } catch (err) {
      console.error('Erro ao carregar atendimentos do dia:', err);
    } finally {
      setLoadingAtendimentos(false);
    }
  };

  const loadFinanceiro = async () => {
    setLoading(true);
    try {
      const resCaixa = await fetch('/api/admin/caixa');
      if (resCaixa.ok) {
        const dataCaixa = await resCaixa.json();
        if (dataCaixa.caixa) {
          setCaixaAberto(dataCaixa.caixa);
          const resTx = await fetch(`/api/admin/caixa/transacoes?caixa_id=${dataCaixa.caixa.id}`);
          if (resTx.ok) {
            const dataTx = await resTx.json();
            setTransacoes(dataTx.transacoes || []);
          }
        } else {
          setCaixaAberto(null);
          setTransacoes([]);
        }
      }
    } catch (e) {
      console.error('Erro ao carregar dados do financeiro:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAbrirCaixa = async () => {
    const valorNum = parseFloat(abrirCaixaValor.replace(',', '.'));
    if (isNaN(valorNum) || valorNum < 0) return alert('Digite um valor inicial válido.');

    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/caixa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opening_balance: valorNum })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erro ao abrir caixa.');
        return;
      }
      setCaixaAberto(data.caixa);
      setAbrirCaixaValor('');
      setTransacoes([]);
    } catch (err) {
      alert('Erro ao conectar ao servidor para abrir o caixa.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFecharCaixa = async () => {
    if (!caixaAberto) return;
    if (!confirm('Deseja realmente fechar o caixa de hoje?')) return;

    // Calcula saldo final = inicial + receitas - despesas (apenas DINHEIRO)
    let saldoDinheiro = Number(caixaAberto.opening_balance);
    transacoes.forEach(t => {
      if (t.payment_method === 'DINHEIRO') {
        if (t.type === 'INCOME') saldoDinheiro += Number(t.amount);
        if (t.type === 'EXPENSE') saldoDinheiro -= Number(t.amount);
      }
    });

    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/caixa', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: caixaAberto.id,
          closing_balance: saldoDinheiro
        })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erro ao fechar caixa.');
        return;
      }
      setCaixaAberto(null);
      setTransacoes([]);
      alert(`Caixa fechado com sucesso!\nSaldo final em Dinheiro Físico estimado: R$ ${saldoDinheiro.toFixed(2)}`);
    } catch (err) {
      alert('Erro ao fechar caixa.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLancarDespesa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caixaAberto) return alert('Abra o caixa do dia primeiro!');

    const valorNum = parseFloat(formAmount.replace(',', '.'));
    if (isNaN(valorNum) || valorNum <= 0) return alert('Digite um valor válido.');

    const newTx = {
      caixa_id: caixaAberto.id,
      type: formType,
      category: formCat,
      description: formDesc,
      amount: valorNum,
      payment_method: formMethod,
      status: 'PAID'
    };

    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/caixa/transacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTx)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erro ao lançar despesa.');
        return;
      }
      setShowForm(false);
      setFormDesc('');
      setFormAmount('');
      loadFinanceiro(); // recarrega
    } catch (err) {
      alert('Erro ao lançar movimentação.');
    } finally {
      setActionLoading(false);
    }
  };

  // Helper para obter valor líquido/efetivo de um agendamento, desconsiderando duplicidades de comandas unificadas
  const getValorEfetivo = (a: Agendamento): number => {
    // Se o agendamento foi unificado em outra comanda principal, seu valor a pagar individual é zero (cobrado no pai)
    if (a.unificado_em_id) return 0;
    if (a.total_amount != null) return Number(a.total_amount);
    return getServicoPreco(a.servico_id, servicos);
  };

  // Confirmação e Contabilização pela Gestão
  const handleConfirmarGestao = async (ag: Agendamento, metodoCustom?: string, valorCustom?: number) => {
    setActionLoadingId(ag.id);
    try {
      const finalMetodo = metodoCustom || ag.payment_method || 'DINHEIRO';
      const finalValor = valorCustom !== undefined 
        ? valorCustom 
        : getValorEfetivo(ag);

      const unificadosIds = ag.comanda_unificada?.agendamentos_unificados_ids || [];

      const ok = await confirmarFechamentoGestao({
        id: ag.id,
        paymentMethod: finalMetodo,
        totalAmount: finalValor,
        confirmedBy: 'Gestão do Salão',
        agendamentosUnificadosIds: unificadosIds,
      });

      if (!ok) {
        alert('Erro ao confirmar fechamento. Tente novamente.');
        return;
      }

      // Se foi em DINHEIRO e o caixa físico estiver aberto, sincroniza no caixa
      if (finalMetodo.toUpperCase() === 'DINHEIRO' && caixaAberto && finalValor > 0) {
        try {
          const cli = clientes.find(c => c.id === ag.cliente_id);
          const srvNome = ag.comanda_unificada
            ? `Comanda Unificada (${ag.comanda_unificada.procedimentos.length} procedimentos)`
            : getServicoNome(ag.servico_id, servicos);
          await fetch('/api/admin/caixa/transacoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              caixa_id: caixaAberto.id,
              type: 'INCOME',
              category: 'OTHER',
              description: `Recebimento Atendimento: ${srvNome} (${cli?.nome || 'Cliente'})`,
              amount: finalValor,
              payment_method: 'DINHEIRO',
              status: 'PAID'
            })
          });
          loadFinanceiro();
        } catch (e) {
          console.warn('Aviso: Não foi possível sincronizar com o caixa físico automaticamente:', e);
        }
      }

      await carregarAtendimentosDia(dataFiltro);
      setEditingApptGestao(null);
      setExtratoComandaAppt(null);
    } catch (err: any) {
      alert('Erro ao processar confirmação: ' + (err?.message || 'Erro de comunicação'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmarTodosPendentes = async () => {
    if (preFechadosPendentes.length === 0) return;
    if (!confirm(`Deseja confirmar e contabilizar todos os ${preFechadosPendentes.length} pré-fechamentos da secretaria de uma só vez?`)) {
      return;
    }

    setBatchLoading(true);
    try {
      for (const ag of preFechadosPendentes) {
        const val = getValorEfetivo(ag);
        const met = ag.payment_method || 'DINHEIRO';
        const unificadosIds = ag.comanda_unificada?.agendamentos_unificados_ids || [];

        await confirmarFechamentoGestao({
          id: ag.id,
          paymentMethod: met,
          totalAmount: val,
          confirmedBy: 'Gestão do Salão',
          agendamentosUnificadosIds: unificadosIds,
        });

        if (met.toUpperCase() === 'DINHEIRO' && caixaAberto && val > 0) {
          try {
            const cli = clientes.find(c => c.id === ag.cliente_id);
            const srvNome = ag.comanda_unificada
              ? `Comanda Unificada (${ag.comanda_unificada.procedimentos.length} procedimentos)`
              : getServicoNome(ag.servico_id, servicos);
            await fetch('/api/admin/caixa/transacoes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                caixa_id: caixaAberto.id,
                type: 'INCOME',
                category: 'OTHER',
                description: `Recebimento Atendimento: ${srvNome} (${cli?.nome || 'Cliente'})`,
                amount: val,
                payment_method: 'DINHEIRO',
                status: 'PAID'
              })
            });
          } catch (e) {
            // Continua lote
          }
        }
      }
      loadFinanceiro();
      await carregarAtendimentosDia(dataFiltro);
      alert('Todos os pré-fechamentos foram confirmados e contabilizados no sistema financeiro!');
    } catch (err) {
      alert('Erro ao confirmar em lote.');
    } finally {
      setBatchLoading(false);
    }
  };

  const handleAbrirAjusteModal = (ag: Agendamento) => {
    const val = getValorEfetivo(ag);
    setEditingApptGestao(ag);
    setModalMetodo(ag.payment_method || 'DINHEIRO');
    setModalValor(val.toFixed(2));
  };

  const handleSalvarAjusteGestao = () => {
    if (!editingApptGestao) return;
    const num = parseFloat(modalValor.replace(',', '.'));
    if (isNaN(num) || num < 0) {
      alert('Informe um valor válido.');
      return;
    }
    handleConfirmarGestao(editingApptGestao, modalMetodo, num);
  };

  // Resumos do Caixa Físico
  const totalDespesas = transacoes.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + Number(t.amount), 0);
  const totalFisico = (caixaAberto ? Number(caixaAberto.opening_balance) : 0) + 
                      transacoes.filter(t => t.payment_method === 'DINHEIRO' && t.type === 'INCOME').reduce((acc, t) => acc + Number(t.amount), 0) -
                      transacoes.filter(t => t.payment_method === 'DINHEIRO' && t.type === 'EXPENSE').reduce((acc, t) => acc + Number(t.amount), 0);

  // Resumos dos Atendimentos do Salão no Dia (Segregação de Funções)
  const atendimentosConcluidos = agendamentosDia.filter(a => a.status === 'concluido');

  // Pré-fechados pela Secretaria (Aguardando conferência da Gestão)
  // Agendamentos secundários unificados não inflam a lista separadamente
  const preFechadosPendentes = atendimentosConcluidos.filter(
    a => a.financial_status === 'PENDING_CONFIRMATION' && !a.unificado_em_id
  );

  // Confirmados e Contabilizados pela Gestão
  const contabilizadosGestao = atendimentosConcluidos.filter(
    a => (a.financial_status === 'CONFIRMED' || !a.financial_status) && !a.unificado_em_id
  );

  // Faturamento Oficial Confirmado (Gestão)
  const totalConfirmadoGestao = contabilizadosGestao.reduce((acc, a) => {
    return acc + getValorEfetivo(a);
  }, 0);

  // Faturamento Pendente de Confirmação (Secretaria)
  const totalPendenteGestao = preFechadosPendentes.reduce((acc, a) => {
    return acc + getValorEfetivo(a);
  }, 0);

  // Totais por método dos lançamentos contabilizados
  const totalDinheiroConfirmado = contabilizadosGestao
    .filter(a => (a.payment_method || '').toUpperCase() === 'DINHEIRO')
    .reduce((acc, a) => acc + getValorEfetivo(a), 0);

  const totalPixConfirmado = contabilizadosGestao
    .filter(a => (a.payment_method || '').toUpperCase() === 'PIX')
    .reduce((acc, a) => acc + getValorEfetivo(a), 0);

  const totalCartoesConfirmado = contabilizadosGestao
    .filter(a => {
      const m = (a.payment_method || '').toUpperCase();
      return m.includes('CREDITO') || m.includes('CRÉDITO') || m.includes('DEBITO') || m.includes('DÉBITO') || m.includes('CARTAO') || m.includes('CARTÃO');
    })
    .reduce((acc, a) => acc + getValorEfetivo(a), 0);

  // Lista filtrada
  const agendamentosFiltrados = agendamentosDia.filter(ag => {
    if (filtroStatus === 'PENDING_CONFIRMATION') {
      return ag.status === 'concluido' && ag.financial_status === 'PENDING_CONFIRMATION';
    }
    if (filtroStatus === 'CONFIRMED') {
      return ag.status === 'concluido' && (ag.financial_status === 'CONFIRMED' || !ag.financial_status);
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Wallet size={24} className="text-gold" /> Financeiro e Caixa
        </h1>
        <p className="text-foreground/60 mt-1">
          Abertura e fechamento de caixa diário, controle de despesas e conferência/contabilização final dos atendimentos realizada pela gestão.
        </p>
      </div>

      {!caixaAberto && !loading && (
        <CardGlass className="p-8 text-center flex flex-col items-center justify-center space-y-4 border-amber-500/20">
          <Lock size={48} className="text-amber-500/50 mb-2" />
          <h2 className="text-xl font-bold text-foreground">O Caixa está Fechado</h2>
          <p className="text-foreground/60 max-w-sm">
            Para iniciar os lançamentos de despesas e controlar as entradas em dinheiro de hoje, abra o caixa informando o valor que há na gaveta.
          </p>
          <div className="flex items-center gap-3 mt-4">
            <span className="text-foreground font-medium">Fundo de Caixa R$</span>
            <input 
              type="number" 
              value={abrirCaixaValor}
              onChange={e => setAbrirCaixaValor(e.target.value)}
              placeholder="0.00" 
              className="bg-background border border-border-subtle rounded-md px-3 py-2 w-32 focus:border-gold outline-none"
            />
            <Button onClick={handleAbrirCaixa} variant="primary" disabled={actionLoading}>
              {actionLoading ? 'Abrindo...' : 'Abrir Caixa'}
            </Button>
          </div>
        </CardGlass>
      )}

      {caixaAberto && (
        <>
          {/* Dashboard Topo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CardGlass className="p-5 flex items-center gap-4 border-l-4 border-l-emerald-500">
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
                <LockOpen size={24} />
              </div>
              <div>
                <p className="text-sm text-foreground/60">Status do Caixa</p>
                <p className="font-bold text-xl text-foreground">ABERTO</p>
                <p className="text-xs text-emerald-500 mt-1">Fundo inicial: R$ {Number(caixaAberto.opening_balance).toFixed(2)}</p>
              </div>
            </CardGlass>

            <CardGlass className="p-5 flex items-center gap-4 border-l-4 border-l-red-500">
              <div className="p-3 bg-red-500/10 rounded-xl text-red-500">
                <ArrowDownRight size={24} />
              </div>
              <div>
                <p className="text-sm text-foreground/60">Saídas / Despesas</p>
                <p className="font-bold text-xl text-red-500">R$ {totalDespesas.toFixed(2)}</p>
                <p className="text-xs text-foreground/40 mt-1">{transacoes.filter(t => t.type === 'EXPENSE').length} lançamentos hoje</p>
              </div>
            </CardGlass>

            <CardGlass className="p-5 flex items-center gap-4 border-l-4 border-l-amber-500">
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
                <DollarSign size={24} />
              </div>
              <div>
                <p className="text-sm text-foreground/60">Saldo Físico (Gaveta)</p>
                <p className="font-bold text-xl text-foreground">R$ {totalFisico.toFixed(2)}</p>
                <p className="text-xs text-foreground/40 mt-1">Soma de todo o dinheiro</p>
              </div>
            </CardGlass>
          </div>

          <div className="flex items-center justify-between mt-8 mb-4">
            <h2 className="text-xl font-bold text-foreground">Movimentações de Hoje</h2>
            <div className="flex gap-3">
              <Button variant="outline" className="text-red-500 border-red-500/30 hover:bg-red-500/10" onClick={handleFecharCaixa}>
                Fechar Caixa
              </Button>
              <Button variant="primary" onClick={() => setShowForm(!showForm)} className="gap-2">
                <Plus size={18} /> Nova Despesa
              </Button>
            </div>
          </div>

          {/* Formulario de Nova Despesa */}
          {showForm && (
            <CardGlass className="p-6 mb-6 border border-gold/30">
              <h3 className="font-bold text-lg mb-4 text-foreground">Registrar Pagamento / Despesa</h3>
              <form onSubmit={handleLancarDespesa} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="space-y-1">
                  <label className="text-sm text-foreground/60">Categoria da Despesa</label>
                  <select 
                    value={formCat} 
                    onChange={e => setFormCat(e.target.value)}
                    className="w-full bg-background border border-border-subtle rounded-md px-3 py-2 text-foreground focus:border-gold outline-none"
                  >
                    {Object.entries(EXPENSE_CATEGORIES).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm text-foreground/60">Valor (R$)</label>
                  <input 
                    type="number" step="0.01" required
                    value={formAmount} onChange={e => setFormAmount(e.target.value)}
                    className="w-full bg-background border border-border-subtle rounded-md px-3 py-2 text-foreground focus:border-gold outline-none"
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm text-foreground/60">Descrição / Motivo</label>
                  <input 
                    type="text" required
                    value={formDesc} onChange={e => setFormDesc(e.target.value)}
                    className="w-full bg-background border border-border-subtle rounded-md px-3 py-2 text-foreground focus:border-gold outline-none"
                    placeholder="Ex: Troca de lâmpada da recepção, Café e pão de queijo, Pagamento João..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm text-foreground/60">Forma de Pagamento</label>
                  <select 
                    value={formMethod} 
                    onChange={e => setFormMethod(e.target.value)}
                    className="w-full bg-background border border-border-subtle rounded-md px-3 py-2 text-foreground focus:border-gold outline-none"
                  >
                    <option value="DINHEIRO">Dinheiro (Sai do Caixa)</option>
                    <option value="PIX">PIX (Sai do Banco)</option>
                    <option value="CARTAO">Cartão</option>
                  </select>
                </div>

                <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                  <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
                  <Button type="submit" variant="primary" className="bg-red-600 hover:bg-red-700 text-white border-none">
                    Confirmar Saída
                  </Button>
                </div>
              </form>
            </CardGlass>
          )}

          {/* Tabela de transações */}
          <CardGlass className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-foreground/5 border-b border-border-subtle">
                    <th className="p-4 text-sm font-semibold text-foreground/60">Tipo</th>
                    <th className="p-4 text-sm font-semibold text-foreground/60">Descrição</th>
                    <th className="p-4 text-sm font-semibold text-foreground/60">Método</th>
                    <th className="p-4 text-sm font-semibold text-foreground/60 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {transacoes.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-foreground/40">
                        Nenhuma despesa ou movimentação lançada neste caixa hoje.
                      </td>
                    </tr>
                  ) : (
                    transacoes.map(t => {
                      const cat = EXPENSE_CATEGORIES[t.category] || EXPENSE_CATEGORIES.OTHER;
                      const Icon = cat.icon;
                      const isIncome = t.type === 'INCOME';

                      return (
                        <tr key={t.id} className="border-b border-border-subtle/50 hover:bg-foreground/5 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className={`p-2 rounded-lg ${cat.color}`}>
                                <Icon size={16} />
                              </span>
                              <span className="text-sm font-medium text-foreground">{cat.label}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <p className="text-sm text-foreground">{t.description}</p>
                            <p className="text-xs text-foreground/40 mt-0.5">{new Date(t.transaction_date).toLocaleTimeString('pt-BR')}</p>
                          </td>
                          <td className="p-4">
                            <span className="text-xs font-semibold px-2 py-1 bg-foreground/10 rounded-md">
                              {t.payment_method}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <span className={`font-bold ${isIncome ? 'text-emerald-500' : 'text-red-500'}`}>
                              {isIncome ? '+' : '-'} R$ {Number(t.amount).toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardGlass>
        </>
      )}

      {/* SEÇÃO: HISTÓRICO DE ATENDIMENTOS E CONTABILIZAÇÃO DA GESTÃO */}
      <div className="mt-12 space-y-5 pt-8 border-t border-[var(--border-subtle)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <ShieldCheck size={22} className="text-gold" />
              Conferência & Contabilização dos Atendimentos (Gestão)
            </h2>
            <p className="text-xs text-foreground/60 mt-0.5">
              Validação gerencial dos fechamentos prévios realizados pela secretaria. Somente após a confirmação aqui os valores são oficializados no financeiro.
            </p>
          </div>

          {/* Filtro de Data */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs text-foreground/60 flex items-center gap-1 font-medium">
              <Calendar size={14} /> Data:
            </span>
            <input
              type="date"
              value={dataFiltro}
              onChange={(e) => {
                setDataFiltro(e.target.value);
                carregarAtendimentosDia(e.target.value);
              }}
              className="bg-background border border-border-subtle rounded-md px-3 py-1.5 text-xs text-foreground focus:border-gold outline-none"
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => carregarAtendimentosDia(dataFiltro)}
              className="text-xs py-1.5 px-3 h-auto"
            >
              Atualizar
            </Button>
          </div>
        </div>

        {/* ALERTA DE FECHAMENTOS PRÉVIOS PENDENTES DA SECRETARIA */}
        {preFechadosPendentes.length > 0 && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-500 shrink-0 mt-0.5">
                <Clock size={20} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  Fechamentos Prévios da Secretaria Aguardando Conferência
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500 text-black font-extrabold">
                    {preFechadosPendentes.length} pendente(s)
                  </span>
                </h3>
                <p className="text-xs text-foreground/70 mt-1 max-w-2xl">
                  A recepção liberou as clientes e registrou o pré-fechamento no total de <strong className="text-amber-500 font-bold">R$ {totalPendenteGestao.toFixed(2)}</strong>. 
                  Confira os valores abaixo e clique em <strong>Confirmar e Contabilizar</strong> para oficializar no caixa e financeiro do Studio.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="primary"
                size="sm"
                disabled={batchLoading}
                onClick={handleConfirmarTodosPendentes}
                className="gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold border-none shadow-md shadow-amber-500/20 text-xs py-2 px-3"
              >
                <CheckCheck size={16} />
                {batchLoading ? 'Confirmando...' : 'Confirmar Todos da Secretaria'}
              </Button>
            </div>
          </div>
        )}

        {/* Resumo Gerencial: Confirmado vs Pendente */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <CardGlass className="p-4 border-l-4 border-l-emerald-600 bg-emerald-500/5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground/70 font-semibold">Contabilizado (Gestão)</span>
              <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-md"><ShieldCheck size={14}/></span>
            </div>
            <p className="text-xl font-black text-emerald-700 mt-1">
              R$ {totalConfirmadoGestao.toFixed(2)}
            </p>
            <p className="text-[11px] text-stone-600 font-medium mt-0.5">{contabilizadosGestao.length} oficializado(s)</p>
          </CardGlass>

          <CardGlass className="p-4 border-l-4 border-l-amber-600 bg-amber-500/5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground/70 font-semibold">Aguardando Gestão</span>
              <span className="p-1.5 bg-amber-100 text-amber-800 rounded-md"><Clock size={14}/></span>
            </div>
            <p className="text-xl font-black text-amber-800 mt-1">
              R$ {totalPendenteGestao.toFixed(2)}
            </p>
            <p className="text-[11px] text-stone-600 font-medium mt-0.5">{preFechadosPendentes.length} pré-fechado(s) secretaria</p>
          </CardGlass>

          <CardGlass className="p-4 border-l-4 border-l-gold bg-gold/5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground/70 font-semibold">Dinheiro Contabilizado</span>
              <span className="p-1.5 bg-gold/15 text-gold-dim rounded-md"><Banknote size={14}/></span>
            </div>
            <p className="text-xl font-black text-foreground mt-1">
              R$ {totalDinheiroConfirmado.toFixed(2)}
            </p>
            <p className="text-[11px] text-stone-600 font-medium mt-0.5">Espécie confirmada</p>
          </CardGlass>

          <CardGlass className="p-4 border-l-4 border-l-blue-600 bg-blue-500/5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground/70 font-semibold">Cartões e PIX Contabilizados</span>
              <span className="p-1.5 bg-blue-100 text-blue-800 rounded-md"><CreditCard size={14}/></span>
            </div>
            <p className="text-xl font-black text-foreground mt-1">
              R$ {(totalCartoesConfirmado + totalPixConfirmado).toFixed(2)}
            </p>
            <p className="text-[11px] text-stone-600 font-medium mt-0.5">PIX R$ {totalPixConfirmado.toFixed(2)} | Cartões R$ {totalCartoesConfirmado.toFixed(2)}</p>
          </CardGlass>
        </div>

        {/* Abas de Filtro de Status */}
        <div className="flex items-center gap-2 border-b border-border-subtle pb-2">
          <span className="text-xs text-foreground/70 font-semibold flex items-center gap-1 mr-1">
            <Filter size={13} /> Filtrar:
          </span>
          <button
            onClick={() => setFiltroStatus('TODOS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filtroStatus === 'TODOS'
                ? 'bg-foreground text-background shadow-sm'
                : 'text-foreground/70 hover:text-foreground hover:bg-foreground/5'
            }`}
          >
            Todos ({agendamentosDia.length})
          </button>
          <button
            onClick={() => setFiltroStatus('PENDING_CONFIRMATION')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              filtroStatus === 'PENDING_CONFIRMATION'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-amber-800 hover:bg-amber-100/70 border border-amber-200/60'
            }`}
          >
            <Clock size={13} /> Aguardando Gestão ({preFechadosPendentes.length})
          </button>
          <button
            onClick={() => setFiltroStatus('CONFIRMED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              filtroStatus === 'CONFIRMED'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-800 hover:bg-emerald-100/70 border border-emerald-200/60'
            }`}
          >
            <ShieldCheck size={13} /> Contabilizados Gestão ({contabilizadosGestao.length})
          </button>
        </div>

        {/* Tabela de Atendimentos do Dia com Fechamento e Contabilização */}
        <CardGlass className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-foreground/5 border-b border-border-subtle">
                  <th className="p-4 text-xs font-bold text-foreground/80 uppercase tracking-wider">Horário</th>
                  <th className="p-4 text-xs font-bold text-foreground/80 uppercase tracking-wider">Cliente</th>
                  <th className="p-4 text-xs font-bold text-foreground/80 uppercase tracking-wider">Procedimento / Profissional</th>
                  <th className="p-4 text-xs font-bold text-foreground/80 uppercase tracking-wider">Forma Declarada</th>
                  <th className="p-4 text-xs font-bold text-foreground/80 uppercase tracking-wider text-right">Valor</th>
                  <th className="p-4 text-xs font-bold text-foreground/80 uppercase tracking-wider text-center">Status Atendimento</th>
                  <th className="p-4 text-xs font-bold text-foreground/80 uppercase tracking-wider text-center">Status Financeiro</th>
                  <th className="p-4 text-xs font-bold text-foreground/80 uppercase tracking-wider text-center">Ações da Gestão</th>
                </tr>
              </thead>
              <tbody>
                {loadingAtendimentos ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-foreground/50">
                      Carregando atendimentos do dia...
                    </td>
                  </tr>
                ) : agendamentosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-foreground/40">
                      Nenhum agendamento encontrado para o filtro selecionado nesta data ({dataFiltro}).
                    </td>
                  </tr>
                ) : (
                  agendamentosFiltrados.map(ag => {
                    const cli = clientes.find(c => c.id === ag.cliente_id);
                    const nomeCliente = cli?.nome || 'Cliente';
                    const cpfCliente = cli?.cpf;
                    const nomeServico = getServicoNome(ag.servico_id, servicos);
                    const nomeProf = getProfissionalNome(ag.profissional_id, profissionais);
                    const valor = getValorEfetivo(ag);
                    
                    const isPendingConfirmation = ag.status === 'concluido' && ag.financial_status === 'PENDING_CONFIRMATION';
                    const isConfirmed = ag.status === 'concluido' && (ag.financial_status === 'CONFIRMED' || !ag.financial_status);
                    const isUnificado = Boolean(ag.unificado_em_id);
                    const isMultiProf = Boolean(ag.comanda_unificada && ag.comanda_unificada.procedimentos && ag.comanda_unificada.procedimentos.length > 0);
                    const agendamentoPai = isUnificado ? agendamentosDia.find(x => x.id === ag.unificado_em_id) : null;

                    return (
                      <tr 
                        key={ag.id} 
                        className={`border-b border-border-subtle/50 transition-colors ${
                          isPendingConfirmation ? 'bg-amber-500/5 hover:bg-amber-500/10' : 'hover:bg-foreground/5'
                        }`}
                      >
                        <td className="p-4 text-sm font-mono font-medium text-foreground">
                          {ag.hora_inicio || '—'}
                        </td>
                        <td className="p-4">
                          <p className="text-sm font-bold text-foreground">{nomeCliente}</p>
                          <p className="text-xs text-foreground/50 font-mono mt-0.5">
                            {cpfCliente ? `CPF: ${cpfCliente}` : <span className="text-stone-500 font-medium text-[11px]">Sem CPF</span>}
                          </p>
                        </td>
                        <td className="p-4">
                          {isMultiProf ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-gold/15 text-gold font-bold border border-gold/30 inline-flex items-center gap-1 shadow-sm">
                                  <Sparkles size={11} className="text-gold" /> Comanda Multi-Profissional ({ag.comanda_unificada!.procedimentos.length} procedimentos)
                                </span>
                              </div>
                              <div className="space-y-1">
                                {ag.comanda_unificada!.procedimentos.map((p, idx) => (
                                  <div key={idx} className="flex items-center justify-between text-xs bg-foreground/5 px-2.5 py-1 rounded-md border border-white/5">
                                    <div className="flex items-center gap-1.5">
                                      <Scissors size={11} className="text-gold" />
                                      <span className="font-semibold text-foreground">{p.servico_nome}</span>
                                      <span className="text-foreground/40">•</span>
                                      <span className="text-foreground/70">{p.profissional_nome}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {p.desconto_valor > 0 && (
                                        <span className="text-amber-800 font-bold text-[10px]">
                                          Desc: -R$ {p.desconto_valor.toFixed(2)}
                                        </span>
                                      )}
                                      <span className="font-mono text-foreground/80 font-bold">
                                        R$ {(p.preco_tabela - p.desconto_valor).toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {ag.comanda_unificada!.produtos_comprados && ag.comanda_unificada!.produtos_comprados.length > 0 && (
                                <p className="text-[11px] text-teal-800 font-bold font-mono flex items-center gap-1 pt-0.5">
                                  <ShoppingBag size={11} /> {ag.comanda_unificada!.produtos_comprados.length} produto(s) Home Care inclusos
                                </p>
                              )}
                              {ag.product_cost != null && Number(ag.product_cost) > 0 && (
                                <p className="text-[11px] text-amber-800 font-bold font-mono flex items-center gap-1">
                                  <Beaker size={11} /> Insumos / Fundo de Produtos: R$ {Number(ag.product_cost).toFixed(2)}
                                </p>
                              )}
                            </div>
                          ) : isUnificado ? (
                            <div>
                              <p className="text-sm font-medium text-foreground">{nomeServico}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-foreground/60">Prof.: {nomeProf}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 font-bold border border-blue-300 flex items-center gap-1">
                                  <Layers size={10} /> Integrado na Comanda Conjunta
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm font-medium text-foreground">{nomeServico}</p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                <span className="text-xs text-foreground/60">Prof.: {nomeProf}</span>
                                {ag.auxiliares_ids && ag.auxiliares_ids.length > 0 && (
                                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-950 font-bold border border-purple-300 flex items-center gap-1 shadow-xs">
                                    <Users size={12} className="text-purple-800" /> +{ag.auxiliares_ids.length} Aux: {ag.auxiliares_ids.map(aid => getProfissionalNome(aid, profissionais)).join(', ')}
                                  </span>
                                )}
                              </div>
                              {ag.product_cost != null && Number(ag.product_cost) > 0 && (
                                <p className="text-[11px] text-amber-800 font-bold font-mono mt-1 flex items-center gap-1">
                                  <Beaker size={11} /> Fundo Produtos: R$ {Number(ag.product_cost).toFixed(2)}
                                </p>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          {isUnificado ? (
                            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-900 border border-blue-300 inline-flex items-center gap-1 shadow-xs">
                              <Layers size={11} /> Comanda Única
                            </span>
                          ) : (() => {
                            const m = (ag.payment_method || '').toUpperCase();
                            if (m === 'DINHEIRO') {
                              return <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-950 border border-amber-300 inline-flex items-center gap-1 shadow-xs"><Banknote size={12}/> Dinheiro</span>;
                            }
                            if (m === 'PIX') {
                              return <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-950 border border-emerald-300 inline-flex items-center gap-1 shadow-xs"><Smartphone size={12}/> PIX</span>;
                            }
                            if (m.includes('CREDITO') || m.includes('CRÉDITO')) {
                              return <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-950 border border-blue-300 inline-flex items-center gap-1 shadow-xs"><CreditCard size={12}/> C. Crédito</span>;
                            }
                            if (m.includes('DEBITO') || m.includes('DÉBITO')) {
                              return <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-950 border border-indigo-300 inline-flex items-center gap-1 shadow-xs"><CreditCard size={12}/> C. Débito</span>;
                            }
                            if (m) {
                              return <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-stone-100 text-stone-900 border border-stone-300 inline-flex items-center gap-1 shadow-xs">💳 {ag.payment_method}</span>;
                            }
                            return <span className="text-xs text-stone-500 font-medium">Aguardando</span>;
                          })()}
                        </td>
                        <td className="p-4 text-right">
                          {isUnificado ? (
                            <div className="flex flex-col items-end">
                              <span className="font-mono text-xs text-foreground/40 line-through">
                                R$ {getServicoPreco(ag.servico_id, servicos).toFixed(2)}
                              </span>
                              <span className="text-[11px] text-blue-700 font-bold">
                                Faturado em conjunto
                              </span>
                            </div>
                          ) : (
                            <span className={`font-black text-sm ${
                              isConfirmed 
                                ? 'text-emerald-700' 
                                : isPendingConfirmation 
                                ? 'text-amber-800' 
                                : 'text-stone-900'
                            }`}>
                              R$ {valor.toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`text-[11px] uppercase px-2.5 py-0.5 rounded-full font-bold border shadow-xs
                            ${ag.status === 'concluido' 
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300' 
                              : ag.status === 'em_atendimento' 
                              ? 'bg-blue-100 text-blue-900 border-blue-300' 
                              : ag.status === 'cancelado' || ag.status === 'no_show' 
                              ? 'bg-red-100 text-red-900 border-red-300' 
                              : 'bg-amber-100 text-amber-950 border-amber-300'}`}
                          >
                            {STATUS_LABELS[ag.status] || ag.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {isUnificado ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-900 border border-blue-300 inline-flex items-center gap-1 shadow-xs">
                                <Layers size={11} /> Unificado
                              </span>
                              <span className="text-[10px] text-foreground/50 font-medium">Comanda da Cliente</span>
                            </div>
                          ) : isPendingConfirmation ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-950 border border-amber-300 inline-flex items-center gap-1 shadow-xs">
                                <Clock size={12} className="animate-spin text-amber-700" /> Pré-fechado (Secretaria)
                              </span>
                              <span className="text-[10px] text-stone-600 font-semibold">Aguardando Gestão</span>
                            </div>
                          ) : isConfirmed ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-950 border border-emerald-300 inline-flex items-center gap-1 shadow-xs">
                                <ShieldCheck size={12} className="text-emerald-700" /> Contabilizado
                              </span>
                              <span className="text-[10px] text-stone-600 font-mono font-semibold">Oficial</span>
                            </div>
                          ) : (
                            <span className="text-xs text-stone-500 font-medium">Ainda não concluído</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {isUnificado ? (
                            <div className="flex items-center justify-center">
                              <button
                                onClick={() => {
                                  if (agendamentoPai) {
                                    setExtratoComandaAppt(agendamentoPai);
                                  } else {
                                    alert('A comanda principal está registrada em outro lote ou registro.');
                                  }
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-foreground/10 hover:bg-foreground/20 text-foreground transition-colors border border-border-subtle"
                                title="Ver a comanda unificada da cliente"
                              >
                                <Eye size={13} /> Ver Comanda Conjunta
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center justify-center gap-1.5">
                              {/* Botão de Extrato Discriminado da Cliente / Gestão */}
                              <button
                                onClick={() => setExtratoComandaAppt(ag)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                                  isMultiProf
                                    ? 'bg-gold/15 text-gold border border-gold/40 hover:bg-gold hover:text-black'
                                    : 'bg-foreground/10 hover:bg-foreground/20 text-foreground border border-border-subtle'
                                }`}
                                title="Ver demonstrativo discriminado completo do atendimento com procedimentos, profissionais, descontos e insumos"
                              >
                                <Receipt size={13} />
                                {isMultiProf ? 'Extrato Discriminado' : 'Extrato'}
                              </button>

                              {isPendingConfirmation ? (
                                <>
                                  <button
                                    onClick={() => handleConfirmarGestao(ag)}
                                    disabled={actionLoadingId === ag.id}
                                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center gap-1 shadow-sm shadow-emerald-600/30 disabled:opacity-50"
                                    title="Confirmar conferência e contabilizar oficialmente no financeiro"
                                  >
                                    <CheckCircle2 size={13} />
                                    {actionLoadingId === ag.id ? 'Gravando...' : 'Confirmar'}
                                  </button>
                                  <button
                                    onClick={() => handleAbrirAjusteModal(ag)}
                                    className="p-1.5 rounded-lg text-xs font-medium bg-foreground/10 hover:bg-foreground/20 text-foreground transition-colors border border-border-subtle"
                                    title="Ajustar valor ou forma de pagamento antes de confirmar"
                                  >
                                    <Edit3 size={13} />
                                  </button>
                                </>
                              ) : isConfirmed ? (
                                <>
                                  {cpfCliente ? (
                                    <Link
                                      href={`/admin/notas-fiscais?cpf=${cpfCliente.replace(/\D/g, '')}&agendamentoId=${ag.id}`}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-gold/10 text-gold border border-gold/30 hover:bg-gold hover:text-black transition-colors"
                                      title="Emitir Nota Fiscal para este atendimento contabilizado"
                                    >
                                      <FileText size={13} /> Emitir NF
                                    </Link>
                                  ) : (
                                    <Link
                                      href="/admin/clientes"
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200"
                                      title="Cadastre o CPF do cliente na aba Clientes para emitir nota"
                                    >
                                      <AlertTriangle size={12} /> Cadastrar CPF
                                    </Link>
                                  )}
                                </>
                              ) : (
                                <span className="text-xs text-stone-400 font-semibold">—</span>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardGlass>
      </div>

      {/* MODAL DE EXTRATO DISCRIMINADO DO ATENDIMENTO (COMANDA MULTI-PROFISSIONAL) */}
      {extratoComandaAppt && (() => {
        const ag = extratoComandaAppt;
        const cli = clientes.find(c => c.id === ag.cliente_id);
        const comanda = ag.comanda_unificada;
        const isMulti = Boolean(comanda && comanda.procedimentos && comanda.procedimentos.length > 0);

        // Procedimentos a listar
        const procedimentos = isMulti 
          ? comanda!.procedimentos 
          : [{
              servico_id: ag.servico_id,
              servico_nome: getServicoNome(ag.servico_id, servicos),
              profissional_id: ag.profissional_id,
              profissional_nome: getProfissionalNome(ag.profissional_id, profissionais),
              preco_tabela: getServicoPreco(ag.servico_id, servicos),
              desconto_pct: 0,
              desconto_valor: 0,
              desconto_motivo: '',
              insumos_custo: Number(ag.product_cost) || 0
            }];

        const subtotalServicos = procedimentos.reduce((acc: number, p) => acc + p.preco_tabela, 0);
        const totalDescontos = procedimentos.reduce((acc: number, p) => acc + p.desconto_valor, 0);
        const produtosComprados = comanda?.produtos_comprados || [];
        const totalProdutos = produtosComprados.reduce((acc: number, prod: any) => acc + (Number(prod.preco_unitario || prod.preco || 0) * Number(prod.quantidade || prod.qty || 1)), 0);
        const totalInsumos = procedimentos.reduce((acc: number, p: any) => acc + (Number(p.insumos_custo) || 0), 0) + (Number(ag.product_cost) || 0);
        const valorFinalCliente = (ag.total_amount != null && Number(ag.total_amount) > 0)
          ? Number(ag.total_amount)
          : (subtotalServicos - totalDescontos + totalProdutos);

        // Agrupamento por profissional para o demonstrativo da gestora
        const profIds = Array.from(new Set(procedimentos.map(p => p.profissional_id)));
        const discriminadoProfissionais = profIds.map(pid => {
          const procsProf = procedimentos.filter(p => p.profissional_id === pid);
          const profObj = profissionais.find(p => p.id === pid);
          const somaTabela = procsProf.reduce((a: number, b) => a + b.preco_tabela, 0);
          const somaDesconto = procsProf.reduce((a: number, b) => a + b.desconto_valor, 0);
          const somaInsumos = procsProf.reduce((a: number, b: any) => a + (Number(b.insumos_custo) || 0), 0);
          const liquidoBase = Math.max(0, somaTabela - somaDesconto - somaInsumos);
          const pctComissao = Number(profObj?.comissao_padrao) || 40;
          const valorComissao = (liquidoBase * pctComissao) / 100;

          return {
            profissional_id: pid,
            profissional_nome: profObj?.nome || 'Profissional',
            especialidade: profObj?.cargo || 'Especialista',
            procedimentos: procsProf,
            somaTabela,
            somaDesconto,
            somaInsumos,
            liquidoBase,
            pctComissao,
            valorComissao,
          };
        });

        const isPending = ag.status === 'concluido' && ag.financial_status === 'PENDING_CONFIRMATION';

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-[#121214] border border-gold/40 rounded-2xl w-full max-w-2xl my-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              
              {/* Header do Extrato */}
              <div className="flex items-center justify-between p-5 border-b border-white/10 bg-gradient-to-r from-gold/10 via-transparent to-transparent">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gold/20 border border-gold/40 flex items-center justify-center text-gold shadow-sm">
                    <Receipt size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                      Extrato Discriminado do Atendimento
                    </h3>
                    <p className="text-xs text-foreground/60">
                      {isMulti ? 'Comanda Multi-Profissional Consolidada' : 'Atendimento Individual do Salão'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setExtratoComandaAppt(null)}
                  className="text-foreground/50 hover:text-foreground p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Conteúdo do Extrato */}
              <div className="p-5 space-y-5 overflow-y-auto flex-1 text-sm custom-scrollbar">
                
                {/* Cartão de Identificação da Cliente e Atendimento */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-foreground/50 font-medium">Cliente</p>
                    <p className="font-bold text-base text-foreground mt-0.5">{cli?.nome || 'Cliente'}</p>
                    <p className="text-foreground/60 font-mono mt-0.5">
                      {cli?.cpf ? `CPF: ${cli.cpf}` : 'Sem CPF informado'} {cli?.telefone ? `• ${cli.telefone}` : ''}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-foreground/50 font-medium">Data e Horário</p>
                    <p className="font-bold text-foreground mt-0.5">
                      {ag.data ? new Date(ag.data + 'T12:00:00').toLocaleDateString('pt-BR') : 'Hoje'} às {ag.hora_inicio || '—'}
                    </p>
                    <div className="mt-1 flex items-center sm:justify-end gap-1.5">
                      <span className="text-foreground/50">Forma:</span>
                      <span className="font-semibold text-gold uppercase">{ag.payment_method || 'Não definida'}</span>
                      <span className="text-foreground/30">•</span>
                      <span className={`font-bold ${ag.financial_status === 'CONFIRMED' ? 'text-emerald-700' : 'text-amber-800'}`}>
                        {ag.financial_status === 'CONFIRMED' ? 'Contabilizado' : 'Aguardando Gestão'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* TABELA DE PROCEDIMENTOS DISCRIMINADOS E PROFISSIONAIS EXECUTORES */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Scissors size={14} className="text-gold" />
                      Procedimentos Realizados ({procedimentos.length})
                    </h4>
                    <span className="text-[11px] text-foreground/70 font-medium">
                      Discriminado por profissional com descontos aplicados
                    </span>
                  </div>

                  <div className="rounded-xl border border-white/10 overflow-hidden bg-black/20">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-white/5 border-b border-white/10 text-foreground/70 font-bold">
                          <th className="p-3">Procedimento</th>
                          <th className="p-3">Profissional</th>
                          <th className="p-3 text-right">Tabela</th>
                          <th className="p-3 text-right">Desconto Prof.</th>
                          <th className="p-3 text-right">Líquido Procedimento</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {procedimentos.map((p, idx) => {
                          const liquido = p.preco_tabela - p.desconto_valor;
                          return (
                            <tr key={idx} className="hover:bg-white/[0.02]">
                              <td className="p-3">
                                <p className="font-bold text-foreground">{p.servico_nome}</p>
                                {p.desconto_motivo && (
                                  <p className="text-[10px] text-amber-800 font-semibold italic mt-0.5">
                                    Motivo desconto: "{p.desconto_motivo}"
                                  </p>
                                )}
                              </td>
                              <td className="p-3">
                                <span className="font-medium text-foreground/90">{p.profissional_nome}</span>
                              </td>
                              <td className="p-3 text-right font-mono text-foreground/70">
                                R$ {p.preco_tabela.toFixed(2)}
                              </td>
                              <td className="p-3 text-right">
                                {p.desconto_valor > 0 ? (
                                  <span className="font-bold text-amber-800 font-mono">
                                    -R$ {p.desconto_valor.toFixed(2)} ({p.desconto_pct}%)
                                  </span>
                                ) : (
                                  <span className="text-foreground/30 font-mono">—</span>
                                )}
                              </td>
                              <td className="p-3 text-right font-bold text-foreground font-mono">
                                R$ {liquido.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* PRODUTOS USADOS E PRODUTOS COMPRADOS PELA CLIENTE */}
                {(produtosComprados.length > 0 || totalInsumos > 0) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Produtos Insumos Usados */}
                    {totalInsumos > 0 && (
                      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                          <Beaker size={14} className="text-amber-700" /> Fundo de Reserva de Insumos / Produtos
                        </div>
                        <p className="text-[11px] text-foreground/70 leading-relaxed font-medium">
                          Produtos utilizados durante a execução dos serviços (coloração, oxigenada, pós, ampolas).
                        </p>
                        <p className="font-mono font-bold text-amber-900 text-sm pt-1">
                          R$ {totalInsumos.toFixed(2)}
                        </p>
                      </div>
                    )}

                    {/* Produtos Home Care Comprados */}
                    {produtosComprados.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/30 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900">
                          <ShoppingBag size={14} className="text-teal-700" /> Produtos Comprados (Home Care)
                        </div>
                        <div className="space-y-1 pt-1">
                          {produtosComprados.map((prod: any, pIdx: number) => (
                            <div key={pIdx} className="flex items-center justify-between text-xs">
                              <span className="text-foreground/80 font-medium">{prod.nome || prod.name} (x{prod.quantidade || prod.qty || 1})</span>
                              <span className="font-mono text-teal-800 font-bold">
                                R$ {((Number(prod.preco_unitario || prod.preco || 0)) * (Number(prod.quantidade || prod.qty || 1))).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* DEMONSTRATIVO DISCRIMINADO PARA A GESTORA DO SALÃO */}
                <div className="p-4 rounded-xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-gold/30 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <h4 className="text-xs font-bold text-gold uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-gold" />
                      Demonstrativo Discriminado da Gestora do Salão
                    </h4>
                    <span className="text-[10px] text-foreground/50 font-mono font-semibold">
                      Auditoria de Comissões e Repartição
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {discriminadoProfissionais.map((dp, dIdx) => (
                      <div key={dIdx} className="p-3 rounded-lg bg-black/40 border border-white/5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                            👑 {dp.profissional_nome}
                            <span className="text-[11px] text-foreground/50 font-normal">({dp.especialidade})</span>
                          </span>
                          <span className="text-xs font-mono font-bold text-emerald-600">
                            Comissão Estimada: R$ {dp.valorComissao.toFixed(2)} ({dp.pctComissao}%)
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-foreground/70 pt-0.5">
                          <div>
                            <span className="text-foreground/50 block">Tabela Bruta:</span>
                            R$ {dp.somaTabela.toFixed(2)}
                          </div>
                          <div>
                            <span className="text-foreground/50 block">Desconto Próprio:</span>
                            {dp.somaDesconto > 0 ? `-R$ ${dp.somaDesconto.toFixed(2)}` : 'R$ 0,00'}
                          </div>
                          <div>
                            <span className="text-foreground/50 block">Base Líquida:</span>
                            R$ {dp.liquidoBase.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* RESUMO TOTALIZADOR DO FECHAMENTO */}
                <div className="p-4 rounded-xl bg-gold/10 border border-gold/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-xs text-foreground/80 w-full sm:w-auto">
                    <div className="flex justify-between sm:justify-start sm:gap-6">
                      <span>Subtotal Procedimentos:</span>
                      <span className="font-mono font-bold">R$ {subtotalServicos.toFixed(2)}</span>
                    </div>
                    {totalDescontos > 0 && (
                      <div className="flex justify-between sm:justify-start sm:gap-6 text-amber-800 font-bold">
                        <span>(-) Total Descontos dos Profissionais:</span>
                        <span className="font-mono font-bold">-R$ {totalDescontos.toFixed(2)}</span>
                      </div>
                    )}
                    {totalProdutos > 0 && (
                      <div className="flex justify-between sm:justify-start sm:gap-6 text-teal-800 font-bold">
                        <span>(+) Produtos Adicionais:</span>
                        <span className="font-mono font-bold">+R$ {totalProdutos.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-center sm:text-right w-full sm:w-auto border-t sm:border-t-0 border-white/10 pt-2 sm:pt-0">
                    <span className="text-xs text-foreground/60 font-semibold uppercase tracking-wider block">
                      Valor Total a Pagar pela Cliente
                    </span>
                    <span className="text-2xl font-black text-gold font-mono tracking-tight">
                      R$ {valorFinalCliente.toFixed(2)}
                    </span>
                  </div>
                </div>

              </div>

              {/* Footer com Ações */}
              <div className="p-4 border-t border-white/10 bg-black/40 flex flex-wrap items-center justify-between gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => window.print()}
                  className="gap-1.5 text-xs text-foreground/70 hover:text-foreground"
                >
                  <Printer size={15} /> Imprimir Comprovante
                </Button>

                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setExtratoComandaAppt(null)}
                  >
                    Fechar
                  </Button>

                  {isPending && (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={actionLoadingId === ag.id}
                      onClick={() => handleConfirmarGestao(ag)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold border-none gap-1.5 shadow-lg shadow-emerald-600/30"
                    >
                      <CheckCircle2 size={16} />
                      {actionLoadingId === ag.id ? 'Gravando...' : 'Confirmar & Contabilizar'}
                    </Button>
                  )}
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* MODAL DE AJUSTE E CONFERÊNCIA DA GESTÃO */}
      {editingApptGestao && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-gold/40 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <ShieldCheck size={20} className="text-gold" />
                Conferência & Ajuste da Gestão
              </h3>
              <button 
                onClick={() => setEditingApptGestao(null)}
                className="text-foreground/50 hover:text-foreground p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-2">
                <div>
                  <p className="text-xs text-foreground/50">Cliente</p>
                  <p className="font-bold text-foreground">
                    {clientes.find(c => c.id === editingApptGestao.cliente_id)?.nome || 'Cliente'}
                  </p>
                </div>

                {editingApptGestao.comanda_unificada ? (
                  <div>
                    <p className="text-xs text-foreground/50">Comanda Multi-Profissional</p>
                    <div className="mt-1 space-y-1">
                      {editingApptGestao.comanda_unificada.procedimentos.map((p, pIdx) => (
                        <div key={pIdx} className="flex justify-between text-xs bg-white/5 p-1.5 rounded">
                          <span>{p.servico_nome} ({p.profissional_nome})</span>
                          <span className="font-bold font-mono">R$ {(p.preco_tabela - p.desconto_valor).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-foreground/50">Procedimento Realizado</p>
                    <p className="font-medium text-foreground">
                      {getServicoNome(editingApptGestao.servico_id, servicos)}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-foreground/50">Equipe de Profissionais</p>
                  <p className="font-semibold text-gold text-xs">
                    👑 Titular: {getProfissionalNome(editingApptGestao.profissional_id, profissionais)}
                  </p>
                  {editingApptGestao.auxiliares_ids && editingApptGestao.auxiliares_ids.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {editingApptGestao.auxiliares_ids.map(aid => (
                        <span key={aid} className="text-[11px] px-2.5 py-0.5 rounded bg-purple-100 text-purple-950 font-bold border border-purple-300 flex items-center gap-1 shadow-xs">
                          <Users size={11} className="text-purple-800" /> {getProfissionalNome(aid, profissionais)} (Auxiliar)
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Resumo da Repartição do Salão (Fundo Produtos + Comissões + Líquido) */}
                {editingApptGestao.product_cost != null && Number(editingApptGestao.product_cost) > 0 && (
                  <div className="pt-2 border-t border-white/10 space-y-1">
                    <p className="text-[11px] font-bold text-amber-800 flex items-center gap-1">
                      <Beaker size={12} /> Fundo de Reserva de Produtos: R$ {Number(editingApptGestao.product_cost).toFixed(2)}
                    </p>
                    <p className="text-[10px] text-foreground/60 font-medium">
                      Custo total dos produtos por grama reservado para recompra de estoque.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs text-foreground/70 font-medium">Forma de Pagamento Conferida</label>
                <select
                  value={modalMetodo}
                  onChange={e => setModalMetodo(e.target.value)}
                  className="w-full bg-background border border-border-subtle rounded-lg px-3 py-2 text-sm text-foreground focus:border-gold outline-none"
                >
                  <option value="DINHEIRO">Dinheiro (Espécie)</option>
                  <option value="PIX">PIX</option>
                  <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                  <option value="CARTAO_DEBITO">Cartão de Débito</option>
                  <option value="OUTRO">Outro</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-foreground/70 font-medium">Valor Total Final (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={modalValor}
                  onChange={e => setModalValor(e.target.value)}
                  className="w-full bg-background border border-border-subtle rounded-lg px-3 py-2 text-sm text-foreground focus:border-gold outline-none font-bold text-emerald-500"
                  placeholder="0.00"
                />
                <p className="text-[11px] text-foreground/40">
                  Ajuste caso tenha havido diferença de cobrança na recepção.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <Button variant="ghost" size="sm" onClick={() => setEditingApptGestao(null)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={actionLoadingId === editingApptGestao.id}
                onClick={handleSalvarAjusteGestao}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold border-none gap-1.5"
              >
                <CheckCircle2 size={16} />
                {actionLoadingId === editingApptGestao.id ? 'Confirmando...' : 'Salvar & Contabilizar'}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
