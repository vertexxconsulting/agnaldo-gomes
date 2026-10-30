'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  X, Check, Search, SlidersHorizontal, Sparkles, 
  CheckSquare, Square, Layers, Scissors, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/Button';
import { fetchServicos } from '@/lib/supabase-queries';
import { Servico } from '@/lib/gestao-types';

interface ModalServicosFeedbackProps {
  isOpen: boolean;
  onClose: () => void;
  tipoFiltro?: 'todos' | 'selecionados';
  servicosSelecionados?: string[];
  categoriasSelecionadas?: string[];
  onConfirmar: (dados: {
    tipo_filtro: 'todos' | 'selecionados';
    servicos_permitidos: string[];
    categorias_permitidas: string[];
  }) => void;
}

export function ModalServicosFeedback({
  isOpen,
  onClose,
  tipoFiltro = 'todos',
  servicosSelecionados = [],
  categoriasSelecionadas = [],
  onConfirmar,
}: ModalServicosFeedbackProps) {
  const [modo, setModo] = useState<'todos' | 'selecionados'>(tipoFiltro);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(servicosSelecionados));
  const [busca, setBusca] = useState('');

  // Carregar lista de serviços do salão ao abrir
  useEffect(() => {
    if (isOpen) {
      setModo(tipoFiltro);
      setSelectedIds(new Set(servicosSelecionados));
      carregarServicos();
    }
  }, [isOpen, tipoFiltro, servicosSelecionados]);

  const carregarServicos = async () => {
    setLoading(true);
    try {
      const lista = await fetchServicos(true);
      setServicos(lista);
    } catch (e) {
      console.error('Erro ao carregar serviços:', e);
    } finally {
      setLoading(false);
    }
  };

  // Agrupamento por categoria
  const categoriasMap = useMemo(() => {
    const map = new Map<string, Servico[]>();
    for (const s of servicos) {
      const cat = s.categoria || 'Outros';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(s);
    }
    return map;
  }, [servicos]);

  const categorias = useMemo(() => Array.from(categoriasMap.keys()).sort(), [categoriasMap]);

  // Filtro de busca
  const servicosFiltrados = useMemo(() => {
    if (!busca.trim()) return servicos;
    const term = busca.toLowerCase();
    return servicos.filter(
      s => s.nome.toLowerCase().includes(term) || (s.categoria || '').toLowerCase().includes(term)
    );
  }, [servicos, busca]);

  const toggleServico = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCategoria = (cat: string) => {
    const servicosDaCat = categoriasMap.get(cat) || [];
    const todosMarcados = servicosDaCat.every(s => selectedIds.has(s.id));

    setSelectedIds(prev => {
      const next = new Set(prev);
      for (const s of servicosDaCat) {
        if (todosMarcados) {
          next.delete(s.id);
        } else {
          next.add(s.id);
        }
      }
      return next;
    });
  };

  const selecionarTodos = () => {
    setSelectedIds(new Set(servicos.map(s => s.id)));
  };

  const desmarcarTodos = () => {
    setSelectedIds(new Set());
  };

  // Preset inteligente: Coloração, Mechas, Tratamentos, Mega Hair e Noivas
  const presetQuimicaETratamentos = () => {
    const catsAlvo = ['Coloração', 'Tratamentos', 'Mega Hair', 'Noivas'];
    const ids = servicos
      .filter(s => catsAlvo.some(c => (s.categoria || '').toLowerCase().includes(c.toLowerCase())))
      .map(s => s.id);
    setSelectedIds(new Set(ids));
  };

  const handleSalvar = () => {
    onConfirmar({
      tipo_filtro: modo,
      servicos_permitidos: Array.from(selectedIds),
      categorias_permitidas: [],
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div 
        className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-[var(--background)] border border-gold/30 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* CABEÇALHO */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)] bg-foreground/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gold/10 text-gold border border-gold/20">
              <SlidersHorizontal size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Serviços para Pesquisa de Feedback
              </h3>
              <p className="text-xs text-foreground/60 mt-0.5">
                Escolha quais procedimentos concluídos geram mensagem de avaliação pós-atendimento.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-foreground/50 hover:text-foreground rounded-lg hover:bg-foreground/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* CORPO DO MODAL */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {/* SELEÇÃO DO MODO (TODOS vs SELECIONADOS) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                modo === 'todos'
                  ? 'border-gold bg-gold/[0.05] shadow-sm'
                  : 'border-[var(--border-subtle)] bg-foreground/[0.01] hover:bg-foreground/[0.03]'
              }`}
            >
              <input
                type="radio"
                name="modo_feedback"
                checked={modo === 'todos'}
                onChange={() => setModo('todos')}
                className="mt-0.5 text-gold focus:ring-gold"
              />
              <div>
                <p className="text-xs font-bold text-foreground">Todos os Serviços</p>
                <p className="text-[11px] text-foreground/60 mt-0.5 leading-relaxed">
                  Envia pedido de feedback para qualquer procedimento concluído no Studio.
                </p>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                modo === 'selecionados'
                  ? 'border-gold bg-gold/[0.05] shadow-sm'
                  : 'border-[var(--border-subtle)] bg-foreground/[0.01] hover:bg-foreground/[0.03]'
              }`}
            >
              <input
                type="radio"
                name="modo_feedback"
                checked={modo === 'selecionados'}
                onChange={() => setModo('selecionados')}
                className="mt-0.5 text-gold focus:ring-gold"
              />
              <div>
                <p className="text-xs font-bold text-foreground">Apenas Serviços Selecionados</p>
                <p className="text-[11px] text-foreground/60 mt-0.5 leading-relaxed">
                  Filtra apenas serviços de alto impacto (ex: Mechas, Coloração, Tratamentos, etc.).
                </p>
              </div>
            </label>
          </div>

          {/* ÁREA DE SELEÇÃO ESPECÍFICA */}
          {modo === 'selecionados' && (
            <div className="space-y-4 pt-2 border-t border-[var(--border-subtle)] animate-in fade-in">
              {/* BOTÕES DE PRESET / ATALHOS */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-foreground/60 mr-1">Atalhos:</span>
                <button
                  type="button"
                  onClick={presetQuimicaETratamentos}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-gold/10 text-gold border border-gold/30 hover:bg-gold/20 transition-colors"
                >
                  <Sparkles size={12} /> Química, Mechas & Tratamentos
                </button>
                <button
                  type="button"
                  onClick={selecionarTodos}
                  className="text-xs font-medium px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] text-foreground/70 hover:bg-foreground/5 transition-colors"
                >
                  Marcar Todos
                </button>
                <button
                  type="button"
                  onClick={desmarcarTodos}
                  className="text-xs font-medium px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] text-foreground/70 hover:bg-foreground/5 transition-colors"
                >
                  Desmarcar Todos
                </button>
              </div>

              {/* ATALHOS DE CATEGORIAS (Pills Rápidos) */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-foreground/50">
                  Categorias do Salão (clique para marcar/desmarcar a categoria inteira):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {categorias.map(cat => {
                    const servicosDaCat = categoriasMap.get(cat) || [];
                    const marcadosCount = servicosDaCat.filter(s => selectedIds.has(s.id)).length;
                    const totalCat = servicosDaCat.length;
                    const full = marcadosCount === totalCat && totalCat > 0;
                    const partial = marcadosCount > 0 && !full;

                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategoria(cat)}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all flex items-center gap-1.5 ${
                          full
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 font-bold'
                            : partial
                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 font-semibold'
                            : 'bg-foreground/[0.02] border-[var(--border-subtle)] text-foreground/60 hover:border-gold/30'
                        }`}
                      >
                        <span>{cat}</span>
                        <span className="text-[10px] opacity-75 font-mono">
                          ({marcadosCount}/{totalCat})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* BARRA DE BUSCA */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
                <input
                  type="text"
                  placeholder="Buscar serviço por nome..."
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-background border border-[var(--border-subtle)] rounded-lg text-foreground focus:outline-none focus:border-gold"
                />
              </div>

              {/* LISTA DE SERVIÇOS AGRUPADOS */}
              {loading ? (
                <div className="text-center py-8 text-xs text-foreground/50">Carregando catálogo de serviços...</div>
              ) : servicosFiltrados.length === 0 ? (
                <div className="text-center py-6 text-xs text-foreground/50">Nenhum serviço encontrado na busca.</div>
              ) : (
                <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                  {categorias.map(cat => {
                    const itensCat = servicosFiltrados.filter(s => (s.categoria || 'Outros') === cat);
                    if (itensCat.length === 0) return null;

                    const marcadosCount = itensCat.filter(s => selectedIds.has(s.id)).length;

                    return (
                      <div key={cat} className="p-3 rounded-xl border border-[var(--border-subtle)] bg-foreground/[0.01] space-y-2.5">
                        <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border-subtle)]">
                          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <Layers size={13} className="text-gold" />
                            {cat}
                            <span className="text-[10px] font-normal text-foreground/50 font-mono">
                              ({marcadosCount}/{itensCat.length} selecionados)
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleCategoria(cat)}
                            className="text-[11px] text-gold hover:underline font-semibold"
                          >
                            {marcadosCount === itensCat.length ? 'Desmarcar todos' : 'Marcar todos'}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {itensCat.map(s => {
                            const isChecked = selectedIds.has(s.id);
                            return (
                              <label
                                key={s.id}
                                className={`flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer transition-all text-xs ${
                                  isChecked
                                    ? 'border-gold/40 bg-gold/[0.04] text-foreground font-semibold'
                                    : 'border-[var(--border-subtle)] bg-background/50 text-foreground/70 hover:bg-foreground/[0.02]'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleServico(s.id)}
                                  className="rounded border-[var(--border-subtle)] text-gold focus:ring-gold"
                                />
                                <span className="flex-1 truncate">{s.nome}</span>
                                {typeof s.preco === 'number' && (
                                  <span className="text-[10px] text-foreground/50 font-mono shrink-0">
                                    R$ {s.preco.toFixed(0)}
                                  </span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RODAPÉ */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-[var(--border-subtle)] bg-foreground/[0.02]">
          <div className="text-xs text-foreground/70">
            {modo === 'todos' ? (
              <span className="text-emerald-400 font-semibold">
                ✓ Todos os serviços ativos geram feedback
              </span>
            ) : (
              <span>
                <strong className="text-gold">{selectedIds.size}</strong> serviços selecionados para feedback
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSalvar}
              className="text-xs font-bold shadow-md shadow-gold/10"
            >
              <Check size={14} className="mr-1.5" /> Confirmar Seleção
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

