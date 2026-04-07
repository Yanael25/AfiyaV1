# AFIYA V3 — Instructions absolues pour Claude Code

Tu travailles sur **Afiya V3**, une application web responsive (mobile/tablette/desktop) de tontine digitale, wallet personnel et patrimoine, ciblant le marché ouest-africain (Bénin) et la diaspora européenne.

**Tagline :** "Votre épargne, à votre façon."

**RÈGLE FONDAMENTALE :** Chaque décision de code doit être justifiée. Rien au hasard. Si tu n'es pas certain d'une valeur (couleur, taille, espacement), tu utilises EXACTEMENT ce qui est défini dans ce fichier — jamais une valeur inventée.

---

## 1. STACK TECHNIQUE (non négociable)

| Couche | Technologie |
|--------|-------------|
| Frontend | React + TypeScript strict |
| Routing | React Router DOM |
| Styling | Tailwind CSS (utility classes uniquement) |
| Animations | Framer Motion (motion/react) |
| Icônes | Lucide React EXCLUSIVEMENT |
| Backend | Firebase — Firestore + Firebase Auth |
| Police | Manrope — Google Fonts |

**INTERDITS :** React Native, Expo, Supabase, Mock DB, localStorage comme base de données.

**Affichage :** responsive natif — mobile, tablette, desktop. Ne pas toucher au comportement d'affichage existant.

---

## 2. POLICE — MANROPE

Manrope doit être chargée dans `src/index.css` :
```css
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap');
```

Et appliquée globalement :
```css
body { font-family: 'Manrope', sans-serif; }
```

**JAMAIS** Inter, Roboto, Arial, Space Grotesk, ou toute autre police.

---

## 3. DESIGN TOKENS — COULEURS

```
--color-bg:       #F5F4F0   Fond de page ivoire chaud — PARTOUT, aucune exception
--color-surface:  #FFFFFF   Surface card
--color-action:   #047857   Couleur action UNIQUE — CTA, actif, montant positif
--color-border:   #EDECEA   Bordure card — subtile
--color-text-1:   #1A1A1A   Texte principal
--color-text-2:   #6B6B6B   Texte secondaire
--color-text-3:   #A39887   Labels, tertiaire, inactif
--color-text-4:   #C4B8AC   Placeholder, désactivé, zéros
--color-alert:    #92400E   Alerte — retard et blocage critique UNIQUEMENT
--color-info:     #1D4ED8   Information / lien
--color-success-bg: #F0FDF4  Fond info positive / rassurante
--color-success-border: #D1FAE5  Bordure info positive
```

### Couleurs de statut badges
```
Actif       → bg #D1FAE5 / text #065F46
En formation → bg #F5F4F0 / text #6B6B6B
Complété    → bg #F5F4F0 / text #A39887
Bronze      → bg #FEF3C7 / text #92400E
Silver      → bg #F1F5F9 / text #475569
Gold        → bg #FEF9C3 / text #A16207
Platinum    → bg #F8FAFC / text #334155 / border #CBD5E1
```

### INTERDICTIONS ABSOLUES de couleur
- ❌ Rouge ou orange dans l'UI
- ❌ Dégradé sur surface UI (gradient sur card, bouton, fond de page)
- ❌ box-shadow décoratif sur card
- ❌ Glassmorphism / backdrop-blur décoratif
- ❌ #FAFAF8 comme fond de page — c'est l'ancienne valeur, remplacée par #F5F4F0

---

## 4. DESIGN TOKENS — TYPOGRAPHIE

| Usage | Taille / Weight | Couleur |
|-------|----------------|---------|
| Titre de page | 26px / 800 | #1A1A1A |
| Montant principal wallet | 28–36px / 800 | #1A1A1A |
| Titre card / section | 14–15px / 700 | #1A1A1A |
| Corps texte principal | 13–14px / 500–600 | #6B6B6B |
| Label section (uppercase) | 8–9px / 700 | #A39887 — letter-spacing: 0.12em |
| Caption / date / meta | 10–11px / 500 | #A39887 |
| Montant positif (entrée) | — | #047857 |
| Montant négatif (sortie) | — | #1A1A1A (JAMAIS rouge) |
| Unité FCFA | 13–15px / 600 | #A39887 |
| Placeholder | — | #C4B8AC |

### Format montants
- Séparateur milliers : espace (50 000 FCFA — PAS de virgule, PAS de point)
- Toujours avec "FCFA" après le montant
- Entrant : préfixe "+" en vert #047857
- Sortant : préfixe "−" en #1A1A1A

---

## 5. DESIGN TOKENS — ESPACEMENTS

