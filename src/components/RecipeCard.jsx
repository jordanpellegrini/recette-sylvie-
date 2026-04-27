import { useState, useEffect, useRef } from 'react'
import CookingMode from './CookingMode'
import EditRecipeModal from './EditRecipeModal'
import NutritionPanel from './NutritionPanel'
import { useTheme } from '../lib/ThemeContext'
import { t } from '../lib/i18n'
import {
  deleteRecipe, getComments, addComment, deleteComment, addNotification,
  uploadRecipePhoto, updateRecipePhoto,
  getRatings, setRating,
  getFavorites, toggleFavorite,
  getReactions, toggleReaction,
  getRecipeTranslation, saveRecipeTranslation,
  supabase
} from '../lib/supabase'
import { addPoints } from '../lib/auth'

const TAGS = [
  { id: 'vegetarien', labelKey: 'tag_vegetarien', icon: '🥦' },
  { id: 'vegan',      labelKey: 'tag_vegan',      icon: '🌱' },
  { id: 'sans_gluten',labelKey: 'tag_sans_gluten', icon: '🌾' },
  { id: 'rapide',     labelKey: 'tag_rapide',      icon: '⚡' },
  { id: 'economique', labelKey: 'tag_economique',  icon: '💰' },
  { id: 'fait_maison',labelKey: 'tag_fait_maison', icon: '🏠' },
]

const REACTIONS = ['❤️', '😋', '🔥', '👏', '😍']

