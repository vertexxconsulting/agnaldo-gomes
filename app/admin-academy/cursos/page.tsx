'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, Edit2, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/Button';

interface Curso {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail_url: string;
  status: string;
  created_at: string;
}

export default function AdminCursosPage() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin-academy/cursos');
      if (res.ok) {
        const data = await res.json();
        setCursos(data || []);
      }
    } catch (err) {
      console.error('Erro ao carregar cursos:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  const handleCreate = async () => {
    const titulo = prompt('Título do novo curso:');
    if (!titulo?.trim()) return;

    setCreating(true);
    try {
      const res = await fetch('/api/admin-academy/cursos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titulo.trim() }),
      });
      if (res.ok) {
        carregar();
      } else {
        const err = await res.json();
        alert('Erro ao criar: ' + (err.error || 'Erro desconhecido'));
      }
    } catch (err) {
      console.error('Erro ao criar curso:', err);
      alert('Erro de conexão');
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este curso? Isso removerá todos os módulos e aulas.')) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin-academy/cursos/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        carregar();
      } else {
        const err = await res.json();
        alert('Erro ao excluir: ' + (err.error || 'Erro desconhecido'));
      }
    } catch (err) {
      console.error('Erro ao excluir curso:', err);
      alert('Erro de conexão');
    }
    setDeletingId(null);
  };

  const filteredCursos = cursos.filter(curso =>
    curso.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex-1 p-6 overflow-y-auto bg-[var(--background)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="h-7 bg-white/10 rounded w-48 animate-pulse mb-1" />
            <div className="h-5 bg-white/10 rounded w-72 animate-pulse" />
          </div>
          <div className="h-10 bg-white/10 rounded w-40 animate-pulse" />
        </div>
        <div className="h-12 bg-white/10 rounded mb-6 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-xl overflow-hidden animate-pulse">
              <div className="aspect-video bg-white/10" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-white/10 rounded" />
                <div className="h-4 bg-white/10 rounded w-5/6" />
                <div className="h-4 bg-white/10 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-[var(--background)]">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cursos (Academy)</h1>
          <p className="text-sm text-foreground/60">Gerencie o catálogo de cursos e os conteúdos gravados.</p>
        </div>

        <Button variant="primary" className="flex items-center gap-2" onClick={handleCreate} disabled={creating}>
          <Plus size={18} /> {creating ? <Loader2 size={16} className="animate-spin" /> : 'Novo Curso'}
        </Button>
      </div>

      {/* Busca e Filtros */}
      <div className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-xl p-4 mb-6 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" size={18} />
          <input
            type="text"
            placeholder="Buscar cursos por título..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg py-2 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Grade de Cursos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredCursos.map(curso => (
          <div key={curso.id} className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-xl overflow-hidden flex flex-col group hover:border-primary/50 transition-colors">

            {/* Capa */}
            <div className="aspect-video relative bg-black border-b border-[var(--border-subtle)]">
              <div
                className="absolute inset-0 bg-cover bg-center opacity-80"
                style={{ backgroundImage: `url(${curso.thumbnail_url})` }}
              />

              <div className="absolute top-2 right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link href={`/admin-academy/cursos/${curso.id}`}>
                  <button className="bg-black/60 backdrop-blur border border-white/20 p-1.5 rounded text-white hover:text-primary transition-colors">
                    <Edit2 size={16} />
                  </button>
                </Link>
                <button 
                  className="bg-black/60 backdrop-blur border border-white/20 p-1.5 rounded text-white hover:text-red-500 transition-colors"
                  onClick={() => handleDelete(curso.id)}
                  disabled={deletingId === curso.id}
                >
                  {deletingId === curso.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
              </div>
            </div>

            <div className="p-4 flex flex-col flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-foreground/50 bg-[var(--background)] px-2 py-0.5 rounded-full border border-[var(--border-subtle)]">
                  {curso.status === 'PUBLISHED' ? 'Publicado' : 'Rascunho'}
                </span>
              </div>

              <h3 className="font-bold text-foreground text-base mb-1 line-clamp-1" title={curso.title}>
                {curso.title}
              </h3>

              <div className="flex items-center justify-between text-xs text-foreground/50 mt-auto pt-4 border-t border-[var(--border-subtle)]">
                <span>Criado em: {new Date(curso.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          </div>
        ))}

        {filteredCursos.length === 0 && (
          <div className="col-span-full text-center py-12 text-foreground/50">
            Nenhum curso encontrado. Clique em "Novo Curso" para começar.
          </div>
        )}
      </div>

    </div>
  );
}