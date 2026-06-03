"""
OPTIMA — Import des données historiques depuis Excel
=====================================================
Prérequis :
  pip install openpyxl requests python-dotenv

Usage :
  1. Copier ce fichier à la racine du projet Optima
  2. Créer un fichier .env avec SUPABASE_URL et SUPABASE_SERVICE_KEY
  3. Lancer : python import_excel.py
"""

import os
import json
import requests
from datetime import date
from dotenv import load_dotenv

# ── CONFIG ──────────────────────────────────────────────────────────
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_KEY  = os.getenv("SUPABASE_SERVICE_KEY")   # clé SERVICE (pas publishable)
USER_ID      = os.getenv("IMPORT_USER_ID")          # ton UUID auth.users, visible dans Supabase > Auth

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

def insert(table, rows):
    if not rows:
        return
    r = requests.post(f"{SUPABASE_URL}/rest/v1/{table}", headers=HEADERS, json=rows)
    if r.status_code not in (200, 201):
        print(f"  ❌ {table}: {r.status_code} {r.text[:200]}")
    else:
        print(f"  ✅ {table}: {len(rows)} lignes insérées")

# ── DONNÉES EXTRAITES DE TON EXCEL ──────────────────────────────────
# Revenus Jan–Juin 2026

REVENUS = [
    # Janvier
    {"date": "2026-01-01", "montant": 280.71, "libelle": "Salaire Janvier", "type": "salaire"},
    {"date": "2026-01-01", "montant": 382.80, "libelle": "Bourse Janvier", "type": "bourse"},
    {"date": "2026-01-01", "montant":  97.00, "libelle": "Autres revenus Janvier", "type": "cpam"},
    # Février
    {"date": "2026-02-01", "montant": 576.52, "libelle": "Salaire Février", "type": "salaire"},
    {"date": "2026-02-01", "montant": 382.80, "libelle": "Bourse Février", "type": "bourse"},
    # Mars
    {"date": "2026-03-01", "montant": 287.87, "libelle": "Salaire Mars", "type": "salaire"},
    {"date": "2026-03-01", "montant": 382.80, "libelle": "Bourse Mars", "type": "bourse"},
    {"date": "2026-03-01", "montant":3560.22, "libelle": "Vente moto + remboursements Mars", "type": "vente"},
    # Avril
    {"date": "2026-04-01", "montant": 847.66, "libelle": "Salaire Avril", "type": "salaire"},
    {"date": "2026-04-01", "montant": 382.80, "libelle": "Bourse Avril", "type": "bourse"},
    {"date": "2026-04-01", "montant":  34.05, "libelle": "Remboursements Avril", "type": "cpam"},
    # Mai
    {"date": "2026-05-01", "montant": 348.64, "libelle": "Salaire Mai", "type": "salaire"},
    {"date": "2026-05-01", "montant": 382.80, "libelle": "Bourse Mai", "type": "bourse"},
    {"date": "2026-05-01", "montant":1012.74, "libelle": "Remboursements / CPAM Mai", "type": "cpam"},
    # Juin
    {"date": "2026-06-01", "montant": 282.68, "libelle": "Salaire Juin", "type": "salaire"},
    {"date": "2026-06-01", "montant": 382.80, "libelle": "Bourse Juin", "type": "bourse"},
    {"date": "2026-06-01", "montant": 582.24, "libelle": "Remboursements Juin", "type": "cpam"},
]

