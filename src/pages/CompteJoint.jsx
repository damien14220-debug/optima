import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useMoyensPaiement } from '../hooks/useMoyensPaiement'
import FormModal from '../components/FormModal'
import PartInput from '../components/PartInput'

const ICONES_PROJET = ['🏠','✈️','🛒','🍕','🎉','🏋️','🎬','🐶','🚗','💊','🎸','🏖️','🎓','💼','🛋️','🌿']
const COULEURS_PROJET = ['#6366f1','#ec4899','#10b981','#f59e0b','#06b6d4','#8b5cf6','#ef4444','#84cc16']
const MOIS_LABELS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

const CATS_JOINT_DEFAUT = [
  { id: 'loyer', label: 'Loyer / Charges', icon: '🏠' },
  { id: 'courses', label: 'Courses', icon: '🛒' },
  { id: 'restaurant', label: 'Restaurant', icon: '🍕' },
  { id: 'vacances', label: 'Vacances', icon: '✈️' },
  { id: 'maison', label: 'Maison / Déco', icon: '🛋️' },
  { id: 'sante', label: 'Santé', icon: '🏥' },
  { id: 'divers', label: 'Divers', icon: '📦' },
]

const EMPTY_PROJET = { nom: '', icone: '🏠', couleur: '#6366f1', description: '' }
const EMPTY_DEP_COMMUNE = { libelle: '', montant: '', payeur: 'moi', moyen_paiement: 'Carte SG', part_moi: 50, date: new Date().toISOString().split('T')[0], categorie: 'loyer', note: '', sync_depenses_perso: true }
const EMPTY_DEP_PROJET = { libelle: '', montant: '', payeur: 'moi', moyen_paiement: 'Carte SG', part_moi: 50, date: new Date().toISOString().split('T')[0], note: '', sync_depenses_perso: true }
const EMPTY_ABON = { nom: '', montant: '', jour_prelevement: 1, moyen_paiement: 'Carte SG', part_damien: 50, actif: true, note: '' }

function joursAvantProchain(jour) {
  const now = new Date()
  const target = new Date(now.getFullYear(), now.getMonth(), jour)
  if (target <= now) target.setMonth(target.getMonth() + 1)
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24))
}

