import { useState } from 'react'
import { CATEGORIES } from '../lib/constants'
import { addRecipe, addNotification } from '../lib/supabase'
import { useTheme } from '../lib/ThemeContext'
import { t } from '../lib/i18n'

export default function FridgePage({ user, onBack, onNavigate }) {
  const { lang } = useTheme()
  const [ingredients, setIngredients] = useState([''])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [suggestionCount, setSuggestionCount] = useState(0)

  function updateIngredient(i, val) { setIngredients(prev => { const a=[...prev]; a[i]=val; return a }) }
  function addIngredient() { setIngredients(prev => [...prev, '']) }
  function removeIngredient(i) {
    if (ingredients.length === 1) { setIngredients(['']); return }
    setIngredients(prev => prev.filter((_,idx) => idx !== i))
  }

  async function handleSuggest() {
    const clean = ingredients.filter(x => x.trim())
    if (clean.length === 0) { setError(t('fridge_error', lang)); return }
    setError(''); setLoading(true); setSaved(false)
    const count = suggestionCount + 1
    setSuggestionCount(count)
    try {
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          messages: [{
            role: 'user',
            content: `You are a creative chef. The user has these ingredients: ${clean.join(', ')}.

Suggest ONE creative recipe (suggestion number ${count}, make it different each time).
Basic items like salt, oil, garlic are available.

Respond ONLY in valid JSON without backticks or markdown:
{
  "title": "Recipe name",
  "category": "entree" or "plat" or "dessert" or "boisson" or "apero",
  "servings": "4 people",
  "prep_time": "15 min",
  "cook_time": "30 min",
  "ingredients": ["ingredient 1 with quantity", "..."],
  "steps": ["Step 1...", "..."],
  "tips": "Optional tips",
  "why": "Short explanation why this recipe works with these ingredients"
}`
          }]
        })
      })
      const data = await response.json()
      const text = data.content.map(b => b.text || '').join('')
      const clean_json = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
      setResult(JSON.parse(clean_json))
    } catch (e) { setError('Error: ' + e.message) }
    finally { setLoading(false) }
  }

  async function handleSave() {
    if (!result) return
    setSaving(true)
    try {
      const { why, ...recipeData } = result
      const saved = await addRecipe({ ...recipeData, created_by: user.fullName })
      await addNotification(saved.id, saved.title, user.fullName, `✨ ${user.fullName} added "${saved.title}"`)
      setSaved(true)
      setTimeout(() => onNavigate(result.category), 1500)
    } catch (e) { alert('Error: ' + e.message) }
    finally { setSaving(false) }
  }

  const cat = result ? CATEGORIES.find(c => c.id === result.category) : null

  return (
    <div className="fridge-page">
      <header className="recipes-header">
        <div className="recipes-header-top">
          <button className="back-btn" onClick={onBack}>{t('back', lang)}</button>
        </div>
        <div className="recipes-header-title">
          <span className="recipes-cat-icon">🧊</span>
          <h1 className="recipes-title">{t('fridge_title', lang)}</h1>
        </div>
      </header>

      <div className="fridge-content">
        <p className="fridge-subtitle">{t('fridge_subtitle', lang)}</p>

        <label className="field-label">{t('my_ingredients', lang)}</label>
        <div className="dynamic-list">
          {ingredients.map((ing, i) => (
            <div key={i} className="dynamic-row">
              <input
                className="field-input"
                placeholder={t('ingredient_fridge_placeholder', lang)}
                value={ing}
                onChange={e => updateIngredient(i, e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addIngredient() } }}
              />
              <button className="dynamic-remove" onClick={() => removeIngredient(i)}>✕</button>
            </div>
          ))}
          <button className="dynamic-add" onClick={addIngredient}>{t('add_ingredient_btn', lang)}</button>
        </div>

        {error && <p className="field-error">{error}</p>}

        <button className="btn-fridge-suggest" onClick={handleSuggest} disabled={loading}>
          {loading ? t('suggesting', lang) : result ? t('another', lang) : t('suggest', lang)}
        </button>

        {result && (
          <div className="fridge-result">
            {result.why && (
              <div className="fridge-why">
                <span>💡</span>
                <p>{result.why}</p>
              </div>
            )}
            <div className="preview-box">
              <h3 className="preview-recipe-title">{result.title}</h3>
              <div className="preview-meta">
                {cat && <span className="preview-badge" style={{ background: cat.bg, color: cat.color }}>{cat.icon} {t(cat.id, lang)}</span>}
                {result.servings && <span className="preview-info">👥 {result.servings}</span>}
                {result.prep_time && <span className="preview-info">⏱ {result.prep_time}</span>}
                {result.cook_time && <span className="preview-info">🔥 {result.cook_time}</span>}
              </div>
              <div className="preview-section">
                <h4>{t('ingredients', lang)}</h4>
                <ul>{result.ingredients?.map((x,i) => <li key={i}>{x}</li>)}</ul>
              </div>
              <div className="preview-section">
                <h4>{t('steps', lang)}</h4>
                <ol>{result.steps?.map((x,i) => <li key={i}>{x}</li>)}</ol>
              </div>
              {result.tips && <div className="preview-section tips"><h4>{t('tips', lang)}</h4><p>{result.tips}</p></div>}
            </div>
            <div className="fridge-actions">
              {saved
                ? <button className="btn-primary" disabled>{t('saved_success', lang)}</button>
                : <button className="btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? '⏳...' : t('save_recipe', lang)}
                  </button>
              }
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
