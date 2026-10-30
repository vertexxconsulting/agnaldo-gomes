export interface SessaoMarketingConfig {
  ativo: boolean;
  horario: string; // Formato "HH:MM", ex: "09:00"
}

export interface FeedbackMarketingConfig extends SessaoMarketingConfig {
  tipo_filtro?: 'todos' | 'selecionados'; // 'todos' ou 'selecionados'
  servicos_permitidos?: string[]; // IDs dos serviços específicos permitidos
  categorias_permitidas?: string[]; // Nomes das categorias permitidas (ex: 'Coloração', 'Tratamentos')
}

export interface MarketingAutomacaoConfig {
  aniversarios: SessaoMarketingConfig;
  agenda_confirmacao: SessaoMarketingConfig;
  agenda_lembrete: SessaoMarketingConfig;
  feedback: FeedbackMarketingConfig;
  reativacao: SessaoMarketingConfig;
  intervalo_segundos: number; // Mínimo 60 segundos
}

export const CONFIG_PADRAO_MARKETING: MarketingAutomacaoConfig = {
  aniversarios: { ativo: false, horario: '09:00' },
  agenda_confirmacao: { ativo: false, horario: '09:30' },
  agenda_lembrete: { ativo: false, horario: '08:30' },
  feedback: {
    ativo: false,
    horario: '16:00',
    tipo_filtro: 'todos',
    servicos_permitidos: [],
    categorias_permitidas: [],
  },
  reativacao: { ativo: false, horario: '11:00' },
  intervalo_segundos: 60, // Intervalo mínimo de 1 minuto entre envios
};
