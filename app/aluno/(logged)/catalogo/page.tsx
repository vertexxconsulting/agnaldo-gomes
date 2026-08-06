'use client';

import { MOCK_CURSOS } from '@/lib/mock-data';
import Link from 'next/link';
import { Lock, Unlock, PlayCircle, Star } from 'lucide-react';
import { Button } from '@/components/Button';

export default function CatalogoPage() {
  
  // No mock, vamos fingir que o usuário só tem o course_1
  const hasAccess = (cursoId: string) => cursoId === 'course_1';

  return (
    <div className="flex flex-col min-h-screen bg-[#141414] px-4 sm:px-8 lg:px-16 pt-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white mb-2">Catálogo de Cursos</h1>
          <p className="text-white/60 max-w-2xl">Descubra novos conteúdos, formações e aprimore suas habilidades com nossos cursos especializados.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {MOCK_CURSOS.map((curso) => {
          const unlocked = hasAccess(curso.id);
          
          return (
            <div 
              key={curso.id} 
              className="flex flex-col group relative rounded-md overflow-hidden bg-white/5 border border-white/10 hover:border-white/30 transition-all duration-300 shadow-lg"
            >
              <div className="aspect-video relative bg-black">
                <div className="absolute inset-0 bg-cover bg-center opacity-80 transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: `url(${curso.capaUrl})` }} />
                
                {/* Badge Status */}
                <div className="absolute top-3 right-3 z-10">
                  {unlocked ? (
                    <div className="bg-primary/90 backdrop-blur text-black text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                      <Unlock size={14} /> Liberado
                    </div>
                  ) : (
                    <div className="bg-black/60 backdrop-blur text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1 border border-white/20">
                      <Lock size={14} /> Premium
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-4 flex flex-col flex-1 z-10 bg-[#1a1a1a]">
                <div className="text-xs font-bold text-primary mb-1 uppercase tracking-wider flex items-center justify-between">
                  {curso.nivel}
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star size={12} className="fill-yellow-500" /> 5.0
                  </div>
                </div>
                <h3 className="font-bold text-base text-white mb-2 line-clamp-1">{curso.titulo}</h3>
                <p className="text-sm text-white/60 mb-4 line-clamp-2 flex-1">{curso.descricao}</p>
                
                <div className="flex items-center justify-between text-xs text-white/50 mb-4">
                  <span>{curso.duracaoHoras} horas</span>
                  <span>{curso.totalAulas} aulas</span>
                </div>
                
                {unlocked ? (
                  <Link href={`/aluno/cursos/${curso.id}`}>
                    <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                      <PlayCircle size={18} />
                      Acessar Curso
                    </Button>
                  </Link>
                ) : (
                  <Button variant="primary" className="w-full flex items-center justify-center gap-2 font-bold">
                    <Lock size={18} />
                    Desbloquear
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
