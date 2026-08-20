'use client';

import { useState } from 'react';
import { Upload, Download, FileSignature, ImageIcon, CheckCircle, Search } from 'lucide-react';
import { Button } from '@/components/Button';

// Mock de dados de alunos que receberam certificado
const mockCertificados = [
  { id: 1, aluno: 'Mariana Silva', curso: 'Especialista em Loiras', data: '05/08/2026', progresso: '100%' },
  { id: 2, aluno: 'João Pedro Costa', curso: 'Cortes Geométricos Avançados', data: '02/08/2026', progresso: '100%' },
  { id: 3, aluno: 'Amanda Oliveira', curso: 'Visagismo Essencial', data: '28/07/2026', progresso: '100%' },
  { id: 4, aluno: 'Fernanda Lima', curso: 'Especialista em Loiras', data: '25/07/2026', progresso: '100%' },
];

export default function CertificadosAdminPage() {
  const [templateUploaded, setTemplateUploaded] = useState(false);
  const [signatureUploaded, setSignatureUploaded] = useState(false);

  return (
    <div className="p-6 md:p-6 animate-fade-in max-w-6xl mx-auto pb-24">
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestão de Certificados</h1>
          <p className="text-foreground/60 mt-1 max-w-xl">
            Configure o design base do certificado e acompanhe as emissões automáticas para alunos que concluíram 100% dos cursos.
          </p>
        </div>
        <Button className="shrink-0 gap-2">
          <Download size={18} />
          Exportar Relatório
        </Button>
      </div>

      {/* Configuração do Certificado */}
      <h2 className="text-xl font-bold mb-4">Configuração Automática</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
        {/* Upload de Template */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0">
              <ImageIcon size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">Template Base (Design)</h3>
              <p className="text-sm text-foreground/60 mb-4">Faça upload da arte do certificado sem o nome do aluno ou assinatura. (Formato A4, PNG ou PDF).</p>
              
              {!templateUploaded ? (
                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
                  <Upload className="mx-auto text-foreground/40 mb-3" size={32} />
                  <p className="font-medium text-foreground/80 mb-1">Clique para enviar o arquivo</p>
                  <p className="text-xs text-foreground/50">PNG, JPG ou PDF (Máx 5MB)</p>
                  <button 
                    className="mt-4 text-primary text-sm font-semibold"
                    onClick={() => setTemplateUploaded(true)}
                  >
                    Simular Upload
                  </button>
                </div>
              ) : (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="text-green-500" size={20} />
                    <span className="font-medium text-foreground">template-certificado-ag.png</span>
                  </div>
                  <button onClick={() => setTemplateUploaded(false)} className="text-sm text-red-500 font-medium">Remover</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Upload de Assinatura */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0">
              <FileSignature size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">Assinatura Digital (PNG)</h3>
              <p className="text-sm text-foreground/60 mb-4">Faça upload da sua assinatura realizada em fundo transparente para o sistema inserir automaticamente.</p>
              
              {!signatureUploaded ? (
                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
                  <Upload className="mx-auto text-foreground/40 mb-3" size={32} />
                  <p className="font-medium text-foreground/80 mb-1">Clique para enviar assinatura</p>
                  <p className="text-xs text-foreground/50">PNG com Fundo Transparente</p>
                  <button 
                    className="mt-4 text-primary text-sm font-semibold"
                    onClick={() => setSignatureUploaded(true)}
                  >
                    Simular Upload
                  </button>
                </div>
              ) : (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="text-green-500" size={20} />
                    <span className="font-medium text-foreground">assinatura-agnaldo.png</span>
                  </div>
                  <button onClick={() => setSignatureUploaded(false)} className="text-sm text-red-500 font-medium">Remover</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Histórico de Emissões */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h2 className="text-xl font-bold">Histórico de Emissões</h2>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por aluno ou curso..." 
            className="w-full bg-card border border-border rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50"
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-foreground/5 text-sm uppercase tracking-wider text-foreground/60 border-b border-border">
                <th className="p-4 font-semibold">Aluno</th>
                <th className="p-4 font-semibold">Curso Concluído</th>
                <th className="p-4 font-semibold">Data da Emissão</th>
                <th className="p-4 font-semibold text-center">Status</th>
                <th className="p-4 font-semibold text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {mockCertificados.map((cert) => (
                <tr key={cert.id} className="hover:bg-foreground/5 transition-colors">
                  <td className="p-4 font-medium text-foreground">{cert.aluno}</td>
                  <td className="p-4 text-foreground/80">{cert.curso}</td>
                  <td className="p-4 text-foreground/80">{cert.data}</td>
                  <td className="p-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400">
                      Gerado Automático
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-primary hover:text-primary/80 font-medium">Baixar PDF</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-border flex items-center justify-between text-sm text-foreground/60 bg-foreground/[0.02]">
          <span>Mostrando 4 certificados recentes</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-card border border-border rounded-md hover:bg-foreground/5 disabled:opacity-50" disabled>Anterior</button>
            <button className="px-3 py-1 bg-card border border-border rounded-md hover:bg-foreground/5 disabled:opacity-50" disabled>Próxima</button>
          </div>
        </div>
      </div>

    </div>
  );
}
