import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const CATEGORIES_JOINT = [
  { id: 'loyer', label: 'Loyer / Charges', icon: '🏠' },
  { id: 'courses', label: 'Courses', icon: '🛒' },
  { id: 'restaurant', label: 'Restaurant / Sorties', icon: '🍕' },
  { id: 'vacances', label: 'Vacances', icon: '✈️' },
  { id: 'maison', label: 'Maison / Déco', icon: '🛋️' },
  { id: 'sante', label: 'Santé', icon: '🏥' },
  { id: 'divers', label: 'Divers', icon: '📦' },
]

const MOYENS = ['Carte SG', 'Carte Trade', 'Espèces', 'Virement']

export default function CompteJoint({ user }) {
  const [depenses, setDepenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1)
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    montant: '',
    libelle: '',
    categorie: 'loyer',
    sous_categorie: '',
    moyen_paiement: 'Carte SG',
    part_damien: 50,
    note: ''
  })

  useEffect(() => { fetchDepenses() }, [filterMonth, filterYear])

  const fetchDepenses = async () => {
    setLoading(true)
    const start = `${filterYear}-${String(filterMonth).padStart(2, '0')}-01`
    const end = new Date(filterYear, filterMonth, 0).toISOString().split('T')[0]
    const { data } = await supabase.from('depenses_joint').select('*')
      .eq('user_id', user.id).gte('date', start).lte('date', end)
      .order('date', { ascending: false })
    setDepenses(data || [])
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = { ...form, montant: parseFloat(form.montant), part_damien: parseFloat(form.part_damien), user_id: user.id }
    if (editItem) {
      await supabase.from('depenses_joint').update(payload).eq('id', editItem.id)
    } else {
      await supabase.from('depenses_joint').insert(payload)
    }
    setShowForm(false); setEditItem(null); resetForm(); fetchDepenses()
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette dépense ?')) return
    await supabase.from('depenses_joint').delete().eq('id', id)
    fetchDepenses()
  }

  const handleEdit = (dep) => {
    setForm({ date: dep.date, montant: dep.montant, libelle: dep.libelle, categorie: dep.categorie, sous_categorie: dep.sous_categorie || '', moyen_paiement: dep.moyen_paiement, part_damien: dep.part_damien, note: dep.note || '' })
    setEditItem(dep); setShowForm(true)
  }

  const resetForm = () => setForm({ date: new Date().toISOString().split('T')[0], montant: '', libelle: '', categorie: 'loyer', sous_categorie: '', moyen_paiement: 'Carte SG', part_damien: 50, note: '' })

  const totalJoint = depenses.reduce((s, d) => s + d.montant, 0)
  const totalMaPart = depenses.reduce((s, d) => s + (d.montant * d.part_damien / 100), 0)

  const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 14, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }
  const cardStyle = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16 }

  return (
    <div style={{ padding: 16, maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text)' }}>Compte Joint</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>Dépenses partagées avec Aline</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditItem(null); resetForm() }}
          style={{ padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', fontSize: 13 }}>
          + Ajouter
        </button>
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <select value={filterMonth} onChange={e => setFilterMonth(+e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
          {['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'].map((m,i) => (
            <option key={i} value={i+1}>{m}</option>
          ))}
        </select>
        <select value={filterYear} onChange={e => setFilterYear(+e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
          {[2024,2025,2026,2027].map(y => <option key={y}>{y}</option>)}
        </select>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Total dépenses', value: totalJoint, color: '#ec4899' },
          { label: 'Ma part', value: totalMaPart, color: '#8b5cf6' },
          { label: 'Part Aline', value: totalJoint - totalMaPart, color: '#06b6d4' },
        ].map(k => (
          <div key={k.label} style={{ ...cardStyle, textAlign: 'center', padding: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: k.color }}>{k.value.toFixed(0)} €</div>
          </div>
        ))}
      </div>

      {/* Form modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ width: '100%', maxWidth: 500, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 20, padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-text)' }}>{editItem ? 'Modifier' : 'Nouvelle dépense commune'}</h2>
              <button onClick={() => { setShowForm(false); setEditItem(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--color-text-muted)' }}>×</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Date</label>
                  <input type="date" required value={form.date} onChange={e => setForm({...form, date: e.target.value})} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Montant total (€)</label>
                  <input type="number" step="0.01" min="0" required value={form.montant} onChange={e => setForm({...form, montant: e.target.value})} placeholder="0.00" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Libellé</label>
                <input required value={form.libelle} onChange={e => setForm({...form, libelle: e.target.value})} placeholder="Ex: Loyer juillet, Courses Lidl..." style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Catégorie</label>
                  <select required value={form.categorie} onChange={e => setForm({...form, categorie: e.target.value})} style={inputStyle}>
                    {CATEGORIES_JOINT.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Carte</label>
                  <select value={form.moyen_paiement} onChange={e => setForm({...form, moyen_paiement: e.target.value})} style={inputStyle}>
                    {MOYENS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              {/* Répartition */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>
                  Ma part : {form.part_damien}% ({form.montant ? (parseFloat(form.montant) * form.part_damien / 100).toFixed(2) : '0.00'} €)
                </label>
                <input type="range" min="0" max="100" step="5" value={form.part_damien} onChange={e => setForm({...form, part_damien: parseInt(e.target.value)})}
                  style={{ width: '100%', accentColor: '#8b5cf6' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  <span>0% (Aline paie tout)</span>
                  <span>50/50</span>
                  <span>100% (je paie tout)</span>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  {[0, 25, 50, 75, 100].map(p => (
                    <button key={p} type="button" onClick={() => setForm({...form, part_damien: p})}
                      style={{ flex: 1, padding: '4px 0', borderRadius: 6, border: form.part_damien === p ? 'none' : '1px solid var(--color-border)', background: form.part_damien === p ? '#8b5cf6' : 'transparent', color: form.part_damien === p ? 'white' : 'var(--color-text-muted)', cursor: 'pointer', fontSize: 11, fontWeight: 500 }}>
                      {p}%
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Note</label>
                <input value={form.note} onChange={e => setForm({...form, note: e.target.value})} placeholder="Optionnel..." style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button type="button" onClick={() => { setShowForm(false); setEditItem(null) }}
                  style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                  Annuler
                </button>
                <button type="submit"
                  style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', color: 'white', fontWeight: 600, background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}>
                  {editItem ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Liste */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : depenses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}>
          <p style={{ fontSize: 36, marginBottom: 8 }}>🤝</p>
          <p>Aucune dépense commune ce mois</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {depenses.map(dep => {
            const cat = CATEGORIES_JOINT.find(c => c.id === dep.categorie)
            const maPart = dep.montant * dep.part_damien / 100
            return (
              <div key={dep.id} style={{ ...cardStyle, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 22 }}>{cat?.icon || '📦'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dep.libelle}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {new Date(dep.date).toLocaleDateString('fr-FR')} · {cat?.label} · {dep.moyen_paiement}
                  </div>
                  <div style={{ fontSize: 11, marginTop: 2 }}>
                    <span style={{ color: '#8b5cf6', fontWeight: 500 }}>Ma part : {maPart.toFixed(2)} €</span>
                    <span style={{ color: 'var(--color-text-muted)' }}> ({dep.part_damien}%)</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#ec4899' }}>— {dep.montant.toFixed(2)} €</div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>total</div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => handleEdit(dep)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✏️</button>
                  <button onClick={() => handleDelete(dep.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>🗑️</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
