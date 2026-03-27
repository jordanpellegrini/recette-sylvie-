const RECIPE_JSON_FORMAT = `{
  "title": "Titre de la recette trouvé dans les images/texte, ou inventé si absent",
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
 * Extrait une recette à partir de plusieurs images (jusqu'à 10)
 */
export async function extractRecipeFromImages({ instagramUrl, images }) {
  const prompt = `Tu es un assistant culinaire. Regarde attentivement ces ${images.length} capture(s) d'écran Instagram et extrait toute la recette visible.

Instructions :
- Trouve le titre de la recette dans les images (nom du plat mentionné, titre de la vidéo, etc.). S'il n'est pas visible, invente un titre court et descriptif en français.
- Extrait tous les ingrédients avec leurs quantités
- Extrait toutes les étapes de préparation dans l'ordre
- Note les conseils ou variantes si présents
- Combine les informations de toutes les images pour former une recette complète

Lien Instagram : ${instagramUrl || 'non fourni'}

Réponds UNIQUEMENT en JSON valide (sans backticks, sans markdown), exactement dans ce format :
${RECIPE_JSON_FORMAT.replace('URL_ICI', instagramUrl || '')}`

  const content = [
    ...images.map((img) => ({
      type: 'image',
      source: {
        type: 'base64',
        media_type: img.mediaType,
        data: img.base64,
      },
    })),
    { type: 'text', text: prompt },
  ]

  return callClaude([{ role: 'user', content }])
}

/**
 * Extrait une recette à partir d'un texte brut Instagram
 */
export async function extractRecipeFromText({ instagramUrl, rawText }) {
  const prompt = `Tu es un assistant culinaire. À partir du texte Instagram ci-dessous, génère une recette propre et bien structurée en français.

Instructions :
- Trouve le titre de la recette dans le texte (nom du plat mentionné). S'il n'est pas visible, invente un titre court et descriptif en français.
- Extrait tous les ingrédients avec leurs quantités
- Extrait toutes les étapes dans l'ordre
- Note les conseils si présents

Lien Instagram : ${instagramUrl || 'non fourni'}
Texte brut Instagram :
"""
${rawText}
"""

Réponds UNIQUEMENT en JSON valide (sans backticks, sans markdown), exactement dans ce format :
${RECIPE_JSON_FORMAT.replace('URL_ICI', instagramUrl || '')}`

  return callClaude([{ role: 'user', content: prompt }])
}
