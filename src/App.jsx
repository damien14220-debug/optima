import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Depenses from './pages/Depenses'
import Revenus from './pages/Revenus'
import Budget from './pages/Budget'
import Investissements from './pages/Investissements'
import Statistiques from './pages/Statistiques'
import Parametres from './pages/Parametres'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Accueil', icon: '🏠' },
  { id: 'depenses', label: 'Dépenses', icon: '💸' },
  { id: 'revenus', label: 'Revenus', icon: '💰' },
  { id: 'budget', label: 'Budget', icon: '📊' },
  { id: 'investissements', label: 'Investir', icon: '📈' },
  { id: 'statistiques', label: 'Stats', icon: '📉' },
  { id: 'parametres', label: 'Réglages', icon: '⚙️' },
]

const SIDEBAR_W = 240

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState('dashboard')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('optima-theme') !== 'light')

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('optima-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
      <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!user) return <Login />

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard user={user} />
      case 'depenses': return <Depenses user={user} />
      case 'revenus': return <Revenus user={user} />
      case 'budget': return <Budget user={user} />
      case 'investissements': return <Investissements user={user} />
      case 'statistiques': return <Statistiques user={user} />
      case 'parametres': return <Parametres user={user} darkMode={darkMode} setDarkMode={setDarkMode} />
      default: return <Dashboard user={user} />
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)' }}>

      {/* Sidebar — desktop uniquement */}
      {!isMobile && (
        <aside style={{
          width: SIDEBAR_W, minWidth: SIDEBAR_W, position: 'fixed',
          top: 0, left: 0, height: '100vh', zIndex: 20,
          background: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: 18 }}>O</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text)' }}>Optima</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Budget</div>
              </div>
            </div>
          </div>
          <nav style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
            {NAV_ITEMS.map(item => (
              <button key={item.id} onClick={() => setPage(item.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  marginBottom: 4, fontSize: 14, fontWeight: 500, textAlign: 'left',
                  background: page === item.id ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                  color: page === item.id ? 'white' : 'var(--color-text-muted)',
                  transition: 'all 0.15s',
                }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
          </div>
        </aside>
      )}

      {/* Contenu principal */}
      <main style={{
        flex: 1,
        marginLeft: isMobile ? 0 : SIDEBAR_W,
        paddingBottom: isMobile ? 72 : 0,
        overflowY: 'auto',
        minHeight: '100vh',
      }}>
        {/* Header mobile */}
        {isMobile && (
          <div style={{
            position: 'sticky', top: 0, zIndex: 10, padding: '12px 16px',
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: 14 }}>O</div>
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text)' }}>Optima</span>
            </div>
            <span style={{ fontSize: 14, color: 'var(--color-text)' }}>
              {NAV_ITEMS.find(n => n.id === page)?.icon} {NAV_ITEMS.find(n => n.id === page)?.label}
            </span>
          </div>
        )}

        {renderPage()}
      </main>

      {/* Bottom nav mobile */}
      {isMobile && (
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 20,
          background: 'var(--color-surface)',
          borderTop: '1px solid var(--color-border)',
          display: 'flex', overflowX: 'auto',
        }}>
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => setPage(item.id)}
              style={{
                flex: 1, minWidth: 56, display: 'flex', flexDirection: 'column',
                alignItems: 'center', padding: '8px 4px', border: 'none',
                background: 'transparent', cursor: 'pointer',
                color: page === item.id ? '#6366f1' : 'var(--color-text-muted)',
              }}>
              <span style={{ fontSize: 20, lineHeight: 1 }}>{item.icon}</span>
              <span style={{ fontSize: 9, marginTop: 2, fontWeight: 500 }}>{item.label}</span>
              {page === item.id && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#6366f1', marginTop: 2 }} />}
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}