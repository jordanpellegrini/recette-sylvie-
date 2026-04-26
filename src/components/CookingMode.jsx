import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '../lib/ThemeContext'
import { t } from '../lib/i18n'

export default function CookingMode({ recipe, onClose }) {
  const { lang } = useTheme()
  const [currentStep, setCurrentStep] = useState(0)
  const [timer, setTimer] = useState(null) // secondes restantes
  const [timerRunning, setTimerRunning] = useState(false)
  const [customMinutes, setCustomMinutes] = useState('')
  const [showIngredients, setShowIngredients] = useState(false)

  const steps = recipe.steps || []
  const totalSteps = steps.length
  const isFirst = currentStep === 0
  const isLast = currentStep === totalSteps - 1

  // Empêcher l'écran de se mettre en veille (Wake Lock API)
  useEffect(() => {
    let wakeLock = null
    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen')
        }
      } catch (e) { console.log('Wake lock non disponible') }
    }
    requestWakeLock()
    return () => { if (wakeLock) wakeLock.release() }
  }, [])

  // Timer
  useEffect(() => {
    if (!timerRunning || timer === null || timer <= 0) return
    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          setTimerRunning(false)
          // Vibration si disponible
          if (navigator.vibrate) navigator.vibrate([500, 200, 500])
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [timerRunning, timer])

  function formatTime(seconds) {
    if (seconds === null) return '--:--'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  function startTimer(minutes) {
    setTimer(minutes * 60)
    setTimerRunning(true)
  }

  function resetTimer() {
    setTimer(null)
    setTimerRunning(false)
    setCustomMinutes('')
  }

  function toggleTimer() {
    setTimerRunning(prev => !prev)
  }

  function goNext() { if (!isLast) { setCurrentStep(prev => prev + 1); resetTimer() } }
  function goPrev() { if (!isFirst) { setCurrentStep(prev => prev - 1); resetTimer() } }

  const timerDone = timer === 0
  const progress = ((currentStep + 1) / totalSteps) * 100

  return (
    <div className="cooking-overlay">
      {/* Header */}
      <div className="cooking-header">
        <button className="cooking-close" onClick={onClose}>{t('quit', lang)}</button>
        <div className="cooking-title-wrap">
          <h1 className="cooking-title">{recipe.title}</h1>
          <span className="cooking-step-count">{t('step', lang)} {currentStep + 1} {t('of', lang)} {totalSteps}</span>
        </div>
        <button className="cooking-ingredients-btn" onClick={() => setShowIngredients(!showIngredients)}>
          🛒
        </button>
      </div>

      {/* Barre de progression */}
      <div className="cooking-progress-bar">
        <div className="cooking-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Panel ingrédients (slide down) */}
      {showIngredients && (
        <div className="cooking-ingredients-panel">
          <h3>🛒 {t('ingredients', lang).replace('🛒 ', '')}</h3>
          <ul>
            {(recipe.ingredients || []).map((ing, i) => <li key={i}>{ing}</li>)}
          </ul>
        </div>
      )}

      {/* Étape principale */}
      <div className="cooking-main">
        <div className="cooking-step-number">{currentStep + 1}</div>
        <p className="cooking-step-text">{steps[currentStep]}</p>

        {/* Timer */}
        <div className="cooking-timer-section">
          {timer === null ? (
            <div className="cooking-timer-setup">
              <p className="cooking-timer-hint">⏱ {t('timer_hint', lang)}</p>
              <div className="cooking-timer-presets">
                {[5, 10, 15, 20, 30].map(min => (
                  <button key={min} className="cooking-preset-btn" onClick={() => startTimer(min)}>
                    {min} min
                  </button>
                ))}
              </div>
              <div className="cooking-timer-custom">
                <input
                  type="number"
                  className="cooking-timer-input"
                  placeholder="{t('timer_other', lang)}"
                  value={customMinutes}
                  onChange={e => setCustomMinutes(e.target.value)}
                  min="1"
                  max="999"
                />
                <button
                  className="cooking-preset-btn"
                  onClick={() => { if (customMinutes) startTimer(parseInt(customMinutes)) }}
                  disabled={!customMinutes}
                >
                  Go
                </button>
              </div>
            </div>
          ) : (
            <div className={`cooking-timer-display ${timerDone ? 'done' : ''}`}>
              <div className="cooking-timer-time">{formatTime(timer)}</div>
              {timerDone ? (
                <div className="cooking-timer-done">
                  <p>{t('timer_done', lang)}</p>
                  <button className="cooking-preset-btn" onClick={resetTimer}>{t('cancel', lang)}</button>
                </div>
              ) : (
                <div className="cooking-timer-controls">
                  <button className="cooking-timer-toggle" onClick={toggleTimer}>
                    {timerRunning ? t('pause', lang) : t('resume', lang)}
                  </button>
                  <button className="cooking-timer-reset" onClick={resetTimer}>✕</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="cooking-nav">
        <button
          className={`cooking-nav-btn prev ${isFirst ? 'disabled' : ''}`}
          onClick={goPrev}
          disabled={isFirst}
        >
          {t('previous', lang)}
        </button>

        {isLast ? (
          <button className="cooking-nav-btn finish" onClick={onClose}>
            {t('finished', lang)}
          </button>
        ) : (
          <button className="cooking-nav-btn next" onClick={goNext}>
            {t('next', lang)}
          </button>
        )}
      </div>

      {/* Pastilles étapes */}
      <div className="cooking-dots">
        {steps.map((_, i) => (
          <button
            key={i}
            className={`cooking-dot ${i === currentStep ? 'active' : i < currentStep ? 'done' : ''}`}
            onClick={() => { setCurrentStep(i); resetTimer() }}
          />
        ))}
      </div>
    </div>
  )
}
