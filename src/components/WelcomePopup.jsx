import { useState, useEffect } from 'react'
import { useTheme } from '../lib/ThemeContext'

function normalize(str) {
  return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim()
}

const SPECIAL_USERS = ['sylvie lacroix']

export default function WelcomePopup({ user, onClose }) {
  const { lang } = useTheme()
  const [visible, setVisible] = useState(false)
  const [closing, setClosing] = useState(false)
  const isSpecial = SPECIAL_USERS.includes(normalize(user.fullName))

  useEffect(() => { const t = setTimeout(() => setVisible(true), 300); return () => clearTimeout(t) }, [])

  function handleClose() { setClosing(true); setTimeout(() => { setVisible(false); onClose() }, 500) }

  if (!visible) return null

  const username = user.username || user.fullName

  return (
    <div className={`welcome-overlay ${closing ? 'closing' : ''}`} onClick={handleClose}>
      <div className={`welcome-box ${closing ? 'closing' : ''}`} onClick={e => e.stopPropagation()}>
        {isSpecial ? (
          <>
            <div className="welcome-flowers">🌸 🌷 🌸</div>
            <div className="welcome-emoji">👵🏻❤️</div>
            <h2 className="welcome-title">{lang === 'en' ? 'Welcome' : 'Bienvenue'}</h2>
            <p className="welcome-subtitle">{lang === 'en' ? 'dearest mother-in-law' : 'belle maman préférée'}</p>
            <div className="welcome-divider">✦ ✦ ✦</div>
            <p className="welcome-message">
              {lang === 'en'
                ? <>All your favourite recipes,<br/>gathered just for you 🍽</>
                : <>Toutes tes recettes préférées,<br/>réunies rien que pour toi 🍽</>
              }
            </p>
            <div className="welcome-flowers">🌸 🌷 🌸</div>
          </>
        ) : (
          <>
            <div className="welcome-emoji">👋</div>
            <h2 className="welcome-title">
              {lang === 'en' ? `Welcome ${username}!` : `Bienvenue ${username} !`}
            </h2>
            <div className="welcome-divider">✦ ✦ ✦</div>
            <p className="welcome-message">
              {lang === 'en'
                ? 'Enjoy discovering new recipes on Cooksy 🍽'
                : 'Bonne découverte sur Cooksy 🍽'
              }
            </p>
          </>
        )}
        <button className="welcome-btn" onClick={handleClose}>
          {lang === 'en' ? 'See the recipes →' : 'Voir les recettes →'}
        </button>
      </div>
    </div>
  )
}
