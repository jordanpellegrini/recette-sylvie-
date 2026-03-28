const RECIPE_JSON_FORMAT = `{
  "title": "Titre de la recette trouvé dans les images/texte, ou inventé si absent",
  "category": "sucree" ou "salee",
  "servings": "nombre de portions",
  "prep_time": "temps de préparation",
  "cook_time": "temps de cuisson",
  "ingredients": ["ingrédient 1 avec quantité", "..."],
  "steps": ["Étape 1 : ...", "..."],
  "tips": "Conseils optionnels",
  "instagram_url": "URL_ICI"
}`

async function callClaude(messages) {
  const response = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1500, messages }),
  })
  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error?.message || 'Erreur API Claude')
  }
  const data = await response.json()
  const text = data.content.map((b) => b.text || '').join('')
  try { return JSON.parse(text.trim()) }
  catch { throw new Error('Erreur parsing Claude: ' + text) }
}

export async function extractRecipeFromImages({ instagramUrl, images }) {
  const prompt = `Tu es un assistant culinaire. Regarde ces ${images.length} capture(s) d'écran Instagram et extrait la recette complète. Trouve le titre dans les images, sinon invente-en un descriptif. Réponds UNIQUEMENT en JSON valide sans backticks:\n${RECIPE_JSON_FORMAT.replace('URL_ICI', instagramUrl || '')}`
  return callClaude([{ role: 'user', content: [
    ...images.map(img => ({ type: 'image', source: { type: 'base64', media_type: img.mediaType, data: img.base64 } })),
    { type: 'text', text: prompt }
  ]}])
}

export async function extractRecipeFromText({ instagramUrl, rawText }) {
  const prompt = `Tu es un assistant culinaire. Extrait la recette de ce texte Instagram. Trouve le titre dans le texte sinon invente-en un. Réponds UNIQUEMENT en JSON valide sans backticks:\n${RECIPE_JSON_FORMAT.replace('URL_ICI', instagramUrl || '')}\n\nTexte:\n"""\n${rawText}\n"""`
  return callClaude([{ role: 'user', content: prompt }])
}
