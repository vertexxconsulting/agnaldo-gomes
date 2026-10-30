-- Fix RLS policies for salon_marketing_rules table
-- The table has RLS enabled but was missing INSERT/UPDATE/DELETE policies,
-- causing "new row violates row-level security policy" errors.

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins manage salon_marketing_rules" ON salon_marketing_rules;

-- Create a single policy that covers all operations for admins
CREATE POLICY "Admins manage salon_marketing_rules"
  ON salon_marketing_rules
  FOR ALL
  USING (
    public.get_user_role() = 'ADMIN'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'admin')
  )
  WITH CHECK (
    public.get_user_role() = 'ADMIN'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'admin')
  );

