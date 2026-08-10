'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag, Star, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock de produtos - E-commerce Densidade Alta Light
const mockProdutos = [
  {
    id: '1',
    type: 'AFFILIATE_ML',
    nome: 'Secador Taiff Vulcan 2500W Profissional',
    categoria: 'Ferramentas',
    imagem: 'https://http2.mlstatic.com/D_NQ_NP_2X_841285-MLU74530026210_022024-F.webp',
    price: 999.00,
    rating: 5,
  },
  {
    id: '2',
    type: 'LOCAL_STOCK',
    nome: 'Kit Maison Visage Cauterização Capilar',
    categoria: 'Cosméticos',
    imagem: 'https://http2.mlstatic.com/D_NQ_NP_2X_606277-MLB48011246991_102021-F.webp',
    price: 289.90,
    rating: 4,
  },
  {
    id: '3',
    type: 'LOCAL_STOCK',
    nome: 'Pomada Modeladora Mirra 150g Efeito Teia',
    categoria: 'Barbearia',
    imagem: 'https://http2.mlstatic.com/D_NQ_NP_2X_876939-MLU71790479165_092023-F.webp',
    price: 45.00,
    rating: 5,
  },
  {
    id: '4',
    type: 'AFFILIATE_ML',
    nome: 'Prancha MQ Pro 480 Bivolt Titanium',
    categoria: 'Ferramentas',
    imagem: 'https://http2.mlstatic.com/D_NQ_NP_2X_992147-MLA47124116233_082021-F.webp',
    price: 549.90,
    rating: 5,
  },
  {
    id: '5',
    type: 'LOCAL_STOCK',
    nome: 'Óleo Reparador de Pontas Argan 60ml',
    categoria: 'Finalizadores',
    imagem: 'https://http2.mlstatic.com/D_NQ_NP_2X_606277-MLB48011246991_102021-F.webp',
    price: 79.90,
    rating: 4,
  },
  {
    id: '6',
    type: 'AFFILIATE_ML',
    nome: 'Máquina de Corte Wahl Magic Clip Cordless',
    categoria: 'Barbearia',
    imagem: 'https://http2.mlstatic.com/D_NQ_NP_2X_876939-MLU71790479165_092023-F.webp',
    price: 899.00,
    rating: 5,
  },
];

const bannerImages = [
  '/opt/produto1.png',
  '/opt/produto2.png',
  '/opt/produto3.png',
  '/opt/produto4.png'
];

export default function LojaHome() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % bannerImages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col w-full pb-20">
      
      {/* Banner Principal Clean com Transição */}
      <section className="relative w-full h-[250px] md:h-[350px] bg-[#f8f9fa] flex items-center overflow-hidden border-b border-slate-200">
        
        {/* Background Images */}
        <div className="absolute inset-0 flex items-center justify-end pr-10 md:pr-20">
           <AnimatePresence mode="wait">
             <motion.div
                key={currentImageIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.6 }}
                className="relative w-[250px] h-[250px] md:w-[350px] md:h-[350px]"
             >
                <Image 
                  src={bannerImages[currentImageIndex]} 
                  alt="Banner Image" 
                  fill 
                  className="object-contain" 
                  priority
                />
             </motion.div>
           </AnimatePresence>
        </div>
        
        <div className="absolute inset-0 bg-gradient-to-r from-[#f8f9fa] via-[#f8f9fa]/90 to-transparent" />
        
        <div className="container relative mx-auto px-4 md:px-6 z-10">
          <div className="max-w-lg">
            <span className="uppercase tracking-widest text-amber-500 font-bold text-[10px] mb-2 block">Novidade</span>
            <h1 className="text-2xl md:text-4xl font-bold text-slate-900 mb-2 leading-tight">
              Kits de Tratamento <br/>com 20% OFF
            </h1>
            <p className="text-xs md:text-sm text-slate-600 mb-6">
              A linha completa recomendada para salões de alta performance.
            </p>
            <Link href="#produtos" className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-amber-500 transition-colors">
              Ver Ofertas <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* Grid de Produtos (Alta Densidade) */}
      <section id="produtos" className="pt-12">
        <div className="container mx-auto px-4 md:px-6">
          
          <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-widest">Mais Vendidos</h2>
            <Link href="/loja/todos" className="text-[10px] text-amber-600 font-bold uppercase tracking-widest hover:text-amber-700 transition-colors flex items-center gap-1">
              Ver Todos <ArrowRight size={12} />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {mockProdutos.map((produto) => (
              <Link key={produto.id} href={`/loja/p/${produto.id}`} className="group flex flex-col bg-white border border-slate-200 rounded-sm hover:shadow-lg hover:border-amber-400 transition-all duration-300 relative h-full overflow-hidden">
                
                {/* Badges */}
                <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                  {produto.type === 'AFFILIATE_ML' && (
                    <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-sm shadow-sm">
                      Recomendado
                    </span>
                  )}
                </div>

                {/* Imagem */}
                <div className="relative w-full pt-[100%] bg-white">
                  <Image 
                    src={produto.imagem} 
                    alt={produto.nome} 
                    fill 
                    className="object-contain p-4 group-hover:scale-105 transition-transform duration-300" 
                  />
                </div>

                {/* Info */}
                <div className="p-3 flex flex-col flex-1 bg-slate-50/50">
                  <div className="flex text-amber-400 gap-0.5 mb-1.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={10} fill={i < produto.rating ? "currentColor" : "none"} className={i >= produto.rating ? "text-slate-300" : ""} />
                    ))}
                  </div>
                  
                  <h3 className="text-[12px] text-slate-700 leading-tight mb-3 line-clamp-2 group-hover:text-amber-600 transition-colors flex-1">
                    {produto.nome}
                  </h3>
                  
                  <div className="mt-auto">
                    <div className="text-[10px] text-slate-400 line-through mb-0.5">R$ {(produto.price * 1.2).toFixed(2)}</div>
                    <div className="text-lg font-bold text-slate-900 mb-3">
                      R$ {produto.price.toFixed(2)}
                    </div>
                    
                    <button className="w-full bg-slate-100 text-slate-900 border border-slate-200 text-[11px] font-bold uppercase tracking-wider py-2 group-hover:bg-amber-500 group-hover:border-amber-500 group-hover:text-white transition-colors flex items-center justify-center gap-2 rounded-sm shadow-sm">
                      <ShoppingBag size={14} /> Comprar
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          
        </div>
      </section>

    </div>
  );
}
