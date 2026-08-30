/**
 * Módulo de Envios — Correios (PAC) e Melhor Envio.
 *
 * Gera a etiqueta de envio do Correios em PDF quando o CEP de destino e o
 * token do Melhor Envio (ou CEP do remetente) estiverem configurados.
 * Enquanto não houver token real, o sistema gera uma etiqueta de pré-
 * etiqueta simulada para a loja imprimir e colar no pacote.
 *
 * A loja pode oferecer FRETE GRÁTIS (absorve o custo) ou FRETE PAGO pelo
 * cliente (valor somado ao pedido). A decisão fica na aba Configurações
 * da admin da loja (por faixa de CEP ou valor mínimo).
 */

export interface EnderecoEnvio {
  nome: string;
  cep: string;
  endereco: string; // rua + número
  bairro: string;
  cidade: string;
  estado: string;
  telefone?: string;
}

export interface ConfiguracaoEnvio {
  melhorEnvioToken: string;
  cepRemetente: string;
  remetenteNome: string;
  remetenteEndereco: string;
  remetenteBairro: string;
  remetenteCidade: string;
  remetenteEstado: string;
  /** Quando ativo, o frete é absorvido pela loja (cliente paga R$ 0). */
  freteGratis: boolean;
  /** Frete grátis acima deste valor de pedido (0 = desativado). */
  freteGratisAcimaDe: number;
  /** Valor padrão motoboy (Campo Mourão região). */
  valorMotoboy: number;
  /** Valor padrão Correios PAC. */
  valorCorreios: number;
}

export const ENVIO_DEFAULT: ConfiguracaoEnvio = {
  melhorEnvioToken: '',
  cepRemetente: '84268-030',
  remetenteNome: 'Studio Agnaldo Gomes',
  remetenteEndereco: 'Rua Prof.ª Otília Macedo Sikorski, 16',
  remetenteBairro: 'Telêmaco Borba',
  remetenteCidade: 'Telêmaco Borba',
  remetenteEstado: 'PR',
  freteGratis: false,
  freteGratisAcimaDe: 0,
  valorMotoboy: 15.0,
  valorCorreios: 28.5,
};

// ══════════════════════════════════════════════════════════
// INTEGRAÇÃO MELHOR ENVIO (server-side apenas — token nunca
// vai para o navegador). Tabelas: shipping_config + products.
// ══════════════════════════════════════════════════════════

export interface ShippingConfigDB {
  melhor_envio_token: string;
  melhor_envio_sandbox: boolean;
  cep_origem: string;
  remetente_nome: string;
  remetente_endereco: string;
  remetente_numero: string;
  remetente_bairro: string;
  remetente_cidade: string;
  remetente_estado: string;
  remetente_email: string;
  remetente_cpf_cnpj: string;
  frete_gratis: boolean;
  frete_gratis_acima_de: number;
  valor_motoboy: number;
  prazo_manuseio: number;
}

export interface OpcaoFrete {
  /** Identificador estável: 'MOTOBOY' ou service_id numérico do ME em string */
  id: string;
  metodo: 'MOTOBOY' | 'CORREIOS' | 'JADLOG';
  nome: string;       // ex.: "PAC", "SEDEX", "Motoboy"
  empresa: string;    // ex.: "Correios", "Jadlog", "Local"
  preco: number;
  gratis: boolean;
  prazo_dias: number | null;
  prazo_texto: string;
}

/** Cliente Supabase com SERVICE ROLE — usar só em rotas de servidor. */
async function svcClient() {
  const { createClient } = await import('@supabase/supabase-js');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function getShippingConfig(): Promise<ShippingConfigDB> {
  const supabase = await svcClient();
  const { data } = await supabase
    .from('shipping_config')
    .select('*')
    .eq('id', true)
    .single();
  return (data ?? {}) as ShippingConfigDB;
}

function meBase(sandbox: boolean): string {
  return sandbox
    ? 'https://sandbox.melhorenvio.com.br/api/v2'
    : 'https://www.melhorenvio.com.br/api/v2';
}

function meHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    // A API do Melhor Envio exige um User-Agent identificável
    'User-Agent': 'Aplicacao AGnaldoGomesLoja (suporte@agnaldogomes.com.br)',
  };
}

