import { 
  collection, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  DocumentData,
  runTransaction,
  doc,
  getDocs,
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  getCollection, 
  getDocument, 
  createDocument, 
  updateDocumentData,
  subscribeToCollection
} from '../lib/firestore';
import { start_tontine_group } from '../lib/businessLogic';

export interface TontineGroup {
  id: string;
  name: string;
  admin_id: string;
  contribution_amount: number;
  currency: 'XOF';
  frequency: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  target_members: number;
  start_threshold: number;
  draw_mode: 'RANDOM' | 'SCORE_WEIGHTED';
  status: 'DRAFT' | 'FORMING' | 'WAITING_VOTE' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  invitation_code: string | null;
  constitution_deadline: any | null;
  current_cycle: number;
  total_cycles: number;
  started_at: any | null;
  protection_mode_active: boolean;
  created_at: any;
  updated_at?: any;
}

export interface Cycle {
  id: string;
  group_id: string;
  cycle_number: number;
  beneficiary_member_id: string;
  start_date: any;
  payment_due_date: any;
  default_date: any;
  expected_total: number;
  actual_total: number | null;
  payout_date: any | null;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'DEFAULTED';
}

export interface Payment {
  id: string;
  cycle_id: string;
  member_id: string;
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  paid_at: any | null;
}

export interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'CONTRIBUTION' | 'PAYOUT' | 'CAUTION' | 
        'PENALTY' | 'REFUND' | 'MINI_FUND_CONTRIB' | 'GLOBAL_FUND_CONTRIB' | 
        'GLOBAL_FUND_USAGE' | 'DEPOSIT_SEIZURE';
  amount: number;
  currency: 'XOF';
  from_wallet_id: string | null;
  to_wallet_id: string | null;
  user_id: string | null;
  group_id: string | null;
  member_id: string | null;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  description: string;
  created_at: any;
}

export interface Wallet {
  id: string;
  owner_id: string | null;
  group_id: string | null;
  wallet_type: 'USER_MAIN' | 'ESCROW_CONSTITUTION' | 'CONTRIBUTION_POOL' | 
               'GROUP_MINI_FUND' | 'GLOBAL_FUND';
  balance: number;
  currency: 'XOF';
  updated_at?: any;
}

export interface TontineMember {
  id: string;
  group_id: string;
  user_id: string;
  draw_position: number | null;
  initial_deposit: number;
  adjusted_deposit: number | null;
  deposit_differential: number | null;
  deposit_differential_paid: boolean;
  current_deposit_balance: number;
  status: 'PENDING_PAYMENT' | 'ACTIVE' | 'RESTRICTED' | 'BANNED' | 'COMPLETED';
  cycles_completed: number;
  cycles_with_delay: number;
  cycles_defaulted: number;
  is_admin: boolean;
  swap_eligible: boolean;
  score_at_join: number;
  tier_at_join: string;
  retention_amount: number;
  retention_applied: boolean;
  joined_at: any;
  received_payout_at: any | null;
  has_seen_draw?: boolean;
}

