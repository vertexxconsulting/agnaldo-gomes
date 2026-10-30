/**
 * DISPATCHER UNIFICADO DE CRON (WhatsApp Marketing Studio Agnaldo Gomes)
 *
 * Pode ser chamado periodicamente (ex: a cada 10 ou 15 minutos via cron ou agendador externo).
 * - Verifica o horário atual de Brasília (BRT, UTC-3).
 * - Avalia cada sessão (Aniversários, Confirmações, Lembretes, Feedback, Reativação).
 * - Se a sessão estiver ATIVA e o horário atual for igual ou posterior ao horário configurado,
 *   dispara as mensagens pendentes garantindo:
 *   1. Anti-Duplicação: Nenhuma mensagem é enviada 2x no mesmo dia.
 *   2. Intervalo Mínimo de 1 minuto (60s) entre cada disparo sucessivo.
 *   3. Mutex/Lock para evitar execuções concorrentes.
 */
import { NextResponse } from 'next/server';
import { autorizadoCron, hojeBRT } from '@/lib/cron-auth';
import { getMarketingConfig, horaAtualBRT } from '@/lib/marketing-control';

export async function GET(req: Request) {
  if (!(await autorizadoCron(req))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const url = new URL(req.url);
  const force = url.searchParams.get('force') === 'true';
  const baseUrl = url.origin;

  const hoje = hojeBRT();
  const horaAtual = horaAtualBRT();
  const config = await getMarketingConfig();

  const relatorio: Record<string, any> = {
    horario_atual_brt: horaAtual,
    data_hoje: hoje,
    intervalo_segundos: config.intervalo_segundos,
    sessões: {},
  };

  try {
    // 1. ANIVERSÁRIOS
    if (config.aniversarios.ativo && (force || horaAtual >= config.aniversarios.horario)) {
      try {
        const res = await fetch(`${baseUrl}/api/cron/aniversarios?execute=true${force ? '&force=true' : ''}`);
        relatorio.sessões.aniversarios = await res.json();
      } catch (err: any) {
        relatorio.sessões.aniversarios = { error: err.message };
      }
    } else {
      relatorio.sessões.aniversarios = {
        ativo: config.aniversarios.ativo,
        horario_programado: config.aniversarios.horario,
        status: !config.aniversarios.ativo ? 'Desativado' : 'Aguardando horário',
      };
    }

    // 2. AGENDA (Confirmações de Véspera e Lembretes de Hoje)
    const agendaAtiva = config.agenda_confirmacao.ativo || config.agenda_lembrete.ativo;
    if (agendaAtiva) {
      try {
        const res = await fetch(`${baseUrl}/api/cron/agenda?execute=true${force ? '&force=true' : ''}`);
        relatorio.sessões.agenda = await res.json();
      } catch (err: any) {
        relatorio.sessões.agenda = { error: err.message };
      }
    } else {
      relatorio.sessões.agenda = {
        status: 'Desativado nas configurações',
      };
    }

    // 3. FEEDBACK PÓS-ATENDIMENTO
    if (config.feedback.ativo && (force || horaAtual >= config.feedback.horario)) {
      try {
        const res = await fetch(`${baseUrl}/api/cron/feedback?execute=true${force ? '&force=true' : ''}`);
        relatorio.sessões.feedback = await res.json();
      } catch (err: any) {
        relatorio.sessões.feedback = { error: err.message };
      }
    } else {
      relatorio.sessões.feedback = {
        ativo: config.feedback.ativo,
        horario_programado: config.feedback.horario,
        status: !config.feedback.ativo ? 'Desativado' : 'Aguardando horário',
      };
    }

    // 4. REATIVAÇÃO
    if (config.reativacao.ativo && (force || horaAtual >= config.reativacao.horario)) {
      try {
        const res = await fetch(`${baseUrl}/api/cron/reativacao?execute=true${force ? '&force=true' : ''}`);
        relatorio.sessões.reativacao = await res.json();
      } catch (err: any) {
        relatorio.sessões.reativacao = { error: err.message };
      }
    } else {
      relatorio.sessões.reativacao = {
        ativo: config.reativacao.ativo,
        horario_programado: config.reativacao.horario,
        status: !config.reativacao.ativo ? 'Desativado' : 'Aguardando horário',
      };
    }

    return NextResponse.json({ ok: true, relatorio });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

