'use client';

import { useState, useEffect } from 'react';
import { Lock, Unlock, PlayCircle, Star } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { getCursos } from '@/lib/mock-data';
import type { Curso } from '@/lib/mock-data';

export default function CatalogoPage() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [cursosAprovados, setCursosAprovados] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      const cursosData = await getCursos();
      setCursos(cursosData);

      // Tentativa de buscar cursos do usuário no Supabase (com fallback)
      const acessos = await getUserCursoAcessos();
      const aprovados: Record<string, boolean> = {};
      acessos.forEach(a => {
        if (a.status === 'ativo') {
          aprovados[a.curso_id] = true;
        }
      });
      setCursosAprovados(aprovados);
      setLoading(false);
    };
    carregarDados();
  }, []);

  // Determinar acesso do usuário a cada curso
  const hasAccess = (cursoId: string) => {
    // Se tem acesso no Supabase, liberado
    if (cursosAprovados[cursoId]) return true;
    // Fallback mock: course_1 sempre liberado
    return cursoId === 'course_1';
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#141414] px-4 sm:px-8 lg:px-16 pt-10 pb-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="h-8 bg-white/10 rounded w-64 animate-pulse mb-2" />
            <div className="h-5 bg-white/10 rounded w-80 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-md overflow-hidden animate-pulse">
              <div className="aspect-video bg-white/10" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-white/10 rounded" />
                <div className="h-4 bg-white/10 rounded w-5/6" />
                <div className="h-4 bg-white/10 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#141414] px-4 sm:px-8 lg:px-16 pt-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white mb-2">Catálogo de Cursos</h1>
          <p className="text-white/60 max-w-2xl">Descubra novos conteúdos, formações e aprimore suas habilidades com nossos cursos especializados.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {cursos.map((curso) => {
          const unlocked = hasAccess(curso.id);
          const isFree = curso.nivel === 'Iniciante';

          return (
            <div
              key={curso.id}
              className="flex flex-col group relative rounded-md overflow-hidden bg-white/5 border border-white/10 hover:border-white/30 transition-all duration-300 shadow-lg"
            >
              <div className="aspect-video relative bg-black">
                <div className="absolute inset-0 bg-cover bg-center opacity-80 transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: `url(${curso.capaUrl})` }} />

                {/* Badge Status */}
                <div className="absolute top-3 right-3 z-10">
                  {unlocked ? (
                    <div className="bg-primary/90 backdrop-blur text-black text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                      <Unlock size={14} /> Liberado
                    </div>
                  ) : (
                    <div className="bg-black/60 backdrop-blur text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1 border border-white/20">
                      <Lock size={14} /> {isFree ? 'Grátis' : 'Premium'}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 flex flex-col flex-1 z-10 bg-[#1a1a1a]">
                <div className="text-xs font-bold text-primary mb-1 uppercase tracking-wider flex items-center justify-between">
                  {curso.nivel}
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star size={12} className="fill-yellow-500" /> 5.0
                  </div>
                </div>
                <h3 className="font-bold text-base text-white mb-2 line-clamp-1">{curso.titulo}</h3>
                <p className="text-sm text-white/60 mb-4 line-clamp-2 flex-1">{curso.descricao}</p>

                <div className="flex items-center justify-between text-xs text-white/50 mb-4">
                  <span>{curso.duracaoHoras} horas</span>
                  <span>{curso.totalAulas} aulas</span>
                </div>

                {unlocked ? (
                  <Link href={`/aluno/cursos/${curso.id}`}>
                    <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                      <PlayCircle size={18} />
                      Acessar Curso
                    </Button>
                  </Link>
                ) : (
                  <Button variant="primary" className="w-full flex items-center justify-center gap-2 font-bold">
                    <Lock size={18} />
                    {isFree ? 'Acessar Grátis' : 'Desbloquear'}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Helper de fallback — busca acessos no Supabase
interface UserCursoAcesso {
  curso_id: string;
  status: string;
}

async function getUserCursoAcessos(): Promise<UserCursoAcesso[]> {
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('user_curso_acessos')
      .select('curso_id, status')
      .eq('user_id', user.id)
      .eq('status', 'ativo');
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}
