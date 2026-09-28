import { NextResponse } from 'next/server';
import { getBoltenConfig, setDynamicBoltenConfig } from '@/lib/bolten';
import { requireAdminAuth } from '@/lib/api-auth';

export async function GET() {
  const auth = await requireAdminAuth();
  if (auth.error) return auth.error;

  const config = getBoltenConfig();
  return NextResponse.json({
    configurado: Boolean(config?.apiKey && config?.projectId),
    projectId: config?.projectId ? '***' : '',
    kanbanComponentId: config?.kanbanComponentId ? '***' : '',
    contactComponentId: config?.contactComponentId ? '***' : '',
    ativo: config?.ativo ?? false,
  });
}

export async function POST(req: Request) {
  const auth = await requireAdminAuth();
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { apiKey, projectId, kanbanComponentId, contactComponentId, webhookKey, webhookUrl, ativo } = body;

    const newConfig = {
      apiKey: (apiKey || '').trim(),
      projectId: (projectId || '').trim(),
      kanbanComponentId: (kanbanComponentId || '').trim(),
      contactComponentId: (contactComponentId || '').trim(),
      webhookKey: (webhookKey || '').trim(),
      webhookUrl: (webhookUrl || '').trim(),
      ativo: Boolean(ativo ?? true),
    };

    setDynamicBoltenConfig(newConfig);

    return NextResponse.json({
      success: true,
      message: 'Configurações do Bolten CRM salvas com sucesso!',
      configurado: Boolean(newConfig.apiKey && newConfig.projectId),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao salvar configurações';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}