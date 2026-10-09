/**
 * Templates de mensagens WhatsApp do Studio Agnaldo Gomes.
 * Centralizados aqui para manter tom de voz consistente.
 *
 * Placeholders: {nome}, {data}, {hora}, {servico}, {profissional}
 */

import { fetchSystemSettings } from './supabase-queries';

const STUDIO = 'Agnaldo Gomes Studio';

export function formatarDataBR(iso: string): string {
  if (!iso) return '';
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function primeiroNome(nomeCompleto: string): string {
  return (nomeCompleto || '').trim().split(/\s+/)[0] || '';
}

let settingsCache: { data: Record<string, string>; at: number } | null = null;
const SETTINGS_TTL_MS = 60_000;
async function getSettings(): Promise<Record<string, string>> {
  if (settingsCache && Date.now() - settingsCache.at < SETTINGS_TTL_MS) return settingsCache.data;
  const settings = await fetchSystemSettings();
  const map: Record<string, string> = {};
  for (const s of settings ?? []) map[s.key] = s.value;
  settingsCache = { data: map, at: Date.now() };
  return map;
}

/** Invalida o cache de templates (chamar após salvar mensagens) */
export function invalidarCacheMensagens() {
  settingsCache = null;
}

/**
 * Lista de primeiros nomes masculinos comuns no Brasil.
 * Usada para detectar gênero e adaptar a mensagem de aniversário.
 */
const NOMES_MASCULINOS = new Set([
  'anderson', 'andre', 'antonio', 'arthur', 'bernardo', 'breno', 'bruno', 'caio', 'carlos',
  'cauã', 'caua', 'celso', 'christian', 'cristian', 'daniel', 'davi', 'dario', 'diego',
  'douglas', 'eder', 'eduardo', 'elias', 'emerson', 'enrique', 'enzo', 'fabio', 'felipe',
  'fernado', 'flavio', 'francisco', 'gabriel', 'gilberto', 'giovanni', 'guilherme', 'gustavo',
  'heitor', 'henrique', 'hugo', 'igor', 'isaias', 'iago', 'ivan', 'joao', 'jose', 'jorge',
  'junior', 'kaio', 'kaique', 'kevin', 'laercio', 'luan', 'lucas', 'luiz', 'luís', 'luis',
  'marcelo', 'marcos', 'mario', 'mateus', 'matheus', 'miguel', 'murilo', 'nicolas', 'noel',
  'otavio', 'pablo', 'patrick', 'paulo', 'pedro', 'rafael', 'raphael', 'raul', 'renan',
  'renato', 'ricardo', 'roberto', 'rodrigo', 'rogerio', 'ruan', 'samuel', 'sergio', 'tiago',
  'thiago', 'thomas', 'thales', 'victor', 'vinicius', 'vinícius', 'vitor', 'wagner', 'wellington',
  'willian', 'william', 'yan', 'yuri',
]);

/** Detecta se um nome completo é provavelmente masculino pelo primeiro nome */
export function isMasculino(nomeCompleto: string): boolean {
  const primeiro = primeiroNome(nomeCompleto).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // remove acentos para comparar
  return NOMES_MASCULINOS.has(primeiro);
}

/** Templates padrão (usados quando o admin ainda não personalizou) */
export const MENSAGENS_PADRAO = {
  msg_confirmacao: `Olá, {nome}! 💛 Passando para confirmar seu horário de *{servico}* com {profissional} amanhã, {data}, às {hora}, no Agnaldo Gomes Studio.\n\nResponda *SIM* para confirmar ou nos avise caso precise remarcar.`,
  msg_lembrete: `Oi, {nome}! ⏰ Lembrando que seu horário de *{servico}* é HOJE às {hora}. Estamos te esperando no Agnaldo Gomes Studio!`,
  msg_feedback: `Oi, {nome}! 😍 Como está ficando o resultado do seu *{servico}*? Sua opinião vale ouro para nós: responda com uma nota de 0 a 10.`,
  msg_aniversario: `🌸 Feliz Aniversário, {nome}! 🎂 A equipe Agnaldo Gomes Studio deseja que este dia seja tão especial quanto você.`,
  msg_reativacao: `Oi, {nome}! ✨ Sentimos sua falta no Agnaldo Gomes Studio — já faz {tempo} desde seu último cuidado. Que tal reservar um momento só seu?`,
} as const;
export type ChaveMensagem = keyof typeof MENSAGENS_PADRAO;

/** Substitui variáveis no template — aceita {var} e {{var}} */
export function aplicarTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{?\s*(\w+)\s*\}?\}/g, (m, chave: string) =>
    chave in vars ? vars[chave] : m,
  );
}

async function template(chave: ChaveMensagem): Promise<string> {
  const settings = await getSettings();
  return settings[chave]?.trim() || MENSAGENS_PADRAO[chave];
}

/** Aniversário — disparo no dia, às 08h */
export async function msgAniversario(nomeCompleto: string): Promise<string> {
  return aplicarTemplate(await template('msg_aniversario'), { nome: primeiroNome(nomeCompleto) });
}

/** Confirmação — 1 dia antes do agendamento */
export async function msgConfirmacaoVespera(params: {
  nome: string; data: string; hora: string; servico: string; profissional: string;
}): Promise<string> {
  return aplicarTemplate(await template('msg_confirmacao'), {
    nome: primeiroNome(params.nome),
    servico: params.servico,
    data: formatarDataBR(params.data),
    hora: params.hora,
    profissional: primeiroNome(params.profissional) || params.profissional,
  });
}

/** Lembrete — no dia do atendimento */
export async function msgLembreteMesmoDia(params: {
  nome: string; hora: string; servico: string;
}): Promise<string> {
  return aplicarTemplate(await template('msg_lembrete'), {
    nome: primeiroNome(params.nome),
    servico: params.servico,
    hora: params.hora,
  });
}

/** Feedback pós-procedimento (mechas, coloração, tratamentos...) */
export async function msgFeedback(params: { nome: string; servico: string }): Promise<string> {
  return aplicarTemplate(await template('msg_feedback'), {
    nome: primeiroNome(params.nome),
    servico: params.servico,
  });
}

/** Reativação — cliente sumida (tempo sem aparecer) */
export async function msgReativacao(nomeCompleto: string, diasDesdeUltima: number): Promise<string> {
  const meses = Math.floor(diasDesdeUltima / 30);
  const tempo = meses >= 1 ? `${meses} ${meses > 1 ? 'meses' : 'mês'}` : `${diasDesdeUltima} dias`;
  return aplicarTemplate(await template('msg_reativacao'), {
    nome: primeiroNome(nomeCompleto),
    tempo,
  });
}

/** Normaliza telefone brasileiro para formato wa.me/Evolution (55 + DDD + número) */
export function normalizarTelefone(telefone: string): string {
  const d = (telefone || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('55')) return d;
  if (d.length >= 10 && d.length <= 11) return `55${d}`;
  return d;
}

/** Link wa.me para envio manual (fallback quando Evolution não está conectada) */
export function waMeLink(telefone: string, mensagem: string): string {
  const num = normalizarTelefone(telefone);
  return `https://api.whatsapp.com/send?phone=${num}&text=${encodeURIComponent(mensagem)}`;
}
