/**
 * Client da API do CRM Bolten (Beta).
 * Docs: https://bolten.gitbook.io/bolten-docs/configuracoes-avancadas/api
 *
 * Autenticação via Bearer token (chave de API por usuário).
 * Rate limit: 1 requisição/segundo por chave (verificado a cada 10s).
 * As entidades (opportunities/contacts) têm campos dinâmicos por projeto —
 * usar /schema antes de criar/atualizar.
 *
 * Este client funciona em modo configurado (env BOLTEN_API_KEY etc.)
 * e em modo demo (sem chaves), retornando dados de demonstração para
 * que o painel do Bolten possa ser visualizado antes da configuração.
 */

const BASE_URL = 'https://app.bolten.io';

export interface BoltenConfig {
  apiKey: string;
  projectId: string;
  kanbanComponentId: string;
  contactComponentId: string;
  webhookKey?: string;
  webhookUrl?: string;
  ativo?: boolean;
}

export type StatusSyncPayload = {
  opportunityId: string;
  status: 'confirmado' | 'em_atendimento' | 'concluido' | 'cancelado' | 'no_show';
  nome: string;
  telefone: string;
  email?: string | null;
  servico: string;
  profissional: string;
  data: string;
  hora: string;
  valor: number;
};

// Armazenamento em memória/servidor para persistência dinâmica
let dynamicBoltenConfig: BoltenConfig | null = null;

export function setDynamicBoltenConfig(cfg: BoltenConfig) {
  dynamicBoltenConfig = cfg;
}

export function getBoltenConfig(): BoltenConfig | null {
  if (dynamicBoltenConfig && (dynamicBoltenConfig.apiKey || dynamicBoltenConfig.webhookUrl)) {
    return dynamicBoltenConfig;
  }

  const apiKey = process.env.BOLTEN_API_KEY || '';
  const projectId = process.env.BOLTEN_PROJECT_ID || '';
  const kanbanComponentId = process.env.BOLTEN_KANBAN_COMPONENT_ID || '';
  const contactComponentId = process.env.BOLTEN_CONTACT_COMPONENT_ID || '';
  const webhookKey = process.env.BOLTEN_WEBHOOK_KEY || '';
  const webhookUrl = process.env.BOLTEN_WEBHOOK_URL || '';

  if (!apiKey && !webhookUrl) {
    return null;
  }
  return { apiKey, projectId, kanbanComponentId, contactComponentId, webhookKey, webhookUrl, ativo: true };
}

// ── Rate limiting (1 req/s por chave) ──────────────────────────
let lastRequestAt = 0;
async function throttle() {
  const now = Date.now();
  const wait = Math.max(0, 1000 - (now - lastRequestAt));
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequestAt = Date.now();
}

export async function boltenFetch<T = any>(
  config: BoltenConfig,
  path: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null; status: number }> {
  await throttle();
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { data: null, error: `Bolten API ${res.status}: ${body.slice(0, 200)}`, status: res.status };
    }
    const data = (await res.json()) as T;
    return { data, error: null, status: res.status };
  } catch (err: any) {
    return { data: null, error: `Falha de rede ao contatar a Bolten: ${err?.message ?? err}`, status: 0 };
  }
}

// ── Endpoints ──────────────────────────────────────────────────
export async function boltenListProjects(config: BoltenConfig) {
  return boltenFetch<any>(config, `/clients/api/v1/projects`);
}

export async function boltenListComponents(config: BoltenConfig, projectId: string) {
  return boltenFetch<any>(config, `/clients/api/v1/projects/${projectId}/components`);
}

export async function boltenListOpportunities(
  config: BoltenConfig,
  componentId: string,
  page = 1,
  limit = 50
) {
  return boltenFetch<any>(
    config,
    `/kanban/api/v1/${componentId}/opportunities?page=${page}&limit=${limit}`
  );
}

export async function boltenCreateOpportunity(config: BoltenConfig, componentId: string, attributes: Record<string, any>) {
  return boltenFetch<any>(
    config,
    `/kanban/api/v1/${componentId}/opportunities`,
    { method: 'POST', body: JSON.stringify({ attributes }) }
  );
}

