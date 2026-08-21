/**
 * Utilitários para disparar notificações via WhatsApp para o Studio.
 * Integra com a Evolution API (via API routes do projeto).
 */

const WHATSAPP_STUDIO = '5544999999999'; // TODO: Tornar configurável

interface AppointmentNotifyData {
  id: string;
  cliente: string;
  telefone: string;
  servico: string;
  profissional: string;
  data: string;
  hora: string;
  valor: number;
}

/**
 * Gera o link de redirecionamento para o WhatsApp do cliente
 * com a mensagem de confirmação para a atendente.
 */
export function getWhatsAppBookingUrl(data: AppointmentNotifyData): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://agnaldogomes.vercel.app';
  const actionLink = `${baseUrl}/admin/agenda?confirmar=${data.id}`;
  
  const text = `*Novo Agendamento Solicitado* 📅
  
👤 *Cliente:* ${data.cliente}
📞 *Telefone:* ${data.telefone}
✂️ *Serviço:* ${data.servico}
👤 *Profissional:* ${data.profissional}
🗓️ *Data:* ${data.data}
⏰ *Hora:* ${data.hora}
💰 *Valor:* R$ ${data.valor.toFixed(2)}

🔗 *Confirmar no Sistema:* ${actionLink}

_Por favor, confirme a disponibilidade e valide o agendamento._`;

  return `https://wa.me/${WHATSAPP_STUDIO}?text=${encodeURIComponent(text)}`;
}

/**
 * Gera o link para notificação de cancelamento.
 */
export function getWhatsAppCancelUrl(data: AppointmentNotifyData, motivo: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://agnaldogomes.vercel.app';
  const actionLink = `${baseUrl}/admin/agenda?cancelar=${data.id}`;
  
  const text = `*Agendamento Cancelado* ❌
  
👤 *Cliente:* ${data.cliente}
✂️ *Serviço:* ${data.servico}
🗓️ *Data:* ${data.data}
⏰ *Hora:* ${data.hora}
⚠️ *Motivo:* ${motivo}

🔗 *Liberar Agenda no Sistema:* ${actionLink}

_O horário foi liberado no sistema interno, confirme para finalizar._`;

  return `https://wa.me/${WHATSAPP_STUDIO}?text=${encodeURIComponent(text)}`;
}
