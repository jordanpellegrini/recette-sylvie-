import { useState, useEffect } from 'react'
import { getFaq, submitQuestion } from '../lib/supabase'
import { useTheme } from '../lib/ThemeContext'
import { t } from '../lib/i18n'

export default function FAQModal({ user, onClose }) {
  const { lang } = useTheme()
  const [faqs, setFaqs] = useState([])
  const [loading, setLoading] = useState(true)
  const [question, setQuestion] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [openId, setOpenId] = useState(null)

  useEffect(() => { loadFaq() }, [])

  async function loadFaq() {
    setLoading(true)
    try { setFaqs(await getFaq()) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function handleSubmit() {
    if (!question.trim()) return
    setSending(true)
    try {
      await submitQuestion(user.fullName, question.trim())
      setSent(true); setQuestion('')
    } catch (e) { alert(t('error', lang) + ' ' + e.message) }
    finally { setSending(false) }
  }

  const answered = faqs.filter(f => f.answer)
  const pending = faqs.filter(f => !f.answer && f.user_name === user.fullName?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim())

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box modal-box-large">
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2 className="modal-title">❓ {t('faq_title', lang)}</h2>
        <p className="modal-subtitle">{t('faq_subtitle', lang)}</p>

        <div className="faq-ask-section">
          <label className="field-label">{t('ask_question', lang)}</label>
          {sent ? (
            <div className="faq-sent">
              ✅ {t('question_sent', lang)}
              <button className="btn-faq-new" onClick={() => setSent(false)}>{t('ask_another', lang)}</button>
            </div>
          ) : (
            <>
              <textarea className="field-textarea" placeholder={t('question_placeholder', lang)} value={question} onChange={e => setQuestion(e.target.value)} rows={3} />
              <button className="btn-primary" onClick={handleSubmit} disabled={sending || !question.trim()}>
                {sending ? t('sending', lang) : t('send_question', lang)}
              </button>
            </>
          )}
        </div>

        {pending.length > 0 && (
          <div className="faq-pending">
            <h3 className="faq-section-title">{t('pending_questions', lang)}</h3>
            {pending.map(f => (
              <div key={f.id} className="faq-item pending">
                <p className="faq-question">❓ {f.question}</p>
                <p className="faq-waiting">{t('waiting_answer', lang)}</p>
              </div>
            ))}
          </div>
        )}

        <div className="faq-list">
          <h3 className="faq-section-title">{t('frequent_questions', lang)}</h3>
          {loading && <p className="profile-empty">{t('loading', lang)}</p>}
          {!loading && answered.length === 0 && (
            <p className="profile-empty">{t('no_faq', lang)}</p>
          )}
          {answered.map(f => (
            <div key={f.id} className="faq-item" onClick={() => setOpenId(openId === f.id ? null : f.id)}>
              <div className="faq-question-row">
                <p className="faq-question">❓ {f.question}</p>
                <span className="faq-chevron">{openId === f.id ? '▲' : '▼'}</span>
              </div>
              {openId === f.id && (
                <div className="faq-answer">
                  <p>✅ {f.answer}</p>
                  <span className="faq-by">{lang === 'fr' ? `— Répondu le` : `— Answered on`} {new Date(f.answered_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long' })}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
