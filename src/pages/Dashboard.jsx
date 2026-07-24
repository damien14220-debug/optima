import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { CATEGORIES } from './Depenses'
const MOIS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
export default function Dashboard({ user }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  useEffect(() => { fetchStats() }, [])
  const fetchStats = async () => {
    const startOfMonth = `${currentYear}-${String(currentMonth).padStart(2,'0')}-01`
    const endOfMonth = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0]
    const [{ data: depenses }, { data: revenus }, { data: investissements }, { data: biens }, { data: depensesAnnee }, { data: abonnements }] = await Promise.all([
      supabase.from('depenses').select('*').eq('user_id', user.id).gte('date', startOfMonth).lte('date', endOfMonth),
      supabase.from('revenus').select('*').eq('user_id', user.id).gte('date', startOfMonth).lte('date', endOfMonth),
      supabase.from('investissements').select('vehicule_id,valeur_actuelle').eq('user_id', user.id),
      supabase.from('patrimoine_materiel').select('valeur_actuelle').eq('user_id', user.id),
      supabase.from('depenses').select('*').eq('user_id', user.id).gte('date', `${currentYear}-01-01`),
      supabase.from('abonnements').select('montant,actif').eq('user_id', user.id),
    ])
    const totalDepenses = (depenses||[]).filter(d => !d.libelle?.startsWith('🔄')).reduce((s,d) => s+d.montant, 0)
    const totalRevenus = (revenus||[]).reduce((s,r) => s+r.montant, 0)
    const parCategorie = CATEGORIES.map(cat => ({ ...cat, total: (depenses||[]).filter(d => d.categorie===cat.id).reduce((s,d) => s+d.montant, 0) })).filter(c => c.total > 0)
    const parMois = Array.from({length:12},(_,i) => { const m=i+1; return { mois: MOIS[i], total: Math.round((depensesAnnee||[]).filter(d=>new Date(d.date).getMonth()+1===m).reduce((s,d)=>s+d.montant,0)) }})

    // Patrimoine : somme valeur_actuelle par vehicule_id (unique) + matériel
    const vusIds = new Set()
    let patrimoineFinancier = 0
    ;(investissements||[]).forEach(i => {
      const key = i.vehicule_id || i.vehicule
      if (!vusIds.has(key)) { vusIds.add(key); patrimoineFinancier += i.valeur_actuelle || 0 }
    })
    const patrimoineMateriel = (biens||[]).reduce((s,b) => s+(b.valeur_actuelle||0), 0)

    // Abonnements actifs ce mois
    const totalAbonnements = (abonnements||[]).filter(a => a.actif).reduce((s,a) => s+a.montant, 0)

    // Solde compte joint (basé sur config)
    const { data: cfg } = await supabase.from('config_joint').select('nom_owner,cartes_owner,cartes_partner').eq('owner_id', user.id).maybeSingle()
    const { data: depJoint } = await supabase.from('depenses_joint').select('montant,payeur,parte,moyen_paiement,part_moi').eq('user_id', user.id)
    const { data: depProj } = await supabase.from('depenses_projet').select('montant,payeur,carte,moyen_paiement,part_moi').eq('owner_id', user.id)
    const { data: contribs } = await supabase.from('contributions_joint').select('montant,contributeur').eq('user_id', user.id)
    const nomOwner = cfg?.nom_owner || ''
    let soldeJoint = 0
    const traiter = (liste) => {
      ;(liste||[]).forEach(d => {
        const payeur = d.payeur
        if (!payeur || payeur === 'commun') return
        const p = (d.part_moi||50)/100
        const ownerAPaye = payeur === nomOwner
        soldeJoint += ownerAPaye ? d.montant*(1-p) : -d.montant*p
      })
    }
    traiter(depJoint); traiter(depProj)
    ;(contribs||[]).forEach(c => { soldeJoint += c.contributeur === nomOwner ? c.montant : -c.montant })

    setStats({ totalDepenses, totalRevenus, balance: totalRevenus-totalDepenses, parCategorie, parMois, patrimoineTotal: patrimoineFinancier+patrimoineMateriel, patrimoineFinancier, patrimoineMateriel, soldeJoint, totalAbonnements })
    setLoading(false)
  }
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 240 }}><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
  const moisLabel = new Date(currentYear, currentMonth-1).toLocaleDateString('fr-FR',{month:'long',year:'numeric'})
  const cardStyle = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16 }
  return (
    <div style={{ padding: 16, maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)' }}>Tableau de bord</h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>{moisLabel.charAt(0).toUpperCase()+moisLabel.slice(1)}</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
        {[{ label: 'Revenus', value: stats.totalRevenus, color: '#10b981', icon: '💰' },{ label: 'Dépenses', value: stats.totalDepenses, color: '#ef4444', icon: '💸' },{ label: 'Balance', value: stats.balance, color: stats.balance>=0?'#10b981':'#ef4444', icon: stats.balance>=0?'📈':'📉' },{ label: 'Patrimoine', value: stats.patrimoineTotal, color: '#6366f1', icon: '🏦' },
        { label: 'Solde joint', value: stats.soldeJoint, color: stats.soldeJoint >= 0 ? '#10b981' : '#ef4444', icon: '🤝' }].map(k => (
          <div key={k.label} style={{ ...cardStyle, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}><span style={{ fontSize: 18 }}>{k.icon}</span><span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{k.label}</span></div>
            <div style={{ fontSize: 20, fontWeight: 700, color: k.color }}>{k.value.toFixed(0)} €</div>
          </div>
        ))}
      </div>
      <div style={{ ...cardStyle, padding: 16 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 12 }}>Dépenses {currentYear}</h2>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={stats.parMois}>
            <defs><linearGradient id="grad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} /></linearGradient></defs>
            <XAxis dataKey="mois" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8 }} formatter={v => [`${v} €`,'Dépenses']} />
            <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} fill="url(#grad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {stats.parCategorie.length > 0 && (
        <div style={{ ...cardStyle, padding: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 12 }}>Répartition ce mois</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <PieChart width={110} height={110}><Pie data={stats.parCategorie} dataKey="total" cx={50} cy={50} innerRadius={28} outerRadius={50}>{stats.parCategorie.map((c,i) => <Cell key={i} fill={c.color} />)}</Pie></PieChart>
            <div style={{ flex: 1 }}>{stats.parCategorie.sort((a,b)=>b.total-a.total).slice(0,5).map(cat => (
              <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, fontSize: 13 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color }} /><span style={{ color: 'var(--color-text-muted)' }}>{cat.label}</span></div>
                <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{cat.total.toFixed(0)} €</span>
              </div>
            ))}</div>
          </div>
        </div>
      )}
      <div style={{ ...cardStyle, padding: 16 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 10 }}>Balance du mois</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 10, borderRadius: 5, background: 'var(--color-border)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 5, width: stats.totalRevenus > 0 ? `${Math.min(100,(stats.totalDepenses/stats.totalRevenus)*100)}%` : '0%', background: stats.balance>=0 ? 'linear-gradient(90deg,#10b981,#6366f1)' : '#ef4444', transition: 'width 0.5s' }} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: stats.balance>=0?'#10b981':'#ef4444', whiteSpace: 'nowrap' }}>{stats.balance>=0?'+':''}{stats.balance.toFixed(0)} €</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}><span>0 €</span><span>{stats.totalRevenus.toFixed(0)} € de revenus</span></div>
      </div>
    </div>
  )
}
