import { useState, useEffect } from 'react'
import { deleteRecipe, getComments, addComment, deleteComment, addNotification } from '../lib/supabase'

function normalize(str) {
  return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

export default function RecipeCard({ recipe, onDeleted, user }) {
  const [expanded, setExpanded] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)
  const [savingComment, setSavingComment] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // L'utilisateur est propriétaire si c'est lui qui a créé (comparaison normalisée)
  const isOwner = !recipe.created_by || normalize(recipe.created_by) === normalize(user.fullName)

  useEffect(() => {
    if (showComments) loadComments()
  }, [showComments])

  async function loadComments() {
    setLoadingComments(true)
    try { setComments(await getComments(recipe.id)) }
    catch (e) { console.error(e) }
    finally { setLoadingComments(false) }
  }

  async function handleAddComment() {
    if (!newComment.trim()) return
    setSavingComment(true)
    try {
      const saved = await addComment(recipe.id, newComment.trim(), user.fullName)
      setComments(prev => [...prev, saved])
      setNewComment('')
      await addNotification(recipe.id, recipe.title, user.fullName, newComment.trim().slice(0, 80))
    } catch (e) { alert('Erreur : ' + e.message) }
    finally { setSavingComment(false) }
  }

  async function handleDeleteComment(id) {
    try { await deleteComment(id); setComments(prev => prev.filter(c => c.id !== id)) }
    catch (e) { alert('Erreur : ' + e.message) }
  }

  async function handleDelete() {
    if (!confirm(`Supprimer "${recipe.title}" ?`)) return
    setDeleting(true)
    try { await deleteRecipe(recipe.id); onDeleted(recipe.id) }
    catch (e) { alert('Erreur : ' + e.message); setDeleting(false) }
  }

  function handlePrint() {
    const w = window.open('', '_blank')
    const ingredients = recipe.ingredients?.map(x => `<li>${x}</li>`).join('') || ''
    const steps = recipe.steps?.map((x, i) => `<li><span class="sn">${i+1}</span>${x}</li>`).join('') || ''
    const tips = recipe.tips ? `<div class="tips"><h3>💡 Conseils</h3><p>${recipe.tips}</p></div>` : ''
    w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><title>${recipe.title}</title>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Lato:wght@300;400;700&display=swap" rel="stylesheet"/>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Lato',sans-serif;color:#3d2b1f;padding:2cm;max-width:800px;margin:0 auto}.brand{font-family:'Playfair Display',serif;font-style:italic;font-size:.9rem;color:#c8956c;text-align:center;margin-bottom:.5rem}h1{font-family:'Playfair Display',serif;font-size:2rem;color:#5c3d2e;text-align:center;margin-bottom:.75rem}.meta{display:flex;justify-content:center;gap:1.5rem;font-size:.85rem;color:#7a5c4a;margin-bottom:1.5rem;padding-bottom:1.5rem;border-bottom:2px solid #dbc9b0}.grid{display:grid;grid-template-columns:1fr 1.6fr;gap:2rem}h2{font-family:'Playfair Display',serif;font-size:1.1rem;color:#8b5e3c;margin-bottom:.75rem;padding-bottom:.35rem;border-bottom:1px dashed #dbc9b0}ul{list-style:none;display:flex;flex-direction:column;gap:.4rem}ul li{font-size:.88rem;padding:.3rem .5rem;background:#fdf6ec;border-radius:4px}ul li::before{content:'• ';color:#c8956c}ol{list-style:none;display:flex;flex-direction:column;gap:.75rem}ol li{font-size:.88rem;line-height:1.6;display:flex;gap:.6rem}.sn{background:#8b5e3c;color:white;border-radius:50%;width:22px;height:22px;min-width:22px;display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:700;margin-top:1px}.tips{margin-top:1.5rem;background:#ddebd7;border-left:3px solid #5c7a4e;border-radius:0 8px 8px 0;padding:.9rem 1.1rem}.tips h3{font-family:'Playfair Display',serif;color:#5c7a4e;margin-bottom:.4rem}.tips p{font-size:.85rem;line-height:1.5}.footer{margin-top:2rem;padding-top:1rem;border-top:1px solid #dbc9b0;text-align:center;font-size:.75rem;color:#bca890;font-style:italic}</style>
    </head><body>
    <p class="brand">✦ Recettes de Sylvie ✦</p>
    <h1>${recipe.title}</h1>
    <div class="meta">${recipe.servings?`<span>👥 ${recipe.servings}</span>`:''} ${recipe.prep_time?`<span>⏱ ${recipe.prep_time}</span>`:''} ${recipe.cook_time?`<span>🔥 ${recipe.cook_time}</span>`:''}</div>
    <div class="grid"><div><h2>🛒 Ingrédients</h2><ul>${ingredients}</ul></div><div><h2>👩‍🍳 Préparation</h2><ol>${steps}</ol></div></div>
    ${tips}
    <div class="footer"><p>Imprimé depuis Recettes de Sylvie 🍽</p></div>
    <script>window.onload=()=>window.print()</script></body></html>`)
    w.document.close()
  }

  const date = new Date(recipe.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <article className={`recipe-card ${expanded ? 'expanded' : ''}`}>
      <div className="card-header" onClick={() => setExpanded(!expanded)}>
        <div className="card-header-left">
          <h3 className="card-title">{recipe.title}</h3>
          <div className="card-meta">
            {recipe.servings && <span>👥 {recipe.servings}</span>}
            {recipe.prep_time && <span>⏱ {recipe.prep_time}</span>}
            {recipe.cook_time && <span>🔥 {recipe.cook_time}</span>}
            {recipe.created_by && <span className="card-author">par {recipe.created_by}</span>}
            <span className="card-date">{date}</span>
          </div>
        </div>
        <div className="card-header-right">
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
          <div className="recipe-sections">
            <div className="recipe-section">
              <h4>🛒 Ingrédients</h4>
              <ul className="ingredients-list">{recipe.ingredients?.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
            <div className="recipe-section">
              <h4>👩‍🍳 Préparation</h4>
              <ol className="steps-list">{recipe.steps?.map((x, i) => <li key={i}>{x}</li>)}</ol>
            </div>
          </div>

          {recipe.tips && (
            <div className="tips-box">
              <h4>💡 Conseils de Sylvie</h4>
              <p>{recipe.tips}</p>
            </div>
          )}

          <div className="comments-section">
            <button className="comments-toggle" onClick={() => setShowComments(!showComments)}>
              💬 Commentaires
              {comments.length > 0 && <span className="comments-count">{comments.length}</span>}
              <span className="comments-chevron">{showComments ? '▲' : '▼'}</span>
            </button>

            {showComments && (
              <div className="comments-body">
                {loadingComments && <p className="comments-loading">Chargement...</p>}
                {!loadingComments && comments.length === 0 && <p className="comments-empty">Aucun commentaire. Soyez la première ! 😊</p>}

                {comments.map(c => (
                  <div key={c.id} className="comment">
                    <div className="comment-author-row">
                      <span className="comment-author">👤 {c.author}</span>
                      <span className="comment-date">{new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="comment-text">{c.content}</p>
                    {/* Supprimer seulement ses propres commentaires */}
                    {normalize(c.author) === normalize(user.fullName) && (
                      <button className="comment-delete" onClick={() => handleDeleteComment(c.id)}>✕</button>
                    )}
                  </div>
                ))}

                <div className="comment-form">
                  <textarea
                    className="comment-input"
                    placeholder={`Commenter en tant que ${user.prenom}...`}
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    rows={3}
                    onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleAddComment() }}
                  />
                  <button className="btn-comment" onClick={handleAddComment} disabled={savingComment || !newComment.trim()}>
                    {savingComment ? '...' : '📝 Publier'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="card-footer">
            <button className="btn-print" onClick={handlePrint}>🖨️ Imprimer</button>
            {/* Supprimer seulement ses propres recettes */}
            {isOwner && (
              <button className="btn-delete" onClick={handleDelete} disabled={deleting}>
                {deleting ? '...' : '🗑 Supprimer'}
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  )
}
