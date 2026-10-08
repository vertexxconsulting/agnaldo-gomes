'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Clock, CheckCircle2, Play, Plus, X, ShoppingBag, Share2, Beaker
} from 'lucide-react';
import { SectionHeader, CardGlass } from '@/components/ui/Panel';
import { Button } from '@/components/Button';
import { 
  fetchClientes, 
  fetchAgendamentos, 
  fetchServicos, 
  fetchEstoque,
  salvarItemComanda,
  fetchItensComanda,
  atualizarStatusAgendamento
} from '@/lib/supabase-queries';
import type { Cliente, Agendamento, Servico, ProdutoEstoque, ItemComanda } from '@/lib/gestao-types';

// Mock IDs for the professional (will be replaced by real auth logic)
const PROFISSIONAL_ID = 'a0000001-0000-0000-0000-000000000001';

export default function MeuPainelPage() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [estoque, setEstoque] = useState<ProdutoEstoque[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [insumosModalOpen, setInsumosModalOpen] = useState(false);
  const [upsellModalOpen, setUpsellModalOpen] = useState(false);
  const [activeAgendamento, setActiveAgendamento] = useState<Agendamento | null>(null);

  // Comanda state
  const [comandaAtual, setComandaAtual] = useState<ItemComanda[]>([]);
  const [insumoSelecionado, setInsumoSelecionado] = useState('');
  const [insumoQty, setInsumoQty] = useState('');
  const [produtoSelecionado, setProdutoSelecionado] = useState('');
  const [produtoQty, setProdutoQty] = useState('1');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [ags, cls, srvs, est] = await Promise.all([
        fetchAgendamentos({ data_inicio: new Date().toISOString().split('T')[0] }),
        fetchClientes(),
        fetchServicos(),
        fetchEstoque(),
      ]);
      setAgendamentos(ags);
      setClientes(cls);
      setServicos(srvs);
      setEstoque(est);
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

    await salvarItemComanda(activeAgendamento.id, {
      inventory_id: insumoSelecionado,
      type: 'INSUMO',
      qty: qtyNum,
      price: 0
    });

    const itens = await fetchItensComanda(activeAgendamento.id);
    setComandaAtual(itens);
    setInsumoSelecionado('');
    setInsumoQty('');
  };

  const handleSalvarProduto = async () => {
    if (!activeAgendamento || !produtoSelecionado || !produtoQty) return;
    
    const qtyNum = parseInt(produtoQty);
    if (isNaN(qtyNum) || qtyNum <= 0) return;

    const prod = estoque.find(p => p.id === produtoSelecionado);
    if (!prod) return;

    await salvarItemComanda(activeAgendamento.id, {
      inventory_id: produtoSelecionado,
      type: 'PRODUTO',
      qty: qtyNum,
      price: prod.sale_price ?? 0
    });

    const itens = await fetchItensComanda(activeAgendamento.id);
    setComandaAtual(itens);
    setProdutoSelecionado('');
    setProdutoQty('1');
  };

  const insumosDoEstoque = estoque.filter(p => p.allow_procedure_use);
  const produtosDeVenda = estoque.filter(p => p.allow_sale);

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
              ))}
            </div>
          )}

          <h2 className="text-xl font-bold mt-8">Vitrine de Afiliado</h2>
          <CardGlass className="p-6">
            <p className="text-sm text-foreground/70 mb-4">
              Gere links de produtos para suas clientes com seu código de comissão embutido.
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => alert('Em breve: Catálogo de links de produtos do salão')}>
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

      {/* MODAL INSUMOS */}
      {insumosModalOpen && activeAgendamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <CardGlass className="w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Lançar Insumos</h3>
              <button onClick={() => setInsumosModalOpen(false)}><X className="text-foreground/50 hover:text-foreground" /></button>
            </div>
            <p className="text-sm text-foreground/60 mb-4">
              Cliente: <span className="font-bold text-foreground">{getClienteNome(activeAgendamento.cliente_id)}</span>
            </p>
            
            <div className="space-y-4 mb-6">
              <div className="flex gap-2">
                <select 
                  className="flex-1 bg-[var(--background)] border border-[var(--border-subtle)] rounded p-2 text-sm"
                  value={insumoSelecionado}
                  onChange={e => setInsumoSelecionado(e.target.value)}
                >
                  <option value="">Selecione o Insumo...</option>
                  {insumosDoEstoque.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                  ))}
                </select>
                <input 
                  type="number"
                  placeholder="Qtd"
                  className="w-20 bg-[var(--background)] border border-[var(--border-subtle)] rounded p-2 text-sm text-center"
                  value={insumoQty}
                  onChange={e => setInsumoQty(e.target.value)}
                />
                <Button variant="primary" onClick={handleSalvarInsumo}>Adicionar</Button>
              </div>

              {comandaAtual.filter(i => i.type === 'INSUMO').length > 0 && (
                <div className="border border-[var(--border-subtle)] rounded overflow-hidden">
                  <div className="bg-foreground/5 p-2 text-xs font-bold uppercase text-foreground/60">Insumos já lançados</div>
                  {comandaAtual.filter(i => i.type === 'INSUMO').map(item => {
                    const prod = estoque.find(p => p.id === item.inventory_id);
                    return (
                      <div key={item.id} className="p-2 text-sm border-t border-[var(--border-subtle)] flex justify-between items-center">
                        <span className="flex items-center gap-2"><Beaker size={14} className="text-foreground/50"/> {prod?.name}</span>
                        <span className="font-mono text-foreground/70">{item.qty} {prod?.unit}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Button variant="outline" className="w-full" onClick={() => setInsumosModalOpen(false)}>Fechar</Button>
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
              <div className="flex gap-2">
                <select 
                  className="flex-1 bg-[var(--background)] border border-[var(--border-subtle)] rounded p-2 text-sm"
                  value={produtoSelecionado}
                  onChange={e => setProdutoSelecionado(e.target.value)}
                >
                  <option value="">Selecione o Produto...</option>
                  {produtosDeVenda.map(p => (
                    <option key={p.id} value={p.id}>{p.name} - R$ {p.sale_price}</option>
                  ))}
                </select>
                <input 
                  type="number"
                  placeholder="Qtd"
                  min="1"
                  className="w-16 bg-[var(--background)] border border-[var(--border-subtle)] rounded p-2 text-sm text-center"
                  value={produtoQty}
                  onChange={e => setProdutoQty(e.target.value)}
                />
                <Button variant="primary" onClick={handleSalvarProduto}>Vender</Button>
              </div>

              {comandaAtual.filter(i => i.type === 'PRODUTO').length > 0 && (
                <div className="border border-[var(--border-subtle)] rounded overflow-hidden">
                  <div className="bg-foreground/5 p-2 text-xs font-bold uppercase text-foreground/60">Itens na Comanda</div>
                  {comandaAtual.filter(i => i.type === 'PRODUTO').map(item => {
                    const prod = estoque.find(p => p.id === item.inventory_id);
                    return (
                      <div key={item.id} className="p-2 text-sm border-t border-[var(--border-subtle)] flex justify-between items-center">
                        <span className="flex items-center gap-2"><ShoppingBag size={14} className="text-gold"/> {prod?.name}</span>
                        <span className="font-mono text-foreground/70">{item.qty}x</span>
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

    </div>
  );
}
