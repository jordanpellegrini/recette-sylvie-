import { useState, useEffect } from 'react'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import RecipesPage from './pages/RecipesPage'
import AdminPage from './pages/AdminPage'
import WelcomePopup from './components/WelcomePopup'
import NotificationsPanel from './components/NotificationsPanel'
import { getNotifications, recordUserLogin } from './lib/supabase'
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
    if (user && !user.isAdmin) {
      loadNotifications()
      recordUserLogin(user.fullName)
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
    if (!user) return
    try { setNotifications(await getNotifications(user.fullName)) }
    catch (e) { console.error(e) }
  }

  function handleLogin({ prenom, nom, fullName, isAdmin }) {
    const u = { prenom, nom, fullName, isAdmin }
    localStorage.setItem(USER_KEY, JSON.stringify(u))
    setUser(u)
    if (!isAdmin) setShowWelcome(true)
  }

  function handleLogout() {
    localStorage.removeItem(USER_KEY)
    setUser(null)
    setPage('home')
    setNotifications([])
  }

  if (!user) return <LoginPage onLogin={handleLogin} />

  // Page Admin — complètement séparée
  if (user.isAdmin) return <AdminPage onLogout={handleLogout} />

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
          user={user}
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
