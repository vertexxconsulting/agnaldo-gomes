'use client';

import { useState } from 'react';
import { Search, Receipt, CheckCircle, AlertTriangle, FileText, Calendar, DollarSign, User } from 'lucide-react';
import { CardGlass } from '@/components/CardGlass';
import { Button } from '@/components/Button';
import { SectionTitle } from '@/components/SectionTitle';

interface ClienteInfo {
  id: string;
  nome: string;
  cpf: string;
  email: string | null;
  endereco: string | null;
  telefone: string;
}

interface ServicoInfo {
  id: string;
  data: string;
  hora: string;
  servico: string;
  profissional: string;
  valor: number;
  status: string;
}

export default function NotasFiscaisPage() {
  const [cpfBusca, setCpfBusca] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  
  const [cliente, setCliente] = useState<ClienteInfo | null>(null);
  const [servicosRecentes, setServicosRecentes] = useState<ServicoInfo[]>([]);
  const [servicoSelecionado, setServicoSelecionado] = useState<string | null>(null);
  const [emitindo, setEmitindo] = useState(false);
  const [notaEmitida, setNotaEmitida] = useState<boolean>(false);

  // Formata CPF enquato digita
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    
    // Aplica máscara (000.000.000-00)
    if (value.length > 9) {
      value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    } else if (value.length > 6) {
      value = value.replace(/(\d{3})(\d{3})(\d{3})/, "$1.$2.$3");
    } else if (value.length > 3) {
      value = value.replace(/(\d{3})(\d{3})/, "$1.$2");
    }
    setCpfBusca(value);
  };

  const buscarCliente = async () => {
    const cpfLimpo = cpfBusca.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      setErro("Digite um CPF válido com 11 dígitos.");
      return;
    }
    
    setLoading(true);
    setErro(null);
    setNotaEmitida(false);
    setCliente(null);
    setServicosRecentes([]);
    setServicoSelecionado(null);

    try {
      const res = await fetch(`/api/admin/notas/buscar?cpf=${cpfLimpo}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao buscar cliente');
      }

      if (data.cliente) {
        setCliente(data.cliente);
        setServicosRecentes(data.servicos || []);
        if (data.servicos && data.servicos.length > 0) {
          setServicoSelecionado(data.servicos[0].id);
        }
      } else {
        setErro("Cliente não encontrado com este CPF.");
      }
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  };

  const emitirNota = async () => {
    if (!cliente || !servicoSelecionado) return;
    
    setEmitindo(true);
    try {
      const servico = servicosRecentes.find(s => s.id === servicoSelecionado);
      
      const res = await fetch('/api/admin/notas/emitir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: cliente.id,
          agendamentoId: servico?.id,
          valor: servico?.valor
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao emitir nota');

      setNotaEmitida(true);
      alert('Nota Fiscal enviada para emissão com sucesso!');
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setEmitindo(false);
    }
  };

  const selectedService = servicosRecentes.find(s => s.id === servicoSelecionado);

  const imprimirCupom = () => {
    if (!cliente || !selectedService) return;

    const dataAtual = new Date().toLocaleString('pt-BR');
    
    // Formato padrão de canhoto RPS/Asaas para impressora térmica 80mm
    const conteudo = `
      <html>
        <head>
          <title>Cupom RPS - ${cliente.nome}</title>
          <style>
            @page { margin: 0; }
            body { 
              font-family: monospace; 
              font-size: 12px; 
              width: 80mm; 
              margin: 0; 
              padding: 5mm; 
              color: #000;
              background: #fff;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .mb { margin-bottom: 5px; }
            .mt { margin-top: 5px; }
          </style>
        </head>
        <body>
          <div class="center bold mb" style="font-size: 14px;">
            STUDIO AGNALDO GOMES<br/>
            CNPJ: 00.000.000/0001-00
          </div>
          <div class="center mb">
            RPS - RECIBO PROVISÓRIO DE SERVIÇOS
          </div>
          <div class="divider"></div>
          <div><span class="bold">Data/Hora:</span> ${dataAtual}</div>
          <div><span class="bold">Emissão:</span> Via Asaas</div>
          <div class="divider"></div>
          <div class="bold mb">TOMADOR DO SERVIÇO:</div>
          <div>Nome: ${cliente.nome}</div>
          <div>CPF: ${cliente.cpf}</div>
          <div class="divider"></div>
          <div class="bold mb">DISCRIMINAÇÃO DOS SERVIÇOS:</div>
          <div>${selectedService.servico}</div>
          <div class="mt">Profissional: ${selectedService.profissional}</div>
          <div class="divider"></div>
          <div class="bold" style="font-size: 16px; text-align: right;">TOTAL: R$ ${selectedService.valor.toFixed(2)}</div>
          <div class="divider"></div>
          <div class="center" style="font-size: 10px; margin-top: 15px;">
            Documento emitido por ME ou EPP optante pelo Simples Nacional.<br/>
            Este recibo provisório será convertido em Nota Fiscal de Serviços Eletrônica (NFS-e).
          </div>
        </body>
      </html>
    `;

    const janela = window.open('', '_blank', 'width=400,height=600');
    if (janela) {
      janela.document.write(conteudo);
      janela.document.close();
      janela.focus();
      setTimeout(() => {
        janela.print();
        // janela.close(); // opcional fechar logo após impressão
      }, 500);
    }
  };

  return (
    <div className="py-4 space-y-6 max-w-5xl mx-auto">
      <SectionTitle
        title="Emissão de Notas Fiscais"
        subtitle="Busque o cliente pelo CPF para emitir a NFS-e dos serviços realizados."
      />

      {/* Buscar CPF */}
      <CardGlass className="p-6">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Search size={20} className="text-gold" />
          Buscar Cliente
        </h3>
        
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-foreground/80 mb-1">CPF do Cliente</label>
            <input 
              type="text" 
              value={cpfBusca} 
              onChange={handleCpfChange} 
              onKeyDown={(e) => { if (e.key === 'Enter') buscarCliente(); }}
              placeholder="000.000.000-00" 
              className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-3 text-foreground text-sm focus:outline-none focus:border-gold"
            />
          </div>
          <Button onClick={buscarCliente} disabled={loading} variant="primary" className="w-full md:w-auto h-[46px] px-8">
            {loading ? 'Buscando...' : 'Buscar'}
          </Button>
        </div>
        {erro && <p className="text-red-500 text-sm mt-3 flex items-center gap-1"><AlertTriangle size={16}/> {erro}</p>}
      </CardGlass>

      {/* Resultado da Busca */}
      {cliente && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dados do Cliente e Serviço */}
          <CardGlass className="p-6 space-y-6">
            <div>
              <h3 className="font-bold text-lg border-b border-[var(--border-subtle)] pb-2 mb-4 flex items-center gap-2">
                <User size={20} className="text-emerald-500" />
                Dados do Cliente
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-foreground/60">Nome:</span>
                  <span className="font-bold">{cliente.nome}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/60">CPF:</span>
                  <span className="font-bold">{cliente.cpf || 'Não cadastrado'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/60">Endereço:</span>
                  <span className="font-bold text-right max-w-[200px] truncate" title={cliente.endereco || ''}>{cliente.endereco || 'Não cadastrado'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/60">E-mail:</span>
                  <span className="font-bold">{cliente.email || 'Não cadastrado'}</span>
                </div>
              </div>

              {(!cliente.cpf || !cliente.endereco) && (
                <div className="mt-4 p-3 bg-amber-500/10 text-amber-500 rounded-lg text-xs flex items-start gap-2">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <p>Atenção: Para emitir a nota fiscal corretamente, o cliente precisa ter CPF e Endereço cadastrados. Você pode atualizar isso na aba "Clientes".</p>
                </div>
              )}
            </div>

            <div>
              <h3 className="font-bold text-lg border-b border-[var(--border-subtle)] pb-2 mb-4 flex items-center gap-2">
                <FileText size={20} className="text-blue-500" />
                Serviços Concluídos (Recentes)
              </h3>
              
              {servicosRecentes.length === 0 ? (
                <p className="text-sm text-foreground/50 italic text-center py-4">Nenhum serviço recente encontrado para este cliente.</p>
              ) : (
                <div className="space-y-3">
                  {servicosRecentes.map(servico => (
                    <label key={servico.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${servicoSelecionado === servico.id ? 'border-gold bg-gold/5' : 'border-[var(--border-subtle)] hover:bg-foreground/5'}`}>
                      <input 
                        type="radio" 
                        name="servico" 
                        className="mt-1"
                        checked={servicoSelecionado === servico.id}
                        onChange={() => setServicoSelecionado(servico.id)}
                      />
                      <div className="flex-1">
                        <div className="flex justify-between font-bold text-sm">
                          <span>{servico.servico}</span>
                          <span className="text-emerald-500">R$ {servico.valor.toFixed(2)}</span>
                        </div>
                        <div className="text-xs text-foreground/60 mt-1 flex gap-3">
                          <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(servico.data).toLocaleDateString('pt-BR')} às {servico.hora}</span>
                          <span className="flex items-center gap-1"><User size={12}/> {servico.profissional}</span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </CardGlass>

          {/* Pré-visualização e Ação */}
          <CardGlass className="p-6 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-lg border-b border-[var(--border-subtle)] pb-2 mb-6 flex items-center gap-2">
                <Receipt size={20} className="text-gold" />
                Resumo da Nota
              </h3>
              
              {selectedService ? (
                <div className="bg-foreground/5 rounded-lg p-5 font-mono text-sm space-y-4 shadow-inner">
                  <div className="text-center font-bold border-b border-foreground/10 pb-3 mb-3">
                    RPS - RECIBO PROVISÓRIO DE SERVIÇOS
                  </div>
                  <div className="space-y-1">
                    <p><span className="text-foreground/50">TOMADOR:</span> {cliente.nome}</p>
                    <p><span className="text-foreground/50">CPF/CNPJ:</span> {cliente.cpf || 'PENDENTE'}</p>
                    <p><span className="text-foreground/50">ENDEREÇO:</span> {cliente.endereco || 'PENDENTE'}</p>
                  </div>
                  <div className="border-t border-dashed border-foreground/20 pt-3 space-y-1">
                    <p><span className="text-foreground/50">DESCRIÇÃO:</span> Referente ao serviço de {selectedService.servico}</p>
                    <p><span className="text-foreground/50">VALOR TOTAL:</span> R$ {selectedService.valor.toFixed(2)}</p>
                  </div>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-foreground/40 text-sm">
                  Selecione um serviço para visualizar o resumo.
                </div>
              )}
            </div>

            <div className="mt-8 pt-4 border-t border-[var(--border-subtle)]">
              {notaEmitida ? (
                <div className="flex flex-col gap-4">
                  <div className="bg-emerald-500/10 text-emerald-500 p-4 rounded-lg flex flex-col items-center justify-center gap-2">
                    <CheckCircle size={32} />
                    <p className="font-bold">Nota Fiscal Emitida com Sucesso!</p>
                    <p className="text-xs text-center opacity-80">O documento foi enviado para a prefeitura via Asaas. Você pode acompanhar o status no painel do Asaas.</p>
                  </div>
                  <Button 
                    onClick={imprimirCupom} 
                    variant="outline" 
                    className="w-full h-[54px] text-lg font-bold border-gold text-gold hover:bg-gold hover:text-black transition-colors"
                  >
                    🖨️ Imprimir Canhoto (Térmica 80mm)
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={emitirNota} 
                  disabled={!selectedService || !cliente.cpf || emitindo} 
                  variant="primary" 
                  className="w-full h-[54px] text-lg font-bold"
                >
                  {emitindo ? 'Emitindo Nota...' : 'Emitir Nota Fiscal (Asaas)'}
                </Button>
              )}
            </div>
          </CardGlass>
        </div>
      )}
    </div>
  );
}
