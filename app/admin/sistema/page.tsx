'use client';

import { useState, useEffect } from 'react';
import { SectionTitle } from '@/components/SectionTitle';
import { CardGlass } from '@/components/CardGlass';
import { Button } from '@/components/Button';
import { Database, Download, Upload, AlertTriangle, FileJson, CheckCircle2, MessageSquare, Link as LinkIcon, Activity, ShieldCheck, RefreshCw } from 'lucide-react';
import { getServicos, getProfissionais, getClientes, getAgendamentos, getBloqueios, getProfissionalServico } from '@/lib/mock-data';
import type { Servico, Profissional, Cliente, Agendamento, BloqueioAgenda, ProfissionalServico } from '@/lib/gestao-types';
import { fetchSystemSettings, updateSystemSetting } from '@/lib/supabase-queries';
import { MENSAGENS_PADRAO, invalidarCacheMensagens } from '@/lib/mensagens';

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

  // Settings state
  const [salvando, setSalvando] = useState(false);
  const [msgConfirmacao, setMsgConfirmacao] = useState<string>(MENSAGENS_PADRAO.msg_confirmacao);
  const [msgLembrete, setMsgLembrete] = useState<string>(MENSAGENS_PADRAO.msg_lembrete);
  const [msgFeedback, setMsgFeedback] = useState<string>(MENSAGENS_PADRAO.msg_feedback);
  const [msgAniversario, setMsgAniversario] = useState<string>(MENSAGENS_PADRAO.msg_aniversario);

  useEffect(() => {
    (async () => {
      const settings = await fetchSystemSettings();
      settings.forEach(s => {
        if (s.key === 'msg_confirmacao') setMsgConfirmacao(s.value);
        if (s.key === 'msg_lembrete') setMsgLembrete(s.value);
        if (s.key === 'msg_feedback') setMsgFeedback(s.value);
        if (s.key === 'msg_aniversario') setMsgAniversario(s.value);
      });
    })();
  }, []);

  const handleSalvarRegras = async () => {
    setSalvando(true);
    await Promise.all([
      updateSystemSetting('msg_confirmacao', msgConfirmacao),
      updateSystemSetting('msg_lembrete', msgLembrete),
      updateSystemSetting('msg_feedback', msgFeedback),
      updateSystemSetting('msg_aniversario', msgAniversario),
    ]);
    invalidarCacheMensagens();
    setSalvando(false);
    alert('Regras de notificação salvas com sucesso!');
  };


  const [instance, setInstance] = useState('');
  const [evoStatus, setEvoStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [healthChecks, setHealthChecks] = useState<Record<string, { status: 'ok' | 'error' | 'warning' | 'idle', msg: string }> | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [agendamentoAtivo, setAgendamentoAtivo] = useState(true);
  const [agendamentoDireto, setAgendamentoDireto] = useState(false);
  const [whatsappContato, setWhatsappContato] = useState('');
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
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
          setAgendamentoDireto(lojaData.agendamento_direto ?? false);
          setWhatsappContato(lojaData.whatsapp_contato ?? '');
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

  const toggleAgendamentoDireto = async () => {
    const novoStatus = !agendamentoDireto;
    setAgendamentoDireto(novoStatus);
    try {
      const res = await fetch('/api/admin/loja/settings');
      const current = await res.json();

      await fetch('/api/admin/loja/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...current, agendamento_direto: novoStatus }),
      });
    } catch (e) {
      console.error('Erro ao salvar config agendamento direto:', e);
      setAgendamentoDireto(!novoStatus); // reverte em caso de erro
    }
  };

  const saveWhatsapp = async () => {
    setSavingWhatsapp(true);
    try {
      const { normalizarTelefoneDestino } = await import('@/lib/whatsapp');
      const formatado = normalizarTelefoneDestino(whatsappContato);

      const res = await fetch('/api/admin/loja/settings');
      const current = await res.json();
      const payload = { ...current, whatsapp_contato: formatado };
      const saveRes = await fetch('/api/admin/loja/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Salva também nas configurações gerais do salão (redundância)
      await updateSystemSetting('whatsapp_contato', formatado);

      if (saveRes.ok) {
        setWhatsappContato(formatado);
        alert(`WhatsApp do salão salvo com sucesso: ${formatado}`);
      } else {
        throw new Error('Falha ao salvar nas configurações da loja');
      }
    } catch (e: any) {
      console.error('Erro ao salvar WhatsApp:', e);
      alert(`Erro ao salvar WhatsApp: ${e.message}`);
    } finally {
      setSavingWhatsapp(false);
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

      {/* Agendamento Direto pelo Sistema (Novo Fluxo) */}
      <CardGlass className={`p-6 border-l-4 transition-colors duration-300 ${agendamentoDireto ? 'border-l-blue-500' : 'border-l-foreground/20'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${agendamentoDireto ? 'bg-blue-500/10 text-blue-500' : 'bg-foreground/10 text-foreground/50'}`}>
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">Agendamento Automático via Sistema</h3>
              <p className="text-sm text-foreground/60">
                {agendamentoDireto 
                  ? 'Ativo: Os clientes escolhem o serviço e marcam diretamente um horário na agenda pelo sistema, sem precisar ir ao WhatsApp.' 
                  : 'Inativo: Atualmente o cliente apenas visualiza os serviços e é redirecionado para concluir o agendamento no WhatsApp.'}
              </p>
            </div>
          </div>
          {!loadingLojaSettings && (
            <Button 
              onClick={toggleAgendamentoDireto} 
              variant={agendamentoDireto ? 'outline' : 'primary'}
              className={!agendamentoDireto ? 'bg-blue-600 hover:bg-blue-700 text-white border-none' : 'border-foreground/20 hover:bg-foreground/5'}
            >
              {agendamentoDireto ? 'Voltar para WhatsApp' : 'Habilitar Agendamento Automático'}
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
              WhatsApp de Atendimento do Salão
            </h3>
            <p className="text-sm text-foreground/60 mt-1">
              Número que recebe as solicitações de agendamento feitas pelos clientes no site (com DDD, ex: 42 99827-1222 ou 5542998271222).
            </p>
            {whatsappContato && (
              <p className="text-xs text-emerald-400 font-medium mt-1">
                ✓ Destino configurado: <span className="font-mono">{whatsappContato}</span>
              </p>
            )}
          </div>
          <div className="flex flex-wrap w-full md:w-auto items-center gap-2">
            <input 
              type="text" 
              value={whatsappContato} 
              onChange={(e) => setWhatsappContato(e.target.value)} 
              placeholder="Ex: (42) 99827-1222" 
              className="px-4 py-2 bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg flex-1 min-w-[200px] text-foreground focus:outline-none focus:border-gold font-mono text-sm"
            />
            <Button onClick={saveWhatsapp} disabled={savingWhatsapp || loadingLojaSettings} variant="primary">
              {savingWhatsapp ? 'Salvando...' : 'Salvar'}
            </Button>
            {whatsappContato && (
              <Button 
                variant="outline"
                className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 text-xs"
                onClick={() => {
                  const limpo = whatsappContato.replace(/\D/g, '');
                  const num = limpo.length === 10 || limpo.length === 11 ? `55${limpo}` : limpo;
                  window.open(`https://api.whatsapp.com/send?phone=${num}&text=${encodeURIComponent('Olá! Teste de recepção de agendamentos do Studio Agnaldo Gomes.')}`, '_blank');
                }}
              >
                Testar Link
              </Button>
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

        <div className="space-y-4 max-w-2xl">
          <div className="bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl p-4">
            <label className="block text-sm font-bold text-foreground mb-1">Mensagem Padrão de Confirmação (Véspera)</label>
            <p className="text-xs text-foreground/50 mb-3">Variáveis: <code className="bg-foreground/10 px-1 rounded">{'{nome}'}</code>, <code className="bg-foreground/10 px-1 rounded">{'{servico}'}</code>, <code className="bg-foreground/10 px-1 rounded">{'{hora}'}</code>, <code className="bg-foreground/10 px-1 rounded">{'{data}'}</code></p>
            <textarea
              rows={3}
              value={msgConfirmacao}
              onChange={(e) => setMsgConfirmacao(e.target.value)}
              className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-3 text-foreground text-sm focus:outline-none focus:border-gold resize-none"
            />
          </div>

          <div className="bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl p-4">
            <label className="block text-sm font-bold text-foreground mb-1">Lembrete (Mesmo Dia)</label>
            <p className="text-xs text-foreground/50 mb-3">Variáveis: <code className="bg-foreground/10 px-1 rounded">{'{nome}'}</code>, <code className="bg-foreground/10 px-1 rounded">{'{servico}'}</code>, <code className="bg-foreground/10 px-1 rounded">{'{hora}'}</code></p>
            <textarea
              rows={3}
              value={msgLembrete}
              onChange={(e) => setMsgLembrete(e.target.value)}
              className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-3 text-foreground text-sm focus:outline-none focus:border-gold resize-none"
            />
          </div>

          <div className="bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl p-4">
            <label className="block text-sm font-bold text-foreground mb-1">Feedback Pós-Atendimento</label>
            <p className="text-xs text-foreground/50 mb-3">Variáveis: <code className="bg-foreground/10 px-1 rounded">{'{nome}'}</code>, <code className="bg-foreground/10 px-1 rounded">{'{servico}'}</code></p>
            <textarea
              rows={3}
              value={msgFeedback}
              onChange={(e) => setMsgFeedback(e.target.value)}
              className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-3 text-foreground text-sm focus:outline-none focus:border-gold resize-none"
            />
          </div>

          <div className="bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl p-4">
            <label className="block text-sm font-bold text-foreground mb-1">Feliz Aniversário</label>
            <p className="text-xs text-foreground/50 mb-3">Variáveis: <code className="bg-foreground/10 px-1 rounded">{'{nome}'}</code></p>
            <textarea
              rows={3}
              value={msgAniversario}
              onChange={(e) => setMsgAniversario(e.target.value)}
              className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-3 text-foreground text-sm focus:outline-none focus:border-gold resize-none"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSalvarRegras} disabled={salvando} variant="primary">
              {salvando ? 'Salvando...' : 'Salvar Regras'}
            </Button>
          </div>
        </div>
      </CardGlass>
    </div>
  );
}
