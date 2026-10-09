'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Wallet, CheckCircle2, AlertTriangle, Clock, Scissors, 
  Users, Banknote, UserPlus, ShoppingCart, TrendingDown
} from 'lucide-react';
import { SectionHeader, Panel, StatCard } from '@/components/ui/Panel';
import { Button } from '@/components/Button';
import { fetchClientes, fetchAgendamentos, fetchServicos, fetchProfissionais, atualizarStatusAgendamento } from '@/lib/supabase-queries';
import type { Cliente, Agendamento, Servico, Profissional } from '@/lib/gestao-types';

export default function ReceptionDashboard() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);

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
    // Poderia configurar realtime do Supabase aqui
  }, []);

  const hoje = new Date().toISOString().split('T')[0];
  const agora = new Date();
  const horaAtual = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;

  const getClienteNome = (id: string) => clientes.find(c => c.id === id)?.nome || 'Desconhecido';
  const getServico = (id: string) => servicos.find(s => s.id === id);
  const getProfissionalNome = (id: string) => profissionais.find(p => p.id === id)?.nome || 'Desconhecido';

  // Métricas do Topo
  const agendamentosHoje = agendamentos.filter(a => a.data === hoje);
  const faturamentoHoje = agendamentosHoje
    .filter(a => a.status === 'concluido')
    .reduce((acc, a) => acc + (getServico(a.servico_id)?.preco || 0), 0);
  
  const projetadoHoje = agendamentosHoje
    .filter(a => a.status === 'pendente' || a.status === 'confirmado' || a.status === 'em_atendimento')
    .reduce((acc, a) => acc + (getServico(a.servico_id)?.preco || 0), 0);

  const concluidos = agendamentosHoje.filter(a => a.status === 'concluido').length;
  const cancelados = agendamentosHoje.filter(a => a.status === 'cancelado' || a.status === 'no_show').length;
  const taxaOcupacao = agendamentosHoje.length > 0 
    ? Math.round((concluidos / (agendamentosHoje.length - cancelados)) * 100) 
    : 0;

  // Filas
  const naCadeira = agendamentosHoje.filter(a => a.status === 'em_atendimento');
  
  // Próximos a chegar (pendentes ou confirmados cujo horário de início é daqui a pouco ou já passou e estão atrasados)
  const proximos = agendamentosHoje
    .filter(a => a.status === 'pendente' || a.status === 'confirmado')
    .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
    .slice(0, 5);

  const handleCheckin = async (id: string) => {
    const success = await atualizarStatusAgendamento(id, 'em_atendimento');
    if (success) {
      setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status: 'em_atendimento' } : a));
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Link href="/admin/agenda" className="flex flex-col items-center justify-center p-4 gap-2 text-xs font-medium rounded-xl border border-[var(--border-subtle)] bg-[var(--background)] hover:border-gold hover:text-gold transition-colors text-foreground">
          <Clock size={20} className="text-gold" />
          Novo Agendamento
        </Link>
        <Link href="/admin/clientes" className="flex flex-col items-center justify-center p-4 gap-2 text-xs font-medium rounded-xl border border-[var(--border-subtle)] bg-[var(--background)] hover:border-blue-400 hover:text-blue-400 transition-colors text-foreground">
          <UserPlus size={20} className="text-blue-400" />
          Novo Cliente
        </Link>
        <Link href="/admin/loja" className="flex flex-col items-center justify-center p-4 gap-2 text-xs font-medium rounded-xl border border-[var(--border-subtle)] bg-[var(--background)] hover:border-green-400 hover:text-green-400 transition-colors text-foreground">
          <ShoppingCart size={20} className="text-green-400" />
          Venda Balcão
        </Link>
        <Link href="/admin/relatorios" className="flex flex-col items-center justify-center p-4 gap-2 text-xs font-medium rounded-xl border border-[var(--border-subtle)] bg-[var(--background)] hover:border-purple-400 hover:text-purple-400 transition-colors text-foreground">
          <Wallet size={20} className="text-purple-400" />
          Despesas / Resumo
        </Link>
      </div>


      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* 2. Na Cadeira / Aguardando Checkout */}
        <div className="xl:col-span-2 space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            Na Cadeira Agora (Para Receber)
          </h2>
          
          {naCadeira.length === 0 ? (
            <Panel className="p-8 text-center text-foreground/50 border-dashed">
              Nenhuma cliente em atendimento no momento.
            </Panel>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {naCadeira.map(ag => {
                const srv = getServico(ag.servico_id);
                return (
                  <Panel key={ag.id} className="p-5 flex flex-col relative overflow-hidden group border-green-500/20 bg-green-500/5">
                    <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-foreground truncate">{getClienteNome(ag.cliente_id)}</h3>
                        <p className="text-sm text-foreground/70 truncate">{srv?.nome}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs bg-[var(--background)] px-2 py-1 rounded-md text-foreground/60 border border-[var(--border-subtle)]">
                          Iniciou {ag.hora_inicio}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-6">
                      <Scissors size={14} className="text-foreground/40" />
                      <span className="text-sm text-foreground/60">{getProfissionalNome(ag.profissional_id)}</span>
                    </div>
                    
                    <div className="mt-auto">
                      <Link href={`/admin/agenda?date=${hoje}`}>
                        <Button variant="primary" className="w-full bg-green-600 hover:bg-green-700 text-white border-none shadow-lg shadow-green-500/20">
                          <Banknote size={16} className="mr-2" />
                          Ir para Recebimento
                        </Button>
                      </Link>
                    </div>
                  </Panel>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Próximos e Atalhos */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Clock className="text-foreground/50" />
            Próximos a Chegar
          </h2>
          
          <div className="space-y-3">
            {proximos.length === 0 ? (
              <p className="text-sm text-foreground/50 p-4 text-center border border-[var(--border-subtle)] rounded-xl border-dashed">
                Nenhum agendamento pendente para hoje.
              </p>
            ) : (
              proximos.map(ag => (
                <div key={ag.id} className="flex items-center justify-between p-3 border border-[var(--border-subtle)] bg-[var(--background)] rounded-xl hover:border-foreground/20 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="text-center">
                      <span className="block font-mono text-sm font-bold text-foreground">{ag.hora_inicio}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate">{getClienteNome(ag.cliente_id)}</p>
                      <p className="text-xs text-foreground/50 truncate">com {getProfissionalNome(ag.profissional_id)}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleCheckin(ag.id)}>Chegou</Button>
                </div>
              ))
            )}
          </div>


        </div>
      </div>
    </div>
  );
}
