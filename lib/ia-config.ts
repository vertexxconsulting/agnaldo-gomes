export interface IAConfig {
  ativa: boolean;
  modo: 'ativo' | 'aprendizado' | 'desativado';
  nomeAssistente: string;
  tomDeVoz: string;
  
  // Diretrizes Mestre
  diretrizesMestre: string;
  
  // Relatórios para o Agnaldo
  relatorios: {
    ativo: boolean;
    whatsappAgnaldo: string;
    frequencia: 'diario' | 'semanal' | 'mensal';
    horarioEnvio: string;
    incluirMetricas: boolean;
    incluirDestaquesProfissionais: boolean;
    incluirAlertasCancelamento: boolean;
  };

  // Dicas para Atendente Física
  atendenteFisica: {
    scriptBoasVindas: string;
    scriptUpsell: string;
    scriptNoivas: string;
    dicasGerais: string;
  };

  // Módulos do Sistema
  modulos: {
    salao: {
      ativo: boolean;
      regrasAgendamento: string;
      regrasNoivas: string;
      regrasProfissionais: string;
    };
    loja: {
      ativo: boolean;
      regrasProdutos: string;
      regrasAfiliadosML: string;
    };
    academy: {
      ativo: boolean;
      regrasCursos: string;
      regrasSuporteAlunos: string;
    };
  };

  // Ajuda / Tutorial
  ajudaTutorial: {
    ativo: boolean;
    faqCustomizado: string;
  };

  atualizadoEm: string;
}

export const DEFAULT_IA_CONFIG: IAConfig = {
  ativa: true,
  modo: 'ativo',
  nomeAssistente: 'Assistente Agnaldo Gomes',
  tomDeVoz: 'Elegante, consultivo, acolhedor e focado em excelência capilar e estética de alto padrão.',
  
  diretrizesMestre: `Você é a inteligência artificial executiva do Studio de Beleza & Academy Agnaldo Gomes.
Suas diretrizes fundamentais e inegociáveis são:
1. VALORES SEMPRE "A PARTIR DE": Todos os preços informados devem conter a expressão "a partir de" (ex: Corte Masculino com Agnaldo Gomes a partir de R$ 60,00; Mechas a partir de R$ 480,00).
2. POLÍTICA DE NOIVAS: Serviços para noivas exigem pagamento obrigatório de 50% de sinal via PIX para reserva e bloqueio de data na agenda.
3. PROFISSIONAL PRIMEIRO: Cada procedimento está vinculado ao profissional habilitado (Agnaldo Gomes ou Equipe Studio).
4. DIAS E HORÁRIOS: O salão funciona de Terça a Sexta (09h às 19h) e Sábado (08h às 17h). Domingos e Segundas o salão é fechado.
5. EXCELÊNCIA E HIGIENE: Tratamentos capilares utilizam tecnologia de ponta (Micro Mist, Ozonioterapia e Terapia Capilar Personalizada).`,

  relatorios: {
    ativo: true,
    whatsappAgnaldo: '5542991534011',
    frequencia: 'diario',
    horarioEnvio: '20:00',
    incluirMetricas: true,
    incluirDestaquesProfissionais: true,
    incluirAlertasCancelamento: true,
  },

  atendenteFisica: {
    scriptBoasVindas: `Olá! Seja muito bem-vinda(o) ao Studio Agnaldo Gomes. Gostaria de uma água, café especial ou chá enquanto preparamos seu atendimento?`,
    scriptUpsell: `Seu cabelo ficará incrível com o corte! Para potencializar o brilho e a saúde dos fios, recomendamos adicionar a nossa Ozonioterapia ou o tratamento Micro Mist com desconto especial de combo hoje.`,
    scriptNoivas: `Parabéns pelo casamento! Nosso pacote Dia da Noiva é exclusivo e reservamos a data exclusivamente para você mediante sinal de 50%. Vamos garantir seu horário com o mestre Agnaldo Gomes?`,
    dicasGerais: `• Mantenha o tom de voz calmo e acolhedor.
• Sempre confirme o nome do cliente no sistema ao chegar na recepção.
• Oriente o cliente sobre os produtos home care ideais para manutenção pós-química.`,
  },

  modulos: {
    salao: {
      ativo: true,
      regrasAgendamento: `Agendamentos online são confirmados automaticamente se houver horário livre. Atendimentos de recepção devem ser cadastrados no painel administrativo imediatamente.`,
      regrasNoivas: `Contratos de noivas precisam de cadastro completo com telefone, data do evento e confirmação de pagamento do sinal de 50%.`,
      regrasProfissionais: `A jornada de trabalho de cada profissional deve ser rigorosamente respeitada, com intervalos de 15 minutos entre procedimentos longos.`,
    },
    loja: {
      ativo: true,
      regrasProdutos: `Produtos de estoque local são entregues no balcão ou via motoboy em Guarapuava e região.`,
      regrasAfiliadosML: `Equipamentos profissionais como pranchas e secadores são redirecionados com link de afiliado oficial do Mercado Livre.`,
    },
    academy: {
      ativo: true,
      regrasCursos: `Cursos para cabeleireiros possuem aulas gravadas no Vimeo, material de apoio e certificação emitida ao concluir 100% dos módulos.`,
      regrasSuporteAlunos: `Dúvidas pedagógicas devem ser orientadas para a seção de comentários da aula ou para o canal de mentoria VIP do Telegram/WhatsApp.`,
    },
  },

  ajudaTutorial: {
    ativo: true,
    faqCustomizado: `Como cadastrar novo serviço: Acesse Menu > Serviços > Novo Serviço > Preencha nome, preço base, duração e vincule aos profissionais.
Como bloquear horário: Acesse Menu > Agenda > Bloqueio de Horário > Selecione data, profissional e motivo.
Como tirar relatório: Acesse Menu > Relatórios > Escolha o período (dia, mês ou ano) e clique em Exportar PDF ou SVG.`,
  },

  atualizadoEm: new Date().toISOString(),
};

const STORAGE_KEY = 'agnaldo_gomes_ia_config';

export function obterIAConfig(): IAConfig {
  if (typeof window === 'undefined') return DEFAULT_IA_CONFIG;
  try {
    const salvo = localStorage.getItem(STORAGE_KEY);
    if (salvo) {
      return { ...DEFAULT_IA_CONFIG, ...JSON.parse(salvo) };
    }
  } catch (err) {
    console.warn('[ia-config] Erro ao carregar do localStorage:', err);
  }
  return DEFAULT_IA_CONFIG;
}

export function salvarIAConfig(config: IAConfig): boolean {
  if (typeof window === 'undefined') return false;
  try {
    config.atualizadoEm = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    return true;
  } catch (err) {
    console.error('[ia-config] Erro ao salvar no localStorage:', err);
    return false;
  }
}
