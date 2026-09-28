'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';

export default function LessonPage() {
  const params = useParams();
  const lessonId = params.id as string;
  
  const [lesson, setLesson] = useState<any>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLessonData() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // 1. Fetch Lesson, Module and Course
      const { data: lessonData } = await supabase
        .from('lessons')
        .select(`
          *,
          modules (
            title,
            courses (title)
          )
        `)
        .eq('id', lessonId)
        .single();

      if (lessonData) {
        setLesson(lessonData);
      }

      // 2. Check if lesson is completed
      const { data: progress } = await supabase
        .from('lesson_progress')
        .select('completed')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .single();

      setIsCompleted(progress?.completed || false);

      // 3. Fetch Lesson Note
      const { data: noteData } = await supabase
        .from('lesson_notes')
        .select('content')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .single();

      if (noteData) setNote(noteData.content);

      setLoading(false);
    }
    loadLessonData();
  }, [lessonId]);

  async function handleComplete() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('lesson_progress')
      .upsert({ 
        user_id: user.id, 
        lesson_id: lessonId, 
        completed: true, 
        completed_at: new Date().toISOString() 
      });

    if (!error) {
      setIsCompleted(true);
    }
  }

  async function handleSaveNote() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('lesson_notes')
      .upsert({ 
        user_id: user.id, 
        lesson_id: lessonId, 
        content: note 
      });

    if (!error) alert('Nota salva com sucesso!');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-foreground">
        <div className="w-12 h-12 border-4 border-[#B8860B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!lesson) return <div className="text-foreground text-center py-20">Aula não encontrada.</div>;

  return (
    <div className="min-h-screen bg-foreground text-foreground pb-20">
      <div className="max-w-7xl mx-auto px-4 py-6 flex items-center gap-2 text-xs text-gray-500">
        <Link href="/academy" className="hover:text-[#B8860B]">Início</Link>
        <span>/</span>
        <Link href={`/academy/curso/${lesson.modules.courses.title.toLowerCase().replace(/ /g, '-')}`} className="hover:text-[#B8860B]">
          {lesson.modules.courses.title}
        </Link>
        <span>/</span>
        <span className="text-foreground/50">{lesson.modules.title}</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="relative aspect-video w-full rounded-3xl overflow-hidden shadow-2xl border border-gold/10 bg-foreground">
            <iframe 
              className="w-full h-full"
              src={lesson.video_url || 'https://www.youtube.com/embed/dQw4w9WgXcQ'} 
              title={lesson.title}
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
            ></iframe>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">{lesson.title}</h1>
              <p className="text-foreground/60 text-sm">{lesson.duration_minutes} min • {lesson.modules.title}</p>
            </div>
            <button 
              onClick={handleComplete}
              className={`${isCompleted ? 'bg-green-600' : 'bg-[#B8860B]'} text-black px-6 py-3 rounded-full font-bold hover:bg-white transition-all flex items-center justify-center gap-2`}
            >
              <span>{isCompleted ? '✅' : '✓'}</span> {isCompleted ? 'Concluída' : 'Marcar como Concluída'}
            </button>
          </div>

          <div className="p-6 rounded-3xl bg-white/[0.03] border border-gold/10">
            <h3 className="font-bold text-lg mb-3">Sobre esta aula</h3>
            <p className="text-foreground/50 leading-relaxed">
              {lesson.description || 'Sem descrição disponível para esta aula.'}
            </p>
          </div>

          <div className="flex items-center justify-between pt-6">
            <Link href="#" className="text-sm text-foreground/60 hover:text-foreground flex items-center gap-2 transition-colors">
              <span>←</span> Aula Anterior
            </Link>
            <Link href="#" className="text-sm text-[#B8860B] hover:text-foreground flex items-center gap-2 font-bold transition-colors">
              Próxima Aula <span>→</span>
            </Link>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white/[0.03] border border-gold/10">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <span>📎</span> Materiais da Aula
            </h3>
            <div className="space-y-3">
              <div className="text-sm text-gray-500 italic">Nenhum material disponível para esta aula.</div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white/[0.03] border border-gold/10">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <span>📝</span> Minhas Anotações
            </h3>
            <textarea 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Digite suas anotações sobre esta aula..."
              className="w-full h-32 bg-foreground border border-gold/10 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-gold transition-all resize-none"
            />
            <button 
              onClick={handleSaveNote}
              className="w-full mt-3 py-2 text-xs font-bold text-foreground/60 hover:text-foreground transition-colors"
            >
              Salvar anotação
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
