-- ==============================================================================
-- AGENDAMENTO AUTOMÁTICO DE LEMBRETES E MARKETING VIA SUPABASE (pg_cron + pg_net)
-- ==============================================================================
-- Este script configura o disparo automático a cada 15 ou 30 minutos diretamente
-- a partir do banco de dados Supabase, sem depender das limitações do plano Hobby da Vercel.
--
-- Pode ser executado diretamente no SQL Editor do Supabase Dashboard:
-- https://supabase.com/dashboard/project/nbxikhiwdzllhgypkfyw/sql

-- 1. Habilitar extensões necessárias no Supabase
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Limpar agendamento anterior se já existir
SELECT cron.unschedule('marketing_cron_dispatcher') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'marketing_cron_dispatcher'
);

-- OPÇÃO A: Chamar diretamente a API da sua aplicação Next.js (https://agnaldogomes.com)
-- Dispara a cada 30 minutos todos os dias
SELECT cron.schedule(
    'marketing_cron_dispatcher',
    '*/30 * * * *',
    $$
    SELECT net.http_get(
        url := 'https://agnaldogomes.com/api/cron/dispatcher?execute=true',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'User-Agent', 'Supabase-pg_cron/1.0'
        )
    );
    $$
);

-- OPÇÃO B (Se você optar por implantar a Edge Function 'cron-dispatcher'):
-- Caso queira que o pg_cron invoque a Edge Function do Supabase em vez da URL direta:
/*
SELECT cron.schedule(
    'marketing_edge_function_dispatcher',
    '*/30 * * * *',
    $$
    SELECT net.http_get(
        url := 'https://nbxikhiwdzllhgypkfyw.supabase.co/functions/v1/cron-dispatcher',
        headers := jsonb_build_object(
            'Authorization', 'Bearer <SEU_ANON_KEY_OU_SERVICE_ROLE_KEY>',
            'Content-Type', 'application/json'
        )
    );
    $$
);
*/

-- 3. Para verificar os jobs agendados ativos:
-- SELECT * FROM cron.job;

-- 4. Para ver o histórico das últimas execuções:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
