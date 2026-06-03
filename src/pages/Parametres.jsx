import { supabase } from '../supabase'

export default function Parametres({ user, darkMode, setDarkMode }) {
  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Paramètres</h1>

      {/* Profil */}
      <div className="rounded-xl p-4 border space-y-3" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <h2 className="font-semibold" style={{ color: 'var(--color-text)' }}>Compte</h2>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            {user.email?.[0].toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{user.email}</div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Connecté</div>
          </div>
        </div>
      </div>

      {/* Apparence */}
      <div className="rounded-xl p-4 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <h2 className="font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Apparence</h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Mode sombre</div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Basculer entre clair et sombre</div>
          </div>
          <button onClick={() => setDarkMode(!darkMode)}
            className="relative w-12 h-6 rounded-full transition-colors"
            style={{ background: darkMode ? '#6366f1' : '#cbd5e1' }}>
            <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
              style={{ left: darkMode ? '1.625rem' : '0.125rem' }} />
          </button>
        </div>
      </div>

      {/* Moyens de paiement */}
      <div className="rounded-xl p-4 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <h2 className="font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Moyens de paiement</h2>
        <div className="space-y-2">
          {[{ icon: '💳', name: 'Carte SG', desc: 'Société Générale' }, { icon: '💳', name: 'Carte Trade', desc: 'Trade Republic' }, { icon: '💵', name: 'Espèces', desc: 'Argent liquide' }, { icon: '🔄', name: 'Virement', desc: 'Virement bancaire' }].map(m => (
            <div key={m.name} className="flex items-center gap-3 py-2">
              <span className="text-xl">{m.icon}</span>
              <div>
                <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{m.name}</div>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{m.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info PWA */}
      <div className="rounded-xl p-4 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <h2 className="font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Installer l'application</h2>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Sur iPhone : Safari → Partager → "Sur l'écran d'accueil"<br />
          Sur Android : Chrome → Menu → "Ajouter à l'écran d'accueil"
        </p>
      </div>

      {/* À propos */}
      <div className="rounded-xl p-4 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <h2 className="font-semibold mb-2" style={{ color: 'var(--color-text)' }}>À propos</h2>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <strong style={{ color: 'var(--color-text)' }}>Optima</strong> v1.0 — Gestionnaire de budget personnel.<br />
          Tes données sont stockées de façon sécurisée et privée.
        </p>
      </div>

      {/* Déconnexion */}
      <button onClick={handleLogout}
        className="w-full py-3 rounded-xl font-semibold text-white"
        style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
        Se déconnecter
      </button>
    </div>
  )
}
