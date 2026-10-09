-- ==============================================================================
-- MIGRAÇÃO: Comunidade Academy (posts, reações, comentários)
-- ==============================================================================
-- Execute no SQL Editor do Supabase

-- 1. Tabela community_posts
CREATE TABLE IF NOT EXISTS community_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE, -- NULL = post geral da comunidade
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES community_posts(id) ON DELETE CASCADE, -- para respostas/threads
  content TEXT NOT NULL,
  image_url TEXT,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

DROP TRIGGER IF EXISTS update_community_posts_modtime ON community_posts;
CREATE TRIGGER update_community_posts_modtime 
  BEFORE UPDATE ON community_posts 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_community_posts_course ON community_posts(course_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_user ON community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_parent ON community_posts(parent_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_created ON community_posts(created_at DESC);

-- 2. Tabela post_reactions
CREATE TABLE IF NOT EXISTS post_reactions (
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'like', -- like, love, celebrate, insightful
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_reactions_post ON post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user ON post_reactions(user_id);

-- 3. Tabela post_comments
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES post_comments(id) ON DELETE CASCADE, -- respostas aninhadas
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

DROP TRIGGER IF EXISTS update_post_comments_modtime ON post_comments;
CREATE TRIGGER update_post_comments_modtime 
  BEFORE UPDATE ON post_comments 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user ON post_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_parent ON post_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_created ON post_comments(created_at);

-- 4. RLS
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

-- community_posts policies
-- Alunos veem posts do curso em que estão matriculados + posts gerais
DROP POLICY IF EXISTS "Students view course posts" ON community_posts;
CREATE POLICY "Students view course posts" ON community_posts 
  FOR SELECT USING (
    course_id IS NULL OR
    EXISTS (
      SELECT 1 FROM course_enrollments 
      WHERE user_id = auth.uid() AND course_id = community_posts.course_id
    )
  );

-- Alunos podem criar posts em cursos matriculados
DROP POLICY IF EXISTS "Students create course posts" ON community_posts;
CREATE POLICY "Students create course posts" ON community_posts 
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    (course_id IS NULL OR EXISTS (
      SELECT 1 FROM course_enrollments 
      WHERE user_id = auth.uid() AND course_id = community_posts.course_id
    ))
  );

-- Autor pode editar/deletar próprio post
DROP POLICY IF EXISTS "Author manages own posts" ON community_posts;
CREATE POLICY "Author manages own posts" ON community_posts 
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Author deletes own posts" ON community_posts;
CREATE POLICY "Author deletes own posts" ON community_posts 
  FOR DELETE USING (user_id = auth.uid());

-- Admins gerenciam tudo
DROP POLICY IF EXISTS "Admins manage posts" ON community_posts;
CREATE POLICY "Admins manage posts" ON community_posts 
  FOR ALL USING (public.get_user_role() = 'ADMIN');

-- post_reactions policies
DROP POLICY IF EXISTS "Users view reactions" ON post_reactions;
CREATE POLICY "Users view reactions" ON post_reactions 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM community_posts cp
      WHERE cp.id = post_reactions.post_id
        AND (cp.course_id IS NULL OR EXISTS (
          SELECT 1 FROM course_enrollments 
          WHERE user_id = auth.uid() AND course_id = cp.course_id
        ))
    )
  );

DROP POLICY IF EXISTS "Users manage own reactions" ON post_reactions;
CREATE POLICY "Users manage own reactions" ON post_reactions 
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage reactions" ON post_reactions;
CREATE POLICY "Admins manage reactions" ON post_reactions 
  FOR ALL USING (public.get_user_role() = 'ADMIN');

-- post_comments policies
DROP POLICY IF EXISTS "Users view comments" ON post_comments;
CREATE POLICY "Users view comments" ON post_comments 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM community_posts cp
      WHERE cp.id = post_comments.post_id
        AND (cp.course_id IS NULL OR EXISTS (
          SELECT 1 FROM course_enrollments 
          WHERE user_id = auth.uid() AND course_id = cp.course_id
        ))
    )
  );

DROP POLICY IF EXISTS "Users create comments" ON post_comments;
CREATE POLICY "Users create comments" ON post_comments 
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM community_posts cp
      WHERE cp.id = post_comments.post_id
        AND (cp.course_id IS NULL OR EXISTS (
          SELECT 1 FROM course_enrollments 
          WHERE user_id = auth.uid() AND course_id = cp.course_id
        ))
    )
  );

DROP POLICY IF EXISTS "Author manages own comments" ON post_comments;
CREATE POLICY "Author manages own comments" ON post_comments 
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Author deletes own comments" ON post_comments;
CREATE POLICY "Author deletes own comments" ON post_comments 
  FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage comments" ON post_comments;
CREATE POLICY "Admins manage comments" ON post_comments 
  FOR ALL USING (public.get_user_role() = 'ADMIN');

-- 5. Função para contar reações
CREATE OR REPLACE FUNCTION get_post_reactions(p_post_id UUID)
RETURNS TABLE (type TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT pr.type, COUNT(*)::BIGINT
  FROM post_reactions pr
  WHERE pr.post_id = p_post_id
  GROUP BY pr.type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. View para feed do aluno
CREATE OR REPLACE VIEW student_community_feed AS
SELECT 
  cp.*,
  p.full_name as author_name,
  p.avatar_url as author_avatar,
  COALESCE(reaction_counts.like_count, 0) as like_count,
  COALESCE(reaction_counts.love_count, 0) as love_count,
  COALESCE(reaction_counts.celebrate_count, 0) as celebrate_count,
  COALESCE(reaction_counts.insightful_count, 0) as insightful_count,
  COALESCE(comment_count, 0) as comment_count,
  EXISTS (
    SELECT 1 FROM post_reactions pr 
    WHERE pr.post_id = cp.id AND pr.user_id = auth.uid() AND pr.type = 'like'
  ) as user_liked
FROM community_posts cp
JOIN profiles p ON p.id = cp.user_id
LEFT JOIN LATERAL (
  SELECT 
    COUNT(*) FILTER (WHERE type = 'like') as like_count,
    COUNT(*) FILTER (WHERE type = 'love') as love_count,
    COUNT(*) FILTER (WHERE type = 'celebrate') as celebrate_count,
    COUNT(*) FILTER (WHERE type = 'insightful') as insightful_count
  FROM post_reactions WHERE post_id = cp.id
) reaction_counts ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) as comment_count 
  FROM post_comments WHERE post_id = cp.id
) c ON true
WHERE cp.parent_id IS NULL -- apenas posts principais, não respostas
  AND (
    cp.course_id IS NULL OR 
    EXISTS (SELECT 1 FROM course_enrollments WHERE user_id = auth.uid() AND course_id = cp.course_id)
  )
ORDER BY cp.is_pinned DESC, cp.created_at DESC;