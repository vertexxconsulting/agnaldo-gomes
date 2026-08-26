'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, MessageSquare, CheckCircle, XCircle, Reply } from 'lucide-react';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';

interface Comentario {
  id: string;
  student: string;
  course: string;
  lesson: string;
  content: string;
  date: string;
  status: 'pending' | 'approved';
}

// Fallback mock
const MOCK_COMMENTS: Comentario[] = [
  {
    id: 'mock_1',
    student: 'Mariana Silva',
    course: 'Colorimetria',
    lesson: 'Módulo 2 — Estrela de Oswald',
    content: 'Professora, tive dificuldade com a técnica de neutralização. O tom ficou mais amarelado do que esperado. Alguma dica?',
    date: '2 horas atrás',
    status: 'pending'
  },
  {
    id: 'mock_2',
    student: 'Carlos Souza',
    course: 'Cortes Modernos 2026',
    lesson: 'Módulo 1 — Visagismo',
    content: 'Excelente aula! Já aplicando no dia a dia. Cliente ficou muito satisfeita.',
    date: 'ontem',
    status: 'approved'
  }
];

export default function AdminAcademyComunidade() {
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const carregarComentarios = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setComentarios(MOCK_COMMENTS);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('community_comments')
          .select('id, content, status, created_at, user_id')
          .order('created_at', { ascending: false });

        if (error || !data || data.length === 0) {
          setComentarios(MOCK_COMMENTS);
        } else {
          // Mapear dados reais com nome genérico (perfil carregado separadamente)
          const mapped: Comentario[] = data.map((c: any) => ({
            id: c.id,
            student: c.user_id ? `Aluno #${c.user_id.substring(0, 8)}` : 'Aluno',
            course: 'Curso',
            lesson: 'Aula',
            content: c.content || '',
            date: new Date(c.created_at).toLocaleDateString('pt-BR', {
              hour: '2-digit', minute: '2-digit'
            }),
            status: c.status as Comentario['status']
          }));
          setComentarios(mapped);
        }
      } catch {
        setComentarios(MOCK_COMMENTS);
      }
      setLoading(false);
    };
    carregarComentarios();
  }, []);

  const filteredComments = comentarios.filter(c =>
    (activeTab === 'pending' ? c.status === 'pending' : true) &&
    (c.student.toLowerCase().includes(searchTerm.toLowerCase()) ||
     c.content.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex-1 p-6 overflow-y-auto bg-[var(--background)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="h-7 bg-white/10 rounded w-56 animate-pulse mb-1" />
            <div className="h-5 bg-white/10 rounded w-72 animate-pulse" />
          </div>
        </div>

        <div className="h-10 bg-white/10 rounded mb-6 animate-pulse" />
        <div className="h-12 bg-white/10 rounded mb-6 animate-pulse" />

        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-xl p-5 animate-pulse">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10" />
                  <div>
                    <div className="h-4 bg-white/10 rounded w-24 mb-1" />
                    <div className="h-3 bg-white/10 rounded w-48" />
                  </div>
                </div>
                <div className="h-3 bg-white/10 rounded w-16" />
              </div>
              <div className="h-4 bg-white/10 rounded w-full mt-3 mb-4" />
              <div className="h-4 bg-white/10 rounded w-3/4 mt-2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-[var(--background)]">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Comunidade e Dúvidas</h1>
          <p className="text-sm text-foreground/60">Modere os comentários e responda as dúvidas dos alunos.</p>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6 border-b border-[var(--border-subtle)] pb-4">
        <button
          onClick={() => setActiveTab('pending')}
          className={`font-medium text-sm transition-colors ${activeTab === 'pending' ? 'text-primary' : 'text-foreground/50 hover:text-foreground'}`}
        >
          Pendentes de Resposta ({comentarios.filter(c => c.status === 'pending').length})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`font-medium text-sm transition-colors ${activeTab === 'all' ? 'text-primary' : 'text-foreground/50 hover:text-foreground'}`}
        >
          Todos os Comentários
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50" size={18} />
          <input
            type="text"
            placeholder="Buscar por aluno ou palavra-chave..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-lg text-sm focus:outline-none focus:border-primary text-foreground"
          />
        </div>
        <Button variant="outline" className="flex items-center gap-2">
          <Filter size={18} />
          Filtrar Curso
        </Button>
      </div>

      <div className="space-y-4">
        {filteredComments.map(comment => (
          <div key={comment.id} className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-xl p-5">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {comment.student.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">{comment.student}</h3>
                  <p className="text-xs text-foreground/50">{comment.course} &bull; {comment.lesson}</p>
                </div>
              </div>
              <span className="text-xs text-foreground/40">{comment.date}</span>
            </div>

            <p className="text-foreground/80 text-sm mt-3 mb-4">
              {comment.content}
            </p>

            <div className="flex items-center gap-2 pt-4 border-t border-[var(--border-subtle)]">
              <Button size="sm" variant="primary" className="flex items-center gap-2">
                <Reply size={16} />
                Responder
              </Button>
              {comment.status === 'pending' && (
                <Button size="sm" variant="outline" className="flex items-center gap-2 text-green-600 border-green-600/30 hover:bg-green-600/10">
                  <CheckCircle size={16} />
                  Aprovar (Sem Resposta)
                </Button>
              )}
              <Button size="sm" variant="outline" className="flex items-center gap-2 text-red-500 border-red-500/30 hover:bg-red-500/10 ml-auto">
                <XCircle size={16} />
                Ocultar
              </Button>
            </div>
          </div>
        ))}

        {filteredComments.length === 0 && (
          <div className="text-center py-12 text-foreground/50">
            <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />
            <p>Nenhum comentário encontrado nesta aba.</p>
          </div>
        )}
      </div>

    </div>
  );
}
