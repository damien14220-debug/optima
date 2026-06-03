-- ============================================
-- OPTIMA — Schéma Supabase
-- À exécuter dans l'éditeur SQL de Supabase
-- ============================================

-- 1. DÉPENSES
CREATE TABLE IF NOT EXISTS depenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  montant DECIMAL(10,2) NOT NULL,
  libelle TEXT NOT NULL,
  categorie TEXT NOT NULL,
  sous_categorie TEXT,
  moyen_paiement TEXT NOT NULL DEFAULT 'Carte SG',
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE depenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own depenses" ON depenses FOR ALL USING (auth.uid() = user_id);

-- 2. REVENUS
CREATE TABLE IF NOT EXISTS revenus (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  montant DECIMAL(10,2) NOT NULL,
  libelle TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'salaire',
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE revenus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own revenus" ON revenus FOR ALL USING (auth.uid() = user_id);

-- 3. BUDGETS THÉORIQUES PAR CATÉGORIE
CREATE TABLE IF NOT EXISTS budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  categorie TEXT NOT NULL,
  montant_theorique DECIMAL(10,2) NOT NULL DEFAULT 0,
  UNIQUE(user_id, categorie)
);
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own budgets" ON budgets FOR ALL USING (auth.uid() = user_id);

-- 4. INVESTISSEMENTS (valeur actuelle par véhicule)
CREATE TABLE IF NOT EXISTS investissements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  vehicule TEXT NOT NULL,
  valeur_actuelle DECIMAL(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, vehicule)
);
ALTER TABLE investissements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own investissements" ON investissements FOR ALL USING (auth.uid() = user_id);

-- 5. MOUVEMENTS D'INVESTISSEMENT (historique)
CREATE TABLE IF NOT EXISTS investissements_mouvements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  vehicule TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('depot', 'retrait', 'valeur')),
  montant DECIMAL(12,2) NOT NULL,
  date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE investissements_mouvements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own mouvements" ON investissements_mouvements FOR ALL USING (auth.uid() = user_id);

-- 6. INDEX pour les performances
CREATE INDEX IF NOT EXISTS idx_depenses_user_date ON depenses(user_id, date);
CREATE INDEX IF NOT EXISTS idx_revenus_user_date ON revenus(user_id, date);
CREATE INDEX IF NOT EXISTS idx_inv_mouvements_user ON investissements_mouvements(user_id, date);
