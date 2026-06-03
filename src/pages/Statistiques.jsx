import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts'
import { CATEGORIES } from './Depenses'

const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

export default function Statistiques({ user }) {
  const [year, setYear] = useState(new Date().getFullYear())
  const [data, setData] = useState([])
  const [catData, setCatData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchStats() }, [year])

  const fetchStats = async () => {
    setLoading(true)
    const [{ data: depenses }, { data: revenus }] = await Promise.all([
      supabase.from('depenses').select('*').eq('user_id', user.id)
        .gte('date', `${year}-01-01`).lte('date', `${year}-12-31`),
      supabase.from('revenus').select('*').eq('user_id', user.id)
        .gte('date', `${year}-01-01`).lte('date', `${year}-12-31`),
    ])

    // Par mois
    const parMois = MOIS.map((label, i) => {
      const mois = i + 1
      const dep = (depenses || []).filter(d => new Date(d.date).getMonth() + 1 === mois).reduce((s, d) => s + d.montant, 0)
      const rev = (revenus || []).filter(r => new Date(r.date).getMonth() + 1 === mois).reduce((s, r) => s + r.montant, 0)
      return { mois: label, dépenses: Math.round(dep), revenus: Math.round(rev), balance: Math.round(rev - dep) }
    })
    setData(parMois)

    // Par catégorie sur l'année
    const parCat = CATEGORIES.map(cat => ({
      name: cat.label,
      icon: cat.icon,
      total: Math.round((depenses || []).filter(d => d.categorie === cat.id).reduce((s, d) => s + d.montant, 0)),
      color: cat.color,
    })).filter(c => c.total > 0).sort((a, b) => b.total - a.total)
    setCatData(parCat)

    setLoading(false)
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="rounded-xl p-3 border text-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="font-semibold mb-1" style={{ color: 'var(--color-text)' }}>{label}</div>
        {payload.map(p => (
          <div key={p.name} style={{ color: p.color }}>{p.name} : {p.value} €</div>
        ))}
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Statistiques</h1>
        <select value={year} onChange={e => setYear(+e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm border" style={{ background: 'var(--color-surface)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}>
          {[2024, 2025, 2026, 2027].map(y => <option key={y}>{y}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Revenus vs Dépenses */}
          <div className="rounded-xl p-4 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <h2 className="font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Revenus vs Dépenses {year}</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="mois" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="revenus" fill="#10b981" radius={[4,4,0,0]} />
                <Bar dataKey="dépenses" fill="#ef4444" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Balance mensuelle */}
          <div className="rounded-xl p-4 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <h2 className="font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Balance mensuelle {year}</h2>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="mois" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="balance" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 4 }} name="balance" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Par catégorie */}
          <div className="rounded-xl p-4 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <h2 className="font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Dépenses par catégorie {year}</h2>
            {catData.length === 0 ? (
              <p className="text-center py-8 text-sm" style={{ color: 'var(--color-text-muted)' }}>Aucune donnée</p>
            ) : (
              <div className="space-y-3">
                {catData.map(cat => {
                  const max = catData[0].total
                  return (
                    <div key={cat.name} className="flex items-center gap-3">
                      <span className="text-lg w-7">{cat.icon}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span style={{ color: 'var(--color-text)' }}>{cat.name}</span>
                          <span className="font-medium" style={{ color: cat.color }}>{cat.total} €</span>
                        </div>
                        <div className="h-2 rounded-full" style={{ background: 'var(--color-border)' }}>
                          <div className="h-full rounded-full transition-all"
                            style={{ width: `${(cat.total / max) * 100}%`, background: cat.color }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Stats annuelles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total dépensé', value: data.reduce((s, d) => s + d.dépenses, 0), color: '#ef4444', suffix: '€' },
              { label: 'Total revenus', value: data.reduce((s, d) => s + d.revenus, 0), color: '#10b981', suffix: '€' },
              { label: 'Moy. dépenses/mois', value: Math.round(data.filter(d => d.dépenses > 0).reduce((s,d) => s + d.dépenses, 0) / Math.max(1, data.filter(d => d.dépenses > 0).length)), color: '#f59e0b', suffix: '€' },
              { label: 'Meilleur mois', value: Math.max(...data.map(d => d.balance)), color: '#6366f1', suffix: '€' },
            ].map(k => (
              <div key={k.label} className="rounded-xl p-3 border text-center" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>{k.label}</div>
                <div className="font-bold" style={{ color: k.color }}>{k.value} {k.suffix}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
