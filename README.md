# 🍽 Recettes de Sylvie

Application web pour gérer et importer des recettes depuis Instagram, avec reformatage automatique par Claude IA.

## ✨ Fonctionnalités

- 📱 **Import Instagram** — Collez le lien + la description d'une vidéo Instagram
- 🤖 **Reformatage automatique** — Claude IA structure la recette proprement
- 🍰 **Onglet Sucrées / 🧂 Salées** — Recettes organisées par catégorie
- 🔍 **Recherche** — Filtrez vos recettes par nom
- 💾 **Sauvegarde Supabase** — Toutes vos recettes persistées en base de données
- 🔗 **Lien Instagram** — Accès direct à la vidéo source

---

## 🚀 Installation

### 1. Cloner & installer

```bash
git clone https://github.com/votre-username/recettes-sylvie.git
cd recettes-sylvie
npm install
```

### 2. Configurer Supabase

1. Créez un projet sur [supabase.com](https://supabase.com)
2. Allez dans **SQL Editor** → collez le contenu de `supabase-schema.sql` → Exécutez
3. Dans **Settings > API**, copiez votre `Project URL` et `anon/public key`

### 3. Configurer les variables d'environnement

```bash
cp .env.example .env
```

Éditez `.env` :

```env
VITE_SUPABASE_URL=https://VOTRE_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=VOTRE_ANON_KEY
VITE_ANTHROPIC_API_KEY=sk-ant-VOTRE_CLE_API
```

> **Clé API Anthropic** : obtenez-la sur [console.anthropic.com](https://console.anthropic.com)

### 4. Lancer en développement

```bash
npm run dev
```

---

## 🌐 Déploiement sur Vercel

### Option A — Interface Vercel (recommandé)

1. Poussez votre code sur GitHub
2. Connectez-vous sur [vercel.com](https://vercel.com)
3. **Add New Project** → importez votre repo GitHub
4. Dans **Environment Variables**, ajoutez :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_ANTHROPIC_API_KEY`
5. Cliquez **Deploy** 🎉

### Option B — CLI Vercel

```bash
npm install -g vercel
vercel login
vercel --prod
```

---

## 📁 Structure du projet

```
recettes-sylvie/
├── src/
│   ├── components/
│   │   ├── ImportModal.jsx    ← Fenêtre d'import Instagram + Claude
│   │   └── RecipeCard.jsx     ← Carte de recette pliable
│   ├── lib/
│   │   ├── supabase.js        ← Client et helpers Supabase
│   │   └── claude.js          ← Appel API Anthropic
│   ├── App.jsx                ← Page principale, onglets, recherche
│   ├── App.css                ← Styles (thème chaleureux)
│   └── main.jsx               ← Point d'entrée React
├── supabase-schema.sql        ← SQL à exécuter dans Supabase
├── .env.example               ← Template variables d'environnement
└── vite.config.js
```

---

## 🔐 Sécurité (optionnel)

Par défaut, l'application est publique (lecture + écriture ouverte). Pour la protéger :

1. Activez **Supabase Auth** (email/password ou magic link)
2. Modifiez les politiques RLS dans `supabase-schema.sql` pour n'autoriser que les utilisateurs authentifiés
3. Ajoutez une page de login dans l'app React

---

## 🛠 Technologies

- **React 18** + Vite
- **Supabase** — base de données PostgreSQL
- **Claude API** (Anthropic) — extraction et reformatage des recettes
- **Vercel** — hébergement
- Fonts : *Playfair Display* + *Lato*
