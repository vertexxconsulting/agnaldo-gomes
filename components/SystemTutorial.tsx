import { 
  BookOpen, CalendarDays, Users, Scissors, UserCircle, LayoutDashboard, 
  PlaySquare, CheckCircle, GraduationCap, MessagesSquare, Award, MonitorPlay, 
  CreditCard, ShieldCheck 
} from 'lucide-react';

interface SystemTutorialProps {
  module: 'admin' | 'admin-academy' | 'aluno';
}

export function SystemTutorial({ module }: SystemTutorialProps) {
  if (module === 'admin') {
    return (
      <div className="flex flex-col gap-8 max-w-4xl mx-auto pb-20 mt-6">
        <div className="bg-primary/10 border border-primary/20 p-8 rounded-2xl">
          <div className="flex items-center gap-4 mb-4">
            <BookOpen className="text-primary" size={32} />
            <h2 className="text-2xl font-bold">Guia de Uso: Gestão do Studio</h2>
          </div>
          <p className="text-foreground/80 leading-relaxed text-base">
            Bem-vindo ao painel de administração do Studio Agnaldo Gomes. Aqui você gerencia toda a operação diária do salão, desde os agendamentos até o cadastro de profissionais.
          </p>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-bold border-b border-white/10 pb-2">O que você encontra aqui?</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass p-5 rounded-xl border border-white/5">
              <CalendarDays className="text-primary mb-3" size={24} />
              <h4 className="font-bold mb-2">Agenda</h4>
              <p className="text-sm text-foreground/70">Visualize todos os horários marcados. Os agendamentos feitos pelo site caem aqui com status &quot;Pendente&quot; aguardando sua aprovação.</p>
            </div>
            <div className="glass p-5 rounded-xl border border-white/5">
              <Users className="text-primary mb-3" size={24} />
              <h4 className="font-bold mb-2">Clientes (CRM)</h4>
              <p className="text-sm text-foreground/70">Histórico de todos os clientes, contatos e serviços realizados. Essencial para criar relacionamento e fidelização.</p>
            </div>
            <div className="glass p-5 rounded-xl border border-white/5">
              <UserCircle className="text-primary mb-3" size={24} />
              <h4 className="font-bold mb-2">Profissionais</h4>
              <p className="text-sm text-foreground/70">Gerencie a equipe, horários de expediente e atribua serviços a cada profissional.</p>
            </div>
            <div className="glass p-5 rounded-xl border border-white/5">
              <Scissors className="text-primary mb-3" size={24} />
              <h4 className="font-bold mb-2">Serviços</h4>
              <p className="text-sm text-foreground/70">Catálogo de serviços oferecidos pelo salão com preços e duração (ex: Corte Feminino, Morena Iluminada).</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold border-b border-white/10 pb-2">Como Aprovar um Agendamento?</h3>
          <ul className="list-decimal list-inside space-y-3 text-foreground/80 text-sm bg-card/50 p-6 rounded-xl border border-white/5">
            <li>O cliente preenche o formulário no site e solicita um horário.</li>
            <li>Você recebe a notificação na tela de <strong className="text-white">Agenda</strong>.</li>
            <li>Clique no card do agendamento (que estará laranja/pendente).</li>
            <li>Revise os dados, horário e profissional.</li>
            <li>Clique no botão <strong className="text-white">Confirmar Agendamento</strong>. O status mudará para verde.</li>
            <li><strong className="text-primary">Dica:</strong> Chame o cliente no WhatsApp para confirmar!</li>
          </ul>
        </div>
      </div>
    );
  }

  if (module === 'admin-academy') {
    return (
      <div className="flex flex-col gap-8 max-w-4xl mx-auto pb-20 mt-6">
        <div className="bg-primary/10 border border-primary/20 p-8 rounded-2xl">
          <div className="flex items-center gap-4 mb-4">
            <GraduationCap className="text-primary" size={32} />
            <h2 className="text-2xl font-bold">Guia de Uso: Gestão da Academy</h2>
          </div>
          <p className="text-foreground/80 leading-relaxed text-base">
            Bem-vindo ao painel do Produtor/Educador. Aqui você controla todos os seus cursos (online e presenciais), gerencia seus alunos e acompanha suas vendas.
          </p>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-bold border-b border-white/10 pb-2">O que você encontra aqui?</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass p-5 rounded-xl border border-white/5">
              <PlaySquare className="text-primary mb-3" size={24} />
              <h4 className="font-bold mb-2">Cursos & Módulos</h4>
              <p className="text-sm text-foreground/70">Crie novos cursos, defina os preços, cadastre os módulos e faça o upload das vídeo-aulas via link.</p>
            </div>
            <div className="glass p-5 rounded-xl border border-white/5">
              <Users className="text-primary mb-3" size={24} />
              <h4 className="font-bold mb-2">Alunos</h4>
              <p className="text-sm text-foreground/70">Acompanhe quem comprou seus cursos, visualize o progresso das aulas e libere ou bloqueie acessos.</p>
            </div>
            <div className="glass p-5 rounded-xl border border-white/5">
              <CreditCard className="text-primary mb-3" size={24} />
              <h4 className="font-bold mb-2">Faturamento</h4>
              <p className="text-sm text-foreground/70">Visão financeira das matrículas. Controle de pagamentos pendentes e confirmados.</p>
            </div>
            <div className="glass p-5 rounded-xl border border-white/5">
              <MessagesSquare className="text-primary mb-3" size={24} />
              <h4 className="font-bold mb-2">Comunidade VIP</h4>
              <p className="text-sm text-foreground/70">Fórum exclusivo para os alunos. Responda dúvidas, compartilhe dicas e engaje a sua turma.</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold border-b border-white/10 pb-2">Como cadastrar um Novo Curso?</h3>
          <ul className="list-decimal list-inside space-y-3 text-foreground/80 text-sm bg-card/50 p-6 rounded-xl border border-white/5">
            <li>Acesse a aba <strong className="text-white">Cursos</strong> e clique em &quot;Novo Curso&quot;.</li>
            <li>Preencha Título, Descrição, Formato (Online/Presencial) e Valor.</li>
            <li>Adicione uma imagem de capa atrativa.</li>
            <li>Após criar o curso, entre nele e clique em <strong className="text-white">Novo Módulo</strong>.</li>
            <li>Dentro do módulo, clique em <strong className="text-white">Adicionar Aula</strong> e cole o link do vídeo (YouTube/Vimeo).</li>
          </ul>
        </div>
      </div>
    );
  }

  if (module === 'aluno') {
    return (
      <div className="flex flex-col gap-8 max-w-4xl mx-auto pb-20 mt-6">
        <div className="bg-primary/10 border border-primary/20 p-8 rounded-2xl">
          <div className="flex items-center gap-4 mb-4">
            <MonitorPlay className="text-primary" size={32} />
            <h2 className="text-2xl font-bold">Guia de Uso: Sala de Aula Virtual</h2>
          </div>
          <p className="text-foreground/80 leading-relaxed text-base">
            Bem-vindo à sua Área do Aluno! Este é o seu espaço de evolução e aprendizado com o mestre Agnaldo Gomes.
          </p>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-bold border-b border-white/10 pb-2">O que você encontra aqui?</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass p-5 rounded-xl border border-white/5">
              <PlaySquare className="text-primary mb-3" size={24} />
              <h4 className="font-bold mb-2">Meus Cursos</h4>
              <p className="text-sm text-foreground/70">Acesso direto a todas as formações que você adquiriu. O progresso é salvo automaticamente.</p>
            </div>
            <div className="glass p-5 rounded-xl border border-white/5">
              <Award className="text-primary mb-3" size={24} />
              <h4 className="font-bold mb-2">Certificados</h4>
              <p className="text-sm text-foreground/70">Ao concluir 100% de um curso, seu certificado de conclusão em PDF será liberado aqui para impressão.</p>
            </div>
            <div className="glass p-5 rounded-xl border border-white/5">
              <ShieldCheck className="text-primary mb-3" size={24} />
              <h4 className="font-bold mb-2">Catálogo de Cursos</h4>
              <p className="text-sm text-foreground/70">Descubra novas formações para continuar sua trilha de crescimento profissional.</p>
            </div>
            <div className="glass p-5 rounded-xl border border-white/5">
              <MessagesSquare className="text-primary mb-3" size={24} />
              <h4 className="font-bold mb-2">Comunidade</h4>
              <p className="text-sm text-foreground/70">Interaja com outros alunos, tire dúvidas direto com a equipe técnica e faça networking.</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold border-b border-white/10 pb-2">Como assistir às aulas?</h3>
          <ul className="list-decimal list-inside space-y-3 text-foreground/80 text-sm bg-card/50 p-6 rounded-xl border border-white/5">
            <li>No seu <strong className="text-white">Dashboard</strong>, clique no curso que deseja estudar.</li>
            <li>Você verá a lista de Módulos. Clique em um módulo para expandir a lista de aulas.</li>
            <li>Clique na aula desejada para abrir o reprodutor de vídeo.</li>
            <li>Abaixo do vídeo, pode haver materiais em PDF para baixar.</li>
            <li>Sempre que terminar uma aula, clique em <strong className="text-white">Marcar como Concluída</strong> para que seu progresso avance e o certificado seja liberado no final.</li>
          </ul>
        </div>
      </div>
    );
  }

  return null;
}
