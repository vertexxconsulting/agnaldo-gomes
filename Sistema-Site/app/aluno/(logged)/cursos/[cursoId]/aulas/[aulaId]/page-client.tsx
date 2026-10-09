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
        <div className="flex items-center p-6 sm:px-12 sm:py-8 gap-4">
          <Link href={`/aluno/cursos/${curso?.id}`} className="flex items-center gap-3 text-white/70 hover:text-white transition-colors group">
            <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center bg-black/40 group-hover:bg-white/10 backdrop-blur-md">
              <ArrowLeft size={20} />
            </div>
            <span className="font-bold text-sm tracking-wide uppercase hidden sm:block">Voltar para a série</span>
          </Link>
        </div>

        {/* Hero e Main Content */}
        <div className="flex flex-col lg:flex-row flex-1 px-6 sm:px-12 gap-12 pb-20">
          
          {/* Lado Esquerdo - Hero (Título, Player, Botões, Descrição) */}
          <div className="flex-1 flex flex-col gap-6 max-w-5xl">
            
            {/* Título do vídeo na Hero */}
            <div className="flex flex-col gap-2">
              <h1 className="text-4xl sm:text-6xl font-black text-white drop-shadow-2xl leading-tight">
                {aula.title}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-white/70 text-sm sm:text-base font-medium">
                <span className="text-green-500 font-bold">Novo</span>
                <span>Módulo {modulo?.order_index}: {modulo?.title}</span>
                <span>•</span>
                <span>Episódio {aula.order_index}</span>
                <span>•</span>
                <span>{aula.duration_minutes} min</span>
              </div>
            </div>

            {/* Player de Vídeo */}
            <div className="w-full aspect-video bg-black rounded-sm shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden relative z-20 mt-4">
              <LessonPlayer
                videoUrl={aula.video_url ?? ''}
                poster={curso?.thumbnail_url ?? undefined}
                title={aula.title}
                className="w-full h-full"
              />
            </div>

            {/* Botões Grandes e Quadrados */}
            <div className="flex flex-col sm:flex-row items-center gap-4 mt-4">
              <button
                onClick={handleMarcarConcluida}
                className={`flex-1 w-full sm:flex-none flex items-center justify-center gap-3 px-10 py-4 font-bold text-lg rounded-sm transition-all duration-300 ${
                  concluidaLocal 
                    ? 'bg-green-500 text-black hover:bg-green-400 shadow-[0_0_20px_rgba(34,197,94,0.3)]' 
                    : 'bg-white text-black hover:bg-white/90 shadow-lg'
                }`}
              >
                <CheckCircle2 size={24} className={concluidaLocal ? "text-black" : "text-black"} />
                {concluidaLocal ? 'Concluída' : 'Marcar Concluída'}
              </button>

              {proximaAula && (
                <Link
                  href={`/aluno/cursos/${curso?.id}/aulas/${proximaAula.id}`}
                  className="flex-1 w-full sm:flex-none flex items-center justify-center gap-3 px-10 py-4 bg-white/10 text-white hover:bg-white/20 border border-white/20 font-bold text-lg rounded-sm transition-colors backdrop-blur-sm"
                >
                  Próximo Episódio <ChevronRight size={24} />
                </Link>
              )}
            </div>

            {/* Abas e Detalhes */}
            <div className="flex flex-col mt-8">
              <div className="flex border-b border-white/10 gap-8">
                <button
                  onClick={() => setActiveTab('desc')}
                  className={`pb-4 text-base font-bold transition-all border-b-4 ${activeTab === 'desc' ? 'border-red-600 text-white' : 'border-transparent text-white/50 hover:text-white/80'}`}
                >
                  Visão Geral
                </button>
                <button
                  onClick={() => setActiveTab('mat')}
                  className={`pb-4 text-base font-bold transition-all border-b-4 flex items-center gap-2 ${activeTab === 'mat' ? 'border-red-600 text-white' : 'border-transparent text-white/50 hover:text-white/80'}`}
                >
                  Materiais
                  {aula.materiais && aula.materiais.length > 0 && (
                    <span className="bg-white/10 text-white text-[10px] px-2 py-0.5 rounded-sm">{aula.materiais.length}</span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('anot')}
                  className={`pb-4 text-base font-bold transition-all border-b-4 ${activeTab === 'anot' ? 'border-red-600 text-white' : 'border-transparent text-white/50 hover:text-white/80'}`}
                >
                  Anotações
                </button>
              </div>

              <div className="pt-8">
                {activeTab === 'desc' && (
                  <p className="text-white/80 text-lg leading-relaxed max-w-4xl font-light">
                    {aula.description || 'Nenhuma descrição fornecida para esta aula. Aproveite o conteúdo em vídeo!'}
                  </p>
                )}

                {activeTab === 'mat' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl">
                    {aula.materiais && aula.materiais.length > 0 ? (
                      aula.materiais.map((mat, i) => (
                        <a key={i} href={mat.url} className="flex items-center justify-between p-5 rounded-sm border border-white/10 bg-white/5 hover:bg-white/10 transition-colors group backdrop-blur-md">
                          <div className="flex items-center gap-4 text-white">
                            <FileText size={24} className="text-white/60 group-hover:text-white transition-colors" />
                            <span className="font-bold text-base">{mat.titulo}</span>
                          </div>
                          <Download size={20} className="text-white/30 group-hover:text-white transition-colors" />
                        </a>
                      ))
                    ) : (
                      <p className="text-white/50 text-lg">Nenhum material complementar disponível.</p>
                    )}
                  </div>
                )}

                {activeTab === 'anot' && (
                  <div className="flex flex-col gap-4 max-w-4xl">
                    <textarea
                      className="w-full h-40 bg-white/5 border border-white/10 rounded-sm p-5 text-base text-white focus:outline-none focus:border-white/40 resize-none placeholder:text-white/30 backdrop-blur-md"
                      placeholder="Faça suas anotações pessoais aqui. Elas ficam salvas automaticamente neste episódio..."
                      value={notaAlunoLocal}
                      onChange={(e) => setNotaAlunoLocal(e.target.value)}
                    ></textarea>
                    <div className="flex justify-end">
                      <button 
                        className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold px-8 py-3 rounded-sm transition-colors backdrop-blur-sm"
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
          <div className="w-full lg:w-[400px] xl:w-[450px] flex flex-col gap-4">
            <h3 className="text-2xl font-black text-white mb-4 flex items-center gap-3">
              <ListVideo className="text-white/50" /> Episódios
            </h3>
            <div className="flex flex-col gap-3 max-h-[800px] overflow-y-auto custom-scrollbar pr-2">
              {aulasDoModulo.map(aulaItem => {
                const isActive = aulaItem.id === aula.id;
                const aulaConcluida = isDone(aulaItem.id) || (isActive && concluidaLocal);

                return (
                  <Link
                    key={aulaItem.id}
                    href={`/aluno/cursos/${curso?.id}/aulas/${aulaItem.id}`}
                    className={`flex items-center gap-4 p-4 rounded-sm transition-all border ${
                      isActive 
                        ? 'bg-white/10 border-white/30 shadow-lg scale-[1.02]' 
                        : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/20'
                    } backdrop-blur-md`}
                  >
                    <div className="text-3xl font-black text-white/20 w-12 text-center">
                      {aulaItem.order_index}
                    </div>
                    
                    <div className="relative w-32 aspect-video bg-black/50 rounded-sm overflow-hidden flex-shrink-0 border border-white/10">
                       <div 
                         className="absolute inset-0 bg-cover bg-center opacity-60"
                         style={{ backgroundImage: `url(${curso?.thumbnail_url || ''})` }}
                       />
                       {isActive && (
                         <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                           <Video size={24} className="text-white" />
                         </div>
                       )}
                    </div>

                    <div className="flex flex-col flex-1 py-1">
                      <span className={`text-base font-bold line-clamp-2 leading-tight ${isActive ? 'text-white' : 'text-white/70'}`}>
                        {aulaItem.title}
                      </span>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-white/50 font-medium">{aulaItem.duration_minutes} min</span>
                        {aulaConcluida && <CheckCircle2 size={14} className="text-green-500" />}
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