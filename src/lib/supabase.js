import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── Recipes ──────────────────────────────────────────────
export async function getRecipes(category) {
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

export async function deleteRecipe(id) {
  const { error } = await supabase.from('recipes').delete().eq('id', id)
  if (error) throw error
}

// ─── Comments ─────────────────────────────────────────────
export async function getComments(recipeId) {
  const { data, error } = await supabase
    .from('comments').select('*').eq('recipe_id', recipeId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function addComment(recipeId, content, author) {
  const { data, error } = await supabase
    .from('comments').insert([{ recipe_id: recipeId, content, author }]).select().single()
  if (error) throw error
  return data
}

export async function deleteComment(id) {
  const { error } = await supabase.from('comments').delete().eq('id', id)
  if (error) throw error
}

// ─── Notifications ────────────────────────────────────────
// notification_reads stocke : notification_id + user_name + dismissed (bool)

export async function getNotifications(userName) {
  const { data: notifs, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30)
  if (error) throw error
  if (!notifs || notifs.length === 0) return []

  const { data: reads } = await supabase
    .from('notification_reads')
    .select('notification_id, dismissed')
    .eq('user_name', userName)

  const readsMap = {}
  ;(reads || []).forEach(r => { readsMap[r.notification_id] = r })

  // Filtre les notifications supprimées par cet utilisateur
  return notifs
    .filter(n => !readsMap[n.id]?.dismissed)
    .map(n => ({ ...n, read: !!readsMap[n.id] }))
}

export async function markAllNotificationsRead(userName) {
  const { data: notifs } = await supabase.from('notifications').select('id')
  const { data: reads } = await supabase
    .from('notification_reads').select('notification_id').eq('user_name', userName)

  const readIds = new Set((reads || []).map(r => r.notification_id))
  const toMark = (notifs || []).filter(n => !readIds.has(n.id))
  if (toMark.length === 0) return

  const { error } = await supabase.from('notification_reads').insert(
    toMark.map(n => ({ notification_id: n.id, user_name: userName, dismissed: false }))
  )
  if (error) throw error
}

export async function dismissNotification(notificationId, userName) {
  // Upsert : marque comme lu ET supprimé pour cet utilisateur uniquement
  const { error } = await supabase.from('notification_reads').upsert([{
    notification_id: notificationId,
    user_name: userName,
    dismissed: true
  }], { onConflict: 'notification_id,user_name' })
  if (error) throw error
}

export async function addNotification(recipeId, recipeTitle, commentAuthor, commentPreview) {
  const { error } = await supabase.from('notifications').insert([{
    recipe_id: recipeId,
    recipe_title: recipeTitle,
    comment_author: commentAuthor,
    comment_preview: commentPreview
  }])
  if (error) throw error
}

export async function addRecipeNotification(recipeId, recipeTitle, author) {
  const { error } = await supabase.from('notifications').insert([{
    recipe_id: recipeId,
    recipe_title: recipeTitle,
    comment_author: author,
    comment_preview: `✨ A ajouté la recette "${recipeTitle}"`
  }])
  if (error) throw error
}

// ─── User Activity Tracking ───────────────────────────────
export async function recordUserLogin(fullName) {
  const { error } = await supabase.from('user_activity').upsert([{
    user_name: fullName,
    last_seen: new Date().toISOString(),
  }], { onConflict: 'user_name' })
  if (error) console.error('Activity tracking error:', error)
}

export async function getUserActivity() {
  const { data, error } = await supabase
    .from('user_activity')
    .select('*')
    .order('last_seen', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getAdminStats() {
  const [recipes, comments, notifs, users] = await Promise.all([
    supabase.from('recipes').select('id, title, category, created_by, created_at'),
    supabase.from('comments').select('id, author, created_at, recipe_id'),
    supabase.from('notifications').select('id', { count: 'exact' }),
    supabase.from('user_activity').select('*').order('last_seen', { ascending: false })
  ])
  return {
    recipes: recipes.data || [],
    comments: comments.data || [],
    users: users.data || [],
    notifCount: notifs.count || 0
  }
}
