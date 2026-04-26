import { useState, useEffect, useRef } from 'react'
import { getCookingLog, getChallenges, createChallenge, joinChallenge, logCooking, getRecipes, deleteChallenge, updateChallenge, uploadChallengePhoto, getRecipeTranslation, supabase } from '../lib/supabase'
import { CATEGORIES } from '../lib/constants'
import { useTheme } from '../lib/ThemeContext'
import { t } from '../lib/i18n'

function normalize(str) {
  return (str||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim()
}

export default function SocialPage({ user, onBack }) {
  const [activeTab, setActiveTab] = useState('log')
  const [log, setLog] = useState([])
  const [challenges, setChallenges] = useState([])
  const [recipes, setRecipes] = useState([])
  const { lang } = useTheme()
  const [loading, setLoading] = useState(true)
  const [recipeTranslations, setRecipeTranslations] = useState({})

  // Nouveau défi
  const [showNewChallenge, setShowNewChallenge] = useState(false)
  const [challengeTitle, setChallengeTitle] = useState('')
  const [challengeDesc, setChallengeDesc] = useState('')
  const [challengeIngredient, setChallengeIngredient] = useState('')
  const [challengeEnds, setChallengeEnds] = useState('')

  // Édition défi
  const [editingChallenge, setEditingChallenge] = useState(null)

  // Log cuisine
  const [showLogForm, setShowLogForm] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState('')
  const [logNote, setLogNote] = useState('')
  const [logSearch, setLogSearch] = useState('')

  // Participation défi avec photo
  const [joiningChallenge, setJoiningChallenge] = useState(null) // challenge object
  const [joinRecipe, setJoinRecipe] = useState('')
  const [joinNote, setJoinNote] = useState('')
  const [joinPhoto, setJoinPhoto] = useState(null)
  const [joinSearch, setJoinSearch] = useState('')
  const joinPhotoRef = useRef(null)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [logData, challengeData, recipeData] = await Promise.all([
        getCookingLog(30),
        getChallenges(),
        getRecipes()
      ])
      setLog(logData)
      setChallenges(challengeData)
      setRecipes(recipeData)
      // Charger les traductions en cache
      if (lang !== 'fr') {
        const translations = {}
        await Promise.all(recipeData.map(async r => {
          const tr = await getRecipeTranslation(r.id, lang).catch(() => null)
          if (tr) translations[r.id] = tr
        }))
        setRecipeTranslations(translations)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function handleLogCooking() {
    if (!selectedRecipe) return
    try {
      await logCooking(user.fullName, selectedRecipe, logNote)
      setShowLogForm(false); setSelectedRecipe(''); setLogNote(''); setLogSearch('')
      await loadAll()
    } catch (e) { alert('Erreur : ' + e.message) }
  }

  async function handleCreateChallenge() {
    if (!challengeTitle.trim()) return
    try {
      await createChallenge(user.fullName, challengeTitle, challengeDesc, challengeIngredient, challengeEnds || null)
      setShowNewChallenge(false); setChallengeTitle(''); setChallengeDesc(''); setChallengeIngredient(''); setChallengeEnds('')
      await loadAll()
    } catch (e) { alert('Erreur : ' + e.message) }
  }

  async function handleUpdateChallenge() {
    if (!editingChallenge) return
    try {
      await updateChallenge(editingChallenge.id, {
        title: editingChallenge.title,
        description: editingChallenge.description,
        ingredient: editingChallenge.ingredient,
        ends_at: editingChallenge.ends_at
      })
      setEditingChallenge(null)
      await loadAll()
    } catch (e) { alert('Erreur : ' + e.message) }
  }

  async function handleDeleteChallenge(id) {
    if (!confirm('Supprimer ce défi ?')) return
    try { await deleteChallenge(id); await loadAll() }
    catch (e) { alert('Erreur : ' + e.message) }
  }

  async function handleJoinChallenge() {
    if (!joiningChallenge || !joinRecipe) return
    try {
      // Créer l'entrée
      const { data: entry, error } = await supabase.from('challenge_entries').insert([{
        challenge_id: joiningChallenge.id,
        user_name: normalize(user.fullName),
        recipe_id: joinRecipe || null,
        note: joinNote
      }]).select().single()
      if (error) throw error

      // Upload photo si présente
      if (joinPhoto?.file && entry) {
        const url = await uploadChallengePhoto(joinPhoto.file, entry.id)
        await supabase.from('challenge_entries').update({ photo_url: url }).eq('id', entry.id)
      }

      setJoiningChallenge(null); setJoinRecipe(''); setJoinNote(''); setJoinPhoto(null); setJoinSearch('')
      await loadAll()
    } catch (e) { alert('Erreur : ' + e.message) }
  }

  function handleJoinPhotoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setJoinPhoto({ preview: ev.target.result, file })
    reader.readAsDataURL(file)
  }

  function getTitle(recipe) {
    if (!recipe) return lang === 'en' ? 'a recipe' : 'une recette'
    return recipeTranslations[recipe.id]?.title || recipe.title
  }

  const filteredRecipes = recipes.filter(r => !logSearch || r.title.toLowerCase().includes(logSearch.toLowerCase()))
  const filteredJoinRecipes = recipes.filter(r => !joinSearch || r.title.toLowerCase().includes(joinSearch.toLowerCase()))

  return (
    <div className="social-page">
      <header className="recipes-header">
        <div className="recipes-header-top">
          <button className="back-btn" onClick={onBack}>{t('back', lang)}</button>
        </div>
        <div className="recipes-header-title">
          <span className="recipes-cat-icon">👥</span>
          <h1 className="recipes-title">Social</h1>
        </div>
      </header>

      <div className="social-tabs">
        <button className={`menu-tab ${activeTab==='log'?'active':''}`} onClick={() => setActiveTab('log')}>{t('who_cooked', lang)}</button>
        <button className={`menu-tab ${activeTab==='challenges'?'active':''}`} onClick={() => setActiveTab('challenges')}>{t('challenges', lang)}</button>
      </div>

      {loading && <div className="state-message"><div className="loader">🍴</div></div>}

      {/* ── Journal de cuisine ── */}
      {!loading && activeTab === 'log' && (
        <div className="social-content">
          <div className="social-actions">
            <button className="btn-primary" onClick={() => setShowLogForm(true)}>{t('cooked_btn', lang)}</button>
          </div>
          {log.length === 0
            ? <p className="profile-empty">{t('no_log', lang)}</p>
            : <div className="cooking-log-list">
                {log.map((item, i) => (
                  <div key={i} className="cooking-log-item social">
                    <div className="log-avatar">{(item.user_name||'?')[0]?.toUpperCase()}</div>
                    <div className="log-info">
                      <div className="log-header-row">
                        <span className="log-user">{item.user_name}</span>
                        <span className="log-date">{new Date(item.cooked_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long' })}</span>
                      </div>
                      <span className="log-title">{t('cooked_recipe', lang)} <strong>{getTitle(item.recipes)}</strong></span>
                      {item.note && <span className="log-note">"{item.note}"</span>}
                    </div>
                    {item.recipes?.photo_url && <img src={item.recipes.photo_url} alt="" className="log-photo" />}
                  </div>
                ))}
              </div>
          }
        </div>
      )}

      {/* ── Défis ── */}
      {!loading && activeTab === 'challenges' && (
        <div className="social-content">
          <div className="social-actions">
            <button className="btn-primary" onClick={() => setShowNewChallenge(true)}>{t('create_challenge', lang)}</button>
          </div>
          {challenges.length === 0
            ? <p className="profile-empty">{t('no_challenges', lang)}</p>
            : challenges.map(challenge => {
                const entries = challenge.challenge_entries || []
                const myEntry = entries.find(e => normalize(e.user_name) === normalize(user.fullName))
                const daysLeft = challenge.ends_at ? Math.ceil((new Date(challenge.ends_at) - new Date()) / (1000*60*60*24)) : null
                const isCreator = normalize(challenge.created_by) === normalize(user.fullName)

                return (
                  <div key={challenge.id} className="challenge-card">
                    <div className="challenge-header">
                      <div style={{ flex: 1 }}>
                        <h3 className="challenge-title">{challenge.title}</h3>
                        <p className="challenge-by">par {challenge.created_by}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}>
                        {daysLeft !== null && (
                          <span className={`challenge-days ${daysLeft <= 2 ? 'urgent' : ''}`}>
                            {daysLeft > 0 ? `${daysLeft}{t('days_left', lang)}` : t('finished_challenge', lang)}
                          </span>
                        )}
                        {isCreator && (
                          <>
                            <button className="challenge-action-btn" onClick={() => setEditingChallenge({ ...challenge })}>✏️</button>
                            <button className="challenge-action-btn delete" onClick={() => handleDeleteChallenge(challenge.id)}>🗑</button>
                          </>
                        )}
                      </div>
                    </div>
                    {challenge.description && <p className="challenge-desc">{challenge.description}</p>}
                    {challenge.ingredient && <p className="challenge-ingredient">🥕 Ingrédient : <strong>{challenge.ingredient}</strong></p>}

                    {/* Participations */}
                    {entries.length > 0 && (
                      <div className="challenge-entries-list">
                        {entries.map((e, i) => (
                          <div key={i} className="challenge-entry">
                            <span className="challenge-entry-user">👤 {e.user_name}</span>
                            {e.photo_url && <img src={e.photo_url} alt="" className="challenge-entry-photo" />}
                            {e.note && <span className="challenge-entry-note">"{e.note}"</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    {!myEntry && (!daysLeft || daysLeft > 0) && (
                      <button className="btn-join-challenge" onClick={() => setJoiningChallenge(challenge)}>
                        🎯 Participer
                      </button>
                    )}
                    {myEntry && <p className="challenge-joined">{t('joined', lang)}</p>}
                  </div>
                )
              })
          }
        </div>
      )}

      {/* Modal log cuisine */}
      {showLogForm && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowLogForm(false)}>
          <div className="modal-box">
            <button className="modal-close" onClick={() => setShowLogForm(false)}>✕</button>
            <h2 className="modal-title">{t('cooked_btn', lang)}</h2>
            <label className="field-label">{t('what_cooked', lang)}</label>
            <input className="field-input" placeholder={t('search_recipe', lang)} value={logSearch} onChange={e => setLogSearch(e.target.value)} />
            <div className="recipe-picker-list">
              {filteredRecipes.slice(0, 15).map(r => (
                <button key={r.id} className={`recipe-picker-item ${selectedRecipe===r.id?'selected':''}`} onClick={() => setSelectedRecipe(r.id)}>
                  <span className="recipe-picker-cat">{CATEGORIES.find(c=>c.id===r.category)?.icon}</span>
                  {r.title} {selectedRecipe===r.id && '✓'}
                </button>
              ))}
            </div>
            <label className="field-label">{t('how_was_it', lang)}</label>
            <input className="field-input" placeholder={t('how_was_it_placeholder', lang)} value={logNote} onChange={e => setLogNote(e.target.value)} />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowLogForm(false)}>{t('cancel', lang)}</button>
              <button className="btn-primary" onClick={handleLogCooking} disabled={!selectedRecipe}>{t('record', lang)}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nouveau défi */}
      {showNewChallenge && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowNewChallenge(false)}>
          <div className="modal-box">
            <button className="modal-close" onClick={() => setShowNewChallenge(false)}>✕</button>
            <h2 className="modal-title">{t('create_challenge', lang)}</h2>
            <label className="field-label">{t('challenge_title_label', lang)}</label>
            <input className="field-input" placeholder={t('challenge_title_placeholder', lang)} value={challengeTitle} onChange={e => setChallengeTitle(e.target.value)} />
            <label className="field-label">{t('challenge_desc', lang)}</label>
            <textarea className="field-textarea" placeholder={t('challenge_desc_placeholder', lang)} value={challengeDesc} onChange={e => setChallengeDesc(e.target.value)} rows={3} />
            <label className="field-label">{t('challenge_ingredient', lang)}</label>
            <input className="field-input" placeholder={t('challenge_ingredient_placeholder', lang)} value={challengeIngredient} onChange={e => setChallengeIngredient(e.target.value)} />
            <label className="field-label">{t('challenge_ends', lang)}</label>
            <input className="field-input" type="date" value={challengeEnds} onChange={e => setChallengeEnds(e.target.value)} />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowNewChallenge(false)}>Annuler</button>
              <button className="btn-primary" onClick={handleCreateChallenge} disabled={!challengeTitle.trim()}>{t('create_btn', lang)}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal modifier défi */}
      {editingChallenge && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setEditingChallenge(null)}>
          <div className="modal-box">
            <button className="modal-close" onClick={() => setEditingChallenge(null)}>✕</button>
            <h2 className="modal-title">{t('edit_challenge', lang)}</h2>
            <label className="field-label">Titre *</label>
            <input className="field-input" value={editingChallenge.title} onChange={e => setEditingChallenge(p => ({ ...p, title: e.target.value }))} />
            <label className="field-label">Description</label>
            <textarea className="field-textarea" value={editingChallenge.description || ''} onChange={e => setEditingChallenge(p => ({ ...p, description: e.target.value }))} rows={3} />
            <label className="field-label">Ingrédient imposé</label>
            <input className="field-input" value={editingChallenge.ingredient || ''} onChange={e => setEditingChallenge(p => ({ ...p, ingredient: e.target.value }))} />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setEditingChallenge(null)}>Annuler</button>
              <button className="btn-primary" onClick={handleUpdateChallenge}>{t('save_challenge', lang)}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal participer défi */}
      {joiningChallenge && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setJoiningChallenge(null)}>
          <div className="modal-box">
            <button className="modal-close" onClick={() => setJoiningChallenge(null)}>✕</button>
            <h2 className="modal-title">{t('join_challenge', lang)} — {joiningChallenge.title}</h2>
            <label className="field-label">{t('join_with', lang)}</label>
            <input className="field-input" placeholder="Rechercher..." value={joinSearch} onChange={e => setJoinSearch(e.target.value)} />
            <div className="recipe-picker-list">
              {filteredJoinRecipes.slice(0, 15).map(r => (
                <button key={r.id} className={`recipe-picker-item ${joinRecipe===r.id?'selected':''}`} onClick={() => setJoinRecipe(r.id)}>
                  <span className="recipe-picker-cat">{CATEGORIES.find(c=>c.id===r.category)?.icon}</span>
                  {r.title} {joinRecipe===r.id && '✓'}
                </button>
              ))}
            </div>
            <label className="field-label">{t('join_photo', lang)}</label>
            <div className={`header-photo-drop ${joinPhoto ? 'has-photo' : ''}`} onClick={() => joinPhotoRef.current.click()}>
              {joinPhoto
                ? <img src={joinPhoto.preview} alt="" className="header-photo-preview" />
                : <div className="drop-placeholder"><span className="drop-icon">📷</span><p>Cliquez pour ajouter une photo</p></div>
              }
            </div>
            <input ref={joinPhotoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleJoinPhotoChange} />
            <label className="field-label">{t('join_note', lang)}</label>
            <input className="field-input" placeholder={t('join_note_placeholder', lang)} value={joinNote} onChange={e => setJoinNote(e.target.value)} />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setJoiningChallenge(null)}>Annuler</button>
              <button className="btn-primary" onClick={handleJoinChallenge} disabled={!joinRecipe}>{t('join_challenge', lang)}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
