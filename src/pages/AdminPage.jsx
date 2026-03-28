import { useState, useEffect } from 'react'
import { getAdminStats, deleteRecipe, deleteComment } from '../lib/supabase'
import { supabase } from '../lib/supabase'

async function adminDeleteUser(userName) {
  const { error } = await supabase.from('user_activity').delete().eq('user_name', userName)
  if (error) throw error
}

export default function AdminPage({ onLogout }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [confirm, setConfirm] = useState(null) // { type, id, label }

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    setLoading(true)
    try { setStats(await getAdminStats()) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  function askConfirm(type, id, label) {
    setConfirm({ type, id, label })
  }

  async function handleConfirmDelete() {
    if (!confirm) return
    try {
      if (confirm.type === 'recipe') await deleteRecipe(confirm.id)
      else if (confirm.type === 'comment') await deleteComment(confirm.id)
      else if (confirm.type === 'user') await adminDeleteUser(confirm.id)
      setConfirm(null)
      await loadStats()
    } catch (e) {
      alert('Erreur : ' + e.message)
    }
  }

  const links = [
    { label: 'Vercel', icon: '▲', url: 'https://vercel.com/dashboard' },
    { label: 'Supabase', icon: '⚡', url: 'https://supabase.com/dashboard' },
    { label: 'GitHub', icon: '🐙', url: 'https://github.com' },
  ]

  return (
    <div className="admin-page">
      {/* Confirm dialog */}
      {confirm && (
        <div className="admin-confirm-overlay">
          <div className="admin-confirm-box">
            <h3>🗑 Confirmer la suppression</h3>
            <p>Supprimer <strong>{confirm.label}</strong> ?</p>
            <p className="admin-confirm-warn">Cette action est irréversible.</p>
            <div className="admin-confirm-actions">
              <button className="btn-secondary" onClick={() => setConfirm(null)}>Annuler</button>
              <button className="admin-btn-danger" onClick={handleConfirmDelete}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

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

      <div className="admin-tabs">
        {['overview', 'users', 'recipes', 'comments'].map(tab => (
          <button key={tab} className={`admin-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab === 'overview' && '📊 Vue globale'}
            {tab === 'users' && `👥 Utilisateurs${stats ? ` (${stats.users.length})` : ''}`}
            {tab === 'recipes' && `🍽 Recettes${stats ? ` (${stats.recipes.length})` : ''}`}
            {tab === 'comments' && `💬 Commentaires${stats ? ` (${stats.comments.length})` : ''}`}
          </button>
        ))}
      </div>

      <main className="admin-content">
        {loading && <div className="admin-loading">⏳ Chargement...</div>}

        {!loading && stats && activeTab === 'overview' && (
          <div className="admin-overview">
            <div className="stat-cards">
              <div className="stat-card"><div className="stat-num">{stats.users.length}</div><div className="stat-label">Utilisateurs</div></div>
              <div className="stat-card"><div className="stat-num">{stats.recipes.length}</div><div className="stat-label">Recettes</div></div>
              <div className="stat-card"><div className="stat-num">{stats.recipes.filter(r => r.category === 'sucree').length}</div><div className="stat-label">🍰 Sucrées</div></div>
              <div className="stat-card"><div className="stat-num">{stats.recipes.filter(r => r.category === 'salee').length}</div><div className="stat-label">🧂 Salées</div></div>
              <div className="stat-card"><div className="stat-num">{stats.comments.length}</div><div className="stat-label">Commentaires</div></div>
              <div className="stat-card"><div className="stat-num">{stats.notifCount}</div><div className="stat-label">Notifications</div></div>
            </div>

            <h3 className="admin-section-title">⏱ Dernières activités</h3>
            <div className="admin-table">
              {[
                ...stats.comments.map(c => ({ ...c, _type: 'comment', _date: c.created_at })),
                ...stats.recipes.map(r => ({ ...r, _type: 'recipe', _date: r.created_at }))
              ]
                .sort((a, b) => new Date(b._date) - new Date(a._date))
                .slice(0, 15)
                .map((item, i) => (
                  <div key={i} className="admin-row">
                    <span className="admin-row-icon">{item._type === 'comment' ? '💬' : '🍽'}</span>
                    <span className="admin-row-main">
                      <strong>{item._type === 'comment' ? item.author : item.created_by || 'Inconnu'}</strong>
                      {item._type === 'comment' ? ' a commenté' : ` a ajouté "${item.title}"`}
                    </span>
                    <span className="admin-row-date">{new Date(item._date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {!loading && stats && activeTab === 'users' && (
          <div>
            <h3 className="admin-section-title">👥 {stats.users.length} utilisateur(s)</h3>
            <div className="admin-table">
              {stats.users.map((u, i) => {
                const userRecipes = stats.recipes.filter(r => r.created_by === u.user_name).length
                const userComments = stats.comments.filter(c => c.author === u.user_name).length
                const lastSeen = new Date(u.last_seen)
                const isRecent = (Date.now() - lastSeen) < 1000 * 60 * 30
                return (
                  <div key={i} className="admin-row">
                    <span className="admin-row-icon">{isRecent ? '🟢' : '⚪'}</span>
                    <div className="admin-row-user-info">
                      <span className="admin-row-main"><strong>{u.user_name}</strong></span>
                      <span className="admin-row-sub">{userRecipes} recette{userRecipes > 1 ? 's' : ''} · {userComments} commentaire{userComments > 1 ? 's' : ''}</span>
                      <span className="admin-row-sub">Vu le {lastSeen.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <button className="admin-btn-delete" onClick={() => askConfirm('user', u.user_name, u.user_name)}>🗑</button>
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
                    <span className="admin-row-sub">Par {r.created_by || 'Inconnu'} · {new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  <button className="admin-btn-delete" onClick={() => askConfirm('recipe', r.id, r.title)}>🗑</button>
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
                      <span className="admin-row-sub">{c.content?.slice(0, 60)}{c.content?.length > 60 ? '...' : ''}</span>
                      <span className="admin-row-sub">{new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <button className="admin-btn-delete" onClick={() => askConfirm('comment', c.id, `commentaire de ${c.author}`)}>🗑</button>
                  </div>
                ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
