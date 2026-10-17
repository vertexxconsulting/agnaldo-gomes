'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, Edit2, Trash2, Loader2, Globe, EyeOff, CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '@/components/Button';
import { Modal } from '@/components/ui/Modal';

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
  const router = useRouter();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin-academy/cursos', { cache: 'no-store' });
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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cursoTitleInput, setCursoTitleInput] = useState('');

  const handleCreateSubmit = async () => {
    if (!cursoTitleInput.trim()) return;

    setIsModalOpen(false);
    setCreating(true);
    try {
      const res = await fetch('/api/admin-academy/cursos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: cursoTitleInput.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setCursoTitleInput('');
        router.push(`/admin-academy/cursos/${data.curso.id}`);
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

  const [courseToDelete, setCourseToDelete] = useState<Curso | null>(null);

  const confirmDelete = (curso: Curso) => {
    setCourseToDelete(curso);
  };

  const executeDelete = async () => {
    if (!courseToDelete) return;
    const id = courseToDelete.id;
    setCourseToDelete(null);
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

  const handleTogglePublish = async (curso: Curso) => {
    const isCurrentlyPublished = curso.status === 'PUBLISHED';
    const nextStatus = isCurrentlyPublished ? 'DRAFT' : 'PUBLISHED';
    setPublishingId(curso.id);
    try {
      const res = await fetch(`/api/admin-academy/cursos/${curso.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        setCursos(prev => prev.map(c => c.id === curso.id ? { ...c, status: nextStatus } : c));
      } else {
        const err = await res.json();
        alert('Erro ao alterar status: ' + (err.error || 'Erro desconhecido'));
      }
    } catch (err) {
      console.error('Erro ao alternar publicação do curso:', err);
      alert('Erro de conexão');
    }
    setPublishingId(null);
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

        <Button variant="primary" className="flex items-center gap-2" onClick={() => setIsModalOpen(true)} disabled={creating}>
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
            className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg py-2 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:border-gold transition-colors"
          />
        </div>
      </div>

      {/* Grade de Cursos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredCursos.map(curso => {
          const isPublished = curso.status === 'PUBLISHED';
          const isPublishing = publishingId === curso.id;

          return (
            <div key={curso.id} className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-xl overflow-hidden flex flex-col group hover:border-gold/50 transition-all shadow-sm">

              {/* Capa */}
              <div className="aspect-video relative bg-foreground/10 border-b border-[var(--border-subtle)]">
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-90 group-hover:scale-105 transition-transform duration-300"
                  style={{ backgroundImage: `url(${curso.thumbnail_url || '/agnaldo1.webp'})` }}
                />

                <div className="absolute top-2 right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link href={`/admin-academy/cursos/${curso.id}`}>
                    <button className="bg-black/70 backdrop-blur border border-white/20 p-1.5 rounded-lg text-white hover:text-gold transition-colors" title="Editar curso">
                      <Edit2 size={15} />
                    </button>
                  </Link>
                  <button 
                    className="bg-black/70 backdrop-blur border border-white/20 p-1.5 rounded-lg text-white hover:text-red-400 transition-colors"
                    onClick={() => confirmDelete(curso)}
                    disabled={deletingId === curso.id}
                    title="Excluir curso"
                  >
                    {deletingId === curso.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                  </button>
                </div>
              </div>

              <div className="p-4 flex flex-col flex-1">
                {/* Badge de Status */}
                <div className="flex items-center justify-between mb-2.5">
                  {isPublished ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                      <CheckCircle2 size={11} className="text-emerald-700" /> Publicado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-950 border border-amber-300">
                      <EyeOff size={11} className="text-amber-800" /> Rascunho (Oculto)
                    </span>
                  )}
                  <span className="text-[10px] text-foreground/45 font-medium">
                    {new Date(curso.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                <h3 className="font-bold text-foreground text-base mb-1 line-clamp-2" title={curso.title}>
                  {curso.title}
                </h3>

                {/* Botões de Ação Direta no Card */}
                <div className="mt-auto pt-4 space-y-2 border-t border-[var(--border-subtle)]">
                  {isPublished ? (
                    <button
                      onClick={() => handleTogglePublish(curso)}
                      disabled={isPublishing}
                      className="w-full py-2 px-3 rounded-lg border border-[var(--border-subtle)] hover:border-amber-500/50 hover:bg-amber-500/10 text-foreground/70 hover:text-amber-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                      title="Ocultar este curso dos alunos e reverter para rascunho"
                    >
                      {isPublishing ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <>
                          <EyeOff size={13} />
                          <span>Mudar para Rascunho</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleTogglePublish(curso)}
                      disabled={isPublishing}
                      className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm hover:shadow disabled:opacity-50"
                      title="Publicar para que este curso apareça no catálogo dos alunos"
                    >
                      {isPublishing ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <>
                          <Globe size={13} />
                          <span>Publicar para Alunos</span>
                        </>
                      )}
                    </button>
                  )}

                  <Link href={`/admin-academy/cursos/${curso.id}`} className="block w-full">
                    <button className="w-full py-1.5 px-3 rounded-lg bg-foreground/5 hover:bg-foreground/10 text-foreground font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors">
                      <Edit2 size={12} />
                      <span>Editar Módulos & Aulas</span>
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          );
        })}

        {filteredCursos.length === 0 && (
          <div className="col-span-full text-center py-12 text-foreground/50">
            Nenhum curso encontrado. Clique em "Novo Curso" para começar.
          </div>
        )}
      </div>

      {/* Modal de Novo Curso */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Curso"
        description="Dê um título inicial ao seu novo curso."
      >
        <div className="space-y-4 pt-2">
          <input
            type="text"
            placeholder="Título do novo curso"
            value={cursoTitleInput}
            onChange={e => setCursoTitleInput(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border-subtle)] text-foreground focus:border-gold outline-none text-sm"
            onKeyDown={e => e.key === 'Enter' && handleCreateSubmit()}
          />
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setIsModalOpen(false)}
              className="flex-1 py-2 rounded-lg border border-[var(--border-subtle)] text-foreground/70 hover:bg-white/5 text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreateSubmit}
              disabled={!cursoTitleInput.trim() || creating}
              className="flex-1 py-2 rounded-lg bg-gold text-foreground font-semibold text-sm hover:bg-gold-dim disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gold"
            >
              {creating ? 'Criando...' : 'Criar Curso'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de Exclusão */}
      <Modal
        isOpen={!!courseToDelete}
        onClose={() => setCourseToDelete(null)}
        title="Excluir Curso"
        description="Tem certeza que deseja excluir este curso? Isso removerá todos os módulos e aulas permanentemente."
      >
        <div className="space-y-4 pt-2">
          <p className="font-bold text-red-500">{courseToDelete?.title}</p>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setCourseToDelete(null)}
              className="flex-1 py-2 rounded-lg border border-[var(--border-subtle)] text-foreground/70 hover:bg-white/5 text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={executeDelete}
              className="flex-1 py-2 rounded-lg bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Excluir
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}