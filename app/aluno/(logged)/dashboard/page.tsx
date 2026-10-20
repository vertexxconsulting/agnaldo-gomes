'use client';

import { useState, useEffect } from 'react';
import { Play, Info, Award, ChevronRight, Lock } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { getCursos, getModulos, getAulas, getProgressoAluno } from '@/lib/mock-data';
import { supabase } from '@/lib/supabase';
import type { Aula, Modulo, Progresso } from '@/lib/mock-data';
import { LessonPlayer } from '@/components/LessonPlayer';
import { CursoCard, CursoCardProps } from '@/components/academy/CursoCard';

export default function AlunoDashboardPage() {
  const [cursos, setCursos] = useState<any[]>([]);
  const [progressoAluno, setProgressoAluno] = useState<Progresso[]>([]);
  const [cursosAprovados, setCursosAprovados] = useState<Record<string, boolean>>({});
  const [welcomeVideoUrl, setWelcomeVideoUrl] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [featuredIndex, setFeaturedIndex] = useState(0);

  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      try {
        const [coursesRes, progressoData, configData] = await Promise.all([
          supabase.from('courses').select('*').order('created_at', { ascending: false }),
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

        let listaFinal: any[] = [];
        if (coursesRes.data && coursesRes.data.length > 0) {
          listaFinal = coursesRes.data.map((c: any) => ({
            id: c.id,
            title: c.title,
            titulo: c.title,
            description: c.description,
            descricao: c.description,
            thumbnail_url: c.thumbnail_url,
            capaUrl: c.thumbnail_url,
            price: c.price,
            original_price: c.original_price,
            current_price: c.current_price,
            status: c.status,
            is_published: c.is_published,
            stripe_payment_link: c.stripe_payment_link,
            duracaoHoras: c.duration_hours || 0,
            totalAulas: 0,
            nivel: c.level || 'Iniciante',
            professor: 'Agnaldo Gomes',
          }));
        } else {
          const fallback = await getCursos();
          listaFinal = fallback.map(c => ({
            ...c,
            status: 'PUBLISHED',
          }));
        }

        setCursos(listaFinal);
        setProgressoAluno(progressoData);
        setCursosAprovados(aprovados);
        setIsAdmin(userIsAdmin);
        if (configData.data?.welcome_video_url) setWelcomeVideoUrl(configData.data.welcome_video_url);
      } catch (err) {
        console.error('Erro ao carregar dashboard do aluno:', err);
      } finally {
        setLoading(false);
      }
    };
    carregarDados();
  }, []);

  useEffect(() => {
    if (cursos.length <= 1) return;
    const interval = setInterval(() => {
      setFeaturedIndex((prev) => (prev + 1) % Math.min(cursos.length, 5)); // cycle top 5
    }, 6000);
    return () => clearInterval(interval);
  }, [cursos.length]);

  const featuredCourse = cursos.length > 0 ? cursos[featuredIndex] : null;
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
  // Progressão da última aula assistida
  const progressPercent = aulaParou && aulaAtualInfo ? Math.round((aulaParou.assistidoSegundos / (aulaAtualInfo.duracaoMinutos * 60)) * 100) : 0;

  // Função helper para acesso (estritamente baseada em matrícula confirmada ou role de admin)
  const hasAccess = (cursoId: string) => {
    if (isAdmin) return true;
    return Boolean(cursosAprovados[cursoId]);
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
    <div className="flex flex-col min-h-screen bg-background pb-20 -mt-20">
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
          {/* Imagem de Fundo Estática */}
          <div
            className="absolute inset-0 bg-cover bg-[center_20%] opacity-80"
            style={{ backgroundImage: `url('/agnaldohero.webp')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/30 to-transparent" />

          {/* Conteúdo do Banner */}
          <div className="absolute bottom-0 left-0 w-full p-6 sm:p-12 flex flex-col justify-end overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={featuredCourse?.id || 'empty'}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.5 }}
                className="max-w-2xl"
              >
                <h1 className="text-3xl sm:text-5xl font-black text-white mb-2 drop-shadow-lg">
                  {featuredCourse?.titulo || featuredCourse?.title || 'Bem-vindo à Academy'}
                </h1>
                <p className="text-white/80 text-sm sm:text-base max-w-xl mb-6 drop-shadow-md line-clamp-3">
                  {featuredCourse?.descricao || featuredCourse?.description || 'Explore nossos cursos e especializações exclusivas.'}
                </p>
                <div className="flex items-center gap-4">
                  {featuredCourse && hasAccess(featuredCourse.id) ? (
                    <Link
                      href={`/aluno/cursos/${featuredCourse.id}`}
                      className="bg-gold text-black hover:bg-gold-dim flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gold shadow-md"
                    >
                      <Play size={18} className="fill-black" />
                      Acessar Curso
                    </Link>
                  ) : (
                    <Link
                      href={`/aluno/cursos/${featuredCourse?.id || ''}`}
                      className="bg-gold text-black hover:bg-gold-dim flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gold shadow-md"
                    >
                      <Lock size={18} />
                      Ver Detalhes do Curso
                    </Link>
                  )}
                  <Link
                    href="/aluno/catalogo"
                    className="bg-white/10 text-white hover:bg-white/20 border border-white/20 flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm backdrop-blur-sm"
                  >
                    <Info size={18} />
                    Catálogo
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Trilhas / Grid de Cursos */}
      <div className="flex flex-col gap-8 px-4 sm:px-6 lg:px-14 relative z-10 mt-8">
        {/* Barra de status do aluno no ecossistema */}
        <section className="flex flex-wrap items-center gap-3">
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

        {/* Continue Assistindo (somente se tiver matrícula ativa) */}
        {aulaAtualInfo && cursoAtualInfo && hasAccess(cursoAtualInfo.id) && (
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

        {/* Cursos Disponíveis — no mesmo padrão visual do catálogo, com cadeado caso o aluno não tenha o curso */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">Cursos Disponíveis</h2>
              <p className="text-xs text-foreground/60">Cursos disponíveis na plataforma Academy</p>
            </div>
            <Link href="/aluno/catalogo" className="text-xs font-semibold text-gold hover:underline flex items-center gap-1">
              Ver catálogo completo <ChevronRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {cursos.map((c: any) => {
              const enrolled = hasAccess(c.id);
              const isPublished = c.status ? c.status === 'PUBLISHED' : (c.is_published ?? (c.status !== 'DRAFT'));
              const numPrice = typeof c.price === 'number' ? c.price : parseFloat(String(c.price || '0'));
              const hasPaymentOption = Boolean(c.stripe_payment_link) || numPrice > 0;
              const purchasable = !enrolled && isPublished && hasPaymentOption;

              return (
                <CursoCard
                  key={c.id}
                  curso={{
                    id: c.id,
                    title: c.title || c.titulo || '',
                    description: c.description || c.descricao || '',
                    thumbnail_url: c.thumbnail_url || c.capaUrl || null,
                    price: c.price,
                    original_price: c.original_price,
                    current_price: c.current_price,
                    stripe_payment_link: c.stripe_payment_link,
                    status: c.status,
                    is_published: c.is_published,
                  }}
                  isEnrolled={enrolled}
                  isPurchasable={purchasable}
                />
              );
            })}
          </div>
        </section>

        {/* Recomendados para Você — mesmos cards consistentes com o catálogo */}
        {cursos.length > 1 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold text-foreground mb-4">Recomendados para Você</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {cursos.slice().reverse().map((c: any) => {
                const enrolled = hasAccess(c.id);
                const isPublished = c.status ? c.status === 'PUBLISHED' : (c.is_published ?? (c.status !== 'DRAFT'));
                const numPrice = typeof c.price === 'number' ? c.price : parseFloat(String(c.price || '0'));
                const hasPaymentOption = Boolean(c.stripe_payment_link) || numPrice > 0;
                const purchasable = !enrolled && isPublished && hasPaymentOption;

                return (
                  <CursoCard
                    key={c.id + '_rec'}
                    curso={{
                      id: c.id,
                      title: c.title || c.titulo || '',
                      description: c.description || c.descricao || '',
                      thumbnail_url: c.thumbnail_url || c.capaUrl || null,
                      price: c.price,
                      original_price: c.original_price,
                      current_price: c.current_price,
                      stripe_payment_link: c.stripe_payment_link,
                      status: c.status,
                      is_published: c.is_published,
                    }}
                    isEnrolled={enrolled}
                    isPurchasable={purchasable}
                  />
                );
              })}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
