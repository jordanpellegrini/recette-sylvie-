-- ═══════════════════════════════════════════════════════════
-- RECETTES DE SYLVIE — Schéma Supabase
-- Copiez-collez ce SQL dans l'éditeur SQL de Supabase
-- ═══════════════════════════════════════════════════════════

CREATE TABLE recipes (
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
  instagram_url text
);

-- Active la sécurité en ligne (Row Level Security)
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Politique : tout le monde peut lire
CREATE POLICY "Public read" ON recipes
  FOR SELECT USING (true);

-- Politique : tout le monde peut insérer (à restreindre si vous voulez un auth)
CREATE POLICY "Public insert" ON recipes
  FOR INSERT WITH CHECK (true);

-- Politique : tout le monde peut supprimer (à restreindre si vous voulez un auth)
CREATE POLICY "Public delete" ON recipes
  FOR DELETE USING (true);

-- ═══════════════════════════════════════════════════════════
-- TABLE COMMENTAIRES
-- ═══════════════════════════════════════════════════════════

CREATE TABLE comments (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  recipe_id  uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  content    text NOT NULL
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read comments" ON comments
  FOR SELECT USING (true);

CREATE POLICY "Public insert comments" ON comments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public delete comments" ON comments
  FOR DELETE USING (true);
