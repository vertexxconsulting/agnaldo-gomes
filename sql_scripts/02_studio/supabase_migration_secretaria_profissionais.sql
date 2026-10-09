-- Permite que usuários com a role de STUDIO_SECRETARIA possam INSERIR, ATUALIZAR E DELETAR profissionais.
-- Usando auth.jwt() para evitar erros de cast no ENUM user_role

DROP POLICY IF EXISTS "Secretaria manage salon_professionals" ON salon_professionals;

CREATE POLICY "Secretaria manage salon_professionals" 
ON salon_professionals 
FOR ALL 
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('studio_secretaria', 'STUDIO_SECRETARIA', 'ADMIN', 'STUDIO_ADMIN')
  OR public.get_user_role() IN ('studio_secretaria', 'STUDIO_SECRETARIA', 'ADMIN', 'STUDIO_ADMIN')
)
WITH CHECK (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('studio_secretaria', 'STUDIO_SECRETARIA', 'ADMIN', 'STUDIO_ADMIN')
  OR public.get_user_role() IN ('studio_secretaria', 'STUDIO_SECRETARIA', 'ADMIN', 'STUDIO_ADMIN')
);
