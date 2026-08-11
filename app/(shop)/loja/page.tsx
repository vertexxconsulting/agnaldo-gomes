'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag, Star, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { supabase } from '@/lib/supabase';
const heroSlides = [
  { type: 'video', src: '/opt/hero-loop.mp4' },
  { type: 'image', src: '/opt/loja1.png' },
  { type: 'image', src: '/opt/loja2.jpeg' },
  { type: 'image', src: '/opt/loja3.jpeg' },
  { type: 'image', src: '/opt/loja4.jpeg' },
  { type: 'image', src: '/opt/loja5.jpeg' },
  { type: 'image', src: '/opt/loja6.jpeg' },
  { type: 'image', src: '/opt/loja7.jpeg' },
  { type: 'image', src: '/opt/loja8.jpeg' },
  { type: 'image', src: '/opt/loja9.jpeg' },
  { type: 'image', src: '/opt/loja10.jpeg' },
  { type: 'image', src: '/opt/loja11.jpeg' },
  { type: 'image', src: '/opt/loja12.jpeg' },
];

export default function LojaHome() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      const { data, error } = await supabase.from('products').select('*').eq('active', true);
      if (data) {
        setProducts(data);
      }
      setLoading(false);
    }
    fetchProducts();
  }, []);

  useEffect(() => {
    if (heroSlides[currentSlide].type === 'video' && videoRef.current) {
      videoRef.current.playbackRate = 0.8;
    }
  }, [currentSlide]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000); // 5 seconds per slide (matches video loop length)
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col w-full pb-20">
      
      {/* Banner Principal Clean com Transição */}
      <section className="relative w-full h-[250px] md:h-[350px] bg-[#f8f9fa] flex items-center overflow-hidden border-b border-slate-200">
        
        {/* Background Media */}
        <div className="absolute inset-0 w-full h-full bg-slate-900">
           <AnimatePresence mode="wait">
             <motion.div
                key={currentSlide}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1 }}
                className="absolute inset-0 w-full h-full"
             >
                {heroSlides[currentSlide].type === 'video' ? (
                  <video 
                    ref={videoRef}
                    src={heroSlides[currentSlide].src} 
                    autoPlay 
                    loop 
                    muted 
                    playsInline 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Image 
                    src={heroSlides[currentSlide].src} 
                    alt="Agnaldo Gomes Store" 
                    fill 
                    className="object-cover" 
                    priority
                  />
                )}
             </motion.div>
           </AnimatePresence>
        </div>
        
        <div className="absolute inset-0 bg-gradient-to-r from-[#f8f9fa] via-[#f8f9fa]/70 to-transparent w-full md:w-[80%]" />
        
        <div className="container relative mx-auto px-4 md:px-6 z-10">
          <div className="max-w-lg">
            {currentSlide === 0 && (
              <span className="uppercase tracking-widest text-amber-500 font-bold text-[10px] mb-2 block">Novidade</span>
            )}
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
            {loading ? (
              <div className="col-span-full py-20 flex justify-center items-center text-slate-500">
                Carregando produtos oficiais...
              </div>
            ) : products.length === 0 ? (
              <div className="col-span-full py-20 flex justify-center items-center text-slate-500">
                A vitrine está sendo preparada. Volte em breve!
              </div>
            ) : (
              products.map((produto) => (
                <Link key={produto.id} href={`/loja/p/${produto.id}`} className="group flex flex-col bg-white border border-slate-200 rounded-sm hover:shadow-lg hover:border-amber-400 transition-all duration-300 relative h-full overflow-hidden">
                  
                  {/* Badges */}
                  <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                    {/* Recomendado / Novo - Podemos usar alguma logica futura baseada em data */}
                  </div>

                {/* Imagem */}
                <div className="relative w-full pt-[100%] bg-white">
                  {produto.image_url ? (
                    <Image 
                      src={produto.image_url} 
                      alt={produto.name} 
                      fill 
                      className="object-contain p-4 group-hover:scale-105 transition-transform duration-300" 
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-50 text-slate-300">
                      <ShoppingBag size={48} />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3 flex flex-col flex-1 bg-slate-50/50">
                  <h3 className="text-[12px] text-slate-700 leading-tight mb-3 line-clamp-2 group-hover:text-amber-600 transition-colors flex-1 mt-2">
                    {produto.name}
                  </h3>
                  
                  <div className="mt-auto">
                    <div className="text-lg font-bold text-slate-900 mb-3">
                      R$ {Number(produto.price || 0).toFixed(2)}
                    </div>
                    
                    <button className="w-full bg-slate-100 text-slate-900 border border-slate-200 text-[11px] font-bold uppercase tracking-wider py-2 group-hover:bg-amber-500 group-hover:border-amber-500 group-hover:text-white transition-colors flex items-center justify-center gap-2 rounded-sm shadow-sm">
                      <ShoppingBag size={14} /> Detalhes
                    </button>
                  </div>
                </div>
              </Link>
            )))}
          </div>
          
        </div>
      </section>

    </div>
  );
}
