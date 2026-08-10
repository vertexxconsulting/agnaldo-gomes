'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCartStore } from '@/store/cartStore';
import { Trash2, ArrowRight, Minus, Plus, ShoppingBag } from 'lucide-react';

export default function CartPage() {
  const { items, removeItem, updateQuantity, getTotal } = useCartStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="container mx-auto px-4 md:px-6 py-10 min-h-[60vh] max-w-6xl">
      <h1 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2 uppercase tracking-widest">
        <ShoppingBag className="text-amber-500" size={20} /> Meu Carrinho
      </h1>

      {items.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-sm shadow-sm">
          <ShoppingBag size={40} className="mx-auto text-slate-300 mb-4" />
          <h2 className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-widest">Seu carrinho está vazio</h2>
          <p className="text-xs text-slate-500 mb-6">Navegue pela loja para adicionar produtos.</p>
          <Link href="/loja" className="inline-flex bg-slate-900 text-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors rounded-sm shadow-md">
            Ir para a Loja
          </Link>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Lista de Itens */}
          <div className="flex-1 flex flex-col gap-3">
            {items.map((item) => (
              <div key={item.id} className="bg-white p-3 border border-slate-200 flex items-center gap-4 rounded-sm shadow-sm hover:border-amber-200 transition-colors">
                
                {/* Imagem */}
                <div className="w-16 h-16 bg-white relative border border-slate-100 shrink-0">
                  <Image src={item.image_url} alt={item.name} fill className="object-contain p-1" />
                </div>

                {/* Info */}
                <div className="flex-1">
                  <h3 className="font-medium text-slate-800 text-xs mb-1 line-clamp-1">{item.name}</h3>
                  <div className="text-sm font-bold text-slate-900">R$ {item.price.toFixed(2)}</div>
                </div>

                {/* Quantidade */}
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-2 py-1 rounded-sm">
                  <button 
                    onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                    className="text-slate-400 hover:text-slate-900 transition-colors"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="font-bold w-6 text-center text-xs text-slate-900">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="text-slate-400 hover:text-slate-900 transition-colors"
                  >
                    <Plus size={12} />
                  </button>
                </div>

                {/* Preço Total do Item */}
                <div className="hidden sm:block w-24 text-right">
                  <div className="text-xs text-slate-400 mb-0.5">Total</div>
                  <div className="text-sm font-bold text-slate-900">R$ {(item.price * item.quantity).toFixed(2)}</div>
                </div>

                {/* Remover */}
                <button 
                  onClick={() => removeItem(item.id)}
                  className="text-slate-400 hover:text-red-500 transition-colors p-2 ml-2 bg-slate-50 hover:bg-red-50 rounded-full"
                >
                  <Trash2 size={16} />
                </button>

              </div>
            ))}
          </div>

          {/* Resumo do Pedido (Lateral) */}
          <div className="w-full lg:w-80 shrink-0">
            <div className="bg-white p-5 border border-slate-200 sticky top-20 rounded-sm shadow-sm">
              <h2 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-widest border-b border-slate-100 pb-3">Resumo do Pedido</h2>
              
              <div className="flex justify-between items-center mb-3 text-xs text-slate-600">
                <span>Subtotal ({items.length} itens)</span>
                <span>R$ {getTotal().toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center mb-4 text-xs text-slate-600 pb-4 border-b border-slate-100">
                <span>Frete</span>
                <span>A calcular</span>
              </div>

              <div className="flex justify-between items-center mb-6">
                <span className="font-bold text-sm text-slate-900 uppercase">Total</span>
                <span className="text-lg font-bold text-slate-900">R$ {getTotal().toFixed(2)}</span>
              </div>

              <Link href="/loja/checkout" className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white h-12 text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors rounded-sm shadow-md">
                Fechar Pedido <ArrowRight size={14} />
              </Link>
              
              <Link href="/loja" className="w-full block text-center text-[10px] uppercase tracking-widest font-medium text-slate-500 hover:text-amber-600 mt-4 transition-colors">
                Continuar Comprando
              </Link>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
