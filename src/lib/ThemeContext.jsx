import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true')
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'fr')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
    localStorage.setItem('darkMode', darkMode)
  }, [darkMode])

  useEffect(() => {
    localStorage.setItem('lang', lang)
  }, [lang])

  function toggleDark() { setDarkMode(prev => !prev) }
  function toggleLang() { setLang(prev => prev === 'fr' ? 'en' : 'fr') }

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDark, lang, toggleLang }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
