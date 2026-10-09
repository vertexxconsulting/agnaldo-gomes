-- ==============================================================================
-- SCRIPT DE ATUALIZAÇÃO PARA UUIDS REAIS E ALEATÓRIOS (SUPABASE SQL EDITOR)
-- Studio Agnaldo Gomes
-- ==============================================================================

-- 1. Limpar vínculos e registros com IDs sequenciais (que continham zeros)
DELETE FROM public.salon_professional_services 
WHERE professional_id IN ('a0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002')
   OR service_id::text LIKE 'b0000001-%';

DELETE FROM public.salon_services WHERE id::text LIKE 'b0000001-%';
DELETE FROM public.salon_professionals WHERE id::text IN ('a0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002');

-- 2. Inserir Profissionais com UUIDs v4 Aleatórios Válidos
INSERT INTO public.salon_professionals (id, name, specialties, active)
VALUES 
  ('e47b1a20-8d3f-4e92-91bc-3a817452d901', 'Agnaldo Gomes', ARRAY['Cortes', 'Coloração', 'Mechas', 'Terapia Capilar', 'Noivas'], true),
  ('f82c4d31-9a5e-4b73-82cd-4b928563e012', 'Equipe Studio', ARRAY['Cortes', 'Escova', 'Tratamentos', 'Barbearia', 'Unhas', 'Podologia', 'Estética'], true)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  specialties = EXCLUDED.specialties,
  active = true;

