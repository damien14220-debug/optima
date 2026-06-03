import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const TYPES_REVENUS = [
  { id: 'salaire', label: 'Salaire', icon: '💼' },
  { id: 'bourse', label: 'Bourse', icon: '🎓' },
  { id: 'cpam', label: 'CPAM / Remboursement', icon: '🏥' },
  { id: 'vente', label: 'Vente', icon: '🛍️' },
  { id: 'virement', label: 'Virement reçu', icon: '📲' },
  { id: 'autre', label: 'Autre', icon: '💰' },
]

export default function Revenus({ user }) {
  const [revenus, setRevenus] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1)
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    montant: '',
    libelle: '',
    type: 'salaire',
    note: ''
  })

  useEffect(() => { fetchRevenus() }, [filterMonth, filterYear])

  const fetchRevenus = async () => {
    setLoading(true)
    const start = `${filterYear}-${String(filterMonth).padStart(2,'0')}-01`
    const end = new Date(filterYear, filterMonth, 0).toISOString().split('T')[0]
    const { data } = await supabase.from('revenus').select('*')
      .eq('user_id', user.id).gte('date', start).lte('date', end)
      .order('date', { ascending: false })
    setRevenus(data || [])
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = { ...form, montant: parseFloat(form.montant), user_id: user.id }
    if (editItem) {
      await supabase.from('revenus').update(payload).eq('id', editItem.id)
    } else {
      await supabase.from('revenus').insert(payload)
    }
    setShowForm(false)
    setEditItem(null)
    resetForm()
    fetchRevenus()
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce revenu ?')) return
    await supabase.from('revenus').delete().eq('id', id)
    fetchRevenus()
  }

  const handleEdit = (rev) => {
    setForm({ date: rev.date, montant: rev.montant, libelle: rev.libelle, type: rev.type, note: rev.note || '' })
    setEditItem(rev)
    setShowForm(true)
  }

  const resetForm = () => setForm({ date: new Date().toISOString().split('T')[0], montant: '', libelle: '', type: 'salaire', note: '' })

  const total = revenus.reduce((s, r) => s + r.montant, 0)

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Revenus</h1>
        <button onClick={() => { setShowForm(true); setEditItem(null); resetForm() }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium"
          style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}>
          <span className="text-lg leading-none">+</span> Ajouter
        </button>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        <select value={filterMonth} onChange={e => setFilterMonth(+e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm border" style={{ background: 'var(--color-surface)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}>
          {['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'].map((m,i) => (
            <option key={i} value={i+1}>{m}</option>
          ))}
        </select>
        <select value={filterYear} onChange={e => setFilterYear(+e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm border" style={{ background: 'var(--color-surface)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}>
          {[2024,2025,2026,2027].map(y => <option key={y}>{y}</option>)}
        </select>
      </div>

      {/* Total */}
      <div className="rounded-xl px-4 py-3 border flex items-center justify-between"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{revenus.length} entrée{revenus.length > 1 ? 's' : ''}</span>
        <span className="font-bold text-lg" style={{ color: '#10b981' }}>+ {total.toFixed(2)} €</span>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6 border space-y-4"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg" style={{ color: 'var(--color-text)' }}>
                {editItem ? 'Modifier le revenu' : 'Nouveau revenu'}
              </h2>
              <button onClick={() => { setShowForm(false); setEditItem(null) }} className="text-2xl" style={{ color: 'var(--color-text-muted)' }}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Date</label>
                  <input type="date" required value={form.date} onChange={e => setForm({...form, date: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg text-sm border" style={{ background: 'var(--color-bg)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Montant (€)</label>
                  <input type="number" step="0.01" min="0" required value={form.montant} onChange={e => setForm({...form, montant: e.target.value})}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-lg text-sm border" style={{ background: 'var(--color-bg)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Libellé</label>
                <input type="text" required value={form.libelle} onChange={e => setForm({...form, libelle: e.target.value})}
                  placeholder="Ex: Salaire juin..."
                  className="w-full px-3 py-2 rounded-lg text-sm border" style={{ background: 'var(--color-bg)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Type</label>
                <div className="flex flex-wrap gap-2">
                  {TYPES_REVENUS.map(t => (
                    <button key={t.id} type="button" onClick={() => setForm({...form, type: t.id})}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                      style={form.type === t.id
                        ? { background: '#10b981', color: 'white', borderColor: '#10b981' }
                        : { background: 'var(--color-bg)', color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}>
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Note (optionnel)</label>
                <input type="text" value={form.note} onChange={e => setForm({...form, note: e.target.value})}
                  placeholder="Remarque..."
                  className="w-full px-3 py-2 rounded-lg text-sm border" style={{ background: 'var(--color-bg)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }} />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => { setShowForm(false); setEditItem(null) }}
                  className="flex-1 py-2.5 rounded-xl text-sm border font-medium" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                  Annuler
                </button>
                <button type="submit"
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}>
                  {editItem ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Liste */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : revenus.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
          <p className="text-4xl mb-2">💰</p>
          <p>Aucun revenu ce mois</p>
        </div>
      ) : (
        <div className="space-y-2">
          {revenus.map(rev => {
            const type = TYPES_REVENUS.find(t => t.id === rev.type)
            return (
              <div key={rev.id} className="rounded-xl px-4 py-3 border flex items-center gap-3"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <span className="text-xl">{type?.icon || '💰'}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate" style={{ color: 'var(--color-text)' }}>{rev.libelle}</div>
                  <div className="text-xs flex items-center gap-2 mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    <span>{new Date(rev.date).toLocaleDateString('fr-FR')}</span>
                    <span>·</span>
                    <span>{type?.label || rev.type}</span>
                  </div>
                </div>
                <span className="font-bold text-sm whitespace-nowrap" style={{ color: '#10b981' }}>
                  + {rev.montant.toFixed(2)} €
                </span>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(rev)} className="p-1.5 rounded-lg text-xs" style={{ color: 'var(--color-text-muted)' }}>✏️</button>
                  <button onClick={() => handleDelete(rev.id)} className="p-1.5 rounded-lg text-xs" style={{ color: 'var(--color-text-muted)' }}>🗑️</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
