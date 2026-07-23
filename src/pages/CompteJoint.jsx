import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import FormModal from '../components/FormModal'
import { useMoyensPaiement } from '../hooks/useMoyensPaiement'
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

export default function CompteJoint({ user }) {
  const [mainTab, setMainTab] = useState('commun')
  const [communTab, setCommunTab] = useState('depenses')
  const [projetActif, setProjetActif] = useState(null)

  // Config et identité
  const [config, setConfig] = useState(null)
  const [ownerId, setOwnerId] = useState(null)
  const [isPartner, setIsPartner] = useState(false)
  const [partage, setPartage] = useState(null)
  const [invitationRecue, setInvitationRecue] = useState(null)
  const [configLoaded, setConfigLoaded] = useState(false)

  // Mon identité dans le joint (basée sur email)
  const monEmail = user.email
  const monNom = config
    ? (monEmail === config.email_owner ? config.nom_owner : config.nom_partner)
    : 'Moi'
  const nomAutre = config
    ? (monEmail === config.email_owner ? config.nom_partner : config.nom_owner)
    : 'Partenaire'
  const moyensCommuns = config?.moyens_communs || []

  // Moyens de paiement
  const [moyensJoint, setMoyensJoint] = useState([]) // {nom, appartient_a, icone}

  // Mes moyens perso dans le joint
  const mesMoyens = moyensJoint.filter(m =>
    m.appartient_a === (monEmail === config?.email_owner ? 'owner' : 'partner') && m.actif
  )
  const moyensAutre = moyensJoint.filter(m =>
    m.appartient_a === (monEmail === config?.email_owner ? 'partner' : 'owner') && m.actif
  )
  const tousLesMoyens = moyensJoint.filter(m => m.actif)

  // Données
  const [depenses, setDepenses] = useState([])
  const [abonnements, setAbonnements] = useState([])
  const [projets, setProjets] = useState([])
  const [depensesProjet, setDepensesProjet] = useState([])
  const [contributions, setContributions] = useState([])
  const [soldeGlobal, setSoldeGlobal] = useState(0)
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())

  // Forms
  const [showDepForm, setShowDepForm] = useState(false)
  const [showAbonForm, setShowAbonForm] = useState(false)
  const [showProjetForm, setShowProjetForm] = useState(false)
  const [showDepProjetForm, setShowDepProjetForm] = useState(false)
  const [showContribForm, setShowContribForm] = useState(false)
  const [editDep, setEditDep] = useState(null)
  const [editAbon, setEditAbon] = useState(null)
  const [editProjet, setEditProjet] = useState(null)
  const [editDepProjet, setEditDepProjet] = useState(null)
  const [editContrib, setEditContrib] = useState(null)

  const emptyDep = () => ({ libelle: '', montant: '', payeur: monNom, moyen_paiement: mesMoyens[0]?.nom || tousLesMoyens[0]?.nom || '', part_moi: 50, date: new Date().toISOString().split('T')[0], categorie: 'divers', note: '', sync_depenses_perso: false })
  const emptyAbon = () => ({ nom: '', montant: '', jour_prelevement: 1, moyen_paiement: tousLesMoyens[0]?.nom || '', part_damien: 50, actif: true, note: '' })
  const emptyProjet = { nom: '', icone: '🏠', couleur: '#6366f1', description: '' }
  const emptyDepProjet = () => ({ libelle: '', montant: '', payeur: monNom, moyen_paiement: mesMoyens[0]?.nom || tousLesMoyens[0]?.nom || '', part_moi: 50, date: new Date().toISOString().split('T')[0], note: '', sync_depenses_perso: false })
  const emptyContrib = () => ({ contributeur: monNom, montant: '', date: new Date().toISOString().split('T')[0], note: '' })

  const [depForm, setDepForm] = useState({ libelle: '', montant: '', payeur: '', moyen_paiement: '', part_moi: 50, date: new Date().toISOString().split('T')[0], categorie: 'divers', note: '', sync_depenses_perso: false, est_joint: false })
  const [abonForm, setAbonForm] = useState({ nom: '', montant: '', jour_prelevement: 1, moyen_paiement: '', part_damien: 50, actif: true, note: '' })
  const [projetForm, setProjetForm] = useState(emptyProjet)
  const [depProjetForm, setDepProjetForm] = useState({ libelle: '', montant: '', payeur: '', moyen_paiement: '', part_moi: 50, date: new Date().toISOString().split('T')[0], note: '', sync_depenses_perso: false, est_joint: false })
  const [contribForm, setContribForm] = useState({ contributeur: '', montant: '', date: new Date().toISOString().split('T')[0], note: '' })

  // Config form
  const [configForm, setConfigForm] = useState({ nom_owner: '', email_owner: '', nom_partner: '', email_partner: '', moyens_communs: [] })
  const [moyensJointForm, setMoyensJointForm] = useState([])
  const { moyens: moyensPerso } = useMoyensPaiement(user.id)
  const MOYENS_PERSO_DEFAUT = ['Carte SG', 'Carte Trade', 'Espèces', 'Virement']
  const tousLesMoyensPerso = moyensPerso.length > 0
    ? moyensPerso.map(m => m.nom)
    : MOYENS_PERSO_DEFAUT

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteMsg, setInviteMsg] = useState('')

  useEffect(() => { init() }, [])
  useEffect(() => { if (configLoaded && ownerId) { fetchDepenses(); fetchContributions(); fetchSolde() } }, [month, year, configLoaded, ownerId])
  useEffect(() => { if (configLoaded && ownerId) { fetchProjets(); fetchAbonnements() } }, [configLoaded, ownerId])
  useEffect(() => { if (projetActif) fetchDepensesProjet() }, [projetActif, month, year])

  const init = async () => {
    // Owner ?
    const { data: owned } = await supabase.from('partages_joint').select('*').eq('owner_id', user.id).maybeSingle()
    if (owned) {
      setPartage(owned); setOwnerId(user.id); setIsPartner(false)
      await loadConfig(user.id); return
    }
    // Partner ?
    const { data: received } = await supabase.from('partages_joint').select('*').eq('partner_id', user.id).maybeSingle()
    if (received) {
      setInvitationRecue(received)
      if (received.statut === 'accepte') {
        setIsPartner(true); setOwnerId(received.owner_id)
        await loadConfig(received.owner_id); return
      }
    }
    // Seul
    await loadConfig(user.id)
  }

  const loadConfig = async (uid) => {
    const { data: cfg } = await supabase.from('config_joint').select('*').eq('owner_id', uid).maybeSingle()
    if (cfg) {
      setConfig(cfg)
      setConfigForm({ nom_owner: cfg.nom_owner, email_owner: cfg.email_owner || '', nom_partner: cfg.nom_partner, email_partner: cfg.email_partner || '', moyens_communs: cfg.moyens_communs || [] })
    } else {
      // Créer config avec emails pré-remplis
      const def = { owner_id: uid, nom_owner: user.email.split('@')[0], email_owner: user.email, nom_partner: 'Partenaire', email_partner: '', moyens_communs: [] }
      await supabase.from('config_joint').insert(def)
      setConfig(def)
      setConfigForm({ nom_owner: def.nom_owner, email_owner: def.email_owner, nom_partner: 'Partenaire', email_partner: '', moyens_communs: [] })
    }
    // Charger moyens joint
    const { data: mj } = await supabase.from('moyens_paiement_joint').select('*').eq('owner_id', uid)
    setMoyensJoint(mj || [])
    setMoyensJointForm(mj || [])
    setConfigLoaded(true)
  }

  const saveConfig = async (e) => {
    e.preventDefault()
    await supabase.from('config_joint').update({
      nom_owner: configForm.nom_owner,
      email_owner: configForm.email_owner,
      nom_partner: configForm.nom_partner,
      email_partner: configForm.email_partner,
      moyens_communs: configForm.moyens_communs,
    }).eq('owner_id', ownerId)

    // Sauvegarder moyens joint
    await supabase.from('moyens_paiement_joint').delete().eq('owner_id', ownerId)
    if (moyensJointForm.filter(m => m.nom).length > 0) {
      await supabase.from('moyens_paiement_joint').insert(
        moyensJointForm.filter(m => m.nom).map(m => ({ ...m, owner_id: ownerId, id: undefined }))
      )
    }
    await loadConfig(ownerId)
    alert('✅ Configuration sauvegardée !')
  }

  const addMoyenJoint = (appartient_a) => {
    setMoyensJointForm(f => [...f, { nom: '', appartient_a, icone: '💳', actif: true }])
  }
  const removeMoyenJoint = (i) => setMoyensJointForm(f => f.filter((_, idx) => idx !== i))
  const updateMoyenJoint = (i, field, val) => setMoyensJointForm(f => f.map((m, idx) => idx === i ? { ...m, [field]: val } : m))
  const toggleMoyenCommun = (nom) => setConfigForm(f => ({ ...f, moyens_communs: f.moyens_communs.includes(nom) ? f.moyens_communs.filter(m => m !== nom) : [...f.moyens_communs, nom] }))

  const fetchDepenses = async () => {
    const start = `${year}-${String(month).padStart(2,'0')}-01`
    const end = new Date(year, month, 0).toISOString().split('T')[0]
    const { data, error } = await supabase.from('depenses_joint').select('*').eq('user_id', ownerId).gte('date', start).lte('date', end).order('date', { ascending: false })
    if (!error) setDepenses(data || [])
  }
  const fetchAbonnements = async () => { const { data } = await supabase.from('abonnements_joint').select('*').eq('user_id', ownerId).order('jour_prelevement'); setAbonnements(data || []) }
  const fetchProjets = async () => { const { data } = await supabase.from('projets_joint').select('*').eq('owner_id', ownerId).order('created_at'); setProjets(data || []) }
  const fetchDepensesProjet = async () => {
    if (!projetActif) return
    const start = `${year}-${String(month).padStart(2,'0')}-01`
    const end = new Date(year, month, 0).toISOString().split('T')[0]
    const { data } = await supabase.from('depenses_projet').select('*').eq('projet_id', projetActif.id).gte('date', start).lte('date', end).order('date', { ascending: false })
    setDepensesProjet(data || [])
  }
  const fetchContributions = async () => { const { data } = await supabase.from('contributions_joint').select('*').eq('user_id', ownerId).order('date', { ascending: false }); setContributions(data || []) }

  // Calcul solde complet
  // Logique : on calcule du point de vue du OWNER
  // owner a avancé (carte owner) → partner lui doit sa part → solde positif pour owner
  // partner a avancé (carte partner) → owner lui doit sa part → solde négatif pour owner
  // carte commune → pas de dette
  // contribution owner → partner doit (positif)
  // contribution partner → owner doit (négatif)
  const calcSolde = (deps, depProj, contribs) => {
    let s = 0
    const nomOwner = config?.nom_owner || ''

    ;(deps || []).forEach(d => {
      if (d.est_joint) return // payé depuis compte joint → pas de dette
      const p = (d.part_moi || 50) / 100
      const ownerAPaye = d.payeur === nomOwner
      s += ownerAPaye ? d.montant * (1 - p) : -d.montant * p
    })

    ;(depProj || []).forEach(d => {
      if (d.est_joint) return
      const p = (d.part_moi || 50) / 100
      const ownerAPaye = d.payeur === nomOwner
      s += ownerAPaye ? d.montant * (1 - p) : -d.montant * p
    })

    ;(contribs || []).forEach(c => {
      s += c.contributeur === nomOwner ? c.montant : -c.montant
    })

    return isPartner ? -s : s
  }

  const fetchSolde = async () => {
    const [{ data: deps }, { data: depProj }, { data: contribs }] = await Promise.all([
      supabase.from('depenses_joint').select('montant,payeur,part_moi,est_joint').eq('user_id', ownerId),
      supabase.from('depenses_projet').select('montant,payeur,part_moi,est_joint').eq('owner_id', ownerId),
      supabase.from('contributions_joint').select('montant,contributeur').eq('user_id', ownerId),
    ])
    setSoldeGlobal(calcSolde(deps, depProj, contribs))
  }

  const handleSaveDep = async (e) => {
    e.preventDefault()
    const payload = { libelle: depForm.libelle, montant: parseFloat(depForm.montant), payeur: depForm.payeur, moyen_paiement: depForm.moyen_paiement, part_moi: parseFloat(depForm.part_moi), date: depForm.date, categorie: depForm.categorie, note: depForm.note, sync_depenses_perso: depForm.sync_depenses_perso, est_joint: depForm.est_joint, user_id: ownerId }
    if (editDep) {
      await supabase.from('depenses_joint').update(payload).eq('id', editDep.id)
    } else {
      const { error } = await supabase.from('depenses_joint').insert(payload)
      if (error) { alert('Erreur : ' + error.message); return }
      const jaiPaye = depForm.payeur === (isPartner ? config?.nom_partner : config?.nom_owner)
      if (jaiPaye && depForm.sync_depenses_perso && !depForm.est_joint) {
        await supabase.from('depenses').insert({ user_id: user.id, date: depForm.date, montant: parseFloat(depForm.montant), libelle: `🤝 ${depForm.libelle}`, categorie: 'joint', moyen_paiement: depForm.moyen_paiement, is_joint: true })
      }
    }
    setShowDepForm(false); setEditDep(null); fetchDepenses(); fetchSolde()
  }

  const handleSaveAbon = async (e) => {
    e.preventDefault()
    const payload = { ...abonForm, montant: parseFloat(abonForm.montant), part_damien: parseFloat(abonForm.part_damien), user_id: ownerId }
    if (editAbon) await supabase.from('abonnements_joint').update(payload).eq('id', editAbon.id)
    else await supabase.from('abonnements_joint').insert(payload)
    setShowAbonForm(false); setEditAbon(null); fetchAbonnements()
  }

  const handleSaveProjet = async (e) => {
    e.preventDefault()
    const payload = { ...projetForm, owner_id: ownerId }
    if (editProjet) await supabase.from('projets_joint').update(payload).eq('id', editProjet.id)
    else await supabase.from('projets_joint').insert(payload)
    setShowProjetForm(false); setEditProjet(null); setProjetForm(emptyProjet); fetchProjets()
  }

  const handleSaveDepProjet = async (e) => {
    e.preventDefault()
    const payload = { libelle: depProjetForm.libelle, montant: parseFloat(depProjetForm.montant), payeur: depProjetForm.payeur, moyen_paiement: depProjetForm.moyen_paiement, part_moi: parseFloat(depProjetForm.part_moi), date: depProjetForm.date, note: depProjetForm.note, est_joint: depProjetForm.est_joint, projet_id: projetActif.id, owner_id: ownerId }
    if (editDepProjet) {
      await supabase.from('depenses_projet').update(payload).eq('id', editDepProjet.id)
    } else {
      const { error } = await supabase.from('depenses_projet').insert(payload)
      if (error) { alert('Erreur : ' + error.message); return }
      const jaiPaye = depProjetForm.payeur === (isPartner ? config?.nom_partner : config?.nom_owner)
      if (jaiPaye && depProjetForm.sync_depenses_perso && !depProjetForm.est_joint) {
        await supabase.from('depenses').insert({ user_id: user.id, date: depProjetForm.date, montant: parseFloat(depProjetForm.montant), libelle: `🤝 ${projetActif.nom} — ${depProjetForm.libelle}`, categorie: 'joint', moyen_paiement: depProjetForm.moyen_paiement, is_joint: true })
      }
    }
    setShowDepProjetForm(false); setEditDepProjet(null); fetchDepensesProjet(); fetchSolde()
  }

  const handleSaveContrib = async (e) => {
    e.preventDefault()
    const payload = { ...contribForm, montant: parseFloat(contribForm.montant), user_id: ownerId }
    if (editContrib) await supabase.from('contributions_joint').update(payload).eq('id', editContrib.id)
    else await supabase.from('contributions_joint').insert(payload)
    setShowContribForm(false); setEditContrib(null); fetchContributions(); fetchSolde()
  }

  const inp = { width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 14, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }
  const card = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16 }

  // Plus besoin de PayeurBtn — la carte détermine qui a payé
  // On garde juste un affichage info
  const PayeurInfo = ({ form }) => {
    const payeur = getPayeurFromMoyen(form.moyen_paiement)
    if (payeur === 'commun' || !form.moyen_paiement) return null
    return null // L'info est déjà dans MoyenSelect
  }

  // ── Composants simples ──
  const PayeurBtn = ({ form, setForm }) => (
    <div>
      <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Qui a payé ?</label>
      <div style={{ display: 'flex', gap: 8 }}>
        {[[config?.nom_owner || 'Damien', '👤', '#6366f1'], [config?.nom_partner || 'Aline', '👥', '#ec4899']].map(([nom, icon, color]) => (
          <button key={nom} type="button" onClick={() => setForm(f => ({ ...f, payeur: nom }))}
            style={{ flex: 1, padding: '10px', borderRadius: 10, border: form.payeur === nom ? 'none' : '1px solid var(--color-border)', background: form.payeur === nom ? color : 'transparent', color: form.payeur === nom ? 'white' : 'var(--color-text-muted)', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
            {icon} {nom}
          </button>
        ))}
      </div>
    </div>
  )

  const MoyenSimple = ({ form, setForm }) => (
    <div>
      <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Moyen de paiement</label>
      <select value={form.moyen_paiement} onChange={e => setForm(f => ({ ...f, moyen_paiement: e.target.value }))} style={inp}>
        {tousLesMoyensPerso.map(m => <option key={m}>{m}</option>)}
      </select>
    </div>
  )

  const CompteJointToggle = ({ form, setForm }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, border: `2px solid ${form.est_joint ? '#10b981' : 'var(--color-border)'}`, background: form.est_joint ? 'rgba(16,185,129,0.08)' : 'transparent', cursor: 'pointer' }} onClick={() => setForm(f => ({ ...f, est_joint: !f.est_joint }))}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: form.est_joint ? '#10b981' : 'var(--color-text)' }}>🤝 Payé depuis le compte joint</div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{form.est_joint ? 'Pas de dette — pot commun utilisé' : 'Carte perso utilisée — dette calculée'}</div>
      </div>
      <div style={{ position: 'relative', width: 44, height: 24, borderRadius: 12, background: form.est_joint ? '#10b981' : '#475569', flexShrink: 0 }}>
        <span style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.2s', left: form.est_joint ? 22 : 2 }} />
      </div>
    </div>
  )

    // Invitation en attente
  if (invitationRecue && invitationRecue.statut === 'en_attente') {
    return (
      <div style={{ padding: 16, maxWidth: 480, margin: '60px auto', textAlign: 'center' }}>
        <div style={{ ...card, padding: 32 }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>🤝</p>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>Invitation reçue</h2>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 24 }}>Tu as été invité(e) à partager un compte joint.</p>
          <button onClick={async () => {
            await supabase.from('partages_joint').update({ partner_id: user.id, statut: 'accepte' }).eq('id', invitationRecue.id)
            setInvitationRecue({ ...invitationRecue, statut: 'accepte' })
            setIsPartner(true); setOwnerId(invitationRecue.owner_id)
            await loadConfig(invitationRecue.owner_id)
          }} style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer', color: 'white', fontWeight: 600, background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', fontSize: 15 }}>
            Accepter 🎉
          </button>
        </div>
      </div>
    )
  }

  if (!configLoaded) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>

  const totalAbons = abonnements.filter(a => a.actif).reduce((s, a) => s + a.montant, 0)
  const maPartAbons = abonnements.filter(a => a.actif).reduce((s, a) => s + a.montant * a.part_damien / 100, 0)

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text)' }}>Compte Joint</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>{config?.nom_owner} & {config?.nom_partner}</p>
        </div>
        <div style={{ ...card, padding: '10px 16px', textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 2 }}>
            {soldeGlobal >= 0 ? `${nomAutre} te doit` : `Tu dois à ${nomAutre}`}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: soldeGlobal >= 0 ? '#10b981' : '#ef4444' }}>
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

      {/* COMMUN */}
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

          {communTab === 'depenses' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <select value={month} onChange={e => setMonth(+e.target.value)} style={{ ...inp, width: 'auto' }}>{MOIS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}</select>
                  <select value={year} onChange={e => setYear(+e.target.value)} style={{ ...inp, width: 'auto' }}>{[2024,2025,2026,2027].map(y => <option key={y}>{y}</option>)}</select>
                </div>
                <button onClick={() => { setEditDep(null); setDepForm(emptyDep()); setShowDepForm(true) }}
                  style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', fontSize: 13 }}>
                  + Dépense
                </button>
              </div>
              {depenses.length === 0
                ? <div style={{ ...card, padding: 40, textAlign: 'center' }}><p style={{ fontSize: 36 }}>💸</p><p style={{ color: 'var(--color-text-muted)', marginTop: 8 }}>Aucune dépense commune ce mois</p></div>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {depenses.map(dep => {
                    const cat = CATS_JOINT.find(c => c.id === dep.categorie)
                    const isCommun = dep.est_joint
                    const maPart = dep.montant * (dep.part_moi || 50) / 100
                    return (
                      <div key={dep.id} style={{ ...card, padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 22 }}>{cat?.icon || '📦'}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dep.libelle}</div>
                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                              {new Date(dep.date).toLocaleDateString('fr-FR')} · {dep.moyen_paiement}
                              {isCommun && <span style={{ marginLeft: 6, padding: '1px 5px', borderRadius: 8, background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: 10, fontWeight: 600 }}>🤝</span>}
                            </div>
                            <div style={{ fontSize: 11, marginTop: 3 }}>
                              <span style={{ color: dep.payeur === monNom ? '#6366f1' : '#ec4899', fontWeight: 500 }}>{dep.payeur} a payé {dep.montant.toFixed(2)} €</span>
                              {!isCommun && <span style={{ color: 'var(--color-text-muted)' }}> · Ta part : {maPart.toFixed(2)} €</span>}
                              {isCommun && <span style={{ color: '#10b981' }}> · Pot commun</span>}
                            </div>
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#ec4899', flexShrink: 0 }}>— {dep.montant.toFixed(2)} €</span>
                          <button onClick={() => { setEditDep(dep); setDepForm({ libelle: dep.libelle, montant: dep.montant, payeur: dep.payeur, moyen_paiement: dep.moyen_paiement, part_moi: dep.part_moi || 50, date: dep.date, categorie: dep.categorie || 'divers', note: dep.note || '', sync_depenses_perso: false }); setShowDepForm(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>✏️</button>
                          <button onClick={async () => { if (!confirm('Supprimer ?')) return; await supabase.from('depenses_joint').delete().eq('id', dep.id); fetchDepenses(); fetchSolde() }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>🗑️</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              }
            </>
          )}

          {communTab === 'abonnements' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: '#f59e0b', fontWeight: 600 }}>— {totalAbons.toFixed(0)} €/mois · ma part : {maPartAbons.toFixed(0)} €</span>
                <button onClick={() => { setEditAbon(null); setAbonForm(emptyAbon()); setShowAbonForm(true) }}
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
                            <div style={{ fontSize: 11, marginTop: 2, color: '#8b5cf6', fontWeight: 500 }}>Ma part : {(a.montant * a.part_damien / 100).toFixed(2)} € · dans {jours}j</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: a.actif ? '#f59e0b' : 'var(--color-text-muted)' }}>— {a.montant.toFixed(2)} €</div>
                            <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>/mois</div>
                          </div>
                          <button onClick={async () => { await supabase.from('abonnements_joint').update({ actif: !a.actif }).eq('id', a.id); fetchAbonnements() }} style={{ position: 'relative', width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', background: a.actif ? '#10b981' : '#475569', flexShrink: 0 }}><span style={{ position: 'absolute', top: 2, width: 16, height: 16, borderRadius: '50%', background: 'white', left: a.actif ? 18 : 2, transition: 'left 0.2s' }} /></button>
                          <button onClick={() => { setEditAbon(a); setAbonForm({ nom: a.nom, montant: a.montant, jour_prelevement: a.jour_prelevement, moyen_paiement: a.moyen_paiement, part_damien: a.part_damien, actif: a.actif, note: a.note || '' }); setShowAbonForm(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>✏️</button>
                          <button onClick={async () => { if (!confirm('Supprimer ?')) return; await supabase.from('abonnements_joint').delete().eq('id', a.id); fetchAbonnements() }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>🗑️</button>
                        </div>
                        {a.actif && <div style={{ marginTop: 8, height: 3, borderRadius: 2, background: 'var(--color-border)' }}><div style={{ height: '100%', borderRadius: 2, background: urgent ? '#ef4444' : '#f59e0b', width: `${Math.max(5, 100 - jours / 31 * 100)}%` }} /></div>}
                      </div>
                    )
                  })}
                </div>
              }
            </>
          )}

          {communTab === 'contributions' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Qui verse quoi sur le compte joint</p>
                <button onClick={() => { setEditContrib(null); setContribForm(emptyContrib()); setShowContribForm(true) }}
                  style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg,#10b981,#06b6d4)', fontSize: 13 }}>
                  + Contribution
                </button>
              </div>
              {contributions.length > 0 && (() => {
                const noms = [config?.nom_owner, config?.nom_partner].filter(Boolean)
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${noms.length + 1},1fr)`, gap: 10, marginBottom: 12 }}>
                    {noms.map(n => (
                      <div key={n} style={{ ...card, padding: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>{n}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#10b981' }}>+ {contributions.filter(c => c.contributeur === n).reduce((s,c) => s+c.montant, 0).toFixed(0)} €</div>
                      </div>
                    ))}
                    <div style={{ ...card, padding: 12, textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>Total</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#6366f1' }}>+ {contributions.reduce((s,c) => s+c.montant, 0).toFixed(0)} €</div>
                    </div>
                  </div>
                )
              })()}
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
                      <button onClick={() => { setEditContrib(c); setContribForm({ contributeur: c.contributeur, montant: c.montant, date: c.date, note: c.note || '' }); setShowContribForm(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>✏️</button>
                      <button onClick={async () => { if (!confirm('Supprimer ?')) return; await supabase.from('contributions_joint').delete().eq('id', c.id); fetchContributions(); fetchSolde() }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>🗑️</button>
                    </div>
                  ))}
                </div>
              }
            </>
          )}
        </>
      )}

      {/* PROJETS */}
      {mainTab === 'projets' && !projetActif && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{projets.length} projet{projets.length !== 1 ? 's' : ''}</p>
            <button onClick={() => { setEditProjet(null); setProjetForm(emptyProjet); setShowProjetForm(true) }}
              style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', fontSize: 13 }}>
              + Projet
            </button>
          </div>
          {projets.length === 0
            ? <div style={{ ...card, padding: 40, textAlign: 'center' }}><p style={{ fontSize: 40, marginBottom: 12 }}>📁</p><p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>Aucun projet</p><p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Appart, Vacances, Voiture...</p></div>
            : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
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
                      <button onClick={() => { setEditProjet(p); setProjetForm({ nom: p.nom, icone: p.icone, couleur: p.couleur, description: p.description || '' }); setShowProjetForm(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>✏️</button>
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
            <button onClick={() => setProjetActif(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--color-text-muted)', padding: '4px 8px' }}>←</button>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: projetActif.couleur + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{projetActif.icone}</div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>{projetActif.nom}</h2>
              {projetActif.description && <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{projetActif.description}</p>}
            </div>
            <button onClick={() => { setEditDepProjet(null); setDepProjetForm(emptyDepProjet()); setShowDepProjetForm(true) }}
              style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: projetActif.couleur, fontSize: 13 }}>
              + Dépense
            </button>
          </div>

          {depensesProjet.length > 0 && (() => {
            const nomOwner = config?.nom_owner || ''
            let s = 0
            depensesProjet.forEach(d => {
              if (d.est_joint) return
              const p = (d.part_moi || 50) / 100
              s += d.payeur === nomOwner ? d.montant * (1 - p) : -d.montant * p
            })
            const solde = isPartner ? -s : s
            const totalMoi = depensesProjet.filter(d => d.payeur === monNom).reduce((s, d) => s + d.montant, 0)
            const totalAutre = depensesProjet.filter(d => d.payeur !== monNom).reduce((s, d) => s + d.montant, 0)
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

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <select value={month} onChange={e => setMonth(+e.target.value)} style={{ ...inp, width: 'auto' }}>{MOIS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}</select>
            <select value={year} onChange={e => setYear(+e.target.value)} style={{ ...inp, width: 'auto' }}>{[2024,2025,2026,2027].map(y => <option key={y}>{y}</option>)}</select>
          </div>

          {depensesProjet.length === 0
            ? <div style={{ ...card, padding: 40, textAlign: 'center' }}><p style={{ fontSize: 32 }}>💸</p><p style={{ color: 'var(--color-text-muted)', marginTop: 8 }}>Aucune dépense ce mois</p></div>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {depensesProjet.map(dep => {
                const isCommun = dep.est_joint
                const jaiPaye = dep.payeur === monNom
                const maPart = dep.montant * (dep.part_moi || 50) / 100
                const partAutre = dep.montant - maPart
                return (
                  <div key={dep.id} style={{ ...card, padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: (jaiPaye ? '#6366f1' : '#ec4899') + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{jaiPaye ? '👤' : '👥'}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dep.libelle}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                          {new Date(dep.date).toLocaleDateString('fr-FR')} · {dep.moyen_paiement}
                          {isCommun && <span style={{ marginLeft: 6, padding: '1px 5px', borderRadius: 8, background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: 10, fontWeight: 600 }}>🤝</span>}
                        </div>
                        <div style={{ fontSize: 11, marginTop: 4 }}>
                          <span style={{ color: jaiPaye ? '#6366f1' : '#ec4899', fontWeight: 500 }}>{dep.payeur} a payé {dep.montant.toFixed(2)} €</span>
                          {!isCommun && <span style={{ color: 'var(--color-text-muted)' }}> · {monNom} : {maPart.toFixed(2)} € · {nomAutre} : {partAutre.toFixed(2)} €</span>}
                          {isCommun && <span style={{ color: '#10b981' }}> · Pot commun</span>}
                        </div>
                        {dep.note && <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 3, fontStyle: 'italic' }}>{dep.note}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button onClick={() => { setEditDepProjet(dep); setDepProjetForm({ libelle: dep.libelle, montant: dep.montant, payeur: dep.payeur, moyen_paiement: dep.moyen_paiement, part_moi: dep.part_moi || 50, date: dep.date, note: dep.note || '', sync_depenses_perso: false }); setShowDepProjetForm(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>✏️</button>
                        <button onClick={async () => { if (!confirm('Supprimer ?')) return; await supabase.from('depenses_projet').delete().eq('id', dep.id); fetchDepensesProjet(); fetchSolde() }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>🗑️</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          }
        </div>
      )}

      {/* PARTAGE */}
      {mainTab === 'partage' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {partage ? (
            <div style={{ ...card, padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 12 }}>Partenaire</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 18 }}>{(config?.nom_partner || 'P')[0]}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>{config?.nom_partner}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{partage.partner_email}</div>
                  <div style={{ fontSize: 12, marginTop: 2 }}>{partage.statut === 'accepte' ? <span style={{ color: '#10b981' }}>✅ Actif</span> : <span style={{ color: '#f59e0b' }}>⏳ En attente</span>}</div>
                </div>
              </div>
              {partage.statut === 'en_attente' && <div style={{ padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 13, color: '#f59e0b', marginBottom: 12 }}>{config?.nom_partner} doit ouvrir Compte Joint sur Optima pour accepter.</div>}
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 10 }}>💡 Configure les noms et emails dans ⚙️ Config</p>
              <button onClick={async () => { if (!confirm('Révoquer ?')) return; await supabase.from('partages_joint').delete().eq('id', partage.id); setPartage(null) }} style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid #ef4444', background: 'transparent', cursor: 'pointer', color: '#ef4444', fontSize: 13, fontWeight: 500 }}>Révoquer l'accès</button>
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

      {/* CONFIG */}
      {mainTab === 'config' && (
        <div style={{ ...card, padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>⚙️ Configuration du compte joint</h3>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>Les emails permettent d'identifier automatiquement qui est qui. Les noms s'affichent dans toute l'interface.</p>
          <form onSubmit={saveConfig} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Identités */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 10, padding: '6px 10px', borderRadius: 8, background: 'rgba(99,102,241,0.1)' }}>👤 Toi (owner)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Ton prénom</label>
                  <input required value={configForm.nom_owner} onChange={e => setConfigForm(f => ({...f, nom_owner: e.target.value}))} placeholder="Damien" style={inp} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Ton email Optima</label>
                  <input type="email" required value={configForm.email_owner} onChange={e => setConfigForm(f => ({...f, email_owner: e.target.value}))} placeholder="damien14220@gmail.com" style={inp} />
                  <div style={{ fontSize: 10, color: '#10b981', marginTop: 3 }}>✓ Détecté : {user.email}</div>
                </div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 10, padding: '6px 10px', borderRadius: 8, background: 'rgba(236,72,153,0.1)' }}>👥 Ton/ta partenaire</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Son prénom</label>
                  <input required value={configForm.nom_partner} onChange={e => setConfigForm(f => ({...f, nom_partner: e.target.value}))} placeholder="Aline" style={inp} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Son email Optima</label>
                  <input type="email" value={configForm.email_partner} onChange={e => setConfigForm(f => ({...f, email_partner: e.target.value}))} placeholder="messages.tdf@hotmail.com" style={inp} />
                </div>
              </div>
            </div>

            {/* Moyens de paiement joint */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 10, padding: '6px 10px', borderRadius: 8, background: 'rgba(16,185,129,0.1)' }}>💳 Moyens de paiement</div>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 10 }}>Ajoute les cartes de chacun. Les moyens communs ne génèrent pas de dette.</p>
              {moyensJointForm.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <select value={m.appartient_a} onChange={e => updateMoyenJoint(i, 'appartient_a', e.target.value)} style={{ ...inp, width: 120 }}>
                    <option value="owner">👤 {configForm.nom_owner || 'Toi'}</option>
                    <option value="partner">👥 {configForm.nom_partner || 'Partenaire'}</option>
                  </select>
                  <input value={m.nom} onChange={e => updateMoyenJoint(i, 'nom', e.target.value)} placeholder="Ex: Carte SG, Revolut..." style={{ ...inp, flex: 1 }} />
                  <button type="button" onClick={() => removeMoyenJoint(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#ef4444' }}>×</button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button type="button" onClick={() => addMoyenJoint('owner')} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px dashed var(--color-border)', background: 'transparent', cursor: 'pointer', fontSize: 12, color: '#6366f1' }}>+ Carte de {configForm.nom_owner || 'toi'}</button>
                <button type="button" onClick={() => addMoyenJoint('partner')} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px dashed var(--color-border)', background: 'transparent', cursor: 'pointer', fontSize: 12, color: '#ec4899' }}>+ Carte de {configForm.nom_partner || 'partenaire'}</button>
              </div>
            </div>

            {/* Moyens communs */}
            {moyensJointForm.filter(m => m.nom).length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 10, padding: '6px 10px', borderRadius: 8, background: 'rgba(16,185,129,0.1)' }}>🤝 Moyens communs (pas de dette)</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {moyensJointForm.filter(m => m.nom).map(m => (
                    <div key={m.nom} onClick={() => toggleMoyenCommun(m.nom)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, cursor: 'pointer', border: configForm.moyens_communs.includes(m.nom) ? '2px solid #10b981' : '1px solid var(--color-border)', background: configForm.moyens_communs.includes(m.nom) ? 'rgba(16,185,129,0.08)' : 'transparent' }}>
                      <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${configForm.moyens_communs.includes(m.nom) ? '#10b981' : 'var(--color-border)'}`, background: configForm.moyens_communs.includes(m.nom) ? '#10b981' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'white', flexShrink: 0 }}>{configForm.moyens_communs.includes(m.nom) && '✓'}</div>
                      <span style={{ fontSize: 13, color: 'var(--color-text)' }}>{m.nom}</span>
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 'auto' }}>{m.appartient_a === 'owner' ? configForm.nom_owner : configForm.nom_partner}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button type="submit" style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', fontSize: 15 }}>
              💾 Sauvegarder
            </button>
          </form>
        </div>
      )}

      {/* FORMS */}
      <FormModal show={showDepForm} onClose={() => { setShowDepForm(false); setEditDep(null) }} title={editDep ? 'Modifier' : 'Dépense commune'} onSubmit={handleSaveDep} color="linear-gradient(135deg,#ec4899,#8b5cf6)" submitLabel={editDep ? 'Modifier' : 'Ajouter'}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Date</label><input type="date" required value={depForm.date} onChange={e => setDepForm(f => ({...f, date: e.target.value}))} style={inp} /></div>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Montant (€)</label><input type="number" step="0.01" min="0" required value={depForm.montant} onChange={e => setDepForm(f => ({...f, montant: e.target.value}))} placeholder="0.00" style={inp} /></div>
        </div>
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Libellé</label><input required value={depForm.libelle} onChange={e => setDepForm(f => ({...f, libelle: e.target.value}))} placeholder="Ex: Courses, Restaurant..." style={inp} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Catégorie</label><select value={depForm.categorie} onChange={e => setDepForm(f => ({...f, categorie: e.target.value}))} style={inp}>{CATS_JOINT.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}</select></div>
          <MoyenSelect form={depForm} setForm={setDepForm} />
        </div>
        {!moyensCommuns.includes(depForm.moyen_paiement) && <PartInput value={depForm.part_moi} onChange={v => setDepForm(f => ({...f, part_moi: v}))} montant={depForm.montant} />}
        {!editDep && !moyensCommuns.includes(depForm.moyen_paiement) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div><div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>Ajouter dans mes dépenses perso</div><div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Catégorie 🤝 Compte Joint</div></div>
            <button type="button" onClick={() => setDepForm(f => ({...f, sync_depenses_perso: !f.sync_depenses_perso}))} style={{ position: 'relative', width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: depForm.sync_depenses_perso ? '#6366f1' : '#475569', flexShrink: 0 }}><span style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.2s', left: depForm.sync_depenses_perso ? 22 : 2 }} /></button>
          </div>
        )}
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Note</label><input value={depForm.note} onChange={e => setDepForm(f => ({...f, note: e.target.value}))} placeholder="Optionnel..." style={inp} /></div>
      </FormModal>

      <FormModal show={showAbonForm} onClose={() => { setShowAbonForm(false); setEditAbon(null) }} title={editAbon ? 'Modifier' : 'Abonnement commun'} onSubmit={handleSaveAbon} color="linear-gradient(135deg,#f59e0b,#ef4444)" submitLabel={editAbon ? 'Modifier' : 'Ajouter'}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Nom</label><input required value={abonForm.nom} onChange={e => setAbonForm(f => ({...f, nom: e.target.value}))} placeholder="Netflix, Loyer..." style={inp} /></div>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Montant (€)</label><input type="number" step="0.01" min="0" required value={abonForm.montant} onChange={e => setAbonForm(f => ({...f, montant: e.target.value}))} placeholder="0.00" style={inp} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Jour prélèvement</label><input type="number" min="1" max="28" required value={abonForm.jour_prelevement} onChange={e => setAbonForm(f => ({...f, jour_prelevement: parseInt(e.target.value)}))} style={inp} /></div>
          <MoyenSelect form={abonForm} setForm={setAbonForm} />
        </div>
        <PartInput value={abonForm.part_damien} onChange={v => setAbonForm(f => ({...f, part_damien: v}))} montant={abonForm.montant} />
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Note</label><input value={abonForm.note} onChange={e => setAbonForm(f => ({...f, note: e.target.value}))} placeholder="Optionnel..." style={inp} /></div>
      </FormModal>

      <FormModal show={showProjetForm} onClose={() => { setShowProjetForm(false); setEditProjet(null) }} title={editProjet ? 'Modifier' : 'Nouveau projet'} onSubmit={handleSaveProjet} color="linear-gradient(135deg,#6366f1,#8b5cf6)" submitLabel={editProjet ? 'Modifier' : 'Créer'}>
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Nom</label><input required value={projetForm.nom} onChange={e => setProjetForm(f => ({...f, nom: e.target.value}))} placeholder="Appart, Vacances..." style={inp} /></div>
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Description</label><input value={projetForm.description} onChange={e => setProjetForm(f => ({...f, description: e.target.value}))} placeholder="Optionnel..." style={inp} /></div>
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Icône</label><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{ICONES_PROJET.map(ic => <button key={ic} type="button" onClick={() => setProjetForm(f => ({...f, icone: ic}))} style={{ width: 38, height: 38, borderRadius: 8, border: projetForm.icone === ic ? '2px solid #6366f1' : '1px solid var(--color-border)', background: projetForm.icone === ic ? '#6366f115' : 'transparent', cursor: 'pointer', fontSize: 20 }}>{ic}</button>)}</div></div>
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Couleur</label><div style={{ display: 'flex', gap: 8 }}>{COULEURS_PROJET.map(c => <button key={c} type="button" onClick={() => setProjetForm(f => ({...f, couleur: c}))} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: c, cursor: 'pointer', outline: projetForm.couleur === c ? `3px solid ${c}` : 'none', outlineOffset: 2 }} />)}</div></div>
      </FormModal>

      <FormModal show={showDepProjetForm} onClose={() => { setShowDepProjetForm(false); setEditDepProjet(null) }} title={editDepProjet ? 'Modifier' : `Dépense — ${projetActif?.nom}`} onSubmit={handleSaveDepProjet} color={projetActif?.couleur || '#6366f1'} submitLabel={editDepProjet ? 'Modifier' : 'Ajouter'}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Date</label><input type="date" required value={depProjetForm.date} onChange={e => setDepProjetForm(f => ({...f, date: e.target.value}))} style={inp} /></div>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Montant (€)</label><input type="number" step="0.01" min="0" required value={depProjetForm.montant} onChange={e => setDepProjetForm(f => ({...f, montant: e.target.value}))} placeholder="0.00" style={inp} /></div>
        </div>
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Libellé</label><input required value={depProjetForm.libelle} onChange={e => setDepProjetForm(f => ({...f, libelle: e.target.value}))} placeholder="Loyer, Ikea..." style={inp} /></div>
        <MoyenSimple form={depProjetForm} setForm={setDepProjetForm} />
        <CompteJointToggle form={depProjetForm} setForm={setDepProjetForm} />
        <PayeurBtn form={depProjetForm} setForm={setDepProjetForm} />
        {!depProjetForm.est_joint && <PartInput value={depProjetForm.part_moi} onChange={v => setDepProjetForm(f => ({...f, part_moi: v}))} montant={depProjetForm.montant} />}
        {!editDepProjet && !depProjetForm.est_joint && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div><div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>Ajouter dans mes dépenses perso</div><div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>🤝 {projetActif?.nom}</div></div>
            <button type="button" onClick={() => setDepProjetForm(f => ({...f, sync_depenses_perso: !f.sync_depenses_perso}))} style={{ position: 'relative', width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: depProjetForm.sync_depenses_perso ? '#6366f1' : '#475569', flexShrink: 0 }}><span style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.2s', left: depProjetForm.sync_depenses_perso ? 22 : 2 }} /></button>
          </div>
        )}
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Note</label><input value={depProjetForm.note} onChange={e => setDepProjetForm(f => ({...f, note: e.target.value}))} placeholder="Optionnel..." style={inp} /></div>
      </FormModal>

      <FormModal show={showContribForm} onClose={() => { setShowContribForm(false); setEditContrib(null) }} title={editContrib ? 'Modifier' : 'Nouvelle contribution'} onSubmit={handleSaveContrib} color="linear-gradient(135deg,#10b981,#06b6d4)" submitLabel={editContrib ? 'Modifier' : 'Ajouter'}>
        <div>
          <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Qui a versé ?</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[[config?.nom_owner, '👤', '#6366f1'], [config?.nom_partner, '👥', '#ec4899']].filter(([n]) => n).map(([nom, icon, color]) => (
              <button key={nom} type="button" onClick={() => setContribForm(f => ({...f, contributeur: nom}))}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: contribForm.contributeur === nom ? 'none' : '1px solid var(--color-border)', background: contribForm.contributeur === nom ? color : 'transparent', color: contribForm.contributeur === nom ? 'white' : 'var(--color-text-muted)', cursor: 'pointer', fontWeight: 500, fontSize: 13 }}>
                {icon} {nom}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Montant (€)</label><input type="number" step="0.01" min="0" required value={contribForm.montant} onChange={e => setContribForm(f => ({...f, montant: e.target.value}))} placeholder="0.00" style={inp} /></div>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Date</label><input type="date" required value={contribForm.date} onChange={e => setContribForm(f => ({...f, date: e.target.value}))} style={inp} /></div>
        </div>
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Note</label><input value={contribForm.note} onChange={e => setContribForm(f => ({...f, note: e.target.value}))} placeholder="Virement du 1er..." style={inp} /></div>
      </FormModal>
    </div>
  )
}
