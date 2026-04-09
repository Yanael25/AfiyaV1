import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

// Load config
const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Load service account key
const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Fichier serviceAccountKey.json introuvable à la racine du projet.');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: config.projectId,
});

const db = getFirestore(app, config.firestoreDatabaseId);
const auth = getAuth(app);

const USERS_TO_SEED = [
  { email: 'fifame@test.af',   password: 'afiya123', full_name: 'Fifamè Agbodjan',  score: 34,  balance_main: 75000   },
  { email: 'kossi@test.af',    password: 'afiya123', full_name: 'Kossi Hounsou',     score: 51,  balance_main: 120000  },
  { email: 'ayivi@test.af',    password: 'afiya123', full_name: 'Ayivi Dossou',      score: 63,  balance_main: 200000  },
  { email: 'adjoua@test.af',   password: 'afiya123', full_name: 'Adjoua Mensah',     score: 70,  balance_main: 350000  },
  { email: 'dossou@test.af',   password: 'afiya123', full_name: 'Dossou Amoussou',   score: 76,  balance_main: 500000  },
  { email: 'afi@test.af',      password: 'afiya123', full_name: 'Afi Kpodénou',      score: 82,  balance_main: 750000  },
  { email: 'kwame@test.af',    password: 'afiya123', full_name: 'Kwame Soglo',        score: 88,  balance_main: 1000000 },
  { email: 'oumar@test.af',    password: 'afiya123', full_name: 'Oumar Traoré',      score: 91,  balance_main: 1500000 },
  { email: 'fatou@test.af',    password: 'afiya123', full_name: 'Fatou Diallo',      score: 96,  balance_main: 2000000 },
  { email: 'mamadou@test.af',  password: 'afiya123', full_name: 'Mamadou Koné',      score: 100, balance_main: 5000000 },
];

// ─── ÉTAPE 1 : Suppression de tous les comptes existants ─────────────────────

async function purgeCollection(name: string) {
  const snap = await db.collection(name).get();
  if (snap.empty) return;
  // Firestore batch max 500 ops
  const chunks: FirebaseFirestore.QueryDocumentSnapshot[][] = [];
  for (let i = 0; i < snap.docs.length; i += 400) {
    chunks.push(snap.docs.slice(i, i + 400));
  }
  for (const chunk of chunks) {
    const batch = db.batch();
    for (const doc of chunk) batch.delete(doc.ref);
    await batch.commit();
  }
  console.log(`  ✓ ${snap.size} doc(s) supprimé(s) dans "${name}"`);
}

async function deleteAllData() {
  console.log('\n🗑️  Suppression des comptes Auth existants...\n');

  const listResult = await auth.listUsers();
  let count = 0;

  for (const userRecord of listResult.users) {
    const uid = userRecord.uid;
    try {
      await auth.deleteUser(uid);
      console.log(`  ✓ Auth supprimé : ${uid} (${userRecord.email})`);
      count++;
    } catch (error: any) {
      console.error(`  ❌ Erreur suppression Auth ${uid}:`, error.message);
    }
  }

  console.log(`\n  🗑️  ${count} compte(s) Auth supprimé(s)\n`);

  // ── Purge totale de toutes les collections ──────────────────────────────────
  console.log('🗑️  Purge des collections Firestore...\n');

  const COLLECTIONS_TO_PURGE = [
    'profiles',
    'wallets',
    'tontine_groups',
    'tontine_members',
    'cycles',
    'payments',
    'transactions',
    'notifications',
    'messages',
  ];

  for (const col of COLLECTIONS_TO_PURGE) {
    await purgeCollection(col);
  }

  // Restaurer le wallet global_fund_main (ne doit pas être supprimé)
  await db.collection('wallets').doc('global_fund_main').set({
    id: 'global_fund_main',
    owner_id: 'SYSTEM',
    group_id: null,
    wallet_type: 'GLOBAL_FUND',
    balance: 0,
    currency: 'XOF',
    updated_at: Timestamp.now(),
  });
  console.log('  ✓ Wallet global_fund_main restauré\n');

  console.log(`════════════════════════════════════════`);
  console.log(`  ✅ Reset Firestore terminé`);
  console.log(`════════════════════════════════════════\n`);
}

// ─── ÉTAPE 2-3 : Création des nouveaux comptes ───────────────────────────────

