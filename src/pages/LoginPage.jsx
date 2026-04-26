import { useState } from 'react'
import { signIn, signUp, signInWithGoogle, signInWithFacebook, resetPassword, checkUsernameAvailable } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { useTheme } from '../lib/ThemeContext'
import { t } from '../lib/i18n'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'sylvie2024'

export default function LoginPage({ onLogin }) {
  const { lang } = useTheme()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [adminPwd, setAdminPwd] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState(null) // null | true | false

  const isAdmin = email.trim().toLowerCase() === 'admin'

  async function handleUsernameCheck(val) {
    setUsername(val)
    if (val.length < 3) { setUsernameAvailable(null); return }
    if (!/^[a-zA-Z0-9_]+$/.test(val)) { setUsernameAvailable(false); return }
    setCheckingUsername(true)
    try {
      const available = await checkUsernameAvailable(val)
      setUsernameAvailable(available)
    } catch (e) { setUsernameAvailable(null) }
    finally { setCheckingUsername(false) }
  }

  async function handleLogin(e) {
    e.preventDefault(); setError('')
    if (isAdmin) { setMode('admin_pw'); return }
    if (!email || !password) { setError(t('fill_all', lang)); return }
    setLoading(true)
    try {
      const { session } = await signIn({ email, password })
      if (session) {
        const meta = session.user.user_metadata || {}
        const uname = meta.username || session.user.email?.split('@')[0] || 'user'
        onLogin({ username: uname, fullName: uname, email: session.user.email, authId: session.user.id, isAdmin: false })
      }
    } catch (e) { setError(e.message === 'Invalid login credentials' ? t('wrong_credentials', lang) : e.message) }
    finally { setLoading(false) }
  }

  async function handleSignUp(e) {
    e.preventDefault(); setError('')
    if (!email || !password || !username) { setError(t('fill_all', lang)); return }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) { setError(t('username_invalid', lang)); return }
    if (password !== confirmPassword) { setError(t('passwords_match', lang)); return }
    if (password.length < 6) { setError(t('min_password', lang)); return }
    if (usernameAvailable === false) { setError(t('username_taken', lang)); return }
    setLoading(true)
    try {
      await signUp({ email, password, username })
      setSuccess(t('account_created', lang)); setMode('login')
    } catch (e) {
      if (e.message === 'USERNAME_TAKEN') setError(t('username_taken', lang))
      else setError(e.message)
    }
    finally { setLoading(false) }
  }

  async function handleForgot(e) {
    e.preventDefault()
    if (!email) { setError(t('fill_all', lang)); return }
    setLoading(true)
    try { await resetPassword(email); setSuccess(t('reset_sent', lang)) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function handleResetPassword(e) {
    e.preventDefault(); setError('')
    if (newPassword !== confirmNewPassword) { setError(t('passwords_match', lang)); return }
    if (newPassword.length < 6) { setError(t('min_password', lang)); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setSuccess(t('password_changed', lang))
      window.history.replaceState({}, '', '/')
      setTimeout(() => setMode('login'), 2000)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  function handleAdminPw(e) {
    e.preventDefault()
    if (adminPwd === ADMIN_PASSWORD) { onLogin({ username: 'admin', fullName: 'Admin', isAdmin: true }) }
    else { setError(t('wrong_credentials', lang)); setAdminPwd('') }
  }

  const urlParams = new URLSearchParams(window.location.search)
  const isResetMode = urlParams.get('type') === 'recovery'

  if (isResetMode) return (
    <div className="login-page"><div className="login-box">
      <div className="login-deco">🔑</div>
      <h1 className="login-title">{t('new_password_title', lang)}</h1>
      <p className="login-subtitle">{t('new_password_subtitle', lang)}</p>
      <form onSubmit={handleResetPassword} className="login-form">
        <input type="password" className="login-input" placeholder={t('new_password', lang)} value={newPassword} onChange={e => setNewPassword(e.target.value)} autoFocus required />
        <input type="password" className="login-input" placeholder={t('confirm_new_password', lang)} value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} required />
        {error && <p className="field-error">{error}</p>}
        {success && <p className="login-success">{success}</p>}
        <button type="submit" className="login-btn" disabled={loading}>{loading ? '⏳' : t('save_password', lang)}</button>
      </form>
    </div></div>
  )

  if (mode === 'admin_pw') return (
    <div className="login-page"><div className="login-box">
      <div className="login-deco">🔐</div>
      <h1 className="login-title">{t('admin_access', lang)}</h1>
      <form onSubmit={handleAdminPw} className="login-form">
        <input type="password" className="login-input" placeholder={t('admin_password', lang)} value={adminPwd} onChange={e => setAdminPwd(e.target.value)} autoFocus required />
        {error && <p className="field-error">{error}</p>}
        <button type="submit" className="login-btn">{t('access', lang)}</button>
        <button type="button" className="btn-back-login" onClick={() => { setMode('login'); setError('') }}>{t('back', lang)}</button>
      </form>
    </div></div>
  )

  if (mode === 'forgot') return (
    <div className="login-page"><div className="login-box">
      <div className="login-deco">🔑</div>
      <h1 className="login-title">{t('forgot_title', lang)}</h1>
      <p className="login-subtitle">{t('forgot_subtitle', lang)}</p>
      <form onSubmit={handleForgot} className="login-form">
        <input type="email" className="login-input" placeholder={t('email', lang)} value={email} onChange={e => setEmail(e.target.value)} autoFocus required />
        {error && <p className="field-error">{error}</p>}
        {success && <p className="login-success">{success}</p>}
        <button type="submit" className="login-btn" disabled={loading}>{loading ? '⏳' : t('send_link', lang)}</button>
        <button type="button" className="btn-back-login" onClick={() => { setMode('login'); setError(''); setSuccess('') }}>{t('back', lang)}</button>
      </form>
    </div></div>
  )

  if (mode === 'signup') return (
    <div className="login-page"><div className="login-box">
      <div className="login-deco">🌸</div>
      <h1 className="login-title">{t('create_account', lang)}</h1>
      <form onSubmit={handleSignUp} className="login-form">

        {/* Username */}
        <label className="field-label">{t('username', lang)}</label>
        <div className="username-field">
          <input
            className={`login-input ${usernameAvailable === true ? 'input-ok' : usernameAvailable === false ? 'input-error' : ''}`}
            placeholder={t('username_hint', lang)}
            value={username}
            onChange={e => handleUsernameCheck(e.target.value)}
            autoCapitalize="none"
            required
          />
          <span className="username-status">
            {checkingUsername ? '⏳' : usernameAvailable === true ? '✅' : usernameAvailable === false ? '❌' : ''}
          </span>
        </div>
        {usernameAvailable === false && <p className="field-error">{username.length >= 3 && !/^[a-zA-Z0-9_]+$/.test(username) ? t('username_invalid', lang) : t('username_taken', lang)}</p>}

        <input type="email" className="login-input" placeholder={t('email', lang)} value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" className="login-input" placeholder={t('password', lang)} value={password} onChange={e => setPassword(e.target.value)} required />
        <input type="password" className="login-input" placeholder={t('confirm_password', lang)} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />

        {error && <p className="field-error">{error}</p>}
        {success && <p className="login-success">{success}</p>}
        <button type="submit" className="login-btn" disabled={loading || usernameAvailable === false}>
          {loading ? t('creating', lang) : t('signup_btn', lang)}
        </button>
        <div className="login-divider"><span>{lang === 'fr' ? 'ou' : 'or'}</span></div>
        <button type="button" className="btn-social google" onClick={() => signInWithGoogle()}><span>G</span> {t('google', lang)}</button>
        <button type="button" className="btn-social facebook" onClick={() => signInWithFacebook()}><span>f</span> {t('facebook', lang)}</button>
        <button type="button" className="btn-back-login" onClick={() => { setMode('login'); setError('') }}>{t('has_account', lang)}</button>
      </form>
    </div></div>
  )

  return (
    <div className="login-page"><div className="login-box">
      <div className="login-deco">🌸</div>
      <h1 className="login-title">{t('login_title', lang)}</h1>
      <p className="login-subtitle">{t('login_subtitle', lang)}</p>
      <form onSubmit={handleLogin} className="login-form">
        <input type="text" className="login-input" placeholder={`${t('email', lang)} (ou 'admin')`} value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
        {!isAdmin && <input type="password" className="login-input" placeholder={t('password', lang)} value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />}
        {error && <p className="field-error">{error}</p>}
        {success && <p className="login-success">{success}</p>}
        <button type="submit" className="login-btn" disabled={loading}>{loading ? t('connecting', lang) : t('signin', lang)}</button>
        <button type="button" className="btn-forgot" onClick={() => { setMode('forgot'); setError(''); setSuccess('') }}>{t('forgot', lang)}</button>
        <div className="login-divider"><span>{lang === 'fr' ? 'ou' : 'or'}</span></div>
        <button type="button" className="btn-social google" onClick={() => signInWithGoogle()}><span>G</span> {t('google', lang)}</button>
        <button type="button" className="btn-social facebook" onClick={() => signInWithFacebook()}><span>f</span> {t('facebook', lang)}</button>
        <button type="button" className="btn-back-login" onClick={() => { setMode('signup'); setError('') }}>{t('no_account', lang)}</button>
      </form>
      <p className="login-hint">{t('admin_hint', lang)}</p>
    </div></div>
  )
}
