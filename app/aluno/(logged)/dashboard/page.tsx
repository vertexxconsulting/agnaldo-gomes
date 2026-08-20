'use client';

import { useState, useEffect } from 'react';
import { Play, Info, Award, ShoppingBag, Flame, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { getCursos, getModulos, getAulas, getProgressoAluno } from '@/lib/mock-data';
import { supabase } from '@/lib/supabase';
import type { Curso, Aula, Modulo, Progresso } from '@/lib/mock-data';

export default function AlunoDashboardPage() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [progressoAluno, setProgressoAluno] = useState<Progresso[]>([]);
  const [produtosLoja, setProdutosLoja] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      const [cursosData, progressoData, produtosData] = await Promise.all([
        getCursos(),
        getProgressoAluno(),
        supabase.from('products').select('*').eq('active', true).limit(4),
      ]);
      setCursos(cursosData);
      setProgressoAluno(progressoData);
      if (produtosData.data) setProdutosLoja(produtosData.data);
      setLoading(false);
    };
    carregarDados();
  }, []);

  const featuredCourse = cursos.length > 0 ? cursos[0] : null;

  // Encontrar onde o aluno parou (última aula assistida não concluída, ou a última assistida)
  const aulaParou = progressoAluno.find(p => !p.concluida) || progressoAluno[progressoAluno.length - 1];

  // Mapear aulas e módulos para lookup
  const [aulasMap, setAulasMap] = useState<Record<string, Aula>>({});
  const [modulosMap, setModulosMap] = useState<Record<string, Modulo>>({});

  useEffect(() => {
    const carregarLookups = async () => {
      const [aulasData, modulosData] = await Promise.all([getAulas(), getModulos()]);
      setAulasMap(Object.fromEntries(aulasData.map(a => [a.id, a])));
      setModulosMap(Object.fromEntries(modulosData.map(m => [m.id, m])));
    };
    carregarLookups();
  }, []);

  const aulaAtualInfo = aulaParou ? aulasMap[aulaParou.aula_id] : null;
  const cursoAtualInfo = aulaAtualInfo ? cursos.find(c => {
    const mod = modulosMap[aulaAtualInfo.modulo_id];
    return mod ? c.id === mod.curso_id : false;
  }) : null;

  // Estatísticas do aluno no ecossistema
  const aulasConcluidas = progressoAluno.filter(p => p.concluida).length;
  const streakDias = 7;

  // Progressão da última aula assistida
  const progressPercent = aulaParou && aulaAtualInfo ? Math.round((aulaParou.assistidoSegundos / (aulaAtualInfo.duracaoMinutos * 60)) * 100) : 0;

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#141414] pb-20">
        <div className="relative w-full h-[60vh] sm:h-[75vh] bg-black animate-pulse" />
        <div className="flex flex-col gap-10 px-4 sm:px-8 lg:px-16 -mt-10 relative z-10">
          <div className="h-6 bg-white/10 rounded w-48 animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 bg-white/10 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#141414] pb-20">
      {/* Banner Principal Estilo Netflix */}
      <div className="relative w-full h-[60vh] sm:h-[75vh] bg-black">
        {/* Imagem de Fundo */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-60"
          style={{ backgroundImage: `url(${featuredCourse?.capaUrl || ''})` }}
        />
        {/* Degradês para suavizar bordas */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/50 to-transparent" />

        {/* Conteúdo do Banner */}
        <div className="absolute bottom-0 left-0 w-full p-8 sm:p-16 flex flex-col justify-end">
          <h1 className="text-4xl sm:text-6xl font-black text-white mb-2 max-w-2xl drop-shadow-lg">
            {featuredCourse?.titulo || 'Bem-vindo'}
          </h1>
          <p className="text-white/80 text-sm sm:text-lg max-w-xl mb-6 drop-shadow-md line-clamp-3">
            {featuredCourse?.descricao || 'Explore nossos cursos disponíveis.'}
          </p>
          <div className="flex items-center gap-4">
            <Link
              href={`/aluno/cursos/${featuredCourse?.id || ''}/aulas/${aulaParou?.aula_id || 'aula_1'}`}
              className="bg-white text-black hover:bg-white/80 flex items-center gap-2 px-6 py-2.5 rounded text-sm sm:text-base font-bold transition-colors"
            >
              <Play size={20} className="fill-black" />
              Assistir Agora
            </Link>
            <Link
              href={`/aluno/cursos/${featuredCourse?.id || ''}`}
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

        {/* Barra de status do aluno no ecossistema */}
        <section className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10">
            <Flame size={18} className="text-[#e50914]" />
            <span className="text-sm text-white"><strong>{streakDias}</strong> dias de sequência</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10">
            <Play size={18} className="text-primary" />
            <span className="text-sm text-white"><strong>{aulasConcluidas}</strong> aulas concluídas</span>
          </div>
          <Link href="/aluno/certificados" className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary/15 border border-primary/30 hover:bg-primary/25 transition-colors">
            <Award size={18} className="text-primary" />
            <span className="text-sm text-white">Meus Certificados</span>
            <ChevronRight size={14} className="text-white/50" />
          </Link>
        </section>

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
            {cursos.map((curso) => (
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

        {/* Produtos recomendados da Loja */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ShoppingBag size={20} className="text-primary" /> Loja — Recomendado para sua formação
            </h2>
            <Link href="/loja" className="text-xs font-semibold text-white/60 hover:text-white flex items-center gap-1">
              Ver toda a loja <ChevronRight size={14} />
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
            {produtosLoja.length === 0 ? (
              <div className="text-sm text-white/50 py-6">A vitrine da loja está sendo preparada. Volte em breve!</div>
            ) : (
              produtosLoja.map((produto) => (
                <Link
                  key={produto.id + '_loja'}
                  href={`/loja/p/${produto.id}`}
                  className="flex-none w-[180px] sm:w-[200px] group relative rounded-md overflow-hidden snap-start hover:scale-105 transition-transform duration-300 shadow-xl border border-white/5 hover:border-white/20 bg-white/5"
                >
                  <div className="aspect-square relative bg-black">
                    {produto.image_url ? (
                      <div className="absolute inset-0 bg-cover bg-center opacity-80 group-hover:opacity-100 transition-opacity" style={{ backgroundImage: `url(${produto.image_url})` }} />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/5 text-white/30"><ShoppingBag size={28} /></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-90" />
                    <div className="absolute bottom-0 left-0 p-3 w-full">
                      <h3 className="font-bold text-xs text-white line-clamp-2 mb-1">{produto.name}</h3>
                      <div className="text-[11px] font-bold text-primary">R$ {Number(produto.price || 0).toFixed(2).replace('.', ',')}</div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Recomendados para Você */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Recomendados para Você</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
            {cursos.slice().reverse().map((curso) => (
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
