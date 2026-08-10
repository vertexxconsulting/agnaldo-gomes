'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Edit2, Trash2, ExternalLink, Package } from 'lucide-react';
import Image from 'next/image';

export default function AdminLojaProdutos() {
  const [searchTerm, setSearchTerm] = useState('');

  // Dados mockados para visualização inicial
  const mockProducts = [
    {
      id: '1',
      name: 'Kit Tratamento Reconstrutor',
      type: 'LOCAL_STOCK',
      category: 'Tratamento',
      price: 289.90,
      stock: 15,
      active: true,
      image: '/opt/produto1.png'
    },
    {
      id: '2',
      name: 'Perfume Capilar L\'amant Rosé',
      type: 'AFFILIATE_ML',
      category: 'Finalizadores',
      price: 159.90,
      stock: null, // Afiliado não tem estoque local
      active: true,
      image: '/opt/produto2.png',
      mlLink: 'https://produto.mercadolivre.com.br/MLB-123'
    },
    {
      id: '3',
      name: 'Máscara Hidratação Profunda',
      type: 'LOCAL_STOCK',
      category: 'Tratamento',
      price: 129.90,
      stock: 0,
      active: true,
      image: '/opt/produto3.png'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Produtos</h1>
          <p className="text-slate-500 mt-1">Gerencie seu estoque físico e links de afiliados.</p>
        </div>
        <Link 
          href="/admin-loja/produtos/novo" 
          className="bg-amber-500 hover:bg-amber-600 text-black font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus size={20} />
          <span>Novo Produto</span>
        </Link>
      </div>

      {/* Tabela e Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        
        {/* Barra de Busca */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <input 
              type="text" 
              placeholder="Buscar por nome ou categoria..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          </div>
          <div className="flex gap-2">
            <select className="border border-slate-300 rounded-lg text-sm px-3 py-2 text-slate-700 bg-white focus:outline-none focus:border-amber-500">
              <option value="">Todos os Tipos</option>
              <option value="LOCAL_STOCK">Estoque Próprio</option>
              <option value="AFFILIATE_ML">Afiliados (ML)</option>
            </select>
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-200">
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">Foto</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Produto</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Preço</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estoque</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mockProducts.map((produto) => (
                <tr key={produto.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="py-3 px-6">
                    <div className="w-12 h-12 bg-slate-100 rounded-md relative overflow-hidden flex items-center justify-center border border-slate-200">
                      {produto.image ? (
                        <Image src={produto.image} alt={produto.name} fill className="object-contain p-1" />
                      ) : (
                        <Package className="text-slate-400" size={20} />
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-6">
                    <p className="font-semibold text-slate-900 text-sm">{produto.name}</p>
                    <p className="text-xs text-slate-500">{produto.category}</p>
                  </td>
                  <td className="py-3 px-6">
                    {produto.type === 'AFFILIATE_ML' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-yellow-100 text-yellow-800 uppercase tracking-wider">
                        Mercado Livre
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 uppercase tracking-wider">
                        Estoque Próprio
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-6 text-sm font-medium text-slate-900">
                    R$ {produto.price.toFixed(2).replace('.', ',')}
                  </td>
                  <td className="py-3 px-6">
                    {produto.type === 'AFFILIATE_ML' ? (
                      <span className="text-slate-400 text-sm">-</span>
                    ) : (
                      <span className={`text-sm font-semibold ${(produto.stock ?? 0) > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {produto.stock} unid.
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-6">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${produto.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {produto.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="py-3 px-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {produto.mlLink && (
                        <a href={produto.mlLink} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-blue-500 transition-colors" title="Ver no Mercado Livre">
                          <ExternalLink size={18} />
                        </a>
                      )}
                      <button className="p-2 text-slate-400 hover:text-amber-500 transition-colors" title="Editar">
                        <Edit2 size={18} />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Excluir">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Paginação */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-sm text-slate-500">
          <span>Mostrando 1 a 3 de 3 produtos</span>
          <div className="flex gap-1">
            <button className="px-3 py-1 border border-slate-300 rounded-md bg-white hover:bg-slate-50 disabled:opacity-50">Anterior</button>
            <button className="px-3 py-1 border border-slate-300 rounded-md bg-white hover:bg-slate-50 disabled:opacity-50">Próximo</button>
          </div>
        </div>

      </div>
    </div>
  );
}
