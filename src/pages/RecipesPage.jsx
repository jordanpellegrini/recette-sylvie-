import { useState, useEffect, useMemo } from 'react'
import { useTheme } from '../lib/ThemeContext'
import { t } from '../lib/i18n'
import { getRecipes } from '../lib/supabase'
import { CATEGORY_MAP } from '../lib/constants'
import RecipeCard from '../components/RecipeCard'
import ImportModal from '../components/ImportModal'
import ManualRecipeModal from '../components/ManualRecipeModal'

export default function RecipesPage({ category, user, onBack, notifications, onOpenNotifications, onOpenMenu }) {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterIngredient, setFilterIngredient] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const unread = notifications.filter(n => !n.read).length
  const { lang } = useTheme()
  const cat = CATEGORY_MAP[category]

  async function loadRecipes() {
    setLoading(true)
    try { setRecipes(await getRecipes(category)) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadRecipes() }, [category])

  const filtered = useMemo(() => {
    return recipes.filter(r => {
      const matchTitle = !search || r.title.toLowerCase().includes(search.toLowerCase())
      const matchIngredient = !filterIngredient || (r.ingredients || []).some(ing => ing.toLowerCase().includes(filterIngredient.toLowerCase()))
      return matchTitle && matchIngredient
    })
  }, [recipes, search, filterIngredient])

  return (
    <div className="recipes-page">
      <header className="recipes-header">
        <div className="recipes-header-top">
          <button className="back-btn" onClick={onBack}>{t('back', lang)}</button>
          <div className="recipes-header-actions">
            <button className="btn-menu-week" onClick={onOpenMenu} title="Menu">📅</button>
            <button className="notif-btn" onClick={onOpenNotifications}>
              🔔 {unread > 0 && <span className="notif-badge">{unread}</span>}
            </button>
          </div>
        </div>
        <div className="recipes-header-title">
          <span className="recipes-cat-icon">{cat?.icon}</span>
          <h1 className="recipes-title">{t(cat?.id, lang) || cat?.label}</h1>
        </div>
      </header>

      <div className="recipes-filters">
        <input className="search-input" placeholder={t('search_name', lang)} value={search} onChange={e => setSearch(e.target.value)} />
        <input className="search-input" placeholder={t('search_ingredient', lang)} value={filterIngredient} onChange={e => setFilterIngredient(e.target.value)} />
        <button className="btn-import-small" onClick={() => setShowImport(true)}>{t('import', lang)}</button>
        <button className="btn-import-small btn-manual-small" onClick={() => setShowManual(true)}>{t('add', lang)}</button>
      </div>

      <main className="recipes-container">
        {loading && <div className="state-message"><div className="loader">🍴</div><p>Chargement...</p></div>}

        {!loading && filtered.length === 0 && (
          <div className="state-message empty">
            <div className="empty-icon">{cat?.icon}</div>
            <h3>Aucune recette trouvée</h3>
            <p>{search || filterIngredient ? t('try_filters', lang) : t('import_first', lang)}</p>
            {!search && !filterIngredient && <button className="btn-primary" onClick={() => setShowImport(true)}>✨ Importer</button>}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="recipes-list">
            {filtered.map(r => (
              <RecipeCard key={r.id} recipe={r} user={user} onDeleted={id => setRecipes(prev => prev.filter(x => x.id !== id))} onPhotoUpdated={(id, url) => setRecipes(prev => prev.map(x => x.id === id ? { ...x, photo_url: url } : x))} />
            ))}
          </div>
        )}
      </main>

      {showImport && <ImportModal user={user} onClose={() => setShowImport(false)} onImported={() => { setShowImport(false); loadRecipes() }} />}
      {showManual && <ManualRecipeModal user={user} onClose={() => setShowManual(false)} onSaved={() => { setShowManual(false); loadRecipes() }} />}
    </div>
  )
}