const isLocalCep = (cep: string) => cep.replace(/\D/g, '').startsWith('8426');

/**
 * Cota frete real via Melhor Envio (ou regras locais p/ motoboy).
 * Usado pela rota /api/envios/cotacao e pela validação no checkout.
 */
export async function cotarFrete(params: {
  cepDestino: string;
  items: { product_id?: string; quantity: number; unit_price?: number; title?: string }[];
  subtotal: number;
}): Promise<{ opcoes: OpcaoFrete[]; origem: 'melhor_envio' | 'fallback'; erro?: string }> {
  const cfg = await getShippingConfig();
  const numeric = params.cepDestino.replace(/\D/g, '');
  const gratis =
    cfg.frete_gratis ||
    (Number(cfg.frete_gratis_acima_de) > 0 && params.subtotal >= Number(cfg.frete_gratis_acima_de));

  // 1. Motoboy local tem prioridade na região de Campo Mourão
  if (isLocalCep(numeric)) {
    return {
      origem: 'fallback',
      opcoes: [{
        id: 'MOTOBOY',
        metodo: 'MOTOBOY',
        nome: 'Motoboy',
        empresa: 'Entrega local',
        preco: gratis ? 0 : Number(cfg.valor_motoboy ?? 15),
        gratis,
        prazo_dias: 0,
        prazo_texto: 'Hoje mesmo',
      }],
    };
  }

  // 2. Sem token configurado → fallback com valores fixos
  if (!cfg.melhor_envio_token) {
    return {
      origem: 'fallback',
      erro: 'Melhor Envio não configurado',
      opcoes: [{
        id: 'CORREIOS',
        metodo: 'CORREIOS',
        nome: 'Correios PAC',
        empresa: 'Correios',
        preco: gratis ? 0 : 28.5,
        gratis,
        prazo_dias: 7,
        prazo_texto: '3 a 7 dias úteis',
      }],
    };
  }

  // 3. Peso/dimensões consolidados do pacote a partir dos produtos
  const supabase = await svcClient();
  const ids = [...new Set(params.items.map(i => i.product_id).filter(Boolean))] as string[];
  let pesoKg = 0.5, largura = 16, altura = 8, comprimento = 24;
  if (ids.length > 0) {
    const { data: prods } = await supabase
      .from('products')
      .select('id, weight_kg, width_cm, height_cm, length_cm')
      .in('id', ids);
    const byId = new Map((prods ?? []).map(p => [p.id, p]));
    pesoKg = 0; largura = 0; altura = 0; comprimento = 0;
    for (const item of params.items) {
      const p = item.product_id ? byId.get(item.product_id) : null;
      const q = Math.max(1, Number(item.quantity) || 1);
      pesoKg += Number(p?.weight_kg ?? 0.5) * q;
      largura = Math.max(largura, Number(p?.width_cm ?? 16));
      altura = Math.max(altura, Number(p?.height_cm ?? 8));
      comprimento = Math.max(comprimento, Number(p?.length_cm ?? 24));
    }
    pesoKg = Math.max(0.3, pesoKg);           // mínimo prático
    largura = Math.max(11, largura);          // mínimos aceitos pelas transportadoras
    altura = Math.max(2, altura);
    comprimento = Math.max(16, comprimento);
  }

  try {
    const res = await fetch(`${meBase(cfg.melhor_envio_sandbox)}/me/shipment/calculate`, {
      method: 'POST',
      headers: meHeaders(cfg.melhor_envio_token),
      body: JSON.stringify({
        from: { postal_code: cfg.cep_origem.replace(/\D/g, '') },
        to: { postal_code: numeric },
        package: { weight: pesoKg, width: largura, height: altura, length: comprimento },
      }),
    });
    if (!res.ok) throw new Error(`Melhor Envio ${res.status}: ${await res.text()}`);
    const lista = (await res.json()) as any[];

    const opcoes: OpcaoFrete[] = lista
      .filter(s => s && (Number(s.custom_price ?? s.price) > 0))
      .map(s => ({
        id: String(s.id),
        metodo: /jadlog/i.test(s.company?.name ?? '') ? ('JADLOG' as const) : ('CORREIOS' as const),
        nome: s.name ?? 'Envio',
        empresa: s.company?.name ?? 'Transportadora',
        preco: gratis ? 0 : Number(s.custom_price ?? s.price),
        gratis,
        prazo_dias: s.delivery_time ?? null,
        prazo_texto: s.delivery_time != null
          ? `${s.delivery_time} dia${s.delivery_time === 1 ? '' : 's'} úteis`
          : 'A calcular',
      }))
      .sort((a, b) => a.preco - b.preco);

    if (opcoes.length === 0) throw new Error('Nenhuma cotação retornada');
    return { origem: 'melhor_envio', opcoes };
  } catch (err: any) {
    console.error('[envios] Falha na cotação Melhor Envio:', err.message);
    return {
      origem: 'fallback',
      erro: err.message,
      opcoes: [{
        id: 'CORREIOS',
        metodo: 'CORREIOS',
        nome: 'Correios PAC',
        empresa: 'Correios',
        preco: gratis ? 0 : 28.5,
        gratis,
        prazo_dias: 7,
        prazo_texto: '3 a 7 dias úteis',
      }],
    };
  }
}

