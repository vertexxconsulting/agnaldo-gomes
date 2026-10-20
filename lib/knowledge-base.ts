/**
 * Base de Conhecimento e Manual Oficial do Sistema Studio & Academy Agnaldo Gomes.
 * Utilizado na aba de Tutorial (/admin/tutorial) e como motor de respostas inteligentes
 * para a IA Assistente (/api/chat) tanto em modo autônomo (sem API key) quanto como contexto de RAG.
 */

export interface TopicoTutorial {
  id: string;
  titulo: string;
  subtitulo: string;
  categoria: 'geral' | 'recepcao' | 'profissional' | 'gestao' | 'estoque' | 'noivas' | 'academy' | 'loja';
  icone: string;
  descricao: string;
  publicoAlvo: string;
  passoAPasso: {
    passo: number;
    titulo: string;
    detalhes: string;
    dicaImportante?: string;
  }[];
  perguntasFrequentes: {
    pergunta: string;
    resposta: string;
  }[];
}

export const BASE_CONHECIMENTO_TUTORIAL: TopicoTutorial[] = [
  {
    id: 'visao-geral-perfis',
    titulo: '1. Visão Geral, Perfis de Acesso e Segregação',
    subtitulo: 'Entenda os papéis de cada colaborador no Studio e o que cada um tem permissão para acessar.',
    categoria: 'geral',
    icone: 'ShieldCheck',
    descricao: 'O sistema conta com perfis de acesso estritamente segregados para proteger a confidencialidade financeira do salão e garantir que cada colaborador visualize exatamente o que precisa para exercer seu trabalho com excelência.',
    publicoAlvo: 'Todos os usuários (Secretária, Profissionais, Gestora e Administrador)',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Secretária / Recepção (STUDIO_SECRETARIA)',
        detalhes: 'Tem acesso à Agenda, cadastro de Clientes, atendimento no balcão e Fechamento Prévio da Comanda para liberação da cliente. NÃO tem acesso às comissões da equipe nem ao Demonstrativo Discriminado da Gestora.',
        dicaImportante: 'A secretária foca na experiência do cliente na chegada e na saída, recebendo o pagamento e liberando a cliente com agilidade.'
      },
      {
        passo: 2,
        titulo: 'Profissional na Cadeira (STUDIO_PROFISSIONAL)',
        detalhes: 'Acessa a aba "Meu Painel" no celular, tablet ou computador. Visualiza apenas seus próprios agendamentos, inicia procedimentos, registra insumos consumidos em tempo real na cadeira, edita dosagens e faz upsell de produtos de balcão com seu código de comissão.',
        dicaImportante: 'Cada profissional possui um PIN de segurança para autorizar retiradas e vendas.'
      },
      {
        passo: 3,
        titulo: 'Gestora do Salão (STUDIO_ADMIN)',
        detalhes: 'Acesso completo às regras de negócio do Studio: auditoria financeira definitiva em "/admin/pagamentos", conferência de comissões por profissional, retenção do fundo de insumos, lucro líquido do salão, tabela de serviços e estoque.',
        dicaImportante: 'Apenas a Gestora e o Dono visualizam o Demonstrativo Financeiro Completo.'
      },
      {
        passo: 4,
        titulo: 'Administrador Geral / Dono (ADMIN / isOwner)',
        detalhes: 'Controle irrestrito de todo o ecossistema: Studio, Academy (cursos, videoaulas, certificados), Loja Oficial, configurações do sistema, taxas de cartão e IA Assistente.'
      }
    ],
    perguntasFrequentes: [
      {
        pergunta: 'A secretária consegue ver quanto cada cabeleireiro vai ganhar de comissão?',
        resposta: 'Não. Por regra estrita de privacidade do salão, o Demonstrativo Discriminado com as comissões por profissional e margem líquida é 100% oculto para a Secretária. Ela apenas visualiza os procedimentos, insumos utilizados, produtos levados e o valor total cobrado da cliente.'
      },
      {
        pergunta: 'O profissional consegue ver os agendamentos dos colegas de equipe?',
        resposta: 'No "Meu Painel", o profissional tem uma visão focada exclusivamente nos clientes agendados para a sua cadeira e seu saldo de comissões acumuladas.'
      }
    ]
  },
  {
    id: 'fluxo-atendimento-completo',
    titulo: '2. Fluxo Completo de Atendimento (Passo a Passo)',
    subtitulo: 'Do pedido do cliente no site até o recebimento no caixa e a auditoria financeira.',
    categoria: 'recepcao',
    icone: 'CalendarDays',
    descricao: 'Como funciona o ciclo de vida de um agendamento no salão, garantindo sincronia perfeita entre a recepção, a bancada do profissional e o caixa.',
    publicoAlvo: 'Secretária, Profissionais e Gestora',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Chegada do Pedido na Agenda',
        detalhes: 'O cliente escolhe os serviços no site ou envia mensagem no WhatsApp. O agendamento entra na Agenda com o status "Agendado / Pendente" (card com borda neutra limpa). A secretária combina o horário exato e confirma.',
        dicaImportante: 'Ao confirmar, o status muda para "Pra ser atendido / Confirmado" (amarelo suave).'
      },
      {
        passo: 2,
        titulo: 'Início do Procedimento na Cadeira',
        detalhes: 'Quando a cliente senta na cadeira, o profissional abre o "Meu Painel" e clica em "Iniciar Atendimento". O status muda automaticamente na Agenda para "Em atendimento" (verde menta).',
        dicaImportante: 'Isso avisa toda a recepção que o serviço já está em execução.'
      },
      {
        passo: 3,
        titulo: 'Lançamento de Insumos em Tempo Real',
        detalhes: 'Conforme prepara descolorações, tonalizações ou tratamentos, o profissional ou seu assistente lança os produtos consumidos informando a etapa e a dosagem em gramas ou ml.',
        dicaImportante: 'O sistema utiliza o novo seletor com busca por digitação: basta digitar "keune", "ox", "pó" para selecionar rapidamente sem precisar rolar listas.'
      },
      {
        passo: 4,
        titulo: 'Edição de Insumo (Correção de Dosagem ou Troca)',
        detalhes: 'Se o profissional usou menos ou mais produto, ou se precisou trocar o pó descolorante, basta clicar no ícone de Lápis (✏️). O sistema calcula a diferença e ajusta o estoque com débito adicional ou estorno automático.',
        dicaImportante: 'O custo do procedimento e os itens da comanda são recalculados na mesma hora.'
      },
      {
        passo: 5,
        titulo: 'Venda de Produtos na Cadeira (Upsell)',
        detalhes: 'Se a cliente quiser levar um produto home care (shampoo, óleo reparador, máscara), o profissional clica em "Vender Produto (Upsell)". O produto é adicionado à comanda e a comissão da venda vai para a conta do profissional.',
        dicaImportante: 'A comissão só é liberada após a cliente efetuar o pagamento no caixa.'
      },
      {
        passo: 6,
        titulo: 'Encerramento na Cadeira e Envio para o Caixa',
        detalhes: 'Ao concluir o procedimento, o profissional clica em "Encerrar Atendimento". Na Agenda visual, o agendamento muda para "Finalizou e vai para pagamento" (azul pastel).',
        dicaImportante: 'A cliente é convidada a se dirigir à recepção para acertar a conta.'
      },
      {
        passo: 7,
        titulo: 'Fechamento Prévio no Balcão pela Secretária',
        detalhes: 'A secretária clica no card do agendamento para abrir o modal de checkout resumido. Confere os procedimentos, insumos, produtos de balcão levados, seleciona a forma de pagamento (PIX, Cartão, Dinheiro), o parcelamento e clica em "Liberar Cliente (Enviar p/ Gestão)".',
        dicaImportante: 'A cliente é liberada com rapidez. O atendimento entra em "PENDING_CONFIRMATION" para a conferência da Gestora.'
      },
      {
        passo: 8,
        titulo: 'Fechamento Definitivo e Auditoria pela Gestora',
        detalhes: 'A Gestora ou o Admin acessam a aba "Financeiro e Caixa" (/admin/pagamentos), conferem o Demonstrativo Discriminado Completo com as comissões calculadas por profissional, o fundo de produtos retido e a margem líquida do salão, e confirmam o recebimento.',
        dicaImportante: 'As comissões são creditadas no saldo a pagar de cada profissional e o caixa é fechado oficialmente.'
      }
    ],
    perguntasFrequentes: [
      {
        pergunta: 'O que acontece se a secretária esquecer de liberar a cliente?',
        resposta: 'O card continuará em azul pastel como "Finalizou e vai para pagamento". Basta clicar nele a qualquer momento, revisar os valores e clicar em "Liberar Cliente".'
      },
      {
        pergunta: 'Como funciona quando mais de um profissional atende a mesma cliente (Titular + Auxiliar)?',
        resposta: 'O sistema suporta comanda multi-profissional. Cada serviço pode ter seu executor e desconto individual, e os insumos podem ser atribuídos a quem aplicou. No fechamento, o rateio calcula a comissão correspondente de cada um de acordo com as regras cadastradas.'
      }
    ]
  },
  {
    id: 'gestao-estoque-insumos',
    titulo: '3. Controle de Estoque & Insumos por Grama (g/ml)',
    subtitulo: 'Como cadastrar produtos, precificar o custo por grama e controlar baixas automáticas.',
    categoria: 'estoque',
    icone: 'Package',
    descricao: 'Diferencial exclusivo do Studio Agnaldo Gomes: controle milimétrico de gramatura para descolorações, tinturas e tratamentos químicos, evitando desperdícios e apurando a margem líquida real de cada atendimento.',
    publicoAlvo: 'Estoquista, Gestora e Profissionais',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Diferença entre Insumo de Uso Interno e Produto de Venda',
        detalhes: 'Na aba "/admin/estoque", ao cadastrar ou editar um produto, marque "Uso em Procedimento" para insumos de bancada/lavatório (ex: OX, pó descolorante, tonalizante) e "Permitir Venda Balcão" para produtos de revenda ao cliente (ex: shampoo home care, finalizadores).',
        dicaImportante: 'Um mesmo produto pode ter ambas as opções ativadas se for usado no lavatório e também vendido na prateleira.'
      },
      {
        passo: 2,
        titulo: 'Cálculo do Custo por Grama/ML',
        detalhes: 'Ao cadastrar o produto (ex: Pó Keune 500g que custou R$ 250,00), o sistema calcula automaticamente o custo por grama (R$ 0,50/g). Quando o profissional lança 40g na cadeira, o sistema debita 40g do estoque e calcula o custo de R$ 20,00.',
        dicaImportante: 'Esse custo é absorvido no preço do procedimento e reembolsado ao salão no fundo de insumos.'
      },
      {
        passo: 3,
        titulo: 'Busca Inteligente por Digitação (Combobox)',
        detalhes: 'Em todos os campos de seleção de produto do sistema, não é necessário rolar listas compridas. Basta começar a digitar as primeiras letras do produto, marca ou categoria (ex: "keune", "blondor", "ox 30") para filtrar instantaneamente.',
        dicaImportante: 'O seletor mostra o estoque disponível e o preço/custo atualizado.'
      },
      {
        passo: 4,
        titulo: 'Movimentações e Alertas de Estoque Mínimo',
        detalhes: 'O sistema registra cada saída com o tipo OUT_PROCEDURE (baixa por procedimento) ou OUT_SALE (venda no balcão) vinculada ao agendamento. Se o estoque cair abaixo do ponto de reposição, o sistema exibe alertas visuais em laranja/vermelho na aba de Estoque.',
        dicaImportante: 'Você pode realizar entradas de notas a qualquer momento clicando em "Nova Entrada".'
      }
    ],
    perguntasFrequentes: [
      {
        pergunta: 'Se eu editar um insumo lançado de 45g para 20g, o que acontece com as 25g restantes?',
        resposta: 'O sistema estorna automaticamente 25g de volta para o saldo em estoque, registra a movimentação de estorno e diminui o custo total do procedimento.'
      },
      {
        pergunta: 'E se eu trocar o produto Keune por Wella na edição?',
        resposta: 'O sistema estorna integralmente a quantidade do produto Keune e debita a dosagem do produto Wella do estoque, sem deixar furos no inventário.'
      }
    ]
  },
  {
    id: 'financeiro-comissoes-caixa',
    titulo: '4. Financeiro, Comissões e Auditoria do Caixa',
    subtitulo: 'Regras de repasse, taxas de maquininha, retenção de fundo e fechamento definitivo.',
    categoria: 'gestao',
    icone: 'DollarSign',
    descricao: 'Como a Gestora do Salão e o Admin auditam as comandas fechadas pela recepção, conferem o Demonstrativo Discriminado e consolidam o caixa com segurança e transparência.',
    publicoAlvo: 'Gestora do Salão e Administrador',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Acesso à Tela de Pagamentos e Caixa (/admin/pagamentos)',
        detalhes: 'Após a secretária realizar o Fechamento Prévio no balcão e liberar a cliente, o atendimento fica com status pendente de confirmação na aba "Financeiro e Caixa".',
        dicaImportante: 'Essa tela é exclusiva para quem tem perfil de Gestora ou Admin.'
      },
      {
        passo: 2,
        titulo: 'Análise do Demonstrativo Discriminado da Gestora',
        detalhes: 'Para cada atendimento, a gestora visualiza: 1) Total cobrado da cliente; 2) Descontos concedidos; 3) Taxa da maquininha descontada; 4) Fundo de reposição de insumos retido pelo salão; 5) Comissão líquida calculada de cada profissional envolvido; 6) Margem líquida do salão.',
        dicaImportante: 'Garante que o salão nunca pague comissão sobre o custo de produtos químicos nem sobre a taxa da operadora de cartão.'
      },
      {
        passo: 3,
        titulo: 'Regras de Comissão Personalizadas',
        detalhes: 'Na aba "Comissões", é possível configurar percentuais diferentes por profissional e categoria de serviço (ex: 40% em mechas, 50% em corte, 10% em produtos de balcão).',
        dicaImportante: 'O sistema aplica a regra automaticamente no momento do fechamento.'
      },
      {
        passo: 4,
        titulo: 'Confirmação Definitiva do Atendimento',
        detalhes: 'Ao clicar em "Confirmar Pagamento e Comissões", o status financeiro muda para "CONFIRMED". Os valores entram no saldo a pagar do profissional e no fluxo de caixa consolidado do dia.',
        dicaImportante: 'O relatório diário do Agnaldo é atualizado instantaneamente.'
      }
    ],
    perguntasFrequentes: [
      {
        pergunta: 'Como o salão desconta as taxas da maquininha de cartão?',
        resposta: 'Na aba de configurações financeiras, cadastre as taxas de Débito, Crédito à Vista e Parcelado. O sistema abate a taxa proporcional do valor bruto antes de calcular a divisão de comissão.'
      },
      {
        pergunta: 'O que é o Fundo de Produtos?',
        resposta: 'É o valor em reais correspondente aos produtos químicos (descolorantes, tintas, ampolas) gastos no atendimento. Esse valor fica com o salão para repor o estoque e não entra na base de cálculo da comissão do cabeleireiro.'
      }
    ]
  },
  {
    id: 'dia-da-noiva-exclusivo',
    titulo: '5. Módulo Exclusivo: Dia da Noiva',
    subtitulo: 'Gestão de orçamentos, contratos, sinal de 50% obrigatório e bloqueio de datas.',
    categoria: 'noivas',
    icone: 'Heart',
    descricao: 'Fluxo especial para noivas no Studio Agnaldo Gomes, onde datas concorridas são reservadas com exclusividade mediante sinal e contrato assinado.',
    publicoAlvo: 'Secretária, Gestora e Mestre Agnaldo Gomes',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Recebimento do Pedido de Orçamento',
        detalhes: 'A noiva preenche o formulário no site escolhendo a data do casamento, local (no Studio ou externa) e serviços para ela e acompanhantes (mães, madrinhas, daminhas).',
        dicaImportante: 'O pedido aparece na aba "/admin/noivas" com status "Novo Pedido".'
      },
      {
        passo: 2,
        titulo: 'Elaboração e Aprovação da Proposta',
        detalhes: 'A secretária ou gestora entra em contato pelo WhatsApp, alinha os detalhes do cronograma (teste de penteado, maquiagem, pré-wedding) e define o Valor Total Fechado.',
        dicaImportante: 'Lembre-se que os preços no site são valores base "A partir de".'
      },
      {
        passo: 3,
        titulo: 'Regra Rígida do Sinal de 50% via PIX',
        detalhes: 'Para a data ser bloqueada na agenda exclusiva do Agnaldo, é obrigatório o pagamento de 50% de sinal via PIX dinâmico gerado pelo sistema (Mercado Pago / Asaas).',
        dicaImportante: 'Enquanto o sinal não for pago e marcado no sistema, a data permanece disponível para outras clientes.'
      },
      {
        passo: 4,
        titulo: 'Assinatura do Contrato e Bloqueio Definitivo',
        detalhes: 'Após confirmar o sinal e o contrato assinado, o sistema cria automaticamente o bloqueio de agenda do mestre Agnaldo Gomes na data do casamento, garantindo atendimento VIP e sem conflitos de horários.',
        dicaImportante: 'O saldo restante (50%) é agendado para quitação na semana do evento.'
      }
    ],
    perguntasFrequentes: [
      {
        pergunta: 'A noiva pode agendar o Dia da Noiva diretamente pelo agendamento comum?',
        resposta: 'Não. O Dia da Noiva possui formulário e fluxo próprio de orçamento em "/noivas", pois exige reserva de dia inteiro, teste prévio de maquiagem e equipe dedicada.'
      }
    ]
  },
  {
    id: 'academy-cursos-certificados',
    titulo: '6. Agnaldo Gomes Academy (Cursos & Alunos)',
    subtitulo: 'Gestão de turmas presenciais, cursos VIP, videoaulas e certificados autenticados.',
    categoria: 'academy',
    icone: 'GraduationCap',
    descricao: 'Plataforma educacional voltada para cabeleireiros e profissionais da beleza que desejam se especializar nas técnicas autorais do mestre Agnaldo Gomes.',
    publicoAlvo: 'Alunos, Instrutores e Administrador',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Estrutura dos Cursos (Presenciais, VIP e Online)',
        detalhes: 'A Academy oferece turmas presenciais em grupo, Cursos VIP individuais (com prática em modelo) e cursos 100% online com videoaulas gravadas com player seguro.',
        dicaImportante: 'Os cursos VIP possuem agenda dedicada em "/admin-academy/agenda-vip".'
      },
      {
        passo: 2,
        titulo: 'Área do Aluno (/aluno)',
        detalhes: 'O aluno faz login com seu e-mail e senha, acessa o catálogo de cursos adquiridos, assiste às aulas com controle de progresso e participa da comunidade interna.',
        dicaImportante: 'Ao concluir 100% das aulas de um curso, o certificado é liberado automaticamente.'
      },
      {
        passo: 3,
        titulo: 'Certificados Digitais com Autenticação e QR Code',
        detalhes: 'Cada certificado gerado possui um código hash único criptográfico e um QR Code. Qualquer pessoa ou empregador pode verificar a autenticidade na página pública "/verificar-certificado".',
        dicaImportante: 'O aluno pode baixar o certificado oficial em PDF pronto para impressão de alta qualidade.'
      }
    ],
    perguntasFrequentes: [
      {
        pergunta: 'Como o aluno recupera a senha da Academy?',
        resposta: 'Na tela de login da Academy ("/academy/login"), há o link "Esqueci minha senha" que envia um link seguro de redefinição para o e-mail cadastrado.'
      }
    ]
  },
  {
    id: 'loja-afiliados-mercadolivre',
    titulo: '7. Loja Oficial & Afiliados Mercado Livre',
    subtitulo: 'Venda de cosméticos de estoque local vs equipamentos afiliados do Mercado Livre.',
    categoria: 'loja',
    icone: 'ShoppingBag',
    descricao: 'Como a loja online funciona com dois modelos complementares: cosméticos de estoque físico entregues pelo salão e equipamentos de ponta redirecionados com link oficial de afiliado.',
    publicoAlvo: 'Recepção, Clientes e Administrador',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Produtos de Estoque Local (LOCAL_STOCK)',
        detalhes: 'Shampoos, condicionadores, máscaras e ampolas que o salão tem em prateleira. O cliente adiciona ao carrinho na loja (/loja), calcula o frete e finaliza no checkout próprio.',
        dicaImportante: 'A entrega pode ser retirada no balcão ou via motoboy local.'
      },
      {
        passo: 2,
        titulo: 'Produtos Afiliados Mercado Livre (AFFILIATE_ML)',
        detalhes: 'Secadores profissionais, pranchas, babyliss e ferramentas de alto investimento. Ao clicar em "Ver Oferta", o sistema abre imediatamente o link oficial do produto no Mercado Livre em nova aba.',
        dicaImportante: 'O cliente compra direto no Mercado Livre com frete grátis Full e o Studio recebe a comissão de afiliado.'
      },
      {
        passo: 3,
        titulo: 'Links de Afiliados dos Profissionais (Vitrine na Cadeira)',
        detalhes: 'No "Meu Painel", cada cabeleireiro possui links personalizados com seu identificador. Eles podem enviar via WhatsApp para suas clientes e receber comissão mesmo se a cliente comprar de casa.',
        dicaImportante: 'Aumenta o ticket médio e a renda dos profissionais parceiros.'
      }
    ],
    perguntasFrequentes: [
      {
        pergunta: 'Por que o botão "Ver Oferta" não adiciona ao carrinho?',
        resposta: 'Porque produtos de afiliados são comprados diretamente na plataforma do Mercado Livre com garantia oficial. O carrinho local é exclusivo para cosméticos do estoque físico do Studio.'
      }
    ]
  },
  {
    id: 'automacoes-crm-whatsapp',
    titulo: '8. Robô de WhatsApp & Automações de CRM',
    subtitulo: 'Lembretes automáticos, mensagens de aniversariantes e reativação de clientes inativos.',
    categoria: 'geral',
    icone: 'Bot',
    descricao: 'Recursos automatizados do sistema para manter a agenda cheia e fidelizar clientes sem sobrecarregar a recepção.',
    publicoAlvo: 'Secretária, Marketing e Administrador',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Lembrete Automático 24h Antes',
        detalhes: 'O robô envia automaticamente uma mensagem personalizada de WhatsApp para o cliente na véspera do atendimento confirmando o horário e o profissional.',
        dicaImportante: 'Reduz o índice de faltas e atrasos em mais de 80%.'
      },
      {
        passo: 2,
        titulo: 'Mensagem de Aniversário com Cortesia',
        detalhes: 'Todos os dias às 09:00, o sistema detecta os aniversariantes cadastrados e envia votos carinhosos com um desconto exclusivo para um procedimento no mês.',
        dicaImportante: 'Fideliza e gera novas visitas de forma 100% automática.'
      },
      {
        passo: 3,
        titulo: 'Reativação de Clientes Inativos (+45 dias)',
        detalhes: 'Clientes que não visitam o salão há mais de 45 dias recebem uma mensagem carinhosa convidando para retoque de mechas, hidratação ou corte.',
        dicaImportante: 'Recupera clientes que estavam esquecidos sem precisar ligar manualmente.'
      }
    ],
    perguntasFrequentes: [
      {
        pergunta: 'Como sei se o robô do WhatsApp está conectado?',
        resposta: 'Na aba "/admin/sistema" ou na barra de status do painel, há o indicador da instância do WhatsApp com status Verde (Conectado) ou QR Code para escanear.'
      }
    ]
  }
];

