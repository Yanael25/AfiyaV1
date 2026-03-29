import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
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
  { email: 'fifame.dossou@test.com', pass: 'Test1234!', full_name: 'Fifamè Dossou', score: 45, balance: 75000 },
  { email: 'ayivi.koffi@test.com', pass: 'Test1234!', full_name: 'Ayivi Koffi', score: 63, balance: 250000 },
  { email: 'adjoua.mensah@test.com', pass: 'Test1234!', full_name: 'Adjoua Mensah', score: 78, balance: 500000 },
  { email: 'kwame.agbessi@test.com', pass: 'Test1234!', full_name: 'Kwame Agbessi', score: 92, balance: 1200000 },
  { email: 'fatou.sow@test.com', pass: 'Test1234!', full_name: 'Fatou Sow', score: 38, balance: 30000 },
  { email: 'oumar.bah@test.com', pass: 'Test1234!', full_name: 'Oumar Bah', score: 71, balance: 180000 },
  { email: 'afi.togbe@test.com', pass: 'Test1234!', full_name: 'Afi Togbé', score: 85, balance: 850000 },
  { email: 'mamadou.diallo@test.com', pass: 'Test1234!', full_name: 'Mamadou Diallo', score: 55, balance: 120000 },
  { email: 'akosua.akpan@test.com', pass: 'Test1234!', full_name: 'Akosua Akpan', score: 67, balance: 320000 },
  { email: 'kofi.amoah@test.com', pass: 'Test1234!', full_name: 'Kofi Amoah', score: 88, balance: 650000 },
];

async function seedUsers() {
  console.log('════════════════════════════════════════');
  console.log('  AFIYA V3 — Seed Utilisateurs de Test  ');
  console.log('════════════════════════════════════════\n');

  for (const userData of USERS_TO_SEED) {
    console.log(`→ Création de ${userData.full_name} (${userData.email})`);
    try {
      // 1. Create Auth User
      const userRecord = await auth.createUser({
        email: userData.email,
        password: userData.pass,
        displayName: userData.full_name,
      });
      const uid = userRecord.uid;
      console.log(`  ✓ Auth créé : ${uid}`);

      // 2. Calculate Tier and Coefficients based on score
      const score = userData.score;
      const tier = score >= 90 ? 'PLATINUM' : score >= 75 ? 'GOLD' : score >= 60 ? 'SILVER' : 'BRONZE';
      const coeffs: Record<string, number> = { PLATINUM: 0.25, GOLD: 0.5, SILVER: 0.75, BRONZE: 1.0 };
      const coeff = coeffs[tier];

      // 3. Create Profile
      const profileRef = db.collection('profiles').doc(uid);
      await profileRef.set({
        id: uid,
        email: userData.email,
        full_name: userData.full_name,
        score_afiya: score,
        tier: tier,
        status: 'ACTIVE',
        deposit_coefficient: coeff,
        retention_coefficient: coeff,
        kyc_status: 'PENDING',
        last_activity_at: null,
        created_at: FieldValue.serverTimestamp()
      });
      console.log(`  ✓ Profil créé (Tier: ${tier}, Coeff: ${coeff})`);

      // 4. Create Wallets
      const mainId = `wallet_user_${uid}`;
      const cerclesId = `wallet_cercles_${uid}`;
      const capitalId = `wallet_capital_${uid}`;

      const batch = db.batch();

      batch.set(db.collection('wallets').doc(mainId), {
        id: mainId,
        owner_id: uid,
        group_id: null,
        wallet_type: 'USER_MAIN',
        balance: userData.balance,
        currency: 'XOF',
        updated_at: FieldValue.serverTimestamp()
      });

      batch.set(db.collection('wallets').doc(cerclesId), {
        id: cerclesId,
        owner_id: uid,
        group_id: null,
        wallet_type: 'USER_CERCLES',
        balance: 0,
        currency: 'XOF',
        updated_at: FieldValue.serverTimestamp()
      });

      batch.set(db.collection('wallets').doc(capitalId), {
        id: capitalId,
        owner_id: uid,
        group_id: null,
        wallet_type: 'USER_CAPITAL',
        balance: 0,
        currency: 'XOF',
        updated_at: FieldValue.serverTimestamp()
      });

      await batch.commit();
      console.log(`  ✓ Wallets créés (USER_MAIN balance: ${userData.balance})\n`);

    } catch (error: any) {
      console.error(`  ❌ Erreur pour ${userData.email}:`, error.message, '\n');
    }
  }

  console.log('════════════════════════════════════════');
  console.log('  ✅ Seed terminé !');
  console.log('════════════════════════════════════════');
}

seedUsers().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
