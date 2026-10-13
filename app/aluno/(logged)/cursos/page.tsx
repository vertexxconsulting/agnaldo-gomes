'use client';

import { useState, useEffect } from 'react';
import { PlayCircle, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface CursoMatriculado {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  level: string;
  totalAulas: number;
  progress: number;
}

export default function MeusCursosPage() {
  const [cursos, setCursos] = useState<CursoMatriculado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const carregarDados = async () => {
      try {
        setLoading(true);

        // 1. Obter usuário logado
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;
        if (!user) {
          setLoading(false);
          return;
        }

        // 2. Buscar somente os cursos em que o aluno está matriculado
        const { data: enrollments, error: enrollError } = await supabase
          .from('course_enrollments')
          .select('course_id')
          .eq('user_id', user.id);

        if (enrollError) throw enrollError;
        if (!enrollments || enrollments.length === 0) {
          setLoading(false);
          return;
        }

        const courseIds = enrollments.map((e: { course_id: string }) => e.course_id);

        // 3. Buscar detalhes dos cursos matriculados
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select('id, title, description, thumbnail_url, level')
          .in('id', courseIds);

        if (coursesError) throw coursesError;

        // 4. Para cada curso, contar aulas e progresso
        const cursosComProgresso: CursoMatriculado[] = await Promise.all(
          (coursesData || []).map(async (course: { id: string; title: string; description: string; thumbnail_url: string; level: string }) => {
            // Módulos do curso
            const { data: modules } = await supabase
              .from('modules')
              .select('id')
              .eq('course_id', course.id);

            const moduleIds = (modules || []).map((m: { id: string }) => m.id);

            let totalAulas = 0;
            let aulasCompletas = 0;

            if (moduleIds.length > 0) {
              // Total de aulas
              const { count: totalCount } = await supabase
                .from('lessons')
                .select('id', { count: 'exact', head: true })
                .in('module_id', moduleIds);

              totalAulas = totalCount ?? 0;

              // Aulas concluídas pelo aluno
              if (totalAulas > 0) {
                const { data: allLessons } = await supabase
                  .from('lessons')
                  .select('id')
                  .in('module_id', moduleIds);

                const lessonIds = (allLessons || []).map((l: { id: string }) => l.id);

                if (lessonIds.length > 0) {
                  const { count: completedCount } = await supabase
                    .from('lesson_progress')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .eq('completed', true)
                    .in('lesson_id', lessonIds);

                  aulasCompletas = completedCount ?? 0;
                }
              }
            }

            const progress = totalAulas > 0 ? Math.round((aulasCompletas / totalAulas) * 100) : 0;

            return {
              id: course.id,
              title: course.title,
              description: course.description,
              thumbnail_url: course.thumbnail_url,
              level: course.level || 'Iniciante',
              totalAulas,
              progress,
            };
          })
        );

        setCursos(cursosComProgresso);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background px-4 sm:px-8 lg:px-16 pt-10 pb-20">
        <h1 className="text-3xl font-black text-foreground mb-2">Meus Cursos</h1>
        <p className="text-foreground/60 mb-8">Carregando seus cursos...</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gold/10 rounded-md aspect-[16/9] border border-gold/20" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-background px-4 sm:px-8 lg:px-16 pt-10 pb-20">
        <h1 className="text-3xl font-black text-foreground mb-2">Meus Cursos</h1>
        <p className="text-foreground/60 mb-8">Erro ao carregar seus cursos. Tente novamente.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background px-4 sm:px-8 lg:px-16 pt-10 pb-20">
      <h1 className="text-3xl font-black text-foreground mb-2">Meus Cursos</h1>
      <p className="text-foreground/60 mb-8">Todos os cursos que você possui acesso.</p>

      {cursos.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen size={48} className="text-foreground/20 mx-auto mb-4" />
          <h2 className="text-foreground/50 font-semibold text-lg mb-2">Nenhum curso adquirido ainda</h2>
          <p className="text-foreground/30 text-sm mb-6">Acesse o catálogo e adquira seu primeiro curso.</p>
          <Link
            href="/aluno/catalogo"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gold text-foreground font-bold rounded-lg text-sm hover:bg-gold-dim transition-colors"
          >
            Ver Catálogo
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {cursos.map((curso) => {
            const status = curso.progress === 100 ? 'Concluído' : curso.progress > 0 ? 'Em andamento' : 'Não iniciado';

            return (
              <Link
                key={curso.id}
                href={`/aluno/cursos/${curso.id}`}
                className="flex flex-col group relative rounded-md overflow-hidden bg-foreground/5 border border-gold/20 hover:border-gold/40 transition-all duration-300 shadow-lg hover:shadow-2xl hover:-translate-y-1"
              >
                <div className="aspect-video relative bg-foreground/5">
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-80 group-hover:opacity-100 transition-opacity"
                    style={{ backgroundImage: curso.thumbnail_url ? `url(${curso.thumbnail_url})` : undefined }}
                  />
                  {/* Botão Hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-foreground/10">
                    <PlayCircle size={48} className="text-foreground drop-shadow-lg" />
                  </div>
                </div>

                <div className="p-4 flex flex-col flex-1">
                  <div className="text-xs font-bold text-gold mb-1 uppercase tracking-wider">{curso.level}</div>
                  <h3 className="font-bold text-base text-foreground mb-2 line-clamp-2">{curso.title}</h3>

                  <div className="flex items-center justify-between text-xs text-foreground/50 mb-3 mt-auto">
                    <span>{curso.totalAulas} aulas</span>
                    <span>{status}</span>
                  </div>

                  {/* Barra de Progresso */}
                  <div className="w-full bg-foreground/10 h-1.5 rounded-full overflow-hidden mb-1">
                    <div className="bg-gold h-full transition-all duration-500" style={{ width: `${curso.progress}%` }} />
                  </div>
                  <div className="text-[10px] text-foreground/40 text-right">{curso.progress}% concluído</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
