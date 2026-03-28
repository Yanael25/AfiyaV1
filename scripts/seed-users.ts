import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

// ─── Init Firebase Admin ───────────────────────────────────────────────────
const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Fichier serviceAccountKey.json introuvable à la racine du projet.');
  process.exit(1);
}
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: config.projectId,
});

const auth = getAuth(app);
const db = getFirestore(app, config.firestoreDatabaseId);

// ─── Helpers ───────────────────────────────────────────────────────────────

function getTierFromScore(score: number) {
  if (score >= 90) return 'PLATINUM';
  if (score >= 75) return 'GOLD';
  if (score >= 60) return 'SILVER';
  return 'BRONZE';
}

function getCoeffFromTier(tier: string) {
  return { PLATINUM: 0.25, GOLD: 0.5, SILVER: 0.75, BRONZE: 1.0 }[tier] || 1.0;
}

// ─── Données des 10 comptes ────────────────────────────────────────────────
const USERS = [
  {
    email: 'fifame@afiya.test',
    full_name: 'Fifamè Agbodjan',
    score_afiya: 34,
    balance: 75000,
  },
  {
    email: 'kossi@afiya.test',
    full_name: 'Kossi Hounsou',
    score_afiya: 51,
    balance: 120000,
  },
  {
    email: 'ayivi@afiya.test',
    full_name: 'Ayivi Dossou',
    score_afiya: 63,
    balance: 200000,
  },
  {
    email: 'adjoua@afiya.test',
    full_name: 'Adjoua Mensah',
    score_afiya: 70,
    balance: 350000,
  },
  {
    email: 'dossou@afiya.test',
    full_name: 'Dossou Amoussou',
    score_afiya: 76,
    balance: 500000,
  },
  {
    email: 'afi@afiya.test',
    full_name: 'Afi Kpodénou',
    score_afiya: 82,
    balance: 750000,
  },
  {
    email: 'kwame@afiya.test',
    full_name: 'Kwame Soglo',
    score_afiya: 88,
    balance: 1000000,
  },
  {
    email: 'oumar@afiya.test',
    full_name: 'Oumar Traoré',
    score_afiya: 91,
    balance: 1500000,
  },
  {
    email: 'fatou@afiya.test',
    full_name: 'Fatou Diallo',
    score_afiya: 96,
    balance: 2000000,
  },
  {
    email: 'mamadou@afiya.test',
    full_name: 'Mamadou Koné',
    score_afiya: 100,
    balance: 5000000,
  },
];

const PASSWORD = '123456';

// ─── Création des comptes ──────────────────────────────────────────────────

async function createUser(userData: any) {
  const { email, full_name, score_afiya, balance } = userData;
  const tier = getTierFromScore(score_afiya);
  const coeff = getCoeffFromTier(tier);

  console.log(`\n→ Création de ${full_name} (${email})`);
  console.log(`  Score: ${score_afiya} | Tier: ${tier} | Solde: ${balance.toLocaleString('fr-FR')} FCFA`);

  let userRecord;
  try {
    userRecord = await auth.createUser({
      email,
      password: PASSWORD,
      displayName: full_name,
    });
    console.log(`  ✓ Auth créé : ${userRecord.uid}`);
  } catch (err: any) {
    if (err.code === 'auth/email-already-exists') {
      console.log(`  ⚠️  Email déjà existant, récupération du UID...`);
      userRecord = await auth.getUserByEmail(email);
    } else {
      throw err;
    }
  }

  const uid = userRecord.uid;
  const now = Timestamp.now();

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
