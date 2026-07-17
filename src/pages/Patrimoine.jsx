import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const ICONES_BIENS = ['🚗','🏍️','🚲','🏠','💻','📱','⌚','🎸','📺','🛋️','🔧','🏋️','🎿','⛵','🚁','📦']

const VEHICULES_INV = [
  { id: 'livret_a', label: 'Livret A', icon: '🏦' },
  { id: 'assurance_vie', label: 'Assurance Vie', icon: '📋' },
  { id: 'actions', label: 'Actions', icon: '📈' },
  { id: 'or', label: 'Or', icon: '🥇' },
  { id: 'bricks', label: 'Bricks', icon: '🧱' },
  { id: 'argent_liquide', label: 'Argent liquide', icon: '💵' },
  { id: 'pot_commun', label: 'Pot commun', icon: '🤝' },
  { id: 'prete_maman', label: 'Prêté à maman', icon: '👩' },
]

export default function Patrimoine({ user }) {
  const [tab, setTab] = useState('vue')
  const [biens, setBiens] = useState([])
  const [investissements, setInvestissements] = useState([])
  const [mouvements, setMouvements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showBienForm, setShowBienForm] = useState(false)
  const [showInvForm, setShowInvForm] = useState(false)
  const [editBien, setEditBien] = useState(null)

  const [bienForm, setBienForm] = useState({ nom: '', icone: '🚗', prix_achat: '', date_achat: new Date().toISOString().split('T')[0], valeur_actuelle: '', note: '' })
  const [invForm, setInvForm] = useState({ vehicule: 'livret_a', type: 'depot', montant: '', date: new Date().toISOString().split('T')[0], note: '' })

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [{ data: b }, { data: inv }, { data: mvt }] = await Promise.all([
      supabase.from('patrimoine_materiel').select('*').eq('user_id', user.id).order('date_achat', { ascending: false }),
      supabase.from('investissements').select('*').eq('user_id', user.id),
      supabase.from('investissements_mouvements').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(30),
    ])
    setBiens(b || [])
    setInvestissements(inv || [])
    setMouvements(mvt || [])
    setLoading(false)
  }

  const handleSaveBien = async (e) => {
    e.preventDefault()
    const payload = { ...bienForm, prix_achat: parseFloat(bienForm.prix_achat), valeur_actuelle: parseFloat(bienForm.valeur_actuelle), user_id: user.id }
    if (editBien) {
      await supabase.from('patrimoine_materiel').update(payload).eq('id', editBien.id)
    } else {
      await supabase.from('patrimoine_materiel').insert(payload)
    }
    setShowBienForm(false); setEditBien(null)
    setBienForm({ nom: '', icone: '🚗', prix_achat: '', date_achat: new Date().toISOString().split('T')[0], valeur_actuelle: '', note: '' })
    fetchAll()
  }

  const handleDeleteBien = async (id) => {
    if (!confirm('Supprimer ce bien ?')) return
    await supabase.from('patrimoine_materiel').delete().eq('id', id)
    fetchAll()
  }

  const handleSaveInv = async (e) => {
    e.preventDefault()
    const montant = parseFloat(invForm.montant)
    const existing = investissements.find(i => i.vehicule === invForm.vehicule)
    let nouvelleValeur = existing?.valeur_actuelle || 0
    if (invForm.type === 'depot') nouvelleValeur += montant
    else if (invForm.type === 'retrait') nouvelleValeur = Math.max(0, nouvelleValeur - montant)
    else nouvelleValeur = montant

    await supabase.from('investissements').upsert({ user_id: user.id, vehicule: invForm.vehicule, valeur_actuelle: nouvelleValeur }, { onConflict: 'user_id,vehicule' })
    await supabase.from('investissements_mouvements').insert({ user_id: user.id, ...invForm, montant })
    setShowInvForm(false)
    setInvForm({ vehicule: 'livret_a', type: 'depot', montant: '', date: new Date().toISOString().split('T')[0], note: '' })
    fetchAll()
  }

  const totalBiens = biens.reduce((s, b) => s + b.valeur_actuelle, 0)
  const totalInv = investissements.reduce((s, i) => s + (i.valeur_actuelle || 0), 0)
  const totalPatrimoine = totalBiens + totalInv

  const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 14, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }
  const cardStyle = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16 }

  return (
    <div style={{ padding: 16, maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text)', marginBottom: 16 }}>Patrimoine</h1>

      {/* Totaux */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Total patrimoine', value: totalPatrimoine, color: '#6366f1' },
          { label: 'Financier', value: totalInv, color: '#10b981' },
          { label: 'Matériel', value: totalBiens, color: '#f59e0b' },
        ].map(k => (
          <div key={k.label} style={{ ...cardStyle, textAlign: 'center', padding: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: k.color }}>{k.value.toFixed(0)} €</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 12, background: 'var(--color-surface)', marginBottom: 16 }}>
        {[['vue', '📊 Vue globale'], ['biens', '🚗 Biens matériels'], ['financier', '📈 Financier']].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500,
              background: tab === t ? '#6366f1' : 'transparent', color: tab === t ? 'white' : 'var(--color-text-muted)' }}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── VUE GLOBALE ── */}
          {tab === 'vue' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Biens matériels */}
              <div style={cardStyle}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 10 }}>BIENS MATÉRIELS</h3>
                {biens.length === 0 ? <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Aucun bien enregistré</p> : biens.map(b => {
                  const plusValue = b.valeur_actuelle - b.prix_achat
                  return (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                      <span style={{ fontSize: 24 }}>{b.icone}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>{b.nom}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Acheté {new Date(b.date_achat).toLocaleDateString('fr-FR')} · {b.prix_achat.toFixed(0)} €</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#f59e0b' }}>{b.valeur_actuelle.toFixed(0)} €</div>
                        <div style={{ fontSize: 11, color: plusValue >= 0 ? '#10b981' : '#ef4444' }}>
                          {plusValue >= 0 ? '+' : ''}{plusValue.toFixed(0)} €
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Investissements */}
              <div style={cardStyle}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 10 }}>FINANCIER</h3>
                {VEHICULES_INV.map(veh => {
                  const inv = investissements.find(i => i.vehicule === veh.id)
                  const valeur = inv?.valeur_actuelle || 0
                  if (valeur === 0) return null
                  return (
                    <div key={veh.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                      <span style={{ fontSize: 20 }}>{veh.icon}</span>
                      <div style={{ flex: 1, fontSize: 14, color: 'var(--color-text)' }}>{veh.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>{valeur.toFixed(0)} €</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── BIENS MATÉRIELS ── */}
          {tab === 'biens' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => { setShowBienForm(true); setEditBien(null) }}
                  style={{ padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg, #f59e0b, #ef4444)', fontSize: 13 }}>
                  + Ajouter un bien
                </button>
              </div>

              {biens.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}>
                  <p style={{ fontSize: 36, marginBottom: 8 }}>🚗</p>
                  <p>Aucun bien matériel enregistré</p>
                </div>
              ) : biens.map(b => {
                const plusValue = b.valeur_actuelle - b.prix_achat
                const depreciationPct = ((b.prix_achat - b.valeur_actuelle) / b.prix_achat * 100)
                return (
                  <div key={b.id} style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <span style={{ fontSize: 32 }}>{b.icone}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)' }}>{b.nom}</div>
                            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                              Acheté le {new Date(b.date_achat).toLocaleDateString('fr-FR')}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => { setEditBien(b); setBienForm({ nom: b.nom, icone: b.icone, prix_achat: b.prix_achat, date_achat: b.date_achat, valeur_actuelle: b.valeur_actuelle, note: b.note || '' }); setShowBienForm(true) }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✏️</button>
                            <button onClick={() => handleDeleteBien(b.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>🗑️</button>
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 12 }}>
                          <div style={{ background: 'var(--color-bg)', borderRadius: 8, padding: '8px 10px' }}>
                            <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>Prix d'achat</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{b.prix_achat.toFixed(0)} €</div>
                          </div>
                          <div style={{ background: 'var(--color-bg)', borderRadius: 8, padding: '8px 10px' }}>
                            <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>Valeur actuelle</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#f59e0b' }}>{b.valeur_actuelle.toFixed(0)} €</div>
                          </div>
                          <div style={{ background: 'var(--color-bg)', borderRadius: 8, padding: '8px 10px' }}>
                            <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>+/- value</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: plusValue >= 0 ? '#10b981' : '#ef4444' }}>
                              {plusValue >= 0 ? '+' : ''}{plusValue.toFixed(0)} €
                            </div>
                          </div>
                        </div>
                        {b.note && <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 8 }}>{b.note}</p>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── FINANCIER ── */}
          {tab === 'financier' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowInvForm(true)}
                  style={{ padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg, #10b981, #06b6d4)', fontSize: 13 }}>
                  + Mouvement
                </button>
              </div>

              {VEHICULES_INV.map(veh => {
                const inv = investissements.find(i => i.vehicule === veh.id)
                const valeur = inv?.valeur_actuelle || 0
                const pct = totalInv > 0 ? (valeur / totalInv) * 100 : 0
                return (
                  <div key={veh.id} style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: valeur > 0 ? 10 : 0 }}>
                      <span style={{ fontSize: 24 }}>{veh.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>{veh.label}</div>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: valeur > 0 ? '#10b981' : 'var(--color-text-muted)' }}>{valeur.toFixed(0)} €</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', minWidth: 36, textAlign: 'right' }}>{pct.toFixed(0)}%</div>
                    </div>
                    {valeur > 0 && (
                      <div style={{ height: 4, borderRadius: 2, background: 'var(--color-border)' }}>
                        <div style={{ height: '100%', borderRadius: 2, background: '#10b981', width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Historique mouvements */}
              {mouvements.length > 0 && (
                <div style={cardStyle}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 10 }}>DERNIERS MOUVEMENTS</h3>
                  {mouvements.map(mvt => {
                    const veh = VEHICULES_INV.find(v => v.id === mvt.vehicule)
                    const color = mvt.type === 'depot' ? '#10b981' : mvt.type === 'retrait' ? '#ef4444' : '#6366f1'
                    const prefix = mvt.type === 'depot' ? '+' : mvt.type === 'retrait' ? '-' : '='
                    return (
                      <div key={mvt.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                        <span style={{ fontSize: 18 }}>{veh?.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>{veh?.label}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{new Date(mvt.date).toLocaleDateString('fr-FR')}{mvt.note && ` · ${mvt.note}`}</div>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color }}>{prefix} {mvt.montant.toFixed(0)} €</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Form bien matériel */}
      {showBienForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ width: '100%', maxWidth: 500, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 20, padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-text)' }}>{editBien ? 'Modifier le bien' : 'Nouveau bien matériel'}</h2>
              <button onClick={() => { setShowBienForm(false); setEditBien(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--color-text-muted)' }}>×</button>
            </div>
            <form onSubmit={handleSaveBien} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Nom</label>
                <input required value={bienForm.nom} onChange={e => setBienForm({...bienForm, nom: e.target.value})} placeholder="Ex: Voiture Peugeot 308" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Icône</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {ICONES_BIENS.map(ic => (
                    <button key={ic} type="button" onClick={() => setBienForm({...bienForm, icone: ic})}
                      style={{ width: 38, height: 38, borderRadius: 8, border: bienForm.icone === ic ? '2px solid #6366f1' : '1px solid var(--color-border)', background: bienForm.icone === ic ? '#6366f120' : 'transparent', cursor: 'pointer', fontSize: 20 }}>
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Prix d'achat (€)</label>
                  <input type="number" step="0.01" min="0" required value={bienForm.prix_achat} onChange={e => setBienForm({...bienForm, prix_achat: e.target.value})} placeholder="0" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Date d'achat</label>
                  <input type="date" required value={bienForm.date_achat} onChange={e => setBienForm({...bienForm, date_achat: e.target.value})} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Valeur actuelle estimée (€)</label>
                <input type="number" step="0.01" min="0" required value={bienForm.valeur_actuelle} onChange={e => setBienForm({...bienForm, valeur_actuelle: e.target.value})} placeholder="0" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Note (optionnel)</label>
                <input value={bienForm.note} onChange={e => setBienForm({...bienForm, note: e.target.value})} placeholder="Modèle, couleur, plaque..." style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button type="button" onClick={() => { setShowBienForm(false); setEditBien(null) }}
                  style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                  Annuler
                </button>
                <button type="submit"
                  style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', color: 'white', fontWeight: 600, background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
                  {editBien ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Form investissement */}
      {showInvForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ width: '100%', maxWidth: 480, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 20, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-text)' }}>Nouveau mouvement</h2>
              <button onClick={() => setShowInvForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--color-text-muted)' }}>×</button>
            </div>
            <form onSubmit={handleSaveInv} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Véhicule</label>
                <select required value={invForm.vehicule} onChange={e => setInvForm({...invForm, vehicule: e.target.value})} style={inputStyle}>
                  {VEHICULES_INV.map(v => <option key={v.id} value={v.id}>{v.icon} {v.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Type</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[['depot', '+ Dépôt', '#10b981'], ['retrait', '- Retrait', '#ef4444'], ['valeur', '= Mise à jour', '#6366f1']].map(([t, l, c]) => (
                    <button key={t} type="button" onClick={() => setInvForm({...invForm, type: t})}
                      style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: invForm.type === t ? 'none' : '1px solid var(--color-border)', cursor: 'pointer', fontSize: 12, fontWeight: 500,
                        background: invForm.type === t ? c : 'transparent', color: invForm.type === t ? 'white' : 'var(--color-text-muted)' }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Montant (€)</label>
                  <input type="number" step="0.01" min="0" required value={invForm.montant} onChange={e => setInvForm({...invForm, montant: e.target.value})} placeholder="0.00" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Date</label>
                  <input type="date" required value={invForm.date} onChange={e => setInvForm({...invForm, date: e.target.value})} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Note</label>
                <input value={invForm.note} onChange={e => setInvForm({...invForm, note: e.target.value})} placeholder="Optionnel..." style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button type="button" onClick={() => setShowInvForm(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                  Annuler
                </button>
                <button type="submit"
                  style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', color: 'white', fontWeight: 600, background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}>
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