| Token | Valeur | Usage |
|-------|--------|-------|
| Marge horizontale page | 24px | `px-6` — partout |
| Padding interne card | 14–20px | `p-3.5` à `p-5` |
| Espacement entre sections | 24px | `mb-6` |
| Gap entre items liste | 8–12px | `gap-2` à `gap-3` |
| Safe area top | 52px | `pt-[52px]` |
| Safe area bottom (TabBar) | 80px | `pb-20` |
| Touch target minimum | 48px | height min sur tous les éléments interactifs |

---

## 6. DESIGN TOKENS — BORDER RADIUS

| Usage | Valeur | Tailwind |
|-------|--------|---------|
| Card principale | 18–20px | `rounded-[20px]` |
| Élément interne card | 10–14px | `rounded-[12px]` |
| Bouton standard | 14–16px | `rounded-[16px]` |
| Champ input | 13–14px | `rounded-[14px]` |
| Badge / pill | 5–6px | `rounded-[6px]` |
| Bouton retour | 11–12px | `rounded-[12px]` |
| Avatar | 14–16px | `rounded-[16px]` |
| FAB | 13–14px | `rounded-[14px]` |

---

## 7. COMPOSANTS — BOUTONS

### Primaire
```
height: 52px
background: #047857
color: white
border-radius: 16px
font-size: 15px
font-weight: 700
width: 100%
→ 1 SEUL par écran maximum
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

**INTERDIT :** bouton rouge pour "Déconnexion" ou "Refuser" — utiliser Ghost.

---

## 8. COMPOSANTS — CARDS

### Card surface (principale)
```
background: #FFFFFF
border-radius: 18–20px
border: 0.5px solid #EDECEA
padding: 14–20px
```

### Card inner (à l'intérieur d'une card)
```
background: #F5F4F0
border-radius: 10–14px
padding: 10–12px
→ JAMAIS un border-radius > card parente
```

### Card info positive
```
background: #F0FDF4
border: 0.5px solid #D1FAE5
border-radius: 12–14px
```

### Card alerte (retard uniquement)
```
border-left: 2px solid #92400E
→ PAS de fond coloré, juste la bordure gauche
```

---

## 9. COMPOSANTS — CHAMPS DE FORMULAIRE

```
height: 48–52px
background repos: #F5F4F0
border repos: 1px solid #EDECEA
border-radius: 13–14px
padding: 0 14–16px
font-size: 14–15px
font-weight: 500–600

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

## 10. COMPOSANTS — SOUS-ONGLETS

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

→ Cette règle s'applique à TOUS les sous-onglets de l'app (GroupDetail, JoinGroup, Cercles).

---

## 11. COMPOSANTS — TABBAR

```
4 onglets : Wallet · Cercles · Capital · Profil
Height: 64px
Background: white / border-top: 0.5px solid #EDECEA

Onglet actif:
  Icône: couleur #047857 / strokeWidth 2
  Pill bg: rgba(4,120,87,0.1) / border-radius: 9px
  Label: #047857 / font-weight 700

Onglet inactif:
  Icône: couleur #A39887 / strokeWidth 1.5
  Label: #A39887 / font-weight 500

Icônes:
  Wallet → CreditCard (ou Wallet)
  Cercles → Users
  Capital → TrendingUp
  Profil → User

Badge notification (KYC incomplet):
  Point ambre #92400E / 8px / top-right de l'icône Profil
```

**TabBar UNIQUEMENT sur les 4 onglets principaux. JAMAIS sur les écrans secondaires.**

---

## 12. COMPOSANTS — FAB

```
Background: #047857
Border-radius: 13–14px
Width/Height: 42–48px
Position: fixed bottom-right — bottom: 88px / right: 14–16px

Icône fermée: Plus (blanc)
Icône ouverte: X (blanc) — MÊME fond vert #047857 — JAMAIS noir ou autre couleur

Menu ouvert:
  Background: white
  Border-radius: 16px
  Border: 0.5px solid #EDECEA
  Options: icône + texte
```

---

## 13. COMPOSANTS — TRANSACTIONS (anatomie)

Chaque ligne de transaction :
```
Gauche: icône 40×40px radius 12px
  Entrant → bg #D1FAE5 / icône #047857
  Sortant → bg #F5F4F0 / icône #6B6B6B
  En cours → bg #FEF9C3 / icône #92400E

Centre ligne 1: Nom transaction — 14px / 600 / #1A1A1A
Centre ligne 2: "12 janv. · Principal" — 12px / 500 / #A39887

Droite: Montant — 14px / 700
  Entrant: "+300 000 FCFA" en #047857
  Sortant: "−50 000 FCFA" en #1A1A1A
  En cours: "En cours" en #92400E
```

