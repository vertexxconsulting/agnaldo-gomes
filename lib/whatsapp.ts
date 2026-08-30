/**
 * Utilitários para disparar notificações via WhatsApp para o Studio Agnaldo Gomes.
 */

const WHATSAPP_STUDIO = process.env.NEXT_PUBLIC_WHATSAPP_PHONE || '5542999999999';

interface AppointmentNotifyData {
  id: string;
  cliente: string;
  telefone: string;
  servico: string;
  profissional: string;
  data: string;
  hora: string;
  valor: number;
  isNoiva?: boolean;
  valorSinal?: number;
}

/**
 * Gera o link de redirecionamento para o WhatsApp do cliente
 * com a mensagem de confirmação para a atendente.
 */
export function getWhatsAppBookingUrl(data: AppointmentNotifyData): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://agnaldogomes.vercel.app';
  const actionLink = `${baseUrl}/admin/agenda?confirmar=${data.id}`;
  
  if (data.isNoiva) {
    const sinal = data.valorSinal ?? (data.valor * 0.5);
    const text = `*Novo Agendamento — Dia da Noiva* 👰✨
  
👤 *Noiva:* ${data.cliente}
📞 *Telefone:* ${data.telefone}
✂️ *Pacote:* ${data.servico}
👤 *Profissional:* ${data.profissional}
🗓️ *Data:* ${data.data}
⏰ *Hora:* ${data.hora}
💰 *Valor Total:* R$ ${data.valor.toFixed(2).replace('.', ',')}
💳 *Sinal Obrigatório (50%):* R$ ${sinal.toFixed(2).replace('.', ',')}

🔒 *Status:* Sinal PIX 50% gerado no agendamento
🔗 *Validar e Confirmar no Sistema:* ${actionLink}

_Olá! Acabei de solicitar meu agendamento de noiva pelo site e gerei o sinal de 50% via PIX. Segue meu comprovante para confirmação e bloqueio da data!_`;

    return `https://wa.me/${WHATSAPP_STUDIO}?text=${encodeURIComponent(text)}`;
  }
  
  const text = `*Novo Agendamento Solicitado* 📅
  
👤 *Cliente:* ${data.cliente}
📞 *Telefone:* ${data.telefone}
✂️ *Serviço:* ${data.servico}
👤 *Profissional:* ${data.profissional}
🗓️ *Data:* ${data.data}
⏰ *Hora:* ${data.hora}
💰 *Valor:* R$ ${data.valor.toFixed(2).replace('.', ',')}

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
