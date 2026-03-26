/**
 * AFIYA V3 — Script de Seed Utilisateurs de Test
 * ================================================
 * Crée 10 comptes Firebase Auth + profils Firestore + wallets USER_MAIN
 *
 * UTILISATION :
 *   1. Copier ce fichier à la racine du projet Afiya V3
 *   2. npm install firebase-admin (si pas déjà installé)
 *   3. Télécharger la clé de service Firebase :
 *      Firebase Console → Paramètres projet → Comptes de service
 *      → Générer une nouvelle clé privée → sauvegarder en tant que
 *      serviceAccountKey.json à la racine du projet
 *   4. node seed-users.js
 *
 * ⚠️  NE PAS COMMITTER serviceAccountKey.json sur GitHub
 * ⚠️  NE PAS EXÉCUTER deux fois — les emails existent déjà
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

// ─── Init Firebase Admin ───────────────────────────────────────────────────
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({ credential: cert(serviceAccount) });

const auth = getAuth();
const db = getFirestore();

// ─── Helpers ───────────────────────────────────────────────────────────────

function getTierFromScore(score) {
  if (score >= 90) return 'PLATINUM';
  if (score >= 75) return 'GOLD';
  if (score >= 60) return 'SILVER';
  return 'BRONZE';
}

function getCoeffFromTier(tier) {
  return { PLATINUM: 0.25, GOLD: 0.5, SILVER: 0.75, BRONZE: 1.0 }[tier];
}

// ─── Données des 10 comptes ────────────────────────────────────────────────
//
//  Scores couvrent tous les tiers :
//  BRONZE    : 0–59   → Fifamè, Kossi
//  SILVER    : 60–74  → Ayivi, Adjoua
//  GOLD      : 75–89  → Dossou, Afi, Kwame
//  PLATINUM  : 90–100 → Oumar, Fatou, Mamadou

const USERS = [
  {
    email: 'fifame@afiya.test',
    full_name: 'Fifamè Agbodjan',
    score_afiya: 34,
    balance: 75000,       // 75 000 FCFA
  },
  {
    email: 'kossi@afiya.test',
    full_name: 'Kossi Hounsou',
    score_afiya: 51,
    balance: 120000,      // 120 000 FCFA
  },
  {
    email: 'ayivi@afiya.test',
    full_name: 'Ayivi Dossou',
    score_afiya: 63,
    balance: 200000,      // 200 000 FCFA
  },
  {
    email: 'adjoua@afiya.test',
    full_name: 'Adjoua Mensah',
    score_afiya: 70,
    balance: 350000,      // 350 000 FCFA
  },
  {
    email: 'dossou@afiya.test',
    full_name: 'Dossou Amoussou',
    score_afiya: 76,
    balance: 500000,      // 500 000 FCFA
  },
  {
    email: 'afi@afiya.test',
    full_name: 'Afi Kpodénou',
    score_afiya: 82,
    balance: 750000,      // 750 000 FCFA
  },
  {
    email: 'kwame@afiya.test',
    full_name: 'Kwame Soglo',
    score_afiya: 88,
    balance: 1000000,     // 1 000 000 FCFA
  },
  {
    email: 'oumar@afiya.test',
    full_name: 'Oumar Traoré',
    score_afiya: 91,
    balance: 1500000,     // 1 500 000 FCFA
  },
  {
    email: 'fatou@afiya.test',
    full_name: 'Fatou Diallo',
    score_afiya: 96,
    balance: 2000000,     // 2 000 000 FCFA
  },
  {
    email: 'mamadou@afiya.test',
    full_name: 'Mamadou Koné',
    score_afiya: 100,
    balance: 5000000,     // 5 000 000 FCFA
  },
];

const PASSWORD = '123456';

// ─── Création des comptes ──────────────────────────────────────────────────

async function createUser(userData) {
  const { email, full_name, score_afiya, balance } = userData;
  const tier = getTierFromScore(score_afiya);
  const coeff = getCoeffFromTier(tier);

  console.log(`\n→ Création de ${full_name} (${email})`);
  console.log(`  Score: ${score_afiya} | Tier: ${tier} | Solde: ${balance.toLocaleString('fr-FR')} FCFA`);

  // 1. Créer le compte Firebase Auth
  let userRecord;
  try {
    userRecord = await auth.createUser({
      email,
      password: PASSWORD,
      displayName: full_name,
    });
    console.log(`  ✓ Auth créé : ${userRecord.uid}`);
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      console.log(`  ⚠️  Email déjà existant, récupération du UID...`);
      userRecord = await auth.getUserByEmail(email);
    } else {
      throw err;
    }
  }

  const uid = userRecord.uid;
  const now = Timestamp.now();

  // 2. Créer le profil Firestore
  await db.collection('profiles').doc(uid).set({
    id: uid,
    email,
    full_name,
    score_afiya,
    tier,
    status: 'ACTIVE',
    deposit_coefficient: coeff,
    retention_coefficient: coeff,
    kyc_status: 'APPROVED',
    last_activity_at: now,
    created_at: now,
  });
  console.log(`  ✓ Profil Firestore créé`);

  // 3. Créer le wallet USER_MAIN
  const walletId = `${uid}_main`;
  await db.collection('wallets').doc(walletId).set({
    id: walletId,
    owner_id: uid,
    group_id: null,
    wallet_type: 'USER_MAIN',
    balance,
    currency: 'XOF',
    updated_at: now,
  });
  console.log(`  ✓ Wallet créé (${balance.toLocaleString('fr-FR')} FCFA)`);
}

async function main() {
  console.log('════════════════════════════════════════');
  console.log('  AFIYA V3 — Seed Utilisateurs de Test  ');
  console.log('════════════════════════════════════════');
  console.log(`  ${USERS.length} comptes à créer | Mot de passe : ${PASSWORD}`);

  for (const user of USERS) {
    await createUser(user);
  }

  console.log('\n════════════════════════════════════════');
  console.log('  ✅ Seed terminé avec succès !');
  console.log('\n  Comptes disponibles :');
  USERS.forEach(u => {
    const tier = getTierFromScore(u.score_afiya);
    console.log(`  ${u.email.padEnd(25)} | ${tier.padEnd(9)} | score ${u.score_afiya}`);
  });
  console.log('\n  Mot de passe pour tous : 123456');
  console.log('════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('\n❌ Erreur :', err.message);
  process.exit(1);
});
