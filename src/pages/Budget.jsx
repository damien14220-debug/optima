import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { CATEGORIES } from './Depenses'

const BUDGETS_THEORIQUES = {
  transport: 138.74,
  abonnements: 17.48,
  hygiene: 0,
  sante: 50,
  loisirs: 100,
  courses: 80,
  divers: 80,
}

export default function Budget({ user }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [budgets, setBudgets] = useState(BUDGETS_THEORIQUES)
  const [editBudget, setEditBudget] = useState(null)

  useEffect(() => { fetchData() }, [month, year])

  const fetchData = async () => {
    setLoading(true)
    const start = `${year}-${String(month).padStart(2,'0')}-01`
    const end = new Date(year, month, 0).toISOString().split('T')[0]

    const [{ data: depenses }, { data: savedBudgets }] = await Promise.all([
      supabase.from('depenses').select('categorie, montant').eq('user_id', user.id).gte('date', start).lte('date', end),
      supabase.from('budgets').select('*').eq('user_id', user.id),
    ])

    // Merge saved budgets
    const b = { ...BUDGETS_THEORIQUES }
    ;(savedBudgets || []).forEach(sb => { b[sb.categorie] = sb.montant_theorique })
    setBudgets(b)

    // Calculer réel par catégorie
    const parCat = {}
    ;(depenses || []).forEach(d => {
      parCat[d.categorie] = (parCat[d.categorie] || 0) + d.montant
    })

    const result = CATEGORIES.map(cat => ({
      ...cat,
      theorique: b[cat.id] || 0,
      reel: parCat[cat.id] || 0,
    }))

    setData(result)
    setLoading(false)
  }

  const saveBudget = async (catId, value) => {
    const montant = parseFloat(value)
    await supabase.from('budgets').upsert({
      user_id: user.id,
      categorie: catId,
      montant_theorique: montant
    }, { onConflict: 'user_id,categorie' })
    setBudgets(prev => ({ ...prev, [catId]: montant }))
    setData(prev => prev.map(d => d.id === catId ? { ...d, theorique: montant } : d))
    setEditBudget(null)
  }

  const totalTheorique = data.reduce((s, d) => s + d.theorique, 0)
  const totalReel = data.reduce((s, d) => s + d.reel, 0)

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Budget</h1>
        <div className="flex gap-2">
          <select value={month} onChange={e => setMonth(+e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm border" style={{ background: 'var(--color-surface)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}>
            {['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'].map((m,i) => (
              <option key={i} value={i+1}>{m}</option>
            ))}
          </select>
          <select value={year} onChange={e => setYear(+e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm border" style={{ background: 'var(--color-surface)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}>
            {[2024,2025,2026,2027].map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Totaux */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Budget prévu', value: totalTheorique, color: '#6366f1' },
          { label: 'Dépensé', value: totalReel, color: '#ef4444' },
          { label: 'Restant', value: totalTheorique - totalReel, color: totalTheorique - totalReel >= 0 ? '#10b981' : '#ef4444' },
        ].map(k => (
          <div key={k.label} className="rounded-xl p-3 border text-center" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>{k.label}</div>
            <div className="font-bold" style={{ color: k.color }}>{k.value.toFixed(0)} €</div>
          </div>
        ))}
      </div>

      {/* Catégories */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {data.map(cat => {
            const pct = cat.theorique > 0 ? Math.min(100, (cat.reel / cat.theorique) * 100) : (cat.reel > 0 ? 100 : 0)
            const over = cat.reel > cat.theorique && cat.theorique > 0
            const isEditing = editBudget === cat.id
            return (
              <div key={cat.id} className="rounded-xl p-4 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{cat.icon}</span>
                    <span className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{cat.label}</span>
                    {over && <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/40 text-red-400">⚠️ Dépassé</span>}
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-sm" style={{ color: over ? '#ef4444' : 'var(--color-text)' }}>
                      {cat.reel.toFixed(0)} €
                    </span>
                    <span className="text-xs mx-1" style={{ color: 'var(--color-text-muted)' }}>/</span>
                    {isEditing ? (
                      <input
                        type="number" defaultValue={cat.theorique} autoFocus
                        onBlur={e => saveBudget(cat.id, e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveBudget(cat.id, e.target.value)}
                        className="w-16 text-xs px-1 py-0.5 rounded border text-right"
                        style={{ background: 'var(--color-bg)', color: 'var(--color-text)', borderColor: '#6366f1' }}
                      />
                    ) : (
                      <button onClick={() => setEditBudget(cat.id)}
                        className="text-xs hover:text-indigo-400 transition-colors" style={{ color: 'var(--color-text-muted)' }}>
                        {cat.theorique.toFixed(0)} € ✏️
                      </button>
                    )}
                  </div>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      background: over ? '#ef4444' : pct > 80 ? '#f59e0b' : cat.color
                    }} />
                </div>
                <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  <span>{pct.toFixed(0)}% utilisé</span>
                  <span>Reste : {(cat.theorique - cat.reel).toFixed(0)} €</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
        Clique sur le montant prévu (✏️) pour le modifier
      </p>
    </div>
  )
}