export const createTontineGroup = async (groupData: Omit<TontineGroup, 'id' | 'created_at' | 'status' | 'current_cycle' | 'total_cycles' | 'started_at' | 'protection_mode_active' | 'start_threshold' | 'draw_mode' | 'invitation_code' | 'constitution_deadline'>, userId: string) => {
  const profile = await getDocument<any>('profiles', userId);
  if (!profile) throw new Error('Profil introuvable');

  const globalFundQuery = query(collection(db, 'wallets'), where('wallet_type', '==', 'GLOBAL_FUND'), limit(1));
  const globalFundSnap = await getDocs(globalFundQuery);
  if (globalFundSnap.empty) throw new Error('Fonds Global introuvable');
  const globalFundDoc = globalFundSnap.docs[0];

  const groupRef = doc(collection(db, 'tontine_groups'));
  const id = groupRef.id;
  
  const contributionAmount = groupData.contribution_amount;
  const depositCoeff = profile.deposit_coefficient || 1.0;
  const initialDeposit = Math.round(contributionAmount * depositCoeff);
  const totalToPay = initialDeposit + contributionAmount;

  const miniAmount = Math.round(contributionAmount * 0.01);
  const globalAmount = Math.round(contributionAmount * 0.03);
  const contribAmount = contributionAmount - miniAmount - globalAmount;

  await runTransaction(db, async (transaction) => {
    // 1. Check user wallet
    const userWalletQuery = query(collection(db, 'wallets'), where('owner_id', '==', userId), where('wallet_type', '==', 'USER_MAIN'), limit(1));
    const userWalletSnap = await getDocs(userWalletQuery);
    if (userWalletSnap.empty) throw new Error('Portefeuille principal introuvable');
    const userWalletDoc = userWalletSnap.docs[0];
    const userWalletRef = userWalletDoc.ref;
    const userWallet = userWalletDoc.data();

    if (userWallet.balance < totalToPay) throw new Error('Solde insuffisant pour créer le groupe');

    // 2. Create Group
    const newGroup: any = {
      ...groupData,
      id,
      admin_id: userId,
      status: 'FORMING',
      invitation_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
      start_threshold: 100,
      draw_mode: 'RANDOM',
      current_cycle: 0,
      total_cycles: groupData.target_members,
      started_at: null,
      protection_mode_active: false,
      constitution_deadline: null,
      created_at: Timestamp.now()
    };
    transaction.set(groupRef, newGroup);

    // 3. Create Wallets
    const escrowRef = doc(collection(db, 'wallets'));
    const escrowId = escrowRef.id;
    const poolRef = doc(collection(db, 'wallets'));
    const poolId = poolRef.id;
    const miniFundRef = doc(collection(db, 'wallets'));
    const miniFundId = miniFundRef.id;

    transaction.set(escrowRef, {
      id: escrowId,
      owner_id: null,
      group_id: id,
      wallet_type: 'ESCROW_CONSTITUTION',
      balance: initialDeposit,
      currency: 'XOF',
      updated_at: Timestamp.now()
    });

    transaction.set(poolRef, {
      id: poolId,
      owner_id: null,
      group_id: id,
      wallet_type: 'CONTRIBUTION_POOL',
      balance: contribAmount,
      currency: 'XOF',
      updated_at: Timestamp.now()
    });

    transaction.set(miniFundRef, {
      id: miniFundId,
      owner_id: null,
      group_id: id,
      wallet_type: 'GROUP_MINI_FUND',
      balance: miniAmount,
      currency: 'XOF',
      updated_at: Timestamp.now()
    });

    // Update Global Fund
    const globalFundRef = globalFundDoc.ref;
    const globalFundData = await transaction.get(globalFundRef);
    transaction.update(globalFundRef, { balance: globalFundData.data()!.balance + globalAmount });

    // 4. Create Admin Member
    const memberId = `${id}_${userId}`;
    transaction.set(doc(db, 'tontine_members', memberId), {
      id: memberId,
      group_id: id,
      user_id: userId,
      draw_position: null,
      initial_deposit: initialDeposit,
      adjusted_deposit: null,
      deposit_differential: null,
      deposit_differential_paid: false,
      current_deposit_balance: initialDeposit,
      status: 'ACTIVE',
      cycles_completed: 0,
      cycles_with_delay: 0,
      cycles_defaulted: 0,
      is_admin: true,
      swap_eligible: false,
      score_at_join: profile.score_afiya,
      tier_at_join: profile.tier,
      retention_amount: 0,
      retention_applied: false,
      joined_at: Timestamp.now(),
      received_payout_at: null,
      has_seen_draw: false
    });

    // 5. Update User Wallet
    transaction.update(userWalletRef, { balance: userWallet.balance - totalToPay });

    // 6. Create Transactions
    const txCautionRef = doc(collection(db, 'transactions'));
    transaction.set(txCautionRef, {
      id: txCautionRef.id,
      type: 'CAUTION',
      amount: initialDeposit,
      currency: 'XOF',
      from_wallet_id: userWalletDoc.id,
      to_wallet_id: escrowId,
      user_id: userId,
      group_id: id,
      member_id: memberId,
      status: 'SUCCESS',
      description: `Caution initiale - Groupe ${groupData.name}`,
      created_at: Timestamp.now()
    });

    const txContribRef = doc(collection(db, 'transactions'));
    transaction.set(txContribRef, {
      id: txContribRef.id,
      type: 'CONTRIBUTION',
      amount: contribAmount,
      currency: 'XOF',
      from_wallet_id: userWalletDoc.id,
      to_wallet_id: poolId,
      user_id: userId,
      group_id: id,
      member_id: memberId,
      status: 'SUCCESS',
      description: `1ère cotisation - Groupe ${groupData.name}`,
      created_at: Timestamp.now()
    });

    const txMiniRef = doc(collection(db, 'transactions'));
    transaction.set(txMiniRef, {
      id: txMiniRef.id,
      type: 'MINI_FUND_CONTRIB',
      amount: miniAmount,
      currency: 'XOF',
      from_wallet_id: userWalletDoc.id,
      to_wallet_id: miniFundId,
      user_id: userId,
      group_id: id,
      member_id: memberId,
      status: 'SUCCESS',
      description: `1ère cotisation (Mini-fonds) - Groupe ${groupData.name}`,
      created_at: Timestamp.now()
    });

    const txGlobalRef = doc(collection(db, 'transactions'));
    transaction.set(txGlobalRef, {
      id: txGlobalRef.id,
      type: 'GLOBAL_FUND_CONTRIB',
      amount: globalAmount,
      currency: 'XOF',
      from_wallet_id: userWalletDoc.id,
      to_wallet_id: globalFundDoc.id,
      user_id: userId,
      group_id: id,
      member_id: memberId,
      status: 'SUCCESS',
      description: `1ère cotisation (Fonds Global) - Groupe ${groupData.name}`,
      created_at: Timestamp.now()
    });
  });

  return id;
};

