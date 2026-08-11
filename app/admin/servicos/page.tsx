'use client';

import { useState } from 'react';
import { Plus, Edit, Trash2, Search, Clock, DollarSign, Eye, EyeOff, Users } from 'lucide-react';
import { SectionTitle } from '@/components/SectionTitle';
import { CardGlass } from '@/components/CardGlass';
import { Button } from '@/components/Button';
import { MOCK_SERVICOS, MOCK_PROF_SERVICO, MOCK_PROFISSIONAIS, getCategorias } from '@/lib/mock-data';
import type { Servico } from '@/lib/gestao-types';

export default function ServicosPage() {
  const [servicos, setServicos] = useState<Servico[]>(MOCK_SERVICOS);
  const [busca, setBusca] = useState('');
  const [catFiltro, setCatFiltro] = useState<string>('todas');
  const [editando, setEditando] = useState<Servico | null>(null);
  const [showForm, setShowForm] = useState(false);

  const categorias = getCategorias();

  const filtrados = servicos.filter(s => {
    const matchBusca = s.nome.toLowerCase().includes(busca.toLowerCase()) || s.categoria.toLowerCase().includes(busca.toLowerCase());
    const matchCat = catFiltro === 'todas' || s.categoria === catFiltro;
    return matchBusca && matchCat;
  });

  const profsPorServico = (servicoId: string) => {
    const ids = MOCK_PROF_SERVICO.filter(ps => ps.servico_id === servicoId).map(ps => ps.profissional_id);
    return MOCK_PROFISSIONAIS.filter(p => ids.includes(p.id)).map(p => p.nome);
  };

  const toggleAtivo = (id: string) => {
    setServicos(prev => prev.map(s => s.id === id ? { ...s, ativo: !s.ativo } : s));
  };

  const toggleVisivel = (id: string) => {
    setServicos(prev => prev.map(s => s.id === id ? { ...s, visivel_app: !s.visivel_app } : s));
  };

  const excluir = (id: string) => {
    setServicos(prev => prev.filter(s => s.id !== id));
  };

  const salvar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const novoServico: Servico = {
      id: editando?.id ?? `s${Date.now()}`,
      nome: form.get('nome') as string,
      categoria: form.get('categoria') as string,
      duracao_min: Number(form.get('duracao_min')),
      preco: Number(form.get('preco')),
      ativo: true,
      visivel_app: true,
    };
    if (editando) {
      setServicos(prev => prev.map(s => s.id === editando.id ? novoServico : s));
    } else {
      setServicos(prev => [...prev, novoServico]);
    }
    setEditando(null);
    setShowForm(false);
  };

  return (
    <div className="py-12">
      <div className="container mx-auto px-6">
        <SectionTitle title="Serviços" subtitle="Cadastro · Categorias · Duração · Preço" align="left" />

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-4 mt-10 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" size={18} />
            <input
              value={busca} onChange={e => setBusca(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-lg text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Buscar serviço..."
            />
          </div>
          <select
            value={catFiltro} onChange={e => setCatFiltro(e.target.value)}
            className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="todas">Todas categorias</option>
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <Button variant="primary" size="md" onClick={() => { setEditando(null); setShowForm(true); }}>
            <Plus size={18} className="mr-2" /> Novo Serviço
          </Button>
        </div>

        {/* Form inline */}
        {showForm && (
          <CardGlass className="mb-8">
            <h3 className="text-lg font-bold mb-4">{editando ? 'Editar Serviço' : 'Novo Serviço'}</h3>
            <form onSubmit={salvar} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs text-foreground/60 mb-1">Nome</label>
                <input name="nome" required defaultValue={editando?.nome ?? ''} className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-foreground text-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs text-foreground/60 mb-1">Categoria</label>
                <input name="categoria" required defaultValue={editando?.categoria ?? ''} list="categorias-list" className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-foreground text-sm focus:outline-none focus:border-primary" />
                <datalist id="categorias-list">{categorias.map(c => <option key={c} value={c} />)}</datalist>
              </div>
              <div>
                <label className="block text-xs text-foreground/60 mb-1">Duração (min)</label>
                <input name="duracao_min" type="number" min={5} required defaultValue={editando?.duracao_min ?? 30} className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-foreground text-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs text-foreground/60 mb-1">Preço (R$)</label>
                <input name="preco" type="number" min={0} step={0.01} required defaultValue={editando?.preco ?? 0} className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-foreground text-sm focus:outline-none focus:border-primary" />
              </div>
              <div className="flex items-end gap-2">
                <Button type="submit" variant="primary" size="md" className="flex-1">Salvar</Button>
                <Button type="button" variant="ghost" size="md" onClick={() => { setShowForm(false); setEditando(null); }}>Cancelar</Button>
              </div>
            </form>
          </CardGlass>
        )}

        {/* Tabela */}
        <CardGlass className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-foreground/40 text-xs uppercase tracking-wider border-b border-[var(--border-subtle)]">
                <th className="py-3 pr-4">Serviço</th>
                <th className="py-3 pr-4">Categoria</th>
                <th className="py-3 pr-4">Duração</th>
                <th className="py-3 pr-4">Preço</th>
                <th className="py-3 pr-4">Profissionais</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(s => (
                <tr key={s.id} className={`border-b border-[var(--border-subtle)] last:border-0 hover:bg-foreground/5 ${!s.ativo ? 'opacity-50' : ''}`}>
                  <td className="py-3 pr-4 font-medium text-foreground">{s.nome}</td>
                  <td className="py-3 pr-4"><span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">{s.categoria}</span></td>
                  <td className="py-3 pr-4 text-foreground/70"><Clock size={13} className="inline mr-1" />{s.duracao_min} min</td>
                  <td className="py-3 pr-4 text-primary font-semibold"><DollarSign size={13} className="inline" />R$ {Number(s.preco).toFixed(2)}</td>
                  <td className="py-3 pr-4 text-foreground/60 text-xs">
                    {profsPorServico(s.id).length > 0
                      ? profsPorServico(s.id).join(', ')
                      : <span className="text-foreground/30">Nenhum</span>
                    }
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex gap-2">
                      <button onClick={() => toggleAtivo(s.id)} title={s.ativo ? 'Desativar' : 'Ativar'}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.ativo ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                        {s.ativo ? 'Ativo' : 'Inativo'}
                      </button>
                      <button onClick={() => toggleVisivel(s.id)} title={s.visivel_app ? 'Ocultar do app' : 'Mostrar no app'}
                        className="text-foreground/40 hover:text-foreground/70">
                        {s.visivel_app ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <div className="inline-flex gap-1">
                      <button onClick={() => { setEditando(s); setShowForm(true); }} title="Editar" className="p-1.5 rounded-md hover:bg-foreground/5 text-foreground/60 hover:text-primary transition-colors"><Edit size={14} /></button>
                      <button onClick={() => excluir(s.id)} title="Excluir" className="p-1.5 rounded-md hover:bg-red-500/10 text-foreground/60 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr><td colSpan={7} className="py-10 text-center text-foreground/50">Nenhum serviço encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </CardGlass>

        {/* Resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          {[
            { label: 'Total', value: servicos.length },
            { label: 'Ativos', value: servicos.filter(s => s.ativo).length },
            { label: 'Categorias', value: categorias.length },
            { label: 'Ticket médio', value: `R$ ${Math.round(servicos.filter(s => s.ativo).reduce((a, s) => a + s.preco, 0) / Math.max(1, servicos.filter(s => s.ativo).length))}` },
          ].map((item, i) => (
            <CardGlass key={i} className="text-center py-4">
              <span className="text-xs text-foreground/50 uppercase tracking-wider">{item.label}</span>
              <div className="text-2xl font-bold text-primary mt-1">{item.value}</div>
            </CardGlass>
          ))}
        </div>
      </div>
    </div>
  );
}
