import { useState, useEffect, useRef } from 'react'
import { getProfile, upsertProfile, uploadAvatar, getUserStats, getNiveau, getCookingLog, getFavorites, getRecipes, getRecipeTranslation } from '../lib/supabase'
import { supabase } from '../lib/supabase'
import { useTheme } from '../lib/ThemeContext'
import { t } from '../lib/i18n'
import { CATEGORIES } from '../lib/constants'

const BADGES_INFO = {
  first_recipe:  { labelKey: 'first_recipe_badge', icon: '👩‍🍳' },
  five_recipes:  { labelKey: 'five_recipes_badge',  icon: '📚' },
  ten_recipes:   { labelKey: 'ten_recipes_badge',   icon: '🏆' },
  first_comment: { labelKey: 'first_comment_badge', icon: '💬' },
  chef:          { labelKey: 'chef_badge',           icon: '⭐' },
  social:        { labelKey: 'social_badge',         icon: '👥' },
}

export default function ProfilePage({ user, onBack, onLogout }) {
  const { lang } = useTheme()
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [cookingLog, setCookingLog] = useState([])
  const [favorites, setFavorites] = useState([])
  const [allRecipes, setAllRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [recipeTranslations, setRecipeTranslations] = useState({}) // { recipeId: { title } }
  const [activeTab, setActiveTab] = useState('dashboard')
  const [saving, setSaving] = useState(false)
  const [bio, setBio] = useState('')
  const [specialite, setSpecialite] = useState('')
  const [ville, setVille] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')
  const avatarRef = useRef(null)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [prof, st, log, favIds, recipes] = await Promise.all([
        getProfile(user.fullName),
        getUserStats(user.fullName),
        getCookingLog(10),
        getFavorites(user.fullName),
        getRecipes()
      ])
      setProfile(prof || {})
      setStats(st)
      setCookingLog(log.filter(l => l.user_name === user.fullName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim()))
      setAllRecipes(recipes)
      setFavorites(recipes.filter(r => favIds.includes(r.id)))
      // Charger les traductions en cache pour toutes les recettes
      if (lang !== 'fr') {
        const translations = {}
        await Promise.all(recipes.map(async r => {
          const tr = await getRecipeTranslation(r.id, lang).catch(() => null)
          if (tr) translations[r.id] = tr
        }))
        setRecipeTranslations(translations)
      }
      setBio(prof?.bio || '')
      setSpecialite(prof?.specialite || '')
      setVille(prof?.ville || '')
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function handleSaveProfile() {
    if (password && password !== confirmPassword) { setPwError(t('passwords_match', lang)); return }
    setSaving(true)
    try {
      const updates = { bio, specialite, ville }
      if (password) {
        const { error: pwErr } = await supabase.auth.updateUser({ password })
        if (pwErr) throw pwErr
      }
      await upsertProfile(user.fullName, updates)
      setProfile(prev => ({ ...prev, ...updates }))
      setPwSuccess(t('password_changed', lang))
      setPassword(''); setConfirmPassword(''); setPwError('')
    } catch (e) { alert(t('error', lang) + ' ' + e.message) }
    finally { setSaving(false) }
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    try {
      const url = await uploadAvatar(file, user.fullName)
      await upsertProfile(user.fullName, { avatar_url: url })
      setProfile(prev => ({ ...prev, avatar_url: url }))
    } catch (e) { alert(t('error', lang) + ' ' + e.message) }
  }

  const niveau = getNiveau(profile?.points || 0)
  
  // Retourne le titre traduit si disponible, sinon l'original
  function getTitle(recipe) {
    return recipeTranslations[recipe.id]?.title || recipe.title
  }
  const badges = (profile?.badges || []).map(id => BADGES_INFO[id]).filter(Boolean)
  const myRecipes = allRecipes.filter(r => r.created_by === user.fullName)

  if (loading) return (
    <div className="profile-page">
      <div className="state-message"><div className="loader">🍴</div><p>{t('loading', lang)}</p></div>
    </div>
  )

  return (
    <div className="profile-page">
      <header className="profile-header">
        <button className="back-btn" onClick={onBack}>{t('back', lang)}</button>
        <h1 className="profile-title">{t('my_profile', lang)}</h1>
        <button className="btn-logout" onClick={onLogout}>{t('logout', lang)}</button>
      </header>

      <div className="profile-hero">
        <div className="profile-avatar-wrap">
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="Avatar" className="profile-avatar" />
            : <div className="profile-avatar-placeholder">{user.username || user.fullName[0]?.toUpperCase()}</div>
          }
          <button className="profile-avatar-edit" onClick={() => avatarRef.current.click()}>📷</button>
          <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
        </div>
        <div className="profile-info">
          <h2 className="profile-name">@{user.username || user.fullName}</h2>
          {profile?.specialite && <p className="profile-specialite">🍳 {profile.specialite}</p>}
          {profile?.ville && <p className="profile-ville">📍 {profile.ville}</p>}
          {profile?.bio && <p className="profile-bio">{profile.bio}</p>}
          <div className="profile-niveau">
            <span className="niveau-icon">{niveau.icon}</span>
            <span className="niveau-label">{niveau.label}</span>
            <span className="niveau-points">{profile?.points || 0} pts</span>
          </div>
        </div>
      </div>

      {badges.length > 0 && (
        <div className="profile-badges">
          {badges.map((b, i) => (
            <div key={i} className="badge-chip">
              <span>{b.icon}</span>
              <span>{t(b.labelKey, lang)}</span>
            </div>
          ))}
        </div>
      )}

      {stats && (
        <div className="profile-stats">
          <div className="profile-stat"><span className="stat-num">{stats.recipes}</span><span className="stat-lbl">{t('recipes_count', lang)}</span></div>
          <div className="profile-stat"><span className="stat-num">{stats.cooked}</span><span className="stat-lbl">{t('cooked_count', lang)}</span></div>
          <div className="profile-stat"><span className="stat-num">{stats.favorites}</span><span className="stat-lbl">{t('favorites_count', lang)}</span></div>
          <div className="profile-stat"><span className="stat-num">{stats.comments}</span><span className="stat-lbl">{t('comments_count', lang)}</span></div>
        </div>
      )}

      <div className="profile-tabs">
        <button className={`profile-tab ${activeTab==='dashboard'?'active':''}`} onClick={() => setActiveTab('dashboard')}>{t('dashboard', lang)}</button>
        <button className={`profile-tab ${activeTab==='recipes'?'active':''}`} onClick={() => setActiveTab('recipes')}>{t('my_recipes', lang)}</button>
        <button className={`profile-tab ${activeTab==='favorites'?'active':''}`} onClick={() => setActiveTab('favorites')}>{t('favorites', lang)}</button>
        <button className={`profile-tab ${activeTab==='edit'?'active':''}`} onClick={() => setActiveTab('edit')}>{t('edit', lang)}</button>
      </div>

      <div className="profile-content">
        {activeTab === 'dashboard' && (
          <div>
            <h3 className="profile-section-title">{t('last_cooked', lang)}</h3>
            {cookingLog.length === 0
              ? <p className="profile-empty">{t('no_cooked', lang)}</p>
              : <div className="cooking-log-list">
                  {cookingLog.map((log, i) => (
                    <div key={i} className="cooking-log-item">
                      {log.recipes?.photo_url && <img src={log.recipes.photo_url} alt="" className="log-photo" />}
                      <div className="log-info">
                        <span className="log-title">{(log.recipes && (recipeTranslations[log.recipes.id]?.title || log.recipes.title)) || (lang === 'en' ? 'Deleted recipe' : 'Recette supprimée')}</span>
                        <span className="log-date">{new Date(log.cooked_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long' })}</span>
                        {log.note && <span className="log-note">"{log.note}"</span>}
                      </div>
                      <span className="log-cat">{CATEGORIES.find(c=>c.id===log.recipes?.category)?.icon}</span>
                    </div>
                  ))}
                </div>
            }
            <h3 className="profile-section-title" style={{ marginTop: '1.5rem' }}>{t('badges_title', lang)}</h3>
            <div className="badges-grid">
              {Object.entries(BADGES_INFO).map(([id, b]) => {
                const earned = (profile?.badges || []).includes(id)
                return (
                  <div key={id} className={`badge-card ${earned ? 'earned' : 'locked'}`}>
                    <span className="badge-icon">{earned ? b.icon : '🔒'}</span>
                    <span className="badge-label">{t(b.labelKey, lang)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === 'recipes' && (
          <div>
            <h3 className="profile-section-title">{t('my_recipes', lang)} ({myRecipes.length})</h3>
            {myRecipes.length === 0
              ? <p className="profile-empty">{t('no_recipes_yet', lang)}</p>
              : <div className="profile-recipe-grid">
                  {myRecipes.map(r => (
                    <div key={r.id} className="profile-recipe-card">
                      {r.photo_url
                        ? <img src={r.photo_url} alt={r.title} className="profile-recipe-photo" />
                        : <div className="profile-recipe-placeholder">{CATEGORIES.find(c=>c.id===r.category)?.icon}</div>
                      }
                      <div className="profile-recipe-info">
                        <span className="profile-recipe-title">{getTitle(r)}</span>
                        <span className="profile-recipe-cat">{t(r.category, lang)}</span>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}

        {activeTab === 'favorites' && (
          <div>
            <h3 className="profile-section-title">{t('favorites', lang)} ({favorites.length})</h3>
            {favorites.length === 0
              ? <p className="profile-empty">{t('no_favorites', lang)}</p>
              : <div className="profile-recipe-grid">
                  {favorites.map(r => (
                    <div key={r.id} className="profile-recipe-card">
                      {r.photo_url
                        ? <img src={r.photo_url} alt={r.title} className="profile-recipe-photo" />
                        : <div className="profile-recipe-placeholder">{CATEGORIES.find(c=>c.id===r.category)?.icon}</div>
                      }
                      <div className="profile-recipe-info">
                        <span className="profile-recipe-title">{getTitle(r)}</span>
                        <span className="profile-recipe-cat">{t(r.category, lang)}</span>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}

        {activeTab === 'edit' && (
          <div className="profile-edit-form">
            <label className="field-label">{t('bio', lang)}</label>
            <textarea className="field-textarea" placeholder={t('bio_placeholder', lang)} value={bio} onChange={e => setBio(e.target.value)} rows={3} />
            <label className="field-label">{t('specialite', lang)}</label>
            <input className="field-input" placeholder={t('specialite_placeholder', lang)} value={specialite} onChange={e => setSpecialite(e.target.value)} />
            <label className="field-label">{t('ville', lang)}</label>
            <input className="field-input" placeholder={t('ville_placeholder', lang)} value={ville} onChange={e => setVille(e.target.value)} />
            <label className="field-label">{t('new_password', lang)}</label>
            <input className="field-input" type="password" placeholder={lang === 'en' ? 'Leave empty to keep current' : 'Laisser vide pour ne pas changer'} value={password} onChange={e => setPassword(e.target.value)} />
            {password && <>
              <label className="field-label">{t('confirm_new_password', lang)}</label>
              <input className="field-input" type="password" placeholder={t('confirm_password', lang)} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            </>}
            {pwError && <p className="field-error">{pwError}</p>}
            {pwSuccess && <p className="login-success">{pwSuccess}</p>}
            <div style={{ display: 'flex', gap: '.75rem', marginTop: '1.25rem' }}>
              <button className="btn-primary" onClick={handleSaveProfile} disabled={saving}>
                {saving ? t('saving_profile', lang) : t('save_profile', lang)}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
