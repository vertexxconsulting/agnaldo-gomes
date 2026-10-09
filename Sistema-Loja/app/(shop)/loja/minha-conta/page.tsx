'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Package, Search, ChevronRight, LogOut, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function MinhaContaLoja() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogged, setIsLogged] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedEmail = localStorage.getItem('loja_user_email');
    if (savedEmail) {
      setEmail(savedEmail);
      fetchOrders(savedEmail);
    }
  }, []);

  const fetchOrders = async (userEmail: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_email', userEmail.trim().toLowerCase())
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);

      setOrders(data || []);
      setIsLogged(true);
      localStorage.setItem('loja_user_email', userEmail.trim().toLowerCase());
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar pedidos.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Por favor, informe um e-mail válido.');
      return;
    }
    fetchOrders(email);
  };

  const handleLogout = () => {
    localStorage.removeItem('loja_user_email');
    setIsLogged(false);
    setOrders([]);
    setEmail('');
  };

  const formatPrice = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_PAYMENT':
        return <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded">Aguardando Pagamento</span>;
      case 'PAID':
        return <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-xs font-medium rounded">Pago</span>;
      case 'SHIPPED':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">Enviado</span>;
      case 'DELIVERED':
        return <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">Entregue</span>;
      case 'CANCELLED':
        return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">Cancelado</span>;
      default:
        return <span className="px-2 py-1 bg-slate-100 text-slate-800 text-xs font-medium rounded">{status}</span>;
    }
  };

  if (!isLogged) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-sm border border-slate-200">
          <div>
            <h2 className="mt-2 text-center text-3xl font-serif text-slate-900">
              Minha Conta
            </h2>
            <p className="mt-2 text-center text-sm text-slate-600">
              Acompanhe seus pedidos da loja informando seu e-mail de compra.
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="rounded-md shadow-sm space-y-4">
              <div>
                <label htmlFor="email-address" className="sr-only">
                  E-mail
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none rounded-md relative block w-full px-3 py-3 border border-slate-300 placeholder-slate-500 text-slate-900 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                  placeholder="Seu E-mail"
                />
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">{error}</p>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-md text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-70"
              >
                {loading ? 'Buscando...' : 'Acessar Meus Pedidos'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-serif text-slate-900">Olá, {email}</h1>
            <p className="text-sm text-slate-500">Acompanhe e gerencie seus pedidos abaixo.</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-red-600 transition-colors"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Package size={20} className="text-primary" />
              Meus Pedidos
            </h2>
          </div>
          
          {orders.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <Package size={48} className="text-slate-300 mb-4" />
              <p className="text-slate-500">Você ainda não possui pedidos nesta conta.</p>
              <Link href="/loja" className="mt-4 text-primary font-bold hover:underline">
                Explorar produtos da loja
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {orders.map((order) => {
                const isMercadoPago = order.payment_method === 'mercadopago';
                const checkoutUrl = isMercadoPago ? order.payment_id : null; // Na prática, o Mercado Pago pode enviar link do checkout
                
                return (
                  <div key={order.id} className="p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-mono text-sm font-bold text-slate-700">
                            #{order.id.slice(0, 8).toUpperCase()}
                          </span>
                          {getStatusBadge(order.status)}
                        </div>
                        <p className="text-sm text-slate-500">
                          Realizado em: {new Date(order.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="text-left md:text-right">
                        <p className="text-lg font-bold text-slate-900">
                          {formatPrice(order.total_amount)}
                        </p>
                      </div>
                    </div>

                    {order.items && Array.isArray(order.items) && (
                      <div className="bg-slate-50 rounded-lg p-4 mb-4 border border-slate-100">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Itens do Pedido</p>
                        <ul className="space-y-2">
                          {order.items.map((item: any, i: number) => (
                            <li key={i} className="flex justify-between text-sm">
                              <span className="text-slate-700">{item.quantity}x {item.title || item.name || 'Produto'}</span>
                              <span className="text-slate-600 font-medium">{formatPrice(item.unit_price * item.quantity)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <a 
                        href={`https://wa.me/5542998271222?text=Olá, quero falar sobre meu pedido da loja online: ${order.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        Suporte via WhatsApp
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
