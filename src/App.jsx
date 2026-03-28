import { useState, useEffect } from 'react'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import RecipesPage from './pages/RecipesPage'
import WelcomePopup from './components/WelcomePopup'
import NotificationsPanel from './components/NotificationsPanel'
import { getNotifications } from './lib/supabase'
import { supabase } from './lib/supabase'
import './App.css'

const USER_KEY = 'recettes_sylvie_user'

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)) } catch { return null }
  })
  const [page, setPage] = useState('home')
  const [showWelcome, setShowWelcome] = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    if (user) {
      loadNotifications()
      const channel = supabase
        .channel('notifications')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => {
          loadNotifications()
        })
        .subscribe()
      return () => supabase.removeChannel(channel)
    }
  }, [user])

  async function loadNotifications() {
    try { setNotifications(await getNotifications()) }
    catch (e) { console.error(e) }
  }

  function handleLogin({ prenom, nom, fullName }) {
    const u = { prenom, nom, fullName }
    localStorage.setItem(USER_KEY, JSON.stringify(u))
    setUser(u)
    setShowWelcome(true)
  }

  function handleLogout() {
    localStorage.removeItem(USER_KEY)
    setUser(null)
    setPage('home')
    setNotifications([])
  }

  if (!user) return <LoginPage onLogin={handleLogin} />

  return (
    <div className="app">
      {showWelcome && (
        <WelcomePopup user={user} onClose={() => setShowWelcome(false)} />
      )}

      {showNotifs && (
        <NotificationsPanel
          notifications={notifications}
          onClose={() => setShowNotifs(false)}
          onRefresh={loadNotifications}
        />
      )}

      {page === 'home' && (
        <HomePage
          user={user}
          onNavigate={cat => setPage(cat)}
          notifications={notifications}
          onOpenNotifications={() => setShowNotifs(true)}
          onLogout={handleLogout}
        />
      )}

      {(page === 'sucree' || page === 'salee') && (
        <RecipesPage
          category={page}
          user={user}
          onBack={() => setPage('home')}
          notifications={notifications}
          onOpenNotifications={() => setShowNotifs(true)}
        />
      )}
    </div>
  )
}
