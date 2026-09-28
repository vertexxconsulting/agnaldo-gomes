'use client';

import { useState, useEffect } from 'react';
import { Download, Award, ExternalLink, Calendar, Hash } from 'lucide-react';
import { Button } from '@/components/Button';

interface Certificado {
  id: string;
  user_id: string;
  course_id: string;
  issued_at: string;
  certificate_number: string;
  pdf_url: string | null;
  verification_hash: string;
  status: string;
  courses: {
    title: string;
    thumbnail_url: string | null;
  };
}

export default function CertificadosPage() {
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarCertificados = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/aluno/certificados');
        const data = await res.json();
        if (!data.error && data.certificados) {
          setCertificados(data.certificados);
        }
      } catch (error) {
        console.error('Erro ao carregar certificados:', error);
      }
      setLoading(false);
    };
    carregarCertificados();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#141414] px-4 sm:px-8 lg:px-16 pt-10 pb-20">
        <h1 className="text-3xl font-black text-foreground mb-2">Meus Certificados</h1>
        <p className="text-white/60 mb-8">Carregando certificados...</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-white/10 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#141414] px-4 sm:px-8 lg:px-16 pt-10 pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-foreground mb-2">Meus Certificados</h1>
        <p className="text-white/60">Acesse e faça o download dos certificados dos cursos concluídos.</p>
      </div>

      {certificados.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certificados.map(cert => (
            <div key={cert.id} className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col items-center text-center relative overflow-hidden group hover:border-gold/50 transition-colors">
              {/* Background Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gold/20 blur-[50px] rounded-full group-hover:bg-gold/30 transition-colors" />

              <Award size={48} className="text-gold mb-4 relative z-10" />

              <h3 className="font-bold text-foreground text-lg mb-2 relative z-10">{cert.courses.title}</h3>

              <div className="flex flex-col gap-1 text-sm text-white/50 mb-6 relative z-10">
                <span>Emitido em: {formatDate(cert.issued_at)}</span>
                <span className="text-xs font-mono mt-2 opacity-50">Nº: {cert.certificate_number}</span>
              </div>

              <div className="flex flex-col gap-2 w-full relative z-10">
                <Button variant="primary" className="w-full flex items-center justify-center gap-2" onClick={() => {
                  if (cert.pdf_url) {
                    window.open(cert.pdf_url, '_blank');
                  } else {
                    alert('PDF ainda não gerado. Em breve!');
                  }
                }}>
                  <Download size={18} />
                  Baixar PDF
                </Button>
                <Button variant="outline" className="w-full flex items-center justify-center gap-2" onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/verificar-certificado?hash=${cert.verification_hash}`);
                  alert('Link de verificação copiado!');
                }}>
                  <ExternalLink size={18} />
                  Compartilhar Verificação
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-20 bg-white/5 border border-white/10 rounded-xl text-center">
          <Award size={48} className="text-white/20 mb-4" />
          <h3 className="text-foreground font-bold text-lg mb-2">Nenhum certificado ainda</h3>
          <p className="text-white/50 max-w-sm">Conclua 100% de um curso para desbloquear seu certificado oficial.</p>
        </div>
      )}
    </div>
  );
}