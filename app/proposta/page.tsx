import Image from 'next/image';
import { ShoppingBag, MessageCircle, CreditCard, Award, CheckCircle2, Globe, Mail } from 'lucide-react';

export default function PropostaVertexPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white/90 selection:bg-[#d4af37]/30 selection:text-white pb-24">
      {/* HEADER VERTEX */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Logo da Vertex */}
            <div className="relative w-56 h-16">
              {/* O usuário deve salvar a logo em public/opt/vertex-logo.png ou .jpg */}
              <Image
                src="/opt/vertex-logo.png"
                alt="Vertex Consulting"
                fill
                className="object-contain object-left"
                priority
              />
            </div>
          </div>
          <div className="text-xs font-semibold tracking-[0.2em] text-[#d4af37] uppercase hidden sm:block">
            Proposta Executiva
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="pt-24 pb-16 px-6 relative overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#d4af37]/5 rounded-full blur-[120px] -z-10 pointer-events-none" />

        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-[#d4af37] font-semibold tracking-widest uppercase mb-4 text-sm">Fase 2 — Inovação & Escala</h2>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight text-white">
            Plataforma Integrada <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e8c37b] via-[#d4af37] to-[#a67c00]">
              Agnaldo Gomes
            </span>
          </h1>
          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
            Apresentamos as próximas etapas de inovação tecnológica que elevarão a marca a um patamar de ecossistema completo de beleza e educação.
          </p>
        </div>
      </section>

      {/* OPORTUNIDADE DE DOMÍNIO */}
      <section className="py-8 px-6">
        <div className="container mx-auto max-w-4xl bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-2xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#d4af37]/5 rounded-bl-full -mr-16 -mt-16 pointer-events-none" />

          <div className="flex flex-col md:flex-row items-start gap-6 relative z-10">
            <Globe className="text-[#d4af37] shrink-0 mt-1" size={32} />
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-2">Excelente Notícia: O Domínio Perfeito está Disponível!</h2>
              <p className="text-white/80 mb-6 leading-relaxed">
                Acabamos de verificar e o domínio <strong className="text-[#d4af37]">agnaldogomes.com.br</strong> está livre para registro!
                Isso é raríssimo e de enorme valor para a marca. Sugerimos registrar imediatamente para garantir a exclusividade.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Opção 1: Registro.br */}
                <div className="bg-black/40 border border-white/10 rounded-xl p-5">
                  <h4 className="font-bold text-white/60 text-xs mb-2 uppercase tracking-wider">Opção 1: Registro.br</h4>
                  <p className="text-white font-bold text-2xl mb-1">R$ 40,00 <span className="text-sm font-normal text-white/50">/ano</span></p>
                  <p className="text-xs text-white/50">Apenas o registro do domínio. Ideal para controle direto com o governo.</p>
                </div>

                {/* Opção 2: Hostinger */}
                <div className="bg-black/60 border border-[#d4af37]/50 rounded-xl p-5 relative overflow-hidden shadow-[0_0_20px_rgba(212,175,55,0.1)]">
                  <div className="absolute top-0 right-0 bg-[#d4af37] text-black text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">Recomendado Vertex</div>
                  <h4 className="font-bold text-[#d4af37] text-xs mb-2 uppercase tracking-wider">Opção 2: Hostinger</h4>
                  <p className="text-white font-bold text-2xl mb-1">R$ 130,98 <span className="text-sm font-normal text-white/50">/ 3 anos</span></p>
                  <p className="text-xs text-white/50">Excelente custo-benefício a longo prazo com painel de hospedagem integrado.</p>
                </div>
              </div>

              {/* Bônus E-mail */}
              <div className="bg-white/5 border border-white/10 p-5 rounded-xl flex items-start gap-4">
                <Mail className="text-white/40 mt-1 shrink-0" size={24} />
                <div>
                  <h4 className="font-bold text-white">Bônus de Autoridade: E-mail Profissional</h4>
                  <p className="text-sm text-white/60 mt-1 leading-relaxed">
                    Para transmitir total confiança aos alunos e clientes, recomendamos adquirir também o pacote de e-mail
                    (ex: <strong className="text-[#d4af37]">contato@agnaldogomes.com.br</strong>) por apenas <strong>R$ 3,49/mês</strong>.
                  </p>
                </div>
              </div>

              <div className="mt-6 text-sm text-white/50 bg-black/20 p-4 rounded-lg border border-white/5">
                <strong className="text-[#d4af37]">Estratégia Vertex:</strong> Com esse único domínio, nós configuraremos todos os acessos do sistema gratuitamente:<br/>
                <span className="mt-2 block">
                  👉 <em className="text-white">www.agnaldogomes.com.br</em> (Site Principal)<br/>
                  👉 <em className="text-white">agendamento.agnaldogomes.com.br</em> (Studio)<br/>
                  👉 <em className="text-white">academy.agnaldogomes.com.br</em> (Cursos)
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROPOSTAS - CARDS */}
      <section className="py-12 px-6">
        <div className="container mx-auto max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Card 1 */}
          <div className="group bg-white/[0.02] border border-white/5 hover:border-[#d4af37]/50 transition-all duration-500 rounded-2xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#d4af37]/10 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
            <ShoppingBag className="text-[#d4af37] mb-6 relative z-10" size={40} strokeWidth={1.5} />
            <h3 className="text-2xl font-bold mb-3 text-white">1. E-commerce Integrado</h3>
            <p className="text-white/60 mb-6 leading-relaxed">
              A oportunidade perfeita para monetizar não apenas o serviço e a educação, mas também os produtos físicos, com a loja trabalhando 24h por dia.
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-white/70">
                <CheckCircle2 className="text-[#d4af37] shrink-0 mt-0.5" size={16} />
                <span><strong>Loja do Aluno:</strong> Venda de kits e ferramentas recomendadas direto na Academy.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-white/70">
                <CheckCircle2 className="text-[#d4af37] shrink-0 mt-0.5" size={16} />
                <span><strong>Loja da Cliente:</strong> Venda de produtos de manutenção diária no Studio.</span>
              </li>
            </ul>
          </div>

          {/* Card 2 */}
          <div className="group bg-white/[0.02] border border-white/5 hover:border-[#d4af37]/50 transition-all duration-500 rounded-2xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#d4af37]/10 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
            <MessageCircle className="text-[#d4af37] mb-6 relative z-10" size={40} strokeWidth={1.5} />
            <h3 className="text-2xl font-bold mb-3 text-white">2. Automação WhatsApp API</h3>
            <p className="text-white/60 mb-6 leading-relaxed">
              Transforme o contato com o cliente em algo 100% automático e profissional, reduzindo faltas e buracos na agenda.
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-white/70">
                <CheckCircle2 className="text-[#d4af37] shrink-0 mt-0.5" size={16} />
                <span><strong>Confirmação Imediata:</strong> Disparo automático no momento do agendamento.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-white/70">
                <CheckCircle2 className="text-[#d4af37] shrink-0 mt-0.5" size={16} />
                <span><strong>Lembrete Inteligente (24h):</strong> A cliente recebe um link exclusivo do sistema para visualizar o compromisso.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-white/70">
                <CheckCircle2 className="text-[#d4af37] shrink-0 mt-0.5" size={16} />
                <span><strong>Retenção Ativa:</strong> Na tela do link, a cliente só pode <strong className="text-white">Confirmar</strong> ou solicitar <strong className="text-white">Remarcar</strong> (informando o motivo). A opção de cancelamento direto é oculta para proteger sua agenda.</span>
              </li>
            </ul>
          </div>

          {/* Card 3 */}
          <div className="group bg-white/[0.02] border border-white/5 hover:border-[#d4af37]/50 transition-all duration-500 rounded-2xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#d4af37]/10 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
            <CreditCard className="text-[#d4af37] mb-6 relative z-10" size={40} strokeWidth={1.5} />
            <h3 className="text-2xl font-bold mb-3 text-white">3. Sinal de Pagamento (Pix)</h3>
            <p className="text-white/60 mb-6 leading-relaxed">
              Compromisso real com a agenda dos profissionais, eliminando prejuízos com horários ociosos.
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-white/70">
                <CheckCircle2 className="text-[#d4af37] shrink-0 mt-0.5" size={16} />
                <span><strong>Pagamento Antecipado:</strong> Cobrança de percentual (ex: 30%) para agendar serviços longos.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-white/70">
                <CheckCircle2 className="text-[#d4af37] shrink-0 mt-0.5" size={16} />
                <span><strong>Integração Direta:</strong> Mercado Pago, recebendo direto na conta da empresa.</span>
              </li>
            </ul>
          </div>

          {/* Card 4 */}
          <div className="group bg-white/[0.02] border border-white/5 hover:border-[#d4af37]/50 transition-all duration-500 rounded-2xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#d4af37]/10 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
            <Award className="text-[#d4af37] mb-6 relative z-10" size={40} strokeWidth={1.5} />
            <h3 className="text-2xl font-bold mb-3 text-white">4. App Nativo (iOS e Android)</h3>
            <p className="text-white/60 mb-6 leading-relaxed">
              Expansão da plataforma web para as lojas de aplicativos da Apple e Google, colocando sua marca na tela inicial dos clientes e alunos.
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-white/70">
                <CheckCircle2 className="text-[#d4af37] shrink-0 mt-0.5" size={16} />
                <span><strong>Notificações Push:</strong> Avisos na tela do celular sobre novos cursos e horários de agendamento.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-white/70">
                <CheckCircle2 className="text-[#d4af37] shrink-0 mt-0.5" size={16} />
                <span><strong>Consumo Offline (Academy):</strong> Os alunos podem baixar as aulas no app para assistir sem internet, igual à Netflix.</span>
              </li>
            </ul>
          </div>

        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="py-14 px-6 text-center">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold mb-8 text-white">Próximos Passos</h2>
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 md:p-12 text-left space-y-6">
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-[#d4af37]/20 flex items-center justify-center text-[#d4af37] font-bold shrink-0">1</div>
              <div>
                <h4 className="font-bold text-lg text-white">Homologação da Fase 1</h4>
                <p className="text-white/60 text-sm mt-1">Testar, aprovar e treinar a equipe no que já foi construído (Gestão de Agendamentos e Academy).</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-[#d4af37]/20 flex items-center justify-center text-[#d4af37] font-bold shrink-0">2</div>
              <div>
                <h4 className="font-bold text-lg text-white">Definição do Escopo</h4>
                <p className="text-white/60 text-sm mt-1">Escolher quais das 4 frentes apresentadas acima iremos focar e desenvolver primeiro.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-[#d4af37]/20 flex items-center justify-center text-[#d4af37] font-bold shrink-0">3</div>
              <div>
                <h4 className="font-bold text-lg text-white">Dimensionamento</h4>
                <p className="text-white/60 text-sm mt-1">A Vertex entregará o orçamento e os prazos técnicos da expansão escolhida.</p>
              </div>
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-white/10 flex flex-col items-center">
            <p className="text-white/40 italic font-serif mb-2">Transformando visões em sistemas inteligentes.</p>
            <p className="text-[#d4af37] font-semibold tracking-widest uppercase text-xs">Vertex Consulting</p>
          </div>
        </div>
      </section>
    </div>
  );
}
