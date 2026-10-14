'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, CheckCircle2, ShoppingBag, Beaker, Percent, Banknote, 
  CreditCard, QrCode, Coins, Plus, Trash2, AlertCircle, Sparkles
} from 'lucide-react';
import { CardGlass } from '@/components/CardGlass';
import { Button } from '@/components/Button';
import type { 
  Agendamento, Servico, Profissional, Cliente, ProdutoEstoque, 
  ServicoProduto, FormaPagamento, PaymentFee 
} from '@/lib/gestao-types';
import { 
  fetchEstoque, fetchTodosServicoProdutos, registrarMovimentacao, 
  criarComissao, fetchItensComanda, fetchTaxasPagamento, 
  calcularTaxaMaquininha, finalizarRecebimentoAgendamento, atualizarStatusAgendamento 
} from '@/lib/supabase-queries';

export interface InsumoAtendimento {
  inventory_id: string;
  name: string;
  unit: string;
  price_per_gram: number;
  qty_used: number;
  custo_unitario?: number;
  custo_total: number;
}

export interface ProdutoVendaAtendimento {
  id: string;
  inventory_id: string;
  qty: number;
  precoOriginal?: number;
  preco: number;
  descontoPct?: number;
  descontoValor?: number;
}

export interface CheckoutModalProps {
  appt: Agendamento;
  servicos: Servico[];
  profissionais: Profissional[];
  clientes: Cliente[];
  estoqueInicial?: ProdutoEstoque[];
  servicoProdutosInicial?: ServicoProduto[];
  taxasPagamentoInicial?: PaymentFee[];
  onClose: () => void;
  onSuccess: (updatedApptId: string) => void;
}

