import { useState, useEffect } from 'react'
import { getRecipes } from './lib/supabase'
import RecipeCard from './components/RecipeCard'
import ImportModal from './components/ImportModal'
import WelcomePopup from './components/WelcomePopup'
import './App.css'

export default function App() {
  const [activeTab, setActiveTab] = useState('sucree')
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [search, setSearch] = useState('')

  async function loadRecipes() {
    setLoading(true)
    setError('')
    try {
      const data = await getRecipes()
      setRecipes(data || [])
    } catch (e) {
      setError('Impossible de charger les recettes. Vérifiez votre connexion Supabase.')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadRecipes() }, [])

  function handleDeleted(id) {
    setRecipes((prev) => prev.filter((r) => r.id !== id))
  }

  const filtered = recipes.filter((r) => {
    const matchTab = r.category === activeTab
    const matchSearch = search === '' || r.title.toLowerCase().includes(search.toLowerCase())
    return matchTab && matchSearch
  })

  return (
    <div className="app">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="site-header">
        <div className="header-deco">✦ ✦ ✦</div>
        <h1 className="site-title">Recettes de Sylvie</h1>
        <p className="site-tagline">La cuisine du cœur, une recette à la fois</p>
        <div className="header-deco">✦ ✦ ✦</div>
      </header>

      {/* ── Import Bar ─────────────────────────────────────── */}
      <section className="import-section">
        <div className="import-card">
          <div className="import-icon">📱</div>
          <div className="import-text">
            <strong>Vous avez trouvé une recette sur Instagram ?</strong>
            <span>Importez-la en un clic — Claude la reformate proprement pour vous.</span>
          </div>
          <button className="btn-import" onClick={() => setShowImport(true)}>
            ✨ Importer une recette
          </button>
        </div>
      </section>

      {/* ── Tabs ───────────────────────────────────────────── */}
      <nav className="tabs">
        <button
          className={`tab ${activeTab === 'sucree' ? 'active' : ''}`}
          onClick={() => setActiveTab('sucree')}
        >
          🍰 Sucrées
        </button>
        <button
          className={`tab ${activeTab === 'salee' ? 'active' : ''}`}
          onClick={() => setActiveTab('salee')}
        >
          🧂 Salées
        </button>
      </nav>

      {/* ── Search ─────────────────────────────────────────── */}
      <div className="search-bar">
        <input
          type="text"
          placeholder={`Rechercher une recette ${activeTab === 'sucree' ? 'sucrée' : 'salée'}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {/* ── Recipe List ────────────────────────────────────── */}
      <main className="recipes-container">
        {loading && (
          <div className="state-message">
            <div className="loader">🍴</div>
            <p>Chargement des recettes...</p>
          </div>
        )}

        {!loading && error && (
          <div className="state-message error">
            <p>{error}</p>
            <button className="btn-secondary" onClick={loadRecipes}>Réessayer</button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="state-message empty">
            <div className="empty-icon">{activeTab === 'sucree' ? '🎂' : '🥗'}</div>
            <h3>Aucune recette {activeTab === 'sucree' ? 'sucrée' : 'salée'} pour l'instant</h3>
            <p>Importez votre première recette depuis Instagram !</p>
            <button className="btn-primary" onClick={() => setShowImport(true)}>
              ✨ Importer une recette
            </button>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="recipes-list">
            {filtered.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} onDeleted={handleDeleted} />
            ))}
          </div>
        )}
      </main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="site-footer">
        <p>Fait avec ❤️ par Sylvie · {new Date().getFullYear()}</p>
      </footer>

      {/* ── Welcome Popup ──────────────────────────────────── */}
      <WelcomePopup />

      {/* ── Modal ──────────────────────────────────────────── */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); loadRecipes() }}
        />
      )}
    </div>
  )
}
