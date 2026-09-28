'use client';

import { useState, useEffect } from 'react';
import { Play, Info, Award, Flame, ChevronRight, Lock } from 'lucide-react';
import Link from 'next/link';
import { getCursos, getModulos, getAulas, getProgressoAluno } from '@/lib/mock-data';
import { supabase } from '@/lib/supabase';
import type { Curso, Aula, Modulo, Progresso } from '@/lib/mock-data';
import { LessonPlayer } from '@/components/LessonPlayer';

export default function AlunoDashboardPage() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [progressoAluno, setProgressoAluno] = useState<Progresso[]>([]);
  const [cursosAprovados, setCursosAprovados] = useState<Record<string, boolean>>({});
  const [welcomeVideoUrl, setWelcomeVideoUrl] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      const [cursosData, progressoData, configData] = await Promise.all([
        getCursos(),
        getProgressoAluno(),
        supabase.from('academy_settings').select('welcome_video_url').eq('id', 1).single()
      ]);

      // Buscar cursos liberados para o usuário
      const { data: { user } } = await supabase.auth.getUser();
      let aprovados: Record<string, boolean> = {};
      let userIsAdmin = false;

      if (user) {
        const [enrollmentsRes, profileRes] = await Promise.all([
          supabase.from('course_enrollments').select('course_id').eq('user_id', user.id),
          supabase.from('profiles').select('role').eq('id', user.id).single()
        ]);

        if (enrollmentsRes.data) {
          enrollmentsRes.data.forEach((e: { course_id: string }) => { aprovados[e.course_id] = true; });
        }

        const role = profileRes.data?.role;
        if (role === 'ADMIN' || role === 'academy_admin' || role === 'studio_admin') {
          userIsAdmin = true;
        }
      }

      setCursos(cursosData);
      setProgressoAluno(progressoData);
      setCursosAprovados(aprovados);
      setIsAdmin(userIsAdmin);
      if (configData.data?.welcome_video_url) setWelcomeVideoUrl(configData.data.welcome_video_url);
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
  // Função helper para acesso
  const hasAccess = (cursoId: string) => {
    if (isAdmin) return true;
    if (cursosAprovados[cursoId]) return true;
    return cursoId === 'course_1'; // fallback mock se necessário
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background pb-20">
        <div className="relative w-full h-[55vh] sm:h-[68vh] bg-foreground animate-pulse" />
        <div className="flex flex-col gap-7 px-4 sm:px-6 lg:px-14 -mt-10 relative z-10">
          <div className="h-6 bg-gold/10 rounded w-48 animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 bg-gold/10 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      {/* Vídeo de Boas-vindas ou Banner Principal Estilo Netflix */}
      {welcomeVideoUrl ? (
        <div className="relative w-full aspect-video md:h-[68vh] md:aspect-auto bg-foreground">
          <LessonPlayer
            videoUrl={welcomeVideoUrl}
            title="Vídeo de Boas-vindas"
            className="w-full h-full"
          />
        </div>
      ) : (
        <div className="relative w-full h-[65vh] sm:h-[80vh] bg-black">
        {/* Imagem de Fundo com Escurecimento Sutil */}
        <div
          className="absolute inset-0 bg-cover bg-top opacity-80"
          style={{ backgroundImage: `url(${featuredCourse?.capaUrl|| ''})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        {/* Conteúdo do Banner */}
        <div className="absolute bottom-0 left-0 w-full p-6 sm:p-12 flex flex-col justify-end">
          <h1 className="text-3xl sm:text-5xl font-black text-white mb-2 max-w-2xl drop-shadow-lg">
            {featuredCourse?.titulo|| 'Bem-vindo'}
          </h1>
          <p className="text-white/80 text-sm sm:text-base max-w-xl mb-6 drop-shadow-md line-clamp-3">
            {featuredCourse?.descricao|| 'Explore nossos cursos disponíveis.'}
          </p>
          <div className="flex items-center gap-4">
            <Link
              href={`/aluno/cursos/${featuredCourse?.id|| ''}/aulas/${aulaParou?.aula_id|| 'aula_1'}`}
              className="bg-gold text-black hover:bg-gold-dim flex items-center gap-2 px-5 py-2 rounded text-sm font-bold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gold"
            >
              <Play size={18} className="fill-black" />
              Assistir Agora
            </Link>
            <Link
              href={`/aluno/cursos/${featuredCourse?.id|| ''}`}
              className="bg-white/10 text-white hover:bg-white/20 border border-white/20 flex items-center gap-2 px-5 py-2 rounded text-sm font-bold transition-colors shadow-sm"
            >
              <Info size={18} />
              Mais Informações
            </Link>
          </div>
        </div>
      </div>
      )}

      {/* Trilhas / Carrosséis */}
      <div className="flex flex-col gap-7 px-4 sm:px-6 lg:px-14 relative z-10 mt-8">
        {/* Barra de status do aluno no ecossistema */}
        <section className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gold/10 border border-gold/20">
            <Flame size={18} className="text-red-500" />
            <span className="text-sm text-foreground"><strong>{streakDias}</strong> dias de sequência</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gold/10 border border-gold/20">
            <Play size={18} className="text-gold" />
            <span className="text-sm text-foreground"><strong>{aulasConcluidas}</strong> aulas concluídas</span>
          </div>
          <Link href="/aluno/certificados" className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gold/15 border border-gold/30 hover:bg-gold/25 transition-colors">
            <Award size={18} className="text-gold" />
            <span className="text-sm text-foreground">Meus Certificados</span>
            <ChevronRight size={14} className="text-foreground/50" />
          </Link>
        </section>

        {/* Continue Assistindo */}
        {aulaAtualInfo&& cursoAtualInfo && (
          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">Continue Assistindo</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <Link href={`/aluno/cursos/${cursoAtualInfo.id}/aulas/${aulaAtualInfo.id}`} className="group relative rounded-md overflow-hidden bg-card-bg border border-gold/20 hover:border-gold/40 transition-all duration-300 block">
                <div className="aspect-video relative overflow-hidden bg-black/5">
                  <div className="absolute inset-0 bg-cover bg-center opacity-70 group-hover:opacity-100 transition-opacity" style={{ backgroundImage: `url(${cursoAtualInfo.capaUrl})` }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center border border-gold/20 group-hover:scale-110 transition-transform">
                      <Play size={24} className="text-gold fill-gold ml-1" />
                    </div>
                  </div>
                </div>
                <div className="p-4 absolute bottom-0 left-0 w-full z-10">
                  <h3 className="font-bold text-sm text-white line-clamp-1 drop-shadow-md">{aulaAtualInfo.titulo}</h3>
                  <p className="text-xs text-white/70 mb-3 line-clamp-1 drop-shadow-md">{cursoAtualInfo.titulo}</p>
                  {/* Barra de Progresso */}
                  <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-gold h-full" style={{ width: `${progressPercent}%` }} />
                  </div>
                  <div className="text-[10px] text-white/60 mt-1 text-right">{progressPercent}% concluído</div>
                </div>
              </Link>
            </div>
          </section>
        )}

        {/* Cursos Disponíveis (carrossel Netflix-style) */}
        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">Cursos Disponíveis</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
            {cursos.map((curso) => {
              const unlocked = hasAccess(curso.id);
              return (
                <Link
                  key={curso.id}
                  href={`/aluno/cursos/${curso.id}`}
                  className="flex-none w-[280px] sm:w-[320px] group relative rounded-md overflow-hidden snap-start hover:scale-105 transition-transform duration-300 shadow-sm border border-gold/20 hover:border-gold/40"
                >
                  <div className="aspect-video relative bg-black">
                    <div className="absolute inset-0 bg-cover bg-center opacity-80 group-hover:opacity-100 transition-opacity" style={{ backgroundImage: `url(${curso.capaUrl})` }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                    {!unlocked && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2">
                        <div className="bg-gold/20 rounded-full p-3 border border-gold/30">
                          <Lock size={24} className="text-gold" />
                        </div>
                      </div>
                    )}

                    <div className="absolute top-2 left-2 z-10">
                      <span className="text-[10px] font-bold text-black mb-1 uppercase tracking-wider bg-gold px-2 py-0.5 rounded shadow-md">{curso.nivel}</span>
                    </div>
                    <div className="absolute bottom-0 left-0 p-4 w-full z-10">
                      <h3 className="font-bold text-sm sm:text-base text-white line-clamp-1 drop-shadow-md">{curso.titulo}</h3>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-bold bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded text-white border border-white/10">{curso.duracaoHoras}h</span>
                        <span className="text-[10px] font-bold bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded text-white border border-white/10">{curso.totalAulas} aulas</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Recomendados para Você */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-foreground mb-4">Recomendados para Você</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
            {cursos.slice().reverse().map((curso) => {
              const unlocked = hasAccess(curso.id);
              return (
                <Link
                  key={curso.id + '_rec'}
                  href={`/aluno/cursos/${curso.id}`}
                  className="flex-none w-[280px] sm:w-[320px] group relative rounded-md overflow-hidden snap-start hover:scale-105 transition-transform duration-300 shadow-sm border border-gold/20 hover:border-gold/40"
                >
                  <div className="aspect-video relative bg-black">
                    <div className="absolute inset-0 bg-cover bg-center opacity-80 group-hover:opacity-100 transition-opacity" style={{ backgroundImage: `url(${curso.capaUrl})` }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                    {!unlocked && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2">
                        <div className="bg-gold/20 rounded-full p-3 border border-gold/30">
                          <Lock size={24} className="text-gold" />
                        </div>
                      </div>
                    )}

                    <div className="absolute top-2 left-2 z-10">
                      <span className="text-[10px] font-bold text-black mb-1 uppercase tracking-wider bg-gold px-2 py-0.5 rounded shadow-md">{curso.nivel}</span>
                    </div>
                    <div className="absolute bottom-0 left-0 p-4 w-full flex items-center justify-between z-10">
                      <div>
                        <h3 className="font-bold text-sm sm:text-base text-white line-clamp-1 drop-shadow-md">{curso.titulo}</h3>
                        <div className="text-xs text-white/70 line-clamp-1 drop-shadow-md">{curso.professor}</div>
                      </div>
                      {!unlocked && (
                        <Lock size={16} className="text-gold shrink-0 drop-shadow-md" />
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

      </div>
    </div>
  );
}
