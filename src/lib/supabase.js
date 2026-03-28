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
export async function getNotifications() {
  const { data, error } = await supabase
    .from('notifications').select('*').order('created_at', { ascending: false }).limit(20)
  if (error) throw error
  return data || []
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

export async function markAllNotificationsRead() {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('read', false)
  if (error) throw error
}

export async function clearNotifications() {
  const { error } = await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (error) throw error
}
