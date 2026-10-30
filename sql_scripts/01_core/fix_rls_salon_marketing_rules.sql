-- Fix RLS policies for salon_marketing_rules table
-- Permite leitura e gerenciamento para ADMIN, studio_admin e studio_secretaria

ALTER TABLE salon_marketing_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage salon_marketing_rules" ON salon_marketing_rules;
DROP POLICY IF EXISTS "Staff manage salon_marketing_rules" ON salon_marketing_rules;
DROP POLICY IF EXISTS "Authenticated users view salon_marketing_rules" ON salon_marketing_rules;

-- Leitura: qualquer usuário autenticado (ou com permissão na aba)
CREATE POLICY "Authenticated users view salon_marketing_rules"
  ON salon_marketing_rules
  FOR SELECT
  TO authenticated
  USING (true);

-- Gerenciamento completo (INSERT, UPDATE, DELETE): ADMIN, studio_admin e studio_secretaria
CREATE POLICY "Staff manage salon_marketing_rules"
  ON salon_marketing_rules
  FOR ALL
  TO authenticated
  USING (
    public.get_user_role() IN ('ADMIN', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
    OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'admin', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
  )
  WITH CHECK (
    public.get_user_role() IN ('ADMIN', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
    OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'admin', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
  );
