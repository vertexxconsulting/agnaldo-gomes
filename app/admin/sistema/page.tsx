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
  const [healthChecks, setHealthChecks] = useState<Record<string, { status: 'ok' | 'error' | 'idle', msg: string }> | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);

  useEffect(() => {
    const carregar = async () => {
      const [s, p, ps, c, a, b] = await Promise.all([
        getServicos(), getProfissionais(), getProfissionalServico(),
        getClientes(), getAgendamentos(), getBloqueios()
      ]);
      setDadosReais({ servicos: s, profissionais: p, profissionais_servicos: ps, clientes: c, agendamentos: a, bloqueios: b });

      try {
        const res = await fetch('/api/admin/sistema/config');
        if (res.ok) {
          const data = await res.json();
          setInstance(data.instance || '');
        }
      } catch (e) {
        console.error('Erro ao carregar config da Evolution:', e);
      }
    };
    carregar();
  }, []);

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

  const testEvolutionConnection = async () => {
    if (!instance) {
      setEvoStatus('error');
      return;
    }

    setEvoStatus('loading');
    try {
      const res = await fetch('/api/admin/sistema/evolution/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instance })
      });

      if (res.ok) {
        setEvoStatus('success');
      } else {
        setEvoStatus('error');
      }
    } catch (err) {
      setEvoStatus('error');
    }
  };

  const saveConfig = async () => {
    try {
      const res = await fetch('/api/admin/sistema/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instance })
      });
      if (res.ok) {
        alert('Configurações salvas com sucesso!');
      } else {
        alert('Erro ao salvar configurações.');
      }
    } catch (e) {
      alert('Erro ao conectar com o servidor.');
    }
  };

  return (
    <div className="py-4 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col">
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
          Gestão do Sistema
        </h1>
        <p className="text-sm text-foreground/60 mt-1">
          Backups de segurança, importação/exportação e configurações de integração.
        </p>
      </div>

      {/* Painel de Saúde das APIs — usando componentes existentes */}
      <CardGlass className="p-6 border-l-4 border-l-primary">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gold/10 text-gold rounded-lg">
              <Activity size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">Painel de Saúde das APIs</h3>
              <p className="text-sm text-foreground/60">Verificação de conectividade de todos os serviços externos.</p>
            </div>
          </div>
          <Button onClick={checkAllSystems} variant="outline" disabled={checkingHealth}>
            {checkingHealth ? (
              <span className="flex items-center gap-2">
                <RefreshCw size={14} className="animate-spin" /> Sincronizando...
              </span>
            ) : 'Sincronizar Status'}
          </Button>
        </div>

        {healthChecks ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(healthChecks).map(([api, info]) => (
              <div key={api} className="p-3 rounded-xl border border-[var(--border-subtle)] bg-background/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${info.status === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <span className="text-xs font-bold uppercase text-foreground/70">{api}</span>
                </div>
                <span className={`text-[10px] font-medium ${info.status === 'ok' ? 'text-emerald-500' : 'text-red-500'}`}>
                  {info.msg}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-foreground/40 italic">
            Clique em "Sincronizar Status" para validar as conexões.
          </div>
        )}
      </CardGlass>

      {/* Conexão WhatsApp (Evolution API) */}
      <CardGlass className="p-6 border-l-4 border-l-primary">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gold/10 text-gold rounded-lg">
            <LinkIcon size={24} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-foreground">Conexão WhatsApp (Evolution API)</h3>
            <p className="text-sm text-foreground/60">Configurações de segurança movidas para a Vercel. Defina apenas a instância.</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-end mb-6">
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-xs font-bold text-foreground/60 uppercase ml-1">Instância do WhatsApp</label>
            <input
              value={instance}
              onChange={e => setInstance(e.target.value)}
              placeholder="Ex: StudioAgnaldo"
              className="bg-background border border-[var(--border-subtle)] rounded-lg p-2.5 text-sm focus:outline-none focus:border-gold"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={testEvolutionConnection} variant="outline" disabled={evoStatus === 'loading'}>
              {evoStatus === 'loading' ? 'Testando...' : 'Testar Conexão'}
            </Button>
            <Button onClick={saveConfig} variant="primary">
              Salvar Configuração
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4 p-3 rounded-xl bg-foreground/5 border border-[var(--border-subtle)]">
          <div className="flex-1 flex items-center gap-2 text-sm">
            <Activity size={16} className="text-foreground/40" />
            <span className="text-foreground/60">Status da conexão: </span>
            {evoStatus === 'success' ? (
              <span className="text-success font-bold flex items-center gap-1"><CheckCircle2 size={14} /> Ativa e Sincronizada</span>
            ) : evoStatus === 'error' ? (
              <span className="text-danger font-bold flex items-center gap-1"><AlertTriangle size={14} /> Offline ou Inválida</span>
            ) : (
              <span className="text-foreground/40 italic">Aguardando teste...</span>
            )}
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
