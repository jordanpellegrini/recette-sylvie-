import { useTheme } from '../lib/ThemeContext'
import { t } from '../lib/i18n'
import { markAllNotificationsRead, dismissNotification } from '../lib/supabase'

export default function NotificationsPanel({ notifications, onClose, onRefresh, user }) {
  const { lang } = useTheme()
  const unread = notifications.filter(n => !n.read).length

  async function handleMarkRead() { await markAllNotificationsRead(user.fullName); onRefresh() }
  async function handleDismiss(id) { await dismissNotification(id, user.fullName); onRefresh() }

  return (
    <div className="notif-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="notif-panel">
        <div className="notif-header">
          <h3>🔔 {t('notifications', lang)} {unread > 0 && <span className="notif-badge-inline">{unread} {unread === 1 ? t('new_notif', lang) : t('new_notifs', lang)}</span>}</h3>
          <button className="notif-close" onClick={onClose}>✕</button>
        </div>
        {notifications.length === 0 && <p className="notif-empty">{t('no_notifs', lang)}</p>}
        <div className="notif-list">
          {notifications.map(n => (
            <div key={n.id} className={`notif-item ${n.read ? 'read' : 'unread'}`}>
              <div className="notif-icon">{n.comment_preview.startsWith('✨') ? '🍽' : '💬'}</div>
              <div className="notif-content">
                <p className="notif-text">
                  <strong>{n.comment_author}</strong>{' '}
                  {n.comment_preview.startsWith('✨')
                    ? <>{t('added_recipe', lang)} <em>"{n.recipe_title}"</em></>
                    : <>{t('commented', lang)} <em>"{n.recipe_title}"</em></>
                  }
                </p>
                {!n.comment_preview.startsWith('✨') && <p className="notif-preview">"{n.comment_preview}"</p>}
                <p className="notif-date">{new Date(n.created_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <div className="notif-item-actions">
                {!n.read && <span className="notif-dot" />}
                <button className="notif-dismiss" onClick={() => handleDismiss(n.id)} title="✕">✕</button>
              </div>
            </div>
          ))}
        </div>
        {unread > 0 && <div className="notif-actions"><button className="btn-secondary" onClick={handleMarkRead}>{t('mark_read', lang)}</button></div>}
      </div>
    </div>
  )
}
