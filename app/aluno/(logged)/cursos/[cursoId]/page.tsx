'use client';

import { useState, useEffect } from 'react';
import { use } from 'react';
import { getCursos, getModulos, getAulas, getProgressoAluno } from '@/lib/mock-data';
import type { Curso, Modulo, Aula, Progresso } from '@/lib/mock-data';
import Link from 'next/link';
import { ArrowLeft, Play, CheckCircle2 } from 'lucide-react';

export default function CursoDetalhesPage({ params }: { params: Promise<{ cursoId: string }> }) {
  const { cursoId } = use(params);
  const [curso, setCurso] = useState<Curso | null>(null);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [progressoAluno, setProgressoAluno] = useState<Progresso[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      const [cursosData, modulosData, aulasData, progressoData] = await Promise.all([
        getCursos(),
        getModulos(),
        getAulas(),
        getProgressoAluno(),
      ]);

      const c = cursosData.find(c => c.id === cursoId);
      setCurso(c ?? null);

      const mods = modulosData.filter(m => m.curso_id === cursoId).sort((a,b) => a.ordem - b.ordem);
      setModulos(mods);

      const allAulas = aulasData.filter(a => mods.some(m => m.id === a.modulo_id));
      setAulas(allAulas);

      setProgressoAluno(progressoData);
      setLoading(false);
    };
    carregarDados();
  }, [cursoId]);

  // Calcular progresso
  const aulasConcluidas = aulas.filter(a => progressoAluno.some(p => p.aula_id === a.id && p.concluida)).length;
  const totalAulas = aulas.length;
  const progressPercent = totalAulas > 0 ? Math.round((aulasConcluidas / totalAulas) * 100) : 0;

  // Encontrar próxima aula para continuar
  const ultimaAulaAssistida = [...progressoAluno].reverse().find(p => aulas.some(a => a.id === p.aula_id));
  let urlContinuar = `/aluno/cursos/${cursoId}/aulas/${aulas[0]?.id}`;
  if (ultimaAulaAssistida) {
    if (!ultimaAulaAssistida.concluida) {
       urlContinuar = `/aluno/cursos/${cursoId}/aulas/${ultimaAulaAssistida.aula_id}`;
    } else {
       // Buscar a próxima aula se possível
       const idxAtual = aulas.findIndex(a => a.id === ultimaAulaAssistida.aula_id);
       if (idxAtual >= 0 && idxAtual < aulas.length - 1) {
           urlContinuar = `/aluno/cursos/${cursoId}/aulas/${aulas[idxAtual + 1].id}`;
       }
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#141414] pb-20">
        <div className="absolute top-24 left-4 sm:left-8 z-20">
          <Link href="/aluno/cursos" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md">
            <ArrowLeft size={16} /> <span className="text-sm font-medium">Voltar para meus cursos</span>
          </Link>
        </div>
        <div className="relative w-full h-[50vh] bg-black animate-pulse" />
        <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 mt-8 space-y-4">
          <div className="h-8 bg-white/10 rounded w-3/4 animate-pulse" />
          <div className="h-4 bg-white/10 rounded w-1/2 animate-pulse" />
          <div className="h-4 bg-white/10 rounded w-full animate-pulse" />
        </div>
      </div>
    );
  }

  if (!curso) {
    return <div className="text-white p-20 text-center">Curso não encontrado.</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#141414] pb-20">
      {/* Botão Voltar */}
      <div className="absolute top-24 left-4 sm:left-8 z-20">
        <Link href="/aluno/cursos" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md">
          <ArrowLeft size={16} /> <span className="text-sm font-medium">Voltar para meus cursos</span>
        </Link>
      </div>

      {/* Capa e Progresso */}
      <div className="relative w-full h-[50vh] bg-black">
        <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: `url(${curso.capaUrl})` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/80 to-transparent" />

        <div className="absolute bottom-0 left-0 w-full p-6 sm:p-12">
          <div className="max-w-4xl mx-auto flex flex-col items-start">
            <h1 className="text-3xl sm:text-5xl font-black text-white mb-2">{curso.titulo}</h1>
            <p className="text-white/70 text-sm sm:text-base max-w-2xl mb-6">{curso.descricao}</p>

            {/* Box Progresso */}
            <div className="w-full sm:w-2/3 bg-white/5 border border-white/10 rounded-xl p-4 mb-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-white">Progresso do curso: {progressPercent}%</span>
                <span className="text-xs text-white/50">{aulasConcluidas} de {totalAulas} aulas concluídas</span>
              </div>
              <div className="w-full bg-black/50 h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full transition-all duration-1000" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>

            <div className="flex gap-4">
              <Link
                href={urlContinuar}
                className="bg-white text-black hover:bg-white/80 flex items-center gap-2 px-8 py-3 rounded text-base font-bold transition-colors shadow-lg"
              >
                <Play size={20} className="fill-black" />
                {ultimaAulaAssistida ? 'Continuar de onde parei' : 'Começar Curso'}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Módulos */}
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 mt-8 flex flex-col gap-6">
        <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-2">Conteúdo do Curso</h2>

        <div className="flex flex-col gap-4">
          {modulos.map((modulo, i) => {
            const aulasModulo = aulas.filter(a => a.modulo_id === modulo.id).sort((a,b) => a.ordem - b.ordem);

            return (
              <div key={modulo.id} className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                {/* Cabeçalho do Módulo */}
                <div className="p-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
                  <h3 className="font-bold text-lg text-white">Módulo {i + 1} — {modulo.titulo}</h3>
                  <span className="text-xs text-white/50">{aulasModulo.length} aulas</span>
                </div>

                {/* Aulas do Módulo */}
                <div className="flex flex-col">
                  {aulasModulo.map((aula, idx) => {
                    const progress = progressoAluno.find(p => p.aula_id === aula.id);
                    const isConcluida = progress?.concluida;

                    return (
                      <Link
                        key={aula.id}
                        href={`/aluno/cursos/${cursoId}/aulas/${aula.id}`}
                        className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 group"
                      >
                        <div className="flex items-center gap-4">
                          {isConcluida ? (
                            <CheckCircle2 size={20} className="text-green-500 flex-shrink-0" />
                          ) : (
                            <Play size={20} className="text-white/40 group-hover:text-primary transition-colors flex-shrink-0" />
                          )}
                          <div>
                            <div className="text-sm font-medium text-white group-hover:text-primary transition-colors">
                              {String(idx + 1).padStart(2, '0')}. {aula.titulo}
                            </div>
                            <div className="text-xs text-white/40 mt-1 md:hidden">{aula.duracaoMinutos} min</div>
                          </div>
                        </div>
                        <div className="text-xs text-white/50 hidden md:block">
                          {aula.duracaoMinutos} min
                        </div>
                      </Link>
                    );
                  })}
                  {aulasModulo.length === 0 && (
                    <div className="p-4 text-sm text-white/40">Em breve</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
