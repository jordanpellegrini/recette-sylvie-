const RECIPE_JSON_FORMAT = `{
  "title": "Titre propre de la recette",
  "category": "sucree" ou "salee",
  "servings": "nombre de portions (ex: 4 personnes)",
  "prep_time": "temps de préparation (ex: 15 min)",
  "cook_time": "temps de cuisson (ex: 30 min)",
  "ingredients": ["ingrédient 1 avec quantité", "ingrédient 2 avec quantité", "..."],
  "steps": ["Étape 1 : ...", "Étape 2 : ...", "..."],
  "tips": "Conseils ou variantes optionnels (laisser vide si aucun)",
  "instagram_url": "URL_ICI"
}`

async function callClaude(messages) {
  // On appelle notre propre fonction Vercel, pas Anthropic directement
  const response = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages,
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

/**
 * Extrait une recette à partir d'un texte brut Instagram
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
${RECIPE_JSON_FORMAT.replace('URL_ICI', instagramUrl)}`

  return callClaude([{ role: 'user', content: prompt }])
}

/**
 * Extrait une recette à partir d'une image (capture d'écran Instagram)
 */
export async function extractRecipeFromImage({ title, instagramUrl, imageBase64, mediaType }) {
  const prompt = `Tu es un assistant culinaire. Regarde attentivement cette capture d'écran Instagram et extrait toute la recette visible (ingrédients, étapes, conseils, quantités).

Titre suggéré par l'utilisateur : "${title}"
Lien Instagram : ${instagramUrl || 'non fourni'}

Réponds UNIQUEMENT en JSON valide (sans backticks, sans markdown), exactement dans ce format :
${RECIPE_JSON_FORMAT.replace('URL_ICI', instagramUrl || '')}`

  return callClaude([
    {
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: imageBase64,
          },
        },
        { type: 'text', text: prompt },
      ],
    },
  ])
}
