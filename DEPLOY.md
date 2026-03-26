---

# DEPLOY.md — Afiya V3 — Prérequis de Déploiement

## ⚠️ ÉTAPE OBLIGATOIRE AVANT TOUT LANCEMENT EN PRODUCTION

### Initialisation du Fonds Global (GLOBAL_FUND)

Le Fonds Global est un wallet système unique qui doit exister en base
avant que tout utilisateur puisse créer ou rejoindre un groupe.

**Comment il est créé :**
Le code dans `src/App.tsx` crée automatiquement le document Firestore
`wallets/global_fund_main` la première fois que le compte administrateur
se connecte.

**Action requise :**
Avant d'inviter le moindre utilisateur, connecte-toi UNE FOIS avec
le compte administrateur :

  Email : jespere20000@gmail.com

Puis vérifie dans Firebase Console → Firestore → collection `wallets`
que le document `global_fund_main` existe avec les champs :
  - id          : "global_fund_main"
  - wallet_type : "GLOBAL_FUND"
  - balance     : 0
  - currency    : "XOF"
  - owner_id    : "SYSTEM"

**Conséquence si omis :**
Toute tentative de création de groupe échoue avec l'erreur
"Fonds Global introuvable" pour 100% des utilisateurs.

---

*Dernière mise à jour : mars 2026*

---
