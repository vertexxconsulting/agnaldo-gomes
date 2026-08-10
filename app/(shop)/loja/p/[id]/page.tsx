'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import { Star, Truck, ShieldCheck, ShoppingBag, ExternalLink } from 'lucide-react';
import { useParams } from 'next/navigation';

// Mock
const mockProdutos = [
  {
    id: '1',
    type: 'AFFILIATE_ML',
    nome: 'Secador Taiff Vulcan 2500W Profissional',
    categoria: 'Ferramentas',
    imagem: 'https://http2.mlstatic.com/D_NQ_NP_2X_841285-MLU74530026210_022024-F.webp',
    price: 999.00,
    rating: 5,
    descricao: 'Secador profissional de alta performance com motor V12, garantindo mais secagem em menos tempo. Ideal para o uso intenso no salão de beleza.',
    link: 'https://www.mercadolivre.com.br/'
  },
  {
    id: '2',
    type: 'LOCAL_STOCK',
    nome: 'Kit Maison Visage Cauterização Capilar Completo',
    categoria: 'Cosméticos',
    imagem: 'https://http2.mlstatic.com/D_NQ_NP_2X_606277-MLB48011246991_102021-F.webp',
    price: 289.90,
    rating: 4,
    descricao: 'O kit perfeito para reconstrução capilar. Repõe a queratina perdida e sela as cutículas, proporcionando um brilho espelhado que suas clientes vão amar.',
  },
  {
    id: '3',
    type: 'LOCAL_STOCK',
    nome: 'Pomada Modeladora Mirra 150g Efeito Teia',
    categoria: 'Barbearia',
    imagem: 'https://http2.mlstatic.com/D_NQ_NP_2X_876939-MLU71790479165_092023-F.webp',
    price: 45.00,
    rating: 5,
    descricao: 'Efeito matte (seco) com fixação extra forte. Mantém o penteado estruturado o dia inteiro sem deixar resíduos brancos.',
  }
];

