'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Clock, User2, CheckCircle2, Calendar, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import { SectionTitle } from '@/components/SectionTitle';
import { CardGlass } from '@/components/CardGlass';
import { Button } from '@/components/Button';
import { ViewToggle } from '@/components/ViewToggle';
import { 
  getProfissionais, getServicos, getProfissionalServico, getServicoPreco
} from '@/lib/mock-data';
import { 
  criarProfissional, atualizarProfissional, excluirProfissional, vincularProfissionalServicos
} from '@/lib/supabase-queries';
import type { Profissional, JornadaSemanal, Servico, ProfissionalServico } from '@/lib/gestao-types';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function ProfissionaisPage() {
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [servicosCache, setServicosCache] = useState<Servico[]>([]);
  const [profServCache, setProfServCache] = useState<ProfissionalServico[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [expandido, setExpandido] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Profissional | null>(null);
  const [fotoLocal, setFotoLocal] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<string>('grid');
  const [servicosSelecionados, setServicosSelecionados] = useState<string[]>([]);
  const [diasAtivos, setDiasAtivos] = useState<number[]>([]);
  const [categoriasColapsadas, setCategoriasColapsadas] = useState<string[]>([]);

  // Carregar dados do Supabase (com fallback para mock)
  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      const [profData, servicosData, psData] = await Promise.all([
        getProfissionais(),
        getServicos(),
        getProfissionalServico(),
      ]);
      setProfissionais(Array.from(new Map(profData.map(p => [p.id, p])).values()));
      setServicosCache(servicosData);
      setProfServCache(psData);
      setLoading(false);
    };
    carregarDados();
  }, []);

  const filtrados = Array.from(
    new Map(
      profissionais
        .filter(p =>
          p.nome.toLowerCase().includes(busca.toLowerCase()) ||
          (p.especialidades ?? []).some(e => e.toLowerCase().includes(busca.toLowerCase()))
        )
        .map(p => [p.id, p])
    ).values()
  );

  const servicosDoProfissional = (profId: string): Servico[] => {
    const ids = profServCache.filter(ps => ps.profissional_id === profId).map(ps => ps.servico_id);
    return servicosCache.filter(s => ids.includes(s.id));
  };

  const statsProfissional = (profId: string) => {
    // Usa getServicoPreco do mock-data (que faz lookup no estado ou mock)
    const profs = profServCache.filter(ps => ps.profissional_id === profId);
    const servicoIds = profs.map(ps => ps.servico_id);
    const servicosRelacionados = servicosCache.filter(s => servicoIds.includes(s.id));
    const totalValor = servicosRelacionados.reduce((sum, s) => sum + s.preco, 0);
    return {
      totalServicos: servicosRelacionados.length,
      totalValor,
    };
  };

  const toggleAtivo = async (id: string) => {
    const prof = profissionais.find(p => p.id === id);
    if (!prof) return;
    const novoAtivo = !prof.ativo;
    const sucesso = await atualizarProfissional(id, { ativo: novoAtivo });
    if (sucesso) {
      setProfissionais(prev => prev.map(p => p.id === id ? { ...p, ativo: novoAtivo } : p));
    }
  };

  const excluir = async (id: string) => {
    const sucesso = await excluirProfissional(id);
    if (sucesso) {
      setProfissionais(prev => prev.filter(p => p.id !== id));
      setProfServCache(prev => prev.filter(ps => ps.profissional_id !== id));
    }
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

  const salvar = async (e: React.FormEvent<HTMLFormElement>) => {
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
    const profissionalData = {
      nome: form.get('nome') as string,
      foto_url: fotoLocal || editando?.foto_url || null,
      especialidades: (form.get('especialidades') as string).split(',').map(s => s.trim()).filter(Boolean),
      ativo: true,
      jornada_semanal: jornada,
    };

    let profissionalId: string;

    if (editando) {
      const sucesso = await atualizarProfissional(editando.id, profissionalData);
      if (!sucesso) return;
      profissionalId = editando.id;
      setProfissionais(prev => prev.map(p => p.id === editando.id ? { ...p, ...profissionalData } : p));
    } else {
      const resultado = await criarProfissional(profissionalData);
      if (!resultado) return;
      profissionalId = resultado.id;
      const novo: Profissional = {
        id: profissionalId,
        ...profissionalData,
        criado_em: new Date().toISOString(),
      };
      setProfissionais(prev => [...prev, novo]);
    }

    // Vincular serviços
    const sucessoVinculo = await vincularProfissionalServicos(profissionalId, servicosSelecionados);
    if (sucessoVinculo) {
      setProfServCache(prev => {
        const filtrado = prev.filter(ps => ps.profissional_id !== profissionalId);
        const novosVinculos = servicosSelecionados.map(sId => ({
          profissional_id: profissionalId,
          servico_id: sId
        }));
        return [...filtrado, ...novosVinculos];
      });
    }

    setEditando(null);
    setFotoLocal(null);
    setServicosSelecionados([]);
    setDiasAtivos([]);
    setShowForm(false);
  };

  const abrirForm = (prof?: Profissional) => {
    if (prof) {
      setEditando(prof);
      setFotoLocal(prof.foto_url ?? null);
      setServicosSelecionados(profServCache.filter(ps => ps.profissional_id === prof.id).map(ps => ps.servico_id));
      setDiasAtivos(Object.keys(prof.jornada_semanal || {}).map(Number));
    } else {
      setEditando(null);
      setFotoLocal(null);
      setServicosSelecionados([]);
      setDiasAtivos([]);
    }
    setShowForm(true);
  };

  return (
    <div className="py-8">
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

        {loading && (
          <div className="text-center py-6 text-foreground/50">Carregando profissionais...</div>
        )}

        {/* Form */}
        {showForm && (
          <CardGlass className="mb-6">
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
                  <div className="flex items-center gap-3">
                    {fotoLocal && (
                      <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-[var(--border-subtle)] bg-foreground/5 relative">
                        <Image src={fotoLocal} alt="Prévia" fill className="object-cover" />
                      </div>
                    )}
                    <label className="flex-1 flex items-center gap-2 cursor-pointer bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-foreground text-sm hover:border-primary transition-colors">
                      <span className="truncate flex-1">{fotoLocal ? 'Trocar Foto...' : 'Selecionar Arquivo...'}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleFotoUpload} />
                    </label>
                  </div>
                  {fotoLocal && (
                    <p className="text-[10px] text-foreground/40 mt-1">A imagem será ajustada num círculo automaticamente.</p>
                  )}
                </div>
              </div>

              {/* Serviços que realiza */}
              <div>
                <label className="block text-xs text-foreground/60 mb-3">Serviços Oferecidos (por categoria)</label>
                <div className="space-y-4">
                  {Object.entries(
                    servicosCache.reduce((acc, servico) => {
                      const cat = servico.categoria || 'Outros';
                      if (!acc[cat]) acc[cat] = [];
                      acc[cat].push(servico);
                      return acc;
                    }, {} as Record<string, Servico[]>)
                  ).map(([categoria, servicos]) => (
                    <div key={categoria} className="bg-[var(--background)] p-3 rounded-lg border border-[var(--border-subtle)]">
                      <button
                        type="button"
                        className="w-full text-xs font-bold uppercase tracking-wider text-primary flex items-center justify-between cursor-pointer"
                        onClick={() => setCategoriasColapsadas(prev =>
                          prev.includes(categoria)
                            ? prev.filter(c => c !== categoria)
                            : [...prev, categoria]
                        )}
                      >
                        <span className="flex items-center gap-2">
                          {categoria}
                          <ChevronDown
                            size={14}
                            className={`transition-transform duration-200 ${categoriasColapsadas.includes(categoria) ? '-rotate-90' : 'rotate-0'}`}
                          />
                        </span>
                        <span className="text-[10px] text-foreground/40 font-normal">{servicos.length} serviços</span>
                      </button>
                      {!categoriasColapsadas.includes(categoria) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                          {servicos.map(servico => (
                            <label key={servico.id} className="flex items-center gap-2 text-sm text-foreground bg-[var(--color-card)] border border-[var(--border-subtle)] p-2 rounded cursor-pointer hover:border-primary transition-colors">
                              <input 
                                type="checkbox" 
                                checked={servicosSelecionados.includes(servico.id)} 
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setServicosSelecionados(prev => [...prev, servico.id]);
                                  } else {
                                    setServicosSelecionados(prev => prev.filter(id => id !== servico.id));
                                  }
                                }}
                                className="accent-primary w-4 h-4 shrink-0"
                              />
                              <span className="truncate flex-1">{servico.nome}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Jornada semanal */}
              <div>
                <label className="block text-xs text-foreground/60 mb-2">Jornada Semanal</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                  {DIAS_SEMANA.map((dia, i) => {
                    const isAtivo = diasAtivos.includes(i);
                    const jornada = editando?.jornada_semanal?.[i];
                    return (
                      <div key={i} className={`rounded-lg p-3 border transition-colors ${isAtivo ? 'bg-[var(--background)] border-primary/50' : 'bg-foreground/5 border-[var(--border-subtle)]'}`}>
                        <label className="flex items-center justify-center gap-2 cursor-pointer mb-2">
                          <input 
                            type="checkbox" 
                            checked={isAtivo}
                            onChange={(e) => {
                              if (e.target.checked) setDiasAtivos(prev => [...prev, i]);
                              else setDiasAtivos(prev => prev.filter(d => d !== i));
                            }}
                            className="accent-primary"
                          />
                          <span className={`text-sm font-bold ${isAtivo ? 'text-primary' : 'text-foreground/60'}`}>{dia}</span>
                        </label>
                        
                        {isAtivo ? (
                          <div className="space-y-1 animate-in fade-in">
                            <input name={`jornada_${i}_inicio`} type="time" defaultValue={jornada?.inicio ?? '09:00'} className="w-full bg-transparent border border-[var(--border-subtle)] rounded px-2 py-1 text-xs text-center text-foreground focus:outline-none focus:border-primary [color-scheme:dark]" required />
                            <input name={`jornada_${i}_fim`} type="time" defaultValue={jornada?.fim ?? '18:00'} className="w-full bg-transparent border border-[var(--border-subtle)] rounded px-2 py-1 text-xs text-center text-foreground focus:outline-none focus:border-primary [color-scheme:dark]" required />
                          </div>
                        ) : (
                          <div className="text-[10px] text-foreground/40 text-center py-2">Folga</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" variant="primary" size="md">Salvar</Button>
                <Button type="button" variant="ghost" size="md" onClick={() => { setShowForm(false); setEditando(null); setFotoLocal(null); setServicosSelecionados([]); setDiasAtivos([]); }}>Cancelar</Button>
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
                      <Image src={prof.foto_url} alt={prof.nome} fill className="object-cover" />
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
                      <span className="flex items-center gap-1"><Calendar size={12} /> {stats.totalServicos} serviços</span>
                      <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-400" /> R$ {stats.totalValor.toFixed(2)}</span>
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
          <CardGlass className="text-center py-8 mt-6">
            <p className="text-foreground/50">Nenhum profissional encontrado.</p>
          </CardGlass>
        )}
      </div>
    </div>
  );
}
