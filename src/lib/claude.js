async function callClaude(messages) {
  const response = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1500, messages }),
  })
  if (!response.ok) { const e = await response.json(); throw new Error(e.error?.message || 'Erreur Claude') }
  const data = await response.json()
  const text = data.content.map(b => b.text || '').join('')
  // Nettoyer les backticks markdown que Claude ajoute parfois
  const clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  try { return JSON.parse(clean) } catch { throw new Error('Erreur parsing: ' + text.slice(0, 200)) }
}

const FORMAT = `{
  "title": "Titre de la recette",
  "category": "entree" ou "plat" ou "dessert" ou "boisson" ou "apero",
  "servings": "ex: 4 personnes",
  "prep_time": "ex: 15 min",
  "cook_time": "ex: 30 min",
  "ingredients": ["ingrédient 1 avec quantité", "..."],
  "steps": ["Étape 1...", "..."],
  "tips": "Conseils optionnels"
}`

export async function extractRecipeFromImages({ instagramUrl, images }) {
  const prompt = `Tu es un assistant culinaire. Regarde ces ${images.length} capture(s) d'écran Instagram et extrait la recette complète. Trouve le titre. Détermine la catégorie parmi: entree, plat, dessert, boisson, apero. Réponds UNIQUEMENT en JSON valide sans backticks:\n${FORMAT}\n\nLien: ${instagramUrl || 'non fourni'}`
  return callClaude([{ role: 'user', content: [...images.map(img => ({ type: 'image', source: { type: 'base64', media_type: img.mediaType, data: img.base64 } })), { type: 'text', text: prompt }] }])
}

export async function extractRecipeFromText({ instagramUrl, rawText }) {
  const prompt = `Tu es un assistant culinaire. Extrait la recette de ce texte. Détermine la catégorie parmi: entree, plat, dessert, boisson, apero. Réponds UNIQUEMENT en JSON valide sans backticks:\n${FORMAT}\n\nTexte:\n"""\n${rawText}\n"""`
  return callClaude([{ role: 'user', content: prompt }])
}

export async function detectTags(ingredients, steps, tips) {
  try {
    const response = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 150,
        messages: [{
          role: 'user',
          content: `Analyze this recipe and return ONLY a JSON array of applicable tags from: ["vegetarien","vegan","sans_gluten","rapide","economique","fait_maison"]. No explanation, just the array.

Rules: vegetarien=no meat/fish, vegan=no animal products, sans_gluten=no wheat/flour/pasta, rapide=under 30min, economique=cheap ingredients, fait_maison=from scratch.

Ingredients: ${JSON.stringify(ingredients)}
Steps: ${JSON.stringify(steps)}
Tips: ${tips || ''}

Return ONLY the JSON array.`
        }]
      })
    })
    const data = await response.json()
    const text = data.content.map(b => b.text || '').join('').trim()
    const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim()
    const result = JSON.parse(clean)
    return Array.isArray(result) ? result : []
  } catch (e) {
    console.error('Tag detection error:', e)
    return []
  }
}
