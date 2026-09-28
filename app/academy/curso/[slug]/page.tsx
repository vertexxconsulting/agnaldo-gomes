'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';

interface Lesson {
  id: string;
  title: string;
  duration_minutes: number;
  status: 'completed' | 'current' | 'locked';
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  progress: number;
}

export default function CoursePage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCourseData() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // 1. Fetch Course Details
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('slug', slug)
        .single();

      if (courseError || !courseData) {
        console.error('Course not found:', courseError);
        setLoading(false);
        return;
      }

      // 2. Fetch Progress for this course
      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('lesson_id')
        .eq('user_id', user.id)
        .eq('completed', true);

      const completedLessonsIds = progressData?.map((p: { lesson_id: string }) => p.lesson_id) || [];

      // 3. Fetch Modules and Lessons
      const { data: modulesData } = await supabase
        .from('modules')
        .select(`
          id, 
          title, 
          order_index,
          lessons (
            id, 
            title, 
            duration_minutes, 
            order_index
          )
        `)
        .eq('course_id', courseData.id)
        .order('order_index', { ascending: true });

      if (modulesData) {
        const formattedModules: Module[] = modulesData.map((m: { id: string; title: string; lessons: { id: string; title: string; duration_minutes: number; order_index: number }[] }) => ({
          id: m.id,
          title: m.title,
          lessons: m.lessons.map((l) => {
            const isCompleted = completedLessonsIds.includes(l.id);
            return {
              ...l,
              duration_minutes: l.duration_minutes,
              status: isCompleted ? 'completed' : 'locked' as Lesson['status']
            };
          }).sort((a, b) => a.order_index - b.order_index)
        }));
        setModules(formattedModules);
        
        // Calculate total progress
        const totalLessons = modulesData.reduce((acc: number, m: any) => acc + m.lessons.length, 0);
        const progressPct = totalLessons > 0 ? Math.round((completedLessonsIds.length / totalLessons) * 100) : 0;
        
        setCourse({
          id: courseData.id,
          title: courseData.title,
          description: courseData.description,
          thumbnail_url: courseData.thumbnail_url,
          progress: progressPct
        });
      }

      setLoading(false);
    }
    loadCourseData();
  }, [slug]);

  const toggleModule = (id: string) => {
    setExpandedModules(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-foreground">
        <div className="w-12 h-12 border-4 border-[#B8860B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!course) return <div className="text-foreground text-center py-20">Curso não encontrado.</div>;

  return (
    <div className="pb-20 px-4 sm:px-8 max-w-5xl mx-auto">
      <div className="relative w-full h-[300px] rounded-3xl overflow-hidden my-6 group">
        <img src={course.thumbnail_url || 'https://via.placeholder.com/1200x300'} alt={course.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground via-foreground/40 to-transparent" />
        <div className="absolute bottom-0 left-0 p-8 w-full">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-3xl sm:text-5xl font-bold mb-2">{course.title}</h1>
              <p className="text-foreground/50 text-sm sm:text-base max-w-2xl line-clamp-2">{course.description}</p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className="flex items-center gap-3 text-sm font-medium">
                <span className="text-foreground/60">Progresso: {course.progress}%</span>
                <div className="w-32 h-2 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-[#B8860B]" style={{ width: `${course.progress}%` }} />
                </div>
              </div>
              <Link 
                href={`/academy/aula/${modules[0]?.lessons[0]?.id}`} 
                className="bg-[#B8860B] text-black px-6 py-2 rounded-full font-bold hover:bg-white transition-all"
              >
                Continuar Assistindo
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mt-12">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
            <span className="w-1 h-6 bg-[#B8860B] rounded-full" />
            Conteúdo do Curso
          </h2>

          {modules.map((module) => (
            <div key={module.id} className="border border-white/10 rounded-2xl overflow-hidden bg-white/[0.02]">
              <button 
                onClick={() => toggleModule(module.id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/[0.05] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className={`transition-transform duration-300 ${expandedModules.includes(module.id) ? 'rotate-90' : ''}`}>
                    ▶
                  </span>
                  <span className="font-bold text-lg">{module.title}</span>
                </div>
                <span className="text-xs text-gray-500">{module.lessons.length} aulas</span>
              </button>

              {expandedModules.includes(module.id) && (
                <div className="px-6 pb-4 space-y-2">
                  {module.lessons.map((lesson) => (
                    <Link 
                      key={lesson.id} 
                      href={`/academy/aula/${lesson.id}`}
                      className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                        lesson.status === 'current' ? 'bg-[#B8860B]/10 border border-[#B8860B]/30' : 'hover:bg-white/[0.05] border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-sm">
                          {lesson.status === 'completed' ? '✅' : '🔒'}
                        </span>
                        <span className={`text-sm ${lesson.status === 'current' ? 'text-[#B8860B] font-bold' : 'text-foreground/50'}`}>
                          {lesson.title}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">{lesson.duration_minutes} min</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-8">
          <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10">
            <h3 className="font-bold text-lg mb-4">Recursos Adicionais</h3>
            <div className="space-y-3">
              <button className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-sm flex items-center gap-3">
                <span>📄</span> Material de Apoio (PDF)
              </button>
              <button className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-sm flex items-center gap-3">
                <span>💬</span> Fórum da Turma
              </button>
              <button className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-sm flex items-center gap-3">
                <span>🎓</span> Emitir Certificado
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
