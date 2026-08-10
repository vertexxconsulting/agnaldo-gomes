'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Edit2, Link as LinkIcon, RefreshCw, ShoppingBag, Package } from 'lucide-react';
import { Button } from '@/components/Button';
import Image from 'next/image';

// Tipos baseados no Schema
type ProductType = 'LOCAL_STOCK' | 'AFFILIATE_ML';

interface Product {
  id: string;
  type: ProductType;
  name: string;
  description: string;
  category: string;
  image_url: string;
  active: boolean;
  ml_link?: string;
  price?: number;
  stock_quantity?: number;
}

export default function LojaAdminPage() {
  const [activeTab, setActiveTab] = useState<ProductType>('AFFILIATE_ML');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Estado do formulário
  const [formData, setFormData] = useState<Partial<Product>>({ type: 'AFFILIATE_ML', active: true });
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState('');

  // Simulação de carregamento inicial (será substituído pelo Supabase)
  useEffect(() => {
    // Aqui entrará o fetch do Supabase futuramente
    setProducts([]);
  }, []);

  const handlePasteML = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText.includes('mercadolivre.com.br')) {
      handleScrapeML(pastedText);
    }
  };

  const handleScrapeML = async (url: string) => {
    setIsScraping(true);
    setScrapeError('');
    try {
      const res = await fetch(`/api/ml-scraper?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Erro ao buscar dados do ML');

      setFormData(prev => ({
        ...prev,
        name: data.title || prev.name,
        image_url: data.image || prev.image_url,
        price: data.price || prev.price,
      }));
    } catch (err: any) {
      setScrapeError('Não foi possível capturar automático. Preencha manualmente.');
    } finally {
      setIsScraping(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Aqui vai o insert no Supabase
    const newProduct = { ...formData, id: crypto.randomUUID() } as Product;
    setProducts(prev => [newProduct, ...prev]);
    setIsModalOpen(false);
    setFormData({ type: activeTab, active: true });
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-6xl mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestão da Loja</h1>
          <p className="text-foreground/60 text-sm mt-1">Gerencie produtos de afiliados e estoque físico.</p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => {
            setFormData({ type: activeTab, active: true });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2"
        >
          <Plus size={18} /> Novo Produto
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border-subtle)] gap-6">
        <button
          onClick={() => setActiveTab('AFFILIATE_ML')}
          className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${
            activeTab === 'AFFILIATE_ML' ? 'text-primary' : 'text-foreground/60 hover:text-foreground'
          }`}
        >
          <LinkIcon size={16} /> Recomendações (Afiliado ML)
          {activeTab === 'AFFILIATE_ML' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('LOCAL_STOCK')}
          className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${
            activeTab === 'LOCAL_STOCK' ? 'text-primary' : 'text-foreground/60 hover:text-foreground'
          }`}
        >
          <Package size={16} /> Estoque do Studio
          {activeTab === 'LOCAL_STOCK' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden">
        {products.filter(p => p.type === activeTab).length === 0 ? (
          <div className="p-12 text-center text-foreground/50 flex flex-col items-center">
            <ShoppingBag size={48} className="mb-4 opacity-20" />
            <p>Nenhum produto cadastrado nesta categoria.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-foreground/5 text-foreground/60">
              <tr>
                <th className="px-6 py-4 font-medium">Produto</th>
                <th className="px-6 py-4 font-medium">Categoria</th>
                {activeTab === 'LOCAL_STOCK' && <th className="px-6 py-4 font-medium">Preço / Estoque</th>}
                {activeTab === 'AFFILIATE_ML' && <th className="px-6 py-4 font-medium">Link afiliado</th>}
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {products.filter(p => p.type === activeTab).map((product) => (
                <tr key={product.id} className="hover:bg-foreground/5 transition-colors">
                  <td className="px-6 py-4 flex items-center gap-4">
                    {product.image_url ? (
                      <div className="relative w-12 h-12 bg-white rounded-md overflow-hidden shrink-0 border border-[var(--border-subtle)]">
                        <Image src={product.image_url} alt="" fill className="object-contain" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-foreground/10 rounded-md shrink-0" />
                    )}
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-xs text-foreground/50 line-clamp-1">{product.description}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">{product.category || '-'}</td>
                  
                  {activeTab === 'LOCAL_STOCK' && (
                    <td className="px-6 py-4">
                      R$ {product.price?.toFixed(2)} <br/>
                      <span className="text-xs text-foreground/50">{product.stock_quantity} unids</span>
                    </td>
                  )}
                  
                  {activeTab === 'AFFILIATE_ML' && (
                    <td className="px-6 py-4">
                      <a href={product.ml_link} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs flex items-center gap-1">
                        Ver Link <ExternalLinkIcon />
                      </a>
                    </td>
                  )}
                  
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-foreground/50 hover:text-primary transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button className="p-2 text-foreground/50 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL DE CADASTRO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-[var(--border-subtle)] flex justify-between items-center bg-background/50">
              <h2 className="text-xl font-bold">
                {activeTab === 'AFFILIATE_ML' ? 'Nova Recomendação (ML)' : 'Novo Produto (Estoque Local)'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-foreground/50 hover:text-foreground">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
              
              {activeTab === 'AFFILIATE_ML' && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                  <label className="block text-sm font-medium mb-2 text-primary">Cole o link do Mercado Livre para auto-preencher:</label>
                  <div className="relative">
                    <input 
                      type="url" 
                      className="w-full bg-background border border-[var(--border-subtle)] rounded-lg px-4 py-3 pl-10 text-sm outline-none focus:border-primary"
                      placeholder="https://produto.mercadolivre.com.br/..."
                      value={formData.ml_link || ''}
                      onChange={(e) => setFormData({...formData, ml_link: e.target.value})}
                      onPaste={handlePasteML}
                    />
                    <LinkIcon size={16} className="absolute left-3 top-3.5 text-foreground/40" />
                    {isScraping && <RefreshCw size={16} className="absolute right-3 top-3.5 text-primary animate-spin" />}
                  </div>
                  {scrapeError && <p className="text-xs text-red-500 mt-2">{scrapeError}</p>}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-full">
                  <label className="block text-sm font-medium mb-1">Nome do Produto *</label>
                  <input required type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-background border border-[var(--border-subtle)] rounded-lg px-4 py-2 outline-none focus:border-primary" />
                </div>
                
                <div className="col-span-full">
                  <label className="block text-sm font-medium mb-1">URL da Imagem</label>
                  <input type="text" value={formData.image_url || ''} onChange={e => setFormData({...formData, image_url: e.target.value})} className="w-full bg-background border border-[var(--border-subtle)] rounded-lg px-4 py-2 outline-none focus:border-primary text-sm" placeholder="https://..." />
                  {formData.image_url && (
                    <div className="mt-2 w-20 h-20 relative bg-white rounded-lg border border-[var(--border-subtle)] overflow-hidden">
                      <Image src={formData.image_url} alt="Preview" fill className="object-contain" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Categoria</label>
                  <input type="text" value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-background border border-[var(--border-subtle)] rounded-lg px-4 py-2 outline-none focus:border-primary" placeholder="Ex: Ferramentas, Cosméticos" />
                </div>

                {activeTab === 'LOCAL_STOCK' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">Preço (R$) *</label>
                      <input required type="number" step="0.01" value={formData.price || ''} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} className="w-full bg-background border border-[var(--border-subtle)] rounded-lg px-4 py-2 outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Estoque Inicial</label>
                      <input type="number" value={formData.stock_quantity || 0} onChange={e => setFormData({...formData, stock_quantity: parseInt(e.target.value)})} className="w-full bg-background border border-[var(--border-subtle)] rounded-lg px-4 py-2 outline-none focus:border-primary" />
                    </div>
                  </>
                )}
                
                <div className="col-span-full">
                  <label className="block text-sm font-medium mb-1">Descrição Curta</label>
                  <textarea rows={3} value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-background border border-[var(--border-subtle)] rounded-lg px-4 py-2 outline-none focus:border-primary text-sm" />
                </div>
              </div>
              
              <div className="border-t border-[var(--border-subtle)] pt-6 flex justify-end gap-3 mt-auto">
                <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button variant="primary" type="submit">Salvar Produto</Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// Icon helper
function ExternalLinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
      <polyline points="15 3 21 3 21 9"></polyline>
      <line x1="10" y1="14" x2="21" y2="3"></line>
    </svg>
  );
}
