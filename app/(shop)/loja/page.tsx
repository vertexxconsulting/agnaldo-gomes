'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag, ArrowRight, Star, Truck, ShieldCheck, Search, Sparkles, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '@/store/cartStore';

import { supabase } from '@/lib/supabase';
import { MOCK_PRODUCTS, type ShopProduct } from '@/lib/shop-mock';

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

function toProduct(p: any): ShopProduct {
  return {
    id: p.id,
    type: p.type ?? 'LOCAL_STOCK',
    name: p.name,
    description: p.description ?? '',
    category: p.category ?? 'Geral',
    image_url: p.image_url ?? '',
    active: p.active ?? true,
    ml_link: p.ml_link ?? null,
    price: p.price ?? null,
    stock_quantity: p.stock_quantity ?? 0,
    rating: p.rating ?? 4.8,
    reviews: p.reviews ?? Math.floor(Math.random() * 100) + 20,
    tagline: p.tagline ?? null,
  };
}

export default function LojaHome() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const addItem = useCartStore(state => state.addItem);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const { data, error } = await supabase.from('products').select('*').eq('active', true);
        if (error) {
          console.error('Supabase error:', error.message);
          setFetchError(error.message);
          // Fallback para catálogo de demonstração profissional
          setProducts(MOCK_PRODUCTS);
        } else if (data && data.length > 0) {
          setProducts(data.map(toProduct));
        } else {
          // Supabase vazio: catálogo de demonstração
          setProducts(MOCK_PRODUCTS);
        }
      } catch {
        setProducts(MOCK_PRODUCTS);
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
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const categories = useMemo(() => {
    return [...new Set(products.filter(p => p.active).map(p => p.category))];
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter(p => {
      if (!p.active) return false;
      if (selectedCategory && p.category !== selectedCategory) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
      }
      return true;
    });
  }, [products, selectedCategory, search]);

  const featured = useMemo(() => products.filter(p => p.featured).slice(0, 4), [products]);
  const maisVendidos = useMemo(
    () => [...products.filter(p => p.type === 'LOCAL_STOCK')].sort((a, b) => b.reviews - a.reviews).slice(0, 8),
    [products]
  );

  const handleAddToCart = (p: ShopProduct) => {
    addItem({ id: p.id, name: p.name, price: p.price ?? 0, image_url: p.image_url, quantity: 1 });
    setToast(`${p.name.length > 38 ? p.name.slice(0, 38) + '…' : p.name} adicionado!`);
    setTimeout(() => setToast(null), 2500);
  };

  return (
    <div className="flex flex-col w-full pb-20">

      {/* Toast de adição ao carrinho */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-lg shadow-xl flex items-center gap-2"
          >
            <ShoppingBag size={14} className="text-primary" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Banner Principal com Transição */}
      <section className="relative w-full h-[250px] md:h-[350px] flex items-center overflow-hidden border-b border-[var(--border-subtle)]">
        <div className="absolute inset-0 w-full h-full bg-foreground">
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

        {/* Overlay com CTA e Barra de Busca */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/50" />
        <div className="relative z-10 container mx-auto px-4 md:px-6 flex flex-col items-center justify-center gap-5 text-center">
          <div>
            <p className="text-[10px] md:text-[11px] font-bold text-primary uppercase tracking-[0.3em] mb-2">
              A Loja Oficial do Agnaldo Gomes
            </p>
            <h1 className="text-xl md:text-3xl font-serif font-bold text-white leading-tight text-balance">
              Produtos selecionados pelo <span className="text-primary">profissional</span> que você admira
            </h1>
          </div>
          <div className="w-full max-w-xl flex gap-2">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar produtos, tratamentos, ferramentas..."
                className="w-full bg-card text-foreground placeholder:text-foreground/40 text-sm pl-9 pr-4 py-3 rounded-lg border border-transparent focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none transition-colors shadow-lg"
              />
            </div>
            <Link
              href="/loja/carrinho"
              className="bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-xs uppercase tracking-widest px-5 rounded-lg shadow-lg transition-colors flex items-center gap-2"
            >
              <ShoppingBag size={15} />
              <span className="hidden sm:inline">Carrinho</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Barra de Categorias */}
      <section className="sticky top-16 md:top-[72px] z-20 bg-card/90 backdrop-blur-sm border-b border-[var(--border-subtle)] shadow-sm">
        <div className="container mx-auto px-4 md:px-6 py-2.5 flex gap-2 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border transition-colors ${
              selectedCategory === null
                ? 'bg-foreground text-background border-foreground'
                : 'bg-card text-foreground/60 border-[var(--border-subtle)] hover:border-primary hover:text-foreground'
            }`}
          >
            Todos
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border transition-colors ${
                selectedCategory === cat
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-card text-foreground/60 border-[var(--border-subtle)] hover:border-primary hover:text-foreground'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Seção Destaques */}
      {featured.length > 0 && !selectedCategory && !search && (
        <section className="pt-8">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base md:text-lg font-bold text-foreground flex items-center gap-2">
                <Sparkles size={16} className="text-primary" /> Destaques AG
              </h2>
              <Link href="/loja/categoria/mais-vendidos" className="text-[10px] text-primary font-bold uppercase tracking-widest hover:text-primary-hover transition-colors flex items-center gap-1">
                Ver Todos <ArrowRight size={12} />
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {featured.map(p => (
                <ProductCard key={p.id} produto={p} onAdd={handleAddToCart} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Grid de Produtos */}
      <section id="produtos" className="pt-8">
        <div className="container mx-auto px-4 md:px-6">

          <div className="flex justify-between items-center mb-5 pb-2 border-b border-[var(--border-subtle)]">
            <h2 className="text-base md:text-lg font-bold text-foreground flex items-center gap-2">
              <Flame size={16} className="text-primary" />
              {selectedCategory ?? (search ? `Resultados para "${search}"` : 'Mais Vendidos')}
              {filtered.length > 0 && (
                <span className="text-[10px] font-medium text-foreground/40 ml-2">({filtered.length})</span>
              )}
            </h2>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center items-center text-foreground/50">
              Carregando produtos oficiais...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 flex flex-col justify-center items-center text-center">
              <Search size={40} className="text-foreground/20 mb-4" />
              <p className="font-bold text-foreground mb-1">Nenhum produto encontrado</p>
              <p className="text-xs text-foreground/50 mb-5">Tente outro termo ou categoria.</p>
              <button
                onClick={() => { setSearch(''); setSelectedCategory(null); }}
                className="bg-foreground text-background px-5 py-2 text-xs font-bold uppercase tracking-wider hover:bg-primary hover:text-primary-foreground transition-colors rounded-lg"
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
              {filtered.map(produto => (
                <ProductCard key={produto.id} produto={produto} onAdd={handleAddToCart} />
              ))}
            </div>
          )}

        </div>
      </section>

      {/* Faixa de confiança */}
      <section className="mt-10 border-t border-[var(--border-subtle)] bg-secondary/40">
        <div className="container mx-auto px-4 md:px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-5">
          {[
            { icon: Truck, title: 'Entrega Garantida', desc: 'Motoboy local no mesmo dia ou Correios para todo Brasil' },
            { icon: ShieldCheck, title: 'Compra Segura', desc: 'Pagamento processado em ambiente criptografado' },
            { icon: Star, title: 'Qualidade AG', desc: 'Produtos aprovados e usados pela equipe no dia a dia' },
            { icon: ShoppingBag, title: 'Retire no Salon', desc: 'Retire seu pedido no salon sem custo de frete' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex flex-col items-center text-center gap-2">
              <Icon size={22} className="text-primary" />
              <p className="text-[11px] font-bold text-foreground uppercase tracking-wider">{title}</p>
              <p className="text-[10px] text-foreground/50 leading-relaxed max-w-[220px]">{desc}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}

/* ────────────────────── Card de produto reutilizável ────────────────────── */

function ProductCard({ produto, onAdd }: { produto: ShopProduct; onAdd: (p: ShopProduct) => void }) {
  const isAffiliate = produto.type === 'AFFILIATE_ML';
  const outOfStock = produto.type === 'LOCAL_STOCK' && produto.stock_quantity === 0;

  return (
    <Link href={`/loja/p/${produto.id}`} className="group flex flex-col bg-card border border-[var(--border-subtle)] rounded-xl hover:shadow-lg hover:border-primary/50 transition-all duration-300 relative h-full overflow-hidden">

      {/* Badges */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
        {produto.tagline && (
          <span className="bg-foreground text-background text-[8px] md:text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-md shadow">
            {produto.tagline}
          </span>
        )}
        {isAffiliate && (
          <span className="bg-warning/10 text-warning border border-warning/25 text-[8px] md:text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-md">
            Mercado Livre
          </span>
        )}
        {outOfStock && (
          <span className="bg-danger/10 text-danger border border-danger/25 text-[8px] md:text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-md">
            Esgotado
          </span>
        )}
      </div>

      {/* Imagem */}
      <div className="relative w-full pt-[100%] bg-card">
        {produto.image_url ? (
          <Image
            src={produto.image_url}
            alt={produto.name}
            fill
            className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-background text-foreground/20">
            <ShoppingBag size={48} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1 border-t border-[var(--border-subtle)]">
        <h3 className="text-[12px] text-foreground/80 leading-tight mb-1 line-clamp-2 group-hover:text-primary transition-colors flex-1 mt-2">
          {produto.name}
        </h3>

        <div className="flex items-center gap-1 mb-2">
          <Star size={10} className="text-primary" fill="currentColor" />
          <span className="text-[10px] font-bold text-foreground">{produto.rating.toFixed(1)}</span>
          <span className="text-[9px] text-foreground/40">({produto.reviews})</span>
        </div>

        <div className="mt-auto">
          <div className="text-base font-bold text-foreground mb-3">
            {produto.price !== null ? `R$ ${Number(produto.price).toFixed(2)}` : 'Ver oferta'}
          </div>

          <button
            onClick={(e) => { e.preventDefault(); onAdd(produto); }}
            disabled={outOfStock}
            className="w-full bg-secondary text-foreground border border-transparent text-[11px] font-bold uppercase tracking-wider py-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors flex items-center justify-center gap-2 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:group-hover:bg-secondary disabled:group-hover:text-foreground"
          >
            <ShoppingBag size={14} />
            {outOfStock ? 'Indisponível' : isAffiliate ? 'Ver Oferta' : 'Detalhes'}
          </button>
        </div>
      </div>
    </Link>
  );
}