export function CheckoutModal({
  appt,
  servicos,
  profissionais,
  clientes,
  estoqueInicial,
  servicoProdutosInicial,
  taxasPagamentoInicial,
  onClose,
  onSuccess,
}: CheckoutModalProps) {
  const [estoque, setEstoque] = useState<ProdutoEstoque[]>(estoqueInicial || []);
  const [servicoProdutos, setServicoProdutos] = useState<ServicoProduto[]>(servicoProdutosInicial || []);
  const [taxasPagamento, setTaxasPagamento] = useState<PaymentFee[]>(taxasPagamentoInicial || []);

  const [checkoutExtras, setCheckoutExtras] = useState<{ id: string; servicoId: string; preco: number }[]>([]);
  const [extraServiceSelect, setExtraServiceSelect] = useState<string>('');
  const [checkoutInsumos, setCheckoutInsumos] = useState<InsumoAtendimento[]>([]);
  const [checkoutProdutos, setCheckoutProdutos] = useState<ProdutoVendaAtendimento[]>([]);
  const [checkoutPagamento, setCheckoutPagamento] = useState<FormaPagamento>('DINHEIRO');
  const [checkoutParcelas, setCheckoutParcelas] = useState<number>(1);
  const [checkoutDescontoPct, setCheckoutDescontoPct] = useState<string>('');
  const [checkoutDescontoValor, setCheckoutDescontoValor] = useState<string>('');
  const [checkoutDescontoMotivo, setCheckoutDescontoMotivo] = useState<string>('');

  const [checkoutNovoProdId, setCheckoutNovoProdId] = useState<string>('');
  const [checkoutNovoProdQty, setCheckoutNovoProdQty] = useState<string>('1');
  const [checkoutNovoProdDescPct, setCheckoutNovoProdDescPct] = useState<string>('');
  const [checkoutNovoProdDescValor, setCheckoutNovoProdDescValor] = useState<string>('');

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const getClienteNome = (id: string) => clientes.find(c => c.id === id)?.nome || 'Cliente';
  const getProfissionalNome = (id: string) => profissionais.find(p => p.id === id)?.nome || 'Profissional';
  const getServico = (id: string) => servicos.find(s => s.id === id);
  const getServicoNome = (id: string) => servicos.find(s => s.id === id)?.nome || 'Serviço';
  const getServicoPreco = (id: string) => servicos.find(s => s.id === id)?.preco || 0;

  // Carregar dados auxiliares se não tiverem sido fornecidos
  useEffect(() => {
    let isMounted = true;
    async function carregarAuxiliares() {
      setLoadingInitial(true);
      try {
        const promises: Promise<any>[] = [];
        if (!estoqueInicial || estoqueInicial.length === 0) promises.push(fetchEstoque());
        else promises.push(Promise.resolve(estoqueInicial));

        if (!servicoProdutosInicial || servicoProdutosInicial.length === 0) promises.push(fetchTodosServicoProdutos());
        else promises.push(Promise.resolve(servicoProdutosInicial));

        if (!taxasPagamentoInicial || taxasPagamentoInicial.length === 0) {
          promises.push(fetchTaxasPagamento().then(r => r.taxas));
        } else {
          promises.push(Promise.resolve(taxasPagamentoInicial));
        }

        promises.push(fetchItensComanda(appt.id));

        const [estData, spData, taxasData, comandaItens] = await Promise.all(promises);

        if (!isMounted) return;

        if (estData) setEstoque(estData);
        if (spData) setServicoProdutos(spData);
        if (taxasData) setTaxasPagamento(taxasData);

        // Mapear insumos da comanda
        const curEstoque: ProdutoEstoque[] = estData || estoqueInicial || [];
        const insumosDaComanda = (comandaItens || []).filter((i: any) => i.type === 'INSUMO');
        const mapInsumos: InsumoAtendimento[] = insumosDaComanda.map((i: any) => {
          const prod = curEstoque.find(p => p.id === i.inventory_id);
          const custoUn = prod?.cost_price || 0;
          return {
            inventory_id: i.inventory_id,
            name: prod?.name || 'Insumo',
            unit: prod?.unit || 'g',
            price_per_gram: prod?.cost_price || 0,
            qty_used: i.qty,
            custo_unitario: custoUn,
            custo_total: custoUn * i.qty,
          };
        });
        setCheckoutInsumos(mapInsumos);

        // Mapear produtos da comanda (upsell)
        const produtosDaComanda = (comandaItens || []).filter((i: any) => i.type === 'PRODUTO');
        const mapProdutos: ProdutoVendaAtendimento[] = produtosDaComanda.map((i: any) => {
          const prod = curEstoque.find(p => p.id === i.inventory_id);
          const precoBase = i.price > 0 ? i.price : (prod?.sale_price || 0);
          return {
            id: Date.now().toString() + i.id,
            inventory_id: i.inventory_id,
            qty: i.qty,
            precoOriginal: precoBase,
            preco: precoBase,
            descontoPct: 0,
            descontoValor: 0,
          };
        });
        setCheckoutProdutos(mapProdutos);

      } catch (err) {
        console.error('Erro ao carregar dados do checkout:', err);
      } finally {
        if (isMounted) setLoadingInitial(false);
      }
    }
    carregarAuxiliares();
    return () => { isMounted = false; };
  }, [appt.id]);

  // Cálculos de Desconto Sincronizados
  const handleCheckoutDescontoPct = (pctStr: string, subtotal: number) => {
    setCheckoutDescontoPct(pctStr);
    const p = parseFloat(pctStr);
    if (isNaN(p) || p <= 0) {
      setCheckoutDescontoValor('');
    } else {
      const clamped = Math.min(100, Math.max(0, p));
      const val = (subtotal * clamped) / 100;
      setCheckoutDescontoValor(val.toFixed(2));
    }
  };

  const handleCheckoutDescontoValor = (valStr: string, subtotal: number) => {
    setCheckoutDescontoValor(valStr);
    const v = parseFloat(valStr);
    if (isNaN(v) || v <= 0 || subtotal <= 0) {
      setCheckoutDescontoPct('');
    } else {
      const clamped = Math.min(subtotal, Math.max(0, v));
      const pct = (clamped / subtotal) * 100;
      setCheckoutDescontoPct(pct.toFixed(1));
    }
  };

  // Totais
  const precoBaseServico = getServicoPreco(appt.servico_id);
  const precoSubServicos = (appt.sub_servicos || []).reduce((acc: number, sub: any) => {
    if (typeof sub === 'object' && sub?.is_free) return acc;
    const subId = typeof sub === 'string' ? sub : sub?.id;
    return acc + getServicoPreco(subId);
  }, 0);
  const totalServico = precoBaseServico + precoSubServicos;

  const totalExtras = checkoutExtras.reduce((acc, ext) => acc + ext.preco, 0);
  const totalProdutos = checkoutProdutos.reduce((acc, p) => acc + (p.preco * p.qty), 0);
  const subtotalGeral = totalServico + totalExtras + totalProdutos;

  const valorDesconto = Math.min(subtotalGeral, Math.max(0, parseFloat(checkoutDescontoValor) || 0));
  const totalGeral = Math.max(0, subtotalGeral - valorDesconto);
  const numParcelas = checkoutPagamento === 'CREDITO' ? Math.max(1, checkoutParcelas) : 1;

  const taxaMaq = calcularTaxaMaquininha(checkoutPagamento, numParcelas, totalGeral, taxasPagamento);
  const totalCustoInsumos = checkoutInsumos.reduce((acc, i) => acc + (i.custo_total || 0), 0);

  // Executar finalização do recebimento
  const handleConfirmarRecebimento = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      // 1. Finalizar o atendimento principal no Supabase com forma de pagamento e total
      const okRecebimento = await finalizarRecebimentoAgendamento({
        id: appt.id,
        paymentMethod: checkoutPagamento,
        installments: numParcelas,
        totalAmount: totalGeral,
        productCost: totalCustoInsumos,
      });

      if (!okRecebimento) {
        // Fallback para atualizar status simples
        await atualizarStatusAgendamento(appt.id, 'concluido');
      }

      // Sincronizar com Bolten CRM em background
      try {
        await fetch('/api/bolten/sync-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agendamentoId: appt.id, status: 'concluido' }),
        });
      } catch (e) {
        console.warn('[bolten-sync] falha background:', e);
      }

      // 2. Registrar serviços extras se houver
      if (checkoutExtras.length > 0) {
        for (const ext of checkoutExtras) {
          try {
            await fetch('/api/agendamentos/admin', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                cliente_id: appt.cliente_id,
                profissional_id: appt.profissional_id,
                servico_id: ext.servicoId,
                data: appt.data,
                hora_inicio: appt.hora_inicio,
                status: 'concluido',
                payment_method: checkoutPagamento,
                total_amount: ext.preco,
              }),
            });
          } catch (e) {
            console.error('Erro ao registrar serviço extra:', e);
          }
        }
      }

      const profNome = profissionais.find(p => p.id === appt.profissional_id)?.nome || 'Profissional';

      // 3. Baixar insumos do estoque
      for (const insumo of checkoutInsumos) {
        if (insumo.qty_used > 0) {
          try {
            await registrarMovimentacao(insumo.inventory_id, 'OUT_PROCEDURE', insumo.qty_used, {
              appointmentId: appt.id,
              notes: `Procedimento: ${getServicoNome(appt.servico_id)} (${getClienteNome(appt.cliente_id)})`,
              createdBy: profNome,
            });
          } catch (e) {
            console.error('Erro ao baixar insumo:', e);
          }
        }
      }

      // 4. Baixar produtos vendidos (Upsell / Balcão)
      for (const prod of checkoutProdutos) {
        if (prod.qty > 0) {
          try {
            const descNote = prod.descontoValor && prod.descontoValor > 0 
              ? ` (Desc: -${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.descontoValor)})` 
              : '';
            await registrarMovimentacao(prod.inventory_id, 'OUT_SALE', prod.qty, {
              appointmentId: appt.id,
              notes: `Venda Salão: ${getServicoNome(appt.servico_id)} para ${getClienteNome(appt.cliente_id)}${descNote}`,
              createdBy: profNome,
            });
          } catch (e) {
            console.error('Erro ao baixar produto vendido:', e);
          }
        }
      }

      // 5. Gerar comissão do profissional com o valor recebido
      try {
        await criarComissao({
          appointmentId: appt.id,
          professionalId: appt.profissional_id,
          serviceId: appt.servico_id,
          totalAmount: totalGeral,
          paymentMethod: checkoutPagamento,
          installments: numParcelas,
          appointmentDate: appt.data,
          taxasCustom: taxasPagamento,
        });
      } catch (e) {
        console.error('Erro ao registrar comissão:', e);
      }

      // Notificar e encerrar
      alert(
        `Fechamento Prévio Registrado com Sucesso!\n\n` +
        `Cliente: ${getClienteNome(appt.cliente_id)}\n` +
        `Total Pré-Fechado: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalGeral)} (${checkoutPagamento})\n` +
        (valorDesconto > 0 ? `Desconto: -${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorDesconto)}\n` : '') +
        `\nCliente liberada na recepção. O atendimento foi encaminhado para a Gestão do Salão na aba "Financeiro e Caixa" para conferência e contabilização final.`
      );

      onSuccess(appt.id);
      onClose();
    } catch (err: any) {
      console.error('Erro na finalização do atendimento:', err);
      alert('Erro ao finalizar recebimento: ' + (err?.message || 'Tente novamente.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <CardGlass className="w-full max-w-2xl p-6 animate-in fade-in zoom-in-95 my-auto max-h-[92vh] overflow-y-auto border border-gold/30 shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-start mb-5 pb-3 border-b border-[var(--color-border)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <h3 className="text-xl font-bold font-serif text-foreground">Fechamento Prévio do Serviço (Secretaria)</h3>
            </div>
            <p className="text-xs text-foreground/60 mt-1">
              Cliente: <strong className="text-foreground">{getClienteNome(appt.cliente_id)}</strong> • Profissional: <strong>{getProfissionalNome(appt.profissional_id)}</strong> • <span className="text-amber-500 font-medium">Envio para a Gestão Financeira</span>
            </p>
          </div>
          <button 
            onClick={onClose} 
            disabled={submitting}
            className="text-foreground/50 hover:text-foreground p-1.5 rounded-lg hover:bg-foreground/5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {loadingInitial ? (
          <div className="p-12 text-center text-foreground/50 space-y-2">
            <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs">Carregando itens da comanda e dados de pagamento...</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* 1. Serviço Agendado Principal */}
            <div className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-foreground/50 block mb-0.5">
                    Procedimento Agendado
                  </span>
                  <p className="font-bold text-foreground text-base">
                    {getServicoNome(appt.servico_id)}
                    {appt.sub_servicos && appt.sub_servicos.length > 0 && 
                      ' + ' + appt.sub_servicos.map((sub: any) => getServicoNome(typeof sub === 'string' ? sub : sub?.id)).join(' + ')
                    }
                  </p>
                  <p className="text-xs text-foreground/50 mt-0.5">
                    Data: {appt.data} às {appt.hora_inicio}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold text-gold font-mono">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalServico)}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Serviços Extras / Adicionais */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Plus size={16} className="text-gold" />
                  Serviços Adicionais Realizados
                  <span className="text-foreground/40 font-normal text-xs">(opcional)</span>
                </h4>
              </div>

              <div className="flex gap-2">
                <select
                  value={extraServiceSelect}
                  onChange={(e) => setExtraServiceSelect(e.target.value)}
                  className="flex-1 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg p-2.5 text-xs focus:outline-none focus:border-gold text-foreground"
                >
                  <option value="">Selecione um serviço extra feito na cadeira...</option>
                  {servicos.filter(s => s.ativo).map(s => (
                    <option key={s.id} value={s.id}>{s.nome} — R$ {s.preco.toFixed(2)}</option>
                  ))}
                </select>
                <Button 
                  variant="outline" 
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (!extraServiceSelect) return;
                    const srv = servicos.find(s => s.id === extraServiceSelect);
                    if (srv) {
                      setCheckoutExtras([...checkoutExtras, { id: Date.now().toString(), servicoId: srv.id, preco: srv.preco }]);
                      setExtraServiceSelect('');
                    }
                  }}
                >
                  Adicionar
                </Button>
              </div>

              {checkoutExtras.length > 0 && (
                <div className="space-y-2">
                  {checkoutExtras.map((extra, idx) => (
                    <div key={extra.id} className="flex justify-between items-center p-2.5 bg-foreground/[0.02] rounded-lg text-xs border border-[var(--color-border)]">
                      <div className="flex-1 truncate pr-3 font-medium">
                        {getServicoNome(extra.servicoId)}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-foreground/40 text-[11px]">R$</span>
                          <input 
                            type="number" 
                            step="0.50" 
                            className="w-24 bg-[var(--color-background)] border border-[var(--color-border)] rounded-md pl-7 pr-2 py-1 text-right focus:outline-none focus:border-gold font-mono text-xs" 
                            value={extra.preco}
                            onChange={(e) => {
                              const newExtras = [...checkoutExtras];
                              newExtras[idx].preco = parseFloat(e.target.value) || 0;
                              setCheckoutExtras(newExtras);
                            }}
                          />
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setCheckoutExtras(checkoutExtras.filter(e => e.id !== extra.id))}
                          className="text-red-400 hover:text-red-500 p-1 rounded hover:bg-red-500/10"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Insumos (Pesagem) */}
            {(() => {
              const produtosDoServico = servicoProdutos
                .filter(sp => sp.service_id === appt.servico_id)
                .map(sp => ({ sp, prod: estoque.find(e => e.id === sp.inventory_id) }))
                .filter(x => x.prod);

              if (produtosDoServico.length === 0 && checkoutInsumos.length === 0) return null;

              return (
                <div className="p-3.5 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider text-amber-500">
                    <Beaker size={14} />
                    Insumos Utilizados no Procedimento
                  </h4>
                  <div className="space-y-2">
                    {produtosDoServico.map(({ sp, prod }) => {
                      const insumo = checkoutInsumos.find(i => i.inventory_id === sp.inventory_id);
                      const qty = insumo?.qty_used ?? sp.default_qty_g;
                      const ppg = prod!.price_per_gram ?? 0;
                      const custo = qty * ppg;
                      return (
                        <div key={sp.id} className="p-2.5 bg-[var(--color-background)]/80 border border-amber-500/20 rounded-lg text-xs flex items-center justify-between">
                          <div>
                            <p className="font-semibold">{prod!.name}</p>
                            <span className="text-[11px] text-foreground/50">Custo base: R$ {ppg.toFixed(3)}/{prod!.unit}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number" min={0} step={0.5}
                              value={qty}
                              onChange={e => {
                                const newQty = parseFloat(e.target.value) || 0;
                                const custTotal = newQty * ppg;
                                setCheckoutInsumos(prev => {
                                  const others = prev.filter(i => i.inventory_id !== sp.inventory_id);
                                  return [...others, {
                                    inventory_id: sp.inventory_id,
                                    name: prod!.name,
                                    unit: prod!.unit,
                                    price_per_gram: ppg,
                                    qty_used: newQty,
                                    custo_total: custTotal,
                                  }];
                                });
                              }}
                              className="w-20 bg-[var(--color-background)] border border-[var(--color-border)] rounded p-1 text-right font-mono"
                            />
                            <span className="text-foreground/50">{prod!.unit}</span>
                            <span className="font-bold text-amber-400 font-mono ml-2">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(custo)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* 4. Produtos do Salão (Venda Balcão / Upsell) */}
            <div className="p-3.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/70 flex items-center gap-1.5">
                  <ShoppingBag size={14} className="text-gold" />
                  Produtos Vendidos no Atendimento
                </h4>
                {checkoutProdutos.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gold/15 text-gold font-bold">
                    {checkoutProdutos.length} {checkoutProdutos.length === 1 ? 'produto' : 'produtos'}
                  </span>
                )}
              </div>

              {checkoutProdutos.length > 0 && (
                <div className="space-y-2">
                  {checkoutProdutos.map((prod, idx) => {
                    const itemEstoque = estoque.find(e => e.id === prod.inventory_id);
                    const subOriginal = (prod.precoOriginal ?? prod.preco) * prod.qty;
                    const subFinal = prod.preco * prod.qty;
                    const temDesc = (prod.descontoValor != null && prod.descontoValor > 0) || subOriginal > subFinal;

                    return (
                      <div key={prod.id} className="flex justify-between items-center p-2.5 bg-gold/5 border border-gold/20 rounded-lg text-xs">
                        <div className="flex-1 min-w-0 pr-3">
                          <span className="font-bold text-foreground block truncate">{itemEstoque?.name || 'Produto'}</span>
                          <span className="text-foreground/50 text-[11px]">{prod.qty}x de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.preco)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-gold font-mono">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subFinal)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setCheckoutProdutos(checkoutProdutos.filter((_, i) => i !== idx))}
                            className="text-red-400 hover:text-red-500 p-1"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Inserir novo produto */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
                <div className="sm:col-span-8">
                  <select
                    value={checkoutNovoProdId}
                    onChange={(e) => setCheckoutNovoProdId(e.target.value)}
                    className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg p-2 text-xs focus:outline-none focus:border-gold"
                  >
                    <option value="">Adicionar produto da prateleira...</option>
                    {estoque.filter(p => p.allow_sale && p.active).map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.sale_price || 0)} ({p.stock_qty} un)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <input
                    type="number"
                    min="1"
                    placeholder="Qtd"
                    value={checkoutNovoProdQty}
                    onChange={(e) => setCheckoutNovoProdQty(e.target.value)}
                    className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg p-2 text-xs text-center font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full text-xs h-full"
                    onClick={() => {
                      if (!checkoutNovoProdId) return;
                      const prodSel = estoque.find(p => p.id === checkoutNovoProdId);
                      if (!prodSel) return;
                      const q = Math.max(1, parseInt(checkoutNovoProdQty) || 1);
                      const basePrice = prodSel.sale_price || 0;

                      setCheckoutProdutos(prev => [...prev, {
                        id: Date.now().toString(),
                        inventory_id: prodSel.id,
                        qty: q,
                        precoOriginal: basePrice,
                        preco: basePrice,
                        descontoPct: 0,
                        descontoValor: 0,
                      }]);

                      setCheckoutNovoProdId('');
                      setCheckoutNovoProdQty('1');
                    }}
                  >
                    + Incluir
                  </Button>
                </div>
              </div>
            </div>

            {/* 5. Desconto ao Cliente */}
            <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Percent size={14} className="text-emerald-400" />
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">Desconto ao Cliente</span>
                </div>
                {valorDesconto > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold font-mono">
                    -{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorDesconto)} ({checkoutDescontoPct || '0'}%)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    placeholder="Em Porcentagem %"
                    value={checkoutDescontoPct}
                    onChange={(e) => handleCheckoutDescontoPct(e.target.value, subtotalGeral)}
                    className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg py-1.5 pl-3 pr-7 text-xs font-mono"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground/40 text-xs font-bold">%</span>
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/40 text-xs font-bold">R$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.50"
                    placeholder="Em Reais R$"
                    value={checkoutDescontoValor}
                    onChange={(e) => handleCheckoutDescontoValor(e.target.value, subtotalGeral)}
                    className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg py-1.5 pl-8 pr-3 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Atalhos Rápidos */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {[
                  { label: 'Sem desc.', pct: '0' },
                  { label: '5%', pct: '5' },
                  { label: '10%', pct: '10' },
                  { label: '15%', pct: '15' },
                  { label: '20%', pct: '20' },
                  { label: '25%', pct: '25' },
                  { label: '30%', pct: '30' },
                ].map(btn => (
                  <button
                    key={btn.pct}
                    type="button"
                    onClick={() => handleCheckoutDescontoPct(btn.pct === '0' ? '' : btn.pct, subtotalGeral)}
                    className={`text-[11px] px-2 py-0.5 rounded border transition-all ${
                      (btn.pct === '0' && !checkoutDescontoPct) || (checkoutDescontoPct === btn.pct)
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 font-bold'
                        : 'border-[var(--color-border)] text-foreground/60 hover:text-foreground'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 6. Forma de Pagamento */}
            <div className="p-3.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground/70 block">
                Forma de Pagamento
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'DINHEIRO', label: 'Dinheiro', icon: Coins },
                  { id: 'PIX', label: 'Pix', icon: QrCode },
                  { id: 'DEBITO', label: 'Débito', icon: CreditCard },
                  { id: 'CREDITO', label: 'Crédito', icon: Banknote },
                ].map(op => {
                  const Icon = op.icon;
                  const active = checkoutPagamento === op.id;
                  return (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => setCheckoutPagamento(op.id as FormaPagamento)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-medium transition-all ${
                        active 
                          ? 'bg-gold/15 border-gold text-gold font-bold shadow-sm' 
                          : 'border-[var(--color-border)] bg-[var(--color-background)] text-foreground/70 hover:border-foreground/30'
                      }`}
                    >
                      <Icon size={18} className="mb-1" />
                      {op.label}
                    </button>
                  );
                })}
              </div>

              {checkoutPagamento === 'CREDITO' && (
                <div className="pt-2 flex items-center justify-between border-t border-[var(--color-border)]">
                  <span className="text-xs text-foreground/70">Número de Parcelas:</span>
                  <select
                    value={checkoutParcelas}
                    onChange={(e) => setCheckoutParcelas(parseInt(e.target.value) || 1)}
                    className="bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg p-1.5 text-xs font-mono font-bold text-foreground"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                      <option key={n} value={n}>
                        {n}x de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalGeral / n)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Informação da taxa de maquininha */}
              {taxaMaq.valorTaxa > 0 && (
                <div className="flex justify-between items-center text-xs text-amber-500 pt-1 border-t border-[var(--color-border)]">
                  <span>Taxa Cartão ({taxaMaq.regraNome} {taxaMaq.feePercentage}%):</span>
                  <span className="font-mono">- {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(taxaMaq.valorTaxa)}</span>
                </div>
              )}
            </div>

            {/* 7. Total Final & Confirmação */}
            <div className="pt-3 border-t border-[var(--color-border)] flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
              <div>
                <span className="text-xs text-foreground/60 block">Total Líquido a Receber</span>
                <p className="text-3xl font-extrabold font-serif text-gold">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalGeral)}
                </p>
                {checkoutPagamento === 'CREDITO' && numParcelas > 1 && (
                  <p className="text-xs text-amber-400 font-mono mt-0.5">
                    {numParcelas}x de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalGeral / numParcelas)}
                  </p>
                )}
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <Button 
                  variant="ghost" 
                  disabled={submitting}
                  onClick={onClose} 
                  className="flex-1 sm:flex-none text-foreground/60 hover:text-foreground"
                >
                  Cancelar
                </Button>
                <Button 
                  variant="primary" 
                  disabled={submitting}
                  onClick={handleConfirmarRecebimento}
                  className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-lg shadow-emerald-600/30 font-bold px-6 py-2.5"
                >
                  <CheckCircle2 size={18} className="mr-2" />
                  {submitting ? 'Registrando...' : 'Registrar Fechamento Prévio (Liberar Cliente)'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardGlass>
    </div>
  );
}