/** Valida se o preço informado pelo cliente confere com a opção cotada. */
export async function validarOpcaoFrete(cepDestino: string, subtotal: number, opcaoId: string): Promise<OpcaoFrete | null> {
  const { opcoes } = await cotarFrete({ cepDestino, items: [], subtotal });
  return opcoes.find(o => o.id === opcaoId) ?? null;
}

/**
 * Emite a etiqueta oficial no Melhor Envio para um pedido pago:
 * carrinho → compra do despacho (saldo da carteira) → link do PDF.
 * Atualiza orders.tracking_code.
 */
export async function emitirEtiqueta(orderId: string): Promise<{
  ok: boolean; url?: string; tracking?: string; error?: string;
}> {
  const cfg = await getShippingConfig();
  if (!cfg.melhor_envio_token) return { ok: false, error: 'Configure o token do Melhor Envio em Admin da Loja > Configurações.' };

  const supabase = await svcClient();
  const { data: pedido, error: errPedido } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();
  if (errPedido || !pedido) return { ok: false, error: 'Pedido não encontrado.' };
  if (!pedido.shipping_cep) return { ok: false, error: 'Pedido sem CEP de entrega.' };
  if (/^(MOTOBOY|RETIRADA)$/i.test(pedido.shipping_method ?? '')) {
    return { ok: false, error: 'Pedidos de motoboy/retirada não usam etiqueta de transportadora.' };
  }

  const headers = meHeaders(cfg.melhor_envio_token);
  const base = meBase(cfg.melhor_envio_sandbox);

  try {
    // 1. Carrinho
    const items = Array.isArray(pedido.items) ? pedido.items : [];
    const pesoKg = Math.max(
      0.3,
      items.reduce((acc: number, i: any) => acc + Number(i.quantity || 1) * 0.5, 0)
    );
    const cartRes = await fetch(`${base}/me/cart`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        service_id: Number(pedido.shipping_service_id ?? 1),
        from: {
          name: cfg.remetente_nome,
          phone: '(42) 99999-9999',
          email: cfg.remetente_email || undefined,
          document: cfg.remetente_cpf_cnpj || undefined,
          address: cfg.remetente_endereco,
          complement: '',
          number: cfg.remetente_numero,
          district: cfg.remetente_bairro,
          city: cfg.remetente_cidade,
          state: cfg.remetente_estado,
          country_id: 'BR',
          postal_code: cfg.cep_origem.replace(/\D/g, ''),
        },
        to: {
          name: pedido.customer_name,
          phone: pedido.customer_phone || undefined,
          email: pedido.customer_email || undefined,
          document: pedido.customer_cpf || undefined,
          address: pedido.shipping_address,
          complement: pedido.shipping_complement || '',
          number: pedido.shipping_number || 'S/N',
          district: pedido.shipping_neighborhood || '',
          city: pedido.shipping_city || '',
          state: pedido.shipping_state || '',
          country_id: 'BR',
          postal_code: String(pedido.shipping_cep).replace(/\D/g, ''),
        },
        products: items.slice(0, 30).map((i: any) => ({
          name: String(i.title ?? 'Produto').slice(0, 60),
          quantity: Number(i.quantity || 1),
          unitary_value: Number(i.unit_price ?? 0),
        })),
        package: { weight: pesoKg, width: 16, height: 8, length: 24 },
      }),
    });
    const cartData = await cartRes.json();
    if (!cartRes.ok) throw new Error(cartData?.message ?? `Falha no carrinho (${cartRes.status})`);
    const shipmentId: string | undefined = cartData?.shipments?.[0]?.id;
    if (!shipmentId) throw new Error('Resposta do carrinho sem ID de despacho.');

    // 2. Compra da etiqueta (debita da carteira Melhor Envio)
    const checkoutRes = await fetch(`${base}/me/shipment/checkout`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ orders: [shipmentId] }),
    });
    const checkoutData = await checkoutRes.json();
    if (!checkoutRes.ok) throw new Error(checkoutData?.message ?? 'Falha ao comprar a etiqueta (verifique o saldo da carteira Melhor Envio).');

    // 3. Link do PDF
    const printRes = await fetch(`${base}/me/shipment/print?mode=pdf&shipment[id]=${shipmentId}`, {
      headers,
    });
    const printData = await printRes.json();
    const urlPdf = printData?.url;

    // 4. Código de rastreio
    let tracking: string | undefined;
    const trackRes = await fetch(`${base}/me/shipment/tracking`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ orders: [shipmentId] }),
    });
    if (trackRes.ok) {
      const trackData = await trackRes.json();
      tracking = trackData?.[0]?.tracking?.tracking_code;
    }

    await supabase
      .from('orders')
      .update({ tracking_code: tracking ?? null })
      .eq('id', orderId);

    return { ok: true, url: urlPdf, tracking };
  } catch (err: any) {
    console.error('[envios] emitirEtiqueta:', err.message);
    return { ok: false, error: err.message };
  }
}

