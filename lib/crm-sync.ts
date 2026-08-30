import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { sincronizarAgendamentoComBolten, sincronizarClienteComBolten } from '@/lib/bolten';

/**
 * Normaliza número de telefone para apenas dígitos.
 * Remove máscaras, parênteses, traços e espaços.
 */
export function normalizarTelefone(telefone: string | null | undefined): string {
  if (!telefone) return '';
  return String(telefone).replace(/\D/g, '');
}

export interface ClienteInput {
  id?: string;
  nome: string;
  telefone: string;
  email?: string | null;
  nascimento?: string | null;
  observacoes?: string | null;
}

/**
 * CRM SISTEMA MÃE — Single Source of Truth
 * Garante que o cliente seja criado ou atualizado no Supabase (salon_customers)
 * sem duplicação de registros por telefone ou e-mail.
 */
export async function upsertClienteMae(input: ClienteInput) {
  const supabase = await getSupabaseServiceClient();
  const phoneClean = normalizarTelefone(input.telefone);
  const emailClean = input.email ? String(input.email).trim().toLowerCase() : null;
  const nameClean = String(input.nome).trim();

  if (!nameClean || !phoneClean) {
    throw new Error('Nome e Telefone são obrigatórios no CRM.');
  }

  // 1. Verificar se já existe pelo ID (se for UUID válido)
  const isUUID = input.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.id);
  let clienteExistente: any = null;

  if (isUUID) {
    const { data } = await supabase
      .from('salon_customers')
      .select('*')
      .eq('id', input.id)
      .maybeSingle();
    clienteExistente = data;
  }

  // 2. Se não achou por ID, buscar por Telefone (identificador principal do Salão)
  if (!clienteExistente && phoneClean.length >= 8) {
    const { data } = await supabase
      .from('salon_customers')
      .select('*')
      .eq('phone', phoneClean)
      .maybeSingle();
    clienteExistente = data;
  }

  // 3. Se não achou por telefone, buscar por E-mail (se fornecido)
  if (!clienteExistente && emailClean) {
    const { data } = await supabase
      .from('salon_customers')
      .select('*')
      .eq('email', emailClean)
      .maybeSingle();
    clienteExistente = data;
  }

  const payload: any = {
    name: nameClean,
    phone: phoneClean,
    email: emailClean || clienteExistente?.email || null,
    birth_date: input.nascimento || clienteExistente?.birth_date || null,
    notes: input.observacoes !== undefined ? input.observacoes : clienteExistente?.notes || null,
    updated_at: new Date().toISOString(),
  };

  let clienteFinal: any = null;

  if (clienteExistente) {
    // Atualiza cliente existente sem duplicar
    const { data, error } = await supabase
      .from('salon_customers')
      .update(payload)
      .eq('id', clienteExistente.id)
      .select('*')
      .single();

    if (error) throw error;
    clienteFinal = data;
  } else {
    // Insere novo cliente no sistema mãe
    const { data, error } = await supabase
      .from('salon_customers')
      .insert({
        ...payload,
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;
    clienteFinal = data;
  }

  // 4. Disparo ASSÍNCRONO e INDEPENDENTE para o CRM Externo (Bolten)
  // O sistema mãe já salvou com sucesso. O CRM externo apenas recebe o espelho.
  sincronizarComCrmExterno({
    id: clienteFinal.id,
    nome: clienteFinal.name,
    telefone: clienteFinal.phone,
    email: clienteFinal.email,
  }).catch((err) => {
    console.warn('[CRM Externo] Aviso ao sincronizar com CRM externo:', err?.message || err);
  });

  return clienteFinal;
}

/**
 * Envia dados do cliente para o CRM Externo de forma desacoplada
 */
async function sincronizarComCrmExterno(cliente: { id: string; nome: string; telefone: string; email?: string | null }) {
  try {
    if (typeof sincronizarClienteComBolten === 'function') {
      await sincronizarClienteComBolten(cliente);
    }
  } catch (e) {
    // Nunca trava o sistema mãe
    console.warn('[CRM-Sync] CRM Externo offline ou não configurado.');
  }
}
