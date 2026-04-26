import { useState } from 'react'
import { useTheme } from '../lib/ThemeContext'
import { t } from '../lib/i18n'

export default function NutritionPanel({ recipe }) {
  const { lang } = useTheme()
  const [nutrition, setNutrition] = useState(null)
  const [loading, setLoading] = useState(false)
  const [show, setShow] = useState(false)

  async function calculate() {
    setLoading(true)
    try {
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          messages: [{
            role: 'user',
            content: `Calcule les valeurs nutritionnelles approximatives pour la recette suivante.
Recette: ${recipe.title}
Portions: ${recipe.servings || '4 personnes'}
Ingrédients: ${(recipe.ingredients || []).join(', ')}

Réponds UNIQUEMENT en JSON valide sans backticks:
{
  "calories": 350,
  "protein": 25,
  "carbs": 30,
  "fat": 12,
  "fiber": 4,
  "note": "Valeurs approximatives par portion"
}`
          }]
        })
      })
      const data = await response.json()
      const text = data.content.map(b => b.text || '').join('')
      setNutrition(JSON.parse(text.trim()))
      setShow(true)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  return (
    <div className="nutrition-section">
      {!show ? (
        <button className="btn-nutrition" onClick={calculate} disabled={loading}>
          {loading ? '⏳ Calcul...' : t('calculate', lang)}
        </button>
      ) : (
        <div className="nutrition-panel">
          <h4 className="nutrition-title">{t('nutrition', lang)}</h4>
          <p className="nutrition-sub">{t('per_serving', lang)}</p>
          <div className="nutrition-grid">
            <div className="nutrition-item calories">
              <span className="nutrition-num">{nutrition.calories}</span>
              <span className="nutrition-label">{t('calories', lang)}</span>
              <span className="nutrition-unit">kcal</span>
            </div>
            <div className="nutrition-item">
              <span className="nutrition-num">{nutrition.protein}g</span>
              <span className="nutrition-label">{t('protein', lang)}</span>
            </div>
            <div className="nutrition-item">
              <span className="nutrition-num">{nutrition.carbs}g</span>
              <span className="nutrition-label">{t('carbs', lang)}</span>
            </div>
            <div className="nutrition-item">
              <span className="nutrition-num">{nutrition.fat}g</span>
              <span className="nutrition-label">{t('fat', lang)}</span>
            </div>
            <div className="nutrition-item">
              <span className="nutrition-num">{nutrition.fiber}g</span>
              <span className="nutrition-label">{t('fiber', lang)}</span>
            </div>
          </div>
          {nutrition.note && <p className="nutrition-note">* {nutrition.note}</p>}
          <button className="btn-nutrition-close" onClick={() => setShow(false)}>✕</button>
        </div>
      )}
    </div>
  )
}
