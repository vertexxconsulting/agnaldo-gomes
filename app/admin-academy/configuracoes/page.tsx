'use client';

import { useState, useEffect } from 'react';
import { Save, Settings, Shield, Bell, CreditCard, LayoutTemplate, RefreshCw, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/Button';
import Image from 'next/image';

export default function AdminAcademyConfiguracoes() {
  const [activeTab, setActiveTab] = useState('geral');
  const [envStatus, setEnvStatus] = useState({ mercadoPago: false, stripe: false, evolutionApi: false });
  
  // WhatsApp States
  const [instanceName, setInstanceName] = useState('agnaldo-academy-bot');
  const [instanceState, setInstanceState] = useState('unknown'); // 'connecting', 'open', 'close', 'not_found', 'unknown'
  const [qrCode, setQrCode] = useState('');
  const [loadingInstance, setLoadingInstance] = useState(false);

  useEffect(() => {
    fetch('/api/env-status')
      .then(res => res.json())
      .then(data => setEnvStatus(data))
      .catch(console.error);
  }, []);

  const logErroStatusWhatsApp = (err: unknown) => {
    console.error('Erro ao buscar status do WhatsApp:', err);
  };

  useEffect(() => {
    if (activeTab !== 'notificacoes') return;
    if (!envStatus.evolutionApi) return;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/whatsapp/status?instanceName=${instanceName}`);
        if (res.ok) {
          const data = await res.json();
          setInstanceState(data.state || 'unknown');
          if (data.qrcodeBase64) {
            setQrCode(data.qrcodeBase64);
          } else if (data.state === 'open') {
            setQrCode('');
          }
        } else {
          setInstanceState('not_found');
        }
      } catch (e) {
        logErroStatusWhatsApp(e);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [activeTab, instanceName, envStatus.evolutionApi]);

  const handleCreateInstance = async () => {
    setLoadingInstance(true);
    try {
      await fetch('/api/whatsapp/instance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName })
      });
    } catch(e) {
      console.error(e);
    } finally {
      setLoadingInstance(false);
    }
  };

  const handleDeleteInstance = async () => {
    setLoadingInstance(true);
    try {
      await fetch(`/api/whatsapp/instance?instanceName=${instanceName}`, {
        method: 'DELETE'
      });
      setInstanceState('not_found');
      setQrCode('');
    } catch(e) {
      console.error(e);
    } finally {
      setLoadingInstance(false);
    }
  };

  const tabs = [
    { id: 'geral', label: 'Configurações Gerais', icon: Settings },
    { id: 'layout', label: 'Aparência e Layout', icon: LayoutTemplate },
    { id: 'pagamentos', label: 'Meios de Pagamento', icon: CreditCard },
    { id: 'notificacoes', label: 'Automações (Evolution API)', icon: Bell },
    { id: 'seguranca', label: 'Segurança e Acessos', icon: Shield },
  ];

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-[var(--background)]">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações da Academy</h1>
          <p className="text-sm text-foreground/60">Ajuste os parâmetros da sua plataforma de ensino.</p>
        </div>
        <Button className="flex items-center gap-2">
          <Save size={16} />
          Salvar Alterações
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar de Configurações */}
        <div className="w-full md:w-64 shrink-0 space-y-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left ${
                  activeTab === tab.id 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-foreground/70 hover:bg-foreground/5 hover:text-foreground'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Conteúdo Ativo */}
        <div className="flex-1">
          {activeTab === 'geral' && (
            <div className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-xl p-6">
              <h2 className="text-lg font-bold text-foreground mb-6">Informações da Plataforma</h2>
              
              <div className="space-y-5 max-w-2xl">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Nome da Plataforma</label>
                  <input type="text" defaultValue="Agnaldo Gomes Academy" className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">E-mail de Suporte</label>
                  <input type="email" defaultValue="suporte@agnaldogomes.com" className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary" />
                  <p className="text-xs text-foreground/50 mt-1">Os alunos usarão este e-mail para tirar dúvidas de acesso.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Link do Grupo de Suporte (WhatsApp/Telegram)</label>
                  <input type="url" placeholder="https://chat.whatsapp.com/..." className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'layout' && (
            <div className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-xl p-6">
              <h2 className="text-lg font-bold text-foreground mb-6">Identidade Visual da Área de Membros</h2>
              <p className="text-sm text-foreground/60 mb-4">A plataforma atualmente usa o estilo "Netflix".</p>
              
              <div className="space-y-4">
                <div className="p-4 border border-[var(--border-subtle)] rounded-lg bg-[var(--background)]">
                  <h3 className="font-medium text-sm text-foreground mb-2">Tema Padrão</h3>
                  <select className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary">
                    <option>Modo Escuro (Netflix)</option>
                    <option>Modo Claro (Clean)</option>
                    <option>Deixar o aluno escolher</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notificacoes' && (
            <div className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-foreground">Disparos Automáticos</h2>
                <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">Evolution API</span>
              </div>
              <p className="text-sm text-foreground/60 mb-6">Configure o envio de WhatsApp exclusivo para alunos da Academy (boas-vindas, suporte, certificados).</p>
              
              {!envStatus.evolutionApi ? (
                <div className="mt-4 p-4 bg-red-500/5 border border-red-500/20 rounded-lg max-w-2xl">
                  <div className="flex items-start gap-3">
                    <Shield className="text-red-500 mt-0.5" size={18} />
                    <div>
                      <h4 className="text-sm font-bold text-red-500">Evolution API Não Configurada</h4>
                      <p className="text-xs text-foreground/70 mt-1 leading-relaxed">
                        As chaves EVOLUTION_API_URL ou EVOLUTION_API_KEY não foram encontradas no arquivo .env. Contate o desenvolvedor para configurar.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 max-w-2xl">
                  {/* Fluxo de Conexão WhatsApp */}
                  <div className="p-5 border border-primary/30 bg-primary/5 rounded-xl">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-primary mb-1 text-sm">Instância WhatsApp da Academy</h3>
                        <p className="text-xs text-foreground/70">Gerencie a conexão do número que fará o atendimento exclusivo dos cursos.</p>
                      </div>
                      
                      {instanceState === 'open' ? (
                        <span className="px-2 py-1 bg-green-500/20 text-green-500 text-[10px] font-bold uppercase rounded-md flex items-center gap-1">
                          Conectado
                        </span>
                      ) : instanceState === 'connecting' ? (
                        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-500 text-[10px] font-bold uppercase rounded-md flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></span>
                          Aguardando
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-red-500/20 text-red-500 text-[10px] font-bold uppercase rounded-md flex items-center gap-1">
                          Desconectado
                        </span>
                      )}
                    </div>

                    <div className="bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-4">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-foreground/80 mb-1">Nome da Instância</label>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              value={instanceName}
                              onChange={(e) => setInstanceName(e.target.value)}
                              disabled={instanceState === 'open' || instanceState === 'connecting'}
                              className="flex-1 bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-md px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary font-mono disabled:opacity-50" 
                            />
                            {instanceState === 'open' || instanceState === 'connecting' ? (
                              <Button size="sm" variant="outline" className="text-red-500 border-red-500 hover:bg-red-500/10" onClick={handleDeleteInstance} disabled={loadingInstance}>
                                {loadingInstance ? <RefreshCw className="animate-spin" size={16} /> : <Trash2 size={16} />}
                                <span className="ml-2">Desconectar</span>
                              </Button>
                            ) : (
                              <Button size="sm" variant="primary" className="whitespace-nowrap" onClick={handleCreateInstance} disabled={loadingInstance}>
                                {loadingInstance ? <RefreshCw className="animate-spin" size={16} /> : 'Criar Instância'}
                              </Button>
                            )}
                          </div>
                          <p className="text-[10px] text-foreground/50 mt-1">Isso criará uma sessão separada do número principal do salão.</p>
                        </div>

                        {instanceState === 'connecting' && (
                          <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-col items-center justify-center">
                            <div className="w-48 h-48 bg-white rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center mb-3 overflow-hidden relative">
                              {qrCode ? (
                                <Image src={qrCode} alt="QR Code" fill className="object-contain p-2" />
                              ) : (
                                <div className="text-center p-4">
                                  <RefreshCw size={24} className="mx-auto text-gray-300 mb-2 animate-spin" />
                                  <p className="text-[10px] text-gray-400 font-medium">Carregando QR Code...</p>
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-center text-foreground/60 max-w-xs mb-3">
                              Abra o WhatsApp no celular que atenderá a Academy, vá em "Aparelhos conectados" e leia este código.
                            </p>
                          </div>
                        )}

                        {instanceState === 'open' && (
                          <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-col items-center justify-center py-6">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-3">
                              <CheckCircle2 size={32} className="text-green-500" />
                            </div>
                            <h4 className="font-bold text-foreground">WhatsApp Conectado!</h4>
                            <p className="text-xs text-foreground/60 mt-1 text-center max-w-sm">
                              Sua Academy agora pode enviar notificações automáticas para os alunos utilizando este número.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 border-t border-[var(--border-subtle)] pt-6">
                    <h3 className="font-bold text-foreground text-sm">Mensagens Padrão da Academy</h3>
                    
                    <div className="space-y-2">
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-sm text-foreground">Boas-vindas (Novo Aluno)</span>
                        <input type="checkbox" defaultChecked className="accent-primary" />
                      </label>
                      <textarea 
                        rows={3} 
                        className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-mono text-xs"
                        defaultValue={`Olá {nome_aluno}! Seja bem-vindo à Agnaldo Gomes Academy. Seu acesso já está liberado em: {link_acesso}`}
                      />
                    </div>
                    
                    <div className="space-y-2 pt-4">
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-sm text-foreground">Aviso de Nova Aula</span>
                        <input type="checkbox" defaultChecked className="accent-primary" />
                      </label>
                      <textarea 
                        rows={3} 
                        className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-mono text-xs"
                        defaultValue={`Ei {nome_aluno}, acabamos de liberar o módulo "{nome_modulo}" no seu curso! Corre lá na plataforma pra conferir.`}
                      />
                    </div>

                    <div className="space-y-2 pt-4">
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-sm text-foreground">Conclusão de Curso</span>
                        <input type="checkbox" defaultChecked className="accent-primary" />
                      </label>
                      <textarea 
                        rows={3} 
                        className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-mono text-xs"
                        defaultValue={`Parabéns {nome_aluno}! Você concluiu o curso {nome_curso}. Seu certificado já está disponível na plataforma.`}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'pagamentos' && (
            <div className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-xl p-6">
              <h2 className="text-lg font-bold text-foreground mb-6">Meios de Pagamento</h2>
              <p className="text-sm text-foreground/60 mb-6">Configure o gateway de pagamento para receber as vendas dos cursos da Academy.</p>
              
              <div className="space-y-6 max-w-2xl">
                <div className={`border border-[var(--border-subtle)] rounded-lg p-5 bg-[var(--background)] ${!envStatus.mercadoPago ? 'opacity-90' : ''}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#009EE3] rounded flex items-center justify-center">
                        <CreditCard className="text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground text-sm">Mercado Pago</h3>
                        <p className="text-xs text-foreground/60">Checkout Transparente e Pix</p>
                      </div>
                    </div>
                    {envStatus.mercadoPago ? (
                      <span className="bg-green-500/10 text-green-500 px-2 py-1 text-xs font-bold rounded">CONECTADO</span>
                    ) : (
                      <span className="bg-red-500/10 text-red-500 px-2 py-1 text-xs font-bold rounded">DESCONECTADO</span>
                    )}
                  </div>
                  
                  {!envStatus.mercadoPago && (
                    <div className="mt-4 p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Shield className="text-red-500 mt-0.5" size={18} />
                        <div>
                          <h4 className="text-sm font-bold text-red-500">Atenção: Gateway Não Configurado</h4>
                          <p className="text-xs text-foreground/70 mt-1 leading-relaxed">
                            O meio de pagamento encontra-se desconectado ou as credenciais falharam. Por favor, <strong>entre em contato com o desenvolvedor</strong> para configurar as chaves de API no ambiente seguro ou informar este problema.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className={`border border-[var(--border-subtle)] rounded-lg p-5 bg-[var(--background)] ${!envStatus.stripe ? 'opacity-50 grayscale' : ''}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#635BFF] rounded flex items-center justify-center">
                        <CreditCard className="text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground text-sm">Stripe</h3>
                        <p className="text-xs text-foreground/60">Cartão Internacional</p>
                      </div>
                    </div>
                    {envStatus.stripe ? (
                      <span className="bg-green-500/10 text-green-500 px-2 py-1 text-xs font-bold rounded">CONECTADO</span>
                    ) : (
                      <Button size="sm" variant="outline" disabled>Em Breve</Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'seguranca' && (
            <div className="bg-[var(--color-card)] border border-[var(--border-subtle)] rounded-xl p-6">
              <h2 className="text-lg font-bold text-foreground mb-6">Segurança e Acessos</h2>
              <p className="text-sm text-foreground/60 mb-6">Proteja seu conteúdo contra pirataria e acessos indevidos.</p>
              
              <div className="space-y-5 max-w-2xl">
                <div className="flex items-start justify-between p-4 border border-[var(--border-subtle)] bg-[var(--background)] rounded-lg">
                  <div>
                    <h3 className="font-bold text-foreground text-sm">Bloquear Acessos Simultâneos</h3>
                    <p className="text-xs text-foreground/60 mt-1">Impede que a mesma conta seja acessada por múltiplos dispositivos ao mesmo tempo, combatendo o rateio de contas.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-4">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-[var(--border-subtle)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                <div className="flex items-start justify-between p-4 border border-[var(--border-subtle)] bg-[var(--background)] rounded-lg">
                  <div>
                    <h3 className="font-bold text-foreground text-sm">Autenticação em Dois Fatores (2FA) para Admins</h3>
                    <p className="text-xs text-foreground/60 mt-1">Exigir código enviado por e-mail ou Autenticador para acessar este painel administrativo.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-4">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-[var(--border-subtle)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                <div className="flex items-start justify-between p-4 border border-[var(--border-subtle)] bg-[var(--background)] rounded-lg">
                  <div>
                    <h3 className="font-bold text-foreground text-sm">Marca D'água nos Vídeos</h3>
                    <p className="text-xs text-foreground/60 mt-1">Exibe o e-mail ou CPF do aluno flutuando no vídeo para inibir gravação de tela.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-4">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-[var(--border-subtle)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