Icônes par type:
```
Cagnotte reçue    → Trophy
Cotisation        → Users
Transfert comptes → ArrowLeftRight
Envoi contact     → Send
Recharge          → ArrowDownToLine
Retrait           → ArrowUpFromLine
Restitution caution → Unlock
Paiement caution  → Lock
En cours          → Clock
```

Groupement par date : label "AUJOURD'HUI / HIER / 12 JANV." en 10px/700/uppercase/#A39887.

---

## 14. NAVIGATION

| Écran | Type | TabBar |
|-------|------|--------|
| GroupDetail | Push droite | Non |
| CreateGroup | Push droite | Non |
| JoinGroup | Push droite | Non |
| AdjustDeposit | Modal bas | Non |
| TirageAuSort | Push droite | Non |
| Confirmations | Modal bas | Non |

Transitions TabBar : **fade 200ms ease-out** — PAS de slide horizontal.

---

## 15. SCREENS — STRUCTURE

### Screens existants (NE JAMAIS recréer sans ordre explicite)
```
src/screens/auth/   → Splash, Welcome, Register (ou Signup), Login, Kyc
src/screens/tabs/   → Wallet (ou Home), Tontines, Patrimoine, Profile
src/screens/group/  → GroupDetail, CreateGroup, JoinGroup, AdjustDeposit, TirageAuSort
src/components/     → TabBar, StatusBar
```

### Wallet
- 3 cards swipeables : Principal · Cercles · Capital — toutes blanches `#FFFFFF`
- Actions contextuelles selon card active :
  - Principal : Transférer / Recevoir / Recharger / Retirer
  - Cercles : Transférer / Recevoir / Cotiser / Mes cercles
  - Capital : Transférer / Recevoir / Explorer
- Section Répartition fixe sous les actions
- 5 transactions récentes groupées par date
- Section "Pour vous" en bas

### Cercles
- Header : titre + loupe
- Sous-onglets : Mes cercles / Afiya Pools
- Résumé (cercles actifs / prochaine cagnotte / prochain paiement)
- Liste par statut : ACTIFS → EN FORMATION → COMPLÉTÉS
- FAB vert avec menu : Créer un cercle / Rejoindre un cercle

### GroupDetail — 3 sous-onglets
1. **Détails** (EN FORMATION : progression, invitation code+lien, règles, note tirage Afiya)
1. **Détails** (ACTIF : cagnotte+fonds assurance, ma situation+breakdown frais, cotisation, protection)
2. **Positions** (avant tirage : attente / après : liste par rang + bloc échange séparé)
3. **Cycles** (timeline : passé/en cours/à venir — montants nets exacts)
- FAB chat en bas à droite

**RÈGLE CRITIQUE : l'admin n'a AUCUNE action spéciale dans l'interface. Même UI pour tous.**

### Profile
- Avatar initiales vert 56×56px radius 16px
- Nom + email + "Membre depuis X" en #C4B8AC
- Bloc Score : valeur /100 + badge tier + barre progression + avantages (3 lignes) + lien calcul
- Menus : Compte / Préférences / Support
- Boutons bas : Partager Afiya (secondaire) + Se déconnecter (ghost)
- Version "Afiya v1.0.0" en #C4B8AC

### CreateGroup — 2 étapes
1. Paramètres : Nom / Cotisation / Fréquence (Hebdo·Bimensuel·Mensuel) / Membres cible
2. Confirmation : Récap + Cagnotte potentielle + Caution + Total à payer + Bouton "Créer le cercle"

