import { useState, useEffect } from 'react'

export default function WelcomePopup() {
  const [visible, setVisible] = useState(false)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 300)
    return () => clearTimeout(timer)
  }, [])

  function handleClose() {
    setClosing(true)
    setTimeout(() => setVisible(false), 500)
  }

  if (!visible) return null

  return (
    <div className={`welcome-overlay ${closing ? 'closing' : ''}`} onClick={handleClose}>
      <div className={`welcome-box ${closing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="welcome-flowers">🌸 🌷 🌸</div>
        <div className="welcome-emoji">👵🏻❤️</div>
        <h2 className="welcome-title">Bienvenue</h2>
        <p className="welcome-subtitle">belle maman préférée</p>
        <div className="welcome-divider">✦ ✦ ✦</div>
        <p className="welcome-message">
          Toutes tes recettes préférées,<br />
          réunies rien que pour toi 🍽
        </p>
        <button className="welcome-btn" onClick={handleClose}>
          Voir mes recettes →
        </button>
        <div className="welcome-flowers">🌸 🌷 🌸</div>
      </div>
    </div>
  )
}
