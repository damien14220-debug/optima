import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const CATEGORIES = [
  { id: 'transport', label: 'Transport', color: '#6366f1', icon: '🚗' },
  { id: 'abonnements', label: 'Abonnements', color: '#8b5cf6', icon: '📱' },
  { id: 'hygiene', label: 'Hygiène', color: '#06b6d4', icon: '🪥' },
  { id: 'sante', label: 'Santé', color: '#10b981', icon: '🏥' },
  { id: 'loisirs', label: 'Loisirs / Sorties', color: '#f59e0b', icon: '🎉' },
  { id: 'courses', label: 'Courses', color: '#84cc16', icon: '🛒' },
  { id: 'divers', label: 'Divers', color: '#94a3b8', icon: '📦' },
]

const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

export default function Dashboard({ user }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    const startOfMonth = `${currentYear}-${String(currentMonth).padStart(2,'0')}-01`
    const endOfMonth = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0]

    const [{ data: depenses }, { data: revenus }, { data: investissements }, { data: depensesAnnee }] = await Promise.all([
      supabase.from('depenses').select('*').eq('user_id', user.id)
        .gte('date', startOfMonth).lte('date', endOfMonth),
      supabase.from('revenus').select('*').eq('user_id', user.id)
        .gte('date', startOfMonth).lte('date', endOfMonth),
      supabase.from('investissements').select('*').eq('user_id', user.id),
      supabase.from('depenses').select('*').eq('user_id', user.id)
        .gte('date', `${currentYear}-01-01`).lte('date', `${currentYear}-12-31`),
    ])

    const totalDepenses = (depenses || []).reduce((s, d) => s + d.montant, 0)
    const totalRevenus = (revenus || []).reduce((s, r) => s + r.montant, 0)
    const balance = totalRevenus - totalDepenses

    // Par catégorie ce mois
    const parCategorie = CATEGORIES.map(cat => ({
      ...cat,
      total: (depenses || []).filter(d => d.categorie === cat.id).reduce((s, d) => s + d.montant, 0)
    })).filter(c => c.total > 0)

    // Évolution sur l'année (dépenses par mois)
    const parMois = Array.from({ length: 12 }, (_, i) => {
      const mois = i + 1
      const label = MOIS[i]
      const total = (depensesAnnee || [])
        .filter(d => new Date(d.date).getMonth() + 1 === mois)
        .reduce((s, d) => s + d.montant, 0)
      return { mois: label, total: Math.round(total) }
    })

    // Patrimoine investissements
    const patrimoineTotal = (investissements || []).reduce((s, inv) => s + (inv.valeur_actuelle || 0), 0)

    setStats({ totalDepenses, totalRevenus, balance, parCategorie, parMois, patrimoineTotal, nbDepenses: (depenses || []).length })
    setLoading(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const moisLabel = new Date(currentYear, currentMonth - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Tableau de bord</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {moisLabel.charAt(0).toUpperCase() + moisLabel.slice(1)}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Revenus" value={stats.totalRevenus} color="#10b981" icon="💰" suffix="€" />
        <KPICard label="Dépenses" value={stats.totalDepenses} color="#ef4444" icon="💸" suffix="€" />
        <KPICard
          label="Balance"
          value={stats.balance}
          color={stats.balance >= 0 ? '#10b981' : '#ef4444'}
          icon={stats.balance >= 0 ? '📈' : '📉'}
          suffix="€"
        />
        <KPICard label="Patrimoine" value={stats.patrimoineTotal} color="#6366f1" icon="🏦" suffix="€" />
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Évolution dépenses */}
        <div className="rounded-xl p-4 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <h2 className="font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Dépenses {currentYear}</h2>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={stats.parMois}>
              <defs>
                <linearGradient id="depGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="mois" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8 }}
                formatter={(v) => [`${v} €`, 'Dépenses']}
              />
              <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} fill="url(#depGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition catégories */}
        <div className="rounded-xl p-4 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <h2 className="font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Répartition ce mois</h2>
          {stats.parCategorie.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Aucune dépense ce mois
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <PieChart width={130} height={130}>
                <Pie data={stats.parCategorie} dataKey="total" cx={60} cy={60} innerRadius={35} outerRadius={60}>
                  {stats.parCategorie.map((c, i) => <Cell key={i} fill={c.color} />)}
                </Pie>
              </PieChart>
              <div className="flex-1 space-y-2">
                {stats.parCategorie.sort((a, b) => b.total - a.total).slice(0, 5).map(cat => (
                  <div key={cat.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: cat.color }} />
                      <span style={{ color: 'var(--color-text-muted)' }}>{cat.label}</span>
                    </div>
                    <span className="font-medium" style={{ color: 'var(--color-text)' }}>{cat.total.toFixed(0)} €</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Balance visuelle */}
      <div className="rounded-xl p-4 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <h2 className="font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Balance du mois</h2>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: stats.totalRevenus > 0 ? `${Math.min(100, (stats.totalDepenses / stats.totalRevenus) * 100)}%` : '0%',
                background: stats.balance >= 0 ? 'linear-gradient(90deg, #10b981, #6366f1)' : 'linear-gradient(90deg, #ef4444, #f59e0b)'
              }}
            />
          </div>
          <span className="text-sm font-semibold whitespace-nowrap"
            style={{ color: stats.balance >= 0 ? '#10b981' : '#ef4444' }}>
            {stats.balance >= 0 ? '+' : ''}{stats.balance.toFixed(0)} €
          </span>
        </div>
        <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          <span>0 €</span>
          <span>{stats.totalRevenus.toFixed(0)} € de revenus</span>
        </div>
      </div>
    </div>
  )
}

function KPICard({ label, value, color, icon, suffix }) {
  return (
    <div className="rounded-xl p-4 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      </div>
      <div className="text-xl font-bold" style={{ color }}>
        {value !== undefined ? `${value.toFixed(0)} ${suffix}` : '—'}
      </div>
    </div>
  )
}
