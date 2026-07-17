import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { CATEGORIES } from './Depenses'
const MOIS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
export default function Statistiques({ user }) {
  const [year, setYear] = useState(new Date().getFullYear())
  const [data, setData] = useState([])
  const [catData, setCatData] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { fetchStats() }, [year])
  const fetchStats = async () => {
    setLoading(true)
    const [{ data: depenses }, { data: revenus }] = await Promise.all([
      supabase.from('depenses').select('*').eq('user_id', user.id).gte('date', `${year}-01-01`).lte('date', `${year}-12-31`),
      supabase.from('revenus').select('*').eq('user_id', user.id).gte('date', `${year}-01-01`).lte('date', `${year}-12-31`),
    ])
    const parMois = MOIS.map((label, i) => {
      const m = i + 1
      const dep = (depenses||[]).filter(d => new Date(d.date).getMonth()+1===m).reduce((s,d) => s+d.montant, 0)
      const rev = (revenus||[]).filter(r => new Date(r.date).getMonth()+1===m).reduce((s,r) => s+r.montant, 0)
      return { mois: label, dépenses: Math.round(dep), revenus: Math.round(rev), balance: Math.round(rev-dep) }
    })
    setData(parMois)
    setCatData(CATEGORIES.map(cat => ({ name: cat.label, icon: cat.icon, color: cat.color, total: Math.round((depenses||[]).filter(d => d.categorie===cat.id).reduce((s,d) => s+d.montant, 0)) })).filter(c => c.total > 0).sort((a,b) => b.total-a.total))
    setLoading(false)
  }
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 10, fontSize: 12 }}><div style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>{label}</div>{payload.map(p => <div key={p.name} style={{ color: p.color }}>{p.name} : {p.value} €</div>)}</div>
  }
  const inputStyle = { padding: '8px 12px', borderRadius: 8, fontSize: 14, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }
  return (
    <div style={{ padding: 16, maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text)' }}>Statistiques</h1>
        <select value={year} onChange={e => setYear(+e.target.value)} style={inputStyle}>{[2024,2025,2026,2027].map(y => <option key={y}>{y}</option>)}</select>
      </div>
      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 12 }}>Revenus vs Dépenses {year}</h2>
            <ResponsiveContainer width="100%" height={200}><BarChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" /><XAxis dataKey="mois" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} /><Tooltip content={<CustomTooltip />} /><Legend wrapperStyle={{ fontSize: 12 }} /><Bar dataKey="revenus" fill="#10b981" radius={[4,4,0,0]} /><Bar dataKey="dépenses" fill="#ef4444" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer>
          </div>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 12 }}>Balance mensuelle {year}</h2>
            <ResponsiveContainer width="100%" height={160}><LineChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" /><XAxis dataKey="mois" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} /><Tooltip content={<CustomTooltip />} /><Line type="monotone" dataKey="balance" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 3 }} name="balance" /></LineChart></ResponsiveContainer>
          </div>
          {catData.length > 0 && (
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 12 }}>Par catégorie {year}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{catData.map(cat => (
                <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18, width: 28 }}>{cat.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}><span style={{ color: 'var(--color-text)' }}>{cat.name}</span><span style={{ fontWeight: 600, color: cat.color }}>{cat.total} €</span></div>
                    <div style={{ height: 6, borderRadius: 3, background: 'var(--color-border)' }}><div style={{ height: '100%', borderRadius: 3, background: cat.color, width: `${(cat.total / catData[0].total) * 100}%` }} /></div>
                  </div>
                </div>
              ))}</div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
            {[{ label: 'Total dépensé', value: data.reduce((s,d) => s+d.dépenses, 0), color: '#ef4444' },{ label: 'Total revenus', value: data.reduce((s,d) => s+d.revenus, 0), color: '#10b981' },{ label: 'Moy. dépenses/mois', value: Math.round(data.filter(d=>d.dépenses>0).reduce((s,d)=>s+d.dépenses,0)/Math.max(1,data.filter(d=>d.dépenses>0).length)), color: '#f59e0b' },{ label: 'Meilleur mois', value: Math.max(...data.map(d=>d.balance)), color: '#6366f1' }].map(k => (
              <div key={k.label} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>{k.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: k.color }}>{k.value} €</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
