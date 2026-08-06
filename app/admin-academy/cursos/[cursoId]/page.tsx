'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Save, Plus, GripVertical, Edit2, Trash2, Video, FileText } from 'lucide-react';
import { Button } from '@/components/Button';
import { MOCK_CURSOS, MOCK_MODULOS } from '@/lib/mock-data';

export default function AdminEdicaoCursoPage() {
  const { cursoId } = useParams();
  const curso = MOCK_CURSOS.find(c => c.id === cursoId);
  const modulos = MOCK_MODULOS[cursoId as string] || [];

  const [activeTab, setActiveTab] = useState<'detalhes' | 'modulos'>('detalhes');

  if (!curso) {
    return <div className="p-8 text-foreground">Curso não encontrado.</div>;
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
            <p className="text-sm text-foreground/60">{curso.titulo}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline">Cancelar</Button>
          <Button variant="primary" className="flex items-center gap-2">
            <Save size={16} /> Salvar Alterações
          </Button>
        </div>
      </div>

      <div className="p-8 max-w-5xl mx-auto">
        {/* Tabs */}
        <div className="flex border-b border-[var(--border-subtle)] mb-8">
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
                    <input type="text" defaultValue={curso.titulo} className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-3 text-sm text-foreground focus:border-primary outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-1">Nível</label>
                    <select defaultValue={curso.nivel} className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-3 text-sm text-foreground focus:border-primary outline-none transition-colors">
                      <option value="Iniciante">Iniciante</option>
                      <option value="Intermediário">Intermediário</option>
                      <option value="Avançado">Avançado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-1">Descrição</label>
                    <textarea defaultValue={curso.descricao} rows={4} className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-3 text-sm text-foreground focus:border-primary outline-none transition-colors" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-1">Capa do Curso</label>
                    <div className="aspect-video w-full bg-[var(--background)] border-2 border-dashed border-[var(--border-subtle)] rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors relative overflow-hidden">
                      <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: `url(${curso.capaUrl})` }} />
                      <Video className="text-foreground/40 mb-2 relative z-10" size={32} />
                      <span className="text-sm font-medium text-foreground/60 relative z-10">Clique para alterar a capa</span>
                    </div>
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
              <Button variant="outline" className="flex items-center gap-2">
                <Plus size={16} /> Novo Módulo
              </Button>
            </div>

            <div className="space-y-4">
              {modulos.map((modulo, mIndex) => (
                <div key={modulo.id} className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
                  
                  {/* Cabeçalho do Módulo */}
                  <div className="bg-[var(--background)]/50 p-4 flex items-center justify-between border-b border-[var(--border-subtle)]">
                    <div className="flex items-center gap-3">
                      <GripVertical size={18} className="text-foreground/30 cursor-grab active:cursor-grabbing" />
                      <h3 className="font-bold text-foreground">Módulo {mIndex + 1}: {modulo.titulo}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 text-foreground/50 hover:text-primary transition-colors"><Edit2 size={16} /></button>
                      <button className="p-1.5 text-foreground/50 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </div>

                  {/* Lista de Aulas */}
                  <div className="p-2 space-y-1">
                    {modulo.aulas.map((aula, aIndex) => (
                      <div key={aula.id} className="group flex items-center justify-between p-3 rounded-lg hover:bg-[var(--background)] transition-colors">
                        <div className="flex items-center gap-3">
                          <GripVertical size={16} className="text-foreground/20 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                            {aIndex + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{aula.titulo}</p>
                            <p className="text-[11px] text-foreground/50">{aula.duracao}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-1.5 text-foreground/50 hover:text-primary transition-colors" title="Editar Aula"><Edit2 size={14} /></button>
                          <button className="p-1.5 text-foreground/50 hover:text-primary transition-colors" title="Materiais Anexos"><FileText size={14} /></button>
                          <button className="p-1.5 text-foreground/50 hover:text-red-500 transition-colors" title="Excluir"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                    
                    <button className="w-full mt-2 py-3 border border-dashed border-[var(--border-subtle)] rounded-lg text-sm font-medium text-foreground/50 hover:text-primary hover:border-primary/50 transition-colors flex items-center justify-center gap-2">
                      <Plus size={16} /> Adicionar Aula
                    </button>
                  </div>

                </div>
              ))}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
