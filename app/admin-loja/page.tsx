'use client';

import { useState, useEffect } from 'react';
import { Package, ShoppingBag, DollarSign, ArrowRight, TrendingUp, Settings } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function AdminLojaDashboard() {
  const [productCount, setProductCount] = useState(0);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      // Contar produtos ativos
      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('active', true);
      setProductCount(count || 0);

      // Buscar pedidos recentes (tabela orders, se existir)
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      if (ordersData) setOrders(ordersData);

      setLoading(false);
    }
    fetchDashboardData();
  }, []);

  const stats = [
    { name: 'Total de Produtos', value: loading ? '...' : String(productCount), icon: Package, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { name: 'Pedidos Recentes', value: loading ? '...' : String(orders.length), icon: ShoppingBag, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-emerald-100 text-emerald-800';
      case 'PENDING_PAYMENT': return 'bg-amber-100 text-amber-800';
      case 'SHIPPED': return 'bg-blue-100 text-blue-800';
      case 'DELIVERED': return 'bg-purple-100 text-purple-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PAID': return 'Pago';
      case 'PENDING_PAYMENT': return 'Pendente';
      case 'SHIPPED': return 'Enviado';
      case 'DELIVERED': return 'Entregue';
      case 'CANCELLED': return 'Cancelado';
      default: return status;
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Visão geral do desempenho da sua loja.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{stat.name}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-2">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bg}`}>
                  <Icon className={stat.color} size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Pedidos Recentes</h2>
            <Link href="/admin-loja/pedidos" className="text-sm font-medium text-amber-600 hover:text-amber-700 flex items-center gap-1">
              Ver todos <ArrowRight size={16} />
            </Link>
          </div>
          <div className="p-0 flex-1">
            {loading ? (
              <div className="p-6 text-center text-slate-400">Carregando...</div>
            ) : orders.length === 0 ? (
              <div className="p-6 text-center text-slate-400">Nenhum pedido registrado ainda.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Pedido</th>
                    <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                    <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor</th>
                    <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-6 text-sm font-medium text-slate-900">#{order.id?.toString().slice(0, 8)}</td>
                      <td className="py-4 px-6 text-sm text-slate-600">{order.customer_name || order.customer_email || '-'}</td>
                      <td className="py-4 px-6 text-sm font-medium text-slate-900">R$ {Number(order.total || 0).toFixed(2)}</td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">Ações Rápidas</h2>
          </div>
          <div className="p-6 space-y-4">
            <Link href="/admin-loja/produtos/novo" className="flex items-center gap-4 p-4 rounded-lg border border-slate-200 hover:border-amber-500 hover:bg-amber-50 transition-colors group">
              <div className="p-3 bg-amber-100 text-amber-600 rounded-lg group-hover:bg-amber-500 group-hover:text-white transition-colors">
                <Package size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Novo Produto</h3>
                <p className="text-sm text-slate-500">Cadastrar item do ML ou Estoque</p>
              </div>
            </Link>

            <Link href="/admin-loja/configuracoes" className="flex items-center gap-4 p-4 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-colors group">
              <div className="p-3 bg-slate-100 text-slate-600 rounded-lg group-hover:bg-slate-800 group-hover:text-white transition-colors">
                <Settings size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Configurar Frete</h3>
                <p className="text-sm text-slate-500">Ajustar Melhor Envio e Correios</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
