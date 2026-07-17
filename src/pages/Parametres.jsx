import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const ICONES_CAT = ['🚗','🏍️','🚌','📱','💻','🎵','🎬','🏥','🛒','🍕','🎉','✈️','🏠','💡','📦','🎓','💪','🐶','👗','⚽','🎮','📚','💈','🧴','🔧','💰','🏦','📋','🤝','👩']
const ICONES_PAY = ['💳','💵','🔄','📲','🏦','💶','💸','🪙','📱','💎']
const TYPES_PAY = [{ id: 'carte', label: 'Carte bancaire' }, { id: 'especes', label: 'Espèces' }, { id: 'virement', label: 'Virement' }, { id: 'autre', label: 'Autre' }]
const COULEURS = ['#6366f1','#8b5cf6','#e11d48','#7c3aed','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#0284c7','#16a34a','#94a3b8']

const CATEGORIES_DEFAUT = [
  { nom: 'Transport', icone: '🚗', couleur: '#6366f1' },
  { nom: 'Abonnements', icone: '📱', couleur: '#8b5cf6' },
  { nom: 'Hygiène', icone: '🧴', couleur: '#06b6d4' },
  { nom: 'Santé', icone: '🏥', couleur: '#10b981' },
  { nom: 'Loisirs / Sorties', icone: '🎉', couleur: '#f59e0b' },
  { nom: 'Courses', icone: '🛒', couleur: '#84cc16' },
  { nom: 'Divers', icone: '📦', couleur: '#94a3b8' },
]

const MOYENS_DEFAUT = [
  { nom: 'Carte SG', type: 'carte', icone: '💳', couleur: '#e11d48' },
  { nom: 'Carte Trade', type: 'carte', icone: '💳', couleur: '#7c3aed' },
  { nom: 'Espèces', type: 'especes', icone: '💵', couleur: '#16a34a' },
  { nom: 'Virement', type: 'virement', icone: '🔄', couleur: '#0284c7' },
]

