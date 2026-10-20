'use client';

import { useState, useMemo } from 'react';
import { SectionTitle } from '@/components/SectionTitle';
import { CardGlass } from '@/components/CardGlass';
import { Button } from '@/components/Button';
import { 
  BookOpen, CalendarDays, Users, Scissors, UserCircle, 
  Heart, CheckCircle2, ShieldAlert, Sparkles, MessageSquare, 
  MonitorPlay, HelpCircle, Bot, Package, DollarSign, GraduationCap, 
  ShoppingBag, Search, ChevronDown, ChevronUp, ArrowRight, ShieldCheck, 
  Check, AlertCircle, Info, Send, Beaker, FileText, Smartphone
} from 'lucide-react';
import { BASE_CONHECIMENTO_TUTORIAL, TopicoTutorial, responderDuvidaComTutorial } from '@/lib/knowledge-base';

export default function AdminTutorialPage() {
  const [tabAtiva, setTabAtiva] = useState<string>('todos');
  const [buscaTexto, setBuscaTexto] = useState<string>('');
  const [faqAberto, setFaqAberto] = useState<Record<string, boolean>>({});

  // Chat de teste rápido com a IA do Tutorial na própria página
  const [duvidaRapida, setDuvidaRapida] = useState('');
  const [respostaDuvida, setRespostaDuvida] = useState('');
  const [processandoDuvida, setProcessandoDuvida] = useState(false);

  const toggleFaq = (chave: string) => {
    setFaqAberto(prev => ({ ...prev, [chave]: !prev[chave] }));
  };

  // Filtragem dos tópicos por texto de busca e por categoria
  const topicosFiltrados = useMemo(() => {
    return BASE_CONHECIMENTO_TUTORIAL.filter(t => {
      const matchCategoria = tabAtiva === 'todos' || t.id.includes(tabAtiva) || t.categoria === tabAtiva;
      
      if (!buscaTexto.trim()) return matchCategoria;

      const q = buscaTexto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const noTitulo = t.titulo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q);
      const naDesc = t.descricao.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q);
      const nosPassos = t.passoAPasso.some(p => 
        p.titulo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q) ||
        p.detalhes.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q)
      );
      const nasFaqs = t.perguntasFrequentes.some(f =>
        f.pergunta.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q) ||
        f.resposta.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q)
      );

      return matchCategoria && (noTitulo || naDesc || nosPassos || nasFaqs);
    });
  }, [tabAtiva, buscaTexto]);

  const handlePerguntarIA = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!duvidaRapida.trim()) return;

    setProcessandoDuvida(true);
    setRespostaDuvida('');

    // Consulta imediata via base de conhecimento do tutorial
    setTimeout(() => {
      const resposta = responderDuvidaComTutorial(duvidaRapida);
      setRespostaDuvida(resposta);
      setProcessandoDuvida(false);
    }, 250);
  };

  const abasNavegacao = [
    { id: 'todos', label: 'Todos os Módulos', icone: BookOpen },
    { id: 'visao-geral', label: '1. Perfis & Acessos', icone: ShieldCheck },
    { id: 'fluxo-atendimento', label: '2. Agenda & Fluxo', icone: CalendarDays },
    { id: 'gestao-estoque', label: '3. Estoque & Insumos', icone: Package },
    { id: 'financeiro', label: '4. Financeiro & Caixa', icone: DollarSign },
    { id: 'noiva', label: '5. Dia da Noiva', icone: Heart },
    { id: 'academy', label: '6. Academy & Cursos', icone: GraduationCap },
    { id: 'loja', label: '7. Loja & Afiliados ML', icone: ShoppingBag },
    { id: 'whatsapp', label: '8. Automações & CRM', icone: Bot },
  ];

  return (
    <div className="py-4 space-y-8 animate-fade-in max-w-6xl mx-auto">
      {/* Header Principal */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <SectionTitle 
          title="Manual Completo & Tutorial do Sistema" 
          subtitle="Guia passo a passo para Secretária, Profissionais na Cadeira, Gestão e Alunos" 
          align="left" 
        />
      </div>

      {/* Hero Banner Explicativo */}
      <CardGlass className="p-6 md:p-8 border-gold/30 bg-gradient-to-br from-gold/15 via-background to-background relative overflow-hidden shadow-lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/20 text-gold text-xs font-bold border border-gold/40">
              <Sparkles size={14} />
              <span>Base de Conhecimento Oficial Studio & Academy</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground font-serif tracking-tight">
              Tudo o que você precisa saber sobre o sistema em um só lugar.
            </h2>
            <p className="text-sm text-foreground/80 leading-relaxed">
              Consulte como realizar cada operação no Studio: agendamentos, segregação de permissões da secretária, lançamento e edição de insumos com busca inteligente, fechamento de comandas, comissões e emissão de certificados.
            </p>
          </div>

          {/* Card de Pergunta Direta para a IA */}
          <div className="w-full lg:w-96 bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-2xl p-4 shadow-xl shrink-0">
            <div className="flex items-center gap-2 mb-2 text-xs font-bold text-gold uppercase tracking-wider">
              <Bot size={16} />
              <span>Tire Qualquer Dúvida com a IA</span>
            </div>
            <p className="text-[11px] text-foreground/60 mb-3">
              Enquanto a chave de API externa não estiver configurada, a assistente responde instantaneamente com base neste manual.
            </p>
            <form onSubmit={handlePerguntarIA} className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  value={duvidaRapida}
                  onChange={e => setDuvidaRapida(e.target.value)}
                  placeholder="Ex: Como a secretária libera a cliente?"
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] focus:border-gold rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none placeholder:text-foreground/40 pr-8"
                />
                <button
                  type="submit"
                  disabled={processandoDuvida || !duvidaRapida.trim()}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-gold hover:text-gold-dim disabled:opacity-40"
                  title="Perguntar"
                >
                  <Send size={14} />
                </button>
              </div>
            </form>

            {respostaDuvida && (
              <div className="mt-3 p-3 bg-gold/10 border border-gold/30 rounded-xl text-xs text-foreground/90 space-y-1.5 max-h-48 overflow-y-auto whitespace-pre-line animate-in fade-in">
                {respostaDuvida}
              </div>
            )}
          </div>
        </div>
      </CardGlass>

      {/* Barra de Pesquisa de Tópicos */}
      <div className="relative">
        <div className="flex items-center bg-[var(--color-card)] border border-[var(--border-subtle)] focus-within:border-gold rounded-2xl px-4 py-3 shadow-sm transition-colors">
          <Search size={18} className="text-foreground/40 mr-3 shrink-0" />
          <input
            type="text"
            value={buscaTexto}
            onChange={e => setBuscaTexto(e.target.value)}
            placeholder="Pesquise por qualquer tema, dúvida ou funcionalidade (ex: insumos, fechamento, comissões, noivas, estoque, upsell...)"
            className="w-full bg-transparent text-sm text-foreground focus:outline-none placeholder:text-foreground/40"
          />
          {buscaTexto && (
            <button
              onClick={() => setBuscaTexto('')}
              className="text-xs text-foreground/40 hover:text-foreground font-semibold px-2 py-1 rounded"
            >
              Limpar busca
            </button>
          )}
        </div>
      </div>

      {/* Navegação por Abas de Módulos */}
      <div className="flex flex-wrap gap-2 border-b border-[var(--border-subtle)] pb-3">
        {abasNavegacao.map((tab) => {
          const Icon = tab.icone;
          const ativo = tabAtiva === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setTabAtiva(tab.id);
                setBuscaTexto('');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                ativo 
                  ? 'bg-gold text-white shadow-md' 
                  : 'bg-[var(--color-card)] text-foreground/70 hover:text-foreground border border-[var(--border-subtle)] hover:border-gold/40'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* LISTAGEM DOS TÓPICOS DO MANUAL */}
      {topicosFiltrados.length === 0 ? (
        <CardGlass className="p-12 text-center space-y-3">
          <Search size={32} className="mx-auto text-foreground/30" />
          <h3 className="text-base font-bold text-foreground">Nenhum tópico encontrado</h3>
          <p className="text-xs text-foreground/60 max-w-md mx-auto">
            Não encontramos nenhum resultado para &quot;{buscaTexto}&quot;. Tente pesquisar por termos como &quot;insumo&quot;, &quot;secretaria&quot;, &quot;comissao&quot; ou &quot;noiva&quot;.
          </p>
          <Button variant="outline" size="sm" onClick={() => { setBuscaTexto(''); setTabAtiva('todos'); }}>
            Ver todos os tópicos
          </Button>
        </CardGlass>
      ) : (
        <div className="space-y-8">
          {topicosFiltrados.map((topico) => (
            <CardGlass key={topico.id} className="p-6 md:p-8 space-y-6 border-[var(--border-subtle)] hover:border-gold/30 transition-colors shadow-sm">
              {/* Cabeçalho do Tópico */}
              <div className="border-b border-[var(--border-subtle)] pb-4 space-y-2">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="text-xl font-extrabold text-foreground font-serif tracking-tight flex items-center gap-2">
                    <span className="text-gold">✦</span>
                    <span>{topico.titulo}</span>
                  </h3>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-foreground/5 text-foreground/70 border border-[var(--border-subtle)]">
                    Público: <strong>{topico.publicoAlvo}</strong>
                  </span>
                </div>
                <p className="text-xs md:text-sm font-medium text-gold">
                  {topico.subtitulo}
                </p>
                <p className="text-xs text-foreground/70 leading-relaxed pt-1">
                  {topico.descricao}
                </p>
              </div>

              {/* Grid Passo a Passo Numerado */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground/80 flex items-center gap-1.5">
                  <ArrowRight size={13} className="text-gold" />
                  <span>Passo a Passo Operacional</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {topico.passoAPasso.map((passo) => (
                    <div 
                      key={passo.passo} 
                      className="p-4 rounded-xl bg-foreground/[0.02] border border-[var(--border-subtle)] hover:bg-foreground/[0.04] transition-colors space-y-2"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-gold/20 text-gold font-bold text-xs flex items-center justify-center shrink-0 border border-gold/40">
                          {passo.passo}
                        </span>
                        <h5 className="font-bold text-xs text-foreground leading-snug">
                          {passo.titulo}
                        </h5>
                      </div>
                      <p className="text-xs text-foreground/75 leading-relaxed pl-8">
                        {passo.detalhes}
                      </p>
                      {passo.dicaImportante && (
                        <div className="ml-8 p-2 rounded-lg bg-gold/10 border border-gold/25 text-[11px] text-foreground/85 flex items-start gap-1.5">
                          <Info size={13} className="text-gold shrink-0 mt-0.5" />
                          <span><strong>Dica:</strong> {passo.dicaImportante}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabela Comparativa / Destaque Especial para o Tópico 1 e 2 (Secretária vs Gestora) */}
              {topico.id === 'visao-geral-perfis' && (
                <div className="p-4 rounded-xl bg-gold/5 border border-gold/25 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-1.5">
                    <ShieldAlert size={14} />
                    <span>Quadro de Confidencialidade: O que cada perfil acessa?</span>
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-gold/20 text-foreground/60 font-semibold">
                          <th className="py-2 pr-3">Recurso / Informação</th>
                          <th className="py-2 px-3 text-center">Secretária (Recepção)</th>
                          <th className="py-2 px-3 text-center">Profissional na Cadeira</th>
                          <th className="py-2 pl-3 text-center">Gestora & Admin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)]">
                        <tr>
                          <td className="py-2 pr-3 font-medium text-foreground">Visualizar Todos os Agendamentos da Casa</td>
                          <td className="py-2 px-3 text-center text-emerald-800 dark:text-emerald-400 font-bold">✓ Total</td>
                          <td className="py-2 px-3 text-center text-foreground/50">Apenas os seus</td>
                          <td className="py-2 pl-3 text-center text-emerald-800 dark:text-emerald-400 font-bold">✓ Total</td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-3 font-medium text-foreground">Fechamento Prévio (Comanda e Liberação da Cliente)</td>
                          <td className="py-2 px-3 text-center text-emerald-800 dark:text-emerald-400 font-bold">✓ Sim</td>
                          <td className="py-2 px-3 text-center text-foreground/40">—</td>
                          <td className="py-2 pl-3 text-center text-emerald-800 dark:text-emerald-400 font-bold">✓ Sim</td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-3 font-medium text-foreground">Comissões da Equipe e Faturamento Líquido</td>
                          <td className="py-2 px-3 text-center text-red-500 font-bold">✕ Oculto (Confidencial)</td>
                          <td className="py-2 px-3 text-center text-foreground/50">Apenas a própria</td>
                          <td className="py-2 pl-3 text-center text-emerald-800 dark:text-emerald-400 font-bold">✓ Completo</td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-3 font-medium text-foreground">Lançamento e Edição de Insumos (g/ml) na Cadeira</td>
                          <td className="py-2 px-3 text-center text-emerald-800 dark:text-emerald-400 font-bold">✓ Na Agenda</td>
                          <td className="py-2 px-3 text-center text-emerald-800 dark:text-emerald-400 font-bold">✓ No Meu Painel</td>
                          <td className="py-2 pl-3 text-center text-emerald-800 dark:text-emerald-400 font-bold">✓ Total</td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-3 font-medium text-foreground">Auditoria Definitiva do Caixa (/admin/pagamentos)</td>
                          <td className="py-2 px-3 text-center text-red-500 font-bold">✕ Sem acesso</td>
                          <td className="py-2 px-3 text-center text-foreground/40">—</td>
                          <td className="py-2 pl-3 text-center text-emerald-800 dark:text-emerald-400 font-bold">✓ Gestão Final</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Seção de Perguntas Frequentes (FAQ) */}
              {topico.perguntasFrequentes.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground/80 flex items-center gap-1.5">
                    <HelpCircle size={13} className="text-gold" />
                    <span>Dúvidas Frequentes do Módulo</span>
                  </h4>

                  <div className="space-y-2">
                    {topico.perguntasFrequentes.map((faq, idx) => {
                      const chave = `${topico.id}-${idx}`;
                      const aberta = !!faqAberto[chave];

                      return (
                        <div 
                          key={idx} 
                          className="border border-[var(--border-subtle)] rounded-xl overflow-hidden bg-foreground/[0.01]"
                        >
                          <button
                            type="button"
                            onClick={() => toggleFaq(chave)}
                            className="w-full p-3 text-left text-xs font-bold text-foreground flex items-center justify-between gap-3 hover:bg-foreground/[0.03] transition-colors"
                          >
                            <span className="flex items-center gap-2">
                              <span className="text-gold">Q:</span>
                              {faq.pergunta}
                            </span>
                            <ChevronDown size={14} className={`text-foreground/40 shrink-0 transition-transform ${aberta ? 'rotate-180 text-gold' : ''}`} />
                          </button>
                          {aberta && (
                            <div className="p-3 text-xs text-foreground/80 bg-foreground/[0.02] border-t border-[var(--border-subtle)] leading-relaxed pl-7">
                              {faq.resposta}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardGlass>
          ))}
        </div>
      )}

      {/* Rodapé de Ajuda Rápida */}
      <CardGlass className="p-6 text-center space-y-3 border-gold/20 bg-gold/5">
        <h4 className="text-sm font-bold text-foreground">Ainda restou alguma dúvida de processo?</h4>
        <p className="text-xs text-foreground/70 max-w-xl mx-auto">
          Você pode abrir o botão flutuante da <strong>IA Assistente</strong> no canto inferior direito da tela a qualquer momento. Ela responderá suas perguntas operacionais com base neste manual integrado!
        </p>
      </CardGlass>
    </div>
  );
}
