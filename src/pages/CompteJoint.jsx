import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useMoyensPaiement } from '../hooks/useMoyensPaiement'
import FormModal from '../components/FormModal'
import PartInput from '../components/PartInput'

const ICONES_PROJET = ['🏠','✈️','🛒','🍕','🎉','🏋️','🎬','🐶','🚗','💊','🎸','🏖️','🎓','💼','🛋️','🌿']
const COULEURS_PROJET = ['#6366f1','#ec4899','#10b981','#f59e0b','#06b6d4','#8b5cf6','#ef4444','#84cc16']
const MOIS_LABELS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

const EMPTY_PROJET = { nom: '', icone: '🏠', couleur: '#6366f1', description: '' }
const EMPTY_DEP = { libelle: '', montant: '', payeur: 'moi', moyen_paiement: 'Carte SG', part_moi: 50, date: new Date().toISOString().split('T')[0], note: '', sync_depenses_perso: true }
const EMPTY_ABON = { nom: '', montant: '', jour_prelevement: 1, moyen_paiement: 'Carte SG', part_damien: 50, actif: true, note: '' }

function joursAvantProchain(jour) {
  const now = new Date()
  const target = new Date(now.getFullYear(), now.getMonth(), jour)
  if (target <= now) target.setMonth(target.getMonth() + 1)
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24))
}

