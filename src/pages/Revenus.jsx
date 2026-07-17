import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
const TYPES = [{ id: 'salaire', label: 'Salaire', icon: '💼' },{ id: 'bourse', label: 'Bourse', icon: '🎓' },{ id: 'cpam', label: 'CPAM', icon: '🏥' },{ id: 'vente', label: 'Vente', icon: '🛍️' },{ id: 'virement', label: 'Virement', icon: '📲' },{ id: 'autre', label: 'Autre', icon: '💰' }]
const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 14, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }
export default function Revenus({ user }) {
  const [revenus, setRevenus] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1)
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], montant: '', libelle: '', type: 'salaire', note: '' })
  useEffect(() => { fetchRevenus() }, [filterMonth, filterYear])
  const fetchRevenus = async () => {
    setLoading(true)
    const start = `${filterYear}-${String(filterMonth).padStart(2,'0')}-01`
    const end = new Date(filterYear, filterMonth, 0).toISOString().split('T')[0]
    const { data } = await supabase.from('revenus').select('*').eq('user_id', user.id).gte('date', start).lte('date', end).order('date', { ascending: false })
    setRevenus(data || []); setLoading(false)
  }
  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = { ...form, montant: parseFloat(form.montant), user_id: user.id }
    if (editItem) await supabase.from('revenus').update(payload).eq('id', editItem.id)
    else await supabase.from('revenus').insert(payload)
    setShowForm(false); setEditItem(null); setForm({ date: new Date().toISOString().split('T')[0], montant: '', libelle: '', type: 'salaire', note: '' }); fetchRevenus()
  }
  const handleDelete = async (id) => { if (!confirm('Supprimer ?')) return; await supabase.from('revenus').delete().eq('id', id); fetchRevenus() }
  const total = revenus.reduce((s, r) => s + r.montant, 0)
  return (
    <div style={{ padding: 16, maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text)' }}>Revenus</h1>
        <button onClick={() => { setShowForm(true); setEditItem(null) }} style={{ padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg, #10b981, #06b6d4)', fontSize: 13 }}>+ Ajouter</button>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <select value={filterMonth} onChange={e => setFilterMonth(+e.target.value)} style={{ ...inputStyle, width: 'auto' }}>{MOIS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}</select>
        <select value={filterYear} onChange={e => setFilterYear(+e.target.value)} style={{ ...inputStyle, width: 'auto' }}>{[2024,2025,2026,2027].map(y => <option key={y}>{y}</option>)}</select>
      </div>
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{revenus.length} entrée{revenus.length > 1 ? 's' : ''}</span>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#10b981' }}>+ {total.toFixed(2)} €</span>
      </div>
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ width: '100%', maxWidth: 480, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 20, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}><h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-text)' }}>{editItem ? 'Modifier' : 'Nouveau revenu'}</h2><button onClick={() => { setShowForm(false); setEditItem(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--color-text-muted)' }}>×</button></div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Date</label><input type="date" required value={form.date} onChange={e => setForm({...form, date: e.target.value})} style={inputStyle} /></div>
                <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Montant (€)</label><input type="number" step="0.01" min="0" required value={form.montant} onChange={e => setForm({...form, montant: e.target.value})} placeholder="0.00" style={inputStyle} /></div>
              </div>
              <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Libellé</label><input required value={form.libelle} onChange={e => setForm({...form, libelle: e.target.value})} placeholder="Ex: Salaire juin..." style={inputStyle} /></div>
              <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Type</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{TYPES.map(t => <button key={t.id} type="button" onClick={() => setForm({...form, type: t.id})} style={{ padding: '6px 10px', borderRadius: 8, border: form.type === t.id ? 'none' : '1px solid var(--color-border)', background: form.type === t.id ? '#10b981' : 'transparent', color: form.type === t.id ? 'white' : 'var(--color-text-muted)', cursor: 'pointer', fontSize: 12 }}>{t.icon} {t.label}</button>)}</div>
              </div>
              <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Note</label><input value={form.note} onChange={e => setForm({...form, note: e.target.value})} placeholder="Optionnel..." style={inputStyle} /></div>
              <div style={{ display: 'flex', gap: 8 }}><button type="button" onClick={() => { setShowForm(false); setEditItem(null) }} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)' }}>Annuler</button><button type="submit" style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', color: 'white', fontWeight: 600, background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}>{editItem ? 'Modifier' : 'Ajouter'}</button></div>
            </form>
          </div>
        </div>
      )}
      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /></div>
      : revenus.length === 0 ? <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}><p style={{ fontSize: 36 }}>💰</p><p>Aucun revenu ce mois</p></div>
      : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{revenus.map(rev => { const type = TYPES.find(t => t.id === rev.type); return (
        <div key={rev.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>{type?.icon || '💰'}</span>
          <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>{rev.libelle}</div><div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{new Date(rev.date).toLocaleDateString('fr-FR')} · {type?.label}</div></div>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>+ {rev.montant.toFixed(2)} €</span>
          <button onClick={() => { setForm({ date: rev.date, montant: rev.montant, libelle: rev.libelle, type: rev.type, note: rev.note || '' }); setEditItem(rev); setShowForm(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✏️</button>
          <button onClick={() => handleDelete(rev.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>🗑️</button>
        </div>
      )})}</div>}
    </div>
  )
}
