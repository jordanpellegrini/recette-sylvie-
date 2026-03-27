import { useState, useRef } from 'react'
import { extractRecipeFromImages, extractRecipeFromText } from '../lib/claude'
import { addRecipe } from '../lib/supabase'

export default function ImportModal({ onClose, onImported }) {
  const [step, setStep] = useState(1)
  const [mode, setMode] = useState('image')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [rawText, setRawText] = useState('')
  const [images, setImages] = useState([])
  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  function processFiles(files) {
    const remaining = 10 - images.length
    const toProcess = Array.from(files).slice(0, remaining)
    toProcess.forEach((file) => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        const dataUrl = ev.target.result
        setImages((prev) => [
          ...prev,
          { preview: dataUrl, base64: dataUrl.split(',')[1], mediaType: file.type },
        ])
      }
      reader.readAsDataURL(file)
    })
  }

  function handleFileChange(e) {
    processFiles(e.target.files)
    e.target.value = ''
  }

  function handleDrop(e) {
    e.preventDefault()
    processFiles(e.dataTransfer.files)
  }

  function removeImage(index) {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  function moveImage(from, to) {
    setImages((prev) => {
      const arr = [...prev]
      const [item] = arr.splice(from, 1)
      arr.splice(to, 0, item)
      return arr
    })
  }

  async function handleImport() {
    if (mode === 'image' && images.length === 0) {
      setError('Veuillez uploader au moins une photo.')
      return
    }
    if (mode === 'text' && !rawText.trim()) {
      setError('Veuillez coller la description Instagram.')
      return
    }

    setError('')
    setLoading(true)
    try {
      const extracted = mode === 'image'
        ? await extractRecipeFromImages({ instagramUrl, images })
        : await extractRecipeFromText({ instagramUrl, rawText })
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
              Uploade jusqu'à <strong>10 captures d'écran</strong> — Claude trouve le titre et reconstruit la recette automatiquement !
            </p>

            <div className="mode-switcher">
              <button className={`mode-btn ${mode === 'image' ? 'active' : ''}`} onClick={() => setMode('image')}>
                📸 Photos / Captures
              </button>
              <button className={`mode-btn ${mode === 'text' ? 'active' : ''}`} onClick={() => setMode('text')}>
                📝 Texte
              </button>
            </div>

            <label className="field-label">Lien Instagram (optionnel)</label>
            <input
              className="field-input"
              placeholder="https://www.instagram.com/reel/..."
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
            />

            {mode === 'image' && (
              <>
                <label className="field-label">
                  Photos / Captures d'écran *
                  <span className="image-counter">{images.length}/10</span>
                </label>

                {images.length < 10 && (
                  <div
                    className="drop-zone"
                    onClick={() => fileInputRef.current.click()}
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <div className="drop-placeholder">
                      <span className="drop-icon">📷</span>
                      <p>Clique ou glisse tes photos ici</p>
                      <p className="drop-hint">
                        {images.length === 0
                          ? "Jusqu'à 10 photos — PNG, JPG, WEBP"
                          : `${10 - images.length} photo(s) supplémentaire(s) possible(s)`}
                      </p>
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />

                {images.length > 0 && (
                  <div className="images-grid">
                    {images.map((img, i) => (
                      <div key={i} className="image-thumb">
                        <img src={img.preview} alt={`Photo ${i + 1}`} />
                        <div className="image-thumb-overlay">
                          <span className="image-thumb-num">{i + 1}</span>
                          <div className="image-thumb-actions">
                            {i > 0 && (
                              <button onClick={() => moveImage(i, i - 1)} title="Monter">◀</button>
                            )}
                            {i < images.length - 1 && (
                              <button onClick={() => moveImage(i, i + 1)} title="Descendre">▶</button>
                            )}
                            <button className="remove-btn" onClick={() => removeImage(i)} title="Supprimer">✕</button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {images.length < 10 && (
                      <div className="image-add-btn" onClick={() => fileInputRef.current.click()}>
                        <span>+</span>
                        <p>Ajouter</p>
                      </div>
                    )}
                  </div>
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
                {loading
                  ? `⏳ Claude analyse${images.length > 1 ? ` ${images.length} photos` : ''}...`
                  : '✨ Importer & Reformater'}
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
