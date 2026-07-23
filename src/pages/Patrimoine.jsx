import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const ICONES = ['🏦','📈','🥇','🧱','💵','📋','🤝','👩','💎','🪙','📊','🏠','🚗','💻','📱','⌚']
const COULEURS = ['#6366f1','#10b981','#f59e0b','#ef4444','#06b6d4','#8b5cf6','#ec4899','#94a3b8']

export default function Patrimoine({ user }) {
  const [vehicules, setVehicules] = useState([])
  const [investissements, setInvestissements] = useState([])
  const [mouvements, setMouvements] = useState([])
  const [biens, setBiens] = useState([])
  const [tab, setTab] = useState('vue')
  const [showVehForm, setShowVehForm] = useState(false)
  const [showInvForm, setShowInvForm] = useState(false)
  const [showBienForm, setShowBienForm] = useState(false)
  const [editVeh, setEditVeh] = useState(null)
  const [editBien, setEditBien] = useState(null)

  const [vehForm, setVehForm] = useState({ nom: '', icone: '🏦', pilotable: true })
  const [invForm, setInvForm] = useState({ vehicule_id: '', type: 'depot', montant: '', date: new Date().toISOString().split('T')[0], note: '' })
  const [bienForm, setBienForm] = useState({ nom: '', icone: '🚗', prix_achat: '', date_achat: new Date().toISOString().split('T')[0], valeur_actuelle: '', note: '' })

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    const [{ data: v }, { data: inv }, { data: mvt }, { data: b }] = await Promise.all([
      supabase.from('vehicules_investissement').select('*').eq('user_id', user.id).order('ordre'),
      supabase.from('investissements').select('*').eq('user_id', user.id),
      supabase.from('investissements_mouvements').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(30),
      supabase.from('patrimoine_materiel').select('*').eq('user_id', user.id).order('date_achat', { ascending: false }),
    ])
    setVehicules(v || [])
    setInvestissements(inv || [])
    setMouvements(mvt || [])
    setBiens(b || [])
  }

  const handleSaveVeh = async (e) => {
    e.preventDefault()
    const payload = { ...vehForm, user_id: user.id, ordre: vehicules.length }
    if (editVeh) await supabase.from('vehicules_investissement').update(payload).eq('id', editVeh.id)
    else await supabase.from('vehicules_investissement').insert(payload)
    setShowVehForm(false); setEditVeh(null); setVehForm({ nom: '', icone: '🏦', pilotable: true }); fetchAll()
  }

  const handleDeleteVeh = async (id) => {
    if (!confirm('Supprimer ce véhicule ? Les données associées seront perdues.')) return
    await supabase.from('vehicules_investissement').delete().eq('id', id); fetchAll()
  }

  const handleSaveInv = async (e) => {
    e.preventDefault()
    const montant = parseFloat(invForm.montant)
    const veh = vehicules.find(v => v.id === invForm.vehicule_id)
    if (!veh) return
    const existing = investissements.find(i => i.vehicule === veh.nom || i.vehicule_id === veh.id)
    let nouvelleValeur = existing?.valeur_actuelle || 0
    if (invForm.type === 'depot') nouvelleValeur += montant
    else if (invForm.type === 'retrait') nouvelleValeur = Math.max(0, nouvelleValeur - montant)
    else nouvelleValeur = montant
    await supabase.from('investissements').upsert({ user_id: user.id, vehicule: veh.nom, vehicule_id: veh.id, valeur_actuelle: nouvelleValeur }, { onConflict: 'user_id,vehicule' })
    await supabase.from('investissements_mouvements').insert({ user_id: user.id, vehicule: veh.nom, type: invForm.type, montant, date: invForm.date, note: invForm.note })
    setShowInvForm(false); setInvForm({ vehicule_id: '', type: 'depot', montant: '', date: new Date().toISOString().split('T')[0], note: '' }); fetchAll()
  }

  const handleSaveBien = async (e) => {
    e.preventDefault()
    const payload = { ...bienForm, prix_achat: parseFloat(bienForm.prix_achat), valeur_actuelle: parseFloat(bienForm.valeur_actuelle), user_id: user.id }
    if (editBien) await supabase.from('patrimoine_materiel').update(payload).eq('id', editBien.id)
    else await supabase.from('patrimoine_materiel').insert(payload)
    setShowBienForm(false); setEditBien(null); setBienForm({ nom: '', icone: '🚗', prix_achat: '', date_achat: new Date().toISOString().split('T')[0], valeur_actuelle: '', note: '' }); fetchAll()
  }

  const handleDeleteBien = async (id) => { if (!confirm('Supprimer ?')) return; await supabase.from('patrimoine_materiel').delete().eq('id', id); fetchAll() }

  const getValeur = (veh) => {
    const inv = investissements.find(i => i.vehicule_id === veh.id || i.vehicule === veh.nom)
    return inv?.valeur_actuelle || 0
  }

  const totalFinancier = vehicules.reduce((s, v) => s + getValeur(v), 0)
  const totalMateriel = biens.reduce((s, b) => s + b.valeur_actuelle, 0)
  const totalPatrimoine = totalFinancier + totalMateriel

  const inp = { width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 14, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }
  const card = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16 }

  return (
    <div style={{ padding: 16, maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text)', marginBottom: 16 }}>Patrimoine</h1>

      {/* Totaux */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
        {[{ label: 'Total', value: totalPatrimoine, color: '#6366f1' },{ label: 'Financier', value: totalFinancier, color: '#10b981' },{ label: 'Matériel', value: totalMateriel, color: '#f59e0b' }].map(k => (
          <div key={k.label} style={{ ...card, textAlign: 'center', padding: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: k.color }}>{k.value.toFixed(0)} €</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4, padding: 4, borderRadius: 12, background: 'var(--color-surface)', marginBottom: 16 }}>
        {[['vue','📊 Vue'],['financier','📈 Financier'],['materiel','🚗 Matériel']].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '9px 4px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, background: tab === t ? '#6366f1' : 'transparent', color: tab === t ? 'white' : 'var(--color-text-muted)' }}>{l}</button>
        ))}
      </div>

      {/* VUE GLOBALE */}
      {tab === 'vue' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {vehicules.length === 0 && biens.length === 0 ? (
            <div style={{ ...card, padding: 40, textAlign: 'center' }}>
              <p style={{ fontSize: 36, marginBottom: 12 }}>🏦</p>
              <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>Patrimoine vierge</p>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>Configure d'abord tes véhicules d'investissement dans l'onglet Financier, puis ajoute tes biens matériels.</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={() => setTab('financier')} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg,#10b981,#06b6d4)' }}>📈 Financier</button>
                <button onClick={() => setTab('materiel')} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg,#f59e0b,#ef4444)' }}>🚗 Matériel</button>
              </div>
            </div>
          ) : (
            <>
              {vehicules.length > 0 && (
                <div style={card}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', fontWeight: 600, fontSize: 13, color: 'var(--color-text-muted)' }}>FINANCIER</div>
                  {vehicules.map(veh => {
                    const val = getValeur(veh)
                    const pct = totalFinancier > 0 ? (val / totalFinancier) * 100 : 0
                    return (
                      <div key={veh.id} style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: val > 0 ? 6 : 0 }}>
                          <span style={{ fontSize: 20 }}>{veh.icone}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>{veh.nom}</div>
                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{veh.pilotable ? 'Pilotable' : 'Non pilotable'}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: val > 0 ? '#10b981' : 'var(--color-text-muted)' }}>{val.toFixed(0)} €</div>
                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{pct.toFixed(0)}%</div>
                          </div>
                        </div>
                        {val > 0 && <div style={{ height: 4, borderRadius: 2, background: 'var(--color-border)' }}><div style={{ height: '100%', borderRadius: 2, background: veh.pilotable ? '#10b981' : '#94a3b8', width: `${pct}%` }} /></div>}
                      </div>
                    )
                  })}
                </div>
              )}
              {biens.length > 0 && (
                <div style={card}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', fontWeight: 600, fontSize: 13, color: 'var(--color-text-muted)' }}>MATÉRIEL</div>
                  {biens.map(b => (
                    <div key={b.id} style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 22 }}>{b.icone}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>{b.nom}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Acheté {new Date(b.date_achat).toLocaleDateString('fr-FR')} · {b.prix_achat.toFixed(0)} €</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#f59e0b' }}>{b.valeur_actuelle.toFixed(0)} €</div>
                        <div style={{ fontSize: 11, color: b.valeur_actuelle >= b.prix_achat ? '#10b981' : '#ef4444' }}>
                          {b.valeur_actuelle >= b.prix_achat ? '+' : ''}{(b.valeur_actuelle - b.prix_achat).toFixed(0)} €
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* FINANCIER */}
      {tab === 'financier' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => { setShowVehForm(true); setEditVeh(null); setVehForm({ nom: '', icone: '🏦', pilotable: true }) }}
              style={{ padding: '8px 14px', borderRadius: 10, border: '1px dashed var(--color-border)', background: 'transparent', cursor: 'pointer', fontWeight: 500, color: 'var(--color-text-muted)', fontSize: 13 }}>
              + Véhicule
            </button>
            <button onClick={() => { setShowInvForm(true); if (vehicules.length > 0) setInvForm(f => ({...f, vehicule_id: vehicules[0].id})) }}
              style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg,#10b981,#06b6d4)', fontSize: 13 }}>
              + Mouvement
            </button>
          </div>

          {vehicules.length === 0 ? (
            <div style={{ ...card, padding: 40, textAlign: 'center' }}>
              <p style={{ fontSize: 36, marginBottom: 8 }}>📈</p>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>Aucun véhicule</p>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Ajoute tes véhicules d'investissement : Livret A, Actions, Assurance vie, Or...</p>
            </div>
          ) : (
            vehicules.map(veh => {
              const val = getValeur(veh)
              const derniersMvt = mouvements.filter(m => m.vehicule === veh.nom).slice(0, 3)
              return (
                <div key={veh.id} style={card}>
                  <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--color-border)' }}>
                    <span style={{ fontSize: 24 }}>{veh.icone}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>{veh.nom}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{veh.pilotable ? '✅ Pilotable' : '🔒 Non pilotable'}</div>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: val > 0 ? '#10b981' : 'var(--color-text-muted)' }}>{val.toFixed(0)} €</div>
                    <button onClick={() => { setEditVeh(veh); setVehForm({ nom: veh.nom, icone: veh.icone, pilotable: veh.pilotable }); setShowVehForm(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>✏️</button>
                    <button onClick={() => handleDeleteVeh(veh.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>🗑️</button>
                  </div>
                  {derniersMvt.length > 0 && derniersMvt.map(mvt => {
                    const color = mvt.type === 'depot' ? '#10b981' : mvt.type === 'retrait' ? '#ef4444' : '#6366f1'
                    const prefix = mvt.type === 'depot' ? '+' : mvt.type === 'retrait' ? '-' : '='
                    return (
                      <div key={mvt.id} style={{ padding: '8px 16px', display: 'flex', justifyContent: 'space-between', fontSize: 12, borderBottom: '1px solid var(--color-border)' }}>
                        <span style={{ color: 'var(--color-text-muted)' }}>{new Date(mvt.date).toLocaleDateString('fr-FR')} · {mvt.type === 'depot' ? 'Dépôt' : mvt.type === 'retrait' ? 'Retrait' : 'MAJ'}{mvt.note ? ` · ${mvt.note}` : ''}</span>
                        <span style={{ fontWeight: 600, color }}>{prefix} {mvt.montant.toFixed(0)} €</span>
                      </div>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* MATÉRIEL */}
      {tab === 'materiel' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowBienForm(true); setEditBien(null); setBienForm({ nom: '', icone: '🚗', prix_achat: '', date_achat: new Date().toISOString().split('T')[0], valeur_actuelle: '', note: '' }) }}
              style={{ padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg,#f59e0b,#ef4444)', fontSize: 13 }}>
              + Bien matériel
            </button>
          </div>
          {biens.length === 0 ? (
            <div style={{ ...card, padding: 40, textAlign: 'center' }}>
              <p style={{ fontSize: 36, marginBottom: 8 }}>🚗</p>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Voiture, vélo, matos hi-fi... ajoute tes biens matériels avec leur valeur actuelle.</p>
            </div>
          ) : biens.map(b => {
            const pv = b.valeur_actuelle - b.prix_achat
            return (
              <div key={b.id} style={{ ...card, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ fontSize: 32 }}>{b.icone}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)' }}>{b.nom}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>Acheté le {new Date(b.date_achat).toLocaleDateString('fr-FR')}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => { setEditBien(b); setBienForm({ nom: b.nom, icone: b.icone, prix_achat: b.prix_achat, date_achat: b.date_achat, valeur_actuelle: b.valeur_actuelle, note: b.note || '' }); setShowBienForm(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✏️</button>
                        <button onClick={() => handleDeleteBien(b.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>🗑️</button>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 10 }}>
                      {[{ label: "Prix d'achat", value: b.prix_achat.toFixed(0)+' €', color: 'var(--color-text)' },{ label: 'Valeur actuelle', value: b.valeur_actuelle.toFixed(0)+' €', color: '#f59e0b' },{ label: '+/- value', value: (pv >= 0 ? '+' : '')+pv.toFixed(0)+' €', color: pv >= 0 ? '#10b981' : '#ef4444' }].map(k => (
                        <div key={k.label} style={{ background: 'var(--color-bg)', borderRadius: 8, padding: '8px 10px' }}>
                          <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{k.label}</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: k.color }}>{k.value}</div>
                        </div>
                      ))}
                    </div>
                    {b.note && <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 8 }}>{b.note}</p>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Form véhicule */}
      {showVehForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ width: '100%', maxWidth: 480, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 20, padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-text)' }}>{editVeh ? 'Modifier' : 'Nouveau véhicule'}</h2>
              <button onClick={() => { setShowVehForm(false); setEditVeh(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--color-text-muted)' }}>×</button>
            </div>
            <form onSubmit={handleSaveVeh} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Nom</label><input required value={vehForm.nom} onChange={e => setVehForm(f => ({...f, nom: e.target.value}))} placeholder="Ex: Livret A, Actions, Or..." style={inp} /></div>
              <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Icône</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{ICONES.map(ic => <button key={ic} type="button" onClick={() => setVehForm(f => ({...f, icone: ic}))} style={{ width: 38, height: 38, borderRadius: 8, border: vehForm.icone === ic ? '2px solid #6366f1' : '1px solid var(--color-border)', background: vehForm.icone === ic ? '#6366f115' : 'transparent', cursor: 'pointer', fontSize: 20 }}>{ic}</button>)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, background: 'var(--color-bg)' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>Pilotable</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Tu peux retirer / déposer librement</div>
                </div>
                <button type="button" onClick={() => setVehForm(f => ({...f, pilotable: !f.pilotable}))} style={{ position: 'relative', width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: vehForm.pilotable ? '#10b981' : '#475569' }}><span style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.2s', left: vehForm.pilotable ? 22 : 2 }} /></button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => { setShowVehForm(false); setEditVeh(null) }} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)' }}>Annuler</button>
                <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', color: 'white', fontWeight: 600, background: 'linear-gradient(135deg,#10b981,#06b6d4)' }}>{editVeh ? 'Modifier' : 'Ajouter'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Form mouvement */}
      {showInvForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ width: '100%', maxWidth: 480, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 20, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-text)' }}>Nouveau mouvement</h2>
              <button onClick={() => setShowInvForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--color-text-muted)' }}>×</button>
            </div>
            <form onSubmit={handleSaveInv} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Véhicule</label>
                <select required value={invForm.vehicule_id} onChange={e => setInvForm(f => ({...f, vehicule_id: e.target.value}))} style={inp}>
                  <option value="">Choisir...</option>
                  {vehicules.map(v => <option key={v.id} value={v.id}>{v.icone} {v.nom}</option>)}
                </select>
              </div>
              <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Type</label>
                <div style={{ display: 'flex', gap: 6 }}>{[['depot','+ Dépôt','#10b981'],['retrait','- Retrait','#ef4444'],['valeur','= MAJ valeur','#6366f1']].map(([t,l,c]) => (
                  <button key={t} type="button" onClick={() => setInvForm(f => ({...f, type: t}))} style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: invForm.type === t ? 'none' : '1px solid var(--color-border)', background: invForm.type === t ? c : 'transparent', color: invForm.type === t ? 'white' : 'var(--color-text-muted)', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>{l}</button>
                ))}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Montant (€)</label><input type="number" step="0.01" min="0" required value={invForm.montant} onChange={e => setInvForm(f => ({...f, montant: e.target.value}))} placeholder="0.00" style={inp} /></div>
                <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Date</label><input type="date" required value={invForm.date} onChange={e => setInvForm(f => ({...f, date: e.target.value}))} style={inp} /></div>
              </div>
              <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Note</label><input value={invForm.note} onChange={e => setInvForm(f => ({...f, note: e.target.value}))} placeholder="Optionnel..." style={inp} /></div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => setShowInvForm(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)' }}>Annuler</button>
                <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', color: 'white', fontWeight: 600, background: 'linear-gradient(135deg,#10b981,#06b6d4)' }}>Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Form bien matériel */}
      {showBienForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ width: '100%', maxWidth: 480, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 20, padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-text)' }}>{editBien ? 'Modifier' : 'Nouveau bien'}</h2>
              <button onClick={() => { setShowBienForm(false); setEditBien(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--color-text-muted)' }}>×</button>
            </div>
            <form onSubmit={handleSaveBien} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Nom</label><input required value={bienForm.nom} onChange={e => setBienForm(f => ({...f, nom: e.target.value}))} placeholder="Ex: Voiture, Vélo..." style={inp} /></div>
              <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Icône</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{['🚗','🏍️','🚲','🏠','💻','📱','⌚','🎸','📺','🛋️','🔧','🏋️'].map(ic => <button key={ic} type="button" onClick={() => setBienForm(f => ({...f, icone: ic}))} style={{ width: 38, height: 38, borderRadius: 8, border: bienForm.icone === ic ? '2px solid #f59e0b' : '1px solid var(--color-border)', background: bienForm.icone === ic ? '#f59e0b15' : 'transparent', cursor: 'pointer', fontSize: 20 }}>{ic}</button>)}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Prix d'achat (€)</label><input type="number" step="0.01" min="0" required value={bienForm.prix_achat} onChange={e => setBienForm(f => ({...f, prix_achat: e.target.value}))} placeholder="0" style={inp} /></div>
                <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Date d'achat</label><input type="date" required value={bienForm.date_achat} onChange={e => setBienForm(f => ({...f, date_achat: e.target.value}))} style={inp} /></div>
              </div>
              <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Valeur actuelle (€)</label><input type="number" step="0.01" min="0" required value={bienForm.valeur_actuelle} onChange={e => setBienForm(f => ({...f, valeur_actuelle: e.target.value}))} placeholder="0" style={inp} /></div>
              <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Note</label><input value={bienForm.note} onChange={e => setBienForm(f => ({...f, note: e.target.value}))} placeholder="Modèle, plaque..." style={inp} /></div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => { setShowBienForm(false); setEditBien(null) }} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)' }}>Annuler</button>
                <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', color: 'white', fontWeight: 600, background: 'linear-gradient(135deg,#f59e0b,#ef4444)' }}>{editBien ? 'Modifier' : 'Ajouter'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
