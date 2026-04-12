# AFIYA V3 â Instructions absolues pour Claude Code

Tu travailles sur **Afiya V3**, une application web responsive (mobile/tablette/desktop) de tontine digitale, wallet personnel et patrimoine, ciblant le marchÃ© ouest-africain (BÃ©nin) et la diaspora europÃ©enne.

**Tagline :** "Votre Ã©pargne, Ã  votre faÃ§on."

**RÃGLE FONDAMENTALE :** Chaque dÃ©cision de code doit Ãªtre justifiÃ©e. Rien au hasard. Si tu n'es pas certain d'une valeur (couleur, taille, espacement), tu utilises EXACTEMENT ce qui est dÃ©fini dans ce fichier â jamais une valeur inventÃ©e.

---

## 1. STACK TECHNIQUE (non nÃ©gociable)

| Couche | Technologie |
|--------|-------------|
| Frontend | React + TypeScript strict |
| Routing | React Router DOM |
| Styling | Tailwind CSS (utility classes uniquement) |
| Animations | Framer Motion (motion/react) |
| IcÃ´nes | Lucide React EXCLUSIVEMENT |
| Backend | Firebase â Firestore + Firebase Auth |
| Police | Manrope â Google Fonts |

**INTERDITS :** React Native, Expo, Supabase, Mock DB, localStorage comme base de donnÃ©es.

**Affichage :** responsive natif â mobile, tablette, desktop. Ne pas toucher au comportement d'affichage existant.

---

## 2. POLICE â MANROPE

Manrope doit Ãªtre chargÃ©e dans `src/index.css` :
```css
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap');
```

Et appliquÃ©e globalement :
```css
body { font-family: 'Manrope', sans-serif; }
```

**JAMAIS** Inter, Roboto, Arial, Space Grotesk, ou toute autre police.

---

## 3. DESIGN TOKENS â COULEURS

```
--color-bg:       #F5F4F0   Fond de page ivoire chaud â PARTOUT, aucune exception
--color-surface:  #FFFFFF   Surface card
--color-action:   #047857   Couleur action UNIQUE â CTA, actif, montant positif
--color-border:   #EDECEA   Bordure card â subtile
--color-text-1:   #1A1A1A   Texte principal
--color-text-2:   #6B6B6B   Texte secondaire
--color-text-3:   #A39887   Labels, tertiaire, inactif
--color-text-4:   #C4B8AC   Placeholder, dÃ©sactivÃ©, zÃ©ros
--color-alert:    #92400E   Alerte â retard et blocage critique UNIQUEMENT
--color-info:     #1D4ED8   Information / lien
--color-success-bg: #F0FDF4  Fond info positive / rassurante
--color-success-border: #D1FAE5  Bordure info positive
```

### Couleurs de statut badges
```
Actif        â bg #D1FAE5 / text #065F46
En formation â bg #F5F4F0 / text #6B6B6B
ComplÃ©tÃ©     â bg #F5F4F0 / text #A39887
Bronze       â bg #FEF3C7 / text #92400E
Silver       â bg #F1F5F9 / text #475569
Gold         â bg #FEF9C3 / text #A16207
Platinum     â bg #F8FAFC / text #334155 / border #CBD5E1
```

### INTERDICTIONS ABSOLUES de couleur
- â Rouge ou orange dans l'UI
- â DÃ©gradÃ© sur surface UI (gradient sur card, bouton, fond de page)
- â box-shadow dÃ©coratif sur card
- â Glassmorphism / backdrop-blur dÃ©coratif
- â #FAFAF8 comme fond de page â remplacÃ© par #F5F4F0

---

## 4. DESIGN TOKENS â TYPOGRAPHIE