async function seedUsers() {
  console.log('  AFIYA V3 — Seed Utilisateurs de Test  ');
  console.log('════════════════════════════════════════\n');

  const recap: { email: string; full_name: string; tier: string; score: number; balance_main: number; password: string }[] = [];

  for (const userData of USERS_TO_SEED) {
    console.log(`→ Création de ${userData.full_name} (${userData.email})`);
    try {
      // A. Firebase Auth
      const userRecord = await auth.createUser({
        email: userData.email,
        password: userData.password,
        displayName: userData.full_name,
      });
      const uid = userRecord.uid;
      console.log(`  ✓ Auth créé : ${uid}`);

      // B. Calculs tier et coefficients
      const score = userData.score;
      const tier = score >= 90 ? 'PLATINUM' : score >= 75 ? 'GOLD' : score >= 60 ? 'SILVER' : 'BRONZE';
      const coeffs: Record<string, number> = { PLATINUM: 0.25, GOLD: 0.5, SILVER: 0.75, BRONZE: 1.0 };
      const coeff = coeffs[tier];

      // C. Profil Firestore
      await db.collection('profiles').doc(uid).set({
        id: uid,
        email: userData.email,
        full_name: userData.full_name,
        score_afiya: score,
        tier,
        status: 'ACTIVE',
        deposit_coefficient: coeff,
        retention_coefficient: coeff,
        kyc_status: 'APPROVED',
        last_activity_at: Timestamp.now(),
        created_at: Timestamp.now(),
      });
      console.log(`  ✓ Profil créé (Tier: ${tier}, Coeff: ${coeff})`);

      // D-F. Wallets via batch
      const mainId     = `wallet_main_${uid}`;
      const cerclesId  = `wallet_cercles_${uid}`;
      const capitalId  = `wallet_capital_${uid}`;
      const now        = Timestamp.now();

      const batch = db.batch();

      batch.set(db.collection('wallets').doc(mainId), {
        id: mainId,
        owner_id: uid,
        group_id: null,
        wallet_type: 'USER_MAIN',
        balance: userData.balance_main,
        currency: 'XOF',
        updated_at: now,
      });

      batch.set(db.collection('wallets').doc(cerclesId), {
        id: cerclesId,
        owner_id: uid,
        group_id: null,
        wallet_type: 'USER_CERCLES',
        balance: 0,
        currency: 'XOF',
        updated_at: now,
      });

      batch.set(db.collection('wallets').doc(capitalId), {
        id: capitalId,
        owner_id: uid,
        group_id: null,
        wallet_type: 'USER_CAPITAL',
        balance: 0,
        currency: 'XOF',
        updated_at: now,
      });

      await batch.commit();
      console.log(`  ✓ Wallets créés (USER_MAIN: ${userData.balance_main.toLocaleString('fr-FR')} XOF)\n`);

      recap.push({ email: userData.email, full_name: userData.full_name, tier, score, balance_main: userData.balance_main, password: userData.password });

    } catch (error: any) {
      console.error(`  ❌ Erreur pour ${userData.email}:`, error.message, '\n');
    }
  }

  // ÉTAPE 4 — Tableau récap
  console.log('════════════════════════════════════════════════════════════════════════════════════════');
  console.log('  RÉCAP');
  console.log('════════════════════════════════════════════════════════════════════════════════════════');
  console.log(
    'email'.padEnd(24) +
    'full_name'.padEnd(22) +
    'tier'.padEnd(10) +
    'score'.padEnd(7) +
    'balance_main'.padEnd(14) +
    'password'
  );
  console.log('─'.repeat(88));
  for (const r of recap) {
    console.log(
      r.email.padEnd(24) +
      r.full_name.padEnd(22) +
      r.tier.padEnd(10) +
      String(r.score).padEnd(7) +
      r.balance_main.toLocaleString('fr-FR').padEnd(14) +
      r.password
    );
  }
  console.log('════════════════════════════════════════════════════════════════════════════════════════');
  console.log(`\n  ✅ ${recap.length} compte(s) créé(s) avec succès.`);
  console.log('════════════════════════════════════════════════════════════════════════════════════════\n');
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('════════════════════════════════════════');
  console.log('  AFIYA V3 — Reset & Seed              ');
  console.log('════════════════════════════════════════');
  await deleteAllData();
  await seedUsers();
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
