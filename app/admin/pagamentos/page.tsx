'use client';

import { useState, useEffect } from 'react';
import { 
  Wallet, DollarSign, ArrowDownRight, Plus, AlertTriangle, Coffee, Wrench, Users, Receipt, Archive, LockOpen, Lock
} from 'lucide-react';
import { CardGlass } from '@/components/CardGlass';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';

// Categorias de despesa e seus ícones
const EXPENSE_CATEGORIES: Record<string, { label: string; icon: any; color: string }> = {
  PAYROLL: { label: 'Pagamento de Funcionários', icon: Users, color: 'text-blue-500 bg-blue-500/10' },
  MAINTENANCE: { label: 'Manutenção do Salão', icon: Wrench, color: 'text-amber-500 bg-amber-500/10' },
  SUPPLIES: { label: 'Alimentação / Insumos', icon: Coffee, color: 'text-orange-500 bg-orange-500/10' },
  BILLS: { label: 'Contas (Água, Luz, Internet)', icon: Receipt, color: 'text-purple-500 bg-purple-500/10' },
  OTHER: { label: 'Outras Despesas', icon: Archive, color: 'text-slate-500 bg-slate-500/10' }
};

export default function AdminFinanceiro() {
  const [loading, setLoading] = useState(true);
  const [caixaAberto, setCaixaAberto] = useState<any>(null);
  const [transacoes, setTransacoes] = useState<any[]>([]);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [formCat, setFormCat] = useState('MAINTENANCE');
  const [formDesc, setFormDesc] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formMethod, setFormMethod] = useState('DINHEIRO');

  // Caixa form
  const [abrirCaixaValor, setAbrirCaixaValor] = useState('');

  useEffect(() => {
    loadFinanceiro();
  }, []);

  const loadFinanceiro = async () => {
    setLoading(true);
    try {
      // 1. Tenta buscar o caixa aberto de hoje
      const { data: caixas } = await supabase
        .from('caixa_diario')
        .select('*')
        .eq('status', 'OPEN')
        .order('opened_at', { ascending: false })
        .limit(1);

      if (caixas && caixas.length > 0) {
        setCaixaAberto(caixas[0]);
        // Busca transacoes deste caixa
        const { data: txs } = await supabase
          .from('financial_transactions')
          .select('*')
          .eq('caixa_id', caixas[0].id)
          .order('transaction_date', { ascending: false });
        
        setTransacoes(txs || []);
      } else {
        setCaixaAberto(null);
        setTransacoes([]);
      }
    } catch (e) {
      console.error('Tabelas de financeiro podem não estar criadas ainda.', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAbrirCaixa = async () => {
    const valorNum = parseFloat(abrirCaixaValor.replace(',', '.'));
    if (isNaN(valorNum)) return alert('Digite um valor inicial válido.');

    const { data, error } = await supabase.from('caixa_diario').insert([
      { opening_balance: valorNum, status: 'OPEN' }
    ]).select().single();

    if (error) {
      alert('Erro ao abrir caixa. Verifique se as tabelas foram criadas no banco.');
      return;
    }
    
    setCaixaAberto(data);
    setAbrirCaixaValor('');
  };

  const handleFecharCaixa = async () => {
    if (!caixaAberto) return;
    if (!confirm('Deseja realmente fechar o caixa de hoje?')) return;

    // Calcula saldo final = inicial + receitas - despesas (apenas DINHEIRO, se formos rigorosos, ou geral)
    let saldoDinheiro = Number(caixaAberto.opening_balance);
    transacoes.forEach(t => {
      if (t.payment_method === 'DINHEIRO') {
        if (t.type === 'INCOME') saldoDinheiro += Number(t.amount);
        if (t.type === 'EXPENSE') saldoDinheiro -= Number(t.amount);
      }
    });

    const { error } = await supabase.from('caixa_diario').update({
      status: 'CLOSED',
      closed_at: new Date().toISOString(),
      closing_balance: saldoDinheiro
    }).eq('id', caixaAberto.id);

    if (!error) {
      setCaixaAberto(null);
      setTransacoes([]);
      alert(`Caixa fechado com sucesso!\nSaldo final em Dinheiro Físico estimado: R$ ${saldoDinheiro.toFixed(2)}`);
    }
  };

  const handleLancarDespesa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caixaAberto) return alert('Abra o caixa do dia primeiro!');

    const valorNum = parseFloat(formAmount.replace(',', '.'));
    if (isNaN(valorNum) || valorNum <= 0) return alert('Digite um valor válido.');

    const newTx = {
      caixa_id: caixaAberto.id,
      type: formType,
      category: formCat,
      description: formDesc,
      amount: valorNum,
      payment_method: formMethod,
      status: 'PAID'
    };

    const { error } = await supabase.from('financial_transactions').insert([newTx]);
    
    if (error) {
      alert('Erro ao lançar. Certifique-se de ter criado as tabelas no Supabase.');
    } else {
      setShowForm(false);
      setFormDesc('');
      setFormAmount('');
      loadFinanceiro(); // recarrega
    }
  };

  // Resumos
  const totalDespesas = transacoes.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + Number(t.amount), 0);
  const totalFisico = (caixaAberto ? Number(caixaAberto.opening_balance) : 0) + 
                      transacoes.filter(t => t.payment_method === 'DINHEIRO' && t.type === 'INCOME').reduce((acc, t) => acc + Number(t.amount), 0) -
                      transacoes.filter(t => t.payment_method === 'DINHEIRO' && t.type === 'EXPENSE').reduce((acc, t) => acc + Number(t.amount), 0);

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Wallet size={24} className="text-gold" /> Financeiro e Caixa
        </h1>
        <p className="text-foreground/60 mt-1">
          Abertura e fechamento de caixa diário, e controle de despesas do Studio (pagamentos, manutenção, etc).
        </p>
      </div>

      {!caixaAberto && !loading && (
        <CardGlass className="p-8 text-center flex flex-col items-center justify-center space-y-4 border-amber-500/20">
          <Lock size={48} className="text-amber-500/50 mb-2" />
          <h2 className="text-xl font-bold text-foreground">O Caixa está Fechado</h2>
          <p className="text-foreground/60 max-w-sm">
            Para iniciar os lançamentos de despesas e controlar as entradas em dinheiro de hoje, abra o caixa informando o valor que há na gaveta.
          </p>
          <div className="flex items-center gap-3 mt-4">
            <span className="text-foreground font-medium">Fundo de Caixa R$</span>
            <input 
              type="number" 
              value={abrirCaixaValor}
              onChange={e => setAbrirCaixaValor(e.target.value)}
              placeholder="0.00" 
              className="bg-background border border-border-subtle rounded-md px-3 py-2 w-32 focus:border-gold outline-none"
            />
            <Button onClick={handleAbrirCaixa} variant="primary">
              Abrir Caixa
            </Button>
          </div>
        </CardGlass>
      )}

      {caixaAberto && (
        <>
          {/* Dashboard Topo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CardGlass className="p-5 flex items-center gap-4 border-l-4 border-l-emerald-500">
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
                <LockOpen size={24} />
              </div>
              <div>
                <p className="text-sm text-foreground/60">Status do Caixa</p>
                <p className="font-bold text-xl text-foreground">ABERTO</p>
                <p className="text-xs text-emerald-500 mt-1">Fundo inicial: R$ {Number(caixaAberto.opening_balance).toFixed(2)}</p>
              </div>
            </CardGlass>

            <CardGlass className="p-5 flex items-center gap-4 border-l-4 border-l-red-500">
              <div className="p-3 bg-red-500/10 rounded-xl text-red-500">
                <ArrowDownRight size={24} />
              </div>
              <div>
                <p className="text-sm text-foreground/60">Saídas / Despesas</p>
                <p className="font-bold text-xl text-red-500">R$ {totalDespesas.toFixed(2)}</p>
                <p className="text-xs text-foreground/40 mt-1">{transacoes.filter(t => t.type === 'EXPENSE').length} lançamentos hoje</p>
              </div>
            </CardGlass>

            <CardGlass className="p-5 flex items-center gap-4 border-l-4 border-l-amber-500">
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
                <DollarSign size={24} />
              </div>
              <div>
                <p className="text-sm text-foreground/60">Saldo Físico (Gaveta)</p>
                <p className="font-bold text-xl text-foreground">R$ {totalFisico.toFixed(2)}</p>
                <p className="text-xs text-foreground/40 mt-1">Soma de todo o dinheiro</p>
              </div>
            </CardGlass>
          </div>

          <div className="flex items-center justify-between mt-8 mb-4">
            <h2 className="text-xl font-bold text-foreground">Movimentações de Hoje</h2>
            <div className="flex gap-3">
              <Button variant="outline" className="text-red-500 border-red-500/30 hover:bg-red-500/10" onClick={handleFecharCaixa}>
                Fechar Caixa
              </Button>
              <Button variant="primary" onClick={() => setShowForm(!showForm)} className="gap-2">
                <Plus size={18} /> Nova Despesa
              </Button>
            </div>
          </div>

          {/* Formulario de Nova Despesa */}
          {showForm && (
            <CardGlass className="p-6 mb-6 border border-gold/30">
              <h3 className="font-bold text-lg mb-4 text-foreground">Registrar Pagamento / Despesa</h3>
              <form onSubmit={handleLancarDespesa} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="space-y-1">
                  <label className="text-sm text-foreground/60">Categoria da Despesa</label>
                  <select 
                    value={formCat} 
                    onChange={e => setFormCat(e.target.value)}
                    className="w-full bg-background border border-border-subtle rounded-md px-3 py-2 text-foreground focus:border-gold outline-none"
                  >
                    {Object.entries(EXPENSE_CATEGORIES).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm text-foreground/60">Valor (R$)</label>
                  <input 
                    type="number" step="0.01" required
                    value={formAmount} onChange={e => setFormAmount(e.target.value)}
                    className="w-full bg-background border border-border-subtle rounded-md px-3 py-2 text-foreground focus:border-gold outline-none"
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm text-foreground/60">Descrição / Motivo</label>
                  <input 
                    type="text" required
                    value={formDesc} onChange={e => setFormDesc(e.target.value)}
                    className="w-full bg-background border border-border-subtle rounded-md px-3 py-2 text-foreground focus:border-gold outline-none"
                    placeholder="Ex: Troca de lâmpada da recepção, Café e pão de queijo, Pagamento João..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm text-foreground/60">Forma de Pagamento</label>
                  <select 
                    value={formMethod} 
                    onChange={e => setFormMethod(e.target.value)}
                    className="w-full bg-background border border-border-subtle rounded-md px-3 py-2 text-foreground focus:border-gold outline-none"
                  >
                    <option value="DINHEIRO">Dinheiro (Sai do Caixa)</option>
                    <option value="PIX">PIX (Sai do Banco)</option>
                    <option value="CARTAO">Cartão</option>
                  </select>
                </div>

                <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                  <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
                  <Button type="submit" variant="primary" className="bg-red-600 hover:bg-red-700 text-white border-none">
                    Confirmar Saída
                  </Button>
                </div>
              </form>
            </CardGlass>
          )}

          {/* Tabela de transações */}
          <CardGlass className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-foreground/5 border-b border-border-subtle">
                    <th className="p-4 text-sm font-semibold text-foreground/60">Tipo</th>
                    <th className="p-4 text-sm font-semibold text-foreground/60">Descrição</th>
                    <th className="p-4 text-sm font-semibold text-foreground/60">Método</th>
                    <th className="p-4 text-sm font-semibold text-foreground/60 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {transacoes.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-foreground/40">
                        Nenhuma despesa ou movimentação lançada neste caixa hoje.
                      </td>
                    </tr>
                  ) : (
                    transacoes.map(t => {
                      const cat = EXPENSE_CATEGORIES[t.category] || EXPENSE_CATEGORIES.OTHER;
                      const Icon = cat.icon;
                      const isIncome = t.type === 'INCOME';

                      return (
                        <tr key={t.id} className="border-b border-border-subtle/50 hover:bg-foreground/5 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className={`p-2 rounded-lg ${cat.color}`}>
                                <Icon size={16} />
                              </span>
                              <span className="text-sm font-medium text-foreground">{cat.label}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <p className="text-sm text-foreground">{t.description}</p>
                            <p className="text-xs text-foreground/40 mt-0.5">{new Date(t.transaction_date).toLocaleTimeString('pt-BR')}</p>
                          </td>
                          <td className="p-4">
                            <span className="text-xs font-semibold px-2 py-1 bg-foreground/10 rounded-md">
                              {t.payment_method}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <span className={`font-bold ${isIncome ? 'text-emerald-500' : 'text-red-500'}`}>
                              {isIncome ? '+' : '-'} R$ {Number(t.amount).toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardGlass>
        </>
      )}

    </div>
  );
}