function normalize(str) {
  return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

function StarRating({ value, onChange, readonly }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="star-rating">
      {[1,2,3,4,5].map(star => (
        <button key={star} className={`star ${star <= (hover || value) ? 'active' : ''}`}
          onClick={() => !readonly && onChange && onChange(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          disabled={readonly}>★</button>
      ))}
    </div>
  )
}

export default function RecipeCard({ recipe, onDeleted, user, onPhotoUpdated }) {
  const { lang } = useTheme()
  const [expanded, setExpanded] = useState(false)
  const [cookingMode, setCookingMode] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [localRecipe, setLocalRecipe] = useState(recipe)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [editingComment, setEditingComment] = useState(null)
  const [loadingComments, setLoadingComments] = useState(false)
  const [savingComment, setSavingComment] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [localTags, setLocalTags] = useState(recipe.tags || [])
  const [localPhotoUrl, setLocalPhotoUrl] = useState(recipe.photo_url)
  const [servings, setServings] = useState(parseInt(recipe.servings) || 4)
  const baseServings = parseInt(recipe.servings) || 4
  const [translation, setTranslation] = useState(null) // traduction en cache
  const [translating, setTranslating] = useState(false)
  const [ratings, setRatings] = useState([])
  const [myRating, setMyRating] = useState(0)
  const [isFavorite, setIsFavorite] = useState(false)
  const [reactions, setReactions] = useState([])
  const [myReactions, setMyReactions] = useState([])

  const photoInputRef = useRef(null)
  const isOwner = !recipe.created_by || normalize(recipe.created_by) === normalize(user.fullName)

  useEffect(() => {
    if (!expanded) return
    loadRatings(); loadFavorite(); loadReactions()
  }, [expanded])

  useEffect(() => { if (showComments) loadComments() }, [showComments])

  async function loadRatings() {
    try {
      const data = await getRatings(recipe.id)
      setRatings(data)
      const mine = data.find(r => normalize(r.user_name) === normalize(user.fullName))
      if (mine) setMyRating(mine.rating)
    } catch (e) { console.error(e) }
  }

  async function loadFavorite() {
    try { const favs = await getFavorites(user.fullName); setIsFavorite(favs.includes(recipe.id)) }
    catch (e) { console.error(e) }
  }

  async function loadReactions() {
    try {
      const data = await getReactions(recipe.id)
      setReactions(data)
      setMyReactions(data.filter(r => normalize(r.user_name) === normalize(user.fullName)).map(r => r.emoji))
    } catch (e) { console.error(e) }
  }

  // Obtenir le contenu traduit (original ou traduit)
  function getContent() {
    if (!translation) return {
      title: localRecipe.title,
      ingredients: localRecipe.ingredients,
      steps: localRecipe.steps,
      tips: localRecipe.tips
    }
    return {
      title: translation.title || recipe.title,
      ingredients: translation.ingredients || recipe.ingredients,
      steps: translation.steps || recipe.steps,
      tips: translation.tips || recipe.tips
    }
  }

  async function handleTranslate() {
    setTranslating(true)
    try {
      // Vérifier cache Supabase
      const existing = await getRecipeTranslation(recipe.id, lang)
      if (existing) { setTranslation(existing); return }

      // Détecter la langue cible et source
      const targetLang = lang === 'fr' ? 'French' : 'English'
      const targetLangShort = lang

      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          messages: [{
            role: 'user',
            content: `Translate this recipe to ${targetLang}. Keep all quantities and measurements as-is. Return ONLY valid JSON without any backticks or markdown:
{
  "title": "translated title",
  "ingredients": ["ingredient 1 with quantity", "ingredient 2"],
  "steps": ["Step 1...", "Step 2..."],
  "tips": "translated tips or null if none"
}

Recipe to translate:
Title: ${recipe.title}
Ingredients: ${JSON.stringify(recipe.ingredients)}
Steps: ${JSON.stringify(recipe.steps)}
Tips: ${recipe.tips || 'none'}`
          }]
        })
      })
      const data = await response.json()
      const text = data.content.map(b => b.text || '').join('')
      const clean = text.replace(/\`\`\`json\s*/gi, '').replace(/\`\`\`\s*/g, '').trim()
      const translated = JSON.parse(clean)
      await saveRecipeTranslation(recipe.id, targetLangShort, translated)
      setTranslation(translated)
    } catch (e) { console.error('Translation error:', e) }
    finally { setTranslating(false) }
  }

  // Auto-traduire dans les deux sens selon la langue de l'utilisateur
  useEffect(() => {
    if (!expanded) return
    if (!translation && !translating) {
      handleTranslate()
    }
  }, [expanded, lang])

  // Reset traduction quand la langue change pour retraduire
  useEffect(() => {
    setTranslation(null)
    setCommentTranslations({})
  }, [lang])

  // Traduction des commentaires
  const [commentTranslations, setCommentTranslations] = useState({}) // { commentId: translatedText }
  const [translatingComment, setTranslatingComment] = useState(null)

  async function translateComment(commentId, content) {
    setTranslatingComment(commentId)
    try {
      const targetLang = lang === 'fr' ? 'French' : 'English'
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 300,
          messages: [{
            role: 'user',
            content: `Translate this comment to ${targetLang}. Return ONLY the translated text, nothing else:\n\n${content}`
          }]
        })
      })
      const data = await response.json()
      const translated = data.content.map(b => b.text || '').join('').trim()
      setCommentTranslations(prev => ({ ...prev, [commentId]: translated }))
    } catch (e) { console.error('Comment translation error:', e) }
    finally { setTranslatingComment(null) }
  }

  async function loadComments() {
    setLoadingComments(true)
    try { setComments(await getComments(recipe.id)) }
    catch (e) { console.error(e) }
    finally { setLoadingComments(false) }
  }

  async function handleRating(star) {
    try { await setRating(recipe.id, user.fullName, star); setMyRating(star); await loadRatings() }
    catch (e) { alert(t('error', lang) + ' ' + e.message) }
  }

  async function handleFavorite(e) {
    e.stopPropagation()
    try { const result = await toggleFavorite(recipe.id, user.fullName); setIsFavorite(result) }
    catch (e) { alert(t('error', lang) + ' ' + e.message) }
  }

  async function handleReaction(emoji) {
    try { await toggleReaction(recipe.id, user.fullName, emoji); await loadReactions() }
    catch (e) { alert(t('error', lang) + ' ' + e.message) }
  }

  async function handleAddComment() {
    if (!newComment.trim()) return
    setSavingComment(true)
    try {
      const saved = await addComment(recipe.id, newComment.trim(), user.fullName)
      setComments(prev => [...prev, saved])
      setNewComment('')
      await addNotification(recipe.id, recipe.title, user.fullName, newComment.trim().slice(0, 80))
      await addPoints(user.fullName, 2, 'comment')
    } catch (e) { alert(t('error', lang) + ' ' + e.message) }
    finally { setSavingComment(false) }
  }

  async function handleDeleteComment(id) {
    if (!confirm(t('confirm_delete_comment', lang))) return
    try { await deleteComment(id); setComments(prev => prev.filter(c => c.id !== id)) }
    catch (e) { alert(t('error', lang) + ' ' + e.message) }
  }

  async function handleEditComment(id, content) {
    try {
      const { error } = await supabase.from('comments').update({ content }).eq('id', id)
      if (error) throw error
      setComments(prev => prev.map(c => c.id === id ? { ...c, content } : c))
      setEditingComment(null)
    } catch (e) { alert(t('error', lang) + ' ' + e.message) }
  }

  async function handleDelete() {
    if (!confirm(`${t('confirm_delete_recipe', lang)} "${recipe.title}" ?`)) return
    setDeleting(true)
    try { await deleteRecipe(recipe.id); onDeleted(recipe.id) }
    catch (e) { alert(t('error', lang) + ' ' + e.message); setDeleting(false) }
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploadingPhoto(true)
    const localPreview = URL.createObjectURL(file)
    setLocalPhotoUrl(localPreview)
    try {
      const url = await uploadRecipePhoto(file, recipe.id)
      await updateRecipePhoto(recipe.id, url)
      setLocalPhotoUrl(url)
      onPhotoUpdated && onPhotoUpdated(recipe.id, url)
    } catch (err) {
      setLocalPhotoUrl(recipe.photo_url || null)
      alert(t('error', lang) + ' ' + err.message)
    }
    finally { setUploadingPhoto(false); e.target.value = '' }
  }

  async function handleTagToggle(tagId) {
    const newTags = localTags.includes(tagId) ? localTags.filter(t => t !== tagId) : [...localTags, tagId]
    setLocalTags(newTags)
    try { await supabase.from('recipes').update({ tags: newTags }).eq('id', recipe.id) }
    catch (e) { console.error(e) }
  }

  function adjustIngredient(ing) {
    if (servings === baseServings) return ing
    const multiplier = servings / baseServings
    return ing.replace(/(\d+(?:[.,]\d+)?)/g, (match) => {
      const num = parseFloat(match.replace(',', '.'))
      const adjusted = num * multiplier
      return Number.isInteger(adjusted) ? adjusted : +(adjusted.toFixed(1))
    })
  }

  function handlePrint() {
    const w = window.open('', '_blank')
    const ings = recipe.ingredients?.map(x => `<li>${adjustIngredient(x)}</li>`).join('') || ''
    const stps = recipe.steps?.map((x, i) => `<li><span class="sn">${i+1}</span>${x}</li>`).join('') || ''
    const tips = recipe.tips ? `<div class="tips"><h3>💡 ${t('tips', lang)}</h3><p>${recipe.tips}</p></div>` : ''
    const photo = localPhotoUrl ? `<img src="${localPhotoUrl}" class="print-photo" alt="${recipe.title}"/>` : ''
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${recipe.title}</title>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Lato:wght@300;400;700&display=swap" rel="stylesheet"/>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Lato',sans-serif;color:#3d2b1f;padding:2cm;max-width:800px;margin:0 auto}.header{display:flex;gap:1.5rem;align-items:flex-start;border-bottom:2px solid #dbc9b0;padding-bottom:1.5rem;margin-bottom:1.5rem}.print-photo{width:140px;height:140px;object-fit:cover;border-radius:10px;flex-shrink:0}.header-text{flex:1}.brand{font-family:'Playfair Display',serif;font-style:italic;font-size:.9rem;color:#c8956c;margin-bottom:.5rem}h1{font-family:'Playfair Display',serif;font-size:1.8rem;color:#5c3d2e;margin-bottom:.5rem}.meta{display:flex;flex-wrap:wrap;gap:1rem;font-size:.85rem;color:#7a5c4a}.grid{display:grid;grid-template-columns:1fr 1.6fr;gap:2rem}h2{font-family:'Playfair Display',serif;font-size:1.1rem;color:#8b5e3c;margin-bottom:.75rem;padding-bottom:.35rem;border-bottom:1px dashed #dbc9b0}ul{list-style:none;display:flex;flex-direction:column;gap:.4rem}ul li{font-size:.88rem;padding:.3rem .5rem;background:#fdf6ec;border-radius:4px}ul li::before{content:'• ';color:#c8956c}ol{list-style:none;display:flex;flex-direction:column;gap:.75rem}ol li{font-size:.88rem;line-height:1.6;display:flex;gap:.6rem}.sn{background:#8b5e3c;color:white;border-radius:50%;width:22px;height:22px;min-width:22px;display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:700;margin-top:1px}.tips{margin-top:1.5rem;background:#ddebd7;border-left:3px solid #5c7a4e;border-radius:0 8px 8px 0;padding:.9rem 1.1rem}.footer{margin-top:2rem;text-align:center;font-size:.75rem;color:#bca890;font-style:italic;border-top:1px solid #dbc9b0;padding-top:1rem}</style>
    </head><body>
    <div class="header">${photo}<div class="header-text"><p class="brand">✦ Cooksy ✦</p><h1>${recipe.title}</h1><div class="meta">${recipe.servings?`<span>👥 ${servings} ${t('persons_label',lang)}</span>`:''} ${recipe.prep_time?`<span>⏱ ${recipe.prep_time}</span>`:''} ${recipe.cook_time?`<span>🔥 ${recipe.cook_time}</span>`:''}</div></div></div>
    <div class="grid"><div><h2>${t('ingredients',lang)}</h2><ul>${ings}</ul></div><div><h2>${t('steps',lang)}</h2><ol>${stps}</ol></div></div>
    ${tips}<div class="footer"><p>Cooksy 🍽</p></div>
    <script>window.onload=()=>window.print()</script></body></html>`)
    w.document.close()
  }

  const avgRating = ratings.length > 0 ? (ratings.reduce((s,r)=>s+r.rating,0)/ratings.length).toFixed(1) : null
  const reactionCounts = REACTIONS.map(emoji => ({ emoji, count: reactions.filter(r=>r.emoji===emoji).length, active: myReactions.includes(emoji) }))
  const date = new Date(recipe.created_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <article className={`recipe-card ${expanded ? 'expanded' : ''}`}>
      <div className="card-header" onClick={() => setExpanded(!expanded)}>
        <div className="card-photo-wrapper">
          {localPhotoUrl ? <img src={localPhotoUrl} alt={recipe.title} className="card-photo" /> : <div className="card-photo-placeholder">🍽</div>}
        </div>
        <div className="card-header-left">
          <h3 className="card-title">{translation ? translation.title || recipe.title : recipe.title}</h3>
          <div className="card-meta">
            {recipe.servings && <span>👥 {recipe.servings}</span>}
            {recipe.prep_time && <span>⏱ {recipe.prep_time}</span>}
            {recipe.cook_time && <span>🔥 {recipe.cook_time}</span>}
            {avgRating && <span className="card-rating">⭐ {avgRating}</span>}
            {recipe.created_by && <span className="card-author">{t('by', lang)} {recipe.created_by}</span>}
          </div>
          {localTags.length > 0 && (
            <div className="card-tags">
              {localTags.map(tid => { const tag = TAGS.find(x=>x.id===tid); return tag ? <span key={tid} className="card-tag">{tag.icon} {t(tag.labelKey, lang)}</span> : null })}
            </div>
          )}
        </div>
        <div className="card-header-right">
          <button className={`btn-favorite-mini ${isFavorite ? 'active' : ''}`} onClick={handleFavorite}>{isFavorite ? '❤️' : '🤍'}</button>
          {recipe.instagram_url && (
            <a href={recipe.instagram_url} target="_blank" rel="noopener noreferrer" className="instagram-link" onClick={e => e.stopPropagation()}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </a>
          )}
          <button className="card-toggle">{expanded ? '▲' : '▼'}</button>
        </div>
      </div>

      {expanded && (
        <div className="card-body">
          {/* Réactions */}
          <div className="reactions-bar">
            {reactionCounts.map(({ emoji, count, active }) => (
              <button key={emoji} className={`reaction-btn ${active ? 'active' : ''}`} onClick={() => handleReaction(emoji)}>
                {emoji} {count > 0 && <span className="reaction-count">{count}</span>}
              </button>
            ))}
          </div>

          {/* Notes */}
          <div className="rating-section">
            <div className="rating-left">
              <span className="rating-label">{t('your_rating', lang)}</span>
              <StarRating value={myRating} onChange={handleRating} />
            </div>
            {avgRating && <div className="rating-avg"><span className="rating-avg-num">⭐ {avgRating}</span><span className="rating-avg-count">({ratings.length})</span></div>}
          </div>

          {/* Photo */}
          <div className="card-photo-section">
            {localPhotoUrl && <img src={localPhotoUrl} alt={recipe.title} className="card-photo-large" />}
            <button className="btn-upload-photo" onClick={e => { e.stopPropagation(); photoInputRef.current.click() }} disabled={uploadingPhoto}>
              {uploadingPhoto ? t('uploading', lang) : localPhotoUrl ? t('change_photo', lang) : t('upload_photo', lang)}
            </button>
            <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} onClick={e => e.stopPropagation()} />
          </div>

          {/* Tags */}
          <div className="tags-section" onClick={e => e.stopPropagation()}>
            <span className="tags-label">{t('tags_label', lang)}</span>
            <div className="tags-list">
              {TAGS.map(tag => (
                <button key={tag.id} className={`tag-btn ${localTags.includes(tag.id) ? 'active' : ''}`} onClick={() => handleTagToggle(tag.id)}>
                  {tag.icon} {t(tag.labelKey, lang)}
                </button>
              ))}
            </div>
          </div>

          {/* Portions */}
          <div className="servings-adjuster">
            <span className="servings-label">👥 {t('servings', lang)} :</span>
            <div className="servings-controls">
              <button className="servings-btn" onClick={() => setServings(s => Math.max(1, s - 1))}>−</button>
              <span className="servings-value">{servings} {t('persons_label', lang)}</span>
              <button className="servings-btn" onClick={() => setServings(s => s + 1)}>+</button>
              {servings !== baseServings && <button className="servings-reset" onClick={() => setServings(baseServings)}>↺</button>}
            </div>
          </div>

          {/* Ingrédients + Étapes */}
          {/* Bouton traduire si EN et en cours */}
          {translating && (
            <div className="translation-loading">🤖 {lang === 'en' ? 'Translating recipe...' : 'Traduction en cours...'}</div>
          )}

          <div className="recipe-sections">
            <div className="recipe-section">
              <h4>{t('ingredients', lang)} {servings !== baseServings && <span className="adjusted-label">({t('adjusted', lang)})</span>}</h4>
              <ul className="ingredients-list">{getContent().ingredients?.map((x, i) => <li key={i}>{adjustIngredient(x)}</li>)}</ul>
            </div>
            <div className="recipe-section">
              <h4>{t('steps', lang)}</h4>
              <ol className="steps-list">{getContent().steps?.map((x, i) => <li key={i}>{x}</li>)}</ol>
            </div>
          </div>

          {getContent().tips && <div className="tips-box"><h4>{t('tips', lang)}</h4><p>{getContent().tips}</p></div>}

          <NutritionPanel recipe={recipe} />

          {/* Commentaires */}
          <div className="comments-section">
            <button className="comments-toggle" onClick={() => setShowComments(!showComments)}>
              {t('comments', lang)}
              {comments.length > 0 && <span className="comments-count">{comments.length}</span>}
              <span className="comments-chevron">{showComments ? '▲' : '▼'}</span>
            </button>
            {showComments && (
              <div className="comments-body">
                {loadingComments && <p className="comments-loading">{t('loading', lang)}</p>}
                {!loadingComments && comments.length === 0 && <p className="comments-empty">{t('no_comments', lang)}</p>}
                {comments.map(c => (
                  <div key={c.id} className="comment">
                    <div className="comment-author-row">
                      <span className="comment-author">👤 {c.author}</span>
                      <span className="comment-date">{new Date(c.created_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {editingComment?.id === c.id ? (
                      <div className="comment-edit-form">
                        <textarea className="comment-input" value={editingComment.content} onChange={e => setEditingComment(prev => ({ ...prev, content: e.target.value }))} rows={2} />
                        <div className="comment-edit-actions">
                          <button className="btn-comment-save" onClick={() => handleEditComment(c.id, editingComment.content)}>{t('save_edit', lang)}</button>
                          <button className="btn-comment-cancel" onClick={() => setEditingComment(null)}>{t('cancel', lang)}</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="comment-text">{commentTranslations[c.id] || c.content}</p>
                        {commentTranslations[c.id] && <p className="comment-original">Original: {c.content}</p>}
                      </>
                    )}
                    <div className="comment-footer-row">
                      {/* Bouton traduire le commentaire */}
                      <button
                        className="comment-translate-btn"
                        onClick={() => {
                          if (commentTranslations[c.id]) {
                            setCommentTranslations(prev => { const n={...prev}; delete n[c.id]; return n })
                          } else {
                            translateComment(c.id, c.content)
                          }
                        }}
                        disabled={translatingComment === c.id}
                      >
                        {translatingComment === c.id ? '⏳' : commentTranslations[c.id] ? '↩ ' + (lang === 'fr' ? 'Original' : 'Original') : '🌐 ' + (lang === 'fr' ? 'Traduire' : 'Translate')}
                      </button>
                      {normalize(c.author) === normalize(user.fullName) && !editingComment && (
                        <div className="comment-actions">
                          <button className="comment-edit" onClick={() => setEditingComment({ id: c.id, content: c.content })}>✏️</button>
                          <button className="comment-delete" onClick={() => handleDeleteComment(c.id)}>✕</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div className="comment-form">
                  <textarea className="comment-input" placeholder={`${t('comment_placeholder', lang)} ${user.username || user.fullName}...`} value={newComment} onChange={e => setNewComment(e.target.value)} rows={3} onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleAddComment() }} />
                  <button className="btn-comment" onClick={handleAddComment} disabled={savingComment || !newComment.trim()}>{savingComment ? '...' : t('publish', lang)}</button>
                </div>
              </div>
            )}
          </div>

          <div className="card-footer">
            <button className="btn-cooking" onClick={() => setCookingMode(true)}>{t('cooking_mode', lang)}</button>
            <button className="btn-print" onClick={handlePrint}>{t('print', lang)}</button>
            {isOwner && <button className="btn-edit-recipe" onClick={() => setEditMode(true)}>✏️</button>}
            {isOwner && <button className="btn-delete" onClick={handleDelete} disabled={deleting}>{deleting ? t('deleting', lang) : '🗑'}</button>}
          </div>
        </div>
      )}
      {editMode && <EditRecipeModal 
        recipe={localRecipe} 
        onClose={() => setEditMode(false)} 
        onSaved={updated => { setLocalRecipe(updated); setEditMode(false) }}
      />}
      {cookingMode && <CookingMode 
        recipe={{
          ...recipe,
          title: translation?.title || recipe.title,
          ingredients: translation?.ingredients || recipe.ingredients,
          steps: translation?.steps || recipe.steps,
          tips: translation?.tips || recipe.tips,
        }} 
        onClose={() => setCookingMode(false)} 
      />}
    </article>
  )
}