export default function ProductDetailPage() {
  const params = useParams();
  const produto = mockProdutos.find(p => p.id === params.id);
  const addItem = useCartStore(state => state.addItem);
  
  const [cep, setCep] = useState('');
  const [shippingMsg, setShippingMsg] = useState('');

  if (!produto) {
    return notFound();
  }

  const handleAddToCart = () => {
    addItem({
      id: produto.id,
      name: produto.nome,
      price: produto.price,
      image_url: produto.imagem,
      quantity: 1
    });
    alert('Adicionado ao carrinho!');
  };

  const handleCalcShipping = () => {
    if (cep.length < 8) return;
    if (cep.startsWith('8426')) {
      setShippingMsg('Motoboy (Entrega Hoje): R$ 15,00');
    } else {
      setShippingMsg('Correios PAC (3 a 7 dias): R$ 28,50');
    }
  };

  return (
    <div className="container mx-auto px-4 md:px-6 py-6 md:py-10 max-w-6xl">
      
      {/* Breadcrumb Compacto */}
      <nav className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-6 uppercase tracking-wider">
        <Link href="/loja" className="hover:text-amber-500 transition-colors">Home</Link>
        <span>/</span>
        <Link href={`/loja?cat=${produto.categoria}`} className="hover:text-amber-500 transition-colors">{produto.categoria}</Link>
        <span>/</span>
        <span className="text-slate-900 font-medium truncate max-w-[200px] sm:max-w-md">{produto.nome}</span>
      </nav>

      <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
        
        {/* Lado Esquerdo - Galeria */}
        <div className="w-full md:w-[45%] lg:w-[40%] shrink-0 flex flex-col gap-3">
          <div className="bg-white border border-slate-200 aspect-square relative flex items-center justify-center overflow-hidden rounded-sm shadow-sm">
            <Image 
              src={produto.imagem} 
              alt={produto.nome} 
              fill 
              className="object-contain p-8"
            />
            {produto.type === 'AFFILIATE_ML' && (
              <div className="absolute top-4 left-4 bg-amber-100 text-amber-800 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm shadow-sm border border-amber-200">
                Afiliado
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-4 gap-2">
             {[1,2,3,4].map((i) => (
               <div key={i} className={`bg-white aspect-square border ${i===1 ? 'border-amber-500 shadow-sm' : 'border-slate-200'} relative cursor-pointer hover:border-amber-500 transition-colors rounded-sm`}>
                  <Image src={produto.imagem} alt="" fill className="object-contain p-2" />
               </div>
             ))}
          </div>
        </div>

        {/* Lado Direito - Info & Compra */}
        <div className="flex-1 flex flex-col">
          <div className="text-[10px] text-amber-600 font-bold uppercase tracking-widest mb-1.5">{produto.categoria}</div>
          <h1 className="text-xl md:text-2xl font-light text-slate-900 leading-snug mb-3">{produto.nome}</h1>
          
          <div className="flex items-center gap-2 mb-4">
            <div className="flex text-amber-400 gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={12} fill={i < produto.rating ? "currentColor" : "none"} className={i >= produto.rating ? "text-slate-200" : ""} />
              ))}
            </div>
            <span className="text-slate-500 text-[11px]">(12 avaliações)</span>
          </div>

          <div className="mb-6">
            <div className="text-slate-400 text-sm line-through mb-1">R$ {(produto.price * 1.2).toFixed(2)}</div>
            <div className="text-3xl font-bold text-slate-900">
              R$ {produto.price.toFixed(2)}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-medium">em até 12x s/ juros no cartão</div>
          </div>

          {/* Área de Compra */}
          <div className="flex flex-col gap-3 mb-8">
            {produto.type === 'LOCAL_STOCK' ? (
              <button 
                onClick={handleAddToCart}
                className="w-full sm:max-w-sm bg-slate-900 text-white h-12 text-sm font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 shadow-md rounded-sm"
              >
                <ShoppingBag size={18} /> Comprar Agora
              </button>
            ) : (
              <a 
                href={produto.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full sm:max-w-sm bg-blue-600 text-white h-12 text-sm font-bold uppercase tracking-widest hover:bg-blue-500 transition-colors flex items-center justify-center gap-2 shadow-md rounded-sm"
              >
                Comprar no Mercado Livre <ExternalLink size={16} />
              </a>
            )}
          </div>

          {/* Calculadora de Frete Super Compacta */}
          {produto.type === 'LOCAL_STOCK' && (
            <div className="w-full sm:max-w-sm bg-white border border-slate-200 p-4 mb-8 rounded-sm shadow-sm">
              <h3 className="text-xs font-bold flex items-center gap-1.5 text-slate-800 mb-3 uppercase tracking-wider">
                <Truck size={14} className="text-amber-500" /> Consultar Frete
              </h3>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="00000-000" 
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  maxLength={8}
                  className="flex-1 bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-colors rounded-sm" 
                />
                <button 
                  onClick={handleCalcShipping}
                  className="bg-slate-100 text-slate-700 border border-slate-200 px-4 py-2 text-xs font-bold uppercase hover:bg-slate-200 hover:text-slate-900 transition-colors rounded-sm shadow-sm"
                >
                  Calc
                </button>
              </div>
              {shippingMsg && (
                <div className="mt-3 text-xs text-amber-600 font-medium bg-amber-50 p-2 rounded-sm border border-amber-100">
                  {shippingMsg}
                </div>
              )}
            </div>
          )}

          <div className="border-t border-slate-200 pt-6 mt-2">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Descrição do Produto</h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
              {produto.descricao}
            </p>
          </div>

          {/* Garantias */}
          <div className="flex items-center gap-6 mt-8 border-t border-slate-200 pt-6">
             <div className="flex items-center gap-2 text-slate-600 text-[10px] uppercase tracking-wider font-medium">
               <ShieldCheck size={16} className="text-emerald-500" /> Compra Segura
             </div>
             <div className="flex items-center gap-2 text-slate-600 text-[10px] uppercase tracking-wider font-medium">
               <Star size={16} className="text-amber-500" /> Qualidade Garantida
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
