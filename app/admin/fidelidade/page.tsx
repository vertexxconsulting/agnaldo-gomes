'use client';

import { useState, useEffect } from 'react';
import { SectionTitle } from '@/components/SectionTitle';
import { CardGlass } from '@/components/CardGlass';
import { Button } from '@/components/Button';
import { atualizarServico, fetchEstoque, atualizarProdutoEstoqueParcial } from '@/lib/supabase-queries';
import { getServicos } from '@/lib/mock-data';
import type { Servico, ProdutoEstoque } from '@/lib/gestao-types';
import { Save, Gift, Coins, Package } from 'lucide-react';

export default function FidelidadePage() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [fidelidadeAtiva, setFidelidadeAtiva] = useState(true);
  const [loadingConfig, setLoadingConfig] = useState(true);

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
    const [dadosServicos, dadosProdutos] = await Promise.all([
      getServicos(),
      fetchEstoque(true)
    ]);
    setServicos(dadosServicos.sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nome.localeCompare(b.nome)));
    setProdutos(dadosProdutos);
    setLoading(false);
  };

  const handleUpdateServico = async (servicoId: string, reward: number) => {
    setSaving(servicoId);
    await atualizarServico(servicoId, {
      points_reward: reward,
    });
    setSaving(null);
    carregarDados();
  };

  const handleUpdateProduto = async (produtoId: string, cost: number) => {
    setSaving(produtoId);
    await atualizarProdutoEstoqueParcial(produtoId, {
      points_cost: cost,
    });
    setSaving(null);
    carregarDados();
  };

  return (
    <div className="space-y-6">
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
          <p className="font-semibold mb-1">Nova Dinâmica de Fidelidade</p>
          <p>
            O resgate de pontos agora é exclusivo para <strong>Produtos (Estoque)</strong>.
            <br/>• <strong>Ganho de Pontos:</strong> Os clientes acumulam pontos ao realizarem <strong>Serviços</strong>.
            <br/>• <strong>Resgate (Custo):</strong> Os clientes gastam os pontos para retirar <strong>Produtos</strong> gratuitamente da prateleira.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Tabela 1: GANHO DE PONTOS (SERVIÇOS) */}
        <CardGlass>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
              <Coins className="w-5 h-5 text-green-500" />
              Ganho de Pontos (Serviços)
            </h2>

            {loading ? (
              <p className="text-[var(--muted-foreground)]">Carregando serviços...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] text-[var(--muted-foreground)] text-sm">
                      <th className="pb-3 px-4 font-medium">Serviço</th>
                      <th className="pb-3 px-4 font-medium text-center">Pontos Ganhos</th>
                      <th className="pb-3 px-4 font-medium text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {servicos.map((s) => (
                      <ServicoFidelidadeRow 
                        key={s.id} 
                        servico={s} 
                        saving={saving === s.id}
                        onSave={handleUpdateServico} 
                      />
                    ))}
                    {servicos.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-[var(--muted-foreground)]">
                          Nenhum serviço cadastrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardGlass>

        {/* Tabela 2: RESGATE DE PRODUTOS */}
        <CardGlass>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-rose-500" />
              Custo de Resgate (Produtos)
            </h2>

            {loading ? (
              <p className="text-[var(--muted-foreground)]">Carregando produtos...</p>
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
                    {produtos.map((p) => (
                      <ProdutoFidelidadeRow 
                        key={p.id} 
                        produto={p} 
                        saving={saving === p.id}
                        onSave={handleUpdateProduto} 
                      />
                    ))}
                    {produtos.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-[var(--muted-foreground)]">
                          Nenhum produto cadastrado no estoque.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardGlass>
      </div>
    </div>
  );
}

function ServicoFidelidadeRow({ 
  servico, 
  saving,
  onSave 
}: { 
  servico: Servico; 
  saving: boolean;
  onSave: (id: string, reward: number) => void 
}) {
  const [reward, setReward] = useState(servico.points_reward?.toString() || '0');
  const isChanged = Number(reward) !== (servico.points_reward || 0);

  return (
    <tr className="border-b border-[var(--border-subtle)] hover:bg-[var(--background)]/50 transition-colors">
      <td className="py-4 px-4">
        <span className="font-medium text-[var(--foreground)]">{servico.nome}</span>
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center justify-center gap-2">
          <span className="text-green-500 font-semibold">+</span>
          <input 
            type="number" 
            value={reward}
            onChange={(e) => setReward(e.target.value)}
            className="w-20 bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-[var(--foreground)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none text-center"
            min="0"
          />
        </div>
      </td>
      <td className="py-4 px-4 text-right">
        {isChanged ? (
          <Button 
            size="sm" 
            disabled={saving}
            onClick={() => onSave(servico.id, Number(reward))}
            className="h-8"
          >
            {saving ? '...' : 'Salvar'}
          </Button>
        ) : (
          <Button size="sm" variant="ghost" disabled className="h-8 opacity-50">
            Salvo
          </Button>
        )}
      </td>
    </tr>
  );
}

function ProdutoFidelidadeRow({ 
  produto, 
  saving,
  onSave 
}: { 
  produto: ProdutoEstoque; 
  saving: boolean;
  onSave: (id: string, cost: number) => void 
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
            className="w-20 bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-[var(--foreground)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none text-center"
            min="0"
          />
        </div>
      </td>
      <td className="py-4 px-4 text-right">
        {isChanged ? (
          <Button 
            size="sm" 
            disabled={saving}
            onClick={() => onSave(produto.id, Number(cost))}
            className="h-8"
          >
            {saving ? '...' : 'Salvar'}
          </Button>
        ) : (
          <Button size="sm" variant="ghost" disabled className="h-8 opacity-50">
            Salvo
          </Button>
        )}
      </td>
    </tr>
  );
}