export const getTontineGroups = async () => {
  return await getCollection<TontineGroup>('tontine_groups', [orderBy('created_at', 'desc')]);
};

export const getUserWallet = async (userId: string): Promise<Wallet | null> => {
  const wallets = await getCollection<Wallet>('wallets', [where('owner_id', '==', userId), where('wallet_type', '==', 'USER_MAIN')]);
  return wallets.length > 0 ? wallets[0] : null;
};

export const subscribeToUserWallet = (userId: string, callback: (wallet: Wallet | null) => void) => {
  return subscribeToCollection<Wallet>('wallets', [
    where('owner_id', '==', userId),
    where('wallet_type', '==', 'USER_MAIN')
  ], (wallets) => {
    callback(wallets.length > 0 ? wallets[0] : null);
  });
};

export const subscribeToUserCaution = (userId: string, callback: (total: number) => void) => {
  return subscribeToCollection<TontineMember>('tontine_members', [
    where('user_id', '==', userId)
  ], (members) => {
    let total = 0;
    members.forEach(m => {
      if (m.status === 'ACTIVE' || m.status === 'PENDING_PAYMENT') {
        if (m.deposit_differential_paid && m.adjusted_deposit) {
          total += m.adjusted_deposit;
        } else {
          total += m.initial_deposit;
        }
      }
    });
    callback(total);
  });
};

export const createUserWallet = async (userId: string) => {
  const id = `wallet_user_${userId}`;
  const wallet: Wallet = {
    id,
    owner_id: userId,
    group_id: null,
    wallet_type: 'USER_MAIN',
    balance: 0,
    currency: 'XOF',
    updated_at: serverTimestamp()
  };
  await createDocument('wallets', id, wallet);
  return id;
};

export interface Message {
  id: string;
  group_id: string;
  user_id: string;
  text: string;
  created_at: any;
}

export const getTontineGroup = async (id: string): Promise<TontineGroup | null> => {
  return await getDocument<TontineGroup>('tontine_groups', id);
};

export const updateMember = async (memberId: string, data: Partial<TontineMember>) => {
  await updateDocumentData<TontineMember>('tontine_members', memberId, data);
};

export const getGroupMembers = async (groupId: string): Promise<TontineMember[]> => {
  return await getCollection<TontineMember>('tontine_members', [where('group_id', '==', groupId)]);
};

