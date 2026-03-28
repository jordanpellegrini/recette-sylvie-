import { useState, useRef } from 'react'
import { extractRecipeFromImages, extractRecipeFromText } from '../lib/claude'
import { addRecipe } from '../lib/supabase'

export default function ImportModal({ onClose, onImported, user }) {
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
    Array.from(files).slice(0, remaining).forEach(file => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = ev => {
        const dataUrl = ev.target.result
        setImages(prev => [...prev, { preview: dataUrl, base64: dataUrl.split(',')[1], mediaType: file.type }])
      }
      reader.readAsDataURL(file)
    })
  }

  function handleFileChange(e) { processFiles(e.target.files); e.target.value = '' }
  function handleDrop(e) { e.preventDefault(); processFiles(e.dataTransfer.files) }
  function removeImage(i) { setImages(prev => prev.filter((_, idx) => idx !== i)) }
  function moveImage(from, to) {
    setImages(prev => { const a = [...prev]; const [x] = a.splice(from, 1); a.splice(to, 0, x); return a })
  }

  async function handleImport() {
    if (mode === 'image' && images.length === 0) { setError('Ajoutez au moins une photo.'); return }
    if (mode === 'text' && !rawText.trim()) { setError('Collez la description Instagram.'); return }
    setError(''); setLoading(true)
    try {
      const extracted = mode === 'image'
        ? await extractRecipeFromImages({ instagramUrl, images })
        : await extractRecipeFromText({ instagramUrl, rawText })
      setRecipe(extracted)
      setStep(2)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function handleSave() {
    setLoading(true)
    try {
      await addRecipe({ ...recipe, created_by: user.fullName })
      setStep(3); onImported()
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <button className="modal-close" onClick={onClose}>✕</button>

        {step === 1 && (
          <>
            <h2 className="modal-title">📥 Importer une recette</h2>
            <p className="modal-subtitle">Jusqu'à 10 photos — Claude trouve le titre et structure tout automatiquement !</p>

            <div className="mode-switcher">
              <button className={`mode-btn ${mode === 'image' ? 'active' : ''}`} onClick={() => setMode('image')}>📸 Photos</button>
              <button className={`mode-btn ${mode === 'text' ? 'active' : ''}`} onClick={() => setMode('text')}>📝 Texte</button>
            </div>

            <label className="field-label">Lien Instagram (optionnel)</label>
            <input className="field-input" placeholder="https://www.instagram.com/reel/..." value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)} />

            {mode === 'image' && (
              <>
                <label className="field-label">Photos <span className="image-counter">{images.length}/10</span></label>
                {images.length < 10 && (
                  <div className="drop-zone" onClick={() => fileInputRef.current.click()} onDrop={handleDrop} onDragOver={e => e.preventDefault()}>
                    <div className="drop-placeholder">
                      <span className="drop-icon">📷</span>
                      <p>Clique ou glisse tes photos ici</p>
                      <p className="drop-hint">{images.length === 0 ? "Jusqu'à 10 photos — PNG, JPG, WEBP" : `${10 - images.length} photo(s) de plus possible`}</p>
                    </div>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFileChange} />
                {images.length > 0 && (
                  <div className="images-grid">
                    {images.map((img, i) => (
                      <div key={i} className="image-thumb">
                        <img src={img.preview} alt={`Photo ${i + 1}`} />
                        <div className="image-thumb-overlay">
                          <span className="image-thumb-num">{i + 1}</span>
                          <div className="image-thumb-actions">
                            {i > 0 && <button onClick={() => moveImage(i, i - 1)}>◀</button>}
                            {i < images.length - 1 && <button onClick={() => moveImage(i, i + 1)}>▶</button>}
                            <button className="remove-btn" onClick={() => removeImage(i)}>✕</button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {images.length < 10 && (
                      <div className="image-add-btn" onClick={() => fileInputRef.current.click()}>
                        <span>+</span><p>Ajouter</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {mode === 'text' && (
              <>
                <label className="field-label">Description Instagram</label>
                <textarea className="field-textarea" placeholder="Collez la description ici..." value={rawText} onChange={e => setRawText(e.target.value)} rows={7} />
              </>
            )}

            {error && <p className="field-error">{error}</p>}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={onClose}>Annuler</button>
              <button className="btn-primary" onClick={handleImport} disabled={loading}>
                {loading ? `⏳ Claude analyse...` : '✨ Importer & Reformater'}
              </button>
            </div>
          </>
        )}

        {step === 2 && recipe && (
          <>
            <h2 className="modal-title">👀 Aperçu</h2>
            <div className="preview-box">
              <h3 className="preview-recipe-title">{recipe.title}</h3>
              <div className="preview-meta">
                <span className={`preview-badge ${recipe.category}`}>{recipe.category === 'sucree' ? '🍰 Sucrée' : '🧂 Salée'}</span>
                {recipe.servings && <span className="preview-info">👥 {recipe.servings}</span>}
                {recipe.prep_time && <span className="preview-info">⏱ {recipe.prep_time}</span>}
                {recipe.cook_time && <span className="preview-info">🔥 {recipe.cook_time}</span>}
              </div>
              <div className="preview-section"><h4>🛒 Ingrédients</h4><ul>{recipe.ingredients?.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
              <div className="preview-section"><h4>👩‍🍳 Étapes</h4><ol>{recipe.steps?.map((x, i) => <li key={i}>{x}</li>)}</ol></div>
              {recipe.tips && <div className="preview-section tips"><h4>💡 Conseils</h4><p>{recipe.tips}</p></div>}
            </div>
            {error && <p className="field-error">{error}</p>}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setStep(1)}>← Modifier</button>
              <button className="btn-primary" onClick={handleSave} disabled={loading}>{loading ? '⏳...' : '💾 Sauvegarder'}</button>
            </div>
          </>
        )}

        {step === 3 && (
          <div className="success-screen">
            <div className="success-icon">🎉</div>
            <h2>Recette ajoutée !</h2>
            <button className="btn-primary" onClick={onClose}>Fermer</button>
          </div>
        )}
      </div>
    </div>
  )
}