-- 3. Inserir Serviços com UUIDs v4 Aleatórios Válidos
INSERT INTO public.salon_services (id, name, category, duration_minutes, price, active, visible_in_app)
VALUES
  -- Cabelo & Cortes
  ('c18d9f42-7a2e-4b83-91de-5ca39674f101', 'Corte Masculino (Equipe)', 'Cortes', 30, 50.00, true, true),
  ('c29e0a53-8b3f-4c94-a2ef-6db40785a202', 'Corte Masculino (Agnaldo Gomes)', 'Cortes', 35, 60.00, true, true),
  ('c3af1b64-9c40-4da5-b3f0-7ec51896b303', 'Corte Feminino', 'Cortes', 45, 140.00, true, true),
  ('c4b02c75-ad51-4eb6-c401-8fd629a7c404', 'Corte Feminino com Escova', 'Cortes', 60, 160.00, true, true),
  ('c5c13d86-be62-4fc7-d512-90e73ab8d505', 'Escova', 'Cortes', 30, 45.00, true, true),
  ('c6d24e97-cf73-40d8-e623-a1f84bc9e606', 'Penteado', 'Cortes', 60, 140.00, true, true),

  -- Coloração & Mechas
  ('c7e35fa8-d084-41e9-f734-b2095cda0707', 'Mechas (R$ 480 a R$ 1.080)', 'Coloração', 180, 480.00, true, true),
  ('c8f460b9-e195-42fa-0845-c31a6deb1808', 'Coloração (R$ 160 a R$ 580)', 'Coloração', 90, 160.00, true, true),

  -- Tratamentos & Terapia Capilar
  ('c90571ca-f206-430b-1956-d42b7efc2909', 'Hidratação', 'Tratamentos', 40, 95.00, true, true),
  ('ca1682db-0317-441c-2a67-e53c800d3a10', 'Selamento Térmico', 'Tratamentos', 60, 120.00, true, true),
  ('cb2793ec-1428-452d-3b78-f64d911e4b11', 'Reconstrução', 'Tratamentos', 50, 120.00, true, true),
  ('cc38a4fd-2539-463e-4c89-075ea22f5c12', 'Ozônio Terapia', 'Tratamentos', 50, 160.00, true, true),
  ('cd49b50e-364a-474f-5d90-186fb3306d13', 'Micro Mist - Terapia Capilar', 'Tratamentos', 60, 180.00, true, true),
  ('ce5ac61f-475b-4850-6e01-2970c4417e14', 'Terapia Capilar Personalizada (R$ 190 a R$ 420)', 'Tratamentos', 60, 190.00, true, true),

  -- Barbearia & Rosto
  ('cf6bd720-586c-4961-7f12-3a81d5528f15', 'Barba', 'Barbearia', 30, 45.00, true, true),
  ('d07ce831-697d-4a72-8023-4b92e6639016', 'Sobrancelha', 'Estética Facial', 20, 55.00, true, true),
  ('d18df942-7a8e-4b83-9134-5ca3f774a117', 'Maquiagem', 'Maquiagem', 60, 160.00, true, true),
  ('d29ea053-8b9f-4c94-a245-6db40885b218', 'Limpeza de Pele (Sob consulta)', 'Estética Facial', 60, 120.00, true, true),

  -- Manicure, Pedicure & Podologia
  ('d3afb164-9caf-4da5-b356-7ec51996c319', 'Mão', 'Unhas', 40, 40.00, true, true),
  ('d4b0c275-adba-4eb6-c467-8fd62aa7d420', 'Pé', 'Unhas', 45, 45.00, true, true),
  ('d5c1d386-becb-4fc7-d578-90e73bb8e521', 'Podologia', 'Podologia', 60, 90.00, true, true),

  -- Estética Corporal
  ('d6d2e497-cfdc-40d8-e689-a1f84cc9f622', 'Drenagem Linfática', 'Estética Corporal', 60, 180.00, true, true),

  -- Noivas
  ('d7e3f5a8-d0ed-41e9-f79a-b2095dda0723', 'Noivas — Cabelo e Maquiagem (sem teste)', 'Noivas', 180, 980.00, true, true),
  ('d8f406b9-e1fe-42fa-08ab-c31a6eeb1824', 'Noivas — Pé e mão, Sobrancelha, teste de make/cabelo e dia da noiva', 'Noivas', 360, 2499.00, true, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  duration_minutes = EXCLUDED.duration_minutes,
  price = EXCLUDED.price,
  active = EXCLUDED.active,
  visible_in_app = EXCLUDED.visible_in_app;

-- 4. Vincular Serviços aos Profissionais
INSERT INTO public.salon_professional_services (professional_id, service_id)
VALUES
  -- Agnaldo Gomes
  ('e47b1a20-8d3f-4e92-91bc-3a817452d901', 'c29e0a53-8b3f-4c94-a2ef-6db40785a202'),
  ('e47b1a20-8d3f-4e92-91bc-3a817452d901', 'c3af1b64-9c40-4da5-b3f0-7ec51896b303'),
  ('e47b1a20-8d3f-4e92-91bc-3a817452d901', 'c4b02c75-ad51-4eb6-c401-8fd629a7c404'),
  ('e47b1a20-8d3f-4e92-91bc-3a817452d901', 'c7e35fa8-d084-41e9-f734-b2095cda0707'),
  ('e47b1a20-8d3f-4e92-91bc-3a817452d901', 'c8f460b9-e195-42fa-0845-c31a6deb1808'),
  ('e47b1a20-8d3f-4e92-91bc-3a817452d901', 'c6d24e97-cf73-40d8-e623-a1f84bc9e606'),
  ('e47b1a20-8d3f-4e92-91bc-3a817452d901', 'cd49b50e-364a-474f-5d90-186fb3306d13'),
  ('e47b1a20-8d3f-4e92-91bc-3a817452d901', 'ce5ac61f-475b-4850-6e01-2970c4417e14'),
  ('e47b1a20-8d3f-4e92-91bc-3a817452d901', 'd7e3f5a8-d0ed-41e9-f79a-b2095dda0723'),
  ('e47b1a20-8d3f-4e92-91bc-3a817452d901', 'd8f406b9-e1fe-42fa-08ab-c31a6eeb1824'),

  -- Equipe Studio
  ('f82c4d31-9a5e-4b73-82cd-4b928563e012', 'c18d9f42-7a2e-4b83-91de-5ca39674f101'),
  ('f82c4d31-9a5e-4b73-82cd-4b928563e012', 'c3af1b64-9c40-4da5-b3f0-7ec51896b303'),
  ('f82c4d31-9a5e-4b73-82cd-4b928563e012', 'c4b02c75-ad51-4eb6-c401-8fd629a7c404'),
  ('f82c4d31-9a5e-4b73-82cd-4b928563e012', 'c5c13d86-be62-4fc7-d512-90e73ab8d505'),
  ('f82c4d31-9a5e-4b73-82cd-4b928563e012', 'c6d24e97-cf73-40d8-e623-a1f84bc9e606'),
  ('f82c4d31-9a5e-4b73-82cd-4b928563e012', 'c90571ca-f206-430b-1956-d42b7efc2909'),
  ('f82c4d31-9a5e-4b73-82cd-4b928563e012', 'ca1682db-0317-441c-2a67-e53c800d3a10'),
  ('f82c4d31-9a5e-4b73-82cd-4b928563e012', 'cb2793ec-1428-452d-3b78-f64d911e4b11'),
  ('f82c4d31-9a5e-4b73-82cd-4b928563e012', 'cc38a4fd-2539-463e-4c89-075ea22f5c12'),
  ('f82c4d31-9a5e-4b73-82cd-4b928563e012', 'cd49b50e-364a-474f-5d90-186fb3306d13'),
  ('f82c4d31-9a5e-4b73-82cd-4b928563e012', 'cf6bd720-586c-4961-7f12-3a81d5528f15'),
  ('f82c4d31-9a5e-4b73-82cd-4b928563e012', 'd07ce831-697d-4a72-8023-4b92e6639016'),
  ('f82c4d31-9a5e-4b73-82cd-4b928563e012', 'd18df942-7a8e-4b83-9134-5ca3f774a117'),
  ('f82c4d31-9a5e-4b73-82cd-4b928563e012', 'd29ea053-8b9f-4c94-a245-6db40885b218'),
  ('f82c4d31-9a5e-4b73-82cd-4b928563e012', 'd3afb164-9caf-4da5-b356-7ec51996c319'),
  ('f82c4d31-9a5e-4b73-82cd-4b928563e012', 'd4b0c275-adba-4eb6-c467-8fd62aa7d420'),
  ('f82c4d31-9a5e-4b73-82cd-4b928563e012', 'd5c1d386-becb-4fc7-d578-90e73bb8e521'),
  ('f82c4d31-9a5e-4b73-82cd-4b928563e012', 'd6d2e497-cfdc-40d8-e689-a1f84cc9f622')
ON CONFLICT (professional_id, service_id) DO NOTHING;
