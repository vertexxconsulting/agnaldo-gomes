'use client';

import { useState, useEffect } from 'react';
import { Package, ShoppingBag, DollarSign, ArrowRight, TrendingUp, Settings, Sparkles, Users, CalendarDays } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { SectionHeader, Panel, StatCard } from '@/components/ui/Panel';

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

  // Banner do ecossistema — acesso rápido aos demais módulos
  const ecossistema = [
    { href: '/hub', label: 'Command Center', desc: 'Gerencie tudo em um só lugar', icon: Sparkles, cor: 'text-amber-500', bg: 'bg-amber-500/10', hover: 'hover:border-amber-500/50 hover:bg-amber-50' },
    { href: '/admin', label: 'Studio / Agenda', desc: 'Agendamentos e clientes', icon: CalendarDays, cor: 'text-slate-700', bg: 'bg-slate-100', hover: 'hover:border-slate-400 hover:bg-slate-50' },
    { href: '/admin-academy', label: 'Academy', desc: 'Cursos e alunos', icon: Users, cor: 'text-purple-500', bg: 'bg-purple-500/10', hover: 'hover:border-purple-400 hover:bg-purple-50' },
  ];

  return (
    <div className="flex flex-col w-full space-y-7 py-2">
      <SectionHeader eyebrow="Vendas, produtos e pedidos" title="Dashboard da Loja" />

      {/* Banner do ecossistema — acesso rápido aos demais módulos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {ecossistema.map((e) => {
          const Icon = e.icon;
          return (
            <Link key={e.href} href={e.href}>
              <div className={`group rounded-xl border border-[var(--border-subtle)] bg-gradient-to-r from-primary/5 to-transparent p-3 flex items-center gap-3 transition-all hover:shadow-md`}>
                <div className="w-9 h-9 rounded-lg bg-[var(--color-card)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                  <Icon size={17} className={e.cor} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-foreground truncate">{e.label}</p>
                  <p className="text-[11px] text-foreground/50">{e.desc}</p>
                </div>
                <ArrowRight size={14} className="ml-auto text-foreground/25 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <StatCard key={stat.name} label={stat.name} value={stat.value} icon={Icon} />
          );
        })}
      </div>

      {/* Quick Actions & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Orders */}
        <Panel className="lg:col-span-2" title="Pedidos Recentes" action={
          <Link href="/admin-loja/pedidos" className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1">
            Ver todos <ArrowRight size={13} />
          </Link>
        }>
          {loading ? (
            <div className="py-6 text-center text-foreground/40">Carregando...</div>
          ) : orders.length === 0 ? (
            <div className="py-6 text-center text-foreground/40">Nenhum pedido registrado ainda.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)]">
                  <th className="py-2.5 px-3 text-[10px] font-semibold text-foreground/45 uppercase tracking-wider">Pedido</th>
                  <th className="py-2.5 px-3 text-[10px] font-semibold text-foreground/45 uppercase tracking-wider">Cliente</th>
                  <th className="py-2.5 px-3 text-[10px] font-semibold text-foreground/45 uppercase tracking-wider">Valor</th>
                  <th className="py-2.5 px-3 text-[10px] font-semibold text-foreground/45 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-foreground/[0.02] transition-colors">
                    <td className="py-3 px-3 text-[12px] font-medium text-foreground">#{order.id?.toString().slice(0, 8)}</td>
                    <td className="py-3 px-3 text-[12px] text-foreground/60">{order.customer_name || order.customer_email || '-'}</td>
                    <td className="py-3 px-3 text-[12px] font-medium text-foreground">R$ {Number(order.total || 0).toFixed(2)}</td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        {/* Quick Actions */}
        <Panel title="Ações Rápidas">
          <div className="space-y-2.5">
            <Link href="/admin-loja/produtos/novo" className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border-subtle)] hover:border-primary/40 hover:bg-primary/5 transition-colors group">
              <div className="p-2.5 bg-primary/10 text-primary rounded-lg group-hover:bg-primary group-hover:text-background transition-colors">
                <Package size={17} />
              </div>
              <div>
                <h3 className="text-[13px] font-semibold text-foreground">Novo Produto</h3>
                <p className="text-[11px] text-foreground/50">Cadastrar item do ML ou Estoque</p>
              </div>
            </Link>

            <Link href="/admin-loja/configuracoes" className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border-subtle)] hover:border-foreground/20 hover:bg-foreground/[0.03] transition-colors group">
              <div className="p-2.5 bg-foreground/5 text-foreground/60 rounded-lg group-hover:bg-foreground group-hover:text-background transition-colors">
                <Settings size={17} />
              </div>
              <div>
                <h3 className="text-[13px] font-semibold text-foreground">Configurar Frete</h3>
                <p className="text-[11px] text-foreground/50">Ajustar Melhor Envio e Correios</p>
              </div>
            </Link>
          </div>
        </Panel>
      </div>
    </div>
  );
}
