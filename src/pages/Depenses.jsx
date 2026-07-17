import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useMoyensPaiement } from '../hooks/useMoyensPaiement'

export const CATEGORIES = [
  { id: 'transport', label: 'Transport', icon: '🚗', color: '#6366f1' },
  { id: 'abonnements', label: 'Abonnements', icon: '📱', color: '#8b5cf6' },
  { id: 'hygiene', label: 'Hygiène', icon: '🧴', color: '#06b6d4' },
  { id: 'sante', label: 'Santé', icon: '🏥', color: '#10b981' },
  { id: 'loisirs', label: 'Loisirs / Sorties', icon: '🎉', color: '#f59e0b' },
  { id: 'courses', label: 'Courses', icon: '🛒', color: '#84cc16' },
  { id: 'divers', label: 'Divers', icon: '📦', color: '#94a3b8' },
]

// moyens loaded dynamically
const MOIS_LABELS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 14, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }

export default function Depenses({ user }) {
  const [depenses, setDepenses] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1)
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  const [filterCat, setFilterCat] = useState('')
  const { moyens: moyensDB } = useMoyensPaiement(user.id)
  const MOYENS_LIST = moyensDB.length > 0 ? moyensDB.map(m => m.nom) : ['Carte SG','Carte Trade','Espèces','Virement']
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], montant: '', libelle: '', categorie: '', moyen_paiement: 'Carte SG', note: '' })

  useEffect(() => { fetchDepenses(); fetchCategories() }, [filterMonth, filterYear])

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').eq('user_id', user.id)
    setCategories(data || [])
  }

  const fetchDepenses = async () => {
    setLoading(true)
    const start = `${filterYear}-${String(filterMonth).padStart(2,'0')}-01`
    const end = new Date(filterYear, filterMonth, 0).toISOString().split('T')[0]
    const { data } = await supabase.from('depenses').select('*').eq('user_id', user.id).gte('date', start).lte('date', end).order('date', { ascending: false })
    setDepenses(data || []); setLoading(false)
  }

  const allCategories = [...CATEGORIES, ...categories.map(c => ({ id: c.id, label: c.nom, icon: c.icone, color: c.couleur }))]

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = { ...form, montant: parseFloat(form.montant), user_id: user.id }
    if (editItem) await supabase.from('depenses').update(payload).eq('id', editItem.id)
    else await supabase.from('depenses').insert(payload)
    setShowForm(false); setEditItem(null); setForm({ date: new Date().toISOString().split('T')[0], montant: '', libelle: '', categorie: '', moyen_paiement: 'Carte SG', note: '' }); fetchDepenses()
  }

  const handleDelete = async (id) => { if (!confirm('Supprimer ?')) return; await supabase.from('depenses').delete().eq('id', id); fetchDepenses() }
  const handleEdit = (dep) => { setForm({ date: dep.date, montant: dep.montant, libelle: dep.libelle, categorie: dep.categorie, moyen_paiement: dep.moyen_paiement, note: dep.note || '' }); setEditItem(dep); setShowForm(true) }

  const filtered = filterCat ? depenses.filter(d => d.categorie === filterCat) : depenses
  const total = filtered.reduce((s, d) => s + d.montant, 0)

  return (
    <div style={{ padding: 16, maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text)' }}>Dépenses</h1>
        <button onClick={() => { setShowForm(true); setEditItem(null); setForm({ date: new Date().toISOString().split('T')[0], montant: '', libelle: '', categorie: '', moyen_paiement: 'Carte SG', note: '' }) }}
          style={{ padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', fontSize: 13 }}>+ Ajouter</button>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <select value={filterMonth} onChange={e => setFilterMonth(+e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
          {MOIS_LABELS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
        </select>
        <select value={filterYear} onChange={e => setFilterYear(+e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
          {[2024,2025,2026,2027].map(y => <option key={y}>{y}</option>)}
        </select>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
          <option value="">Toutes catégories</option>
          {allCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
        </select>
      </div>
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{filtered.length} dépense{filtered.length > 1 ? 's' : ''}</span>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#ef4444' }}>— {total.toFixed(2)} €</span>
      </div>

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ width: '100%', maxWidth: 500, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 20, padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-text)' }}>{editItem ? 'Modifier' : 'Nouvelle dépense'}</h2>
              <button onClick={() => { setShowForm(false); setEditItem(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--color-text-muted)' }}>×</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Date</label><input type="date" required value={form.date} onChange={e => setForm({...form, date: e.target.value})} style={inputStyle} /></div>
                <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Montant (€)</label><input type="number" step="0.01" min="0" required value={form.montant} onChange={e => setForm({...form, montant: e.target.value})} placeholder="0.00" style={inputStyle} /></div>
              </div>
              <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Libellé</label><input required value={form.libelle} onChange={e => setForm({...form, libelle: e.target.value})} placeholder="Ex: Lidl, Essence..." style={inputStyle} /></div>
              <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Catégorie</label>
                <select required value={form.categorie} onChange={e => setForm({...form, categorie: e.target.value})} style={inputStyle}>
                  <option value="">Choisir...</option>
                  {allCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                </select>
              </div>
              <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Moyen de paiement</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {MOYENS_LIST.map(m => <button key={m} type="button" onClick={() => setForm({...form, moyen_paiement: m})}
                    style={{ padding: '6px 12px', borderRadius: 8, border: form.moyen_paiement === m ? 'none' : '1px solid var(--color-border)', background: form.moyen_paiement === m ? '#6366f1' : 'transparent', color: form.moyen_paiement === m ? 'white' : 'var(--color-text-muted)', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>{m}</button>)}
                </div>
              </div>
              <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Note</label><input value={form.note} onChange={e => setForm({...form, note: e.target.value})} placeholder="Optionnel..." style={inputStyle} /></div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => { setShowForm(false); setEditItem(null) }} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)' }}>Annuler</button>
                <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', color: 'white', fontWeight: 600, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>{editItem ? 'Modifier' : 'Ajouter'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
      : filtered.length === 0 ? <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}><p style={{ fontSize: 36 }}>💸</p><p>Aucune dépense</p></div>
      : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(dep => {
            const cat = allCategories.find(c => c.id === dep.categorie)
            return (
              <div key={dep.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 22 }}>{cat?.icon || '📦'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dep.libelle}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{new Date(dep.date).toLocaleDateString('fr-FR')} · {cat?.label || dep.categorie} · {dep.moyen_paiement}</div>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#ef4444', whiteSpace: 'nowrap' }}>— {dep.montant.toFixed(2)} €</span>
                <button onClick={() => handleEdit(dep)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✏️</button>
                <button onClick={() => handleDelete(dep.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>🗑️</button>
              </div>
            )
          })}
        </div>}
    </div>
  )
}
