export const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';
export const ASAAS_API_KEY = process.env.ASAAS_API_KEY || '';

export interface AsaasCustomer {
  id?: string;
  name: string;
  cpfCnpj: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  address?: string;
  addressNumber?: string;
  province?: string;
  postalCode?: string;
}

/**
 * Cria ou atualiza um cliente no Asaas.
 */
export async function createOrUpdateAsaasCustomer(customer: AsaasCustomer) {
  if (!ASAAS_API_KEY) {
    throw new Error('ASAAS_API_KEY não configurada no .env');
  }

  // Verifica se o cliente já existe pelo CPF
  const searchRes = await fetch(`${ASAAS_API_URL}/customers?cpfCnpj=${customer.cpfCnpj}`, {
    headers: {
      'access_token': ASAAS_API_KEY,
    }
  });

  const searchData = await searchRes.json();
  let customerId = '';

  if (searchData.data && searchData.data.length > 0) {
    // Atualizar
    customerId = searchData.data[0].id;
    await fetch(`${ASAAS_API_URL}/customers/${customerId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY,
      },
      body: JSON.stringify(customer)
    });
  } else {
    // Criar
    const createRes = await fetch(`${ASAAS_API_URL}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY,
      },
      body: JSON.stringify(customer)
    });
    const createData = await createRes.json();
    if (createData.errors) {
      throw new Error(createData.errors[0].description);
    }
    customerId = createData.id;
  }

  return customerId;
}

export interface AsaasPayment {
  customer: string; // id do cliente
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
  value: number;
  dueDate: string;
  description?: string;
  externalReference?: string;
}

/**
 * Cria uma cobrança no Asaas.
 */
export async function createAsaasPayment(payment: AsaasPayment) {
  if (!ASAAS_API_KEY) {
    throw new Error('ASAAS_API_KEY não configurada no .env');
  }

  const res = await fetch(`${ASAAS_API_URL}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'access_token': ASAAS_API_KEY,
    },
    body: JSON.stringify(payment)
  });

  const data = await res.json();
  if (data.errors) {
    throw new Error(data.errors[0].description);
  }

  return data;
}

export interface AsaasInvoice {
  payment: string; // ID da cobrança
  installment?: string;
  type: 'NFS-E' | 'NF-E' | 'NFC-E';
  updatePayment?: boolean;
  municipalServiceId?: string; // Código do serviço na prefeitura (Obrigatório para NFS-e)
  municipalServiceCode?: string;
  municipalServiceName?: string;
  taxes?: {
    retainIss?: boolean;
    iss?: number;
    cofins?: number;
    csll?: number;
    inss?: number;
    ir?: number;
    pis?: number;
  };
}

/**
 * Agenda a emissão de uma Nota Fiscal no Asaas baseada em uma cobrança.
 * O Asaas emite a nota automaticamente quando o pagamento é confirmado.
 */
export async function scheduleAsaasInvoice(invoice: AsaasInvoice) {
  if (!ASAAS_API_KEY) {
    throw new Error('ASAAS_API_KEY não configurada no .env');
  }

  const payload: any = {
    payment: invoice.payment,
    type: invoice.type,
    updatePayment: invoice.updatePayment ?? true,
    effectiveDate: new Date().toISOString().split('T')[0], // Hoje ou configurar pra emissão futura
  };

  // Se for NFS-e (Serviços - Studio)
  if (invoice.type === 'NFS-E') {
    payload.municipalServiceId = invoice.municipalServiceId;
    payload.municipalServiceCode = invoice.municipalServiceCode;
    payload.municipalServiceName = invoice.municipalServiceName;
    if (invoice.taxes) payload.taxes = invoice.taxes;
  }

  // Se for NF-e (Produtos Físicos - Loja), o Asaas exigirá NCM, CEST, CST, Origem nas configurações do produto.
  // Para NF-e, geralmente é feito atrelando configurações de impostos globais no painel do Asaas
  // ou enviando os itens detalhados se usar a API de carrinho (Checkout).
  // A documentação do Asaas detalha isso.

  const res = await fetch(`${ASAAS_API_URL}/invoices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'access_token': ASAAS_API_KEY,
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (data.errors) {
    throw new Error(data.errors[0].description);
  }

  return data;
}
