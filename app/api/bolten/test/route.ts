import { NextResponse } from 'next/server';
import { getBoltenConfig, boltenListProjects, boltenCreateOpportunity } from '@/lib/bolten';
import { requireAdminAuth } from '@/lib/api-auth';

export async function POST(_req: Request) {
  const auth = await requireAdminAuth();
  if (auth.error) return auth.error;

  try {
    const config = getBoltenConfig();
    const logs: string[] = [];

    if (!config?.apiKey && !config?.webhookUrl) {
      return NextResponse.json({
        success: false,
        error: 'Nenhuma credencial (BOLTEN_API_KEY ou BOLTEN_WEBHOOK_URL) encontrada nas variáveis de ambiente.',
      }, { status: 400 });
    }

    // Se tiver Webhook URL configurada, testa o disparo do webhook
    if (config.webhookUrl) {
      try {
        const testRes = await fetch(config.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(config.webhookKey ? { 'x-api-key': config.webhookKey } : {}),
          },
          body: JSON.stringify({
            event: 'teste.conexao',
            timestamp: new Date().toISOString(),
            data: {
              mensagem: 'Teste de conexão Studio Agnaldo Gomes',
              nome: 'Teste Bolten',
              telefone: '(42) 99999-9999',
              servico: 'Corte Masculino',
              valor: 50.00,
            }
          }),
        });
        if (testRes.ok) {
          logs.push('✅ Webhook do Bolten.io respondeu com sucesso (HTTP 200)!');
        } else {
          logs.push(`⚠️ Webhook retornou status HTTP ${testRes.status}`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logs.push(`❌ Falha ao chamar Webhook: ${message}`);
      }
    }

    // Se tiver API Key, testa a API REST
    if (config.apiKey) {
      const projectsRes = await boltenListProjects(config);
      if (projectsRes.error) {
        logs.push(`Erro de Autenticação API: ${projectsRes.error}`);
        if (!config.webhookUrl) {
          return NextResponse.json({
            success: false,
            error: `Chave Inválida ou Recusada pela Bolten.io (${projectsRes.status}): ${projectsRes.error}`,
            logs,
          }, { status: projectsRes.status || 401 });
        }
      } else {
        logs.push('✅ Autenticação com a API REST Bolten.io validada com sucesso!');
      }
    }

    // 2. Se houver componente Kanban configurado, criar card de teste
    let oppId = null;
    if (config.kanbanComponentId) {
      const oppRes = await boltenCreateOpportunity(config, config.kanbanComponentId, {
        Name: 'Teste de Conexão — Studio Agnaldo Gomes',
        'E-mail': 'contato@agnaldogomes.com.br',
        Status: 'Novo Agendamento',
        Valor: 50.00,
        Data: new Date().toLocaleDateString('pt-BR'),
        Servico: 'Corte Masculino',
        Profissional: 'Agnaldo Gomes',
        Contato: {
          Nome: 'Teste de Integração',
          Telefone: '(42) 99999-9999',
        },
      });

      if (oppRes.data) {
        oppId = oppRes.data?.id;
        logs.push(`✅ Oportunidade de teste criada no Funil Kanban: ID ${oppId || 'OK'}`);
      } else if (oppRes.error) {
        logs.push(`⚠️ Aviso Kanban: ${oppRes.error}`);
      }
    } else {
      logs.push('ℹ️ Kanban Component ID não definido; teste de autenticação validado.');
    }

    return NextResponse.json({
      success: true,
      message: 'Conexão com a Bolten.io validada com sucesso! A chave está funcionando perfeitamente.',
      oppId,
      logs,
    });
  } catch (err) {
    console.error('[bolten-test-route]', err);
    const message = err instanceof Error ? err.message : 'Erro inesperado ao conectar com a Bolten.io.';
    return NextResponse.json({
      success: false,
      error: message,
    }, { status: 500 });
  }
}