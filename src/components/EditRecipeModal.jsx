import { useState, useRef } from 'react'
import { uploadRecipePhoto, updateRecipePhoto, supabase } from '../lib/supabase'
import { CATEGORIES } from '../lib/constants'
import { useTheme } from '../lib/ThemeContext'
import { t } from '../lib/i18n'

const TAGS = [
  { id: 'vegetarien', labelKey: 'tag_vegetarien', icon: '🥦' },
  { id: 'vegan',      labelKey: 'tag_vegan',       icon: '🌱' },
  { id: 'sans_gluten',labelKey: 'tag_sans_gluten',  icon: '🌾' },
  { id: 'rapide',     labelKey: 'tag_rapide',       icon: '⚡' },
  { id: 'economique', labelKey: 'tag_economique',   icon: '💰' },
  { id: 'fait_maison',labelKey: 'tag_fait_maison',  icon: '🏠' },
]

export default function EditRecipeModal({ recipe, onClose, onSaved }) {
  const { lang } = useTheme()
  const [title, setTitle] = useState(recipe.title || '')
  const [category, setCategory] = useState(recipe.category || 'plat')
  const [servings, setServings] = useState(recipe.servings || '')
  const [prepTime, setPrepTime] = useState(recipe.prep_time || '')
  const [cookTime, setCookTime] = useState(recipe.cook_time || '')
  const [ingredients, setIngredients] = useState(recipe.ingredients || [''])
  const [steps, setSteps] = useState(recipe.steps || [''])
  const [tips, setTips] = useState(recipe.tips || '')
  const [tags, setTags] = useState(recipe.tags || [])
  const [photoUrl, setPhotoUrl] = useState(recipe.photo_url || null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const photoRef = useRef(null)

  function updateIngredient(i, val) { setIngredients(prev => { const a=[...prev]; a[i]=val; return a }) }
  function addIngredient() { setIngredients(prev => [...prev, '']) }
  function removeIngredient(i) { setIngredients(prev => prev.filter((_,idx) => idx!==i)) }
  function updateStep(i, val) { setSteps(prev => { const a=[...prev]; a[i]=val; return a }) }
  function addStep() { setSteps(prev => [...prev, '']) }
  function removeStep(i) { setSteps(prev => prev.filter((_,idx) => idx!==i)) }
  function toggleTag(id) { setTags(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]) }

  async function handlePhotoUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploadingPhoto(true)
    const preview = URL.createObjectURL(file)
    setPhotoUrl(preview)
    try {
      const url = await uploadRecipePhoto(file, recipe.id)
      await updateRecipePhoto(recipe.id, url)
      setPhotoUrl(url)
    } catch (err) { alert(t('error', lang) + ' ' + err.message); setPhotoUrl(recipe.photo_url) }
    finally { setUploadingPhoto(false) }
  }

  async function handleSave() {
    if (!title.trim()) { setError(lang === 'fr' ? 'Le titre est obligatoire.' : 'Title is required.'); return }
    const cleanIngredients = ingredients.filter(x => x.trim())
    const cleanSteps = steps.filter(x => x.trim())
    if (cleanIngredients.length === 0) { setError(lang === 'fr' ? 'Au moins un ingrédient.' : 'At least one ingredient.'); return }
    if (cleanSteps.length === 0) { setError(lang === 'fr' ? 'Au moins une étape.' : 'At least one step.'); return }
    setSaving(true)
    try {
      const { error } = await supabase.from('recipes').update({
        title: title.trim(),
        category,
        servings: servings.trim() || null,
        prep_time: prepTime.trim() || null,
        cook_time: cookTime.trim() || null,
        ingredients: cleanIngredients,
        steps: cleanSteps,
        tips: tips.trim() || null,
        tags,
      }).eq('id', recipe.id)
      if (error) throw error
      onSaved({ ...recipe, title: title.trim(), category, servings, prep_time: prepTime, cook_time: cookTime, ingredients: cleanIngredients, steps: cleanSteps, tips, tags, photo_url: photoUrl })
      onClose()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box modal-box-large">
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2 className="modal-title">✏️ {lang === 'fr' ? 'Modifier la recette' : 'Edit recipe'}</h2>

        <label className="field-label">{t('title_label', lang)}</label>
        <input className="field-input" value={title} onChange={e => setTitle(e.target.value)} />

        <label className="field-label">{t('category_required', lang)}</label>
        <div className="category-selector">
          {CATEGORIES.map(c => (
            <button key={c.id} className={`category-btn ${category === c.id ? 'active' : ''}`}
              style={category === c.id ? { background: c.bg, borderColor: c.color, color: c.color } : {}}
              onClick={() => setCategory(c.id)}>
              {c.icon} {t(c.id, lang)}
            </button>
          ))}
        </div>

        {/* Photo */}
        <label className="field-label">{t('photo_optional', lang)}</label>
        <div className={`header-photo-drop ${photoUrl ? 'has-photo' : ''}`} onClick={() => photoRef.current.click()}>
          {photoUrl
            ? <img src={photoUrl} alt="" className="header-photo-preview" />
            : <div className="drop-placeholder"><span className="drop-icon">🖼️</span><p>{t('add_photo', lang)}</p></div>
          }
        </div>
        <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
        {uploadingPhoto && <p className="field-hint">⏳ {t('uploading', lang)}</p>}

        <div className="form-row">
          <div><label className="field-label">{t('servings', lang)}</label><input className="field-input" value={servings} onChange={e => setServings(e.target.value)} placeholder={t('portions_placeholder', lang)} /></div>
          <div><label className="field-label">{t('prep_time', lang)}</label><input className="field-input" value={prepTime} onChange={e => setPrepTime(e.target.value)} placeholder={t('prep_placeholder', lang)} /></div>
          <div><label className="field-label">{t('cook_time', lang)}</label><input className="field-input" value={cookTime} onChange={e => setCookTime(e.target.value)} placeholder={t('cook_placeholder', lang)} /></div>
        </div>

        {/* Tags */}
        <label className="field-label">{t('tags_label', lang)}</label>
        <div className="tags-list" style={{ marginBottom: '1rem' }}>
          {TAGS.map(tag => (
            <button key={tag.id} className={`tag-btn ${tags.includes(tag.id) ? 'active' : ''}`} onClick={() => toggleTag(tag.id)}>
              {tag.icon} {t(tag.labelKey, lang)}
            </button>
          ))}
        </div>

        <label className="field-label">{t('ingredients_required', lang)}</label>
        <div className="dynamic-list">
          {ingredients.map((ing, i) => (
            <div key={i} className="dynamic-row">
              <input className="field-input" value={ing} onChange={e => updateIngredient(i, e.target.value)} placeholder={t('ingredient_placeholder', lang)} />
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
              <textarea className="field-textarea step-textarea" value={step} onChange={e => updateStep(i, e.target.value)} rows={2} placeholder={`${t('step_placeholder', lang)} ${i + 1}...`} />
              {steps.length > 1 && <button className="dynamic-remove" onClick={() => removeStep(i)}>✕</button>}
            </div>
          ))}
          <button className="dynamic-add" onClick={addStep}>{t('add_step', lang)}</button>
        </div>

        <label className="field-label">{t('tips_optional', lang)}</label>
        <textarea className="field-textarea" value={tips} onChange={e => setTips(e.target.value)} rows={3} placeholder={t('tips_placeholder', lang)} />

        {error && <p className="field-error">{error}</p>}

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>{t('cancel', lang)}</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '⏳...' : '💾 ' + (lang === 'fr' ? 'Enregistrer' : 'Save')}
          </button>
        </div>
      </div>
    </div>
  )
}