export const subscribeToGroupMessages = (groupId: string, callback: (messages: Message[]) => void) => {
  return subscribeToCollection<Message>('messages', [
    where('group_id', '==', groupId),
    orderBy('created_at', 'asc')
  ], callback);
};

export const sendGroupMessage = async (groupId: string, userId: string, text: string) => {
  const messageRef = doc(collection(db, 'messages'));
  const id = messageRef.id;
  const message: Message = {
    id,
    group_id: groupId,
    user_id: userId,
    text,
    created_at: serverTimestamp()
  };
  await createDocument('messages', id, message);
};

export const getGroupByCode = async (code: string): Promise<TontineGroup | null> => {
  const groups = await getCollection<TontineGroup>('tontine_groups', [
    where('invitation_code', '==', code),
    where('status', '==', 'FORMING')
  ]);
  return groups.length > 0 ? groups[0] : null;
};

export const joinTontineGroup = async (groupId: string, userId: string) => {
  const profile = await getDocument<any>('profiles', userId);
  if (!profile) throw new Error('Profil introuvable');

  const memberId = `${groupId}_${userId}`;
  const member: any = {
    id: memberId,
    group_id: groupId,
    user_id: userId,
    draw_position: null,
    initial_deposit: 0,
    adjusted_deposit: null,
    deposit_differential: null,
    deposit_differential_paid: false,
    current_deposit_balance: 0,
    status: 'PENDING_PAYMENT',
    cycles_completed: 0,
    cycles_with_delay: 0,
    cycles_defaulted: 0,
    is_admin: false,
    swap_eligible: false,
    score_at_join: profile.score_afiya,
    tier_at_join: profile.tier,
    retention_amount: 0,
    retention_applied: false,
    joined_at: serverTimestamp(),
    received_payout_at: null,
    has_seen_draw: false
  };
  await createDocument('tontine_members', memberId, member);
  return memberId;
};

