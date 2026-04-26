// ── Catégories de recettes ────────────────────────────────
export const CATEGORIES = [
  { id: 'entree',  label: 'Entrées',   icon: '🥗', color: '#5c7a4e', bg: '#ddebd7' },
  { id: 'plat',    label: 'Plats',     icon: '🍽', color: '#8b5e3c', bg: '#f5e8d2' },
  { id: 'dessert', label: 'Desserts',  icon: '🍰', color: '#c0392b', bg: '#e8c5c0' },
  { id: 'boisson', label: 'Boissons',  icon: '🥤', color: '#2980b9', bg: '#d6eaf8' },
  { id: 'apero',   label: 'Apéros',    icon: '🥂', color: '#8e44ad', bg: '#e8daef' },
]

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]))

// ── Repas de la journée (pour le menu) ───────────────────
export const MEALS = [
  { id: 'petit_dej', label: 'Petit déjeuner', labelEn: 'Breakfast',  icon: '☀️' },
  { id: 'dejeuner',  label: 'Déjeuner',       labelEn: 'Lunch',      icon: '🌤' },
  { id: 'gouter',    label: 'Goûter',          labelEn: 'Snack',      icon: '🍪' },
  { id: 'apero',     label: 'Apéro',           labelEn: 'Aperitif',   icon: '🥂' },
  { id: 'diner',     label: 'Dîner',           labelEn: 'Dinner',     icon: '🌙' },
]

// ── Jours de la semaine ───────────────────────────────────
export const DAYS = [
  { id: 'lundi',    label: 'Lundi',    labelEn: 'Monday' },
  { id: 'mardi',    label: 'Mardi',    labelEn: 'Tuesday' },
  { id: 'mercredi', label: 'Mercredi', labelEn: 'Wednesday' },
  { id: 'jeudi',    label: 'Jeudi',    labelEn: 'Thursday' },
  { id: 'vendredi', label: 'Vendredi', labelEn: 'Friday' },
  { id: 'samedi',   label: 'Samedi',   labelEn: 'Saturday' },
  { id: 'dimanche', label: 'Dimanche', labelEn: 'Sunday' },
]

// Retourne le lundi de la semaine d'une date donnée
export function getMonday(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function formatWeekLabel(monday) {
  const end = new Date(monday)
  end.setDate(end.getDate() + 6)
  const fmt = { day: 'numeric', month: 'long' }
  return `${monday.toLocaleDateString('fr-FR', fmt)} – ${end.toLocaleDateString('fr-FR', fmt)}`
}

export function mondayToString(monday) {
  return monday.toISOString().split('T')[0]
}
