-- ==============================================================================
-- SUPABASE SCHEMA - AGNALDO GOMES ACADEMY & STORE
-- ==============================================================================
-- Execute este arquivo no SQL Editor do Supabase para criar todo o Banco de Dados.
-- ==============================================================================

-- ==========================================
-- 1. EXTENSÕES & FUNÇÕES GLOBAIS
-- ==========================================
-- Habilita geração de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Função global para atualizar a coluna updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';


-- ==========================================
-- 2. TIPOS CUSTOMIZADOS (ENUMS)
-- ==========================================
CREATE TYPE user_role AS ENUM ('ADMIN', 'PROFESSIONAL', 'STUDENT', 'CUSTOMER');
CREATE TYPE appointment_status AS ENUM ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
CREATE TYPE appointment_channel AS ENUM ('ONLINE', 'RECEPTION');
CREATE TYPE product_type AS ENUM ('LOCAL_STOCK', 'AFFILIATE_ML');
CREATE TYPE order_status AS ENUM ('PENDING_PAYMENT', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED');
CREATE TYPE shipping_type AS ENUM ('MOTOBOY', 'CORREIOS', 'JADLOG', 'RETIRADA');
CREATE TYPE course_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');


-- ==========================================
-- 3. TABELAS DE AUTENTICAÇÃO E PERFIS
-- ==========================================

-- 3.1. PROFILES (Perfis de Usuários)
-- Conecta o sistema de Auth do Supabase com os dados públicos do usuário
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role user_role NOT NULL DEFAULT 'CUSTOMER',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER update_profiles_modtime
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Gatilho para criar um profile automaticamente quando o usuário faz Sign Up no Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ==========================================
-- 4. TABELAS DA ACADEMY (CURSOS ONLINE)
-- ==========================================

-- 4.1. COURSES (Cursos)
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    price DECIMAL(10,2) DEFAULT 0.00,
    status course_status NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
CREATE TRIGGER update_courses_modtime BEFORE UPDATE ON courses FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 4.2. COURSE_ENROLLMENTS (Inscrições / Vendas de Cursos Individuais)
CREATE TABLE course_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, course_id) -- Impede que o usuário compre o mesmo curso duas vezes
);

-- 4.3. MODULES (Módulos do Curso)
CREATE TABLE modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4.4. LESSONS (Aulas)
CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    video_url TEXT, -- Link do Vimeo/YouTube/Bucket
    duration_minutes INTEGER DEFAULT 0,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4.5. LESSON_PROGRESS (Progresso do Aluno)
CREATE TABLE lesson_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, lesson_id)
);


-- ==========================================
-- 5. TABELAS DO E-COMMERCE (LOJA)
-- ==========================================

-- 5.1. PRODUCTS (Produtos)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type product_type NOT NULL DEFAULT 'AFFILIATE_ML',
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    image_url TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    -- Afiliados
    ml_link TEXT,
    -- Estoque Físico Local
    price DECIMAL(10,2),
    stock_quantity INTEGER DEFAULT 0,
    weight_kg DECIMAL(5,3) DEFAULT 0.500,
    length_cm INTEGER DEFAULT 20,
    width_cm INTEGER DEFAULT 15,
    height_cm INTEGER DEFAULT 10
);
CREATE TRIGGER update_products_modtime BEFORE UPDATE ON products FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 5.2. ORDERS (Pedidos da Loja)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    customer_cpf TEXT,
    -- Endereço
    shipping_cep TEXT NOT NULL,
    shipping_address TEXT NOT NULL,
    shipping_number TEXT NOT NULL,
    shipping_complement TEXT,
    shipping_neighborhood TEXT,
    shipping_city TEXT NOT NULL,
    shipping_state TEXT NOT NULL,
    -- Detalhes do Frete
    shipping_method shipping_type NOT NULL,
    shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tracking_code TEXT,
    -- Valores e Pagamento
    subtotal DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    status order_status NOT NULL DEFAULT 'PENDING_PAYMENT',
    payment_link TEXT,
    payment_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
CREATE TRIGGER update_orders_modtime BEFORE UPDATE ON orders FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 5.3. ORDER_ITEMS (Itens do Pedido)
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL
);



-- ==========================================
-- 6. TABELAS DO SALÃO (CRM E AGENDA)
-- ==========================================

-- 6.1. SALON_CUSTOMERS (Clientes do Salão - CRM)
CREATE TABLE salon_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Pode ser null se o cliente não tiver app
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    birth_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
CREATE TRIGGER update_salon_customers_modtime BEFORE UPDATE ON salon_customers FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 6.2. SALON_SERVICES (Serviços)
CREATE TABLE salon_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT,
    duration_minutes INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    active BOOLEAN DEFAULT true,
    visible_in_app BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
CREATE TRIGGER update_salon_services_modtime BEFORE UPDATE ON salon_services FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 6.3. SALON_PROFESSIONALS (Profissionais)
CREATE TABLE salon_professionals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    photo_url TEXT,
    specialties TEXT[],
    active BOOLEAN DEFAULT true,
    weekly_schedule JSONB, -- Ex: { "1": {"start": "09:00", "end": "19:00"} }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
CREATE TRIGGER update_salon_professionals_modtime BEFORE UPDATE ON salon_professionals FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 6.4. SALON_PROFESSIONAL_SERVICES (Vínculo)
CREATE TABLE salon_professional_services (
    professional_id UUID REFERENCES salon_professionals(id) ON DELETE CASCADE,
    service_id UUID REFERENCES salon_services(id) ON DELETE CASCADE,
    PRIMARY KEY(professional_id, service_id)
);

