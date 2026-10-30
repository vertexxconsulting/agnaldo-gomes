'use client';

import { useState, useEffect, useRef } from 'react';
import { SectionTitle } from '@/components/SectionTitle';
import { CardGlass } from '@/components/CardGlass';
import { Button } from '@/components/Button';
import { 
  Link as LinkIcon, Activity, AlertTriangle, CheckCircle2, RefreshCw, 
  Globe, QrCode, Smartphone, Send, Power, ShieldCheck, MessageSquare 
} from 'lucide-react';
import { toast } from 'sonner';
import { updateSystemSetting } from '@/lib/supabase-queries';

export default function SistemaApiPage() {
  const [instance, setInstance] = useState('agnaldo');
  const [waState, setWaState] = useState<'open' | 'connecting' | 'close' | 'not_found' | 'loading'>('loading');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [healthChecks, setHealthChecks] = useState<Record<string, { status: 'ok' | 'error' | 'warning' | 'idle', msg: string }> | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [loadingQr, setLoadingQr] = useState(false);
  const [numeroTeste, setNumeroTeste] = useState('');
  const [mensagemTeste, setMensagemTeste] = useState(
    '✨ *Studio Agnaldo Gomes* ✨\n\nOlá! Esta é uma mensagem de confirmação do sistema.\nA sua conexão com o WhatsApp está operando com 100% de sucesso! 🚀\n\n📲 *Status:* Conectado e ativo\n⏰ *Lembretes de agendamento:* Habilitados'
  );
  const [enviandoTeste, setEnviandoTeste] = useState(false);
  const [whatsappContato, setWhatsappContato] = useState('');
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [loadingLojaSettings, setLoadingLojaSettings] = useState(true);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Carregar configurações iniciais e status do WhatsApp
  useEffect(() => {
    carregarConfig();
    verificarStatusWhatsApp('agnaldo');

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const carregarConfig = async () => {
    try {
      const [resConfig, resLoja] = await Promise.all([
        fetch('/api/admin/sistema/config'),
        fetch('/api/admin/loja/settings')
      ]);

      if (resConfig.ok) {
        const data = await resConfig.json();
        const inst = data.instance || 'agnaldo';
        setInstance(inst);
      }

      if (resLoja.ok) {
        const lojaData = await resLoja.json();
        setWhatsappContato(lojaData.whatsapp_contato ?? '');
      }
    } catch (e) {
      console.error('Erro ao carregar config:', e);
    } finally {
      setLoadingLojaSettings(false);
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
        toast.success(`WhatsApp do salão salvo com sucesso: ${formatado}`);
      } else {
        throw new Error('Falha ao salvar nas configurações da loja');
      }
    } catch (e: any) {
      console.error('Erro ao salvar WhatsApp:', e);
      toast.error(`Erro ao salvar WhatsApp: ${e.message}`);
    } finally {
      setSavingWhatsapp(false);
    }
  };

  const verificarStatusWhatsApp = async (instName?: string) => {
    const nomeInstancia = instName || instance || 'agnaldo';
    try {
      const res = await fetch(`/api/whatsapp/status?instanceName=${encodeURIComponent(nomeInstancia)}`);
      if (res.ok) {
        const data = await res.json();
        setWaState(data.state || 'close');
        if (data.qrcodeBase64) {
          setQrCode(data.qrcodeBase64);
        } else if (data.state === 'open') {
          setQrCode(null);
        }

        // Se estiver aguardando leitura do QR Code, ativa polling contínuo para detectar conexão automaticamente
        if (data.state === 'connecting' && !pollingRef.current) {
          pollingRef.current = setInterval(async () => {
            const st = await fetch(`/api/whatsapp/status?instanceName=${encodeURIComponent(nomeInstancia)}`);
            if (st.ok) {
              const d = await st.json();
              if (d.state === 'open') {
                if (pollingRef.current) clearInterval(pollingRef.current);
                pollingRef.current = null;
                setWaState('open');
                setQrCode(null);
                toast.success('🎉 WhatsApp conectado com sucesso!');
              } else if (d.qrcodeBase64) {
                setQrCode(d.qrcodeBase64);
              }
            }
          }, 3500);
        }

        return data.state;
      }
    } catch (e) {
      console.error('Erro ao verificar status do WhatsApp:', e);
      setWaState('close');
    }
    return 'close';
  };

  const iniciarConexaoWhatsApp = async () => {
    setLoadingQr(true);
    setQrCode(null);
    try {
      // 1. Tentar criar/iniciar a instância se necessário
      const resCreate = await fetch('/api/whatsapp/instance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName: instance || 'agnaldo' })
      });

      const dataCreate = await resCreate.json();
      
      let base64Code = dataCreate?.qrcode?.base64;
      if (base64Code) {
        if (!base64Code.startsWith('data:image')) {
          base64Code = `data:image/png;base64,${base64Code}`;
        }
        setQrCode(base64Code);
        setWaState('connecting');
      } else {
        // Buscar via rota de status
        await verificarStatusWhatsApp(instance);
      }

      toast.info('QR Code gerado! Aponte o WhatsApp do seu celular.');

      // Iniciar polling a cada 3 segundos para detectar quando conectar
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = setInterval(async () => {
        const estado = await verificarStatusWhatsApp(instance);
        if (estado === 'open') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setQrCode(null);
          toast.success('🎉 WhatsApp conectado com sucesso!');
        }
      }, 3500);

    } catch (err: any) {
      toast.error(`Erro ao gerar QR Code: ${err.message}`);
    } finally {
      setLoadingQr(false);
    }
  };

  const desconectarWhatsApp = async () => {
    if (!confirm('Deseja realmente desconectar esta sessão do WhatsApp?')) return;
    try {
      const res = await fetch(`/api/whatsapp/instance?instanceName=${encodeURIComponent(instance || 'agnaldo')}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        setWaState('close');
        setQrCode(null);
        toast.success('Instância desconectada com sucesso.');
      } else {
        toast.error('Erro ao desconectar instância.');
      }
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    }
  };

  const enviarMensagemTeste = async () => {
    if (!numeroTeste.trim()) {
      toast.warning('Digite o número com DDD (ex: 42999999999)');
      return;
    }
    setEnviandoTeste(true);
    try {
      const res = await fetch('/api/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero: numeroTeste.trim(),
          texto: mensagemTeste.trim() || undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Mensagem de teste enviada com sucesso!');
      } else {
        toast.error(data.error || 'Erro ao enviar mensagem.');
      }
    } catch (e: any) {
      toast.error(`Falha no envio: ${e.message}`);
    } finally {
      setEnviandoTeste(false);
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

  return (
    <div className="py-4 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col">
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground flex items-center gap-2">
          <Globe className="text-gold" size={32} />
          Sistema API & Conexões
        </h1>
        <p className="text-sm text-foreground/60 mt-1">
          Gerenciamento e monitoramento da Evolution API (WhatsApp), gateways de pagamento e integrações.
        </p>
      </div>

      {/* WHATSAPP DE ATENDIMENTO DO SALÃO */}
      <CardGlass className="p-6 border-l-4 border-l-emerald-500 shadow-md">
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
              <p className="text-xs text-emerald-500 font-medium mt-1.5 flex items-center gap-1">
                <span>✓ Destino configurado:</span> <span className="font-mono font-bold">{whatsappContato}</span>
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
                className="border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10 text-xs"
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

      {/* PAINEL DE CONEXÃO DO WHATSAPP COM QR CODE AO VIVO */}
      <CardGlass className="p-6 border-l-4 border-l-gold shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-[var(--border-subtle)] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Smartphone size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-xl text-foreground">Conexão WhatsApp (Evolution API)</h3>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                  waState === 'open' 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                    : waState === 'connecting'
                    ? 'bg-amber-500/20 text-foreground border border-amber-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {waState === 'open' ? '🟢 Conectado' : waState === 'connecting' ? '🟡 Aguardando QR Code' : '🔴 Desconectado'}
                </span>
              </div>
              <p className="text-xs text-foreground/60 mt-0.5">
                Servidor: <strong className="text-foreground">https://evolution-agnaldo.onrender.com</strong> • Instância: <strong className="text-gold">{instance}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => verificarStatusWhatsApp(instance)}
              className="text-xs"
            >
              <RefreshCw size={13} className="mr-1.5" /> Atualizar Status
            </Button>
            {waState === 'open' && (
              <Button
                variant="outline"
                size="sm"
                onClick={desconectarWhatsApp}
                className="text-xs text-red-400 border-red-500/30 hover:bg-red-500/10"
              >
                <Power size={13} className="mr-1.5" /> Desconectar
              </Button>
            )}
          </div>
        </div>

        {/* CENÁRIO 1: WHATSAPP JÁ CONECTADO */}
        {waState === 'open' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={32} className="text-emerald-400 shrink-0" />
                <div>
                  <h4 className="font-bold text-foreground text-sm">WhatsApp Vinculado e Ativo!</h4>
                  <p className="text-xs text-foreground/70 mt-0.5">
                    O sistema está pronto para enviar lembretes de agenda, aniversários e mensagens automáticas de marketing.
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 px-3 py-1 bg-emerald-500/15 rounded-lg border border-emerald-500/30 whitespace-nowrap">
                Instância: {instance}
              </span>
            </div>

            {/* Teste de Disparo Rápido */}
            <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-foreground/[0.02] space-y-4">
              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Send size={14} className="text-gold" /> Testar Envio de Mensagem
                </h5>
                <p className="text-xs text-foreground/60 mt-0.5">
                  Envie uma mensagem de teste para verificar a tipografia, formatação e acentuação no WhatsApp.
                </p>
              </div>

              <div className="space-y-3 max-w-xl">
                <div>
                  <label className="text-xs font-medium text-foreground/70 mb-1 block">
                    Número de Destino (com DDD):
                  </label>
                  <input
                    type="text"
                    placeholder="DDD + Número (ex: 41999999999)"
                    value={numeroTeste}
                    onChange={e => setNumeroTeste(e.target.value)}
                    className="w-full bg-background border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-gold font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground/70 mb-1 block">
                    Mensagem de Teste (suporta emojis e *negrito*):
                  </label>
                  <textarea
                    rows={4}
                    value={mensagemTeste}
                    onChange={e => setMensagemTeste(e.target.value)}
                    className="w-full bg-background border border-[var(--border-subtle)] rounded-lg p-3 text-sm text-foreground focus:outline-none focus:border-gold leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-foreground/50">
                    Codificação: UTF-8 com suporte nativo a acentos e emojis.
                  </span>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={enviarMensagemTeste}
                    disabled={enviandoTeste}
                  >
                    {enviandoTeste ? 'Enviando...' : 'Enviar Teste'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CENÁRIO 2: DESCONECTADO OU AGUARDANDO LEITURA DO QR CODE */}
        {waState !== 'open' && (
          <div className="flex flex-col md:flex-row items-center gap-8 py-4 animate-in fade-in">
            {/* Box do QR Code */}
            <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-xl border border-gold/30 shrink-0">
              {qrCode ? (
                <div className="space-y-3 text-center">
                  <img
                    src={qrCode}
                    alt="QR Code WhatsApp"
                    className="w-64 h-64 object-contain rounded-lg shadow-sm"
                  />
                  <p className="text-black text-xs font-bold animate-pulse">
                    Aguardando leitura pelo WhatsApp...
                  </p>
                </div>
              ) : (
                <div className="w-64 h-64 flex flex-col items-center justify-center text-center p-4 text-black/50 space-y-2">
                  <QrCode size={56} className="text-gold opacity-60" />
                  <p className="text-xs font-semibold text-black/70">
                    Clique no botão ao lado para gerar o QR Code de conexão.
                  </p>
                </div>
              )}
            </div>

            {/* Instruções passo a passo */}
            <div className="flex-1 space-y-4">
              <div>
                <h4 className="text-lg font-bold text-foreground">Como conectar o WhatsApp do Salão:</h4>
                <p className="text-xs text-foreground/60 mt-1">
                  Siga os 4 passos rápidos abaixo no aparelho celular:
                </p>
              </div>

              <ol className="space-y-2.5 text-xs text-foreground/80 list-decimal list-inside leading-relaxed bg-foreground/[0.02] p-4 rounded-xl border border-[var(--border-subtle)]">
                <li>Abra o aplicativo do <strong>WhatsApp</strong> no celular do salão.</li>
                <li>Toque no menu de <strong>Configurações</strong> (ou três pontinhos no Android).</li>
                <li>Toque em <strong>Aparelhos Conectados</strong> e depois em <strong>Conectar um Aparelho</strong>.</li>
                <li>Aponte a câmera do celular para o <strong>QR Code</strong> exibido ao lado.</li>
              </ol>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Button
                  variant="primary"
                  size="md"
                  onClick={iniciarConexaoWhatsApp}
                  disabled={loadingQr}
                  className="font-bold flex items-center gap-2 shadow-md shadow-gold/10"
                >
                  <QrCode size={18} />
                  {loadingQr ? 'Gerando QR Code...' : qrCode ? 'Atualizar QR Code' : 'Conectar WhatsApp / Gerar QR Code'}
                </Button>

                <Button
                  variant="outline"
                  size="md"
                  onClick={() => verificarStatusWhatsApp(instance)}
                  className="text-xs"
                >
                  <RefreshCw size={14} className="mr-1.5" /> Verificar Conexão
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardGlass>

      {/* PAINEL DE SAÚDE DAS DEMAIS APIS */}
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
                  <div className={`w-2 h-2 rounded-full ${
                    info.status === 'ok' ? 'bg-emerald-500' : 
                    info.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'
                  }`} />
                  <span className="text-xs font-bold uppercase text-foreground/70">{api}</span>
                </div>
                <span className={`text-[10px] font-medium ${
                  info.status === 'ok' ? 'text-emerald-500' : 
                  info.status === 'warning' ? 'text-amber-500' : 'text-red-500'
                }`}>
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
    </div>
  );
}
