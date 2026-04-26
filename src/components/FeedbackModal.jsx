import { useState } from 'react'
import { submitFeedback } from '../lib/supabase'
import { useTheme } from '../lib/ThemeContext'

export default function FeedbackModal({ user, onClose }) {
  const { lang } = useTheme()
  const [message, setMessage] = useState('')
  const [type, setType] = useState('suggestion')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const types = [
    { id: 'bug',        label: lang === 'fr' ? '🐛 Bug trouvé'        : '🐛 Bug found' },
    { id: 'suggestion', label: lang === 'fr' ? '💡 Suggestion'         : '💡 Suggestion' },
    { id: 'autre',      label: lang === 'fr' ? '💬 Autre'              : '💬 Other' },
  ]

  async function handleSubmit() {
    if (!message.trim()) return
    setSending(true)
    try {
      await submitFeedback(user.fullName, message.trim(), type)
      setSent(true)
    } catch (e) { alert('Erreur : ' + e.message) }
    finally { setSending(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2 className="modal-title">📣 {lang === 'fr' ? 'Feedback & Suggestions' : 'Feedback & Suggestions'}</h2>
        <p className="modal-subtitle">
          {lang === 'fr'
            ? 'Partagez vos idées ou signalez un problème — seul l\'admin peut voir vos messages'
            : 'Share your ideas or report an issue — only the admin can see your messages'}
        </p>

        {!sent ? (
          <>
            <label className="field-label">{lang === 'fr' ? 'Type' : 'Type'}</label>
            <div className="feedback-types">
              {types.map(tp => (
                <button
                  key={tp.id}
                  className={`feedback-type-btn ${type === tp.id ? 'active' : ''}`}
                  onClick={() => setType(tp.id)}
                >
                  {tp.label}
                </button>
              ))}
            </div>

            <label className="field-label">{lang === 'fr' ? 'Votre message' : 'Your message'}</label>
            <textarea
              className="field-textarea"
              placeholder={lang === 'fr'
                ? 'Décrivez le bug ou votre suggestion...' 
                : 'Describe the bug or your suggestion...'}
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={5}
            />

            <div className="modal-actions">
              <button className="btn-secondary" onClick={onClose}>
                {lang === 'fr' ? 'Annuler' : 'Cancel'}
              </button>
              <button className="btn-primary" onClick={handleSubmit} disabled={sending || !message.trim()}>
                {sending ? '⏳...' : lang === 'fr' ? '📨 Envoyer' : '📨 Send'}
              </button>
            </div>
          </>
        ) : (
          <div className="success-screen">
            <div className="success-icon">🙏</div>
            <h2>{lang === 'fr' ? 'Merci !' : 'Thank you!'}</h2>
            <p>{lang === 'fr' ? 'Votre feedback a bien été reçu.' : 'Your feedback has been received.'}</p>
            <button className="btn-primary" style={{marginTop:'1rem'}} onClick={onClose}>
              {lang === 'fr' ? 'Fermer' : 'Close'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
