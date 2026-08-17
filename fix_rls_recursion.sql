-- 1. Create a SECURITY DEFINER function to fetch the user's role safely
-- This bypasses RLS policies to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 2. Drop existing policies that cause the recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins manage courses" ON courses;
DROP POLICY IF EXISTS "Admins manage modules" ON modules;
DROP POLICY IF EXISTS "Admins manage lessons" ON lessons;
DROP POLICY IF EXISTS "Admins manage enrollments" ON course_enrollments;
DROP POLICY IF EXISTS "Admins manage products" ON products;
DROP POLICY IF EXISTS "Admins manage orders" ON orders;
DROP POLICY IF EXISTS "Admins manage salon_customers" ON salon_customers;
DROP POLICY IF EXISTS "Admins manage salon_services" ON salon_services;
DROP POLICY IF EXISTS "Admins manage salon_professionals" ON salon_professionals;
DROP POLICY IF EXISTS "Admins manage salon_professional_services" ON salon_professional_services;
DROP POLICY IF EXISTS "Admins manage salon_appointments" ON salon_appointments;
DROP POLICY IF EXISTS "Admins manage salon_schedule_blocks" ON salon_schedule_blocks;

-- 3. Re-create the policies using the secure function

-- PROFILES
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (
  public.get_user_role() = 'ADMIN'
);

-- E-LEARNING
CREATE POLICY "Admins manage courses" ON courses FOR ALL USING (
  public.get_user_role() = 'ADMIN'
);

CREATE POLICY "Admins manage modules" ON modules FOR ALL USING (
  public.get_user_role() = 'ADMIN'
);

CREATE POLICY "Admins manage lessons" ON lessons FOR ALL USING (
  public.get_user_role() = 'ADMIN'
);

CREATE POLICY "Admins manage enrollments" ON course_enrollments FOR ALL USING (
  public.get_user_role() = 'ADMIN'
);

-- STORE
CREATE POLICY "Admins manage products" ON products FOR ALL USING (
  public.get_user_role() = 'ADMIN'
);

CREATE POLICY "Admins manage orders" ON orders FOR ALL USING (
  public.get_user_role() = 'ADMIN'
);

-- SALON
CREATE POLICY "Admins manage salon_customers" ON salon_customers FOR ALL USING (
  public.get_user_role() IN ('ADMIN', 'PROFESSIONAL')
);

CREATE POLICY "Admins manage salon_services" ON salon_services FOR ALL USING (
  public.get_user_role() = 'ADMIN'
);

CREATE POLICY "Admins manage salon_professionals" ON salon_professionals FOR ALL USING (
  public.get_user_role() = 'ADMIN'
);

CREATE POLICY "Admins manage salon_professional_services" ON salon_professional_services FOR ALL USING (
  public.get_user_role() = 'ADMIN'
);

CREATE POLICY "Admins manage salon_appointments" ON salon_appointments FOR ALL USING (
  public.get_user_role() IN ('ADMIN', 'PROFESSIONAL')
);

CREATE POLICY "Admins manage salon_schedule_blocks" ON salon_schedule_blocks FOR ALL USING (
  public.get_user_role() IN ('ADMIN', 'PROFESSIONAL')
);
