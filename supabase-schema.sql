-- ═══════════════════════════════════════════════════════════
-- RECETTES DE SYLVIE V3 — Schéma Supabase complet
-- Exécutez ce SQL dans l'éditeur SQL de Supabase
-- ═══════════════════════════════════════════════════════════

-- ── Recettes ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recipes (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    timestamptz DEFAULT now() NOT NULL,
  title         text NOT NULL,
  category      text NOT NULL CHECK (category IN ('entree','plat','dessert','boisson','apero')),
  servings      text,
  prep_time     text,
  cook_time     text,
  ingredients   jsonb DEFAULT '[]'::jsonb,
  steps         jsonb DEFAULT '[]'::jsonb,
  tips          text,
  instagram_url text,
  created_by    text,
  photo_url     text
);

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read recipes" ON recipes FOR SELECT USING (true);
CREATE POLICY "Public insert recipes" ON recipes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update recipes" ON recipes FOR UPDATE USING (true);
CREATE POLICY "Public delete recipes" ON recipes FOR DELETE USING (true);

-- ── Commentaires ─────────────────────────────────────────
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

-- ── Notifications ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      timestamptz DEFAULT now() NOT NULL,
  recipe_id       uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  recipe_title    text NOT NULL,
  comment_author  text NOT NULL,
  comment_preview text NOT NULL
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read notifications" ON notifications FOR SELECT USING (true);
CREATE POLICY "Public insert notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete notifications" ON notifications FOR DELETE USING (true);

-- ── Notification reads (par utilisateur) ─────────────────
CREATE TABLE IF NOT EXISTS notification_reads (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id uuid NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_name       text NOT NULL,
  dismissed       boolean DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(notification_id, user_name)
);

ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read notification_reads" ON notification_reads FOR SELECT USING (true);
CREATE POLICY "Public insert notification_reads" ON notification_reads FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update notification_reads" ON notification_reads FOR UPDATE USING (true);

-- ── Utilisateurs ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_activity (
  user_name    text PRIMARY KEY,
  display_name text NOT NULL,
  birth_month  text,  -- format MM/AAAA
  last_seen    timestamptz DEFAULT now()
);

ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read user_activity" ON user_activity FOR SELECT USING (true);
CREATE POLICY "Public upsert user_activity" ON user_activity FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update user_activity" ON user_activity FOR UPDATE USING (true);
CREATE POLICY "Public delete user_activity" ON user_activity FOR DELETE USING (true);

-- ── Menus de la semaine ───────────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_menus (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  user_name  text NOT NULL,
  week_start date NOT NULL,  -- lundi de la semaine (YYYY-MM-DD)
  menu_data  jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Structure menu_data:
  -- { "lundi": { "petit_dej": [{recipe_id, custom_text}], "dejeuner": [...], "gouter": [...], "apero": [...], "diner": [...] }, ... }
  UNIQUE(user_name, week_start)
);

ALTER TABLE weekly_menus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read weekly_menus" ON weekly_menus FOR SELECT USING (true);
CREATE POLICY "Public insert weekly_menus" ON weekly_menus FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update weekly_menus" ON weekly_menus FOR UPDATE USING (true);
CREATE POLICY "Public delete weekly_menus" ON weekly_menus FOR DELETE USING (true);

-- ── Supabase Storage bucket pour les photos ───────────────
-- À créer manuellement dans Storage > New Bucket
-- Nom : recipe-photos
-- Public : OUI
-- Ensuite ajouter cette policy dans Storage > Policies :
-- allow public read: (bucket_id = 'recipe-photos')
-- allow authenticated insert: (bucket_id = 'recipe-photos')
-- Ou plus simplement, activer "Allow public access" sur le bucket

-- ── Notes / étoiles ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS recipe_ratings (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  recipe_id  uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  user_name  text NOT NULL,
  rating     integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  UNIQUE(recipe_id, user_name)
);

ALTER TABLE recipe_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read ratings" ON recipe_ratings FOR SELECT USING (true);
CREATE POLICY "Public insert ratings" ON recipe_ratings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update ratings" ON recipe_ratings FOR UPDATE USING (true);
CREATE POLICY "Public delete ratings" ON recipe_ratings FOR DELETE USING (true);

-- ── Favoris ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recipe_favorites (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  recipe_id  uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  user_name  text NOT NULL,
  UNIQUE(recipe_id, user_name)
);

ALTER TABLE recipe_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read favorites" ON recipe_favorites FOR SELECT USING (true);
CREATE POLICY "Public insert favorites" ON recipe_favorites FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete favorites" ON recipe_favorites FOR DELETE USING (true);

-- ── Réactions ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recipe_reactions (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  recipe_id  uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  user_name  text NOT NULL,
  emoji      text NOT NULL,
  UNIQUE(recipe_id, user_name, emoji)
);