export const payJoinFees = async (memberId: string, userId: string) => {
  const member = await getDocument<any>('tontine_members', memberId);
  if (!member) throw new Error('Membre introuvable');
  
  const group = await getDocument<TontineGroup>('tontine_groups', member.group_id);
  if (!group) throw new Error('Groupe introuvable');

  const profile = await getDocument<any>('profiles', userId);
  if (!profile) throw new Error('Profil introuvable');

  const globalFundQuery = query(collection(db, 'wallets'), where('wallet_type', '==', 'GLOBAL_FUND'), limit(1));
  const globalFundSnap = await getDocs(globalFundQuery);
  if (globalFundSnap.empty) throw new Error('Fonds Global introuvable');
  const globalFundDoc = globalFundSnap.docs[0];

  const contributionAmount = group.contribution_amount;
  const depositCoeff = profile.deposit_coefficient || 1.0;
  const initialDeposit = Math.round(contributionAmount * depositCoeff);
  const totalToPay = initialDeposit + contributionAmount;

  const miniAmount = Math.round(contributionAmount * 0.01);
  const globalAmount = Math.round(contributionAmount * 0.03);
  const contribAmount = contributionAmount - miniAmount - globalAmount;

  await runTransaction(db, async (transaction) => {
    // 1. Check user wallet
    const userWalletQuery = query(collection(db, 'wallets'), where('owner_id', '==', userId), where('wallet_type', '==', 'USER_MAIN'), limit(1));
    const userWalletSnap = await getDocs(userWalletQuery);
    if (userWalletSnap.empty) throw new Error('Portefeuille principal introuvable');
    const userWalletDoc = userWalletSnap.docs[0];
    const userWalletRef = userWalletDoc.ref;
    const userWallet = userWalletDoc.data();

    if (userWallet.balance < totalToPay) throw new Error('Solde insuffisant pour rejoindre le groupe');

    // 2. Get Group Wallets
    const escrowQuery = query(collection(db, 'wallets'), where('group_id', '==', group.id), where('wallet_type', '==', 'ESCROW_CONSTITUTION'), limit(1));
    const escrowSnap = await getDocs(escrowQuery);
    if (escrowSnap.empty) throw new Error('Portefeuille de caution introuvable');
    const escrowDoc = escrowSnap.docs[0];

    const poolQuery = query(collection(db, 'wallets'), where('group_id', '==', group.id), where('wallet_type', '==', 'CONTRIBUTION_POOL'), limit(1));
    const poolSnap = await getDocs(poolQuery);
    if (poolSnap.empty) throw new Error('Portefeuille de cotisation introuvable');
    const poolDoc = poolSnap.docs[0];

    const miniFundQuery = query(collection(db, 'wallets'), where('group_id', '==', group.id), where('wallet_type', '==', 'GROUP_MINI_FUND'), limit(1));
    const miniFundSnap = await getDocs(miniFundQuery);
    if (miniFundSnap.empty) throw new Error('Portefeuille mini-fonds introuvable');
    const miniFundDoc = miniFundSnap.docs[0];

    // 3. Update Balances
    transaction.update(userWalletRef, { balance: userWallet.balance - totalToPay });
    transaction.update(escrowDoc.ref, { balance: escrowDoc.data().balance + initialDeposit });
    transaction.update(poolDoc.ref, { balance: poolDoc.data().balance + contribAmount });
    transaction.update(miniFundDoc.ref, { balance: miniFundDoc.data().balance + miniAmount });
    
    const globalFundData = await transaction.get(globalFundDoc.ref);
    transaction.update(globalFundDoc.ref, { balance: globalFundData.data()!.balance + globalAmount });

    // 4. Update Member
    transaction.update(doc(db, 'tontine_members', memberId), {
      initial_deposit: initialDeposit,
      current_deposit_balance: initialDeposit,
      status: 'ACTIVE',
      score_at_join: profile.score_afiya,
      tier_at_join: profile.tier
    });

    // 5. Create Transactions
    const txCautionRef = doc(collection(db, 'transactions'));
    transaction.set(txCautionRef, {
      id: txCautionRef.id,
      type: 'CAUTION',
      amount: initialDeposit,
      currency: 'XOF',
      from_wallet_id: userWalletDoc.id,
      to_wallet_id: escrowDoc.id,
      user_id: userId,
      group_id: group.id,
      member_id: memberId,
      status: 'SUCCESS',
      description: `Caution initiale - Groupe ${group.name}`,
      created_at: Timestamp.now()
    });

    const txContribRef = doc(collection(db, 'transactions'));
    transaction.set(txContribRef, {
      id: txContribRef.id,
      type: 'CONTRIBUTION',
      amount: contribAmount,
      currency: 'XOF',
      from_wallet_id: userWalletDoc.id,
      to_wallet_id: poolDoc.id,
      user_id: userId,
      group_id: group.id,
      member_id: memberId,
      status: 'SUCCESS',
      description: `1ère cotisation - Groupe ${group.name}`,
      created_at: Timestamp.now()
    });

    const txMiniRef = doc(collection(db, 'transactions'));
    transaction.set(txMiniRef, {
      id: txMiniRef.id,
      type: 'MINI_FUND_CONTRIB',
      amount: miniAmount,
      currency: 'XOF',
      from_wallet_id: userWalletDoc.id,
      to_wallet_id: miniFundDoc.id,
      user_id: userId,
      group_id: group.id,
      member_id: memberId,
      status: 'SUCCESS',
      description: `1ère cotisation (Mini-fonds) - Groupe ${group.name}`,
      created_at: Timestamp.now()
    });

    const txGlobalRef = doc(collection(db, 'transactions'));
    transaction.set(txGlobalRef, {
      id: txGlobalRef.id,
      type: 'GLOBAL_FUND_CONTRIB',
      amount: globalAmount,
      currency: 'XOF',
      from_wallet_id: userWalletDoc.id,
      to_wallet_id: globalFundDoc.id,
      user_id: userId,
      group_id: group.id,
      member_id: memberId,
      status: 'SUCCESS',
      description: `1ère cotisation (Fonds Global) - Groupe ${group.name}`,
      created_at: Timestamp.now()
    });
  });
};

