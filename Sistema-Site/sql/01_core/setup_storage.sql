-- Cria um bucket chamado "academy-assets" caso ele não exista
INSERT INTO storage.buckets (id, name, public)
VALUES ('academy-assets', 'academy-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Configura as políticas de RLS para o bucket (permitir leitura pública)
CREATE POLICY "Leitura Pública de Assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'academy-assets');

-- Permitir upload apenas para usuários autenticados (opcional, o backend via service_role bypassa o RLS de qualquer forma)
CREATE POLICY "Upload Autenticado"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'academy-assets'
    AND auth.role() = 'authenticated'
);

-- Permitir update e delete pelos donos
CREATE POLICY "Atualização e Deleção por Autenticados"
ON storage.objects FOR UPDATE
USING (bucket_id = 'academy-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Deleção por Autenticados"
ON storage.objects FOR DELETE
USING (bucket_id = 'academy-assets' AND auth.role() = 'authenticated');
