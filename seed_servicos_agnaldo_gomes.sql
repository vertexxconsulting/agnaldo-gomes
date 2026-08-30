-- ==============================================================================
-- SEED DE SERVIÇOS E VALORES OFICIAIS — STUDIO AGNALDO GOMES
-- "Tudo sempre a partir de"
-- ==============================================================================

-- 1. Inserir Profissionais Base (se ainda não existirem)
INSERT INTO public.salon_professionals (id, name, specialties, active)
VALUES 
  ('a0000001-0000-0000-0000-000000000001', 'Agnaldo Gomes', ARRAY['Cortes', 'Coloração', 'Mechas', 'Terapia Capilar', 'Noivas'], true),
  ('a0000001-0000-0000-0000-000000000002', 'Equipe Studio', ARRAY['Cortes', 'Escova', 'Tratamentos', 'Barbearia', 'Unhas', 'Podologia', 'Estética'], true)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  specialties = EXCLUDED.specialties,
  active = true;

-- 2. Inserir Tabela Oficial de Serviços (valores base "a partir de")
INSERT INTO public.salon_services (id, name, category, duration_minutes, price, active, visible_in_app)
VALUES
  -- Cabelo & Cortes
  ('b0000001-0000-0000-0000-000000000001', 'Corte Masculino (Equipe)', 'Cortes', 30, 50.00, true, true),
  ('b0000001-0000-0000-0000-000000000002', 'Corte Masculino (Agnaldo Gomes)', 'Cortes', 35, 60.00, true, true),
  ('b0000001-0000-0000-0000-000000000003', 'Corte Feminino', 'Cortes', 45, 140.00, true, true),
  ('b0000001-0000-0000-0000-000000000004', 'Corte Feminino com Escova', 'Cortes', 60, 160.00, true, true),
  ('b0000001-0000-0000-0000-000000000005', 'Escova', 'Cortes', 30, 45.00, true, true),
  ('b0000001-0000-0000-0000-000000000006', 'Penteado', 'Cortes', 60, 140.00, true, true),

  -- Coloração & Mechas
  ('b0000001-0000-0000-0000-000000000007', 'Mechas (R$ 480 a R$ 1.080)', 'Coloração', 180, 480.00, true, true),
  ('b0000001-0000-0000-0000-000000000008', 'Coloração (R$ 160 a R$ 580)', 'Coloração', 90, 160.00, true, true),

  -- Tratamentos & Terapia Capilar
  ('b0000001-0000-0000-0000-000000000009', 'Hidratação', 'Tratamentos', 40, 95.00, true, true),
  ('b0000001-0000-0000-0000-000000000010', 'Selamento Térmico', 'Tratamentos', 60, 120.00, true, true),
  ('b0000001-0000-0000-0000-000000000011', 'Reconstrução', 'Tratamentos', 50, 120.00, true, true),
  ('b0000001-0000-0000-0000-000000000012', 'Ozônio Terapia', 'Tratamentos', 50, 160.00, true, true),
  ('b0000001-0000-0000-0000-000000000013', 'Micro Mist - Terapia Capilar', 'Tratamentos', 60, 180.00, true, true),
  ('b0000001-0000-0000-0000-000000000014', 'Terapia Capilar Personalizada (R$ 190 a R$ 420)', 'Tratamentos', 60, 190.00, true, true),

  -- Barbearia & Rosto
  ('b0000001-0000-0000-0000-000000000015', 'Barba', 'Barbearia', 30, 45.00, true, true),
  ('b0000001-0000-0000-0000-000000000016', 'Sobrancelha', 'Estética Facial', 20, 55.00, true, true),
  ('b0000001-0000-0000-0000-000000000017', 'Maquiagem', 'Maquiagem', 60, 160.00, true, true),
  ('b0000001-0000-0000-0000-000000000018', 'Limpeza de Pele (Sob consulta)', 'Estética Facial', 60, 120.00, true, true),

  -- Manicure, Pedicure & Podologia
  ('b0000001-0000-0000-0000-000000000019', 'Mão', 'Unhas', 40, 40.00, true, true),
  ('b0000001-0000-0000-0000-000000000020', 'Pé', 'Unhas', 45, 45.00, true, true),
  ('b0000001-0000-0000-0000-000000000021', 'Podologia', 'Podologia', 60, 90.00, true, true),

  -- Estética Corporal
  ('b0000001-0000-0000-0000-000000000022', 'Drenagem Linfática', 'Estética Corporal', 60, 180.00, true, true),

  -- Noivas
  ('b0000001-0000-0000-0000-000000000023', 'Noivas — Cabelo e Maquiagem (sem teste)', 'Noivas', 180, 980.00, true, true),
  ('b0000001-0000-0000-0000-000000000024', 'Noivas — Pé e mão, Sobrancelha, teste de make/cabelo e dia da noiva', 'Noivas', 360, 2499.00, true, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  duration_minutes = EXCLUDED.duration_minutes,
  price = EXCLUDED.price,
  active = EXCLUDED.active,
  visible_in_app = EXCLUDED.visible_in_app;

-- 3. Vincular Serviços aos Profissionais
INSERT INTO public.salon_professional_services (professional_id, service_id)
VALUES
  -- Agnaldo Gomes
  ('a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000002'),
  ('a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000003'),
  ('a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000004'),
  ('a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000007'),
  ('a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000008'),
  ('a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000006'),
  ('a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000013'),
  ('a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000014'),
  ('a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000023'),
  ('a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000024'),

  -- Equipe
  ('a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000001'),
  ('a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000003'),
  ('a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000004'),
  ('a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000005'),
  ('a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000006'),
  ('a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000009'),
  ('a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000010'),
  ('a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000011'),
  ('a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000012'),
  ('a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000013'),
  ('a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000015'),
  ('a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000016'),
  ('a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000017'),
  ('a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000018'),
  ('a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000019'),
  ('a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000020'),
  ('a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000021'),
  ('a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000022')
ON CONFLICT DO NOTHING;
