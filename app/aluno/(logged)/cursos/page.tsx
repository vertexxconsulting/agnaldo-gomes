'use client';

import { useState, useEffect } from 'react';
import { PlayCircle } from 'lucide-react';
import Link from 'next/link';
import { getCursos, getProgressoAluno, getModulos, getAulas } from '@/lib/mock-data';
import type { Curso } from '@/lib/mock-data';

export default function MeusCursosPage() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [progressoAluno, setProgressoAluno] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const carregarDados = async () => {
      try {
        setLoading(true);
        const [cursosData, progressoData, modulosData, aulasData] = await Promise.all([
          getCursos(),
          getProgressoAluno(),
          getModulos(),
          getAulas(),
        ]);
        setCursos(cursosData);

        // Calcular progresso por curso
        const progress: Record<string, number> = {};
        cursosData.forEach(curso => {
          const modulosCurso = modulosData.filter(m => m.curso_id === curso.id);
          const aulasCurso = aulasData.filter(a => modulosCurso.some(m => m.id === a.modulo_id));
          const concluidas = progressoData.filter(p => p.concluida && aulasCurso.some(a => a.id === p.aula_id)).length;
          progress[curso.id] = aulasCurso.length > 0 ? Math.round((concluidas / aulasCurso.length) * 100) : 0;
        });
        setProgressoAluno(progress);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    carregarDados();
  }, []);

  // Helper para calcular progresso (fallback mock)
  const getCourseProgress = (cursoId: string) => {
    if (progressoAluno[cursoId] !== undefined) return progressoAluno[cursoId];

    // Fallback mock para curso_1
    if (cursoId === 'course_1') {
      const MOCK_PROGRESSO_ALUNO_FALLBACK = [
        { aula_id: 'aula_1', concluida: true },
        { aula_id: 'aula_2', concluida: true },
        { aula_id: 'aula_3', concluida: false },
      ];
      const concluidas = MOCK_PROGRESSO_ALUNO_FALLBACK.filter(p => p.concluida).length;
      return Math.round((concluidas / 5) * 100);
    }
    return 0;
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#141414] px-4 sm:px-8 lg:px-16 pt-10 pb-20">
        <h1 className="text-3xl font-black text-white mb-2">Meus Cursos</h1>
        <p className="text-white/60 mb-8">Carregando seus cursos...</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse bg-white/10 rounded-md aspect-[16/9] border border-white/10" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-[#141414] px-4 sm:px-8 lg:px-16 pt-10 pb-20">
        <h1 className="text-3xl font-black text-white mb-2">Meus Cursos</h1>
        <p className="text-white/60 mb-8">Nenhum curso carregado.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#141414] px-4 sm:px-8 lg:px-16 pt-10 pb-20">
      <h1 className="text-3xl font-black text-white mb-2">Meus Cursos</h1>
      <p className="text-white/60 mb-8">Todos os cursos que você possui acesso.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {cursos.map((curso) => {
          const progress = getCourseProgress(curso.id);
          const status = progress === 100 ? 'Concluído' : progress > 0 ? 'Em andamento' : 'Não iniciado';

          return (
            <Link
              key={curso.id}
              href={`/aluno/cursos/${curso.id}`}
              className="flex flex-col group relative rounded-md overflow-hidden bg-white/5 border border-white/10 hover:border-white/30 transition-all duration-300 shadow-lg hover:shadow-2xl hover:-translate-y-1"
            >
              <div className="aspect-video relative bg-black">
                <div className="absolute inset-0 bg-cover bg-center opacity-80 group-hover:opacity-100 transition-opacity" style={{ backgroundImage: `url(${curso.capaUrl})` }} />

                {/* Botão Hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                  <PlayCircle size={48} className="text-white drop-shadow-lg" />
                </div>
              </div>

              <div className="p-4 flex flex-col flex-1">
                <div className="text-xs font-bold text-primary mb-1 uppercase tracking-wider">{curso.nivel}</div>
                <h3 className="font-bold text-base text-white mb-2 line-clamp-2">{curso.titulo}</h3>

                <div className="flex items-center justify-between text-xs text-white/50 mb-3 mt-auto">
                  <span>{curso.totalAulas} aulas</span>
                  <span>{status}</span>
                </div>

                {/* Barra de Progresso */}
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mb-1">
                  <div className="bg-primary h-full transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
                <div className="text-[10px] text-white/40 text-right">{progress}% concluído</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