| Usage | Taille / Weight | Couleur |
|-------|----------------|---------|
| Titre de page | 26px / 800 | #1A1A1A |
| Montant principal wallet | 28â36px / 800 | #1A1A1A |
| Titre card / section | 14â15px / 700 | #1A1A1A |
| Corps texte principal | 13â14px / 500â600 | #6B6B6B |
| Label section (uppercase) | 8â9px / 700 | #A39887 â letter-spacing: 0.12em |
| Caption / date / meta | 10â11px / 500 | #A39887 |
| Montant positif (entrÃ©e) | â | #047857 |
| Montant nÃ©gatif (sortie) | â | #1A1A1A (JAMAIS rouge) |
| UnitÃ© FCFA | 13â15px / 600 | #A39887 |
| Placeholder | â | #C4B8AC |

### Format montants
- SÃ©parateur milliers : espace (50 000 FCFA â PAS de virgule, PAS de point)
- Toujours avec "FCFA" aprÃ¨s le montant
- Entrant : prÃ©fixe "+" en vert #047857
- Sortant : prÃ©fixe "â" en #1A1A1A

---

## 5. DESIGN TOKENS â ESPACEMENTS

| Token | Valeur | Usage |
|-------|--------|-------|
| Marge horizontale page | 24px | `px-6` â partout |
| Padding interne card | 14â20px | `p-3.5` Ã  `p-5` |
| Espacement entre sections | 24px | `mb-6` |
| Gap entre items liste | 8â12px | `gap-2` Ã  `gap-3` |
| Safe area top | 52px | `pt-[52px]` |
| Safe area bottom (TabBar) | 80px | `pb-20` |
| Touch target minimum | 48px | height min sur tous les Ã©lÃ©ments interactifs |

---

## 6. DESIGN TOKENS â BORDER RADIUS

| Usage | Valeur | Tailwind |
|-------|--------|---------|
| Card principale | 18â20px | `rounded-[20px]` |
| ÃlÃ©ment interne card | 10â14px | `rounded-[12px]` |
| Bouton standard | 14â16px | `rounded-[16px]` |
| Champ input | 13â14px | `rounded-[14px]` |
| Badge / pill | 5â6px | `rounded-[6px]` |
| Bouton retour | 11â12px | `rounded-[12px]` |
| Avatar | 14â16px | `rounded-[16px]` |
| FAB | 13â14px | `rounded-[14px]` |

---

## 7. COMPOSANTS â BOUTONS

### Primaire
```
height: 52px
background: #047857
color: white
border-radius: 16px
font-size: 15px
font-weight: 700
width: 100%
â 1 SEUL par Ã©cran maximum
```

### Secondaire
```
height: 52px
background: white
border: 1.5px solid #047857
color: #047857
border-radius: 16px
font-size: 15px
font-weight: 700
width: 100%
```

### Ghost
```
height: 48px
background: white
border: 0.5px solid #EDECEA
color: #6B6B6B
border-radius: 16px
font-size: 14px
font-weight: 600
width: 100%
```

**INTERDIT :** bouton rouge pour "DÃ©connexion" ou "Refuser" â utiliser Ghost.

---

## 8. COMPOSANTS â CARDS

### Card surface (principale)
```
background: #FFFFFF
border-radius: 18â20px
border: 0.5px solid #EDECEA
padding: 14â20px
```

### Card inner (Ã  l'intÃ©rieur d'une card)
```
background: #F5F4F0
border-radius: 10â14px
padding: 10â12px
â JAMAIS un border-radius > card parente
```

### Card info positive
```
background: #F0FDF4
border: 0.5px solid #D1FAE5
border-radius: 12â14px
```

### Card alerte (retard uniquement)
```
border-left: 2px solid #92400E
â PAS de fond colorÃ©, juste la bordure gauche
```

---

## 9. COMPOSANTS â CHAMPS DE FORMULAIRE

```
height: 48â52px
background repos: #F5F4F0
border repos: 1px solid #EDECEA
border-radius: 13â14px
padding: 0 14â16px
font-size: 14â15px
font-weight: 500â600

Focus:
  border: 1px solid #047857
  box-shadow: 0 0 0 3px rgba(4,120,87,0.08)
  background: white

Erreur:
  border: 1px solid #92400E
  box-shadow: 0 0 0 3px rgba(146,64,14,0.08)

Label au-dessus:
  font-size: 9px
  font-weight: 700
  text-transform: uppercase
  letter-spacing: 0.1em
  color: #A39887
  margin-bottom: 6px
```

