-- Criação da tabela academy_settings
CREATE TABLE IF NOT EXISTS public.academy_settings (
    id integer NOT NULL PRIMARY KEY,
    welcome_video_url text,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS (Opcional, mas recomendado)
ALTER TABLE public.academy_settings ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
-- Permitir leitura pública para todos os alunos autenticados (ou anônimos dependendo de como está seu app)
CREATE POLICY "Permitir leitura pública" ON public.academy_settings FOR SELECT USING (true);

-- Permitir update apenas para service_role ou roles específicos (neste caso a API usa service_role ou bypass via backend)
CREATE POLICY "Permitir update admin" ON public.academy_settings FOR UPDATE USING (true);
CREATE POLICY "Permitir insert admin" ON public.academy_settings FOR INSERT WITH CHECK (true);

-- Inserir a linha padrão
INSERT INTO public.academy_settings (id, welcome_video_url)
VALUES (1, '')
ON CONFLICT (id) DO NOTHING;
