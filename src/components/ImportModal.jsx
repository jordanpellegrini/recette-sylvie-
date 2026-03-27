import { useState, useRef } from 'react'
import { extractRecipeFromText, extractRecipeFromImage } from '../lib/claude'
import { addRecipe } from '../lib/supabase'

export default function ImportModal({ onClose, onImported }) {
  const [step, setStep] = useState(1)
  const [mode, setMode] = useState('image') // 'image' ou 'text'
  const [instagramUrl, setInstagramUrl] = useState('')
  const [title, setTitle] = useState('')
  const [rawText, setRawText] = useState('')
  const [imagePreview, setImagePreview] = useState(null)
  const [imageBase64, setImageBase64] = useState(null)
  const [imageMediaType, setImageMediaType] = useState(null)
  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  function handleImageChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setImageMediaType(file.type)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target.result
      setImagePreview(dataUrl)
      setImageBase64(dataUrl.split(',')[1])
    }
    reader.readAsDataURL(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      handleImageChange({ target: { files: [file] } })
    }
  }

  async function handleImport() {
    if (!title.trim()) { setError('Veuillez entrer un titre.'); return }
    if (mode === 'image' && !imageBase64) { setError("Veuillez uploader une capture d'écran."); return }
    if (mode === 'text' && !rawText.trim()) { setError('Veuillez coller la description Instagram.'); return }

    setError('')
    setLoading(true)
    try {
      const extracted = mode === 'image'
        ? await extractRecipeFromImage({ title, instagramUrl, imageBase64, mediaType: imageMediaType })
        : await extractRecipeFromText({ title, instagramUrl, rawText })
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
              Prends une capture d'écran de la recette sur Instagram — Claude lit tout automatiquement !
            </p>

            <div className="mode-switcher">
              <button className={`mode-btn ${mode === 'image' ? 'active' : ''}`} onClick={() => setMode('image')}>
                📸 Capture d'écran
              </button>
              <button className={`mode-btn ${mode === 'text' ? 'active' : ''}`} onClick={() => setMode('text')}>
                📝 Texte
              </button>
            </div>

            <label className="field-label">Titre de la recette *</label>
            <input
              className="field-input"
              placeholder="Ex : Tarte aux pommes de mamie"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <label className="field-label">Lien Instagram (optionnel)</label>
            <input
              className="field-input"
              placeholder="https://www.instagram.com/reel/..."
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
            />

            {mode === 'image' && (
              <>
                <label className="field-label">Capture d'écran Instagram *</label>
                <div
                  className={`drop-zone ${imagePreview ? 'has-image' : ''}`}
                  onClick={() => fileInputRef.current.click()}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Aperçu" className="drop-preview" />
                  ) : (
                    <div className="drop-placeholder">
                      <span className="drop-icon">📷</span>
                      <p>Clique ou glisse ta capture d'écran ici</p>
                      <p className="drop-hint">PNG, JPG, WEBP acceptés</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleImageChange}
                />
                {imagePreview && (
                  <button className="btn-change-image" onClick={() => { setImagePreview(null); setImageBase64(null) }}>
                    🔄 Changer l'image
                  </button>
                )}
              </>
            )}

            {mode === 'text' && (
              <>
                <label className="field-label">Description Instagram *</label>
                <p className="field-hint">Ouvrez Instagram → copiez la description → collez ici</p>
                <textarea
                  className="field-textarea"
                  placeholder="Coller ici la description Instagram..."
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  rows={7}
                />
              </>
            )}

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
                <ul>{recipe.ingredients?.map((ing, i) => <li key={i}>{ing}</li>)}</ul>
              </div>
              <div className="preview-section">
                <h4>👩‍🍳 Étapes</h4>
                <ol>{recipe.steps?.map((s, i) => <li key={i}>{s}</li>)}</ol>
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
