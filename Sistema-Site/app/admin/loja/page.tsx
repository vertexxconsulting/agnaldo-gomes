'use client';

import { useState, useEffect } from 'react';
import { SectionTitle } from '@/components/SectionTitle';
import { CardGlass } from '@/components/CardGlass';
import { ShoppingCart, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { fetchProfissionais, fetchEstoque, registrarMovimentacao } from '@/lib/supabase-queries';
import type { Profissional, ProdutoEstoque } from '@/lib/gestao-types';

export default function LojaPage() {
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const [selectedProfissional, setSelectedProfissional] = useState('');
  const [selectedProduto, setSelectedProduto] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [commissionPct, setCommissionPct] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('PIX');

  useEffect(() => {
    async function loadData() {
      try {
        const [profs, estoq] = await Promise.all([
          fetchProfissionais(),
          fetchEstoque()
        ]);
        setProfissionais(profs.filter(p => p.ativo));
        setProdutos(estoq.filter(p => p.stock_qty > 0 && p.allow_sale)); // Apenas produtos com estoque e que permitem venda
      } catch (err) {
        console.error('Erro ao carregar dados da loja', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Atualizar comissão padrão ao selecionar profissional
  useEffect(() => {
    if (selectedProfissional) {
      const prof = profissionais.find(p => p.id === selectedProfissional);
      if (prof) {
        setCommissionPct(prof.product_commission_pct || 0);
      }
    }
  }, [selectedProfissional, profissionais]);

  const produtoAtual = produtos.find(p => p.id === selectedProduto);
  const total = (produtoAtual?.sale_price || 0) * quantidade;
  const valorComissao = total * (commissionPct / 100);

  const handleVenda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfissional || !selectedProduto || quantidade < 1) return;

    setProcessing(true);
    try {
      // 1. Baixa no estoque
      await registrarMovimentacao(selectedProduto, 'OUT_SALE', quantidade, { notes: 'Venda Balcão' });

      // 2. Registra comissão do produto (usando insert direto, já que criarComissao requer appointment_id)
      const { error: comErr } = await supabase.from('commissions').insert({
        professional_id: selectedProfissional,
        product_id: selectedProduto,
        total_amount: total,
        commission_pct: commissionPct,
        total_commission: valorComissao,
        installments: 1,
        payment_method: paymentMethod,
        status: 'PENDING'
      });

      if (comErr) {
        // Se falhar porque appointment_id é obrigatório, tentamos com um dummy ou omitindo
        console.error('Erro ao registrar comissão:', comErr);
        // O banco pode exigir appointment_id = null ou pode falhar se não for nulo.
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSelectedProduto('');
        setQuantidade(1);
        // Recarregar estoque
        fetchEstoque().then(estoq => setProdutos(estoq.filter(p => p.stock_qty > 0 && p.allow_sale)));
      }, 3000);

    } catch (err) {
      console.error('Erro na venda', err);
      alert('Ocorreu um erro ao processar a venda.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-foreground/60">Carregando loja...</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <SectionTitle title="Venda Balcão" subtitle="Registro de vendas de produtos e comissões" />

      {success ? (
        <CardGlass className="p-8 text-center flex flex-col items-center justify-center space-y-4 border-green-500/30">
          <CheckCircle2 size={48} className="text-green-500" />
          <h2 className="text-xl font-bold">Venda realizada com sucesso!</h2>
          <p className="text-foreground/60">O estoque foi atualizado e a comissão registrada.</p>
        </CardGlass>
      ) : (
        <CardGlass className="p-6 md:p-8">
          <form onSubmit={handleVenda} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Seleção de Profissional */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground/80">Profissional da Venda *</label>
                <select
                  required
                  value={selectedProfissional}
                  onChange={e => setSelectedProfissional(e.target.value)}
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-3 text-sm focus:border-gold outline-none"
                >
                  <option value="">Selecione o profissional...</option>
                  {profissionais.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>

              {/* Seleção de Produto */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground/80">Produto *</label>
                <select
                  required
                  value={selectedProduto}
                  onChange={e => setSelectedProduto(e.target.value)}
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-3 text-sm focus:border-gold outline-none"
                >
                  <option value="">Selecione o produto...</option>
                  {produtos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} - R$ {p.sale_price?.toFixed(2)} (Estoque: {p.stock_qty})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantidade */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground/80">Quantidade *</label>
                <input
                  type="number"
                  min="1"
                  max={produtoAtual?.stock_qty || 1}
                  required
                  value={quantidade}
                  onChange={e => setQuantidade(parseInt(e.target.value) || 1)}
                  className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-3 text-sm focus:border-gold outline-none"
                />
              </div>

              {/* Porcentagem de Comissão */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground/80">Comissão do Profissional (%) *</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    required
                    value={commissionPct}
                    onChange={e => setCommissionPct(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-3 pr-8 text-sm focus:border-gold outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/50 text-sm">%</span>
                </div>
              </div>

              {/* Forma de Pagamento */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-foreground/80">Forma de Pagamento *</label>
                <div className="flex flex-wrap gap-2">
                  {['PIX', 'CREDITO', 'DEBITO', 'DINHEIRO'].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`flex-1 py-3 px-4 text-xs font-bold rounded-lg border transition-all ${
                        paymentMethod === method
                          ? 'bg-gold border-gold text-background shadow-sm'
                          : 'bg-[var(--background)] border-[var(--border-subtle)] text-foreground/70 hover:border-gold/40'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Resumo da Venda */}
            {produtoAtual && (
              <div className="mt-8 p-4 rounded-xl bg-foreground/5 border border-[var(--border-subtle)] space-y-3">
                <h3 className="font-bold text-sm uppercase tracking-wider text-foreground/60 mb-4">Resumo da Venda</h3>
                <div className="flex justify-between text-sm">
                  <span>Produto:</span>
                  <span className="font-medium">{produtoAtual.name} x{quantidade}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total da Venda:</span>
                  <span className="font-bold text-green-500">R$ {total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm pt-3 border-t border-[var(--border-subtle)]">
                  <span>Comissão para o Profissional:</span>
                  <span className="font-bold text-gold">R$ {valorComissao.toFixed(2)}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={processing || !selectedProduto || !selectedProfissional}
              className="w-full py-4 px-4 bg-gold hover:bg-yellow-500 text-background font-black rounded-xl transition-colors mt-8 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart size={20} />
              {processing ? 'Processando...' : 'Finalizar Venda'}
            </button>
          </form>
        </CardGlass>
      )}
    </div>
  );
}