### JoinGroup — 2 étapes
1. Code AFY-XXXX-XXX + aperçu cercle (fond #F0FDF4) après validation
2. Détails cercle + tier utilisateur + breakdown paiement + Bouton "Rejoindre et payer"

### AdjustDeposit
- Contexte (card verte) : position + explication ajustement
- Breakdown caution : initiale → requise → complément
- Note restitution (fond #F0FDF4)
- Délai 48h (fond #F5F4F0)
- Bouton "Payer X FCFA" (primaire) + "Refuser et être repositionné" (ghost)

---

## 16. CALCULS FINANCIERS

### Distribution cotisation — 3 transactions OBLIGATOIRES via runTransaction
```
96% → CONTRIBUTION_POOL
1%  → GROUP_MINI_FUND (appartient au groupe)
3%  → GLOBAL_FUND
```

### Versement net (ce que l'utilisateur reçoit réellement)
```
Cagnotte brute = cotisation × nombre_membres
Frais gestion  = cagnotte_brute × % tier (Bronze 3% / Silver 2.5% / Gold 2% / Platinum 1.5%)
Assurance      = cagnotte_brute × 1%
Versement net  = cagnotte_brute − frais_gestion − assurance
```

→ C'est ce montant NET qui s'affiche dans les Cycles et dans "Ma situation".

### Tiers
| Tier | Score | Coeff caution | Cotis max | Membres max | Frais |
|------|-------|--------------|-----------|-------------|-------|
| BRONZE | 0–59 | 1,0× | 500 000 FCFA | 10 | 3% |
| SILVER | 60–74 | 0,75× | 1 000 000 FCFA | 20 | 2,5% |
| GOLD | 75–89 | 0,5× | 2 000 000 FCFA | 30 | 2% |
| PLATINUM | 90–100 | 0,25× | Illimitée | 30 | 1,5% |

### Caution post-tirage (AdjustDeposit)
```
Positions 1–30%  → caution × 2,0 → différentiel = caution initiale
Positions 31–60% → caution × 1,5 → différentiel = 50% caution initiale
Positions 61–100% → rien à payer
Délai : 48h — refus = repositionnement automatique, sans pénalité
```

### Score Afiya
```
Plage: 0–100 / Initial: 50
Décroissance: −0,5% / semaine d'inactivité
Gain: +8 pts à la FIN d'un cycle complété UNIQUEMENT
```

---

## 17. FIRESTORE — RÈGLES ABSOLUES

**snake_case PARTOUT — dans Firestore ET dans le code React.**

| ✅ Correct | ❌ Interdit |
|-----------|------------|
| score_afiya | scoreAfiya |
| owner_id | user_id (sur wallets) |
| draw_position | position, drawPosition |
| initial_deposit | initial_deposit_amount |
| full_name | fullName |
| group_id | groupId |
| created_at | createdAt |
| wallet_type | walletType |

**wallet_type valeurs :** USER_MAIN · USER_CERCLES · USER_CAPITAL · ESCROW_CONSTITUTION · CONTRIBUTION_POOL · GROUP_MINI_FUND · GLOBAL_FUND

**TOUTE opération financière → runTransaction UNIQUEMENT.**
**JAMAIS setDoc/updateDoc direct sur wallet ou transaction.**

---

## 18. TERMINOLOGIE PRODUIT (verrouillée)

| Mot | Sens exact |
|-----|-----------|
| **Transférer** | Entre comptes Afiya OU vers contact Afiya |
| **Recevoir** | Afficher QR code / lien de paiement |
| **Recharger** | Mobile money / banque → compte |
| **Retirer** | Compte → mobile money / banque |
| **Cotiser** | Payer sa cotisation tontine |
| **Cercle** | Tontine privée (JAMAIS "tontine privée") |
| **Afiya Pool** | Tontine publique (JAMAIS "tontine publique") |
| **Frais de gestion** | Les % prélevés sur la cagnotte |
| **Assurance groupe** | Le 1% GROUP_MINI_FUND |
| **Avance cotisation suivante** | La retenue post-réception |
| **Caution** | Toujours mentionner "restituée à la fin" |
| **Complément requis** | Différentiel caution post-tirage |
| **FCFA** | Toujours (jamais XOF, euro, €) |

---

## 19. INTERDICTIONS ABSOLUES (checklist avant chaque commit)

- [ ] Pas de rouge ou orange dans l'UI
- [ ] Pas de dégradé sur surface UI
- [ ] Pas de box-shadow décoratif sur card
- [ ] Pas de glassmorphism / backdrop-blur décoratif
- [ ] Police Manrope partout
- [ ] Fond de page #F5F4F0 (pas #FAFAF8)
- [ ] Tous les avatars membres en #047857 (pas de couleur aléatoire)
- [ ] Badge "En formation" : bg #F5F4F0 / text #6B6B6B (jamais jaune/marron)
- [ ] FAB fermé → icône X sur fond VERT (jamais noir)
- [ ] Pas de TabBar sur les écrans secondaires
- [ ] Pas de tiret cadratin dans l'UI
- [ ] Firestore en snake_case
- [ ] Opérations financières via runTransaction
- [ ] Admin = aucune action spéciale dans l'interface
- [ ] Couleur ambre #92400E UNIQUEMENT pour retards réels

---

## 20. PRÉNOMS ET NOMS DANS LES EXEMPLES

Utiliser des prénoms et noms béninois et ouest-africains :
Fifamè, Ayivi, Dossou, Koffi, Afi, Kwame, Adjoua, Oumar, Fatou, Mamadou, Afia, Gbessi, Adjovi, Koné, Diallo

---

*Afiya V3 — CLAUDE.md v1.0 — Brainstorming Design System validé*
