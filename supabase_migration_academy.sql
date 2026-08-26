-- ============================================================
-- MIGRATION: Academy — Comunidade + Anotações de Aula
-- Executar no Supabase SQL Editor (uma única vez).
-- Cria as tabelas que o app espera e não existiam no schema full.
-- ============================================================

-- 1. POSTS DA COMUNIDADE
CREATE TABLE IF NOT EXISTS community_posts (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  likes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_community_posts_user ON community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_created ON community_posts(created_at DESC);

-- 2. COMENTÁRIOS DA COMUNIDADE (moderação no admin)
CREATE TABLE IF NOT EXISTS community_comments (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  post_id uuid REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_community_comments_post ON community_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_status ON community_comments(status);

-- 3. ANOTAÇÕES DE AULA (privadas por aluno/aula)
-- unique(user_id, lesson_id) habilita UPSERT direto do app.
CREATE TABLE IF NOT EXISTS lesson_notes (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT lesson_notes_user_lesson_unique UNIQUE (user_id, lesson_id)
);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_notes ENABLE ROW LEVEL SECURITY;

-- Posts: qualquer usuário autenticado vê; só o autor insere/atualiza o próprio
CREATE POLICY "Authenticated users view posts" ON community_posts
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users insert own posts" ON community_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own posts" ON community_posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users delete own posts" ON community_posts
  FOR DELETE USING (auth.uid() = user_id);

-- Comentários: aluno cria o próprio; admin modera tudo
CREATE POLICY "Authenticated users view comments" ON community_comments
  FOR SELECT USING (auth.uid() IS NOT NULL OR public.get_user_role() = 'ADMIN');

CREATE POLICY "Users insert own comments" ON community_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage comments" ON community_comments
  FOR ALL USING (public.get_user_role() = 'ADMIN');

-- Anotações: cada aluno só acessa as próprias
CREATE POLICY "Users manage own notes" ON lesson_notes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
