'use client';

import { useState } from 'react';
import { ArrowLeft, CheckCircle2, Download, FileText, ChevronRight, ListVideo, Video } from 'lucide-react';
import { Button } from '@/components/Button';
import { LessonPlayer } from '@/components/LessonPlayer';
import Link from 'next/link';

export interface Aula {
  id: string;
  modulo_id: string;
  title: string;
  video_url: string | null;
  duration_minutes: number;
  order_index: number;
  description: string | null;
  materiais?: { titulo: string; url: string; tipo: 'pdf' | 'link' }[];
}

export interface Modulo {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
}

export interface Curso {
  id: string;
  title: string;
  thumbnail_url: string | null;
}

interface EpisodioPageProps {
  aula: Aula;
  modulo: Modulo | null;
  curso: Curso | null;
  aulasDoModulo: Aula[];
  proximaAula: Aula | null;
  concluida: boolean;
  notaAluno: string;
  progressoMap: Map<string, boolean>;
}

export default function EpisodioPage({ 
  aula, 
  modulo, 
  curso, 
  aulasDoModulo, 
  proximaAula, 
  concluida, 
  notaAluno,
  progressoMap 
}: EpisodioPageProps) {
  const [concluidaLocal, setConcluidaLocal] = useState(concluida);
  const [notaAlunoLocal, setNotaAlunoLocal] = useState(notaAluno);
  const [activeTab, setActiveTab] = useState<'desc' | 'mat' | 'anot'>('desc');

  const isDone = (aulaId: string) => progressoMap.get(aulaId) ?? false;

  const handleMarcarConcluida = async () => {
    const novaConcluida = !concluidaLocal;
    setConcluidaLocal(novaConcluida);
    try {
      const { salvarProgressoAula } = await import('@/lib/mock-data');
      await salvarProgressoAula(aula.id, novaConcluida);
    } catch (err) {
      console.error('Erro ao salvar progresso:', err);
    }
  };

  const handleSalvarAnotacao = async () => {
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase.from('lesson_notes').upsert({
          user_id: user.id,
          lesson_id: aula.id,
          content: notaAlunoLocal,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,lesson_id' });
        if (error) throw error;
        alert('Anotação salva com sucesso!');
      } else {
        alert('Faça login para salvar anotações.');
      }
    } catch (err) {
      console.error('Erro ao salvar anotação:', err);
      alert('Erro ao salvar anotação.');
    }
  };

  return (
    <div className="flex flex-col min-h-screen relative bg-black text-white overflow-hidden">
      {/* Background Cinematográfico da Tela pegando a imagem do curso/vídeo */}
      <div 
        className="fixed inset-0 bg-cover bg-center opacity-40 blur-[80px] scale-110 z-0"
        style={{ backgroundImage: `url(${curso?.thumbnail_url || ''})` }}
      />
      <div className="fixed inset-0 bg-gradient-to-b from-black/40 via-black/80 to-black z-0" />

      {/* Conteúdo Sobreposto */}
      <div className="relative z-10 flex flex-col flex-1">
        
        {/* Header Voltar */}
        <div className="flex items-center p-4 sm:px-8 sm:py-6 gap-3">
          <Link href={`/aluno/cursos/${curso?.id}`} className="flex items-center gap-2.5 text-white/70 hover:text-white transition-colors group">
            <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center bg-black/40 group-hover:bg-white/10 backdrop-blur-md">
              <ArrowLeft size={16} />
            </div>
            <span className="font-semibold text-xs tracking-wider uppercase hidden sm:block">Voltar para a série</span>
          </Link>
        </div>

        {/* Hero e Main Content */}
        <div className="flex flex-col lg:flex-row flex-1 px-4 sm:px-8 gap-8 pb-16">
          
          {/* Lado Esquerdo - Hero (Título, Player, Botões, Descrição) */}
          <div className="flex-1 flex flex-col gap-4 max-w-5xl">
            
            {/* Título do vídeo na Hero */}
            <div className="flex flex-col gap-1.5">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight leading-snug">
                {aula.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2.5 text-white/70 text-xs sm:text-sm font-medium">
                <span className="text-green-400 font-semibold bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20 text-xs">Novo</span>
                <span>Módulo {modulo?.order_index}: {modulo?.title}</span>
                <span className="text-white/30">•</span>
                <span>Episódio {aula.order_index}</span>
                <span className="text-white/30">•</span>
                <span>{aula.duration_minutes} min</span>
              </div>
            </div>

            {/* Player de Vídeo */}
            <div className="w-full aspect-video bg-black rounded-lg shadow-[0_12px_40px_rgba(0,0,0,0.6)] border border-white/10 overflow-hidden relative z-20 mt-1">
              <LessonPlayer
                videoUrl={aula.video_url ?? ''}
                poster={curso?.thumbnail_url ?? undefined}
                title={aula.title}
                className="w-full h-full"
              />
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
              <button
                onClick={handleMarcarConcluida}
                className={`flex-1 w-full sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 font-semibold text-sm rounded-lg transition-all duration-300 ${
                  concluidaLocal 
                    ? 'bg-green-500 text-black hover:bg-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]' 
                    : 'bg-white text-black hover:bg-white/90 shadow-md'
                }`}
              >
                <CheckCircle2 size={18} className="text-black" />
                {concluidaLocal ? 'Concluída' : 'Marcar Concluída'}
              </button>

              {proximaAula && (
                <Link
                  href={`/aluno/cursos/${curso?.id}/aulas/${proximaAula.id}`}
                  className="flex-1 w-full sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-white/10 text-white hover:bg-white/20 border border-white/20 font-semibold text-sm rounded-lg transition-colors backdrop-blur-sm"
                >
                  Próximo Episódio <ChevronRight size={18} />
                </Link>
              )}
            </div>

            {/* Abas e Detalhes */}
            <div className="flex flex-col mt-6">
              <div className="flex border-b border-white/10 gap-6">
                <button
                  onClick={() => setActiveTab('desc')}
                  className={`pb-3 text-sm font-semibold transition-all border-b-2 ${activeTab === 'desc' ? 'border-primary text-white' : 'border-transparent text-white/50 hover:text-white/80'}`}
                >
                  Visão Geral
                </button>
                <button
                  onClick={() => setActiveTab('mat')}
                  className={`pb-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${activeTab === 'mat' ? 'border-primary text-white' : 'border-transparent text-white/50 hover:text-white/80'}`}
                >
                  Materiais
                  {aula.materiais && aula.materiais.length > 0 && (
                    <span className="bg-white/10 text-white text-[11px] px-2 py-0.5 rounded-full font-medium">{aula.materiais.length}</span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('anot')}
                  className={`pb-3 text-sm font-semibold transition-all border-b-2 ${activeTab === 'anot' ? 'border-primary text-white' : 'border-transparent text-white/50 hover:text-white/80'}`}
                >
                  Anotações
                </button>
              </div>

              <div className="pt-5">
                {activeTab === 'desc' && (
                  <p className="text-white/80 text-sm leading-relaxed max-w-3xl">
                    {aula.description || 'Nenhuma descrição fornecida para esta aula. Aproveite o conteúdo em vídeo!'}
                  </p>
                )}

                {activeTab === 'mat' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl">
                    {aula.materiais && aula.materiais.length > 0 ? (
                      aula.materiais.map((mat, i) => (
                        <a key={i} href={mat.url} className="flex items-center justify-between p-3.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors group backdrop-blur-md">
                          <div className="flex items-center gap-3 text-white">
                            <FileText size={18} className="text-white/60 group-hover:text-white transition-colors" />
                            <span className="font-medium text-sm">{mat.titulo}</span>
                          </div>
                          <Download size={16} className="text-white/40 group-hover:text-white transition-colors" />
                        </a>
                      ))
                    ) : (
                      <p className="text-white/50 text-sm">Nenhum material complementar disponível.</p>
                    )}
                  </div>
                )}

                {activeTab === 'anot' && (
                  <div className="flex flex-col gap-3 max-w-3xl">
                    <textarea
                      className="w-full h-32 bg-white/5 border border-white/10 rounded-lg p-3.5 text-sm text-white focus:outline-none focus:border-white/40 resize-none placeholder:text-white/30 backdrop-blur-md"
                      placeholder="Faça suas anotações pessoais aqui. Elas ficam salvas automaticamente neste episódio..."
                      value={notaAlunoLocal}
                      onChange={(e) => setNotaAlunoLocal(e.target.value)}
                    ></textarea>
                    <div className="flex justify-end">
                      <button 
                        className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold px-5 py-2 text-sm rounded-lg transition-colors backdrop-blur-sm"
                        onClick={handleSalvarAnotacao}
                      >
                        Salvar Anotação
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Lado Direito - Sidebar de Episódios */}
          <div className="w-full lg:w-[360px] xl:w-[400px] flex flex-col gap-3">
            <h3 className="text-base sm:text-lg font-bold text-white mb-1 flex items-center gap-2">
              <ListVideo size={20} className="text-white/60" /> Episódios
            </h3>
            <div className="flex flex-col gap-2.5 max-h-[700px] overflow-y-auto custom-scrollbar pr-2">
              {aulasDoModulo.map(aulaItem => {
                const isActive = aulaItem.id === aula.id;
                const aulaConcluida = isDone(aulaItem.id) || (isActive && concluidaLocal);

                return (
                  <Link
                    key={aulaItem.id}
                    href={`/aluno/cursos/${curso?.id}/aulas/${aulaItem.id}`}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all border ${
                      isActive 
                        ? 'bg-white/10 border-white/30 shadow-md' 
                        : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/20'
                    } backdrop-blur-md`}
                  >
                    <div className="text-base font-bold text-white/30 w-7 text-center flex-shrink-0">
                      {aulaItem.order_index}
                    </div>
                    
                    <div className="relative w-24 aspect-video bg-black/50 rounded overflow-hidden flex-shrink-0 border border-white/10">
                       <div 
                         className="absolute inset-0 bg-cover bg-center opacity-60"
                         style={{ backgroundImage: `url(${curso?.thumbnail_url || ''})` }}
                       />
                       {isActive && (
                         <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                           <Video size={18} className="text-white" />
                         </div>
                       )}
                    </div>

                    <div className="flex flex-col flex-1 py-0.5 min-w-0">
                      <span className={`text-xs sm:text-sm font-semibold line-clamp-2 leading-snug ${isActive ? 'text-white' : 'text-white/80'}`}>
                        {aulaItem.title}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-white/50 font-medium">{aulaItem.duration_minutes} min</span>
                        {aulaConcluida && <CheckCircle2 size={12} className="text-green-500" />}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}