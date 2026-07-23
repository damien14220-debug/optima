import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useMoyensPaiement } from '../hooks/useMoyensPaiement'
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

const EMPTY_DEP = { libelle: '', montant: '', payeur: '', moyen_paiement: '', part_moi: 50, date: new Date().toISOString().split('T')[0], categorie: 'divers', note: '', sync_depenses_perso: false }
const EMPTY_ABON = { nom: '', montant: '', jour_prelevement: 1, moyen_paiement: '', part_damien: 50, actif: true, note: '' }
const EMPTY_PROJET = { nom: '', icone: '🏠', couleur: '#6366f1', description: '' }
const EMPTY_DEP_PROJET = { libelle: '', montant: '', payeur: '', moyen_paiement: '', part_moi: 50, date: new Date().toISOString().split('T')[0], note: '', sync_depenses_perso: false }
const EMPTY_CONTRIB = { contributeur: '', montant: '', date: new Date().toISOString().split('T')[0], note: '' }

function joursAvant(jour) {
  const now = new Date()
  const t = new Date(now.getFullYear(), now.getMonth(), jour)
  if (t <= now) t.setMonth(t.getMonth() + 1)
  return Math.ceil((t - now) / 86400000)
}

export default function CompteJoint({ user }) {
  // Navigation
  const [mainTab, setMainTab] = useState('commun')
  const [communTab, setCommunTab] = useState('depenses')
  const [projetActif, setProjetActif] = useState(null)

  // Config centrale
  const [config, setConfig] = useState(null) // { nom_owner, nom_partner, moyens_communs }
  const [ownerId, setOwnerId] = useState(user.id)
  const [isPartner, setIsPartner] = useState(false)
  const [partage, setPartage] = useState(null)
  const [invitationRecue, setInvitationRecue] = useState(null)

  // Noms affichés (dépendent de qui regarde)
  const nomMoi = isPartner ? config?.nom_partner || 'Moi' : config?.nom_owner || 'Moi'
  const nomAutre = isPartner ? config?.nom_owner || 'Partenaire' : config?.nom_partner || 'Partenaire'
  const moyensCommuns = config?.moyens_communs || []

  // Données
  const [depenses, setDepenses] = useState([])
  const [abonnements, setAbonnements] = useState([])
  const [projets, setProjets] = useState([])
  const [depensesProjet, setDepensesProjet] = useState([])
  const [contributions, setContributions] = useState([])
  const [soldeGlobal, setSoldeGlobal] = useState(0)

  // Filtres
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

  const [depForm, setDepForm] = useState(EMPTY_DEP)
  const [abonForm, setAbonForm] = useState(EMPTY_ABON)
  const [projetForm, setProjetForm] = useState(EMPTY_PROJET)
  const [depProjetForm, setDepProjetForm] = useState(EMPTY_DEP_PROJET)
  const [contribForm, setContribForm] = useState(EMPTY_CONTRIB)

  // Invit
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteMsg, setInviteMsg] = useState('')

  // Config form
  const [configForm, setConfigForm] = useState({ nom_owner: '', nom_partner: '', moyens_communs: [] })

  const { moyens: moyensDB } = useMoyensPaiement(user.id)
  const MOYENS_DEFAUT = ['Carte SG', 'Carte Trade', 'Espèces', 'Virement']
  const TOUS_MOYENS = [...MOYENS_DEFAUT, ...moyensDB.filter(m => !MOYENS_DEFAUT.includes(m.nom)).map(m => m.nom)]

  useEffect(() => { initPartage() }, [])
  useEffect(() => { if (config) { fetchDepenses(); fetchContributions(); fetchSolde() } }, [month, year, config, ownerId])
  useEffect(() => { if (config && ownerId) { fetchProjets(); fetchAbonnements() } }, [config, ownerId])
  useEffect(() => { if (projetActif) fetchDepensesProjet() }, [projetActif, month, year])

  const initPartage = async () => {
    // Suis-je owner ?
    const { data: owned } = await supabase.from('partages_joint').select('*').eq('owner_id', user.id).maybeSingle()
    if (owned) {
      setPartage(owned)
      setOwnerId(user.id)
      setIsPartner(false)
      await loadConfig(user.id)
      return
    }
    // Suis-je partner ?
    const { data: received } = await supabase.from('partages_joint').select('*').eq('partner_id', user.id).maybeSingle()
    if (received) {
      setInvitationRecue(received)
      if (received.statut === 'accepte') {
        setIsPartner(true)
        setOwnerId(received.owner_id)
        await loadConfig(received.owner_id)
      }
    } else {
      // Pas de partage → init config pour moi
      await loadConfig(user.id)
    }
  }

  const loadConfig = async (uid) => {
    const { data } = await supabase.from('config_joint').select('*').eq('owner_id', uid).maybeSingle()
    if (data) {
      setConfig(data)
      setConfigForm({ nom_owner: data.nom_owner, nom_partner: data.nom_partner, moyens_communs: data.moyens_communs || [] })
    } else {
      // Créer config par défaut
      const def = { owner_id: uid, nom_owner: 'Moi', nom_partner: 'Partenaire', moyens_communs: [] }
      await supabase.from('config_joint').insert(def)
      setConfig(def)
      setConfigForm({ nom_owner: 'Moi', nom_partner: 'Partenaire', moyens_communs: [] })
    }
  }

  const saveConfig = async (e) => {
    e.preventDefault()
    await supabase.from('config_joint').update({
      nom_owner: configForm.nom_owner,
      nom_partner: configForm.nom_partner,
      moyens_communs: configForm.moyens_communs,
    }).eq('owner_id', ownerId)
    setConfig(prev => ({ ...prev, ...configForm }))
    alert('Configuration sauvegardée !')
  }

  const toggleMoyenCommun = (nom) => {
    setConfigForm(f => ({
      ...f,
      moyens_communs: f.moyens_communs.includes(nom)
        ? f.moyens_communs.filter(m => m !== nom)
        : [...f.moyens_communs, nom]
    }))
  }

  const fetchDepenses = async () => {
    const start = `${year}-${String(month).padStart(2,'0')}-01`
    const end = new Date(year, month, 0).toISOString().split('T')[0]
    const { data, error } = await supabase.from('depenses_joint').select('*')
      .eq('user_id', ownerId).gte('date', start).lte('date', end).order('date', { ascending: false })
    if (!error) setDepenses(data || [])
  }

  const fetchAbonnements = async () => {
    const { data } = await supabase.from('abonnements_joint').select('*').eq('user_id', ownerId).order('jour_prelevement')
    setAbonnements(data || [])
  }

  const fetchProjets = async () => {
    const { data } = await supabase.from('projets_joint').select('*').eq('owner_id', ownerId).order('created_at')
    setProjets(data || [])
  }

  const fetchDepensesProjet = async () => {
    if (!projetActif) return
    const start = `${year}-${String(month).padStart(2,'0')}-01`
    const end = new Date(year, month, 0).toISOString().split('T')[0]
    const { data } = await supabase.from('depenses_projet').select('*')
      .eq('projet_id', projetActif.id).gte('date', start).lte('date', end).order('date', { ascending: false })
    setDepensesProjet(data || [])
  }

  const fetchContributions = async () => {
    const { data } = await supabase.from('contributions_joint').select('*')
      .eq('user_id', ownerId).order('date', { ascending: false })
    setContributions(data || [])
  }

  const calcSolde = (deps, depProj, contribs) => {
    let s = 0
    // Dépenses communes sur moyens perso uniquement
    ;(deps || []).forEach(d => {
      if ((moyensCommuns || []).includes(d.moyen_paiement)) return
      const p = (d.part_moi || 50) / 100
      // payeur = nom_owner ou nom_partner
      const jaiPaye = d.payeur === (config?.nom_owner || 'Moi')
      s += jaiPaye ? d.montant * (1 - p) : -d.montant * p
    })
    // Dépenses projets sur moyens perso
    ;(depProj || []).forEach(d => {
      if ((moyensCommuns || []).includes(d.moyen_paiement)) return
      const p = (d.part_moi || 50) / 100
      const jaiPaye = d.payeur === (config?.nom_owner || 'Moi')
      s += jaiPaye ? d.montant * (1 - p) : -d.montant * p
    })
    // Contributions : si owner a versé → partner lui doit; si partner a versé → owner lui doit
    ;(contribs || []).forEach(c => {
      const ownerAVerse = c.contributeur === (config?.nom_owner || 'Moi')
      s += ownerAVerse ? c.montant : -c.montant
    })
    return isPartner ? -s : s
  }

  const fetchSolde = async () => {
    const [{ data: deps }, { data: depProj }, { data: contribs }] = await Promise.all([
      supabase.from('depenses_joint').select('montant,payeur,part_moi,moyen_paiement').eq('user_id', ownerId),
      supabase.from('depenses_projet').select('montant,payeur,part_moi,moyen_paiement').eq('owner_id', ownerId),
      supabase.from('contributions_joint').select('montant,contributeur').eq('user_id', ownerId),
    ])
    setSoldeGlobal(calcSolde(deps, depProj, contribs))
  }

  const handleSaveDep = async (e) => {
    e.preventDefault()
    const payload = {
      libelle: depForm.libelle,
      montant: parseFloat(depForm.montant),
      payeur: depForm.payeur,
      moyen_paiement: depForm.moyen_paiement,
      part_moi: parseFloat(depForm.part_moi),
      date: depForm.date,
      categorie: depForm.categorie,
      note: depForm.note,
      sync_depenses_perso: depForm.sync_depenses_perso,
      user_id: ownerId,
    }
    if (editDep) {
      await supabase.from('depenses_joint').update(payload).eq('id', editDep.id)
    } else {
      const { error } = await supabase.from('depenses_joint').insert(payload)
      if (error) { alert('Erreur : ' + error.message); return }
      // Sync perso si c'est moi qui ai payé avec un moyen perso
      const jaiPaye = depForm.payeur === (isPartner ? config?.nom_partner : config?.nom_owner)
      if (jaiPaye && depForm.sync_depenses_perso && !moyensCommuns.includes(depForm.moyen_paiement)) {
        await supabase.from('depenses').insert({
          user_id: user.id, date: depForm.date, montant: parseFloat(depForm.montant),
          libelle: `🤝 ${depForm.libelle}`, categorie: 'joint',
          moyen_paiement: depForm.moyen_paiement, is_joint: true,
        })
      }
    }
    setShowDepForm(false); setEditDep(null); setDepForm(EMPTY_DEP); fetchDepenses(); fetchSolde()
  }

  const handleSaveAbon = async (e) => {
    e.preventDefault()
    const payload = { ...abonForm, montant: parseFloat(abonForm.montant), part_damien: parseFloat(abonForm.part_damien), user_id: ownerId }
    if (editAbon) await supabase.from('abonnements_joint').update(payload).eq('id', editAbon.id)
    else await supabase.from('abonnements_joint').insert(payload)
    setShowAbonForm(false); setEditAbon(null); setAbonForm(EMPTY_ABON); fetchAbonnements()
  }

  const handleSaveProjet = async (e) => {
    e.preventDefault()
    const payload = { ...projetForm, owner_id: ownerId }
    if (editProjet) await supabase.from('projets_joint').update(payload).eq('id', editProjet.id)
    else await supabase.from('projets_joint').insert(payload)
    setShowProjetForm(false); setEditProjet(null); setProjetForm(EMPTY_PROJET); fetchProjets()
  }

  const handleSaveDepProjet = async (e) => {
    e.preventDefault()
    const payload = {
      libelle: depProjetForm.libelle, montant: parseFloat(depProjetForm.montant),
      payeur: depProjetForm.payeur, moyen_paiement: depProjetForm.moyen_paiement,
      part_moi: parseFloat(depProjetForm.part_moi), date: depProjetForm.date,
      note: depProjetForm.note, projet_id: projetActif.id, owner_id: ownerId,
    }
    if (editDepProjet) {
      await supabase.from('depenses_projet').update(payload).eq('id', editDepProjet.id)
    } else {
      const { error } = await supabase.from('depenses_projet').insert(payload)
      if (error) { alert('Erreur : ' + error.message); return }
      const jaiPaye = depProjetForm.payeur === (isPartner ? config?.nom_partner : config?.nom_owner)
      if (jaiPaye && depProjetForm.sync_depenses_perso) {
        await supabase.from('depenses').insert({
          user_id: user.id, date: depProjetForm.date, montant: parseFloat(depProjetForm.montant),
          libelle: `🤝 ${projetActif.nom} — ${depProjetForm.libelle}`, categorie: 'joint',
          moyen_paiement: depProjetForm.moyen_paiement, is_joint: true,
        })
      }
    }
    setShowDepProjetForm(false); setEditDepProjet(null); setDepProjetForm(EMPTY_DEP_PROJET); fetchDepensesProjet(); fetchSolde()
  }

  const handleSaveContrib = async (e) => {
    e.preventDefault()
    const payload = { ...contribForm, montant: parseFloat(contribForm.montant), user_id: ownerId }
    if (editContrib) await supabase.from('contributions_joint').update(payload).eq('id', editContrib.id)
    else await supabase.from('contributions_joint').insert(payload)
    setShowContribForm(false); setEditContrib(null); setContribForm(EMPTY_CONTRIB); fetchContributions(); fetchSolde()
  }

  const openDepForm = () => {
    const monNom = isPartner ? config?.nom_partner : config?.nom_owner
    setDepForm({ ...EMPTY_DEP, payeur: monNom || '', moyen_paiement: TOUS_MOYENS[0] || '' })
    setEditDep(null); setShowDepForm(true)
  }

  const openAbonForm = () => {
    setAbonForm({ ...EMPTY_ABON, moyen_paiement: TOUS_MOYENS[0] || '' })
    setEditAbon(null); setShowAbonForm(true)
  }

  const openDepProjetForm = () => {
    const monNom = isPartner ? config?.nom_partner : config?.nom_owner
    setDepProjetForm({ ...EMPTY_DEP_PROJET, payeur: monNom || '', moyen_paiement: TOUS_MOYENS[0] || '' })
    setEditDepProjet(null); setShowDepProjetForm(true)
  }

  const openContribForm = () => {
    const monNom = isPartner ? config?.nom_partner : config?.nom_owner
    setContribForm({ ...EMPTY_CONTRIB, contributeur: monNom || '' })
    setEditContrib(null); setShowContribForm(true)
  }

  const inp = { width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 14, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }
  const card = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16 }

  const PayeurBtn = ({ form, setForm, field = 'payeur' }) => (
    <div>
      <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Qui a payé ?</label>
      <div style={{ display: 'flex', gap: 8 }}>
        {[
          [isPartner ? config?.nom_partner : config?.nom_owner, '👤', '#6366f1'],
          [isPartner ? config?.nom_owner : config?.nom_partner, '👥', '#ec4899'],
        ].map(([nom, icon, color]) => (
          <button key={nom} type="button" onClick={() => setForm(f => ({...f, [field]: nom}))}
            style={{ flex: 1, padding: '10px', borderRadius: 10, border: form[field] === nom ? 'none' : '1px solid var(--color-border)', background: form[field] === nom ? color : 'transparent', color: form[field] === nom ? 'white' : 'var(--color-text-muted)', cursor: 'pointer', fontWeight: 500, fontSize: 13 }}>
            {icon} {nom || '?'}
          </button>
        ))}
      </div>
    </div>
  )

  const MoyenSelect = ({ form, setForm }) => (
    <div>
      <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Moyen de paiement</label>
      <select value={form.moyen_paiement} onChange={e => setForm(f => ({...f, moyen_paiement: e.target.value}))} style={inp}>
        {moyensCommuns.length > 0 && (
          <optgroup label="🤝 Communs">
            {moyensCommuns.map(m => <option key={m}>{m}</option>)}
          </optgroup>
        )}
        <optgroup label="Perso">
          {TOUS_MOYENS.filter(m => !moyensCommuns.includes(m)).map(m => <option key={m}>{m}</option>)}
        </optgroup>
      </select>
      {moyensCommuns.includes(form.moyen_paiement) && (
        <div style={{ marginTop: 6, fontSize: 11, padding: '4px 8px', borderRadius: 6, background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
          🤝 Moyen commun — pas de dette générée
        </div>
      )}
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

  const totalAbons = abonnements.filter(a => a.actif).reduce((s, a) => s + a.montant, 0)
  const maPartAbons = abonnements.filter(a => a.actif).reduce((s, a) => s + a.montant * a.part_damien / 100, 0)

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: '0 auto' }}>
      {/* Header solde */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text)' }}>Compte Joint</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>
            {config?.nom_owner} & {config?.nom_partner}
          </p>
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

      {/* Tabs principaux */}
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

          {communTab === 'depenses' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <select value={month} onChange={e => setMonth(+e.target.value)} style={{ ...inp, width: 'auto' }}>{MOIS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}</select>
                  <select value={year} onChange={e => setYear(+e.target.value)} style={{ ...inp, width: 'auto' }}>{[2024,2025,2026,2027].map(y => <option key={y}>{y}</option>)}</select>
                </div>
                <button onClick={openDepForm} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', fontSize: 13 }}>+ Dépense</button>
              </div>
              {depenses.length === 0
                ? <div style={{ ...card, padding: 40, textAlign: 'center' }}><p style={{ fontSize: 36 }}>💸</p><p style={{ color: 'var(--color-text-muted)', marginTop: 8 }}>Aucune dépense commune ce mois</p></div>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {depenses.map(dep => {
                    const cat = CATS_JOINT.find(c => c.id === dep.categorie)
                    const isCommun = moyensCommuns.includes(dep.moyen_paiement)
                    const jaiPaye = dep.payeur === (isPartner ? config?.nom_partner : config?.nom_owner)
                    const maPart = dep.montant * (dep.part_moi || 50) / 100
                    return (
                      <div key={dep.id} style={{ ...card, padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 22 }}>{cat?.icon || '📦'}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dep.libelle}</div>
                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                              {new Date(dep.date).toLocaleDateString('fr-FR')} · {dep.moyen_paiement}
                              {isCommun && <span style={{ marginLeft: 6, padding: '1px 5px', borderRadius: 8, background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: 10, fontWeight: 600 }}>🤝 Commun</span>}
                            </div>
                            <div style={{ fontSize: 11, marginTop: 3 }}>
                              <span style={{ color: jaiPaye ? '#6366f1' : '#ec4899', fontWeight: 500 }}>{dep.payeur} a payé {dep.montant.toFixed(2)} €</span>
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
                <button onClick={openAbonForm} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg,#f59e0b,#ef4444)', fontSize: 13 }}>+ Abonnement</button>
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
                <button onClick={openContribForm} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg,#10b981,#06b6d4)', fontSize: 13 }}>+ Contribution</button>
              </div>
              {contributions.length > 0 && (() => {
                const totaux = [config?.nom_owner, config?.nom_partner].map(nom => ({
                  nom, total: contributions.filter(c => c.contributeur === nom).reduce((s, c) => s + c.montant, 0)
                }))
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                    {totaux.map(t => (
                      <div key={t.nom} style={{ ...card, padding: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>{t.nom}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#10b981' }}>+ {t.total.toFixed(0)} €</div>
                      </div>
                    ))}
                    <div style={{ ...card, padding: 12, textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>Total</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#6366f1' }}>+ {contributions.reduce((s,c) => s+c.montant, 0).toFixed(0)} €</div>
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

      {/* ── PROJETS ── */}
      {mainTab === 'projets' && !projetActif && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{projets.length} projet{projets.length !== 1 ? 's' : ''}</p>
            <button onClick={() => { setEditProjet(null); setProjetForm(EMPTY_PROJET); setShowProjetForm(true) }} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', fontSize: 13 }}>+ Projet</button>
          </div>
          {projets.length === 0
            ? <div style={{ ...card, padding: 40, textAlign: 'center' }}><p style={{ fontSize: 40, marginBottom: 12 }}>📁</p><p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>Aucun projet</p><p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Crée un projet pour suivre vos dépenses : Appart, Vacances...</p></div>
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
            <button onClick={openDepProjetForm} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: projetActif.couleur, fontSize: 13 }}>+ Dépense</button>
          </div>

          {depensesProjet.length > 0 && (() => {
            let s = 0
            depensesProjet.forEach(d => {
              if (moyensCommuns.includes(d.moyen_paiement)) return
              const p = (d.part_moi || 50) / 100
              const jaiPaye = d.payeur === (isPartner ? config?.nom_partner : config?.nom_owner)
              s += jaiPaye ? d.montant * (1 - p) : -d.montant * p
            })
            const solde = isPartner ? -s : s
            const totalMoi = depensesProjet.filter(d => d.payeur === (isPartner ? config?.nom_partner : config?.nom_owner)).reduce((s, d) => s + d.montant, 0)
            const totalAutre = depensesProjet.filter(d => d.payeur !== (isPartner ? config?.nom_partner : config?.nom_owner)).reduce((s, d) => s + d.montant, 0)
            return (
              <div style={{ ...card, padding: 16, borderLeft: `4px solid ${projetActif.couleur}` }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 10 }}>
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>Tu as payé</div><div style={{ fontSize: 15, fontWeight: 700, color: '#6366f1' }}>{totalMoi.toFixed(0)} €</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>{nomAutre} a payé</div><div style={{ fontSize: 15, fontWeight: 700, color: '#ec4899' }}>{totalAutre.toFixed(0)} €</div></div>
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
                const isCommun = moyensCommuns.includes(dep.moyen_paiement)
                const jaiPaye = dep.payeur === (isPartner ? config?.nom_partner : config?.nom_owner)
                const maPart = dep.montant * (dep.part_moi || 50) / 100
                const partAutre = dep.montant * (1 - (dep.part_moi || 50) / 100)
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
                          {!isCommun && <span style={{ color: 'var(--color-text-muted)' }}> · Ta part : {maPart.toFixed(2)} € · {nomAutre} : {partAutre.toFixed(2)} €</span>}
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

      {/* ── PARTAGE ── */}
      {mainTab === 'partage' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {partage ? (
            <div style={{ ...card, padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 12 }}>Partenaire</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 18 }}>{(config?.nom_partner || 'P')[0]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>{config?.nom_partner}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{partage.partner_email}</div>
                  <div style={{ fontSize: 12, marginTop: 2 }}>{partage.statut === 'accepte' ? <span style={{ color: '#10b981' }}>✅ Actif</span> : <span style={{ color: '#f59e0b' }}>⏳ En attente</span>}</div>
                </div>
              </div>
              {partage.statut === 'en_attente' && <div style={{ padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 13, color: '#f59e0b', marginBottom: 12 }}>{config?.nom_partner} doit se connecter sur Optima et ouvrir Compte Joint pour accepter.</div>}
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 10 }}>💡 Pour changer les noms, va dans l'onglet ⚙️ Config</p>
              <button onClick={async () => { if (!confirm('Révoquer ?')) return; await supabase.from('partages_joint').delete().eq('id', partage.id); setPartage(null) }} style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid #ef4444', background: 'transparent', cursor: 'pointer', color: '#ef4444', fontSize: 13, fontWeight: 500 }}>Révoquer l'accès</button>
            </div>
          ) : isPartner ? (
            <div style={{ ...card, padding: 20, textAlign: 'center' }}><p style={{ fontSize: 32, marginBottom: 8 }}>✅</p><p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>Compte joint actif</p><p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>💡 Pour changer le nom affiché pour ton partenaire, va dans ⚙️ Config</p></div>
          ) : (
            <div style={{ ...card, padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>Inviter un partenaire</h3>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>Il/elle devra créer un compte sur Optima puis accepter l'invitation ici.</p>
              {inviteMsg && <div style={{ padding: 10, borderRadius: 8, background: inviteMsg.startsWith('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${inviteMsg.startsWith('✅') ? '#10b981' : '#ef4444'}`, color: inviteMsg.startsWith('✅') ? '#10b981' : '#ef4444', fontSize: 13, marginBottom: 12 }}>{inviteMsg}</div>}
              <form onSubmit={async (e) => { e.preventDefault(); const { error } = await supabase.from('partages_joint').insert({ owner_id: user.id, partner_email: inviteEmail, statut: 'en_attente' }); if (error) setInviteMsg('Erreur : ' + error.message); else { setInviteMsg('✅ Invitation créée !'); setInviteEmail(''); initPartage() } }} style={{ display: 'flex', gap: 8 }}>
                <input type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="email@partenaire.fr" style={{ ...inp, flex: 1 }} />
                <button type="submit" style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg,#ec4899,#8b5cf6)' }}>Inviter</button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ── CONFIG ── */}
      {mainTab === 'config' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ ...card, padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>⚙️ Configuration du compte joint</h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>Définis les prénoms et les moyens de paiement communs. Ces infos s'affichent pour vous deux.</p>
            <form onSubmit={saveConfig} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>👤 Ton prénom (owner)</label>
                  <input required value={configForm.nom_owner} onChange={e => setConfigForm(f => ({...f, nom_owner: e.target.value}))} placeholder="Damien" style={inp} />
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>C'est toi, celui qui a créé le compte joint</div>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>👥 Prénom de ton/ta partenaire</label>
                  <input required value={configForm.nom_partner} onChange={e => setConfigForm(f => ({...f, nom_partner: e.target.value}))} placeholder="Aline" style={inp} />
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>La personne invitée sur le compte joint</div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: 8 }}>🤝 Moyens de paiement communs</label>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 10 }}>Coche les moyens partagés entre vous. Les dépenses payées avec ces moyens ne génèrent pas de dette.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {TOUS_MOYENS.map(nom => (
                    <div key={nom} onClick={() => toggleMoyenCommun(nom)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, cursor: 'pointer', border: configForm.moyens_communs.includes(nom) ? '2px solid #10b981' : '1px solid var(--color-border)', background: configForm.moyens_communs.includes(nom) ? 'rgba(16,185,129,0.08)' : 'var(--color-bg)', transition: 'all 0.15s' }}>
                      <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${configForm.moyens_communs.includes(nom) ? '#10b981' : 'var(--color-border)'}`, background: configForm.moyens_communs.includes(nom) ? '#10b981' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, color: 'white' }}>
                        {configForm.moyens_communs.includes(nom) && '✓'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>{nom}</div>
                        {configForm.moyens_communs.includes(nom) && <div style={{ fontSize: 11, color: '#10b981' }}>Commun — pas de dette</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', fontSize: 15 }}>
                💾 Sauvegarder la configuration
              </button>
            </form>
          </div>
        </div>
      )}

      {/* FORMS */}
      <FormModal show={showDepForm} onClose={() => { setShowDepForm(false); setEditDep(null) }} title={editDep ? 'Modifier la dépense' : 'Dépense commune'} onSubmit={handleSaveDep} color="linear-gradient(135deg,#ec4899,#8b5cf6)" submitLabel={editDep ? 'Modifier' : 'Ajouter'}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Date</label><input type="date" required value={depForm.date} onChange={e => setDepForm(f => ({...f, date: e.target.value}))} style={inp} /></div>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Montant (€)</label><input type="number" step="0.01" min="0" required value={depForm.montant} onChange={e => setDepForm(f => ({...f, montant: e.target.value}))} placeholder="0.00" style={inp} /></div>
        </div>
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Libellé</label><input required value={depForm.libelle} onChange={e => setDepForm(f => ({...f, libelle: e.target.value}))} placeholder="Ex: Courses, Restaurant..." style={inp} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Catégorie</label><select value={depForm.categorie} onChange={e => setDepForm(f => ({...f, categorie: e.target.value}))} style={inp}>{CATS_JOINT.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}</select></div>
          <MoyenSelect form={depForm} setForm={setDepForm} />
        </div>
        <PayeurBtn form={depForm} setForm={setDepForm} />
        {!moyensCommuns.includes(depForm.moyen_paiement) && <PartInput value={depForm.part_moi} onChange={v => setDepForm(f => ({...f, part_moi: v}))} montant={depForm.montant} />}
        {!editDep && !moyensCommuns.includes(depForm.moyen_paiement) && depForm.payeur === (isPartner ? config?.nom_partner : config?.nom_owner) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div><div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>Ajouter dans mes dépenses perso</div><div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Catégorie "🤝 Compte Joint"</div></div>
            <button type="button" onClick={() => setDepForm(f => ({...f, sync_depenses_perso: !f.sync_depenses_perso}))} style={{ position: 'relative', width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: depForm.sync_depenses_perso ? '#6366f1' : '#475569', flexShrink: 0 }}><span style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.2s', left: depForm.sync_depenses_perso ? 22 : 2 }} /></button>
          </div>
        )}
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Note</label><input value={depForm.note} onChange={e => setDepForm(f => ({...f, note: e.target.value}))} placeholder="Optionnel..." style={inp} /></div>
      </FormModal>

      <FormModal show={showAbonForm} onClose={() => { setShowAbonForm(false); setEditAbon(null) }} title={editAbon ? 'Modifier' : 'Nouvel abonnement commun'} onSubmit={handleSaveAbon} color="linear-gradient(135deg,#f59e0b,#ef4444)" submitLabel={editAbon ? 'Modifier' : 'Ajouter'}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Nom</label><input required value={abonForm.nom} onChange={e => setAbonForm(f => ({...f, nom: e.target.value}))} placeholder="Ex: Netflix, Loyer..." style={inp} /></div>
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
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Nom</label><input required value={projetForm.nom} onChange={e => setProjetForm(f => ({...f, nom: e.target.value}))} placeholder="Ex: Appart, Vacances..." style={inp} /></div>
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Description</label><input value={projetForm.description} onChange={e => setProjetForm(f => ({...f, description: e.target.value}))} placeholder="Optionnel..." style={inp} /></div>
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Icône</label><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{ICONES_PROJET.map(ic => <button key={ic} type="button" onClick={() => setProjetForm(f => ({...f, icone: ic}))} style={{ width: 38, height: 38, borderRadius: 8, border: projetForm.icone === ic ? '2px solid #6366f1' : '1px solid var(--color-border)', background: projetForm.icone === ic ? '#6366f115' : 'transparent', cursor: 'pointer', fontSize: 20 }}>{ic}</button>)}</div></div>
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Couleur</label><div style={{ display: 'flex', gap: 8 }}>{COULEURS_PROJET.map(c => <button key={c} type="button" onClick={() => setProjetForm(f => ({...f, couleur: c}))} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: c, cursor: 'pointer', outline: projetForm.couleur === c ? `3px solid ${c}` : 'none', outlineOffset: 2 }} />)}</div></div>
      </FormModal>

      <FormModal show={showDepProjetForm} onClose={() => { setShowDepProjetForm(false); setEditDepProjet(null) }} title={editDepProjet ? 'Modifier' : `Dépense — ${projetActif?.nom}`} onSubmit={handleSaveDepProjet} color={projetActif?.couleur || '#6366f1'} submitLabel={editDepProjet ? 'Modifier' : 'Ajouter'}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Date</label><input type="date" required value={depProjetForm.date} onChange={e => setDepProjetForm(f => ({...f, date: e.target.value}))} style={inp} /></div>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Montant (€)</label><input type="number" step="0.01" min="0" required value={depProjetForm.montant} onChange={e => setDepProjetForm(f => ({...f, montant: e.target.value}))} placeholder="0.00" style={inp} /></div>
        </div>
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Libellé</label><input required value={depProjetForm.libelle} onChange={e => setDepProjetForm(f => ({...f, libelle: e.target.value}))} placeholder="Ex: Loyer, Ikea..." style={inp} /></div>
        <MoyenSelect form={depProjetForm} setForm={setDepProjetForm} />
        <PayeurBtn form={depProjetForm} setForm={setDepProjetForm} />
        {!moyensCommuns.includes(depProjetForm.moyen_paiement) && <PartInput value={depProjetForm.part_moi} onChange={v => setDepProjetForm(f => ({...f, part_moi: v}))} montant={depProjetForm.montant} />}
        {!editDepProjet && !moyensCommuns.includes(depProjetForm.moyen_paiement) && depProjetForm.payeur === (isPartner ? config?.nom_partner : config?.nom_owner) && (
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
            {[config?.nom_owner, config?.nom_partner].filter(Boolean).map((nom, i) => (
              <button key={nom} type="button" onClick={() => setContribForm(f => ({...f, contributeur: nom}))}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: contribForm.contributeur === nom ? 'none' : '1px solid var(--color-border)', background: contribForm.contributeur === nom ? (i === 0 ? '#6366f1' : '#ec4899') : 'transparent', color: contribForm.contributeur === nom ? 'white' : 'var(--color-text-muted)', cursor: 'pointer', fontWeight: 500, fontSize: 13 }}>
                {i === 0 ? '👤' : '👥'} {nom}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Montant (€)</label><input type="number" step="0.01" min="0" required value={contribForm.montant} onChange={e => setContribForm(f => ({...f, montant: e.target.value}))} placeholder="0.00" style={inp} /></div>
          <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Date</label><input type="date" required value={contribForm.date} onChange={e => setContribForm(f => ({...f, date: e.target.value}))} style={inp} /></div>
        </div>
        <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Note</label><input value={contribForm.note} onChange={e => setContribForm(f => ({...f, note: e.target.value}))} placeholder="Ex: Virement du 1er..." style={inp} /></div>
      </FormModal>
    </div>
  )
}
