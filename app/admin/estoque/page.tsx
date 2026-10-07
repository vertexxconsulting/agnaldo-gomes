'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Package, Plus, Edit, Trash2, Search, AlertTriangle,
  TrendingDown, TrendingUp, ArrowUpDown, X, ChevronDown, ChevronUp,
  BarChart3, RefreshCw, ShoppingBag, Beaker, CheckCircle2
} from 'lucide-react';
import { SectionTitle } from '@/components/SectionTitle';
import { CardGlass } from '@/components/CardGlass';
import { Button } from '@/components/Button';
import { ViewToggle } from '@/components/ViewToggle';
import {
  fetchEstoque, salvarProdutoEstoque, registrarMovimentacao,
  fetchMovimentacoes,
} from '@/lib/supabase-queries';
import type { ProdutoEstoque, MovimentacaoEstoque, UnidadeEstoque } from '@/lib/gestao-types';

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

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    const [prods, movimentacoes] = await Promise.all([fetchEstoque(), fetchMovimentacoes()]);
    setProdutos(prods);
    setMovs(movimentacoes);
    setLoading(false);
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
              <Button variant="primary" onClick={() => abrirForm()}>
                <Plus size={16} className="mr-1.5" /> Novo Produto
              </Button>
              <button onClick={carregarDados} className="p-2.5 rounded-lg border border-[var(--border-subtle)] text-foreground/60 hover:text-gold hover:border-gold/40 transition-colors">
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
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-emerald-500/30 text-emerald-400 text-xs hover:bg-emerald-500/10 transition-colors">
                          <TrendingUp size={13} /> Entrada
                        </button>
                        <button onClick={() => abrirForm(p)}
                          className="p-2 rounded-lg border border-[var(--border-subtle)] text-foreground/60 hover:text-gold hover:border-gold/40 transition-colors">
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
    </div>
  );
}
