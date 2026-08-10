export interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  category: string;
  description: string;
  rating?: number;
  reviews?: number;
  isNew?: boolean;
  type?: 'LOCAL_STOCK' | 'AFFILIATE_ML';
  link?: string;
}

export const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Kit Tratamento Reconstrutor',
    price: 289.90,
    image_url: '/opt/produto1.png',
    category: 'Tratamento',
    description: 'Tratamento profundo para cabelos danificados, restaurando a fibra capilar e devolvendo a massa perdida.',
    rating: 4.9,
    reviews: 128,
    isNew: true,
    type: 'LOCAL_STOCK'
  },
  {
    id: '2',
    name: 'Perfume Capilar L\'amant Rosé',
    price: 159.90,
    image_url: '/opt/produto2.png',
    category: 'Finalizadores',
    description: 'Uma fragrância sofisticada que além de perfumar, neutraliza odores e proporciona brilho intenso sem pesar.',
    rating: 5.0,
    reviews: 89,
    isNew: true,
    type: 'LOCAL_STOCK'
  },
  {
    id: '3',
    name: 'Máscara Hidratação Profunda',
    price: 129.90,
    image_url: '/opt/produto3.png',
    category: 'Tratamento',
    description: 'Hidratação instantânea para cabelos secos e opacos. Fórmula enriquecida com óleos essenciais.',
    rating: 4.8,
    reviews: 245,
    type: 'LOCAL_STOCK'
  },
  {
    id: '4',
    name: 'Prancha MQ Pro 480',
    price: 899.90,
    image_url: '/opt/produto1.png',
    category: 'Acessórios',
    description: 'A prancha mais desejada pelos profissionais. Atinge 480°F e reduz o tempo de alisamento pela metade.',
    rating: 4.9,
    reviews: 56,
    type: 'AFFILIATE_ML',
    link: 'https://www.mercadolivre.com.br'
  },
  {
    id: '5',
    name: 'Óleo Reparador de Pontas',
    price: 89.90,
    image_url: '/opt/produto2.png',
    category: 'Finalizadores',
    description: 'Blend de óleos nobres que sela as cutículas, elimina o frizz e proporciona maciez instantânea.',
    rating: 4.7,
    reviews: 112,
    type: 'LOCAL_STOCK'
  },
  {
    id: '6',
    name: 'Máquina de Corte Wahl',
    price: 649.90,
    image_url: '/opt/produto3.png',
    category: 'Barbearia',
    description: 'Potência e precisão para cortes profissionais perfeitos. Bateria de longa duração.',
    rating: 5.0,
    reviews: 34,
    type: 'AFFILIATE_ML',
    link: 'https://www.mercadolivre.com.br'
  }
];
