'use client';

import { Package, ShoppingBag, DollarSign, ArrowRight, TrendingUp, Settings } from 'lucide-react';
import Link from 'next/link';

export default function AdminLojaDashboard() {
  const stats = [
    { name: 'Vendas Totais', value: 'R$ 14.500,00', change: '+12%', icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { name: 'Pedidos Pendentes', value: '12', change: '3 novos hoje', icon: ShoppingBag, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { name: 'Total de Produtos', value: '145', change: '+5 esta semana', icon: Package, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { name: 'Acessos na Loja', value: '2.450', change: '+18%', icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ];

  const recentOrders = [
    { id: '#1234', customer: 'Maria Silva', date: 'Hoje, 14:30', amount: 'R$ 299,90', status: 'Pendente' },
    { id: '#1233', customer: 'João Mendes', date: 'Hoje, 11:15', amount: 'R$ 150,00', status: 'Pago' },
    { id: '#1232', customer: 'Ana Clara', date: 'Ontem', amount: 'R$ 89,90', status: 'Enviado' },
    { id: '#1231', customer: 'Carlos Eduardo', date: 'Ontem', amount: 'R$ 450,00', status: 'Entregue' },
  ];

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
              <div className="mt-4 flex items-center text-sm">
                <span className="text-emerald-500 font-medium">{stat.change}</span>
                <span className="text-slate-400 ml-2">vs período anterior</span>
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
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Pedido</th>
                  <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                  <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</th>
                  <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor</th>
                  <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6 text-sm font-medium text-slate-900">{order.id}</td>
                    <td className="py-4 px-6 text-sm text-slate-600">{order.customer}</td>
                    <td className="py-4 px-6 text-sm text-slate-500">{order.date}</td>
                    <td className="py-4 px-6 text-sm font-medium text-slate-900">{order.amount}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${order.status === 'Pago' ? 'bg-emerald-100 text-emerald-800' : ''}
                        ${order.status === 'Pendente' ? 'bg-amber-100 text-amber-800' : ''}
                        ${order.status === 'Enviado' ? 'bg-blue-100 text-blue-800' : ''}
                        ${order.status === 'Entregue' ? 'bg-purple-100 text-purple-800' : ''}
                      `}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
