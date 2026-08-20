'use client';

import { useState, useEffect } from 'react';
import { use } from 'react';
import { getCursos, getModulos, getAulas, getProgressoAluno } from '@/lib/mock-data';
import type { Curso, Aula, Modulo, Progresso } from '@/lib/mock-data';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Download, FileText, ChevronRight, ListVideo } from 'lucide-react';
import { Button } from '@/components/Button';
import { LessonPlayer } from '@/components/LessonPlayer';
import { supabase } from '@/lib/supabase';

export default function EpisodioPage({ params }: { params: Promise<{ cursoId: string; aulaId: string }> }) {
  const { cursoId, aulaId } = use(params);
  const [curso, setCurso] = useState<Curso | null>(null);
  const [aulaAtual, setAulaAtual] = useState<Aula | null>(null);
  const [moduloAtual, setModuloAtual] = useState<Modulo | null>(null);
  const [aulasDoModulo, setAulasDoModulo] = useState<Aula[]>([]);
  const [progressoAluno, setProgressoAluno] = useState<Progresso[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado local para marcar concluída
  const [concluida, setConcluida] = useState(false);
  const [notaAluno, setNotaAluno] = useState('');
  const [activeTab, setActiveTab] = useState<'desc' | 'mat' | 'anot'>('desc');

  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      try {
        const [cursosData, modulosData, aulasData, progressoData] = await Promise.all([
          getCursos(),
          getModulos(),
          getAulas(),
          getProgressoAluno(),
        ]);

        const c = cursosData.find(c => c.id === cursoId);
        setCurso(c ?? null);

        const aula = aulasData.find(a => a.id === aulaId);
        setAulaAtual(aula ?? null);

        if (aula) {
          const mod = modulosData.find(m => m.id === aula.modulo_id);
          setModuloAtual(mod ?? null);

          const aulasMod = aulasData.filter(a => a.modulo_id === aula.modulo_id).sort((a, b) => a.ordem - b.ordem);
          setAulasDoModulo(aulasMod);
        }

        setProgressoAluno(progressoData);

        // Inicializa estado de concluida a partir do progresso
        const p = progressoData.find(p => p.aula_id === aulaId);
        setConcluida(p?.concluida ?? false);

        // Carrega notas do Supabase
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: notaData } = await supabase
              .from('anotacoes_aula')
              .select('conteudo')
              .eq('user_id', user.id)
              .eq('aula_id', aulaId)
              .single();
            if (notaData?.conteudo) {
              setNotaAluno(notaData.conteudo);
            }
          }
        } catch {
          // Silently ignore errors
        }
      } catch {
        setCurso(null);
        setAulaAtual(null);
      }
      setLoading(false);
    };
    carregarDados();
  }, [cursoId, aulaId]);

  // Próxima aula (dentro do mesmo módulo por simplificação)
  const idxAtual = aulasDoModulo.findIndex(a => a.id === aulaId);
  const proximaAula = idxAtual >= 0 && idxAtual < aulasDoModulo.length - 1 ? aulasDoModulo[idxAtual + 1] : null;

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#0a0a0a]">
        <div className="flex items-center justify-between p-4 bg-black border-b border-white/10">
          <div className="h-5 bg-white/10 rounded w-48 animate-pulse" />
        </div>
        <div className="w-full aspect-video bg-black animate-pulse" />
      </div>
    );
  }

  if (!curso || !aulaAtual) {
    return <div className="text-white p-20 text-center">Aula não encontrada.</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a]">
      {/* Navbar Minimalista do Player */}
      <div className="flex items-center justify-between p-4 bg-black border-b border-white/10">
        <Link href={`/aluno/cursos/${cursoId}`} className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
          <ArrowLeft size={20} />
          <span className="font-bold text-sm hidden sm:inline">{curso.titulo}</span>
        </Link>
        <div className="text-white/50 text-sm">
          {moduloAtual?.titulo}
        </div>
        <div className="w-10"></div> {/* Espaçador */}
      </div>

      <div className="flex flex-col lg:flex-row flex-1">
        {/* Lado Esquerdo - Player e Conteúdo */}
        <div className="flex-1 flex flex-col">
          {/* Player de Vídeo (Simulado) */}
          <div className="w-full border-b border-white/10 shadow-2xl">
            <LessonPlayer
              videoUrl={aulaAtual.videoUrl}
              poster={curso.capaUrl}
              title={aulaAtual.titulo}
              className="w-full"
            />
          </div>

          {/* Info e Ações */}
          <div className="p-4 sm:p-8 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{aulaAtual.titulo}</h1>
                <p className="text-white/50 text-sm">Episódio {aulaAtual.ordem} • {aulaAtual.duracaoMinutos} minutos</p>
              </div>

              <div className="flex flex-col gap-3 min-w-[200px]">
                <button
                  onClick={async () => {
                    const novaConcluida = !concluida;
                    setConcluida(novaConcluida);
                    try {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (user) {
                        await supabase.from('progresso_aluno').upsert({
                          user_id: user.id,
                          aula_id: aulaId,
                          concluida: novaConcluida,
                          assistido_segundos: novaConcluida ? 0 : 0,
                        }, { onConflict: 'user_id,aula_id' });
                      }
                    } catch (err) {
                      console.error('Erro ao salvar progresso:', err);
                    }
                  }}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded font-bold transition-all ${
                    concluida ? 'bg-green-500/20 text-green-500 border border-green-500/30 hover:bg-green-500/30' : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                  }`}
                >
                  <CheckCircle2 size={18} />
                  {concluida ? 'Aula Concluída' : 'Marcar como Concluída'}
                </button>

                {proximaAula && (
                  <Link
                    href={`/aluno/cursos/${cursoId}/aulas/${proximaAula.id}`}
                    className="flex items-center justify-between px-4 py-2 bg-primary text-black font-bold rounded hover:bg-primary/90 transition-colors"
                  >
                    <span>Próximo Episódio</span>
                    <ChevronRight size={18} />
                  </Link>
                )}
              </div>
            </div>

            {/* Abas */}
            <div className="flex flex-col mt-4 mb-20">
              <div className="flex border-b border-white/10 gap-6">
                <button
                  onClick={() => setActiveTab('desc')}
                  className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'desc' ? 'border-primary text-white' : 'border-transparent text-white/50 hover:text-white/80'}`}
                >
                  Descrição
                </button>
                <button
                  onClick={() => setActiveTab('mat')}
                  className={`pb-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'mat' ? 'border-primary text-white' : 'border-transparent text-white/50 hover:text-white/80'}`}
                >
                  Materiais
                  {aulaAtual.materiais && aulaAtual.materiais.length > 0 && (
                    <span className="bg-white/10 text-white/70 text-[10px] px-1.5 py-0.5 rounded-full">{aulaAtual.materiais.length}</span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('anot')}
                  className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'anot' ? 'border-primary text-white' : 'border-transparent text-white/50 hover:text-white/80'}`}
                >
                  Minhas Anotações
                </button>
              </div>

              <div className="pt-6">
                {activeTab === 'desc' && (
                  <p className="text-white/70 text-sm leading-relaxed max-w-3xl">
                    {aulaAtual.descricao || 'Nenhuma descrição fornecida para esta aula.'}
                  </p>
                )}

                {activeTab === 'mat' && (
                  <div className="flex flex-col gap-3 max-w-2xl">
                    {aulaAtual.materiais && aulaAtual.materiais.length > 0 ? (
                      aulaAtual.materiais.map((mat, i) => (
                        <a key={i} href={mat.url} className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors group">
                          <div className="flex items-center gap-3 text-white">
                            <FileText size={20} className="text-primary" />
                            <span className="font-medium text-sm">{mat.titulo}</span>
                          </div>
                          <Download size={18} className="text-white/40 group-hover:text-white transition-colors" />
                        </a>
                      ))
                    ) : (
                      <p className="text-white/50 text-sm">Nenhum material de apoio disponível.</p>
                    )}
                  </div>
                )}

                {activeTab === 'anot' && (
                  <div className="flex flex-col gap-4 max-w-2xl">
                    <textarea
                      className="w-full h-32 bg-white/5 border border-white/10 rounded-lg p-4 text-sm text-white focus:outline-none focus:border-primary resize-none custom-scrollbar placeholder:text-white/30"
                      placeholder="Faça suas anotações aqui. Elas são privadas e ficam salvas neste episódio..."
                      value={notaAluno}
                      onChange={(e) => setNotaAluno(e.target.value)}
                    ></textarea>
                    <div className="flex justify-end">
                      <Button variant="primary" size="sm" onClick={async () => {
                        try {
                          const { data: { user } } = await supabase.auth.getUser();
                          if (user) {
                            await supabase.from('anotacoes_aula').upsert({
                              user_id: user.id,
                              aula_id: aulaId,
                              conteudo: notaAluno,
                            }, { onConflict: 'user_id,aula_id' });
                            alert('Anotação salva com sucesso!');
                          } else {
                            alert('Faça login para salvar anotações.');
                          }
                        } catch (err) {
                          console.error('Erro ao salvar anotação:', err);
                          alert('Erro ao salvar anotação.');
                        }
                      }}>Salvar Anotação</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Lado Direito - Lista de Episódios (Sidebar) */}
        <div className="w-full lg:w-80 bg-[#141414] border-l border-white/10 flex flex-col h-auto lg:h-[calc(100vh-65px)] overflow-y-auto custom-scrollbar">
          <div className="p-4 border-b border-white/10 flex items-center gap-2 text-white font-bold sticky top-0 bg-[#141414] z-10">
            <ListVideo size={18} className="text-primary" />
            Neste Módulo
          </div>
          <div className="flex flex-col">
            {aulasDoModulo.map(aula => {
              const isActive = aula.id === aulaId;
              const isDone = progressoAluno.some(p => p.aula_id === aula.id && p.concluida) || (isActive && concluida);

              return (
                <Link
                  key={aula.id}
                  href={`/aluno/cursos/${cursoId}/aulas/${aula.id}`}
                  className={`flex flex-col gap-1 p-4 border-b border-white/5 transition-colors ${
                    isActive ? 'bg-white/10 border-l-4 border-l-primary' : 'hover:bg-white/5 border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-sm font-bold line-clamp-2 ${isActive ? 'text-white' : 'text-white/70'}`}>
                      {aula.ordem}. {aula.titulo}
                    </span>
                    {isDone && <CheckCircle2 size={16} className="text-green-500 flex-shrink-0 mt-0.5" />}
                  </div>
                  <span className="text-xs text-white/40">{aula.duracaoMinutos} min</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
