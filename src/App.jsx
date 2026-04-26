import { useState, useEffect } from 'react'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import RecipesPage from './pages/RecipesPage'
import WeeklyMenuPage from './pages/WeeklyMenuPage'
import ProfilePage from './pages/ProfilePage'
import FridgePage from './pages/FridgePage'
import SocialPage from './pages/SocialPage'
import AdminPage from './pages/AdminPage'
import WelcomePopup from './components/WelcomePopup'
import NotificationsPanel from './components/NotificationsPanel'
import { getNotifications, recordUserLogin } from './lib/supabase'
import { supabase } from './lib/supabase'
import { signOut, buildUserFromSession } from './lib/auth'
import './App.css'

const ADMIN_KEY = 'recettes_admin_session'
const WELCOME_KEY = 'recettes_welcome_shown'

export default function App() {
  const [user, setUser] = useState(null)
  const [sessionLoaded, setSessionLoaded] = useState(false)
  const [page, setPage] = useState('home')
  const [showWelcome, setShowWelcome] = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    const adminSession = sessionStorage.getItem(ADMIN_KEY)
    if (adminSession) {
      setUser({ prenom: 'Admin', nom: '', fullName: 'Admin', isAdmin: true })
      setSessionLoaded(true)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const u = buildUserFromSession(session)
        if (u) { setUser(u); setSessionLoaded(true); return }
      }
      setSessionLoaded(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const u = buildUserFromSession(session)
        if (u) {
          setUser(u)
          // Popup seulement si pas déjà montré cette session
          const shown = sessionStorage.getItem(WELCOME_KEY)
          if (!shown) { setShowWelcome(true); sessionStorage.setItem(WELCOME_KEY, '1') }
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        sessionStorage.removeItem(WELCOME_KEY)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user && !user.isAdmin) {
      loadNotifications()
      recordUserLogin(user.fullName, user.birthMonth)
      const channel = supabase.channel('notifs-v3')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, loadNotifications)
        .subscribe()
      return () => supabase.removeChannel(channel)
    }
  }, [user])

  async function loadNotifications() {
    if (!user) return
    try { setNotifications(await getNotifications(user.fullName)) } catch (e) { console.error(e) }
  }

  function handleLogin({ username, fullName, email, authId, isAdmin }) {
    const u = { username, fullName, email, authId, isAdmin }
    if (isAdmin) sessionStorage.setItem(ADMIN_KEY, '1')
    setUser(u)
    if (!isAdmin) {
      const shown = sessionStorage.getItem(WELCOME_KEY)
      if (!shown) { setShowWelcome(true); sessionStorage.setItem(WELCOME_KEY, '1') }
    }
  }

  async function handleLogout() {
    sessionStorage.removeItem(ADMIN_KEY)
    sessionStorage.removeItem(WELCOME_KEY)
    if (!user?.isAdmin) await signOut()
    setUser(null); setPage('home'); setNotifications([])
  }

  if (!sessionLoaded) return (
    <div className="login-page">
      <div className="login-box" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🌸</div>
        <p style={{ color: 'var(--text-light)' }}>Chargement...</p>
      </div>
    </div>
  )

  if (!user) return <LoginPage onLogin={handleLogin} />
  if (user.isAdmin) return <AdminPage onLogout={handleLogout} />

  const notifProps = { notifications, onOpenNotifications: () => setShowNotifs(true) }
  const navProps = {
    onOpenMenu: () => setPage('menu'),
    onOpenFridge: () => setPage('fridge'),
    onOpenSocial: () => setPage('social'),
    onOpenProfile: () => setPage('profile'),
  }

  return (
    <div className="app">
      {showWelcome && <WelcomePopup user={user} onClose={() => setShowWelcome(false)} />}
      {showNotifs && <NotificationsPanel notifications={notifications} onClose={() => setShowNotifs(false)} onRefresh={loadNotifications} user={user} />}
      {page === 'home' && <HomePage user={user} onNavigate={setPage} onLogout={handleLogout} {...notifProps} {...navProps} />}
      {page === 'menu' && <WeeklyMenuPage user={user} onBack={() => setPage('home')} />}
      {page === 'profile' && <ProfilePage user={user} onBack={() => setPage('home')} onLogout={handleLogout} />}
      {page === 'fridge' && <FridgePage user={user} onBack={() => setPage('home')} onNavigate={cat => setPage(cat)} />}
      {page === 'social' && <SocialPage user={user} onBack={() => setPage('home')} />}
      {!['home','menu','profile','fridge','social'].includes(page) && (
        <RecipesPage category={page} user={user} onBack={() => setPage('home')} {...notifProps} {...navProps} />
      )}
    </div>
  )
}
