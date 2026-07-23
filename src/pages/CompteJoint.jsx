import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import FormModal from '../components/FormModal'
import PartInput from '../components/PartInput'

const CATS_JOINT = [
  { id: 'loyer', label: 'Loyer / Charges', icon: '🏠' },
  { id: 'courses', label: 'Courses', icon: '🛒' },
  { id: 'restaurant', label: 'Restaurant', icon: '🍕' },
  { id: 'vacances', label: 'Vacances', icon: '✈️' },
  { id: 'maison', label: 'Maison / Déco', icon: '🛋️' },
  { id: 'sante', label: 'Santé', icon: '🏥' },
  { id: 'divers', label: 'Divers', icon: '📦' },
]

const ICONES_PROJET = ['🏠','✈️','🛒','🍕','🎉','🏋️','🎬','🐶','🚗','💊','🎸','🏖️','🎓','💼','🛋️','🌿']
const COULEURS_PROJET = ['#6366f1','#ec4899','#10b981','#f59e0b','#06b6d4','#8b5cf6','#ef4444','#84cc16']
const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

function joursAvant(jour) {
  const now = new Date()
  const t = new Date(now.getFullYear(), now.getMonth(), jour)
  if (t <= now) t.setMonth(t.getMonth() + 1)
  return Math.ceil((t - now) / 86400000)
}

// Config par défaut si rien n'est configuré
const CONFIG_DEFAUT = {
  nom_owner: 'Damien',
  nom_partner: 'Aline',
  email_owner: '',
  email_partner: '',
  cartes_owner: ['Carte SG', 'Carte Trade'],
  cartes_partner: ['Carte Aline'],
  cartes_communes: ['Carte Revolut Joint'],
}

