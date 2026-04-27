import { useState, useRef } from 'react'
import { addRecipe, addNotification, uploadRecipePhoto, updateRecipePhoto } from '../lib/supabase'
import { detectTags } from '../lib/claude'
import { addPoints } from '../lib/auth'
import { CATEGORIES } from '../lib/constants'
import { useTheme } from '../lib/ThemeContext'
import { t } from '../lib/i18n'

export default function ManualRecipeModal({ onClose, onSaved, user }) {
  const { lang } = useTheme()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('plat')
  const [servings, setServings] = useState('')
  const [prepTime, setPrepTime] = useState('')
  const [cookTime, setCookTime] = useState('')
  const [ingredients, setIngredients] = useState([''])
  const [steps, setSteps] = useState([''])
  const [tips, setTips] = useState('')
  const [headerPhoto, setHeaderPhoto] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const photoRef = useRef(null)

  function updateIngredient(i, val) { setIngredients(prev => { const a=[...prev]; a[i]=val; return a }) }
  function addIngredient() { setIngredients(prev => [...prev, '']) }
  function removeIngredient(i) { setIngredients(prev => prev.filter((_,idx) => idx!==i)) }
  function updateStep(i, val) { setSteps(prev => { const a=[...prev]; a[i]=val; return a }) }
  function addStep() { setSteps(prev => [...prev, '']) }
  function removeStep(i) { setSteps(prev => prev.filter((_,idx) => idx!==i)) }

  function handlePhotoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setHeaderPhoto({ preview: ev.target.result, file })
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    if (!title.trim()) { setError(lang === 'fr' ? 'Le titre est obligatoire.' : 'Title is required.'); return }
    const cleanIngredients = ingredients.filter(x => x.trim())
    const cleanSteps = steps.filter(x => x.trim())
    if (cleanIngredients.length === 0) { setError(lang === 'fr' ? 'Ajoutez au moins un ingrédient.' : 'Add at least one ingredient.'); return }
    if (cleanSteps.length === 0) { setError(lang === 'fr' ? 'Ajoutez au moins une étape.' : 'Add at least one step.'); return }
    setError(''); setLoading(true)
    try {
      // Détection automatique des tags
      const autoTags = await detectTags(cleanIngredients, cleanSteps, tips)
      const saved = await addRecipe({
        title: title.trim(), category,
        servings: servings.trim() || null,
        prep_time: prepTime.trim() || null,
        cook_time: cookTime.trim() || null,
        ingredients: cleanIngredients,
        steps: cleanSteps,
        tips: tips.trim() || null,
        tags: autoTags,
        created_by: user.fullName
      })
      if (headerPhoto?.file) {
        const url = await uploadRecipePhoto(headerPhoto.file, saved.id)
        await updateRecipePhoto(saved.id, url)
      }
      await addNotification(saved.id, saved.title, user.fullName, `✨ Added "${saved.title}"`)
      await addPoints(user.fullName, 10, 'recipe')
      setDone(true)
      setTimeout(() => onSaved(category), 1500)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const cat = CATEGORIES.find(c => c.id === category)

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box modal-box-large">
        <button className="modal-close" onClick={onClose}>✕</button>
        {!done ? (
          <>
            <h2 className="modal-title">{t('manual_title', lang)}</h2>
            <p className="modal-subtitle">{t('manual_subtitle', lang)}</p>

            <label className="field-label">{t('title_label', lang)}</label>
            <input className="field-input" placeholder={t('title_placeholder', lang)} value={title} onChange={e => setTitle(e.target.value)} />

            <label className="field-label">{t('category_required', lang)}</label>
            <div className="category-selector">
              {CATEGORIES.map(c => (
                <button key={c.id}
                  className={`category-btn ${category === c.id ? 'active' : ''}`}
                  style={category === c.id ? { background: c.bg, borderColor: c.color, color: c.color } : {}}
                  onClick={() => setCategory(c.id)}>
                  {c.icon} {t(c.id, lang)}
                </button>
              ))}
            </div>

            <label className="field-label">{t('photo_optional', lang)}</label>
            <p className="field-hint">{t('add_photo_hint', lang)}</p>
            <div className={`header-photo-drop ${headerPhoto ? 'has-photo' : ''}`} onClick={() => photoRef.current.click()}>
              {headerPhoto
                ? <img src={headerPhoto.preview} alt="" className="header-photo-preview" />
                : <div className="drop-placeholder"><span className="drop-icon">🖼️</span><p>{t('add_photo', lang)}</p><p className="drop-hint">PNG, JPG, WEBP</p></div>
              }
            </div>
            <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
            {headerPhoto && <button className="btn-change-photo" onClick={() => setHeaderPhoto(null)}>{t('change_photo_btn', lang)}</button>}

            <div className="form-row" style={{ marginTop: '0.5rem' }}>
              <div><label className="field-label">{t('servings', lang)}</label><input className="field-input" placeholder={t('portions_placeholder', lang)} value={servings} onChange={e => setServings(e.target.value)} /></div>
              <div><label className="field-label">{t('prep_time', lang)}</label><input className="field-input" placeholder={t('prep_placeholder', lang)} value={prepTime} onChange={e => setPrepTime(e.target.value)} /></div>
              <div><label className="field-label">{t('cook_time', lang)}</label><input className="field-input" placeholder={t('cook_placeholder', lang)} value={cookTime} onChange={e => setCookTime(e.target.value)} /></div>
            </div>

            <label className="field-label">{t('ingredients_required', lang)}</label>
            <div className="dynamic-list">
              {ingredients.map((ing, i) => (
                <div key={i} className="dynamic-row">
                  <input className="field-input" placeholder={t('ingredient_placeholder', lang)} value={ing} onChange={e => updateIngredient(i, e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addIngredient() } }} />
                  {ingredients.length > 1 && <button className="dynamic-remove" onClick={() => removeIngredient(i)}>✕</button>}
                </div>
              ))}
              <button className="dynamic-add" onClick={addIngredient}>{t('add_ingredient', lang)}</button>
            </div>

            <label className="field-label">{t('steps_required', lang)}</label>
            <div className="dynamic-list">
              {steps.map((step, i) => (
                <div key={i} className="dynamic-row">
                  <div className="step-num-label">{i + 1}</div>
                  <textarea className="field-textarea step-textarea" placeholder={`${t('step_placeholder', lang)} ${i + 1}...`} value={step} onChange={e => updateStep(i, e.target.value)} rows={2} />
                  {steps.length > 1 && <button className="dynamic-remove" onClick={() => removeStep(i)}>✕</button>}
                </div>
              ))}
              <button className="dynamic-add" onClick={addStep}>{t('add_step', lang)}</button>
            </div>

            <label className="field-label">{t('tips_optional', lang)}</label>
            <textarea className="field-textarea" placeholder={t('tips_placeholder', lang)} value={tips} onChange={e => setTips(e.target.value)} rows={3} />

            {error && <p className="field-error">{error}</p>}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={onClose}>{t('cancel', lang)}</button>
              <button className="btn-primary" onClick={handleSave} disabled={loading}>
                {loading ? '⏳...' : t('publish_btn', lang)}
              </button>
            </div>
          </>
        ) : (
          <div className="success-screen">
            <div className="success-icon">🎉</div>
            <h2>{t('recipe_published', lang)}</h2>
            <p>{t('redirecting_to', lang)} <strong>{cat?.icon} {t(cat?.id, lang)}</strong>...</p>
          </div>
        )}
      </div>
    </div>
  )
}
