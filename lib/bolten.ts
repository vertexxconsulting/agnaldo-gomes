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
}

export function getBoltenConfig(): BoltenConfig | null {
  const apiKey = process.env.BOLTEN_API_KEY || '';
  const projectId = process.env.BOLTEN_PROJECT_ID || '';
  const kanbanComponentId = process.env.BOLTEN_KANBAN_COMPONENT_ID || '';
  const contactComponentId = process.env.BOLTEN_CONTACT_COMPONENT_ID || '';
  const webhookKey = process.env.BOLTEN_WEBHOOK_KEY || '';
  if (!apiKey || !projectId) return null;
  return { apiKey, projectId, kanbanComponentId, contactComponentId, webhookKey };
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

// ── Dados de demonstração (sem configuração) ───────────────────
export function demoOpportunities() {
  return [
    { id: 'demo-1', attributes: { Name: 'Patrícia Almeida', 'E-mail': 'patricia@email.com', Status: 'Novo agendamento', Contato: { Nome: 'Patrícia Almeida', Telefone: '5511987654321' } }, created_at: '2026-08-18T10:00:00Z' },
    { id: 'demo-2', attributes: { Name: 'Ricardo Mendes', 'E-mail': 'ricardo@email.com', Status: 'Em negociação', Contato: { Nome: 'Ricardo Mendes', Telefone: '5511912345678' } }, created_at: '2026-08-17T14:30:00Z' },
    { id: 'demo-3', attributes: { Name: 'Fernanda Lima', 'E-mail': 'fernanda@email.com', Status: 'Atendimento concluído', Contato: { Nome: 'Fernanda Lima', Telefone: '5511998877665' } }, created_at: '2026-08-16T09:15:00Z' },
    { id: 'demo-4', attributes: { Name: 'Thiago Souza', 'E-mail': 'thiago@email.com', Status: 'Novo agendamento', Contato: { Nome: 'Thiago Souza', Telefone: '5511976543210' } }, created_at: '2026-08-15T16:45:00Z' },
  ];
}