export async function boltenUpdateOpportunity(config: BoltenConfig, componentId: string, oppId: string, attributes: Record<string, any>) {
  return boltenFetch<any>(
    config,
    `/kanban/api/v1/${componentId}/opportunities/${oppId}`,
    { method: 'PATCH', body: JSON.stringify({ attributes }) }
  );
}

export async function boltenGetOpportunity(config: BoltenConfig, componentId: string, oppId: string) {
  return boltenFetch<any>(config, `/kanban/api/v1/${componentId}/opportunities/${oppId}`);
}

export async function boltenListContacts(config: BoltenConfig, componentId: string, page = 1, limit = 50) {
  return boltenFetch<any>(
    config,
    `/contact/api/v1/${componentId}/contacts?page=${page}&limit=${limit}`
  );
}

export async function boltenCreateContact(config: BoltenConfig, componentId: string, attributes: Record<string, any>) {
  return boltenFetch<any>(
    config,
    `/contact/api/v1/${componentId}/contacts`,
    { method: 'POST', body: JSON.stringify({ attributes }) }
  );
}

export async function boltenSchema(config: BoltenConfig, path: string) {
  return boltenFetch<any>(config, path);
}

// ── Sincronização Automática com Bolten CRM ──────────────────────
export interface AgendamentoSyncPayload {
  id: string;
  nome: string;
  telefone: string;
  email?: string | null;
  servico: string;
  profissional: string;
  data: string;
  hora: string;
  valor: number;
  isNoiva?: boolean;
}

export async function sincronizarAgendamentoComBolten(payload: AgendamentoSyncPayload): Promise<{
  sucesso: boolean;
  modo: 'real' | 'simulado';
  opportunityId?: string;
  error?: string | null;
}> {
  const config = getBoltenConfig();

  // 1. Enviar para Webhook dedicado se configurado
  if (config?.webhookUrl) {
    try {
      await fetch(config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.webhookKey ? { 'x-api-key': config.webhookKey } : {}),
        },
        body: JSON.stringify({
          event: payload.isNoiva ? 'noiva.agendamento_criado' : 'agendamento.criado',
          timestamp: new Date().toISOString(),
          data: payload,
        }),
      });
      console.log(`[bolten] Webhook disparado com sucesso para ${payload.nome}`);
    } catch (err: any) {
      console.warn(`[bolten] Falha ao enviar para webhook: ${err?.message || err}`);
    }
  }

  // 2. Se a API estiver configurada com Chave e Componentes
  if (config?.apiKey && config?.projectId) {
    try {
      // Criar Contato se houver contactComponentId
      if (config.contactComponentId) {
        await boltenCreateContact(config, config.contactComponentId, {
          Nome: payload.nome,
          Telefone: payload.telefone,
          'E-mail': payload.email || '',
        });
      }

      // Criar Oportunidade no Kanban
      if (config.kanbanComponentId) {
        const oppRes = await boltenCreateOpportunity(config, config.kanbanComponentId, {
          Name: `${payload.nome} — ${payload.servico}`,
          'E-mail': payload.email || '',
          Status: payload.isNoiva ? 'Dia da Noiva (Sinal)' : 'Novo Agendamento',
          Valor: payload.valor,
          Data: `${payload.data} ${payload.hora}`,
          Servico: payload.servico,
          Profissional: payload.profissional,
          Contato: {
            Nome: payload.nome,
            Telefone: payload.telefone,
          },
        });

        if (oppRes.data) {
          console.log(`[bolten] Oportunidade criada no Bolten CRM: ID ${oppRes.data.id || 'OK'}`);
          return { sucesso: true, modo: 'real', opportunityId: oppRes.data.id };
        }
      }

      return { sucesso: true, modo: 'real' };
    } catch (err: any) {
      console.error('[bolten] Erro na sincronização com a API:', err);
      return { sucesso: false, modo: 'real', error: err?.message || 'Erro de comunicação' };
    }
  }

  // Modo simulação quando ainda não configurado
  console.log(`[bolten-simulado] Agendamento registrado localmente: ${payload.nome} (${payload.servico}) - R$ ${payload.valor}`);
  return { sucesso: true, modo: 'simulado' };
}

// ── Sincronização de Status de Agendamento com Bolten CRM ──────────
const STATUS_TO_BOLTEN: Record<string, string> = {
  confirmado: 'Confirmado',
  em_atendimento: 'Em Atendimento',
  concluido: 'Atendimento Concluído',
  cancelado: 'Cancelado',
  no_show: 'No-Show',
};