export function calcularFrete(
  cep: string,
  subtotal: number,
  cfg: ConfiguracaoEnvio
): { metodo: string; custo: number; gratis: boolean; regiao: string } {
  const numeric = cep.replace(/\D/g, '');
  const isLocal = numeric.startsWith('8426') || numeric.startsWith('84260') || numeric.length === 8;
  const metodo = numeric.startsWith('8426') ? 'MOTOBOY' : 'CORREIOS';
  const custoBase = metodo === 'MOTOBOY' ? cfg.valorMotoboy : cfg.valorCorreios;
  const gratis = cfg.freteGratis || (cfg.freteGratisAcimaDe > 0 && subtotal >= cfg.freteGratisAcimaDe);
  return {
    metodo,
    custo: gratis ? 0 : custoBase,
    gratis,
    regiao: metodo === 'MOTOBOY' ? 'Campo Mourão/PR' : 'Todo o Brasil',
  };
}

/**
 * Gera a etiqueta de envio PAC dos Correios em PDF (jsPDF).
 * Quando o token do Melhor Envio estiver configurado, os dados retornados
 * aqui servem de pré-etiqueta — o link final da etiqueta oficial vem do
 * Melhor Envio (endpoint /shipment/{id}/buy + /shipment/{id}/print_label).
 */
