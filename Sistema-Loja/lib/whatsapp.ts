/**
 * Utilitários para disparar notificações via WhatsApp para o Studio Agnaldo Gomes.
 */

const WHATSAPP_STUDIO_DEFAULT = process.env.NEXT_PUBLIC_WHATSAPP_PHONE || '5542998271222';

/**
 * Normaliza e sanitiza qualquer telefone para o formato internacional exigido pelo WhatsApp (wa.me)
 * Ex: "(42) 99827-1222" -> "5542998271222"
 * Ex: "42998271222" -> "5542998271222"
 * Ex: "5542998271222" -> "5542998271222"
 */
export function normalizarTelefoneDestino(phone?: string | null): string {
  if (!phone) return WHATSAPP_STUDIO_DEFAULT.replace(/\D/g, '');
  let clean = phone.replace(/\D/g, '');
  if (!clean) return WHATSAPP_STUDIO_DEFAULT.replace(/\D/g, '');

  // Se tem 10 dígitos (DDD + 8 dígitos) ou 11 dígitos (DDD + 9 dígitos), adiciona DDI 55
  if (clean.length === 10 || clean.length === 11) {
    clean = '55' + clean;
  }
  return clean;
}

export interface AppointmentNotifyData {
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
  whatsappDestino?: string;
}

/**
 * Gera o link de redirecionamento para o WhatsApp do salão
 * com a mensagem formatada para a atendente/secretaria.
 */
export function getWhatsAppBookingUrl(data: AppointmentNotifyData): string {
  const destino = normalizarTelefoneDestino(data.whatsappDestino);
  // URL de produção para o link de confirmação do sistema
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

👉 *Clique no link abaixo para aprovar no sistema:*
${actionLink}

_Olá! Acabei de solicitar meu agendamento de noiva pelo site e gerei o sinal de 50% via PIX. Segue meu comprovante para confirmação e bloqueio da data!_`;

    return `https://api.whatsapp.com/send?phone=${destino}&text=${encodeURIComponent(text)}`;
  }
  
  const text = `*Novo Agendamento Solicitado* 📅
  
👤 *Cliente:* ${data.cliente}
📞 *Telefone:* ${data.telefone}
✂️ *Serviço:* ${data.servico}
👤 *Profissional:* ${data.profissional}
💰 *Valor:* R$ ${data.valor.toFixed(2).replace('.', ',')}

🗓️ *Data/Hora:* A ser definida pela secretaria

👉 *Clique no link abaixo para confirmar e agendar no sistema:*
${actionLink}

_Por favor, entre em contato com o cliente para definir a data e horário._`;

  return `https://api.whatsapp.com/send?phone=${destino}&text=${encodeURIComponent(text)}`;
}

/**
 * Gera o link para notificação de cancelamento.
 */
export function getWhatsAppCancelUrl(data: AppointmentNotifyData, motivo: string): string {
  const destino = normalizarTelefoneDestino(data.whatsappDestino);
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

  return `https://api.whatsapp.com/send?phone=${destino}&text=${encodeURIComponent(text)}`;
}
