import { useState } from 'react'
import { deleteRecipe } from '../lib/supabase'

export default function RecipeCard({ recipe, onDeleted }) {
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm(`Supprimer "${recipe.title}" ?`)) return
    setDeleting(true)
    try {
      await deleteRecipe(recipe.id)
      onDeleted(recipe.id)
    } catch (e) {
      alert('Erreur : ' + e.message)
    } finally {
      setDeleting(false)
    }
  }

  const date = new Date(recipe.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric'
  })

  return (
    <article className={`recipe-card ${expanded ? 'expanded' : ''}`}>
      <div className="card-header" onClick={() => setExpanded(!expanded)}>
        <div className="card-header-left">
          <h3 className="card-title">{recipe.title}</h3>
          <div className="card-meta">
            {recipe.servings && <span>👥 {recipe.servings}</span>}
            {recipe.prep_time && <span>⏱ {recipe.prep_time}</span>}
            {recipe.cook_time && <span>🔥 {recipe.cook_time}</span>}
            <span className="card-date">{date}</span>
          </div>
        </div>
        <div className="card-header-right">
          {recipe.instagram_url && (
            <a
              href={recipe.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="instagram-link"
              onClick={(e) => e.stopPropagation()}
              title="Voir sur Instagram"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
          )}
          <button className="card-toggle" aria-label={expanded ? 'Réduire' : 'Voir la recette'}>
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="card-body">
          <div className="recipe-sections">
            <div className="recipe-section">
              <h4>🛒 Ingrédients</h4>
              <ul className="ingredients-list">
                {recipe.ingredients?.map((ing, i) => (
                  <li key={i}>{ing}</li>
                ))}
              </ul>
            </div>

            <div className="recipe-section">
              <h4>👩‍🍳 Préparation</h4>
              <ol className="steps-list">
                {recipe.steps?.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          </div>

          {recipe.tips && (
            <div className="tips-box">
              <h4>💡 Conseils de Sylvie</h4>
              <p>{recipe.tips}</p>
            </div>
          )}

          <div className="card-footer">
            <button
              className="btn-delete"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? '...' : '🗑 Supprimer'}
            </button>
          </div>
        </div>
      )}
    </article>
  )
}
