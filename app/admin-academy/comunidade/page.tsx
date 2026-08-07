'use client';

import { useState } from 'react';
import { Search, Filter, MessageSquare, CheckCircle, XCircle, Reply } from 'lucide-react';
import { Button } from '@/components/Button';

// Mock data (será substituído pelos dados reais do banco de dados)
const MOCK_COMMENTS: any[] = [];

export default function AdminAcademyComunidade() {
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');

  const filteredComments = activeTab === 'pending' 
    ? MOCK_COMMENTS.filter(c => c.status === 'pending')
    : MOCK_COMMENTS;

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-[var(--background)]">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
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
          Pendentes de Resposta ({MOCK_COMMENTS.filter(c => c.status === 'pending').length})
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
