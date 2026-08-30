'use client';

import { useState, useEffect } from 'react';
import { Search, UserPlus, Edit, Trash2, FileText, ChevronDown, ChevronUp, History } from 'lucide-react';
import { CardGlass } from '@/components/CardGlass';
import { Button } from '@/components/Button';
import { SectionTitle } from '@/components/SectionTitle';
import { getClientes, getAgendamentos, getServicoPreco, STATUS_LABELS } from '@/lib/mock-data';
import type { Cliente } from '@/lib/gestao-types';
import type { Agendamento } from '@/lib/gestao-types';
import type { Servico } from '@/lib/gestao-types';

export default function ClienteModule() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [expandido, setExpandido] = useState<string | null>(null);
  
  // Estados para o form
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);

  // Carregar dados do Supabase (com fallback para mock)
  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      const [clientesData, agendamentosData] = await Promise.all([
        getClientes(),
        getAgendamentos(),
      ]);
      setClientes(clientesData);
      setAgendamentos(agendamentosData);
      setLoading(false);
    };
    carregarDados();
  }, []);

  // Calcula estatísticas do CRM (Ticket Médio, Visitas, Faturamento Total, Última Visita)
  const statsCliente = (clienteId: string) => {
    const ags = agendamentos.filter(a => a.cliente_id === clienteId && a.status === 'concluido');
    const todosAgs = agendamentos.filter(a => a.cliente_id === clienteId);
    
    // Sort desc por data
    todosAgs.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    
    const totalGasto = ags.reduce((sum, a) => sum + getServicoPreco(a.servico_id), 0);
    const visitas = ags.length;
    const ticketMedio = visitas > 0 ? Math.round(totalGasto / visitas) : 0;
    
    return {
      visitas,
      totalGasto,
      ticketMedio,
      historico: todosAgs,
      ultimaVisita: ags.length > 0 ? ags[0].data : null
    };
  };

  const clientesFiltrados = clientes.filter((c) =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    c.telefone.includes(busca) ||
    (c.email ?? '').toLowerCase().includes(busca.toLowerCase())
  );

  const salvar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      id: editando?.id,
      nome: form.get('nome') as string,
      telefone: form.get('telefone') as string,
      email: (form.get('email') as string) || null,
      nascimento: (form.get('nascimento') as string) || null,
      observacoes: (form.get('observacoes') as string) || null,
    };

    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar cliente');

      const savedCliente: Cliente = data.cliente ? {
        id: data.cliente.id,
        nome: data.cliente.name,
        telefone: data.cliente.phone,
        email: data.cliente.email,
        nascimento: data.cliente.birth_date,
        observacoes: data.cliente.notes,
        criado_em: data.cliente.created_at,
      } : {
        id: editando?.id ?? `c${Date.now()}`,
        nome: payload.nome,
        telefone: payload.telefone,
        email: payload.email,
        nascimento: payload.nascimento,
        observacoes: payload.observacoes,
        criado_em: editando?.criado_em ?? new Date().toISOString()
      };

      if (editando) {
        setClientes(prev => prev.map(c => c.id === editando.id ? savedCliente : c));
      } else {
        setClientes(prev => [savedCliente, ...prev]);
      }
      setEditando(null);
      setShowForm(false);
    } catch (err: any) {
      console.error('Erro ao salvar cliente:', err);
      alert(`Erro ao salvar no banco: ${err.message}`);
    }
  };

  const excluir = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este cliente?")) return;
    try {
      const res = await fetch(`/api/clientes?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao excluir');
      }
      setClientes(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      console.error('Erro ao excluir cliente:', err);
      alert(`Erro ao excluir no banco: ${err.message}`);
    }
  };

  return (
    <div className="py-4">
      <SectionTitle title="Clientes (CRM)" subtitle="Gestão de relacionamento e histórico" align="left" />

      {/* Busca + nova ação */}
      <div className="flex flex-col sm:flex-row gap-4 mt-8 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" size={18} />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-lg text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Buscar por nome, telefone ou e-mail..."
          />
        </div>
        <Button variant="primary" size="md" className="sm:w-auto w-full" onClick={() => { setEditando(null); setShowForm(true); }}>
          <UserPlus size={18} className="mr-2" /> Novo Cliente
        </Button>
      </div>

      {loading && (
        <div className="text-center py-6 text-foreground/50">Carregando clientes...</div>
      )}

      {/* Formulário de Criação/Edição */}
      {showForm && (
        <CardGlass className="mb-6 p-6">
          <h3 className="text-lg font-bold mb-4">{editando ? 'Editar Cliente' : 'Novo Cliente'}</h3>
          <form onSubmit={salvar} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-foreground/60 mb-1">Nome Completo *</label>
                <input name="nome" required defaultValue={editando?.nome ?? ''} className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-foreground text-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs text-foreground/60 mb-1">Telefone / WhatsApp *</label>
                <input name="telefone" required defaultValue={editando?.telefone ?? ''} placeholder="Ex: 11999999999" className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-foreground text-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs text-foreground/60 mb-1">E-mail <span className="text-foreground/30">(opcional)</span></label>
                <input name="email" type="email" defaultValue={editando?.email ?? ''} className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-foreground text-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs text-foreground/60 mb-1">Data de Nascimento <span className="text-foreground/30">(opcional)</span></label>
                <input name="nascimento" type="date" defaultValue={editando?.nascimento ?? ''} className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-foreground text-sm focus:outline-none focus:border-primary [color-scheme:dark]" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-foreground/60 mb-1">Observações / Preferências <span className="text-foreground/30">(opcional)</span></label>
              <textarea name="observacoes" rows={3} defaultValue={editando?.observacoes ?? ''} className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-foreground text-sm focus:outline-none focus:border-primary resize-none" placeholder="Alergias, formato de rosto, preferências de corte..." />
            </div>
            <div className="flex gap-2 justify-end mt-2">
              <Button type="button" variant="ghost" size="md" onClick={() => { setShowForm(false); setEditando(null); }}>Cancelar</Button>
              <Button type="submit" variant="primary" size="md">Salvar Cliente</Button>
            </div>
          </form>
        </CardGlass>
      )}

      {/* Lista Expandível */}
      <div className="flex flex-col gap-3">
        {clientesFiltrados.length === 0 ? (
          <CardGlass className="py-8 text-center text-foreground/50">
            {busca ? 'Nenhum cliente encontrado para esta busca.' : 'Nenhum cliente cadastrado.'}
          </CardGlass>
        ) : (
          clientesFiltrados.map((c) => {
            const stats = statsCliente(c.id);
            const isExpanded = expandido === c.id;

            return (
              <CardGlass key={c.id} className="p-0 overflow-hidden transition-all duration-300">
                {/* Header (Sempre visível) */}
                <div 
                  className={`p-4 flex flex-col sm:flex-row sm:items-center gap-4 cursor-pointer hover:bg-foreground/5 transition-colors ${isExpanded ? 'bg-foreground/5 border-b border-[var(--border-subtle)]' : ''}`}
                  onClick={() => setExpandido(isExpanded ? null : c.id)}
                >
                  {/* Info Principal */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
                      {c.nome}
                      {stats.visitas >= 5 && <span className="px-2 py-0.5 rounded-full text-[10px] bg-primary/20 text-primary uppercase tracking-wider font-bold border border-primary/30">VIP</span>}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-foreground/60">
                      <span className="font-mono">{c.telefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}</span>
                      {c.email && <span>{c.email}</span>}
                    </div>
                  </div>

                  {/* KPIs Rápidos */}
                  <div className="flex items-center gap-6 sm:px-4">
                    <div className="text-center">
                      <div className="text-xs text-foreground/40 uppercase tracking-wider">Visitas</div>
                      <div className="font-bold text-foreground">{stats.visitas}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-foreground/40 uppercase tracking-wider">Ticket Médio</div>
                      <div className="font-bold text-primary">R$ {stats.ticketMedio}</div>
                    </div>
                  </div>

                  {/* Icon Expandir */}
                  <div className="hidden sm:flex shrink-0 w-8 h-8 items-center justify-center rounded-full bg-foreground/5 text-foreground/50">
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {/* Área Expandida (Detalhes + Histórico) */}
                {isExpanded && (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6 bg-foreground/[0.03]">
                    {/* Coluna 1: Dados & Observações */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/40 mb-2 flex items-center gap-1"><FileText size={12}/> Observações</h4>
                        {c.observacoes ? (
                          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md text-amber-500/90 text-sm">
                            {c.observacoes}
                          </div>
                        ) : (
                          <span className="text-sm text-foreground/40 italic">Sem observações cadastradas.</span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div>
                          <div className="text-xs text-foreground/40 mb-1">Nascimento</div>
                          <div className="text-sm">{c.nascimento ? new Date(c.nascimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-foreground/40 mb-1">Cliente desde</div>
                          <div className="text-sm">{new Date(c.criado_em).toLocaleDateString('pt-BR')}</div>
                        </div>
                      </div>

                      <div className="pt-2 flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 text-xs py-1.5 h-auto" onClick={(e) => { e.stopPropagation(); setEditando(c); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><Edit size={14} className="mr-1"/> Editar</Button>
                        <Button variant="outline" size="sm" className="text-red-400 border-red-500/20 hover:bg-red-500/10 h-auto py-1.5" onClick={(e) => { e.stopPropagation(); excluir(c.id); }}><Trash2 size={14}/></Button>
                      </div>
                    </div>

                    {/* Coluna 2 e 3: Histórico de Agendamentos */}
                    <div className="md:col-span-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/40 mb-3 flex items-center gap-1"><History size={12}/> Histórico de Agendamentos</h4>
                      
                      {stats.historico.length === 0 ? (
                        <div className="text-sm text-foreground/40 p-4 border border-[var(--border-subtle)] rounded-md text-center">Nenhum agendamento no histórico.</div>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                          {stats.historico.map(ag => (
                            <div key={ag.id} className="flex justify-between items-center p-3 rounded-md border border-[var(--border-subtle)] bg-foreground/[0.02]">
                              <div>
                                <div className="text-sm font-bold flex items-center gap-2">
                                  {new Date(ag.data).toLocaleDateString('pt-BR')} às {ag.hora_inicio}
                                  <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-medium border
                                    ${ag.status === 'concluido' ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/10' : 
                                      ag.status === 'cancelado' || ag.status === 'no_show' ? 'text-red-400 border-red-400/20 bg-red-400/10' : 
                                      'text-blue-400 border-blue-400/20 bg-blue-400/10'}`}
                                  >
                                    {STATUS_LABELS[ag.status]}
                                  </span>
                                </div>
                                <div className="text-xs text-foreground/60 mt-0.5">
                                  R$ {getServicoPreco(ag.servico_id)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardGlass>
            );
          })
        )}
      </div>
    </div>
  );
}
