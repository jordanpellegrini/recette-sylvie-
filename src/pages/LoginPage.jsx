import { useState, useEffect } from 'react'
import { getUserActivity } from '../lib/supabase'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'sylvie2024'

// Normalise un nom pour la comparaison (sans accents, minuscules)
function normalize(str) {
  return str.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

// Capitalise chaque mot : "sylvie lacroix" → "Sylvie Lacroix"
function capitalize(str) {
  return str.trim().replace(/\b\w/g, c => c.toUpperCase())
}

export default function LoginPage({ onLogin }) {
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [step, setStep] = useState('form')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminError, setAdminError] = useState('')
  const [knownUsers, setKnownUsers] = useState([])
  const [suggestion, setSuggestion] = useState(null)

  const isAdmin = normalize(prenom) === 'admin' && normalize(nom) === 'admin'

  // Charge la liste des utilisateurs connus depuis Supabase
  useEffect(() => {
    getUserActivity()
      .then(users => setKnownUsers(users))
      .catch(() => {})
  }, [])

  // Cherche une correspondance approximative quand prenom ou nom change
  useEffect(() => {
    if (!prenom.trim() && !nom.trim()) { setSuggestion(null); return }
    const fullInput = normalize(`${prenom} ${nom}`)
    const match = knownUsers.find(u => {
      const knownNorm = normalize(u.user_name)
      return knownNorm === fullInput || (
        fullInput.length >= 3 && knownNorm.includes(fullInput.split(' ')[0]) &&
        (fullInput.split(' ')[1] === '' || knownNorm.includes(fullInput.split(' ')[1] || ''))
      )
    })
    setSuggestion(match && normalize(match.user_name) !== fullInput ? match : null)
  }, [prenom, nom, knownUsers])

  function applySuggestion() {
    if (!suggestion) return
    const parts = suggestion.user_name.split(' ')
    setPrenom(parts[0] || '')
    setNom(parts.slice(1).join(' ') || '')
    setSuggestion(null)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!prenom.trim() || !nom.trim()) return
    if (isAdmin) { setStep('admin_password'); return }

    // Cherche si cet utilisateur existe déjà (comparaison normalisée)
    const fullInput = normalize(`${prenom} ${nom}`)
    const existing = knownUsers.find(u => normalize(u.user_name) === fullInput)

    // Si trouvé, utilise le nom tel qu'il est stocké (bonnes majuscules)
    // Sinon, capitalise ce qu'il a tapé
    const finalName = existing ? existing.user_name : capitalize(`${prenom} ${nom}`)
    const parts = finalName.split(' ')
    const finalPrenom = parts[0]
    const finalNom = parts.slice(1).join(' ')

    onLogin({ prenom: finalPrenom, nom: finalNom, fullName: finalName, isAdmin: false })
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
          <input
            name="prenom"
            className="login-input"
            placeholder="Prénom"
            value={prenom}
            onChange={e => setPrenom(e.target.value)}
            autoComplete="given-name"
            required
          />
          <input
            name="nom"
            className="login-input"
            placeholder="Nom de famille"
            value={nom}
            onChange={e => setNom(e.target.value)}
            autoComplete="family-name"
            required
          />

          {/* Suggestion si correspondance approximative trouvée */}
          {suggestion && (
            <div className="login-suggestion" onClick={applySuggestion}>
              <span>👋 C'est vous ?</span>
              <strong>{suggestion.user_name}</strong>
              <span className="suggestion-tap">Appuyez pour confirmer</span>
            </div>
          )}

          <button type="submit" className="login-btn">
            Entrer dans la cuisine →
          </button>
        </form>
        <p className="login-hint">Les majuscules ne sont pas importantes — on vous reconnaît quand même !</p>
      </div>
    </div>
  )
}