export const payDepositDifferential = async (memberId: string, userId: string) => {
  await runTransaction(db, async (transaction) => {
    const memberRef = doc(db, 'tontine_members', memberId);
    const memberSnap = await transaction.get(memberRef);
    if (!memberSnap.exists()) throw new Error('Membre introuvable');
    const member = memberSnap.data();
    const amount = member.deposit_differential || 0;
    if (amount <= 0) throw new Error('Aucun différentiel à payer');

    const userWalletQuery = query(collection(db, 'wallets'), where('owner_id', '==', userId), where('wallet_type', '==', 'USER_MAIN'), limit(1));
    const userWalletSnap = await getDocs(userWalletQuery);
    if (userWalletSnap.empty) throw new Error('Portefeuille principal introuvable');
    const userWalletDoc = userWalletSnap.docs[0];
    const userWalletRef = userWalletDoc.ref;
    const userWallet = userWalletDoc.data();

    const escrowWalletQuery = query(collection(db, 'wallets'), where('group_id', '==', member.group_id), where('wallet_type', '==', 'ESCROW_CONSTITUTION'), limit(1));
    const escrowWalletSnap = await getDocs(escrowWalletQuery);
    if (escrowWalletSnap.empty) throw new Error('Portefeuille de caution introuvable');
    const escrowWalletDoc = escrowWalletSnap.docs[0];
    const escrowWalletRef = escrowWalletDoc.ref;
    const escrowWallet = escrowWalletDoc.data();

    if (userWallet.balance < amount) throw new Error('Solde insuffisant');

    transaction.update(userWalletRef, { balance: userWallet.balance - amount });
    transaction.update(escrowWalletRef, { balance: escrowWallet.balance + amount });
    transaction.update(memberRef, {
      deposit_differential_paid: true,
      status: 'ACTIVE'
    });

    const txRef = doc(collection(db, 'transactions'));
    transaction.set(txRef, {
      id: txRef.id,
      type: 'CAUTION',
      amount: amount,
      currency: 'XOF',
      from_wallet_id: userWalletDoc.id,
      to_wallet_id: escrowWalletDoc.id,
      user_id: userId,
      group_id: member.group_id,
      member_id: memberId,
      status: 'SUCCESS',
      description: 'Ajustement de caution (différentiel)',
      created_at: Timestamp.now()
    });
  });
};

export const activateTontineGroup = async (groupId: string, userId: string) => {
  await start_tontine_group(groupId);
};

export const getActiveCycle = async (groupId: string): Promise<Cycle | null> => {
  try {
    const q = query(
      collection(db, 'cycles'),
      where('group_id', '==', groupId),
      where('status', '==', 'ACTIVE'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data() as Cycle;
  } catch (error) {
    console.error("Error getting active cycle:", error);
    return null;
  }
};

export const getMemberPayment = async (cycleId: string, memberId: string): Promise<Payment | null> => {
  try {
    const q = query(
      collection(db, 'payments'),
      where('cycle_id', '==', cycleId),
      where('member_id', '==', memberId),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data() as Payment;
  } catch (error) {
    console.error("Error getting member payment:", error);
    return null;
  }
};

export const getUserGroups = async (userId: string): Promise<(TontineGroup & { members_count: number })[]> => {
  try {
    const memberships = await getCollection<TontineMember>('tontine_members', [
      where('user_id', '==', userId)
    ]);
    
    if (memberships.length === 0) return [];
    
    const groupIds = memberships.map(m => m.group_id);
    
    const groups: TontineGroup[] = [];
    for (let i = 0; i < groupIds.length; i += 10) {
      const chunk = groupIds.slice(i, i + 10);
      const chunkGroups = await getCollection<TontineGroup>('tontine_groups', [
        where('__name__', 'in', chunk)
      ]);
      groups.push(...chunkGroups);
    }

    // Add member count
    const groupsWithCounts = await Promise.all(groups.map(async (group) => {
      const members = await getCollection<TontineMember>('tontine_members', [
        where('group_id', '==', group.id)
      ]);
      return { ...group, members_count: members.length };
    }));
    
    return groupsWithCounts;
  } catch (error) {
    console.error('Error fetching user groups:', error);
    return [];
  }
};
