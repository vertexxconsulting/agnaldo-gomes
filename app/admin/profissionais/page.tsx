'use client';

import { useState } from 'react';
import { Plus, Edit, Trash2, Search, Clock, Calendar, User2, CheckCircle2 } from 'lucide-react';
import { SectionTitle } from '@/components/SectionTitle';
import { CardGlass } from '@/components/CardGlass';
import { Button } from '@/components/Button';
import { ViewToggle } from '@/components/ViewToggle';
import { MOCK_PROFISSIONAIS, MOCK_PROF_SERVICO, MOCK_SERVICOS, MOCK_AGENDAMENTOS } from '@/lib/mock-data';
import type { Profissional, JornadaSemanal } from '@/lib/gestao-types';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function ProfissionaisPage() {
  const [profissionais, setProfissionais] = useState<Profissional[]>(MOCK_PROFISSIONAIS);
  const [busca, setBusca] = useState('');
  const [expandido, setExpandido] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Profissional | null>(null);
  const [fotoLocal, setFotoLocal] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<string>('grid');

  const filtrados = profissionais.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (p.especialidades ?? []).some(e => e.toLowerCase().includes(busca.toLowerCase()))
  );

  const servicosDoProfissional = (profId: string) => {
    const ids = MOCK_PROF_SERVICO.filter(ps => ps.profissional_id === profId).map(ps => ps.servico_id);
    return MOCK_SERVICOS.filter(s => ids.includes(s.id));
  };

  const statsProfissional = (profId: string) => {
    const agendamentos = MOCK_AGENDAMENTOS.filter(a => a.profissional_id === profId);
    const concluidos = agendamentos.filter(a => a.status === 'concluido');
    const noShows = agendamentos.filter(a => a.status === 'no_show');
    return {
      total: agendamentos.length,
      concluidos: concluidos.length,
      noShows: noShows.length,
      taxaConclusao: agendamentos.length > 0
        ? Math.round((concluidos.length / agendamentos.length) * 100) : 0,
    };
  };

  const toggleAtivo = (id: string) => {
    setProfissionais(prev => prev.map(p => p.id === id ? { ...p, ativo: !p.ativo } : p));
  };

  const excluir = (id: string) => {
    setProfissionais(prev => prev.filter(p => p.id !== id));
  };

  const handleFotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFotoLocal(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const salvar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const jornada: JornadaSemanal = {};
    for (let d = 0; d <= 6; d++) {
      const inicio = form.get(`jornada_${d}_inicio`) as string;
      const fim = form.get(`jornada_${d}_fim`) as string;
      if (inicio && fim) {
        jornada[d] = { inicio, fim };
      }
    }
    const novo: Profissional = {
      id: editando?.id ?? `p${Date.now()}`,
      nome: form.get('nome') as string,
      foto_url: fotoLocal || editando?.foto_url || null,
      especialidades: (form.get('especialidades') as string).split(',').map(s => s.trim()).filter(Boolean),
      ativo: true,
      jornada_semanal: jornada,
      criado_em: editando?.criado_em ?? new Date().toISOString(),
    };
    if (editando) {
      setProfissionais(prev => prev.map(p => p.id === editando.id ? novo : p));
    } else {
      setProfissionais(prev => [...prev, novo]);
    }
    setEditando(null);
    setFotoLocal(null);
    setShowForm(false);
  };

  const abrirForm = (prof?: Profissional) => {
    if (prof) {
      setEditando(prof);
      setFotoLocal(prof.foto_url ?? null);
    } else {
      setEditando(null);
      setFotoLocal(null);
    }
    setShowForm(true);
  };

  return (
    <div className="py-12">
      <div className="container mx-auto px-6">
        <SectionTitle title="Profissionais" subtitle="Cadastro · Jornada · Comissão · Agenda" align="left" />

        {/* Barra de ações */}
        <div className="flex flex-col sm:flex-row gap-4 mt-10 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" size={18} />
            <input
              value={busca} onChange={e => setBusca(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-lg text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Buscar por nome ou especialidade..."
            />
          </div>
          
          <ViewToggle 
            options={[
              { id: 'grid', label: 'Grade' },
              { id: 'list', label: 'Lista' }
            ]}
            selectedId={viewMode}
            onChange={setViewMode}
            className="hidden sm:flex self-center"
          />

          <Button variant="primary" size="md" onClick={() => abrirForm()}>
            <Plus size={18} className="mr-2" /> Novo Profissional
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <CardGlass className="mb-8">
            <h3 className="text-lg font-bold mb-4">{editando ? 'Editar Profissional' : 'Novo Profissional'}</h3>
            <form onSubmit={salvar} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-foreground/60 mb-1">Nome</label>
                  <input name="nome" required defaultValue={editando?.nome ?? ''} className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-foreground text-sm focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-xs text-foreground/60 mb-1">Especialidades <span className="text-foreground/30">(separar por vírgula)</span></label>
                  <input name="especialidades" defaultValue={editando?.especialidades?.join(', ') ?? ''} className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-foreground text-sm focus:outline-none focus:border-primary" placeholder="Corte, Coloração" />
                </div>
                <div>
                  <label className="block text-xs text-foreground/60 mb-1">Foto <span className="text-foreground/30">(opcional)</span></label>
                  <label className="flex items-center gap-2 cursor-pointer bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-foreground text-sm hover:border-primary transition-colors">
                    <span className="truncate flex-1">{fotoLocal ? 'Foto Selecionada' : 'Selecionar Arquivo...'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleFotoUpload} />
                  </label>
                </div>
              </div>

              {/* Jornada semanal */}
              <div>
                <label className="block text-xs text-foreground/60 mb-2">Jornada Semanal</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                  {DIAS_SEMANA.map((dia, i) => {
                    const jornada = editando?.jornada_semanal?.[i];
                    return (
                      <div key={i} className="bg-[var(--background)] rounded-lg p-3 border border-[var(--border-subtle)]">
                        <span className="text-xs font-medium text-foreground/60 block mb-2">{dia}</span>
                        <input name={`jornada_${i}_inicio`} type="time" defaultValue={jornada?.inicio ?? ''} className="w-full bg-transparent border border-[var(--border-subtle)] rounded px-2 py-1 text-xs text-foreground mb-1 focus:outline-none focus:border-primary [color-scheme:dark]" />
                        <input name={`jornada_${i}_fim`} type="time" defaultValue={jornada?.fim ?? ''} className="w-full bg-transparent border border-[var(--border-subtle)] rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary [color-scheme:dark]" />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" variant="primary" size="md">Salvar</Button>
                <Button type="button" variant="ghost" size="md" onClick={() => { setShowForm(false); setEditando(null); setFotoLocal(null); }}>Cancelar</Button>
              </div>
            </form>
          </CardGlass>
        )}

        {/* Cards de profissionais */}
        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "flex flex-col gap-4"}>
          {filtrados.map(prof => {
            const stats = statsProfissional(prof.id);
            const servicos = servicosDoProfissional(prof.id);
            const isExpanded = expandido === prof.id;
            return (
              <CardGlass key={prof.id} className={`transition-all duration-300 ${!prof.ativo ? 'opacity-50' : ''}`}>
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 overflow-hidden">
                    {prof.foto_url ? (
                      <img src={prof.foto_url} alt={prof.nome} className="w-full h-full object-cover" />
                    ) : (
                      <User2 size={24} />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg truncate">{prof.nome}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${prof.ativo ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                        {prof.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>

                    {/* Especialidades */}
                    {prof.especialidades && prof.especialidades.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {prof.especialidades.map(esp => (
                          <span key={esp} className="px-2 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary font-medium">{esp}</span>
                        ))}
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex gap-4 text-xs text-foreground/60">
                      <span className="flex items-center gap-1"><Calendar size={12} /> {stats.total} agendamentos</span>
                      <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-400" /> {stats.taxaConclusao}% concluídos</span>
                    </div>

                    {/* Expandido */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] space-y-3">
                        {/* Serviços */}
                        <div>
                          <span className="text-xs text-foreground/40 uppercase tracking-wider">Serviços que executa</span>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {servicos.length > 0 ? servicos.map(s => (
                              <span key={s.id} className="px-2 py-0.5 rounded text-[10px] bg-foreground/5 text-foreground/70">{s.nome} ({s.duracao_min}min · R$ {Number(s.preco).toFixed(2)})</span>
                            )) : <span className="text-xs text-foreground/30">Nenhum vínculo</span>}
                          </div>
                        </div>
                        {/* Jornada */}
                        <div>
                          <span className="text-xs text-foreground/40 uppercase tracking-wider">Jornada Semanal</span>
                          <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 mt-1.5">
                            {DIAS_SEMANA.map((dia, i) => {
                              const j = prof.jornada_semanal[i];
                              return (
                                <div key={i} className={`text-center rounded p-1.5 text-[10px] ${j ? 'bg-primary/10 text-primary' : 'bg-foreground/5 text-foreground/30'}`}>
                                  <div className="font-bold">{dia}</div>
                                  {j ? <div>{j.inicio}-{j.fim}</div> : <div>Folga</div>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex flex-col gap-1 shrink-0">
                    <button onClick={() => setExpandido(isExpanded ? null : prof.id)} className="p-1.5 rounded-md hover:bg-foreground/5 text-foreground/40 hover:text-foreground/70 text-xs">{isExpanded ? '▲' : '▼'}</button>
                    <button onClick={() => abrirForm(prof)} title="Editar" className="p-1.5 rounded-md hover:bg-foreground/5 text-foreground/60 hover:text-primary transition-colors"><Edit size={14} /></button>
                    <button onClick={() => toggleAtivo(prof.id)} title={prof.ativo ? 'Desativar' : 'Ativar'} className="p-1.5 rounded-md hover:bg-foreground/5 text-foreground/60 hover:text-amber-400 transition-colors"><User2 size={14} /></button>
                    <button onClick={() => excluir(prof.id)} title="Excluir" className="p-1.5 rounded-md hover:bg-red-500/10 text-foreground/60 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
              </CardGlass>
            );
          })}
        </div>

        {filtrados.length === 0 && (
          <CardGlass className="text-center py-12 mt-6">
            <p className="text-foreground/50">Nenhum profissional encontrado.</p>
          </CardGlass>
        )}
      </div>
    </div>
  );
}
