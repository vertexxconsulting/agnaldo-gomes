'use client';

import { Play, Info } from 'lucide-react';
import Link from 'next/link';
import { MOCK_CURSOS, MOCK_PROGRESSO_ALUNO, MOCK_AULAS } from '@/lib/mock-data';

export default function AlunoDashboardPage() {
  const featuredCourse = MOCK_CURSOS[0];
  
  // Encontrar onde o aluno parou (última aula assistida não concluída, ou a última assistida)
  const aulaParou = MOCK_PROGRESSO_ALUNO.find(p => !p.concluida) || MOCK_PROGRESSO_ALUNO[MOCK_PROGRESSO_ALUNO.length - 1];
  const aulaAtualInfo = aulaParou ? MOCK_AULAS.find(a => a.id === aulaParou.aula_id) : null;
  const cursoAtualInfo = aulaAtualInfo ? MOCK_CURSOS.find(c => c.id === 'course_1') : null; // Simplificação mockada

  // Progressão da última aula assistida
  const progressPercent = aulaParou && aulaAtualInfo ? Math.round((aulaParou.assistidoSegundos / (aulaAtualInfo.duracaoMinutos * 60)) * 100) : 0;

  return (
    <div className="flex flex-col min-h-screen bg-[#141414] pb-20">
      {/* Banner Principal Estilo Netflix */}
      <div className="relative w-full h-[60vh] sm:h-[75vh] bg-black">
        {/* Imagem de Fundo */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-60"
          style={{ backgroundImage: `url(${featuredCourse.capaUrl})` }}
        />
        {/* Degradês para suavizar bordas */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/50 to-transparent" />
        
        {/* Conteúdo do Banner */}
        <div className="absolute bottom-0 left-0 w-full p-8 sm:p-16 flex flex-col justify-end">
          <h1 className="text-4xl sm:text-6xl font-black text-white mb-2 max-w-2xl drop-shadow-lg">
            {featuredCourse.titulo}
          </h1>
          <p className="text-white/80 text-sm sm:text-lg max-w-xl mb-6 drop-shadow-md line-clamp-3">
            {featuredCourse.descricao}
          </p>
          <div className="flex items-center gap-4">
            <Link 
              href={`/aluno/cursos/${featuredCourse.id}/aulas/aula_1`}
              className="bg-white text-black hover:bg-white/80 flex items-center gap-2 px-6 py-2.5 rounded text-sm sm:text-base font-bold transition-colors"
            >
              <Play size={20} className="fill-black" />
              Assistir Agora
            </Link>
            <Link 
              href={`/aluno/cursos/${featuredCourse.id}`}
              className="bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm flex items-center gap-2 px-6 py-2.5 rounded text-sm sm:text-base font-bold transition-colors"
            >
              <Info size={20} />
              Mais Informações
            </Link>
          </div>
        </div>
      </div>

      {/* Trilhas / Carrosséis */}
      <div className="flex flex-col gap-10 px-4 sm:px-8 lg:px-16 -mt-10 relative z-10">
        
        {/* Continue Assistindo */}
        {aulaAtualInfo && cursoAtualInfo && (
          <section>
            <h2 className="text-xl font-bold text-white mb-4">Continue Assistindo</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <Link href={`/aluno/cursos/${cursoAtualInfo.id}/aulas/${aulaAtualInfo.id}`} className="group relative rounded-md overflow-hidden bg-white/5 border border-white/10 hover:border-white/30 transition-colors block">
                <div className="aspect-video relative overflow-hidden bg-black/50">
                  <div className="absolute inset-0 bg-cover bg-center opacity-70 group-hover:opacity-100 transition-opacity" style={{ backgroundImage: `url(${cursoAtualInfo.capaUrl})` }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform">
                      <Play size={24} className="text-white fill-white ml-1" />
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-sm text-white line-clamp-1">{aulaAtualInfo.titulo}</h3>
                  <p className="text-xs text-white/50 mb-3 line-clamp-1">{cursoAtualInfo.titulo}</p>
                  
                  {/* Barra de Progresso */}
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-primary h-full" style={{ width: `${progressPercent}%` }} />
                  </div>
                  <div className="text-[10px] text-white/40 mt-1 text-right">{progressPercent}% concluído</div>
                </div>
              </Link>
            </div>
          </section>
        )}

        {/* Meus Cursos */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4">Meus Cursos (Catálogo)</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
            {MOCK_CURSOS.map((curso) => (
              <Link 
                key={curso.id} 
                href={`/aluno/cursos/${curso.id}`}
                className="flex-none w-[280px] sm:w-[320px] group relative rounded-md overflow-hidden snap-start hover:scale-105 transition-transform duration-300 shadow-xl border border-white/5 hover:border-white/20"
              >
                <div className="aspect-video relative bg-black">
                  <div className="absolute inset-0 bg-cover bg-center opacity-70 group-hover:opacity-100 transition-opacity" style={{ backgroundImage: `url(${curso.capaUrl})` }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#141414] to-transparent opacity-90" />
                  
                  <div className="absolute bottom-0 left-0 p-4 w-full">
                    <div className="text-[10px] font-bold text-primary mb-1 uppercase tracking-wider">{curso.nivel}</div>
                    <h3 className="font-bold text-sm sm:text-base text-white line-clamp-1">{curso.titulo}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] font-medium bg-white/10 px-2 py-0.5 rounded text-white/80">{curso.duracaoHoras}h</span>
                      <span className="text-[10px] font-medium bg-white/10 px-2 py-0.5 rounded text-white/80">{curso.totalAulas} aulas</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
        
        {/* Recomendados para Você */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Recomendados para Você</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
             {MOCK_CURSOS.slice().reverse().map((curso) => (
              <Link 
                key={curso.id + '_rec'} 
                href={`/aluno/cursos/${curso.id}`}
                className="flex-none w-[280px] sm:w-[320px] group relative rounded-md overflow-hidden snap-start hover:scale-105 transition-transform duration-300 shadow-xl border border-white/5 hover:border-white/20"
              >
                <div className="aspect-video relative bg-black">
                  <div className="absolute inset-0 bg-cover bg-center opacity-70 group-hover:opacity-100 transition-opacity" style={{ backgroundImage: `url(${curso.capaUrl})` }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#141414] to-transparent opacity-90" />
                  
                  <div className="absolute bottom-0 left-0 p-4 w-full flex items-center justify-between">
                     <div>
                       <h3 className="font-bold text-sm sm:text-base text-white line-clamp-1">{curso.titulo}</h3>
                       <div className="text-xs text-white/60 line-clamp-1">{curso.professor}</div>
                     </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
