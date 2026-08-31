'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Link as LinkIcon, Box, Upload, Info, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const inputCls = "w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-colors";

export default function NovoProdutoPage() {
  const [productType, setProductType] = useState<'AFFILIATE_ML' | 'LOCAL_STOCK'>('AFFILIATE_ML');
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractResult, setExtractResult] = useState<{ success: boolean; message: string; product?: any } | null>(null);
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    link: '',
    stock: '',
    image_url: '',
    active: true,
    description: '',
  });

  const handleExtractML = async () => {
    const link = formData.link.trim();
    if (!link) {
      setExtractResult({ success: false, message: 'Cole um link do Mercado Livre antes de extrair.' });
      return;
    }

    setExtracting(true);
    setExtractResult(null);

    try {
      const res = await fetch('/api/mercadolivre/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: link }),
      });

      const data = await res.json();

      if (data.success && data.product) {
        // Preenche o formulário com os dados extraídos
        setFormData(prev => ({
          ...prev,
          name: data.product.name || prev.name,
          price: data.product.price ? String(data.product.price) : prev.price,
          image_url: data.product.image_url || prev.image_url,
          description: data.product.description || prev.description,
          category: data.product.category || prev.category,
        }));

        setExtractResult({
          success: true,
          message: 'Dados extraídos com sucesso! Revise as informações abaixo.',
          product: data.product,
        });
      } else {
        setExtractResult({ success: false, message: data.error || 'Não foi possível extrair dados deste link.' });
      }
    } catch (error: any) {
      setExtractResult({ success: false, message: `Erro: ${error.message}` });
    } finally {
      setExtracting(false);
    }
  };

  const handleSave = async () => {
    // Validações
    if (!formData.name.trim()) {
      alert('Nome do produto é obrigatório.');
      return;
    }
    if (!formData.category) {
      alert('Selecione uma categoria.');
      return;
    }
    if (productType === 'AFFILIATE_ML' && !formData.link.trim()) {
      alert('Link do Mercado Livre é obrigatório para produtos afiliados.');
      return;
    }
    if (productType === 'LOCAL_STOCK' && (!formData.price || parseFloat(formData.price) <= 0)) {
      alert('Preço válido é obrigatório para produtos de estoque próprio.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('products').insert({
        name: formData.name.trim(),
        category: formData.category,
        type: productType,
        price: parseFloat(formData.price) || 0,
        stock: productType === 'LOCAL_STOCK' ? parseInt(formData.stock) || 0 : 0,
        active: formData.active,
        image_url: formData.image_url.trim() || null,
        link: productType === 'AFFILIATE_ML' ? formData.link.trim() : null,
        description: formData.description.trim() || null,
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

  const clearExtractResult = () => setExtractResult(null);

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
                onClick={() => { setProductType('AFFILIATE_ML'); clearExtractResult(); }}
                className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-3 transition-all ${
                  productType === 'AFFILIATE_ML' ? 'border-primary bg-primary/10 text-primary-hover' : 'border-[var(--border-subtle)] bg-[var(--background)] hover:border-primary/50 text-foreground/60'
                }`}
              >
                <LinkIcon size={28} />
                <span className="font-semibold text-sm">Mercado Livre (Afiliado)</span>
              </button>

              <button 
                onClick={() => { setProductType('LOCAL_STOCK'); clearExtractResult(); }}
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
                    placeholder="https://produto.mercadolivre.com.br/MLB-1234567890" 
                    value={formData.link}
                    onChange={(e) => { setFormData({ ...formData, link: e.target.value }); clearExtractResult(); }}
                    className={`flex-1 ${inputCls}`} 
                    disabled={extracting}
                  />
                  <button 
                    onClick={handleExtractML}
                    disabled={extracting || !formData.link.trim()}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {extracting ? <Loader2 size={16} className="animate-spin" /> : 'Extrair Dados'}
                    <CheckCircle2 size={14} className="opacity-0 group-hover:opacity-100" />
                  </button>
                </div>
                <p className="text-xs text-foreground/50 mt-1">Cole o link acima e clique em "Extrair Dados" para puxar nome, preço, descrição e fotos automaticamente.</p>
                
                {/* Resultado da Extração */}
                {extractResult && (
                  <div className={`mt-3 p-3 rounded-lg border flex items-start gap-3 ${extractResult.success ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger'}`}>
                    {extractResult.success ? (
                      <>
                        <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{extractResult.message}</p>
                          <p className="text-xs mt-1">Os campos abaixo foram preenchidos automaticamente. Revise e ajuste se necessário.</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                        <p className="text-sm">{extractResult.message}</p>
                      </>
                    )}
                  </div>
                )}
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
                  <option value="finalizacao">Finalização & Styling</option>
                  <option value="tratamento">Tratamento Capilar</option>
                  <option value="coloracao">Coloração Profissional</option>
                  <option value="ferramentas">Ferramentas & Equipamentos</option>
                  <option value="barbearia">Barbearia</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-1">Preço de Venda (R$) *</label>
                <input type="number" step="0.01" placeholder="0,00" 
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className={inputCls} 
                  disabled={productType === 'AFFILIATE_ML'}
                />
                {productType === 'AFFILIATE_ML' && (
                  <p className="text-xs text-foreground/50 mt-1">Preço vem do Mercado Livre (opcional para referência)</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1">Descrição</label>
              <textarea 
                rows={4} 
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={`${inputCls} resize-none`} 
              />
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
                <p>Ao colar o link do Mercado Livre e clicar em "Extrair Dados", o sistema buscará automaticamente nome, preço, descrição e imagem do produto. O botão de compra na loja redirecionará para o link de afiliado no Mercado Livre.</p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}