export default function CompteJoint({ user }) {
  const [mainTab, setMainTab] = useState('commun')
  const [communTab, setCommunTab] = useState('depenses')
  const [projetActif, setProjetActif] = useState(null)

  // Identité et partage
  const [config, setConfig] = useState(null)
  const [ownerId, setOwnerId] = useState(null)
  const [isPartner, setIsPartner] = useState(false)
  const [partage, setPartage] = useState(null)
  const [invitationRecue, setInvitationRecue] = useState(null)
  const [ready, setReady] = useState(false)

  // Dériver les infos depuis config + email
  const nomOwner = config?.nom_owner || 'Damien'
  const nomPartner = config?.nom_partner || 'Aline'
  const cartesOwner = config?.cartes_owner || []
  const cartesPartner = config?.cartes_partner || []
  const cartesCommunes = config?.cartes_communes || []

  // Qui suis-je ?
  const monNom = isPartner ? nomPartner : nomOwner
  const nomAutre = isPartner ? nomOwner : nomPartner
  const mesCartes = isPartner ? cartesPartner : cartesOwner
  const cartesAutre = isPartner ? cartesOwner : cartesPartner

  // Toutes les cartes disponibles dans le formulaire
  const toutesLesCartes = [
    ...cartesOwner.map(c => ({ nom: c, proprio: nomOwner })),
    ...cartesPartner.map(c => ({ nom: c, proprio: nomPartner })),
    ...cartesCommunes.map(c => ({ nom: c, proprio: 'commun' })),
  ]

  // Qui a payé selon la carte ?
  const getPayeurFromCarte = (nomCarte) => {
    if (cartesCommunes.includes(nomCarte)) return 'commun'
    if (cartesOwner.includes(nomCarte)) return nomOwner
    if (cartesPartner.includes(nomCarte)) return nomPartner
    return monNom // fallback
  }

  // Données
  const [depenses, setDepenses] = useState([])
  const [abonnements, setAbonnements] = useState([])
  const [projets, setProjets] = useState([])
  const [depensesProjet, setDepensesProjet] = useState([])
  const [contributions, setContributions] = useState([])
  const [soldeGlobal, setSoldeGlobal] = useState(0)
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())

  // Forms show/edit
  const [showDep, setShowDep] = useState(false)
  const [showAbon, setShowAbon] = useState(false)
  const [showProjet, setShowProjet] = useState(false)
  const [showDepProjet, setShowDepProjet] = useState(false)
  const [showContrib, setShowContrib] = useState(false)
  const [editDep, setEditDep] = useState(null)
  const [editAbon, setEditAbon] = useState(null)
  const [editProjet, setEditProjet] = useState(null)
  const [editDepProjet, setEditDepProjet] = useState(null)
  const [editContrib, setEditContrib] = useState(null)

  // Form data
  const mkDep = () => ({ libelle: '', montant: '', carte: mesCartes[0] || cartesOwner[0] || '', part_moi: 50, date: new Date().toISOString().split('T')[0], categorie: 'divers', note: '', sync_perso: false })
  const mkAbon = () => ({ nom: '', montant: '', jour: 1, carte: mesCartes[0] || cartesOwner[0] || '', part_moi: 50, actif: true, note: '' })
  const mkDepProjet = () => ({ libelle: '', montant: '', carte: mesCartes[0] || cartesOwner[0] || '', part_moi: 50, date: new Date().toISOString().split('T')[0], note: '', sync_perso: false })
  const mkContrib = () => ({ contributeur: monNom, montant: '', date: new Date().toISOString().split('T')[0], note: '' })

  const [dep, setDep] = useState(mkDep())
  const [abon, setAbon] = useState(mkAbon())
  const [proj, setProj] = useState({ nom: '', icone: '🏠', couleur: '#6366f1', description: '' })
  const [depProj, setDepProj] = useState(mkDepProjet())
  const [contrib, setContrib] = useState(mkContrib())

  // Config form
  const [cfgForm, setCfgForm] = useState({
    nom_owner: '', nom_partner: '',
    email_owner: '', email_partner: '',
    cartes_owner: [], cartes_partner: [], cartes_communes: [],
  })
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteMsg, setInviteMsg] = useState('')

  useEffect(() => { init() }, [])
  useEffect(() => { if (ready && ownerId) { fetchDep(); fetchContrib(); fetchSolde() } }, [month, year, ready, ownerId])
  useEffect(() => { if (ready && ownerId) { fetchProjets(); fetchAbon() } }, [ready, ownerId])
  useEffect(() => { if (projetActif) fetchDepProjet() }, [projetActif, month, year])

  const init = async () => {
    const { data: owned } = await supabase.from('partages_joint').select('*').eq('owner_id', user.id).maybeSingle()
    if (owned) { setPartage(owned); setOwnerId(user.id); setIsPartner(false); await loadConfig(user.id); return }
    const { data: recv } = await supabase.from('partages_joint').select('*').eq('partner_id', user.id).maybeSingle()
    if (recv) {
      setInvitationRecue(recv)
      if (recv.statut === 'accepte') { setIsPartner(true); setOwnerId(recv.owner_id); await loadConfig(recv.owner_id); return }
    }
    await loadConfig(user.id)
  }

  const loadConfig = async (uid) => {
    const { data } = await supabase.from('config_joint').select('*').eq('owner_id', uid).maybeSingle()
    const cfg = data || { ...CONFIG_DEFAUT, owner_id: uid, email_owner: user.email }
    if (!data) await supabase.from('config_joint').insert(cfg)
    setConfig(cfg)
    setCfgForm({
      nom_owner: cfg.nom_owner || 'Damien',
      nom_partner: cfg.nom_partner || 'Aline',
      email_owner: cfg.email_owner || '',
      email_partner: cfg.email_partner || '',
      cartes_owner: cfg.cartes_owner || ['Carte SG', 'Carte Trade'],
      cartes_partner: cfg.cartes_partner || ['Carte Aline'],
      cartes_communes: cfg.cartes_communes || ['Carte Revolut Joint'],
    })
    setReady(true)
  }

  const saveConfig = async (e) => {
    e.preventDefault()
    await supabase.from('config_joint').update(cfgForm).eq('owner_id', ownerId)
    await loadConfig(ownerId)
    alert('✅ Configuration sauvegardée !')
  }

  // Fetch
  const fetchDep = async () => {
    const start = `${year}-${String(month).padStart(2,'0')}-01`
    const end = new Date(year, month, 0).toISOString().split('T')[0]
    const { data } = await supabase.from('depenses_joint').select('*').eq('user_id', ownerId).gte('date', start).lte('date', end).order('date', { ascending: false })
    setDepenses(data || [])
  }
  const fetchAbon = async () => { const { data } = await supabase.from('abonnements_joint').select('*').eq('user_id', ownerId).order('jour_prelevement'); setAbonnements(data || []) }
  const fetchProjets = async () => { const { data } = await supabase.from('projets_joint').select('*').eq('owner_id', ownerId).order('created_at'); setProjets(data || []) }
  const fetchDepProjet = async () => {
    if (!projetActif) return
    const start = `${year}-${String(month).padStart(2,'0')}-01`
    const end = new Date(year, month, 0).toISOString().split('T')[0]
    const { data } = await supabase.from('depenses_projet').select('*').eq('projet_id', projetActif.id).gte('date', start).lte('date', end).order('date', { ascending: false })
    setDepensesProjet(data || [])
  }
  const fetchContrib = async () => { const { data } = await supabase.from('contributions_joint').select('*').eq('user_id', ownerId).order('date', { ascending: false }); setContributions(data || []) }

  // Calcul solde — toujours du point de vue du owner, inversé pour le partner
  const calcSolde = (deps, depProj, contribs) => {
    let s = 0
    // Dépenses : si owner a payé (carte owner) → partner lui doit sa part
    //            si partner a payé (carte partner) → owner lui doit sa part
    //            si carte commune → pas de dette
    const traiter = (liste) => {
      ;(liste || []).forEach(d => {
        const payeur = d.payeur || getPayeurFromCarte(d.carte || d.moyen_paiement || '')
        if (payeur === 'commun') return
        const p = (d.part_moi || 50) / 100
        const ownerAPaye = payeur === nomOwner
        s += ownerAPaye ? d.montant * (1 - p) : -d.montant * p
      })
    }
    traiter(deps)
    traiter(depProj)
    // Contributions : owner verse → partner lui doit (+) ; partner verse → owner lui doit (-)
    ;(contribs || []).forEach(c => { s += c.contributeur === nomOwner ? c.montant : -c.montant })
    return isPartner ? -s : s
  }

  const fetchSolde = async () => {
    const [{ data: d1 }, { data: d2 }, { data: d3 }] = await Promise.all([
      supabase.from('depenses_joint').select('montant,payeur,carte,moyen_paiement,part_moi').eq('user_id', ownerId),
      supabase.from('depenses_projet').select('montant,payeur,carte,moyen_paiement,part_moi').eq('owner_id', ownerId),
      supabase.from('contributions_joint').select('montant,contributeur').eq('user_id', ownerId),
    ])
    setSoldeGlobal(calcSolde(d1, d2, d3))
  }

  // Handlers save
  const saveDep = async (e) => {
    e.preventDefault()
    const payeur = getPayeurFromCarte(dep.carte)
    const payload = { libelle: dep.libelle, montant: parseFloat(dep.montant), carte: dep.carte, moyen_paiement: dep.carte, payeur, part_moi: parseFloat(dep.part_moi), date: dep.date, categorie: dep.categorie, note: dep.note, user_id: ownerId }
    if (editDep) { await supabase.from('depenses_joint').update(payload).eq('id', editDep.id) }
    else {
      const { error } = await supabase.from('depenses_joint').insert(payload)
      if (error) { alert('Erreur SQL : ' + error.message); return }
      if (dep.sync_perso && payeur === monNom && payeur !== 'commun') {
        await supabase.from('depenses').insert({ user_id: user.id, date: dep.date, montant: parseFloat(dep.montant), libelle: `🤝 ${dep.libelle}`, categorie: 'joint', moyen_paiement: dep.carte, is_joint: true })
      }
    }
    setShowDep(false); setEditDep(null); fetchDep(); fetchSolde()
  }

  const saveAbon = async (e) => {
    e.preventDefault()
    const payeur = getPayeurFromCarte(abon.carte)
    const payload = { nom: abon.nom, montant: parseFloat(abon.montant), jour_prelevement: parseInt(abon.jour), moyen_paiement: abon.carte, part_damien: parseFloat(abon.part_moi), actif: abon.actif, note: abon.note, user_id: ownerId }
    if (editAbon) await supabase.from('abonnements_joint').update(payload).eq('id', editAbon.id)
    else await supabase.from('abonnements_joint').insert(payload)
    setShowAbon(false); setEditAbon(null); fetchAbon()
  }

  const saveProjet = async (e) => {
    e.preventDefault()
    if (editProjet) await supabase.from('projets_joint').update({ ...proj, owner_id: ownerId }).eq('id', editProjet.id)
    else await supabase.from('projets_joint').insert({ ...proj, owner_id: ownerId })
    setShowProjet(false); setEditProjet(null); setProj({ nom: '', icone: '🏠', couleur: '#6366f1', description: '' }); fetchProjets()
  }

  const saveDepProjet = async (e) => {
    e.preventDefault()
    const payeur = getPayeurFromCarte(depProj.carte)
    const payload = { libelle: depProj.libelle, montant: parseFloat(depProj.montant), carte: depProj.carte, moyen_paiement: depProj.carte, payeur, part_moi: parseFloat(depProj.part_moi), date: depProj.date, note: depProj.note, projet_id: projetActif.id, owner_id: ownerId }
    if (editDepProjet) { await supabase.from('depenses_projet').update(payload).eq('id', editDepProjet.id) }
    else {
      const { error } = await supabase.from('depenses_projet').insert(payload)
      if (error) { alert('Erreur SQL : ' + error.message); return }
      if (depProj.sync_perso && payeur === monNom && payeur !== 'commun') {
        await supabase.from('depenses').insert({ user_id: user.id, date: depProj.date, montant: parseFloat(depProj.montant), libelle: `🤝 ${projetActif.nom} — ${depProj.libelle}`, categorie: 'joint', moyen_paiement: depProj.carte, is_joint: true })
      }
    }
    setShowDepProjet(false); setEditDepProjet(null); fetchDepProjet(); fetchSolde()
  }

  const saveContrib = async (e) => {
    e.preventDefault()
    const payload = { contributeur: contrib.contributeur, montant: parseFloat(contrib.montant), date: contrib.date, note: contrib.note, user_id: ownerId }
    if (editContrib) await supabase.from('contributions_joint').update(payload).eq('id', editContrib.id)
    else await supabase.from('contributions_joint').insert(payload)
    setShowContrib(false); setEditContrib(null); fetchContrib(); fetchSolde()
  }

  // Invitation
  if (invitationRecue && invitationRecue.statut === 'en_attente') {
    return (
      <div style={{ padding: 16, maxWidth: 480, margin: '60px auto', textAlign: 'center' }}>
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 20, padding: 32 }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>🤝</p>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>Invitation reçue</h2>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 24 }}>Tu as été invité(e) à partager un compte joint.</p>
          <button onClick={async () => {
            await supabase.from('partages_joint').update({ partner_id: user.id, statut: 'accepte' }).eq('id', invitationRecue.id)
            setInvitationRecue(p => ({ ...p, statut: 'accepte' }))
            setIsPartner(true); setOwnerId(invitationRecue.owner_id)
            await loadConfig(invitationRecue.owner_id)
          }} style={{ width: '100%', padding: 12, borderRadius: 12, border: 'none', cursor: 'pointer', color: 'white', fontWeight: 600, background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', fontSize: 15 }}>
            Accepter 🎉
          </button>
        </div>
      </div>
    )
  }

  if (!ready) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>

  const inp = { width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 14, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }
  const card = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16 }

  // Sélecteur carte — le cœur du système
  const CarteSelect = ({ form, setForm, field = 'carte' }) => {
    const carte = form[field]
    const payeur = getPayeurFromCarte(carte)
    const isCommun = payeur === 'commun'
    return (
      <div>
        <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Carte utilisée</label>
        <select value={carte} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} style={inp}>
          {cartesOwner.length > 0 && (
            <optgroup label={`💳 Cartes ${nomOwner}`}>
              {cartesOwner.map(c => <option key={c}>{c}</option>)}
            </optgroup>
          )}
          {cartesPartner.length > 0 && (
            <optgroup label={`💳 Cartes ${nomPartner}`}>
              {cartesPartner.map(c => <option key={c}>{c}</option>)}
            </optgroup>
          )}
          {cartesCommunes.length > 0 && (
            <optgroup label="🤝 Carte commune (pas de dette)">
              {cartesCommunes.map(c => <option key={c}>{c}</option>)}
            </optgroup>
          )}
        </select>
        <div style={{ marginTop: 6, fontSize: 12, padding: '6px 10px', borderRadius: 8, background: isCommun ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)', color: isCommun ? '#10b981' : '#6366f1', border: `1px solid ${isCommun ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.3)'}` }}>
          {isCommun ? '🤝 Pot commun — pas de dette' : `👤 ${payeur} avance l'argent — dette calculée`}
        </div>
      </div>
    )
  }

  const totalAbons = abonnements.filter(a => a.actif).reduce((s, a) => s + a.montant, 0)
  const maPartAbons = abonnements.filter(a => a.actif).reduce((s, a) => s + a.montant * (a.part_damien || 50) / 100, 0)

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: '0 auto' }}>
      {/* Header solde */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text)' }}>Compte Joint</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>{nomOwner} & {nomPartner}</p>
        </div>
        <div style={{ ...card, padding: '10px 16px', textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 2 }}>
            {soldeGlobal >= 0 ? `${nomAutre} te doit` : `Tu dois à ${nomAutre}`}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: soldeGlobal >= 0 ? '#10b981' : '#ef4444' }}>
            {Math.abs(soldeGlobal).toFixed(2)} €
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4, padding: 4, borderRadius: 12, background: 'var(--color-surface)', marginBottom: 16 }}>
        {[['commun','💸 Commun'],['projets','📁 Projets'],['partage','🔗 Partage'],['config','⚙️ Config']].map(([t,l]) => (
          <button key={t} onClick={() => { setMainTab(t); setProjetActif(null) }}
            style={{ padding: '9px 4px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500, background: mainTab === t ? '#6366f1' : 'transparent', color: mainTab === t ? 'white' : 'var(--color-text-muted)' }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── COMMUN ── */}
      {mainTab === 'commun' && (
        <>
          <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 10, background: 'var(--color-bg)', marginBottom: 14, border: '1px solid var(--color-border)' }}>
            {[['depenses','💸 Dépenses'],['abonnements','🔄 Abonnements'],['contributions','💳 Contributions']].map(([t,l]) => (
              <button key={t} onClick={() => setCommunTab(t)}
                style={{ flex: 1, padding: '7px 4px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500, background: communTab === t ? 'var(--color-surface)' : 'transparent', color: communTab === t ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                {l}
              </button>
            ))}
          </div>

          {/* DÉPENSES */}
          {communTab === 'depenses' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <select value={month} onChange={e => setMonth(+e.target.value)} style={{ ...inp, width: 'auto' }}>{MOIS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}</select>
                  <select value={year} onChange={e => setYear(+e.target.value)} style={{ ...inp, width: 'auto' }}>{[2024,2025,2026,2027].map(y => <option key={y}>{y}</option>)}</select>
                </div>
                <button onClick={() => { setEditDep(null); setDep(mkDep()); setShowDep(true) }}
                  style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', fontSize: 13 }}>
                  + Dépense
                </button>
              </div>
              {depenses.length === 0
                ? <div style={{ ...card, padding: 40, textAlign: 'center' }}><p style={{ fontSize: 36 }}>💸</p><p style={{ color: 'var(--color-text-muted)', marginTop: 8 }}>Aucune dépense commune ce mois</p></div>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {depenses.map(d => {
                    const cat = CATS_JOINT.find(c => c.id === d.categorie)
                    const payeur = d.payeur || getPayeurFromCarte(d.carte || d.moyen_paiement || '')
                    const isCommun = payeur === 'commun'
                    const maPart = d.montant * (d.part_moi || 50) / 100
                    return (
                      <div key={d.id} style={{ ...card, padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 22 }}>{cat?.icon || '📦'}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.libelle}</div>
                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                              {new Date(d.date).toLocaleDateString('fr-FR')} · {d.carte || d.moyen_paiement}
                              {isCommun && <span style={{ marginLeft: 6, padding: '1px 5px', borderRadius: 8, background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: 10, fontWeight: 600 }}>🤝 Commun</span>}
                            </div>
                            <div style={{ fontSize: 11, marginTop: 3 }}>
                              <span style={{ color: payeur === monNom ? '#6366f1' : '#ec4899', fontWeight: 500 }}>{isCommun ? '🤝 Pot commun' : `${payeur} a payé`} — {d.montant.toFixed(2)} €</span>
                              {!isCommun && <span style={{ color: 'var(--color-text-muted)' }}> · Ta part : {maPart.toFixed(2)} €</span>}
                            </div>
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#ec4899', flexShrink: 0 }}>— {d.montant.toFixed(2)} €</span>
                          <button onClick={() => { setEditDep(d); setDep({ libelle: d.libelle, montant: d.montant, carte: d.carte || d.moyen_paiement || '', part_moi: d.part_moi || 50, date: d.date, categorie: d.categorie || 'divers', note: d.note || '', sync_perso: false }); setShowDep(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>✏️</button>
                          <button onClick={async () => { if (!confirm('Supprimer ?')) return; await supabase.from('depenses_joint').delete().eq('id', d.id); fetchDep(); fetchSolde() }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>🗑️</button>
                        </div>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: '#f59e0b', fontWeight: 600 }}>— {totalAbons.toFixed(0)} €/mois · ma part : {maPartAbons.toFixed(0)} €</span>
                <button onClick={() => { setEditAbon(null); setAbon(mkAbon()); setShowAbon(true) }}
                  style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg,#f59e0b,#ef4444)', fontSize: 13 }}>
                  + Abonnement
                </button>
              </div>
              {abonnements.length === 0
                ? <div style={{ ...card, padding: 40, textAlign: 'center' }}><p style={{ fontSize: 36 }}>🔄</p><p style={{ color: 'var(--color-text-muted)', marginTop: 8 }}>Aucun abonnement commun</p></div>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {abonnements.map(a => {
                    const jours = joursAvant(a.jour_prelevement)
                    const urgent = jours <= 5
                    return (
                      <div key={a.id} style={{ ...card, padding: '12px 16px', opacity: a.actif ? 1 : 0.55 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{a.nom}</span>
                              {urgent && a.actif && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 20, background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontWeight: 600 }}>⚡ {jours}j</span>}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>Le {a.jour_prelevement} · {a.moyen_paiement}{a.note ? ` · ${a.note}` : ''}</div>
                            <div style={{ fontSize: 11, marginTop: 2, color: '#8b5cf6', fontWeight: 500 }}>Ma part : {(a.montant * (a.part_damien||50) / 100).toFixed(2)} € · dans {jours}j</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: a.actif ? '#f59e0b' : 'var(--color-text-muted)' }}>— {a.montant.toFixed(2)} €</div>
                            <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>/mois</div>
                          </div>
                          <button onClick={async () => { await supabase.from('abonnements_joint').update({ actif: !a.actif }).eq('id', a.id); fetchAbon() }} style={{ position: 'relative', width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', background: a.actif ? '#10b981' : '#475569', flexShrink: 0 }}><span style={{ position: 'absolute', top: 2, width: 16, height: 16, borderRadius: '50%', background: 'white', left: a.actif ? 18 : 2, transition: 'left 0.2s' }} /></button>
                          <button onClick={() => { setEditAbon(a); setAbon({ nom: a.nom, montant: a.montant, jour: a.jour_prelevement, carte: a.moyen_paiement || '', part_moi: a.part_damien || 50, actif: a.actif, note: a.note || '' }); setShowAbon(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>✏️</button>
                          <button onClick={async () => { if (!confirm('Supprimer ?')) return; await supabase.from('abonnements_joint').delete().eq('id', a.id); fetchAbon() }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>🗑️</button>
                        </div>
                        {a.actif && <div style={{ marginTop: 8, height: 3, borderRadius: 2, background: 'var(--color-border)' }}><div style={{ height: '100%', borderRadius: 2, background: urgent ? '#ef4444' : '#f59e0b', width: `${Math.max(5, 100 - jours/31*100)}%` }} /></div>}
                      </div>
                    )
                  })}
                </div>
              }
            </>
          )}

          {/* CONTRIBUTIONS */}
          {communTab === 'contributions' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Qui verse quoi sur le compte joint</p>
                <button onClick={() => { setEditContrib(null); setContrib(mkContrib()); setShowContrib(true) }}
                  style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg,#10b981,#06b6d4)', fontSize: 13 }}>
                  + Contribution
                </button>
              </div>
              {contributions.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 12 }}>
                  {[nomOwner, nomPartner].map(nom => (
                    <div key={nom} style={{ ...card, padding: 12, textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>{nom}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#10b981' }}>+ {contributions.filter(c => c.contributeur === nom).reduce((s,c) => s+c.montant, 0).toFixed(0)} €</div>
                    </div>
                  ))}
                  <div style={{ ...card, padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>Total</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#6366f1' }}>+ {contributions.reduce((s,c) => s+c.montant, 0).toFixed(0)} €</div>
                  </div>
                </div>
              )}
              {contributions.length === 0
                ? <div style={{ ...card, padding: 40, textAlign: 'center' }}><p style={{ fontSize: 36 }}>💳</p><p style={{ color: 'var(--color-text-muted)', marginTop: 8 }}>Aucune contribution</p></div>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {contributions.map(c => (
                    <div key={c.id} style={{ ...card, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 22 }}>💳</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>{c.contributeur} a versé</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{new Date(c.date).toLocaleDateString('fr-FR')}{c.note ? ` · ${c.note}` : ''}</div>
                      </div>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#10b981' }}>+ {c.montant.toFixed(2)} €</span>
                      <button onClick={() => { setEditContrib(c); setContrib({ contributeur: c.contributeur, montant: c.montant, date: c.date, note: c.note || '' }); setShowContrib(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>✏️</button>
                      <button onClick={async () => { if (!confirm('Supprimer ?')) return; await supabase.from('contributions_joint').delete().eq('id', c.id); fetchContrib(); fetchSolde() }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>🗑️</button>
                    </div>
                  ))}
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
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{projets.length} projet{projets.length !== 1 ? 's' : ''}</p>
            <button onClick={() => { setEditProjet(null); setProj({ nom: '', icone: '🏠', couleur: '#6366f1', description: '' }); setShowProjet(true) }}
              style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', fontSize: 13 }}>
              + Projet
            </button>
          </div>
          {projets.length === 0
            ? <div style={{ ...card, padding: 40, textAlign: 'center' }}><p style={{ fontSize: 40, marginBottom: 12 }}>📁</p><p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>Aucun projet</p><p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Appart, Vacances, Voiture...</p></div>
            : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
              {projets.map(p => (
                <div key={p.id} onClick={() => setProjetActif(p)} style={{ ...card, padding: 16, cursor: 'pointer', borderLeft: `4px solid ${p.couleur}` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: p.couleur + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{p.icone}</div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>{p.nom}</div>
                        {p.description && <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{p.description}</div>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 2 }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setEditProjet(p); setProj({ nom: p.nom, icone: p.icone, couleur: p.couleur, description: p.description || '' }); setShowProjet(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>✏️</button>
                      <button onClick={async () => { if (!confirm('Supprimer ?')) return; await supabase.from('projets_joint').delete().eq('id', p.id); fetchProjets() }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>🗑️</button>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: p.couleur, fontWeight: 500, marginTop: 10 }}>Voir les dépenses →</div>
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
            <button onClick={() => setProjetActif(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--color-text-muted)' }}>←</button>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: projetActif.couleur + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{projetActif.icone}</div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>{projetActif.nom}</h2>
              {projetActif.description && <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{projetActif.description}</p>}
            </div>
            <button onClick={() => { setEditDepProjet(null); setDepProj(mkDepProjet()); setShowDepProjet(true) }}
              style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: projetActif.couleur, fontSize: 13 }}>
              + Dépense
            </button>
          </div>

          {depensesProjet.length > 0 && (() => {
            let s = 0
            depensesProjet.forEach(d => {
              const payeur = d.payeur || getPayeurFromCarte(d.carte || d.moyen_paiement || '')
              if (payeur === 'commun') return
              const p = (d.part_moi || 50) / 100
              s += payeur === nomOwner ? d.montant * (1 - p) : -d.montant * p
            })
            const solde = isPartner ? -s : s
            const totalMoi = depensesProjet.filter(d => (d.payeur || getPayeurFromCarte(d.carte||'')) === monNom).reduce((s, d) => s + d.montant, 0)
            const totalAutre = depensesProjet.filter(d => (d.payeur || getPayeurFromCarte(d.carte||'')) === nomAutre).reduce((s, d) => s + d.montant, 0)
            return (
              <div style={{ ...card, padding: 16, borderLeft: `4px solid ${projetActif.couleur}` }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 10 }}>
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>{monNom}</div><div style={{ fontSize: 15, fontWeight: 700, color: '#6366f1' }}>{totalMoi.toFixed(0)} €</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>{nomAutre}</div><div style={{ fontSize: 15, fontWeight: 700, color: '#ec4899' }}>{totalAutre.toFixed(0)} €</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>Solde</div><div style={{ fontSize: 15, fontWeight: 700, color: solde >= 0 ? '#10b981' : '#ef4444' }}>{solde >= 0 ? '+' : ''}{solde.toFixed(0)} €</div></div>
                </div>
                <div style={{ padding: '8px 12px', borderRadius: 10, background: (solde >= 0 ? 'rgba(16,185,129,' : 'rgba(239,68,68,') + '0.1)', textAlign: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: solde >= 0 ? '#10b981' : '#ef4444' }}>
                    {solde > 0 ? `👆 ${nomAutre} te doit ${Math.abs(solde).toFixed(2)} €` : solde < 0 ? `👇 Tu dois ${Math.abs(solde).toFixed(2)} € à ${nomAutre}` : '✅ Quittes'}
                  </span>
                </div>
              </div>
            )
          })()}

          <div style={{ display: 'flex', gap: 6 }}>
            <select value={month} onChange={e => setMonth(+e.target.value)} style={{ ...inp, width: 'auto' }}>{MOIS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}</select>
            <select value={year} onChange={e => setYear(+e.target.value)} style={{ ...inp, width: 'auto' }}>{[2024,2025,2026,2027].map(y => <option key={y}>{y}</option>)}</select>
          </div>

          {depensesProjet.length === 0
            ? <div style={{ ...card, padding: 40, textAlign: 'center' }}><p style={{ fontSize: 32 }}>💸</p><p style={{ color: 'var(--color-text-muted)', marginTop: 8 }}>Aucune dépense ce mois</p></div>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {depensesProjet.map(d => {
                const payeur = d.payeur || getPayeurFromCarte(d.carte || d.moyen_paiement || '')
                const isCommun = payeur === 'commun'
                const jaiPaye = payeur === monNom
                const maPart = d.montant * (d.part_moi || 50) / 100
                const partAutre = d.montant - maPart
                return (
                  <div key={d.id} style={{ ...card, padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: (jaiPaye ? '#6366f1' : '#ec4899') + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{jaiPaye ? '👤' : '👥'}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.libelle}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                          {new Date(d.date).toLocaleDateString('fr-FR')} · {d.carte || d.moyen_paiement}
                          {isCommun && <span style={{ marginLeft: 6, padding: '1px 5px', borderRadius: 8, background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: 10 }}>🤝</span>}
                        </div>
                        <div style={{ fontSize: 11, marginTop: 3 }}>
                          <span style={{ color: jaiPaye ? '#6366f1' : '#ec4899', fontWeight: 500 }}>{isCommun ? 'Pot commun' : `${payeur} a payé ${d.montant.toFixed(2)} €`}</span>
                          {!isCommun && <span style={{ color: 'var(--color-text-muted)' }}> · {monNom} : {maPart.toFixed(2)} € · {nomAutre} : {partAutre.toFixed(2)} €</span>}
                        </div>
                        {d.note && <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2, fontStyle: 'italic' }}>{d.note}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => { setEditDepProjet(d); setDepProj({ libelle: d.libelle, montant: d.montant, carte: d.carte || d.moyen_paiement || '', part_moi: d.part_moi || 50, date: d.date, note: d.note || '', sync_perso: false }); setShowDepProjet(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>✏️</button>
                        <button onClick={async () => { if (!confirm('Supprimer ?')) return; await supabase.from('depenses_projet').delete().eq('id', d.id); fetchDepProjet(); fetchSolde() }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>🗑️</button>
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
          {partage ? (
            <div style={{ ...card, padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 12 }}>Partenaire</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>{nomPartner[0]}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>{nomPartner}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{partage.partner_email}</div>
                  <div style={{ fontSize: 12, marginTop: 2 }}>{partage.statut === 'accepte' ? <span style={{ color: '#10b981' }}>✅ Actif</span> : <span style={{ color: '#f59e0b' }}>⏳ En attente</span>}</div>
                </div>
              </div>
              {partage.statut === 'en_attente' && <div style={{ padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 13, color: '#f59e0b', marginBottom: 12 }}>{nomPartner} doit ouvrir Compte Joint sur Optima pour accepter.</div>}
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 10 }}>💡 Configure les noms et cartes dans ⚙️ Config</p>
              <button onClick={async () => { if (!confirm('Révoquer ?')) return; await supabase.from('partages_joint').delete().eq('id', partage.id); setPartage(null) }} style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid #ef4444', background: 'transparent', cursor: 'pointer', color: '#ef4444', fontSize: 13 }}>Révoquer l'accès</button>
            </div>
          ) : isPartner ? (
            <div style={{ ...card, padding: 20, textAlign: 'center' }}><p style={{ fontSize: 32, marginBottom: 8 }}>✅</p><p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>Compte joint actif</p></div>
          ) : (
            <div style={{ ...card, padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>Inviter un partenaire</h3>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>Il/elle devra créer un compte sur Optima puis accepter l'invitation.</p>
              {inviteMsg && <div style={{ padding: 10, borderRadius: 8, background: inviteMsg.startsWith('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${inviteMsg.startsWith('✅') ? '#10b981' : '#ef4444'}`, color: inviteMsg.startsWith('✅') ? '#10b981' : '#ef4444', fontSize: 13, marginBottom: 12 }}>{inviteMsg}</div>}
              <form onSubmit={async (e) => { e.preventDefault(); const { error } = await supabase.from('partages_joint').insert({ owner_id: user.id, partner_email: inviteEmail, statut: 'en_attente' }); if (error) setInviteMsg('Erreur : ' + error.message); else { setInviteMsg('✅ Invitation créée !'); setInviteEmail(''); init() } }} style={{ display: 'flex', gap: 8 }}>
                <input type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="email@partenaire.fr" style={{ ...inp, flex: 1 }} />
                <button type="submit" style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg,#ec4899,#8b5cf6)' }}>Inviter</button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ── CONFIG ── */}
      {mainTab === 'config' && (
        <div style={{ ...card, padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>⚙️ Configuration</h3>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>Configure les prénoms et les cartes. La carte utilisée détermine automatiquement qui a payé et si il y a une dette.</p>
          <form onSubmit={saveConfig} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Prénoms */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#6366f1', display: 'block', marginBottom: 8 }}>👤 Ton prénom</label>
                <input required value={cfgForm.nom_owner} onChange={e => setCfgForm(f => ({...f, nom_owner: e.target.value}))} placeholder="Damien" style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#ec4899', display: 'block', marginBottom: 8 }}>👥 Prénom partenaire</label>
                <input required value={cfgForm.nom_partner} onChange={e => setCfgForm(f => ({...f, nom_partner: e.target.value}))} placeholder="Aline" style={inp} />
              </div>
            </div>

            {/* Cartes Damien */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#6366f1' }}>💳 Cartes de {cfgForm.nom_owner || 'toi'}</label>
                <button type="button" onClick={() => setCfgForm(f => ({...f, cartes_owner: [...f.cartes_owner, '']}))}
                  style={{ fontSize: 12, padding: '4px 10px', borderRadius: 8, border: '1px dashed #6366f1', background: 'transparent', cursor: 'pointer', color: '#6366f1' }}>+ Ajouter</button>
              </div>
              {cfgForm.cartes_owner.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <input value={c} onChange={e => setCfgForm(f => ({...f, cartes_owner: f.cartes_owner.map((x,j) => j===i ? e.target.value : x)}))} placeholder="Ex: Carte SG, Carte Trade..." style={{ ...inp, flex: 1 }} />
                  <button type="button" onClick={() => setCfgForm(f => ({...f, cartes_owner: f.cartes_owner.filter((_,j) => j!==i)}))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#ef4444' }}>×</button>
                </div>
              ))}
            </div>

            {/* Cartes Aline */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#ec4899' }}>💳 Cartes de {cfgForm.nom_partner || 'partenaire'}</label>
                <button type="button" onClick={() => setCfgForm(f => ({...f, cartes_partner: [...f.cartes_partner, '']}))}
                  style={{ fontSize: 12, padding: '4px 10px', borderRadius: 8, border: '1px dashed #ec4899', background: 'transparent', cursor: 'pointer', color: '#ec4899' }}>+ Ajouter</button>
              </div>
              {cfgForm.cartes_partner.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <input value={c} onChange={e => setCfgForm(f => ({...f, cartes_partner: f.cartes_partner.map((x,j) => j===i ? e.target.value : x)}))} placeholder="Ex: Carte Aline..." style={{ ...inp, flex: 1 }} />
                  <button type="button" onClick={() => setCfgForm(f => ({...f, cartes_partner: f.cartes_partner.filter((_,j) => j!==i)}))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#ef4444' }}>×</button>
                </div>
              ))}
            </div>

            {/* Cartes communes */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#10b981' }}>🤝 Cartes communes (pas de dette)</label>
                <button type="button" onClick={() => setCfgForm(f => ({...f, cartes_communes: [...f.cartes_communes, '']}))}
                  style={{ fontSize: 12, padding: '4px 10px', borderRadius: 8, border: '1px dashed #10b981', background: 'transparent', cursor: 'pointer', color: '#10b981' }}>+ Ajouter</button>
              </div>
              {cfgForm.cartes_communes.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <input value={c} onChange={e => setCfgForm(f => ({...f, cartes_communes: f.cartes_communes.map((x,j) => j===i ? e.target.value : x)}))} placeholder="Ex: Carte Revolut Joint..." style={{ ...inp, flex: 1 }} />
                  <button type="button" onClick={() => setCfgForm(f => ({...f, cartes_communes: f.cartes_communes.filter((_,j) => j!==i)}))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#ef4444' }}>×</button>
                </div>
              ))}
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6, padding: '6px 10px', borderRadius: 8, background: 'rgba(16,185,129,0.06)' }}>
                💡 Payer avec une carte commune = pot commun utilisé = pas de dette générée entre vous
              </div>
            </div>

            <button type="submit" style={{ width: '100%', padding: 12, borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', fontSize: 15 }}>
              💾 Sauvegarder
            </button>
          </form>
        </div>
      )}

      {/* FORM DÉPENSE */}
      <FormModal show={showDep} onClose={() => { setShowDep(false); setEditDep(null) }} title={editDep ? 'Modifier' : 'Dépense commune'} onSubmit={saveDep} color="linear-gradient(135deg,#ec4899,#8b5cf6)" submitLabel={editDep ? 'Modifier' : 'Ajouter'}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Date</label><input type="date" required value={dep.date} onChange={e => setDep(f => ({...f, date: e.target.value}))} style={inp} /></div>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Montant (€)</label><input type="number" step="0.01" min="0" required value={dep.montant} onChange={e => setDep(f => ({...f, montant: e.target.value}))} placeholder="0.00" style={inp} /></div>
        </div>
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Libellé</label><input required value={dep.libelle} onChange={e => setDep(f => ({...f, libelle: e.target.value}))} placeholder="Courses, Restaurant..." style={inp} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Catégorie</label><select value={dep.categorie} onChange={e => setDep(f => ({...f, categorie: e.target.value}))} style={inp}>{CATS_JOINT.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}</select></div>
          <CarteSelect form={dep} setForm={setDep} />
        </div>
        {getPayeurFromCarte(dep.carte) !== 'commun' && <PartInput value={dep.part_moi} onChange={v => setDep(f => ({...f, part_moi: v}))} montant={dep.montant} />}
        {!editDep && getPayeurFromCarte(dep.carte) === monNom && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div><div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>Ajouter dans mes dépenses perso</div><div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Catégorie 🤝 Compte Joint</div></div>
            <button type="button" onClick={() => setDep(f => ({...f, sync_perso: !f.sync_perso}))} style={{ position: 'relative', width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: dep.sync_perso ? '#6366f1' : '#475569', flexShrink: 0 }}><span style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.2s', left: dep.sync_perso ? 22 : 2 }} /></button>
          </div>
        )}
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Note</label><input value={dep.note} onChange={e => setDep(f => ({...f, note: e.target.value}))} placeholder="Optionnel..." style={inp} /></div>
      </FormModal>

      {/* FORM ABONNEMENT */}
      <FormModal show={showAbon} onClose={() => { setShowAbon(false); setEditAbon(null) }} title={editAbon ? 'Modifier' : 'Abonnement commun'} onSubmit={saveAbon} color="linear-gradient(135deg,#f59e0b,#ef4444)" submitLabel={editAbon ? 'Modifier' : 'Ajouter'}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Nom</label><input required value={abon.nom} onChange={e => setAbon(f => ({...f, nom: e.target.value}))} placeholder="Netflix, Loyer..." style={inp} /></div>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Montant (€)</label><input type="number" step="0.01" min="0" required value={abon.montant} onChange={e => setAbon(f => ({...f, montant: e.target.value}))} placeholder="0.00" style={inp} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Jour prélèvement</label><input type="number" min="1" max="28" required value={abon.jour} onChange={e => setAbon(f => ({...f, jour: e.target.value}))} style={inp} /></div>
          <CarteSelect form={abon} setForm={setAbon} field="carte" />
        </div>
        <PartInput value={abon.part_moi} onChange={v => setAbon(f => ({...f, part_moi: v}))} montant={abon.montant} />
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Note</label><input value={abon.note} onChange={e => setAbon(f => ({...f, note: e.target.value}))} placeholder="Optionnel..." style={inp} /></div>
      </FormModal>

      {/* FORM PROJET */}
      <FormModal show={showProjet} onClose={() => { setShowProjet(false); setEditProjet(null) }} title={editProjet ? 'Modifier' : 'Nouveau projet'} onSubmit={saveProjet} color="linear-gradient(135deg,#6366f1,#8b5cf6)" submitLabel={editProjet ? 'Modifier' : 'Créer'}>
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Nom</label><input required value={proj.nom} onChange={e => setProj(f => ({...f, nom: e.target.value}))} placeholder="Appart, Vacances..." style={inp} /></div>
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Description</label><input value={proj.description} onChange={e => setProj(f => ({...f, description: e.target.value}))} placeholder="Optionnel..." style={inp} /></div>
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Icône</label><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{ICONES_PROJET.map(ic => <button key={ic} type="button" onClick={() => setProj(f => ({...f, icone: ic}))} style={{ width: 38, height: 38, borderRadius: 8, border: proj.icone === ic ? '2px solid #6366f1' : '1px solid var(--color-border)', background: proj.icone === ic ? '#6366f115' : 'transparent', cursor: 'pointer', fontSize: 20 }}>{ic}</button>)}</div></div>
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Couleur</label><div style={{ display: 'flex', gap: 8 }}>{COULEURS_PROJET.map(c => <button key={c} type="button" onClick={() => setProj(f => ({...f, couleur: c}))} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: c, cursor: 'pointer', outline: proj.couleur === c ? `3px solid ${c}` : 'none', outlineOffset: 2 }} />)}</div></div>
      </FormModal>

      {/* FORM DEP PROJET */}
      <FormModal show={showDepProjet} onClose={() => { setShowDepProjet(false); setEditDepProjet(null) }} title={editDepProjet ? 'Modifier' : `Dépense — ${projetActif?.nom}`} onSubmit={saveDepProjet} color={projetActif?.couleur || '#6366f1'} submitLabel={editDepProjet ? 'Modifier' : 'Ajouter'}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Date</label><input type="date" required value={depProj.date} onChange={e => setDepProj(f => ({...f, date: e.target.value}))} style={inp} /></div>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Montant (€)</label><input type="number" step="0.01" min="0" required value={depProj.montant} onChange={e => setDepProj(f => ({...f, montant: e.target.value}))} placeholder="0.00" style={inp} /></div>
        </div>
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Libellé</label><input required value={depProj.libelle} onChange={e => setDepProj(f => ({...f, libelle: e.target.value}))} placeholder="Loyer, Ikea..." style={inp} /></div>
        <CarteSelect form={depProj} setForm={setDepProj} />
        {getPayeurFromCarte(depProj.carte) !== 'commun' && <PartInput value={depProj.part_moi} onChange={v => setDepProj(f => ({...f, part_moi: v}))} montant={depProj.montant} />}
        {!editDepProjet && getPayeurFromCarte(depProj.carte) === monNom && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div><div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>Ajouter dans mes dépenses perso</div><div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>🤝 {projetActif?.nom}</div></div>
            <button type="button" onClick={() => setDepProj(f => ({...f, sync_perso: !f.sync_perso}))} style={{ position: 'relative', width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: depProj.sync_perso ? '#6366f1' : '#475569', flexShrink: 0 }}><span style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.2s', left: depProj.sync_perso ? 22 : 2 }} /></button>
          </div>
        )}
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Note</label><input value={depProj.note} onChange={e => setDepProj(f => ({...f, note: e.target.value}))} placeholder="Optionnel..." style={inp} /></div>
      </FormModal>

      {/* FORM CONTRIBUTION */}
      <FormModal show={showContrib} onClose={() => { setShowContrib(false); setEditContrib(null) }} title={editContrib ? 'Modifier' : 'Contribution'} onSubmit={saveContrib} color="linear-gradient(135deg,#10b981,#06b6d4)" submitLabel={editContrib ? 'Modifier' : 'Ajouter'}>
        <div>
          <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Qui a versé ?</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[[nomOwner,'👤','#6366f1'],[nomPartner,'👥','#ec4899']].map(([nom,icon,color]) => (
              <button key={nom} type="button" onClick={() => setContrib(f => ({...f, contributeur: nom}))}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: contrib.contributeur === nom ? 'none' : '1px solid var(--color-border)', background: contrib.contributeur === nom ? color : 'transparent', color: contrib.contributeur === nom ? 'white' : 'var(--color-text-muted)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                {icon} {nom}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Montant (€)</label><input type="number" step="0.01" min="0" required value={contrib.montant} onChange={e => setContrib(f => ({...f, montant: e.target.value}))} placeholder="0.00" style={inp} /></div>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Date</label><input type="date" required value={contrib.date} onChange={e => setContrib(f => ({...f, date: e.target.value}))} style={inp} /></div>
        </div>
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Note</label><input value={contrib.note} onChange={e => setContrib(f => ({...f, note: e.target.value}))} placeholder="Virement du 1er..." style={inp} /></div>
      </FormModal>
    </div>
  )
}
