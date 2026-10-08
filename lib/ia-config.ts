export interface HorarioDiaSalao {
  dia: number; // 0 = Domingo, 1 = Segunda, 2 = Terça, ..., 6 = Sábado
  nome: string;
  aberto: boolean;
  inicio: string;
  fim: string;
  temPausa?: boolean;
  pausaInicio?: string;
  pausaFim?: string;
}

export type HorariosFuncionamentoSalao = Record<number, HorarioDiaSalao>;

export const DEFAULT_HORARIOS_SALAO: HorariosFuncionamentoSalao = {
  0: { dia: 0, nome: 'Domingo', aberto: false, inicio: '09:00', fim: '18:00', temPausa: false, pausaInicio: '12:00', pausaFim: '13:00' },
  1: { dia: 1, nome: 'Segunda-feira', aberto: false, inicio: '09:00', fim: '19:00', temPausa: false, pausaInicio: '12:00', pausaFim: '13:00' },
  2: { dia: 2, nome: 'Terça-feira', aberto: true, inicio: '09:00', fim: '19:00', temPausa: true, pausaInicio: '12:00', pausaFim: '13:00' },
  3: { dia: 3, nome: 'Quarta-feira', aberto: true, inicio: '09:00', fim: '19:00', temPausa: true, pausaInicio: '12:00', pausaFim: '13:00' },
  4: { dia: 4, nome: 'Quinta-feira', aberto: true, inicio: '09:00', fim: '19:00', temPausa: true, pausaInicio: '12:00', pausaFim: '13:00' },
  5: { dia: 5, nome: 'Sexta-feira', aberto: true, inicio: '09:00', fim: '19:00', temPausa: true, pausaInicio: '12:00', pausaFim: '13:00' },
  6: { dia: 6, nome: 'Sábado', aberto: true, inicio: '08:00', fim: '17:00', temPausa: true, pausaInicio: '12:00', pausaFim: '13:00' },
};

export interface IAConfig {
  ativa: boolean;
  modo: 'ativo' | 'aprendizado' | 'desativado';
  nomeAssistente: string;
  tomDeVoz: string;
  
  // Horários de Atendimento Editáveis do Salão
  horariosSalao: HorariosFuncionamentoSalao;

  // Diretrizes Mestre
  diretrizesMestre: string;
  
