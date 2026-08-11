'use client';

import { useState, useEffect } from 'react';
import { Search, Eye, Filter, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AdminLojaPedidos() {
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Erro ao buscar pedidos:', error.message);
      }
      setOrders(data || []);
      setLoading(false);
    }
    fetchOrders();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_PAYMENT':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-800">Aguardando Pagamento</span>;
      case 'PAID':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-100 text-emerald-800">Pago (Separar)</span>;
      case 'SHIPPED':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">Enviado</span>;
      case 'DELIVERED':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800">Entregue</span>;
      case 'CANCELLED':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800">Cancelado</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  const filtered = orders.filter(o => {
    const term = searchTerm.toLowerCase();
    return (
      o.id?.toString().includes(term) ||
      o.customer_name?.toLowerCase().includes(term) ||
      o.customer_email?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pedidos</h1>
          <p className="text-slate-500 mt-1">Acompanhe as vendas do seu estoque físico.</p>
        </div>
        <button className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2">
          <Download size={18} />
          <span>Exportar Relatório</span>
        </button>
      </div>

      {/* Alerta Mercado Livre */}
      <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-xl text-sm flex gap-3 shadow-sm">
        <div className="mt-0.5">ℹ️</div>
        <div>
          <p className="font-semibold">Pedidos do Mercado Livre não aparecem aqui!</p>
          <p className="opacity-90">As compras feitas nos seus links de afiliado do Mercado Livre são gerenciadas inteiramente pela plataforma deles. Esta tela lista apenas os pedidos pagos via Mercado Pago dos produtos do seu estoque local.</p>
        </div>
      </div>

      {/* Tabela e Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        
        {/* Barra de Busca */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <input 
              type="text" 
              placeholder="Buscar por ID ou Nome do Cliente..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-400">Carregando pedidos...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              {searchTerm ? 'Nenhum pedido encontrado com esse filtro.' : 'Nenhum pedido registrado ainda. As vendas aparecerão aqui automaticamente.'}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-200">
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">ID do Pedido</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((pedido) => (
                  <tr key={pedido.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="py-4 px-6">
                      <span className="font-semibold text-slate-900">#{pedido.id?.toString().slice(0, 8)}</span>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-500">
                      {pedido.created_at ? new Date(pedido.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-semibold text-slate-900 text-sm">{pedido.customer_name || pedido.customer_email || '-'}</p>
                    </td>
                    <td className="py-4 px-6 text-sm font-bold text-slate-900">
                      R$ {Number(pedido.total || 0).toFixed(2).replace('.', ',')}
                    </td>
                    <td className="py-4 px-6">
                      {getStatusBadge(pedido.status)}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button className="p-2 text-slate-400 hover:text-amber-500 transition-colors bg-white border border-slate-200 rounded-lg shadow-sm" title="Ver Detalhes">
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Paginação */}
        {!loading && filtered.length > 0 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-sm text-slate-500">
            <span>Mostrando {filtered.length} pedidos</span>
          </div>
        )}

      </div>
    </div>
  );
}
