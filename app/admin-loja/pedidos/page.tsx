'use client';

import { useState, useEffect } from 'react';
import { Search, Eye, Download, Printer, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { gerarEtiquetaPDF, ENVIO_DEFAULT, ConfiguracaoEnvio } from '@/lib/envios';
import { SectionHeader } from '@/components/ui/Panel';

export default function AdminLojaPedidos() {
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [printId, setPrintId] = useState<string | null>(null);

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
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning border border-warning/25">Aguardando Pagamento</span>;
      case 'PAID':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-success/10 text-success border border-success/25">Pago (Separar)</span>;
      case 'SHIPPED':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/25">Enviado</span>;
      case 'DELIVERED':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-foreground/5 text-foreground/60 border border-foreground/10">Entregue</span>;
      case 'CANCELLED':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-danger/10 text-danger border border-danger/25">Cancelado</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-foreground/5 text-foreground/60 border border-foreground/10">{status}</span>;
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

  const getConfigEnvio = (): ConfiguracaoEnvio => {
    try {
      const raw = localStorage.getItem('loja-config');
      if (!raw) return ENVIO_DEFAULT;
      const cfg = JSON.parse(raw);
      return {
        ...ENVIO_DEFAULT,
        melhorEnvioToken: cfg?.melhorEnvioToken ?? '',
        cepRemetente: cfg?.cepOrigem || ENVIO_DEFAULT.cepRemetente,
      };
    } catch {
      return ENVIO_DEFAULT;
    }
  };

  const handlePrintLabel = async (pedido: any) => {
    setPrintId(pedido.id);
    try {
      const blob = await gerarEtiquetaPDF(pedido, getConfigEnvio());
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `etiqueta-pedido-${pedido.id.toString().slice(0, 8).toUpperCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao gerar etiqueta:', err);
      alert('Não foi possível gerar a etiqueta. Tente novamente.');
    } finally {
      setPrintId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader
        eyebrow="Vendas da loja"
        title="Pedidos"
        action={
          <button className="bg-card border border-[var(--border-subtle)] hover:border-primary/40 hover:bg-primary/5 text-foreground/70 hover:text-primary font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2">
            <Download size={18} />
            <span>Exportar Relatório</span>
          </button>
        }
      />

      {/* Alerta Mercado Livre */}
      <div className="bg-primary/10 border border-primary/20 text-foreground/80 px-4 py-3 rounded-xl text-sm flex gap-3 shadow-sm">
        <Info className="text-primary shrink-0 mt-0.5" size={18} />
        <div>
          <p className="font-semibold">Pedidos do Mercado Livre não aparecem aqui!</p>
          <p className="opacity-90">As compras feitas nos seus links de afiliado do Mercado Livre são gerenciadas inteiramente pela plataforma deles. Esta tela lista apenas os pedidos pagos via Mercado Pago dos produtos do seu estoque local.</p>
        </div>
      </div>

      {/* Tabela e Filtros */}
      <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--border-subtle)] shadow-sm overflow-hidden flex flex-col">
        
        {/* Barra de Busca */}
        <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--background)] flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <input 
              type="text" 
              placeholder="Buscar por ID ou Nome do Cliente..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-card border border-[var(--border-subtle)] rounded-lg text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-colors"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" size={18} />
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-foreground/40">Carregando pedidos...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-foreground/40">
              {searchTerm ? 'Nenhum pedido encontrado com esse filtro.' : 'Nenhum pedido registrado ainda. As vendas aparecerão aqui automaticamente.'}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)]">
                  <th className="py-4 px-6 text-xs font-semibold text-foreground/45 uppercase tracking-wider">ID do Pedido</th>
                  <th className="py-4 px-6 text-xs font-semibold text-foreground/45 uppercase tracking-wider">Data</th>
                  <th className="py-4 px-6 text-xs font-semibold text-foreground/45 uppercase tracking-wider">Cliente</th>
                  <th className="py-4 px-6 text-xs font-semibold text-foreground/45 uppercase tracking-wider">Total</th>
                  <th className="py-4 px-6 text-xs font-semibold text-foreground/45 uppercase tracking-wider">Status</th>
                  <th className="py-4 px-6 text-xs font-semibold text-foreground/45 uppercase tracking-wider text-right">Etiqueta</th>
                  <th className="py-4 px-6 text-xs font-semibold text-foreground/45 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filtered.map((pedido) => (
                  <tr key={pedido.id} className="hover:bg-foreground/[0.02] transition-colors group">
                    <td className="py-4 px-6">
                      <span className="font-semibold text-foreground">#{pedido.id?.toString().slice(0, 8)}</span>
                    </td>
                    <td className="py-4 px-6 text-sm text-foreground/50">
                      {pedido.created_at ? new Date(pedido.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-semibold text-foreground text-sm">{pedido.customer_name || pedido.customer_email || '-'}</p>
                    </td>
                    <td className="py-4 px-6 text-sm font-bold text-foreground">
                      R$ {Number(pedido.total || 0).toFixed(2).replace('.', ',')}
                    </td>
                    <td className="py-4 px-6">
                      {getStatusBadge(pedido.status)}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handlePrintLabel(pedido)}
                        disabled={['SHIPPED', 'DELIVERED', 'CANCELLED'].includes(pedido.status)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-card border-primary/30 text-primary hover:bg-primary/10"
                        title="Baixar etiqueta de envio (PDF)"
                      >
                        {printId === pedido.id ? (
                          'Gerando...'
                        ) : (
                          <>
                            <Printer size={13} />
                            <span>{['PENDING_PAYMENT'].includes(pedido.status) ? 'Após pagar' : 'Etiqueta'}</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button className="p-2 text-foreground/40 hover:text-primary transition-colors bg-card border border-[var(--border-subtle)] rounded-lg shadow-sm" title="Ver Detalhes">
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
          <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--background)] flex items-center justify-between text-sm text-foreground/50">
            <span>Mostrando {filtered.length} pedidos</span>
          </div>
        )}

      </div>
    </div>
  );
}
