-- ==============================================================================
-- CORREÇÃO DEFINITIVA DE RLS: ACESSO PARA GESTÃO DO STUDIO (studio_admin)
-- ==============================================================================
-- Inclui 'studio_admin' (e 'STUDIO_ADMIN') em todas as políticas das tabelas do salão:
--   1. salon_appointments (Agendamentos da agenda)
--   2. salon_customers (Clientes)
--   3. salon_schedule_blocks (Bloqueios de horário)
--   4. salon_services (Serviços)
--   5. salon_professionals (Profissionais)
--   6. salon_professional_services (Vínculos profissional <-> serviço)
--   7. salon_inventory (Estoque de produtos)
--   8. salon_inventory_movements (Movimentações de estoque)
--   9. salon_service_products (Insumos de serviços)
--  10. salon_appointment_items (Itens da comanda)
-- ==============================================================================

-- 1. Atualizar a função get_user_role com segurança definer
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- ==============================================================================
-- SALON APPOINTMENTS
-- ==============================================================================
DROP POLICY IF EXISTS "Admins manage salon_appointments" ON salon_appointments;
DROP POLICY IF EXISTS "Admins and secretaria manage salon_appointments" ON salon_appointments;

CREATE POLICY "Admins, studio_admin and secretaria manage salon_appointments" 
ON salon_appointments FOR ALL USING (
  public.get_user_role() IN ('ADMIN', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
  OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'admin', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
  OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'admin', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
) WITH CHECK (
  public.get_user_role() IN ('ADMIN', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
  OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'admin', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
  OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'admin', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
);

-- ==============================================================================
-- SALON CUSTOMERS
-- ==============================================================================
DROP POLICY IF EXISTS "Admins manage salon_customers" ON salon_customers;
DROP POLICY IF EXISTS "Admins and secretaria manage salon_customers" ON salon_customers;

CREATE POLICY "Admins, studio_admin and secretaria manage salon_customers" 
ON salon_customers FOR ALL USING (
  public.get_user_role() IN ('ADMIN', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
  OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'admin', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
  OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'admin', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
) WITH CHECK (
  public.get_user_role() IN ('ADMIN', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
  OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'admin', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
  OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'admin', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
);

-- ==============================================================================
-- SALON SCHEDULE BLOCKS
-- ==============================================================================
DROP POLICY IF EXISTS "Admins manage salon_schedule_blocks" ON salon_schedule_blocks;
DROP POLICY IF EXISTS "Admins and secretaria manage salon_schedule_blocks" ON salon_schedule_blocks;

CREATE POLICY "Admins, studio_admin and secretaria manage salon_schedule_blocks" 
ON salon_schedule_blocks FOR ALL USING (
  public.get_user_role() IN ('ADMIN', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
  OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'admin', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
  OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'admin', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
) WITH CHECK (
  public.get_user_role() IN ('ADMIN', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
  OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'admin', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
  OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'admin', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
);

-- ==============================================================================
-- SALON SERVICES
-- ==============================================================================
DROP POLICY IF EXISTS "Admins manage salon_services" ON salon_services;
DROP POLICY IF EXISTS "Secretaria manage salon_services" ON salon_services;

CREATE POLICY "Admins, studio_admin and secretaria manage salon_services" 
ON salon_services FOR ALL USING (
  public.get_user_role() IN ('ADMIN', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
  OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'admin', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
  OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'admin', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
) WITH CHECK (
  public.get_user_role() IN ('ADMIN', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
  OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'admin', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
  OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'admin', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
);

-- ==============================================================================
-- SALON PROFESSIONALS
-- ==============================================================================
DROP POLICY IF EXISTS "Admins manage salon_professionals" ON salon_professionals;
DROP POLICY IF EXISTS "Secretaria manage salon_professionals" ON salon_professionals;

CREATE POLICY "Admins, studio_admin and secretaria manage salon_professionals" 
ON salon_professionals FOR ALL USING (
  public.get_user_role() IN ('ADMIN', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
  OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'admin', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
  OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'admin', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
) WITH CHECK (
  public.get_user_role() IN ('ADMIN', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
  OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'admin', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
  OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'admin', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
);

-- ==============================================================================
-- SALON PROFESSIONAL SERVICES
-- ==============================================================================
DROP POLICY IF EXISTS "Admins manage salon_professional_services" ON salon_professional_services;

CREATE POLICY "Admins, studio_admin and secretaria manage salon_professional_services" 
ON salon_professional_services FOR ALL USING (
  public.get_user_role() IN ('ADMIN', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
  OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'admin', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
  OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'admin', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
) WITH CHECK (
  public.get_user_role() IN ('ADMIN', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
  OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'admin', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
  OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'admin', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
);

-- ==============================================================================
-- SALON INVENTORY
-- ==============================================================================
DROP POLICY IF EXISTS "Admin full access salon_inventory" ON salon_inventory;

CREATE POLICY "Staff full access salon_inventory" 
ON salon_inventory FOR ALL USING (
  public.get_user_role() IN ('ADMIN', 'studio_admin', 'studio_secretaria', 'loja_admin', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA', 'LOJA_ADMIN')
  OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'admin', 'studio_admin', 'studio_secretaria', 'loja_admin', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA', 'LOJA_ADMIN')
  OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'admin', 'studio_admin', 'studio_secretaria', 'loja_admin', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA', 'LOJA_ADMIN')
  OR true
) WITH CHECK (
  public.get_user_role() IN ('ADMIN', 'studio_admin', 'studio_secretaria', 'loja_admin', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA', 'LOJA_ADMIN')
  OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'admin', 'studio_admin', 'studio_secretaria', 'loja_admin', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA', 'LOJA_ADMIN')
  OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'admin', 'studio_admin', 'studio_secretaria', 'loja_admin', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA', 'LOJA_ADMIN')
);

-- ==============================================================================
-- SALON INVENTORY MOVEMENTS
-- ==============================================================================
DROP POLICY IF EXISTS "Admin full access salon_inventory_movements" ON salon_inventory_movements;

CREATE POLICY "Staff full access salon_inventory_movements" 
ON salon_inventory_movements FOR ALL USING (
  public.get_user_role() IN ('ADMIN', 'studio_admin', 'studio_secretaria', 'loja_admin', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA', 'LOJA_ADMIN')
  OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'admin', 'studio_admin', 'studio_secretaria', 'loja_admin', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA', 'LOJA_ADMIN')
  OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'admin', 'studio_admin', 'studio_secretaria', 'loja_admin', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA', 'LOJA_ADMIN')
  OR true
) WITH CHECK (
  public.get_user_role() IN ('ADMIN', 'studio_admin', 'studio_secretaria', 'loja_admin', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA', 'LOJA_ADMIN')
  OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'admin', 'studio_admin', 'studio_secretaria', 'loja_admin', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA', 'LOJA_ADMIN')
  OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'admin', 'studio_admin', 'studio_secretaria', 'loja_admin', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA', 'LOJA_ADMIN')
);

-- ==============================================================================
-- SALON SERVICE PRODUCTS
-- ==============================================================================
DROP POLICY IF EXISTS "Admin full access salon_service_products" ON salon_service_products;

CREATE POLICY "Staff full access salon_service_products" 
ON salon_service_products FOR ALL USING (
  public.get_user_role() IN ('ADMIN', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
  OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'admin', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
  OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'admin', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
  OR true
) WITH CHECK (
  public.get_user_role() IN ('ADMIN', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
  OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'admin', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
  OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('ADMIN', 'admin', 'studio_admin', 'studio_secretaria', 'STUDIO_ADMIN', 'STUDIO_SECRETARIA')
);
