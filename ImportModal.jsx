import { useState, useRef } from 'react'
import { extractRecipeFromImages, extractRecipeFromText } from '../lib/claude'
import { addRecipe, addNotification, uploadRecipePhoto, updateRecipePhoto } from '../lib/supabase'
import { addPoints } from '../lib/auth'
import { CATEGORIES } from '../lib/constants'
import { useTheme } from '../lib/ThemeContext'
import { t } from '../lib/i18n'

export default function ImportModal({ onClose, onImported, user }) {
  const { lang } = useTheme()
  const [step, setStep] = useState(1)
  const [mode, setMode] = useState('image')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [rawText, setRawText] = useState('')
  const [images, setImages] = useState([])
  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Photo d'en-tête
  const [headerPhoto, setHeaderPhoto] = useState(null) // { preview, file }
  const headerPhotoRef = useRef(null)

  // Video
  const [video, setVideo] = useState(null) // { file, url }
  const [videoFrames, setVideoFrames] = useState([]) // extracted frames
  const [extractingFrames, setExtractingFrames] = useState(false)
  const [extractProgress, setExtractProgress] = useState(0)
  const videoRef = useRef(null)
  const videoInputRef = useRef(null)
  const canvasRef = useRef(null)

  // Instagram images
  const fileInputRef = useRef(null)

  function processFiles(files) {
    const remaining = 10 - images.length
    Array.from(files).slice(0, remaining).forEach(file => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = ev => { const d = ev.target.result; setImages(prev => [...prev, { preview: d, base64: d.split(',')[1], mediaType: file.type }]) }
      reader.readAsDataURL(file)
    })
  }

  function handleHeaderPhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setHeaderPhoto({ preview: ev.target.result, file })
    reader.readAsDataURL(file)
  }

  async function handleVideoUpload(e) {
    const file = e.target.files[0]
    if (!file || !file.type.startsWith('video/')) return
    const url = URL.createObjectURL(file)
    setVideo({ file, url })
    setVideoFrames([])
  }

  async function extractFrames() {
    if (!video) return
    setExtractingFrames(true)
    setExtractProgress(0)

    try {
      const vid = document.createElement('video')
      vid.src = video.url
      vid.muted = true
      vid.preload = 'metadata'

      await new Promise((res, rej) => {
        vid.onloadedmetadata = res
        vid.onerror = rej
        setTimeout(rej, 10000)
      })

      const duration = vid.duration
      const frameCount = Math.min(18, Math.max(8, Math.floor(duration / 6)))
      const frames = []
      const canvas = document.createElement('canvas')
      canvas.width = 640
      canvas.height = 360
      const ctx = canvas.getContext('2d')

      for (let i = 0; i < frameCount; i++) {
        const time = (duration / (frameCount - 1)) * i
        vid.currentTime = time

        await new Promise(res => {
          vid.onseeked = res
          setTimeout(res, 1000)
        })

        ctx.drawImage(vid, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
        const base64 = dataUrl.split(',')[1]
        frames.push({ preview: dataUrl, base64 })
        setExtractProgress(Math.round(((i + 1) / frameCount) * 100))
      }

      setVideoFrames(frames)
    } catch (e) {
      setError(lang === 'fr' ? 'Erreur extraction vidéo : ' + e.message : 'Video extraction error: ' + e.message)
    } finally {
      setExtractingFrames(false)
    }
  }

  async function handleImport() {
    if (mode === 'image' && images.length === 0) { setError('Ajoutez au moins une photo.'); return }
    if (mode === 'text' && !rawText.trim()) { setError('Collez la description.'); return }
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
      const saved = await addRecipe({ ...recipe, instagram_url: instagramUrl || null, created_by: user.fullName })

      // Upload photo d'en-tête si présente
      if (headerPhoto?.file) {
        const url = await uploadRecipePhoto(headerPhoto.file, saved.id)
        await updateRecipePhoto(saved.id, url)
        saved.photo_url = url
      }

      await addNotification(saved.id, saved.title, user.fullName, `✨ A ajouté la recette "${saved.title}"`)
      await addPoints(user.fullName, 10, 'recipe')
      setStep(3)
      setTimeout(() => onImported(recipe.category), 1500)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const cat = recipe ? CATEGORIES.find(c => c.id === recipe?.category) : null

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <button className="modal-close" onClick={onClose}>✕</button>

        {/* ── Étape 1 : Import ── */}
        {step === 1 && (
          <>
            <h2 className="modal-title">📥 {t('import_title', lang).replace('📥 ', '')}</h2>
            <p className="modal-subtitle">{t('import_subtitle', lang)}</p>

            <div className="mode-switcher">
              <button className={`mode-btn ${mode === 'image' ? 'active' : ''}`} onClick={() => setMode('image')}>{t('photos_tab', lang)}</button>
              <button className={`mode-btn ${mode === 'text' ? 'active' : ''}`} onClick={() => setMode('text')}>{t('text_tab', lang)}</button>
            </div>

            <label className="field-label">{t('instagram_url', lang)}</label>
            <input className="field-input" placeholder={t('instagram_placeholder', lang)} value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)} />

            {mode === 'image' && (
              <>
                <label className="field-label">{t('photos_label', lang)} <span className="image-counter">{images.length}/10</span></label>
                {images.length < 10 && (
                  <div className="drop-zone" onClick={() => fileInputRef.current.click()} onDrop={e => { e.preventDefault(); processFiles(e.dataTransfer.files) }} onDragOver={e => e.preventDefault()}>
                    <div className="drop-placeholder">
                      <span className="drop-icon">📷</span>
                      <p>{t('drop_photos', lang)}</p>
                      <p className="drop-hint">{t('drop_hint', lang)}</p>
                    </div>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => { processFiles(e.target.files); e.target.value = '' }} />
                {images.length > 0 && (
                  <div className="images-grid">
                    {images.map((img, i) => (
                      <div key={i} className="image-thumb">
                        <img src={img.preview} alt="" />
                        <div className="image-thumb-overlay">
                          <span className="image-thumb-num">{i + 1}</span>
                          <div className="image-thumb-actions">
                            <button className="remove-btn" onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}>✕</button>
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
                <label className="field-label">{t('text_label', lang)}</label>
                <textarea className="field-textarea" placeholder={t('text_placeholder', lang)} value={rawText} onChange={e => setRawText(e.target.value)} rows={7} />
              </>
            )}

            {error && <p className="field-error">{error}</p>}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={onClose}>{t('cancel', lang)}</button>
              <button className="btn-primary" onClick={handleImport} disabled={loading || (mode === 'video' && videoFrames.length === 0)}>
                {loading ? t('importing', lang) : t('import_btn', lang)}
              </button>
            </div>
          </>
        )}

        {/* ── Étape 2 : Aperçu + corrections ── */}
        {step === 2 && recipe && (
          <>
            <h2 className="modal-title">👀 {t('preview_title', lang).replace('👀 ', '')}</h2>
            <p className="modal-subtitle">{t('preview_subtitle', lang)}</p>

            {/* Catégorie — modifiable */}
            <label className="field-label">{t('category_label', lang)}</label>
            <div className="category-selector">
              {CATEGORIES.map(c => (
                <button
                  key={c.id}
                  className={`category-btn ${recipe.category === c.id ? 'active' : ''}`}
                  style={recipe.category === c.id ? { background: c.bg, borderColor: c.color, color: c.color } : {}}
                  onClick={() => setRecipe(prev => ({ ...prev, category: c.id }))}
                >
                  {c.icon} {c.label}
                </button>
              ))}
            </div>

            {/* Photo d'en-tête */}
            <label className="field-label">📸 {t('header_photo', lang).replace('📸 ', '')}</label>
            <p className="field-hint">{t('header_photo_hint', lang)}</p>
            <div
              className={`header-photo-drop ${headerPhoto ? 'has-photo' : ''}`}
              onClick={() => headerPhotoRef.current.click()}
            >
              {headerPhoto ? (
                <img src={headerPhoto.preview} alt="En-tête" className="header-photo-preview" />
              ) : (
                <div className="drop-placeholder">
                  <span className="drop-icon">🖼️</span>
                  <p>{t('add_photo', lang)}</p>
                  <p className="drop-hint">{t('add_photo_hint', lang)}</p>
                </div>
              )}
            </div>
            <input ref={headerPhotoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleHeaderPhoto} />
            {headerPhoto && (
              <button className="btn-change-photo" onClick={() => setHeaderPhoto(null)}>{t('change_photo_btn', lang)}</button>
            )}

            {/* Recette éditable */}
            <label className="field-label">Titre</label>
            <input
              className="field-input"
              value={recipe.title || ''}
              onChange={e => setRecipe(prev => ({ ...prev, title: e.target.value }))}
            />

            <div className="form-row">
              <div>
                <label className="field-label">Portions</label>
                <input className="field-input" value={recipe.servings || ''} onChange={e => setRecipe(prev => ({ ...prev, servings: e.target.value }))} placeholder="4 personnes" />
              </div>
              <div>
                <label className="field-label">Préparation</label>
                <input className="field-input" value={recipe.prep_time || ''} onChange={e => setRecipe(prev => ({ ...prev, prep_time: e.target.value }))} placeholder="20 min" />
              </div>
              <div>
                <label className="field-label">Cuisson</label>
                <input className="field-input" value={recipe.cook_time || ''} onChange={e => setRecipe(prev => ({ ...prev, cook_time: e.target.value }))} placeholder="30 min" />
              </div>
            </div>

            <label className="field-label">🛒 Ingrédients</label>
            <div className="dynamic-list">
              {(recipe.ingredients || []).map((ing, i) => (
                <div key={i} className="dynamic-row">
                  <input
                    className="field-input"
                    value={ing}
                    onChange={e => {
                      const arr = [...(recipe.ingredients || [])]
                      arr[i] = e.target.value
                      setRecipe(prev => ({ ...prev, ingredients: arr }))
                    }}
                  />
                  <button className="dynamic-remove" onClick={() => setRecipe(prev => ({ ...prev, ingredients: prev.ingredients.filter((_, idx) => idx !== i) }))}>✕</button>
                </div>
              ))}
              <button className="dynamic-add" onClick={() => setRecipe(prev => ({ ...prev, ingredients: [...(prev.ingredients || []), ''] }))}>{t('add_ingredient', lang)}</button>
            </div>

            <label className="field-label">👩‍🍳 Étapes</label>
            <div className="dynamic-list">
              {(recipe.steps || []).map((step, i) => (
                <div key={i} className="dynamic-row">
                  <div className="step-num-label">{i + 1}</div>
                  <textarea
                    className="field-textarea step-textarea"
                    value={step}
                    rows={2}
                    onChange={e => {
                      const arr = [...(recipe.steps || [])]
                      arr[i] = e.target.value
                      setRecipe(prev => ({ ...prev, steps: arr }))
                    }}
                  />
                  <button className="dynamic-remove" onClick={() => setRecipe(prev => ({ ...prev, steps: prev.steps.filter((_, idx) => idx !== i) }))}>✕</button>
                </div>
              ))}
              <button className="dynamic-add" onClick={() => setRecipe(prev => ({ ...prev, steps: [...(prev.steps || []), ''] }))}>{t('add_step', lang)}</button>
            </div>

            <label className="field-label">💡 Conseils (optionnel)</label>
            <textarea
              className="field-textarea"
              value={recipe.tips || ''}
              onChange={e => setRecipe(prev => ({ ...prev, tips: e.target.value }))}
              rows={2}
              placeholder={t('tips_placeholder', lang)}
            />

            {error && <p className="field-error">{error}</p>}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setStep(1)}>{t('modify', lang)}</button>
              <button className="btn-primary" onClick={handleSave} disabled={loading}>
                {loading ? t('saving', lang) : t('save', lang)}
              </button>
            </div>
          </>
        )}

        {/* ── Étape 3 : Succès ── */}
        {step === 3 && recipe && (
          <div className="success-screen">
            <div className="success-icon">🎉</div>
            <h2>{t('recipe_added', lang)}</h2>
            <p>{t('redirecting_to', lang)} <strong>{cat?.icon} {cat?.label}</strong>...</p>
          </div>
        )}
      </div>
    </div>
  )
}
