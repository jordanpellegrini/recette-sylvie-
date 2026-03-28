export default function HomePage({ user, onNavigate, notifications, onOpenNotifications }) {
  const unread = notifications.filter(n => !n.read).length

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="home-header-top">
          <div className="home-user">
            👤 <span>{user.fullName}</span>
          </div>
          <button className="notif-btn" onClick={onOpenNotifications}>
            🔔
            {unread > 0 && <span className="notif-badge">{unread}</span>}
          </button>
        </div>
        <div className="home-hero">
          <div className="home-deco">✦ ✦ ✦</div>
          <h1 className="home-title">Recettes de Sylvie</h1>
          <p className="home-tagline">La cuisine du cœur, une recette à la fois</p>
          <div className="home-deco">✦ ✦ ✦</div>
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
        <p>Fait avec ❤️ pour Sylvie · {new Date().getFullYear()}</p>
      </footer>
    </div>
  )
}