---

## 10. COMPOSANTS â SOUS-ONGLETS

```
Onglet actif:
  color: #047857
  font-weight: 700
  border-bottom: 2px solid #047857
  margin-bottom: -1px

Onglet inactif:
  color: #A39887
  font-weight: 700
  background: transparent

Conteneur:
  border-bottom: 1px solid #EDECEA
```

â Cette rÃ¨gle s'applique Ã  TOUS les sous-onglets de l'app (GroupDetail, JoinGroup, Cercles).

---

## 11. COMPOSANTS â TABBAR

```
4 onglets : Wallet Â· Cercles Â· Patrimoine Â· Profil
Height: 64px
Background: white / border-top: 0.5px solid #EDECEA

Onglet actif:
  IcÃ´ne: couleur #047857 / strokeWidth 2
  Pill bg: rgba(4,120,87,0.1) / border-radius: 9px
  Label: #047857 / font-weight 700

Onglet inactif:
  IcÃ´ne: couleur #A39887 / strokeWidth 1.5
  Label: #A39887 / font-weight 500

IcÃ´nes:
  Wallet    â CreditCard (ou Wallet)
  Cercles   â Users
  Patrimoine â TrendingUp
  Profil    â User

Badge notification (KYC incomplet):
  Point ambre #92400E / 8px / top-right de l'icÃ´ne Profil
```

**TabBar UNIQUEMENT sur les 4 onglets principaux. JAMAIS sur les Ã©crans secondaires.**

---

## 12. COMPOSANTS â FAB

```
Background: #047857
Border-radius: 13â14px
Width/Height: 42â48px
Position: fixed bottom-right â bottom: 88px / right: 14â16px

IcÃ´ne fermÃ©e: Plus (blanc)
IcÃ´ne ouverte: X (blanc) â MÃME fond vert #047857 â JAMAIS noir ou autre couleur

Menu ouvert:
  Background: white
  Border-radius: 16px
  Border: 0.5px solid #EDECEA
  Options: icÃ´ne + texte
```

---

## 13. COMPOSANTS â TRANSACTIONS (anatomie)

Chaque ligne de transaction :
```
Gauche: icÃ´ne 40Ã40px radius 12px
  Entrant â bg #D1FAE5 / icÃ´ne #047857
  Sortant â bg #F5F4F0 / icÃ´ne #6B6B6B
  En cours â bg #FEF9C3 / icÃ´ne #92400E

Centre ligne 1: Nom transaction â 14px / 600 / #1A1A1A
Centre ligne 2: "12 janv. Â· Principal" â 12px / 500 / #A39887

Droite: Montant â 14px / 700
  Entrant: "+300 000 FCFA" en #047857
  Sortant: "â50 000 FCFA" en #1A1A1A
  En cours: "En cours" en #92400E
```

IcÃ´nes par type :
```
DEPOSIT / PAYOUT / CAUTION_REFUND  â bg #D1FAE5 / icÃ´ne #047857
  DEPOSIT       â ArrowDownToLine
  PAYOUT        â Trophy
  CAUTION_REFUND â Unlock
  REFUND        â RotateCcw

WITHDRAWAL / CONTRIBUTION / CAUTION / MINI_FUND_CONTRIB / GLOBAL_FUND_CONTRIB â bg #F5F4F0 / icÃ´ne #6B6B6B
  WITHDRAWAL    â ArrowUpFromLine
  CONTRIBUTION  â Users
  CAUTION       â Lock
  MINI_FUND_CONTRIB â Shield
  GLOBAL_FUND_CONTRIB â Globe
  DEPOSIT_SEIZURE â AlertTriangle

TRANSFER :
  Entrant â bg #D1FAE5 / icÃ´ne #047857 / ArrowLeftRight
  Sortant â bg #F5F4F0 / icÃ´ne #6B6B6B / ArrowLeftRight
```

