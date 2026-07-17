import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export const MOYENS_DEFAUT = [
  { id: 'sg', nom: 'Carte SG', type: 'carte', icone: '💳', couleur: '#e11d48' },
  { id: 'trade', nom: 'Carte Trade', type: 'carte', icone: '💳', couleur: '#7c3aed' },
  { id: 'especes', nom: 'Espèces', type: 'especes', icone: '💵', couleur: '#16a34a' },
  { id: 'virement', nom: 'Virement', type: 'virement', icone: '🔄', couleur: '#0284c7' },
]

export function useMoyensPaiement(userId) {
  const [moyens, setMoyens] = useState([])
  const [loading, setLoading] = useState(true)

  const refetch = async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase.from('moyens_paiement').select('*')
      .eq('user_id', userId).eq('actif', true).order('ordre')
    setMoyens(data && data.length > 0 ? data : MOYENS_DEFAUT)
    setLoading(false)
  }

  useEffect(() => { refetch() }, [userId])
  return { moyens, loading, refetch }
}
