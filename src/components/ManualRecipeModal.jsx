import { useState } from 'react'
import { addRecipe } from '../lib/supabase'
import { addRecipeNotification } from '../lib/supabase'

export default function ManualRecipeModal({ onClose, onSaved, user }) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('sucree')
  const [servings, setServings] = useState('')
  const [prepTime, setPrepTime] = useState('')
  const [cookTime, setCookTime] = useState('')
  const [ingredients, setIngredients] = useState([''])
  const [steps, setSteps] = useState([''])
  const [tips, setTips] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  // ── Ingrédients ───────────────────────────────────────
  function updateIngredient(i, val) {
    setIngredients(prev => { const a = [...prev]; a[i] = val; return a })
  }
  function addIngredient() { setIngredients(prev => [...prev, '']) }
  function removeIngredient(i) { setIngredients(prev => prev.filter((_, idx) => idx !== i)) }

  // ── Étapes ────────────────────────────────────────────
  function updateStep(i, val) {
    setSteps(prev => { const a = [...prev]; a[i] = val; return a })
  }
  function addStep() { setSteps(prev => [...prev, '']) }
  function removeStep(i) { setSteps(prev => prev.filter((_, idx) => idx !== i)) }

  async function handleSave() {
    if (!title.trim()) { setError('Le titre est obligatoire.'); return }
    const cleanIngredients = ingredients.filter(x => x.trim())
    const cleanSteps = steps.filter(x => x.trim())
    if (cleanIngredients.length === 0) { setError('Ajoutez au moins un ingrédient.'); return }
    if (cleanSteps.length === 0) { setError('Ajoutez au moins une étape.'); return }

    setError('')
    setLoading(true)
    try {
      const recipe = {
        title: title.trim(),
        category,
        servings: servings.trim() || null,
        prep_time: prepTime.trim() || null,
        cook_time: cookTime.trim() || null,
        ingredients: cleanIngredients,
        steps: cleanSteps,
        tips: tips.trim() || null,
        instagram_url: null,
        created_by: user.fullName,
      }
      const saved = await addRecipe(recipe)
      await addRecipeNotification(saved.id, saved.title, user.fullName)
      setDone(true)
      setTimeout(() => onSaved(category), 1500)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box modal-box-large">
        <button className="modal-close" onClick={onClose}>✕</button>

        {!done ? (
          <>
            <h2 className="modal-title">📝 Ajouter une recette</h2>
            <p className="modal-subtitle">Remplissez le formulaire — la recette sera partagée avec tout le monde !</p>

            {/* Titre */}
            <label className="field-label">Titre de la recette *</label>
            <input className="field-input" placeholder="Ex : Gratin dauphinois de mamie" value={title} onChange={e => setTitle(e.target.value)} />

            {/* Catégorie */}
            <label className="field-label">Catégorie *</label>
            <div className="category-selector">
              <button
                className={`category-btn ${category === 'sucree' ? 'active sucree' : ''}`}
                onClick={() => setCategory('sucree')}
              >🍰 Sucrée</button>
              <button
                className={`category-btn ${category === 'salee' ? 'active salee' : ''}`}
                onClick={() => setCategory('salee')}
              >🧂 Salée</button>
            </div>

            {/* Infos pratiques */}
            <div className="form-row">
              <div>
                <label className="field-label">Portions</label>
                <input className="field-input" placeholder="Ex : 4 personnes" value={servings} onChange={e => setServings(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Préparation</label>
                <input className="field-input" placeholder="Ex : 20 min" value={prepTime} onChange={e => setPrepTime(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Cuisson</label>
                <input className="field-input" placeholder="Ex : 45 min" value={cookTime} onChange={e => setCookTime(e.target.value)} />
              </div>
            </div>

            {/* Ingrédients */}
            <label className="field-label">🛒 Ingrédients *</label>
            <div className="dynamic-list">
              {ingredients.map((ing, i) => (
                <div key={i} className="dynamic-row">
                  <input
                    className="field-input"
                    placeholder={`Ex : 200g de farine`}
                    value={ing}
                    onChange={e => updateIngredient(i, e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addIngredient() } }}
                  />
                  {ingredients.length > 1 && (
                    <button className="dynamic-remove" onClick={() => removeIngredient(i)}>✕</button>
                  )}
                </div>
              ))}
              <button className="dynamic-add" onClick={addIngredient}>+ Ajouter un ingrédient</button>
            </div>

            {/* Étapes */}
            <label className="field-label">👩‍🍳 Étapes de préparation *</label>
            <div className="dynamic-list">
              {steps.map((step, i) => (
                <div key={i} className="dynamic-row">
                  <div className="step-num-label">{i + 1}</div>
                  <textarea
                    className="field-textarea step-textarea"
                    placeholder={`Décrivez l'étape ${i + 1}...`}
                    value={step}
                    onChange={e => updateStep(i, e.target.value)}
                    rows={2}
                  />
                  {steps.length > 1 && (
                    <button className="dynamic-remove" onClick={() => removeStep(i)}>✕</button>
                  )}
                </div>
              ))}
              <button className="dynamic-add" onClick={addStep}>+ Ajouter une étape</button>
            </div>

            {/* Conseils */}
            <label className="field-label">💡 Conseils (optionnel)</label>
            <textarea className="field-textarea" placeholder="Variantes, astuces, notes..." value={tips} onChange={e => setTips(e.target.value)} rows={3} />

            {error && <p className="field-error">{error}</p>}

            <div className="modal-actions">
              <button className="btn-secondary" onClick={onClose}>Annuler</button>
              <button className="btn-primary" onClick={handleSave} disabled={loading}>
                {loading ? '⏳ Sauvegarde...' : '💾 Publier la recette'}
              </button>
            </div>
          </>
        ) : (
          <div className="success-screen">
            <div className="success-icon">🎉</div>
            <h2>Recette publiée !</h2>
            <p>Redirection vers les recettes <strong>{category === 'sucree' ? '🍰 sucrées' : '🧂 salées'}</strong>...</p>
          </div>
        )}
      </div>
    </div>
  )
}