-- 6.5. SALON_APPOINTMENTS (Agendamentos)
CREATE TABLE salon_appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES salon_customers(id) ON DELETE RESTRICT,
    professional_id UUID REFERENCES salon_professionals(id) ON DELETE RESTRICT,
    service_id UUID REFERENCES salon_services(id) ON DELETE RESTRICT,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status appointment_status NOT NULL DEFAULT 'PENDING',
    channel appointment_channel NOT NULL DEFAULT 'ONLINE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
CREATE TRIGGER update_salon_appointments_modtime BEFORE UPDATE ON salon_appointments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 6.6. SALON_SCHEDULE_BLOCKS (Bloqueios de Agenda)
CREATE TABLE salon_schedule_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID REFERENCES salon_professionals(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- 7. RLS (ROW LEVEL SECURITY)
-- ==========================================
-- Habilitar RLS em todas as tabelas relevantes
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- 7.1. PROFILES
-- Cada usuário vê/edita apenas o próprio perfil. Admins veem todos.
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

-- 7.2. COURSES, MODULES, LESSONS
-- Todos veem cursos publicados. Admins gerenciam todos os cursos.
CREATE POLICY "Published courses are visible to everyone" ON courses FOR SELECT USING (status = 'PUBLISHED');
CREATE POLICY "Admins manage courses" ON courses FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));

CREATE POLICY "Modules visible if course is published" ON modules FOR SELECT USING (
  EXISTS (SELECT 1 FROM courses WHERE courses.id = modules.course_id AND courses.status = 'PUBLISHED')
);
CREATE POLICY "Admins manage modules" ON modules FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));

CREATE POLICY "Lessons visible if course is published" ON lessons FOR SELECT USING (
  EXISTS (SELECT 1 FROM modules JOIN courses ON courses.id = modules.course_id WHERE modules.id = lessons.module_id AND courses.status = 'PUBLISHED')
);
CREATE POLICY "Admins manage lessons" ON lessons FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- 7.3. ENROLLMENTS & PROGRESS
-- Alunos veem as próprias compras/progresso.
CREATE POLICY "Users view own enrollments" ON course_enrollments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users view own progress" ON lesson_progress FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users update own progress" ON lesson_progress FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Admins manage enrollments" ON course_enrollments FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- 7.4. PRODUCTS
-- Todos veem produtos ativos. Admins gerenciam.
CREATE POLICY "Active products visible to everyone" ON products FOR SELECT USING (active = true);
CREATE POLICY "Admins manage products" ON products FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- 7.5. ORDERS & ITEMS
-- Usuários veem próprios pedidos. Admins gerenciam.
CREATE POLICY "Users view own orders" ON orders FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "Users insert own orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins manage orders" ON orders FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));

CREATE POLICY "Users view own order items" ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.customer_id = auth.uid())
);
CREATE POLICY "Users insert own order items" ON order_items FOR INSERT WITH CHECK (true);


-- 7.6. SALON
ALTER TABLE salon_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE salon_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE salon_professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE salon_professional_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE salon_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE salon_schedule_blocks ENABLE ROW LEVEL SECURITY;

-- Serviços e Profissionais são públicos
CREATE POLICY "Salon services are visible to everyone" ON salon_services FOR SELECT USING (active = true AND visible_in_app = true);
CREATE POLICY "Salon professionals are visible to everyone" ON salon_professionals FOR SELECT USING (active = true);
CREATE POLICY "Salon professional services are visible to everyone" ON salon_professional_services FOR SELECT USING (true);

-- Agendamentos: Clientes veem os próprios
CREATE POLICY "Customers view own appointments" ON salon_appointments FOR SELECT USING (
  EXISTS (SELECT 1 FROM salon_customers WHERE salon_customers.id = salon_appointments.customer_id AND salon_customers.user_id = auth.uid())
);
CREATE POLICY "Customers insert own appointments" ON salon_appointments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM salon_customers WHERE salon_customers.id = salon_appointments.customer_id AND salon_customers.user_id = auth.uid())
);

-- Profissionais veem seus próprios agendamentos e bloqueios
CREATE POLICY "Professionals view own appointments" ON salon_appointments FOR SELECT USING (
  EXISTS (SELECT 1 FROM salon_professionals WHERE salon_professionals.id = salon_appointments.professional_id AND salon_professionals.user_id = auth.uid())
);
CREATE POLICY "Professionals view own blocks" ON salon_schedule_blocks FOR SELECT USING (
  EXISTS (SELECT 1 FROM salon_professionals WHERE salon_professionals.id = salon_schedule_blocks.professional_id AND salon_professionals.user_id = auth.uid())
);

-- Admins gerenciam tudo do Salão
CREATE POLICY "Admins manage salon_customers" ON salon_customers FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'PROFESSIONAL')));
CREATE POLICY "Admins manage salon_services" ON salon_services FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "Admins manage salon_professionals" ON salon_professionals FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "Admins manage salon_professional_services" ON salon_professional_services FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "Admins manage salon_appointments" ON salon_appointments FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'PROFESSIONAL')));
CREATE POLICY "Admins manage salon_schedule_blocks" ON salon_schedule_blocks FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'PROFESSIONAL')));
