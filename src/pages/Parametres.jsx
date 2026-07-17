import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const ICONES = ['🚗','🏍️','🚌','📱','💻','🎵','🎬','🏥','🛒','🍕','🎉','✈️','🏠','💡','📦','🎓','💪','🐶','👗','⚽','🎮','📚','💈','🧴','🔧','💰','🏦','📋','🤝','👩']
const COULEURS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#84cc16','#94a3b8','#f97316']
const MOYENS = ['Carte SG', 'Carte Trade', 'Espèces', 'Virement']

const CATEGORIES_DEFAUT = [
  { nom: 'Transport', icone: '🚗', couleur: '#6366f1' },
  { nom: 'Abonnements', icone: '📱', couleur: '#8b5cf6' },
  { nom: 'Hygiène', icone: '🧴', couleur: '#06b6d4' },
  { nom: 'Santé', icone: '🏥', couleur: '#10b981' },
  { nom: 'Loisirs / Sorties', icone: '🎉', couleur: '#f59e0b' },
  { nom: 'Courses', icone: '🛒', couleur: '#84cc16' },
  { nom: 'Divers', icone: '📦', couleur: '#94a3b8' },
]

export default function Parametres({ user, darkMode, setDarkMode }) {
  const [tab, setTab] = useState('compte')
  const [categories, setCategories] = useState([])
  const [abonnements, setAbonnements] = useState([])
  const [showCatForm, setShowCatForm] = useState(false)
  const [showAbonForm, setShowAbonForm] = useState(false)
  const [editCat, setEditCat] = useState(null)
  const [editAbon, setEditAbon] = useState(null)

  const [catForm, setCatForm] = useState({ nom: '', icone: '📦', couleur: '#6366f1' })
  const [abonForm, setAbonForm] = useState({ nom: '', montant: '', jour_prelevement: 1, moyen_paiement: 'Carte SG', categorie: 'abonnements', actif: true, note: '' })

  useEffect(() => { fetchCategories(); fetchAbonnements() }, [])

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').eq('user_id', user.id).order('ordre')
    setCategories(data || [])
  }

  const fetchAbonnements = async () => {
    const { data } = await supabase.from('abonnements').select('*').eq('user_id', user.id).order('jour_prelevement')
    setAbonnements(data || [])
  }

  const handleSaveCat = async (e) => {
    e.preventDefault()
    const payload = { ...catForm, user_id: user.id, ordre: categories.length }
    if (editCat) {
      await supabase.from('categories').update(payload).eq('id', editCat.id)
    } else {
      await supabase.from('categories').insert(payload)
    }
    setShowCatForm(false); setEditCat(null)
    setCatForm({ nom: '', icone: '📦', couleur: '#6366f1' })
    fetchCategories()
  }

  const handleDeleteCat = async (id) => {
    if (!confirm('Supprimer cette catégorie ?')) return
    await supabase.from('categories').delete().eq('id', id)
    fetchCategories()
  }

  const handleSaveAbon = async (e) => {
    e.preventDefault()
    const payload = { ...abonForm, montant: parseFloat(abonForm.montant), user_id: user.id }
    if (editAbon) {
      await supabase.from('abonnements').update(payload).eq('id', editAbon.id)
    } else {
      await supabase.from('abonnements').insert(payload)
    }
    setShowAbonForm(false); setEditAbon(null)
    setAbonForm({ nom: '', montant: '', jour_prelevement: 1, moyen_paiement: 'Carte SG', categorie: 'abonnements', actif: true, note: '' })
    fetchAbonnements()
  }

  const handleDeleteAbon = async (id) => {
    if (!confirm('Supprimer cet abonnement ?')) return
    await supabase.from('abonnements').delete().eq('id', id)
    fetchAbonnements()
  }

  const handleToggleAbon = async (abon) => {
    await supabase.from('abonnements').update({ actif: !abon.actif }).eq('id', abon.id)
    fetchAbonnements()
  }

  const totalAbonnements = abonnements.filter(a => a.actif).reduce((s, a) => s + a.montant, 0)

  const handleLogout = async () => { await supabase.auth.signOut() }

  const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 14, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }

  return (
    <div style={{ padding: '16px', maxWidth: 700, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text)', marginBottom: 16 }}>Paramètres</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 12, background: 'var(--color-surface)', marginBottom: 16 }}>
        {[['compte', '👤 Compte'], ['categories', '🏷️ Catégories'], ['abonnements', '🔄 Abonnements']].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              background: tab === t ? '#6366f1' : 'transparent', color: tab === t ? 'white' : 'var(--color-text-muted)' }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── COMPTE ── */}
      {tab === 'compte' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Profil */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 12 }}>Compte</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>
                {user.email?.[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>{user.email}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Connecté</div>
              </div>
            </div>
          </div>

          {/* Dark mode */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>Mode sombre</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Basculer entre clair et sombre</div>
              </div>
              <button onClick={() => setDarkMode(!darkMode)}
                style={{ position: 'relative', width: 48, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: darkMode ? '#6366f1' : '#cbd5e1', transition: 'background 0.2s' }}>
                <span style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'left 0.2s', left: darkMode ? 26 : 2 }} />
              </button>
            </div>
          </div>

          {/* Moyens de paiement */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 12 }}>Moyens de paiement</h2>
            {[{ icon: '💳', name: 'Carte SG', desc: 'Société Générale' }, { icon: '💳', name: 'Carte Trade', desc: 'Trade Republic' }, { icon: '💵', name: 'Espèces', desc: 'Argent liquide' }, { icon: '🔄', name: 'Virement', desc: 'Virement bancaire' }].map(m => (
              <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: 20 }}>{m.icon}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{m.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* PWA */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>Installer l'application</h2>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
              iPhone : Safari → Partager → "Sur l'écran d'accueil"<br />
              Android : Chrome → Menu → "Ajouter à l'écran d'accueil"
            </p>
          </div>

          <button onClick={handleLogout}
            style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
            Se déconnecter
          </button>
        </div>
      )}

      {/* ── CATÉGORIES ── */}
      {tab === 'categories' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
              {categories.length} catégorie{categories.length > 1 ? 's' : ''} personnalisée{categories.length > 1 ? 's' : ''}
            </p>
            <button onClick={() => { setShowCatForm(true); setEditCat(null); setCatForm({ nom: '', icone: '📦', couleur: '#6366f1' }) }}
              style={{ padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', fontSize: 13 }}>
              + Ajouter
            </button>
          </div>

          {/* Catégories par défaut */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 10 }}>CATÉGORIES PAR DÉFAUT</h3>
            {CATEGORIES_DEFAUT.map(cat => (
              <div key={cat.nom} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: cat.couleur + '30', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{cat.icone}</div>
                <span style={{ fontSize: 14, color: 'var(--color-text)', flex: 1 }}>{cat.nom}</span>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Par défaut</span>
              </div>
            ))}
          </div>

          {/* Catégories custom */}
          {categories.length > 0 && (
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 16 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 10 }}>MES CATÉGORIES</h3>
              {categories.map(cat => (
                <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: cat.couleur + '30', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{cat.icone}</div>
                  <span style={{ fontSize: 14, color: 'var(--color-text)', flex: 1 }}>{cat.nom}</span>
                  <button onClick={() => { setEditCat(cat); setCatForm({ nom: cat.nom, icone: cat.icone, couleur: cat.couleur }); setShowCatForm(true) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✏️</button>
                  <button onClick={() => handleDeleteCat(cat.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>🗑️</button>
                </div>
              ))}
            </div>
          )}

          {/* Form modal catégorie */}
          {showCatForm && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
              <div style={{ width: '100%', maxWidth: 480, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 20, padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-text)' }}>{editCat ? 'Modifier' : 'Nouvelle catégorie'}</h2>
                  <button onClick={() => { setShowCatForm(false); setEditCat(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--color-text-muted)' }}>×</button>
                </div>
                <form onSubmit={handleSaveCat} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Nom</label>
                    <input required value={catForm.nom} onChange={e => setCatForm({...catForm, nom: e.target.value})} placeholder="Ex: Vacances" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Icône</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {ICONES.map(ic => (
                        <button key={ic} type="button" onClick={() => setCatForm({...catForm, icone: ic})}
                          style={{ width: 36, height: 36, borderRadius: 8, border: catForm.icone === ic ? '2px solid #6366f1' : '1px solid var(--color-border)', background: catForm.icone === ic ? '#6366f120' : 'transparent', cursor: 'pointer', fontSize: 18 }}>
                          {ic}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Couleur</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {COULEURS.map(c => (
                        <button key={c} type="button" onClick={() => setCatForm({...catForm, couleur: c})}
                          style={{ width: 28, height: 28, borderRadius: '50%', border: catForm.couleur === c ? '3px solid white' : 'none', background: c, cursor: 'pointer', boxShadow: catForm.couleur === c ? `0 0 0 2px ${c}` : 'none' }} />
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button type="button" onClick={() => { setShowCatForm(false); setEditCat(null) }}
                      style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                      Annuler
                    </button>
                    <button type="submit"
                      style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', color: 'white', fontWeight: 600, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                      {editCat ? 'Modifier' : 'Ajouter'}
                    </button>
                  </div>
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
            <div>
              <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{abonnements.filter(a => a.actif).length} actif{abonnements.filter(a => a.actif).length > 1 ? 's' : ''} · </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#ef4444' }}>— {totalAbonnements.toFixed(2)} €/mois</span>
            </div>
            <button onClick={() => { setShowAbonForm(true); setEditAbon(null); setAbonForm({ nom: '', montant: '', jour_prelevement: 1, moyen_paiement: 'Carte SG', categorie: 'abonnements', actif: true, note: '' }) }}
              style={{ padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', fontSize: 13 }}>
              + Ajouter
            </button>
          </div>

          {abonnements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-muted)' }}>
              <p style={{ fontSize: 36, marginBottom: 8 }}>🔄</p>
              <p>Aucun abonnement configuré</p>
            </div>
          ) : (
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, overflow: 'hidden' }}>
              {abonnements.map((abon, i) => (
                <div key={abon.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < abonnements.length - 1 ? '1px solid var(--color-border)' : 'none', opacity: abon.actif ? 1 : 0.5 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>{abon.nom}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                      Le {abon.jour_prelevement} du mois · {abon.moyen_paiement}
                      {abon.note && ` · ${abon.note}`}
                    </div>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: abon.actif ? '#ef4444' : 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                    — {abon.montant.toFixed(2)} €
                  </span>
                  {/* Toggle actif */}
                  <button onClick={() => handleToggleAbon(abon)}
                    style={{ position: 'relative', width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', background: abon.actif ? '#10b981' : '#475569', flexShrink: 0 }}>
                    <span style={{ position: 'absolute', top: 2, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.2s', left: abon.actif ? 18 : 2 }} />
                  </button>
                  <button onClick={() => { setEditAbon(abon); setAbonForm({ nom: abon.nom, montant: abon.montant, jour_prelevement: abon.jour_prelevement, moyen_paiement: abon.moyen_paiement, categorie: abon.categorie, actif: abon.actif, note: abon.note || '' }); setShowAbonForm(true) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✏️</button>
                  <button onClick={() => handleDeleteAbon(abon.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>🗑️</button>
                </div>
              ))}
            </div>
          )}

          {/* Form modal abonnement */}
          {showAbonForm && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
              <div style={{ width: '100%', maxWidth: 480, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 20, padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-text)' }}>{editAbon ? 'Modifier' : 'Nouvel abonnement'}</h2>
                  <button onClick={() => { setShowAbonForm(false); setEditAbon(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--color-text-muted)' }}>×</button>
                </div>
                <form onSubmit={handleSaveAbon} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Nom</label>
                      <input required value={abonForm.nom} onChange={e => setAbonForm({...abonForm, nom: e.target.value})} placeholder="Ex: Netflix" style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Montant (€)</label>
                      <input type="number" step="0.01" min="0" required value={abonForm.montant} onChange={e => setAbonForm({...abonForm, montant: e.target.value})} placeholder="0.00" style={inputStyle} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Jour de prélèvement</label>
                      <input type="number" min="1" max="28" required value={abonForm.jour_prelevement} onChange={e => setAbonForm({...abonForm, jour_prelevement: parseInt(e.target.value)})} style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Carte</label>
                      <select value={abonForm.moyen_paiement} onChange={e => setAbonForm({...abonForm, moyen_paiement: e.target.value})} style={inputStyle}>
                        {MOYENS.map(m => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Note (optionnel)</label>
                    <input value={abonForm.note} onChange={e => setAbonForm({...abonForm, note: e.target.value})} placeholder="Remarque..." style={inputStyle} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <label style={{ fontSize: 13, color: 'var(--color-text)', flex: 1 }}>Abonnement actif</label>
                    <button type="button" onClick={() => setAbonForm({...abonForm, actif: !abonForm.actif})}
                      style={{ position: 'relative', width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: abonForm.actif ? '#10b981' : '#475569' }}>
                      <span style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.2s', left: abonForm.actif ? 22 : 2 }} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button type="button" onClick={() => { setShowAbonForm(false); setEditAbon(null) }}
                      style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                      Annuler
                    </button>
                    <button type="submit"
                      style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', color: 'white', fontWeight: 600, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                      {editAbon ? 'Modifier' : 'Ajouter'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
