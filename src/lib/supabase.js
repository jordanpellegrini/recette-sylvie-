import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// ── Helpers ───────────────────────────────────────────────
function normalize(str) {
  return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim()
}

// ── Recipes ───────────────────────────────────────────────
export async function getRecipes(category = null) {
  let q = supabase.from('recipes').select('*').order('created_at', { ascending: false })
  if (category) q = q.eq('category', category)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function addRecipe(recipe) {
  const { data, error } = await supabase.from('recipes').insert([recipe]).select().single()
  if (error) throw error
  return data
}

export async function updateRecipePhoto(id, photoUrl) {
  const { error } = await supabase.from('recipes').update({ photo_url: photoUrl }).eq('id', id)
  if (error) throw error
}

export async function deleteRecipe(id) {
  const { error } = await supabase.from('recipes').delete().eq('id', id)
  if (error) throw error
}

// ── Photo upload ──────────────────────────────────────────
export async function uploadRecipePhoto(file, recipeId) {
  const ext = file.name.split('.').pop()
  // Nom unique avec timestamp pour forcer le rechargement et éviter le cache
  const path = `${recipeId}_${Date.now()}.${ext}`

  // Supprimer les anciennes photos de cette recette
  try {
    const { data: existing } = await supabase.storage.from('recipe-photos').list('', { search: recipeId })
    if (existing && existing.length > 0) {
      const toDelete = existing.filter(f => f.name.startsWith(recipeId)).map(f => f.name)
      if (toDelete.length > 0) await supabase.storage.from('recipe-photos').remove(toDelete)
    }
  } catch (e) { console.log('Cleanup error (ignoré):', e.message) }

  const { error } = await supabase.storage.from('recipe-photos').upload(path, file, { upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from('recipe-photos').getPublicUrl(path)
  // Ajouter timestamp pour forcer le rechargement dans le navigateur
  return data.publicUrl + '?t=' + Date.now()
}

// ── Comments ──────────────────────────────────────────────
export async function getComments(recipeId) {
  const { data, error } = await supabase.from('comments').select('*').eq('recipe_id', recipeId).order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function addComment(recipeId, content, author) {
  const { data, error } = await supabase.from('comments').insert([{ recipe_id: recipeId, content, author }]).select().single()
  if (error) throw error
  return data
}

export async function deleteComment(id) {
  const { error } = await supabase.from('comments').delete().eq('id', id)
  if (error) throw error
}

// ── Notifications ─────────────────────────────────────────
export async function getNotifications(userName) {
  const { data: notifs, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(30)
  if (error) throw error
  if (!notifs?.length) return []
  const { data: reads } = await supabase.from('notification_reads').select('notification_id, dismissed').eq('user_name', userName)
  const readsMap = {}
  ;(reads || []).forEach(r => { readsMap[r.notification_id] = r })
  return notifs.filter(n => !readsMap[n.id]?.dismissed).map(n => ({ ...n, read: !!readsMap[n.id] }))
}

export async function addNotification(recipeId, recipeTitle, author, preview) {
  const { error } = await supabase.from('notifications').insert([{ recipe_id: recipeId, recipe_title: recipeTitle, comment_author: author, comment_preview: preview }])
  if (error) throw error
}

export async function markAllNotificationsRead(userName) {
  const { data: notifs } = await supabase.from('notifications').select('id')
  const { data: reads } = await supabase.from('notification_reads').select('notification_id').eq('user_name', userName)
  const readIds = new Set((reads || []).map(r => r.notification_id))
  const toMark = (notifs || []).filter(n => !readIds.has(n.id))
  if (!toMark.length) return
  await supabase.from('notification_reads').insert(toMark.map(n => ({ notification_id: n.id, user_name: userName, dismissed: false })))
}

export async function dismissNotification(notificationId, userName) {
  await supabase.from('notification_reads').upsert([{ notification_id: notificationId, user_name: userName, dismissed: true }], { onConflict: 'notification_id,user_name' })
}

// ── Users ─────────────────────────────────────────────────
export async function recordUserLogin(displayName, birthMonth) {
  const userName = normalize(displayName)
  const { error } = await supabase.from('user_activity').upsert([{
    user_name: userName,
    display_name: displayName,
    birth_month: birthMonth || null,
    last_seen: new Date().toISOString()
  }], { onConflict: 'user_name' })
  if (error) console.error('Activity error:', error)
}

export async function getAllUsers() {
  const { data, error } = await supabase.from('user_activity').select('*').order('last_seen', { ascending: false })
  if (error) throw error
  return data || []
}

// Trouve un utilisateur par prénom (normalisé) + mois de naissance
export async function findUserByBirth(prenom, birthMonth) {
  const { data } = await supabase.from('user_activity').select('*')
  if (!data) return null
  const normPrenom = normalize(prenom)
  return data.find(u => {
    const parts = u.display_name.split(' ')
    const userPrenom = normalize(parts[0])
    return userPrenom === normPrenom && u.birth_month === birthMonth
  }) || null
}

export async function getAdminStats() {
  const [recipes, comments, users] = await Promise.all([
    supabase.from('recipes').select('id, title, category, created_by, created_at, photo_url'),
    supabase.from('comments').select('id, author, created_at, content'),
    supabase.from('user_activity').select('*').order('last_seen', { ascending: false })
  ])
  return { recipes: recipes.data || [], comments: comments.data || [], users: users.data || [] }
}

export async function adminDeleteUser(userName) {
  await supabase.from('user_activity').delete().eq('user_name', userName)
}

// ── Weekly Menus ──────────────────────────────────────────
export async function getWeeklyMenu(userName, weekStart) {
  const { data, error } = await supabase.from('weekly_menus').select('*').eq('user_name', normalize(userName)).eq('week_start', weekStart).single()
  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

export async function saveWeeklyMenu(userName, weekStart, menuData) {
  const { error } = await supabase.from('weekly_menus').upsert([{
    user_name: normalize(userName),
    week_start: weekStart,
    menu_data: menuData
  }], { onConflict: 'user_name,week_start' })
  if (error) throw error
}

export async function getAllMenusForWeek(weekStart) {
  const { data, error } = await supabase.from('weekly_menus').select('*').eq('week_start', weekStart)
  if (error) throw error
  return data || []
}

export async function getUserPastMenus(userName) {
  const { data, error } = await supabase.from('weekly_menus').select('*').eq('user_name', normalize(userName)).order('week_start', { ascending: false }).limit(12)
  if (error) throw error
  return data || []
}

// ── Ratings ───────────────────────────────────────────────
export async function getRatings(recipeId) {
  const { data, error } = await supabase.from('recipe_ratings').select('*').eq('recipe_id', recipeId)
  if (error) throw error
  return data || []
}

export async function setRating(recipeId, userName, rating) {
  const { error } = await supabase.from('recipe_ratings').upsert([
    { recipe_id: recipeId, user_name: normalize(userName), rating }
  ], { onConflict: 'recipe_id,user_name' })
  if (error) throw error
}

// ── Favorites ─────────────────────────────────────────────
export async function getFavorites(userName) {
  const { data, error } = await supabase.from('recipe_favorites').select('recipe_id').eq('user_name', normalize(userName))
  if (error) throw error
  return (data || []).map(f => f.recipe_id)
}

export async function toggleFavorite(recipeId, userName) {
  const userNorm = normalize(userName)
  const { data } = await supabase.from('recipe_favorites').select('id').eq('recipe_id', recipeId).eq('user_name', userNorm).single()
  if (data) {
    await supabase.from('recipe_favorites').delete().eq('recipe_id', recipeId).eq('user_name', userNorm)
    return false
  } else {
    await supabase.from('recipe_favorites').insert([{ recipe_id: recipeId, user_name: userNorm }])
    return true
  }
}

// ── Reactions ─────────────────────────────────────────────
export async function getReactions(recipeId) {
  const { data, error } = await supabase.from('recipe_reactions').select('*').eq('recipe_id', recipeId)
  if (error) throw error
  return data || []
}

export async function toggleReaction(recipeId, userName, emoji) {
  const userNorm = normalize(userName)
  const { data } = await supabase.from('recipe_reactions').select('id').eq('recipe_id', recipeId).eq('user_name', userNorm).eq('emoji', emoji).single()
  if (data) {
    await supabase.from('recipe_reactions').delete().eq('id', data.id)
    return false
  } else {
    await supabase.from('recipe_reactions').insert([{ recipe_id: recipeId, user_name: userNorm, emoji }])
    return true
  }
}

// ── Profiles ──────────────────────────────────────────────
export async function getProfile(userName) {
  const { data } = await supabase.from('user_profiles').select('*').eq('user_name', normalize(userName)).single()
  return data || null
}

export async function upsertProfile(userName, updates) {
  const { error } = await supabase.from('user_profiles').upsert([{ user_name: normalize(userName), ...updates }], { onConflict: 'user_name' })
  if (error) throw error
}

export async function uploadAvatar(file, userName) {
  const ext = file.name.split('.').pop()
  const path = `avatars/${normalize(userName)}.${ext}`
  const { error } = await supabase.storage.from('recipe-photos').upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('recipe-photos').getPublicUrl(path)
  return data.publicUrl
}

// ── Points & Badges ───────────────────────────────────────
const BADGES = [
  { id: 'first_recipe', label: 'Première recette', icon: '👩‍🍳', condition: (stats) => stats.recipes >= 1 },
  { id: 'five_recipes', label: '5 recettes', icon: '📚', condition: (stats) => stats.recipes >= 5 },
  { id: 'ten_recipes', label: '10 recettes', icon: '🏆', condition: (stats) => stats.recipes >= 10 },
  { id: 'first_comment', label: 'Premier commentaire', icon: '💬', condition: (stats) => stats.comments >= 1 },
  { id: 'chef', label: 'Chef étoilé', icon: '⭐', condition: (stats) => stats.recipes >= 20 },
  { id: 'social', label: 'Sociable', icon: '👥', condition: (stats) => stats.comments >= 10 },
]

const NIVEAUX = [
  { min: 0,   label: 'Apprenti',    icon: '🥄' },
  { min: 50,  label: 'Cuisinier',   icon: '🍳' },
  { min: 150, label: 'Chef',        icon: '👨‍🍳' },
  { min: 300, label: 'Master Chef', icon: '⭐' },
]

export function getNiveau(points) {
  return [...NIVEAUX].reverse().find(n => points >= n.min) || NIVEAUX[0]
}

export async function updateBadgesAndPoints(userName, stats) {
  const profile = await getProfile(userName) || {}
  const currentBadges = profile.badges || []
  const newBadges = BADGES.filter(b => !currentBadges.includes(b.id) && b.condition(stats)).map(b => b.id)
  const points = (profile.points || 0) + (stats.recipes * 10) + (stats.comments * 2) + (newBadges.length * 25)
  const niveau = getNiveau(points).label
  if (newBadges.length > 0 || stats.recipes > 0) {
    await upsertProfile(userName, { points, niveau, badges: [...currentBadges, ...newBadges] })
  }
  return newBadges
}

// ── Cooking log ───────────────────────────────────────────
export async function getCookingLog(limit = 20) {
  const { data, error } = await supabase.from('cooking_log').select('*, recipes(title, photo_url, category)').order('cooked_at', { ascending: false }).limit(limit)
  if (error) throw error
  return data || []
}

export async function logCooking(userName, recipeId, note = '') {
  const { error } = await supabase.from('cooking_log').insert([{ user_name: normalize(userName), recipe_id: recipeId, note }])
  if (error) throw error
}

// ── Challenges ────────────────────────────────────────────
export async function getChallenges() {
  const { data, error } = await supabase.from('cooking_challenges').select('*, challenge_entries(*)').eq('active', true).order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createChallenge(userName, title, description, ingredient, endsAt) {
  const { data, error } = await supabase.from('cooking_challenges').insert([{ created_by: normalize(userName), title, description, ingredient, ends_at: endsAt }]).select().single()
  if (error) throw error
  return data
}

export async function joinChallenge(challengeId, userName, recipeId, note) {
  const { error } = await supabase.from('challenge_entries').insert([{ challenge_id: challengeId, user_name: normalize(userName), recipe_id: recipeId, note }])
  if (error) throw error
}

export async function getUserStats(userName) {
  const normName = normalize(userName)
  const [recipes, comments, logs, favs] = await Promise.all([
    supabase.from('recipes').select('id', { count: 'exact' }).eq('created_by', userName),
    supabase.from('comments').select('id', { count: 'exact' }).eq('author', userName),
    supabase.from('cooking_log').select('id', { count: 'exact' }).eq('user_name', normName),
    supabase.from('recipe_favorites').select('id', { count: 'exact' }).eq('user_name', normName),
  ])
  return {
    recipes: recipes.count || 0,
    comments: comments.count || 0,
    cooked: logs.count || 0,
    favorites: favs.count || 0,
  }
}

// ── Challenge entry with photo ────────────────────────────
export async function uploadChallengePhoto(file, entryId) {
  const ext = file.name.split('.').pop()
  const path = `challenges/${entryId}.${ext}`
  const { error } = await supabase.storage.from('recipe-photos').upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('recipe-photos').getPublicUrl(path)
  return data.publicUrl
}

export async function deleteChallenge(id) {
  const { error } = await supabase.from('cooking_challenges').delete().eq('id', id)
  if (error) throw error
}

export async function updateChallenge(id, updates) {
  const { error } = await supabase.from('cooking_challenges').update(updates).eq('id', id)
  if (error) throw error
}

export async function getChallengeComments(challengeId) {
  const { data, error } = await supabase.from('comments')
    .select('*')
    .eq('recipe_id', challengeId)
    .order('created_at', { ascending: true })
  if (error) return []
  return data || []
}

// ── FAQ ───────────────────────────────────────────────────
export async function getFaq() {
  const { data, error } = await supabase
    .from('faq')
    .select('*')
    .eq('visible', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function submitQuestion(userName, question) {
  const { error } = await supabase
    .from('faq')
    .insert([{ user_name: normalize(userName), question }])
  if (error) throw error
}

export async function answerQuestion(id, answer) {
  const { error } = await supabase
    .from('faq')
    .update({ answer, answered_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function deleteFaq(id) {
  const { error } = await supabase.from('faq').delete().eq('id', id)
  if (error) throw error
}

export async function getAllFaqAdmin() {
  const { data, error } = await supabase
    .from('faq')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

// ── Recipe translations ───────────────────────────────────
export async function getRecipeTranslation(recipeId, lang) {
  const { data } = await supabase
    .from('recipe_translations')
    .select('*')
    .eq('recipe_id', recipeId)
    .eq('lang', lang)
    .single()
  return data || null
}

export async function saveRecipeTranslation(recipeId, lang, translation) {
  const { error } = await supabase
    .from('recipe_translations')
    .upsert([{ recipe_id: recipeId, lang, ...translation }], { onConflict: 'recipe_id,lang' })
  if (error) throw error
}

// ── Feedback ──────────────────────────────────────────────
export async function submitFeedback(userName, message, type) {
  const { error } = await supabase.from('feedback').insert([{
    user_name: normalize(userName),
    message,
    type
  }])
  if (error) throw error
}

export async function getAllFeedback() {
  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function updateFeedbackStatus(id, status) {
  const { error } = await supabase.from('feedback').update({ status }).eq('id', id)
  if (error) throw error
}

export async function deleteFeedback(id) {
  const { error } = await supabase.from('feedback').delete().eq('id', id)
  if (error) throw error
}
