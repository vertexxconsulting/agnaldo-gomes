'use client';

import { useState, useEffect } from 'react';
import { SectionTitle } from '@/components/SectionTitle';
import { CardGlass } from '@/components/CardGlass';
import { Button } from '@/components/Button';
import { fetchEstoque, atualizarProdutoEstoqueParcial, salvarProdutoEstoque } from '@/lib/supabase-queries';
import type { ProdutoEstoque } from '@/lib/gestao-types';
import { Gift, Package, Plus, X } from 'lucide-react';

export default function FidelidadePage() {
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const [fidelidadeAtiva, setFidelidadeAtiva] = useState(true);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Modal de Adicionar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [addMode, setAddMode] = useState<'existente' | 'novo'>('existente');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [newPointsCost, setNewPointsCost] = useState('');
  const [savingNew, setSavingNew] = useState(false);

  useEffect(() => {
    carregarDados();
    carregarConfig();
  }, []);

  const carregarConfig = async () => {
    try {
      const res = await fetch('/api/admin/loja/settings');
      if (res.ok) {
        const data = await res.json();
        setFidelidadeAtiva(data.fidelidade_ativa ?? true);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingConfig(false);
  };

  const toggleFidelidade = async () => {
    const novoStatus = !fidelidadeAtiva;
    setFidelidadeAtiva(novoStatus);
    try {
      const res = await fetch('/api/admin/loja/settings');
      const current = await res.json();

      await fetch('/api/admin/loja/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...current, fidelidade_ativa: novoStatus }),
      });
    } catch (e) {
      console.error('Erro ao salvar config:', e);
      setFidelidadeAtiva(!novoStatus);
    }
  };

  const carregarDados = async () => {
    setLoading(true);
    const dadosProdutos = await fetchEstoque(false);
    setProdutos(dadosProdutos);
    setLoading(false);
  };

  const handleUpdateProduto = async (produtoId: string, cost: number) => {
    setSaving(produtoId);
    await atualizarProdutoEstoqueParcial(produtoId, { points_cost: cost });
    setSaving(null);
    carregarDados();
  };

  const handleRemoveProduto = async (produtoId: string) => {
    setSaving(produtoId);
    // Remover do resgate = colocar pontos como 0 (ou null)
    await atualizarProdutoEstoqueParcial(produtoId, { points_cost: 0 });
    setSaving(null);
    carregarDados();
  };

  const handleAddProduto = async () => {
    const cost = Number(newPointsCost);
    if (!cost || cost <= 0) {
      alert('Informe um custo em pontos válido.');
      return;
    }

    setSavingNew(true);

    if (addMode === 'existente') {
      if (!selectedProductId) {
        alert('Selecione um produto.');
        setSavingNew(false);
        return;
      }
      await atualizarProdutoEstoqueParcial(selectedProductId, { points_cost: cost });
    } else {
      if (!newProductName.trim()) {
        alert('Informe o nome do produto.');
        setSavingNew(false);
        return;
      }
      // Criar novo produto direto no estoque como "Fidelidade"
      await salvarProdutoEstoque({
        name: newProductName.trim(),
        category: 'Fidelidade',
        unit: 'un',
        stock_qty: 0,
        cost_price: 0,
        allow_sale: false,
        allow_procedure_use: false,
        active: true,
        points_cost: cost
      });
    }

    setSavingNew(false);
    setIsModalOpen(false);
    setNewPointsCost('');
    setNewProductName('');
    setSelectedProductId('');
    carregarDados();
  };

  // Produtos que estão no programa de fidelidade (points_cost > 0)
  const produtosResgate = produtos.filter(p => (p.points_cost || 0) > 0);
  
  // Produtos do estoque que ainda NÃO estão no programa
  const produtosDisponiveis = produtos.filter(p => (p.points_cost || 0) <= 0);

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <SectionTitle title="Programa de Fidelidade" />
        
        {!loadingConfig && (
          <button 
            onClick={toggleFidelidade}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
              fidelidadeAtiva 
                ? 'bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25' 
                : 'bg-red-500/15 text-red-500 hover:bg-red-500/25'
            }`}
          >
            {fidelidadeAtiva ? '🟢 Fidelidade Ativa' : '🔴 Fidelidade Desativada'}
          </button>
        )}
      </div>

      <div className="bg-[var(--accent)]/10 text-[var(--accent)] p-4 rounded-xl flex gap-3 items-start border border-[var(--accent)]/20">
        <Gift className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold mb-1">Catálogo de Resgate</p>
          <p>
            Adicione produtos do seu estoque que as clientes podem resgatar usando seus pontos de fidelidade. 
            Você também pode criar produtos exclusivos de resgate.
          </p>
        </div>
      </div>

      <CardGlass>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-[var(--foreground)] flex items-center gap-2">
              <Package className="w-5 h-5 text-rose-500" />
              Produtos Disponíveis para Resgate
            </h2>
            <Button size="sm" onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Adicionar Produto
            </Button>
          </div>

          {loading ? (
            <p className="text-[var(--muted-foreground)]">Carregando catálogo...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[var(--muted-foreground)] text-sm">
                    <th className="pb-3 px-4 font-medium">Produto</th>
                    <th className="pb-3 px-4 font-medium text-center">Custo (Pontos)</th>
                    <th className="pb-3 px-4 font-medium text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {produtosResgate.map((p) => (
                    <ProdutoFidelidadeRow 
                      key={p.id} 
                      produto={p} 
                      saving={saving === p.id}
                      onSave={handleUpdateProduto} 
                      onRemove={handleRemoveProduto}
                    />
                  ))}
                  {produtosResgate.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-[var(--muted-foreground)]">
                        Nenhum produto cadastrado para resgate.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardGlass>

      {/* MODAL DE ADICIONAR PRODUTO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card)] sm:bg-[var(--background)] border border-[var(--border-subtle)] w-full max-w-md rounded-2xl p-6 shadow-xl relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-[var(--foreground)] mb-6">Adicionar ao Resgate</h2>

            <div className="flex gap-2 mb-6 bg-[var(--background)] border border-[var(--border-subtle)] p-1 rounded-lg">
              <button
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${addMode === 'existente' ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
                onClick={() => setAddMode('existente')}
              >
                Do Estoque
              </button>
              <button
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${addMode === 'novo' ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
                onClick={() => setAddMode('novo')}
              >
                Criar Novo
              </button>
            </div>

            <div className="space-y-4">
              {addMode === 'existente' ? (
                <div>
                  <label className="block text-sm text-[var(--muted-foreground)] mb-1">Selecione um Produto</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[var(--foreground)] outline-none focus:border-[var(--accent)] overflow-hidden text-ellipsis whitespace-nowrap"
                  >
                    <option value="">-- Selecione --</option>
                    {produtosDisponiveis.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name.length > 35 ? p.name.substring(0, 35) + '...' : p.name} (Estoque: {p.stock_qty})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm text-[var(--muted-foreground)] mb-1">Nome do Produto Especial</label>
                  <input
                    type="text"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    placeholder="Ex: Copo Térmico Personalizado"
                    className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                  />
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">Este produto será criado no estoque na categoria "Fidelidade".</p>
                </div>
              )}

              <div>
                <label className="block text-sm text-[var(--muted-foreground)] mb-1">Custo para Resgate (Pontos)</label>
                <input
                  type="number"
                  min="1"
                  value={newPointsCost}
                  onChange={(e) => setNewPointsCost(e.target.value)}
                  placeholder="Ex: 500"
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                />
              </div>

              <Button 
                className="w-full mt-2" 
                onClick={handleAddProduto}
                disabled={savingNew}
              >
                {savingNew ? 'Adicionando...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProdutoFidelidadeRow({ 
  produto, 
  saving,
  onSave,
  onRemove
}: { 
  produto: ProdutoEstoque; 
  saving: boolean;
  onSave: (id: string, cost: number) => void;
  onRemove: (id: string) => void;
}) {
  const [cost, setCost] = useState(produto.points_cost?.toString() || '0');
  const isChanged = Number(cost) !== (produto.points_cost || 0);

  return (
    <tr className="border-b border-[var(--border-subtle)] hover:bg-[var(--background)]/50 transition-colors">
      <td className="py-4 px-4">
        <span className="font-medium text-[var(--foreground)]">{produto.name}</span>
        <div className="text-xs text-[var(--muted-foreground)]">Estoque: {produto.stock_qty} {produto.unit}</div>
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center justify-center gap-2">
          <span className="text-rose-500 font-semibold">-</span>
          <input 
            type="number" 
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            className="w-24 bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-[var(--foreground)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none text-center"
            min="1"
          />
        </div>
      </td>
      <td className="py-4 px-4 text-right space-x-2">
        {isChanged && (
          <Button 
            size="sm" 
            disabled={saving}
            onClick={() => onSave(produto.id, Number(cost))}
            className="h-8"
          >
            {saving ? '...' : 'Salvar'}
          </Button>
        )}
        <Button 
          size="sm" 
          variant="outline"
          className="h-8 text-red-500 border-red-500/20 hover:bg-red-500/10"
          disabled={saving}
          onClick={() => {
            if (window.confirm(`Remover "${produto.name}" do programa de fidelidade?`)) {
              onRemove(produto.id);
            }
          }}
        >
          Remover
        </Button>
      </td>
    </tr>
  );
}
