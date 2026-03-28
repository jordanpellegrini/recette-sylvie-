import { markAllNotificationsRead, dismissNotification } from '../lib/supabase'

export default function NotificationsPanel({ notifications, onClose, onRefresh, user }) {
  const unread = notifications.filter(n => !n.read).length

  async function handleMarkRead() {
    await markAllNotificationsRead(user.fullName)
    onRefresh()
  }

  async function handleDismiss(notifId) {
    await dismissNotification(notifId, user.fullName)
    onRefresh()
  }

  return (
    <div className="notif-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="notif-panel">
        <div className="notif-header">
          <h3>
            🔔 Notifications
            {unread > 0 && <span className="notif-badge-inline">{unread} nouvelle{unread > 1 ? 's' : ''}</span>}
          </h3>
          <button className="notif-close" onClick={onClose}>✕</button>
        </div>

        {notifications.length === 0 && (
          <p className="notif-empty">Aucune notification 😊</p>
        )}

        <div className="notif-list">
          {notifications.map(n => (
            <div key={n.id} className={`notif-item ${n.read ? 'read' : 'unread'}`}>
              <div className="notif-icon">
                {n.comment_preview.startsWith('✨') ? '🍽' : '💬'}
              </div>
              <div className="notif-content">
                <p className="notif-text">
                  <strong>{n.comment_author}</strong>{' '}
                  {n.comment_preview.startsWith('✨')
                    ? <>a ajouté <em>"{n.recipe_title}"</em></>
                    : <>a commenté <em>"{n.recipe_title}"</em></>
                  }
                </p>
                {!n.comment_preview.startsWith('✨') && (
                  <p className="notif-preview">"{n.comment_preview}"</p>
                )}
                <p className="notif-date">
                  {new Date(n.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>
              <div className="notif-item-actions">
                {!n.read && <span className="notif-dot" />}
                <button
                  className="notif-dismiss"
                  onClick={() => handleDismiss(n.id)}
                  title="Supprimer pour moi"
                >✕</button>
              </div>
            </div>
          ))}
        </div>

        {notifications.length > 0 && (
          <div className="notif-actions">
            {unread > 0 && (
              <button className="btn-secondary" onClick={handleMarkRead}>
                ✓ Tout marquer lu
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
