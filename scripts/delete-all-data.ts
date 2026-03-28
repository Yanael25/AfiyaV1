import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
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
  console.error('Veuillez télécharger votre clé privée depuis la console Firebase et la placer à la racine sous le nom serviceAccountKey.json');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: config.projectId,
});

// Initialize Firestore with the specific database ID
const db = getFirestore(app, config.firestoreDatabaseId);
const auth = getAuth(app);

const COLLECTIONS_TO_DELETE = ['profiles', 'wallets', 'transactions', 'messages'];
const ADMIN_EMAIL = 'jespere20000@gmail.com';

async function deleteCollection(collectionPath: string, batchSize: number = 100) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.orderBy('__name__').limit(batchSize);

  return new Promise<void>((resolve, reject) => {
    deleteQueryBatch(query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(query: FirebaseFirestore.Query, resolve: () => void) {
  const snapshot = await query.get();

  const batchSize = snapshot.size;
  if (batchSize === 0) {
    resolve();
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  process.nextTick(() => {
    deleteQueryBatch(query, resolve);
  });
}

async function deleteAllUsersExceptAdmin() {
  let nextPageToken: string | undefined;
  let deletedCount = 0;

  do {
    const listUsersResult = await auth.listUsers(1000, nextPageToken);
    const usersToDelete = listUsersResult.users
      .filter((userRecord) => userRecord.email !== ADMIN_EMAIL)
      .map((userRecord) => userRecord.uid);

    if (usersToDelete.length > 0) {
      await auth.deleteUsers(usersToDelete);
      deletedCount += usersToDelete.length;
      console.log(`Deleted ${usersToDelete.length} utilisateurs Auth dans ce lot.`);
    }

    nextPageToken = listUsersResult.pageToken;
  } while (nextPageToken);

  console.log(`Suppression des utilisateurs terminée. Total supprimé : ${deletedCount}`);
}

async function main() {
  try {
    console.log('Démarrage de la suppression des données...');

    // Delete Firestore collections
    for (const collection of COLLECTIONS_TO_DELETE) {
      console.log(`Suppression de la collection : ${collection}...`);
      await deleteCollection(collection);
      console.log(`Collection ${collection} supprimée.`);
    }

    // Delete Auth users
    console.log('Suppression des utilisateurs Auth (sauf admin)...');
    await deleteAllUsersExceptAdmin();

    console.log('✅ Toutes les données de test ont été supprimées avec succès.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la suppression des données :', error);
    process.exit(1);
  }
}

main();
