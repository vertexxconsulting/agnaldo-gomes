'use client';

import { useState, useEffect } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/Button';
import { Plus, Trash2, X, Settings2 } from 'lucide-react';
import { fetchMarketingRules, createMarketingRule, deleteMarketingRule, fetchServicos } from '@/lib/supabase-queries';
import { Servico } from '@/lib/gestao-types';


export function RegrasMarketing() {
  const [regras, setRegras] = useState<any[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [nome, setNome] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [dias, setDias] = useState(1);
  const [timing, setTiming] = useState('AFTER');
  const [sendMethod, setSendMethod] = useState('AUTO');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    const [rules, srvs] = await Promise.all([
      fetchMarketingRules(),
      fetchServicos()
    ]);
    setRegras(rules);
    setServicos(srvs);
    setLoading(false);
  };

  const handleSalvar = async () => {
    if (!nome.trim()) {
      alert('Informe o nome da operação');
      return;
    }
    const payload = {
      name: nome,
      service_id: serviceId || null,
      days_offset: dias,
      trigger_timing: timing,
      send_method: sendMethod,
    };
    
    const res = await createMarketingRule(payload);
    if (res.ok) {
      alert('Regra criada com sucesso!');
      setIsModalOpen(false);
      setNome('');
      setServiceId('');
      setDias(1);
      carregarDados();
    } else {
      alert(res.error || 'Erro ao criar regra');
    }
  };

  const handleExcluir = async (id: string) => {
    if (!confirm('Deseja excluir esta regra?')) return;
    const res = await deleteMarketingRule(id);
    if (res.ok) {
      alert('Regra excluída!');
      carregarDados();
    } else {
      alert(res.error || 'Erro ao excluir');
    }
  };

  return (
    <>
      <Panel 
        title="Regras Personalizadas" 
        action={
          <Button variant="outline" size="sm" onClick={() => setIsModalOpen(true)}>
            <Plus size={14} className="mr-1" /> Nova Regra
          </Button>
        }
      >
        {loading ? (
          <p className="text-sm text-foreground/50 py-3">Carregando regras...</p>
        ) : regras.length === 0 ? (
          <p className="text-sm text-foreground/50 py-3">Nenhuma regra criada.</p>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {regras.map(r => (
              <div key={r.id} className="flex flex-col gap-2 p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)]">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Settings2 size={14} className="text-accent" /> {r.name}
                    </p>
                    <p className="text-xs text-foreground/70 mt-1">
                      {r.trigger_timing === 'BEFORE' ? 'Avisar ANTES de' : 'Avisar APÓS'} {r.days_offset} dia(s)
                      {' · '}
                      {r.service ? r.service.nome : 'Qualquer Serviço'}
                    </p>
                  </div>
                  <button onClick={() => handleExcluir(r.id)} className="text-danger/60 hover:text-danger p-1">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="mt-2 text-[10px] font-semibold">
                  <span className={`px-2 py-1 rounded-md ${r.send_method === 'AUTO' ? 'bg-success/10 text-success border border-success/20' : 'bg-primary/10 text-primary border border-primary/20'}`}>
                    Disparo: {r.send_method === 'AUTO' ? 'Automático (Evolution API)' : 'Manual (Link WhatsApp)'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-[var(--card)] sm:bg-[var(--background)] border border-[var(--border-subtle)] w-full max-w-md rounded-2xl p-6 shadow-xl relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-[var(--foreground)] mb-6">Nova Regra de Mensagem</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[var(--muted-foreground)] mb-1">Nome da Operação</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Retoque de Mechas 90d"
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--muted-foreground)] mb-1">Tipo de Serviço</label>
                <select
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                >
                  <option value="">Todos os Serviços</option>
                  {servicos.map(s => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm text-[var(--muted-foreground)] mb-1">Dias</label>
                  <input
                    type="number"
                    min="1"
                    value={dias}
                    onChange={(e) => setDias(Number(e.target.value))}
                    className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-[var(--muted-foreground)] mb-1">Momento</label>
                  <select
                    value={timing}
                    onChange={(e) => setTiming(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                  >
                    <option value="AFTER">Após o Serviço</option>
                    <option value="BEFORE">Antes do Agend.</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-[var(--muted-foreground)] mb-1">Forma de Disparo</label>
                <select
                  value={sendMethod}
                  onChange={(e) => setSendMethod(e.target.value)}
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                >
                  <option value="AUTO">Automático (Evolution API)</option>
                  <option value="MANUAL">Manual (Apenas Listar)</option>
                </select>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button variant="primary" onClick={handleSalvar}>Salvar Regra</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
