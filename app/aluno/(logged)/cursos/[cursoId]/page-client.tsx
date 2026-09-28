'use client';

import { useState, useEffect } from 'react';
import { use } from 'react';
import { getCursos, getModulos, getAulas, getProgressoAluno } from '@/lib/mock-data';
import type { Curso, Modulo, Aula, Progresso } from '@/lib/mock-data';
import Link from 'next/link';
import { ArrowLeft, Play, CheckCircle2, Lock, X, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CursoDetalhesPage({ params, hasAccess = true, price = 97 }: { params: Promise<{ cursoId: string }>, hasAccess?: boolean, price?: number }) {
  const router = useRouter();
  const { cursoId } = use(params);
  const [curso, setCurso] = useState<Curso | null>(null);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [progressoAluno, setProgressoAluno] = useState<Progresso[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpsell, setShowUpsell] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

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
      <div className="flex flex-col min-h-screen bg-background pb-20">
        <div className="absolute top-24 left-4 sm:left-8 z-20">
          <Link href="/aluno/cursos" className="flex items-center gap-2 text-foreground/70 hover:text-foreground transition-colors bg-foreground/10 px-3 py-1.5 rounded-full backdrop-blur-md">
            <ArrowLeft size={16} /> <span className="text-sm font-medium">Voltar para meus cursos</span>
          </Link>
        </div>
        <div className="relative w-full h-[50vh] bg-foreground animate-pulse" />
        <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 mt-8 space-y-4">
          <div className="h-8 bg-gold/10 rounded w-3/4 animate-pulse" />
          <div className="h-4 bg-gold/10 rounded w-1/2 animate-pulse" />
          <div className="h-4 bg-gold/10 rounded w-full animate-pulse" />
        </div>
      </div>
    );
  }

  if (!curso) {
    return <div className="text-foreground p-20 text-center">Curso não encontrado.</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      {/* Botão Voltar */}
      <div className="absolute top-24 left-4 sm:left-8 z-20">
        <Link href="/aluno/cursos" className="flex items-center gap-2 text-white/80 hover:text-white transition-colors bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10">
          <ArrowLeft size={16} /> <span className="text-sm font-medium">Voltar para meus cursos</span>
        </Link>
      </div>

      {/* Capa e Progresso */}
      <div className="relative w-full h-[65vh] md:h-[75vh] bg-black">
        <div className="absolute inset-0 bg-cover bg-top opacity-100" style={{ backgroundImage: `url(${curso.capaUrl})` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />

        <div className="absolute bottom-0 left-0 w-full p-6 sm:p-12">
          <div className="max-w-4xl mx-auto flex flex-col items-start">
            <h1 className="text-2xl sm:text-4xl font-black text-white mb-2 drop-shadow-lg">{curso.titulo}</h1>
            <p className="text-white/80 text-xs sm:text-sm max-w-xl mb-4 drop-shadow-md line-clamp-2">{curso.descricao}</p>

            {/* Box Progresso */}
            <div className="w-full max-w-sm bg-black/40 border border-gold/30 rounded-lg p-3 mb-5 backdrop-blur-md">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-white">Progresso: {progressPercent}%</span>
                <span className="text-[10px] text-white/70">{aulasConcluidas}/{totalAulas} aulas</span>
              </div>
              <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                <div className="bg-gold h-full transition-all duration-1000" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>

            <div className="flex gap-4">
              {hasAccess ? (
                <Link
                  href={urlContinuar}
                  className="bg-gold text-black hover:bg-gold-dim flex items-center gap-2 px-6 py-2.5 rounded text-sm font-bold transition-all duration-300 shadow-lg"
                >
                  <Play size={18} className="fill-black" />
                  {ultimaAulaAssistida ? 'Continuar aula' : 'Começar'}
                </Link>
              ) : (
                <button
                  onClick={() => setShowUpsell(true)}
                  className="bg-gold text-black hover:brightness-110 flex items-center gap-2 px-6 py-2.5 rounded text-sm font-bold transition-all shadow-lg"
                >
                  <Lock size={18} />
                  Adquirir Acesso
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Módulos */}
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 mt-8 flex flex-col gap-6">
        <h2 className="text-2xl font-bold text-foreground border-b border-gold/20 pb-2">Conteúdo do Curso</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {modulos.map((modulo, i) => {
            const aulasModulo = aulas.filter(a => a.modulo_id === modulo.id).sort((a,b) => a.ordem - b.ordem);

            return (
              <div key={modulo.id} className="bg-card-bg border border-gold/20 rounded-lg overflow-hidden">
                {/* Cabeçalho do Módulo */}
                <div className="p-4 bg-foreground/5 border-b border-gold/20 flex items-center justify-between">
                  <h3 className="font-bold text-lg text-foreground">Módulo {i + 1} — {modulo.titulo}</h3>
                  <span className="text-xs text-foreground/50">{aulasModulo.length} aulas</span>
                </div>

                {/* Aulas do Módulo */}
                <div className="flex flex-col">
                  {aulasModulo.map((aula, idx) => {
                    const progress = progressoAluno.find(p => p.aula_id === aula.id);
                    const isConcluida = progress?.concluida;

                    const lessonContent = (
                      <>
                        <div className="flex items-center gap-4">
                          {isConcluida ? (
                            <CheckCircle2 size={20} className="text-green-500 flex-shrink-0" />
                          ) : (
                            !hasAccess ? (
                              <Lock size={20} className="text-foreground/40 group-hover:text-gold transition-colors flex-shrink-0" />
                            ) : (
                              <Play size={20} className="text-foreground/40 group-hover:text-gold transition-colors flex-shrink-0" />
                            )
                          )}
                          <div>
                            <div className="text-sm font-medium text-foreground group-hover:text-gold transition-colors">
                              {String(idx + 1).padStart(2, '0')}. {aula.titulo}
                            </div>
                            <div className="text-xs text-foreground/40 mt-1 md:hidden">{aula.duracaoMinutos} min</div>
                          </div>
                        </div>
                        <div className="text-xs text-foreground/50 hidden md:block">
                          {aula.duracaoMinutos} min
                        </div>
                      </>
                    );

                    return hasAccess ? (
                      <Link
                        key={aula.id}
                        href={`/aluno/cursos/${cursoId}/aulas/${aula.id}`}
                        className="flex items-center justify-between p-4 hover:bg-foreground/5 transition-colors border-b border-gold/10 last:border-0 group"
                      >
                        {lessonContent}
                      </Link>
                    ) : (
                      <button
                        key={aula.id}
                        onClick={() => setShowUpsell(true)}
                        className="flex w-full items-center justify-between p-4 hover:bg-foreground/5 transition-colors border-b border-gold/10 last:border-0 group text-left cursor-pointer"
                      >
                        {lessonContent}
                      </button>
                    );
                  })}
                  {aulasModulo.length === 0 && (
                    <div className="p-4 text-sm text-foreground/40">Em breve</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Upsell */}
      {showUpsell && !hasAccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-background border border-gold/20 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative">
            <button 
              onClick={() => setShowUpsell(false)}
              className="absolute top-4 right-4 text-foreground/50 hover:text-foreground transition-colors bg-foreground/5 rounded-full p-1"
            >
              <X size={20} />
            </button>
            <div className="h-40 bg-cover bg-center" style={{ backgroundImage: `url(${curso.capaUrl})` }}>
              <div className="w-full h-full bg-gradient-to-t from-[#141414] to-transparent flex items-end p-6">
                <Lock size={32} className="text-gold mb-[-16px]" />
              </div>
            </div>
            <div className="p-6 pt-2">
              <h3 className="text-2xl font-bold text-foreground mb-2">Acesso Restrito</h3>
              <p className="text-foreground/70 text-sm mb-6">
                Você precisa adquirir o curso <strong>{curso.titulo}</strong> para ter acesso completo a todas as {totalAulas} aulas e materiais exclusivos.
              </p>
              
              <div className="bg-card-bg border border-gold/20 rounded-lg p-4 mb-6 flex justify-between items-center">
                <span className="text-foreground/70">Investimento</span>
                <span className="text-2xl font-black text-foreground">
                  R$ {price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <button
                onClick={async () => {
                  setCheckoutLoading(true);
                  try {
                    const res = await fetch('/api/checkout/stripe', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ cursoId })
                    });
                    const data = await res.json();
                    if (data.url) {
                      window.location.href = data.url;
                    } else {
                      alert('Erro ao iniciar checkout: ' + (data.error || 'Tente novamente.'));
                      setCheckoutLoading(false);
                    }
                  } catch (err) {
                    alert('Erro de conexão ao iniciar checkout.');
                    setCheckoutLoading(false);
                  }
                }}
                disabled={checkoutLoading}
                className="w-full bg-gold text-foreground font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {checkoutLoading ? <Loader2 size={20} className="animate-spin" /> : <Lock size={20} />}
                {checkoutLoading ? 'Redirecionando...' : 'Adquirir Agora'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}