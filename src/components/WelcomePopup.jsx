import { useState, useEffect } from 'react'

const SPECIAL_USER = { prenom: 'sylvie', nom: 'lacroix' }

export default function WelcomePopup({ user, onClose }) {
  const [visible, setVisible] = useState(false)
  const [closing, setClosing] = useState(false)

  const isSpecial =
    user.prenom.toLowerCase() === SPECIAL_USER.prenom &&
    user.nom.toLowerCase() === SPECIAL_USER.nom

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 300)
    return () => clearTimeout(t)
  }, [])

  function handleClose() {
    setClosing(true)
    setTimeout(() => { setVisible(false); onClose() }, 500)
  }

  if (!visible) return null

  return (
    <div className={`welcome-overlay ${closing ? 'closing' : ''}`} onClick={handleClose}>
      <div className={`welcome-box ${closing ? 'closing' : ''}`} onClick={e => e.stopPropagation()}>

        {isSpecial ? (
          <>
            <div className="welcome-flowers">🌸 🌷 🌸</div>
            <div className="welcome-emoji">👵🏻❤️</div>
            <h2 className="welcome-title">Bienvenue</h2>
            <p className="welcome-subtitle">belle maman préférée</p>
            <div className="welcome-divider">✦ ✦ ✦</div>
            <p className="welcome-message">
              Toutes tes recettes préférées,<br />
              réunies rien que pour toi 🍽
            </p>
            <div className="welcome-flowers">🌸 🌷 🌸</div>
          </>
        ) : (
          <>
            <div className="welcome-emoji">👋</div>
            <h2 className="welcome-title">Bienvenue {user.prenom} !</h2>
            <div className="welcome-divider">✦ ✦ ✦</div>
            <p className="welcome-message">
              Bonne découverte dans la cuisine de Sylvie 🍽
            </p>
          </>
        )}

        <button className="welcome-btn" onClick={handleClose}>
          Voir les recettes →
        </button>
      </div>
    </div>
  )
}
