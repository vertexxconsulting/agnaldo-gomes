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
  codigo?: number | null;
  nome: string;
  telefone: string;
  email?: string | null;
  cpf?: string | null;
  endereco?: string | null;
  nascimento?: string | null;
  observacoes?: string | null;
}

/**
 * Busca cliente no banco de forma resiliente a variações de formato telefônico
 * (com/sem DDI 55, com/sem 0 inicial, com/sem 9º dígito, ou busca por sufixo dos últimos 8 dígitos).
 */
export async function buscarClientePorTelefone(supabase: any, telefone: string | null | undefined) {
  if (!supabase || !telefone) return null;
  const clean = String(telefone).replace(/\D/g, '');
  if (clean.length < 8) return null;

  let semDdi = clean;
  if (clean.startsWith('55') && clean.length >= 12) {
    semDdi = clean.slice(2);
  } else if (clean.startsWith('0') && clean.length >= 11) {
    semDdi = clean.slice(1);
  }

  const candidates = new Set<string>();
  candidates.add(clean);
  candidates.add(semDdi);
  candidates.add('55' + semDdi);
  candidates.add('0' + semDdi);

  // Variação de 9º dígito móvel brasileiro (ex: 42 99153-4011 vs 42 9153-4011)
  if (semDdi.length === 11 && semDdi[2] === '9') {
    candidates.add(semDdi.slice(0, 2) + semDdi.slice(3));
  } else if (semDdi.length === 10) {
    candidates.add(semDdi.slice(0, 2) + '9' + semDdi.slice(2));
  }

  // 1. Busca direta pelas variações exatas
  const { data: directMatches, error: errDirect } = await supabase
    .from('salon_customers')
    .select('*')
    .in('phone', Array.from(candidates))
    .limit(1);

  if (!errDirect && directMatches && directMatches.length > 0) {
    return directMatches[0];
  }

  // 2. Fallback: busca por sufixo dos últimos 8 dígitos (ignora formatação legada ou pontuações no banco)
  const last8 = semDdi.slice(-8);
  if (last8.length === 8) {
    const { data: suffixMatches, error: errSuffix } = await supabase
      .from('salon_customers')
      .select('*')
      .ilike('phone', '%' + last8)
      .limit(5);

    if (!errSuffix && suffixMatches && suffixMatches.length > 0) {
      // Prioriza cliente com o mesmo DDD
      const ddd = semDdi.length >= 10 ? semDdi.slice(0, 2) : '';
      if (ddd) {
        const comMesmoDdd = suffixMatches.find((c: any) => {
          const cPhone = (c.phone || '').replace(/\D/g, '');
          return cPhone.includes(ddd);
        });
        if (comMesmoDdd) return comMesmoDdd;
      }
      return suffixMatches[0];
    }
  }

  return null;
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

  // 2. Se não achou por ID, buscar por Telefone (identificador principal do Salão de forma resiliente)
  if (!clienteExistente && phoneClean.length >= 8) {
    clienteExistente = await buscarClientePorTelefone(supabase, phoneClean);
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
    codigo: input.codigo !== undefined ? input.codigo : clienteExistente?.codigo,
    email: emailClean || clienteExistente?.email || null,
    cpf: input.cpf !== undefined ? input.cpf : clienteExistente?.cpf || null,
    address: input.endereco !== undefined ? input.endereco : clienteExistente?.address || null,
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
