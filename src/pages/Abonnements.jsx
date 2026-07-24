import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useMoyensPaiement } from '../hooks/useMoyensPaiement'
import { CATEGORIES } from './Depenses'

const MOIS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

function joursAvant(jour) {
  const now = new Date()
  const t = new Date(now.getFullYear(), now.getMonth(), jour)
  if (t <= now) t.setMonth(t.getMonth() + 1)
  return Math.ceil((t - now) / 86400000)
}

const EMPTY = { nom: '', montant: '', categorie: 'abonnements', moyen_paiement: 'Carte SG', jour_prelevement: 1, date_debut: new Date().toISOString().split('T')[0], actif: true, note: '' }

export default function Abonnements({ user }) {
  const [abonnements, setAbonnements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const { moyens } = useMoyensPaiement(user.id)
  const MOYENS_DEFAUT = ['Carte SG', 'Carte Trade', 'Espèces', 'Virement']
  const TOUS_MOYENS = [...MOYENS_DEFAUT, ...moyens.filter(m => !MOYENS_DEFAUT.includes(m.nom)).map(m => m.nom)]
  const CATS = CATEGORIES.filter(c => !['joint'].includes(c.id))

  useEffect(() => { fetch() }, [])

  const fetch = async () => {
    const { data } = await supabase.from('abonnements').select('*').eq('user_id', user.id).order('jour_prelevement')
    setAbonnements(data || [])
    setLoading(false)
  }

  const save = async (e) => {
    e.preventDefault()
    const payload = { ...form, montant: parseFloat(form.montant), jour_prelevement: parseInt(form.jour_prelevement), user_id: user.id }
    if (editItem) await supabase.from('abonnements').update(payload).eq('id', editItem.id)
    else await supabase.from('abonnements').insert(payload)
    setShowForm(false); setEditItem(null); setForm(EMPTY); fetch()
  }

  // Injecter les abonnements du mois courant dans les dépenses s'ils ne sont pas encore là
  const syncMoisCourant = async () => {
    setSyncing(true)
    const now = new Date()
    const m = now.getMonth() + 1
    const y = now.getFullYear()
    const actifs = abonnements.filter(a => a.actif)
    let count = 0
    for (const a of actifs) {
      const datePrelevement = `${y}-${String(m).padStart(2,'0')}-${String(a.jour_prelevement).padStart(2,'0')}`
      // Vérifier si déjà injecté ce mois
      const { data: existing } = await supabase.from('depenses').select('id')
        .eq('user_id', user.id).eq('libelle', `🔄 ${a.nom}`).gte('date', `${y}-${String(m).padStart(2,'0')}-01`).lte('date', new Date(y, m, 0).toISOString().split('T')[0])
      if (!existing || existing.length === 0) {
        await supabase.from('depenses').insert({ user_id: user.id, date: datePrelevement, montant: a.montant, libelle: `🔄 ${a.nom}`, categorie: a.categorie, moyen_paiement: a.moyen_paiement })
        count++
      }
    }
    setSyncMsg(count > 0 ? `✅ ${count} abonnement(s) ajouté(s) dans tes dépenses de ${MOIS[m-1]}` : '✓ Tous déjà injectés ce mois')
    setSyncing(false)
    setTimeout(() => setSyncMsg(''), 4000)
  }

  const inp = { width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 14, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }
  const card = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16 }

  const totalActif = abonnements.filter(a => a.actif).reduce((s, a) => s + a.montant, 0)
  const totalAnnuel = totalActif * 12

  return (
    <div style={{ padding: 16, maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text)' }}>Abonnements</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>— {totalActif.toFixed(2)} €/mois · {totalAnnuel.toFixed(0)} €/an</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={syncMoisCourant} disabled={syncing}
            style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', fontWeight: 500, fontSize: 13, color: 'var(--color-text-muted)' }}>
            {syncing ? '⏳' : '🔄'} Injecter ce mois
          </button>
          <button onClick={() => { setShowForm(true); setEditItem(null); setForm(EMPTY) }}
            style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: 'white', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', fontSize: 13 }}>
            + Abonnement
          </button>
        </div>
      </div>

      {syncMsg && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', fontSize: 13, marginBottom: 12 }}>{syncMsg}</div>}

      {/* Résumé */}
      {abonnements.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
          {[{ label: 'Actifs/mois', value: `— ${totalActif.toFixed(0)} €`, color: '#ef4444' },{ label: 'Par an', value: `— ${totalAnnuel.toFixed(0)} €`, color: '#f59e0b' },{ label: 'Nb abonnements', value: abonnements.filter(a=>a.actif).length, color: '#6366f1' }].map(k => (
            <div key={k.label} style={{ ...card, padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ ...card, marginBottom: 10, overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)', background: 'rgba(99,102,241,0.04)' }}>
          💡 Clique sur "Injecter ce mois" pour ajouter automatiquement tous tes abonnements actifs dans tes dépenses du mois courant
        </div>
      </div>

      {loading ? null : abonnements.length === 0
        ? <div style={{ ...card, padding: 40, textAlign: 'center' }}><p style={{ fontSize: 36, marginBottom: 8 }}>🔄</p><p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>Aucun abonnement</p><p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Netflix, Spotify, salle de sport, loyer, assurance...</p></div>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {abonnements.map(a => {
            const jours = joursAvant(a.jour_prelevement)
            const urgent = jours <= 5
            const cat = CATS.find(c => c.id === a.categorie)
            return (
              <div key={a.id} style={{ ...card, padding: '12px 16px', opacity: a.actif ? 1 : 0.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 26 }}>{cat?.icon || '🔄'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{a.nom}</span>
                      {urgent && a.actif && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontWeight: 600 }}>⚡ dans {jours}j</span>}
                      {!a.actif && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'rgba(148,163,184,0.2)', color: 'var(--color-text-muted)' }}>Inactif</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>Le {a.jour_prelevement} du mois · {a.moyen_paiement} · {cat?.label}</div>
                    {a.note && <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 1, fontStyle: 'italic' }}>{a.note}</div>}
                    {a.actif && <div style={{ marginTop: 6, height: 3, borderRadius: 2, background: 'var(--color-border)' }}><div style={{ height: '100%', borderRadius: 2, background: urgent ? '#ef4444' : '#6366f1', width: `${Math.max(4, 100 - jours/31*100)}%`, transition: 'width 0.3s' }} /></div>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: a.actif ? '#ef4444' : 'var(--color-text-muted)' }}>— {a.montant.toFixed(2)} €</div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>/mois</div>
                  </div>
                  <button onClick={async () => { await supabase.from('abonnements').update({ actif: !a.actif }).eq('id', a.id); fetch() }}
                    style={{ position: 'relative', width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', background: a.actif ? '#10b981' : '#475569', flexShrink: 0 }}>
                    <span style={{ position: 'absolute', top: 2, width: 16, height: 16, borderRadius: '50%', background: 'white', left: a.actif ? 18 : 2, transition: 'left 0.2s' }} />
                  </button>
                  <button onClick={() => { setEditItem(a); setForm({ nom: a.nom, montant: a.montant, categorie: a.categorie, moyen_paiement: a.moyen_paiement, jour_prelevement: a.jour_prelevement, date_debut: a.date_debut || '', actif: a.actif, note: a.note || '' }); setShowForm(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✏️</button>
                  <button onClick={async () => { if (!confirm('Supprimer ?')) return; await supabase.from('abonnements').delete().eq('id', a.id); fetch() }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>🗑️</button>
                </div>
              </div>
            )
          })}
        </div>
      }

      {/* Form */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ width: '100%', maxWidth: 480, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 20, padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-text)' }}>{editItem ? 'Modifier' : 'Nouvel abonnement'}</h2>
              <button onClick={() => { setShowForm(false); setEditItem(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--color-text-muted)' }}>×</button>
            </div>
            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Nom</label><input required value={form.nom} onChange={e => setForm(f=>({...f,nom:e.target.value}))} placeholder="Netflix, Salle de sport..." style={inp} /></div>
                <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Montant (€/mois)</label><input type="number" step="0.01" min="0" required value={form.montant} onChange={e => setForm(f=>({...f,montant:e.target.value}))} placeholder="9.99" style={inp} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Catégorie</label><select value={form.categorie} onChange={e => setForm(f=>({...f,categorie:e.target.value}))} style={inp}>{CATS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}</select></div>
                <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Moyen de paiement</label><select value={form.moyen_paiement} onChange={e => setForm(f=>({...f,moyen_paiement:e.target.value}))} style={inp}>{TOUS_MOYENS.map(m => <option key={m}>{m}</option>)}</select></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Jour de prélèvement</label><input type="number" min="1" max="28" required value={form.jour_prelevement} onChange={e => setForm(f=>({...f,jour_prelevement:e.target.value}))} style={inp} /></div>
                <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Date de début</label><input type="date" value={form.date_debut} onChange={e => setForm(f=>({...f,date_debut:e.target.value}))} style={inp} /></div>
              </div>
              <div><label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Note</label><input value={form.note} onChange={e => setForm(f=>({...f,note:e.target.value}))} placeholder="Optionnel..." style={inp} /></div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => { setShowForm(false); setEditItem(null) }} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)' }}>Annuler</button>
                <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', color: 'white', fontWeight: 600, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>{editItem ? 'Modifier' : 'Ajouter'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
