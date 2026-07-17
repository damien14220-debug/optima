import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { CATEGORIES } from './Depenses'
const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 14, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }
export default function Budget({ user }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [editBudget, setEditBudget] = useState(null)
  useEffect(() => { fetchData() }, [month, year])
  const fetchData = async () => {
    setLoading(true)
    const start = `${year}-${String(month).padStart(2,'0')}-01`
    const end = new Date(year, month, 0).toISOString().split('T')[0]
    const [{ data: depenses }, { data: savedBudgets }, { data: customCats }] = await Promise.all([
      supabase.from('depenses').select('categorie, montant').eq('user_id', user.id).gte('date', start).lte('date', end),
      supabase.from('budgets').select('*').eq('user_id', user.id),
      supabase.from('categories').select('*').eq('user_id', user.id),
    ])
    const b = {}; (savedBudgets || []).forEach(sb => { b[sb.categorie] = sb.montant_theorique })
    const parCat = {}; (depenses || []).forEach(d => { parCat[d.categorie] = (parCat[d.categorie] || 0) + d.montant })
    const allCats = [...CATEGORIES, ...(customCats || []).map(c => ({ id: c.id, label: c.nom, icon: c.icone, color: c.couleur }))]
    setData(allCats.map(cat => ({ ...cat, theorique: b[cat.id] || 0, reel: parCat[cat.id] || 0 })))
    setLoading(false)
  }
  const saveBudget = async (catId, value) => {
    const montant = parseFloat(value)
    await supabase.from('budgets').upsert({ user_id: user.id, categorie: catId, montant_theorique: montant }, { onConflict: 'user_id,categorie' })
    setData(prev => prev.map(d => d.id === catId ? { ...d, theorique: montant } : d))
    setEditBudget(null)
  }
  const totalTheorique = data.reduce((s, d) => s + d.theorique, 0)
  const totalReel = data.reduce((s, d) => s + d.reel, 0)
  return (
    <div style={{ padding: 16, maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text)' }}>Budget</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={month} onChange={e => setMonth(+e.target.value)} style={{ ...inputStyle, width: 'auto' }}>{MOIS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}</select>
          <select value={year} onChange={e => setYear(+e.target.value)} style={{ ...inputStyle, width: 'auto' }}>{[2024,2025,2026,2027].map(y => <option key={y}>{y}</option>)}</select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
        {[{ label: 'Budget prévu', value: totalTheorique, color: '#6366f1' },{ label: 'Dépensé', value: totalReel, color: '#ef4444' },{ label: 'Restant', value: totalTheorique - totalReel, color: totalTheorique - totalReel >= 0 ? '#10b981' : '#ef4444' }].map(k => (
          <div key={k.label} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: k.color }}>{k.value.toFixed(0)} €</div>
          </div>
        ))}
      </div>
      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
      : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{data.map(cat => {
        const pct = cat.theorique > 0 ? Math.min(100, (cat.reel / cat.theorique) * 100) : (cat.reel > 0 ? 100 : 0)
        const over = cat.reel > cat.theorique && cat.theorique > 0
        const isEditing = editBudget === cat.id
        return (
          <div key={cat.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>{cat.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>{cat.label}</span>
                {over && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>⚠️ Dépassé</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: over ? '#ef4444' : 'var(--color-text)' }}>{cat.reel.toFixed(0)} €</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>/</span>
                {isEditing ? (
                  <input type="number" defaultValue={cat.theorique} autoFocus onBlur={e => saveBudget(cat.id, e.target.value)} onKeyDown={e => e.key === 'Enter' && saveBudget(cat.id, e.target.value)}
                    style={{ width: 64, fontSize: 12, padding: '2px 6px', borderRadius: 6, border: '1px solid #6366f1', background: 'var(--color-bg)', color: 'var(--color-text)', textAlign: 'right' }} />
                ) : (
                  <button onClick={() => setEditBudget(cat.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--color-text-muted)' }}>{cat.theorique.toFixed(0)} € ✏️</button>
                )}
              </div>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: 'var(--color-border)' }}>
              <div style={{ height: '100%', borderRadius: 4, width: `${pct}%`, background: over ? '#ef4444' : pct > 80 ? '#f59e0b' : cat.color, transition: 'width 0.5s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
              <span>{pct.toFixed(0)}% utilisé</span><span>Reste : {(cat.theorique - cat.reel).toFixed(0)} €</span>
            </div>
          </div>
        )
      })}</div>}
      <p style={{ fontSize: 11, textAlign: 'center', color: 'var(--color-text-muted)', marginTop: 12 }}>Clique sur le montant (✏️) pour modifier le budget prévu</p>
    </div>
  )
}