  // Relatórios para o Agnaldo
  relatorios: {
    ativo: boolean;
    whatsappAgnaldo: string;
    frequencia: 'diario' | 'semanal' | 'mensal';
    diaSemana: number; // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb (para frequência semanal)
    horarioEnvio: string;
    incluirMetricas: boolean;
    incluirDestaquesProfissionais: boolean;
    incluirAlertasCancelamento: boolean;
    alertaSecretariaAtivo?: boolean; // Novo campo para o Lembrete Manual
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
  
  horariosSalao: DEFAULT_HORARIOS_SALAO,

  diretrizesMestre: `Você é a inteligência artificial executiva do Studio de Beleza & Academy Agnaldo Gomes.
Suas diretrizes fundamentais e inegociáveis são:
1. VALORES SEMPRE "A PARTIR DE": Todos os preços informados devem conter a expressão "a partir de" (ex: Corte Masculino com Agnaldo Gomes a partir de R$ 60,00; Mechas a partir de R$ 480,00).
2. POLÍTICA DE NOIVAS: Serviços para noivas exigem pagamento obrigatório de 50% de sinal via PIX para reserva e bloqueio de data na agenda.
3. PROFISSIONAL PRIMEIRO: Cada procedimento está vinculado ao profissional habilitado (Agnaldo Gomes ou Equipe Studio).
4. DIAS E HORÁRIOS: O salão funciona conforme os horários de atendimento cadastrados no painel administrativo.
5. EXCELÊNCIA E HIGIENE: Tratamentos capilares utilizam tecnologia de ponta (Micro Mist, Ozonioterapia e Terapia Capilar Personalizada).
6. COMANDAS E INSUMOS: O Profissional preenche a comanda digital (Meu Painel), listando serviços realizados, produtos de upsell e insumos consumidos. O fechamento (checkout) e cobrança são feitos exclusivamente pela Recepção (Dashboard).
7. COMISSÕES E TAXAS: O sistema abate a taxa de cartão antes do repasse ao profissional. Em serviços onde o salão repassa 100% (recebimento em nome do profissional), o valor é pago ao profissional em 3 parcelas mensais.
8. VITRINE E INDICAÇÕES: Cada profissional possui links exclusivos de afiliados na Vitrine e os envia via WhatsApp aos clientes para vendas fora do salão.
9. CADASTROS LEGADOS: Clientes migrados de sistemas anteriores (ex: FOX) são integrados usando seu "Código" legado para evitar duplicidade na base.`,

  relatorios: {
    ativo: true,
    whatsappAgnaldo: '5542998271222',
    frequencia: 'diario',
    diaSemana: 0,
    horarioEnvio: '20:00',
    incluirMetricas: true,
    incluirDestaquesProfissionais: true,
    incluirAlertasCancelamento: true,
    alertaSecretariaAtivo: true,
  },

  atendenteFisica: {
    scriptBoasVindas: `Olá! Seja muito bem-vinda(o) ao Studio Agnaldo Gomes. Gostaria de uma água, café especial ou chá enquanto preparamos seu atendimento?`,
    scriptUpsell: `Seu cabelo ficará incrível com o corte! Para potencializar o brilho e a saúde dos fios, recomendamos adicionar a nossa Ozonioterapia ou o tratamento Micro Mist com desconto especial de combo hoje.`,
    scriptNoivas: `Parabéns pelo casamento! Nosso pacote Dia da Noiva é exclusivo e reservamos a data exclusivamente para você mediante sinal de 50%. Vamos garantir seu horário com o mestre Agnaldo Gomes?`,
    dicasGerais: `• Mantenha o tom de voz calmo e acolhedor.
• Sempre confirme o nome do cliente no sistema ao chegar na recepção.
• Oriente o cliente sobre os produtos home care ideais para manutenção pós-química.
• No fechamento de comandas na recepção, valide os insumos lançados pelo profissional e confirme a forma de pagamento (taxas de cartão são abatidas antes da comissão).`,
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
    faqCustomizado: `Como o profissional preenche a Comanda Digital? Acesse a aba "Meu Painel" no celular ou tablet, clique em "Iniciar" ou "Editar" e selecione os serviços realizados, produtos vendidos (upsell) e insumos consumidos. Não há cobrança nesta etapa.
Como a recepção finaliza o Checkout? Acesse a Dashboard (Painel Inicial), visualize o card do agendamento em andamento e clique em "Ir para o Caixa". O sistema trará tudo que o profissional lançou. Defina a forma de pagamento e finalize para gerar comissões.
Como funciona a Vitrine de Afiliados? Cada profissional possui uma aba "Afiliados / Vitrine" no "Meu Painel" com links exclusivos que contêm seu código. O profissional pode copiar e enviar pelo WhatsApp. As vendas externas geram comissão no seu saldo.
Como lidar com Comissões e Taxas? O checkout abate automaticamente as taxas da bandeira do cartão. Se o serviço tiver 100% de comissão, o profissional assume as taxas e o recebimento será em 3 parcelas de 30, 60 e 90 dias.
Como cadastrar clientes antigos: Os clientes importados do sistema FOX já possuem um campo "Código" vinculado. O sistema usa esse código como chave principal para não duplicar fichas.`,
  },

  atualizadoEm: new Date().toISOString(),
};

const STORAGE_KEY = 'agnaldo_gomes_ia_config';

export function obterIAConfig(): IAConfig {
  if (typeof window === 'undefined') return DEFAULT_IA_CONFIG;
  try {
    const salvo = localStorage.getItem(STORAGE_KEY);
    if (salvo) {
      const parsed = JSON.parse(salvo);
      return { 
        ...DEFAULT_IA_CONFIG, 
        ...parsed,
        horariosSalao: {
          ...DEFAULT_HORARIOS_SALAO,
          ...(parsed.horariosSalao || {})
        }
      };
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

export function obterHorariosSalao(): HorariosFuncionamentoSalao {
  return obterIAConfig().horariosSalao;
}
