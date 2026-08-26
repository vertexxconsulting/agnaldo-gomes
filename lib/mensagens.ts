/**
 * Templates de mensagens WhatsApp do Studio Agnaldo Gomes.
 * Centralizados aqui para manter tom de voz consistente.
 *
 * Placeholders: {nome}, {data}, {hora}, {servico}, {profissional}
 */

const STUDIO = 'Agnaldo Gomes Studio';

export function formatarDataBR(iso: string): string {
  if (!iso) return '';
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function primeiroNome(nomeCompleto: string): string {
  return (nomeCompleto || '').trim().split(/\s+/)[0] || '';
}

/** Aniversário — disparo no dia, às 08h */
export function msgAniversario(nomeCompleto: string): string {
  const nome = primeiroNome(nomeCompleto);
  return (
    `🌸 *Feliz Aniversário, ${nome}*! 🎂\n\n` +
    `A equipe ${STUDIO} deseja que este dia seja tão especial quanto você — cheio de beleza, alegria e boas energias.\n\n` +
    `🎁 *Presente de aniversário:* uma *Hidratação Profissional* por nossa conta!\n` +
    `Responda esta mensagem e nossa equipe reserva o melhor horário para você aproveitar seu mimo. 💛`
  );
}

/** Confirmação — 1 dia antes do agendamento */
export function msgConfirmacaoVespera(params: {
  nome: string; data: string; hora: string; servico: string; profissional: string;
}): string {
  const nome = primeiroNome(params.nome);
  const data = formatarDataBR(params.data);
  return (
    `Oi, ${nome}! 👋\n\n` +
    `Passando para confirmar seu horário *amanhã, ${data} às ${params.hora}*, para *${params.servico}* com ${params.profissional}.\n\n` +
    `Tudo certo? Responda:\n✅ *1* — Vou comparecer\n🔁 *2* — Quero reagendar\n\n` +
    `Te esperamos! ✨\n— ${STUDIO}`
  );
}

/** Lembrete — no dia do atendimento */
export function msgLembreteMesmoDia(params: {
  nome: string; hora: string; servico: string;
}): string {
  const nome = primeiroNome(params.nome);
  return (
    `Oi, ${nome}! ⏰\n\n` +
    `Seu horário é *HOJE às ${params.hora}* para *${params.servico}*.\n\n` +
    `Estamos te esperando! Se precisar remarcar, responda esta mensagem o quanto antes.\n\n` +
    `Até já! 💛\n— ${STUDIO}`
  );
}

/** Feedback pós-procedimento (mechas, coloração, tratamentos...) */
export function msgFeedback(params: { nome: string; servico: string }): string {
  const nome = primeiroNome(params.nome);
  return (
    `Oi, ${nome}! 😍\n\n` +
    `Como está ficando o resultado do seu *${params.servico}*?\n\n` +
    `Sua opinião vale ouro para nós: responda com uma nota de *0 a 10* e, se quiser, conte como foi sua experiência.\n\n` +
    `Adoramos acompanhar você! 💛\n— ${STUDIO}`
  );

}

/** Reativação — cliente sumida (tempo sem aparecer) */
export function msgReativacao(nomeCompleto: string, diasDesdeUltima: number): string {
  const nome = primeiroNome(nomeCompleto);
  const meses = Math.floor(diasDesdeUltima / 30);
  const tempo = meses >= 1 ? `${meses} mês${meses > 1 ? 'es' : ''}` : `${diasDesdeUltima} dias`;
  return (
    `Oi, ${nome}! ✨\n\n` +
    `Sentimos sua falta no ${STUDIO} — já faz *${tempo}* desde seu último cuidado.\n\n` +
    `Que tal reservar um momento só seu? Responda esta mensagem que guardamos o melhor horário para você.\n\n` +
    `💛 Equipe Agnaldo Gomes`
  );
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
  return `https://wa.me/${num}?text=${encodeURIComponent(mensagem)}`;
}
