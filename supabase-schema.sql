-- ═══════════════════════════════════════════════════════════
-- RECETTES DE SYLVIE V2 — Schéma Supabase complet
-- Copiez-collez ce SQL dans l'éditeur SQL de Supabase
-- ═══════════════════════════════════════════════════════════

-- Table recettes
CREATE TABLE IF NOT EXISTS recipes (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    timestamptz DEFAULT now() NOT NULL,
  title         text NOT NULL,
  category      text NOT NULL CHECK (category IN ('sucree', 'salee')),
  servings      text,
  prep_time     text,
  cook_time     text,
  ingredients   jsonb DEFAULT '[]'::jsonb,
  steps         jsonb DEFAULT '[]'::jsonb,
  tips          text,
  instagram_url text,
  created_by    text
);

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read recipes" ON recipes FOR SELECT USING (true);
CREATE POLICY "Public insert recipes" ON recipes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete recipes" ON recipes FOR DELETE USING (true);

-- Table commentaires
CREATE TABLE IF NOT EXISTS comments (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  recipe_id  uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  content    text NOT NULL,
  author     text NOT NULL
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Public insert comments" ON comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete comments" ON comments FOR DELETE USING (true);

-- Table notifications
CREATE TABLE IF NOT EXISTS notifications (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  recipe_id  uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  recipe_title text NOT NULL,
  comment_author text NOT NULL,
  comment_preview text NOT NULL,
  read       boolean DEFAULT false
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read notifications" ON notifications FOR SELECT USING (true);
CREATE POLICY "Public insert notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update notifications" ON notifications FOR UPDATE USING (true);
CREATE POLICY "Public delete notifications" ON notifications FOR DELETE USING (true);
