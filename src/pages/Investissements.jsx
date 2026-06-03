import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const VEHICULES = [
  { id: 'livret_a', label: 'Livret A', icon: '🏦', pilotable: true },
  { id: 'assurance_vie', label: 'Assurance Vie', icon: '📋', pilotable: false },
  { id: 'actions', label: 'Actions', icon: '📈', pilotable: true, hasCours: true },
  { id: 'or', label: 'Or', icon: '🥇', pilotable: false },
  { id: 'bricks', label: 'Bricks', icon: '🧱', pilotable: false },
  { id: 'argent_liquide', label: 'Argent liquide', icon: '💵', pilotable: true },
  { id: 'pot_commun', label: 'Pot commun (Aline)', icon: '🤝', pilotable: true },
  { id: 'prete_maman', label: 'Prêté à maman', icon: '👩', pilotable: false },
]

export default function Investissements({ user }) {
  const [investissements, setInvestissements] = useState([])
  const [mouvements, setMouvements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [tab, setTab] = useState('vue') // 'vue' | 'mouvements'

  const [form, setForm] = useState({
    vehicule: 'livret_a',
    type: 'depot', // 'depot' | 'retrait' | 'valeur'
    montant: '',
    date: new Date().toISOString().split('T')[0],
    note: ''
  })

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [{ data: invs }, { data: mvts }] = await Promise.all([
      supabase.from('investissements').select('*').eq('user_id', user.id),
      supabase.from('investissements_mouvements').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(50),
    ])
    setInvestissements(invs || [])
    setMouvements(mvts || [])
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const montant = parseFloat(form.montant)

    // Upsert la valeur du véhicule
    const existing = investissements.find(i => i.vehicule === form.vehicule)
    let nouvelleValeur = existing?.valeur_actuelle || 0

    if (form.type === 'depot') nouvelleValeur += montant
    else if (form.type === 'retrait') nouvelleValeur = Math.max(0, nouvelleValeur - montant)
    else if (form.type === 'valeur') nouvelleValeur = montant

    await supabase.from('investissements').upsert({
      user_id: user.id,
      vehicule: form.vehicule,
      valeur_actuelle: nouvelleValeur,
    }, { onConflict: 'user_id,vehicule' })

    // Enregistrer le mouvement
    await supabase.from('investissements_mouvements').insert({
      user_id: user.id,
      vehicule: form.vehicule,
      type: form.type,
      montant,
      date: form.date,
      note: form.note,
    })

    setShowForm(false)
    setForm({ vehicule: 'livret_a', type: 'depot', montant: '', date: new Date().toISOString().split('T')[0], note: '' })
    fetchAll()
  }

  const totalPilotable = investissements.filter(i => VEHICULES.find(v => v.id === i.vehicule)?.pilotable).reduce((s, i) => s + (i.valeur_actuelle || 0), 0)
  const totalNonPilotable = investissements.filter(i => !VEHICULES.find(v => v.id === i.vehicule)?.pilotable).reduce((s, i) => s + (i.valeur_actuelle || 0), 0)
  const total = totalPilotable + totalNonPilotable

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Investissements</h1>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
          <span className="text-lg leading-none">+</span> Mouvement
        </button>
      </div>

      {/* Totaux */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total patrimoine', value: total, color: '#6366f1' },
          { label: 'Pilotable', value: totalPilotable, color: '#10b981' },
          { label: 'Non pilotable', value: totalNonPilotable, color: '#94a3b8' },
        ].map(k => (
          <div key={k.label} className="rounded-xl p-3 border text-center" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>{k.label}</div>
            <div className="font-bold" style={{ color: k.color }}>{k.value.toFixed(0)} €</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--color-surface)' }}>
        {[['vue', '📊 Vue globale'], ['mouvements', '📋 Mouvements']].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
            style={tab === t
              ? { background: '#6366f1', color: 'white' }
              : { color: 'var(--color-text-muted)' }}>
            {l}
          </button>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6 border space-y-4"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg" style={{ color: 'var(--color-text)' }}>Nouveau mouvement</h2>
              <button onClick={() => setShowForm(false)} className="text-2xl" style={{ color: 'var(--color-text-muted)' }}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Véhicule</label>
                <select required value={form.vehicule} onChange={e => setForm({...form, vehicule: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg text-sm border" style={{ background: 'var(--color-bg)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}>
                  {VEHICULES.map(v => <option key={v.id} value={v.id}>{v.icon} {v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Type d'opération</label>
                <div className="flex gap-2">
                  {[['depot', '+ Dépôt', '#10b981'], ['retrait', '- Retrait', '#ef4444'], ['valeur', '= Mise à jour valeur', '#6366f1']].map(([t, l, c]) => (
                    <button key={t} type="button" onClick={() => setForm({...form, type: t})}
                      className="flex-1 py-2 rounded-lg text-xs font-medium border transition-all"
                      style={form.type === t
                        ? { background: c, color: 'white', borderColor: c }
                        : { background: 'var(--color-bg)', color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>
                    {form.type === 'valeur' ? 'Nouvelle valeur (€)' : 'Montant (€)'}
                  </label>
                  <input type="number" step="0.01" min="0" required value={form.montant} onChange={e => setForm({...form, montant: e.target.value})}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-lg text-sm border" style={{ background: 'var(--color-bg)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Date</label>
                  <input type="date" required value={form.date} onChange={e => setForm({...form, date: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg text-sm border" style={{ background: 'var(--color-bg)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Note</label>
                <input type="text" value={form.note} onChange={e => setForm({...form, note: e.target.value})}
                  placeholder="Optionnel..."
                  className="w-full px-3 py-2 rounded-lg text-sm border" style={{ background: 'var(--color-bg)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }} />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm border font-medium" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                  Annuler
                </button>
                <button type="submit"
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === 'vue' ? (
        <div className="space-y-3">
          {VEHICULES.map(veh => {
            const inv = investissements.find(i => i.vehicule === veh.id)
            const valeur = inv?.valeur_actuelle || 0
            const pct = total > 0 ? (valeur / total) * 100 : 0
            return (
              <div key={veh.id} className="rounded-xl p-4 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{veh.icon}</span>
                    <div>
                      <div className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{veh.label}</div>
                      <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{veh.pilotable ? 'Pilotable' : 'Non pilotable'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold" style={{ color: valeur > 0 ? '#6366f1' : 'var(--color-text-muted)' }}>{valeur.toFixed(0)} €</div>
                    <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{pct.toFixed(1)}%</div>
                  </div>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: veh.pilotable ? '#10b981' : '#94a3b8' }} />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {mouvements.length === 0 ? (
            <div className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
              Aucun mouvement enregistré
            </div>
          ) : mouvements.map(mvt => {
            const veh = VEHICULES.find(v => v.id === mvt.vehicule)
            const color = mvt.type === 'depot' ? '#10b981' : mvt.type === 'retrait' ? '#ef4444' : '#6366f1'
            const prefix = mvt.type === 'depot' ? '+' : mvt.type === 'retrait' ? '-' : '='
            return (
              <div key={mvt.id} className="rounded-xl px-4 py-3 border flex items-center gap-3"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <span className="text-xl">{veh?.icon || '💰'}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{veh?.label}</div>
                  <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {new Date(mvt.date).toLocaleDateString('fr-FR')} · {mvt.type === 'depot' ? 'Dépôt' : mvt.type === 'retrait' ? 'Retrait' : 'Mise à jour'}
                    {mvt.note && ` · ${mvt.note}`}
                  </div>
                </div>
                <span className="font-bold text-sm" style={{ color }}>{prefix} {mvt.montant.toFixed(0)} €</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
