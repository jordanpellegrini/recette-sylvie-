import { markAllNotificationsRead, clearNotifications } from '../lib/supabase'

export default function NotificationsPanel({ notifications, onClose, onRefresh }) {
  async function handleMarkRead() {
    await markAllNotificationsRead()
    onRefresh()
  }

  async function handleClear() {
    await clearNotifications()
    onRefresh()
  }

  return (
    <div className="notif-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="notif-panel">
        <div className="notif-header">
          <h3>🔔 Notifications</h3>
          <button className="notif-close" onClick={onClose}>✕</button>
        </div>

        {notifications.length === 0 && (
          <p className="notif-empty">Aucune notification pour l'instant 😊</p>
        )}

        <div className="notif-list">
          {notifications.map(n => (
            <div key={n.id} className={`notif-item ${n.read ? 'read' : 'unread'}`}>
              <div className="notif-icon">💬</div>
              <div className="notif-content">
                <p className="notif-text">
                  <strong>{n.comment_author}</strong> a commenté <em>"{n.recipe_title}"</em>
                </p>
                <p className="notif-preview">"{n.comment_preview}"</p>
                <p className="notif-date">
                  {new Date(n.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>

        {notifications.length > 0 && (
          <div className="notif-actions">
            <button className="btn-secondary" onClick={handleMarkRead}>Tout marquer lu</button>
            <button className="btn-delete-small" onClick={handleClear}>Tout effacer</button>
          </div>
        )}
      </div>
    </div>
  )
}
