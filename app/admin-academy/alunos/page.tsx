'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, Shield, Lock } from 'lucide-react';
import { Button } from '@/components/Button';

interface Aluno {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  cursos: string[];
  progresso: number;
  status: 'Ativo' | 'Concluído' | 'Inativo' | 'Bloqueado';
}

// Fallback mock para alunos (usado quando Supabase não tem dados)
const MOCK_ALUNOS: Aluno[] = [
  { id: '1', user_id: 'u1', nome: 'João Silva', email: 'joao.silva@email.com', cursos: ['Cabeleireiro Iniciante'], progresso: 45, status: 'Ativo' },
  { id: '2', user_id: 'u2', nome: 'Maria Oliveira', email: 'maria.oliveira@email.com', cursos: ['Cortes Avançados', 'Colorimetria'], progresso: 12, status: 'Ativo' },
  { id: '3', user_id: 'u3', nome: 'Carlos Souza', email: 'carlos.souza@email.com', cursos: ['Cabeleireiro Iniciante'], progresso: 100, status: 'Concluído' },
  { id: '4', user_id: 'u4', nome: 'Ana Costa', email: 'ana.costa@email.com', cursos: [], progresso: 0, status: 'Inativo' },
  { id: '5', user_id: 'u5', nome: 'Pedro Santos', email: 'pedro.santos@email.com', cursos: ['Colorimetria'], progresso: 80, status: 'Bloqueado' },
];

export default function AdminAlunosPage() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const carregarAlunos = async () => {
      setLoading(true);
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setAlunos(MOCK_ALUNOS);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('alunos')
          .select(`
            id, user_id, nome, email, status,
            user_curso_acessos!inner (curso_id, progresso_percentual)
          `)
          .order('nome');

        if (error || !data || data.length === 0) {
          setAlunos(MOCK_ALUNOS);
        } else {
          // Mapear dados reais
          const mapped: Aluno[] = data.map((a: any) => ({
            id: a.id,
            user_id: a.user_id,
            nome: a.nome,
            email: a.email,
            cursos: a.user_curso_acessos?.map((aca: any) => aca.curso_id) || [],
            progresso: Math.max(...(a.user_curso_acessos?.map((aca: any) => aca.progresso_percentual) || [0]), 0),
            status: a.status as Aluno['status']
          }));
          setAlunos(mapped);
        }
      } catch {
        // Supabase não disponível
        setAlunos(MOCK_ALUNOS);
      }
      setLoading(false);
    };
    carregarAlunos();
  }, []);

  const filteredAlunos = alunos.filter(aluno =>
    aluno.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    aluno.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex-1 p-8 overflow-y-auto bg-[var(--background)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Alunos (Academy)</h1>
            <p className="text-sm text-foreground/60">Gerencie os acessos e matrículas dos seus alunos.</p>
          </div>
        </div>

        <div className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-xl p-4 mb-6">
          <div className="h-10 bg-white/10 rounded animate-pulse" />
        </div>

        <div className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--background)]/50">
                <th className="py-4 px-6 text-xs font-bold text-foreground/50 uppercase tracking-wider">Aluno</th>
                <th className="py-4 px-6 text-xs font-bold text-foreground/50 uppercase tracking-wider">Acessos</th>
                <th className="py-4 px-6 text-xs font-bold text-foreground/50 uppercase tracking-wider">Progresso</th>
                <th className="py-4 px-6 text-xs font-bold text-foreground/50 uppercase tracking-wider">Status</th>
                <th className="py-4 px-6 text-xs font-bold text-foreground/50 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-[var(--border-subtle)]">
                  <td className="py-4 px-6"><div className="h-4 bg-white/10 rounded animate-pulse w-32 mb-1" /><div className="h-3 bg-white/10 rounded animate-pulse w-48" /></td>
                  <td className="py-4 px-6"><div className="h-4 bg-white/10 rounded animate-pulse w-20" /></td>
                  <td className="py-4 px-6"><div className="h-4 bg-white/10 rounded animate-pulse w-24" /></td>
                  <td className="py-4 px-6"><div className="h-4 bg-white/10 rounded animate-pulse w-16" /></td>
                  <td className="py-4 px-6 text-right"><div className="h-4 bg-white/10 rounded animate-pulse w-8" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-[var(--background)]">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alunos (Academy)</h1>
          <p className="text-sm text-foreground/60">Gerencie os acessos e matrículas dos seus alunos.</p>
        </div>
      </div>

      {/* Barra de Ferramentas */}
      <div className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg py-2 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <Button variant="outline" className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={16} /> Filtros
        </Button>
      </div>

      {/* Tabela de Alunos */}
      <div className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--background)]/50">
                <th className="py-4 px-6 text-xs font-bold text-foreground/50 uppercase tracking-wider">Aluno</th>
                <th className="py-4 px-6 text-xs font-bold text-foreground/50 uppercase tracking-wider">Acessos</th>
                <th className="py-4 px-6 text-xs font-bold text-foreground/50 uppercase tracking-wider">Progresso</th>
                <th className="py-4 px-6 text-xs font-bold text-foreground/50 uppercase tracking-wider">Status</th>
                <th className="py-4 px-6 text-xs font-bold text-foreground/50 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filteredAlunos.map((aluno) => (
                <tr key={aluno.id} className="hover:bg-[var(--background)]/30 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                        {aluno.nome.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{aluno.nome}</p>
                        <p className="text-xs text-foreground/50">{aluno.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    {aluno.cursos.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {aluno.cursos.map((curso, idx) => (
                          <span key={idx} className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full border border-primary/20">
                            {curso}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-foreground/40 italic">Sem acessos</span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-[var(--background)] rounded-full overflow-hidden w-24">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${aluno.progresso}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-foreground/70">{aluno.progresso}%</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${
                      aluno.status === 'Ativo' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                      aluno.status === 'Concluído' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                      aluno.status === 'Bloqueado' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                      'bg-foreground/10 text-foreground/50 border border-foreground/20'
                    }`}>
                      {aluno.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 text-foreground/50 hover:text-primary transition-colors rounded-lg hover:bg-primary/10" title="Editar Acessos">
                        <Shield size={16} />
                      </button>
                      <button className="p-2 text-foreground/50 hover:text-red-500 transition-colors rounded-lg hover:bg-red-500/10" title="Bloquear Aluno">
                        <Lock size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredAlunos.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-foreground/50">
                    Nenhum aluno encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
