import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useMoyensPaiement } from '../hooks/useMoyensPaiement'

const CATEGORIES_JOINT = [
  { id: 'loyer', label: 'Loyer / Charges', icon: '🏠' },
  { id: 'courses', label: 'Courses', icon: '🛒' },
  { id: 'restaurant', label: 'Restaurant / Sorties', icon: '🍕' },
  { id: 'vacances', label: 'Vacances', icon: '✈️' },
  { id: 'maison', label: 'Maison / Déco', icon: '🛋️' },
  { id: 'sante', label: 'Santé', icon: '🏥' },
  { id: 'divers', label: 'Divers', icon: '📦' },
]

const MOIS_LABELS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

export default function CompteJoint({ user }) {
  const [depenses, setDepenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1)
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  const [tab, setTab] = useState('depenses')

  // Partage
  const [partage, setPartage] = useState(null) // partage dont je suis owner
  const [invitationRecue, setInvitationRecue] = useState(null) // invitation reçue
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteMsg, setInviteMsg] = useState('')
  const [ownerId, setOwnerId] = useState(user.id) // par défaut moi, ou le owner si je suis partner

  const { moyens: moyensDB } = useMoyensPaiement(user.id)
  const MOYENS_DEFAUT_NOMS = ['Carte SG', 'Carte Trade', 'Espèces', 'Virement']
  const MOYENS_CUSTOM_NOMS = moyensDB.filter(m => !MOYENS_DEFAUT_NOMS.includes(m.nom)).map(m => m.nom)
  const TOUS_MOYENS = [...MOYENS_DEFAUT_NOMS, ...MOYENS_CUSTOM_NOMS]

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    montant: '', libelle: '', categorie: 'loyer',
    moyen_paiement: 'Carte SG', part_damien: 50, note: ''
  })

  useEffect(() => { fetchPartage() }, [])
  useEffect(() => { if (ownerId) fetchDepenses() }, [filterMonth, filterYear, ownerId])

  const fetchPartage = async () => {
    // Est-ce que je suis owner d'un partage ?
    const { data: owned } = await supabase.from('partages_joint').select('*').eq('owner_id', user.id).single()
    if (owned) { setPartage(owned); setOwnerId(user.id); return }

    // Est-ce que j'ai une invitation reçue ?
    const { data: received } = await supabase.from('partages_joint').select('*').eq('partner_id', user.id).single()
    if (received) {
      setInvitationRecue(received)
      if (received.statut === 'accepte') setOwnerId(received.owner_id)
    }
  }

  const fetchDepenses = async () => {
    setLoading(true)
    const start = `${filterYear}-${String(filterMonth).padStart(2,'0')}-01`
    const end = new Date(filterYear, filterMonth, 0).toISOString().split('T')[0]
    const { data } = await supabase.from('depenses_joint').select('*')
      .eq('user_id', ownerId).gte('date', start).lte('date', end)
      .order('date', { ascending: false })
    setDepenses(data || [])
    setLoading(false)
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    setInviteLoading(true)
    setInviteMsg('')
    // Chercher le user par email dans auth (via RPC ou on stocke juste l'email)
    const { data, error } = await supabase.from('partages_joint').insert({
      owner_id: user.id,
      partner_email: inviteEmail,
      statut: 'en_attente'
    })
    if (error) {
      setInviteMsg('Erreur : ' + (error.message.includes('unique') ? 'Invitation déjà envoyée.' : error.message))
    } else {
      setInviteMsg('✅ Invitation enregistrée ! Aline doit se connecter sur Optima et accepter l\'invitation dans Compte Joint.')
      setInviteEmail('')
      fetchPartage()
    }
    setInviteLoading(false)
  }

  const handleAccept = async () => {
    await supabase.from('partages_joint').update({ partner_id: user.id, statut: 'accepte' }).eq('id', invitationRecue.id)
    setInvitationRecue({ ...invitationRecue, statut: 'accepte' })
    setOwnerId(invitationRecue.owner_id)
    fetchDepenses()
  }

  const handleRefuse = async () => {
    await supabase.from('partages_joint').update({ statut: 'refuse' }).eq('id', invitationRecue.id)
    setInvitationRecue({ ...invitationRecue, statut: 'refuse' })
  }

  const handleRevokeInvite = async () => {
    if (!confirm('Révoquer l\'accès de ce partenaire ?')) return
    await supabase.from('partages_joint').delete().eq('id', partage.id)
    setPartage(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = { ...form, montant: parseFloat(form.montant), part_damien: parseFloat(form.part_damien), user_id: ownerId }
    if (editItem) await supabase.from('depenses_joint').update(payload).eq('id', editItem.id)
    else await supabase.from('depenses_joint').insert(payload)
    setShowForm(false); setEditItem(null); resetForm(); fetchDepenses()
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ?')) return
    await supabase.from('depenses_joint').delete().eq('id', id)
    fetchDepenses()
  }

  const handleEdit = (dep) => {
    setForm({ date: dep.date, montant: dep.montant, libelle: dep.libelle, categorie: dep.categorie, moyen_paiement: dep.moyen_paiement, part_damien: dep.part_damien, note: dep.note || '' })
    setEditItem(dep); setShowForm(true)
  }

  const resetForm = () => setForm({ date: new Date().toISOString().split('T')[0], montant: '', libelle: '', categorie: 'loyer', moyen_paiement: TOUS_MOYENS[0] || 'Carte SG', part_damien: 50, note: '' })

  const totalJoint = depenses.reduce((s, d) => s + d.montant, 0)
  const totalMaPart = depenses.reduce((s, d) => s + (d.montant * d.part_damien / 100), 0)
  const isPartner = invitationRecue?.statut === 'accepte'

  const s = {
    input: { width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 14, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' },
    card: { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16 }
  }

  // ── Invitation en attente reçue (pas encore acceptée) ──
  if (invitationRecue && invitationRecue.statut === 'en_attente') {
    return (
      <div style={{ padding: 16, maxWidth: 480, margin: '60px auto', textAlign: 'center' }}>
        <div style={{ ...s.card, padding: 32 }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>🤝</p>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>Invitation reçue</h2>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 24 }}>
            Tu as été invité(e) à partager un compte joint. En acceptant, tu pourras consulter et ajouter des dépenses communes.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleRefuse} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)', fontWeight: 500 }}>Refuser</button>
            <button onClick={handleAccept} style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer', color: 'white', fontWeight: 600, background: 'linear-gradient(135deg,#ec4899,#8b5cf6)' }}>Accepter 🎉</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 16, maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text)' }}>Compte Joint</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>
            {isPartner ? 'Dépenses partagées' : partage?.statut === 'accepte' ? `Partagé avec ${partage.partner_email}` : 'Dépenses partagées avec Aline'}
          </p>
        </div>
        <button onClick={() => { setShowForm(true); setEditItem(null); resetForm() }}
          style={{ padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', fontSize: 13 }}>
          + Ajouter
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 12, background: 'var(--color-surface)', marginBottom: 16 }}>
        {[['depenses','💸 Dépenses'], ['partage','🔗 Partage']].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, background: tab === t ? '#6366f1' : 'transparent', color: tab === t ? 'white' : 'var(--color-text-muted)' }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── ONGLET PARTAGE ── */}
      {tab === 'partage' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {isPartner ? (
            <div style={{ ...s.card, padding: 20, textAlign: 'center' }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>✅</p>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>Compte joint actif</p>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>Tu consultes les dépenses partagées.</p>
            </div>
          ) : partage ? (
            <div style={{ ...s.card, padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 12 }}>Partage actif</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--color-border)', marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>
                  {partage.partner_email[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>{partage.partner_email}</div>
                  <div style={{ fontSize: 12, marginTop: 2 }}>
                    {partage.statut === 'accepte'
                      ? <span style={{ color: '#10b981' }}>✅ Accès accepté</span>
                      : <span style={{ color: '#f59e0b' }}>⏳ En attente d'acceptation</span>}
                  </div>
                </div>
              </div>
              {partage.statut === 'en_attente' && (
                <div style={{ padding: 12, borderRadius: 10, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 13, color: '#f59e0b', marginBottom: 12 }}>
                  Aline doit se connecter sur Optima et ouvrir la page Compte Joint pour accepter l'invitation.
                </div>
              )}
              <button onClick={handleRevokeInvite}
                style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid #ef4444', background: 'transparent', cursor: 'pointer', color: '#ef4444', fontSize: 13, fontWeight: 500 }}>
                Révoquer l'accès
              </button>
            </div>
          ) : (
            <div style={{ ...s.card, padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>Inviter un partenaire</h3>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>
                Entre l'email d'Aline. Elle devra créer un compte sur Optima avec cette adresse, puis accepter l'invitation ici.
              </p>
              {inviteMsg && (
                <div style={{ padding: 10, borderRadius: 8, background: inviteMsg.startsWith('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${inviteMsg.startsWith('✅') ? '#10b981' : '#ef4444'}`, color: inviteMsg.startsWith('✅') ? '#10b981' : '#ef4444', fontSize: 13, marginBottom: 12 }}>
                  {inviteMsg}
                </div>
              )}
              <form onSubmit={handleInvite} style={{ display: 'flex', gap: 8 }}>
                <input type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  placeholder="email@aline.fr" style={{ ...s.input, flex: 1 }} />
                <button type="submit" disabled={inviteLoading}
                  style={{ padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', whiteSpace: 'nowrap', opacity: inviteLoading ? 0.7 : 1 }}>
                  {inviteLoading ? '...' : 'Inviter'}
                </button>
              </form>
            </div>
          )}

          <div style={{ ...s.card, padding: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>Comment ça marche ?</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['1️⃣', 'Tu entres l\'email d\'Aline ci-dessus'],
                ['2️⃣', 'Aline crée un compte sur Optima avec cette adresse'],
                ['3️⃣', 'Elle ouvre la page Compte Joint → accepte l\'invitation'],
                ['4️⃣', 'Vous pouvez toutes les deux ajouter et voir les dépenses communes'],
              ].map(([num, text]) => (
                <div key={num} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 16 }}>{num}</span>
                  <span style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── ONGLET DÉPENSES ── */}
      {tab === 'depenses' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <select value={filterMonth} onChange={e => setFilterMonth(+e.target.value)} style={{ ...s.input, width: 'auto' }}>
              {MOIS_LABELS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
            <select value={filterYear} onChange={e => setFilterYear(+e.target.value)} style={{ ...s.input, width: 'auto' }}>
              {[2024,2025,2026,2027].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
            {[{ label: 'Total', value: totalJoint, color: '#ec4899' },{ label: 'Ma part', value: totalMaPart, color: '#8b5cf6' },{ label: isPartner ? 'Autre part' : 'Part Aline', value: totalJoint - totalMaPart, color: '#06b6d4' }].map(k => (
              <div key={k.label} style={{ ...s.card, textAlign: 'center', padding: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>{k.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: k.color }}>{k.value.toFixed(0)} €</div>
              </div>
            ))}
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : depenses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}><p style={{ fontSize: 36 }}>🤝</p><p>Aucune dépense commune ce mois</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {depenses.map(dep => {
                const cat = CATEGORIES_JOINT.find(c => c.id === dep.categorie)
                const maPart = dep.montant * dep.part_damien / 100
                return (
                  <div key={dep.id} style={{ ...s.card, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 22 }}>{cat?.icon || '📦'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dep.libelle}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{new Date(dep.date).toLocaleDateString('fr-FR')} · {cat?.label} · {dep.moyen_paiement}</div>
                      <div style={{ fontSize: 11, marginTop: 2 }}><span style={{ color: '#8b5cf6', fontWeight: 500 }}>Ma part : {maPart.toFixed(2)} €</span><span style={{ color: 'var(--color-text-muted)' }}> ({dep.part_damien}%)</span></div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#ec4899' }}>— {dep.montant.toFixed(2)} €</div>
                    </div>
                    <button onClick={() => handleEdit(dep)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✏️</button>
                    <button onClick={() => handleDelete(dep.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>🗑️</button>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Form */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ width: '100%', maxWidth: 500, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 20, padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-text)' }}>{editItem ? 'Modifier' : 'Nouvelle dépense commune'}</h2>
              <button onClick={() => { setShowForm(false); setEditItem(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--color-text-muted)' }}>×</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Date</label><input type="date" required value={form.date} onChange={e => setForm({...form, date: e.target.value})} style={s.input} /></div>
                <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Montant total (€)</label><input type="number" step="0.01" min="0" required value={form.montant} onChange={e => setForm({...form, montant: e.target.value})} placeholder="0.00" style={s.input} /></div>
              </div>
              <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Libellé</label><input required value={form.libelle} onChange={e => setForm({...form, libelle: e.target.value})} placeholder="Ex: Loyer juillet..." style={s.input} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Catégorie</label>
                  <select required value={form.categorie} onChange={e => setForm({...form, categorie: e.target.value})} style={s.input}>
                    {CATEGORIES_JOINT.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Moyen de paiement</label>
                  <select value={form.moyen_paiement} onChange={e => setForm({...form, moyen_paiement: e.target.value})} style={s.input}>
                    {TOUS_MOYENS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>
                  Ma part : {form.part_damien}% ({form.montant ? (parseFloat(form.montant) * form.part_damien / 100).toFixed(2) : '0.00'} €)
                </label>
                <input type="range" min="0" max="100" step="5" value={form.part_damien} onChange={e => setForm({...form, part_damien: parseInt(e.target.value)})} style={{ width: '100%', accentColor: '#8b5cf6' }} />
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  {[0,25,50,75,100].map(p => (
                    <button key={p} type="button" onClick={() => setForm({...form, part_damien: p})}
                      style={{ flex: 1, padding: '4px 0', borderRadius: 6, border: form.part_damien === p ? 'none' : '1px solid var(--color-border)', background: form.part_damien === p ? '#8b5cf6' : 'transparent', color: form.part_damien === p ? 'white' : 'var(--color-text-muted)', cursor: 'pointer', fontSize: 11, fontWeight: 500 }}>
                      {p}%
                    </button>
                  ))}
                </div>
              </div>
              <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Note</label><input value={form.note} onChange={e => setForm({...form, note: e.target.value})} placeholder="Optionnel..." style={s.input} /></div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => { setShowForm(false); setEditItem(null) }} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)' }}>Annuler</button>
                <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', color: 'white', fontWeight: 600, background: 'linear-gradient(135deg,#ec4899,#8b5cf6)' }}>{editItem ? 'Modifier' : 'Ajouter'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
