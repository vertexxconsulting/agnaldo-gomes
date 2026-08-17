'use client';

import { useState, useEffect } from 'react';
import { Download, Award } from 'lucide-react';
import { Button } from '@/components/Button';
import { getCursos, getModulos, getAulas, getProgressoAluno } from '@/lib/mock-data';

export default function CertificadosPage() {
  const [certificados, setCertificados] = useState<{
    id: string; curso: string; dataConclusao: string;
    cargaHoraria: number; codigo: string;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      const [cursosData, modulosData, aulasData, progressoData] = await Promise.all([
        getCursos(),
        getModulos(),
        getAulas(),
        getProgressoAluno(),
      ]);

      const certs: typeof certificados = [];
      cursosData.forEach(curso => {
        const modulosCurso = modulosData.filter(m => m.curso_id === curso.id);
        const aulasCurso = aulasData.filter(a => modulosCurso.some(m => m.id === a.modulo_id));
        const aulasConcluidas = progressoData.filter(p =>
          p.concluida && aulasCurso.some(a => a.id === p.aula_id)
        ).length;

        if (aulasCurso.length > 0 && aulasConcluidas === aulasCurso.length) {
          certs.push({
            id: `cert_${curso.id}`,
            curso: curso.titulo,
            dataConclusao: new Date().toLocaleDateString('pt-BR'),
            cargaHoraria: curso.duracaoHoras,
            codigo: `CERT-AG-${crypto.randomUUID().replaceAll('-', '').slice(0, 6).toUpperCase()}`,
          });
        }
      });
      setCertificados(certs);
      setLoading(false);
    };
    carregarDados();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#141414] px-4 sm:px-8 lg:px-16 pt-10 pb-20">
        <h1 className="text-3xl font-black text-white mb-2">Meus Certificados</h1>
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
        <h1 className="text-3xl font-black text-white mb-2">Meus Certificados</h1>
        <p className="text-white/60">Acesse e faça o download dos certificados dos cursos concluídos.</p>
      </div>

      {certificados.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certificados.map(cert => (
            <div key={cert.id} className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col items-center text-center relative overflow-hidden group hover:border-primary/50 transition-colors">
              {/* Background Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/20 blur-[50px] rounded-full group-hover:bg-primary/30 transition-colors" />

              <Award size={48} className="text-primary mb-4 relative z-10" />

              <h3 className="font-bold text-white text-lg mb-2 relative z-10">{cert.curso}</h3>

              <div className="flex flex-col gap-1 text-sm text-white/50 mb-6 relative z-10">
                <span>Concluído em: {cert.dataConclusao}</span>
                <span>Carga Horária: {cert.cargaHoraria}h</span>
                <span className="text-xs font-mono mt-2 opacity-50">Código: {cert.codigo}</span>
              </div>

              <Button variant="primary" className="w-full flex items-center justify-center gap-2 relative z-10" onClick={() => alert('Fazendo download do PDF...')}>
                <Download size={18} />
                Baixar PDF
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-20 bg-white/5 border border-white/10 rounded-xl text-center">
          <Award size={48} className="text-white/20 mb-4" />
          <h3 className="text-white font-bold text-lg mb-2">Nenhum certificado ainda</h3>
          <p className="text-white/50 max-w-sm">Conclua 100% de um curso para desbloquear seu certificado oficial.</p>
        </div>
      )}
    </div>
  );
}
