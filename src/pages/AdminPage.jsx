import { useState, useEffect } from 'react'
import { getAdminStats, deleteRecipe, deleteComment, adminDeleteUser, getAllFaqAdmin, answerQuestion, deleteFaq, getAllFeedback, updateFeedbackStatus, deleteFeedback } from '../lib/supabase'
import { CATEGORY_MAP } from '../lib/constants'

export default function AdminPage({ onLogout }) {
  const [stats, setStats] = useState(null)
  const [faq, setFaq] = useState([])
  const [feedback, setFeedback] = useState([])
  const [answeringId, setAnsweringId] = useState(null)
  const [answerText, setAnswerText] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [confirm, setConfirm] = useState(null)

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    setLoading(true)
    try { const [s, f, fb] = await Promise.all([getAdminStats(), getAllFaqAdmin(), getAllFeedback()]); setStats(s); setFaq(f); setFeedback(fb) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function handleConfirmDelete() {
    if (!confirm) return
    try {
      if (confirm.type === 'recipe') await deleteRecipe(confirm.id)
      else if (confirm.type === 'comment') await deleteComment(confirm.id)
      else if (confirm.type === 'user') await adminDeleteUser(confirm.id)
      else if (confirm.type === 'faq') await deleteFaq(confirm.id)
      setConfirm(null)
      await loadStats()
    } catch (e) { alert('Erreur : ' + e.message) }
  }

  const links = [
    { label: 'Vercel', icon: '▲', url: 'https://vercel.com/dashboard' },
    { label: 'Supabase', icon: '⚡', url: 'https://supabase.com/dashboard' },
    { label: 'GitHub', icon: '🐙', url: 'https://github.com' },
  ]

  return (
    <div className="admin-page">
      {confirm && (
        <div className="admin-confirm-overlay">
          <div className="admin-confirm-box">
            <h3>🗑 Confirmer</h3>
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
          <div><h1 className="admin-title">Panel Admin</h1><p className="admin-subtitle">Cooksy V3</p></div>
        </div>
        <button className="btn-logout" onClick={onLogout}>Déconnexion</button>
      </header>

      <div className="admin-links">
        {links.map(l => <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" className="admin-link-card"><span className="admin-link-icon">{l.icon}</span><span>{l.label}</span><span className="admin-link-arrow">↗</span></a>)}
        <button className="admin-link-card refresh-card" onClick={loadStats}><span className="admin-link-icon">🔄</span><span>Actualiser</span></button>
      </div>

      <div className="admin-tabs">
        {['overview','users','recipes','comments','faq','feedback'].map(tab => (
          <button key={tab} className={`admin-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab === 'overview' && '📊 Vue globale'}
            {tab === 'users' && `👥 Utilisateurs${stats ? ` (${stats.users.length})` : ''}`}
            {tab === 'recipes' && `🍽 Recettes${stats ? ` (${stats.recipes.length})` : ''}`}
            {tab === 'comments' && `💬 Commentaires${stats ? ` (${stats.comments.length})` : ''}`}
            {tab === 'faq' && `❓ FAQ${faq.length > 0 ? ` (${faq.filter(f => !f.answer).length} en attente)` : ''}`}
            {tab === 'feedback' && `📣 Feedback${feedback.filter(f => f.status === 'new').length > 0 ? ` (${feedback.filter(f => f.status === 'new').length} nouveaux)` : ''}`}
          </button>
        ))}
      </div>

      <main className="admin-content">
        {loading && <div className="admin-loading">⏳ Chargement...</div>}

        {!loading && stats && activeTab === 'overview' && (
          <div>
            <div className="stat-cards">
              <div className="stat-card"><div className="stat-num">{stats.users.length}</div><div className="stat-label">Utilisateurs</div></div>
              <div className="stat-card"><div className="stat-num">{stats.recipes.length}</div><div className="stat-label">Recettes</div></div>
              {['entree','plat','dessert','boisson','apero'].map(cat => {
                const c = CATEGORY_MAP[cat]
                return <div key={cat} className="stat-card"><div className="stat-num">{stats.recipes.filter(r => r.category === cat).length}</div><div className="stat-label">{c?.icon} {c?.label}</div></div>
              })}
              <div className="stat-card"><div className="stat-num">{stats.comments.length}</div><div className="stat-label">Commentaires</div></div>
            </div>
            <h3 className="admin-section-title">⏱ Dernières activités</h3>
            <div className="admin-table">
              {[...stats.comments.map(c => ({ ...c, _type: 'comment', _date: c.created_at })), ...stats.recipes.map(r => ({ ...r, _type: 'recipe', _date: r.created_at }))]
                .sort((a, b) => new Date(b._date) - new Date(a._date)).slice(0, 15)
                .map((item, i) => (
                  <div key={i} className="admin-row">
                    <span className="admin-row-icon">{item._type === 'comment' ? '💬' : '🍽'}</span>
                    <span className="admin-row-main"><strong>{item._type === 'comment' ? item.author : item.created_by || 'Inconnu'}</strong>{item._type === 'comment' ? ' a commenté' : ` a ajouté "${item.title}"`}</span>
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
                const isRecent = (Date.now() - new Date(u.last_seen)) < 1000 * 60 * 30
                return (
                  <div key={i} className="admin-row">
                    <span className="admin-row-icon">{isRecent ? '🟢' : '⚪'}</span>
                    <div className="admin-row-user-info">
                      <span className="admin-row-main"><strong>{u.display_name}</strong></span>
                      <span className="admin-row-sub">{u.birth_month || 'Date non renseignée'} · Vu le {new Date(u.last_seen).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <button className="admin-btn-delete" onClick={() => setConfirm({ type: 'user', id: u.user_name, label: u.display_name })}>🗑</button>
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
              {stats.recipes.map(r => {
                const cat = CATEGORY_MAP[r.category]
                return (
                  <div key={r.id} className="admin-row">
                    <span className="admin-row-icon">{cat?.icon || '🍽'}</span>
                    <div className="admin-row-user-info">
                      <span className="admin-row-main"><strong>{r.title}</strong></span>
                      <span className="admin-row-sub">Par {r.created_by || 'Inconnu'} · {new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                    </div>
                    <button className="admin-btn-delete" onClick={() => setConfirm({ type: 'recipe', id: r.id, label: r.title })}>🗑</button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {!loading && stats && activeTab === 'comments' && (
          <div>
            <h3 className="admin-section-title">💬 {stats.comments.length} commentaire(s)</h3>
            <div className="admin-table">
              {[...stats.comments].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map(c => (
                <div key={c.id} className="admin-row">
                  <span className="admin-row-icon">💬</span>
                  <div className="admin-row-user-info">
                    <span className="admin-row-main"><strong>{c.author}</strong></span>
                    <span className="admin-row-sub">{c.content?.slice(0, 80)}{c.content?.length > 80 ? '...' : ''}</span>
                    <span className="admin-row-sub">{new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <button className="admin-btn-delete" onClick={() => setConfirm({ type: 'comment', id: c.id, label: `commentaire de ${c.author}` })}>🗑</button>
                </div>
              ))}
            </div>
          </div>
        )}
        {!loading && activeTab === 'faq' && (
          <div>
            <h3 className="admin-section-title">❓ Questions des utilisateurs ({faq.length})</h3>
            <div className="admin-table">
              {faq.length === 0 && <p style={{ color: '#718096', padding: '1rem' }}>Aucune question pour l'instant.</p>}
              {faq.map(f => (
                <div key={f.id} className="admin-row faq-admin-row">
                  <div className="admin-row-user-info" style={{ flex: 1 }}>
                    <span className="admin-row-main"><strong>{f.user_name}</strong> — {f.question}</span>
                    <span className="admin-row-sub">{new Date(f.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    {f.answer && <span className="admin-row-sub" style={{ color: '#68d391' }}>✅ {f.answer}</span>}
                    {answeringId === f.id && (
                      <div className="faq-answer-form">
                        <textarea
                          className="faq-answer-input"
                          placeholder="Votre réponse..."
                          value={answerText}
                          onChange={e => setAnswerText(e.target.value)}
                          rows={3}
                        />
                        <div style={{ display: 'flex', gap: '.5rem', marginTop: '.5rem' }}>
                          <button className="admin-btn-danger" style={{ background: '#38a169' }} onClick={async () => {
                            await answerQuestion(f.id, answerText)
                            setAnsweringId(null); setAnswerText(''); loadStats()
                          }}>✓ Répondre</button>
                          <button className="admin-link-card" onClick={() => { setAnsweringId(null); setAnswerText('') }}>Annuler</button>
                        </div>
                      </div>
                    )}
                    {!f.answer && answeringId !== f.id && (
                      <button className="faq-admin-reply-btn" onClick={() => { setAnsweringId(f.id); setAnswerText('') }}>
                        📝 Répondre
                      </button>
                    )}
                  </div>
                  <button className="admin-btn-delete" onClick={() => setConfirm({ type: 'faq', id: f.id, label: `question de ${f.user_name}` })}>🗑</button>
                </div>
              ))}
            </div>
          </div>
        )}
        {!loading && activeTab === 'feedback' && (
          <div>
            <h3 className="admin-section-title">📣 Feedback ({feedback.length})</h3>
            <div className="admin-table">
              {feedback.length === 0 && <p style={{ color: '#718096', padding: '1rem' }}>Aucun feedback reçu.</p>}
              {feedback.map(fb => (
                <div key={fb.id} className={`admin-row ${fb.status === 'new' ? 'feedback-new' : ''}`}>
                  <div className="admin-row-user-info" style={{ flex: 1 }}>
                    <span className="admin-row-main">
                      <strong>{fb.user_name}</strong>
                      <span className="feedback-type-badge">{fb.type === 'bug' ? '🐛' : fb.type === 'suggestion' ? '💡' : '💬'} {fb.type}</span>
                      {fb.status === 'new' && <span className="feedback-new-badge">NEW</span>}
                      {fb.status === 'done' && <span className="feedback-done-badge">✓ Traité</span>}
                    </span>
                    <span className="admin-row-sub">{fb.message}</span>
                    <span className="admin-row-sub">{new Date(fb.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    <div style={{ display: 'flex', gap: '.4rem', marginTop: '.4rem' }}>
                      {fb.status !== 'done' && (
                        <button className="faq-admin-reply-btn" onClick={async () => { await updateFeedbackStatus(fb.id, 'done'); loadStats() }}>
                          ✓ Marquer traité
                        </button>
                      )}
                      {fb.status === 'done' && (
                        <button className="faq-admin-reply-btn" style={{ color: '#718096' }} onClick={async () => { await updateFeedbackStatus(fb.id, 'new'); loadStats() }}>
                          ↩ Rouvrir
                        </button>
                      )}
                    </div>
                  </div>
                  <button className="admin-btn-delete" onClick={async () => { if (confirm('Supprimer ce feedback ?')) { await deleteFeedback(fb.id); loadStats() } }}>🗑</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
