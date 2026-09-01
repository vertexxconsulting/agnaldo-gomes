'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { SectionTitle } from '@/components/SectionTitle';
import { CardGlass } from '@/components/CardGlass';
import { Button } from '@/components/Button';
import { ViewToggle } from '@/components/ViewToggle';
import {
  getAgendamentos, getProfissionais, getBloqueios, getClientes, getServicos, getProfissionalServico,
  STATUS_LABELS, STATUS_COLORS, getServicoDuracao, getServicoPreco,
  getClienteNome, getServicoNome, getProfissionalNome
} from '@/lib/mock-data';
import type { Agendamento, BloqueioAgenda, StatusAgendamento, Cliente, Servico, ProfissionalServico } from '@/lib/gestao-types';
import type { Profissional } from '@/lib/gestao-types';
import { CalendarDays, Clock, User2, Check, X, CheckCircle2, AlertCircle, AlertTriangle, Sparkles } from 'lucide-react';
import { obterHorariosSalao, DEFAULT_HORARIOS_SALAO } from '@/lib/ia-config';

const DIAS_CHAVE = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

function AgendaContent() {
  const searchParams = useSearchParams();
  const hoje = new Date().toISOString().split('T')[0];
  const [dataSelecionada, setDataSelecionada] = useState(searchParams.get('date') || hoje);
  const [profFiltro, setProfFiltro] = useState<string>('todos');
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [bloqueiosDia, setBloqueiosDia] = useState<BloqueioAgenda[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [profServicos, setProfServicos] = useState<ProfissionalServico[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<string>('dia');
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    cliente_id: '',
    profissional_id: '',
    servico_id: '',
    data: hoje,
    hora_inicio: '09:00',
  });

  // Carregar dados do Supabase (com fallback para mock)
  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      
      const urlParams = new URLSearchParams(window.location.search);
      const agendamentoIdConfirmar = urlParams.get('confirmar');
      const agendamentoIdCancelar = urlParams.get('cancelar');

      if (agendamentoIdConfirmar) {
        await mudarStatus(agendamentoIdConfirmar, 'confirmado');
        window.history.replaceState({}, '', window.location.pathname);
      } else if (agendamentoIdCancelar) {
        await mudarStatus(agendamentoIdCancelar, 'cancelado');
        window.history.replaceState({}, '', window.location.pathname);
      }

      const [
        agendamentosData, bloqueiosData, profissionaisData, clientesData, servicosData, profServData
      ] = await Promise.all([
        getAgendamentos(),
        getBloqueios(),
        getProfissionais(),
        getClientes(),
        getServicos(),
        getProfissionalServico()
      ]);
      setAgendamentos(agendamentosData);
      setBloqueiosDia(bloqueiosData);
      setProfissionais(profissionaisData.filter(p => p.ativo));
      setClientes(clientesData);
      setServicos(servicosData);
      setProfServicos(profServData);
      setLoading(false);
    };
    carregarDados();
  }, [dataSelecionada]);

  // Filtro por data e profissional na visualização
  const doDia = agendamentos.filter(a => a.data === dataSelecionada);
  const agendamentosFiltrados = profFiltro === 'todos'
    ? doDia
    : doDia.filter(a => a.profissional_id === profFiltro);

  agendamentosFiltrados.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));

  const bloqueiosFiltrados = bloqueiosDia.filter(b => {
    const matchProf = profFiltro === 'todos' || profFiltro === b.profissional_id;
    const matchData = b.data_inicio.slice(0, 10) === dataSelecionada || b.data_fim.slice(0, 10) === dataSelecionada;
    return matchProf && matchData;
  });

  // Serviços filtrados pelo profissional selecionado no formulário
  const servicosDoProfissional = useMemo(() => {
    if (!formData.profissional_id) return [];
    const idsVinculados = profServicos
      .filter(ps => ps.profissional_id === formData.profissional_id)
      .map(ps => ps.servico_id);
    
    // Se houver vínculos específicos cadastrados, filtra por eles; senão mostra os serviços ativos
    if (idsVinculados.length > 0) {
      return servicos.filter(s => s.ativo && idsVinculados.includes(s.id));
    }
    return servicos.filter(s => s.ativo);
  }, [formData.profissional_id, profServicos, servicos]);

  // Horários disponíveis calculados cruzando Salão + Profissional + Agendamentos existentes
  const { horariosDisponiveis, statusDiaInfo } = useMemo(() => {
    if (!formData.data || !formData.profissional_id) {
      return { horariosDisponiveis: [], statusDiaInfo: null };
    }

    const [ano, mes, dia] = formData.data.split('-').map(Number);
    const dataObj = new Date(ano, mes - 1, dia);
    const diaSemana = dataObj.getDay();
    const horariosSalao = typeof window !== 'undefined' ? obterHorariosSalao() : DEFAULT_HORARIOS_SALAO;
    const infoSalao = horariosSalao[diaSemana] || DEFAULT_HORARIOS_SALAO[diaSemana];
    const profSel = profissionais.find(p => p.id === formData.profissional_id);
    const jornadaProf = profSel?.jornada_semanal;

    // Verificar se o profissional trabalha neste dia
    let profAtende = false;
    let profInicio = infoSalao?.inicio || '09:00';
    let profFim = infoSalao?.fim || '19:00';

    if (jornadaProf) {
      const chaveStr = DIAS_CHAVE[diaSemana];
      const cfgDia = jornadaProf[diaSemana] || (chaveStr ? jornadaProf[chaveStr] : undefined);
      if (cfgDia) {
        if (cfgDia.ativo !== false) {
          profAtende = true;
          profInicio = cfgDia.inicio || profInicio;
          profFim = cfgDia.fim || profFim;
        }
      } else if (infoSalao.aberto) {
        profAtende = true;
      }
    } else if (infoSalao.aberto) {
      profAtende = true;
    }

    if (!profAtende && !infoSalao.aberto) {
      return {
        horariosDisponiveis: [],
        statusDiaInfo: { tipo: 'fechado', texto: `Salão e profissional fechados aos domingos/segundas.` }
      };
    }

    if (!profAtende) {
      return {
        horariosDisponiveis: [],
        statusDiaInfo: { tipo: 'folga', texto: `${profSel?.nome || 'Profissional'} não atende neste dia da semana.` }
      };
    }

    // Gerar slots de 30 em 30 minutos
    const [hIni, mIni] = profInicio.split(':').map(Number);
    const [hFim, mFim] = profFim.split(':').map(Number);
    const totalMinutosIni = hIni * 60 + mIni;
    const totalMinutosFim = hFim * 60 + mFim;

    // Agendamentos já marcados para o profissional nesta data
    const ocupados = agendamentos
      .filter(a => a.data === formData.data && a.profissional_id === formData.profissional_id && a.status !== 'cancelado')
      .map(a => a.hora_inicio.slice(0, 5));

    const slots: Array<{ hora: string; ocupado: boolean }> = [];
    for (let m = totalMinutosIni; m < totalMinutosFim; m += 30) {
      const hStr = String(Math.floor(m / 60)).padStart(2, '0');
      const minStr = String(m % 60).padStart(2, '0');
      const horaFormatada = `${hStr}:${minStr}`;
      slots.push({
        hora: horaFormatada,
        ocupado: ocupados.includes(horaFormatada),
      });
    }

    return {
      horariosDisponiveis: slots,
      statusDiaInfo: {
        tipo: 'aberto',
        texto: `Horário do profissional: ${profInicio} às ${profFim}`
      }
    };
  }, [formData.data, formData.profissional_id, profissionais, agendamentos]);

  async function mudarStatus(id: string, status: StatusAgendamento) {
    try {
      const { atualizarStatusAgendamento } = await import('@/lib/supabase-queries');
      const success = await atualizarStatusAgendamento(id, status);
      
      if (success) {
        // Atualizar estado local
        setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status } : a));
        
        // Sincronizar com Bolten CRM (background, não bloqueia UI)
        try {
          await fetch('/api/bolten/sync-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agendamentoId: id, status }),
          });
        } catch (syncErr) {
          console.warn('[bolten-sync] Falha ao sincronizar status:', syncErr);
        }
      } else {
        setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      }
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    }
  }

  const handleSalvarAgendamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cliente_id || !formData.profissional_id || !formData.servico_id || !formData.data || !formData.hora_inicio) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }
    const servicoSel = servicos.find(s => s.id === formData.servico_id);
    const duracaoMin = servicoSel?.duracao_min ?? 60;
    const [h, m] = formData.hora_inicio.split(':').map(Number);
    const fim = new Date(2000, 0, 1, h, m + duracaoMin);
    const horaFim = `${String(fim.getHours()).padStart(2, '0')}:${String(fim.getMinutes()).padStart(2, '0')}`;
    
    try {
      const res = await fetch('/api/agendamentos/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: formData.cliente_id,
          profissional_id: formData.profissional_id,
          servico_id: formData.servico_id,
          data: formData.data,
          hora_inicio: formData.hora_inicio,
          hora_fim: horaFim,
          status: 'confirmado',
          canal: 'recepcao'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar agendamento');

      const novoAgendamento: Agendamento = {
        id: data.agendamento?.id ?? Math.random().toString(36).substring(7),
        cliente_id: formData.cliente_id,
        profissional_id: formData.profissional_id,
        servico_id: formData.servico_id,
        data: formData.data,
        hora_inicio: formData.hora_inicio,
        hora_fim: horaFim,
        status: 'confirmado',
        canal: 'recepcao',
        criado_em: data.agendamento?.created_at ?? new Date().toISOString()
      };
      setAgendamentos(prev => [...prev, novoAgendamento]);
      setDataSelecionada(formData.data); // Navega automaticamente para o dia agendado
      setShowForm(false);
      setFormData({ cliente_id: '', profissional_id: '', servico_id: '', data: hoje, hora_inicio: '09:00' });
    } catch (err: any) {
      console.error('Erro ao salvar agendamento:', err);
      alert(`Erro ao salvar no banco: ${err.message}`);
    }
  };

  return (
    <div className="py-4">
      <SectionTitle title="Agenda do Salão" subtitle="Gerenciamento de horários e profissionais" align="left" />

      {/* Controles de Busca / Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 mt-8 mb-6">
        <div className="flex items-center gap-2">
          <div className="flex bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-lg p-1">
            <input
              type="date"
              value={dataSelecionada}
              onChange={(e) => setDataSelecionada(e.target.value)}
              className="bg-transparent px-3 py-1.5 text-sm text-foreground focus:outline-none [color-scheme:dark]"
            />
          </div>
          {dataSelecionada !== hoje && (
            <button
              onClick={() => setDataSelecionada(hoje)}
              className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-background transition-colors text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg"
              title="Ir para hoje"
            >
              Hoje
            </button>
          )}
        </div>

        {/* Filtro Profissional */}
        <select
          value={profFiltro}
          onChange={(e) => setProfFiltro(e.target.value)}
          className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary"
        >
          <option value="todos">Todos os Profissionais</option>
          {profissionais.map((p) => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>

        {/* View Toggle */}
        <div className="sm:ml-auto flex gap-2">
          <ViewToggle 
            options={[
              { id: 'dia', label: 'Dia' },
              { id: 'semana', label: 'Semana' },
            ]}
            selectedId={viewMode} 
            onChange={setViewMode} 
          />
          <Button variant="primary" onClick={() => setShowForm(true)}>+ Novo Agendamento</Button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-foreground/50">Carregando horários...</div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {/* Bloqueios do Dia */}
          {bloqueiosFiltrados.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
              <h4 className="text-amber-500 font-bold text-sm mb-2 flex items-center gap-2">
                <AlertCircle size={16} /> Bloqueios de Horário
              </h4>
              <div className="flex flex-wrap gap-2">
                {bloqueiosFiltrados.map((b) => (
                  <span key={b.id} className="text-xs bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-md">
                    {getProfissionalNome(b.profissional_id, profissionais)}: {b.data_inicio.includes('T') ? b.data_inicio.slice(11, 16) : b.data_inicio} - {b.data_fim.includes('T') ? b.data_fim.slice(11, 16) : b.data_fim} ({b.motivo})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Lista de Agendamentos */}
          <div className="space-y-3">
            {agendamentosFiltrados.length === 0 ? (
              <CardGlass className="p-8 text-center text-foreground/50">
                <p>Nenhum agendamento para esta data ({new Date(`${dataSelecionada}T12:00:00`).toLocaleDateString('pt-BR')}).</p>
                {agendamentos.length > 0 && (
                  <div className="mt-3 text-xs text-primary/80">
                    💡 Existem agendamentos em outras datas:{' '}
                    {[...new Set(agendamentos.map(a => a.data))].sort().map(d => (
                      <button 
                        key={d} 
                        onClick={() => setDataSelecionada(d)}
                        className="underline font-bold mr-2 hover:text-primary"
                      >
                        {new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR')} ({agendamentos.filter(a => a.data === d).length})
                      </button>
                    ))}
                  </div>
                )}
              </CardGlass>
            ) : (
              agendamentosFiltrados.map((a) => {
                const cliente = getClienteNome(a.cliente_id, clientes);
                const servico = getServicoNome(a.servico_id, servicos);
                const prof = getProfissionalNome(a.profissional_id, profissionais);
                const valor = getServicoPreco(a.servico_id, servicos);

                return (
                  <div 
                    key={a.id}
                    className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--color-card)] hover:border-primary/40 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-foreground text-base">{cliente}</span>
                        <span 
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                          style={{ backgroundColor: `${STATUS_COLORS[a.status]}15`, color: STATUS_COLORS[a.status] }}
                        >
                          {STATUS_LABELS[a.status]}
                        </span>
                        {a.canal === 'online' && <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[9px] uppercase border border-blue-500/20">App</span>}
                      </div>

                      <div className="text-sm text-primary font-medium mb-1">{servico} — R$ {valor}</div>
                      <div className="text-xs text-foreground/50 flex items-center gap-1.5"><User2 size={12}/> {prof}</div>
                    </div>

                    {/* Ações Rápidas */}
                    <div className="flex sm:flex-col gap-2 shrink-0 justify-end sm:justify-start pt-2 sm:pt-0">
                      {a.status === 'pendente' && (
                        <button onClick={() => mudarStatus(a.id, 'confirmado')} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-medium transition-colors"><Check size={14} /> Confirmar</button>
                      )}
                      {a.status === 'confirmado' && (
                        <button onClick={() => mudarStatus(a.id, 'em_atendimento')} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs font-medium transition-colors"><User2 size={14} /> Atender</button>
                      )}
                      {a.status === 'em_atendimento' && (
                        <button onClick={() => mudarStatus(a.id, 'concluido')} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 text-xs font-medium transition-colors"><CheckCircle2 size={14} /> Concluir</button>
                      )}

                      {a.status !== 'concluido' && a.status !== 'cancelado' && a.status !== 'no_show' && (
                        <div className="flex gap-1 mt-auto">
                          {servico.toLowerCase().includes('noiva') && (
                            <Link 
                              href="/admin/noivas" 
                              title="Ver na aba Dia da Noiva" 
                              className="flex-1 flex justify-center items-center p-1.5 rounded bg-pink-500/5 text-pink-400 hover:bg-pink-500/15 transition-colors"
                            >
                              <Sparkles size={14} />
                            </Link>
                          )}
                          <button onClick={() => mudarStatus(a.id, 'cancelado')} title="Cancelar" className="flex-1 flex justify-center items-center p-1.5 rounded bg-red-500/5 text-red-400 hover:bg-red-500/15 transition-colors"><X size={14} /></button>
                          <button onClick={() => mudarStatus(a.id, 'no_show')} title="No-Show (Faltou)" className="flex-1 flex justify-center items-center p-1.5 rounded bg-purple-500/5 text-purple-400 hover:bg-purple-500/15 transition-colors"><AlertCircle size={14} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Modal de Novo Agendamento Dinâmico (Profissional -> Serviço -> Horários) */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <CardGlass className="w-full max-w-lg p-6 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold font-serif text-foreground">Novo Agendamento</h3>
                <p className="text-xs text-foreground/50">Selecione o profissional para filtrar os serviços e horários disponíveis</p>
              </div>
              <button onClick={() => setShowForm(false)} className="text-foreground/50 hover:text-foreground">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSalvarAgendamento} className="space-y-4">
              {/* 1. Cliente */}
              <div>
                <label className="block text-xs font-bold text-foreground/70 mb-1.5">1. Cliente *</label>
                <select 
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
                  value={formData.cliente_id}
                  onChange={e => setFormData(f => ({ ...f, cliente_id: e.target.value }))}
                  required
                >
                  <option value="">Selecione o cliente</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nome} ({c.telefone})</option>
                  ))}
                </select>
              </div>

              {/* 2. Profissional PRIMEIRO */}
              <div>
                <label className="block text-xs font-bold text-foreground/70 mb-1.5 flex items-center gap-1.5">
                  <User2 size={14} className="text-primary" />
                  2. Profissional *
                </label>
                <select 
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:border-primary font-semibold"
                  value={formData.profissional_id}
                  onChange={e => {
                    const profId = e.target.value;
                    setFormData(f => ({ ...f, profissional_id: profId, servico_id: '' }));
                  }}
                  required
                >
                  <option value="">Selecione quem irá atender</option>
                  {profissionais.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>

              {/* 3. Serviço FILTRADO pelo Profissional */}
              <div>
                <label className="block text-xs font-bold text-foreground/70 mb-1.5 flex items-center justify-between">
                  <span>3. Serviço *</span>
                  {formData.profissional_id && (
                    <span className="text-[11px] font-normal text-primary font-mono">
                      {servicosDoProfissional.length} serviços disponíveis para este profissional
                    </span>
                  )}
                </label>
                <select 
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:border-primary disabled:opacity-50"
                  value={formData.servico_id}
                  onChange={e => setFormData(f => ({ ...f, servico_id: e.target.value }))}
                  disabled={!formData.profissional_id}
                  required
                >
                  <option value="">
                    {!formData.profissional_id 
                      ? '← Selecione o profissional primeiro' 
                      : 'Selecione o procedimento'}
                  </option>
                  {servicosDoProfissional.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.nome} — R$ {s.preco} ({s.duracao_min} min)
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Data & Horário Inteligente */}
              <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-foreground/70 mb-1.5 flex items-center gap-1">
                      <CalendarDays size={14} className="text-primary" />
                      4. Data do Atendimento *
                    </label>
                    <input 
                      type="date"
                      value={formData.data}
                      onChange={e => setFormData(f => ({ ...f, data: e.target.value }))}
                      min={hoje}
                      className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:border-primary [color-scheme:dark]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-foreground/70 mb-1.5 flex items-center gap-1">
                      <Clock size={14} className="text-primary" />
                      5. Horário Disponível *
                    </label>
                    
                    {horariosDisponiveis.length > 0 ? (
                      <select
                        value={formData.hora_inicio}
                        onChange={e => setFormData(f => ({ ...f, hora_inicio: e.target.value }))}
                        className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:border-primary font-mono"
                        required
                      >
                        {horariosDisponiveis.map(slot => (
                          <option key={slot.hora} value={slot.hora} disabled={slot.ocupado}>
                            {slot.hora} {slot.ocupado ? '(Ocupado)' : '— Livre'}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input 
                        type="time"
                        value={formData.hora_inicio}
                        onChange={e => setFormData(f => ({ ...f, hora_inicio: e.target.value }))}
                        className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:border-primary [color-scheme:dark]"
                        required
                      />
                    )}
                  </div>
                </div>

                {/* Status do Salão vs Profissional */}
                {statusDiaInfo && (
                  <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                    statusDiaInfo.tipo === 'aberto' 
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  }`}>
                    {statusDiaInfo.tipo === 'aberto' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                    <span>{statusDiaInfo.texto}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" className="font-bold">
                  Salvar Agendamento
                </Button>
              </div>
            </form>
          </CardGlass>
        </div>
      )}
    </div>
  );
}

export default function AgendaPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-foreground/50">Carregando agenda...</div>}>
      <AgendaContent />
    </Suspense>
  );
}
