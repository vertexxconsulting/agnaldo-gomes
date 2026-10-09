import {
  BookOpen, CalendarDays, Users, Scissors, UserCircle,
  PlaySquare, GraduationCap, MessagesSquare, Award, MonitorPlay,
  CreditCard, ShieldCheck, HelpCircle, CheckCircle2, FileText, Settings, Wallet, AlertTriangle
} from 'lucide-react';

interface SystemTutorialProps {
  module: 'admin' | 'admin-academy' | 'aluno';
}

export function SystemTutorial({ module }: SystemTutorialProps) {
  if (module === 'admin') {
    return (
      <div className="flex flex-col gap-10 max-w-5xl mx-auto pb-20 mt-6">
        {/* HERO SECTION */}
        <div className="bg-gradient-to-r from-primary/20 to-transparent border border-primary/20 p-8 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <BookOpen size={120} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-primary/20 p-3 rounded-2xl">
                <BookOpen className="text-primary" size={32} />
              </div>
              <h2 className="text-3xl font-bold">Guia Completo: Gestão do Studio</h2>
            </div>
            <p className="text-foreground/80 leading-relaxed text-lg max-w-2xl">
              Bem-vindo ao centro de comando do Studio Agnaldo Gomes. Este manual detalhado ajudará você a extrair o máximo do sistema, desde o controle de fluxo de caixa diário até o relacionamento avançado com seus clientes.
            </p>
          </div>
        </div>

        {/* RECURSOS PRINCIPAIS */}
        <div className="space-y-6">
          <h3 className="text-2xl font-bold border-b border-white/10 pb-3 flex items-center gap-3">
            <Settings className="text-primary" size={24} /> 
            Módulos e Funcionalidades
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="glass p-6 rounded-2xl border border-white/5 hover:border-primary/30 transition-all duration-300">
              <CalendarDays className="text-primary mb-4" size={28} />
              <h4 className="font-bold text-lg mb-2">Agenda Inteligente</h4>
              <p className="text-sm text-foreground/70 mb-4">Central de marcações. Agendamentos pelo site chegam como "Pendentes" (cor Laranja).</p>
              <ul className="text-xs text-foreground/60 space-y-2 list-disc list-inside">
                <li>Arraste para remarcar.</li>
                <li>Filtro por profissional.</li>
                <li>Bloqueio de horários (almoço/folga).</li>
              </ul>
            </div>

            <div className="glass p-6 rounded-2xl border border-white/5 hover:border-primary/30 transition-all duration-300">
              <Users className="text-primary mb-4" size={28} />
              <h4 className="font-bold text-lg mb-2">Clientes (CRM)</h4>
              <p className="text-sm text-foreground/70 mb-4">Mais do que contatos, um histórico completo de relacionamento e serviços prestados.</p>
              <ul className="text-xs text-foreground/60 space-y-2 list-disc list-inside">
                <li>Registro de alergias (química).</li>
                <li>Histórico de cortes/coloração.</li>
                <li>Alerta de aniversariantes.</li>
              </ul>
            </div>

            <div className="glass p-6 rounded-2xl border border-white/5 hover:border-primary/30 transition-all duration-300">
              <Wallet className="text-primary mb-4" size={28} />
              <h4 className="font-bold text-lg mb-2">Comandas e Caixa</h4>
              <p className="text-sm text-foreground/70 mb-4">Controle financeiro do dia. Vinculação automática de serviços da agenda para o caixa.</p>
              <ul className="text-xs text-foreground/60 space-y-2 list-disc list-inside">
                <li>Cálculo automático de comissões.</li>
                <li>Divisão por forma de pagamento.</li>
                <li>Fechamento diário (Resumo).</li>
              </ul>
            </div>

            <div className="glass p-6 rounded-2xl border border-white/5 hover:border-primary/30 transition-all duration-300">
              <UserCircle className="text-primary mb-4" size={28} />
              <h4 className="font-bold text-lg mb-2">Profissionais</h4>
              <p className="text-sm text-foreground/70 mb-4">Gestão da sua equipe de especialistas, barbeiros e cabeleireiros.</p>
              <ul className="text-xs text-foreground/60 space-y-2 list-disc list-inside">
                <li>Definição de expediente.</li>
                <li>Regras de comissionamento.</li>
                <li>Serviços habilitados por pessoa.</li>
              </ul>
            </div>

            <div className="glass p-6 rounded-2xl border border-white/5 hover:border-primary/30 transition-all duration-300">
              <Scissors className="text-primary mb-4" size={28} />
              <h4 className="font-bold text-lg mb-2">Catálogo de Serviços</h4>
              <p className="text-sm text-foreground/70 mb-4">Configuração do que é oferecido pelo Studio e exibido no site para agendamento.</p>
              <ul className="text-xs text-foreground/60 space-y-2 list-disc list-inside">
                <li>Tempo de duração estimado.</li>
                <li>Preço base (pode ser editado na comanda).</li>
                <li>Ativação/Inativação de serviços.</li>
              </ul>
            </div>
            
            <div className="glass p-6 rounded-2xl border border-white/5 hover:border-primary/30 transition-all duration-300">
              <FileText className="text-primary mb-4" size={28} />
              <h4 className="font-bold text-lg mb-2">Relatórios</h4>
              <p className="text-sm text-foreground/70 mb-4">Visão estratégica para tomadas de decisão baseadas em dados.</p>
              <ul className="text-xs text-foreground/60 space-y-2 list-disc list-inside">
                <li>Faturamento mensal/semanal.</li>
                <li>Profissional de maior destaque.</li>
                <li>Serviço mais lucrativo.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* PASSO A PASSO */}
        <div className="space-y-6">
          <h3 className="text-2xl font-bold border-b border-white/10 pb-3 flex items-center gap-3">
            <CheckCircle2 className="text-primary" size={24} /> 
            Procedimentos Padrão
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card/30 border border-white/10 p-6 rounded-2xl">
              <h4 className="font-bold text-lg mb-4 text-gold">1. Fluxo de Agendamento Online</h4>
              <ol className="list-decimal list-inside space-y-4 text-sm text-foreground/80">
                <li className="pl-2">O cliente agenda pelo site. O status entra como <span className="text-orange-400 font-bold">Pendente</span>.</li>
                <li className="pl-2">A secretária vê na aba <strong className="text-white">Agenda</strong> e entra em contato via WhatsApp para confirmar.</li>
                <li className="pl-2">Após confirmação, clique no agendamento e mude para <span className="text-green-400 font-bold">Confirmado</span>.</li>
                <li className="pl-2">Se o cliente cancelar, mude para <span className="text-red-400 font-bold">Cancelado</span> para liberar a vaga.</li>
              </ol>
            </div>

            <div className="bg-card/30 border border-white/10 p-6 rounded-2xl">
              <h4 className="font-bold text-lg mb-4 text-gold">2. Atendimento e Pagamento (Comandas)</h4>
              <ol className="list-decimal list-inside space-y-4 text-sm text-foreground/80">
                <li className="pl-2">Quando o cliente chega, o agendamento pode ser marcado como <span className="text-blue-400 font-bold">Em Atendimento</span>.</li>
                <li className="pl-2">Ao finalizar, vá em <strong className="text-white">Comandas</strong> e gere uma nova vinculada ao cliente.</li>
                <li className="pl-2">Adicione os serviços e produtos extras consumidos. O sistema calcula a comissão.</li>
                <li className="pl-2">Registre a forma de pagamento (Pix, Cartão, Dinheiro) e <strong className="text-white">Finalize a Comanda</strong>.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (module === 'admin-academy') {
    return (
      <div className="flex flex-col gap-10 max-w-5xl mx-auto pb-20 mt-6">
        <div className="bg-gradient-to-r from-primary/20 to-transparent border border-primary/20 p-8 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <GraduationCap size={120} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-primary/20 p-3 rounded-2xl">
                <GraduationCap className="text-primary" size={32} />
              </div>
              <h2 className="text-3xl font-bold">Manual do Produtor: Gestão Academy</h2>
            </div>
            <p className="text-foreground/80 leading-relaxed text-lg max-w-2xl">
              Este é o painel de controle da sua instituição de ensino. Aqui você gerencia seus cursos presenciais e online, controla o acesso dos alunos, emite certificados e administra seu faturamento digital.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-2xl font-bold border-b border-white/10 pb-3 flex items-center gap-3">
            <Settings className="text-primary" size={24} /> 
            Gestão Pedagógica e Vendas
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="glass p-6 rounded-2xl border border-white/5 hover:border-primary/30 transition-all">
              <PlaySquare className="text-primary mb-4" size={28} />
              <h4 className="font-bold text-lg mb-2">Estrutura de Cursos</h4>
              <p className="text-sm text-foreground/70 mb-4">Seus cursos são organizados em uma hierarquia simples e lógica.</p>
              <ul className="text-xs text-foreground/60 space-y-2 list-disc list-inside">
                <li><strong className="text-white">Curso:</strong> O produto principal (ex: Especialização em Mechas).</li>
                <li><strong className="text-white">Módulos:</strong> As divisões do curso (ex: Módulo 1 - Teoria das Cores).</li>
                <li><strong className="text-white">Aulas:</strong> Onde ficam os vídeos e PDFs.</li>
              </ul>
            </div>

            <div className="glass p-6 rounded-2xl border border-white/5 hover:border-primary/30 transition-all">
              <Users className="text-primary mb-4" size={28} />
              <h4 className="font-bold text-lg mb-2">Base de Alunos</h4>
              <p className="text-sm text-foreground/70 mb-4">Gestão individualizada do progresso e acesso de cada estudante.</p>
              <ul className="text-xs text-foreground/60 space-y-2 list-disc list-inside">
                <li>Liberação manual de acessos.</li>
                <li>Reset de senhas perdidas.</li>
                <li>Acompanhamento de progresso (%).</li>
              </ul>
            </div>

            <div className="glass p-6 rounded-2xl border border-white/5 hover:border-primary/30 transition-all">
              <CreditCard className="text-primary mb-4" size={28} />
              <h4 className="font-bold text-lg mb-2">Faturamento e Matrículas</h4>
              <p className="text-sm text-foreground/70 mb-4">Controle de receitas geradas pelas vendas online.</p>
              <ul className="text-xs text-foreground/60 space-y-2 list-disc list-inside">
                <li>Relatório de vendas por curso.</li>
                <li>Status de pagamentos.</li>
                <li>Cupons de desconto e ofertas.</li>
              </ul>
            </div>

            <div className="glass p-6 rounded-2xl border border-white/5 hover:border-primary/30 transition-all">
              <Award className="text-primary mb-4" size={28} />
              <h4 className="font-bold text-lg mb-2">Certificações</h4>
              <p className="text-sm text-foreground/70 mb-4">Sistema de recompensa acadêmica com validade e autenticidade.</p>
              <ul className="text-xs text-foreground/60 space-y-2 list-disc list-inside">
                <li>Gerados automaticamente nos 100%.</li>
                <li>QR Code de verificação único.</li>
                <li>Carga horária parametrizável.</li>
              </ul>
            </div>
            
            <div className="glass p-6 rounded-2xl border border-white/5 hover:border-primary/30 transition-all">
              <MessagesSquare className="text-primary mb-4" size={28} />
              <h4 className="font-bold text-lg mb-2">Comunidade VIP</h4>
              <p className="text-sm text-foreground/70 mb-4">Mantenha os alunos engajados através de um fórum interativo.</p>
              <ul className="text-xs text-foreground/60 space-y-2 list-disc list-inside">
                <li>Avisos da equipe docente.</li>
                <li>Resolução de dúvidas (tira-dúvidas).</li>
                <li>Networking entre turmas.</li>
              </ul>
            </div>
            
            <div className="glass p-6 rounded-2xl border border-white/5 hover:border-primary/30 transition-all">
              <AlertTriangle className="text-primary mb-4" size={28} />
              <h4 className="font-bold text-lg mb-2">Cursos Presenciais vs Online</h4>
              <p className="text-sm text-foreground/70 mb-4">O sistema lida com as duas modalidades de forma distinta.</p>
              <ul className="text-xs text-foreground/60 space-y-2 list-disc list-inside">
                <li><strong className="text-white">Online:</strong> Acesso imediato à área de membros.</li>
                <li><strong className="text-white">Presencial:</strong> Apenas agenda e confirmação de pagamento, sem vídeos.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-2xl font-bold border-b border-white/10 pb-3 flex items-center gap-3">
            <CheckCircle2 className="text-primary" size={24} /> 
            Procedimentos Operacionais
          </h3>
          
          <div className="bg-card/30 border border-white/10 p-6 rounded-2xl">
            <h4 className="font-bold text-lg mb-4 text-gold">Como criar um Novo Curso Online do Zero?</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h5 className="font-bold text-white mb-2">Fase 1: Configuração Base</h5>
                <ol className="list-decimal list-inside space-y-2 text-sm text-foreground/80">
                  <li>Vá em <strong>Cursos</strong> &gt; Novo Curso.</li>
                  <li>Defina o Tipo como "Online".</li>
                  <li>Insira Título, Descrição longa (para a página de vendas) e o Valor.</li>
                  <li>Faça upload da Imagem de Capa (Thumb).</li>
                </ol>
              </div>
              <div>
                <h5 className="font-bold text-white mb-2">Fase 2: Estrutura Curricular</h5>
                <ol className="list-decimal list-inside space-y-2 text-sm text-foreground/80">
                  <li>Entre no curso criado.</li>
                  <li>Clique em <strong>Novo Módulo</strong>. (ex: "Boas Vindas").</li>
                  <li>Dentro do módulo, adicione as <strong>Aulas</strong>.</li>
                  <li>Cole o link do vídeo (YouTube Não Listado ou Vimeo são recomendados).</li>
                </ol>
              </div>
              <div>
                <h5 className="font-bold text-white mb-2">Fase 3: Publicação e Venda</h5>
                <ol className="list-decimal list-inside space-y-2 text-sm text-foreground/80">
                  <li>Garanta que o curso não está marcado como "Rascunho".</li>
                  <li>Ao salvar, ele aparecerá automaticamente na página de Vendas (Catálogo).</li>
                  <li>O aluno compra, paga e o acesso é liberado instantaneamente.</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (module === 'aluno') {
    return (
      <div className="flex flex-col gap-10 max-w-5xl mx-auto pb-20 mt-6">
        <div className="bg-gradient-to-r from-primary/20 to-transparent border border-primary/20 p-8 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <MonitorPlay size={120} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-primary/20 p-3 rounded-2xl">
                <MonitorPlay className="text-primary" size={32} />
              </div>
              <h2 className="text-3xl font-bold">Guia do Aluno: Ambiente Virtual</h2>
            </div>
            <p className="text-foreground/80 leading-relaxed text-lg max-w-2xl">
              Sua jornada para se tornar um profissional de elite começa aqui. Entenda como navegar na plataforma, consumir os conteúdos em alta qualidade e obter seu diploma oficial.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-2xl font-bold border-b border-white/10 pb-3 flex items-center gap-3">
            <BookOpen className="text-primary" size={24} /> 
            Explorando sua Sala de Aula
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card/40 p-6 rounded-2xl border border-white/5 hover:bg-card/60 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <PlaySquare className="text-gold" size={24} />
                <h4 className="font-bold text-xl">1. Assistindo às Aulas</h4>
              </div>
              <ul className="text-sm text-foreground/80 space-y-3">
                <li className="flex gap-2"><span className="text-primary font-bold">•</span> Seu progresso é salvo na nuvem. Você pode parar no celular e continuar no computador.</li>
                <li className="flex gap-2"><span className="text-primary font-bold">•</span> Os vídeos possuem ajuste de velocidade na engrenagem do reprodutor (até 2x).</li>
                <li className="flex gap-2"><span className="text-primary font-bold">•</span> Abaixo do vídeo, verifique a aba de <strong>Materiais Complementares</strong> para baixar PDFs e apostilas.</li>
                <li className="flex gap-2"><span className="text-primary font-bold">•</span> <strong>IMPORTANTE:</strong> Ao fim de cada vídeo, clique no botão <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-xs">Marcar como Concluída</span> para avançar a barra de progresso.</li>
              </ul>
            </div>

            <div className="bg-card/40 p-6 rounded-2xl border border-white/5 hover:bg-card/60 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <Award className="text-gold" size={24} />
                <h4 className="font-bold text-xl">2. Emissão de Certificados</h4>
              </div>
              <ul className="text-sm text-foreground/80 space-y-3">
                <li className="flex gap-2"><span className="text-primary font-bold">•</span> O certificado possui validação digital contra fraudes (QR Code).</li>
                <li className="flex gap-2"><span className="text-primary font-bold">•</span> Ele só é desbloqueado automaticamente quando o curso atinge <strong>100% de conclusão</strong>.</li>
                <li className="flex gap-2"><span className="text-primary font-bold">•</span> Se você terminou tudo e ele não liberou, verifique se não esqueceu de "Marcar como concluída" alguma aula teórica curta.</li>
                <li className="flex gap-2"><span className="text-primary font-bold">•</span> Fica disponível para download em PDF a qualquer momento na aba Certificados.</li>
              </ul>
            </div>

            <div className="bg-card/40 p-6 rounded-2xl border border-white/5 hover:bg-card/60 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <HelpCircle className="text-gold" size={24} />
                <h4 className="font-bold text-xl">3. Dúvidas Frequentes</h4>
              </div>
              <div className="space-y-4">
                <div>
                  <h5 className="text-sm font-bold text-white">O vídeo está travando, o que fazer?</h5>
                  <p className="text-xs text-foreground/70 mt-1">Verifique sua conexão. Os vídeos adaptam a qualidade (1080p, 720p) dependendo da sua internet. Tente limpar o cache do navegador.</p>
                </div>
                <div>
                  <h5 className="text-sm font-bold text-white">Esqueci minha senha. Como acessar?</h5>
                  <p className="text-xs text-foreground/70 mt-1">Na tela de login da Academy, clique em "Esqueci minha senha" para receber um link de redefinição no email cadastrado no ato da compra.</p>
                </div>
              </div>
            </div>

            <div className="bg-card/40 p-6 rounded-2xl border border-white/5 hover:bg-card/60 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <MessagesSquare className="text-gold" size={24} />
                <h4 className="font-bold text-xl">4. Interação e Fórum</h4>
              </div>
              <p className="text-sm text-foreground/80 mb-3">
                Não estude sozinho. O aprendizado é muito mais rico quando compartilhado.
              </p>
              <ul className="text-sm text-foreground/80 space-y-3">
                <li className="flex gap-2"><span className="text-primary font-bold">•</span> Use a <strong>Comunidade VIP</strong> para postar fotos dos seus trabalhos.</li>
                <li className="flex gap-2"><span className="text-primary font-bold">•</span> Embaixo de cada aula existe uma seção de comentários específicos daquela aula para dúvidas diretas com a equipe técnica do Agnaldo.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