ALTER TABLE recipe_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read reactions" ON recipe_reactions FOR SELECT USING (true);
CREATE POLICY "Public insert reactions" ON recipe_reactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete reactions" ON recipe_reactions FOR DELETE USING (true);

-- ── Tags sur les recettes ─────────────────────────────────
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb;

-- ── Profils utilisateurs ──────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  user_name    text PRIMARY KEY REFERENCES user_activity(user_name) ON DELETE CASCADE,
  bio          text,
  specialite   text,
  ville        text,
  avatar_url   text,
  password_hash text,
  points       integer DEFAULT 0,
  niveau       text DEFAULT 'Apprenti',
  badges       jsonb DEFAULT '[]'::jsonb,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read profiles" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Public insert profiles" ON user_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update profiles" ON user_profiles FOR UPDATE USING (true);

-- ── Défis cuisine ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cooking_challenges (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at   timestamptz DEFAULT now(),
  created_by   text NOT NULL,
  title        text NOT NULL,
  description  text,
  ingredient   text,
  ends_at      timestamptz,
  active       boolean DEFAULT true
);

ALTER TABLE cooking_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read challenges" ON cooking_challenges FOR SELECT USING (true);
CREATE POLICY "Public insert challenges" ON cooking_challenges FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update challenges" ON cooking_challenges FOR UPDATE USING (true);
CREATE POLICY "Public delete challenges" ON cooking_challenges FOR DELETE USING (true);

-- ── Participations aux défis ──────────────────────────────
CREATE TABLE IF NOT EXISTS challenge_entries (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at   timestamptz DEFAULT now(),
  challenge_id uuid NOT NULL REFERENCES cooking_challenges(id) ON DELETE CASCADE,
  user_name    text NOT NULL,
  recipe_id    uuid REFERENCES recipes(id) ON DELETE SET NULL,
  note         text
);

ALTER TABLE challenge_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read entries" ON challenge_entries FOR SELECT USING (true);
CREATE POLICY "Public insert entries" ON challenge_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete entries" ON challenge_entries FOR DELETE USING (true);

-- ── Journal de cuisine (qui a cuisiné quoi) ───────────────
CREATE TABLE IF NOT EXISTS cooking_log (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  user_name  text NOT NULL,
  recipe_id  uuid REFERENCES recipes(id) ON DELETE CASCADE,
  cooked_at  date DEFAULT CURRENT_DATE,
  note       text
);

ALTER TABLE cooking_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read cooking_log" ON cooking_log FOR SELECT USING (true);
CREATE POLICY "Public insert cooking_log" ON cooking_log FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete cooking_log" ON cooking_log FOR DELETE USING (true);

-- ── Supabase Auth activé automatiquement ─────────────────
-- Dans Supabase > Authentication > Providers
-- Activer: Email (avec confirmation)
-- Optionnel: Google, Facebook

-- ── Profil lié à l'auth Supabase ─────────────────────────
-- La table user_profiles devient liée à auth.users
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS auth_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS prenom text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS nom text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS birth_month text;

-- ── Photo pour les participations aux défis ───────────────
ALTER TABLE challenge_entries ADD COLUMN IF NOT EXISTS photo_url text;

-- ── Index pour performances ───────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cooking_log_user ON cooking_log(user_name);
CREATE INDEX IF NOT EXISTS idx_recipes_created_by ON recipes(created_by);

-- ── FAQ ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS faq (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  timestamptz DEFAULT now(),
  user_name   text NOT NULL,
  question    text NOT NULL,
  answer      text,
  answered_at timestamptz,
  visible     boolean DEFAULT true
);

ALTER TABLE faq ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read faq" ON faq FOR SELECT USING (true);
CREATE POLICY "Public insert faq" ON faq FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update faq" ON faq FOR UPDATE USING (true);
CREATE POLICY "Public delete faq" ON faq FOR DELETE USING (true);

-- ── Traductions des recettes ──────────────────────────────
CREATE TABLE IF NOT EXISTS recipe_translations (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  recipe_id  uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  lang       text NOT NULL,
  title      text,
  ingredients jsonb,
  steps       jsonb,
  tips        text,
  UNIQUE(recipe_id, lang)
);

ALTER TABLE recipe_translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read translations" ON recipe_translations FOR SELECT USING (true);
CREATE POLICY "Public insert translations" ON recipe_translations FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update translations" ON recipe_translations FOR UPDATE USING (true);

-- ── Feedback (privé admin) ────────────────────────────────
CREATE TABLE IF NOT EXISTS feedback (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  user_name  text NOT NULL,
  message    text NOT NULL,
  type       text DEFAULT 'bug', -- 'bug' | 'suggestion' | 'autre'
  status     text DEFAULT 'new'  -- 'new' | 'read' | 'done'
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public insert feedback" ON feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin read feedback" ON feedback FOR SELECT USING (true);
CREATE POLICY "Admin update feedback" ON feedback FOR UPDATE USING (true);
CREATE POLICY "Admin delete feedback" ON feedback FOR DELETE USING (true);
