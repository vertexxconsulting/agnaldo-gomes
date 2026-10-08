'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Clock, CheckCircle2, Play, Plus, X, ShoppingBag, ArrowRight, Share2 
} from 'lucide-react';
import { SectionHeader, Panel, CardGlass } from '@/components/ui/Panel';
import { Button } from '@/components/Button';
import { fetchClientes, fetchAgendamentos, fetchServicos } from '@/lib/supabase-queries';
import type { Cliente, Agendamento, Servico } from '@/lib/gestao-types';

// Mock IDs for the professional (will be replaced by real auth logic)
const PROFISSIONAL_ID = 'a0000001-0000-0000-0000-000000000001';

export default function MeuPainelPage() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [insumosModalOpen, setInsumosModalOpen] = useState(false);
  const [upsellModalOpen, setUpsellModalOpen] = useState(false);
  const [activeAgendamento, setActiveAgendamento] = useState<Agendamento | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [ags, cls, srvs] = await Promise.all([
        fetchAgendamentos({ data_inicio: new Date().toISOString().split('T')[0] }),
        fetchClientes(),
        fetchServicos(),
      ]);
      setAgendamentos(ags);
      setClientes(cls);
      setServicos(srvs);
      setLoading(false);
    }
    loadData();
  }, []);

  const hoje = new Date().toISOString().split('T')[0];

  const meusAgendamentosHoje = useMemo(() => {
    return agendamentos
      .filter(a => a.profissional_id === PROFISSIONAL_ID && a.data === hoje)
      .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
  }, [agendamentos, hoje]);

  const emAtendimento = meusAgendamentosHoje.filter(a => a.status === 'em_atendimento');
  const proximos = meusAgendamentosHoje.filter(a => a.status === 'pendente' || a.status === 'confirmado');
  const concluidos = meusAgendamentosHoje.filter(a => a.status === 'concluido');

  const getClienteNome = (id: string) => clientes.find(c => c.id === id)?.nome || 'Cliente não encontrado';
  const getServicoNome = (id: string) => servicos.find(s => s.id === id)?.nome || 'Serviço excluído';

  const iniciarAtendimento = async (id: string) => {
    // Na vida real: call API to change status to 'em_atendimento'
    setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status: 'em_atendimento' } : a));
  };

  const encerrarAtendimento = async (id: string) => {
    // Na vida real: call API to change status to 'concluido' / trigger notification to secretary
    setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status: 'concluido' } : a));
    alert('Atendimento encerrado e enviado para a recepção (Aguardando Pagamento)!');
  };

  if (loading) {
    return <div className="p-8 text-center text-foreground/50">Carregando painel...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <SectionHeader
        title="Meu Painel Interativo"
        description="Controle seus atendimentos em andamento, lance insumos e feche as comandas da sua cadeira."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUNA ESQUERDA: Cadeira Atual & Multitarefas */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            Na Cadeira Agora
          </h2>

          {emAtendimento.length === 0 ? (
            <CardGlass className="p-8 text-center text-foreground/50 border-dashed">
              Nenhuma cliente na cadeira no momento.
            </CardGlass>
          ) : (
            <div className="space-y-4">
              {emAtendimento.map(ag => (
                <CardGlass key={ag.id} className="p-0 overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
                  
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-2xl font-bold text-foreground">
                          {getClienteNome(ag.cliente_id)}
                        </h3>
                        <p className="text-foreground/70">{getServicoNome(ag.servico_id)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-foreground/50">Iniciado às</p>
                        <p className="text-xl font-mono text-foreground">{ag.hora_inicio}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-6">
                      <Button 
                        variant="secondary" 
                        className="bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
                        onClick={() => { setActiveAgendamento(ag); setInsumosModalOpen(true); }}
                      >
                        <Plus size={16} /> Lançar Insumos
                      </Button>

                      <Button 
                        variant="secondary" 
                        onClick={() => { setActiveAgendamento(ag); setUpsellModalOpen(true); }}
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
              ))}
            </div>
          )}

          <h2 className="text-xl font-bold mt-8">Vitrine de Afiliado</h2>
          <CardGlass className="p-6">
            <p className="text-sm text-foreground/70 mb-4">
              Gere links de produtos para suas clientes com seu código de comissão embutido.
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => alert('Abriria o catálogo de produtos para enviar pro WhatsApp')}>
                <Share2 size={16} /> Abrir Catálogo para Compartilhar
              </Button>
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

      {/* MODAL INSUMOS (Placeholder) */}
      {insumosModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <CardGlass className="w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Lançar Insumos</h3>
              <button onClick={() => setInsumosModalOpen(false)}><X className="text-foreground/50 hover:text-foreground" /></button>
            </div>
            <p className="text-sm text-foreground/60 mb-4">
              Lance aqui os produtos que você usou no cabelo da cliente (ex: coloração, pó descolorante). Isso descontará do estoque do salão.
            </p>
            <div className="space-y-4">
              <div className="p-3 border border-[var(--border-subtle)] rounded-lg text-center text-sm text-foreground/50">
                Funcionalidade em desenvolvimento (Fase 2)
              </div>
              <Button variant="primary" className="w-full" onClick={() => setInsumosModalOpen(false)}>Pronto</Button>
            </div>
          </CardGlass>
        </div>
      )}

      {/* MODAL UPSELL (Placeholder) */}
      {upsellModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <CardGlass className="w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Vender Produto (Upsell)</h3>
              <button onClick={() => setUpsellModalOpen(false)}><X className="text-foreground/50 hover:text-foreground" /></button>
            </div>
            <p className="text-sm text-foreground/60 mb-4">
              Adicione produtos à comanda da cliente. A comissão é lançada na sua conta após ela pagar no caixa.
            </p>
            <div className="space-y-4">
              <div className="p-3 border border-[var(--border-subtle)] rounded-lg text-center text-sm text-foreground/50">
                Catálogo de Produtos em desenvolvimento (Fase 2)
              </div>
              <Button variant="primary" className="w-full" onClick={() => setUpsellModalOpen(false)}>Concluir Venda</Button>
            </div>
          </CardGlass>
        </div>
      )}

    </div>
  );
}
