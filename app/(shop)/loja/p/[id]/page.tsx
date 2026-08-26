'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import { Star, Truck, ShieldCheck, ShoppingBag, ExternalLink, Check, Minus, Plus, RotateCcw } from 'lucide-react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

import { supabase } from '@/lib/supabase';
import { MOCK_PRODUCTS, type ShopProduct } from '@/lib/shop-mock';

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
    reviews: p.reviews ?? 20,
    tagline: p.tagline ?? null,
  };
}

export default function ProductDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0];
  const addItem = useCartStore(state => state.addItem);
  const itemCount = useCartStore(state => state.getItemCount());

  const [produto, setProduto] = useState<ShopProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [cep, setCep] = useState('');
  const [shippingMsg, setShippingMsg] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    async function fetchProduct() {
      if (!id) return;
      // Busca mock se o Supabase não estiver configurado (env vazio) ou falhar
      const loadFromSupabase = async () => {
        const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
        if (error || !data) throw new Error(error?.message ?? 'not found');
        return data;
      };
      try {
        const data = await loadFromSupabase();
        setProduto(toProduct(data));
      } catch {
        const mock = MOCK_PRODUCTS.find(p => p.id === id);
        if (mock) setProduto(mock);
      }
      setLoading(false);
    }
    fetchProduct();
  }, [id]);

  const related = useMemo(
    () =>
      produto
        ? MOCK_PRODUCTS.filter(p => p.active && p.category === produto.category && p.id !== produto.id).slice(0, 4)
        : [],
    [produto]
  );

  // Galeria: a imagem principal + 3 variações (usando a mesma imagem como placeholder)
  const gallery = useMemo(() => {
    if (!produto?.image_url) return [];
    return [produto.image_url, produto.image_url, produto.image_url, produto.image_url];
  }, [produto]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center text-foreground/50">
        Carregando detalhes do produto...
      </div>
    );
  }

  if (!produto) {
    return notFound();
  }

  const handleAddToCart = () => {
    addItem({
      id: produto.id,
      name: produto.name,
      price: produto.price ?? 0,
      image_url: produto.image_url,
      quantity,
    });
    setToast(`${quantity}x adicionado${quantity > 1 ? 's' : ''} ao carrinho!`);
    setTimeout(() => setToast(null), 2500);
  };

  const handleCalcShipping = () => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length < 8) {
      setShippingMsg('CEP inválido. Digite 8 números.');
      return;
    }
    if (cleanCep.startsWith('8426')) {
      setShippingMsg('Motoboy (Entrega Hoje): R$ 15,00');
    } else {
      setShippingMsg('Correios PAC (3 a 7 dias úteis): R$ 28,50 • SEDEX expresso: R$ 42,90');
    }
  };

  const outOfStock = produto.type === 'LOCAL_STOCK' && produto.stock_quantity === 0;
  const installments = produto.price ? (produto.price / 12).toFixed(2) : null;

  return (
    <div className="container mx-auto px-4 md:px-6 py-6 md:py-10 max-w-6xl relative">

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-lg shadow-xl flex items-center gap-2"
          >
            <Check size={14} className="text-success" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-[11px] text-foreground/50 mb-6 uppercase tracking-wider">
        <Link href="/loja" className="hover:text-primary transition-colors">Home</Link>
        <span>/</span>
        <Link href="/loja" className="hover:text-primary transition-colors">{produto.category}</Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate max-w-[200px] sm:max-w-md">{produto.name}</span>
      </nav>

      <div className="flex flex-col md:flex-row gap-6 lg:gap-6">

        {/* Galeria */}
        <div className="w-full md:w-[45%] lg:w-[40%] shrink-0 flex flex-col gap-3">
          <div className="bg-card border border-[var(--border-subtle)] aspect-square relative flex items-center justify-center overflow-hidden rounded-xl shadow-sm">
            {produto.image_url ? (
              <Image
                src={produto.image_url}
                alt={produto.name}
                fill
                className="object-contain p-8"
              />
            ) : (
              <ShoppingBag size={64} className="text-foreground/15" />
            )}
            {produto.tagline && (
              <div className="absolute top-4 left-4 bg-foreground text-background text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md shadow">
                {produto.tagline}
              </div>
            )}
            {produto.type === 'AFFILIATE_ML' && (
              <div className="absolute top-4 right-4 bg-warning/10 text-warning border border-warning/25 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md">
                Via Mercado Livre
              </div>
            )}
          </div>

          {gallery.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {gallery.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedImage(i)}
                  className={`bg-card aspect-square border relative cursor-pointer hover:border-primary transition-colors rounded-lg overflow-hidden ${
                    i === selectedImage ? 'border-primary ring-1 ring-primary/30' : 'border-[var(--border-subtle)]'
                  }`}
                >
                  <Image src={img} alt="" fill className="object-contain p-2" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info & Compra */}
        <div className="flex-1 flex flex-col">
          <div className="text-[10px] text-primary font-bold uppercase tracking-widest mb-1.5">{produto.category}</div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground leading-snug mb-3 text-balance">{produto.name}</h1>

          <div className="flex items-center gap-2 mb-4">
            <div className="flex text-primary gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={12} fill={i < Math.round(produto.rating) ? 'currentColor' : 'none'} className={i >= Math.round(produto.rating) ? 'text-foreground/15' : ''} />
              ))}
            </div>
            <span className="text-foreground/50 text-[11px]">{produto.rating.toFixed(1)} ({produto.reviews} avaliações)</span>
          </div>

          <div className="mb-5">
            <div className="text-3xl font-bold text-foreground">
              {produto.price !== null ? `R$ ${Number(produto.price).toFixed(2)}` : 'Oferta no Mercado Livre'}
            </div>
            {produto.price && (
              <>
                <div className="text-xs text-foreground/60 mt-1 font-medium">
                  em até 12x de R$ {installments} sem juros no cartão
                </div>
                <div className="text-xs text-success mt-1 font-medium">
                  ou R$ {(produto.price * 0.9).toFixed(2)} no PIX (10% de desconto)
                </div>
              </>
            )}
          </div>

          {/* Estoque */}
          {produto.type === 'LOCAL_STOCK' && (
            <div className="flex items-center gap-2 text-xs mb-5">
              {outOfStock ? (
                <span className="text-danger font-bold">Produto esgotado</span>
              ) : (
                <>
                  <span className={`inline-block w-2 h-2 rounded-full ${produto.stock_quantity < 10 ? 'bg-warning' : 'bg-success'}`} />
                  <span className="text-foreground/70 font-medium">
                    {produto.stock_quantity < 10 ? `Últimas ${produto.stock_quantity} unidades` : 'Em estoque'}
                  </span>
                </>
              )}
            </div>
          )}

          {/* Área de Compra */}
          <div className="flex flex-col gap-3 mb-6">
            {produto.type === 'LOCAL_STOCK' ? (
              <>
                {!outOfStock && (
                  <div className="flex items-center gap-3 mb-1">
                    <div className="flex items-center bg-background border border-[var(--border-subtle)] rounded-lg">
                      <button
                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        className="p-2.5 text-foreground/50 hover:text-foreground transition-colors"
                        type="button"
                        aria-label="Diminuir quantidade"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="font-bold w-8 text-center text-sm text-foreground">{quantity}</span>
                      <button
                        onClick={() => setQuantity(q => Math.min(produto.stock_quantity, q + 1))}
                        className="p-2.5 text-foreground/50 hover:text-foreground transition-colors"
                        type="button"
                        aria-label="Aumentar quantidade"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button
                      onClick={handleAddToCart}
                      disabled={outOfStock}
                      className="flex-1 sm:flex-none sm:w-64 bg-primary text-primary-foreground h-12 text-sm font-bold uppercase tracking-widest hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 shadow-md rounded-lg disabled:opacity-50"
                    >
                      <ShoppingBag size={18} /> Adicionar ao Carrinho
                    </button>
                  </div>
                )}
                <Link
                  href={outOfStock ? '/loja' : '/loja/carrinho'}
                  className={`flex-1 sm:flex-none sm:w-64 h-11 text-xs font-bold uppercase tracking-widest text-center flex items-center justify-center gap-2 rounded-lg border transition-colors ${
                    outOfStock
                      ? 'border-[var(--border-subtle)] text-foreground/50 bg-card'
                      : 'border-primary text-primary bg-primary/10 hover:bg-primary/20'
                  }`}
                >
                  <ShoppingBag size={14} /> Ir para o Carrinho ({itemCount})
                </Link>
              </>
            ) : (
              <a
                href={produto.ml_link ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:max-w-sm bg-foreground text-background h-12 text-sm font-bold uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center gap-2 shadow-md rounded-lg"
              >
                Comprar no Mercado Livre <ExternalLink size={16} />
              </a>
            )}
          </div>

          {/* Calculadora de Frete */}
          {produto.type === 'LOCAL_STOCK' && !outOfStock && (
            <div className="w-full sm:max-w-sm bg-card border border-[var(--border-subtle)] p-4 mb-6 rounded-xl shadow-sm">
              <h3 className="text-xs font-bold flex items-center gap-1.5 text-foreground mb-3 uppercase tracking-wider">
                <Truck size={14} className="text-primary" /> Consultar Frete e Prazo
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="00000-000"
                  value={cep}
                  onChange={(e) => setCep(e.target.value.replace(/\D/g, ''))}
                  maxLength={8}
                  className="flex-1 bg-background border border-[var(--border-subtle)] px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-colors rounded-lg"
                />
                <button
                  onClick={handleCalcShipping}
                  className="bg-secondary text-foreground border border-transparent px-4 py-2 text-xs font-bold uppercase hover:bg-primary hover:text-primary-foreground transition-colors rounded-lg shadow-sm"
                >
                  Calc
                </button>
              </div>
              {shippingMsg && (
                <div className="mt-3 text-xs text-primary-hover font-medium bg-primary/10 p-2.5 rounded-lg border border-primary/20">
                  {shippingMsg}
                </div>
              )}
            </div>
          )}

          {/* Descrição */}
          <div className="border-t border-[var(--border-subtle)] pt-6 mt-2">
            <h3 className="text-sm font-bold text-foreground mb-2">Descrição do Produto</h3>
            <p className="text-xs text-foreground/70 leading-relaxed max-w-2xl whitespace-pre-line">
              {produto.description || 'Produto de alta qualidade, selecionado pela equipe do Agnaldo Gomes Studio.'}
            </p>
          </div>

          {/* Benefícios */}
          <div className="grid grid-cols-3 gap-3 mt-6 border-t border-[var(--border-subtle)] pt-6">
            {[
              { icon: ShieldCheck, label: 'Compra Segura' },
              { icon: Truck, label: 'Entrega Rápida' },
              { icon: RotateCcw, label: 'Troca em 7 dias' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center text-center gap-1.5">
                <Icon size={18} className="text-primary" />
                <span className="text-[10px] text-foreground/60 uppercase tracking-wider font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Produtos relacionados */}
      {related.length > 0 && (
        <section className="mt-14 pt-10 border-t border-[var(--border-subtle)]">
          <h2 className="text-xl font-serif font-bold text-foreground mb-5">
            Quem comprou este produto também levou
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {related.map(p => (
              <Link key={p.id} href={`/loja/p/${p.id}`} className="group flex flex-col bg-card border border-[var(--border-subtle)] rounded-xl hover:shadow-lg hover:border-primary/50 transition-all overflow-hidden">
                <div className="relative w-full pt-[100%] bg-card">
                  {p.image_url && (
                    <Image src={p.image_url} alt={p.name} fill className="object-contain p-4 group-hover:scale-105 transition-transform duration-300" />
                  )}
                </div>
                <div className="p-3 flex flex-col flex-1 border-t border-[var(--border-subtle)]">
                  <h3 className="text-[11px] text-foreground/80 leading-tight line-clamp-2 group-hover:text-primary transition-colors flex-1">{p.name}</h3>
                  <div className="text-sm font-bold text-foreground mt-2">
                    {p.price !== null ? `R$ ${Number(p.price).toFixed(2)}` : 'Ver oferta'}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