export default function Parametres({ user, darkMode, setDarkMode }) {
  const [tab, setTab] = useState('compte')
  const [categories, setCategories] = useState([])
  const [abonnements, setAbonnements] = useState([])
  const [moyens, setMoyens] = useState([])
  const [showCatForm, setShowCatForm] = useState(false)
  const [showAbonForm, setShowAbonForm] = useState(false)
  const [showMoyenForm, setShowMoyenForm] = useState(false)
  const [editCat, setEditCat] = useState(null)
  const [editAbon, setEditAbon] = useState(null)
  const [editMoyen, setEditMoyen] = useState(null)

  const [catForm, setCatForm] = useState({ nom: '', icone: '📦', couleur: '#6366f1' })
  const [abonForm, setAbonForm] = useState({ nom: '', montant: '', jour_prelevement: 1, moyen_paiement: 'Carte SG', categorie: 'abonnements', actif: true, note: '' })
  const [moyenForm, setMoyenForm] = useState({ nom: '', type: 'carte', icone: '💳', couleur: '#6366f1', actif: true })

  useEffect(() => { fetchCategories(); fetchAbonnements(); fetchMoyens() }, [])

  const fetchCategories = async () => { const { data } = await supabase.from('categories').select('*').eq('user_id', user.id).order('ordre'); setCategories(data || []) }
  const fetchAbonnements = async () => { const { data } = await supabase.from('abonnements').select('*').eq('user_id', user.id).order('jour_prelevement'); setAbonnements(data || []) }
  const fetchMoyens = async () => { const { data } = await supabase.from('moyens_paiement').select('*').eq('user_id', user.id).order('ordre'); setMoyens(data || []) }

  const handleSaveCat = async (e) => {
    e.preventDefault()
    const payload = { ...catForm, user_id: user.id, ordre: categories.length }
    if (editCat) await supabase.from('categories').update(payload).eq('id', editCat.id)
    else await supabase.from('categories').insert(payload)
    setShowCatForm(false); setEditCat(null); setCatForm({ nom: '', icone: '📦', couleur: '#6366f1' }); fetchCategories()
  }

  const handleSaveAbon = async (e) => {
    e.preventDefault()
    const payload = { ...abonForm, montant: parseFloat(abonForm.montant), user_id: user.id }
    if (editAbon) await supabase.from('abonnements').update(payload).eq('id', editAbon.id)
    else await supabase.from('abonnements').insert(payload)
    setShowAbonForm(false); setEditAbon(null); setAbonForm({ nom: '', montant: '', jour_prelevement: 1, moyen_paiement: 'Carte SG', categorie: 'abonnements', actif: true, note: '' }); fetchAbonnements()
  }

  const handleSaveMoyen = async (e) => {
    e.preventDefault()
    const payload = { ...moyenForm, user_id: user.id, ordre: moyens.length }
    if (editMoyen) await supabase.from('moyens_paiement').update(payload).eq('id', editMoyen.id)
    else await supabase.from('moyens_paiement').insert(payload)
    setShowMoyenForm(false); setEditMoyen(null); setMoyenForm({ nom: '', type: 'carte', icone: '💳', couleur: '#6366f1', actif: true }); fetchMoyens()
  }

  const handleDeleteCat = async (id) => { if (!confirm('Supprimer ?')) return; await supabase.from('categories').delete().eq('id', id); fetchCategories() }
  const handleDeleteAbon = async (id) => { if (!confirm('Supprimer ?')) return; await supabase.from('abonnements').delete().eq('id', id); fetchAbonnements() }
  const handleDeleteMoyen = async (id) => { if (!confirm('Supprimer ?')) return; await supabase.from('moyens_paiement').delete().eq('id', id); fetchMoyens() }
  const handleToggleAbon = async (a) => { await supabase.from('abonnements').update({ actif: !a.actif }).eq('id', a.id); fetchAbonnements() }
  const handleToggleMoyen = async (m) => { await supabase.from('moyens_paiement').update({ actif: !m.actif }).eq('id', m.id); fetchMoyens() }
  const handleLogout = async () => { await supabase.auth.signOut() }

  const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 14, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }
  const cardStyle = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16 }
  const totalAbonnements = abonnements.filter(a => a.actif).reduce((s, a) => s + a.montant, 0)
  const allMoyens = moyens.length > 0 ? moyens : MOYENS_DEFAUT

  return (
    <div style={{ padding: 16, maxWidth: 700, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text)', marginBottom: 16 }}>Paramètres</h1>

      {/* Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: 4, borderRadius: 12, background: 'var(--color-surface)', marginBottom: 16 }}>
        {[['compte','👤 Compte'],['categories','🏷️ Catégories'],['abonnements','🔄 Abonnements'],['paiements','💳 Paiements']].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '10px 8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              background: tab === t ? '#6366f1' : 'transparent', color: tab === t ? 'white' : 'var(--color-text-muted)' }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── COMPTE ── */}
      {tab === 'compte' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={cardStyle}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 12 }}>Compte</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 16 }}>{user.email?.[0].toUpperCase()}</div>
              <div><div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>{user.email}</div><div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Connecté</div></div>
            </div>
          </div>
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div><div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>Mode sombre</div><div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Basculer entre clair et sombre</div></div>
              <button onClick={() => setDarkMode(!darkMode)} style={{ position: 'relative', width: 48, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: darkMode ? '#6366f1' : '#cbd5e1' }}>
                <span style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'left 0.2s', left: darkMode ? 26 : 2 }} />
              </button>
            </div>
          </div>
          <div style={cardStyle}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>Installer l'application</h2>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>iPhone : Safari → Partager → "Sur l'écran d'accueil"<br />Android : Chrome → Menu → "Ajouter à l'écran d'accueil"</p>
          </div>
          <button onClick={handleLogout} style={{ width: '100%', padding: 12, borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>Se déconnecter</button>
        </div>
      )}

      {/* ── CATÉGORIES ── */}
      {tab === 'categories' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{categories.length} personnalisée{categories.length > 1 ? 's' : ''}</p>
            <button onClick={() => { setShowCatForm(true); setEditCat(null); setCatForm({ nom: '', icone: '📦', couleur: '#6366f1' }) }}
              style={{ padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', fontSize: 13 }}>+ Ajouter</button>
          </div>
          <div style={cardStyle}>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 10, letterSpacing: 1 }}>PAR DÉFAUT</h3>
            {CATEGORIES_DEFAUT.map(cat => (
              <div key={cat.nom} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: cat.couleur + '25', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{cat.icone}</div>
                <span style={{ fontSize: 14, color: 'var(--color-text)', flex: 1 }}>{cat.nom}</span>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Défaut</span>
              </div>
            ))}
          </div>
          {categories.length > 0 && (
            <div style={cardStyle}>
              <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 10, letterSpacing: 1 }}>MES CATÉGORIES</h3>
              {categories.map(cat => (
                <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: cat.couleur + '25', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{cat.icone}</div>
                  <span style={{ fontSize: 14, color: 'var(--color-text)', flex: 1 }}>{cat.nom}</span>
                  <button onClick={() => { setEditCat(cat); setCatForm({ nom: cat.nom, icone: cat.icone, couleur: cat.couleur }); setShowCatForm(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✏️</button>
                  <button onClick={() => handleDeleteCat(cat.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>🗑️</button>
                </div>
              ))}
            </div>
          )}

          {showCatForm && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
              <div style={{ width: '100%', maxWidth: 480, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 20, padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}><h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-text)' }}>{editCat ? 'Modifier' : 'Nouvelle catégorie'}</h2><button onClick={() => { setShowCatForm(false); setEditCat(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--color-text-muted)' }}>×</button></div>
                <form onSubmit={handleSaveCat} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Nom</label><input required value={catForm.nom} onChange={e => setCatForm({...catForm, nom: e.target.value})} placeholder="Ex: Vacances" style={inputStyle} /></div>
                  <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Icône</label><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{ICONES_CAT.map(ic => <button key={ic} type="button" onClick={() => setCatForm({...catForm, icone: ic})} style={{ width: 36, height: 36, borderRadius: 8, border: catForm.icone === ic ? '2px solid #6366f1' : '1px solid var(--color-border)', background: catForm.icone === ic ? '#6366f120' : 'transparent', cursor: 'pointer', fontSize: 18 }}>{ic}</button>)}</div></div>
                  <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Couleur</label><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{COULEURS.map(c => <button key={c} type="button" onClick={() => setCatForm({...catForm, couleur: c})} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: c, cursor: 'pointer', outline: catForm.couleur === c ? `3px solid ${c}` : 'none', outlineOffset: 2 }} />)}</div></div>
                  <div style={{ display: 'flex', gap: 8 }}><button type="button" onClick={() => { setShowCatForm(false); setEditCat(null) }} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)' }}>Annuler</button><button type="submit" style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', color: 'white', fontWeight: 600, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>{editCat ? 'Modifier' : 'Ajouter'}</button></div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ABONNEMENTS ── */}
      {tab === 'abonnements' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#ef4444' }}>— {totalAbonnements.toFixed(2)} €/mois</span>
            <button onClick={() => { setShowAbonForm(true); setEditAbon(null); setAbonForm({ nom: '', montant: '', jour_prelevement: 1, moyen_paiement: allMoyens[0]?.nom || 'Carte SG', categorie: 'abonnements', actif: true, note: '' }) }}
              style={{ padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', fontSize: 13 }}>+ Ajouter</button>
          </div>
          {abonnements.length === 0 ? <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}><p style={{ fontSize: 36 }}>🔄</p><p>Aucun abonnement</p></div> : (
            <div style={cardStyle}>
              {abonnements.map((a, i) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < abonnements.length-1 ? '1px solid var(--color-border)' : 'none', opacity: a.actif ? 1 : 0.5 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>{a.nom}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>Le {a.jour_prelevement} du mois · {a.moyen_paiement}{a.note && ` · ${a.note}`}</div>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: a.actif ? '#ef4444' : 'var(--color-text-muted)' }}>— {a.montant.toFixed(2)} €</span>
                  <button onClick={() => handleToggleAbon(a)} style={{ position: 'relative', width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', background: a.actif ? '#10b981' : '#475569', flexShrink: 0 }}><span style={{ position: 'absolute', top: 2, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.2s', left: a.actif ? 18 : 2 }} /></button>
                  <button onClick={() => { setEditAbon(a); setAbonForm({ nom: a.nom, montant: a.montant, jour_prelevement: a.jour_prelevement, moyen_paiement: a.moyen_paiement, categorie: a.categorie, actif: a.actif, note: a.note || '' }); setShowAbonForm(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>✏️</button>
                  <button onClick={() => handleDeleteAbon(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>🗑️</button>
                </div>
              ))}
            </div>
          )}
          {showAbonForm && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
              <div style={{ width: '100%', maxWidth: 480, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 20, padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}><h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-text)' }}>{editAbon ? 'Modifier' : 'Nouvel abonnement'}</h2><button onClick={() => { setShowAbonForm(false); setEditAbon(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--color-text-muted)' }}>×</button></div>
                <form onSubmit={handleSaveAbon} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Nom</label><input required value={abonForm.nom} onChange={e => setAbonForm({...abonForm, nom: e.target.value})} placeholder="Netflix, iCloud..." style={inputStyle} /></div>
                    <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Montant (€)</label><input type="number" step="0.01" min="0" required value={abonForm.montant} onChange={e => setAbonForm({...abonForm, montant: e.target.value})} placeholder="0.00" style={inputStyle} /></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Jour prélèvement</label><input type="number" min="1" max="28" required value={abonForm.jour_prelevement} onChange={e => setAbonForm({...abonForm, jour_prelevement: parseInt(e.target.value)})} style={inputStyle} /></div>
                    <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Carte</label>
                      <select value={abonForm.moyen_paiement} onChange={e => setAbonForm({...abonForm, moyen_paiement: e.target.value})} style={inputStyle}>
                        {allMoyens.map(m => <option key={m.nom || m.id}>{m.nom}</option>)}
                      </select>
                    </div>
                  </div>
                  <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Note</label><input value={abonForm.note} onChange={e => setAbonForm({...abonForm, note: e.target.value})} placeholder="Optionnel..." style={inputStyle} /></div>
                  <div style={{ display: 'flex', gap: 8 }}><button type="button" onClick={() => { setShowAbonForm(false); setEditAbon(null) }} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)' }}>Annuler</button><button type="submit" style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', color: 'white', fontWeight: 600, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>{editAbon ? 'Modifier' : 'Ajouter'}</button></div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PAIEMENTS ── */}
      {tab === 'paiements' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{moyens.length} moyen{moyens.length > 1 ? 's' : ''} personnalisé{moyens.length > 1 ? 's' : ''}</p>
            <button onClick={() => { setShowMoyenForm(true); setEditMoyen(null); setMoyenForm({ nom: '', type: 'carte', icone: '💳', couleur: '#6366f1', actif: true }) }}
              style={{ padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', fontSize: 13 }}>+ Ajouter</button>
          </div>

          {/* Défauts */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 10, letterSpacing: 1 }}>PAR DÉFAUT</h3>
            {MOYENS_DEFAUT.map(m => (
              <div key={m.nom} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: m.couleur + '25', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{m.icone}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: 'var(--color-text)', fontWeight: 500 }}>{m.nom}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{TYPES_PAY.find(t => t.id === m.type)?.label}</div>
                </div>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Défaut</span>
              </div>
            ))}
          </div>

          {/* Perso */}
          {moyens.length > 0 && (
            <div style={cardStyle}>
              <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 10, letterSpacing: 1 }}>MES MOYENS</h3>
              {moyens.map((m, i) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < moyens.length-1 ? '1px solid var(--color-border)' : 'none', opacity: m.actif ? 1 : 0.5 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: m.couleur + '25', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{m.icone}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: 'var(--color-text)', fontWeight: 500 }}>{m.nom}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{TYPES_PAY.find(t => t.id === m.type)?.label}</div>
                  </div>
                  <button onClick={() => handleToggleMoyen(m)} style={{ position: 'relative', width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', background: m.actif ? '#10b981' : '#475569', flexShrink: 0 }}><span style={{ position: 'absolute', top: 2, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.2s', left: m.actif ? 18 : 2 }} /></button>
                  <button onClick={() => { setEditMoyen(m); setMoyenForm({ nom: m.nom, type: m.type, icone: m.icone, couleur: m.couleur, actif: m.actif }); setShowMoyenForm(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>✏️</button>
                  <button onClick={() => handleDeleteMoyen(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>🗑️</button>
                </div>
              ))}
            </div>
          )}

          {showMoyenForm && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
              <div style={{ width: '100%', maxWidth: 480, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 20, padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}><h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-text)' }}>{editMoyen ? 'Modifier' : 'Nouveau moyen'}</h2><button onClick={() => { setShowMoyenForm(false); setEditMoyen(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--color-text-muted)' }}>×</button></div>
                <form onSubmit={handleSaveMoyen} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Nom</label><input required value={moyenForm.nom} onChange={e => setMoyenForm({...moyenForm, nom: e.target.value})} placeholder="Ex: Carte Revolut, Livret A..." style={inputStyle} /></div>
                  <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Type</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{TYPES_PAY.map(t => <button key={t.id} type="button" onClick={() => setMoyenForm({...moyenForm, type: t.id})} style={{ padding: '6px 12px', borderRadius: 8, border: moyenForm.type === t.id ? 'none' : '1px solid var(--color-border)', background: moyenForm.type === t.id ? '#6366f1' : 'transparent', color: moyenForm.type === t.id ? 'white' : 'var(--color-text-muted)', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>{t.label}</button>)}</div>
                  </div>
                  <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Icône</label><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{ICONES_PAY.map(ic => <button key={ic} type="button" onClick={() => setMoyenForm({...moyenForm, icone: ic})} style={{ width: 36, height: 36, borderRadius: 8, border: moyenForm.icone === ic ? '2px solid #6366f1' : '1px solid var(--color-border)', background: moyenForm.icone === ic ? '#6366f120' : 'transparent', cursor: 'pointer', fontSize: 20 }}>{ic}</button>)}</div></div>
                  <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Couleur</label><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{COULEURS.map(c => <button key={c} type="button" onClick={() => setMoyenForm({...moyenForm, couleur: c})} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: c, cursor: 'pointer', outline: moyenForm.couleur === c ? `3px solid ${c}` : 'none', outlineOffset: 2 }} />)}</div></div>
                  <div style={{ display: 'flex', gap: 8 }}><button type="button" onClick={() => { setShowMoyenForm(false); setEditMoyen(null) }} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)' }}>Annuler</button><button type="submit" style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', color: 'white', fontWeight: 600, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>{editMoyen ? 'Modifier' : 'Ajouter'}</button></div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
