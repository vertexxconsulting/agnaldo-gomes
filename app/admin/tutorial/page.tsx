'use client';

import { useState } from 'react';
import { SectionTitle } from '@/components/SectionTitle';
import { CardGlass } from '@/components/CardGlass';
import { Button } from '@/components/Button';
import { 
  BookOpen, CalendarDays, Users, Scissors, UserCircle, 
  Heart, CheckCircle2, ShieldAlert, Sparkles, MessageSquare, MonitorPlay, HelpCircle, Bot
} from 'lucide-react';

type TabTutorial = 'visao-geral' | 'agenda' | 'crm' | 'noivas' | 'cadastros';

export default function AdminTutorialPage() {
  const [tabAtiva, setTabAtiva] = useState<TabTutorial>('visao-geral');

  return (
    <div className="py-4 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <SectionTitle 
          title="Ajuda e Tutorial do Sistema" 
          subtitle="Aprenda a utilizar todos os recursos do painel de gestão do Studio" 
          align="left" 
        />
      </div>

      {/* Navegação por Abas (Igual IA Assistente) */}
      <div className="flex flex-wrap gap-2 border-b border-[var(--border-subtle)] pb-2">
        {[
          { id: 'visao-geral', label: '📖 Visão Geral', icon: MonitorPlay },
          { id: 'agenda', label: '📅 Agenda & Aprovações', icon: CalendarDays },
          { id: 'crm', label: '👥 Gestão de Clientes', icon: Users },
          { id: 'noivas', label: '💍 Dia da Noiva', icon: Heart },
          { id: 'cadastros', label: '✂️ Serviços e Equipe', icon: Scissors },
        ].map((tab) => {
          const Icon = tab.icon;
          const ativo = tabAtiva === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTabAtiva(tab.id as TabTutorial)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                ativo 
                  ? 'bg-primary text-black shadow-md' 
                  : 'bg-[var(--color-card)] text-foreground/60 hover:text-foreground border border-[var(--border-subtle)]'
              }`}
            >
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* CONTEÚDO DAS ABAS */}

      {/* ABA 1: VISÃO GERAL */}
      {tabAtiva === 'visao-geral' && (
        <div className="space-y-6">
          <CardGlass className="p-8 border-primary/20 bg-primary/5">
            <div className="flex items-center gap-4 mb-4">
              <Sparkles className="text-primary" size={32} />
              <h2 className="text-2xl font-bold">Bem-vindo ao novo sistema!</h2>
            </div>
            <p className="text-foreground/80 leading-relaxed text-sm max-w-3xl">
              Este painel foi projetado para ser o <strong>coração do Studio Agnaldo Gomes</strong>. 
              Aqui você controla a agenda, gerencia clientes, configura os serviços e aprova orçamentos do Dia da Noiva, tudo em um só lugar.
              Use as abas acima para aprender como cada parte do sistema funciona.
            </p>
          </CardGlass>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             <CardGlass className="p-5 border-white/5 hover:border-primary/30 transition-colors">
                <CalendarDays className="text-primary mb-3" size={24} />
                <h4 className="font-bold text-sm mb-2">1. Organização</h4>
                <p className="text-xs text-foreground/70 leading-relaxed">Sua agenda digital sincronizada. Clientes pedem horários pelo site e você aprova com um clique.</p>
             </CardGlass>
             <CardGlass className="p-5 border-white/5 hover:border-primary/30 transition-colors">
                <Users className="text-primary mb-3" size={24} />
                <h4 className="font-bold text-sm mb-2">2. Relacionamento</h4>
                <p className="text-xs text-foreground/70 leading-relaxed">Ficha completa de cada cliente, histórico de cortes, colorações e cálculos automáticos de ticket médio.</p>
             </CardGlass>
             <CardGlass className="p-5 border-white/5 hover:border-primary/30 transition-colors">
                <Heart className="text-primary mb-3" size={24} />
                <h4 className="font-bold text-sm mb-2">3. Exclusividade</h4>
                <p className="text-xs text-foreground/70 leading-relaxed">Tratamento VIP para Noivas, com gestão de pacotes, orçamentos e bloqueio automático de datas na agenda.</p>
             </CardGlass>
             <CardGlass className="p-5 border-white/5 hover:border-primary/30 transition-colors">
                <Bot className="text-primary mb-3" size={24} />
                <h4 className="font-bold text-sm mb-2">4. Inteligência</h4>
                <p className="text-xs text-foreground/70 leading-relaxed">Relatórios gerados por IA enviados diretamente no WhatsApp do Agnaldo para decisões estratégicas rápidas.</p>
             </CardGlass>
          </div>
        </div>
      )}

      {/* ABA 2: AGENDA */}
      {tabAtiva === 'agenda' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CardGlass className="p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
              <CalendarDays size={16} /> Como gerenciar a Agenda
            </h3>
            
            <div className="space-y-4 text-xs text-foreground/80 leading-relaxed">
              <p>O fluxo de agendamentos foi feito para ser simples e rápido. O cliente nunca agenda sem a sua aprovação final.</p>
              
              <div className="bg-foreground/5 p-4 rounded-xl border border-[var(--border-subtle)]">
                <h4 className="font-bold text-foreground mb-2 flex items-center gap-2">
                  <span className="bg-amber-500 text-black w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px]">1</span> 
                  Recebendo um Pedido
                </h4>
                <p>Quando o cliente preenche o formulário no site e envia pelo WhatsApp, o pedido cai na aba <strong className="text-primary">Agenda</strong> com o status <strong>PENDENTE</strong> (cor amarela).</p>
              </div>

              <div className="bg-foreground/5 p-4 rounded-xl border border-[var(--border-subtle)]">
                <h4 className="font-bold text-foreground mb-2 flex items-center gap-2">
                  <span className="bg-primary text-black w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px]">2</span> 
                  Aprovando e Marcando
                </h4>
                <p>O cliente <strong>NÃO</strong> escolhe o horário no site. A secretaria recebe o pedido, negocia o horário com ele pelo WhatsApp e, em seguida, clica no botão <strong>Confirmar Agendamento</strong> no painel para fixá-lo no sistema. O status muda para <strong>CONFIRMADO</strong> (cor verde).</p>
              </div>
            </div>
          </CardGlass>

          <div className="space-y-6">
            <CardGlass className="p-6 space-y-4 border-amber-500/20">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-500 flex items-center gap-2">
                <ShieldAlert size={16} /> Lembrete Importante
              </h4>
              <p className="text-xs text-foreground/70 leading-relaxed">
                Você pode editar o horário, data ou o profissional de um agendamento pendente antes de confirmá-lo. Basta usar o botão de <strong>Editar (✏️)</strong> no card do agendamento.
              </p>
            </CardGlass>

            <CardGlass className="p-6 space-y-4 border-primary/20">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-2">
                <CheckCircle2 size={16} /> Ações Rápidas
              </h4>
              <ul className="text-xs text-foreground/70 space-y-3">
                <li>• <strong>Concluir:</strong> Após o cliente ser atendido, marque como Concluído para o valor entrar nos relatórios.</li>
                <li>• <strong>Cancelar:</strong> Libera o horário imediatamente na agenda visual.</li>
              </ul>
            </CardGlass>
          </div>
        </div>
      )}

      {/* ABA 3: CRM */}
      {tabAtiva === 'crm' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CardGlass className="p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
              <Users size={16} /> Clientes e Histórico
            </h3>
            
            <p className="text-xs text-foreground/80 leading-relaxed">
              Sempre que você confirma um agendamento novo, o sistema <strong>cria ou atualiza automaticamente</strong> o cadastro do cliente nesta aba, vinculando pelo número de WhatsApp.
            </p>

            <div className="bg-foreground/5 p-4 rounded-xl border border-[var(--border-subtle)] space-y-3">
              <h4 className="font-bold text-foreground text-xs">O que você pode fazer aqui:</h4>
              <ul className="text-xs text-foreground/70 space-y-2 list-disc list-inside">
                <li>Ver o <strong>Ticket Médio</strong> de cada cliente.</li>
                <li>Ver quantas <strong>Visitas</strong> ele já fez ao salão.</li>
                <li>Adicionar anotações importantes (ex: "Alérgica a produto X", "Usa coloração 7.0").</li>
                <li>Cadastrar clientes manualmente que vieram sem passar pelo site.</li>
              </ul>
            </div>
          </CardGlass>
        </div>
      )}

      {/* ABA 4: DIA DA NOIVA */}
      {tabAtiva === 'noivas' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CardGlass className="p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-pink-400 flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
              <Heart size={16} /> Orçamentos do Dia da Noiva
            </h3>
            
            <p className="text-xs text-foreground/80 leading-relaxed">
              O fluxo de Noivas é diferente dos agendamentos comuns porque exige contrato e sinal de 50%.
            </p>

            <div className="space-y-4 mt-4">
              <div className="flex items-start gap-3 text-xs text-foreground/70 bg-pink-500/5 p-3 rounded-xl border border-pink-500/10">
                <span className="font-bold text-pink-400 text-lg leading-none">1.</span>
                <p>O orçamento entra como <strong>Novo Pedido</strong>. Revise os dados, a data do casamento e os serviços escolhidos (cabelo, maquiagem, pré-wedding, etc).</p>
              </div>
              <div className="flex items-start gap-3 text-xs text-foreground/70 bg-pink-500/5 p-3 rounded-xl border border-pink-500/10">
                <span className="font-bold text-pink-400 text-lg leading-none">2.</span>
                <p>Ao aprovar, o sistema pede para você informar o <strong>Valor Total Fechado</strong>. Não esqueça que os valores no site são apenas uma base "A partir de".</p>
              </div>
              <div className="flex items-start gap-3 text-xs text-foreground/70 bg-pink-500/5 p-3 rounded-xl border border-pink-500/10">
                <span className="font-bold text-pink-400 text-lg leading-none">3.</span>
                <p>Você marca quando o <strong>Contrato foi Assinado</strong> e quando o <strong>Sinal de 50%</strong> foi pago. Só então a data fica 100% bloqueada para o Agnaldo.</p>
              </div>
            </div>
          </CardGlass>
        </div>
      )}

      {/* ABA 5: CADASTROS */}
      {tabAtiva === 'cadastros' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CardGlass className="p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
              <Scissors size={16} /> Gerenciando Serviços
            </h3>
            <p className="text-xs text-foreground/80 leading-relaxed">
              Na aba de <strong>Serviços</strong>, você cadastra todos os procedimentos do salão. É importante manter os <strong>tempos de duração</strong> corretos, pois o sistema usa essa informação para calcular a hora de término dos agendamentos.
            </p>
          </CardGlass>

          <CardGlass className="p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
              <UserCircle size={16} /> Equipe de Profissionais
            </h3>
            <p className="text-xs text-foreground/80 leading-relaxed">
              Na aba de <strong>Profissionais</strong>, você gerencia quem atende no salão. 
              Ao criar um profissional, você deve clicar em <strong>Vincular Serviços</strong> para dizer ao sistema quais cortes/procedimentos aquela pessoa está apta a fazer. Se um profissional não tiver serviços vinculados, ele não aparecerá para o cliente no site.
            </p>
          </CardGlass>
        </div>
      )}

    </div>
  );
}
