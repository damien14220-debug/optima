import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const ICONES = ['🏦','📈','🥇','🧱','💵','📋','🤝','💎','🪙','📊','🏠','🚗','💻','📱','⌚','🛋️']

export default function InvestissementJoint({ ownerId, nomOwner, nomPartner }) {
  const [vehicules, setVehicules] = useState([])
  const [investissements, setInvestissements] = useState([])
  const [mouvements, setMouvements] = useState([])
  const [biens, setBiens] = useState([])
  const [tab, setTab] = useState('vue')
  const [showVehForm, setShowVehForm] = useState(false)
  const [showMvtForm, setShowMvtForm] = useState(false)
  const [showBienForm, setShowBienForm] = useState(false)
  const [editVeh, setEditVeh] = useState(null)
  const [editBien, setEditBien] = useState(null)
  const [vehForm, setVehForm] = useState({ nom: '', icone: '🏦', pilotable: true })
  const [mvtForm, setMvtForm] = useState({ vehicule_id: '', type: 'depot', montant: '', date: new Date().toISOString().split('T')[0], note: '' })
  const [bienForm, setBienForm] = useState({ nom: '', icone: '🚗', prix_achat: '', date_achat: new Date().toISOString().split('T')[0], valeur_actuelle: '', note: '' })

  useEffect(() => { if (ownerId) fetchAll() }, [ownerId])

  const fetchAll = async () => {
    const [{ data: v }, { data: inv }, { data: mvt }, { data: b }] = await Promise.all([
      supabase.from('vehicules_joint').select('*').eq('owner_id', ownerId).order('ordre'),
      supabase.from('investissements_joint').select('*').eq('owner_id', ownerId),
      supabase.from('mouvements_joint').select('*').eq('owner_id', ownerId).order('date', { ascending: false }).limit(30),
      supabase.from('patrimoine_joint').select('*').eq('owner_id', ownerId).order('date_achat', { ascending: false }),
    ])
    setVehicules(v || [])
    setInvestissements(inv || [])
    setMouvements(mvt || [])
    setBiens(b || [])
  }

  const getValeur = (veh) => {
    const inv = investissements.find(i => i.vehicule_id === veh.id || i.vehicule === veh.nom)
    return inv?.valeur_actuelle || 0
  }

  const saveVeh = async (e) => {
    e.preventDefault()
    const payload = { ...vehForm, owner_id: ownerId, ordre: vehicules.length }
    if (editVeh) await supabase.from('vehicules_joint').update(payload).eq('id', editVeh.id)
    else await supabase.from('vehicules_joint').insert(payload)
    setShowVehForm(false); setEditVeh(null); setVehForm({ nom: '', icone: '🏦', pilotable: true }); fetchAll()
  }

  const saveMvt = async (e) => {
    e.preventDefault()
    const montant = parseFloat(mvtForm.montant)
    const veh = vehicules.find(v => v.id === mvtForm.vehicule_id)
    if (!veh) return
    const existing = investissements.find(i => i.vehicule_id === veh.id)
    let newVal = existing?.valeur_actuelle || 0
    if (mvtForm.type === 'depot') newVal += montant
    else if (mvtForm.type === 'retrait') newVal = Math.max(0, newVal - montant)
    else newVal = montant
    await supabase.from('investissements_joint').upsert({ owner_id: ownerId, vehicule: veh.nom, vehicule_id: veh.id, valeur_actuelle: newVal }, { onConflict: 'owner_id,vehicule' })
    await supabase.from('mouvements_joint').insert({ owner_id: ownerId, vehicule: veh.nom, type: mvtForm.type, montant, date: mvtForm.date, note: mvtForm.note })
    setShowMvtForm(false); setMvtForm({ vehicule_id: '', type: 'depot', montant: '', date: new Date().toISOString().split('T')[0], note: '' }); fetchAll()
  }

  const saveBien = async (e) => {
    e.preventDefault()
    const payload = { ...bienForm, prix_achat: parseFloat(bienForm.prix_achat), valeur_actuelle: parseFloat(bienForm.valeur_actuelle), owner_id: ownerId }
    if (editBien) await supabase.from('patrimoine_joint').update(payload).eq('id', editBien.id)
    else await supabase.from('patrimoine_joint').insert(payload)
    setShowBienForm(false); setEditBien(null); setBienForm({ nom: '', icone: '🚗', prix_achat: '', date_achat: new Date().toISOString().split('T')[0], valeur_actuelle: '', note: '' }); fetchAll()
  }

  const totalFin = vehicules.reduce((s, v) => s + getValeur(v), 0)
  const totalMat = biens.reduce((s, b) => s + b.valeur_actuelle, 0)

  const inp = { width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 14, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }
  const card = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16 }
  const Modal = ({ show, onClose, title, onSubmit, children, color = '#6366f1' }) => !show ? null : (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div style={{ width: '100%', maxWidth: 480, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 20, padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-text)' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--color-text-muted)' }}>×</button>
        </div>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {children}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)' }}>Annuler</button>
            <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', color: 'white', fontWeight: 600, background: color }}>Sauvegarder</button>
          </div>
        </form>
      </div>
    </div>
  )

  return (
    <div>
      {/* Totaux */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
        {[{ l: 'Total commun', v: totalFin + totalMat, c: '#6366f1' }, { l: 'Financier', v: totalFin, c: '#10b981' }, { l: 'Matériel', v: totalMat, c: '#f59e0b' }].map(k => (
          <div key={k.l} style={{ ...card, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 4 }}>{k.l}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: k.c }}>{k.v.toFixed(0)} €</div>
          </div>
        ))}
      </div>

      {/* Sous-tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4, padding: 4, borderRadius: 10, background: 'var(--color-bg)', border: '1px solid var(--color-border)', marginBottom: 14 }}>
        {[['vue','📊 Vue'],['financier','📈 Financier'],['materiel','🚗 Matériel']].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 4px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500, background: tab === t ? '#6366f1' : 'transparent', color: tab === t ? 'white' : 'var(--color-text-muted)' }}>{l}</button>
        ))}
      </div>

      {/* VUE */}
      {tab === 'vue' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {vehicules.length === 0 && biens.length === 0
            ? <div style={{ ...card, padding: 40, textAlign: 'center' }}><p style={{ fontSize: 36 }}>🤝</p><p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginTop: 8 }}>Aucun actif commun. Ajoutez vos investissements et biens partagés.</p></div>
            : <>
              {vehicules.map(veh => {
                const val = getValeur(veh)
                const pct = totalFin > 0 ? (val / totalFin) * 100 : 0
                return (
                  <div key={veh.id} style={{ ...card, padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 22 }}>{veh.icone}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{veh.nom}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{veh.pilotable ? 'Pilotable' : 'Non pilotable'} · {pct.toFixed(0)}%</div>
                        {val > 0 && <div style={{ marginTop: 5, height: 3, borderRadius: 2, background: 'var(--color-border)' }}><div style={{ height: '100%', background: '#10b981', borderRadius: 2, width: `${pct}%` }} /></div>}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#10b981' }}>{val.toFixed(0)} €</div>
                    </div>
                  </div>
                )
              })}
              {biens.map(b => (
                <div key={b.id} style={{ ...card, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 24 }}>{b.icone}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{b.nom}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{new Date(b.date_achat).toLocaleDateString('fr-FR')} · achat {b.prix_achat.toFixed(0)} €</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#f59e0b' }}>{b.valeur_actuelle.toFixed(0)} €</div>
                    <div style={{ fontSize: 11, color: b.valeur_actuelle >= b.prix_achat ? '#10b981' : '#ef4444' }}>{b.valeur_actuelle >= b.prix_achat ? '+' : ''}{(b.valeur_actuelle - b.prix_achat).toFixed(0)} €</div>
                  </div>
                </div>
              ))}
            </>
          }
        </div>
      )}

      {/* FINANCIER */}
      {tab === 'financier' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowVehForm(true); setEditVeh(null) }} style={{ padding: '7px 12px', borderRadius: 8, border: '1px dashed var(--color-border)', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--color-text-muted)' }}>+ Véhicule</button>
            <button onClick={() => { setShowMvtForm(true); if (vehicules.length > 0) setMvtForm(f => ({...f, vehicule_id: vehicules[0].id})) }} style={{ padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: '#10b981', fontSize: 12 }}>+ Mouvement</button>
          </div>
          {vehicules.length === 0
            ? <div style={{ ...card, padding: 32, textAlign: 'center' }}><p style={{ fontSize: 32 }}>📈</p><p style={{ color: 'var(--color-text-muted)', marginTop: 8, fontSize: 13 }}>Aucun véhicule commun. Ex : Livret commun, SCPI, crypto partagée...</p></div>
            : vehicules.map(veh => {
              const val = getValeur(veh)
              const derniers = mouvements.filter(m => m.vehicule === veh.nom).slice(0, 3)
              return (
                <div key={veh.id} style={card}>
                  <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--color-border)' }}>
                    <span style={{ fontSize: 22 }}>{veh.icone}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{veh.nom}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{veh.pilotable ? '✅ Pilotable' : '🔒 Non pilotable'}</div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: val > 0 ? '#10b981' : 'var(--color-text-muted)' }}>{val.toFixed(0)} €</div>
                    <button onClick={() => { setEditVeh(veh); setVehForm({ nom: veh.nom, icone: veh.icone, pilotable: veh.pilotable }); setShowVehForm(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>✏️</button>
                    <button onClick={async () => { if (!confirm('Supprimer ?')) return; await supabase.from('vehicules_joint').delete().eq('id', veh.id); fetchAll() }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>🗑️</button>
                  </div>
                  {derniers.map(m => (
                    <div key={m.id} style={{ padding: '7px 16px', display: 'flex', justifyContent: 'space-between', fontSize: 12, borderBottom: '1px solid var(--color-border)' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>{new Date(m.date).toLocaleDateString('fr-FR')} · {m.type === 'depot' ? 'Dépôt' : m.type === 'retrait' ? 'Retrait' : 'MAJ'}{m.note ? ` · ${m.note}` : ''}</span>
                      <span style={{ fontWeight: 600, color: m.type === 'depot' ? '#10b981' : m.type === 'retrait' ? '#ef4444' : '#6366f1' }}>{m.type === 'depot' ? '+' : m.type === 'retrait' ? '-' : '='} {m.montant.toFixed(0)} €</span>
                    </div>
                  ))}
                </div>
              )
            })
          }
        </div>
      )}

      {/* MATÉRIEL */}
      {tab === 'materiel' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowBienForm(true); setEditBien(null); setBienForm({ nom: '', icone: '🚗', prix_achat: '', date_achat: new Date().toISOString().split('T')[0], valeur_actuelle: '', note: '' }) }} style={{ padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: '#f59e0b', fontSize: 12 }}>+ Bien matériel</button>
          </div>
          {biens.length === 0
            ? <div style={{ ...card, padding: 32, textAlign: 'center' }}><p style={{ fontSize: 32 }}>🚗</p><p style={{ color: 'var(--color-text-muted)', marginTop: 8, fontSize: 13 }}>Voiture commune, mobilier, électro...</p></div>
            : biens.map(b => {
              const pv = b.valeur_actuelle - b.prix_achat
              return (
                <div key={b.id} style={{ ...card, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <span style={{ fontSize: 30 }}>{b.icone}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600 }}>{b.nom}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>Acheté le {new Date(b.date_achat).toLocaleDateString('fr-FR')}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => { setEditBien(b); setBienForm({ nom: b.nom, icone: b.icone, prix_achat: b.prix_achat, date_achat: b.date_achat, valeur_actuelle: b.valeur_actuelle, note: b.note || '' }); setShowBienForm(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>✏️</button>
                          <button onClick={async () => { if (!confirm('Supprimer ?')) return; await supabase.from('patrimoine_joint').delete().eq('id', b.id); fetchAll() }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>🗑️</button>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 10 }}>
                        {[{ l: "Prix d'achat", v: b.prix_achat.toFixed(0)+' €', c: 'var(--color-text)' }, { l: 'Valeur actuelle', v: b.valeur_actuelle.toFixed(0)+' €', c: '#f59e0b' }, { l: '+/- value', v: (pv>=0?'+':'')+pv.toFixed(0)+' €', c: pv>=0?'#10b981':'#ef4444' }].map(k => (
                          <div key={k.l} style={{ background: 'var(--color-bg)', borderRadius: 8, padding: '7px 10px' }}>
                            <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{k.l}</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: k.c }}>{k.v}</div>
                          </div>
                        ))}
                      </div>
                      {b.note && <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 8 }}>{b.note}</p>}
                    </div>
                  </div>
                </div>
              )
            })
          }
        </div>
      )}

      {/* Modals */}
      <Modal show={showVehForm} onClose={() => { setShowVehForm(false); setEditVeh(null) }} title={editVeh ? 'Modifier' : 'Nouveau véhicule commun'} onSubmit={saveVeh} color="linear-gradient(135deg,#10b981,#06b6d4)">
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Nom</label><input required value={vehForm.nom} onChange={e => setVehForm(f=>({...f,nom:e.target.value}))} placeholder="Livret commun, SCPI..." style={inp} /></div>
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Icône</label><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{ICONES.map(ic => <button key={ic} type="button" onClick={() => setVehForm(f=>({...f,icone:ic}))} style={{ width: 36, height: 36, borderRadius: 8, border: vehForm.icone===ic?'2px solid #10b981':'1px solid var(--color-border)', background: vehForm.icone===ic?'rgba(16,185,129,0.1)':'transparent', cursor: 'pointer', fontSize: 18 }}>{ic}</button>)}</div></div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, background: 'var(--color-bg)' }}>
          <div><div style={{ fontSize: 13, fontWeight: 500 }}>Pilotable</div><div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Retrait/dépôt libre</div></div>
          <button type="button" onClick={() => setVehForm(f=>({...f,pilotable:!f.pilotable}))} style={{ position: 'relative', width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: vehForm.pilotable?'#10b981':'#475569' }}><span style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: 'white', left: vehForm.pilotable?22:2, transition: 'left 0.2s' }} /></button>
        </div>
      </Modal>

      <Modal show={showMvtForm} onClose={() => setShowMvtForm(false)} title="Nouveau mouvement" onSubmit={saveMvt} color="linear-gradient(135deg,#10b981,#06b6d4)">
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Véhicule</label><select required value={mvtForm.vehicule_id} onChange={e => setMvtForm(f=>({...f,vehicule_id:e.target.value}))} style={inp}><option value="">Choisir...</option>{vehicules.map(v => <option key={v.id} value={v.id}>{v.icone} {v.nom}</option>)}</select></div>
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Type</label><div style={{ display: 'flex', gap: 6 }}>{[['depot','+ Dépôt','#10b981'],['retrait','− Retrait','#ef4444'],['valeur','= MAJ valeur','#6366f1']].map(([t,l,c]) => <button key={t} type="button" onClick={() => setMvtForm(f=>({...f,type:t}))} style={{ flex: 1, padding: '8px', borderRadius: 8, border: mvtForm.type===t?'none':'1px solid var(--color-border)', background: mvtForm.type===t?c:'transparent', color: mvtForm.type===t?'white':'var(--color-text-muted)', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>{l}</button>)}</div></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Montant (€)</label><input type="number" step="0.01" min="0" required value={mvtForm.montant} onChange={e => setMvtForm(f=>({...f,montant:e.target.value}))} placeholder="0.00" style={inp} /></div>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Date</label><input type="date" required value={mvtForm.date} onChange={e => setMvtForm(f=>({...f,date:e.target.value}))} style={inp} /></div>
        </div>
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Note</label><input value={mvtForm.note} onChange={e => setMvtForm(f=>({...f,note:e.target.value}))} placeholder="Optionnel..." style={inp} /></div>
      </Modal>

      <Modal show={showBienForm} onClose={() => { setShowBienForm(false); setEditBien(null) }} title={editBien ? 'Modifier' : 'Nouveau bien commun'} onSubmit={saveBien} color="linear-gradient(135deg,#f59e0b,#ef4444)">
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Nom</label><input required value={bienForm.nom} onChange={e => setBienForm(f=>({...f,nom:e.target.value}))} placeholder="Voiture, Frigo..." style={inp} /></div>
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Icône</label><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{['🚗','🏍️','🚲','🏠','💻','📱','⌚','🎸','📺','🛋️','❄️','🧺'].map(ic => <button key={ic} type="button" onClick={() => setBienForm(f=>({...f,icone:ic}))} style={{ width: 36, height: 36, borderRadius: 8, border: bienForm.icone===ic?'2px solid #f59e0b':'1px solid var(--color-border)', background: bienForm.icone===ic?'rgba(245,158,11,0.1)':'transparent', cursor: 'pointer', fontSize: 18 }}>{ic}</button>)}</div></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Prix d'achat (€)</label><input type="number" step="0.01" min="0" required value={bienForm.prix_achat} onChange={e => setBienForm(f=>({...f,prix_achat:e.target.value}))} style={inp} /></div>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Date d'achat</label><input type="date" required value={bienForm.date_achat} onChange={e => setBienForm(f=>({...f,date_achat:e.target.value}))} style={inp} /></div>
        </div>
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Valeur actuelle (€)</label><input type="number" step="0.01" min="0" required value={bienForm.valeur_actuelle} onChange={e => setBienForm(f=>({...f,valeur_actuelle:e.target.value}))} style={inp} /></div>
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Note</label><input value={bienForm.note} onChange={e => setBienForm(f=>({...f,note:e.target.value}))} placeholder="Optionnel..." style={inp} /></div>
      </Modal>
    </div>
  )
}
