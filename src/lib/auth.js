import { supabase } from './supabase'

// ── Inscription ───────────────────────────────────────────
export async function checkUsernameAvailable(username) {
  const { data } = await supabase.from('user_profiles').select('user_name').eq('user_name', username.toLowerCase().trim()).single()
  return !data // true = available
}

export async function signUp({ email, password, username }) {
  const available = await checkUsernameAvailable(username)
  if (!available) throw new Error('USERNAME_TAKEN')

  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: { username: username.toLowerCase().trim() }
    }
  })
  if (error) throw error

  if (data.user) {
    const normUsername = username.toLowerCase().trim()
    await supabase.from('user_profiles').upsert([{
      user_name: normUsername,
      display_name: normUsername,
      email: email.trim().toLowerCase(),
      auth_id: data.user.id,
    }], { onConflict: 'user_name' })

    await supabase.from('user_activity').upsert([{
      user_name: normUsername,
      display_name: normUsername,
      last_seen: new Date().toISOString()
    }], { onConflict: 'user_name' })
  }

  return { user: data.user, username: username.toLowerCase().trim() }
}

// ── Connexion email/password ──────────────────────────────
export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password
  })
  if (error) throw error
  return data
}

// ── Connexion Google ──────────────────────────────────────
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin }
  })
  if (error) throw error
}

// ── Connexion Facebook ────────────────────────────────────
export async function signInWithFacebook() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: { redirectTo: window.location.origin }
  })
  if (error) throw error
}

// ── Mot de passe oublié ───────────────────────────────────
export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    { redirectTo: `${window.location.origin}?reset=true` }
  )
  if (error) throw error
}

// ── Déconnexion ───────────────────────────────────────────
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// ── Session courante ──────────────────────────────────────
export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

// ── Profil depuis session ─────────────────────────────────
export function buildUserFromSession(session) {
  if (!session?.user) return null
  const meta = session.user.user_metadata || {}
  const username = meta.username || session.user.email?.split('@')[0] || 'user'
  return {
    username,
    fullName: username,
    email: session.user.email,
    authId: session.user.id,
    isAdmin: false
  }
}

// ── Ajouter des points automatiquement ───────────────────
export async function addPoints(userName, points, action) {
  const normName = userName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim()
  
  const { data: profile } = await supabase.from('user_profiles').select('points, badges').eq('user_name', normName).single()
  if (!profile) return

  const currentPoints = profile.points || 0
  const newPoints = currentPoints + points

  // Calculer le niveau
  const NIVEAUX = [
    { min: 0, label: 'Apprenti' },
    { min: 50, label: 'Cuisinier' },
    { min: 150, label: 'Chef' },
    { min: 300, label: 'Master Chef' },
  ]
  const niveau = [...NIVEAUX].reverse().find(n => newPoints >= n.min)?.label || 'Apprenti'

  // Vérifier nouveaux badges
  const BADGES = [
    { id: 'first_comment', threshold: 1, type: 'comments' },
    { id: 'social', threshold: 10, type: 'comments' },
    { id: 'first_recipe', threshold: 1, type: 'recipes' },
    { id: 'five_recipes', threshold: 5, type: 'recipes' },
    { id: 'ten_recipes', threshold: 10, type: 'recipes' },
  ]

  // Stats rapides
  const [recipes, comments] = await Promise.all([
    supabase.from('recipes').select('id', { count: 'exact' }).eq('created_by', userName),
    supabase.from('comments').select('id', { count: 'exact' }).eq('author', userName),
  ])

  const currentBadges = profile.badges || []
  const newBadges = BADGES.filter(b => {
    if (currentBadges.includes(b.id)) return false
    if (b.type === 'recipes') return (recipes.count || 0) >= b.threshold
    if (b.type === 'comments') return (comments.count || 0) >= b.threshold
    return false
  }).map(b => b.id)

  await supabase.from('user_profiles').update({
    points: newPoints,
    niveau,
    badges: [...currentBadges, ...newBadges]
  }).eq('user_name', normName)

  return newBadges
}
