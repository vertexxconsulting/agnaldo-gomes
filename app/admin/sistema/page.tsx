'use client';

import { useState } from 'react';
import { SectionTitle } from '@/components/SectionTitle';
import { CardGlass } from '@/components/CardGlass';
import { Button } from '@/components/Button';
import { Database, Download, Upload, AlertTriangle, FileJson, CheckCircle2, MessageSquare, Key, Link as LinkIcon, Power } from 'lucide-react';
import { MOCK_SERVICOS, MOCK_PROFISSIONAIS, MOCK_PROF_SERVICO, MOCK_CLIENTES, MOCK_AGENDAMENTOS, MOCK_BLOQUEIOS } from '@/lib/mock-data';

export default function SistemaPage() {
  const [importStatus, setImportStatus] = useState<{ tipo: 'idle' | 'sucesso' | 'erro', msg: string }>({ tipo: 'idle', msg: '' });
  
  // Estado para Evolution API
  const [evoState, setEvoState] = useState<'not_created' | 'offline' | 'qr_generated' | 'online'>('not_created');
  const [instanceName, setInstanceName] = useState('');

  // Exportar backup
  const handleExport = () => {
    const backupData = {
      servicos: MOCK_SERVICOS,
      profissionais: MOCK_PROFISSIONAIS,
      profissionais_servicos: MOCK_PROF_SERVICO,
      clientes: MOCK_CLIENTES,
      agendamentos: MOCK_AGENDAMENTOS,
      bloqueios: MOCK_BLOQUEIOS,
      exportado_em: new Date().toISOString()
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `agnaldo_gomes_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  // Importar arquivo
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        // Simulação de validação da estrutura
        if (json.clientes && json.agendamentos) {
          setImportStatus({
            tipo: 'sucesso',
            msg: `Base importada com sucesso (Simulação Fase 1)! ${json.clientes.length} clientes encontrados. Na versão final com banco de dados real, as tabelas serão atualizadas.`
          });
          // Nota: Como estamos usando mock data hardcoded, não persistimos os dados no arquivo mock-data.ts pelo browser.
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

  // Funções Evolution
  const handleCreateInstance = (e: React.FormEvent) => {
    e.preventDefault();
    if (instanceName.trim().length < 3) return;
    setEvoState('offline');
  };

  const handleGenerateQR = () => {
    setEvoState('qr_generated');
  };

  const handleScanQR = () => {
    // Simulação do escaneamento
    setEvoState('online');
  };

  const handleVerifyStatus = () => {
    alert(`Instância [${instanceName}] está ONLINE e conectada à Evolution API via .env!`);
  };

  const handleDeleteInstance = () => {
    if (window.confirm('Tem certeza que deseja excluir esta instância? Esta ação desconectará o WhatsApp e você precisará ler o QR Code novamente.')) {
      setEvoState('not_created');
      setInstanceName('');
    }
  };

  return (
    <div className="flex flex-col w-full py-4">
      <SectionTitle title="Sistema e Backup" subtitle="Gerenciamento de dados e configurações" align="left" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        
        {/* Backup */}
        <CardGlass className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-primary/10 text-primary rounded-lg">
                <Download size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">Backup dos Dados</h3>
                <p className="text-sm text-foreground/60">Baixe uma cópia completa de todos os registros</p>
              </div>
            </div>
            
            <p className="text-sm text-foreground/70 mb-6">
              O backup inclui todos os seus clientes, agenda, serviços, configuração de profissionais e histórico de faturamento no formato JSON.
            </p>
          </div>

          <Button onClick={handleExport} className="w-full flex items-center justify-center gap-2">
            <Database size={18} />
            Baixar Backup (JSON)
          </Button>
        </CardGlass>

        {/* Importação */}
        <CardGlass className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-lg">
                <Upload size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">Importar Base</h3>
                <p className="text-sm text-foreground/60">Carregue dados de outro sistema ou de um backup</p>
              </div>
            </div>

            <p className="text-sm text-foreground/70 mb-6">
              Atenção: A importação irá adicionar novos clientes e agendamentos. Recomendamos fazer um backup antes de prosseguir.
            </p>
          </div>

          <div>
            {importStatus.tipo !== 'idle' && (
              <div className={`p-3 rounded-md mb-4 text-sm flex items-start gap-2 ${
                importStatus.tipo === 'sucesso' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500'
              }`}>
                {importStatus.tipo === 'sucesso' ? <CheckCircle2 size={16} className="mt-0.5" /> : <AlertTriangle size={16} className="mt-0.5" />}
                <p>{importStatus.msg}</p>
              </div>
            )}
            
            <label className="flex items-center justify-center w-full p-4 border-2 border-dashed border-[var(--border-subtle)] rounded-lg hover:border-primary hover:bg-foreground/5 cursor-pointer transition-colors">
              <input type="file" accept=".json" className="hidden" onChange={handleImport} />
              <div className="flex flex-col items-center text-foreground/60">
                <FileJson size={24} className="mb-2" />
                <span className="text-sm font-medium">Clique para selecionar um arquivo .json</span>
              </div>
            </label>
          </div>
        </CardGlass>
      </div>

      {/* Integração WhatsApp (Evolution API) */}
      <div className="mt-6">
        <CardGlass className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-[var(--border-subtle)] pb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500/10 text-green-500 rounded-lg">
                <MessageSquare size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">Integração WhatsApp</h3>
                <p className="text-sm text-foreground/60">Conecte via Evolution API (Configurações seguras no servidor .env)</p>
              </div>
            </div>
            
            {/* Status Badge */}
            {evoState !== 'not_created' && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground/50">Status:</span>
                {evoState === 'offline' && <span className="px-3 py-1 bg-foreground/10 text-foreground rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-foreground/40"></span> Offline</span>}
                {evoState === 'qr_generated' && <span className="px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> Aguardando Leitura</span>}
                {evoState === 'online' && <span className="px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Online</span>}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            {evoState === 'not_created' && (
              <form onSubmit={handleCreateInstance} className="max-w-md">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-foreground/80 mb-2">Nome da Instância</label>
                  <input 
                    type="text" 
                    value={instanceName}
                    onChange={e => setInstanceName(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-foreground text-sm focus:outline-none focus:border-primary" 
                    placeholder="Ex: atendimento_salao"
                    required 
                    minLength={3}
                  />
                  <p className="text-xs text-foreground/40 mt-1">As credenciais da Evolution (API_URL e API_KEY) estão sendo lidas do ambiente do servidor de forma segura.</p>
                </div>
                <Button type="submit" variant="primary">Criar Instância</Button>
              </form>
            )}

            {evoState === 'offline' && (
              <div className="flex flex-col items-start gap-4">
                <p className="text-sm text-foreground/70">Instância <strong className="text-foreground">{instanceName}</strong> criada. Gere o QR Code para conectar o seu WhatsApp.</p>
                <div className="flex items-center gap-3">
                  <Button onClick={handleGenerateQR} variant="primary">Gerar QR Code</Button>
                  <button onClick={handleDeleteInstance} className="text-sm text-red-500 hover:text-red-400 px-3 py-2 font-medium">Excluir Instância</button>
                </div>
              </div>
            )}

            {evoState === 'qr_generated' && (
              <div className="flex flex-col items-start gap-6">
                <p className="text-sm text-foreground/70">Escaneie o QR Code abaixo com o seu WhatsApp para conectar a instância <strong className="text-foreground">{instanceName}</strong>.</p>
                
                {/* Mock do QR Code */}
                <div className="p-4 bg-white rounded-lg inline-block border border-gray-200">
                  <div className="w-48 h-48 bg-gray-200 flex flex-col items-center justify-center gap-2">
                    <span className="text-gray-500 text-xs uppercase tracking-wider font-bold">QR Code Simulado</span>
                    <button onClick={handleScanQR} className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors">Simular Leitura</button>
                  </div>
                </div>

                <button onClick={handleDeleteInstance} className="text-sm text-red-500 hover:text-red-400 font-medium">Cancelar e Excluir Instância</button>
              </div>
            )}

            {evoState === 'online' && (
              <div className="flex flex-col items-start gap-4">
                <p className="text-sm text-foreground/70">A instância <strong className="text-foreground">{instanceName}</strong> está conectada e pronta para enviar mensagens (lembretes e confirmações de agendamento).</p>
                <div className="flex items-center gap-3">
                  <Button onClick={handleVerifyStatus} variant="outline" className="text-foreground">Verificar Status da Conexão</Button>
                  <button onClick={handleDeleteInstance} className="text-sm text-red-500 hover:text-red-400 px-3 py-2 font-medium">Desconectar e Excluir</button>
                </div>
              </div>
            )}
          </div>
        </CardGlass>
      </div>

      {/* Regras de Notificação (WhatsApp) */}
      <div className="mt-6">
        <CardGlass className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-[var(--border-subtle)] pb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg">
                <MessageSquare size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">Regras de Notificação (WhatsApp)</h3>
                <p className="text-sm text-foreground/60">Configure o texto e os horários de disparo dos lembretes automáticos e manuais</p>
              </div>
            </div>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); alert("Regras de notificação salvas com sucesso!"); }} className="flex flex-col gap-5 max-w-2xl">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-2">Antecedência do Lembrete</label>
              <select className="w-full sm:w-1/2 bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-2.5 text-foreground text-sm focus:outline-none focus:border-primary">
                <option value="2h">2 horas antes</option>
                <option value="4h">4 horas antes</option>
                <option value="12h">12 horas antes</option>
                <option value="24h">1 dia (24h) antes</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-2">Mensagem Padrão (Template)</label>
              <p className="text-xs text-foreground/50 mb-2">Variáveis disponíveis: <code className="bg-foreground/10 px-1 py-0.5 rounded text-foreground/70">{'{nome}'}</code>, <code className="bg-foreground/10 px-1 py-0.5 rounded text-foreground/70">{'{servico}'}</code>, <code className="bg-foreground/10 px-1 py-0.5 rounded text-foreground/70">{'{hora}'}</code>, <code className="bg-foreground/10 px-1 py-0.5 rounded text-foreground/70">{'{data}'}</code></p>
              <textarea 
                rows={4} 
                defaultValue="Olá {nome}, seu horário para {servico} está marcado para {data} às {hora}. Responda SIM para confirmar ou NÃO para cancelar."
                className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-3 text-foreground text-sm focus:outline-none focus:border-primary resize-none custom-scrollbar" 
              />
            </div>

            <div className="flex items-center gap-3 bg-[var(--background)] p-4 rounded-lg border border-[var(--border-subtle)]">
              <input type="checkbox" id="auto-send" className="w-5 h-5 accent-primary cursor-pointer" defaultChecked />
              <div>
                <label htmlFor="auto-send" className="font-medium text-sm text-foreground cursor-pointer block">Disparo automático para status 'confirmado'</label>
                <p className="text-xs text-foreground/60">Se o agendamento já estiver confirmado, o sistema enviará um lembrete sozinho na antecedência escolhida.</p>
              </div>
            </div>

            <div className="flex justify-end mt-2">
              <Button type="submit" variant="primary">Salvar Regras</Button>
            </div>
          </form>
        </CardGlass>
      </div>

    </div>
  );
}