export async function gerarEtiquetaPDF(
  pedido: {
    id: string;
    customer_name: string;
    cep: string;
    address?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    items?: { id: string; title: string; quantity: number; unit_price: number }[];
    shipping_method?: string;
    total?: number;
  },
  cfg: ConfiguracaoEnvio
): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: [100, 150] });
  const d = 2; // densidade
  const w = 100;

  const fmtCep = (c: string) => (c || '').replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d{3})/, '$1-$2');

  // Cabeçalho
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('AGNALDO GOMES — ETIQUETA DE ENVIO', w / 2, 10, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Pedido #${pedido.id.toString().slice(0, 8).toUpperCase()}`, w / 2, 15, { align: 'center' });
  doc.line(d, 18, w - d, 18);

  // Remetente
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('REMETENTE', d, 23);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const rem = [cfg.remetenteNome, cfg.remetenteEndereco, `${cfg.remetenteCidade} — ${cfg.remetenteEstado}`, `CEP ${fmtCep(cfg.cepRemetente)}`];
  let y = 27;
  rem.forEach(l => { doc.text(l, d, y); y += 4; });

  doc.line(d, y + 1, w - d, y + 1);
  y += 6;

  // Destinatário
  doc.setFont('helvetica', 'bold');
  doc.text('DESTINATÁRIO', d, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(String(pedido.customer_name || 'Cliente').slice(0, 45), d, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const dest = [pedido.address || 'Endereço informado no checkout', pedido.neighborhood || '', pedido.city ? `${pedido.city} — ${pedido.state || ''}` : '', `CEP ${fmtCep(pedido.cep)}`];
  dest.filter(Boolean).forEach(l => { doc.text(l, d, y); y += 4; });

  y += 4;
  doc.line(d, y, w - d, y);
  y += 5;

  // Método de envio
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`MÉTODO: ${pedido.shipping_method || (pedido.cep?.replace(/\D/g, '').startsWith('8426') ? 'MOTOBOY' : 'CORREIOS PAC')}`, d, y);
  y += 8;

  // Código de barras simulado (Código 128 simplificado em barras)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('CÓDIGO DE RASTREIO (PRÉ-ETIQUETA)', d, y);
  y += 4;
  const code = `BR${pedido.id.toString().slice(0, 12).toUpperCase()}AG`;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(code, w / 2, y + 4, { align: 'center' });
  y += 8;
  // barras
  const barW = 0.6;
  const seed = code.length;
  let x = (w - (code.length * barW * 2)) / 2;
  for (let i = 0; i < code.length; i++) {
    const charCode = code.charCodeAt(i);
    const thick = (charCode + i) % 3 !== 0;
    if (thick) doc.rect(x, y, barW * 2, 10, 'F');
    else doc.rect(x, y, barW * 0.8, 10, 'F');
    x += barW * 2.6;
  }
  y += 14;

  // Conteúdo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('CONTEÚDO', d, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const itens = pedido.items || [];
  itens.slice(0, 6).forEach(item => {
    doc.text(`${item.quantity}x ${String(item.title).slice(0, 42)}`, d, y);
    y += 4;
  });
  y += 3;
  doc.setFont('helvetica', 'bold');
  doc.text(`VALOR DO PEDIDO: R$ ${Number(pedido.total || 0).toFixed(2).replace('.', ',')}`, d, y);
  y += 8;

  // Nota final
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  if (cfg.melhorEnvioToken) {
    doc.text('Pré-etiqueta gerada pelo sistema. A etiqueta oficial dos Correios é', d, y);
    y += 3;
    doc.text('emitida automaticamente pelo Melhor Envio após a compra do despacho.', d, y);
  } else {
    doc.text('Imprima esta pré-etiqueta e cole no pacote. Configure o token do', d, y);
    y += 3;
    doc.text('Melhor Envio em Admin da Loja > Configurações para emissão automática.', d, y);
  }

  return doc.output('blob');
}