export default function CompteJoint({ user }) {
  const [mainTab, setMainTab] = useState('commun')
  const [communTab, setCommunTab] = useState('depenses')
  const [projets, setProjets] = useState([])
  const [projetActif, setProjetActif] = useState(null)
  const [depensesCommunes, setDepensesCommunes] = useState([])
  const [depensesProjet, setDepensesProjet] = useState([])
  const [abonnements, setAbonnements] = useState([])
  const [catsJoint, setCatsJoint] = useState([])
  const [partage, setPartage] = useState(null)
  const [invitationRecue, setInvitationRecue] = useState(null)
  const [ownerId, setOwnerId] = useState(user.id)
  const [isPartner, setIsPartner] = useState(false)
  const [partnerName, setPartnerName] = useState('Partenaire')
  const [editPartnerName, setEditPartnerName] = useState(false)
  const [newPartnerName, setNewPartnerName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteMsg, setInviteMsg] = useState('')
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1)
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())

  const [showProjetForm, setShowProjetForm] = useState(false)
  const [showDepCommuneForm, setShowDepCommuneForm] = useState(false)
  const [showDepProjetForm, setShowDepProjetForm] = useState(false)
  const [showAbonForm, setShowAbonForm] = useState(false)
  const [editProjet, setEditProjet] = useState(null)
  const [editDepCommune, setEditDepCommune] = useState(null)
  const [editDepProjet, setEditDepProjet] = useState(null)
  const [editAbon, setEditAbon] = useState(null)

  const [projetForm, setProjetForm] = useState(EMPTY_PROJET)
  const [depCommuneForm, setDepCommuneForm] = useState(EMPTY_DEP_COMMUNE)
  const [depProjetForm, setDepProjetForm] = useState(EMPTY_DEP_PROJET)
  const [abonForm, setAbonForm] = useState(EMPTY_ABON)
  const [soldeGlobal, setSoldeGlobal] = useState(0)

  const { moyens: moyensDB } = useMoyensPaiement(user.id)
  const MOYENS_DEFAUT = ['Carte SG', 'Carte Trade', 'Espèces', 'Virement']
  const TOUS_MOYENS = [...MOYENS_DEFAUT, ...moyensDB.filter(m => !MOYENS_DEFAUT.includes(m.nom)).map(m => m.nom)]
  const allCatsJoint = [...CATS_JOINT_DEFAUT, ...catsJoint.map(c => ({ id: c.id, label: c.nom, icon: c.icone }))]

  useEffect(() => { fetchPartage() }, [])
  useEffect(() => { if (ownerId) { fetchProjets(); fetchAbonnements(); fetchCatsJoint(); fetchSoldeGlobal() } }, [ownerId])
  useEffect(() => { if (ownerId) fetchDepensesCommunes() }, [filterMonth, filterYear, ownerId])
  useEffect(() => { if (projetActif) fetchDepensesProjet() }, [projetActif, filterMonth, filterYear])

  const fetchPartage = async () => {
    const { data: owned } = await supabase.from('partages_joint').select('*').eq('owner_id', user.id).single()
    if (owned) {
      setPartage(owned); setOwnerId(user.id)
      if (owned.partner_name) setPartnerName(owned.partner_name)
      else if (owned.partner_email) setPartnerName(owned.partner_email.split('@')[0])
      return
    }
    const { data: received } = await supabase.from('partages_joint').select('*').eq('partner_id', user.id).single()
    if (received) {
      setInvitationRecue(received)
      if (received.statut === 'accepte') { setIsPartner(true); setOwnerId(received.owner_id) }
    }
  }

  const fetchProjets = async () => { const { data } = await supabase.from('projets_joint').select('*').eq('owner_id', ownerId).order('created_at'); setProjets(data || []) }
  const fetchAbonnements = async () => { const { data } = await supabase.from('abonnements_joint').select('*').eq('user_id', ownerId).order('jour_prelevement'); setAbonnements(data || []) }
  const fetchCatsJoint = async () => { const { data } = await supabase.from('categories_joint').select('*').eq('owner_id', ownerId).order('ordre'); setCatsJoint(data || []) }

  const fetchDepensesCommunes = async () => {
    const start = `${filterYear}-${String(filterMonth).padStart(2,'0')}-01`
    const end = new Date(filterYear, filterMonth, 0).toISOString().split('T')[0]
    const { data } = await supabase.from('depenses_joint').select('*').eq('user_id', ownerId).gte('date', start).lte('date', end).order('date', { ascending: false })
    setDepensesCommunes(data || [])
  }

  const fetchDepensesProjet = async () => {
    if (!projetActif) return
    const start = `${filterYear}-${String(filterMonth).padStart(2,'0')}-01`
    const end = new Date(filterYear, filterMonth, 0).toISOString().split('T')[0]
    const { data } = await supabase.from('depenses_projet').select('*').eq('projet_id', projetActif.id).gte('date', start).lte('date', end).order('date', { ascending: false })
    setDepensesProjet(data || [])
  }

  const fetchSoldeGlobal = async () => {
    const { data } = await supabase.from('depenses_projet').select('montant,payeur,part_moi').eq('owner_id', ownerId)
    let s = 0
    ;(data || []).forEach(d => { const p = d.part_moi / 100; s += d.payeur === 'moi' ? d.montant * (1 - p) : -d.montant * p })
    setSoldeGlobal(s)
  }

  const soldeProjet = (deps) => {
    let s = 0
    deps.forEach(d => { const p = d.part_moi / 100; s += d.payeur === 'moi' ? d.montant * (1 - p) : -d.montant * p })
    return s
  }

  const savePartnerName = async () => {
    if (!newPartnerName.trim()) return
    await supabase.from('partages_joint').update({ partner_name: newPartnerName }).eq('id', partage.id)
    setPartnerName(newPartnerName); setEditPartnerName(false); setNewPartnerName('')
  }

  const handleSaveProjet = async (e) => {
    e.preventDefault()
    const payload = { ...projetForm, owner_id: ownerId }
    if (editProjet) await supabase.from('projets_joint').update(payload).eq('id', editProjet.id)
    else await supabase.from('projets_joint').insert(payload)
    setShowProjetForm(false); setEditProjet(null); setProjetForm(EMPTY_PROJET); fetchProjets()
  }

  const handleSaveDepCommune = async (e) => {
    e.preventDefault()
    const payload = { ...depCommuneForm, montant: parseFloat(depCommuneForm.montant), part_damien: parseFloat(depCommuneForm.part_moi), user_id: ownerId }
    if (editDepCommune) await supabase.from('depenses_joint').update(payload).eq('id', editDepCommune.id)
    else {
      await supabase.from('depenses_joint').insert(payload)
      if (depCommuneForm.payeur === 'moi' && depCommuneForm.sync_depenses_perso) {
        await supabase.from('depenses').insert({ user_id: user.id, date: depCommuneForm.date, montant: parseFloat(depCommuneForm.montant), libelle: `🤝 ${depCommuneForm.libelle}`, categorie: 'joint', moyen_paiement: depCommuneForm.moyen_paiement, is_joint: true })
      }
    }
    setShowDepCommuneForm(false); setEditDepCommune(null); setDepCommuneForm(EMPTY_DEP_COMMUNE); fetchDepensesCommunes()
  }

  const handleSaveDepProjet = async (e) => {
    e.preventDefault()
    const payload = { ...depProjetForm, montant: parseFloat(depProjetForm.montant), part_moi: parseFloat(depProjetForm.part_moi), projet_id: projetActif.id, owner_id: ownerId }
    if (editDepProjet) await supabase.from('depenses_projet').update(payload).eq('id', editDepProjet.id)
    else {
      await supabase.from('depenses_projet').insert(payload)
      if (depProjetForm.payeur === 'moi' && depProjetForm.sync_depenses_perso) {
        await supabase.from('depenses').insert({ user_id: user.id, date: depProjetForm.date, montant: parseFloat(depProjetForm.montant), libelle: `🤝 ${projetActif.nom} — ${depProjetForm.libelle}`, categorie: 'joint', moyen_paiement: depProjetForm.moyen_paiement, is_joint: true, projet_joint_id: projetActif.id })
      }
    }
    setShowDepProjetForm(false); setEditDepProjet(null); setDepProjetForm(EMPTY_DEP_PROJET); fetchDepensesProjet(); fetchSoldeGlobal()
  }

  const handleSaveAbon = async (e) => {
    e.preventDefault()
    const payload = { ...abonForm, montant: parseFloat(abonForm.montant), part_damien: parseFloat(abonForm.part_damien), user_id: ownerId }
    if (editAbon) await supabase.from('abonnements_joint').update(payload).eq('id', editAbon.id)
    else await supabase.from('abonnements_joint').insert(payload)
    setShowAbonForm(false); setEditAbon(null); setAbonForm(EMPTY_ABON); fetchAbonnements()
  }

  const inp = { width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 14, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }
  const card = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16 }
  const totalAbons = abonnements.filter(a => a.actif).reduce((s, a) => s + a.montant, 0)
  const maPartAbons = abonnements.filter(a => a.actif).reduce((s, a) => s + (a.montant * a.part_damien / 100), 0)
  const totalCommunes = depensesCommunes.reduce((s, d) => s + d.montant, 0)

  // Invitation reçue non encore acceptée
  if (invitationRecue && invitationRecue.statut === 'en_attente') {
    return (
      <div style={{ padding: 16, maxWidth: 480, margin: '60px auto', textAlign: 'center' }}>
        <div style={{ ...card, padding: 32 }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>🤝</p>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>Invitation reçue</h2>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 24 }}>Tu as été invité(e) à partager un compte joint.</p>
          <button onClick={async () => { await supabase.from('partages_joint').update({ partner_id: user.id, statut: 'accepte' }).eq('id', invitationRecue.id); setInvitationRecue({ ...invitationRecue, statut: 'accepte' }); setIsPartner(true); setOwnerId(invitationRecue.owner_id) }}
            style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer', color: 'white', fontWeight: 600, background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', fontSize: 15 }}>
            Accepter 🎉
          </button>
        </div>
      </div>
    )
  }

  const PayeurSelect = ({ value, onChange }) => (
    <div>
      <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Qui a payé ?</label>
      <div style={{ display: 'flex', gap: 8 }}>
        {[['moi','👤 Moi','#6366f1'],['partenaire',`👥 ${partnerName}`,'#ec4899']].map(([v,l,c]) => (
          <button key={v} type="button" onClick={() => onChange(v)}
            style={{ flex: 1, padding: '10px', borderRadius: 10, border: value === v ? 'none' : '1px solid var(--color-border)', background: value === v ? c : 'transparent', color: value === v ? 'white' : 'var(--color-text-muted)', cursor: 'pointer', fontWeight: 500, fontSize: 13 }}>
            {l}
          </button>
        ))}
      </div>
    </div>
  )

  const SyncToggle = ({ value, onChange, label }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>Ajouter dans mes dépenses perso</div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{label}</div>
      </div>
      <button type="button" onClick={() => onChange(!value)} style={{ position: 'relative', width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: value ? '#6366f1' : '#475569', flexShrink: 0 }}>
        <span style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.2s', left: value ? 22 : 2 }} />
      </button>
    </div>
  )

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text)' }}>Compte Joint</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>
            {partage?.statut === 'accepte' || isPartner ? `Partagé avec ${partnerName}` : 'Configure le partage →'}
          </p>
        </div>
        {(partage?.statut === 'accepte' || isPartner) && (
          <div style={{ ...card, padding: '10px 16px', textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 2 }}>
              {soldeGlobal >= 0 ? `${partnerName} te doit` : `Tu dois à ${partnerName}`}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: soldeGlobal >= 0 ? '#10b981' : '#ef4444' }}>
              {Math.abs(soldeGlobal).toFixed(2)} €
            </div>
          </div>
        )}
      </div>

      {/* Tabs principaux */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4, padding: 4, borderRadius: 12, background: 'var(--color-surface)', marginBottom: 16 }}>
        {[['commun','💸 Commun'],['projets','📁 Projets'],['partage','🔗 Partage']].map(([t,l]) => (
          <button key={t} onClick={() => { setMainTab(t); setProjetActif(null) }}
            style={{ padding: '9px 4px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, background: mainTab === t ? '#6366f1' : 'transparent', color: mainTab === t ? 'white' : 'var(--color-text-muted)' }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── COMMUN ── */}
      {mainTab === 'commun' && (
        <>
          {/* Sous-tabs */}
          <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 10, background: 'var(--color-bg)', marginBottom: 14, border: '1px solid var(--color-border)' }}>
            {[['depenses','💸 Dépenses communes'],['abonnements','🔄 Abonnements']].map(([t,l]) => (
              <button key={t} onClick={() => setCommunTab(t)}
                style={{ flex: 1, padding: '7px 4px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, background: communTab === t ? 'var(--color-surface)' : 'transparent', color: communTab === t ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                {l}
              </button>
            ))}
          </div>

          {/* DÉPENSES COMMUNES */}
          {communTab === 'depenses' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select value={filterMonth} onChange={e => setFilterMonth(+e.target.value)} style={{ ...inp, width: 'auto' }}>{MOIS_LABELS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}</select>
                  <select value={filterYear} onChange={e => setFilterYear(+e.target.value)} style={{ ...inp, width: 'auto' }}>{[2024,2025,2026,2027].map(y => <option key={y}>{y}</option>)}</select>
                </div>
                <button onClick={() => { setShowDepCommuneForm(true); setEditDepCommune(null); setDepCommuneForm(EMPTY_DEP_COMMUNE) }}
                  style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', fontSize: 13 }}>
                  + Dépense
                </button>
              </div>
              <div style={{ ...card, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{depensesCommunes.length} dépense{depensesCommunes.length > 1 ? 's' : ''}</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#ec4899' }}>— {totalCommunes.toFixed(2)} €</span>
              </div>
              {depensesCommunes.length === 0
                ? <div style={{ ...card, padding: 40, textAlign: 'center' }}><p style={{ fontSize: 36 }}>💸</p><p style={{ color: 'var(--color-text-muted)', marginTop: 8 }}>Aucune dépense commune ce mois</p></div>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {depensesCommunes.map(dep => {
                    const cat = allCatsJoint.find(c => c.id === dep.categorie)
                    const maPart = dep.montant * (dep.part_damien || 50) / 100
                    return (
                      <div key={dep.id} style={{ ...card, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 22 }}>{cat?.icon || '📦'}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dep.libelle}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{new Date(dep.date).toLocaleDateString('fr-FR')} · {cat?.label} · {dep.moyen_paiement}</div>
                          <div style={{ fontSize: 11, marginTop: 2 }}><span style={{ color: '#8b5cf6', fontWeight: 500 }}>Ma part : {maPart.toFixed(2)} €</span></div>
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#ec4899', flexShrink: 0 }}>— {dep.montant.toFixed(2)} €</span>
                        <button onClick={() => { setEditDepCommune(dep); setDepCommuneForm({ libelle: dep.libelle, montant: dep.montant, payeur: dep.payeur || 'moi', moyen_paiement: dep.moyen_paiement, part_moi: dep.part_damien || 50, date: dep.date, categorie: dep.categorie || 'divers', note: dep.note || '', sync_depenses_perso: false }); setShowDepCommuneForm(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✏️</button>
                        <button onClick={async () => { if (!confirm('Supprimer ?')) return; await supabase.from('depenses_joint').delete().eq('id', dep.id); fetchDepensesCommunes() }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>🗑️</button>
                      </div>
                    )
                  })}
                </div>
              }
            </>
          )}

          {/* ABONNEMENTS */}
          {communTab === 'abonnements' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b' }}>— {totalAbons.toFixed(2)} €/mois</span>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}> · ma part : {maPartAbons.toFixed(2)} €</span>
                </div>
                <button onClick={() => { setShowAbonForm(true); setEditAbon(null); setAbonForm(EMPTY_ABON) }}
                  style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg,#f59e0b,#ef4444)', fontSize: 13 }}>
                  + Abonnement
                </button>
              </div>
              {abonnements.length === 0
                ? <div style={{ ...card, padding: 40, textAlign: 'center' }}><p style={{ fontSize: 36 }}>🔄</p><p style={{ color: 'var(--color-text-muted)', marginTop: 8 }}>Aucun abonnement commun</p></div>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {abonnements.map(a => {
                    const jours = joursAvantProchain(a.jour_prelevement)
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
                            <div style={{ fontSize: 11, marginTop: 2 }}><span style={{ color: '#8b5cf6', fontWeight: 500 }}>Ma part : {(a.montant * a.part_damien / 100).toFixed(2)} €</span><span style={{ color: 'var(--color-text-muted)' }}> · dans {jours}j</span></div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: a.actif ? '#f59e0b' : 'var(--color-text-muted)' }}>— {a.montant.toFixed(2)} €</div>
                            <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>/mois</div>
                          </div>
                          <button onClick={async () => { await supabase.from('abonnements_joint').update({ actif: !a.actif }).eq('id', a.id); fetchAbonnements() }} style={{ position: 'relative', width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', background: a.actif ? '#10b981' : '#475569', flexShrink: 0 }}><span style={{ position: 'absolute', top: 2, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.2s', left: a.actif ? 18 : 2 }} /></button>
                          <button onClick={() => { setEditAbon(a); setAbonForm({ nom: a.nom, montant: a.montant, jour_prelevement: a.jour_prelevement, moyen_paiement: a.moyen_paiement, part_damien: a.part_damien, actif: a.actif, note: a.note || '' }); setShowAbonForm(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>✏️</button>
                          <button onClick={async () => { if (!confirm('Supprimer ?')) return; await supabase.from('abonnements_joint').delete().eq('id', a.id); fetchAbonnements() }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>🗑️</button>
                        </div>
                        {a.actif && <div style={{ marginTop: 8, height: 3, borderRadius: 2, background: 'var(--color-border)' }}><div style={{ height: '100%', borderRadius: 2, background: urgent ? '#ef4444' : '#f59e0b', width: `${Math.max(5, 100 - (jours / 31) * 100)}%` }} /></div>}
                      </div>
                    )
                  })}
                </div>
              }
            </>
          )}
        </>
      )}

      {/* ── PROJETS ── */}
      {mainTab === 'projets' && !projetActif && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{projets.length} projet{projets.length > 1 ? 's' : ''} · Solde global : <span style={{ color: soldeGlobal >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>{soldeGlobal >= 0 ? '+' : ''}{soldeGlobal.toFixed(0)} €</span></p>
            <button onClick={() => { setShowProjetForm(true); setEditProjet(null); setProjetForm(EMPTY_PROJET) }}
              style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', fontSize: 13 }}>
              + Projet
            </button>
          </div>
          {projets.length === 0
            ? <div style={{ ...card, padding: 40, textAlign: 'center' }}><p style={{ fontSize: 40, marginBottom: 12 }}>📁</p><p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>Aucun projet</p><p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Crée un projet pour suivre vos dépenses : Appart, Vacances, Sorties...</p></div>
            : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {projets.map(projet => (
                <div key={projet.id} onClick={() => setProjetActif(projet)}
                  style={{ ...card, padding: 16, cursor: 'pointer', borderLeft: `4px solid ${projet.couleur}` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: projet.couleur + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{projet.icone}</div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>{projet.nom}</div>
                        {projet.description && <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{projet.description}</div>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 2 }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setEditProjet(projet); setProjetForm({ nom: projet.nom, icone: projet.icone, couleur: projet.couleur, description: projet.description || '' }); setShowProjetForm(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>✏️</button>
                      <button onClick={async () => { if (!confirm('Supprimer ce projet ?')) return; await supabase.from('projets_joint').delete().eq('id', projet.id); fetchProjets() }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>🗑️</button>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: projet.couleur, fontWeight: 500 }}>Voir les dépenses →</div>
                </div>
              ))}
            </div>
          }
        </div>
      )}

      {/* DÉTAIL PROJET */}
      {mainTab === 'projets' && projetActif && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setProjetActif(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--color-text-muted)', padding: '4px 8px', borderRadius: 8 }}>←</button>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: projetActif.couleur + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{projetActif.icone}</div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>{projetActif.nom}</h2>
              {projetActif.description && <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{projetActif.description}</p>}
            </div>
            <button onClick={() => { setShowDepProjetForm(true); setEditDepProjet(null); setDepProjetForm(EMPTY_DEP_PROJET) }}
              style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: projetActif.couleur, fontSize: 13 }}>
              + Dépense
            </button>
          </div>

          {depensesProjet.length > 0 && (() => {
            const solde = soldeProjet(depensesProjet)
            const totalMoi = depensesProjet.filter(d => d.payeur === 'moi').reduce((s, d) => s + d.montant, 0)
            const totalPart = depensesProjet.filter(d => d.payeur !== 'moi').reduce((s, d) => s + d.montant, 0)
            return (
              <div style={{ ...card, padding: 16, borderLeft: `4px solid ${projetActif.couleur}` }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 10 }}>
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>Tu as payé</div><div style={{ fontSize: 15, fontWeight: 700, color: '#6366f1' }}>{totalMoi.toFixed(0)} €</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>{partnerName} a payé</div><div style={{ fontSize: 15, fontWeight: 700, color: '#ec4899' }}>{totalPart.toFixed(0)} €</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>Solde</div><div style={{ fontSize: 15, fontWeight: 700, color: solde >= 0 ? '#10b981' : '#ef4444' }}>{solde >= 0 ? '+' : ''}{solde.toFixed(0)} €</div></div>
                </div>
                <div style={{ padding: '8px 12px', borderRadius: 10, background: (solde >= 0 ? 'rgba(16,185,129,' : 'rgba(239,68,68,') + '0.1)', textAlign: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: solde >= 0 ? '#10b981' : '#ef4444' }}>
                    {solde > 0 ? `👆 ${partnerName} te doit ${Math.abs(solde).toFixed(2)} €` : solde < 0 ? `👇 Tu dois ${Math.abs(solde).toFixed(2)} € à ${partnerName}` : '✅ Vous êtes quittes'}
                  </span>
                </div>
              </div>
            )
          })()}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select value={filterMonth} onChange={e => setFilterMonth(+e.target.value)} style={{ ...inp, width: 'auto' }}>{MOIS_LABELS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}</select>
            <select value={filterYear} onChange={e => setFilterYear(+e.target.value)} style={{ ...inp, width: 'auto' }}>{[2024,2025,2026,2027].map(y => <option key={y}>{y}</option>)}</select>
          </div>

          {depensesProjet.length === 0
            ? <div style={{ ...card, padding: 40, textAlign: 'center' }}><p style={{ fontSize: 32 }}>💸</p><p style={{ color: 'var(--color-text-muted)', marginTop: 8 }}>Aucune dépense ce mois</p></div>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {depensesProjet.map(dep => {
                const payeurColor = dep.payeur === 'moi' ? '#6366f1' : '#ec4899'
                const maPart = dep.montant * dep.part_moi / 100
                const partPart = dep.montant * (1 - dep.part_moi / 100)
                return (
                  <div key={dep.id} style={{ ...card, padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: payeurColor + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>
                        {dep.payeur === 'moi' ? '👤' : '👥'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dep.libelle}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{new Date(dep.date).toLocaleDateString('fr-FR')} · {dep.moyen_paiement}</div>
                        <div style={{ fontSize: 11, marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 20, background: payeurColor + '15', color: payeurColor, fontWeight: 500 }}>{dep.payeur === 'moi' ? 'Toi' : partnerName} a payé {dep.montant.toFixed(2)} €</span>
                          <span style={{ color: 'var(--color-text-muted)' }}>Ta part : {maPart.toFixed(2)} € · {partnerName} : {partPart.toFixed(2)} €</span>
                        </div>
                        {dep.note && <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4, fontStyle: 'italic' }}>{dep.note}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button onClick={() => { setEditDepProjet(dep); setDepProjetForm({ libelle: dep.libelle, montant: dep.montant, payeur: dep.payeur, moyen_paiement: dep.moyen_paiement, part_moi: dep.part_moi, date: dep.date, note: dep.note || '', sync_depenses_perso: false }); setShowDepProjetForm(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>✏️</button>
                        <button onClick={async () => { if (!confirm('Supprimer ?')) return; await supabase.from('depenses_projet').delete().eq('id', dep.id); fetchDepensesProjet(); fetchSoldeGlobal() }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>🗑️</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          }
        </div>
      )}

      {/* ── PARTAGE ── */}
      {mainTab === 'partage' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {isPartner ? (
            <div style={{ ...card, padding: 20, textAlign: 'center' }}><p style={{ fontSize: 32, marginBottom: 8 }}>✅</p><p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>Compte joint actif</p></div>
          ) : partage ? (
            <>
              <div style={{ ...card, padding: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 12 }}>Partenaire</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 18 }}>{partnerName[0]?.toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    {editPartnerName ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input value={newPartnerName} onChange={e => setNewPartnerName(e.target.value)} placeholder="Prénom d'Aline" style={{ ...inp, flex: 1 }} autoFocus />
                        <button onClick={savePartnerName} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#10b981', color: 'white', fontWeight: 600, fontSize: 13 }}>✓</button>
                        <button onClick={() => setEditPartnerName(false)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--color-border)', cursor: 'pointer', background: 'transparent', color: 'var(--color-text-muted)', fontSize: 13 }}>✕</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>{partnerName}</div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{partage.partner_email}</div>
                        </div>
                        <button onClick={() => { setEditPartnerName(true); setNewPartnerName(partnerName) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>✏️</button>
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 12 }}>{partage.statut === 'accepte' ? <span style={{ color: '#10b981' }}>✅ Actif</span> : <span style={{ color: '#f59e0b' }}>⏳ En attente</span>}</div>
                </div>
                {partage.statut === 'en_attente' && <div style={{ padding: 12, borderRadius: 10, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 13, color: '#f59e0b', marginBottom: 12 }}>{partnerName} doit se connecter sur Optima et ouvrir Compte Joint pour accepter.</div>}
                <button onClick={async () => { if (!confirm('Révoquer ?')) return; await supabase.from('partages_joint').delete().eq('id', partage.id); setPartage(null) }} style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid #ef4444', background: 'transparent', cursor: 'pointer', color: '#ef4444', fontSize: 13, fontWeight: 500 }}>Révoquer l'accès</button>
              </div>
            </>
          ) : (
            <div style={{ ...card, padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>Inviter un partenaire</h3>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>Entre l'email de ton/ta partenaire. Il/elle devra créer un compte sur Optima.</p>
              {inviteMsg && <div style={{ padding: 10, borderRadius: 8, background: inviteMsg.startsWith('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${inviteMsg.startsWith('✅') ? '#10b981' : '#ef4444'}`, color: inviteMsg.startsWith('✅') ? '#10b981' : '#ef4444', fontSize: 13, marginBottom: 12 }}>{inviteMsg}</div>}
              <form onSubmit={async (e) => { e.preventDefault(); const { error } = await supabase.from('partages_joint').insert({ owner_id: user.id, partner_email: inviteEmail, statut: 'en_attente' }); if (error) setInviteMsg('Erreur : ' + error.message); else { setInviteMsg('✅ Invitation créée !'); setInviteEmail(''); fetchPartage() } }} style={{ display: 'flex', gap: 8 }}>
                <input type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="email@partenaire.fr" style={{ ...inp, flex: 1 }} />
                <button type="submit" style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg,#ec4899,#8b5cf6)' }}>Inviter</button>
              </form>
            </div>
          )}
          <div style={{ ...card, padding: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>Comment ça marche ?</h3>
            {[['1️⃣','Invite ton partenaire par email'],['2️⃣','Il/elle crée un compte Optima et accepte'],['3️⃣','Projets, dépenses et abonnements sont partagés'],['4️⃣','Le solde se calcule automatiquement']].map(([n,t]) => (
              <div key={n} style={{ display: 'flex', gap: 10, marginBottom: 8 }}><span style={{ fontSize: 16 }}>{n}</span><span style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>{t}</span></div>
            ))}
          </div>
        </div>
      )}

      {/* Forms */}
      <FormModal show={showProjetForm} onClose={() => { setShowProjetForm(false); setEditProjet(null) }} title={editProjet ? 'Modifier le projet' : 'Nouveau projet'} onSubmit={handleSaveProjet} color="linear-gradient(135deg,#6366f1,#8b5cf6)" submitLabel={editProjet ? 'Modifier' : 'Créer'}>
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Nom</label><input required value={projetForm.nom} onChange={e => setProjetForm(f => ({...f, nom: e.target.value}))} placeholder="Ex: Appart, Vacances..." style={inp} /></div>
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Description</label><input value={projetForm.description} onChange={e => setProjetForm(f => ({...f, description: e.target.value}))} placeholder="Optionnel..." style={inp} /></div>
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Icône</label><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{ICONES_PROJET.map(ic => <button key={ic} type="button" onClick={() => setProjetForm(f => ({...f, icone: ic}))} style={{ width: 38, height: 38, borderRadius: 8, border: projetForm.icone === ic ? '2px solid #6366f1' : '1px solid var(--color-border)', background: projetForm.icone === ic ? '#6366f115' : 'transparent', cursor: 'pointer', fontSize: 20 }}>{ic}</button>)}</div></div>
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Couleur</label><div style={{ display: 'flex', gap: 8 }}>{COULEURS_PROJET.map(c => <button key={c} type="button" onClick={() => setProjetForm(f => ({...f, couleur: c}))} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: c, cursor: 'pointer', outline: projetForm.couleur === c ? `3px solid ${c}` : 'none', outlineOffset: 2 }} />)}</div></div>
      </FormModal>

      <FormModal show={showDepCommuneForm} onClose={() => { setShowDepCommuneForm(false); setEditDepCommune(null) }} title={editDepCommune ? 'Modifier' : 'Dépense commune'} onSubmit={handleSaveDepCommune} color="linear-gradient(135deg,#ec4899,#8b5cf6)" submitLabel={editDepCommune ? 'Modifier' : 'Ajouter'}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Date</label><input type="date" required value={depCommuneForm.date} onChange={e => setDepCommuneForm(f => ({...f, date: e.target.value}))} style={inp} /></div>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Montant (€)</label><input type="number" step="0.01" min="0" required value={depCommuneForm.montant} onChange={e => setDepCommuneForm(f => ({...f, montant: e.target.value}))} placeholder="0.00" style={inp} /></div>
        </div>
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Libellé</label><input required value={depCommuneForm.libelle} onChange={e => setDepCommuneForm(f => ({...f, libelle: e.target.value}))} placeholder="Ex: Courses, Restaurant..." style={inp} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Catégorie</label><select value={depCommuneForm.categorie} onChange={e => setDepCommuneForm(f => ({...f, categorie: e.target.value}))} style={inp}>{allCatsJoint.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}</select></div>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Moyen de paiement</label><select value={depCommuneForm.moyen_paiement} onChange={e => setDepCommuneForm(f => ({...f, moyen_paiement: e.target.value}))} style={inp}>{TOUS_MOYENS.map(m => <option key={m}>{m}</option>)}</select></div>
        </div>
        <PayeurSelect value={depCommuneForm.payeur} onChange={v => setDepCommuneForm(f => ({...f, payeur: v}))} />
        <PartInput value={depCommuneForm.part_moi} onChange={v => setDepCommuneForm(f => ({...f, part_moi: v}))} montant={depCommuneForm.montant} />
        {depCommuneForm.payeur === 'moi' && !editDepCommune && <SyncToggle value={depCommuneForm.sync_depenses_perso} onChange={v => setDepCommuneForm(f => ({...f, sync_depenses_perso: v}))} label="Apparaîtra dans tes dépenses perso" />}
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Note</label><input value={depCommuneForm.note} onChange={e => setDepCommuneForm(f => ({...f, note: e.target.value}))} placeholder="Optionnel..." style={inp} /></div>
      </FormModal>

      <FormModal show={showDepProjetForm} onClose={() => { setShowDepProjetForm(false); setEditDepProjet(null) }} title={editDepProjet ? 'Modifier' : `Dépense — ${projetActif?.nom}`} onSubmit={handleSaveDepProjet} color={projetActif?.couleur || '#6366f1'} submitLabel={editDepProjet ? 'Modifier' : 'Ajouter'}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Date</label><input type="date" required value={depProjetForm.date} onChange={e => setDepProjetForm(f => ({...f, date: e.target.value}))} style={inp} /></div>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Montant (€)</label><input type="number" step="0.01" min="0" required value={depProjetForm.montant} onChange={e => setDepProjetForm(f => ({...f, montant: e.target.value}))} placeholder="0.00" style={inp} /></div>
        </div>
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Libellé</label><input required value={depProjetForm.libelle} onChange={e => setDepProjetForm(f => ({...f, libelle: e.target.value}))} placeholder="Ex: Loyer, Ikea..." style={inp} /></div>
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Moyen de paiement</label><select value={depProjetForm.moyen_paiement} onChange={e => setDepProjetForm(f => ({...f, moyen_paiement: e.target.value}))} style={inp}>{TOUS_MOYENS.map(m => <option key={m}>{m}</option>)}</select></div>
        <PayeurSelect value={depProjetForm.payeur} onChange={v => setDepProjetForm(f => ({...f, payeur: v}))} />
        <PartInput value={depProjetForm.part_moi} onChange={v => setDepProjetForm(f => ({...f, part_moi: v}))} montant={depProjetForm.montant} />
        {depProjetForm.payeur === 'moi' && !editDepProjet && <SyncToggle value={depProjetForm.sync_depenses_perso} onChange={v => setDepProjetForm(f => ({...f, sync_depenses_perso: v}))} label={`Apparaîtra dans tes dépenses · 🤝 ${projetActif?.nom}`} />}
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Note</label><input value={depProjetForm.note} onChange={e => setDepProjetForm(f => ({...f, note: e.target.value}))} placeholder="Optionnel..." style={inp} /></div>
      </FormModal>

      <FormModal show={showAbonForm} onClose={() => { setShowAbonForm(false); setEditAbon(null) }} title={editAbon ? 'Modifier' : 'Nouvel abonnement commun'} onSubmit={handleSaveAbon} color="linear-gradient(135deg,#f59e0b,#ef4444)" submitLabel={editAbon ? 'Modifier' : 'Ajouter'}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Nom</label><input required value={abonForm.nom} onChange={e => setAbonForm(f => ({...f, nom: e.target.value}))} placeholder="Ex: Loyer, Netflix..." style={inp} /></div>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Montant (€)</label><input type="number" step="0.01" min="0" required value={abonForm.montant} onChange={e => setAbonForm(f => ({...f, montant: e.target.value}))} placeholder="0.00" style={inp} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Jour prélèvement</label><input type="number" min="1" max="28" required value={abonForm.jour_prelevement} onChange={e => setAbonForm(f => ({...f, jour_prelevement: parseInt(e.target.value)}))} style={inp} /></div>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Moyen de paiement</label><select value={abonForm.moyen_paiement} onChange={e => setAbonForm(f => ({...f, moyen_paiement: e.target.value}))} style={inp}>{TOUS_MOYENS.map(m => <option key={m}>{m}</option>)}</select></div>
        </div>
        <PartInput value={abonForm.part_damien} onChange={v => setAbonForm(f => ({...f, part_damien: v}))} montant={abonForm.montant} />
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Note</label><input value={abonForm.note} onChange={e => setAbonForm(f => ({...f, note: e.target.value}))} placeholder="Optionnel..." style={inp} /></div>
      </FormModal>
    </div>
  )
}

function SyncToggle({ value, onChange, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>Ajouter dans mes dépenses perso</div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{label}</div>
      </div>
      <button type="button" onClick={() => onChange(!value)} style={{ position: 'relative', width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: value ? '#6366f1' : '#475569', flexShrink: 0 }}>
        <span style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.2s', left: value ? 22 : 2 }} />
      </button>
    </div>
  )
}
