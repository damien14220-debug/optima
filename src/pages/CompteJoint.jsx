import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useMoyensPaiement } from '../hooks/useMoyensPaiement'
import FormModal from '../components/FormModal'
import PartInput from '../components/PartInput'

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

function joursAvantProchain(jour) {
  const now = new Date()
  const target = new Date(now.getFullYear(), now.getMonth(), jour)
  if (target <= now) target.setMonth(target.getMonth() + 1)
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24))
}

const EMPTY_DEP = { date: new Date().toISOString().split('T')[0], montant: '', libelle: '', categorie: 'loyer', moyen_paiement: 'Carte SG', part_damien: 50, note: '' }
const EMPTY_ABON = { nom: '', montant: '', jour_prelevement: 1, moyen_paiement: 'Carte SG', part_damien: 50, actif: true, note: '' }

export default function CompteJoint({ user }) {
  const [depenses, setDepenses] = useState([])
  const [abonnements, setAbonnements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showDepForm, setShowDepForm] = useState(false)
  const [showAbonForm, setShowAbonForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [editAbon, setEditAbon] = useState(null)
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1)
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  const [tab, setTab] = useState('depenses')
  const [partage, setPartage] = useState(null)
  const [invitationRecue, setInvitationRecue] = useState(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteMsg, setInviteMsg] = useState('')
  const [ownerId, setOwnerId] = useState(user.id)
  const [depForm, setDepForm] = useState(EMPTY_DEP)
  const [abonForm, setAbonForm] = useState(EMPTY_ABON)

  const { moyens: moyensDB } = useMoyensPaiement(user.id)
  const MOYENS_DEFAUT = ['Carte SG', 'Carte Trade', 'Espèces', 'Virement']
  const TOUS_MOYENS = [...MOYENS_DEFAUT, ...moyensDB.filter(m => !MOYENS_DEFAUT.includes(m.nom)).map(m => m.nom)]

  useEffect(() => { fetchPartage() }, [])
  useEffect(() => { if (ownerId) { fetchDepenses(); fetchAbonnements() } }, [filterMonth, filterYear, ownerId])

  const fetchPartage = async () => {
    const { data: owned } = await supabase.from('partages_joint').select('*').eq('owner_id', user.id).single()
    if (owned) { setPartage(owned); setOwnerId(user.id); return }
    const { data: received } = await supabase.from('partages_joint').select('*').eq('partner_id', user.id).single()
    if (received) { setInvitationRecue(received); if (received.statut === 'accepte') setOwnerId(received.owner_id) }
  }

  const fetchDepenses = async () => {
    setLoading(true)
    const start = `${filterYear}-${String(filterMonth).padStart(2,'0')}-01`
    const end = new Date(filterYear, filterMonth, 0).toISOString().split('T')[0]
    const { data } = await supabase.from('depenses_joint').select('*')
      .eq('user_id', ownerId).gte('date', start).lte('date', end).order('date', { ascending: false })
    setDepenses(data || [])
    setLoading(false)
  }

  const fetchAbonnements = async () => {
    const { data } = await supabase.from('abonnements_joint').select('*').eq('user_id', ownerId).order('jour_prelevement')
    setAbonnements(data || [])
    // Auto-insertion abonnements dus ce mois
    if (data && data.length > 0) autoInsertAbonnements(data)
  }

  const autoInsertAbonnements = async (abons) => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const today = now.getDate()

    for (const abon of abons) {
      if (!abon.actif) continue
      // Vérifier si le jour de prélèvement est passé ce mois
      if (abon.jour_prelevement > today) continue

      // Vérifier si déjà inséré ce mois (libellé = "🔄 nom" + date du mois)
      const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(abon.jour_prelevement).padStart(2,'0')}`
      const { data: existing } = await supabase.from('depenses_joint').select('id')
        .eq('user_id', ownerId)
        .eq('libelle', `🔄 ${abon.nom}`)
        .eq('date', dateStr)
        .single()

      if (!existing) {
        await supabase.from('depenses_joint').insert({
          user_id: ownerId,
          date: dateStr,
          montant: abon.montant,
          libelle: `🔄 ${abon.nom}`,
          categorie: 'loyer',
          moyen_paiement: abon.moyen_paiement,
          part_damien: abon.part_damien,
          note: 'Inséré automatiquement',
        })
      }
    }
    // Recharger les dépenses si des insertions ont eu lieu
    fetchDepenses()
  }

  const handleInvite = async (e) => {
    e.preventDefault(); setInviteLoading(true); setInviteMsg('')
    const { error } = await supabase.from('partages_joint').insert({ owner_id: user.id, partner_email: inviteEmail, statut: 'en_attente' })
    if (error) setInviteMsg('Erreur : ' + (error.message.includes('unique') ? 'Invitation déjà envoyée.' : error.message))
    else { setInviteMsg('✅ Invitation enregistrée ! Aline doit se connecter sur Optima et accepter.'); setInviteEmail(''); fetchPartage() }
    setInviteLoading(false)
  }

  const handleAccept = async () => {
    await supabase.from('partages_joint').update({ partner_id: user.id, statut: 'accepte' }).eq('id', invitationRecue.id)
    setInvitationRecue({ ...invitationRecue, statut: 'accepte' })
    setOwnerId(invitationRecue.owner_id)
  }

  const handleRefuse = async () => {
    await supabase.from('partages_joint').update({ statut: 'refuse' }).eq('id', invitationRecue.id)
    setInvitationRecue({ ...invitationRecue, statut: 'refuse' })
  }

  const handleRevokeInvite = async () => {
    if (!confirm('Révoquer l\'accès ?')) return
    await supabase.from('partages_joint').delete().eq('id', partage.id); setPartage(null)
  }

  const handleSubmitDep = async (e) => {
    e.preventDefault()
    const payload = { ...depForm, montant: parseFloat(depForm.montant), part_damien: parseFloat(depForm.part_damien), user_id: ownerId }
    if (editItem) await supabase.from('depenses_joint').update(payload).eq('id', editItem.id)
    else await supabase.from('depenses_joint').insert(payload)
    setShowDepForm(false); setEditItem(null); setDepForm(EMPTY_DEP); fetchDepenses()
  }

  const handleSubmitAbon = async (e) => {
    e.preventDefault()
    const payload = { ...abonForm, montant: parseFloat(abonForm.montant), part_damien: parseFloat(abonForm.part_damien), user_id: ownerId }
    if (editAbon) await supabase.from('abonnements_joint').update(payload).eq('id', editAbon.id)
    else await supabase.from('abonnements_joint').insert(payload)
    setShowAbonForm(false); setEditAbon(null); setAbonForm(EMPTY_ABON); fetchAbonnements()
  }

  const handleDeleteDep = async (id) => { if (!confirm('Supprimer ?')) return; await supabase.from('depenses_joint').delete().eq('id', id); fetchDepenses() }
  const handleDeleteAbon = async (id) => { if (!confirm('Supprimer ?')) return; await supabase.from('abonnements_joint').delete().eq('id', id); fetchAbonnements() }
  const handleToggleAbon = async (a) => { await supabase.from('abonnements_joint').update({ actif: !a.actif }).eq('id', a.id); fetchAbonnements() }

  const totalJoint = depenses.reduce((s, d) => s + d.montant, 0)
  const totalMaPart = depenses.reduce((s, d) => s + (d.montant * d.part_damien / 100), 0)
  const totalAbons = abonnements.filter(a => a.actif).reduce((s, a) => s + a.montant, 0)
  const maPartAbons = abonnements.filter(a => a.actif).reduce((s, a) => s + (a.montant * a.part_damien / 100), 0)

  const inp = { width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 14, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }
  const card = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16 }

  if (invitationRecue && invitationRecue.statut === 'en_attente') {
    return (
      <div style={{ padding: 16, maxWidth: 480, margin: '60px auto', textAlign: 'center' }}>
        <div style={{ ...card, padding: 32 }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>🤝</p>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>Invitation reçue</h2>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 24 }}>Tu as été invité(e) à partager un compte joint.</p>
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
            {partage?.statut === 'accepte' ? `Partagé avec ${partage.partner_email}` : invitationRecue?.statut === 'accepte' ? 'Compte partagé' : 'Dépenses partagées'}
          </p>
        </div>
        {tab === 'depenses' && <button onClick={() => { setShowDepForm(true); setEditItem(null); setDepForm(EMPTY_DEP) }} style={{ padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', fontSize: 13 }}>+ Dépense</button>}
        {tab === 'abonnements' && <button onClick={() => { setShowAbonForm(true); setEditAbon(null); setAbonForm(EMPTY_ABON) }} style={{ padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg,#f59e0b,#ef4444)', fontSize: 13 }}>+ Abonnement</button>}
      </div>

      <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 12, background: 'var(--color-surface)', marginBottom: 16 }}>
        {[['depenses','💸 Dépenses'],['abonnements','🔄 Abonnements'],['partage','🔗 Partage']].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, padding: '9px 4px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, background: tab === t ? '#6366f1' : 'transparent', color: tab === t ? 'white' : 'var(--color-text-muted)' }}>
            {l}
          </button>
        ))}
      </div>

      {/* DÉPENSES */}
      {tab === 'depenses' && <>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <select value={filterMonth} onChange={e => setFilterMonth(+e.target.value)} style={{ ...inp, width: 'auto' }}>{MOIS_LABELS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}</select>
          <select value={filterYear} onChange={e => setFilterYear(+e.target.value)} style={{ ...inp, width: 'auto' }}>{[2024,2025,2026,2027].map(y => <option key={y}>{y}</option>)}</select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
          {[{ label: 'Total', value: totalJoint, color: '#ec4899' },{ label: 'Ma part', value: totalMaPart, color: '#8b5cf6' },{ label: 'Autre part', value: totalJoint - totalMaPart, color: '#06b6d4' }].map(k => (
            <div key={k.label} style={{ ...card, textAlign: 'center', padding: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: k.color }}>{k.value.toFixed(0)} €</div>
            </div>
          ))}
        </div>
        {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" /></div>
        : depenses.length === 0 ? <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}><p style={{ fontSize: 36 }}>🤝</p><p>Aucune dépense commune ce mois</p></div>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {depenses.map(dep => {
            const cat = CATEGORIES_JOINT.find(c => c.id === dep.categorie)
            const maPart = dep.montant * dep.part_damien / 100
            const isAuto = dep.libelle?.startsWith('🔄')
            return (
              <div key={dep.id} style={{ ...card, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 22 }}>{cat?.icon || '📦'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dep.libelle}</div>
                    {isAuto && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: 'rgba(99,102,241,0.15)', color: '#6366f1', flexShrink: 0 }}>Auto</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{new Date(dep.date).toLocaleDateString('fr-FR')} · {cat?.label} · {dep.moyen_paiement}</div>
                  <div style={{ fontSize: 11, marginTop: 2 }}><span style={{ color: '#8b5cf6', fontWeight: 500 }}>Ma part : {maPart.toFixed(2)} €</span><span style={{ color: 'var(--color-text-muted)' }}> ({dep.part_damien}%)</span></div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#ec4899', flexShrink: 0 }}>— {dep.montant.toFixed(2)} €</div>
                <button onClick={() => { setEditItem(dep); setDepForm({ date: dep.date, montant: dep.montant, libelle: dep.libelle, categorie: dep.categorie, moyen_paiement: dep.moyen_paiement, part_damien: dep.part_damien, note: dep.note || '' }); setShowDepForm(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✏️</button>
                <button onClick={() => handleDeleteDep(dep.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>🗑️</button>
              </div>
            )
          })}
        </div>}
      </>}

      {/* ABONNEMENTS */}
      {tab === 'abonnements' && <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
          {[{ label: 'Total/mois', value: totalAbons, color: '#f59e0b' },{ label: 'Ma part/mois', value: maPartAbons, color: '#8b5cf6' },{ label: 'Autre part', value: totalAbons - maPartAbons, color: '#06b6d4' }].map(k => (
            <div key={k.label} style={{ ...card, textAlign: 'center', padding: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: k.color }}>{k.value.toFixed(0)} €</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
          💡 Les abonnements sont automatiquement ajoutés dans les dépenses à leur date de prélèvement.
        </div>
        {abonnements.length === 0
          ? <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}><p style={{ fontSize: 36 }}>🔄</p><p>Aucun abonnement commun</p></div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {abonnements.map(a => {
              const jours = joursAvantProchain(a.jour_prelevement)
              const maPart = a.montant * a.part_damien / 100
              const urgent = jours <= 5
              return (
                <div key={a.id} style={{ ...card, padding: '12px 16px', opacity: a.actif ? 1 : 0.55 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{a.nom}</span>
                        {urgent && a.actif && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 20, background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontWeight: 600 }}>⚡ {jours}j</span>}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>Le {a.jour_prelevement} du mois · {a.moyen_paiement}{a.note ? ` · ${a.note}` : ''}</div>
                      <div style={{ fontSize: 11, marginTop: 2 }}>
                        <span style={{ color: '#8b5cf6', fontWeight: 500 }}>Ma part : {maPart.toFixed(2)} €</span>
                        <span style={{ color: 'var(--color-text-muted)' }}> · Prochain dans {jours} jour{jours > 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: a.actif ? '#f59e0b' : 'var(--color-text-muted)' }}>— {a.montant.toFixed(2)} €</div>
                      <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>/mois</div>
                    </div>
                    <button onClick={() => handleToggleAbon(a)} style={{ position: 'relative', width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', background: a.actif ? '#10b981' : '#475569', flexShrink: 0 }}><span style={{ position: 'absolute', top: 2, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.2s', left: a.actif ? 18 : 2 }} /></button>
                    <button onClick={() => { setEditAbon(a); setAbonForm({ nom: a.nom, montant: a.montant, jour_prelevement: a.jour_prelevement, moyen_paiement: a.moyen_paiement, part_damien: a.part_damien, actif: a.actif, note: a.note || '' }); setShowAbonForm(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>✏️</button>
                    <button onClick={() => handleDeleteAbon(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>🗑️</button>
                  </div>
                  {a.actif && <div style={{ marginTop: 8, height: 3, borderRadius: 2, background: 'var(--color-border)' }}><div style={{ height: '100%', borderRadius: 2, background: urgent ? '#ef4444' : '#f59e0b', width: `${Math.max(5, 100 - (jours / 31) * 100)}%` }} /></div>}
                </div>
              )
            })}
          </div>}
      </>}

      {/* PARTAGE */}
      {tab === 'partage' && <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {invitationRecue?.statut === 'accepte' ? (
          <div style={{ ...card, padding: 20, textAlign: 'center' }}><p style={{ fontSize: 32, marginBottom: 8 }}>✅</p><p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>Compte joint actif</p></div>
        ) : partage ? (
          <div style={{ ...card, padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 12 }}>Partage actif</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--color-border)', marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>{partage.partner_email[0].toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>{partage.partner_email}</div>
                <div style={{ fontSize: 12, marginTop: 2 }}>{partage.statut === 'accepte' ? <span style={{ color: '#10b981' }}>✅ Accès accepté</span> : <span style={{ color: '#f59e0b' }}>⏳ En attente d'acceptation</span>}</div>
              </div>
            </div>
            {partage.statut === 'en_attente' && <div style={{ padding: 12, borderRadius: 10, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 13, color: '#f59e0b', marginBottom: 12 }}>Aline doit se connecter sur Optima et ouvrir Compte Joint pour accepter.</div>}
            <button onClick={handleRevokeInvite} style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid #ef4444', background: 'transparent', cursor: 'pointer', color: '#ef4444', fontSize: 13, fontWeight: 500 }}>Révoquer l'accès</button>
          </div>
        ) : (
          <div style={{ ...card, padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>Inviter un partenaire</h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>Entre l'email d'Aline. Elle devra créer un compte sur Optima puis accepter l'invitation ici.</p>
            {inviteMsg && <div style={{ padding: 10, borderRadius: 8, background: inviteMsg.startsWith('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${inviteMsg.startsWith('✅') ? '#10b981' : '#ef4444'}`, color: inviteMsg.startsWith('✅') ? '#10b981' : '#ef4444', fontSize: 13, marginBottom: 12 }}>{inviteMsg}</div>}
            <form onSubmit={handleInvite} style={{ display: 'flex', gap: 8 }}>
              <input type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="email@aline.fr" style={{ ...inp, flex: 1 }} />
              <button type="submit" disabled={inviteLoading} style={{ padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', opacity: inviteLoading ? 0.7 : 1 }}>{inviteLoading ? '...' : 'Inviter'}</button>
            </form>
          </div>
        )}
        <div style={{ ...card, padding: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>Comment ça marche ?</h3>
          {[['1️⃣','Tu entres l\'email d\'Aline ci-dessus'],['2️⃣','Aline crée un compte sur Optima avec cette adresse'],['3️⃣','Elle ouvre Compte Joint → accepte l\'invitation'],['4️⃣','Vous gérez ensemble dépenses et abonnements communs']].map(([n,t]) => (
            <div key={n} style={{ display: 'flex', gap: 10, marginBottom: 8 }}><span style={{ fontSize: 16 }}>{n}</span><span style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>{t}</span></div>
          ))}
        </div>
      </div>}

      {/* Form dépense */}
      <FormModal show={showDepForm} onClose={() => { setShowDepForm(false); setEditItem(null) }} title={editItem ? 'Modifier la dépense' : 'Nouvelle dépense commune'} onSubmit={handleSubmitDep} submitLabel={editItem ? 'Modifier' : 'Ajouter'}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Date</label><input type="date" required value={depForm.date} onChange={e => setDepForm(f => ({...f, date: e.target.value}))} style={inp} /></div>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Montant (€)</label><input type="number" step="0.01" min="0" required value={depForm.montant} onChange={e => setDepForm(f => ({...f, montant: e.target.value}))} placeholder="0.00" style={inp} /></div>
        </div>
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Libellé</label><input required value={depForm.libelle} onChange={e => setDepForm(f => ({...f, libelle: e.target.value}))} placeholder="Ex: Loyer juillet..." style={inp} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Catégorie</label>
            <select required value={depForm.categorie} onChange={e => setDepForm(f => ({...f, categorie: e.target.value}))} style={inp}>
              {CATEGORIES_JOINT.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
            </select>
          </div>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Moyen de paiement</label>
            <select value={depForm.moyen_paiement} onChange={e => setDepForm(f => ({...f, moyen_paiement: e.target.value}))} style={inp}>
              {TOUS_MOYENS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <PartInput value={depForm.part_damien} onChange={v => setDepForm(f => ({...f, part_damien: v}))} montant={depForm.montant} />
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Note</label><input value={depForm.note} onChange={e => setDepForm(f => ({...f, note: e.target.value}))} placeholder="Optionnel..." style={inp} /></div>
      </FormModal>

      {/* Form abonnement */}
      <FormModal show={showAbonForm} onClose={() => { setShowAbonForm(false); setEditAbon(null) }} title={editAbon ? 'Modifier l\'abonnement' : 'Nouvel abonnement commun'} onSubmit={handleSubmitAbon} color="linear-gradient(135deg,#f59e0b,#ef4444)" submitLabel={editAbon ? 'Modifier' : 'Ajouter'}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Nom</label><input required value={abonForm.nom} onChange={e => setAbonForm(f => ({...f, nom: e.target.value}))} placeholder="Ex: Loyer, Netflix..." style={inp} /></div>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Montant (€)</label><input type="number" step="0.01" min="0" required value={abonForm.montant} onChange={e => setAbonForm(f => ({...f, montant: e.target.value}))} placeholder="0.00" style={inp} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Jour de prélèvement</label><input type="number" min="1" max="28" required value={abonForm.jour_prelevement} onChange={e => setAbonForm(f => ({...f, jour_prelevement: parseInt(e.target.value)}))} style={inp} /></div>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Moyen de paiement</label>
            <select value={abonForm.moyen_paiement} onChange={e => setAbonForm(f => ({...f, moyen_paiement: e.target.value}))} style={inp}>
              {TOUS_MOYENS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <PartInput value={abonForm.part_damien} onChange={v => setAbonForm(f => ({...f, part_damien: v}))} montant={abonForm.montant} />
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Note</label><input value={abonForm.note} onChange={e => setAbonForm(f => ({...f, note: e.target.value}))} placeholder="Optionnel..." style={inp} /></div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ fontSize: 13, color: 'var(--color-text)' }}>Abonnement actif</label>
          <button type="button" onClick={() => setAbonForm(f => ({...f, actif: !f.actif}))} style={{ position: 'relative', width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: abonForm.actif ? '#10b981' : '#475569' }}><span style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.2s', left: abonForm.actif ? 22 : 2 }} /></button>
        </div>
      </FormModal>
    </div>
  )
}
