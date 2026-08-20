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
