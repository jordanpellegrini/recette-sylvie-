const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

/**
 * Takes raw Instagram description text + title hint, returns a clean recipe object.
 */
export async function extractRecipeFromText({ title, instagramUrl, rawText }) {
  const prompt = `Tu es un assistant culinaire. À partir du texte Instagram ci-dessous, génère une recette propre et bien structurée en français.

Titre suggéré par l'utilisateur : "${title}"
Lien Instagram : ${instagramUrl}
Texte brut Instagram :
"""
${rawText}
"""

Réponds UNIQUEMENT en JSON valide (sans backticks, sans markdown), exactement dans ce format :
{
  "title": "Titre propre de la recette",
  "category": "sucree" ou "salee",
  "servings": "nombre de portions (ex: 4 personnes)",
  "prep_time": "temps de préparation (ex: 15 min)",
  "cook_time": "temps de cuisson (ex: 30 min)",
  "ingredients": ["ingrédient 1 avec quantité", "ingrédient 2 avec quantité", "..."],
  "steps": ["Étape 1 : ...", "Étape 2 : ...", "..."],
  "tips": "Conseils ou variantes optionnels (laisser vide si aucun)",
  "instagram_url": "${instagramUrl}"
}`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error?.message || 'Erreur API Claude')
  }

  const data = await response.json()
  const text = data.content.map((b) => b.text || '').join('')

  try {
    return JSON.parse(text.trim())
  } catch {
    throw new Error('Impossible de parser la réponse de Claude. Réponse : ' + text)
  }
}
