'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import { Truck, MapPin, CreditCard, ShieldCheck } from 'lucide-react';
import Image from 'next/image';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getTotal } = useCartStore();
  const [mounted, setMounted] = useState(false);
  
  const [cep, setCep] = useState('');
  const [shippingMethod, setShippingMethod] = useState('');
  const [shippingCost, setShippingCost] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    if (items.length === 0) {
      router.push('/loja/carrinho');
    }
  }, [items, router]);

  const handleCalcShipping = () => {
    if (cep.length < 8) return;
    setIsCalculating(true);
    setTimeout(() => {
      setIsCalculating(false);
      // Mock
      if (cep.startsWith('8426')) {
        setShippingMethod('MOTOBOY');
        setShippingCost(15.00);
      } else {
        setShippingMethod('CORREIOS');
        setShippingCost(28.50);
      }
    }, 1500);
  };

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(item => ({
            id: item.id,
            title: item.name,
            quantity: item.quantity,
            unit_price: item.price
          })),
          cep,
          shippingMethod,
        })
      });
      const data = await res.json();
      if (data.paymentUrl && !data.simulated) {
        window.location.href = data.paymentUrl;
      } else if (data.simulated) {
        alert('Modo Demonstração: Pagamento indisponível. Pedido não foi processado.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao gerar sessão de pagamento.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!mounted || items.length === 0) return null;

  return (
    <div className="container mx-auto px-4 md:px-6 py-10 max-w-5xl">
      <h1 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2 uppercase tracking-widest">
        <CreditCard className="text-amber-500" size={20} /> Checkout Seguro
      </h1>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Formulários */}
        <div className="flex-1 flex flex-col gap-4">
          
          <div className="bg-white p-6 border border-slate-200 rounded-sm shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2 uppercase tracking-widest border-b border-slate-100 pb-3">
              <MapPin className="text-amber-500" size={16} /> 1. Endereço de Entrega
            </h2>
            <div className="flex gap-2 mb-4">
              <input 
                type="text" 
                placeholder="CEP (ex: 00000-000)" 
                value={cep}
                onChange={(e) => setCep(e.target.value)}
                maxLength={8}
                className="w-48 bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-400 transition-colors rounded-sm"
              />
              <button 
                onClick={handleCalcShipping}
                className="bg-slate-900 text-white px-4 text-xs font-bold uppercase hover:bg-slate-800 transition-colors rounded-sm"
              >
                {isCalculating ? 'Buscando...' : 'Buscar'}
              </button>
            </div>

            {shippingMethod && (
              <div className="p-3 bg-amber-50 border border-amber-200 flex flex-col gap-1.5 rounded-sm">
                <div className="flex items-center gap-2 text-amber-700 font-bold text-[11px] uppercase tracking-wider mb-1">
                  <Truck size={14} /> {shippingMethod === 'MOTOBOY' ? 'Entrega Local (Motoboy)' : 'Envio Nacional (Correios)'}
                </div>
                <div className="flex justify-between items-center text-xs text-amber-900/80">
                  <span>Prazo estimado:</span>
                  <span className="font-bold text-amber-900">{shippingMethod === 'MOTOBOY' ? 'Hoje' : '3 a 7 dias úteis'}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-amber-900/80">
                  <span>Valor do frete:</span>
                  <span className="font-bold text-amber-700">R$ {shippingCost.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white p-6 border border-slate-200 rounded-sm shadow-sm opacity-50 pointer-events-none">
            <h2 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2 uppercase tracking-widest">
              <ShieldCheck className="text-slate-400" size={16} /> 2. Pagamento
            </h2>
            <p className="text-[11px] text-slate-500 ml-6 uppercase tracking-wider">O pagamento será realizado no ambiente seguro do Mercado Pago.</p>
          </div>

        </div>

        {/* Resumo */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="bg-white p-5 border border-slate-200 sticky top-20 rounded-sm shadow-sm">
             <h2 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-widest border-b border-slate-100 pb-3">Resumo da Compra</h2>
             
             <div className="flex flex-col gap-3 mb-4 max-h-48 overflow-y-auto pr-2">
               {items.map(item => (
                 <div key={item.id} className="flex items-center gap-3 bg-slate-50 p-2 rounded-sm border border-slate-100">
                   <div className="w-10 h-10 bg-white relative border border-slate-200 shrink-0">
                      <Image src={item.image_url} alt={item.name} fill className="object-contain p-1" />
                   </div>
                   <div className="flex-1">
                     <p className="text-[10px] font-medium text-slate-800 line-clamp-1">{item.name}</p>
                     <p className="text-[9px] text-slate-500">Qtd: {item.quantity}</p>
                   </div>
                   <div className="text-[11px] font-bold text-slate-900 text-right">
                     R$ {(item.price * item.quantity).toFixed(2)}
                   </div>
                 </div>
               ))}
             </div>

             <div className="flex justify-between items-center mb-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
               <span>Subtotal</span>
               <span>R$ {getTotal().toFixed(2)}</span>
             </div>
             
             <div className="flex justify-between items-center mb-4 text-xs text-slate-600">
               <span>Frete</span>
               <span className="text-slate-900 font-medium">{shippingMethod ? `R$ ${shippingCost.toFixed(2)}` : 'Calculando...'}</span>
             </div>

             <div className="flex justify-between items-center mb-6 pt-4 border-t border-slate-100">
               <span className="font-bold text-sm text-slate-900 uppercase tracking-widest">Total a Pagar</span>
               <span className="text-xl font-bold text-slate-900">R$ {(getTotal() + shippingCost).toFixed(2)}</span>
             </div>

             <button 
               disabled={!shippingMethod || isProcessing}
               onClick={handlePayment}
               className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white h-12 text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors disabled:opacity-50 rounded-sm shadow-md"
             >
               {isProcessing ? 'Conectando...' : 'Pagar Agora'}
             </button>
             <p className="text-center text-[9px] text-slate-500 mt-3 uppercase tracking-widest flex justify-center items-center gap-1">
               <ShieldCheck size={10} className="text-emerald-500"/> Checkout 100% Seguro
             </p>
          </div>
        </div>

      </div>
    </div>
  );
}
