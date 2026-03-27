import { useState } from 'react'
import { extractRecipeFromText } from '../lib/claude'
import { addRecipe } from '../lib/supabase'

export default function ImportModal({ onClose, onImported }) {
  const [step, setStep] = useState(1) // 1 = saisie, 2 = prévisualisation, 3 = succès
  const [instagramUrl, setInstagramUrl] = useState('')
  const [title, setTitle] = useState('')
  const [rawText, setRawText] = useState('')
  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleImport() {
    if (!instagramUrl.trim() || !rawText.trim() || !title.trim()) {
      setError('Veuillez remplir tous les champs.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const extracted = await extractRecipeFromText({ title, instagramUrl, rawText })
      setRecipe(extracted)
      setStep(2)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setLoading(true)
    try {
      await addRecipe(recipe)
      setStep(3)
      onImported()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <button className="modal-close" onClick={onClose}>✕</button>

        {step === 1 && (
          <>
            <h2 className="modal-title">📥 Importer depuis Instagram</h2>
            <p className="modal-subtitle">
              Copiez le lien et la description de la vidéo Instagram, Claude s'occupe du reste !
            </p>

            <label className="field-label">Titre de la recette *</label>
            <input
              className="field-input"
              placeholder="Ex : Tarte aux pommes de mamie"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <label className="field-label">Lien Instagram *</label>
            <input
              className="field-input"
              placeholder="https://www.instagram.com/reel/..."
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
            />

            <label className="field-label">Description / texte de la vidéo Instagram *</label>
            <p className="field-hint">
              Ouvrez la vidéo Instagram → copiez la description ou les commentaires avec la recette → collez ici
            </p>
            <textarea
              className="field-textarea"
              placeholder="Coller ici la description Instagram avec les ingrédients et les étapes..."
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={7}
            />

            {error && <p className="field-error">{error}</p>}

            <div className="modal-actions">
              <button className="btn-secondary" onClick={onClose}>Annuler</button>
              <button className="btn-primary" onClick={handleImport} disabled={loading}>
                {loading ? '⏳ Claude analyse...' : '✨ Importer & Reformater'}
              </button>
            </div>
          </>
        )}

        {step === 2 && recipe && (
          <>
            <h2 className="modal-title">👀 Aperçu de la recette</h2>
            <p className="modal-subtitle">Vérifiez avant de sauvegarder</p>

            <div className="preview-box">
              <h3 className="preview-recipe-title">{recipe.title}</h3>
              <div className="preview-meta">
                <span className={`preview-badge ${recipe.category}`}>
                  {recipe.category === 'sucree' ? '🍰 Sucrée' : '🧂 Salée'}
                </span>
                {recipe.servings && <span className="preview-info">👥 {recipe.servings}</span>}
                {recipe.prep_time && <span className="preview-info">⏱ Prépa : {recipe.prep_time}</span>}
                {recipe.cook_time && <span className="preview-info">🔥 Cuisson : {recipe.cook_time}</span>}
              </div>

              <div className="preview-section">
                <h4>🛒 Ingrédients</h4>
                <ul>
                  {recipe.ingredients?.map((ing, i) => <li key={i}>{ing}</li>)}
                </ul>
              </div>

              <div className="preview-section">
                <h4>👩‍🍳 Étapes</h4>
                <ol>
                  {recipe.steps?.map((step, i) => <li key={i}>{step}</li>)}
                </ol>
              </div>

              {recipe.tips && (
                <div className="preview-section tips">
                  <h4>💡 Conseils</h4>
                  <p>{recipe.tips}</p>
                </div>
              )}
            </div>

            {error && <p className="field-error">{error}</p>}

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setStep(1)}>← Modifier</button>
              <button className="btn-primary" onClick={handleSave} disabled={loading}>
                {loading ? '⏳ Sauvegarde...' : '💾 Sauvegarder la recette'}
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <div className="success-screen">
            <div className="success-icon">🎉</div>
            <h2>Recette ajoutée !</h2>
            <p>La recette a bien été sauvegardée dans votre collection.</p>
            <button className="btn-primary" onClick={onClose}>Fermer</button>
          </div>
        )}
      </div>
    </div>
  )
}