# Dépenses par mois et catégorie (montants agrégés de ton Excel)
DEPENSES = [
    # ── JANVIER ──
    {"date":"2026-01-15","montant":88.71,"libelle":"Frais transport Janvier","categorie":"transport","moyen_paiement":"Carte SG"},
    {"date":"2026-01-15","montant":17.48,"libelle":"Abonnements Janvier","categorie":"abonnements","moyen_paiement":"Carte SG"},
    {"date":"2026-01-15","montant":47.80,"libelle":"Santé Janvier (Leralue...)","categorie":"sante","moyen_paiement":"Carte SG"},
    {"date":"2026-01-15","montant":61.20,"libelle":"Loisirs / Sorties Janvier","categorie":"loisirs","moyen_paiement":"Carte SG"},
    {"date":"2026-01-15","montant":181.97,"libelle":"Courses Janvier","categorie":"courses","moyen_paiement":"Carte SG"},
    {"date":"2026-01-15","montant":1671.57,"libelle":"Divers Janvier (vélo...)", "categorie":"divers","moyen_paiement":"Carte SG"},

    # ── FÉVRIER ──
    {"date":"2026-02-15","montant":174.86,"libelle":"Frais transport Février","categorie":"transport","moyen_paiement":"Carte SG"},
    {"date":"2026-02-15","montant":17.48,"libelle":"Abonnements Février","categorie":"abonnements","moyen_paiement":"Carte SG"},
    {"date":"2026-02-15","montant":155.70,"libelle":"Loisirs / Sorties Février","categorie":"loisirs","moyen_paiement":"Carte SG"},
    {"date":"2026-02-15","montant":140.20,"libelle":"Courses Février","categorie":"courses","moyen_paiement":"Carte SG"},
    {"date":"2026-02-15","montant":87.28,"libelle":"Divers Février","categorie":"divers","moyen_paiement":"Carte SG"},

    # ── MARS ──
    {"date":"2026-03-15","montant":88.71,"libelle":"Frais transport Mars","categorie":"transport","moyen_paiement":"Carte SG"},
    {"date":"2026-03-15","montant":17.48,"libelle":"Abonnements Mars","categorie":"abonnements","moyen_paiement":"Carte SG"},
    {"date":"2026-03-15","montant":102.50,"libelle":"Santé Mars (Gloro...)","categorie":"sante","moyen_paiement":"Carte SG"},
    {"date":"2026-03-15","montant":276.02,"libelle":"Loisirs / Sorties Mars","categorie":"loisirs","moyen_paiement":"Carte SG"},
    {"date":"2026-03-15","montant":206.39,"libelle":"Courses Mars","categorie":"courses","moyen_paiement":"Carte SG"},
    {"date":"2026-03-15","montant":414.36,"libelle":"Divers Mars","categorie":"divers","moyen_paiement":"Carte SG"},

    # ── AVRIL ──
    {"date":"2026-04-15","montant":121.86,"libelle":"Frais transport Avril","categorie":"transport","moyen_paiement":"Carte SG"},
    {"date":"2026-04-15","montant":17.48,"libelle":"Abonnements Avril","categorie":"abonnements","moyen_paiement":"Carte SG"},
    {"date":"2026-04-15","montant":145.70,"libelle":"Loisirs / Sorties Avril","categorie":"loisirs","moyen_paiement":"Carte SG"},
    {"date":"2026-04-15","montant":130.30,"libelle":"Courses Avril","categorie":"courses","moyen_paiement":"Carte SG"},
    {"date":"2026-04-15","montant":260.77,"libelle":"Divers Avril","categorie":"divers","moyen_paiement":"Carte SG"},

    # ── MAI ──
    {"date":"2026-05-15","montant":45.00,"libelle":"Frais transport Mai","categorie":"transport","moyen_paiement":"Carte SG"},
    {"date":"2026-05-15","montant":40.47,"libelle":"Abonnements Mai (+ Claude)","categorie":"abonnements","moyen_paiement":"Carte SG"},
    {"date":"2026-05-15","montant":914.74,"libelle":"Loisirs / Sorties Mai","categorie":"loisirs","moyen_paiement":"Carte SG"},
    {"date":"2026-05-15","montant":134.84,"libelle":"Courses Mai","categorie":"courses","moyen_paiement":"Carte SG"},
    {"date":"2026-05-15","montant":363.67,"libelle":"Divers Mai","categorie":"divers","moyen_paiement":"Carte SG"},
]

# Investissements — valeurs initiales au 01/01/2026
INVESTISSEMENTS = [
    {"vehicule": "or",           "valeur_actuelle": 1836.00},
    {"vehicule": "livret_a",     "valeur_actuelle": 4500.00},
    {"vehicule": "assurance_vie","valeur_actuelle": 9433.56},
    {"vehicule": "actions",      "valeur_actuelle": 3900.00},
    {"vehicule": "bricks",       "valeur_actuelle": 1020.00},
    {"vehicule": "pot_commun",   "valeur_actuelle":  617.00},
    {"vehicule": "prete_maman",  "valeur_actuelle": 3300.00},
    {"vehicule": "argent_liquide","valeur_actuelle":   0.00},
]

# ── MAIN ────────────────────────────────────────────────────────────
def main():
    if not SUPABASE_URL or not SERVICE_KEY or not USER_ID:
        print("❌ Configure SUPABASE_URL, SUPABASE_SERVICE_KEY et IMPORT_USER_ID dans .env")
        return

    print(f"🚀 Import vers {SUPABASE_URL}")
    print(f"   User : {USER_ID}\n")

    # Ajouter user_id à chaque ligne
    revenus_rows   = [{**r, "user_id": USER_ID} for r in REVENUS]
    depenses_rows  = [{**d, "user_id": USER_ID} for d in DEPENSES]
    inv_rows       = [{**i, "user_id": USER_ID} for i in INVESTISSEMENTS]

    print("📥 Insertion revenus...")
    insert("revenus", revenus_rows)

    print("📥 Insertion dépenses...")
    insert("depenses", depenses_rows)

    print("📥 Insertion investissements...")
    insert("investissements", inv_rows)

    print("\n✅ Import terminé !")
    print("💡 Rends-toi sur Optima pour vérifier tes données.")

if __name__ == "__main__":
    main()
