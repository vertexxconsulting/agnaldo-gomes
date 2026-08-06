'use client';

import { use, useState } from 'react';
import { MOCK_CURSOS, MOCK_MODULOS, MOCK_AULAS, MOCK_PROGRESSO_ALUNO } from '@/lib/mock-data';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Download, FileText, ChevronRight, ListVideo } from 'lucide-react';
import { Button } from '@/components/Button';

export default function EpisodioPage({ params }: { params: Promise<{ cursoId: string; aulaId: string }> }) {
  const { cursoId, aulaId } = use(params);

  const curso = MOCK_CURSOS.find(c => c.id === cursoId);
  const aulaAtual = MOCK_AULAS.find(a => a.id === aulaId);
  
  const [concluida, setConcluida] = useState(() => {
    return MOCK_PROGRESSO_ALUNO.some(p => p.aula_id === aulaId && p.concluida);
  });

  const [activeTab, setActiveTab] = useState<'desc' | 'mat' | 'anot'>('desc');

  if (!curso || !aulaAtual) {
    return <div className="text-white p-20 text-center">Aula não encontrada.</div>;
  }

  const moduloAtual = MOCK_MODULOS.find(m => m.id === aulaAtual.modulo_id);
  const aulasDoModulo = MOCK_AULAS.filter(a => a.modulo_id === aulaAtual.modulo_id).sort((a,b) => a.ordem - b.ordem);
  
  // Próxima aula (dentro do mesmo módulo por simplificação)
  const idxAtual = aulasDoModulo.findIndex(a => a.id === aulaAtual.id);
  const proximaAula = idxAtual >= 0 && idxAtual < aulasDoModulo.length - 1 ? aulasDoModulo[idxAtual + 1] : null;

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
          <div className="w-full aspect-video bg-black relative flex items-center justify-center border-b border-white/10 shadow-2xl">
            {/* O ideal na vida real seria usar a tag video com HLS ou Iframe */}
            <video 
               controls 
               className="w-full h-full object-contain"
               poster={curso.capaUrl}
               src={aulaAtual.videoUrl} 
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
                  onClick={() => setConcluida(!concluida)}
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
                    ></textarea>
                    <div className="flex justify-end">
                      <Button variant="primary" size="sm" onClick={() => alert("Anotação salva!")}>Salvar Anotação</Button>
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
              const isDone = MOCK_PROGRESSO_ALUNO.some(p => p.aula_id === aula.id && p.concluida) || (isActive && concluida);

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
