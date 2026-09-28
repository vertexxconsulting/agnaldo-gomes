'use client';

import React, { useState, useEffect } from 'react';
import { Search, Filter, Shield, Lock, ChevronDown, ChevronUp, X, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/Button';
import { SectionHeader, Panel } from '@/components/ui/Panel';

interface CursoProgresso {
  titulo: string;
  progresso: number;
  totalAulas: number;
  concluido: boolean;
}

interface Aluno {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  cursos: string[];
  cursosDetalhados?: Record<string, CursoProgresso>;
  progresso: number;
  status: 'Ativo' | 'Concluído' | 'Inativo' | 'Bloqueado';
  dataCadastro: string;
}

export default function AdminAlunosPage() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  // Modal de Acessos
  const [modalAcessosOpen, setModalAcessosOpen] = useState(false);
  const [alunoSelecionado, setAlunoSelecionado] = useState<Aluno | null>(null);
  const [cursosDisponiveis, setCursosDisponiveis] = useState<{id: string, title: string}[]>([]);
  const [acessosAtuais, setAcessosAtuais] = useState<Set<string>>(new Set());
  const [loadingAcessos, setLoadingAcessos] = useState(false);
  const [savingAcessos, setSavingAcessos] = useState(false);

  // Modal de Exclusão
  const [modalExcluirOpen, setModalExcluirOpen] = useState(false);
  const [deletingAluno, setDeletingAluno] = useState(false);
  const [togglingBlockId, setTogglingBlockId] = useState<string | null>(null);

  const carregarAlunos = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin-academy/alunos?withProgress=true');
      const data = await res.json();
      if (!data.error && data.alunos) {
        setAlunos(data.alunos);
      }
    } catch (error) {
      console.error('Erro ao carregar alunos:', error);
    }
    setLoading(false);
  };
  useEffect(() => {
    carregarAlunos();
  }, []);

  const abrirModalAcessos = async (aluno: Aluno) => {
    setAlunoSelecionado(aluno);
    setModalAcessosOpen(true);
    setLoadingAcessos(true);
    try {
      const res = await fetch(`/api/admin-academy/alunos/${aluno.id}/acessos`);
      const data = await res.json();
      if (data.cursos) setCursosDisponiveis(data.cursos);
      if (data.acessos) setAcessosAtuais(new Set(data.acessos));
    } catch (error) {
      console.error('Erro ao carregar acessos:', error);
    }
    setLoadingAcessos(false);
  };

  const toggleAcesso = (cursoId: string) => {
    setAcessosAtuais(prev => {
      const next = new Set(prev);
      if (next.has(cursoId)) next.delete(cursoId);
      else next.add(cursoId);
      return next;
    });
  };

  const salvarAcessos = async () => {
    if (!alunoSelecionado) return;
    setSavingAcessos(true);
    try {
      const res = await fetch(`/api/admin-academy/alunos/${alunoSelecionado.id}/acessos`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseIds: Array.from(acessosAtuais) }),
      });
      if (res.ok) {
        setModalAcessosOpen(false);
        carregarAlunos(); // recarregar lista para refletir os novos status e cursos
      } else {
        alert('Erro ao salvar acessos');
      }
    } catch (error) {
      console.error('Erro ao salvar acessos:', error);
      alert('Erro de conexão');
    }
    setSavingAcessos(false);
  };

  const confirmarExclusao = (aluno: Aluno) => {
    setAlunoSelecionado(aluno);
    setModalExcluirOpen(true);
  };

  const excluirAluno = async () => {
    if (!alunoSelecionado) return;
    setDeletingAluno(true);
    try {
      const res = await fetch(`/api/admin-academy/alunos/${alunoSelecionado.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setModalExcluirOpen(false);
        carregarAlunos(); // recarregar lista
      } else {
        const data = await res.json();
        alert(`Erro: ${data.error || 'Não foi possível excluir o aluno'}`);
      }
    } catch (error) {
      console.error('Erro ao excluir aluno:', error);
      alert('Erro de conexão ao tentar excluir.');
    }
    setDeletingAluno(false);
  };

  const alternarBloqueio = async (aluno: Aluno) => {
    setTogglingBlockId(aluno.id);
    try {
      const isBlocked = aluno.status === 'Bloqueado';
      const action = isBlocked ? 'unblock' : 'block';
      const res = await fetch(`/api/admin-academy/alunos/${aluno.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        carregarAlunos();
      } else {
        const data = await res.json();
        alert(`Erro: ${data.error || 'Não foi possível alterar o bloqueio'}`);
      }
    } catch (error) {
      console.error('Erro ao bloquear/desbloquear aluno:', error);
      alert('Erro de conexão.');
    }
    setTogglingBlockId(null);
  };

  const filteredAlunos = alunos.filter(aluno =>
    aluno.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    aluno.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleExpand = (alunoId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(alunoId)) next.delete(alunoId);
      else next.add(alunoId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 overflow-y-auto bg-[var(--background)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Alunos (Academy)</h1>
            <p className="text-sm text-foreground/60">Gerencie os acessos e matrículas dos seus alunos.</p>
          </div>
        </div>

        <div className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-xl p-4 mb-6">
          <div className="h-10 bg-gold/10 rounded animate-pulse" />
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
                  <td className="py-4 px-6"><div className="h-4 bg-gold/10 rounded animate-pulse w-32 mb-1" /><div className="h-3 bg-gold/10 rounded animate-pulse w-48" /></td>
                  <td className="py-4 px-6"><div className="h-4 bg-gold/10 rounded animate-pulse w-20" /></td>
                  <td className="py-4 px-6"><div className="h-4 bg-gold/10 rounded animate-pulse w-24" /></td>
                  <td className="py-4 px-6"><div className="h-4 bg-gold/10 rounded animate-pulse w-16" /></td>
                  <td className="py-4 px-6 text-right"><div className="h-4 bg-gold/10 rounded animate-pulse w-8" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-[var(--background)]">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alunos (Academy)</h1>
          <p className="text-sm text-foreground/60">Gerencie os acessos e matrículas dos seus alunos.</p>
        </div>
      </div>

      <div className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg py-2 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:border-gold transition-colors"
          />
        </div>

        <Button variant="outline" className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={16} /> Filtros
        </Button>
      </div>

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
                <React.Fragment key={aluno.id}>
                  <tr className="hover:bg-[var(--background)]/30 transition-colors cursor-pointer" onClick={() => toggleExpand(aluno.id)}>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold">
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
                            <span key={idx} className="bg-gold/10 text-gold text-[10px] font-bold px-2 py-0.5 rounded-full border border-gold/20">
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
                        <div className="flex-1 h-2 bg-[var(--background)] rounded-full overflow-hidden w-24 max-w-[120px]">
                          <div
                            className="h-full bg-gold rounded-full"
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
                        <button 
                          className="p-2 text-foreground/50 hover:text-gold transition-colors rounded-lg hover:bg-gold/10" 
                          title="Editar Acessos"
                          onClick={(e) => { e.stopPropagation(); abrirModalAcessos(aluno); }}
                        >
                          <Shield size={16} />
                        </button>
                        <button 
                          className={`p-2 text-foreground/50 transition-colors rounded-lg ${aluno.status === 'Bloqueado' ? 'text-red-500 bg-red-500/10' : 'hover:text-red-500 hover:bg-red-500/10'}`} 
                          title={aluno.status === 'Bloqueado' ? "Desbloquear Aluno" : "Bloquear Aluno"}
                          onClick={(e) => { e.stopPropagation(); alternarBloqueio(aluno); }}
                          disabled={togglingBlockId === aluno.id}
                        >
                          {togglingBlockId === aluno.id ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                        </button>
                        <button 
                          className="p-2 text-foreground/50 hover:text-red-500 transition-colors rounded-lg hover:bg-red-500/10" 
                          title="Excluir Aluno"
                          onClick={(e) => { e.stopPropagation(); confirmarExclusao(aluno); }}
                        >
                          <Trash2 size={16} />
                        </button>
                        <button 
                          className="p-2 text-foreground/50 hover:text-gold transition-colors rounded-lg hover:bg-gold/10" 
                          title={expandedRows.has(aluno.id) ? 'Recolher' : 'Expandir'}
                          onClick={(e) => { e.stopPropagation(); toggleExpand(aluno.id); }}
                        >
                          {expandedRows.has(aluno.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedRows.has(aluno.id) && aluno.cursosDetalhados && (
                    <tr className="bg-[var(--background)]/20">
                      <td colSpan={5} className="p-4">
                        <div className="space-y-2 ml-14">
                          {Object.entries(aluno.cursosDetalhados).map(([cursoId, detalhes]) => (
                            <div key={cursoId} className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-foreground">{detalhes.titulo}</h4>
                                <span className="text-xs text-foreground/50">
                                  {detalhes.totalAulas} aulas total
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex-1 h-3 bg-[var(--background)] rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${detalhes.concluido ? 'bg-green-500' : 'bg-gold'}`}
                                    style={{ width: `${detalhes.progresso}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium text-foreground/70">{detalhes.progresso}%</span>
                                {detalhes.concluido && (
                                  <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-green-500/10 text-green-500 border border-green-500/20">
                                    Concluído
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
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

      {/* Modal de Acessos */}
      {modalAcessosOpen && alunoSelecionado && (
        <div className="fixed inset-0 bg-foreground/[0.7] backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-foreground">Editar Acessos</h3>
                <p className="text-xs text-foreground/50">{alunoSelecionado.nome}</p>
              </div>
              <button 
                onClick={() => setModalAcessosOpen(false)}
                className="p-2 text-foreground/50 hover:text-foreground hover:bg-foreground/5 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto space-y-2">
              {loadingAcessos ? (
                <div className="flex flex-col items-center justify-center py-12 text-foreground/50">
                  <Loader2 className="animate-spin mb-2" size={24} />
                  <p className="text-sm">Carregando cursos...</p>
                </div>
              ) : cursosDisponiveis.length === 0 ? (
                <div className="text-center py-8 text-foreground/50 text-sm">
                  Nenhum curso disponível cadastrado.
                </div>
              ) : (
                cursosDisponiveis.map(curso => (
                  <label 
                    key={curso.id} 
                    className="flex items-center justify-between p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)]/50 hover:bg-[var(--background)] cursor-pointer transition-colors"
                  >
                    <span className="font-medium text-sm text-foreground">{curso.title}</span>
                    <input 
                      type="checkbox" 
                      checked={acessosAtuais.has(curso.id)}
                      onChange={() => toggleAcesso(curso.id)}
                      className="w-4 h-4 rounded border-[var(--border-subtle)] bg-background text-gold focus:ring-primary focus:ring-offset-background"
                    />
                  </label>
                ))
              )}
            </div>

            <div className="p-4 border-t border-[var(--border-subtle)] flex justify-end gap-3">
              <Button variant="outline" onClick={() => setModalAcessosOpen(false)}>Cancelar</Button>
              <Button variant="primary" onClick={salvarAcessos} disabled={savingAcessos || loadingAcessos}>
                {savingAcessos ? <Loader2 className="animate-spin" size={16} /> : 'Salvar Acessos'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {modalExcluirOpen && alunoSelecionado && (
        <div className="fixed inset-0 bg-foreground/[0.7] backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-xl w-full max-w-md shadow-2xl flex flex-col p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-4">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Excluir Aluno?</h3>
              <p className="text-sm text-foreground/60 mb-6">
                Tem certeza que deseja excluir permanentemente o aluno <strong className="text-foreground">{alunoSelecionado.nome}</strong>?
                Isso removerá todo o progresso, matrículas e a conta não poderá ser recuperada.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setModalExcluirOpen(false)}>Cancelar</Button>
              <Button 
                variant="primary" 
                className="flex-1 !bg-red-500 !text-foreground hover:!bg-red-600 border-none shadow-lg shadow-red-500/20" 
                onClick={excluirAluno} 
                disabled={deletingAluno}
              >
                {deletingAluno ? <Loader2 className="animate-spin" size={16} /> : 'Sim, Excluir'}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