Groupement par date : label "AUJOURD'HUI / HIER / 12 JANV." en 10px/700/uppercase/#A39887.
Noms longs tronquÃ©s avec ellipsis. Montant flex-shrink-0 sur une seule ligne.

---

## 14. NAVIGATION

| Ãcran | Type | TabBar |
|-------|------|--------|
| GroupDetail | Push droite | Non |
| CreateGroup | Push droite | Non |
| JoinGroup | Push droite | Non |
| AdjustDeposit | Modal bas | Non |
| TirageAuSort | Push droite | Non |
| Transfer | Push droite | Non |
| Receive | Push droite | Non |
| Recharge | Push droite | Non |
| Withdraw | Push droite | Non |
| AllTransactions | Push droite | Non |
| Confirmations | Modal bas | Non |

Transitions TabBar : **fade 200ms ease-out** â PAS de slide horizontal.

---

## 15. SCREENS â STRUCTURE

### Screens existants (NE JAMAIS recrÃ©er sans ordre explicite)
```
src/screens/auth/   â Welcome, Register, Login, Kyc
src/screens/tabs/   â Wallet (ou Home), Tontines, Patrimoine, Profile
src/screens/group/  â GroupDetail, CreateGroup, JoinGroup, AdjustDeposit, TirageAuSort
src/screens/wallet/ â Transfer, Receive, Recharge, Withdraw, AllTransactions
src/components/     â TabBar
```

### Wallet
- 3 cards swipeables : Principal Â· Cercles Â· Patrimoine â toutes blanches `#FFFFFF`
- Actions contextuelles selon card active :
  - Principal : TransfÃ©rer / Recevoir / Recharger / Retirer
  - Cercles : TransfÃ©rer / Recevoir / Cotiser / Mes cercles
  - Patrimoine : TransfÃ©rer / Recevoir / Explorer
- Section RÃ©partition fixe sous les actions
- 5 transactions rÃ©centes groupÃ©es par date
- Section "Pour vous" en bas

### Cercles
- Header : titre + loupe
- Sous-onglets : Mes cercles / Afiya Pools
- RÃ©sumÃ© (cercles actifs / prochaine cagnotte / prochain paiement)
- Liste par statut : ACTIFS â EN FORMATION â COMPLÃTÃS
- FAB vert avec menu : CrÃ©er un cercle / Rejoindre un cercle

### GroupDetail â 3 sous-onglets
1. **DÃ©tails** (EN FORMATION : progression, invitation code+lien, rÃ¨gles, note tirage Afiya)
2. **DÃ©tails** (ACTIF : cagnotte+fonds assurance, ma situation+breakdown frais, cotisation, protection)
3. **Positions** (avant tirage : attente / aprÃ¨s : liste par rang + bloc Ã©change sÃ©parÃ©)
4. **Cycles** (timeline : passÃ©/en cours/Ã  venir â montants nets exacts)
- FAB chat en bas Ã  droite

**RÃGLE CRITIQUE : l'admin n'a AUCUNE action spÃ©ciale dans l'interface. MÃªme UI pour tous.**

### Profile
- Avatar initiales vert 56Ã56px radius 16px
- Nom + email + "Membre depuis X" en #C4B8AC
- Bloc Score : valeur /100 + badge tier + barre progression + avantages (3 lignes) + lien calcul
- Menus : Compte / PrÃ©fÃ©rences / Support
- Boutons bas : Partager Afiya (secondaire) + Se dÃ©connecter (ghost)
- Version "Afiya v1.0.0" en #C4B8AC

### CreateGroup â 2 Ã©tapes
1. ParamÃ¨tres : Nom / Cotisation / FrÃ©quence (HebdoÂ·BimensuelÂ·Mensuel) / Membres cible
2. Confirmation : RÃ©cap + Cagnotte potentielle + Caution + Total Ã  payer + Bouton "CrÃ©er le cercle"

