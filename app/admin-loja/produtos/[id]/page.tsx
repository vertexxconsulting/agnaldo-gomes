'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Trash2, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type ProductType = 'AFFILIATE_ML' | 'LOCAL_STOCK';

interface FormData {
  name: string;
  category: string;
  price: string;
  link: string;
  stock: string;
  image_url: string;
  active: boolean;
}

const inputCls = "w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-colors";

export default function EditarProdutoPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);

  const [productType, setProductType] = useState<ProductType>('LOCAL_STOCK');
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractResult, setExtractResult] = useState<{ success: boolean; message: string; product?: any } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    category: '',
    price: '',
    link: '',
    stock: '',
    image_url: '',
    active: true,
  });

  useEffect(() => {
    let cancelled = false;
    const carregar = async () => {
      try {
        const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
        if (error || !data) {
          if (!cancelled) {
            setLoaded(true);
          }
          return;
        }
        if (!cancelled) {
          setProductType(data.type === 'AFFILIATE_ML' ? 'AFFILIATE_ML' : 'LOCAL_STOCK');
          setFormData({
            name: data.name ?? '',
            category: data.category ?? '',
            price: String(data.price ?? ''),
            link: data.link ?? '',
            stock: String(data.stock ?? 0),
            image_url: data.image_url ?? '',
            active: data.active ?? true,
          });
          setLoaded(true);
        }
      } catch {
        if (!cancelled) setLoaded(true);
      }
    };
    carregar();
    return () => { cancelled = true; };
  }, [id]);

  const clearExtractResult = () => setExtractResult(null);

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
        setFormData(prev => ({
          ...prev,
          name: data.product.name || prev.name,
          price: data.product.price ? String(data.product.price) : prev.price,
          image_url: data.product.image_url || prev.image_url,
          category: data.product.category || prev.category,
        }));

        setExtractResult({
          success: true,
          message: 'Dados atualizados com sucesso! Revise as informações abaixo.',
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
    if (!formData.name.trim()) {
      alert('Informe o nome do produto.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        category: formData.category,
        type: productType,
        price: parseFloat(formData.price) || 0,
        stock: productType === 'LOCAL_STOCK' ? parseInt(formData.stock) || 0 : 0,
        active: formData.active,
        image_url: formData.image_url || null,
        link: formData.link || null,
      };
      const { data: existing } = await supabase.from('products').select('id').eq('id', id);
      if (existing && existing.length > 0) {
        const { error } = await supabase.from('products').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert({ ...payload, id });
        if (error) throw error;
      }
      router.push('/admin-loja/produtos');
    } catch (err) {
      console.error('Erro ao salvar produto:', err);
      alert('Erro ao salvar produto. Verifique sua conexão com o Supabase.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      alert('Erro ao excluir: ' + error.message);
      return;
    }
    router.push('/admin-loja/produtos');
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
            <h1 className="text-xl md:text-2xl font-serif font-bold text-foreground">{loaded ? 'Editar Produto' : 'Carregando...'}</h1>
            <p className="text-sm text-foreground/50 mt-1">Atualize as informações do item na sua loja.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDelete}
            className="bg-card border border-[var(--border-subtle)] text-foreground/60 hover:text-danger hover:border-danger/30 font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary text-primary-foreground hover:bg-primary-hover font-semibold py-2 px-6 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 shadow-md"
          >
            <Save size={18} />
            <span>{saving ? 'Salvando...' : 'Salvar Produto'}</span>
          </button>
        </div>
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
                <span className="font-semibold text-sm">Mercado Livre (Afiliado)</span>
              </button>
              <button
                onClick={() => { setProductType('LOCAL_STOCK'); clearExtractResult(); }}
                className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-3 transition-all ${
                  productType === 'LOCAL_STOCK' ? 'border-primary bg-primary/10 text-primary-hover' : 'border-[var(--border-subtle)] bg-[var(--background)] hover:border-primary/50 text-foreground/60'
                }`}
              >
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
                          <p className="text-xs mt-1">Os campos abaixo foram atualizados automaticamente. Revise e ajuste se necessário.</p>
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
          </div>

          {/* Dados Físicos - Visível apenas para LOCAL_STOCK */}
          {productType === 'LOCAL_STOCK' && (
            <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--border-subtle)] p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold text-foreground tracking-tight border-b border-[var(--border-subtle)] pb-2">Estoque</h2>
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-1">Estoque Atual (unidades)</label>
                <input type="number" placeholder="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  className={inputCls}
                />
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

          {/* Imagem */}
          <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--border-subtle)] p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-foreground tracking-tight border-b border-[var(--border-subtle)] pb-2">Imagem Principal</h2>
            <input type="url"
              placeholder="https://exemplo.com/imagem.webp"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              className={inputCls}
            />
            <p className="text-xs text-foreground/50">Cole a URL da imagem do produto (PNG, JPG ou WEBP).</p>
            {productType === 'AFFILIATE_ML' && (
              <div className="bg-primary/10 border border-primary/20 text-foreground/70 p-4 rounded-lg text-sm mb-6 flex items-start gap-3">
                <CheckCircle2 className="shrink-0 mt-0.5 text-primary" size={18} />
                <p>Se for produto do Mercado Livre, o link de afiliado será usado no botão "Comprar no Mercado Livre" na loja. A imagem também pode ser extraída automaticamente clicando em "Extrair Dados" acima.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}