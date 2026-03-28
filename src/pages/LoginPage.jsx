import { useState } from 'react'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'sylvie2024'

export default function LoginPage({ onLogin }) {
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [step, setStep] = useState('form') // 'form' | 'admin_password'
  const [adminPassword, setAdminPassword] = useState('')
  const [adminError, setAdminError] = useState('')

  const isAdmin = prenom.trim().toLowerCase() === 'admin' && nom.trim().toLowerCase() === 'admin'

  function handleSubmit(e) {
    e.preventDefault()
    if (!prenom.trim() || !nom.trim()) return
    if (isAdmin) {
      setStep('admin_password')
      return
    }
    onLogin({ prenom: prenom.trim(), nom: nom.trim(), fullName: `${prenom.trim()} ${nom.trim()}`, isAdmin: false })
  }

  function handleAdminPassword(e) {
    e.preventDefault()
    if (adminPassword === ADMIN_PASSWORD) {
      onLogin({ prenom: 'Admin', nom: 'Admin', fullName: 'Admin', isAdmin: true })
    } else {
      setAdminError('Mot de passe incorrect.')
      setAdminPassword('')
    }
  }

  if (step === 'admin_password') {
    return (
      <div className="login-page">
        <div className="login-box">
          <div className="login-deco">🔐</div>
          <h1 className="login-title">Accès Admin</h1>
          <p className="login-subtitle">Entrez le mot de passe administrateur</p>
          <form onSubmit={handleAdminPassword} className="login-form">
            <input
              type="password"
              className="login-input"
              placeholder="Mot de passe"
              value={adminPassword}
              onChange={e => setAdminPassword(e.target.value)}
              autoFocus
              required
            />
            {adminError && <p className="field-error">{adminError}</p>}
            <button type="submit" className="login-btn">Accéder →</button>
            <button type="button" className="btn-back-login" onClick={() => setStep('form')}>← Retour</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-deco">🌸</div>
        <h1 className="login-title">Recettes de Sylvie</h1>
        <p className="login-subtitle">Qui êtes-vous ?</p>
        <form onSubmit={handleSubmit} className="login-form">
          <input name="prenom" className="login-input" placeholder="Prénom" value={prenom} onChange={e => setPrenom(e.target.value)} autoComplete="given-name" required />
          <input name="nom" className="login-input" placeholder="Nom de famille" value={nom} onChange={e => setNom(e.target.value)} autoComplete="family-name" required />
          <button type="submit" className="login-btn">Entrer dans la cuisine →</button>
        </form>
        <p className="login-hint">Votre nom sera affiché sur vos commentaires</p>
      </div>
    </div>
  )
}
