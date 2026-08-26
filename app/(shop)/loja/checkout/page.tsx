'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import { Truck, MapPin, CreditCard, ShieldCheck, Lock, CheckCircle2, Wallet, LockOpen, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getTotal, clearCart } = useCartStore();
  const [mounted, setMounted] = useState(false);

  const [cep, setCep] = useState('');
  const [shippingMethod, setShippingMethod] = useState('');
  const [shippingCost, setShippingCost] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');
  const [step, setStep] = useState<1 | 2>(1);

  // Endereço completo
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [address, setAddress] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [addressComplement, setAddressComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');

  const subtotal = getTotal();

  // Regras de frete definidas na admin da loja (frete grátis / acima de valor / valores custom)
  const getStoreConfig = () => {
    try {
      const raw = localStorage.getItem('loja-config');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    if (items.length === 0) {
      router.push('/loja/carrinho');
    }
  }, [items, router]);

  const formatCep = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 8);
    return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
  };

  const formatPhone = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };

  const calcShippingValues = (numericCep: string) => {
    const cfg = getStoreConfig();
    const isLocal = numericCep.startsWith('8426');
    const metodo = isLocal ? 'MOTOBOY' : 'CORREIOS';
    const valorBase = isLocal
      ? parseFloat(String(cfg?.valorMotoboy ?? '15.00')) || 15.0
      : parseFloat(String(cfg?.valorCorreios ?? '28.50')) || 28.5;
    const gratisLigado = cfg?.freteGratis;
    const acimaDe = parseFloat(String(cfg?.freteGratisAcimaDe)) || 0;
    const gratis = Boolean(gratisLigado) || (acimaDe > 0 && subtotal >= acimaDe);
    return {
      metodo,
      custo: gratis ? 0 : valorBase,
      gratis,
      regiao: isLocal ? 'Região de Campo Mourão/PR' : 'Todo o Brasil',
    };
  };

  const handleCalcShipping = () => {
    const numericCep = cep.replace(/\D/g, '');
    if (numericCep.length < 8) return;
    setIsCalculating(true);
    setShippingMethod('');
    setTimeout(() => {
      setIsCalculating(false);
      const { metodo, custo, gratis, regiao } = calcShippingValues(numericCep);
      setShippingMethod(gratis ? `${metodo} (GRÁTIS)` : metodo);
      setShippingCost(custo);
      setCity(regiao);
    }, 1200);
  };

  const addressValid = customerName.trim().length >= 3 && cep.replace(/\D/g, '').length === 8 && address.trim().length >= 5 && addressNumber.trim().length >= 1;

  // Ao preencher um CEP válido, já define o frete automaticamente (sem bloquear o usuário)
  const handleCepChange = (v: string) => {
    const formatted = formatCep(v);
    setCep(formatted);
    const numericCep = formatted.replace(/\D/g, '');
    if (numericCep.length === 8 && !shippingMethod) {
      const { metodo, custo, gratis, regiao } = calcShippingValues(numericCep);
      setShippingMethod(gratis ? `${metodo} (GRÁTIS)` : metodo);
      setShippingCost(custo);
      setCity(regiao);
    }
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
            unit_price: item.price,
          })),
          customerName,
          customerEmail,
          customerPhone,
          cep,
          address: `${address}, ${addressNumber}${addressComplement ? ` - ${addressComplement}` : ''}, ${neighborhood}, ${city}`,
          shippingMethod,
          paymentMethod,
        }),
      });
      const data = await res.json();
      if (data.paymentUrl && !data.simulated) {
        window.location.href = data.paymentUrl;
      } else if (data.simulated) {
        setOrderPlaced(true);
        clearCart();
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao gerar sessão de pagamento.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!mounted || items.length === 0) return null;

  const total = subtotal + shippingCost;
  const pixDiscount = paymentMethod === 'pix' ? total * 0.1 : 0;
  const finalTotal = total - pixDiscount;

  return (
    <div className="container mx-auto px-4 md:px-6 py-10 max-w-5xl">
      <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-6 flex items-center gap-2">
        <CreditCard className="text-primary" size={24} /> Checkout Seguro
      </h1>

      {orderPlaced ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-[var(--border-subtle)] rounded-xl shadow-sm p-10 text-center max-w-lg mx-auto"
        >
          <CheckCircle2 size={56} className="mx-auto text-success mb-4" />
          <h2 className="text-lg font-bold text-foreground uppercase tracking-widest mb-2">Pedido Confirmado!</h2>
          <p className="text-xs text-foreground/60 mb-1 leading-relaxed">
            Obrigado pela sua compra, {customerName.split(' ')[0]}! Este é um ambiente de demonstração:
            nenhum pagamento foi processado e nenhum produto será enviado.
          </p>
          <p className="text-[11px] text-foreground/40 mb-6">
            Em produção, você receberia o comprovante em {customerEmail || 'seu e-mail'} e as etapas seguintes no WhatsApp.
          </p>
          <button
            onClick={() => router.push('/loja')}
            className="bg-primary text-primary-foreground px-8 py-3 text-xs font-bold uppercase tracking-widest hover:bg-primary-hover transition-colors rounded-lg shadow-md"
          >
            Continuar Comprando
          </button>
        </motion.div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Formulários */}
          <div className="flex-1 flex flex-col gap-4">

            {/* Etapa 1: Endereço */}
            <div className={`bg-card p-6 border rounded-xl shadow-sm transition-colors ${step === 1 ? 'border-primary' : 'border-[var(--border-subtle)]'}`}>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-left"
              >
                <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2 uppercase tracking-widest border-b border-[var(--border-subtle)] pb-3">
                  <MapPin className="text-primary" size={16} /> 1. Endereço de Entrega
                  {addressValid && <CheckCircle2 size={14} className="text-success ml-auto" />}
                </h2>
              </button>

              <AnimatePresence>
                {step === 1 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        placeholder="CEP (00000-000)"
                        value={cep}
                        onChange={(e) => handleCepChange(e.target.value)}
                        maxLength={9}
                        className="w-44 bg-background border border-[var(--border-subtle)] px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-colors rounded-lg"
                      />
                      <button
                        onClick={handleCalcShipping}
                        disabled={cep.replace(/\D/g, '').length < 8}
                        className="bg-foreground text-background px-4 text-xs font-bold uppercase hover:bg-primary hover:text-primary-foreground transition-colors rounded-lg disabled:opacity-40"
                      >
                        {isCalculating ? 'Buscando...' : 'Buscar'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Nome Completo *"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full bg-background border border-[var(--border-subtle)] px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-colors rounded-lg"
                      />
                      <input
                        type="tel"
                        placeholder="WhatsApp (11) 90000-0000"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(formatPhone(e.target.value))}
                        maxLength={15}
                        className="w-full bg-background border border-[var(--border-subtle)] px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-colors rounded-lg"
                      />
                      <input
                        type="email"
                        placeholder="E-mail *"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="w-full bg-background border border-[var(--border-subtle)] px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-colors rounded-lg"
                      />
                      <input
                        type="text"
                        placeholder="Bairro"
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                        className="w-full bg-background border border-[var(--border-subtle)] px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-colors rounded-lg"
                      />
                      <input
                        type="text"
                        placeholder="Rua / Avenida *"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full bg-background border border-[var(--border-subtle)] px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-colors rounded-lg sm:col-span-2"
                      />
                      <input
                        type="text"
                        placeholder="Número *"
                        value={addressNumber}
                        onChange={(e) => setAddressNumber(e.target.value)}
                        className="w-full bg-background border border-[var(--border-subtle)] px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-colors rounded-lg"
                      />
                      <input
                        type="text"
                        placeholder="Complemento (opcional)"
                        value={addressComplement}
                        onChange={(e) => setAddressComplement(e.target.value)}
                        className="w-full bg-background border border-[var(--border-subtle)] px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-colors rounded-lg"
                      />
                    </div>

                    {shippingMethod && (
                      <div className="p-3 bg-primary/10 border border-primary/20 flex flex-col gap-1.5 rounded-lg mb-4">
                        <div className="flex items-center gap-2 text-primary-hover font-bold text-[11px] uppercase tracking-wider mb-1">
                          <Truck size={14} /> {shippingMethod === 'MOTOBOY' || shippingMethod.startsWith('MOTOBOY') ? 'Entrega Local (Motoboy)' : 'Envio Nacional (Correios)'}
                          {shippingCost === 0 && <span className="ml-auto bg-success text-white text-[10px] font-bold px-2 py-0.5 rounded-md">FRETE GRÁTIS</span>}
                        </div>
                        <div className="flex justify-between items-center text-xs text-foreground/70">
                          <span>Prazo estimado:</span>
                          <span className="font-bold text-foreground">{shippingMethod.startsWith('MOTOBOY') ? 'Hoje mesmo' : '3 a 7 dias úteis'}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-foreground/70">
                          <span>Região:</span>
                          <span className="font-bold text-foreground">{city}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-foreground/70">
                          <span>Valor do frete:</span>
                          <span className="font-bold text-primary-hover">R$ {shippingCost.toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => setStep(2)}
                      disabled={!addressValid}
                      className="w-full bg-primary text-primary-foreground h-11 text-xs font-bold uppercase tracking-widest hover:bg-primary-hover transition-colors rounded-lg shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Continuar para Pagamento
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Etapa 2: Pagamento */}
            <div className={`bg-card p-6 border rounded-xl shadow-sm transition-colors ${step === 2 ? 'border-primary' : 'border-[var(--border-subtle)]'}`}>
              <button
                type="button"
                onClick={() => addressValid && setStep(2)}
                className="w-full text-left"
              >
                <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2 uppercase tracking-widest border-b border-[var(--border-subtle)] pb-3">
                  <ShieldCheck className={addressValid ? 'text-primary' : 'text-foreground/30'} size={16} /> 2. Pagamento
                </h2>
              </button>

              <AnimatePresence>
                {step === 2 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    {/* Método de pagamento */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('pix')}
                        className={`flex flex-col items-center gap-1.5 p-4 border rounded-lg transition-all ${
                          paymentMethod === 'pix'
                            ? 'border-success bg-success/10 shadow-sm'
                            : 'border-[var(--border-subtle)] bg-background hover:border-foreground/20'
                        }`}
                      >
                        <Wallet size={20} className={paymentMethod === 'pix' ? 'text-success' : 'text-foreground/40'} />
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${paymentMethod === 'pix' ? 'text-success' : 'text-foreground/50'}`}>PIX</span>
                        <span className="text-[9px] text-success font-bold">10% OFF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('card')}
                        className={`flex flex-col items-center gap-1.5 p-4 border rounded-lg transition-all ${
                          paymentMethod === 'card'
                            ? 'border-primary bg-primary/10 shadow-sm'
                            : 'border-[var(--border-subtle)] bg-background hover:border-foreground/20'
                        }`}
                      >
                        <CreditCard size={20} className={paymentMethod === 'card' ? 'text-primary' : 'text-foreground/40'} />
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${paymentMethod === 'card' ? 'text-primary-hover' : 'text-foreground/50'}`}>Cartão</span>
                        <span className="text-[9px] text-foreground/40 font-medium">12x sem juros</span>
                      </button>
                    </div>

                    {paymentMethod === 'pix' ? (
                      <div className="bg-success/10 border border-success/20 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2 text-success text-[11px] font-bold uppercase tracking-wider mb-1">
                          <Wallet size={14} /> Pagamento via PIX
                        </div>
                        <p className="text-[11px] text-foreground/70 leading-relaxed">
                          Ao confirmar, você receberá o QR Code do PIX com o valor com desconto. O pedido é confirmado
                          automaticamente após a compensação (ambiente de demonstração: confirmação imediata).
                        </p>
                      </div>
                    ) : (
                      <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2 text-primary-hover text-[11px] font-bold uppercase tracking-wider mb-1">
                          <CreditCard size={14} /> Cartão de Crédito
                        </div>
                        <p className="text-[11px] text-foreground/70 leading-relaxed">
                          O pagamento será processado no ambiente seguro do Mercado Pago, com criptografia ponta a ponta.
                          Você será redirecionado para a página oficial de pagamento.
                        </p>
                      </div>
                    )}

                    <p className="flex items-center gap-1.5 text-[9px] text-foreground/40 uppercase tracking-wider mb-4">
                      <LockOpen size={10} className="text-success" /> Ambiente de demonstração — nenhum cartão será cobrado
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>

          {/* Resumo */}
          <div className="w-full lg:w-80 shrink-0">
            <div className="bg-card p-5 border border-[var(--border-subtle)] sticky top-20 rounded-xl shadow-sm">
              <h2 className="text-sm font-bold text-foreground mb-4 uppercase tracking-widest border-b border-[var(--border-subtle)] pb-3">Resumo da Compra</h2>

              <div className="flex flex-col gap-3 mb-4 max-h-56 overflow-y-auto pr-2">
                {items.map(item => (
                  <div key={item.id} className="flex items-center gap-3 bg-background p-2 rounded-lg border border-[var(--border-subtle)] relative">
                    <div className="w-10 h-10 bg-card relative border border-[var(--border-subtle)] shrink-0 overflow-hidden rounded-md">
                      {item.image_url ? (
                        <Image src={item.image_url} alt={item.name} fill className="object-contain p-1" />
                      ) : (
                        <ShoppingBagIcon />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-medium text-foreground line-clamp-1">{item.name}</p>
                      <p className="text-[9px] text-foreground/50">Qtd: {item.quantity}</p>
                    </div>
                    <div className="text-[11px] font-bold text-foreground text-right">
                      R$ {(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center mb-2 text-xs text-foreground/60 border-t border-[var(--border-subtle)] pt-3">
                <span>Subtotal</span>
                <span>R$ {subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center mb-2 text-xs text-foreground/60">
                <span>Frete</span>
                <span className="text-foreground font-medium">
                  {shippingMethod ? `R$ ${shippingCost.toFixed(2)}` : '—'}
                </span>
              </div>

              <AnimatePresence>
                {paymentMethod === 'pix' && pixDiscount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex justify-between items-center mb-2 text-xs text-success font-medium"
                  >
                    <span>Desconto PIX (10%)</span>
                    <span>− R$ {pixDiscount.toFixed(2)}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex justify-between items-center mb-6 pt-4 border-t border-[var(--border-subtle)]">
                <span className="font-bold text-sm text-foreground uppercase tracking-widest">Total a Pagar</span>
                <span className="text-xl font-bold text-foreground">R$ {finalTotal.toFixed(2)}</span>
              </div>

              <button
                disabled={!shippingMethod || isProcessing || !addressValid}
                onClick={handlePayment}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground h-12 text-xs font-bold uppercase tracking-widest hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-md"
              >
                {isProcessing ? (
                  'Processando...'
                ) : (
                  <>
                    <Lock size={13} />
                    {paymentMethod === 'pix' ? 'Pagar com PIX' : 'Ir para Pagamento'}
                  </>
                )}
              </button>
              <p className="text-center text-[9px] text-foreground/50 mt-3 uppercase tracking-widest flex justify-center items-center gap-1">
                <ShieldCheck size={10} className="text-success" /> Checkout 100% Seguro • SSL
              </p>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

function ShoppingBagIcon() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background text-foreground/20">
      <ShoppingBag size={18} />
    </div>
  );
}
