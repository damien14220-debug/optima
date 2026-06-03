import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export const CATEGORIES = [
  { id: 'transport', label: 'Transport', icon: '🚗', subcats: ['Essence voiture', 'Essence moto', 'Assurance voiture', 'Assurance moto', 'Twisto / Bus', 'Autre transport'] },
  { id: 'abonnements', label: 'Abonnements', icon: '📱', subcats: ['iCloud', 'YouTube Premium', 'Bouygues Telecom', 'Claude', 'Cotisation Jazz', 'Autre abonnement'] },
  { id: 'hygiene', label: 'Hygiène', icon: '🪥', subcats: ['Coiffeur', 'Pharmacie', 'Autre hygiène'] },
  { id: 'sante', label: 'Santé', icon: '🏥', subcats: ['Gloro', 'Dentiste', 'Leralue', 'Médecin', 'Médicaments', 'Autre santé'] },
  { id: 'loisirs', label: 'Loisirs / Sorties', icon: '🎉', subcats: ['Restaurant', 'Bar', 'Sport', 'Voyages / Hôtel', 'Cinéma', 'Concert', 'Courses à pied', 'Autre loisir'] },
  { id: 'courses', label: 'Courses', icon: '🛒', subcats: ['Leclerc', 'Lidl', 'Carrefour', 'Super U', 'Biocoop', 'Marché', 'Autre courses'] },
  { id: 'divers', label: 'Divers', icon: '📦', subcats: ['Amazon', 'Virement', 'Remboursement', 'Autre'] },
]

const MOYENS = ['Carte SG', 'Carte Trade', 'Espèces', 'Virement']

export default function Depenses({ user }) {
  const [depenses, setDepenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1)
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  const [filterCat, setFilterCat] = useState('')

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    montant: '',
    libelle: '',
    categorie: '',
    sous_categorie: '',
    moyen_paiement: 'Carte SG',
    note: ''
  })

  useEffect(() => { fetchDepenses() }, [filterMonth, filterYear])

  const fetchDepenses = async () => {
    setLoading(true)
    const start = `${filterYear}-${String(filterMonth).padStart(2,'0')}-01`
    const end = new Date(filterYear, filterMonth, 0).toISOString().split('T')[0]
    const { data } = await supabase.from('depenses').select('*')
      .eq('user_id', user.id).gte('date', start).lte('date', end)
      .order('date', { ascending: false })
    setDepenses(data || [])
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = { ...form, montant: parseFloat(form.montant), user_id: user.id }
    if (editItem) {
      await supabase.from('depenses').update(payload).eq('id', editItem.id)
    } else {
      await supabase.from('depenses').insert(payload)
    }
    setShowForm(false)
    setEditItem(null)
    resetForm()
    fetchDepenses()
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette dépense ?')) return
    await supabase.from('depenses').delete().eq('id', id)
    fetchDepenses()
  }

  const handleEdit = (dep) => {
    setForm({ date: dep.date, montant: dep.montant, libelle: dep.libelle, categorie: dep.categorie, sous_categorie: dep.sous_categorie || '', moyen_paiement: dep.moyen_paiement, note: dep.note || '' })
    setEditItem(dep)
    setShowForm(true)
  }

  const resetForm = () => setForm({ date: new Date().toISOString().split('T')[0], montant: '', libelle: '', categorie: '', sous_categorie: '', moyen_paiement: 'Carte SG', note: '' })

  const filtered = filterCat ? depenses.filter(d => d.categorie === filterCat) : depenses
  const total = filtered.reduce((s, d) => s + d.montant, 0)

  const catObj = CATEGORIES.find(c => c.id === form.categorie)

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Dépenses</h1>
        <button onClick={() => { setShowForm(true); setEditItem(null); resetForm() }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
          <span className="text-lg leading-none">+</span> Ajouter
        </button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        <select value={filterMonth} onChange={e => setFilterMonth(+e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm border" style={{ background: 'var(--color-surface)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}>
          {['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'].map((m, i) => (
            <option key={i} value={i+1}>{m}</option>
          ))}
        </select>
        <select value={filterYear} onChange={e => setFilterYear(+e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm border" style={{ background: 'var(--color-surface)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}>
          {[2024, 2025, 2026, 2027].map(y => <option key={y}>{y}</option>)}
        </select>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm border" style={{ background: 'var(--color-surface)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}>
          <option value="">Toutes catégories</option>
          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
        </select>
      </div>

      {/* Total */}
      <div className="rounded-xl px-4 py-3 border flex items-center justify-between"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{filtered.length} dépense{filtered.length > 1 ? 's' : ''}</span>
        <span className="font-bold text-lg" style={{ color: '#ef4444' }}>— {total.toFixed(2)} €</span>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6 border space-y-4"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg" style={{ color: 'var(--color-text)' }}>
                {editItem ? 'Modifier la dépense' : 'Nouvelle dépense'}
              </h2>
              <button onClick={() => { setShowForm(false); setEditItem(null) }} className="text-2xl leading-none" style={{ color: 'var(--color-text-muted)' }}>×</button>
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
                  placeholder="Ex: Lidl, Restaurant..."
                  className="w-full px-3 py-2 rounded-lg text-sm border" style={{ background: 'var(--color-bg)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Catégorie</label>
                  <select required value={form.categorie} onChange={e => setForm({...form, categorie: e.target.value, sous_categorie: ''})}
                    className="w-full px-3 py-2 rounded-lg text-sm border" style={{ background: 'var(--color-bg)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}>
                    <option value="">Choisir...</option>
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Sous-catégorie</label>
                  <select value={form.sous_categorie} onChange={e => setForm({...form, sous_categorie: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg text-sm border" style={{ background: 'var(--color-bg)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}>
                    <option value="">Aucune</option>
                    {catObj?.subcats.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Moyen de paiement</label>
                <div className="flex gap-2 flex-wrap">
                  {MOYENS.map(m => (
                    <button key={m} type="button" onClick={() => setForm({...form, moyen_paiement: m})}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                      style={form.moyen_paiement === m
                        ? { background: '#6366f1', color: 'white', borderColor: '#6366f1' }
                        : { background: 'var(--color-bg)', color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}>
                      {m}
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
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
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
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
          <p className="text-4xl mb-2">💸</p>
          <p>Aucune dépense ce mois</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(dep => {
            const cat = CATEGORIES.find(c => c.id === dep.categorie)
            return (
              <div key={dep.id} className="rounded-xl px-4 py-3 border flex items-center gap-3"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <span className="text-xl">{cat?.icon || '📦'}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate" style={{ color: 'var(--color-text)' }}>{dep.libelle}</div>
                  <div className="text-xs flex items-center gap-2 mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    <span>{new Date(dep.date).toLocaleDateString('fr-FR')}</span>
                    <span>·</span>
                    <span>{cat?.label || dep.categorie}</span>
                    {dep.sous_categorie && <><span>·</span><span>{dep.sous_categorie}</span></>}
                    <span>·</span>
                    <span>{dep.moyen_paiement}</span>
                  </div>
                </div>
                <span className="font-bold text-sm whitespace-nowrap" style={{ color: '#ef4444' }}>
                  — {dep.montant.toFixed(2)} €
                </span>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(dep)} className="p-1.5 rounded-lg text-xs hover:bg-slate-700 transition-colors" style={{ color: 'var(--color-text-muted)' }}>✏️</button>
                  <button onClick={() => handleDelete(dep.id)} className="p-1.5 rounded-lg text-xs hover:bg-red-900/30 transition-colors" style={{ color: 'var(--color-text-muted)' }}>🗑️</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
