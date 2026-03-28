export default function LoginPage({ onLogin }) {
  function handleSubmit(e) {
    e.preventDefault()
    const prenom = e.target.prenom.value.trim()
    const nom = e.target.nom.value.trim()
    if (!prenom || !nom) return
    onLogin({ prenom, nom, fullName: `${prenom} ${nom}` })
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-deco">🌸</div>
        <h1 className="login-title">Recettes de Sylvie</h1>
        <p className="login-subtitle">Qui êtes-vous ?</p>
        <form onSubmit={handleSubmit} className="login-form">
          <input
            name="prenom"
            className="login-input"
            placeholder="Prénom"
            autoComplete="given-name"
            required
          />
          <input
            name="nom"
            className="login-input"
            placeholder="Nom de famille"
            autoComplete="family-name"
            required
          />
          <button type="submit" className="login-btn">
            Entrer dans la cuisine →
          </button>
        </form>
        <p className="login-hint">Votre nom sera affiché sur vos commentaires</p>
      </div>
    </div>
  )
}
