import { useState } from 'react'
import { useTheme } from '../lib/ThemeContext'
import { t } from '../lib/i18n'
import { CATEGORIES } from '../lib/constants'
import ImportModal from '../components/ImportModal'
import FAQModal from '../components/FAQModal'
import FeedbackModal from '../components/FeedbackModal'
import ManualRecipeModal from '../components/ManualRecipeModal'

export default function HomePage({ user, onNavigate, notifications, onOpenNotifications, onLogout, onOpenMenu, onOpenFridge, onOpenSocial, onOpenProfile }) {
  const { darkMode, toggleDark, lang, toggleLang } = useTheme()
  const [showImport, setShowImport] = useState(false)
  const [showFaq, setShowFaq] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const unread = notifications.filter(n => !n.read).length

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="home-header-top">
          <div className="home-user">
            <button className="btn-profile" onClick={onOpenProfile}>
              👤 <span>{user.fullName}</span>
            </button>
            <button className="btn-logout" onClick={onLogout}>{t('logout', lang)}</button>
          </div>
          <div className="home-header-actions">
            <button className="btn-theme-toggle" onClick={() => setShowFaq(true)} title="Aide">❓</button>
            <button className="btn-theme-toggle" onClick={() => setShowFeedback(true)} title="Feedback">📣</button>
            <button className="btn-theme-toggle" onClick={toggleDark} title={darkMode ? 'Mode clair' : 'Mode sombre'}>{darkMode ? '☀️' : '🌙'}</button>
            <button className="btn-theme-toggle" onClick={toggleLang} title="Langue">{lang === 'fr' ? '🇫🇷' : '🇬🇧'}</button>
            <button className="btn-menu-week" onClick={onOpenSocial} title="Social">👥</button>
            <button className="btn-menu-week" onClick={onOpenMenu} title="Menu">📅</button>
            <button className="notif-btn" onClick={onOpenNotifications}>
              🔔 {unread > 0 && <span className="notif-badge">{unread}</span>}
            </button>
          </div>
        </div>

        <div className="home-hero">
          <div className="home-deco">✦ ✦ ✦</div>
          <h1 className="home-title">{lang === 'fr' ? 'Cooksy —' : 'Cooksy —'} {user.username || user.fullName}</h1>
          <p className="home-tagline">{t('tagline', lang)}</p>
          <div className="home-deco">✦ ✦ ✦</div>
        </div>

        <div className="home-import">
          <button className="btn-import-home" onClick={() => setShowImport(true)}>{t('import', lang)}</button>
          <button className="btn-manual-home" onClick={() => setShowManual(true)}>{t('add', lang)}</button>
          <button className="btn-fridge-home" onClick={onOpenFridge}>{t('fridge_btn', lang)}</button>
        </div>
      </header>

      <main className="home-categories">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className="category-tile"
            style={{ '--cat-color': cat.color, '--cat-bg': cat.bg }}
            onClick={() => onNavigate(cat.id)}
          >
            <div className="tile-icon">{cat.icon}</div>
            <h2 className="tile-title">{t(cat.id, lang)}</h2>
            <span className="tile-arrow">→</span>
          </button>
        ))}
      </main>

      <footer className="home-footer">
        <p>{t('made_with', lang)} · {new Date().getFullYear()}</p>
      </footer>

      {showImport && <ImportModal user={user} onClose={() => setShowImport(false)} onImported={cat => { setShowImport(false); onNavigate(cat) }} />}
      {showManual && <ManualRecipeModal user={user} onClose={() => setShowManual(false)} onSaved={cat => { setShowManual(false); onNavigate(cat) }} />}
      {showFaq && <FAQModal user={user} onClose={() => setShowFaq(false)} />}
      {showFeedback && <FeedbackModal user={user} onClose={() => setShowFeedback(false)} />}
    </div>
  )
}
