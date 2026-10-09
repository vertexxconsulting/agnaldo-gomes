-- Tabelas para Cursos VIP (Presenciais) e Agendamentos

-- 1. Configuracao da Academy (WhatsApp)
CREATE TABLE IF NOT EXISTS academy_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    whatsapp_number TEXT,
    welcome_video_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Caso a tabela já exista, garantimos que a coluna whatsapp_number seja adicionada
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='academy_settings' AND column_name='whatsapp_number') THEN
        ALTER TABLE academy_settings ADD COLUMN whatsapp_number TEXT;
    END IF;
END
$$;

-- Inserir config padrão se não existir
INSERT INTO academy_settings (id, whatsapp_number) 
VALUES (1, '5511999999999') 
ON CONFLICT (id) DO NOTHING;

-- 2. Cursos VIP
CREATE TABLE IF NOT EXISTS academy_vip_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    content_topics JSONB DEFAULT '[]'::jsonb,
    investment_options JSONB DEFAULT '[]'::jsonb,
    format_text TEXT,
    certificate_included BOOLEAN DEFAULT true,
    thumbnail_url TEXT,
    is_featured BOOLEAN DEFAULT false,
    price DECIMAL(10,2) DEFAULT 0.00,
    original_price DECIMAL(10,2) DEFAULT 0.00,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Agenda dos Cursos VIP
CREATE TABLE IF NOT EXISTS academy_vip_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES academy_vip_courses(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    time TEXT,
    location TEXT,
    available_spots INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Inserindo alguns cursos de exemplo baseados no que estava fixo no código:
INSERT INTO academy_vip_courses (
    title, description, format_text, certificate_included, is_featured, price, original_price, is_published, content_topics, investment_options
) VALUES (
    'Formação em Cortes', 
    'Cortar cabelo é pura matemática. Deep dive em cortes estonteantes e precisão com domínio de ângulos.',
    'Presencial · 24h',
    true,
    true,
    4800,
    6000,
    true,
    '["Cabelo longo reto e curto", "Pixie Cut, Butterfly, Bob Cut, Undercut e Shaggy", "Técnica e precisão em ângulos", "Como escolher o corte ideal para cada rosto", "Transição entre estilos e manutenção do corte"]'::jsonb,
    '[{"label": "VIP · 1 pessoa", "valor": "R$ 3.800"}, {"label": "VIP · 3 pessoas", "valor": "R$ 2.800"}, {"label": "Curso 24h (2h/semana)", "valor": "R$ 4.800"}]'::jsonb
);

INSERT INTO academy_vip_courses (
    title, description, format_text, certificate_included, is_featured, price, original_price, is_published, content_topics
) VALUES (
    'Técnica de Lavatório', 
    'Transforme o momento do lavatório em uma experiência única e memorável para o cliente.',
    'Presencial · 6h',
    true,
    false,
    1200,
    1500,
    true,
    '["Massagem capilar relaxante", "Prevenção de lesões e ergonomia", "Experiência de luxo e conexão com o cliente", "Tratamentos capilares específicos", "Técnicas de lavagem"]'::jsonb
);

INSERT INTO academy_vip_courses (
    title, description, format_text, certificate_included, is_featured, price, original_price, is_published, content_topics
) VALUES (
    'Colorimetria Avançada', 
    'Domine a teoria das cores e crie tons perfeitos para cada cliente, evitando danos aos fios.',
    'Presencial · 6h',
    true,
    false,
    1500,
    2000,
    true,
    '["Teoria das cores e identificação de tons", "Mistura de pigmentos", "Técnicas de descoloração", "Correção de cor e manutenção", "Cuidados pós-coloração"]'::jsonb
);

INSERT INTO academy_vip_courses (
    title, description, format_text, certificate_included, is_featured, price, original_price, is_published, content_topics
) VALUES (
    'Escova Perfeita', 
    'Domine escova beach wave e enrolada, transformando cada escova em uma obra-prima para o seu cliente.',
    'Presencial · 6h',
    true,
    false,
    1300,
    1700,
    true,
    '["Escova Beach Waver e escova enrolada", "Técnicas modernas de escovação", "Primeiro para cada tipo de cabelo", "Precisão e criatividade", "Penteados incríveis"]'::jsonb
);
