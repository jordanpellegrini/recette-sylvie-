import { useState, useEffect } from 'react'
import { getWeeklyMenu, saveWeeklyMenu, getAllMenusForWeek, getUserPastMenus, getRecipes, getRatings, getFavorites, getRecipeTranslation } from '../lib/supabase'
import { DAYS, MEALS, CATEGORIES, getMonday, formatWeekLabel, mondayToString } from '../lib/constants'
import { useTheme } from '../lib/ThemeContext'
import { t } from '../lib/i18n'

function normalize(str) {
  return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

// ── Parsing intelligent des quantités ──────────────────────
const UNIT_GROUPS = {
  weight: { base: 'g', factors: { g:1,gr:1,gramme:1,grammes:1,kg:1000,kilogramme:1000,kilogrammes:1000 } },
  volume: { base: 'ml', factors: { ml:1,cl:10,dl:100,l:1000,litre:1000,litres:1000 } },
  spoon:  { base: 'cs', factors: { cs:1,cc:0.33,tsp:0.33,tbsp:1 } }
}
function normU(s) { return (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim() }
function parseQtyStr(s) {
  if (!s) return null
  if (s.includes('/')) { const [a,b]=s.split('/'); return parseFloat(a)/parseFloat(b) }
  return parseFloat(s.replace(',','.')) || null
}
function findGroup(unit) {
  if (!unit) return null
  for (const g of Object.values(UNIT_GROUPS)) {
    for (const u of Object.keys(g.factors)) { if (normU(unit)===normU(u)) return g }
  }
  return null
}
function prettyQty(total, base) {
  const r = v => +v.toFixed(2).replace(/\.?0+$/,'')
  if (base==='g') return total>=1000 ? `${r(total/1000)} kg` : `${Math.round(total)} g`
  if (base==='ml') return total>=1000 ? `${r(total/1000)} l` : total>=100 ? `${r(total/100)} dl` : `${Math.round(total)} ml`
  if (base==='cs') return `${r(total)} c.s`
  return `${r(total)}`
}
function buildShoppingList(menuData, recipes) {
  const map = {}
  Object.values(menuData||{}).forEach(dayData => {
    Object.values(dayData||{}).forEach(items => {
      ;(items||[]).forEach(item => {
        if (!item.recipe_id) return
        const recipe = recipes.find(r => r.id === item.recipe_id)
        if (!recipe) return
        ;(recipe.ingredients||[]).forEach(raw => {
          const m = raw.trim().match(/^([\d,./]+)?\s*([a-zA-Z\u00C0-\u017E.]+(?:\s+\u00e0\s+\S+)?)?\s*(?:de\s+|d[\u2019'])?\s*(.+)?$/i)
          if (!m) return
          const [,qStr,uStr,nStr] = m
          const qty = parseQtyStr(qStr)
          const unit = uStr?.trim()||null
          const group = findGroup(unit)
          const nameRaw = nStr?.trim()||raw.replace(/^[\d,./]+\s*[a-zA-Z\u00C0-\u017E.]*\s*(?:de\s+|d[\u2019'])?/i,'').trim()||raw
          const key = normU(nameRaw)
          if (!map[key]) map[key]={name:nameRaw,byGroup:{},byUnit:{},count:0}
          if (qty&&group) { const f=group.factors[normU(unit)]||1; map[key].byGroup[group.base]=(map[key].byGroup[group.base]||0)+qty*f }
          else if (qty) { const k=unit||'__'; map[key].byUnit[k]=(map[key].byUnit[k]||0)+qty }
          else { map[key].count++ }
        })
      })
    })
  })
  return Object.values(map).map(({name,byGroup,byUnit,count})=>{
    const parts=[]
    Object.entries(byGroup).forEach(([base,total])=>parts.push(prettyQty(total,base)))
    Object.entries(byUnit).forEach(([u,total])=>{
      const r=v=>+v.toFixed(2).replace(/\.?0+$/,'')
      parts.push(u==='__'?`×${r(total)}`:`${r(total)} ${u}`)
    })
    if(count>0&&parts.length===0) parts.push(`×${count}`)
    else if(count>0) parts.push(`+${count}`)
    return {name,qty:parts.join(' + ')}
  }).sort((a,b)=>a.name.localeCompare(b.name))
}

export default function WeeklyMenuPage({ user, onBack }) {
  const { lang } = useTheme()
  const [monday, setMonday] = useState(getMonday())
  const [myMenu, setMyMenu] = useState({})
  const [allMenus, setAllMenus] = useState([])
  const [pastMenus, setPastMenus] = useState([])
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('my')
  const [viewingUser, setViewingUser] = useState(null)
  const [addingSlot, setAddingSlot] = useState(null)
  const [searchRecipe, setSearchRecipe] = useState('')
  const [manualText, setManualText] = useState('')

  // Budget
  const [persons, setPersons] = useState(4)

  // Suggestions
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const weekStart = mondayToString(monday)
  const [recipeTranslations, setRecipeTranslations] = useState({})
  const weekLabel = formatWeekLabel(monday)

  useEffect(() => { loadAll() }, [monday])

  async function loadAll() {
    setLoading(true)
    try {
      const [menu, allM, past, recs] = await Promise.all([
        getWeeklyMenu(user.fullName, weekStart),
        getAllMenusForWeek(weekStart),
        getUserPastMenus(user.fullName),
        getRecipes()
      ])
      setMyMenu(menu?.menu_data || {})
      setAllMenus(allM.filter(m => normalize(m.user_name) !== normalize(user.fullName)))
      setPastMenus(past.filter(m => m.week_start !== weekStart))
      setRecipes(recs)
      if (lang !== 'fr') {
        const translations = {}
        await Promise.all(recs.map(async r => {
          const tr = await getRecipeTranslation(r.id, lang).catch(() => null)
          if (tr) translations[r.id] = tr
        }))
        setRecipeTranslations(translations)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  function getRecipeTitle(recipeId) {
    const recipe = recipes.find(r => r.id === recipeId)
    if (!recipe) return '?'
    return recipeTranslations[recipeId]?.title || recipeTranslations[r.id]?.title || r.title
  }

  async function handleSave(newMenu) {
    setSaving(true)
    try { await saveWeeklyMenu(user.fullName, weekStart, newMenu) }
    catch (e) { alert(t('error', lang) + ' ' + e.message) }
    finally { setSaving(false) }
  }

  function addItem(day, meal, item) {
    const newMenu = { ...myMenu, [day]: { ...(myMenu[day]||{}), [meal]: [...((myMenu[day]||{})[meal]||[]), item] } }
    setMyMenu(newMenu); handleSave(newMenu); setAddingSlot(null); setSearchRecipe(''); setManualText('')
  }

  function removeItem(day, meal, idx) {
    const items = [...((myMenu[day]||{})[meal]||[])]
    items.splice(idx, 1)
    const newMenu = { ...myMenu, [day]: { ...(myMenu[day]||{}), [meal]: items } }
    setMyMenu(newMenu); handleSave(newMenu)
  }

  // ── Suggestions automatiques ───────────────────────────
  async function generateSuggestions() {
    try {
      const [allRatings, favIds] = await Promise.all([
        Promise.all(recipes.map(r => getRatings(r.id).then(ratings => ({ recipe: r, ratings })))),
        getFavorites(user.fullName)
      ])

      // Score = note moyenne * 2 + favori * 3 + récence négative (éviter les répétitions)
      const usedIds = new Set()
      Object.values(myMenu).forEach(day => Object.values(day).forEach(items => items.forEach(it => { if (it.recipe_id) usedIds.add(it.recipe_id) })))

      // Aussi éviter les recettes des semaines passées récentes
      const recentIds = new Set()
      pastMenus.slice(0, 2).forEach(pm => {
        Object.values(pm.menu_data||{}).forEach(day => Object.values(day).forEach(items => items.forEach(it => { if (it.recipe_id) recentIds.add(it.recipe_id) })))
      })

      const scored = allRatings.map(({ recipe, ratings }) => {
        const avg = ratings.length ? ratings.reduce((s,r)=>s+r.rating,0)/ratings.length : 3
        const isFav = favIds.includes(recipe.id)
        const isUsed = usedIds.has(recipe.id)
        const isRecent = recentIds.has(recipe.id)
        return {
          recipe,
          score: avg * 2 + (isFav ? 3 : 0) - (isUsed ? 10 : 0) - (isRecent ? 2 : 0)
        }
      }).sort((a,b) => b.score - a.score)

      setSuggestions(scored.slice(0, 12).map(s => s.recipe))
      setShowSuggestions(true)
    } catch (e) { console.error(e) }
  }

  // ── Budget ─────────────────────────────────────────────
  function countMeals() {
    let count = 0
    Object.values(myMenu).forEach(day => Object.values(day).forEach(items => { count += items.length }))
    return count
  }

  const mealCount = countMeals()
  
  // Estimation automatique du coût par type de repas
  function estimateMealCost(menuData) {
    const CATEGORY_COSTS = { entree: 4, plat: 8, dessert: 3, boisson: 2, apero: 5 }
    let total = 0
    Object.values(menuData || {}).forEach(dayData => {
      Object.values(dayData || {}).forEach(items => {
        ;(items || []).forEach(item => {
          if (item.recipe_id) {
            const recipe = recipes.find(r => r.id === item.recipe_id)
            const cost = recipe ? (CATEGORY_COSTS[recipe.category] || 5) : 5
            total += cost * persons
          } else if (item.custom_text) {
            total += 5 * persons
          }
        })
      })
    })
    return total
  }
  
  const estimatedBudget = estimateMealCost(myMenu).toFixed(0)

  // ── Shopping & Export ──────────────────────────────────
  const shoppingList = buildShoppingList(myMenu, recipes)
  const filteredRecipes = recipes.filter(r => !searchRecipe || r.title.toLowerCase().includes(searchRecipe.toLowerCase()) || (recipeTranslations[r.id]?.title || '').toLowerCase().includes(searchRecipe.toLowerCase()))

  const displayedMenu = activeTab === 'others' && viewingUser
    ? (allMenus.find(m => m.user_name === viewingUser)?.menu_data || {})
    : activeTab === 'past' && viewingUser
    ? (pastMenus.find(m => m.week_start === viewingUser)?.menu_data || {})
    : myMenu

  const isReadOnly = activeTab === 'others' || activeTab === 'past'

  function exportMenuPDF() {
    const w = window.open('', '_blank')
    const rows = DAYS.map(day => {
      const dayData = myMenu[day.id]||{}
      return `<tr><td class="day-cell"><strong>${lang === 'en' ? day.labelEn : day.label}</strong></td>${MEALS.map(meal => {
        const items = (dayData[meal.id]||[]).map(item => {
          if (item.recipe_id) { return getRecipeTitle(item.recipe_id) }
          return item.custom_text||''
        }).join('<br/>')
        return `<td>${items||'<span class="empty">—</span>'}</td>`
      }).join('')}</tr>`
    }).join('')
    w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><title>Menu ${weekLabel}</title>
    <style>body{font-family:Arial,sans-serif;padding:1cm;font-size:11px}h1{font-size:16px;margin-bottom:0.5cm}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:6px 8px;vertical-align:top}th{background:#f5e8d2;font-weight:bold;text-align:center}.day-cell{font-weight:bold;background:#fdf6ec;white-space:nowrap}.empty{color:#bbb}@media print{@page{margin:1cm}}</style>
    </head><body><h1>Menu de la semaine — ${weekLabel}</h1>
    <table><tr><th>Jour</th>${MEALS.map(m=>`<th>${m.icon} ${m.label}</th>`).join('')}</tr>${rows}</table>
    <script>window.onload=()=>window.print()</script></body></html>`)
    w.document.close()
  }

  function exportShoppingPDF() {
    const w = window.open('', '_blank')
    const items = shoppingList.map(item=>`<li><span class="ing-name">${item.name}</span>${item.qty?` <span class="qty">${item.qty}</span>`:''}</li>`).join('')
    w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><title>Liste de courses</title>
    <style>body{font-family:Arial,sans-serif;padding:1.5cm}h1{font-size:18px;margin-bottom:0.3cm}h2{font-size:13px;color:#666;margin-bottom:0.7cm;font-weight:normal}ul{list-style:none;padding:0;columns:2;column-gap:1cm}li{padding:5px 0;border-bottom:1px solid #eee;break-inside:avoid;display:flex;justify-content:space-between}.qty{background:#f5e8d2;border-radius:10px;padding:2px 7px;font-size:10px;font-weight:bold}@media print{@page{margin:1.5cm}}</style>
    </head><body><h1>🛒 Liste de courses</h1><h2>Semaine du ${weekLabel}</h2><ul>${items}</ul>
    <script>window.onload=()=>window.print()</script></body></html>`)
    w.document.close()
  }

  return (
    <div className="menu-page">
      <header className="menu-header">
        <button className="back-btn" onClick={onBack}>{t('back', lang)}</button>
        <h1 className="menu-title">{t('menu_title', lang)}</h1>
        <div className="menu-week-nav">
          <button className="week-nav-btn" onClick={() => { const d=new Date(monday); d.setDate(d.getDate()-7); setMonday(d) }}>‹</button>
          <span className="week-label">{weekLabel}</span>
          <button className="week-nav-btn" onClick={() => { const d=new Date(monday); d.setDate(d.getDate()+7); setMonday(d) }}>›</button>
        </div>
      </header>

      <div className="menu-tabs">
        <button className={`menu-tab ${activeTab==='my'?'active':''}`} onClick={() => { setActiveTab('my'); setViewingUser(null) }}>👤 Mon menu</button>
        <button className={`menu-tab ${activeTab==='others'?'active':''}`} onClick={() => setActiveTab('others')}>{t('others', lang)} ({allMenus.length})</button>
        <button className={`menu-tab ${activeTab==='past'?'active':''}`} onClick={() => setActiveTab('past')}>{t('history', lang)}</button>
        <button className={`menu-tab ${activeTab==='shopping'?'active':''}`} onClick={() => setActiveTab('shopping')}>{t('shopping', lang)}</button>
        <button className={`menu-tab ${activeTab==='budget'?'active':''}`} onClick={() => setActiveTab('budget')}>{t('budget', lang)}</button>
      </div>

      {loading && <div className="state-message"><div className="loader">🍴</div><p>Chargement...</p></div>}

      {/* ── Autres utilisateurs ── */}
      {!loading && activeTab==='others' && (
        <div className="menu-others">
          {allMenus.length===0 ? <p className="menu-empty">{t('no_menu_others', lang)}</p> : (
            <>
              <div className="menu-user-list">
                {allMenus.map(m => (
                  <button key={m.user_name} className={`menu-user-btn ${viewingUser===m.user_name?'active':''}`} onClick={() => setViewingUser(m.user_name)}>
                    👤 {m.user_name}
                  </button>
                ))}
              </div>
              {viewingUser && <MenuGrid menuData={displayedMenu} recipes={recipes} lang={lang} recipeTranslations={recipeTranslations} />}
            </>
          )}
        </div>
      )}

      {/* ── Historique ── */}
      {!loading && activeTab==='past' && (
        <div className="menu-others">
          {pastMenus.length===0 ? <p className="menu-empty">{t('no_past_menu', lang)}</p> : (
            <>
              <div className="menu-user-list">
                {pastMenus.map(m => (
                  <button key={m.week_start} className={`menu-user-btn ${viewingUser===m.week_start?'active':''}`} onClick={() => setViewingUser(m.week_start)}>
                    📅 {formatWeekLabel(new Date(m.week_start+'T12:00:00'))}
                  </button>
                ))}
              </div>
              {viewingUser && (
                <>
                  <MenuGrid menuData={displayedMenu} recipes={recipes} lang={lang} recipeTranslations={recipeTranslations} />

                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Liste de courses ── */}
      {!loading && activeTab==='shopping' && (
        <div className="shopping-section">
          <div className="shopping-header">
            <h2>🛒 {t('shopping_list', lang)} — {weekLabel}</h2>
            <button className="btn-export" onClick={exportShoppingPDF}>{t('export_shopping', lang)}</button>
          </div>
          {shoppingList.length===0 ? (
            <p className="menu-empty">Ajoutez des recettes à votre menu pour générer la liste de courses.</p>
          ) : (
            <div className="shopping-list">
              {shoppingList.map((item, i) => (
                <div key={i} className="shopping-item">
                  <span className="shopping-check">☐</span>
                  <span className="shopping-label">{item.name}</span>
                  {item.qty && <span className="shopping-count">{item.qty}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Budget ── */}
      {!loading && activeTab==='budget' && (
        <div className="budget-section">
          <h2 className="budget-title">{t('budget_title', lang)}</h2>
          <p className="budget-subtitle">{t('budget_subtitle', lang)}</p>

          <div className="budget-controls">
            <div className="budget-control">
              <label>{t('persons', lang)}</label>
              <div className="budget-stepper">
                <button onClick={() => setPersons(p => Math.max(1, p-1))}>−</button>
                <span>{persons}</span>
                <button onClick={() => setPersons(p => p+1)}>+</button>
              </div>
            </div>
          </div>
          <p className="budget-auto-note">💡 {t('budget_auto_note', lang)}</p>

          <div className="budget-result">
            <div className="budget-stat">
              <span className="budget-stat-num">{mealCount}</span>
              <span className="budget-stat-label">{t('meals_planned', lang)}</span>
            </div>
            <div className="budget-divider">×</div>
            <div className="budget-stat">
              <span className="budget-stat-num">{persons}</span>
              <span className="budget-stat-label">{t('persons_label', lang)}</span>
            </div>
            <div className="budget-divider">=</div>
            <div className="budget-total">
              <span className="budget-total-num">{estimatedBudget}€</span>
              <span className="budget-stat-label">{t('estimated', lang)}</span>
            </div>
          </div>

          <div className="budget-breakdown">
            <h3>{t('day_detail', lang)}</h3>
            {DAYS.map(day => {
              const dayItems = Object.values(myMenu[day.id]||{}).flat().length
              if (dayItems === 0) return null
              return (
                <div key={day.id} className="budget-day-row">
                  <span className="budget-day-name">{lang === 'en' ? day.labelEn : day.label}</span>
                  <span className="budget-day-meals">{dayItems} {lang === 'en' ? (dayItems > 1 ? 'meals' : 'meal') : (dayItems > 1 ? 'repas' : 'repas')}</span>
                  <span className="budget-day-cost">{estimateMealCost({ [day.id]: myMenu[day.id] }).toFixed(0)}€</span>
                </div>
              )
            })}
            {mealCount === 0 && <p className="menu-empty">{t('no_meals', lang)}</p>}
          </div>
        </div>
      )}

      {/* ── Mon menu ── */}
      {!loading && activeTab==='my' && (
        <>
          <div className="menu-actions">
            <button className="btn-export" onClick={exportMenuPDF}>{t('export_menu', lang)}</button>
            <button className="btn-suggest" onClick={generateSuggestions}>{t('suggestions', lang)}</button>

            {saving && <span className="menu-saving">{t('saving_menu', lang)}</span>}
          </div>

          {/* Panel suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="suggestions-panel">
              <div className="suggestions-header">
                <h3>{t('suggestions_title', lang)}</h3>
                <button className="suggestions-close" onClick={() => setShowSuggestions(false)}>✕</button>
              </div>
              <p className="suggestions-hint">{t('suggestions_hint', lang)}</p>
              <div className="suggestions-grid">
                {suggestions.map(r => (
                  <button key={r.id} className="suggestion-card" onClick={() => {
                    setAddingSlot({ day: null, meal: null, fromSuggestion: r.id })
                    setShowSuggestions(false)
                  }}>
                    {r.photo_url && <img src={r.photo_url} alt={r.title} className="suggestion-photo" />}
                    <div className="suggestion-info">
                      <span className="suggestion-cat">{CATEGORIES.find(c=>c.id===r.category)?.icon}</span>
                      <span className="suggestion-title">{recipeTranslations[r.id]?.title || r.title}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="menu-grid-wrapper">
            <div className="menu-grid">
              <div className="menu-grid-header">
                <div className="menu-corner"></div>
                {MEALS.map(m => <div key={m.id} className="meal-header">{m.icon}<br/>{lang === 'en' ? m.labelEn : m.label}</div>)}
              </div>
              {DAYS.map(day => (
                <div key={day.id} className="menu-row">
                  <div className="day-label">{lang === 'en' ? day.labelEn : day.label}</div>
                  {MEALS.map(meal => {
                    const items = (myMenu[day.id]||{})[meal.id]||[]
                    return (
                      <div key={meal.id} className="menu-cell">
                        {items.map((item, idx) => {
                          const recipe = item.recipe_id ? recipes.find(r=>r.id===item.recipe_id) : null
                          return (
                            <div key={idx} className="menu-item">
                              <span>{recipe ? recipe.title : item.custom_text}</span>
                              <button className="menu-item-remove" onClick={() => removeItem(day.id, meal.id, idx)}>✕</button>
                            </div>
                          )
                        })}
                        <button className="menu-add-btn" onClick={() => setAddingSlot({ day: day.id, meal: meal.id })}>+</button>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Modal ajout ── */}
      {addingSlot && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setAddingSlot(null)}>
          <div className="modal-box">
            <button className="modal-close" onClick={() => setAddingSlot(null)}>✕</button>
            {addingSlot.fromSuggestion ? (
              <>
                <h2 className="modal-title">{t('choose_slot', lang)}</h2>
                <p className="modal-subtitle">Où ajouter <strong>{recipes.find(r=>r.id===addingSlot.fromSuggestion)?.title}</strong> ?</p>
                <div className="slot-picker">
                  {DAYS.map(day => (
                    <div key={day.id} className="slot-day">
                      <div className="slot-day-label">{lang === 'en' ? day.labelEn : day.label}</div>
                      {MEALS.map(meal => (
                        <button key={meal.id} className="slot-meal-btn" onClick={() => addItem(day.id, meal.id, { recipe_id: addingSlot.fromSuggestion })}>
                          {meal.icon} {lang === 'en' ? meal.labelEn : meal.label}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h2 className="modal-title">Ajouter — {DAYS.find(d=>d.id===addingSlot.day)?.label} {MEALS.find(m=>m.id===addingSlot.meal)?.label}</h2>
                <h3 className="modal-section-title">{t('choose_recipe', lang)}</h3>
                <input className="field-input" placeholder={t('search_recipe', lang)} value={searchRecipe} onChange={e => setSearchRecipe(e.target.value)} />
                <div className="recipe-picker-list">
                  {filteredRecipes.slice(0, 20).map(r => (
                    <button key={r.id} className="recipe-picker-item" onClick={() => addItem(addingSlot.day, addingSlot.meal, { recipe_id: r.id })}>
                      <span className="recipe-picker-cat">{CATEGORIES.find(c=>c.id===r.category)?.icon}</span>
                      {r.title}
                    </button>
                  ))}
                </div>
                <h3 className="modal-section-title">{t('write_manually', lang)}</h3>
                <div className="manual-add-row">
                  <input className="field-input" placeholder={t('manual_placeholder', lang)} value={manualText} onChange={e => setManualText(e.target.value)} onKeyDown={e => { if (e.key==='Enter' && manualText.trim()) addItem(addingSlot.day, addingSlot.meal, { custom_text: manualText }) }} />
                  <button className="btn-primary" onClick={() => { if (manualText.trim()) addItem(addingSlot.day, addingSlot.meal, { custom_text: manualText }) }} disabled={!manualText.trim()}>{t('add', lang)}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function MenuGrid({ menuData, recipes, lang = 'fr', recipeTranslations = {} }) {
  return (
    <div className="menu-grid-wrapper">
      <div className="menu-grid readonly">
        <div className="menu-grid-header">
          <div className="menu-corner"></div>
          {MEALS.map(m => <div key={m.id} className="meal-header">{m.icon}<br/>{lang === 'en' ? m.labelEn : m.label}</div>)}
        </div>
        {DAYS.map(day => (
          <div key={day.id} className="menu-row">
            <div className="day-label">{lang === 'en' ? day.labelEn : day.label}</div>
            {MEALS.map(meal => {
              const items = (menuData[day.id]||{})[meal.id]||[]
              return (
                <div key={meal.id} className="menu-cell readonly-cell">
                  {items.length===0 ? <span className="menu-empty-cell">—</span> : items.map((item,idx) => {
                    const recipe = item.recipe_id ? recipes.find(r=>r.id===item.recipe_id) : null
                    return <div key={idx} className="menu-item readonly">{recipe ? (recipeTranslations[recipe.id]?.title || recipe.title) : item.custom_text}</div>
                  })}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
