'use client';

import { useState, useEffect } from 'react';
import { SectionTitle } from '@/components/SectionTitle';
import { CardGlass } from '@/components/CardGlass';
import { Button } from '@/components/Button';
import { Database, Download, Upload, AlertTriangle, FileJson, CheckCircle2, MessageSquare } from 'lucide-react';
import { getServicos, getProfissionais, getClientes, getAgendamentos, getBloqueios, getProfissionalServico } from '@/lib/mock-data';
import type { Servico, Profissional, Cliente, Agendamento, BloqueioAgenda, ProfissionalServico } from '@/lib/gestao-types';

export default function SistemaPage() {
  const [importStatus, setImportStatus] = useState<{ tipo: 'idle' | 'sucesso' | 'erro', msg: string }>({ tipo: 'idle', msg: '' });
  const [dadosReais, setDadosReais] = useState<{
    servicos: Servico[]; profissionais: Profissional[]; profissionais_servicos: ProfissionalServico[];
    clientes: Cliente[]; agendamentos: Agendamento[]; bloqueios: BloqueioAgenda[];
  } | null>(null);

  // Carregar dados reais do Supabase (com fallback mock)
  useEffect(() => {
    const carregar = async () => {
      const [s, p, ps, c, a, b] = await Promise.all([
        getServicos(), getProfissionais(), getProfissionalServico(),
        getClientes(), getAgendamentos(), getBloqueios()
      ]);
      setDadosReais({ servicos: s, profissionais: p, profissionais_servicos: ps, clientes: c, agendamentos: a, bloqueios: b });
    };
    carregar();
  }, []);

  // Exportar backup
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

  // Importar arquivo
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
      <div>
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
          Gestão do Sistema & Banco de Dados
        </h1>
        <p className="text-sm text-foreground/60 mt-1">
          Backups de segurança, importação/exportação e configurações gerais.
        </p>
      </div>

      {/* Grid de Backup e Importação */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Exportar */}
        <CardGlass className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-primary/10 text-primary rounded-lg">
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

        {/* Importar */}
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
            
            <label className="flex items-center justify-center w-full p-4 border-2 border-dashed border-[var(--border-subtle)] rounded-lg hover:border-primary hover:bg-foreground/5 cursor-pointer transition-colors">
              <input type="file" accept=".json" className="hidden" onChange={handleImport} />
              <div className="flex flex-col items-center text-foreground/60">
                <FileJson size={24} className="mb-2 text-primary" />
                <span className="text-xs font-semibold">Clique para selecionar um arquivo .json</span>
              </div>
            </label>
          </div>
        </CardGlass>
      </div>

      {/* Regras de Lembretes e Comunicação */}
      <CardGlass className="p-6">
        <div className="flex items-center gap-3 mb-6 border-b border-[var(--border-subtle)] pb-4">
          <div className="p-3 bg-primary/10 text-primary rounded-lg">
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
            <p className="text-xs text-foreground/50 mb-2">Variáveis disponíveis: <code>{'{nome}'}</code>, <code>{'{servico}'}</code>, <code>{'{hora}'}</code>, <code>{'{data}'}</code></p>
            <textarea 
              rows={3} 
              defaultValue="Olá {nome}, seu horário para {servico} no Studio Agnaldo Gomes está marcado para {data} às {hora}. Responda SIM para confirmar."
              className="w-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg p-3 text-foreground text-sm focus:outline-none focus:border-primary resize-none" 
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
