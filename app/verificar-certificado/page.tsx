import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { CheckCircle2, Award, Calendar, Hash, User, BookOpen, ExternalLink, Download } from 'lucide-react';
import Link from 'next/link';

interface CertificateData {
  certificate_number: string;
  verification_hash: string;
  issued_at: string;
  status: string;
  aluno_nome: string;
  curso_titulo: string;
  aluno_email: string;
}

export const metadata: Metadata = {
  title: 'Verificar Certificado - AG Academy',
  description: 'Verifique a autenticidade de certificados emitidos pela AG Academy',
};

export default async function VerificarCertificadoPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ hash: string }> 
}) {
  const { hash } = await searchParams;
  
  if (!hash) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <Award className="w-16 h-16 mx-auto text-primary/50 mb-6" />
          <h1 className="text-2xl font-bold text-foreground mb-4">Verificar Certificado</h1>
          <p className="text-white/60 mb-6">
            Insira o código de verificação ou hash do certificado para validar sua autenticidade.
          </p>
          <form action="/verificar-certificado" method="GET" className="flex gap-2 justify-center">
            <input
              type="text"
              name="hash"
              placeholder="Hash ou número do certificado"
              className="w-full md:w-80 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-foreground placeholder-white/40 focus:outline-none focus:border-gold"
            />
            <button type="submit" className="bg-gold text-black px-6 py-3 rounded-lg font-bold hover:bg-gold/90">
              Verificar
            </button>
          </form>
        </div>
      </div>
    );
  }

  const supabase = await getSupabaseServerClient();
  
  try {
    // Buscar por hash de verificação OU número do certificado
    const { data, error } = await supabase
      .from('public_certificate_verification')
      .select('*')
      .or(`verification_hash.eq.${hash},certificate_number.eq.${hash}`)
      .eq('status', 'issued')
      .maybeSingle();

    if (error || !data) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <Award className="w-16 h-16 mx-auto text-red-500/50 mb-6" />
            <h1 className="text-2xl font-bold text-foreground mb-4">Certificado Não Encontrado</h1>
            <p className="text-white/60 mb-6">
              Não foi possível encontrar um certificado válido com o código informado.
            </p>
            <p className="text-white/40 text-sm mb-6">
              Código buscado: <code className="bg-white/10 px-2 py-1 rounded">{hash}</code>
            </p>
            <Link href="/verificar-certificado" className="text-gold hover:underline">
              Tentar outro código
            </Link>
          </div>
        </div>
      );
    }

    const cert = data as CertificateData;
    const issuedDate = new Date(cert.issued_at).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    return (
      <div className="min-h-screen bg-[#0a0a0a] py-12 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <Award className="w-16 h-16 mx-auto text-gold mb-4" />
            <h1 className="text-3xl font-bold text-foreground mb-2">Certificado Verificado</h1>
            <p className="text-white/60">Este certificado é autêntico e foi emitido pela AG Academy</p>
          </div>

          {/* Card do Certificado */}
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-gold/20 rounded-2xl p-8 relative overflow-hidden">
            {/* Decoração topo */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-yellow-500" />
            
            {/* Badge verificado */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="flex items-center gap-2 bg-green-500/10 text-green-500 border border-green-500/20 px-4 py-2 rounded-full">
                <CheckCircle2 size={16} />
                <span className="font-bold text-sm">CERTIFICADO VÁLIDO</span>
              </div>
            </div>

            {/* Nome do aluno */}
            <div className="mb-6">
              <p className="text-white/50 text-sm uppercase tracking-wider mb-1">Concedido a</p>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">{cert.aluno_nome}</h2>
            </div>

            {/* Curso */}
            <div className="mb-6">
              <p className="text-white/50 text-sm uppercase tracking-wider mb-1">Pela conclusão do curso</p>
              <p className="text-xl md:text-2xl font-semibold text-gold">{cert.curso_titulo}</p>
            </div>

            {/* Detalhes */}
            <div className="grid grid-cols-2 gap-4 mb-6 pt-6 border-t border-white/10">
              <div className="flex items-center gap-3 text-white/70">
                <Calendar size={18} className="text-gold" />
                <div>
                  <p className="text-xs text-white/40">Data de Emissão</p>
                  <p className="font-medium">{issuedDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-white/70">
                <Hash size={18} className="text-gold" />
                <div>
                  <p className="text-xs text-white/40">Número do Certificado</p>
                  <p className="font-mono text-sm">{cert.certificate_number}</p>
                </div>
              </div>
            </div>

            {/* Hash de verificação */}
            <div className="mb-6 p-4 bg-black/30 border border-white/10 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-white/40 uppercase tracking-wider">Hash de Verificação</p>
                <span className="text-xs text-white/50 font-mono">{cert.verification_hash.slice(0, 16)}...</span>
              </div>
              <p className="font-mono text-xs text-white/60 break-all">{cert.verification_hash}</p>
            </div>

            {/* Rodapé */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/10">
              <div className="flex items-center gap-2 text-white/50 text-sm">
                <User size={14} />
                <span>{cert.aluno_email}</span>
              </div>
              <div className="flex items-center gap-2 text-white/50 text-sm">
                <BookOpen size={14} />
                <span>AG Academy</span>
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Link 
              href={`/verificar-certificado?hash=${encodeURIComponent(cert.verification_hash)}`}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gold text-black font-bold rounded-lg hover:bg-gold/90 transition-colors"
            >
              <ExternalLink size={16} />
              Compartilhar Verificação
            </Link>
            <button className="flex items-center justify-center gap-2 px-6 py-3 bg-white/10 text-foreground font-bold rounded-lg border border-white/10 hover:bg-white/20 transition-colors">
              <Download size={16} />
              Baixar PDF
            </button>
          </div>

          {/* Info adicional */}
          <div className="mt-12 text-center text-white/40 text-sm">
            <p>Esta página pode ser acessada publicamente para verificação da autenticidade do certificado.</p>
            <p className="mt-1">URL de verificação: <code className="bg-white/5 px-2 py-0.5 rounded font-mono">{window.location.origin}/verificar-certificado?hash={cert.verification_hash}</code></p>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('[verificar-certificado] Erro:', error);
    notFound();
  }
}