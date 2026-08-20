/**
 * Catálogo de demonstração da Loja Agnaldo Gomes.
 * Usado quando o Supabase não está configurado no ambiente de deploy.
 * Estrutura espelha a tabela `products` do schema Supabase.
 */

export interface ShopProduct {
  id: string;
  type: 'AFFILIATE_ML' | 'LOCAL_STOCK';
  name: string;
  description: string;
  category: string;
  image_url: string;
  active: boolean;
  ml_link: string | null;
  price: number | null;
  stock_quantity: number;
  rating: number;
  reviews: number;
  featured?: boolean;
  tagline?: string;
}

export const SHOP_CATEGORIES = [
  { slug: 'finalizacao', name: 'Finalização & Styling', icon: 'Sparkles' },
  { slug: 'tratamento', name: 'Tratamento Capilar', icon: 'Droplets' },
  { slug: 'coloracao', name: 'Coloração Profissional', icon: 'Palette' },
  { slug: 'ferramentas', name: 'Ferramentas & Equipamentos', icon: 'Scissors' },
  { slug: 'barbearia', name: 'Barbearia', icon: 'Beard' },
];

export const MOCK_PRODUCTS: ShopProduct[] = [
  {
    id: 'mock-prod-1',
    type: 'LOCAL_STOCK',
    name: 'Creme para Pentear Premium Agnaldo Gomes — Fixação Forte 500ml',
    description:
      'Formulação exclusiva para finalizar com brilho e definição sem pesar. Enri­quecido com queratina líquida e óleo de argan, ideal para cachos, ondas e penteados de alta duração. Textura leve, seca rápido e não deixa resíduos.',
    category: 'Finalização & Styling',
    image_url: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&q=80&w=800&h=800',
    active: true,
    ml_link: null,
    price: 69.90,
    stock_quantity: 24,
    rating: 4.9,
    reviews: 128,
    featured: true,
    tagline: 'O mais vendido',
  },
  {
    id: 'mock-prod-2',
    type: 'LOCAL_STOCK',
    name: 'Óleo Reparador de Pontas — Argan & Vitamina E 100ml',
    description:
      'Repara pontas duplas e selam a fibra capilar com brilho espelhado. Aplicação leve: poucas gotas no cabelo úmido ou seco. Aroma sofisticado com fundo amadeirado.',
    category: 'Tratamento Capilar',
    image_url: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&q=80&w=800&h=800',
    active: true,
    ml_link: null,
    price: 89.90,
    stock_quantity: 18,
    rating: 4.8,
    reviews: 96,
    tagline: 'Brilho espelhado',
  },
  {
    id: 'mock-prod-3',
    type: 'LOCAL_STOCK',
    name: 'Shampoo Pós-Coloração Anti-Desbotamento 300ml',
    description:
      'Sistema com filtro UV e pigmentos encapsulados que prolongam a cor por até 4x mais tempo. pH balanceado 5.5, livre de sulfatos agressivos e sal. Perfeito para quem faz luzes e morena iluminada.',
    category: 'Coloração Profissional',
    image_url: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&q=80&w=800&h=800',
    active: true,
    ml_link: null,
    price: 54.90,
    stock_quantity: 32,
    rating: 4.9,
    reviews: 204,
    featured: true,
    tagline: 'Cor por 4x mais tempo',
  },
  {
    id: 'mock-prod-4',
    type: 'LOCAL_STOCK',
    name: 'Máscara Reconstrutora Intensiva — Queratina Pura 450g',
    description:
      'Reconstrução profunda semanal para cabelos danificados por química. Restaura a massa capilar em uma aplicação, com resultado de salon em casa. Uso recomendado 1x por semana.',
    category: 'Tratamento Capilar',
    image_url: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&q=80&w=800&h=800',
    active: true,
    ml_link: null,
    price: 79.90,
    stock_quantity: 15,
    rating: 4.7,
    reviews: 71,
    tagline: 'Resulta­do de salon',
  },
  {
    id: 'mock-prod-5',
    type: 'LOCAL_STOCK',
    name: 'Secador Profissional 2400W com Íons Negativos',
    description:
      'Motor AC de longa duração, 6 temperaturas e jato de ar frio. Tecnologia de íons negativos que reduz o frizz e sela a cutícula, secando 30% mais rápido. Cabo profissional de 2,5m.',
    category: 'Ferramentas & Equipamentos',
    image_url: 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?auto=format&fit=crop&q=80&w=800&h=800',
    active: true,
    ml_link: null,
    price: 449.90,
    stock_quantity: 8,
    rating: 4.8,
    reviews: 44,
    featured: true,
    tagline: 'Uso profissional',
  },
  {
    id: 'mock-prod-6',
    type: 'LOCAL_STOCK',
    name: 'Tesoura de Corte Japonesa 6.0" Aço Inox — Agnaldo Edition',
    description:
      'Tesoura de corte profissional em aço inox japonês com fio cirúrgico e regulagem de tensão. Cabo ergonômico com descanso para dedo. A mesma que usamos todos os dias no salon.',
    category: 'Ferramentas & Equipamentos',
    image_url: 'https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&q=80&w=800&h=800',
    active: true,
    ml_link: null,
    price: 329.90,
    stock_quantity: 10,
    rating: 5.0,
    reviews: 37,
    tagline: 'Edição especial',
  },
  {
    id: 'mock-prod-7',
    type: 'LOCAL_STOCK',
    name: 'Pomada Modeladora Matte — Efeito Natural 120g',
    description:
      'Fixação média-alta com acabamento matte, sem brilho e sem efeito molhado. Ideal para estilos modernos e texturizados. Base à água: sai fácil no banho e não acumula no cabelo.',
    category: 'Barbearia',
    image_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=800&h=800',
    active: true,
    ml_link: null,
    price: 49.90,
    stock_quantity: 27,
    rating: 4.6,
    reviews: 83,
    tagline: 'Efeito matte',
  },
  {
    id: 'mock-prod-8',
    type: 'LOCAL_STOCK',
    name: 'Kit Visagismo Completo — Agnaldo Gomes',
    description:
      'Kit exclusivo com shampoo, condicionador, óleo reparador e guia em PDF do método Visagismo AG. Edição limitada assinada. Acompanha certificado digital de participação.',
    category: 'Tratamento Capilar',
    image_url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=800&h=800',
    active: true,
    ml_link: null,
    price: 199.90,
    stock_quantity: 12,
    rating: 5.0,
    reviews: 58,
    featured: true,
    tagline: 'Edição limitada',
  },
  {
    id: 'mock-prod-9',
    type: 'AFFILIATE_ML',
    name: 'Chapinha Profissional Titânio — Compre no Mercado Livre',
    description:
      'Placas de titânio com aquecimento rápido e temperatura até 230°C. Recomendada pela equipe AG. Clique para comprar no Mercado Livre com garantia oficial.',
    category: 'Ferramentas & Equipamentos',
    image_url: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?auto=format&fit=crop&q=80&w=800&h=800',
    active: true,
    ml_link: 'https://lista.mercadolivre.com.br/chapinha-profissional-titanio',
    price: null,
    stock_quantity: 0,
    rating: 4.5,
    reviews: 1240,
  },
  {
    id: 'mock-prod-10',
    type: 'LOCAL_STOCK',
    name: 'Água Micelar Capilar Demaquilante de Couro Cabeludo 200ml',
    description:
      'Limpa suavemente o couro cabeludo e remove resíduos de styling e poluição sem ressecar. Prepara a fibra para receber tratamentos com máxima absorção.',
    category: 'Tratamento Capilar',
    image_url: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&q=80&w=800&h=800',
    active: true,
    ml_link: null,
    price: 64.90,
    stock_quantity: 20,
    rating: 4.7,
    reviews: 52,
  },
  {
    id: 'mock-prod-11',
    type: 'AFFILIATE_ML',
    name: 'Máquina de Corte Profissional — Compre no Mercado Livre',
    description:
      'Cortador profissional sem fio com bateria de lítio e kit de pentes inclusos. Escolha oficial da barbearia AG.',
    category: 'Barbearia',
    image_url: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&q=80&w=800&h=800',
    active: true,
    ml_link: 'https://lista.mercadolivre.com.br/maquina-de-corte-profissional',
    price: null,
    stock_quantity: 0,
    rating: 4.6,
    reviews: 830,
  },
  {
    id: 'mock-prod-12',
    type: 'LOCAL_STOCK',
    name: 'Spray Fixador Volume & Brilho — Extra Forte 300ml',
    description:
      'Fixação máxima com brilho natural e proteção térmica até 230°C. Não esfarela e escova facilmente. Essencial para penteados de festa.',
    category: 'Finalização & Styling',
    image_url: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&q=80&w=800&h=800',
    active: true,
    ml_link: null,
    price: 59.90,
    stock_quantity: 22,
    rating: 4.8,
    reviews: 67,
  },
];

/** Extrai categorias únicas dos produtos ativos */
export function getShopCategories(): string[] {
  return [...new Set(MOCK_PRODUCTS.filter(p => p.active).map(p => p.category))];
}
