'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Wallet, CheckCircle2, AlertTriangle, Clock, Scissors, 
  Users, Banknote, UserPlus, ShoppingCart, TrendingDown, Sparkles
} from 'lucide-react';
import { SectionHeader, Panel, StatCard } from '@/components/ui/Panel';
import { Button } from '@/components/Button';
import { CheckoutModal } from '@/components/CheckoutModal';
import { fetchClientes, fetchAgendamentos, fetchServicos, fetchProfissionais, atualizarStatusAgendamento } from '@/lib/supabase-queries';
import type { Cliente, Agendamento, Servico, Profissional } from '@/lib/gestao-types';

export default function ReceptionDashboard() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutAppt, setCheckoutAppt] = useState<Agendamento | null>(null);

  const carregarDados = async () => {
    setLoading(true);
    const [ags, cls, srvs, profs] = await Promise.all([
      fetchAgendamentos({ data: new Date().toISOString().split('T')[0] }),
      fetchClientes(),
      fetchServicos(),
      fetchProfissionais(),
    ]);
    setAgendamentos(ags);
    setClientes(cls);
    setServicos(srvs);
    setProfissionais(profs);
    setLoading(false);
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const hoje = new Date().toISOString().split('T')[0];

  const getClienteNome = (id: string) => clientes.find(c => c.id === id)?.nome || 'Desconhecido';
  const getServico = (id: string) => servicos.find(s => s.id === id);
  const getProfissionalNome = (id: string) => profissionais.find(p => p.id === id)?.nome || 'Desconhecido';

  // Métricas do Topo
  const agendamentosHoje = agendamentos.filter(a => a.data === hoje);
  const faturamentoHoje = agendamentosHoje
    .filter(a => a.status === 'concluido' && a.payment_method)
    .reduce((acc, a) => acc + (a.total_amount != null ? a.total_amount : (getServico(a.servico_id)?.preco || 0)), 0);
  
  const projetadoHoje = agendamentosHoje
    .filter(a => a.status === 'pendente' || a.status === 'confirmado' || a.status === 'em_atendimento' || (a.status === 'concluido' && !a.payment_method))
    .reduce((acc, a) => acc + (getServico(a.servico_id)?.preco || 0), 0);

  const concluidos = agendamentosHoje.filter(a => a.status === 'concluido').length;
  const cancelados = agendamentosHoje.filter(a => a.status === 'cancelado' || a.status === 'no_show').length;

  // Filas
  // 1. Na Cadeira (Em Atendimento)
  const naCadeira = agendamentosHoje.filter(a => a.status === 'em_atendimento');

  // 2. Aguardando Pagamento (Serviço concluído na cadeira, aguardando passar no caixa)
  const aguardandoRecebimento = agendamentosHoje.filter(a => a.status === 'concluido' && !a.payment_method);
  
  // 3. Próximos a chegar (pendentes ou confirmados)
  const proximos = agendamentosHoje
    .filter(a => a.status === 'pendente' || a.status === 'confirmado')
    .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
    .slice(0, 6);

  const handleCheckin = async (id: string) => {
    const success = await atualizarStatusAgendamento(id, 'em_atendimento');
    if (success) {
      setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status: 'em_atendimento' } : a));
    }
  };

  const handleConcluirAtendimento = async (id: string) => {
    const success = await atualizarStatusAgendamento(id, 'concluido');
    if (success) {
      setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status: 'concluido' } : a));
    }
  };

  if (loading) return <div className="p-8 text-center text-foreground/50">Carregando painel em tempo real...</div>;

  return (
    <div className="space-y-6 w-full pb-12">
      <SectionHeader
        title="Painel de Recepção (Tempo Real)"
        description="Controle rápido de quem está na cadeira, caixa e próximos a chegar."
      />

      {/* 1. Pulso do Dia */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Recebido Hoje" 
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(faturamentoHoje)} 
          icon={Wallet} 
          tone="success" 
        />
        <StatCard 
          label="A Receber (Projetado)" 
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(projetadoHoje)} 
          icon={Banknote} 
          tone="primary" 
        />
        <StatCard 
          label="Atendimentos (Concluídos)" 
          value={`${concluidos} / ${agendamentosHoje.length - cancelados}`} 
          icon={CheckCircle2} 
          tone="default" 
        />
        <StatCard 
          label="Faltas / Cancelados" 
          value={cancelados.toString()} 
          icon={AlertTriangle} 
          tone="danger" 
        />
      </div>

      {/* Atalhos Rápidos no Topo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        <Link href="/admin/agenda" className="flex items-center justify-center py-2.5 px-3 gap-2 text-xs font-medium rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-primary hover:text-primary transition-colors text-foreground">
          <Clock size={16} className="text-primary shrink-0" />
          <span>Novo Agendamento</span>
        </Link>
        <Link href="/admin/clientes" className="flex items-center justify-center py-2.5 px-3 gap-2 text-xs font-medium rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-secondary hover:text-secondary transition-colors text-foreground">
          <UserPlus size={16} className="text-secondary shrink-0" />
          <span>Novo Cliente</span>
        </Link>
        <Link href="/admin/estoque" className="flex items-center justify-center py-2.5 px-3 gap-2 text-xs font-medium rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-accent hover:text-accent transition-colors text-foreground">
          <ShoppingCart size={16} className="text-accent shrink-0" />
          <span>Venda Balcão</span>
        </Link>
        <Link href="/admin/relatorios" className="flex items-center justify-center py-2.5 px-3 gap-2 text-xs font-medium rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-info hover:text-info transition-colors text-foreground">
          <Wallet size={16} className="text-info shrink-0" />
          <span>Despesas / Resumo</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        
        {/* Coluna Esquerda / Central: Fila de Atendimento e Caixa */}
        <div className="xl:col-span-2 space-y-5">
          
          {/* Fila 1: Aguardando Pagamento (Serviço Concluído, pronto para Receber no Caixa) */}
          {aguardandoRecebimento.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm sm:text-base font-bold flex items-center gap-2 text-emerald-800 dark:text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                Aguardando Pagamento / Caixa ({aguardandoRecebimento.length})
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {aguardandoRecebimento.map(ag => {
                  const srv = getServico(ag.servico_id);
                  return (
                    <Panel key={ag.id} className="p-3 sm:p-3.5 flex flex-col relative overflow-hidden group border-emerald-500/30 bg-emerald-500/5 shadow-sm rounded-xl">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-600/30 px-2 py-0.5 rounded-full mb-1 inline-block">
                            ● Serviço Concluído
                          </span>
                          <h3 className="text-sm sm:text-base font-bold text-foreground truncate">{getClienteNome(ag.cliente_id)}</h3>
                          <p className="text-xs text-foreground/70 truncate">{srv?.nome}</p>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <span className="text-xs sm:text-sm font-bold text-gold font-mono block">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(srv?.preco || 0)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 mb-3">
                        <Scissors size={13} className="text-foreground/40 shrink-0" />
                        <span className="text-[11px] text-foreground/60 truncate">Atendido por {getProfissionalNome(ag.profissional_id)}</span>
                      </div>
                      
                      <div className="mt-auto">
                        <Button 
                          variant="primary" 
                          onClick={() => setCheckoutAppt(ag)}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold border-none shadow-sm py-1.5 px-3 text-xs rounded-lg"
                        >
                          <Banknote size={15} className="mr-1.5" />
                          Ir para Fechamento Prévio
                        </Button>
                      </div>
                    </Panel>
                  );
                })}
              </div>
            </div>
          )}

          {/* Fila 2: Na Cadeira (Em Atendimento) */}
          <div className="space-y-3">
            <h2 className="text-sm sm:text-base font-bold flex items-center gap-2 text-foreground">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
              Na Cadeira Agora (Em Atendimento)
            </h2>
            
            {naCadeira.length === 0 ? (
              <Panel className="p-6 text-center text-xs text-foreground/50 border-dashed">
                Nenhuma cliente em atendimento na cadeira no momento.
              </Panel>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {naCadeira.map(ag => {
                  const srv = getServico(ag.servico_id);
                  return (
                    <Panel key={ag.id} className="p-3 sm:p-3.5 flex flex-col relative overflow-hidden group border-primary/20 bg-primary/5 rounded-xl">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-[10px] font-semibold text-primary/90 bg-primary/10 px-2 py-0.5 rounded-full mb-1 inline-block">
                            Em Atendimento
                          </span>
                          <h3 className="text-sm sm:text-base font-bold text-foreground truncate">{getClienteNome(ag.cliente_id)}</h3>
                          <p className="text-xs text-foreground/70 truncate">{srv?.nome}</p>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <span className="text-[10px] bg-[var(--color-background)] px-1.5 py-0.5 rounded text-foreground/60 border border-[var(--color-border)] font-mono">
                            Iniciou {ag.hora_inicio}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 mb-3">
                        <Scissors size={13} className="text-foreground/40 shrink-0" />
                        <span className="text-[11px] text-foreground/60 truncate">{getProfissionalNome(ag.profissional_id)}</span>
                      </div>
                      
                      <div className="mt-auto space-y-1.5">
                        {/* Botão de Concluir Atendimento */}
                        <Button 
                          variant="primary" 
                          onClick={() => handleConcluirAtendimento(ag.id)}
                          className="w-full font-bold shadow-sm py-1.5 px-3 text-xs rounded-lg"
                        >
                          <CheckCircle2 size={15} className="mr-1.5" />
                          Concluir Atendimento
                        </Button>

                        {/* Atalho de Fechamento Prévio Direto */}
                        <button
                          type="button"
                          onClick={() => setCheckoutAppt(ag)}
                          className="w-full text-[11px] text-emerald-800 dark:text-emerald-400 hover:underline font-semibold py-0.5 flex items-center justify-center gap-1 transition-colors"
                        >
                          <Banknote size={13} />
                          Ou ir direto para Fechamento Prévio
                        </button>
                      </div>
                    </Panel>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Coluna Direita: Próximos a Chegar */}
        <div className="space-y-3">
          <h2 className="text-sm sm:text-base font-bold flex items-center gap-2 text-foreground">
            <Clock size={16} className="text-foreground/50" />
            Próximos a Chegar
          </h2>
          
          <div className="space-y-2">
            {proximos.length === 0 ? (
              <p className="text-xs text-foreground/50 p-4 text-center border border-[var(--color-border)] rounded-xl border-dashed">
                Nenhum agendamento pendente para hoje.
              </p>
            ) : (
              proximos.map(ag => (
                <div key={ag.id} className="flex items-center justify-between py-2 px-2.5 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-lg hover:border-foreground/20 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="text-center shrink-0">
                      <span className="block font-mono text-xs font-bold text-foreground">{ag.hora_inicio}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-foreground truncate">{getClienteNome(ag.cliente_id)}</p>
                      <p className="text-[11px] text-foreground/50 truncate">com {getProfissionalNome(ag.profissional_id)}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleCheckin(ag.id)} className="h-6 py-0 px-2 text-[11px] shrink-0 font-medium">
                    Chegou
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal de Recebimento / Checkout Integrado no Dashboard */}
      {checkoutAppt && (
        <CheckoutModal
          appt={checkoutAppt}
          servicos={servicos}
          profissionais={profissionais}
          clientes={clientes}
          onClose={() => setCheckoutAppt(null)}
          onSuccess={() => {
            setCheckoutAppt(null);
            carregarDados();
          }}
        />
      )}
    </div>
  );
}

