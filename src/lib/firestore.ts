import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where,
  getDocFromServer,
  DocumentData,
  QueryConstraint,
  FirestoreError
} from 'firebase/firestore';
import { db, auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Helper to test connection
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

// Generic CRUD operations
export async function getDocument<T = DocumentData>(path: string, id: string): Promise<T | null> {
  try {
    const docRef = doc(db, path, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as T;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${path}/${id}`);
    return null;
  }
}

export async function getCollection<T = DocumentData>(path: string, constraints: QueryConstraint[] = []): Promise<T[]> {
  try {
    const q = query(collection(db, path), ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as T);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function createDocument<T extends DocumentData>(path: string, id: string, data: T): Promise<void> {
  try {
    await setDoc(doc(db, path, id), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${path}/${id}`);
  }
}

export async function updateDocumentData<T extends DocumentData>(path: string, id: string, data: Partial<T>): Promise<void> {
  try {
    await updateDoc(doc(db, path, id), data as DocumentData);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${path}/${id}`);
  }
}

export function subscribeToDocument<T = DocumentData>(path: string, id: string, callback: (data: T | null) => void) {
  const docRef = doc(db, path, id);
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as T);
    } else {
      callback(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `${path}/${id}`);
  });
}

export function subscribeToCollection<T = DocumentData>(path: string, constraints: QueryConstraint[], callback: (data: T[]) => void) {
  const q = query(collection(db, path), ...constraints);
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => doc.data() as T));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
}