export default function CompteJoint({ user }) {
  const [tab, setTab] = useState('projets')
  const [projets, setProjets] = useState([])
  const [projetActif, setProjetActif] = useState(null)
  const [depensesProjet, setDepensesProjet] = useState([])
  const [abonnements, setAbonnements] = useState([])
  const [partage, setPartage] = useState(null)
  const [invitationRecue, setInvitationRecue] = useState(null)
  const [ownerId, setOwnerId] = useState(user.id)
  const [partnerName, setPartnerName] = useState('Partenaire')

  const [showProjetForm, setShowProjetForm] = useState(false)
  const [showDepForm, setShowDepForm] = useState(false)
  const [showAbonForm, setShowAbonForm] = useState(false)
  const [editProjet, setEditProjet] = useState(null)
  const [editDep, setEditDep] = useState(null)
  const [editAbon, setEditAbon] = useState(null)

  const [projetForm, setProjetForm] = useState(EMPTY_PROJET)
  const [depForm, setDepForm] = useState(EMPTY_DEP)
  const [abonForm, setAbonForm] = useState(EMPTY_ABON)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteMsg, setInviteMsg] = useState('')
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1)
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())

  const { moyens: moyensDB } = useMoyensPaiement(user.id)
  const MOYENS_DEFAUT = ['Carte SG', 'Carte Trade', 'Espèces', 'Virement']
  const TOUS_MOYENS = [...MOYENS_DEFAUT, ...moyensDB.filter(m => !MOYENS_DEFAUT.includes(m.nom)).map(m => m.nom)]

  useEffect(() => { fetchPartage() }, [])
  useEffect(() => { if (ownerId) { fetchProjets(); fetchAbonnements() } }, [ownerId])
  useEffect(() => { if (projetActif) fetchDepensesProjet() }, [projetActif, filterMonth, filterYear])

  const fetchPartage = async () => {
    const { data: owned } = await supabase.from('partages_joint').select('*').eq('owner_id', user.id).single()
    if (owned) { setPartage(owned); setOwnerId(user.id); if (owned.partner_email) setPartnerName(owned.partner_email.split('@')[0]); return }
    const { data: received } = await supabase.from('partages_joint').select('*').eq('partner_id', user.id).single()
    if (received) { setInvitationRecue(received); if (received.statut === 'accepte') { setOwnerId(received.owner_id) } }
  }

  const fetchProjets = async () => {
    const { data } = await supabase.from('projets_joint').select('*').eq('owner_id', ownerId).order('created_at')
    setProjets(data || [])
  }

  const fetchDepensesProjet = async () => {
    if (!projetActif) return
    const start = `${filterYear}-${String(filterMonth).padStart(2,'0')}-01`
    const end = new Date(filterYear, filterMonth, 0).toISOString().split('T')[0]
    const { data } = await supabase.from('depenses_projet').select('*')
      .eq('projet_id', projetActif.id).gte('date', start).lte('date', end)
      .order('date', { ascending: false })
    setDepensesProjet(data || [])
  }

  const fetchAbonnements = async () => {
    const { data } = await supabase.from('abonnements_joint').select('*').eq('user_id', ownerId).order('jour_prelevement')
    setAbonnements(data || [])
  }

  // Calcul solde global tous projets
  const calculSolde = async () => {
    const { data } = await supabase.from('depenses_projet').select('*').eq('owner_id', ownerId)
    if (!data) return 0
    let solde = 0
    data.forEach(dep => {
      const montant = dep.montant
      const partMoi = dep.part_moi / 100
      if (dep.payeur === 'moi') {
        // J'ai payé → partenaire me doit sa part
        solde += montant * (1 - partMoi)
      } else {
        // Partenaire a payé → je dois ma part
        solde -= montant * partMoi
      }
    })
    return solde
  }

  const [soldeGlobal, setSoldeGlobal] = useState(0)
  useEffect(() => { if (ownerId) calculSolde().then(setSoldeGlobal) }, [depensesProjet, ownerId])

  // Solde par projet
  const soldeProjet = (depenses) => {
    let solde = 0
    depenses.forEach(dep => {
      const partMoi = dep.part_moi / 100
      if (dep.payeur === 'moi') solde += dep.montant * (1 - partMoi)
      else solde -= dep.montant * partMoi
    })
    return solde
  }

  const handleSaveProjet = async (e) => {
    e.preventDefault()
    const payload = { ...projetForm, owner_id: ownerId }
    if (editProjet) await supabase.from('projets_joint').update(payload).eq('id', editProjet.id)
    else await supabase.from('projets_joint').insert(payload)
    setShowProjetForm(false); setEditProjet(null); setProjetForm(EMPTY_PROJET); fetchProjets()
  }

  const handleDeleteProjet = async (id) => {
    if (!confirm('Supprimer ce projet et toutes ses dépenses ?')) return
    await supabase.from('projets_joint').delete().eq('id', id)
    setProjetActif(null); fetchProjets()
  }

  const handleSaveDep = async (e) => {
    e.preventDefault()
    const payload = {
      ...depForm, montant: parseFloat(depForm.montant),
      part_moi: parseFloat(depForm.part_moi),
      projet_id: projetActif.id, owner_id: ownerId
    }
    if (editDep) {
      await supabase.from('depenses_projet').update(payload).eq('id', editDep.id)
    } else {
      const { data: newDep } = await supabase.from('depenses_projet').insert(payload).select().single()
      // Sync dépenses perso si c'est moi qui paie
      if (depForm.payeur === 'moi' && depForm.sync_depenses_perso && newDep) {
        await supabase.from('depenses').insert({
          user_id: user.id,
          date: depForm.date,
          montant: parseFloat(depForm.montant),
          libelle: `🤝 ${projetActif.nom} — ${depForm.libelle}`,
          categorie: 'joint',
          moyen_paiement: depForm.moyen_paiement,
          note: `Dépense commune projet "${projetActif.nom}"`,
          is_joint: true,
          projet_joint_id: projetActif.id,
        })
      }
    }
    setShowDepForm(false); setEditDep(null); setDepForm(EMPTY_DEP); fetchDepensesProjet()
  }

  const handleDeleteDep = async (dep) => {
    if (!confirm('Supprimer cette dépense ?')) return
    await supabase.from('depenses_projet').delete().eq('id', dep.id)
    // Supprimer aussi la sync perso si elle existe
    if (dep.sync_depenses_perso && dep.payeur === 'moi') {
      await supabase.from('depenses').delete().eq('user_id', user.id)
        .eq('libelle', `🤝 ${projetActif.nom} — ${dep.libelle}`).eq('date', dep.date)
    }
    fetchDepensesProjet()
  }

  const handleSaveAbon = async (e) => {
    e.preventDefault()
    const payload = { ...abonForm, montant: parseFloat(abonForm.montant), part_damien: parseFloat(abonForm.part_damien), user_id: ownerId }
    if (editAbon) await supabase.from('abonnements_joint').update(payload).eq('id', editAbon.id)
    else await supabase.from('abonnements_joint').insert(payload)
    setShowAbonForm(false); setEditAbon(null); setAbonForm(EMPTY_ABON); fetchAbonnements()
  }

  const handleDeleteAbon = async (id) => { if (!confirm('Supprimer ?')) return; await supabase.from('abonnements_joint').delete().eq('id', id); fetchAbonnements() }
  const handleToggleAbon = async (a) => { await supabase.from('abonnements_joint').update({ actif: !a.actif }).eq('id', a.id); fetchAbonnements() }

  const handleInvite = async (e) => {
    e.preventDefault(); setInviteLoading(true); setInviteMsg('')
    const { error } = await supabase.from('partages_joint').insert({ owner_id: user.id, partner_email: inviteEmail, statut: 'en_attente' })
    if (error) setInviteMsg('Erreur : ' + (error.message.includes('unique') ? 'Invitation déjà envoyée.' : error.message))
    else { setInviteMsg('✅ Invitation créée ! Aline doit se connecter et ouvrir Compte Joint.'); setInviteEmail(''); fetchPartage() }
    setInviteLoading(false)
  }

  const handleAccept = async () => {
    await supabase.from('partages_joint').update({ partner_id: user.id, statut: 'accepte' }).eq('id', invitationRecue.id)
    setInvitationRecue({ ...invitationRecue, statut: 'accepte' }); setOwnerId(invitationRecue.owner_id)
  }

  const inp = { width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 14, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }
  const card = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16 }

  const totalAbons = abonnements.filter(a => a.actif).reduce((s, a) => s + a.montant, 0)
  const maPartAbons = abonnements.filter(a => a.actif).reduce((s, a) => s + (a.montant * a.part_damien / 100), 0)
  const isPartner = invitationRecue?.statut === 'accepte'
  const hasAccess = partage?.statut === 'accepte' || isPartner

  // Invitation en attente
  if (invitationRecue && invitationRecue.statut === 'en_attente') {
    return (
      <div style={{ padding: 16, maxWidth: 480, margin: '60px auto', textAlign: 'center' }}>
        <div style={{ ...card, padding: 32 }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>🤝</p>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>Invitation reçue</h2>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 24 }}>Tu as été invité(e) à partager un compte joint. En acceptant, tu pourras gérer les dépenses communes.</p>
          <button onClick={handleAccept} style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer', color: 'white', fontWeight: 600, background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', fontSize: 15 }}>Accepter l'invitation 🎉</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: '0 auto' }}>
      {/* Header avec solde */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text)' }}>Compte Joint</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>
            {hasAccess ? `Partagé avec ${partnerName}` : 'Configure le partage →'}
          </p>
        </div>
        {hasAccess && (
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

      {/* Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4, padding: 4, borderRadius: 12, background: 'var(--color-surface)', marginBottom: 16 }}>
        {[['projets','📁 Projets'],['abonnements','🔄 Abonnements'],['partage','🔗 Partage']].map(([t,l]) => (
          <button key={t} onClick={() => { setTab(t); if (t !== 'projets') setProjetActif(null) }}
            style={{ padding: '9px 4px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, background: tab === t ? '#6366f1' : 'transparent', color: tab === t ? 'white' : 'var(--color-text-muted)' }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── PROJETS ── */}
      {tab === 'projets' && !projetActif && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{projets.length} projet{projets.length > 1 ? 's' : ''}</p>
            <button onClick={() => { setShowProjetForm(true); setEditProjet(null); setProjetForm(EMPTY_PROJET) }}
              style={{ padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', fontSize: 13 }}>
              + Nouveau projet
            </button>
          </div>

          {projets.length === 0 ? (
            <div style={{ ...card, padding: 40, textAlign: 'center' }}>
              <p style={{ fontSize: 40, marginBottom: 12 }}>📁</p>
              <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>Aucun projet</p>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Crée un projet pour commencer à suivre vos dépenses communes — Appart, Vacances, Sorties...</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {projets.map(projet => {
                // Calcul solde du projet (on utilisera les données qu'on a)
                return (
                  <div key={projet.id} onClick={() => setProjetActif(projet)}
                    style={{ ...card, padding: 16, cursor: 'pointer', borderLeft: `4px solid ${projet.couleur}`, transition: 'transform 0.15s', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: projet.couleur + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{projet.icone}</div>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>{projet.nom}</div>
                          {projet.description && <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{projet.description}</div>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => { setEditProjet(projet); setProjetForm({ nom: projet.nom, icone: projet.icone, couleur: projet.couleur, description: projet.description || '' }); setShowProjetForm(true) }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: 4 }}>✏️</button>
                        <button onClick={() => handleDeleteProjet(projet.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: 4 }}>🗑️</button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Créé le {new Date(projet.created_at).toLocaleDateString('fr-FR')}</span>
                      <span style={{ fontSize: 12, fontWeight: 500, color: projet.couleur }}>Voir →</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── DÉTAIL PROJET ── */}
      {tab === 'projets' && projetActif && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Header projet */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <button onClick={() => setProjetActif(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--color-text-muted)', padding: '4px 8px', borderRadius: 8 }}>
              ←
            </button>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: projetActif.couleur + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{projetActif.icone}</div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>{projetActif.nom}</h2>
              {projetActif.description && <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{projetActif.description}</p>}
            </div>
            <button onClick={() => { setShowDepForm(true); setEditDep(null); setDepForm(EMPTY_DEP) }}
              style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: projetActif.couleur, fontSize: 13 }}>
              + Dépense
            </button>
          </div>

          {/* Solde du projet */}
          {depensesProjet.length > 0 && (() => {
            const solde = soldeProjet(depensesProjet)
            const totalMoi = depensesProjet.filter(d => d.payeur === 'moi').reduce((s, d) => s + d.montant, 0)
            const totalPartner = depensesProjet.filter(d => d.payeur === 'partenaire').reduce((s, d) => s + d.montant, 0)
            return (
              <div style={{ ...card, padding: 16, borderLeft: `4px solid ${projetActif.couleur}` }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 12 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>Tu as payé</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#6366f1' }}>{totalMoi.toFixed(0)} €</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>{partnerName} a payé</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#ec4899' }}>{totalPartner.toFixed(0)} €</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>Solde</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: solde >= 0 ? '#10b981' : '#ef4444' }}>
                      {solde >= 0 ? `+${solde.toFixed(0)}` : solde.toFixed(0)} €
                    </div>
                  </div>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: 10, background: (solde >= 0 ? 'rgba(16,185,129,' : 'rgba(239,68,68,') + '0.1)', border: `1px solid ${solde >= 0 ? '#10b981' : '#ef4444'}30`, textAlign: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: solde >= 0 ? '#10b981' : '#ef4444' }}>
                    {solde >= 0 ? `👆 ${partnerName} te doit ${Math.abs(solde).toFixed(2)} €` : `👇 Tu dois ${Math.abs(solde).toFixed(2)} € à ${partnerName}`}
                  </span>
                </div>
              </div>
            )
          })()}

          {/* Filtres */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select value={filterMonth} onChange={e => setFilterMonth(+e.target.value)} style={{ ...inp, width: 'auto' }}>
              {MOIS_LABELS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
            <select value={filterYear} onChange={e => setFilterYear(+e.target.value)} style={{ ...inp, width: 'auto' }}>
              {[2024,2025,2026,2027].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>

          {/* Liste dépenses */}
          {depensesProjet.length === 0 ? (
            <div style={{ ...card, padding: 40, textAlign: 'center' }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>💸</p>
              <p style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>Aucune dépense ce mois</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {depensesProjet.map(dep => {
                const payeurLabel = dep.payeur === 'moi' ? 'Toi' : partnerName
                const payeurColor = dep.payeur === 'moi' ? '#6366f1' : '#ec4899'
                const maPart = dep.montant * dep.part_moi / 100
                const partPartner = dep.montant * (1 - dep.part_moi / 100)
                return (
                  <div key={dep.id} style={{ ...card, padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: payeurColor + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 16 }}>{dep.payeur === 'moi' ? '👤' : '👥'}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{dep.libelle}</span>
                          {dep.sync_depenses_perso && dep.payeur === 'moi' && (
                            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: 'rgba(99,102,241,0.15)', color: '#6366f1' }}>→ perso</span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 3 }}>
                          {new Date(dep.date).toLocaleDateString('fr-FR')} · {dep.moyen_paiement}
                        </div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: payeurColor + '15', color: payeurColor, fontWeight: 500 }}>
                            {payeurLabel} a payé {dep.montant.toFixed(2)} €
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                            Ta part : {maPart.toFixed(2)} € · {partnerName} : {partPartner.toFixed(2)} €
                          </span>
                        </div>
                        {dep.note && <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4, fontStyle: 'italic' }}>{dep.note}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button onClick={() => { setEditDep(dep); setDepForm({ libelle: dep.libelle, montant: dep.montant, payeur: dep.payeur, moyen_paiement: dep.moyen_paiement, part_moi: dep.part_moi, date: dep.date, note: dep.note || '', sync_depenses_perso: dep.sync_depenses_perso }); setShowDepForm(true) }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>✏️</button>
                        <button onClick={() => handleDeleteDep(dep)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>🗑️</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ABONNEMENTS ── */}
      {tab === 'abonnements' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b' }}>— {totalAbons.toFixed(2)} €/mois</span>
              <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}> · ma part : {maPartAbons.toFixed(2)} €</span>
            </div>
            <button onClick={() => { setShowAbonForm(true); setEditAbon(null); setAbonForm(EMPTY_ABON) }}
              style={{ padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg,#f59e0b,#ef4444)', fontSize: 13 }}>
              + Abonnement
            </button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', padding: '8px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
            💡 Les abonnements sont automatiquement ajoutés dans les dépenses communes à leur date de prélèvement.
          </div>
          {abonnements.length === 0
            ? <div style={{ ...card, padding: 40, textAlign: 'center' }}><p style={{ fontSize: 36 }}>🔄</p><p style={{ color: 'var(--color-text-muted)' }}>Aucun abonnement commun</p></div>
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
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                          Le {a.jour_prelevement} du mois · {a.moyen_paiement}{a.note ? ` · ${a.note}` : ''}
                        </div>
                        <div style={{ fontSize: 11, marginTop: 2 }}>
                          <span style={{ color: '#8b5cf6', fontWeight: 500 }}>Ma part : {(a.montant * a.part_damien / 100).toFixed(2)} €</span>
                          <span style={{ color: 'var(--color-text-muted)' }}> · dans {jours}j</span>
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
            </div>
          }
        </div>
      )}

      {/* ── PARTAGE ── */}
      {tab === 'partage' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {isPartner ? (
            <div style={{ ...card, padding: 20, textAlign: 'center' }}><p style={{ fontSize: 32, marginBottom: 8 }}>✅</p><p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>Compte joint actif</p><p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>Tu gères les dépenses partagées.</p></div>
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
              {partage.statut === 'en_attente' && (
                <div style={{ padding: 12, borderRadius: 10, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 13, color: '#f59e0b', marginBottom: 12 }}>
                  {partnerName} doit se connecter sur Optima et ouvrir Compte Joint pour accepter.
                </div>
              )}
              <button onClick={async () => { if (!confirm('Révoquer l\'accès ?')) return; await supabase.from('partages_joint').delete().eq('id', partage.id); setPartage(null) }}
                style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid #ef4444', background: 'transparent', cursor: 'pointer', color: '#ef4444', fontSize: 13, fontWeight: 500 }}>
                Révoquer l'accès
              </button>
            </div>
          ) : (
            <div style={{ ...card, padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>Inviter un partenaire</h3>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>Entre l'email de ton/ta partenaire. Il/elle devra créer un compte sur Optima puis accepter l'invitation ici.</p>
              {inviteMsg && <div style={{ padding: 10, borderRadius: 8, background: inviteMsg.startsWith('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${inviteMsg.startsWith('✅') ? '#10b981' : '#ef4444'}`, color: inviteMsg.startsWith('✅') ? '#10b981' : '#ef4444', fontSize: 13, marginBottom: 12 }}>{inviteMsg}</div>}
              <form onSubmit={handleInvite} style={{ display: 'flex', gap: 8 }}>
                <input type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="email@partenaire.fr" style={{ ...inp, flex: 1 }} />
                <button type="submit" disabled={inviteLoading} style={{ padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', opacity: inviteLoading ? 0.7 : 1 }}>{inviteLoading ? '...' : 'Inviter'}</button>
              </form>
            </div>
          )}
          <div style={{ ...card, padding: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>Comment ça marche ?</h3>
            {[['1️⃣','Tu crées des projets (Appart, Vacances...) dans l\'onglet Projets'],['2️⃣','Pour chaque dépense, tu indiques qui a payé et la répartition'],['3️⃣','Le solde se calcule automatiquement — qui doit quoi à qui'],['4️⃣','Si tu paies, la dépense s\'ajoute aussi dans tes dépenses perso']].map(([n,t]) => (
              <div key={n} style={{ display: 'flex', gap: 10, marginBottom: 8 }}><span style={{ fontSize: 16 }}>{n}</span><span style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>{t}</span></div>
            ))}
          </div>
        </div>
      )}

      {/* Form projet */}
      <FormModal show={showProjetForm} onClose={() => { setShowProjetForm(false); setEditProjet(null) }} title={editProjet ? 'Modifier le projet' : 'Nouveau projet'} onSubmit={handleSaveProjet} color="linear-gradient(135deg,#6366f1,#8b5cf6)" submitLabel={editProjet ? 'Modifier' : 'Créer'}>
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Nom du projet</label><input required value={projetForm.nom} onChange={e => setProjetForm(f => ({...f, nom: e.target.value}))} placeholder="Ex: Appart, Vacances Barcelone..." style={inp} /></div>
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Description (optionnel)</label><input value={projetForm.description} onChange={e => setProjetForm(f => ({...f, description: e.target.value}))} placeholder="Ex: Dépenses liées à l'appartement" style={inp} /></div>
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Icône</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ICONES_PROJET.map(ic => <button key={ic} type="button" onClick={() => setProjetForm(f => ({...f, icone: ic}))} style={{ width: 38, height: 38, borderRadius: 8, border: projetForm.icone === ic ? '2px solid #6366f1' : '1px solid var(--color-border)', background: projetForm.icone === ic ? '#6366f115' : 'transparent', cursor: 'pointer', fontSize: 20 }}>{ic}</button>)}
          </div>
        </div>
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Couleur</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {COULEURS_PROJET.map(c => <button key={c} type="button" onClick={() => setProjetForm(f => ({...f, couleur: c}))} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: c, cursor: 'pointer', outline: projetForm.couleur === c ? `3px solid ${c}` : 'none', outlineOffset: 2 }} />)}
          </div>
        </div>
      </FormModal>

      {/* Form dépense projet */}
      <FormModal show={showDepForm} onClose={() => { setShowDepForm(false); setEditDep(null) }} title={editDep ? 'Modifier la dépense' : 'Nouvelle dépense'} onSubmit={handleSaveDep} color={projetActif?.couleur || '#6366f1'} submitLabel={editDep ? 'Modifier' : 'Ajouter'}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Date</label><input type="date" required value={depForm.date} onChange={e => setDepForm(f => ({...f, date: e.target.value}))} style={inp} /></div>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Montant (€)</label><input type="number" step="0.01" min="0" required value={depForm.montant} onChange={e => setDepForm(f => ({...f, montant: e.target.value}))} placeholder="0.00" style={inp} /></div>
        </div>
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Libellé</label><input required value={depForm.libelle} onChange={e => setDepForm(f => ({...f, libelle: e.target.value}))} placeholder="Ex: Loyer, Ikea, Restaurant..." style={inp} /></div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Qui a payé ?</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['moi', '👤 Moi', '#6366f1'], ['partenaire', `👥 ${partnerName}`, '#ec4899']].map(([v, l, c]) => (
              <button key={v} type="button" onClick={() => setDepForm(f => ({...f, payeur: v}))}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: depForm.payeur === v ? 'none' : '1px solid var(--color-border)', background: depForm.payeur === v ? c : 'transparent', color: depForm.payeur === v ? 'white' : 'var(--color-text-muted)', cursor: 'pointer', fontWeight: 500, fontSize: 13 }}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Moyen de paiement</label>
          <select value={depForm.moyen_paiement} onChange={e => setDepForm(f => ({...f, moyen_paiement: e.target.value}))} style={inp}>
            {TOUS_MOYENS.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <PartInput value={depForm.part_moi} onChange={v => setDepForm(f => ({...f, part_moi: v}))} montant={depForm.montant} />
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Note</label><input value={depForm.note} onChange={e => setDepForm(f => ({...f, note: e.target.value}))} placeholder="Optionnel..." style={inp} /></div>
        {depForm.payeur === 'moi' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>Ajouter dans mes dépenses perso</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>Apparaîtra dans "🤝 {projetActif?.nom}"</div>
            </div>
            <button type="button" onClick={() => setDepForm(f => ({...f, sync_depenses_perso: !f.sync_depenses_perso}))}
              style={{ position: 'relative', width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: depForm.sync_depenses_perso ? '#6366f1' : '#475569', flexShrink: 0 }}>
              <span style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.2s', left: depForm.sync_depenses_perso ? 22 : 2 }} />
            </button>
          </div>
        )}
      </FormModal>

      {/* Form abonnement */}
      <FormModal show={showAbonForm} onClose={() => { setShowAbonForm(false); setEditAbon(null) }} title={editAbon ? 'Modifier l\'abonnement' : 'Nouvel abonnement commun'} onSubmit={handleSaveAbon} color="linear-gradient(135deg,#f59e0b,#ef4444)" submitLabel={editAbon ? 'Modifier' : 'Ajouter'}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Nom</label><input required value={abonForm.nom} onChange={e => setAbonForm(f => ({...f, nom: e.target.value}))} placeholder="Ex: Loyer, Netflix..." style={inp} /></div>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Montant (€)</label><input type="number" step="0.01" min="0" required value={abonForm.montant} onChange={e => setAbonForm(f => ({...f, montant: e.target.value}))} placeholder="0.00" style={inp} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Jour prélèvement</label><input type="number" min="1" max="28" required value={abonForm.jour_prelevement} onChange={e => setAbonForm(f => ({...f, jour_prelevement: parseInt(e.target.value)}))} style={inp} /></div>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Moyen de paiement</label>
            <select value={abonForm.moyen_paiement} onChange={e => setAbonForm(f => ({...f, moyen_paiement: e.target.value}))} style={inp}>
              {TOUS_MOYENS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <PartInput value={abonForm.part_damien} onChange={v => setAbonForm(f => ({...f, part_damien: v}))} montant={abonForm.montant} />
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Note</label><input value={abonForm.note} onChange={e => setAbonForm(f => ({...f, note: e.target.value}))} placeholder="Optionnel..." style={inp} /></div>
      </FormModal>
    </div>
  )
}
