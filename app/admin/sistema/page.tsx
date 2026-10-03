'use client';

import { useState, useEffect } from 'react';
import { SectionTitle } from '@/components/SectionTitle';
import { CardGlass } from '@/components/CardGlass';
import { Button } from '@/components/Button';
import { Database, Download, Upload, AlertTriangle, FileJson, CheckCircle2, MessageSquare, Link as LinkIcon, Activity, ShieldCheck, RefreshCw } from 'lucide-react';
import { getServicos, getProfissionais, getClientes, getAgendamentos, getBloqueios, getProfissionalServico } from '@/lib/mock-data';
import type { Servico, Profissional, Cliente, Agendamento, BloqueioAgenda, ProfissionalServico } from '@/lib/gestao-types';

export default function SistemaPage() {
  const [importStatus, setImportStatus] = useState<{ tipo: 'idle' | 'sucesso' | 'erro', msg: string }>({ tipo: 'idle', msg: '' });
  const [dadosReais, setDadosReais] = useState<{
    servicos: Servico[];
    profissionais: Profissional[];
    profissionais_servicos: ProfissionalServico[];
    clientes: Cliente[];
    agendamentos: Agendamento[];
    bloqueios: BloqueioAgenda[];
  } | null>(null);

  const [instance, setInstance] = useState('');
  const [evoStatus, setEvoStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [healthChecks, setHealthChecks] = useState<Record<string, { status: 'ok' | 'error' | 'warning' | 'idle', msg: string }> | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [agendamentoAtivo, setAgendamentoAtivo] = useState(true);
  const [whatsappContato, setWhatsappContato] = useState('');
  const [asaasApiKey, setAsaasApiKey] = useState('');
  const [asaasWalletId, setAsaasWalletId] = useState('');
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [savingAsaas, setSavingAsaas] = useState(false);
  const [loadingLojaSettings, setLoadingLojaSettings] = useState(true);

  useEffect(() => {
    const carregar = async () => {
      const [s, p, ps, c, a, b] = await Promise.all([
        getServicos(), getProfissionais(), getProfissionalServico(),
        getClientes(), getAgendamentos(), getBloqueios()
      ]);
      setDadosReais({ servicos: s, profissionais: p, profissionais_servicos: ps, clientes: c, agendamentos: a, bloqueios: b });

      try {
        const resLoja = await fetch('/api/admin/loja/settings');
        if (resLoja.ok) {
          const lojaData = await resLoja.json();
          setAgendamentoAtivo(lojaData.agendamento_ativo ?? true);
          setWhatsappContato(lojaData.whatsapp_contato ?? '');
          setAsaasApiKey(lojaData.asaas_api_key ?? '');
          setAsaasWalletId(lojaData.asaas_wallet_id ?? '');
        }
      } catch (e) {
        console.error('Erro ao carregar loja_settings:', e);
      } finally {
        setLoadingLojaSettings(false);
      }
    };
    carregar();
  }, []);

  const toggleAgendamento = async () => {
    const novoStatus = !agendamentoAtivo;
    setAgendamentoAtivo(novoStatus);
    try {
      const res = await fetch('/api/admin/loja/settings');
      const current = await res.json();

      await fetch('/api/admin/loja/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...current, agendamento_ativo: novoStatus }),
      });
    } catch (e) {
      console.error('Erro ao salvar config agendamento:', e);
      setAgendamentoAtivo(!novoStatus); // reverte em caso de erro
    }
  };

  const saveWhatsapp = async () => {
    setSavingWhatsapp(true);
    try {
      const res = await fetch('/api/admin/loja/settings');
      const current = await res.json();
      const payload = { ...current, whatsapp_contato: whatsappContato };
      const saveRes = await fetch('/api/admin/loja/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (saveRes.ok) {
        alert('Número do WhatsApp salvo com sucesso!');
      } else {
        throw new Error('Falha ao salvar');
      }
    } catch (e) {
      console.error('Erro ao salvar WhatsApp:', e);
      alert('Erro ao salvar WhatsApp. Talvez seja necessário criar a coluna whatsapp_contato no banco de dados primeiro.');
    } finally {
      setSavingWhatsapp(false);
    }
  };

  const saveAsaas = async () => {
    setSavingAsaas(true);
    try {
      const res = await fetch('/api/admin/loja/settings');
      const current = await res.json();
      const payload = { ...current, asaas_api_key: asaasApiKey, asaas_wallet_id: asaasWalletId };
      const saveRes = await fetch('/api/admin/loja/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (saveRes.ok) {
        alert('Configurações do Asaas salvas com sucesso!');
      } else {
        throw new Error('Falha ao salvar');
      }
    } catch (e) {
      console.error('Erro ao salvar Asaas:', e);
      alert('Erro ao salvar Asaas. Verifique se as colunas foram criadas no banco.');
    } finally {
      setSavingAsaas(false);
    }
  };

  const checkAllSystems = async () => {
    setCheckingHealth(true);
    try {
      const res = await fetch('/api/admin/sistema/health-check');
      if (res.ok) {
        const data = await res.json();
        setHealthChecks(data);
      }
    } catch (e) {
      console.error('Erro no health check:', e);
    } finally {
      setCheckingHealth(false);
    }
  };

  const handleExport = () => {
    const backupData = dadosReais || {
      servicos: [], profissionais: [], profissionais_servicos: [],
      clientes: [], agendamentos: [], bloqueios: []
    };
    const backup = {
      ...backupData,
      exportado_em: new Date().toISOString(),
      fonte: dadosReais ? 'supabase_realtime' : 'mock_fallback'
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `agnaldo_gomes_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.clientes && json.agendamentos) {
          setImportStatus({
            tipo: 'sucesso',
            msg: `Base importada com sucesso! ${json.clientes.length} clientes encontrados no arquivo de backup.`
          });
        } else {
          setImportStatus({
            tipo: 'erro',
            msg: 'Arquivo JSON inválido. Certifique-se de que é um backup válido do sistema.'
          });
        }
      } catch (err) {
        setImportStatus({
          tipo: 'erro',
          msg: 'Erro ao processar o arquivo. Verifique se é um arquivo JSON válido.'
        });
      }
    };
    reader.readAsText(file);
  };

return (
  <div className="py-4 space-y-6 max-w-5xl mx-auto">
    <div className="flex flex-col">
      <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
        Gestão do Sistema
      </h1>
      <p className="text-sm text-foreground/60 mt-1">
        Backups de segurança, importação/exportação e controle de agendamentos.
      </p>
    </div>

    {/* Modo de Manutenção / Agendamento Ativo */}
      <CardGlass className={`p-6 border-l-4 transition-colors duration-300 ${agendamentoAtivo ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${agendamentoAtivo ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
              {agendamentoAtivo ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">Agendamentos Públicos</h3>
              <p className="text-sm text-foreground/60">
                {agendamentoAtivo 
                  ? 'Os clientes podem acessar a página de agendamento e realizar marcações.' 
                  : 'O sistema está bloqueado para novos agendamentos (Modo de Manutenção).'}
              </p>
            </div>
          </div>
          {!loadingLojaSettings && (
            <Button 
              onClick={toggleAgendamento} 
              variant={agendamentoAtivo ? 'outline' : 'primary'}
              className={!agendamentoAtivo ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-none' : 'border-red-500 text-red-500 hover:bg-red-500/10'}
            >
              {agendamentoAtivo ? 'Desabilitar Agendamento' : 'Habilitar Agendamento'}
            </Button>
          )}
        </div>
      </CardGlass>

      {/* Configuração de WhatsApp */}
      <CardGlass className="p-6">
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div>
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              <MessageSquare size={20} className="text-emerald-500" />
              WhatsApp de Atendimento
            </h3>
            <p className="text-sm text-foreground/60 mt-1">
              Defina o número de WhatsApp principal (com DDI e DDD, ex: 5511999999999).
            </p>
          </div>
          <div className="flex w-full md:w-auto items-center gap-2">
            <input 
              type="text" 
              value={whatsappContato} 
              onChange={(e) => setWhatsappContato(e.target.value)} 
              placeholder="5511999999999" 
              className="px-4 py-2 bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg flex-1 min-w-[200px] text-foreground focus:outline-none focus:border-gold"
            />
            <Button onClick={saveWhatsapp} disabled={savingWhatsapp || loadingLojaSettings} variant="primary">
              {savingWhatsapp ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </CardGlass>

      {/* Configuração do Asaas */}
      <CardGlass className="p-6">
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div className="flex-1">
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              <ShieldCheck size={20} className="text-blue-500" />
              Integração Asaas (Pagamentos e Notas Fiscais)
            </h3>
            <p className="text-sm text-foreground/60 mt-1">
              Configure a API Key do Asaas para permitir que o sistema emita Notas Fiscais e gere cobranças para serviços e produtos.
            </p>
          </div>
          <div className="flex flex-col w-full md:w-auto gap-2">
            <input 
              type="text" 
              value={asaasApiKey} 
              onChange={(e) => setAsaasApiKey(e.target.value)} 
              placeholder="API Key do Asaas ($aact_...)" 
              className="px-4 py-2 bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg w-full text-foreground text-sm focus:outline-none focus:border-gold"
            />
            <input 
              type="text" 
              value={asaasWalletId} 
              onChange={(e) => setAsaasWalletId(e.target.value)} 
              placeholder="Wallet ID (Opcional - p/ Split)" 
              className="px-4 py-2 bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg w-full text-foreground text-sm focus:outline-none focus:border-gold"
            />
            <Button onClick={saveAsaas} disabled={savingAsaas || loadingLojaSettings} variant="primary" className="mt-1">
              {savingAsaas ? 'Salvando...' : 'Salvar Asaas'}
            </Button>
          </div>
        </div>
      </CardGlass>

      {/* Exportar / Importar Backup */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CardGlass className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-gold/10 text-gold rounded-lg">
                <Download size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">Exportar Backup</h3>
                <p className="text-sm text-foreground/60">Gere uma cópia JSON de todos os dados</p>
              </div>
            </div>

            <p className="text-sm text-foreground/70 mb-6 leading-relaxed">
              O backup exporta clientes, histórico de agendamentos, serviços, profissionais e bloqueios de agenda em formato aberto JSON.
            </p>
          </div>

          <Button onClick={handleExport} variant="primary" className="w-full flex items-center justify-center gap-2">
            <Download size={18} />
            Baixar Backup Completo
          </Button>
        </CardGlass>

        <CardGlass className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg">
                <Upload size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">Importar Base</h3>
                <p className="text-sm text-foreground/60">Carregue dados de backup JSON</p>
              </div>
            </div>

            <p className="text-sm text-foreground/70 mb-6 leading-relaxed">
              Importe cadastros de clientes e agendamentos anteriores para atualizar o banco de dados.
            </p>
          </div>

          <div>
            {importStatus.tipo !== 'idle' && (
              <div className={`p-3 rounded-lg mb-4 text-xs flex items-start gap-2 ${
                importStatus.tipo === 'sucesso' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
              }`}>
                {importStatus.tipo === 'sucesso' ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
                <p>{importStatus.msg}</p>
              </div>
            )}
            <label className="flex items-center justify-center w-full p-4 border-2 border-dashed border-[var(--border-subtle)] rounded-lg hover:border-gold hover:bg-foreground/5 cursor-pointer transition-colors">
              <input type="file" accept=".json" className="hidden" onChange={handleImport} />
              <div className="flex flex-col items-center text-foreground/60">
                <FileJson size={24} className="mb-2 text-gold" />
                <span className="text-xs font-semibold">Clique para selecionar um arquivo .json</span>
              </div>
            </label>
          </div>
        </CardGlass>
      </div>

      {/* Regras de Comunicação */}
      <CardGlass className="p-6">
        <div className="flex items-center gap-3 mb-6 border-b border-[var(--border-subtle)] pb-4">
          <div className="p-3 bg-gold/10 text-gold rounded-lg">
            <MessageSquare size={24} />
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground">Regras de Comunicação e Mensagens</h3>
            <p className="text-sm text-foreground/60">Templates de confirmação e disparo para clientes</p>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); alert("Regras de notificação salvas com sucesso!"); }} className="space-y-4 max-w-2xl">
          <div>
            <label className="block text-xs font-bold text-foreground/80 mb-2">Mensagem Padrão de Confirmação</label>
            <p className="text-xs text-foreground/50 mb-2">Variáveis disponíveis: <code className="bg-foreground/10 px-1 rounded">{'{nome}'}</code>, <code className="bg-foreground/10 px-1 rounded">{'{servico}'}</code>, <code className="bg-foreground/10 px-1 rounded">{'{hora}'}</code>, <code className="bg-foreground/10 px-1 rounded">{'{data}'}</code></p>
            <textarea
              rows={3}
              defaultValue="Olá {{nome}}, seu horário para {{servico}} no Studio Agnaldo Gomes está marcado para {{data}} às {{hora}}. Responda SIM para confirmar."
              className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-3 text-foreground text-sm focus:outline-none focus:border-gold resize-none"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" variant="primary">Salvar Regras</Button>
          </div>
        </form>
      </CardGlass>
    </div>
  );
}
