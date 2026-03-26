import { auth, db } from '../lib/firebase';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  serverTimestamp 
} from 'firebase/firestore';
import { getDocument, createDocument, updateDocumentData } from '../lib/firestore';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  score_afiya: number;
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  status: 'ACTIVE' | 'RESTRICTED' | 'BANNED' | 'PENDING_REVIEW';
  deposit_coefficient: number;
  retention_coefficient: number;
  kyc_status: 'APPROVED' | 'PENDING' | 'REJECTED';
  last_activity_at: any;
  created_at: any;
  role?: string;
}

export const signUpWithEmail = async (email: string, pass: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    const user = result.user;
    
    // Create initial profile
    const newProfile: UserProfile = {
      id: user.uid,
      email: user.email || '',
      full_name: '',
      score_afiya: 50,
      tier: 'BRONZE',
      status: 'ACTIVE',
      deposit_coefficient: 1.0,
      retention_coefficient: 1.0,
      kyc_status: 'PENDING',
      last_activity_at: null,
      created_at: serverTimestamp()
    };
    await createDocument('profiles', user.uid, newProfile);
    
    // Create initial wallet
    await createDocument('wallets', `${user.uid}_main`, {
      id: `${user.uid}_main`,
      owner_id: user.uid,
      group_id: null,
      wallet_type: 'USER_MAIN',
      balance: 0,
      currency: 'XOF',
      updated_at: serverTimestamp()
    });
    
    return user;
  } catch (error) {
    console.error('Signup error:', error);
    throw error;
  }
};

export const signInWithEmail = async (email: string, pass: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return result.user;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const logout = async () => {
  await signOut(auth);
};

export const getCurrentUser = (): Promise<User | null> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  return await getDocument<UserProfile>('profiles', userId);
};

export const updateProfile = async (userId: string, data: Partial<UserProfile>) => {
  await updateDocumentData('profiles', userId, data);
};
