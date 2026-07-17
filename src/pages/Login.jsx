import { useState } from 'react'
import { supabase } from '../supabase'
export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError(''); setSuccess('')
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setSuccess('Compte créé ! Vérifie ton email.')
    }
    setLoading(false)
  }
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 28, color: 'white', fontWeight: 'bold' }}>O</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'white' }}>Optima</h1>
          <p style={{ color: '#94a3b8', marginTop: 4 }}>Gestion de budget intelligente</p>
        </div>
        <div style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid #334155', borderRadius: 20, padding: 32, backdropFilter: 'blur(12px)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'white', marginBottom: 20 }}>{mode === 'login' ? 'Connexion' : 'Créer un compte'}</h2>
          {error && <div style={{ marginBottom: 12, padding: 10, borderRadius: 8, background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', color: '#fca5a5', fontSize: 13 }}>{error}</div>}
          {success && <div style={{ marginBottom: 12, padding: 10, borderRadius: 8, background: 'rgba(16,185,129,0.15)', border: '1px solid #10b981', color: '#6ee7b7', fontSize: 13 }}>{success}</div>}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#cbd5e1', marginBottom: 4 }}>Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="toi@email.com"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: '#1e293b', border: '1px solid #475569', color: 'white', fontSize: 14 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#cbd5e1', marginBottom: 4 }}>Mot de passe</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: '#1e293b', border: '1px solid #475569', color: 'white', fontSize: 14 }} />
            </div>
            <button type="submit" disabled={loading}
              style={{ padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', fontSize: 14, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Chargement...' : mode === 'login' ? 'Se connecter' : 'Créer le compte'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#64748b' }}>
            {mode === 'login' ? "Pas de compte ?" : "Déjà un compte ?"}{' '}
            <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccess('') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#818cf8', fontWeight: 500 }}>
              {mode === 'login' ? "S'inscrire" : 'Se connecter'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
