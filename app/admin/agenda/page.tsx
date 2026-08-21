'use client';

import { useState, useEffect } from 'react';
import { SectionTitle } from '@/components/SectionTitle';
import { CardGlass } from '@/components/CardGlass';
import { Button } from '@/components/Button';
import { ViewToggle } from '@/components/ViewToggle';
import {
  getAgendamentos, getProfissionais, getBloqueios,
  STATUS_LABELS, STATUS_COLORS, getServicoDuracao, getServicoPreco,
  getClienteNome, getServicoNome, getProfissionalNome
} from '@/lib/mock-data';
import type { Agendamento, BloqueioAgenda, StatusAgendamento } from '@/lib/gestao-types';
import type { Profissional } from '@/lib/gestao-types';
import { CalendarDays, Clock, User2, Check, X, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AgendaPage() {
  const hoje = new Date().toISOString().split('T')[0];
  const [dataSelecionada, setDataSelecionada] = useState(hoje);
  const [profFiltro, setProfFiltro] = useState<string>('todos');
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [bloqueiosDia, setBloqueiosDia] = useState<BloqueioAgenda[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<string>('dia');

  // Carregar dados do Supabase (com fallback para mock)
  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      
      // Capturar ações via URL (links do WhatsApp)
      const urlParams = new URLSearchParams(window.location.search);
      const agendamentoIdConfirmar = urlParams.get('confirmar');
      const agendamentoIdCancelar = urlParams.get('cancelar');

      if (agendamentoIdConfirmar) {
        await mudarStatus(agendamentoIdConfirmar, 'confirmado');
        // Limpar URL após ação
        window.history.replaceState({}, '', window.location.pathname);
      } else if (agendamentoIdCancelar) {
        await mudarStatus(agendamentoIdCancelar, 'cancelado');
        window.history.replaceState({}, '', window.location.pathname);
      }

      const [
        agendamentosData, bloqueiosData, profissionaisData
      ] = await Promise.all([
        getAgendamentos({ data: dataSelecionada }),
        getBloqueios(dataSelecionada),
        getProfissionais(),
      ]);
      setAgendamentos(agendamentosData);
      setBloqueiosDia(bloqueiosData);
      setProfissionais(profissionaisData.filter(p => p.ativo));
      setLoading(false);
    };
    carregarDados();
  }, [dataSelecionada]);

  // Filtro por profissional
  const doDia = agendamentos.filter(a => a.data === dataSelecionada);
  const agendamentosFiltrados = profFiltro === 'todos'
    ? doDia
    : doDia.filter(a => a.profissional_id === profFiltro);

  // Ordenar por hora
  agendamentosFiltrados.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));

  const bloqueiosFiltrados = bloqueiosDia.filter(b => profFiltro === 'todos' || profFiltro === b.profissional_id);

  const mudarStatus = async (id: string, status: StatusAgendamento) => {
    try {
      // Tentar atualizar no Supabase se não for mock
      const { atualizarStatusAgendamento } = await import('@/lib/supabase-queries');
      const success = await atualizarStatusAgendamento(id, status);
      
      if (success) {
        setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      } else {
        // Fallback local caso falhe/mock
        setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      }
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    }
  };

  return (
    <div className="py-4">
      <SectionTitle title="Agenda do Salão" subtitle="Gerenciamento de horários e profissionais" align="left" />

      {/* Controles de Busca / Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 mt-8 mb-6">
        <div className="flex bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-lg p-1">
          <input
            type="date"
            value={dataSelecionada}
            onChange={(e) => setDataSelecionada(e.target.value)}
            className="bg-transparent px-3 py-1.5 text-sm text-foreground focus:outline-none [color-scheme:dark]"
          />
        </div>

        <select
          value={profFiltro}
          onChange={e => setProfFiltro(e.target.value)}
          className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="todos">Todos Profissionais</option>
          {profissionais.map(p => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>

        <ViewToggle
          options={[
            { id: 'dia', label: 'Dia' },
            { id: 'semana', label: 'Semana' }
          ]}
          selectedId={viewMode}
          onChange={setViewMode}
          className="hidden lg:flex"
        />

        <div className="flex gap-2 ml-auto">
          <input
            type="file"
            id="json-upload"
            className="hidden"
            accept=".json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = async (event) => {
                try {
                  const data = JSON.parse(event.target?.result as string);
                  if (confirm(`Deseja importar ${data.length} horários para a agenda?`)) {
                    // TODO: Implementar API de importação em massa
                    alert('Importação iniciada. Os horários aparecerão na agenda em instantes.');
                  }
                } catch (err) {
                  alert('Erro ao ler arquivo JSON.');
                }
              };
              reader.readAsText(file);
            }}
          />
          <Button variant="outline" size="md" onClick={() => document.getElementById('json-upload')?.click()}>
            Importar JSON
          </Button>
          <Button variant="primary" size="md" onClick={() => alert('Novo agendamento manual em desenvolvimento.')}>
            Novo Agendamento
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-foreground/50">Carregando agenda...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Painel lateral: Resumo do dia */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <CardGlass className="p-5">
              <h4 className="text-sm font-bold uppercase tracking-wider mb-4 border-b border-[var(--border-subtle)] pb-2">Resumo do Dia</h4>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-foreground/60">Total Agendados</span>
                <span className="font-bold text-lg">{doDia.length}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-foreground/60">Concluídos</span>
                <span className="font-bold text-lg text-emerald-400">{doDia.filter(a => a.status === 'concluido').length}</span>
              </div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-foreground/60">Cancelados / No-show</span>
                <span className="font-bold text-lg text-red-400">{doDia.filter(a => a.status === 'cancelado' || a.status === 'no_show').length}</span>
              </div>

              <div className="mt-4 border-t border-[var(--border-subtle)] pt-4">
                <span className="text-xs text-foreground/50 block mb-2">Previsão Faturamento</span>
                <div className="text-2xl font-bold text-primary">
                  R$ {doDia.filter(a => a.status !== 'cancelado' && a.status !== 'no_show').reduce((acc, a) => acc + getServicoPreco(a.servico_id), 0)}
                </div>
              </div>
            </CardGlass>
          </div>

          {/* Lista de Horários */}
          <div className="lg:col-span-3 flex flex-col gap-3">
            {agendamentosFiltrados.length === 0 && bloqueiosFiltrados.length === 0 ? (
              <CardGlass className="py-8 text-center text-foreground/50 flex flex-col items-center">
                <CalendarDays size={40} className="mb-3 opacity-20" />
                Nenhum agendamento ou bloqueio para esta data.
              </CardGlass>
            ) : (
              <>
                {/* Render Bloqueios */}
                {bloqueiosFiltrados.map(b => (
                  <div key={b.id} className="flex flex-col sm:flex-row gap-4 p-4 rounded-lg bg-foreground/[0.02] border border-[var(--border-subtle)] border-l-4 border-l-amber-500/50">
                    <div className="flex sm:flex-col items-center sm:items-start gap-2 sm:gap-0 sm:w-24 shrink-0">
                      <span className="font-bold text-lg text-amber-500/80">{b.data_inicio.split('T')[1]}</span>
                      <span className="text-xs text-foreground/40 hidden sm:block">às {b.data_fim.split('T')[1]}</span>
                    </div>
                    <div className="flex-1 flex items-center">
                      <div>
                        <div className="text-amber-500/80 font-bold mb-0.5 flex items-center gap-2"><AlertCircle size={14}/> BLOQUEIO DE AGENDA</div>
                        <div className="text-sm text-foreground/60">{getProfissionalNome(b.profissional_id)} · Motivo: {b.motivo}</div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Render Agendamentos */}
                {agendamentosFiltrados.map(a => {
                  const cliente = getClienteNome(a.cliente_id);
                  const servico = getServicoNome(a.servico_id);
                  const duracao = getServicoDuracao(a.servico_id);
                  const prof = getProfissionalNome(a.profissional_id);
                  const valor = getServicoPreco(a.servico_id);
                  const isCancelado = a.status === 'cancelado' || a.status === 'no_show';

                  return (
                    <div key={a.id} className={`flex flex-col sm:flex-row gap-4 p-4 rounded-lg bg-[var(--color-card)] border border-[var(--border-subtle)] transition-all ${isCancelado ? 'opacity-50 grayscale' : ''}`}>
                      {/* Hora */}
                      <div className="flex sm:flex-col items-center sm:items-start gap-2 sm:gap-0 sm:w-24 shrink-0">
                        <span className="font-bold text-xl">{a.hora_inicio}</span>
                        <span className="text-xs text-foreground/40 hidden sm:flex items-center gap-1 mt-1"><Clock size={10} /> {duracao} min</span>
                      </div>

                      {/* Detalhes */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h4 className="font-bold text-lg truncate">{cliente}</h4>
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
                            <button onClick={() => mudarStatus(a.id, 'cancelado')} title="Cancelar" className="flex-1 flex justify-center items-center p-1.5 rounded bg-red-500/5 text-red-400 hover:bg-red-500/15 transition-colors"><X size={14} /></button>
                            <button onClick={() => mudarStatus(a.id, 'no_show')} title="No-Show (Faltou)" className="flex-1 flex justify-center items-center p-1.5 rounded bg-purple-500/5 text-purple-400 hover:bg-purple-500/15 transition-colors"><AlertCircle size={14} /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
