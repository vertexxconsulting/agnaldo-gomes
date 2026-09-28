-- ==============================================================================
-- MIGRAÇÃO: Relatórios Financeiros Unificados (View Materializada + Cron)
-- ==============================================================================
-- Execute no SQL Editor do Supabase

-- 1. View materializada mv_financeiro_diario
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_financeiro_diario AS
WITH 
-- Receita do Salão (agendamentos pagos/concluídos)
salon_revenue AS (
  SELECT 
    DATE(sa.created_at AT TIME ZONE 'America/Sao_Paulo') as dia,
    COALESCE(SUM(
      CASE 
        WHEN sa.status IN ('COMPLETED', 'CONFIRMED') THEN ss.price 
        ELSE 0 
      END
    ), 0) as revenue_salon,
    COUNT(*) FILTER (WHERE sa.status IN ('COMPLETED', 'CONFIRMED')) as appointments_count
  FROM salon_appointments sa
  JOIN salon_services ss ON ss.id = sa.service_id
  WHERE sa.created_at >= (now() - interval '2 years')
  GROUP BY 1
),

-- Receita da Academy (matrículas pagas)
academy_revenue AS (
  SELECT 
    DATE(ce.enrolled_at AT TIME ZONE 'America/Sao_Paulo') as dia,
    COALESCE(SUM(c.price), 0) as revenue_academy,
    COUNT(*) as enrollments_count
  FROM course_enrollments ce
  JOIN courses c ON c.id = ce.course_id
  WHERE c.price > 0
    AND ce.enrolled_at >= (now() - interval '2 years')
  GROUP BY 1
),

-- Receita da Loja (pedidos pagos)
shop_revenue AS (
  SELECT 
    DATE(o.created_at AT TIME ZONE 'America/Sao_Paulo') as dia,
    COALESCE(SUM(o.total), 0) as revenue_shop,
    COUNT(*) FILTER (WHERE o.status = 'PAID') as orders_count
  FROM orders o
  WHERE o.status = 'PAID'
    AND o.created_at >= (now() - interval '2 years')
  GROUP BY 1
),

-- Todas as datas do período
all_dates AS (
  SELECT generate_series(
    (SELECT MIN(dia) FROM (
      SELECT dia FROM salon_revenue
      UNION SELECT dia FROM academy_revenue
      UNION SELECT dia FROM shop_revenue
    ) d),
    CURRENT_DATE,
    interval '1 day'
  )::DATE as dia
)

SELECT 
  ad.dia,
  COALESCE(sr.revenue_salon, 0) as revenue_salon,
  COALESCE(sr.appointments_count, 0) as appointments_count,
  COALESCE(ar.revenue_academy, 0) as revenue_academy,
  COALESCE(ar.enrollments_count, 0) as enrollments_count,
  COALESCE(sh.revenue_shop, 0) as revenue_shop,
  COALESCE(sh.orders_count, 0) as orders_count,
  COALESCE(sr.revenue_salon, 0) + COALESCE(ar.revenue_academy, 0) + COALESCE(sh.revenue_shop, 0) as revenue_total
FROM all_dates ad
LEFT JOIN salon_revenue sr ON sr.dia = ad.dia
LEFT JOIN academy_revenue ar ON ar.dia = ad.dia
LEFT JOIN shop_revenue sh ON sh.dia = ad.dia
ORDER BY ad.dia DESC;

-- Índices na view materializada
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_financeiro_diario_dia ON mv_financeiro_diario(dia);

-- 2. Função para refrescar a view
CREATE OR REPLACE FUNCTION refresh_financeiro_diario()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_financeiro_diario;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Job cron para atualizar diariamente (requer extensão pg_cron)
-- Descomente as linhas abaixo se tiver pg_cron habilitado no Supabase:
--
-- SELECT cron.schedule(
--   'refresh-financeiro-diario',
--   '0 3 * * *', -- Todo dia às 03:00 UTC
--   'SELECT refresh_financeiro_diario();'
-- );

-- 4. View para relatório por período (útil para API)
CREATE OR REPLACE VIEW v_financeiro_periodo AS
SELECT 
  dia,
  revenue_salon,
  revenue_academy,
  revenue_shop,
  revenue_total,
  appointments_count,
  enrollments_count,
  orders_count,
  -- Acumulados
  SUM(revenue_total) OVER (ORDER BY dia ROWS UNBOUNDED PRECEDING) as revenue_total_acumulado,
  SUM(appointments_count) OVER (ORDER BY dia ROWS UNBOUNDED PRECEDING) as appointments_acumulado,
  SUM(enrollments_count) OVER (ORDER BY dia ROWS UNBOUNDED PRECEDING) as enrollments_acumulado,
  SUM(orders_count) OVER (ORDER BY dia ROWS UNBOUNDED PRECEDING) as orders_acumulado
FROM mv_financeiro_diario;

-- 5. View para resumo do mês atual
CREATE OR REPLACE VIEW v_financeiro_mes_atual AS
SELECT 
  DATE_TRUNC('month', dia) as mes,
  SUM(revenue_salon) as revenue_salon,
  SUM(revenue_academy) as revenue_academy,
  SUM(revenue_shop) as revenue_shop,
  SUM(revenue_total) as revenue_total,
  SUM(appointments_count) as appointments_count,
  SUM(enrollments_count) as enrollments_count,
  SUM(orders_count) as orders_count
FROM mv_financeiro_diario
WHERE dia >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY 1;

-- 6. View para comparativo mês a mês
CREATE OR REPLACE VIEW v_financeiro_mensal AS
SELECT 
  DATE_TRUNC('month', dia) as mes,
  SUM(revenue_salon) as revenue_salon,
  SUM(revenue_academy) as revenue_academy,
  SUM(revenue_shop) as revenue_shop,
  SUM(revenue_total) as revenue_total,
  SUM(appointments_count) as appointments_count,
  SUM(enrollments_count) as enrollments_count,
  SUM(orders_count) as orders_count
FROM mv_financeiro_diario
GROUP BY 1
ORDER BY 1 DESC;