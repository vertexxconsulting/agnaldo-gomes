'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Edit2, Copy, Trash2, Eye, MoreVertical } from 'lucide-react';
import { Button } from '@/components/Button';
import { MOCK_CURSOS } from '@/lib/mock-data';

export default function AdminCursosPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCursos = MOCK_CURSOS.filter(curso => 
    curso.titulo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-[var(--background)]">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cursos (Academy)</h1>
          <p className="text-sm text-foreground/60">Gerencie o catálogo de cursos e os conteúdos gravados.</p>
        </div>
        
        <Button variant="primary" className="flex items-center gap-2">
          <Plus size={18} /> Novo Curso
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
                style={{ backgroundImage: `url(${curso.capaUrl})` }} 
              />
              
              <div className="absolute top-2 right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link href={`/admin-academy/cursos/${curso.id}`}>
                  <button className="bg-black/60 backdrop-blur border border-white/20 p-1.5 rounded text-white hover:text-primary transition-colors">
                    <Edit2 size={16} />
                  </button>
                </Link>
                <button className="bg-black/60 backdrop-blur border border-white/20 p-1.5 rounded text-white hover:text-red-500 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            {/* Infos */}
            <div className="p-4 flex flex-col flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-primary uppercase tracking-wider">{curso.nivel}</span>
                <span className="text-[10px] text-foreground/50 bg-[var(--background)] px-2 py-0.5 rounded-full border border-[var(--border-subtle)]">
                  Rascunho
                </span>
              </div>
              
              <h3 className="font-bold text-foreground text-base mb-1 line-clamp-1" title={curso.titulo}>
                {curso.titulo}
              </h3>
              
              <div className="flex items-center justify-between text-xs text-foreground/50 mt-auto pt-4 border-t border-[var(--border-subtle)]">
                <span>{curso.totalAulas} Aulas</span>
                <span>{curso.duracaoHoras} Horas</span>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