export async function sincronizarStatusAgendamentoComBolten(payload: StatusSyncPayload): Promise<{
  sucesso: boolean;
  modo: 'real' | 'simulado';
  error?: string | null;
}> {
  const config = getBoltenConfig();

  if (!config?.apiKey || !config?.projectId || !config?.kanbanComponentId) {
    console.log(`[bolten-simulado] Status atualizado localmente: ${payload.nome} -> ${payload.status}`);
    return { sucesso: true, modo: 'simulado' };
  }

  try {
    const statusBolten = STATUS_TO_BOLTEN[payload.status] || payload.status;

    // Atualizar oportunidade no Kanban
    const oppRes = await boltenUpdateOpportunity(config, config.kanbanComponentId!, payload.opportunityId, {
      Status: statusBolten,
    });

    // Também disparar webhook se configurado
    if (config.webhookUrl) {
      try {
        await fetch(config.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(config.webhookKey ? { 'x-api-key': config.webhookKey } : {}),
          },
          body: JSON.stringify({
            event: `agendamento.status_${payload.status}`,
            timestamp: new Date().toISOString(),
            data: {
              opportunityId: payload.opportunityId,
              nome: payload.nome,
              servico: payload.servico,
              profissional: payload.profissional,
              data: payload.data,
              hora: payload.hora,
              valor: payload.valor,
              status: payload.status,
              statusBolten,
            },
          }),
        });
        console.log(`[bolten] Webhook de status disparado: ${payload.status} para ${payload.nome}`);
      } catch (err: any) {
        console.warn(`[bolten] Falha ao enviar webhook de status: ${err?.message || err}`);
      }
    }

    if (oppRes.error) {
      console.error('[bolten] Erro ao atualizar oportunidade no Bolten:', oppRes.error);
      return { sucesso: false, modo: 'real', error: oppRes.error };
    }

    console.log(`[bolten] Status atualizado no Bolten CRM: ${payload.nome} -> ${statusBolten}`);
    return { sucesso: true, modo: 'real' };
  } catch (err: any) {
    console.error('[bolten] Erro na sincronização de status com a API:', err);
    return { sucesso: false, modo: 'real', error: err?.message || 'Erro de comunicação' };
  }
}

// ── Sincronização de Cliente com Bolten CRM ───────────────────
export async function sincronizarClienteComBolten(cliente: {
  id: string;
  nome: string;
  telefone: string;
  email?: string | null;
}): Promise<void> {
  const config = getBoltenConfig();
  if (!config) return;

  // 1. Webhook se configurado
  if (config.webhookUrl) {
    try {
      await fetch(config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.webhookKey ? { 'x-api-key': config.webhookKey } : {}),
        },
        body: JSON.stringify({
          event: 'cliente.upsert',
          timestamp: new Date().toISOString(),
          data: cliente,
        }),
      });
    } catch (err) {
      console.warn('[bolten] Webhook cliente ignorado:', err);
    }
  }

  // 2. API direta se configurada
  if (config.apiKey && config.contactComponentId) {
    try {
      await boltenCreateContact(config, config.contactComponentId, {
        Nome: cliente.nome,
        Telefone: cliente.telefone,
        'E-mail': cliente.email || '',
        'ID Interno': cliente.id,
      });
    } catch (err) {
      console.warn('[bolten] Contact API cliente ignorado:', err);
    }
  }
}

// ── Envio de Relatório Executivo via Bolten.io ─────────────────
export interface RelatorioExecutivoBoltenPayload {
  telefoneDestino: string;
  nomeDestino: string;
  periodo: string;
  faturamentoBruto: number;
  totalAtendimentos: number;
  ticketMedio: number;
  totalCancelamentos: number;
  servicosDestaque?: Array<{ nome: string; quantidade: number }>;
  profissionaisDestaque?: Array<{ nome: string; faturamento: number }>;
  resumoTexto?: string;
}