### JoinGroup â 2 Ã©tapes
1. Code AFY-XXXX-XXX + aperÃ§u cercle (fond #F0FDF4) aprÃ¨s validation
2. DÃ©tails cercle + tier utilisateur + breakdown paiement + Bouton "Rejoindre et payer"

### AdjustDeposit
- Contexte (card verte) : position + explication ajustement
- Breakdown caution : initiale â requise â complÃ©ment
- Note restitution (fond #F0FDF4)
- DÃ©lai **72h** (fond #F5F4F0) â PAS 48h
- Bouton "Payer X FCFA" (primaire) + "Refuser et Ãªtre repositionnÃ©" (ghost)

---

## 16. CALCULS FINANCIERS

### Option C â Flux tontines exclusivement via USER_CERCLES
Toutes les opÃ©rations tontines (caution, cotisation, payout) utilisent USER_CERCLES.
Si solde insuffisant â proposer transfert rapide depuis USER_MAIN en 1 tap.

### Distribution cotisation â 3 transactions OBLIGATOIRES via runTransaction
```
96% â CONTRIBUTION_POOL
1%  â GROUP_MINI_FUND (appartient au groupe)
3%  â GLOBAL_FUND
```

### Versement net â calcul exact
```
Cagnotte brute   = cotisation Ã nombre_membres
Frais gestion    = cagnotte_brute Ã % tier bÃ©nÃ©ficiaire
                   (Bronze 3% / Silver 2.5% / Gold 2% / Platinum 1.5%)
Assurance groupe = cagnotte_brute Ã 1% â GROUP_MINI_FUND
Payout avant retenue = cagnotte_brute â frais_gestion â assurance_groupe

Retenue (avance cotisation suivante) :
  posRatio = draw_position / total_membres
  baseTaux : posRatio â¤ 0.30 â 1.0 | posRatio â¤ 0.60 â 0.5 | sinon â 0
  retentionCoeff : BRONZE 1.0 / SILVER 0.75 / GOLD 0.5 / PLATINUM 0.25
  retentionAmount = Math.round(cotisation Ã baseTaux Ã retentionCoeff)

Versement net = payout_avant_retenue â retentionAmount
```

â Afficher le montant NET dans les Cycles et "Ma situation".
â CONTRIBUTION_POOL dÃ©bitÃ© du grossPayout TOTAL (pas du netPayout).
â Payment bÃ©nÃ©ficiaire cycle suivant marquÃ© SUCCESS (paid_via_retention: true) si retenue > 0.

### Tiers
| Tier | Score | Coeff caution | Cotis max | Membres max | Frais |
|------|-------|--------------|-----------|-------------|-------|
| BRONZE | 0â59 | 1.0Ã | 500 000 FCFA | 10 | 3% |
| SILVER | 60â74 | 0.75Ã | 1 000 000 FCFA | 20 | 2.5% |
| GOLD | 75â89 | 0.5Ã | 2 000 000 FCFA | 30 | 2% |
| PLATINUM | 90â100 | 0.25Ã | IllimitÃ©e | 30 | 1.5% |

### Caution adaptative post-tirage
```
Câ = cotisation Ã deposit_coefficient (tier du membre)
Câ = Câ Ã facteur_position
  posRatio = draw_position / total_membres
  posRatio â¤ 0.30 â facteur 2.0 â diffÃ©rentiel = Câ
  posRatio â¤ 0.60 â facteur 1.5 â diffÃ©rentiel = Câ Ã 0.5
  posRatio > 0.60 â facteur 1.0 â diffÃ©rentiel = 0
DÃ©lai : 72h (PAS 48h) â refus = repositionnement automatique, sans pÃ©nalitÃ©
```

### Chronologie dÃ©marrage groupe
```
Groupe plein â Tirage instantanÃ© â draw_revealed_at stockÃ©
    â
FenÃªtre 72h : AdjustDeposit + Swaps autorisÃ©s
    â (fin 72h)
1er paiement : cotisations M1 ESCROW â CONTRIBUTION_POOL + payout position 1
    â
Cycle 2 dÃ©marre selon frÃ©quence (WEEKLY / MONTHLY / QUARTERLY)
```

### Score Afiya
```
Plage : 0â100 (plancher 0, plafond 100 â jamais nÃ©gatif)
Initial : 50
DÃ©croissance : â0.5% / semaine d'inactivitÃ© (appliquÃ©e Ã  la connexion en V1)
AprÃ¨s chaque Ã©vÃ©nement : recalculer tier + deposit_coefficient + retention_coefficient

ÃvÃ©nements :
  PAYMENT_SUCCESS   â +3
  PAYMENT_LATE      â 0  (dÃ©lai de grÃ¢ce utilisÃ©)
  CYCLE_COMPLETED   â +8 (FIN du cycle uniquement â jamais au dÃ©marrage)
  DEFAULT_DECLARED  â â25
  VOLUNTARY_EXIT    â â25
  GLOBAL_FUND_USED  â â50 + BANNED
  ACCOUNT_RESTORED  â +5
```

---

## 17. SORTIES & DÃFAUTS

### Sortie en FORMING
- Tout membre peut quitter (admin inclus)
- Frais = 1% du montant remboursÃ© + 5% de la cotisation â GLOBAL_FUND
- Source remboursement : ESCROW â USER_CERCLES
- Si admin sort et reste â¥ 1 membre â transfert admin au meilleur score_at_join (Ã©galitÃ© â joined_at le plus ancien)
- Annulation automatique si 0 membres restants
- Annulation automatique si membres < 4 Ã  la deadline
- **Pas de bouton "Supprimer"** â uniquement "Quitter le cercle"

### Sortie en ACTIVE
- Pas de sortie propre â tout dÃ©part = dÃ©faut
- Statut membre â EXITED (pas RESTRICTED)
- Caution saisie selon rÃ¨gles dÃ©faut â CONTRIBUTION_POOL
- Score â â25 pts (VOLUNTARY_EXIT)
- Champ exit_type: 'VOLUNTARY' stockÃ© sur tontine_members
- Compteur voluntary_exits_count sur profiles :
  - 2Ã¨me sortie â status RESTRICTED 30 jours
  - 3Ã¨me+ â status RESTRICTED 90 jours

### DÃ©faut â 4 couches de protection
```
Couche 1 : Retenue dÃ©jÃ  prÃ©levÃ©e (si Hit & Run â a dÃ©jÃ  reÃ§u)
Couche 2 : Caution individuelle ESCROW â CONTRIBUTION_POOL
Couche 3 : GROUP_MINI_FUND â CONTRIBUTION_POOL
Couche 4 : GLOBAL_FUND â CONTRIBUTION_POOL
```
- Membre dÃ©faillant â statut RESTRICTED, score â25 pts
- 2Ã¨me dÃ©faut â statut BANNED, score â50 pts, blocage tontines dÃ©finitif

### RÃ©tablissement RESTRICTED â ACTIVE
Paiement unique indivisible :
```
Caution complÃ¨te (Câ) â ESCROW_CONSTITUTION
Cotisation manquante   â CONTRIBUTION_POOL (96/1/3%)
PÃ©nalitÃ© 5%           â GLOBAL_FUND
Score â +5 pts (ACCOUNT_RESTORED)
```

### Bannissement (BANNED)
- Blocage dÃ©finitif de toutes les fonctionnalitÃ©s tontines
- Wallet accessible (retrait autorisÃ©)
- VÃ©rifier profile.status !== 'BANNED' dans : joinTontineGroup, createTontineGroup, process_contribution_payment, initiate_swap

---

## 18. SWAPS

```
Conditions Ã©ligibilitÃ© (les deux membres) :
  - Score â¥ 60 (tier Silver minimum)
  - Statut ACTIVE
  - Position pas encore encaissÃ©e (received_payout_at === null)
  - Pas de dÃ©faut en cours
  - DiffÃ©rentiel non payÃ© autorisÃ© si le swap descend vers position moins risquÃ©e

Bonus :
  - Max = 25% de la cagnotte totale (cotisation Ã target_members Ã 0.25)
  - PrÃ©levÃ© immÃ©diatement USER_CERCLES initiateur â wallet escrow temporaire
  - LibÃ©rÃ© vers USER_CERCLES receveur Ã  la confirmation
  - RestituÃ© si refus ou expiration

DÃ©lai : 72h â les membres gÃ¨rent eux-mÃªmes le timing
Logique de secours V1 : vÃ©rifier les expirations Ã  l'ouverture de GroupDetail

Ajustement caution post-swap : recalculer Câ selon nouvelle position pour les deux membres
IrrÃ©vocabilitÃ© : dÃ¨s qu'une des deux parties a encaissÃ© dans la nouvelle configuration
```

### Collection swap_requests
```typescript
{
  id: string
  group_id: string
  initiator_member_id: string
  receiver_member_id: string
  initiator_user_id: string
  receiver_user_id: string
  initiator_position: number
  receiver_position: number
  bonus_amount: number
  bonus_escrow_wallet_id: string | null
  status: 'PENDING' | 'CONFIRMED' | 'REFUSED' | 'EXPIRED' | 'CANCELLED'
  initiated_at: Timestamp
  expires_at: Timestamp  // initiated_at + 72h
  resolved_at: Timestamp | null
  created_at: Timestamp
}
```

---

## 19. FIRESTORE â RÃGLES ABSOLUES

**snake_case PARTOUT â dans Firestore ET dans le code React.**

| â Correct | â Interdit |
|-----------|------------|
| score_afiya | scoreAfiya |
| owner_id | user_id (sur wallets) |
| draw_position | position, drawPosition |
| initial_deposit | initial_deposit_amount |
| full_name | fullName |
| group_id | groupId |
| created_at | createdAt |
| wallet_type | walletType |

**wallet_type valeurs :** USER_MAIN Â· USER_CERCLES Â· USER_CAPITAL Â· ESCROW_CONSTITUTION Â· CONTRIBUTION_POOL Â· GROUP_MINI_FUND Â· GLOBAL_FUND

**TOUTE opÃ©ration financiÃ¨re â runTransaction UNIQUEMENT.**
**JAMAIS setDoc/updateDoc direct sur wallet ou transaction.**

### RÃ¨gles supplÃ©mentaires validÃ©es lors de l'audit V3
- Tout wallet touchÃ© â `updated_at: Timestamp.now()` obligatoire
- Toute transaction crÃ©Ã©e â champ `id: txRef.id` obligatoire
- Balance nÃ©gative interdite â vÃ©rifier solde avant tout dÃ©bit dans la runTransaction
- Score bornÃ© : `Math.max(0, Math.min(100, newScore))`
- AprÃ¨s mise Ã  jour score â recalculer `tier`, `deposit_coefficient`, `retention_coefficient` immÃ©diatement

### Statuts membres tontine
```
PENDING_PAYMENT â ACTIVE â RESTRICTED â BANNED
                         â COMPLETED (fin normale)
                         â EXITED (sortie volontaire FORMING ou ACTIVE)
```

### Profil â champs V3 ajoutÃ©s
```typescript
voluntary_exits_count: number  // dÃ©faut 0 â sorties volontaires en ACTIVE
restricted_until: Timestamp | null  // date fin restriction temporaire
last_activity_at: Timestamp  // pour calcul dÃ©croissance score
```

### tontine_groups â champs V3 ajoutÃ©s
```typescript
draw_revealed_at: Timestamp | null    // dÃ©clenche fenÃªtre 72h
vote_started_at: Timestamp | null     // dÃ©but WAITING_VOTE
vote_deadline: Timestamp | null       // vote_started_at + 48h
cancelled_at: Timestamp | null
cancel_reason: 'ADMIN_REQUEST' | 'INSUFFICIENT_MEMBERS' | 'DEADLINE_NOT_MET' | null
```

### tontine_members â champs V3 ajoutÃ©s
```typescript
wants_to_continue: boolean | null  // vote WAITING_VOTE
voted_at: Timestamp | null
exit_type: 'VOLUNTARY' | 'HIT_AND_RUN' | 'DEFAULT' | null
exited_at: Timestamp | null
left_at: Timestamp | null  // sortie FORMING
```

### payments â champ V3 ajoutÃ©
```typescript
paid_via_retention: boolean | null  // true si payÃ© via retenue post-rÃ©ception
```

---

## 20. TERMINOLOGIE PRODUIT (verrouillÃ©e)

| Mot | Sens exact |
|-----|-----------|
| **TransfÃ©rer** | Entre comptes Afiya OU vers contact Afiya |
| **Recevoir** | Afficher QR code / lien de paiement |
| **Recharger** | Mobile money / banque â compte |
| **Retirer** | Compte â mobile money / banque |
| **Cotiser** | Payer sa cotisation tontine |
| **Cercle** | Tontine privÃ©e (JAMAIS "tontine privÃ©e") |
| **Afiya Pool** | Tontine publique (JAMAIS "tontine publique") |
| **Frais de gestion** | Les % prÃ©levÃ©s sur la cagnotte |
| **Assurance groupe** | Le 1% GROUP_MINI_FUND |
| **Avance cotisation suivante** | La retenue post-rÃ©ception |
| **Caution** | Toujours mentionner "restituÃ©e Ã  la fin" |
| **ComplÃ©ment requis** | DiffÃ©rentiel caution post-tirage |
| **FCFA** | Toujours (jamais XOF, euro, â¬) |
| **Quitter le cercle** | Seule action de sortie â jamais "Supprimer la tontine" |

---

## 21. INTERDICTIONS ABSOLUES (checklist avant chaque commit)

- [ ] Pas de rouge ou orange dans l'UI
- [ ] Pas de dÃ©gradÃ© sur surface UI
- [ ] Pas de box-shadow dÃ©coratif sur card
- [ ] Pas de glassmorphism / backdrop-blur dÃ©coratif
- [ ] Police Manrope partout
- [ ] Fond de page #F5F4F0 (pas #FAFAF8)
- [ ] Tous les avatars membres en #047857 (pas de couleur alÃ©atoire)
- [ ] Badge "En formation" : bg #F5F4F0 / text #6B6B6B (jamais jaune/marron)
- [ ] FAB fermÃ© â icÃ´ne X sur fond VERT (jamais noir)
- [ ] Pas de TabBar sur les Ã©crans secondaires
- [ ] Pas de tiret cadratin dans l'UI
- [ ] Firestore en snake_case
- [ ] OpÃ©rations financiÃ¨res via runTransaction
- [ ] Admin = aucune action spÃ©ciale dans l'interface
- [ ] Couleur ambre #92400E UNIQUEMENT pour retards rÃ©els
- [ ] updated_at sur chaque wallet touchÃ©
- [ ] id: txRef.id sur chaque transaction crÃ©Ã©e
- [ ] Score : Math.max(0, Math.min(100, score)) â jamais nÃ©gatif
- [ ] Flux tontines depuis USER_CERCLES (pas USER_MAIN)
- [ ] Bannissement â vÃ©rifier profile.status !== 'BANNED' avant toute action tontine

---

## 22. PRÃNOMS ET NOMS DANS LES EXEMPLES

Utiliser des prÃ©noms et noms bÃ©ninois et ouest-africains :
FifamÃ¨, Ayivi, Dossou, Koffi, Afi, Kwame, Adjoua, Oumar, Fatou, Mamadou, Afia, Gbessi, Adjovi, KonÃ©, Diallo

---

*Afiya V3 â CLAUDE.md v3.0 â Audit logique mÃ©tier complet validÃ©*
