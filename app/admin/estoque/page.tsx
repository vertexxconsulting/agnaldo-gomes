'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Package, Plus, Edit, Trash2, Search, AlertTriangle,
  TrendingDown, TrendingUp, ArrowUpDown, X, ChevronDown, ChevronUp,
  BarChart3, RefreshCw, ShoppingBag, Beaker, CheckCircle2,
  Percent, Tag, DollarSign, User2
} from 'lucide-react';
import { SectionTitle } from '@/components/SectionTitle';
import { CardGlass } from '@/components/CardGlass';
import { Button } from '@/components/Button';
import { ViewToggle } from '@/components/ViewToggle';
import {
  fetchEstoque, salvarProdutoEstoque, registrarMovimentacao,
  fetchMovimentacoes, fetchClientes, fetchProfissionais, criarComissao
} from '@/lib/supabase-queries';
import type { ProdutoEstoque, MovimentacaoEstoque, UnidadeEstoque, Cliente, Profissional, FormaPagamento } from '@/lib/gestao-types';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtQty = (v: number, u: string) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${u}`;

type Aba = 'produtos' | 'movimentacoes' | 'alertas';
type MovTipo = 'IN' | 'OUT_SALE' | 'OUT_PROCEDURE' | 'ADJUSTMENT';

const MOV_LABELS: Record<MovTipo, { label: string; cor: string }> = {
  IN: { label: 'Entrada', cor: 'text-emerald-400 bg-emerald-500/10' },
  OUT_SALE: { label: 'Venda', cor: 'text-blue-400 bg-blue-500/10' },
  OUT_PROCEDURE: { label: 'Insumo', cor: 'text-amber-400 bg-amber-500/10' },
  ADJUSTMENT: { label: 'Ajuste', cor: 'text-purple-400 bg-purple-500/10' },
};

const CATEGORIAS_SUGERIDAS = ['Química', 'Coloração', 'Tratamento', 'Cuidados', 'Revenda', 'Higiene', 'Equipamentos'];

export interface ItemVendaSalao {
  id: string;
  inventory_id: string;
  name: string;
  brand?: string | null;
  category: string;
  unit: string;
  qty: number;
  precoUnit: number;
  stock_qty: number;
  cost_price: number;
}

function estoqueBadge(p: ProdutoEstoque) {
  if (p.stock_qty <= 0) return { label: 'Zerado', cor: 'bg-red-500/15 text-red-400' };
  const alerta = p.stock_alert_qty ?? 0;
  if (alerta > 0 && p.stock_qty <= alerta) return { label: 'Baixo', cor: 'bg-amber-500/15 text-amber-400' };
  return { label: 'OK', cor: 'bg-emerald-500/15 text-emerald-400' };
}

const FORM_VAZIO = {
  name: '', brand: '', category: '', unit: 'g' as UnidadeEstoque,
  stock_qty: 0, stock_alert_qty: 50, cost_price: 0, sale_price: '',
  price_per_gram: '', allow_sale: false, allow_procedure_use: true,
  active: true, notes: '',
};

export default function EstoquePage() {
  const [aba, setAba] = useState<Aba>('produtos');
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>([]);
  const [movs, setMovs] = useState<MovimentacaoEstoque[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [catFiltro, setCatFiltro] = useState('todas');
  const [tipFiltro, setTipFiltro] = useState<'todos' | 'insumo' | 'venda'>('todos');

  // Form / Modal
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<ProdutoEstoque | null>(null);
  const [form, setForm] = useState({ ...FORM_VAZIO });
  const [salvando, setSalvando] = useState(false);

  // Entrada rápida
  const [showEntrada, setShowEntrada] = useState<ProdutoEstoque | null>(null);
  const [entradaQty, setEntradaQty] = useState('');
  const [entradaNota, setEntradaNota] = useState('');
  const [entradaSalvando, setEntradaSalvando] = useState(false);

  // Venda de Produtos no Salão (Carrinho com Múltiplos Produtos + Desconto Sincronizado)
  const [showVenda, setShowVenda] = useState(false);
  const [vendaItens, setVendaItens] = useState<ItemVendaSalao[]>([]);
  const [addProdSelectId, setAddProdSelectId] = useState<string>('');
  const [addProdQty, setAddProdQty] = useState<string>('1');
  const [addProdPrecoUnit, setAddProdPrecoUnit] = useState<string>('');
  const [vendaDescPct, setVendaDescPct] = useState<string>('');
  const [vendaDescValor, setVendaDescValor] = useState<string>('');
  const [vendaClienteId, setVendaClienteId] = useState<string>('');
  const [vendaClienteNome, setVendaClienteNome] = useState<string>('');
  const [vendaProfissionalId, setVendaProfissionalId] = useState<string>('');
  const [vendaPagamento, setVendaPagamento] = useState<FormaPagamento>('DINHEIRO');
  const [vendaParcelas, setVendaParcelas] = useState<number>(1);
  const [vendaObs, setVendaObs] = useState<string>('');
  const [vendaSalvando, setVendaSalvando] = useState<boolean>(false);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    const [prods, movimentacoes, clis, profs] = await Promise.all([
      fetchEstoque(),
      fetchMovimentacoes(),
      fetchClientes(),
      fetchProfissionais()
    ]);
    setProdutos(prods);
    setMovs(movimentacoes);
    setClientes(clis);
    setProfissionais(profs);
    setLoading(false);
  };

  // Ações de Venda de Produto no Salão com Múltiplos Itens e Desconto Sincronizado
  const abrirVenda = (p?: ProdutoEstoque) => {
    setAddProdSelectId('');
    setAddProdQty('1');
    setAddProdPrecoUnit('');
    setVendaDescPct('');
    setVendaDescValor('');
    setVendaClienteId('');
    setVendaClienteNome('');
    setVendaProfissionalId('');
    setVendaPagamento('DINHEIRO');
    setVendaParcelas(1);
    setVendaObs('');

    if (p) {
      const preco = p.sale_price != null ? p.sale_price : (p.cost_price || 0);
      setVendaItens([{
        id: `item-${p.id}-${Date.now()}`,
        inventory_id: p.id,
        name: p.name,
        brand: p.brand,
        category: p.category,
        unit: p.unit,
        qty: 1,
        precoUnit: preco,
        stock_qty: p.stock_qty,
        cost_price: p.cost_price,
      }]);
    } else {
      setVendaItens([]);
    }
    setShowVenda(true);
  };

  const subtotalVenda = useMemo(() => {
    return vendaItens.reduce((acc, it) => acc + (it.precoUnit * it.qty), 0);
  }, [vendaItens]);

  const totalItensVenda = useMemo(() => {
    return vendaItens.reduce((acc, it) => acc + it.qty, 0);
  }, [vendaItens]);

  const handleSelectAddProd = (pid: string) => {
    setAddProdSelectId(pid);
    const prod = produtos.find(p => p.id === pid);
    if (prod) {
      const preco = prod.sale_price != null ? prod.sale_price.toString() : (prod.cost_price?.toString() || '0');
      setAddProdPrecoUnit(preco);
    } else {
      setAddProdPrecoUnit('');
    }
  };

  const handleAdicionarItemVenda = () => {
    if (!addProdSelectId) return alert('Selecione um produto para adicionar à venda.');
    const prod = produtos.find(p => p.id === addProdSelectId);
    if (!prod) return;

    const q = Math.max(1, parseInt(addProdQty) || 1);
    const preco = addProdPrecoUnit !== '' ? (parseFloat(addProdPrecoUnit) || 0) : (prod.sale_price || 0);

    const existenteIdx = vendaItens.findIndex(it => it.inventory_id === prod.id);
    if (existenteIdx >= 0) {
      setVendaItens(prev => {
        const copy = [...prev];
        copy[existenteIdx] = {
          ...copy[existenteIdx],
          qty: copy[existenteIdx].qty + q,
          precoUnit: preco,
        };
        return copy;
      });
    } else {
      setVendaItens(prev => [
        ...prev,
        {
          id: `item-${prod.id}-${Date.now()}`,
          inventory_id: prod.id,
          name: prod.name,
          brand: prod.brand,
          category: prod.category,
          unit: prod.unit,
          qty: q,
          precoUnit: preco,
          stock_qty: prod.stock_qty,
          cost_price: prod.cost_price,
        }
      ]);
    }

    setAddProdSelectId('');
    setAddProdQty('1');
    setAddProdPrecoUnit('');
  };

  const removerItemVenda = (id: string) => {
    setVendaItens(prev => prev.filter(it => it.id !== id));
  };

  const alterarQtyItemVenda = (id: string, delta: number) => {
    setVendaItens(prev => prev.map(it => {
      if (it.id === id) {
        const novaQ = Math.max(1, it.qty + delta);
        return { ...it, qty: novaQ };
      }
      return it;
    }));
  };

  const handleVendaDescPct = (pctStr: string) => {
    setVendaDescPct(pctStr);
    const p = parseFloat(pctStr);
    if (isNaN(p) || p <= 0) {
      setVendaDescValor('');
    } else {
      const clamped = Math.min(100, Math.max(0, p));
      const val = (subtotalVenda * clamped) / 100;
      setVendaDescValor(val.toFixed(2));
    }
  };

  const handleVendaDescValor = (valStr: string) => {
    setVendaDescValor(valStr);
    const v = parseFloat(valStr);
    if (isNaN(v) || v <= 0 || subtotalVenda <= 0) {
      setVendaDescPct('');
    } else {
      const clampedVal = Math.min(subtotalVenda, Math.max(0, v));
      const p = (clampedVal / subtotalVenda) * 100;
      setVendaDescPct(p % 1 === 0 ? p.toFixed(0) : p.toFixed(1));
    }
  };

  // Se o subtotal mudar com adição/remoção de itens, recalcula desconto sincronizado
  useEffect(() => {
    if (vendaDescPct) {
      const p = parseFloat(vendaDescPct);
      if (!isNaN(p) && p > 0) {
        const val = (subtotalVenda * p) / 100;
        setVendaDescValor(val > 0 ? val.toFixed(2) : '');
      } else {
        setVendaDescValor('');
      }
    } else if (vendaDescValor) {
      const v = parseFloat(vendaDescValor);
      if (!isNaN(v) && v > 0 && subtotalVenda > 0) {
        if (v > subtotalVenda) {
          setVendaDescValor(subtotalVenda.toFixed(2));
          setVendaDescPct('100');
        } else {
          const p = (v / subtotalVenda) * 100;
          setVendaDescPct(p % 1 === 0 ? p.toFixed(0) : p.toFixed(1));
        }
      }
    }
  }, [subtotalVenda]);

  const valorDescVenda = Math.min(subtotalVenda, Math.max(0, parseFloat(vendaDescValor) || 0));
  const totalFinalVenda = Math.max(0, subtotalVenda - valorDescVenda);

  const registrarVenda = async () => {
    if (vendaItens.length === 0) {
      return alert('Adicione pelo menos um produto ao carrinho de venda.');
    }

    const semEstoque = vendaItens.filter(it => it.stock_qty < it.qty);
    if (semEstoque.length > 0) {
      const nomes = semEstoque.map(it => `• ${it.name} (Qtd a vender: ${it.qty}, Estoque atual: ${it.stock_qty})`).join('\n');
      if (!confirm(`Atenção: Os seguintes produtos têm quantidade maior que o estoque atual:\n\n${nomes}\n\nDeseja prosseguir com a venda mesmo assim?`)) {
        return;
      }
    }

    setVendaSalvando(true);
    try {
      const cliNome = vendaClienteId
        ? (clientes.find(c => c.id === vendaClienteId)?.nome || 'Cliente')
        : (vendaClienteNome || 'Cliente Balcão');
      const profNome = vendaProfissionalId
        ? (profissionais.find(p => p.id === vendaProfissionalId)?.nome || '')
        : '';
      
      const descTxt = valorDescVenda > 0
        ? ` | Desconto Geral: -${fmt(valorDescVenda)} (${vendaDescPct || '0'}%)`
        : '';

      const resumoItens = vendaItens.map(it => `${it.qty}x ${it.name}`).join(', ');
      const obsTxt = `Venda Salão (${vendaItens.length} itens): ${resumoItens} | Cliente: ${cliNome}${profNome ? ` (Vendedor: ${profNome})` : ''} | Pag: ${vendaPagamento}${descTxt}${vendaObs ? ` | Obs: ${vendaObs}` : ''}`;

      // 1. Registrar saída por venda no estoque (OUT_SALE) para cada produto
      for (const item of vendaItens) {
        await registrarMovimentacao(item.inventory_id, 'OUT_SALE', item.qty, {
          notes: obsTxt,
          unitCost: item.cost_price,
        });
      }

      // 2. Se houver profissional vendedor, registrar comissão com valor líquido pós-desconto
      if (vendaProfissionalId) {
        const hojeIso = new Date().toISOString().split('T')[0];
        await criarComissao({
          appointmentId: `venda-balcao-${Date.now()}`,
          professionalId: vendaProfissionalId,
          serviceId: '',
          totalAmount: totalFinalVenda,
          paymentMethod: vendaPagamento,
          installments: vendaPagamento === 'CREDITO' ? vendaParcelas : 1,
          appointmentDate: hojeIso,
        });
      }

      await carregarDados();
      setShowVenda(false);
      alert(
        `Venda no Salão registrada com sucesso!\n\n` +
        `Produtos vendidos (${totalItensVenda} un):\n` +
        vendaItens.map(it => `• ${it.name} (${it.qty}x ${fmt(it.precoUnit)}) = ${fmt(it.precoUnit * it.qty)}`).join('\n') +
        `\n\nSubtotal: ${fmt(subtotalVenda)}` +
        (valorDescVenda > 0 ? `\nDesconto: -${fmt(valorDescVenda)} (${vendaDescPct || '0'}%)` : '') +
        `\nTotal Líquido a Pagar: ${fmt(totalFinalVenda)}` +
        `\n\nEstoque atualizado e comissão registrada.`
      );
    } catch (err: any) {
      console.error('Erro ao registrar venda:', err);
      alert(`Erro ao registrar venda: ${err?.message || 'Erro desconhecido'}`);
    } finally {
      setVendaSalvando(false);
    }
  };

  const categoriasExistentes = [...new Set(produtos.map(p => p.category))].sort();
  const allCategories = [...new Set([...CATEGORIAS_SUGERIDAS, ...categoriasExistentes])].sort();
  const marcas = [...new Set(produtos.map(p => p.brand).filter(Boolean))].sort();

  const filtrados = useMemo(() => {
    return produtos.filter(p => {
      const matchBusca = p.name.toLowerCase().includes(busca.toLowerCase()) ||
        (p.brand ?? '').toLowerCase().includes(busca.toLowerCase());
      const matchCat = catFiltro === 'todas' || p.category === catFiltro;
      const matchTip = tipFiltro === 'todos' ||
        (tipFiltro === 'insumo' && p.allow_procedure_use) ||
        (tipFiltro === 'venda' && p.allow_sale);
      return matchBusca && matchCat && matchTip;
    });
  }, [produtos, busca, catFiltro, tipFiltro]);

  const alertas = useMemo(() =>
    produtos.filter(p => p.active && p.stock_alert_qty != null && p.stock_qty <= (p.stock_alert_qty ?? 0)),
    [produtos]
  );

  const abrirForm = (p?: ProdutoEstoque) => {
    if (p) {
      setEditando(p);
      setForm({
        name: p.name, brand: p.brand ?? '', category: p.category,
        unit: p.unit, stock_qty: p.stock_qty, stock_alert_qty: p.stock_alert_qty ?? 50,
        cost_price: p.cost_price, sale_price: p.sale_price?.toString() ?? '',
        price_per_gram: p.price_per_gram?.toString() ?? '',
        allow_sale: p.allow_sale, allow_procedure_use: p.allow_procedure_use,
        active: p.active, notes: p.notes ?? '',
      });
    } else {
      setEditando(null);
      setForm({ ...FORM_VAZIO });
    }
    setShowForm(true);
  };

  const salvar = async () => {
    if (!form.name || !form.category) return alert('Nome e categoria são obrigatórios.');
    setSalvando(true);
    const payload: Omit<ProdutoEstoque, 'id' | 'created_at' | 'updated_at'> = {
      name: form.name, brand: form.brand || null, category: form.category,
      unit: form.unit, stock_qty: Number(form.stock_qty), stock_alert_qty: Number(form.stock_alert_qty) || null,
      cost_price: Number(form.cost_price),
      sale_price: form.sale_price !== '' ? Number(form.sale_price) : null,
      price_per_gram: form.price_per_gram !== '' ? Number(form.price_per_gram) : null,
      allow_sale: form.allow_sale, allow_procedure_use: form.allow_procedure_use,
      active: form.active, image_url: null, notes: form.notes || null,
    };
    const res = await salvarProdutoEstoque(payload, editando?.id);
    if (res.ok) {
      await carregarDados();
      setShowForm(false);
    } else {
      alert(`Erro: ${res.error}`);
    }
    setSalvando(false);
  };

  const registrarEntrada = async () => {
    if (!showEntrada || !entradaQty || Number(entradaQty) <= 0) return;
    setEntradaSalvando(true);
    await registrarMovimentacao(showEntrada.id, 'IN', Number(entradaQty), { notes: entradaNota || 'Entrada manual' });
    await carregarDados();
    setShowEntrada(null);
    setEntradaQty('');
    setEntradaNota('');
    setEntradaSalvando(false);
  };

  // KPIs
  const totalProdutos = produtos.filter(p => p.active).length;
  const totalEmEstoque = produtos.reduce((s, p) => s + p.stock_qty * p.cost_price, 0);
  const produtosVenda = produtos.filter(p => p.allow_sale && p.active).length;

  return (
    <div className="py-8">
      <div className="container mx-auto px-6">
        <SectionTitle title="Estoque do Salão" subtitle="Insumos · Produtos para Venda · Movimentações" align="left" />

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 mb-6">
          {[
            { icon: Package, label: 'Produtos Ativos', value: totalProdutos, cor: 'text-gold' },
            { icon: BarChart3, label: 'Valor em Estoque', value: fmt(totalEmEstoque), cor: 'text-emerald-400' },
            { icon: ShoppingBag, label: 'Para Venda', value: produtosVenda, cor: 'text-blue-400' },
            { icon: AlertTriangle, label: 'Alertas Baixo', value: alertas.length, cor: alertas.length > 0 ? 'text-amber-400' : 'text-foreground/40' },
          ].map((k, i) => (
            <CardGlass key={i} className="p-4 flex items-center gap-3">
              <k.icon size={22} className={k.cor} />
              <div>
                <p className="text-xs text-foreground/50">{k.label}</p>
                <p className={`text-lg font-bold ${k.cor}`}>{k.value}</p>
              </div>
            </CardGlass>
          ))}
        </div>

        {/* NAVEGAÇÃO DE ABAS PADRONIZADA */}
        <div className="border-b border-[var(--border-subtle)] mb-8">
          <nav className="flex space-x-2 sm:space-x-8 -mb-px overflow-x-auto scrollbar-none" aria-label="Abas de Estoque">
            {[
              { id: 'produtos', label: 'Produtos em Estoque', icon: Package, badge: produtos.length },
              { id: 'movimentacoes', label: 'Movimentações', icon: ArrowUpDown, badge: movs.length },
              { id: 'alertas', label: 'Alertas de Reposição', icon: AlertTriangle, badge: alertas.length },
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

        {/* ABA: PRODUTOS */}
        {aba === 'produtos' && (
          <>
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" size={16} />
                <input value={busca} onChange={e => setBusca(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-lg text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-gold"
                  placeholder="Buscar produto ou marca..." />
              </div>
              <select value={catFiltro} onChange={e => setCatFiltro(e.target.value)}
                className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold">
                <option value="todas">Todas categorias</option>
                {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={tipFiltro} onChange={e => setTipFiltro(e.target.value as any)}
                className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold">
                <option value="todos">Todos os tipos</option>
                <option value="insumo">Só insumos</option>
                <option value="venda">Só para venda</option>
              </select>
              <Button variant="outline" className="text-blue-400 border-blue-500/30 hover:bg-blue-500/10" onClick={() => abrirVenda()}>
                <ShoppingBag size={16} className="mr-1.5" /> Venda no Salão
              </Button>
              <Button variant="primary" onClick={() => abrirForm()}>
                <Plus size={16} className="mr-1.5" /> Novo Produto
              </Button>
              <button onClick={carregarDados} className="p-2.5 rounded-lg border border-[var(--border-subtle)] text-foreground/60 hover:text-gold hover:border-gold/40 transition-colors" title="Atualizar estoque">
                <RefreshCw size={16} />
              </button>
            </div>

            {loading ? (
              <div className="text-center py-10 text-foreground/40">Carregando estoque...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtrados.map(p => {
                  const badge = estoqueBadge(p);
                  return (
                    <CardGlass key={p.id} className={`p-4 ${!p.active ? 'opacity-50' : ''}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">{p.name}</h3>
                          {p.brand && <p className="text-xs text-foreground/50">{p.brand}</p>}
                        </div>
                        <div className="flex items-center gap-1.5 ml-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.cor}`}>{badge.label}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-foreground/8 text-foreground/60">{p.category}</span>
                        {p.allow_procedure_use && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 flex items-center gap-1">
                            <Beaker size={10} /> Insumo
                          </span>
                        )}
                        {p.allow_sale && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 flex items-center gap-1">
                            <ShoppingBag size={10} /> Venda
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <div>
                          <p className="text-xs text-foreground/50">Em Estoque</p>
                          <p className="font-bold text-foreground">{fmtQty(p.stock_qty, p.unit)}</p>
                          {p.stock_alert_qty && <p className="text-xs text-foreground/40">alerta: {fmtQty(p.stock_alert_qty, p.unit)}</p>}
                        </div>
                        <div>
                          <p className="text-xs text-foreground/50">Custo/{p.unit === 'un' ? 'un' : p.unit}</p>
                          <p className="font-bold text-gold">
                            {p.price_per_gram != null
                              ? `${fmt(p.price_per_gram)}/${p.unit}`
                              : fmt(p.cost_price)}
                          </p>
                          {p.sale_price && <p className="text-xs text-blue-400">Venda: {fmt(p.sale_price)}</p>}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button onClick={() => { setShowEntrada(p); setEntradaQty(''); setEntradaNota(''); }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-emerald-500/30 text-emerald-400 text-xs hover:bg-emerald-500/10 transition-colors"
                          title="Registrar entrada de estoque">
                          <TrendingUp size={13} /> Entrada
                        </button>
                        {p.allow_sale && (
                          <button onClick={() => abrirVenda(p)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-blue-500/30 text-blue-400 text-xs hover:bg-blue-500/10 transition-colors"
                            title="Vender produto no salão">
                            <ShoppingBag size={13} /> Vender
                          </button>
                        )}
                        <button onClick={() => abrirForm(p)}
                          className="p-2 rounded-lg border border-[var(--border-subtle)] text-foreground/60 hover:text-gold hover:border-gold/40 transition-colors"
                          title="Editar produto">
                          <Edit size={13} />
                        </button>
                      </div>
                    </CardGlass>
                  );
                })}
                {filtrados.length === 0 && (
                  <div className="col-span-3 text-center py-12 text-foreground/40">
                    <Package size={40} className="mx-auto mb-3 opacity-30" />
                    Nenhum produto encontrado.
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ABA: MOVIMENTAÇÕES */}
        {aba === 'movimentacoes' && (
          <CardGlass className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-foreground/40 text-xs uppercase tracking-wider border-b border-[var(--border-subtle)]">
                  <th className="py-3 pr-4">Data</th>
                  <th className="py-3 pr-4">Produto</th>
                  <th className="py-3 pr-4">Tipo</th>
                  <th className="py-3 pr-4">Quantidade</th>
                  <th className="py-3 pr-4">Obs.</th>
                </tr>
              </thead>
              <tbody>
                {movs.slice(0, 100).map(m => {
                  const prod = produtos.find(p => p.id === m.inventory_id);
                  const mt = MOV_LABELS[m.type as MovTipo] ?? { label: m.type, cor: 'text-foreground/60 bg-foreground/10' };
                  const sinal = m.type === 'IN' ? '+' : '-';
                  return (
                    <tr key={m.id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-foreground/5">
                      <td className="py-3 pr-4 text-foreground/60 whitespace-nowrap">
                        {new Date(m.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 pr-4 font-medium">{prod?.name ?? m.inventory_id.slice(0, 8)}</td>
                      <td className="py-3 pr-4"><span className={`text-xs px-2 py-0.5 rounded-full ${mt.cor}`}>{mt.label}</span></td>
                      <td className="py-3 pr-4 font-bold font-mono">
                        <span className={m.type === 'IN' ? 'text-emerald-400' : 'text-red-400'}>
                          {sinal}{fmtQty(m.qty, prod?.unit ?? 'g')}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-foreground/50 text-xs">{m.notes || m.created_by || '—'}</td>
                    </tr>
                  );
                })}
                {movs.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-foreground/40">Nenhuma movimentação registrada.</td></tr>
                )}
              </tbody>
            </table>
          </CardGlass>
        )}

        {/* ABA: ALERTAS */}
        {aba === 'alertas' && (
          <div className="space-y-3">
            {alertas.length === 0 ? (
              <CardGlass className="text-center py-12">
                <CheckCircle2 size={40} className="mx-auto mb-3 text-emerald-400 opacity-70" />
                <p className="text-foreground/60">Todos os produtos estão com estoque adequado!</p>
              </CardGlass>
            ) : alertas.map(p => {
              const badge = estoqueBadge(p);
              return (
                <CardGlass key={p.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={18} className="text-amber-400 shrink-0" />
                    <div>
                      <p className="font-semibold">{p.name}</p>
                      <p className="text-xs text-foreground/50">{p.category} · Alerta: {fmtQty(p.stock_alert_qty ?? 0, p.unit)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-amber-400">{fmtQty(p.stock_qty, p.unit)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${badge.cor}`}>{badge.label}</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => { setShowEntrada(p); setEntradaQty(''); setEntradaNota(''); setAba('produtos'); }}>
                      <TrendingUp size={13} className="mr-1" /> Repor
                    </Button>
                  </div>
                </CardGlass>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: Formulário Produto */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/70 backdrop-blur-sm p-4">
          <CardGlass className="w-full max-w-2xl p-6 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold font-serif">{editando ? 'Editar Produto' : 'Novo Produto'}</h3>
              <button onClick={() => setShowForm(false)} className="text-foreground/50 hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nome */}
              <div className="sm:col-span-2">
                <label className="block text-xs text-foreground/60 mb-1">Nome do Produto *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm focus:outline-none focus:border-gold" placeholder="ex: Botox Capilar 1kg" />
              </div>
              {/* Marca */}
              <div>
                <label className="block text-xs text-foreground/60 mb-1">Marca</label>
                <input value={form.brand} onChange={e => {
                  const newBrand = e.target.value;
                  setForm(f => {
                    const nextForm = { ...f, brand: newBrand };
                    // Se não tiver categoria e digitou/selecionou uma marca conhecida, tenta puxar a categoria automaticamente
                    if (!f.category && newBrand) {
                      const prodMesmaMarca = produtos.find(p => p.brand === newBrand);
                      if (prodMesmaMarca) {
                        nextForm.category = prodMesmaMarca.category;
                      }
                    }
                    return nextForm;
                  });
                }}
                  list="brand-sugest" className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm focus:outline-none focus:border-gold" placeholder="ex: Wella" />
                <datalist id="brand-sugest">{marcas.map(m => <option key={m as string} value={m as string} />)}</datalist>
              </div>
              {/* Categoria */}
              <div>
                <label className="block text-xs text-foreground/60 mb-1">Categoria *</label>
                <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  list="cat-sugest" className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm focus:outline-none focus:border-gold" placeholder="ex: Química" />
                <datalist id="cat-sugest">{allCategories.map(c => <option key={c} value={c} />)}</datalist>
              </div>
              {/* Unidade */}
              <div>
                <label className="block text-xs text-foreground/60 mb-1">Unidade de Medida</label>
                <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value as UnidadeEstoque }))}
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm focus:outline-none focus:border-gold">
                  <option value="g">Gramas (g)</option>
                  <option value="ml">Mililitros (ml)</option>
                  <option value="un">Unidade (un)</option>
                </select>
              </div>
              {/* Estoque */}
              <div>
                <label className="block text-xs text-foreground/60 mb-1">Qtd em Estoque</label>
                <input type="number" min={0} step={0.1} value={form.stock_qty} onChange={e => setForm(f => ({ ...f, stock_qty: Number(e.target.value) }))}
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm focus:outline-none focus:border-gold" />
              </div>
              {/* Alerta */}
              <div>
                <label className="block text-xs text-foreground/60 mb-1">Alerta de Estoque Mínimo</label>
                <input type="number" min={0} step={0.1} value={form.stock_alert_qty} onChange={e => setForm(f => ({ ...f, stock_alert_qty: Number(e.target.value) }))}
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm focus:outline-none focus:border-gold" />
              </div>
              {/* Custo */}
              <div>
                <label className="block text-xs text-foreground/60 mb-1">Preço de Custo (R$)</label>
                <input type="number" min={0} step={0.01} value={form.cost_price} onChange={e => setForm(f => ({ ...f, cost_price: Number(e.target.value) }))}
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm focus:outline-none focus:border-gold" />
              </div>
              {/* Custo/g */}
              <div>
                <label className="block text-xs text-foreground/60 mb-1">Custo por {form.unit} (R$) <span className="text-foreground/40">— para pesagem</span></label>
                <input type="number" min={0} step={0.0001} value={form.price_per_gram} onChange={e => setForm(f => ({ ...f, price_per_gram: e.target.value }))}
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm focus:outline-none focus:border-gold" placeholder="ex: 0.16" />
              </div>

              {/* Flags */}
              <div className="sm:col-span-2 flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.allow_procedure_use} onChange={e => setForm(f => ({ ...f, allow_procedure_use: e.target.checked }))} className="accent-gold" />
                  <span className="text-sm">Usado como insumo em procedimentos</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.allow_sale} onChange={e => setForm(f => ({ ...f, allow_sale: e.target.checked }))} className="accent-gold" />
                  <span className="text-sm">Disponível para venda direta</span>
                </label>
              </div>
              {/* Preço de venda */}
              {form.allow_sale && (
                <div className="sm:col-span-2">
                  <label className="block text-xs text-foreground/60 mb-1">Preço de Venda (R$)</label>
                  <input type="number" min={0} step={0.01} value={form.sale_price} onChange={e => setForm(f => ({ ...f, sale_price: e.target.value }))}
                    className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm focus:outline-none focus:border-gold" placeholder="ex: 45.00" />
                </div>
              )}
              {/* Notas */}
              <div className="sm:col-span-2">
                <label className="block text-xs text-foreground/60 mb-1">Observações</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm focus:outline-none focus:border-gold resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <Button variant="ghost" className="flex-1" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button variant="primary" className="flex-1" onClick={salvar} disabled={salvando}>
                {salvando ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Criar Produto'}
              </Button>
            </div>
          </CardGlass>
        </div>
      )}

      {/* MODAL: Entrada de Estoque */}
      {showEntrada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/70 backdrop-blur-sm p-4">
          <CardGlass className="w-full max-w-sm p-6 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold font-serif">Entrada de Estoque</h3>
              <button onClick={() => setShowEntrada(null)} className="text-foreground/50 hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="mb-3 p-3 bg-foreground/5 rounded-lg">
              <p className="font-semibold">{showEntrada.name}</p>
              <p className="text-sm text-foreground/50">Estoque atual: {fmtQty(showEntrada.stock_qty, showEntrada.unit)}</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-foreground/60 mb-1">Quantidade ({showEntrada.unit})</label>
                <input type="number" min={0.1} step={0.1} value={entradaQty} onChange={e => setEntradaQty(e.target.value)}
                  autoFocus className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm focus:outline-none focus:border-gold" placeholder={`Qtd em ${showEntrada.unit}`} />
              </div>
              <div>
                <label className="block text-xs text-foreground/60 mb-1">Observação</label>
                <input value={entradaNota} onChange={e => setEntradaNota(e.target.value)}
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm focus:outline-none focus:border-gold" placeholder="ex: Compra NF 123" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <Button variant="ghost" className="flex-1" onClick={() => setShowEntrada(null)}>Cancelar</Button>
              <Button variant="primary" className="flex-1" onClick={registrarEntrada} disabled={entradaSalvando || !entradaQty}>
                <TrendingUp size={15} className="mr-1.5" /> {entradaSalvando ? 'Salvando...' : 'Registrar'}
              </Button>
            </div>
          </CardGlass>
        </div>
      )}

      {/* MODAL: Venda de Produtos no Salão (Balcão com Múltiplos Produtos e Desconto Sincronizado) */}
      {showVenda && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/70 backdrop-blur-sm p-4">
          <CardGlass className="w-full max-w-2xl p-6 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-serif text-foreground">Venda de Produtos no Salão (Balcão)</h3>
                  <p className="text-xs text-foreground/50">Selecione múltiplos produtos, acompanhe a soma e aplique o desconto no total</p>
                </div>
              </div>
              <button onClick={() => setShowVenda(false)} className="text-foreground/50 hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* 1. SELETOR PARA ADICIONAR PRODUTOS */}
              <div className="p-3.5 bg-foreground/[0.02] border border-[var(--border-subtle)] rounded-xl space-y-2.5">
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Plus size={14} className="text-blue-400" />
                  Adicionar Produto à Venda
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-6">
                    <select
                      value={addProdSelectId}
                      onChange={(e) => handleSelectAddProd(e.target.value)}
                      className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2 text-xs focus:outline-none focus:border-gold"
                    >
                      <option value="">Selecione o produto...</option>
                      {produtos.filter(p => p.active && p.allow_sale).map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.brand ? `(${p.brand})` : ''} — {fmt(p.sale_price || 0)} [{fmtQty(p.stock_qty, p.unit)}]
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qtd"
                      value={addProdQty}
                      onChange={(e) => setAddProdQty(e.target.value)}
                      className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2 text-xs text-center font-mono focus:outline-none focus:border-gold"
                      title="Quantidade"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Preço (R$)"
                        value={addProdPrecoUnit}
                        onChange={(e) => setAddProdPrecoUnit(e.target.value)}
                        className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2 text-xs font-mono focus:outline-none focus:border-gold"
                        title="Preço Unitário"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleAdicionarItemVenda}
                      className="w-full text-xs py-2 px-2.5 h-full flex items-center justify-center"
                      disabled={!addProdSelectId}
                    >
                      <Plus size={13} className="mr-1" />
                      Adicionar
                    </Button>
                  </div>
                </div>

                {addProdSelectId && (() => {
                  const prodPreview = produtos.find(p => p.id === addProdSelectId);
                  if (!prodPreview) return null;
                  return (
                    <div className="flex items-center justify-between text-[11px] text-foreground/50 px-1 pt-0.5">
                      <span>Categoria: <strong className="text-foreground/70">{prodPreview.category}</strong></span>
                      <span>Estoque disponível: <strong className={prodPreview.stock_qty <= 0 ? 'text-red-400' : 'text-emerald-400'}>{fmtQty(prodPreview.stock_qty, prodPreview.unit)}</strong></span>
                    </div>
                  );
                })()}
              </div>

              {/* 2. LISTA / CARRINHO DE PRODUTOS SELECIONADOS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ShoppingBag size={14} className="text-gold" />
                    Produtos Selecionados ({vendaItens.length})
                  </label>
                  {vendaItens.length > 0 && (
                    <span className="text-[11px] text-foreground/50">
                      Total de itens: <strong className="text-gold">{totalItensVenda} un.</strong>
                    </span>
                  )}
                </div>

                {vendaItens.length === 0 ? (
                  <div className="p-4 border border-dashed border-[var(--border-subtle)] rounded-xl text-center text-xs text-foreground/40">
                    Nenhum produto adicionado à venda ainda. Escolha um produto acima e clique em &ldquo;Adicionar&rdquo;.
                  </div>
                ) : (
                  <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden divide-y divide-[var(--border-subtle)]">
                    {vendaItens.map((item) => (
                      <div key={item.id} className="p-3 bg-foreground/[0.02] flex items-center justify-between gap-3 text-xs">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">{item.name}</p>
                          <p className="text-[11px] text-foreground/50">
                            {item.category} {item.brand ? `· ${item.brand}` : ''} · <span className="font-mono">{fmt(item.precoUnit)}/un</span>
                            {item.stock_qty < item.qty && (
                              <span className="text-amber-400 ml-2 font-bold">⚠️ Estoque: {fmtQty(item.stock_qty, item.unit)}</span>
                            )}
                          </p>
                        </div>

                        {/* Controles de Quantidade */}
                        <div className="flex items-center gap-1.5 bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => alterarQtyItemVenda(item.id, -1)}
                            className="w-6 h-6 rounded flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-foreground/5 text-xs font-bold"
                            title="Diminuir"
                          >
                            -
                          </button>
                          <span className="w-7 text-center font-mono font-bold text-foreground text-xs">
                            {item.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => alterarQtyItemVenda(item.id, 1)}
                            className="w-6 h-6 rounded flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-foreground/5 text-xs font-bold"
                            title="Aumentar"
                          >
                            +
                          </button>
                        </div>

                        {/* Subtotal do Item */}
                        <div className="text-right min-w-[70px]">
                          <p className="font-bold font-mono text-gold text-xs">
                            {fmt(item.precoUnit * item.qty)}
                          </p>
                        </div>

                        {/* Remover */}
                        <button
                          type="button"
                          onClick={() => removerItemVenda(item.id)}
                          className="text-red-400 hover:text-red-500 p-1 rounded hover:bg-red-500/10 transition-colors"
                          title="Remover produto da venda"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}

                    {/* Barra de Subtotal dos Itens */}
                    <div className="p-2.5 bg-foreground/[0.04] flex justify-between items-center text-xs px-3">
                      <span className="text-foreground/70 font-medium">Subtotal dos Produtos:</span>
                      <span className="font-bold font-mono text-foreground">{fmt(subtotalVenda)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. BOX DE DESCONTO COM SINCRONIZAÇÃO % <-> R$ */}
              <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Percent size={15} className="text-emerald-400" />
                    <span className="text-xs font-bold text-foreground">Desconto no Total da Venda</span>
                  </div>
                  {valorDescVenda > 0 && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold font-mono">
                      -{fmt(valorDescVenda)} ({vendaDescPct || '0'}%)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-foreground/60 mb-1 block">Porcentagem (%)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        placeholder="0"
                        value={vendaDescPct}
                        onChange={(e) => handleVendaDescPct(e.target.value)}
                        className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg py-2 pl-2.5 pr-7 text-xs focus:outline-none focus:border-emerald-500 font-mono"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground/40 text-[11px] font-bold">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-foreground/60 mb-1 block">Valor em Reais (R$)</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/40 text-[11px] font-bold">R$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="0.00"
                        value={vendaDescValor}
                        onChange={(e) => handleVendaDescValor(e.target.value)}
                        className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg py-2 pl-8 pr-2.5 text-xs focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Atalhos Rápidos de % */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-foreground/40 mr-1">Atalhos:</span>
                  {[
                    { label: '0%', val: '0' },
                    { label: '5%', val: '5' },
                    { label: '10%', val: '10' },
                    { label: '15%', val: '15' },
                    { label: '20%', val: '20' },
                    { label: '25%', val: '25' },
                    { label: '30%', val: '30' },
                  ].map(b => (
                    <button
                      key={b.val}
                      type="button"
                      onClick={() => handleVendaDescPct(b.val === '0' ? '' : b.val)}
                      className={`text-[11px] px-2 py-0.5 rounded border transition-all ${
                        (b.val === '0' && !vendaDescPct) || (vendaDescPct === b.val)
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 font-bold'
                          : 'border-[var(--border-subtle)] text-foreground/60 hover:border-emerald-500/30 hover:text-foreground'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. CLIENTE & PROFISSIONAL VENDEDOR */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-foreground/60 mb-1">Cliente (opcional)</label>
                  <select
                    value={vendaClienteId}
                    onChange={(e) => {
                      setVendaClienteId(e.target.value);
                      if (e.target.value) setVendaClienteNome('');
                    }}
                    className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2 text-xs focus:outline-none focus:border-gold mb-1"
                  >
                    <option value="">Selecionar cliente cadastrado...</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                  {!vendaClienteId && (
                    <input
                      type="text"
                      placeholder="Ou digite o nome do cliente..."
                      value={vendaClienteNome}
                      onChange={(e) => setVendaClienteNome(e.target.value)}
                      className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg py-1.5 px-2.5 text-xs focus:outline-none focus:border-gold"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs text-foreground/60 mb-1">Profissional Vendedor (Comissão)</label>
                  <select
                    value={vendaProfissionalId}
                    onChange={(e) => setVendaProfissionalId(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2 text-xs focus:outline-none focus:border-gold"
                  >
                    <option value="">Sem profissional (Venda direta salão)</option>
                    {profissionais.filter(p => p.ativo).map(p => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                  {vendaProfissionalId && (
                    <p className="text-[10px] text-gold mt-1">Gera comissão sobre o valor líquido pós-desconto</p>
                  )}
                </div>
              </div>

              {/* 5. FORMA DE PAGAMENTO */}
              <div>
                <label className="block text-xs text-foreground/60 mb-1.5">Forma de Pagamento</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { val: 'DINHEIRO', label: 'Dinheiro' },
                    { val: 'PIX', label: 'PIX' },
                    { val: 'DEBITO', label: 'Débito' },
                    { val: 'CREDITO', label: 'Crédito' },
                  ].map(fp => (
                    <button
                      key={fp.val}
                      type="button"
                      onClick={() => {
                        setVendaPagamento(fp.val as FormaPagamento);
                        if (fp.val !== 'CREDITO') setVendaParcelas(1);
                      }}
                      className={`py-2 px-1 text-xs rounded-lg border text-center font-medium transition-all ${
                        vendaPagamento === fp.val
                          ? 'border-blue-400 bg-blue-500/10 text-blue-400 font-bold'
                          : 'border-[var(--border-subtle)] text-foreground/60 hover:border-foreground/20'
                      }`}
                    >
                      {fp.label}
                    </button>
                  ))}
                </div>

                {vendaPagamento === 'CREDITO' && (
                  <div className="mt-2.5">
                    <p className="text-[11px] text-foreground/50 mb-1">Parcelas:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {[1, 2, 3, 4, 5, 6, 10, 12].map(n => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setVendaParcelas(n)}
                          className={`w-8 h-8 rounded text-xs font-bold border ${
                            vendaParcelas === n
                              ? 'border-blue-400 bg-blue-500/20 text-blue-400'
                              : 'border-[var(--border-subtle)] text-foreground/50'
                          }`}
                        >
                          {n}x
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 6. OBSERVAÇÕES */}
              <div>
                <label className="block text-xs text-foreground/60 mb-1">Observações (opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Brinde promocional, venda balcão..."
                  value={vendaObs}
                  onChange={(e) => setVendaObs(e.target.value)}
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2 text-xs focus:outline-none focus:border-gold"
                />
              </div>

              {/* 7. RESUMO FINANCEIRO */}
              <div className="p-3.5 bg-foreground/[0.03] border border-[var(--border-subtle)] rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between text-foreground/60">
                  <span>Subtotal dos Produtos ({totalItensVenda} un)</span>
                  <span className="font-mono">{fmt(subtotalVenda)}</span>
                </div>
                {valorDescVenda > 0 && (
                  <div className="flex justify-between text-emerald-400 font-semibold">
                    <span>Desconto ({vendaDescPct || '0'}%)</span>
                    <span className="font-mono">- {fmt(valorDescVenda)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-[var(--border-subtle)]">
                  <span className="text-sm font-bold text-foreground">Total Líquido a Pagar:</span>
                  <span className="text-xl font-bold font-serif text-gold font-mono">{fmt(totalFinalVenda)}</span>
                </div>
                {vendaPagamento === 'CREDITO' && vendaParcelas > 1 && (
                  <p className="text-right text-[11px] text-blue-400">
                    {vendaParcelas}x de {fmt(totalFinalVenda / vendaParcelas)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <Button variant="ghost" className="flex-1" onClick={() => setShowVenda(false)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={registrarVenda}
                disabled={vendaSalvando || vendaItens.length === 0}
              >
                <ShoppingBag size={15} className="mr-1.5" />
                {vendaSalvando ? 'Gravando...' : `Confirmar Venda (${totalItensVenda} un)`}
              </Button>
            </div>
          </CardGlass>
        </div>
      )}
    </div>
  );
}