export async function enviarRelatorioExecutivoBolten(payload: RelatorioExecutivoBoltenPayload): Promise<{
  sucesso: boolean;
  mensagem: string;
  modo: 'real' | 'simulado';
}> {
  const config = getBoltenConfig();

  const textoFormatado = payload.resumoTexto || `📊 *STUDIO AGNALDO GOMES — RELATÓRIO EXECUTIVO IA*
Olá Mestre ${payload.nomeDestino}! Segue o balanço consolidado do período (${payload.periodo}):

💰 *Faturamento Bruto:* R$ ${payload.faturamentoBruto.toFixed(2)}
👥 *Atendimentos:* ${payload.totalAtendimentos} cliente(s)
📈 *Ticket Médio:* R$ ${payload.ticketMedio.toFixed(2)}
⚠️ *Cancelamentos:* ${payload.totalCancelamentos}

✂️ *Serviços em Destaque:*
${(payload.servicosDestaque || []).slice(0, 3).map(s => `• ${s.nome} (${s.quantidade}x)`).join('\n') || '• Nenhum serviço registrado'}

💡 *Relatório gerado e enviado automaticamente via Bolten CRM.*`;

  // 1. Enviar via Webhook Bolten se configurado
  if (config?.webhookUrl) {
    try {
      const res = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.webhookKey ? { 'x-api-key': config.webhookKey } : {}),
        },
        body: JSON.stringify({
          event: 'relatorio.executivo_ia',
          timestamp: new Date().toISOString(),
          destino: {
            nome: payload.nomeDestino,
            telefone: payload.telefoneDestino,
          },
          mensagemFormatada: textoFormatado,
          dados: payload,
        }),
      });

      if (res.ok) {
        console.log(`[bolten-cron] Relatório disparado com sucesso via Webhook para ${payload.telefoneDestino}`);
        return { sucesso: true, mensagem: 'Relatório disparado com sucesso via Webhook Bolten!', modo: 'real' };
      }
    } catch (err: any) {
      console.warn('[bolten-cron] Falha no envio para webhook:', err);
    }
  }

  // 2. Se houver API direta configurada, registrar card ou contato
  if (config?.apiKey && config?.projectId) {
    try {
      if (config.contactComponentId) {
        await boltenCreateContact(config, config.contactComponentId, {
          Nome: payload.nomeDestino,
          Telefone: payload.telefoneDestino,
          'Último Relatório': `${payload.periodo} — R$ ${payload.faturamentoBruto.toFixed(2)}`,
        });
      }
      return { sucesso: true, mensagem: 'Relatório sincronizado com sucesso na API Bolten!', modo: 'real' };
    } catch (err: any) {
      console.error('[bolten-cron] Erro na API Bolten:', err);
    }
  }

  console.log(`[bolten-simulado] Relatório IA gerado para ${payload.nomeDestino} (${payload.telefoneDestino}): Faturamento R$ ${payload.faturamentoBruto.toFixed(2)}`);
  return { 
    sucesso: true, 
    mensagem: 'Relatório gerado com sucesso pelo sistema e registrado para envio.', 
    modo: 'simulado' 
  };
}

// ── Dados de demonstração (sem configuração) ───────────────────
export function demoOpportunities() {
  return [
    { id: 'demo-1', attributes: { Name: 'Patrícia Almeida — Mechas', 'E-mail': 'patricia@email.com', Status: 'Novo Agendamento', Contato: { Nome: 'Patrícia Almeida', Telefone: '(42) 98765-4321' } }, created_at: '2026-08-28T10:00:00Z' },
    { id: 'demo-2', attributes: { Name: 'Mariana Silva — Noivas Completo', 'E-mail': 'mariana@email.com', Status: 'Dia da Noiva (Sinal)', Contato: { Nome: 'Mariana Silva', Telefone: '(42) 99999-8888' } }, created_at: '2026-08-27T14:30:00Z' },
    { id: 'demo-3', attributes: { Name: 'Fernanda Lima — Corte Feminino com Escova', 'E-mail': 'fernanda@email.com', Status: 'Atendimento Concluído', Contato: { Nome: 'Fernanda Lima', Telefone: '(42) 99887-7665' } }, created_at: '2026-08-26T09:15:00Z' },
    { id: 'demo-4', attributes: { Name: 'Thiago Souza — Corte Masculino', 'E-mail': 'thiago@email.com', Status: 'Novo Agendamento', Contato: { Nome: 'Thiago Souza', Telefone: '(42) 99765-4321' } }, created_at: '2026-08-25T16:45:00Z' },
  ];
}
