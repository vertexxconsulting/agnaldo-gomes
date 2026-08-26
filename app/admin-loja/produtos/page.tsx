'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, Edit2, Trash2, ExternalLink, Package } from 'lucide-react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { SectionHeader } from '@/components/ui/Panel';
import type { Produto } from '@/lib/gestao-types';

// Mock fallback para produtos (usado quando Supabase não tem dados)
const MOCK_PRODUTOS: Produto[] = [
  { id: '1', name: 'Shampoo Premium Nutritivo', category: 'Shampoo', type: 'LOCAL_STOCK', price: 89.90, stock: 24, active: true, image_url: '/placeholder.svg', link: undefined },
  { id: '2', name: 'Condicionador Bril & Proteção', category: 'Condicionador', type: 'LOCAL_STOCK', price: 79.90, stock: 18, active: true, image_url: '/placeholder.svg', link: undefined },
  { id: '3', name: 'Kit Progressiva 3 Passos', category: 'Kit', type: 'AFFILIATE_ML', price: 0, stock: 0, active: true, image_url: '/placeholder.svg', link: 'https://produto.mercadolivre.com.br/MLB-123456789' },
];

export default function AdminLojaProdutos() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [products, setProducts] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarProdutos = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) {
          console.error('Erro ao buscar produtos:', error.message);
          setProducts(MOCK_PRODUTOS);
        } else {
          setProducts(data?.length > 0 ? data : MOCK_PRODUTOS);
        }
      } catch {
        // Supabase não disponível — usa fallback
        setProducts(MOCK_PRODUTOS);
      } finally {
        setLoading(false);
      }
    };
    carregarProdutos();
  }, []);

  async function handleDelete(id: string) {
    const isMock = products.some(p => p.id.startsWith('mock_') || (!['1', '2', '3'].includes(p.id)));
    if (isMock) {
      setProducts(prev => prev.filter(p => p.id !== id));
      return;
    }
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      alert('Erro ao excluir: ' + error.message);
      return;
    }
    setProducts(prev => prev.filter(p => p.id !== id));
  }

  const filtered = products.filter(p => {
    const matchSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        p.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = typeFilter ? p.type === typeFilter : true;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader
        eyebrow="Catálogo da loja"
        title="Produtos"
        action={
          <Link
            href="/admin-loja/produtos/novo"
            className="bg-primary text-primary-foreground hover:bg-primary-hover font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2 shadow-md"
          >
            <Plus size={18} />
            <span>Novo Produto</span>
          </Link>
        }
      />

      {/* Tabela e Filtros */}
      <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--border-subtle)] shadow-sm overflow-hidden flex flex-col">

        {/* Barra de Busca */}
        <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--background)] flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Buscar por nome ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-card border border-[var(--border-subtle)] rounded-lg text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-colors"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" size={18} />
          </div>
          <div className="flex gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-[var(--border-subtle)] rounded-lg text-sm px-3 py-2 text-foreground bg-card focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-colors"
            >
              <option value="">Todos os Tipos</option>
              <option value="LOCAL_STOCK">Estoque Próprio</option>
              <option value="AFFILIATE_ML">Afiliados (ML)</option>
            </select>
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-foreground/40">Carregando produtos do banco de dados...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-foreground/40">
              {searchTerm || typeFilter ? 'Nenhum produto corresponde ao filtro.' : 'Nenhum produto cadastrado ainda. Clique em "Novo Produto" para começar.'}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)]">
                  <th className="py-4 px-6 text-xs font-semibold text-foreground/45 uppercase tracking-wider w-16">Foto</th>
                  <th className="py-4 px-6 text-xs font-semibold text-foreground/45 uppercase tracking-wider">Produto</th>
                  <th className="py-4 px-6 text-xs font-semibold text-foreground/45 uppercase tracking-wider">Tipo</th>
                  <th className="py-4 px-6 text-xs font-semibold text-foreground/45 uppercase tracking-wider">Preço</th>
                  <th className="py-4 px-6 text-xs font-semibold text-foreground/45 uppercase tracking-wider">Estoque</th>
                  <th className="py-4 px-6 text-xs font-semibold text-foreground/45 uppercase tracking-wider">Status</th>
                  <th className="py-4 px-6 text-xs font-semibold text-foreground/45 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filtered.map((produto) => (
                  <tr key={produto.id} className="hover:bg-foreground/[0.02] transition-colors group">
                    <td className="py-3 px-6">
                      <div className="w-12 h-12 bg-[var(--background)] rounded-lg relative overflow-hidden flex items-center justify-center border border-[var(--border-subtle)]">
                        {produto.image_url ? (
                          <Image src={produto.image_url} alt={produto.name} fill className="object-contain p-1" />
                        ) : (
                          <Package className="text-foreground/30" size={20} />
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-6">
                      <p className="font-semibold text-foreground text-sm">{produto.name}</p>
                      <p className="text-xs text-foreground/50">{produto.category}</p>
                    </td>
                    <td className="py-3 px-6">
                      {produto.type === 'AFFILIATE_ML' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-warning/10 text-warning border border-warning/25 uppercase tracking-wide">
                          Mercado Livre
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-foreground/5 text-foreground/60 border border-foreground/10 uppercase tracking-wide">
                          Estoque Próprio
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-6 text-sm font-medium text-foreground">
                      R$ {Number(produto.price || 0).toFixed(2).replace('.', ',')}
                    </td>
                    <td className="py-3 px-6">
                      {produto.type === 'AFFILIATE_ML' ? (
                        <span className="text-foreground/40 text-sm">-</span>
                      ) : (
                        <span className={`text-sm font-semibold ${(produto.stock ?? 0) > 0 ? 'text-success' : 'text-danger'}`}>
                          {produto.stock ?? 0} unid.
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-6">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${produto.active ? 'bg-success/10 text-success border-success/25' : 'bg-foreground/5 text-foreground/60 border-foreground/10'}`}>
                        {produto.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {produto.link && (
                          <a href={produto.link} target="_blank" rel="noopener noreferrer" className="p-2 text-foreground/40 hover:text-primary transition-colors" title="Ver no Mercado Livre">
                            <ExternalLink size={18} />
                          </a>
                        )}
                        <Link href={`/admin-loja/produtos/${produto.id}`} className="p-2 text-foreground/40 hover:text-primary transition-colors" title="Editar">
                          <Edit2 size={18} />
                        </Link>
                        <button onClick={() => handleDelete(produto.id)} className="p-2 text-foreground/40 hover:text-danger transition-colors" title="Excluir">
                          <Trash2 size={18} />
                        </button>
                      </div>
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
            <span>Mostrando {filtered.length} de {products.length} produtos</span>
          </div>
        )}

      </div>
    </div>
  );
}
