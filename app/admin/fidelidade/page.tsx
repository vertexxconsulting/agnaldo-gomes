'use client';

import { useState, useEffect } from 'react';
import { SectionTitle } from '@/components/SectionTitle';
import { CardGlass } from '@/components/CardGlass';
import { Button } from '@/components/Button';
import { getServicos } from '@/lib/mock-data';
import { atualizarServico } from '@/lib/supabase-queries';
import type { Servico } from '@/lib/gestao-types';
import { Save, Gift, Coins, AlertCircle } from 'lucide-react';

export default function FidelidadePage() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [fidelidadeAtiva, setFidelidadeAtiva] = useState(true);
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    carregarServicos();
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
      setFidelidadeAtiva(!novoStatus); // reverte em caso de erro
    }
  };

  const carregarServicos = async () => {
    setLoading(true);
    const data = await getServicos();
    setServicos(data.sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nome.localeCompare(b.nome)));
    setLoading(false);
  };

  const handleUpdate = async (servicoId: string, reward: number, cost: number) => {
    setSaving(servicoId);
    await atualizarServico(servicoId, {
      points_reward: reward,
      points_cost: cost
    });
    setSaving(null);
    carregarServicos(); // recarrega para atualizar a UI
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
          <p className="font-semibold mb-1">Configuração de Pontuação dos Serviços</p>
          <p>
            Defina nesta tela como os clientes acumulam e utilizam os pontos ao realizar serviços no Studio.
            <br/>• <strong>Pontos Ganhos:</strong> Quantidade de pontos que a cliente recebe automaticamente após a conclusão e o pagamento deste serviço.
            <br/>• <strong>Custo de Resgate:</strong> Quantidade de pontos necessários para que a cliente possa trocar pelo serviço gratuitamente ou usá-los como desconto.
          </p>
        </div>
      </div>

      <CardGlass>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
            <Coins className="w-5 h-5 text-[var(--accent)]" />
            Configuração de Pontos por Serviço
          </h2>

          {loading ? (
            <p className="text-[var(--muted-foreground)]">Carregando serviços...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[var(--muted-foreground)] text-sm">
                    <th className="pb-3 px-4 font-medium">Serviço</th>
                    <th className="pb-3 px-4 font-medium">Categoria</th>
                    <th className="pb-3 px-4 font-medium">Pontos Ganhos</th>
                    <th className="pb-3 px-4 font-medium">Custo (Resgate)</th>
                    <th className="pb-3 px-4 font-medium text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {servicos.map((s) => (
                    <ServicoFidelidadeRow 
                      key={s.id} 
                      servico={s} 
                      saving={saving === s.id}
                      onSave={handleUpdate} 
                    />
                  ))}
                  {servicos.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[var(--muted-foreground)]">
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
  onSave: (id: string, reward: number, cost: number) => void 
}) {
  const [reward, setReward] = useState(servico.points_reward?.toString() || '0');
  const [cost, setCost] = useState(servico.points_cost?.toString() || '0');

  const isChanged = Number(reward) !== (servico.points_reward || 0) || Number(cost) !== (servico.points_cost || 0);

  return (
    <tr className="border-b border-[var(--border-subtle)] hover:bg-[var(--background)]/50 transition-colors">
      <td className="py-4 px-4">
        <span className="font-medium text-[var(--foreground)]">{servico.nome}</span>
        {!servico.ativo && <span className="ml-2 text-xs bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full">Inativo</span>}
      </td>
      <td className="py-4 px-4 text-[var(--muted-foreground)]">
        <span className="bg-[var(--background)] border border-[var(--border-subtle)] px-2 py-1 rounded-md text-xs">
          {servico.categoria}
        </span>
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          <span className="text-green-500 font-semibold">+</span>
          <input 
            type="number" 
            value={reward}
            onChange={(e) => setReward(e.target.value)}
            className="w-20 bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-[var(--foreground)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none"
            min="0"
          />
        </div>
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          <span className="text-rose-500 font-semibold">-</span>
          <input 
            type="number" 
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            className="w-20 bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-[var(--foreground)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none"
            min="0"
          />
        </div>
      </td>
      <td className="py-4 px-4 text-right">
        {isChanged ? (
          <Button 
            size="sm" 
            disabled={saving}
            onClick={() => onSave(servico.id, Number(reward), Number(cost))}
            className="h-8"
          >
            {saving ? 'Salvando...' : 'Salvar'}
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
