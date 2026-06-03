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

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState('dashboard')
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('optima-theme') !== 'light'
  })

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
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
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
    <div className="flex min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <aside className="hidden md:flex flex-col w-60 border-r fixed h-full z-20"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="px-5 py-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-lg"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>O</div>
            <div>
              <div className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>Optima</div>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Budget</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => setPage(item.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left"
              style={page === item.id
                ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white' }
                : { color: 'var(--color-text-muted)' }}>
              <span className="text-base">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <div className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{user.email}</div>
        </div>
      </aside>

      <main className="flex-1 md:ml-60 pb-20 md:pb-0 overflow-y-auto">
        <div className="md:hidden sticky top-0 z-10 px-4 py-3 border-b flex items-center justify-between"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>O</div>
            <span className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>Optima</span>
          </div>
          <span className="text-sm" style={{ color: 'var(--color-text)' }}>
            {NAV_ITEMS.find(n => n.id === page)?.icon} {NAV_ITEMS.find(n => n.id === page)?.label}
          </span>
        </div>
        {renderPage()}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 border-t flex overflow-x-auto"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        {NAV_ITEMS.map(item => (
          <button key={item.id} onClick={() => setPage(item.id)}
            className="flex-1 min-w-[60px] flex flex-col items-center py-2 px-1 transition-all"
            style={{ color: page === item.id ? '#6366f1' : 'var(--color-text-muted)' }}>
            <span className="text-xl leading-tight">{item.icon}</span>
            <span className="text-[9px] mt-0.5 font-medium leading-none">{item.label}</span>
            {page === item.id && <div className="w-1 h-1 rounded-full mt-1 bg-indigo-500" />}
          </button>
        ))}
      </nav>
    </div>
  )
}
