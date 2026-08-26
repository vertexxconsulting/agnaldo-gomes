'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Link as LinkIcon, Box, Upload, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const inputCls = "w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-colors";

export default function NovoProdutoPage() {
  const [productType, setProductType] = useState<'AFFILIATE_ML' | 'LOCAL_STOCK'>('AFFILIATE_ML');
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    link: '',
    stock: '',
    image_url: '',
    active: true,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('products').insert({
        name: formData.name,
        category: formData.category,
        type: productType,
        price: parseFloat(formData.price) || 0,
        stock: productType === 'LOCAL_STOCK' ? parseInt(formData.stock) || 0 : 0,
        active: formData.active,
        image_url: formData.image_url || null,
        link: formData.link || null,
      });
      if (error) throw error;
      router.push('/admin-loja/produtos');
    } catch (err) {
      console.error('Erro ao salvar produto:', err);
      alert('Erro ao salvar produto. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin-loja/produtos" className="p-2 hover:bg-primary/10 rounded-full transition-colors text-foreground/60 hover:text-primary">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-serif font-bold text-foreground">Cadastrar Produto</h1>
            <p className="text-sm text-foreground/50 mt-1">Adicione um novo item à sua loja.</p>
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-primary text-primary-foreground hover:bg-primary-hover font-semibold py-2 px-6 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 shadow-md"
        >
          <Save size={18} />
          <span>{saving ? 'Salvando...' : 'Salvar Produto'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Coluna Principal */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Tipo de Produto Selector */}
          <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--border-subtle)] p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground tracking-tight mb-4">Qual é o tipo de produto?</h2>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setProductType('AFFILIATE_ML')}
                className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-3 transition-all ${
                  productType === 'AFFILIATE_ML' ? 'border-primary bg-primary/10 text-primary-hover' : 'border-[var(--border-subtle)] bg-[var(--background)] hover:border-primary/50 text-foreground/60'
                }`}
              >
                <LinkIcon size={28} />
                <span className="font-semibold text-sm">Mercado Livre (Afiliado)</span>
              </button>

              <button 
                onClick={() => setProductType('LOCAL_STOCK')}
                className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-3 transition-all ${
                  productType === 'LOCAL_STOCK' ? 'border-primary bg-primary/10 text-primary-hover' : 'border-[var(--border-subtle)] bg-[var(--background)] hover:border-primary/50 text-foreground/60'
                }`}
              >
                <Box size={28} />
                <span className="font-semibold text-sm">Estoque Próprio (Físico)</span>
              </button>
            </div>
          </div>

          {/* Informações Básicas */}
          <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--border-subtle)] p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-foreground tracking-tight border-b border-[var(--border-subtle)] pb-2">Informações Básicas</h2>
            
            {productType === 'AFFILIATE_ML' && (
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-1">Link do Mercado Livre *</label>
                <div className="flex gap-2">
                  <input type="url" 
                  placeholder="https://produto.mercadolivre.com.br/..." 
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  className={`flex-1 ${inputCls}`} />
                  <button className="bg-foreground text-background px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary hover:text-primary-foreground transition-colors">Extrair Dados</button>
                </div>
                <p className="text-xs text-foreground/50 mt-1">Cole o link acima e clique em &quot;Extrair&quot; para puxar nome, preço e fotos automaticamente.</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1">Nome do Produto *</label>
              <input type="text" 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={inputCls} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-1">Categoria *</label>
                <select 
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className={inputCls}>
                  <option value="">Selecione...</option>
                  <option value="alisamento">Alisamento</option>
                  <option value="coloracao">Coloração</option>
                  <option value="tratamento">Tratamento</option>
                  <option value="finalizadores">Finalizadores</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-1">Preço de Venda (R$) *</label>
                <input type="number" step="0.01" placeholder="0,00" 
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className={inputCls} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1">Descrição</label>
              <textarea rows={4} className={`${inputCls} resize-none`}></textarea>
            </div>
          </div>

          {/* Dados Físicos - Visível apenas para LOCAL_STOCK */}
          {productType === 'LOCAL_STOCK' && (
            <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--border-subtle)] p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
                <h2 className="text-sm font-semibold text-foreground tracking-tight">Frete e Dimensões</h2>
                <span className="text-xs bg-primary/10 text-primary border border-primary/25 font-semibold px-2 py-1 rounded-full">Obrigatório para Melhor Envio</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground/70 mb-1">Estoque Inicial (unidades)</label>
                  <input type="number" placeholder="0" 
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  className={inputCls} />  
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/70 mb-1">Peso (kg)</label>
                  <input type="number" step="0.001" placeholder="Ex: 0.500" className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground/70 mb-1">Comprimento (cm)</label>
                  <input type="number" placeholder="Ex: 20" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/70 mb-1">Largura (cm)</label>
                  <input type="number" placeholder="Ex: 15" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/70 mb-1">Altura (cm)</label>
                  <input type="number" placeholder="Ex: 10" className={inputCls} />
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Coluna Lateral */}
        <div className="space-y-6">
          
          {/* Status */}
          <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--border-subtle)] p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-foreground tracking-tight border-b border-[var(--border-subtle)] pb-2">Status</h2>
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" 
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="w-5 h-5 accent-primary"
              />
                <span className="text-sm font-medium text-foreground/80">Produto Ativo na Loja</span>
              </label>
              <p className="text-xs text-foreground/50 mt-2 ml-8">Desmarque para ocultar o produto sem deletá-lo.</p>
            </div>
          </div>

          {/* Imagem Principal */}
          <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--border-subtle)] p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-foreground tracking-tight border-b border-[var(--border-subtle)] pb-2">Imagem Principal</h2>
            <div className="border-2 border-dashed border-[var(--border-subtle)] rounded-xl p-6 flex flex-col items-center justify-center text-center hover:border-primary transition-colors cursor-pointer group bg-[var(--background)]">
              <div className="w-12 h-12 bg-card rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors text-foreground/40 group-hover:text-primary">
                <Upload size={24} />
              </div>
              <p className="text-sm font-semibold text-foreground/80">Clique ou arraste a imagem</p>
              <p className="text-xs text-foreground/50 mt-1">PNG, JPG, WEBP (Máx: 2MB)</p>
            </div>
            {productType === 'AFFILIATE_ML' && (
              <div className="bg-primary/10 border border-primary/20 text-foreground/70 p-4 rounded-lg text-sm mb-6 flex items-start gap-3">
                <Info className="shrink-0 mt-0.5 text-primary" size={18} />
                <p>Ao salvar um link do Mercado Livre, o sistema buscará automaticamente o preço e o estoque se disponível. Produtos do Mercado Livre aparecem com o selo &quot;Afiliado&quot; na vitrine.</p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
