import { useState } from 'react'
import ImportModal from '../components/ImportModal'
import ManualRecipeModal from '../components/ManualRecipeModal'

export default function HomePage({ user, onNavigate, notifications, onOpenNotifications, onLogout }) {
  const [showImport, setShowImport] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const unread = notifications.filter(n => !n.read).length

  function handleImported(category) {
    setShowImport(false)
    onNavigate(category)
  }

  function handleSaved(category) {
    setShowManual(false)
    onNavigate(category)
  }

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="home-header-top">
          <div className="home-user">
            👤 <span>{user.fullName}</span>
            <button className="btn-logout" onClick={onLogout}>Changer de compte</button>
          </div>
          <button className="notif-btn" onClick={onOpenNotifications}>
            🔔
            {unread > 0 && <span className="notif-badge">{unread}</span>}
          </button>
        </div>

        <div className="home-hero">
          <div className="home-deco">✦ ✦ ✦</div>
          <h1 className="home-title">Recettes de {user.prenom}</h1>
          <p className="home-tagline">La cuisine du cœur, une recette à la fois</p>
          <div className="home-deco">✦ ✦ ✦</div>
        </div>

        <div className="home-import">
          <button className="btn-import-home" onClick={() => setShowImport(true)}>
            📸 Importer depuis Instagram
          </button>
          <button className="btn-manual-home" onClick={() => setShowManual(true)}>
            📝 Ajouter manuellement
          </button>
        </div>
      </header>

      <main className="home-categories">
        <button className="category-tile sucree" onClick={() => onNavigate('sucree')}>
          <div className="tile-icon">🍰</div>
          <h2 className="tile-title">Sucrées</h2>
          <p className="tile-sub">Gâteaux, desserts & douceurs</p>
          <span className="tile-arrow">→</span>
        </button>

        <button className="category-tile salee" onClick={() => onNavigate('salee')}>
          <div className="tile-icon">🧂</div>
          <h2 className="tile-title">Salées</h2>
          <p className="tile-sub">Plats, entrées & saveurs</p>
          <span className="tile-arrow">→</span>
        </button>
      </main>

      <footer className="home-footer">
        <p>Fait avec ❤️ pour {user.prenom} · {new Date().getFullYear()}</p>
      </footer>

      {showImport && (
        <ImportModal user={user} onClose={() => setShowImport(false)} onImported={handleImported} />
      )}

      {showManual && (
        <ManualRecipeModal user={user} onClose={() => setShowManual(false)} onSaved={handleSaved} />
      )}
    </div>
  )
}
