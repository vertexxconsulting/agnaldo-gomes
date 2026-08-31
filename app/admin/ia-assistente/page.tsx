'use client';

import { useState, useEffect } from 'react';
import { SectionTitle } from '@/components/SectionTitle';
import { CardGlass } from '@/components/CardGlass';
import { Button } from '@/components/Button';
import { 
  Bot, Sparkles, Send, CheckCircle2, ShieldAlert, FileText, 
  MessageSquare, Users, Store, GraduationCap, Scissors, Settings2, 
  RefreshCw, Smartphone, HelpCircle, Save, Sliders, Play, Clock
} from 'lucide-react';
import { IAConfig, DEFAULT_IA_CONFIG, DEFAULT_HORARIOS_SALAO, obterIAConfig, salvarIAConfig } from '@/lib/ia-config';

type TabAtiva = 'diretrizes' | 'relatorios' | 'atendente' | 'modulos' | 'tutorial' | 'playground';

export default function IAAssistentePage() {
  const [config, setConfig] = useState<IAConfig>(DEFAULT_IA_CONFIG);
  const [tabAtiva, setTabAtiva] = useState<TabAtiva>('diretrizes');
  const [salvando, setSalvando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState(false);

  // Estados do Simulador / Playground
  const [perguntaPlayground, setPerguntaPlayground] = useState('');
  const [historicoChat, setHistoricoChat] = useState<Array<{ remetente: 'user' | 'ia'; texto: string }>>([
    {
      remetente: 'ia',
      texto: 'Olá, Admin! Sou a IA Assistente do Studio & Academy Agnaldo Gomes. Estou configurada com suas diretrizes. Faça uma pergunta ou teste uma simulação de atendimento, relatório ou dúvida de aluno!'
    }
  ]);
  const [pensandoIA, setPensandoIA] = useState(false);

  // Estados do Cron / Disparo Bolten
  const [disparandoCron, setDisparandoCron] = useState(false);
  const [resultadoCron, setResultadoCron] = useState<string | null>(null);

  const handleDispararCronBolten = async () => {
    setDisparandoCron(true);
    setResultadoCron(null);
    try {
      const res = await fetch('/api/cron/relatorio-ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: config.relatorios.whatsappAgnaldo })
      });
      const json = await res.json();
      if (json.sucesso) {
        setResultadoCron(`✅ ${json.boltenResultado?.mensagem || 'Relatório disparado com sucesso via Bolten.io!'}`);
      } else {
        setResultadoCron(`⚠️ Erro: ${json.error || 'Não foi possível disparar'}`);
      }
    } catch (err: any) {
      setResultadoCron(`⚠️ Falha na requisição: ${err.message}`);
    } finally {
      setDisparandoCron(false);
    }
  };

  useEffect(() => {
    const carregada = obterIAConfig();
    setConfig(carregada);
  }, []);

  const handleSalvar = () => {
    setSalvando(true);
    salvarIAConfig(config);
    // Persistir configurações de relatório no Supabase para acesso pelo Cron server-side
    fetch('/api/ia-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        frequencia: config.relatorios.frequencia,
        diaSemana: config.relatorios.diaSemana ?? 0,
        horarioEnvio: config.relatorios.horarioEnvio,
        whatsappAgnaldo: config.relatorios.whatsappAgnaldo,
        ativo: config.relatorios.ativo,
      }),
    }).catch(err => console.warn('[ia-assistente] Erro ao persistir config no Supabase:', err));
    setTimeout(() => {
      setSalvando(false);
      setMensagemSucesso(true);
      setTimeout(() => setMensagemSucesso(false), 3000);
    }, 400);
  };

  const handleRestaurarPadrao = () => {
    if (confirm('Deseja restaurar todas as diretrizes da IA para os padrões originais do Studio Agnaldo Gomes?')) {
      setConfig(DEFAULT_IA_CONFIG);
      salvarIAConfig(DEFAULT_IA_CONFIG);
      setMensagemSucesso(true);
      setTimeout(() => setMensagemSucesso(false), 3000);
    }
  };

  const handleEnviarSimulacao = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!perguntaPlayground.trim()) return;

    const pergunta = perguntaPlayground;
    setHistoricoChat(prev => [...prev, { remetente: 'user', texto: pergunta }]);
    setPerguntaPlayground('');
    setPensandoIA(true);

    setTimeout(() => {
      let resposta = '';
      const pLower = pergunta.toLowerCase();

      if (!config.ativa) {
        resposta = '⚠️ [AVISO]: A IA Assistente está atualmente DESATIVADA nas configurações do painel.';
      } else if (pLower.includes('relat') || pLower.includes('fatur')) {
        resposta = `📊 *RESUMO EXECUTIVO DO STUDIO AGNALDO GOMES*\n\nPrezado Agnaldo, segue o balanço consolidado:\n• Faturamento estimado: R$ 60,00+\n• Serviços em destaque: Corte Masculino, Mechas e Ozonioterapia.\n• Regra de Noivas: 50% de sinal garantido.\n\n💡 *Dica da IA:* Excelente procura por cortes hoje. Recomendamos reforçar o combo de Terapia Capilar para clientes de mechas.`;
      } else if (pLower.includes('recep') || pLower.includes('atendente') || pLower.includes('cheg')) {
        resposta = `🛎️ *Script para Atendente Física:*\n"${config.atendenteFisica.scriptBoasVindas}"\n\n💡 *Sugestão de Upsell:*\n"${config.atendenteFisica.scriptUpsell}"`;
      } else if (pLower.includes('noiva') || pLower.includes('casamento')) {
        resposta = `💍 *Diretriz para Noivas:*\n${config.atendenteFisica.scriptNoivas}\n\nLembre-se: O pacote Dia da Noiva Completo é a partir de R$ 2.499,00 e exige sinal obrigatório de 50% via PIX para bloqueio da data.`;
      } else if (pLower.includes('curso') || pLower.includes('academy') || pLower.includes('aula')) {
        resposta = `🎓 *Suporte Academy:*\n${config.modulos.academy.regrasCursos}\n${config.modulos.academy.regrasSuporteAlunos}`;
      } else if (pLower.includes('loja') || pLower.includes('produto') || pLower.includes('shampoo')) {
        resposta = `🛍️ *Loja & Afiliados:*\n${config.modulos.loja.regrasProdutos}\n${config.modulos.loja.regrasAfiliadosML}`;
      } else {
        resposta = `Olá! De acordo com as diretrizes do Studio Agnaldo Gomes: todos os serviços são calculados a partir dos valores base cadastrados e os agendamentos respeitam rigorosamente a jornada dos profissionais (Terça a Sexta 09h-19h e Sábado 08h-17h). Como posso te auxiliar melhor?`;
      }

      setHistoricoChat(prev => [...prev, { remetente: 'ia', texto: resposta }]);
      setPensandoIA(false);
    }, 600);
  };

  const handleTestarWhatsAppAgnaldo = () => {
    const fone = config.relatorios.whatsappAgnaldo.replace(/\D/g, '');
    const msg = encodeURIComponent(
      `📊 *STUDIO AGNALDO GOMES — TESTE DE RELATÓRIO IA*\n\nOlá Mestre Agnaldo Gomes! Este é um teste do envio automático de relatórios e insights de gestão configurados pela IA Assistente no painel administrativo.`
    );
    window.open(`https://wa.me/${fone}?text=${msg}`, '_blank');
  };

  return (
    <div className="py-4 space-y-8">
      {/* Header com Master Toggle e Ações */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <SectionTitle 
          title="Gestão da IA Assistente" 
          subtitle="Controle central de diretrizes, orientações, relatórios e suporte inteligente" 
          align="left" 
        />

        <div className="flex items-center gap-3">
          {/* Master Switch */}
          <div className="flex items-center gap-2 bg-[var(--color-card)] border border-[var(--border-subtle)] px-3 py-2 rounded-xl">
            <span className={`w-2.5 h-2.5 rounded-full ${config.ativa ? 'bg-emerald-500 animate-pulse' : 'bg-foreground/30'}`} />
            <span className="text-xs font-bold text-foreground mr-1">
              IA {config.ativa ? 'ATIVA' : 'DESATIVADA'}
            </span>
            <button
              onClick={() => setConfig(prev => ({ ...prev, ativa: !prev.ativa }))}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                config.ativa ? 'bg-primary' : 'bg-foreground/20'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  config.ativa ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <Button 
            variant="outline" 
            onClick={handleRestaurarPadrao}
            className="text-xs flex items-center gap-1.5"
          >
            <RefreshCw size={13} /> Padrões
          </Button>

          <Button 
            variant="primary" 
            onClick={handleSalvar}
            disabled={salvando}
            className="text-xs font-bold flex items-center gap-1.5"
          >
            {salvando ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            {salvando ? 'Gravando...' : 'Salvar Diretrizes'}
          </Button>
        </div>
      </div>

      {mensagemSucesso && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 size={16} /> Diretrizes e configurações da IA salvas com sucesso!
        </div>
      )}

      {/* Navegação por Abas */}
      <div className="flex flex-wrap gap-2 border-b border-[var(--border-subtle)] pb-2">
        {[
          { id: 'diretrizes', label: '🧠 Diretrizes Mestre', icon: Sparkles },
          { id: 'relatorios', label: '📊 Relatórios para o Agnaldo', icon: FileText },
          { id: 'atendente', label: '🛎️ Dicas Atendente Física', icon: Users },
          { id: 'modulos', label: '🏢 Salão, Loja & Academy', icon: Store },
          { id: 'tutorial', label: '📖 Ajuda / Tutorial', icon: HelpCircle },
          { id: 'playground', label: '💬 Testador / Simulador', icon: MessageSquare },
        ].map((tab) => {
          const Icon = tab.icon;
          const ativo = tabAtiva === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTabAtiva(tab.id as TabAtiva)}
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

      {/* Conteúdo das Abas */}

      {/* ABA 1: DIRETRIZES MESTRE */}
      {tabAtiva === 'diretrizes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <CardGlass className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-primary mb-1">
                  Instruções e Prompt Mestre do Sistema (System Instructions)
                </label>
                <p className="text-xs text-foreground/50 mb-3">
                  Define o comportamento fundamental, regras inegociáveis de preços e políticas do Studio Agnaldo Gomes.
                </p>
                <textarea
                  rows={9}
                  value={config.diretrizesMestre}
                  onChange={(e) => setConfig(prev => ({ ...prev, diretrizesMestre: e.target.value }))}
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl p-3.5 text-xs text-foreground font-mono focus:outline-none focus:border-primary leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-foreground/70 mb-1">
                  Tom de Voz da Assistente
                </label>
                <input
                  type="text"
                  value={config.tomDeVoz}
                  onChange={(e) => setConfig(prev => ({ ...prev, tomDeVoz: e.target.value }))}
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </CardGlass>
            <CardGlass className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-2">
                    <Clock size={16} /> Horários de Atendimento do Salão (Editáveis)
                  </h4>
                  <p className="text-[11px] text-foreground/50 mt-0.5">
                    Ajuste os dias e horários em que o salão está aberto. A IA e os agendamentos respeitarão automaticamente essa grade.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {[0, 1, 2, 3, 4, 5, 6].map((diaNum) => {
                  const info = config.horariosSalao?.[diaNum] || DEFAULT_HORARIOS_SALAO[diaNum];
                  return (
                    <div 
                      key={diaNum} 
                      className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        info.aberto 
                          ? 'bg-foreground/5 border-[var(--border-subtle)]' 
                          : 'bg-red-500/5 border-red-500/10 opacity-70'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setConfig(prev => ({
                              ...prev,
                              horariosSalao: {
                                ...prev.horariosSalao,
                                [diaNum]: { ...info, aberto: !info.aberto }
                              }
                            }));
                          }}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            info.aberto ? 'bg-primary' : 'bg-foreground/20'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                              info.aberto ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <span className="text-xs font-bold text-foreground">
                          {info.nome}
                        </span>
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          info.aberto ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {info.aberto ? 'Aberto' : 'Fechado'}
                        </span>
                      </div>

                      {info.aberto && (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-foreground/50">Das:</span>
                          <input
                            type="time"
                            value={info.inicio}
                            onChange={(e) => {
                              const v = e.target.value;
                              setConfig(prev => ({
                                ...prev,
                                horariosSalao: {
                                  ...prev.horariosSalao,
                                  [diaNum]: { ...info, inicio: v }
                                }
                              }));
                            }}
                            className="bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1 text-xs text-foreground focus:outline-none focus:border-primary [color-scheme:dark]"
                          />
                          <span className="text-[11px] text-foreground/50">às:</span>
                          <input
                            type="time"
                            value={info.fim}
                            onChange={(e) => {
                              const v = e.target.value;
                              setConfig(prev => ({
                                ...prev,
                                horariosSalao: {
                                  ...prev.horariosSalao,
                                  [diaNum]: { ...info, fim: v }
                                }
                              }));
                            }}
                            className="bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1 text-xs text-foreground focus:outline-none focus:border-primary [color-scheme:dark]"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardGlass>
          </div>

          <div className="space-y-6">
            <CardGlass className="p-6 space-y-4 border-primary/20">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-2">
                <ShieldAlert size={16} /> Diretrizes Globais
              </h4>
              <ul className="text-xs text-foreground/70 space-y-2.5 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">1.</span>
                  <span><strong>Valores a partir de:</strong> NUNCA prometer preço fixo sem avaliar o cabelo do cliente no salão.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">2.</span>
                  <span><strong>Sinal de Noivas:</strong> 50% de entrada obrigatória para reserva e bloqueio da data do Dia da Noiva.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">3.</span>
                  <span><strong>Horários Dinâmicos:</strong> Abertura e fechamento configuráveis no editor ao lado com aplicação imediata.</span>
                </li>
              </ul>
            </CardGlass>
          </div>
        </div>
      )}

      {/* ABA 2: RELATÓRIOS PARA O AGNALDO */}
      {tabAtiva === 'relatorios' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CardGlass className="p-6 space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
              <FileText size={16} /> Automação de Relatórios Executivos
            </h3>

            <div className="flex items-center justify-between p-3 rounded-xl bg-foreground/5 border border-[var(--border-subtle)]">
              <div>
                <span className="text-xs font-bold text-foreground block">Envio Automático de Relatórios</span>
                <span className="text-[11px] text-foreground/50">Gera um resumo executivo por IA com métricas do salão</span>
              </div>
              <input
                type="checkbox"
                checked={config.relatorios.ativo}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  relatorios: { ...prev.relatorios, ativo: e.target.checked }
                }))}
                className="w-4 h-4 accent-primary cursor-pointer"
              />
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground/70 mb-1">
                  WhatsApp do Agnaldo Gomes (com DDI e DDD)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={config.relatorios.whatsappAgnaldo}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      relatorios: { ...prev.relatorios, whatsappAgnaldo: e.target.value }
                    }))}
                    className="flex-1 bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                    placeholder="5542991534011"
                  />
                  <Button 
                    variant="outline" 
                    onClick={handleTestarWhatsAppAgnaldo}
                    className="text-xs text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 flex items-center gap-1.5 shrink-0"
                  >
                    <Smartphone size={14} /> Testar Envio
                  </Button>
                </div>
              </div>

              {/* Frequência + Dia da Semana + Horário */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-foreground/70 mb-1">Frequência de Envio</label>
                    <select
                      value={config.relatorios.frequencia}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        relatorios: { ...prev.relatorios, frequencia: e.target.value as any }
                      }))}
                      className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                    >
                      <option value="diario">📅 Diário</option>
                      <option value="semanal">📆 Semanal</option>
                      <option value="mensal">🗓️ Mensal (dia 1°)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-foreground/70 mb-1">Horário de Envio (BRT)</label>
                    <input
                      type="time"
                      value={config.relatorios.horarioEnvio}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        relatorios: { ...prev.relatorios, horarioEnvio: e.target.value }
                      }))}
                      className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Seletor de dia da semana (só aparece quando frequência = semanal) */}
                {config.relatorios.frequencia === 'semanal' && (
                  <div>
                    <label className="block text-xs font-bold text-foreground/70 mb-2">
                      Dia da Semana para Envio do Relatório
                    </label>
                    <div className="flex gap-1.5 flex-wrap">
                      {[
                        { num: 0, label: 'Dom' },
                        { num: 1, label: 'Seg' },
                        { num: 2, label: 'Ter' },
                        { num: 3, label: 'Qua' },
                        { num: 4, label: 'Qui' },
                        { num: 5, label: 'Sex' },
                        { num: 6, label: 'Sáb' },
                      ].map(({ num, label }) => {
                        const ativo = (config.relatorios.diaSemana ?? 0) === num;
                        return (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setConfig(prev => ({
                              ...prev,
                              relatorios: { ...prev.relatorios, diaSemana: num }
                            }))}
                            className={`flex-1 min-w-[38px] py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200 border ${
                              ativo
                                ? 'bg-primary text-black border-primary shadow-md'
                                : 'bg-foreground/5 text-foreground/60 border-[var(--border-subtle)] hover:border-primary/50'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-foreground/40 mt-1.5">
                      O relatório consolida toda a semana e é enviado neste dia.
                    </p>
                  </div>
                )}

                {config.relatorios.frequencia === 'mensal' && (
                  <p className="text-[11px] text-foreground/50 px-1">
                    📌 O relatório consolida o mês inteiro e é enviado automaticamente todo dia <strong>1°</strong>.
                  </p>
                )}

                {config.relatorios.frequencia === 'diario' && (
                  <p className="text-[11px] text-foreground/50 px-1">
                    📌 O relatório consolida os atendimentos do dia e é enviado todos os dias no horário configurado.
                  </p>
                )}
              </div>

              {/* Box de Automação Cron & Disparo Bolten */}
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex">
                      <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                    </span>
                    <span className="text-xs font-bold text-foreground">Cron Automático Vercel Ativo</span>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-primary text-black">
                    Bolten.io
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-black/30 border border-white/5">
                    <span className="block text-[10px] text-foreground/40 mb-0.5">Frequência</span>
                    <span className="text-xs font-extrabold text-primary uppercase">
                      {config.relatorios.frequencia === 'diario' ? 'Diário' :
                       config.relatorios.frequencia === 'semanal' ? 'Semanal' : 'Mensal'}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-black/30 border border-white/5">
                    <span className="block text-[10px] text-foreground/40 mb-0.5">Horário</span>
                    <span className="text-xs font-extrabold text-foreground">
                      {config.relatorios.horarioEnvio} BRT
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-black/30 border border-white/5">
                    <span className="block text-[10px] text-foreground/40 mb-0.5">
                      {config.relatorios.frequencia === 'semanal' ? 'Dia' : 'Próx. Envio'}
                    </span>
                    <span className="text-xs font-extrabold text-foreground">
                      {config.relatorios.frequencia === 'semanal'
                        ? ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][config.relatorios.diaSemana ?? 0]
                        : config.relatorios.frequencia === 'mensal' ? 'Todo dia 1°'
                        : 'Todo dia'}
                    </span>
                  </div>
                </div>

                <Button
                  variant="primary"
                  onClick={handleDispararCronBolten}
                  disabled={disparandoCron}
                  className="w-full text-xs font-bold py-2.5 flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  {disparandoCron ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                  {disparandoCron ? 'Processando e Enviando...' : '🚀 Disparar Relatório Agora via Bolten.io'}
                </Button>

                {resultadoCron && (
                  <div className="p-2.5 rounded-lg bg-black/40 border border-primary/30 text-xs font-medium text-foreground whitespace-pre-line">
                    {resultadoCron}
                  </div>
                )}
              </div>
            </div>
          </CardGlass>

          <CardGlass className="p-6 space-y-4 border-primary/20">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-primary">
              Exemplo de Relatório que a IA envia para o Agnaldo:
            </h4>
            <div className="p-4 rounded-xl bg-[#0b0f19] border border-primary/20 font-mono text-xs text-foreground/80 space-y-2 leading-relaxed">
              <p className="text-primary font-bold">
                📊 STUDIO AGNALDO GOMES — RELATÓRIO{' '}
                {config.relatorios.frequencia === 'diario' ? 'DIÁRIO' :
                 config.relatorios.frequencia === 'semanal' ? 'SEMANAL' : 'MENSAL'}
              </p>
              <p>
                <span className="text-foreground/50">Período:</span>{' '}
                {config.relatorios.frequencia === 'semanal'
                  ? `Semana com fechamento às ${['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][config.relatorios.diaSemana ?? 0]}`
                  : config.relatorios.frequencia === 'mensal' ? 'Mês completo (apurado no dia 1°)'
                  : 'Dia atual (apurado às ' + config.relatorios.horarioEnvio + ' BRT)'}
              </p>
              <p>• <strong>Faturamento:</strong> R$ 60,00</p>
              <p>• <strong>Atendimentos:</strong> 1 cliente atendido</p>
              <p>• <strong>Profissional destaque:</strong> Agnaldo Gomes</p>
              <p>• <strong>Cancelamentos:</strong> 0 registros</p>
              <p className="text-emerald-400 mt-2">💡 Disparo via Bolten.io CRM.</p>
            </div>
          </CardGlass>
        </div>
      )}

      {/* ABA 3: DICAS PARA A ATENDENTE FÍSICA */}
      {tabAtiva === 'atendente' && (
        <div className="space-y-6">
          <CardGlass className="p-6 space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
              <Users size={16} /> Scripts e Protocolos da Recepção do Salão
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-foreground/80 mb-1">
                  1. Script de Boas-Vindas (Recepção Física)
                </label>
                <textarea
                  rows={3}
                  value={config.atendenteFisica.scriptBoasVindas}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    atendenteFisica: { ...prev.atendenteFisica, scriptBoasVindas: e.target.value }
                  }))}
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl p-3 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-amber-400 mb-1">
                  2. Script de Upsell (Oferecer Combo/Tratamento)
                </label>
                <textarea
                  rows={3}
                  value={config.atendenteFisica.scriptUpsell}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    atendenteFisica: { ...prev.atendenteFisica, scriptUpsell: e.target.value }
                  }))}
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl p-3 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-pink-400 mb-1">
                  3. Script de Atendimento a Noivas
                </label>
                <textarea
                  rows={3}
                  value={config.atendenteFisica.scriptNoivas}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    atendenteFisica: { ...prev.atendenteFisica, scriptNoivas: e.target.value }
                  }))}
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl p-3 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-foreground/80 mb-1">
                  4. Dicas Gerais & Postura da Recepção
                </label>
                <textarea
                  rows={3}
                  value={config.atendenteFisica.dicasGerais}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    atendenteFisica: { ...prev.atendenteFisica, dicasGerais: e.target.value }
                  }))}
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl p-3 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </CardGlass>
        </div>
      )}

      {/* ABA 4: MÓDULOS DE GESTÃO (SALÃO, LOJA, ACADEMY) */}
      {tabAtiva === 'modulos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Módulo Salão */}
          <CardGlass className="p-6 space-y-4 border-amber-500/20">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Scissors size={15} /> 1. Gestão do Salão (Studio)
              </h4>
              <input
                type="checkbox"
                checked={config.modulos.salao.ativo}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  modulos: { ...prev.modulos, salao: { ...prev.modulos.salao, ativo: e.target.checked } }
                }))}
                className="w-4 h-4 accent-primary cursor-pointer"
              />
            </div>
            
            <div>
              <label className="block text-[11px] font-bold text-foreground/60 mb-1">Regras de Agendamento</label>
              <textarea
                rows={3}
                value={config.modulos.salao.regrasAgendamento}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  modulos: { ...prev.modulos, salao: { ...prev.modulos.salao, regrasAgendamento: e.target.value } }
                }))}
                className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl p-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-foreground/60 mb-1">Regras de Noivas</label>
              <textarea
                rows={2}
                value={config.modulos.salao.regrasNoivas}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  modulos: { ...prev.modulos, salao: { ...prev.modulos.salao, regrasNoivas: e.target.value } }
                }))}
                className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl p-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </CardGlass>

          {/* Módulo Loja */}
          <CardGlass className="p-6 space-y-4 border-blue-500/20">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <Store size={15} /> 2. Gestão da Loja (Store)
              </h4>
              <input
                type="checkbox"
                checked={config.modulos.loja.ativo}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  modulos: { ...prev.modulos, loja: { ...prev.modulos.loja, ativo: e.target.checked } }
                }))}
                className="w-4 h-4 accent-primary cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-foreground/60 mb-1">Estoque Local de Cosméticos</label>
              <textarea
                rows={3}
                value={config.modulos.loja.regrasProdutos}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  modulos: { ...prev.modulos, loja: { ...prev.modulos.loja, regrasProdutos: e.target.value } }
                }))}
                className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl p-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-foreground/60 mb-1">Afiliados Mercado Livre</label>
              <textarea
                rows={2}
                value={config.modulos.loja.regrasAfiliadosML}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  modulos: { ...prev.modulos, loja: { ...prev.modulos.loja, regrasAfiliadosML: e.target.value } }
                }))}
                className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl p-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </CardGlass>

          {/* Módulo Academy */}
          <CardGlass className="p-6 space-y-4 border-purple-500/20">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                <GraduationCap size={15} /> 3. Agnaldo Gomes Academy
              </h4>
              <input
                type="checkbox"
                checked={config.modulos.academy.ativo}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  modulos: { ...prev.modulos, academy: { ...prev.modulos.academy, ativo: e.target.checked } }
                }))}
                className="w-4 h-4 accent-primary cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-foreground/60 mb-1">Cursos & Videoaulas Vimeo</label>
              <textarea
                rows={3}
                value={config.modulos.academy.regrasCursos}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  modulos: { ...prev.modulos, academy: { ...prev.modulos.academy, regrasCursos: e.target.value } }
                }))}
                className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl p-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-foreground/60 mb-1">Suporte e Mentoria para Alunos</label>
              <textarea
                rows={2}
                value={config.modulos.academy.regrasSuporteAlunos}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  modulos: { ...prev.modulos, academy: { ...prev.modulos.academy, regrasSuporteAlunos: e.target.value } }
                }))}
                className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl p-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </CardGlass>
        </div>
      )}

      {/* ABA 5: AJUDA / TUTORIAL */}
      {tabAtiva === 'tutorial' && (
        <CardGlass className="p-6 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
            <HelpCircle size={16} /> Base de Conhecimento para Dúvidas e Tutoriais do Sistema
          </h3>
          <p className="text-xs text-foreground/60">
            A IA utiliza esta base de conhecimento para responder dúvidas de funcionários e administradores sobre como operar o sistema (cadastrar serviços, bloquear horários, emitir relatórios e gerenciar clientes).
          </p>

          <textarea
            rows={8}
            value={config.ajudaTutorial.faqCustomizado}
            onChange={(e) => setConfig(prev => ({
              ...prev,
              ajudaTutorial: { ...prev.ajudaTutorial, faqCustomizado: e.target.value }
            }))}
            className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl p-3.5 text-xs text-foreground font-mono focus:outline-none focus:border-primary leading-relaxed"
          />
        </CardGlass>
      )}

      {/* ABA 6: TESTADOR / SIMULADOR (PLAYGROUND) */}
      {tabAtiva === 'playground' && (
        <CardGlass className="p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <MessageSquare size={16} /> Simulador &amp; Testador da IA
              </h3>
              <p className="text-[11px] text-foreground/50">
                Teste em tempo real como a IA responderá aos clientes, atendentes físicas e ao Agnaldo com base nas diretrizes salvas.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPerguntaPlayground('Como a atendente deve recepcionar uma noiva no salão?')}
                className="text-[10px] bg-foreground/5 hover:bg-foreground/10 text-foreground/70 px-2.5 py-1 rounded-lg border border-[var(--border-subtle)]"
              >
                Simular Noiva
              </button>
              <button
                onClick={() => setPerguntaPlayground('Gere o resumo executivo de hoje para o Agnaldo')}
                className="text-[10px] bg-foreground/5 hover:bg-foreground/10 text-foreground/70 px-2.5 py-1 rounded-lg border border-[var(--border-subtle)]"
              >
                Simular Relatório
              </button>
            </div>
          </div>

          {/* Histórico do Chat */}
          <div className="h-80 overflow-y-auto space-y-3 p-4 rounded-xl bg-[var(--background)] border border-[var(--border-subtle)]">
            {historicoChat.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.remetente === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.remetente === 'ia' && (
                  <div className="w-7 h-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0">
                    <Bot size={15} />
                  </div>
                )}
                <div
                  className={`p-3 rounded-2xl text-xs max-w-[80%] whitespace-pre-line leading-relaxed ${
                    msg.remetente === 'user'
                      ? 'bg-primary text-black font-medium'
                      : 'bg-[var(--color-card)] text-foreground border border-[var(--border-subtle)]'
                  }`}
                >
                  {msg.texto}
                </div>
              </div>
            ))}
            {pensandoIA && (
              <div className="flex items-center gap-2 text-xs text-primary/70 animate-pulse">
                <Bot size={15} /> Processando diretrizes da IA...
              </div>
            )}
          </div>

          {/* Input do Chat */}
          <form onSubmit={handleEnviarSimulacao} className="flex gap-2">
            <input
              type="text"
              value={perguntaPlayground}
              onChange={(e) => setPerguntaPlayground(e.target.value)}
              placeholder="Digite uma pergunta para simular a IA..."
              className="flex-1 bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
            />
            <Button variant="primary" type="submit" className="text-xs font-bold px-4">
              <Send size={14} /> Enviar
            </Button>
          </form>
        </CardGlass>
      )}
    </div>
  );
}
