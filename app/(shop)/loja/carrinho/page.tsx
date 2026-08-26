'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCartStore } from '@/store/cartStore';
import { Trash2, ArrowRight, Minus, Plus, ShoppingBag, Tag, ShieldCheck, Truck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CartPage() {
  const { items, removeItem, updateQuantity, getTotal, getItemCount } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [cep, setCep] = useState('');
  const [shippingEstimate, setShippingEstimate] = useState<string | null>(null);
  const [coupon, setCoupon] = useState('');
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const subtotal = getTotal();

  const handleCalcShipping = () => {
    const d = cep.replace(/\D/g, '');
    if (d.length < 8) {
      setShippingEstimate('Digite um CEP válido com 8 números.');
      return;
    }
    setShippingEstimate('Calculando...');
    setTimeout(() => {
      if (d.startsWith('8426')) {
        setShippingEstimate('Motoboy local • Entrega HOJE — R$ 15,00');
      } else {
        setShippingEstimate('Correios PAC (3–7 dias úteis) — R$ 28,50');
      }
    }, 900);
  };

  const handleCoupon = () => {
    const code = coupon.trim().toUpperCase();
    if (code === 'AG10') {
      setDiscount(subtotal * 0.1);
      setCouponMsg('Cupom AG10 aplicado: 10% de desconto!');
    } else if (code === 'PRIMEIRACOMPRA') {
      setDiscount(subtotal * 0.15);
      setCouponMsg('Bem-vindo! 15% de desconto aplicado.');
    } else if (code) {
      setDiscount(0);
      setCouponMsg('Cupom inválido. Tente AG10.');
    } else {
      setDiscount(0);
      setCouponMsg(null);
    }
  };

  const shippingCost = shippingEstimate?.includes('Motoboy') ? 15 : shippingEstimate?.includes('Correios') ? 28.5 : 0;
  const total = subtotal - discount + shippingCost;
  const freeShippingThreshold = 199;
  const missingForFree = Math.max(0, freeShippingThreshold - subtotal);

  return (
    <div className="container mx-auto px-4 md:px-6 py-10 min-h-[60vh] max-w-6xl">
      <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-2 flex items-center gap-2">
        <ShoppingBag className="text-primary" size={24} /> Meu Carrinho
      </h1>
      {getItemCount() > 0 && (
        <p className="text-xs text-foreground/50 mb-6">{getItemCount()} {getItemCount() === 1 ? 'item' : 'itens'} no carrinho</p>
      )}

      {items.length === 0 ? (
        <div className="text-center py-16 bg-card border border-[var(--border-subtle)] rounded-xl shadow-sm">
          <ShoppingBag size={40} className="mx-auto text-foreground/20 mb-4" />
          <h2 className="text-sm font-bold text-foreground mb-2 uppercase tracking-widest">Seu carrinho está vazio</h2>
          <p className="text-xs text-foreground/50 mb-6">Navegue pela loja para adicionar produtos.</p>
          <Link href="/loja" className="inline-flex bg-primary text-primary-foreground px-6 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-primary-hover transition-colors rounded-lg shadow-md">
            Ir para a Loja
          </Link>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Lista de Itens */}
          <div className="flex-1 flex flex-col gap-3">

            {/* Barra de frete grátis */}
            {missingForFree > 0 ? (
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 flex items-center gap-3">
                <Truck size={18} className="text-primary shrink-0" />
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-foreground">Faltam <span className="text-primary-hover">R$ {missingForFree.toFixed(2)}</span> para o frete grátis!</p>
                  <div className="mt-1.5 h-1.5 bg-primary/15 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (subtotal / freeShippingThreshold) * 100)}%` }} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-success/10 border border-success/20 rounded-xl p-3 flex items-center gap-2 text-[11px] font-bold text-success">
                <Truck size={16} /> Você ganhou FRETE GRÁTIS neste pedido!
              </div>
            )}

            {items.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-card p-4 border border-[var(--border-subtle)] flex items-center gap-4 rounded-xl shadow-sm hover:border-primary/40 transition-colors"
              >

                {/* Imagem */}
                <div className="w-16 h-16 bg-background relative border border-[var(--border-subtle)] shrink-0 overflow-hidden rounded-lg">
                  {item.image_url ? (
                    <Image src={item.image_url} alt={item.name} fill className="object-contain p-1" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-foreground/20"><ShoppingBag size={28} /></div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link href={`/loja/p/${item.id}`} className="font-medium text-foreground text-xs mb-1 line-clamp-2 hover:text-primary transition-colors block">
                    {item.name}
                  </Link>
                  <div className="text-sm font-bold text-foreground">R$ {item.price.toFixed(2)}</div>
                </div>

                {/* Quantidade */}
                <div className="flex items-center gap-2 bg-background border border-[var(--border-subtle)] px-2 py-1 rounded-lg">
                  <button
                    onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                    className="text-foreground/40 hover:text-foreground transition-colors"
                    aria-label="Diminuir quantidade"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="font-bold w-6 text-center text-xs text-foreground">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="text-foreground/40 hover:text-foreground transition-colors"
                    aria-label="Aumentar quantidade"
                  >
                    <Plus size={12} />
                  </button>
                </div>

                {/* Preço Total do Item */}
                <div className="hidden sm:block w-24 text-right">
                  <div className="text-xs text-foreground/40 mb-0.5">Total</div>
                  <div className="text-sm font-bold text-foreground">R$ {(item.price * item.quantity).toFixed(2)}</div>
                </div>

                {/* Remover */}
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-foreground/40 hover:text-danger transition-colors p-2 ml-2 bg-background hover:bg-danger/10 rounded-full"
                  aria-label={`Remover ${item.name}`}
                >
                  <Trash2 size={16} />
                </button>

              </motion.div>
            ))}
          </div>

          {/* Resumo do Pedido (Lateral) */}
          <div className="w-full lg:w-80 shrink-0">
            <div className="bg-card p-5 border border-[var(--border-subtle)] sticky top-20 rounded-xl shadow-sm">
              <h2 className="text-sm font-bold text-foreground mb-4 uppercase tracking-widest border-b border-[var(--border-subtle)] pb-3">Resumo do Pedido</h2>

              {/* Cupom */}
              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <Tag size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/40" />
                  <input
                    type="text"
                    placeholder="Cupom de desconto"
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value)}
                    maxLength={20}
                    className="w-full bg-background border border-[var(--border-subtle)] pl-8 pr-3 py-2 text-xs text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-colors rounded-lg uppercase"
                  />
                </div>
                <button
                  onClick={handleCoupon}
                  className="bg-foreground text-background px-3 text-[10px] font-bold uppercase tracking-wider hover:bg-primary hover:text-primary-foreground transition-colors rounded-lg"
                >
                  Aplicar
                </button>
              </div>
              <AnimatePresence>
                {couponMsg && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`text-[10px] font-bold mb-4 -mt-2 ${discount > 0 ? 'text-success' : 'text-danger'}`}
                  >
                    {couponMsg}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Frete estimado */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="CEP para estimar frete"
                  value={cep}
                  onChange={(e) => setCep(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  maxLength={8}
                  className="flex-1 bg-background border border-[var(--border-subtle)] px-3 py-2 text-xs text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-colors rounded-lg"
                />
                <button
                  onClick={handleCalcShipping}
                  className="bg-secondary border border-transparent px-3 py-2 text-[10px] font-bold uppercase text-foreground hover:bg-primary hover:text-primary-foreground transition-colors rounded-lg"
                >
                  Calcular
                </button>
              </div>
              {shippingEstimate && (
                <p className={`text-[10px] font-medium mb-4 ${shippingEstimate === 'Calculando...' || shippingEstimate.startsWith('Digite') ? 'text-foreground/40' : 'text-success'}`}>
                  {shippingEstimate}
                </p>
              )}

              <div className="flex justify-between items-center mb-3 text-xs text-foreground/60">
                <span>Subtotal ({getItemCount()} {getItemCount() === 1 ? 'item' : 'itens'})</span>
                <span>R$ {subtotal.toFixed(2)}</span>
              </div>

              <AnimatePresence>
                {discount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex justify-between items-center mb-3 text-xs text-success font-medium"
                  >
                    <span>Cupom aplicado</span>
                    <span>− R$ {discount.toFixed(2)}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex justify-between items-center mb-4 text-xs text-foreground/60 pb-4 border-b border-[var(--border-subtle)]">
                <span>Frete</span>
                <span className="text-foreground font-medium">
                  {shippingCost > 0 ? `R$ ${shippingCost.toFixed(2)}` : 'A calcular'}
                </span>
              </div>

              <div className="flex justify-between items-center mb-6">
                <span className="font-bold text-sm text-foreground uppercase">Total</span>
                <span className="text-lg font-bold text-foreground">R$ {total.toFixed(2)}</span>
              </div>

              <Link href="/loja/checkout" className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground h-12 text-xs font-bold uppercase tracking-widest hover:bg-primary-hover transition-colors rounded-lg shadow-md">
                Fechar Pedido <ArrowRight size={14} />
              </Link>

              <Link href="/loja" className="w-full block text-center text-[10px] uppercase tracking-widest font-medium text-foreground/50 hover:text-primary mt-4 transition-colors">
                Continuar Comprando
              </Link>

              <div className="flex items-center justify-center gap-1.5 mt-4 pt-4 border-t border-[var(--border-subtle)] text-[9px] text-foreground/40 uppercase tracking-wider">
                <ShieldCheck size={10} className="text-success" /> Pagamento 100% seguro
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
