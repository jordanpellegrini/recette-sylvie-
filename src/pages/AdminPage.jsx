import { useState, useEffect } from 'react'
import { getAdminStats } from '../lib/supabase'

export default function AdminPage({ onLogout }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    setLoading(true)
    try { setStats(await getAdminStats()) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const links = [
    { label: 'Vercel', icon: '▲', url: 'https://vercel.com/dashboard', color: '#000' },
    { label: 'Supabase', icon: '⚡', url: 'https://supabase.com/dashboard', color: '#3ecf8e' },
    { label: 'GitHub', icon: '🐙', url: 'https://github.com', color: '#333' },
  ]

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-header-left">
          <div className="admin-logo">🔐</div>
          <div>
            <h1 className="admin-title">Panel Admin</h1>
            <p className="admin-subtitle">Recettes de Sylvie</p>
          </div>
        </div>
        <button className="btn-logout" onClick={onLogout}>Déconnexion</button>
      </header>

      {/* Liens rapides */}
      <div className="admin-links">
        {links.map(l => (
          <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" className="admin-link-card">
            <span className="admin-link-icon">{l.icon}</span>
            <span>{l.label}</span>
            <span className="admin-link-arrow">↗</span>
          </a>
        ))}
        <button className="admin-link-card refresh-card" onClick={loadStats}>
          <span className="admin-link-icon">🔄</span>
          <span>Actualiser</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        {['overview', 'users', 'recipes', 'comments'].map(tab => (
          <button
            key={tab}
            className={`admin-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'overview' && '📊 Vue globale'}
            {tab === 'users' && '👥 Utilisateurs'}
            {tab === 'recipes' && '🍽 Recettes'}
            {tab === 'comments' && '💬 Commentaires'}
          </button>
        ))}
      </div>

      <main className="admin-content">
        {loading && <div className="admin-loading">⏳ Chargement...</div>}

        {!loading && stats && activeTab === 'overview' && (
          <div className="admin-overview">
            <div className="stat-cards">
              <div className="stat-card">
                <div className="stat-num">{stats.users.length}</div>
                <div className="stat-label">Utilisateurs connectés</div>
              </div>
              <div className="stat-card">
                <div className="stat-num">{stats.recipes.length}</div>
                <div className="stat-label">Recettes au total</div>
              </div>
              <div className="stat-card">
                <div className="stat-num">{stats.recipes.filter(r => r.category === 'sucree').length}</div>
                <div className="stat-label">🍰 Sucrées</div>
              </div>
              <div className="stat-card">
                <div className="stat-num">{stats.recipes.filter(r => r.category === 'salee').length}</div>
                <div className="stat-label">🧂 Salées</div>
              </div>
              <div className="stat-card">
                <div className="stat-num">{stats.comments.length}</div>
                <div className="stat-label">Commentaires</div>
              </div>
              <div className="stat-card">
                <div className="stat-num">{stats.notifCount}</div>
                <div className="stat-label">Notifications envoyées</div>
              </div>
            </div>

            <h3 className="admin-section-title">⏱ Dernières activités</h3>
            <div className="admin-table">
              {[...stats.comments]
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 10)
                .map(c => (
                  <div key={c.id} className="admin-row">
                    <span className="admin-row-icon">💬</span>
                    <span className="admin-row-main"><strong>{c.author}</strong> a commenté</span>
                    <span className="admin-row-date">{new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ))}
              {[...stats.recipes]
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 5)
                .map(r => (
                  <div key={r.id} className="admin-row">
                    <span className="admin-row-icon">🍽</span>
                    <span className="admin-row-main"><strong>{r.created_by || 'Inconnu'}</strong> a ajouté "{r.title}"</span>
                    <span className="admin-row-date">{new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {!loading && stats && activeTab === 'users' && (
          <div>
            <h3 className="admin-section-title">👥 {stats.users.length} utilisateur(s) enregistré(s)</h3>
            <div className="admin-table">
              {stats.users.map((u, i) => {
                const userRecipes = stats.recipes.filter(r => r.created_by === u.user_name).length
                const userComments = stats.comments.filter(c => c.author === u.user_name).length
                const lastSeen = new Date(u.last_seen)
                const isRecent = (Date.now() - lastSeen) < 1000 * 60 * 30 // 30 min
                return (
                  <div key={i} className="admin-row admin-row-user">
                    <span className="admin-row-icon">{isRecent ? '🟢' : '⚪'}</span>
                    <div className="admin-row-user-info">
                      <span className="admin-row-main"><strong>{u.user_name}</strong></span>
                      <span className="admin-row-sub">{userRecipes} recette{userRecipes > 1 ? 's' : ''} · {userComments} commentaire{userComments > 1 ? 's' : ''}</span>
                    </div>
                    <span className="admin-row-date">Vu le {lastSeen.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {!loading && stats && activeTab === 'recipes' && (
          <div>
            <h3 className="admin-section-title">🍽 {stats.recipes.length} recette(s)</h3>
            <div className="admin-table">
              {stats.recipes.map(r => (
                <div key={r.id} className="admin-row">
                  <span className="admin-row-icon">{r.category === 'sucree' ? '🍰' : '🧂'}</span>
                  <div className="admin-row-user-info">
                    <span className="admin-row-main"><strong>{r.title}</strong></span>
                    <span className="admin-row-sub">Ajoutée par {r.created_by || 'Inconnu'}</span>
                  </div>
                  <span className="admin-row-date">{new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && stats && activeTab === 'comments' && (
          <div>
            <h3 className="admin-section-title">💬 {stats.comments.length} commentaire(s)</h3>
            <div className="admin-table">
              {[...stats.comments]
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .map(c => (
                  <div key={c.id} className="admin-row">
                    <span className="admin-row-icon">💬</span>
                    <div className="admin-row-user-info">
                      <span className="admin-row-main"><strong>{c.author}</strong></span>
                      <span className="admin-row-date">{new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
