import { useState, useEffect } from 'react'
import { getRecipes } from '../lib/supabase'
import RecipeCard from '../components/RecipeCard'
import ImportModal from '../components/ImportModal'

export default function RecipesPage({ category, user, onBack, notifications, onOpenNotifications }) {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showImport, setShowImport] = useState(false)
  const unread = notifications.filter(n => !n.read).length

  async function loadRecipes() {
    setLoading(true)
    try { setRecipes(await getRecipes(category)) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadRecipes() }, [category])

  const filtered = recipes.filter(r =>
    search === '' || r.title.toLowerCase().includes(search.toLowerCase())
  )

  const categoryLabel = category === 'sucree' ? '🍰 Sucrées' : '🧂 Salées'

  return (
    <div className="recipes-page">
      <header className="recipes-header">
        <div className="recipes-header-top">
          <button className="back-btn" onClick={onBack}>← Accueil</button>
          <button className="notif-btn" onClick={onOpenNotifications}>
            🔔 {unread > 0 && <span className="notif-badge">{unread}</span>}
          </button>
        </div>
        <h1 className="recipes-title">{categoryLabel}</h1>
        <p className="recipes-user">Connecté·e : <strong>{user.fullName}</strong></p>
      </header>

      <div className="recipes-toolbar">
        <input
          className="search-input"
          type="text"
          placeholder={`Rechercher une recette ${category === 'sucree' ? 'sucrée' : 'salée'}...`}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button className="btn-import-small" onClick={() => setShowImport(true)}>
          ✨ Ajouter
        </button>
      </div>

      <main className="recipes-container">
        {loading && <div className="state-message"><div className="loader">🍴</div><p>Chargement...</p></div>}

        {!loading && filtered.length === 0 && (
          <div className="state-message empty">
            <div className="empty-icon">{category === 'sucree' ? '🎂' : '🥗'}</div>
            <h3>Aucune recette {category === 'sucree' ? 'sucrée' : 'salée'}</h3>
            <p>Importez votre première recette !</p>
            <button className="btn-primary" onClick={() => setShowImport(true)}>✨ Importer</button>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="recipes-list">
            {filtered.map(r => (
              <RecipeCard key={r.id} recipe={r} user={user} onDeleted={id => setRecipes(prev => prev.filter(x => x.id !== id))} />
            ))}
          </div>
        )}
      </main>

      {showImport && (
        <ImportModal
          user={user}
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); loadRecipes() }}
        />
      )}
    </div>
  )
}
