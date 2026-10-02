'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, RotateCcw, XCircle, Eye, Download, Award, AlertCircle } from 'lucide-react';
import { Button } from '@/components/Button';
import { SectionHeader, Panel } from '@/components/ui/Panel';

interface Certificado {
  id: string;
  user_id: string;
  course_id: string;
  issued_at: string;
  certificate_number: string;
  pdf_url: string | null;
  verification_hash: string;
  status: string;
  profiles: {
    full_name: string | null;
    email: string;
  };
  courses: {
    title: string;
  };
}

export default function AdminCertificadosPage() {
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'issued' | 'revoked' | 'reissued'>('issued');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  useEffect(() => {
    const carregarCertificados = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          status: statusFilter,
          page: page.toString(),
          limit: limit.toString(),
        });
        if (searchTerm) params.append('search', searchTerm);
        
        const res = await fetch(`/api/admin-academy/certificados?${params}`);
        const data = await res.json();
        if (!data.error) {
          setCertificados(data.certificados);
          setTotalPages(data.totalPages);
        }
      } catch (error) {
        console.error('Erro ao carregar certificados:', error);
      }
      setLoading(false);
    };
    carregarCertificados();
  }, [page, statusFilter, searchTerm]);

  const handleAction = async (cert: Certificado, action: 'reissue' | 'revoke') => {
    try {
      const res = await fetch('/api/admin-academy/certificados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: cert.user_id, course_id: cert.course_id, action }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        // Recarregar
        const params = new URLSearchParams({
          status: statusFilter,
          page: page.toString(),
          limit: limit.toString(),
        });
        const res = await fetch(`/api/admin-academy/certificados?${params}`);
        const newData = await res.json();
        if (!newData.error) setCertificados(newData.certificados);
      } else {
        alert(data.error || 'Erro ao processar');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao processar ação');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'issued':
        return <span className="bg-green-500/10 text-green-500 border border-green-500/20 text-[10px] font-bold px-2 py-1 rounded-md">Emitido</span>;
      case 'revoked':
        return <span className="bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] font-bold px-2 py-1 rounded-md">Revogado</span>;
      case 'reissued':
        return <span className="bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[10px] font-bold px-2 py-1 rounded-md">Reemitido</span>;
      default:
        return <span className="bg-foreground/10 text-foreground/50 border border-foreground/20 text-[10px] font-bold px-2 py-1 rounded-md">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 overflow-y-auto bg-[var(--background)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Certificados</h1>
            <p className="text-sm text-foreground/60">Gerencie certificados emitidos.</p>
          </div>
        </div>
        <div className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--background)]/50">
                <th className="py-4 px-6 text-xs font-bold text-foreground/50 uppercase tracking-wider">Aluno</th>
                <th className="py-4 px-6 text-xs font-bold text-foreground/50 uppercase tracking-wider">Curso</th>
                <th className="py-4 px-6 text-xs font-bold text-foreground/50 uppercase tracking-wider">Número</th>
                <th className="py-4 px-6 text-xs font-bold text-foreground/50 uppercase tracking-wider">Data</th>
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

  const filteredCertificados = certificados.filter(cert =>
    cert.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cert.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cert.courses?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cert.certificate_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-[var(--background)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Certificados</h1>
          <p className="text-sm text-foreground/60">Gerencie certificados emitidos.</p>
        </div>
      </div>

      {/* Barra de Ferramentas */}
      <div className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" size={18} />
          <input
            type="text"
            placeholder="Buscar por aluno, e-mail, curso ou número..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg py-2 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:border-gold transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg py-2 px-4 text-sm text-foreground focus:outline-none focus:border-gold"
          >
            <option value="issued">Emitidos</option>
            <option value="revoked">Revogados</option>
            <option value="reissued">Reemitidos</option>
          </select>
        </div>
      </div>

      {/* Tabela de Certificados */}
      <div className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--background)]/50">
                <th className="py-4 px-6 text-xs font-bold text-foreground/50 uppercase tracking-wider">Aluno</th>
                <th className="py-4 px-6 text-xs font-bold text-foreground/50 uppercase tracking-wider">Curso</th>
                <th className="py-4 px-6 text-xs font-bold text-foreground/50 uppercase tracking-wider">Número</th>
                <th className="py-4 px-6 text-xs font-bold text-foreground/50 uppercase tracking-wider">Data</th>
                <th className="py-4 px-6 text-xs font-bold text-foreground/50 uppercase tracking-wider">Status</th>
                <th className="py-4 px-6 text-xs font-bold text-foreground/50 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filteredCertificados.map((cert) => (
                <tr key={cert.id} className="hover:bg-[var(--background)]/30 transition-colors">
                  <td className="py-4 px-6">
                    <div>
                      <p className="font-medium text-foreground">{cert.profiles?.full_name || 'Sem nome'}</p>
                      <p className="text-xs text-foreground/50">{cert.profiles?.email}</p>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-foreground">{cert.courses?.title}</p>
                  </td>
                  <td className="py-4 px-6">
                    <code className="text-sm font-mono text-foreground/70">{cert.certificate_number}</code>
                  </td>
                  <td className="py-4 px-6 text-foreground/70">{formatDate(cert.issued_at)}</td>
                  <td className="py-4 px-6">{getStatusBadge(cert.status)}</td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        className="p-2 text-foreground/50 hover:text-gold transition-colors rounded-lg hover:bg-gold/10" 
                        title="Ver verificação pública"
                        onClick={() => window.open(`/verificar-certificado?hash=${cert.verification_hash}`, '_blank')}
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        className="p-2 text-foreground/50 hover:text-gold transition-colors rounded-lg hover:bg-gold/10" 
                        title="Download PDF"
                        onClick={() => window.open(`/api/aluno/certificados/${cert.id}/pdf`, '_blank')}
                      >
                        <Download size={16} />
                      </button>
                      {cert.status === 'issued' && (
                        <>
                          <button 
                            className="p-2 text-foreground/50 hover:text-blue-500 transition-colors rounded-lg hover:bg-blue-500/10" 
                            title="Reemitir"
                            onClick={() => handleAction(cert, 'reissue')}
                          >
                            <RotateCcw size={16} />
                          </button>
                          <button 
                            className="p-2 text-foreground/50 hover:text-red-500 transition-colors rounded-lg hover:bg-red-500/10" 
                            title="Revogar"
                            onClick={() => handleAction(cert, 'revoke')}
                          >
                            <XCircle size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredCertificados.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-foreground/50">
                    Nenhum certificado encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-[var(--border-subtle)]">
            <p className="text-sm text-foreground/50">
              Página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                Anterior
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}