/**
 * Função de Inteligência e Fallback para a IA Assistente:
 * Analisa a pergunta do usuário e extrai a melhor resposta com base no Manual e Tutorial do Sistema.
 */
export function responderDuvidaComTutorial(pergunta: string): string {
  const p = (pergunta || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (!p) {
    return 'Olá! Sou a Assistente Virtual do Studio & Academy Agnaldo Gomes. Em que posso ajudar você hoje sobre o funcionamento do salão, agenda, insumos ou financeiro?';
  }

  // 1. DÚVIDA SOBRE INSUMOS / GASTO DE PRODUTOS / GRAMATURA
  if (p.includes('insumo') || p.includes('grama') || p.includes('dosagem') || p.includes('editar insumo') || p.includes('quantidade usada') || p.includes('ox ') || p.includes('descolorante')) {
    return `🧪 **COMO FUNCIONA O LANÇAMENTO E EDIÇÃO DE INSUMOS:**

1. **Lançamento na Cadeira (Meu Painel):**
   • O profissional ou assistente clica em **"Lançar Insumos"** durante o atendimento.
   • Escolhe a **Etapa** (Descoloração, Tonalização, Lavatório, etc.).
   • No campo **"Produto (Estoque)"**, basta **digitar o nome** (ex: *Keune, Ox 30, Pó*) para buscar instantaneamente com o novo combobox inteligente.
   • Informa a quantidade usada em gramas ou ml (ex: *35g*) e clica em **"+ Lançar"**.

2. **Edição do Insumo (Correção / Troca):**
   • Se errou a dosagem ou trocou o produto, clique no ícone de **Lápis (✏️)** ao lado do insumo na lista.
   • A linha ganha destaque dourado e o formulário entra em modo edição.
   • Corrija a quantidade ou o produto e clique em **"Salvar Edição"**.
   • O sistema ajusta o estoque na hora: se diminuiu a quantidade, **estorna** a sobra; se aumentou, **debita** apenas o acréscimo.

3. **Quem visualiza os Insumos?**
   • O Profissional lança na bancada.
   • A Secretária vê o resumo da quantidade de itens e o custo total absorvido no serviço.
   • A Gestora/Admin audita no demonstrativo financeiro para reter o fundo de reposição do salão.`;
  }

  // 2. DÚVIDA SOBRE SECRETÁRIA, FECHAMENTO PRÉVIO E PRIVACIDADE DE COMISSÕES
  if (p.includes('secretaria') || p.includes('recepcao') || p.includes('liberar cliente') || p.includes('fechamento previo') || (p.includes('comissao') && (p.includes('ver') || p.includes('ocult') || p.includes('secret')))) {
    return `🛎️ **FECHAMENTO PRÉVIO DA SECRETÁRIA & REGRAS DE PRIVACIDADE:**

1. **Tela Limpa e Direta no Balcão:**
   • Quando o profissional encerra o atendimento, o agendamento muda para azul pastel (*"Finalizou e vai para pagamento"*).
   • A Secretária abre o checkout e tem uma tela focada no atendimento ao cliente:
     - Dados da Cliente e Data;
     - Procedimentos realizados e executores (com descontos aplicados);
     - Insumos utilizados no atendimento (resumo de itens e custo absorvido);
     - Produtos de Home Care / Balcão levados pela cliente;
     - Forma de pagamento (PIX, Dinheiro, Cartão) e parcelas;
     - **Valor Total a Pagar pela Cliente** em destaque visual elegante.

2. **Privacidade Rigorosa de Comissões:**
   • O card *"Demonstrativo Discriminado para a Gestora do Salão"* é **100% OCULTO** para o perfil da Secretária.
   • Ela **NÃO** visualiza as comissões individuais de cada cabeleireiro, retenção de fundo ou margem líquida do salão.

3. **Liberar Cliente:**
   • A Secretária clica no botão **"Liberar Cliente (Enviar p/ Gestão)"**.
   • A cliente é liberada no balcão e o atendimento é enviado com status pendente de confirmação para a Gestora do Studio e o Admin auditarem o financeiro completo em **/admin/pagamentos**.`;
  }

  // 3. DÚVIDA SOBRE FINANCEIRO, CAIXA DEFINITIVO E DEMONSTRATIVO DA GESTORA
  if (p.includes('financeiro') || p.includes('caixa') || p.includes('gestora') || p.includes('demonstrativo') || p.includes('auditoria') || p.includes('pagamentos')) {
    return `💼 **FINANCEIRO, CAIXA E DEMONSTRATIVO PARA A GESTORA:**

1. **Onde Auditar:**
   • Acesse a aba **"Financeiro e Caixa"** (\`/admin/pagamentos\`).
   • Disponível exclusivamente para a **Gestora do Studio** (\`STUDIO_ADMIN\`) e **Administrador Geral** (\`ADMIN\` / Dono).

2. **O que o Demonstrativo Discriminado exibe:**
   • **Faturamento Bruto**: Valor total pago pela cliente.
   • **Taxas de Maquininha**: Abatimento da tarifa de cartão antes da distribuição.
   • **Fundo de Produtos**: Custo de insumos químicos retido integralmente pelo salão para reposição.
   • **Comissões Líquidas**: Valor exato que cada profissional (Titular e Assistentes) tem a receber.
   • **Margem Líquida do Salão**: O lucro que fica com o Studio após comissões, insumos e taxas.

3. **Confirmação Definitiva:**
   • A Gestora clica em **"Confirmar Pagamento e Fechamento"** para liquidar o atendimento, alimentando o saldo a pagar dos profissionais e os relatórios executivos.`;
  }

  // 4. DÚVIDA SOBRE COMO BUSCAR PRODUTOS NO ESTOQUE / AUTOCOMPLETE
  if (p.includes('buscar produto') || p.includes('digitar produto') || p.includes('achar produto') || p.includes('combobox') || p.includes('autocomplete') || p.includes('pesquisar produto')) {
    return `🔍 **BUSCA INTELIGENTE DE PRODUTOS (NOVO SELETOR COM DIGITAÇÃO):**

• Em **TODOS** os campos de seleção de produtos do sistema (Insumos na Agenda, Fechamento de Comanda, Meu Painel e Caixa Rápido), agora você conta com o seletor com **busca por digitação**.
• **Como usar:**
  1. Clique no campo e comece a digitar qualquer parte do nome, marca ou categoria (ex: *"keune"*, *"shampoo"*, *"ox"*, *"30"*).
  2. A busca ignora acentos (ex: *"oleo"* acha *"Óleo"* e *"pos"* acha *"Pó"*).
  3. A lista filtra instantaneamente na tela exibindo a quantidade em estoque e o preço/custo.
  4. Pressione as setas e a tecla **Enter** ou clique no produto desejado para selecioná-lo.
  5. Para trocar, basta clicar no **"X"** ao lado do produto selecionado para buscar outro.`;
  }

  // 5. DÚVIDA SOBRE DIA DA NOIVA
  if (p.includes('noiva') || p.includes('casamento') || p.includes('sinal') || p.includes('madrinha') || p.includes('pre-wedding')) {
    return `💍 **FLUXO EXCLUSIVO DO DIA DA NOIVA:**

1. **Orçamento Próprio:**
   • Os pedidos entram na aba **"/admin/noivas"**.
   • O Studio entra em contato com a noiva pelo WhatsApp e alinha o cronograma (cabelo, make, teste prévio e acompanhantes).

2. **Regra Obrigatória do Sinal de 50%:**
   • Para bloquear com exclusividade a data na agenda do mestre Agnaldo Gomes, a noiva **deve pagar 50% de sinal** via PIX.
   • Sem o sinal confirmado, a data permanece aberta para outras clientes.

3. **Contrato Assinado:**
   • O contrato é assinado e anexado à ficha da noiva no sistema.
   • A data é travada na agenda visual com bloqueio total para outros agendamentos no horário.`;
  }

  // 6. DÚVIDA SOBRE UPSELL / VENDA DE PRODUTOS PELO PROFISSIONAL
  if (p.includes('upsell') || p.includes('vender produto') || p.includes('comissao de produto') || p.includes('prateleira')) {
    return `🛍️ **VENDA DE PRODUTOS (UPSELL) NA CADEIRA:**

1. **Como o Profissional Lança:**
   • Durante o atendimento, no **"Meu Painel"**, clique em **"Vender Produto (Upsell)"**.
   • Digite o nome do produto home care (shampoo, óleo, máscara), informe a quantidade e clique em adicionar.

2. **Como a Comissão é Gerada:**
   • O produto entra automaticamente na comanda da cliente.
   • A Secretária recebe o valor no fechamento do balcão.
   • Assim que o pagamento é concluído, a comissão de venda de produto cadastrada para aquele profissional é creditada no saldo dele.`;
  }

  // 7. DÚVIDA SOBRE ACADEMY, CURSOS E CERTIFICADOS
  if (p.includes('academy') || p.includes('curso') || p.includes('certificado') || p.includes('aluno') || p.includes('videoaula') || p.includes('vip')) {
    return `🎓 **AGNALDO GOMES ACADEMY (CURSOS E CERTIFICADOS):**

1. **Tipos de Cursos:**
   • **Presenciais em Turma**: Cursos práticos no centro técnico do Studio.
   • **Cursos VIP**: Treinamento individual com Agnaldo Gomes com modelo exclusiva.
   • **Online**: Videoaulas gravadas com controle de progresso na Área do Aluno (\`/aluno\`).

2. **Certificados Digitais Autenticados:**
   • Ao atingir 100% de conclusão, o certificado é emitido automaticamente.
   • Contém chave de validação criptográfica e **QR Code**.
   • Qualquer pessoa pode confirmar a autenticidade na página pública **/verificar-certificado**.`;
  }

  // 8. DÚVIDA SOBRE A LOJA E MERCADO LIVRE
  if (p.includes('loja') || p.includes('mercado livre') || p.includes('afiliado') || p.includes('ver oferta') || p.includes('carrinho')) {
    return `🏪 **LOJA OFICIAL & AFILIADOS MERCADO LIVRE:**

1. **Cosméticos Locais (Estoque Físico):**
   • Produtos que o salão tem em estoque físico (shampoos, máscaras, kits de tratamento).
   • Adicionados ao carrinho virtual e comprados com checkout próprio do salão para retirada ou envio.

2. **Equipamentos e Afiliados Mercado Livre:**
   • Pranchas, secadores e máquinas profissionais.
   • Ao clicar em **"Ver Oferta"**, o sistema abre o link oficial do produto no Mercado Livre em nova aba.
   • O cliente compra com segurança Full no Mercado Livre e o Studio recebe a comissão de afiliado.`;
  }

  // 9. DÚVIDA SOBRE AGENDA E STATUS
  if (p.includes('agenda') || p.includes('status') || p.includes('cores') || p.includes('remarcar') || p.includes('cancelar')) {
    return `📅 **CORES E PROCESSOS DA AGENDA:**

• **Pendente / Agendado (Branco/Neutro):** Pedido recebido do site, aguardando confirmação de horário da recepção.
• **Confirmado / Pra ser atendido (Amarelo pastel):** Horário fixado e profissional reservado.
• **Em atendimento (Verde menta):** Cliente já sentou na cadeira e o profissional iniciou o procedimento.
• **Finalizou / Vai para pagamento (Azul pastel):** Procedimento encerrado, cliente a caminho do caixa para fechar a comanda.
• **Concluído (Cinza/Neutro):** Comanda paga, cliente liberada e financeiro auditado.`;
  }

  // 10. RESPOSTA GERAL / VISÃO GERAL
  return `✨ **MANUAL DO SISTEMA STUDIO & ACADEMY AGNALDO GOMES:**

Olá! Sou a Assistente do Sistema. Como a chave da API externa de IA ainda não foi inserida na hospedagem, estou respondendo com base no **Manual e Tutorial Oficial Integrado do Studio**.

**Principais tópicos em que posso ajudar:**
1. 🧪 **Insumos por Grama:** Como lançar na cadeira, buscar por digitação e editar dosagens com ajuste de estoque.
2. 🛎️ **Secretária no Balcão:** Como fazer o Fechamento Prévio sem exibir comissões confidenciais e liberar a cliente.
3. 💼 **Gestora & Financeiro:** Como auditar o demonstrativo completo, reter o fundo de produtos e aprovar comissões em \`/admin/pagamentos\`.
4. 🛍️ **Vendas & Upsell:** Como o profissional ganha comissão vendendo produtos home care na bancada.
5. 💍 **Dia da Noiva:** Regras do sinal de 50% obrigatório e bloqueio exclusivo de data na agenda do Agnaldo.
6. 🎓 **Academy:** Cursos presenciais/VIPs e emissão de certificados digitais autenticados por QR Code.

*Digite sua dúvida (ex: "como lanço insumo?", "como a secretária libera a cliente?", "como funciona a comissão?") que explicarei o passo a passo exato!*`;
}
