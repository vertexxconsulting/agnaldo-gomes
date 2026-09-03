'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Save, Plus, GripVertical, Edit2, Trash2, Video, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/Button';
import { ImageUpload } from '@/components/ImageUpload';

interface Curso {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  duration_hours: number;
  level: string;
  tags: string[];
}

interface Modulo {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
}

interface Aula {
  id: string;
  module_id: string;
  title: string;
  video_url: string;
  duration_minutes: number;
  order_index: number;
}

type ModuloComAulas = Modulo & { aulas: Aula[] };

export default function AdminEdicaoCursoPage() {
  const params = useParams();
  const cursoId = params.cursoId as string;
  const [curso, setCurso] = useState<Curso | null>(null);
  const [modulos, setModulos] = useState<ModuloComAulas[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'detalhes' | 'modulos'>('detalhes');
  const [cursoForm, setCursoForm] = useState({ title: '', description: '', thumbnail_url: '' });

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const [cursoRes, modulosRes, aulasRes] = await Promise.all([
        fetch(`/api/admin-academy/cursos/${cursoId}`),
        fetch(`/api/admin-academy/cursos/${cursoId}/modulos`),
        fetch(`/api/admin-academy/cursos/${cursoId}/aulas`),
      ]);

      if (cursoRes.ok) {
        const c = await cursoRes.json();
        setCurso(c);
        setCursoForm({
          title: c.title,
          description: c.description || '',
          thumbnail_url: c.thumbnail_url || '',
        });
      }

      if (modulosRes.ok && aulasRes.ok) {
        const mods = await modulosRes.json();
        const aulas = await aulasRes.json();
        const modsComAulas: ModuloComAulas[] = mods.map((m: Modulo) => ({
          ...m,
          aulas: aulas.filter((a: Aula) => a.module_id === m.id).sort((a: Aula, b: Aula) => a.order_index - b.order_index),
        }));
        setModulos(modsComAulas);
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    }
    setLoading(false);
  }, [cursoId]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const handleSaveCurso = async () => {
    if (!curso) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin-academy/cursos/${cursoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cursoForm),
      });
      if (res.ok) {
        const updated = await res.json();
        setCurso(updated.curso);
        alert('Curso salvo com sucesso!');
      } else {
        const err = await res.json();
        alert('Erro ao salvar: ' + (err.error || 'Erro desconhecido'));
      }
    } catch (err) {
      console.error('Erro ao salvar curso:', err);
      alert('Erro de conexão');
    }
    setSaving(false);
  };

  const handleCreateModulo = async () => {
    const titulo = prompt('Título do novo módulo:');
    if (!titulo?.trim()) return;

    try {
      const res = await fetch(`/api/admin-academy/cursos/${cursoId}/modulos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titulo.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setModulos(prev => [...prev, { ...data.modulo, aulas: [] }]);
      } else {
        const err = await res.json();
        alert('Erro ao criar módulo: ' + (err.error || 'Erro desconhecido'));
      }
    } catch (err) {
      console.error('Erro ao criar módulo:', err);
      alert('Erro de conexão');
    }
  };

  const handleUpdateModulo = async (moduloId: string, title: string) => {
    try {
      const res = await fetch(`/api/admin-academy/cursos/${cursoId}/modulos/${moduloId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        carregarDados();
      } else {
        const err = await res.json();
        alert('Erro ao atualizar: ' + (err.error || 'Erro desconhecido'));
      }
    } catch (err) {
      console.error('Erro ao atualizar módulo:', err);
      alert('Erro de conexão');
    }
  };

  const handleDeleteModulo = async (moduloId: string) => {
    if (!confirm('Excluir este módulo e todas as suas aulas?')) return;

    try {
      const res = await fetch(`/api/admin-academy/cursos/${cursoId}/modulos/${moduloId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setModulos(prev => prev.filter(m => m.id !== moduloId));
      } else {
        const err = await res.json();
        alert('Erro ao excluir: ' + (err.error || 'Erro desconhecido'));
      }
    } catch (err) {
      console.error('Erro ao excluir módulo:', err);
      alert('Erro de conexão');
    }
  };

  const handleCreateAula = async (module_id: string) => {
    const titulo = prompt('Título da nova aula:');
    if (!titulo?.trim()) return;

    try {
      const res = await fetch(`/api/admin-academy/cursos/${cursoId}/aulas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module_id, title: titulo.trim() }),
      });
      if (res.ok) {
        carregarDados();
      } else {
        const err = await res.json();
        alert('Erro ao criar aula: ' + (err.error || 'Erro desconhecido'));
      }
    } catch (err) {
      console.error('Erro ao criar aula:', err);
      alert('Erro de conexão');
    }
  };

  const handleUpdateAula = async (aulaId: string, data: Partial<Aula>) => {
    try {
      const res = await fetch(`/api/admin-academy/cursos/${cursoId}/aulas/${aulaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        carregarDados();
      } else {
        const err = await res.json();
        alert('Erro ao atualizar: ' + (err.error || 'Erro desconhecido'));
      }
    } catch (err) {
      console.error('Erro ao atualizar aula:', err);
      alert('Erro de conexão');
    }
  };

  const handleDeleteAula = async (aulaId: string) => {
    if (!confirm('Excluir esta aula?')) return;

    try {
      const res = await fetch(`/api/admin-academy/cursos/${cursoId}/aulas/${aulaId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        carregarDados();
      } else {
        const err = await res.json();
        alert('Erro ao excluir: ' + (err.error || 'Erro desconhecido'));
      }
    } catch (err) {
      console.error('Erro ao excluir aula:', err);
      alert('Erro de conexão');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-6 bg-white/10 rounded w-48 animate-pulse mb-2" />
        <div className="h-5 bg-white/10 rounded w-64 animate-pulse" />
      </div>
    );
  }

  if (!curso) {
    return <div className="p-6 text-foreground">Curso não encontrado.</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--background)]">

      {/* Header Fixo */}
      <div className="sticky top-0 z-10 bg-[var(--background)]/80 backdrop-blur-md border-b border-[var(--border-subtle)] px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin-academy/cursos" className="p-2 hover:bg-foreground/5 rounded-full text-foreground/70 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">Editar Curso</h1>
            <p className="text-sm text-foreground/60">{curso.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={carregarDados} disabled={loading}>Recarregar</Button>
          <Button variant="primary" className="flex items-center gap-2" onClick={handleSaveCurso} disabled={saving}>
            <Save size={16} /> {saving ? <Loader2 size={16} className="animate-spin" /> : 'Salvar Alterações'}
          </Button>
        </div>
      </div>

      <div className="p-6 max-w-5xl mx-auto">
        {/* Tabs */}
        <div className="flex border-b border-[var(--border-subtle)] mb-6">
          <button
            className={`px-6 py-3 font-medium text-sm transition-colors relative ${activeTab === 'detalhes' ? 'text-primary' : 'text-foreground/60 hover:text-foreground'}`}
            onClick={() => setActiveTab('detalhes')}
          >
            Detalhes do Curso
            {activeTab === 'detalhes' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
          </button>
          <button
            className={`px-6 py-3 font-medium text-sm transition-colors relative ${activeTab === 'modulos' ? 'text-primary' : 'text-foreground/60 hover:text-foreground'}`}
            onClick={() => setActiveTab('modulos')}
          >
            Módulos e Aulas
            {activeTab === 'modulos' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
          </button>
        </div>

        {/* Tab Detalhes */}
        {activeTab === 'detalhes' && (
          <div className="space-y-6">
            <div className="bg-[var(--color-card)] border border-[var(--border-subtle)] p-6 rounded-xl">
              <h2 className="text-lg font-bold text-foreground mb-4">Informações Básicas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-1">Título do Curso</label>
                    <input
                      type="text"
                      value={cursoForm.title}
                      onChange={e => setCursoForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-3 text-sm text-foreground focus:border-primary outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-1">Descrição</label>
                    <textarea
                      value={cursoForm.description}
                      onChange={e => setCursoForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={4}
                      className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-3 text-sm text-foreground focus:border-primary outline-none transition-colors resize-none"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-1">Capa do Curso</label>
                    <ImageUpload
                      value={cursoForm.thumbnail_url}
                      onChange={(url) => setCursoForm(prev => ({ ...prev, thumbnail_url: url }))}
                      folder={`cursos/${cursoId}`}
                    />
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* Tab Módulos */}
        {activeTab === 'modulos' && (
          <div className="space-y-6">

            <div className="flex justify-end">
              <Button variant="outline" className="flex items-center gap-2" onClick={handleCreateModulo}>
                <Plus size={16} /> Novo Módulo
              </Button>
            </div>

            <div className="space-y-4">
              {modulos.map((modulo, mIndex) => (
                <div key={modulo.id} className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
                  <ModuloCard
                    modulo={modulo}
                    index={mIndex}
                    cursoId={cursoId}
                    onUpdate={handleUpdateModulo}
                    onDelete={handleDeleteModulo}
                    onCreateAula={handleCreateAula}
                    onUpdateAula={handleUpdateAula}
                    onDeleteAula={handleDeleteAula}
                  />
                </div>
              ))}
            </div>

            {modulos.length === 0 && (
              <div className="text-center py-12 text-foreground/50 border-2 border-dashed border-[var(--border-subtle)] rounded-xl">
                Nenhum módulo ainda. Clique em "Novo Módulo" para começar.
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

function ModuloCard({
  modulo,
  index,
  cursoId,
  onUpdate,
  onDelete,
  onCreateAula,
  onUpdateAula,
  onDeleteAula,
}: {
  modulo: ModuloComAulas;
  index: number;
  cursoId: string;
  onUpdate: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onCreateAula: (module_id: string) => void;
  onUpdateAula: (id: string, data: Partial<Aula>) => void;
  onDeleteAula: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(modulo.title);
  const [expanded, setExpanded] = useState(true);

  const handleSaveModulo = () => {
    if (editTitle.trim()) {
      onUpdate(modulo.id, editTitle.trim());
      setEditing(false);
    }
  };

  const handleSaveAula = (aula: Aula, data: Partial<Aula>) => {
    onUpdateAula(aula.id, data);
  };

  return (
    <div className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
      {/* Cabeçalho do Módulo */}
      <div className="bg-[var(--background)]/50 p-4 flex items-center justify-between border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <GripVertical size={18} className="text-foreground/30 cursor-grab active:cursor-grabbing" />
          {editing ? (
            <>
              <input
                type="text"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveModulo()}
                onBlur={handleSaveModulo}
                autoFocus
                className="bg-[var(--background)] border border-primary px-2 py-1 rounded text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button onClick={handleSaveModulo} className="p-1.5 text-green-500 hover:text-green-400"><Edit2 size={16} /></button>
            </>
          ) : (
            <h3 className="font-bold text-foreground" onDoubleClick={() => setEditing(true)}>
              Módulo {index + 1}: {modulo.title}
            </h3>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button 
            className="p-1.5 text-foreground/50 hover:text-primary transition-colors" 
            onClick={() => setEditing(!editing)}
            title={editing ? 'Cancelar' : 'Editar'}
          >
            <Edit2 size={16} />
          </button>
          <button 
            className="p-1.5 text-foreground/50 hover:text-red-500 transition-colors" 
            onClick={() => onDelete(modulo.id)}
            title="Excluir módulo e todas as aulas"
          >
            <Trash2 size={16} />
          </button>
          <button 
            className="p-1.5 text-foreground/50 hover:text-primary transition-colors ml-2" 
            onClick={() => setExpanded(!expanded)}
            title={expanded ? 'Recolher' : 'Expandir'}
          >
            <GripVertical size={16} className={expanded ? 'rotate-90' : ''} />
          </button>
        </div>
      </div>

      {expanded && (
        <>
          {/* Lista de Aulas */}
          <div className="p-2 space-y-1">
            {modulo.aulas.map((aula, aIndex) => (
              <AulaCard
                key={aula.id}
                aula={aula}
                index={aIndex}
                onUpdate={handleSaveAula}
                onDelete={onDeleteAula}
              />
            ))}

            <button 
              onClick={() => onCreateAula(modulo.id)}
              className="w-full mt-2 py-3 border border-dashed border-[var(--border-subtle)] rounded-lg text-sm font-medium text-foreground/50 hover:text-primary hover:border-primary/50 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Adicionar Aula
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function AulaCard({
  aula,
  index,
  onUpdate,
  onDelete,
}: {
  aula: Aula;
  index: number;
  onUpdate: (aula: Aula, data: Partial<Aula>) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: aula.title,
    video_url: aula.video_url,
    duration_minutes: aula.duration_minutes,
  });

  const handleSave = () => {
    onUpdate(aula, editData);
    setEditing(false);
  };

  return (
    <div className="group flex items-center justify-between p-3 rounded-lg hover:bg-[var(--background)] transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
          {index + 1}
        </div>
        {editing ? (
          <div className="flex-1 space-y-2 min-w-0">
            <input
              type="text"
              value={editData.title}
              onChange={e => setEditData(prev => ({ ...prev, title: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              autoFocus
              className="w-full bg-[var(--background)] border border-primary px-2 py-1 rounded text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="URL do vídeo (Vimeo/YouTube/MP4)"
                value={editData.video_url}
                onChange={e => setEditData(prev => ({ ...prev, video_url: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                className="flex-1 bg-[var(--background)] border border-[var(--border-subtle)] px-2 py-1 rounded text-sm text-foreground focus:border-primary outline-none"
              />
              <input
                type="number"
                placeholder="Min"
                min="0"
                value={editData.duration_minutes}
                onChange={e => setEditData(prev => ({ ...prev, duration_minutes: Number(e.target.value) || 0 }))}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                className="w-20 bg-[var(--background)] border border-[var(--border-subtle)] px-2 py-1 rounded text-sm text-foreground focus:border-primary outline-none"
              />
            </div>
          </div>
        ) : (
          <>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{aula.title}</p>
              <p className="text-[11px] text-foreground/50">{aula.duration_minutes} min</p>
            </div>
            {aula.video_url && (
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">Vídeo</span>
            )}
          </>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {editing ? (
          <button 
            className="p-1.5 text-green-500 hover:text-green-600 transition-colors" 
            onClick={handleSave}
            title="Salvar Alterações"
          >
            <Save size={14} />
          </button>
        ) : (
          <button 
            className="p-1.5 text-foreground/50 hover:text-primary transition-colors" 
            onClick={() => setEditing(true)}
            title="Editar"
          >
            <Edit2 size={14} />
          </button>
        )}
        <button 
          className="p-1.5 text-foreground/50 hover:text-primary transition-colors" 
          title="Materiais Anexos"
        >
          <FileText size={14} />
        </button>
        <button 
          className="p-1.5 text-foreground/50 hover:text-red-500 transition-colors" 
          onClick={() => onDelete(aula.id)}
          title="Excluir"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}