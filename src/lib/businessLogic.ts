import { db } from './firebase';
import { formatXOF } from './utils';
import {
  doc,
  getDoc,
  runTransaction,
  collection,
  query,
  where,
  getDocs,
  setDoc,
  Timestamp,
  limit,
  updateDoc
} from 'firebase/firestore';

export const update_score_afiya = async (userId: string, eventType: string, transaction?: any) => {
  const profileRef = doc(db, 'profiles', userId);
  
  const executeUpdate = async (t: any) => {
    const profileDoc = await t.get(profileRef);
    if (!profileDoc.exists()) throw new Error('Profile not found');
    const profile = profileDoc.data();
    
    let score = profile.score_afiya;
    if (profile.last_activity_at) {
      const lastActivity = profile.last_activity_at.toDate();
      const weeksInactive = (Date.now() - lastActivity.getTime()) / (7 * 24 * 60 * 60 * 1000);
      if (weeksInactive > 0) {
        score = Math.max(0, score - Math.round(score * 0.005 * weeksInactive));
      }
    }

    const SCORE_DELTAS: Record<string, number> = {
      'PAYMENT_SUCCESS': 3,
      'PAYMENT_GRACE': 0.5,
      'CYCLE_COMPLETED': 8,
      'MEMBER_INVITED_COMPLETE': 5,
      'PAYMENT_LATE': -2,
      'DEFAULT_DECLARED': -25,
      'GLOBAL_FUND_USED': -50,
      'TRUST_VOTE_POSITIVE': 2,
      'ACCOUNT_RESTORED': 5,
    };

    const delta = SCORE_DELTAS[eventType] || 0;
    const newScore = Math.min(100, Math.max(0, Math.round(score + delta)));
    
    const newTier = newScore >= 90 ? 'PLATINUM' : newScore >= 75 ? 'GOLD' : newScore >= 60 ? 'SILVER' : 'BRONZE';
    const coeffs: Record<string, number> = { PLATINUM: 0.25, GOLD: 0.5, SILVER: 0.75, BRONZE: 1.0 };
    
    t.update(profileRef, {
      score_afiya: newScore,
      tier: newTier,
      deposit_coefficient: coeffs[newTier],
      retention_coefficient: coeffs[newTier],
      last_activity_at: Timestamp.now()
    });

    const eventRef = doc(collection(db, 'events'));
    t.set(eventRef, {
      event_type: 'SCORE_UPDATED',
      user_id: userId,
      group_id: null,
      member_id: null,
      previous_state: String(profile.score_afiya),
      new_state: String(newScore),
      event_data: JSON.stringify({ original_event: eventType, score_delta: delta }),
      created_at: Timestamp.now()
    });

    return newScore;
  };

  if (transaction) {
    return await executeUpdate(transaction);
  } else {
    return await runTransaction(db, executeUpdate);
  }
};

export const check_group_deadlines = async () => {
  const groupsQuery = query(collection(db, 'tontine_groups'), where('status', '==', 'FORMING'));
  const groupsSnapshot = await getDocs(groupsQuery);
  const now = new Date().getTime();

  for (const groupDoc of groupsSnapshot.docs) {
    const group = groupDoc.data();
    if (group.constitution_deadline) {
      const deadline = new Date(group.constitution_deadline).getTime();
      if (now > deadline) {
        await runTransaction(db, async (t) => {
          const membersQuery = query(collection(db, 'tontine_members'), where('group_id', '==', groupDoc.id));
          const membersSnapshot = await getDocs(membersQuery);
          
          if (membersSnapshot.size >= group.start_threshold) {
            t.update(groupDoc.ref, { status: 'WAITING_VOTE' });
          } else {
            t.update(groupDoc.ref, { status: 'CANCELLED' });
            
            const escrowQuery = query(collection(db, 'wallets'), where('group_id', '==', groupDoc.id), where('wallet_type', '==', 'ESCROW_CONSTITUTION'), limit(1));
            const escrowSnapshot = await getDocs(escrowQuery);
            if (!escrowSnapshot.empty) {
              const escrowDoc = escrowSnapshot.docs[0];
              let escrowBalance = escrowDoc.data().balance;
              
              for (const memberDoc of membersSnapshot.docs) {
                const member = memberDoc.data();
                const userWalletQuery = query(collection(db, 'wallets'), where('owner_id', '==', member.user_id), where('wallet_type', '==', 'USER_MAIN'), limit(1));
                const userWalletSnapshot = await getDocs(userWalletQuery);
                
                if (!userWalletSnapshot.empty) {
                  const userWalletDoc = userWalletSnapshot.docs[0];
                  const refundAmount = member.initial_deposit + group.contribution_amount;
                  
                  t.update(userWalletDoc.ref, { balance: userWalletDoc.data().balance + refundAmount });
                  escrowBalance -= refundAmount;
                  
                  const txRef = doc(collection(db, 'transactions'));
                  t.set(txRef, {
                    type: 'REFUND',
                    amount: refundAmount,
                    currency: 'XOF',
                    from_wallet_id: escrowDoc.id,
                    to_wallet_id: userWalletDoc.id,
                    user_id: member.user_id,
                    group_id: groupDoc.id,
                    member_id: memberDoc.id,
                    status: 'SUCCESS',
                    description: `Remboursement suite annulation groupe ${group.name}`,
                    created_at: Timestamp.now()
                  });
                }
              }
              t.update(escrowDoc.ref, { balance: escrowBalance });
            }
          }
        });
      }
    }
  }
};

export const check_payment_deadlines = async () => {
  const cyclesQuery = query(collection(db, 'cycles'), where('status', '==', 'ACTIVE'));
  const cyclesSnapshot = await getDocs(cyclesQuery);
  const now = new Date().getTime();

  for (const cycleDoc of cyclesSnapshot.docs) {
    const cycle = cycleDoc.data();
    if (cycle.default_date) {
      const defaultDate = new Date(cycle.default_date).getTime();
      if (now > defaultDate) {
        const paymentsQuery = query(collection(db, 'payments'), where('cycle_id', '==', cycleDoc.id), where('status', '==', 'PENDING'));
        const paymentsSnapshot = await getDocs(paymentsQuery);
        
        for (const paymentDoc of paymentsSnapshot.docs) {
          const payment = paymentDoc.data();
          const memberRef = doc(db, 'tontine_members', payment.member_id);
          const memberDoc = await getDoc(memberRef);
          
          if (memberDoc.exists()) {
            const member = memberDoc.data();
            if (member.status === 'ACTIVE' || member.status === 'RESTRICTED') {
              try {
                await handle_member_default(payment.member_id, cycleDoc.id);
                await updateDoc(paymentDoc.ref, { status: 'FAILED' });
              } catch (e) {
                console.error(`Error handling default for member ${payment.member_id}:`, e);
              }
            }
          }
        }
      }
    }
  }
};

export const check_differential_deadlines = async () => {
  const groupsQuery = query(collection(db, 'tontine_groups'), where('status', '==', 'ACTIVE'));
  const groupsSnapshot = await getDocs(groupsQuery);
  const now = new Date().getTime();

  for (const groupDoc of groupsSnapshot.docs) {
    const group = groupDoc.data();
    if (group.started_at) {
      const startedAt = new Date(group.started_at).getTime();
      const deadline = startedAt + (48 * 60 * 60 * 1000); // 48h
      
      if (now > deadline) {
        const membersQuery = query(collection(db, 'tontine_members'), where('group_id', '==', groupDoc.id), where('deposit_differential_paid', '==', false));
        const membersSnapshot = await getDocs(membersQuery);
        
        if (!membersSnapshot.empty) {
          await runTransaction(db, async (t) => {
            const allMembersQuery = query(collection(db, 'tontine_members'), where('group_id', '==', groupDoc.id));
            const allMembersSnapshot = await getDocs(allMembersQuery);
            const totalMembers = allMembersSnapshot.size;
            
            for (const memberDoc of membersSnapshot.docs) {
              const newPosition = Math.floor(Math.random() * (totalMembers - Math.floor(totalMembers * 0.6))) + Math.floor(totalMembers * 0.6) + 1;
              
              t.update(memberDoc.ref, {
                draw_position: newPosition,
                adjusted_deposit: memberDoc.data().initial_deposit,
                deposit_differential: 0,
                deposit_differential_paid: true
              });
            }
          });
        }
      }
    }
  }
};

export const getOrCreateGlobalFund = async () => {
  const walletsRef = collection(db, 'wallets');
  const globalFundQuery = query(walletsRef, where('wallet_type', '==', 'GLOBAL_FUND'), limit(1));
  const globalFundSnapshot = await getDocs(globalFundQuery);
  
  if (!globalFundSnapshot.empty) {
    return globalFundSnapshot.docs[0].ref;
  }

  const globalFundRef = doc(walletsRef, 'global_fund_main');
  await setDoc(globalFundRef, {
    id: 'global_fund_main',
    owner_id: null,
    group_id: null,
    wallet_type: 'GLOBAL_FUND',
    balance: 0,
    currency: 'XOF',
    created_at: new Date().toISOString()
  });
  
  return globalFundRef;
};

export const start_tontine_group = async (groupId: string) => {
  const groupRef = doc(db, 'tontine_groups', groupId);
  const membersQ = query(collection(db, 'tontine_members'), where('group_id', '==', groupId));
  const membersSnap = await getDocs(membersQ);
  const members = membersSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

  const walletsRef = collection(db, 'wallets');
  
  const escrowQuery = query(walletsRef, where('group_id', '==', groupId), where('wallet_type', '==', 'ESCROW_CONSTITUTION'), limit(1));
  const escrowSnapshot = await getDocs(escrowQuery);
  if (escrowSnapshot.empty) throw new Error("Portefeuille de caution introuvable");
  const escrowDocRef = escrowSnapshot.docs[0].ref;
  
  const contribPoolQuery = query(walletsRef, where('group_id', '==', groupId), where('wallet_type', '==', 'CONTRIBUTION_POOL'), limit(1));
  const contribPoolSnapshot = await getDocs(contribPoolQuery);
  if (contribPoolSnapshot.empty) throw new Error("Portefeuille de contribution introuvable");
  const contribPoolDocRef = contribPoolSnapshot.docs[0].ref;
  
  const miniFundQuery = query(walletsRef, where('group_id', '==', groupId), where('wallet_type', '==', 'GROUP_MINI_FUND'), limit(1));
  const miniFundSnapshot = await getDocs(miniFundQuery);
  if (miniFundSnapshot.empty) throw new Error("Mini-fonds introuvable");
  const miniFundDocRef = miniFundSnapshot.docs[0].ref;
  
  const globalFundDocRef = await getOrCreateGlobalFund();

  return await runTransaction(db, async (transaction) => {
    const groupDoc = await transaction.get(groupRef);
    if (!groupDoc.exists()) throw new Error("Groupe introuvable");
    const groupData = groupDoc.data();

    if (groupData.status !== 'FORMING' && groupData.status !== 'WAITING_VOTE') {
      throw new Error("Le groupe ne peut pas être démarré dans son état actuel.");
    }

    if (members.length < groupData.target_members) {
      throw new Error("Le groupe n'est pas encore complet.");
    }

    const escrowDoc = await transaction.get(escrowDocRef);
    const contribPoolDoc = await transaction.get(contribPoolDocRef);
    const miniFundDoc = await transaction.get(miniFundDocRef);
    const globalFundDoc = await transaction.get(globalFundDocRef);

    const shuffledMembers = [...members].sort(() => Math.random() - 0.5);
    const totalMembers = shuffledMembers.length;

    const memberUpdates: any[] = [];
    let firstBeneficiaryId = null;

    shuffledMembers.forEach((member, index) => {
      const position = index + 1;
      member.draw_position = position;
      if (position === 1) firstBeneficiaryId = member.id;

      const posRatio = position / totalMembers;
      let factor = 1.0;
      if (posRatio <= 0.30) factor = 2.0;
      else if (posRatio <= 0.60) factor = 1.5;

      const adjustedDeposit = member.initial_deposit * factor;
      const differential = adjustedDeposit - member.initial_deposit;

      memberUpdates.push({
        ref: doc(db, 'tontine_members', member.id),
        data: {
          draw_position: position,
          adjusted_deposit: adjustedDeposit,
          deposit_differential: differential,
          deposit_differential_paid: differential === 0,
          has_seen_draw: false
        }
      });
    });

    memberUpdates.forEach(update => {
      transaction.update(update.ref, update.data);
    });

    const now = Timestamp.now();
    transaction.update(groupRef, {
      status: 'ACTIVE',
      started_at: now,
      current_cycle: 1,
      updated_at: now
    });

    const totalContributions = groupData.contribution_amount * totalMembers;
    const totalMiniAmount = Math.round(groupData.contribution_amount * 0.01) * totalMembers;
    const totalGlobalAmount = Math.round(groupData.contribution_amount * 0.03) * totalMembers;
    const totalContribAmount = totalContributions - totalMiniAmount - totalGlobalAmount;

    transaction.update(escrowDocRef, { balance: escrowDoc.data()!.balance - totalContributions });
    transaction.update(contribPoolDocRef, { balance: contribPoolDoc.data()!.balance + totalContribAmount });
    transaction.update(miniFundDocRef, { balance: miniFundDoc.data()!.balance + totalMiniAmount });
    transaction.update(globalFundDocRef, { balance: globalFundDoc.data()!.balance + totalGlobalAmount });

    const txSplit1 = doc(collection(db, 'transactions'));
    transaction.set(txSplit1, {
      id: txSplit1.id,
      type: 'CONTRIBUTION',
      amount: totalContribAmount,
      currency: 'XOF',
      from_wallet_id: escrowDocRef.id,
      to_wallet_id: contribPoolDocRef.id,
      user_id: null,
      group_id: groupId,
      member_id: null,
      status: 'SUCCESS',
      description: `Transfert 1ère cotisation (Pool) - Groupe ${groupData.name}`,
      created_at: Timestamp.now()
    });

    const txSplit2 = doc(collection(db, 'transactions'));
    transaction.set(txSplit2, {
      id: txSplit2.id,
      type: 'MINI_FUND_CONTRIB',
      amount: totalMiniAmount,
      currency: 'XOF',
      from_wallet_id: escrowDocRef.id,
      to_wallet_id: miniFundDocRef.id,
      user_id: null,
      group_id: groupId,
      member_id: null,
      status: 'SUCCESS',
      description: `Transfert 1ère cotisation (Mini-fonds) - Groupe ${groupData.name}`,
      created_at: Timestamp.now()
    });

    const txSplit3 = doc(collection(db, 'transactions'));
    transaction.set(txSplit3, {
      id: txSplit3.id,
      type: 'GLOBAL_FUND_CONTRIB',
      amount: totalGlobalAmount,
      currency: 'XOF',
      from_wallet_id: escrowDocRef.id,
      to_wallet_id: globalFundDocRef.id,
      user_id: null,
      group_id: groupId,
      member_id: null,
      status: 'SUCCESS',
      description: `Transfert 1ère cotisation (Fonds Global) - Groupe ${groupData.name}`,
      created_at: Timestamp.now()
    });

    const cycleRef = doc(collection(db, 'cycles'));
    
    const startDate = new Date();
    const dueDate = new Date(startDate);
    if (groupData.frequency === 'WEEKLY') dueDate.setDate(dueDate.getDate() + 7);
    else if (groupData.frequency === 'MONTHLY') dueDate.setMonth(dueDate.getMonth() + 1);
    else if (groupData.frequency === 'QUARTERLY') dueDate.setMonth(dueDate.getMonth() + 3);

    const defaultDate = new Date(dueDate);
    defaultDate.setDate(defaultDate.getDate() + 4);

    transaction.set(cycleRef, {
      id: cycleRef.id,
      group_id: groupId,
      cycle_number: 1,
      beneficiary_member_id: firstBeneficiaryId,
      start_date: now,
      payment_due_date: Timestamp.fromDate(dueDate),
      default_date: Timestamp.fromDate(defaultDate),
      expected_total: groupData.contribution_amount * totalMembers,
      actual_total: null,
      payout_date: null,
      status: 'ACTIVE'
    });

    shuffledMembers.forEach(member => {
      const paymentRef = doc(collection(db, 'payments'));
      transaction.set(paymentRef, {
        id: paymentRef.id,
        cycle_id: cycleRef.id,
        member_id: member.id,
        amount: groupData.contribution_amount,
        status: 'PENDING',
        paid_at: null
      });

      create_notification(
        member.user_id,
        "Groupe démarré !",
        `Le groupe ${groupData.name} a démarré. Votre position de tirage est ${member.draw_position}.`,
        'GROUP_START',
        transaction
      );
    });

    return { success: true };
  });
};

export const process_contribution_payment = async (memberId: string, cycleId: string) => {
  const memberRef = doc(db, 'tontine_members', memberId);
  const memberDocSnap = await getDoc(memberRef);
  if (!memberDocSnap.exists()) throw new Error('Member not found');
  const memberData = memberDocSnap.data();

  const groupRef = doc(db, 'tontine_groups', memberData.group_id);
  const groupDocSnap = await getDoc(groupRef);
  if (!groupDocSnap.exists()) throw new Error('Group not found');
  const groupData = groupDocSnap.data();

  const walletsRef = collection(db, 'wallets');
  
  const userWalletQuery = query(walletsRef, where('owner_id', '==', memberData.user_id), where('wallet_type', '==', 'USER_CERCLES'), limit(1));
  const userWalletSnapshot = await getDocs(userWalletQuery);
  if (userWalletSnapshot.empty) throw new Error('Portefeuille Cercles introuvable');
  const userWalletDocRef = userWalletSnapshot.docs[0].ref;

  const contribPoolQuery = query(walletsRef, where('group_id', '==', groupData.id), where('wallet_type', '==', 'CONTRIBUTION_POOL'), limit(1));
  const contribPoolSnapshot = await getDocs(contribPoolQuery);
  if (contribPoolSnapshot.empty) throw new Error('Contribution pool not found');
  const contribPoolDocRef = contribPoolSnapshot.docs[0].ref;

  const miniFundQuery = query(walletsRef, where('group_id', '==', groupData.id), where('wallet_type', '==', 'GROUP_MINI_FUND'), limit(1));
  const miniFundSnapshot = await getDocs(miniFundQuery);
  if (miniFundSnapshot.empty) throw new Error('Group mini fund not found');
  const miniFundDocRef = miniFundSnapshot.docs[0].ref;

  const globalFundDocRef = await getOrCreateGlobalFund();

  const paymentsQuery = query(collection(db, 'payments'), where('cycle_id', '==', cycleId), where('member_id', '==', memberId), limit(1));
  const paymentsSnapshot = await getDocs(paymentsQuery);
  const paymentDocRef = paymentsSnapshot.empty ? null : paymentsSnapshot.docs[0].ref;

  return await runTransaction(db, async (t) => {
    const memberDoc = await t.get(memberRef);
    if (!memberDoc.exists()) throw new Error('Member not found');
    const member = memberDoc.data();

    const groupDoc = await t.get(groupRef);
    if (!groupDoc.exists()) throw new Error('Group not found');
    const group = groupDoc.data();

    const userWalletDoc = await t.get(userWalletDocRef);
    const userWallet = userWalletDoc.data();

    const contribPoolDoc = await t.get(contribPoolDocRef);
    const contribPool = contribPoolDoc.data();

    const miniFundDoc = await t.get(miniFundDocRef);
    const miniFund = miniFundDoc.data();

    const globalFundDoc = await t.get(globalFundDocRef);
    const globalFund = globalFundDoc.data();

    const amount = group.contribution_amount;
    const miniAmount = Math.round(amount * 0.01);
    const globalAmount = Math.round(amount * 0.03);
    const contribAmount = amount - miniAmount - globalAmount;

    if (!userWallet || userWallet.balance < amount) throw new Error("Solde insuffisant");

    t.update(userWalletDocRef, { balance: userWallet.balance - amount });
    t.update(contribPoolDocRef, { balance: contribPool!.balance + contribAmount });
    t.update(miniFundDocRef, { balance: miniFund!.balance + miniAmount });
    t.update(globalFundDocRef, { balance: globalFund!.balance + globalAmount });

    const txRef1 = doc(collection(db, 'transactions'));
    t.set(txRef1, {
      type: 'CONTRIBUTION',
      amount: contribAmount,
      currency: 'XOF',
      from_wallet_id: userWalletDocRef.id,
      to_wallet_id: contribPoolDocRef.id,
      user_id: member.user_id,
      group_id: groupDoc.id,
      member_id: memberId,
      status: 'SUCCESS',
      description: `Cotisation cycle (Pool) - Groupe ${group.name}`,
      created_at: Timestamp.now()
    });

    const txRef2 = doc(collection(db, 'transactions'));
    t.set(txRef2, {
      type: 'MINI_FUND_CONTRIB',
      amount: miniAmount,
      currency: 'XOF',
      from_wallet_id: userWalletDocRef.id,
      to_wallet_id: miniFundDocRef.id,
      user_id: member.user_id,
      group_id: groupDoc.id,
      member_id: memberId,
      status: 'SUCCESS',
      description: `Cotisation cycle (Mini-fonds) - Groupe ${group.name}`,
      created_at: Timestamp.now()
    });

    const txRef3 = doc(collection(db, 'transactions'));
    t.set(txRef3, {
      type: 'GLOBAL_FUND_CONTRIB',
      amount: globalAmount,
      currency: 'XOF',
      from_wallet_id: userWalletDocRef.id,
      to_wallet_id: globalFundDocRef.id,
      user_id: member.user_id,
      group_id: groupDoc.id,
      member_id: memberId,
      status: 'SUCCESS',
      description: `Cotisation cycle (Fonds Global) - Groupe ${group.name}`,
      created_at: Timestamp.now()
    });

    if (paymentDocRef) {
      t.update(paymentDocRef, {
        status: 'SUCCESS',
        paid_at: Timestamp.now()
      });
    }

    await update_score_afiya(member.user_id, 'PAYMENT_SUCCESS', t);

    return { success: true };
  });
};

export const payout_to_beneficiary = async (cycleId: string) => {
  const cycleRef = doc(db, 'cycles', cycleId);
  const cycleDocSnap = await getDoc(cycleRef);
  if (!cycleDocSnap.exists()) throw new Error('Cycle not found');
  const cycleData = cycleDocSnap.data();

  const beneficiaryRef = doc(db, 'tontine_members', cycleData.beneficiary_member_id);
  const beneficiaryDocSnap = await getDoc(beneficiaryRef);
  if (!beneficiaryDocSnap.exists()) throw new Error('Beneficiary not found');
  const beneficiaryData = beneficiaryDocSnap.data();

  const membersQuery = query(collection(db, 'tontine_members'), where('group_id', '==', cycleData.group_id));
  const membersSnapshot = await getDocs(membersQuery);
  const totalMembers = membersSnapshot.size;

  const walletsRef = collection(db, 'wallets');
  
  const contribPoolQuery = query(walletsRef, where('group_id', '==', cycleData.group_id), where('wallet_type', '==', 'CONTRIBUTION_POOL'), limit(1));
  const contribPoolSnapshot = await getDocs(contribPoolQuery);
  if (contribPoolSnapshot.empty) throw new Error('Contribution pool not found');
  const contribPoolDocRef = contribPoolSnapshot.docs[0].ref;

  const beneficiaryWalletQuery = query(
    walletsRef,
    where('owner_id', '==', beneficiaryData.user_id),
    where('wallet_type', '==', 'USER_CERCLES'),
    limit(1)
  );
  const beneficiaryWalletSnapshot = await getDocs(beneficiaryWalletQuery);
  if (beneficiaryWalletSnapshot.empty) throw new Error('Beneficiary cercles wallet not found');
  const beneficiaryWalletDocRef = beneficiaryWalletSnapshot.docs[0].ref;

  return await runTransaction(db, async (t) => {
    const cycleDoc = await t.get(cycleRef);
    if (!cycleDoc.exists()) throw new Error('Cycle not found');
    const cycle = cycleDoc.data();

    const beneficiaryDoc = await t.get(beneficiaryRef);
    if (!beneficiaryDoc.exists()) throw new Error('Beneficiary not found');
    const beneficiary = beneficiaryDoc.data();

    const beneficiaryProfileRef = doc(db, 'profiles', beneficiary.user_id);
    const beneficiaryProfileDoc = await t.get(beneficiaryProfileRef);
    if (!beneficiaryProfileDoc.exists()) throw new Error('Beneficiary profile not found');
    const beneficiaryProfile = beneficiaryProfileDoc.data();

    const groupRef = doc(db, 'tontine_groups', cycle.group_id);
    const groupDoc = await t.get(groupRef);
    if (!groupDoc.exists()) throw new Error('Group not found');
    const group = groupDoc.data();

    const contribPoolDoc = await t.get(contribPoolDocRef);
    const contribPool = contribPoolDoc.data();

    const beneficiaryWalletDoc = await t.get(beneficiaryWalletDocRef);
    const beneficiaryWallet = beneficiaryWalletDoc.data();

    const grossPayout = cycle.expected_total;
    const position = beneficiary.draw_position;
    let baseTaux = 0;
    if (position <= 2) baseTaux = 1.0;
    else if (position <= 5) baseTaux = 0.5;
    
    const coeffs: Record<string, number> = { PLATINUM: 0.25, GOLD: 0.5, SILVER: 0.75, BRONZE: 1.0 };
    const retentionCoeff = coeffs[beneficiaryProfile.tier] || 1.0;
    const retentionAmount = Math.round(group.contribution_amount * baseTaux * retentionCoeff);
    const netPayout = grossPayout - retentionAmount;

    t.update(contribPoolDocRef, { balance: contribPool!.balance - netPayout });
    t.update(beneficiaryWalletDocRef, { balance: beneficiaryWallet!.balance + netPayout });

    t.update(beneficiaryRef, {
      retention_amount: retentionAmount,
      retention_applied: retentionAmount > 0,
      received_payout_at: Timestamp.now()
    });

    t.update(cycleRef, {
      status: 'COMPLETED',
      payout_date: Timestamp.now()
    });

    const nextCycleNumber = cycle.cycle_number + 1;
    
    if (nextCycleNumber <= group.total_cycles) {
      t.update(groupRef, {
        current_cycle: nextCycleNumber,
        updated_at: Timestamp.now()
      });

      const nextBeneficiary = membersSnapshot.docs.map(d => d.data()).find(m => m.draw_position === nextCycleNumber);
      
      if (nextBeneficiary) {
        const nextCycleRef = doc(collection(db, 'cycles'));
        
        const startDate = new Date();
        const dueDate = new Date(startDate);
        if (group.frequency === 'WEEKLY') dueDate.setDate(dueDate.getDate() + 7);
        else if (group.frequency === 'MONTHLY') dueDate.setMonth(dueDate.getMonth() + 1);
        else if (group.frequency === 'QUARTERLY') dueDate.setMonth(dueDate.getMonth() + 3);

        const defaultDate = new Date(dueDate);
        defaultDate.setDate(defaultDate.getDate() + 4);

        t.set(nextCycleRef, {
          id: nextCycleRef.id,
          group_id: group.id,
          cycle_number: nextCycleNumber,
          beneficiary_member_id: nextBeneficiary.id,
          start_date: Timestamp.now(),
          payment_due_date: Timestamp.fromDate(dueDate),
          default_date: Timestamp.fromDate(defaultDate),
          expected_total: group.contribution_amount * totalMembers,
          actual_total: null,
          payout_date: null,
          status: 'ACTIVE'
        });

        membersSnapshot.docs.forEach(memberDoc => {
          const paymentRef = doc(collection(db, 'payments'));
          t.set(paymentRef, {
            id: paymentRef.id,
            cycle_id: nextCycleRef.id,
            member_id: memberDoc.id,
            amount: group.contribution_amount,
            status: 'PENDING',
            paid_at: null
          });
        });
      }
    } else {
      t.update(groupRef, {
        status: 'COMPLETED',
        updated_at: Timestamp.now()
      });
    }

    const txRef = doc(collection(db, 'transactions'));
    t.set(txRef, {
      type: 'PAYOUT',
      amount: netPayout,
      currency: 'XOF',
      from_wallet_id: contribPoolDocRef.id,
      to_wallet_id: beneficiaryWalletDocRef.id,
      user_id: beneficiary.user_id,
      group_id: groupDoc.id,
      member_id: beneficiaryDoc.id,
      status: 'SUCCESS',
      description: `Versement cagnotte cycle ${cycle.cycle_number} - Groupe ${group.name}`,
      created_at: Timestamp.now()
    });

    await update_score_afiya(beneficiary.user_id, 'CYCLE_COMPLETED', t);

    await create_notification(
      beneficiary.user_id,
      "Paiement reçu !",
      `Vous avez reçu ${formatXOF(netPayout)} pour le cycle ${cycle.cycle_number} du groupe ${group.name}.`,
      'PAYOUT_RECEIVED',
      t
    );

    return { success: true, gross_payout: grossPayout, retention_amount: retentionAmount, net_payout: netPayout };
  });
};

export const handle_member_default = async (memberId: string, cycleId: string) => {
  const memberRef = doc(db, 'tontine_members', memberId);
  const memberDocSnap = await getDoc(memberRef);
  if (!memberDocSnap.exists()) throw new Error('Member not found');
  const memberData = memberDocSnap.data();

  const groupRef = doc(db, 'tontine_groups', memberData.group_id);
  const groupDocSnap = await getDoc(groupRef);
  if (!groupDocSnap.exists()) throw new Error('Group not found');
  const groupData = groupDocSnap.data();

  const walletsRef = collection(db, 'wallets');
  
  const escrowQuery = query(walletsRef, where('group_id', '==', groupData.id), where('wallet_type', '==', 'ESCROW_CONSTITUTION'), limit(1));
  const escrowSnapshot = await getDocs(escrowQuery);
  if (escrowSnapshot.empty) throw new Error('Escrow constitution not found');
  const escrowDocRef = escrowSnapshot.docs[0].ref;

  const contribPoolQuery = query(walletsRef, where('group_id', '==', groupData.id), where('wallet_type', '==', 'CONTRIBUTION_POOL'), limit(1));
  const contribPoolSnapshot = await getDocs(contribPoolQuery);
  if (contribPoolSnapshot.empty) throw new Error('Contribution pool not found');
  const contribPoolDocRef = contribPoolSnapshot.docs[0].ref;

  const miniFundQuery = query(walletsRef, where('group_id', '==', groupData.id), where('wallet_type', '==', 'GROUP_MINI_FUND'), limit(1));
  const miniFundSnapshot = await getDocs(miniFundQuery);
  if (miniFundSnapshot.empty) throw new Error('Group mini fund not found');
  const miniFundDocRef = miniFundSnapshot.docs[0].ref;

  const globalFundDocRef = await getOrCreateGlobalFund();

  return await runTransaction(db, async (t) => {
    const memberDoc = await t.get(memberRef);
    if (!memberDoc.exists()) throw new Error('Member not found');
    const member = memberDoc.data();

    const groupDoc = await t.get(groupRef);
    if (!groupDoc.exists()) throw new Error('Group not found');
    const group = groupDoc.data();

    const escrowDoc = await t.get(escrowDocRef);
    const escrow = escrowDoc.data();

    const contribPoolDoc = await t.get(contribPoolDocRef);
    const contribPool = contribPoolDoc.data();

    const miniFundDoc = await t.get(miniFundDocRef);
    const miniFund = miniFundDoc.data();

    const globalFundDoc = await t.get(globalFundDocRef);
    const globalFund = globalFundDoc.data();

    const amountNeeded = group.contribution_amount;
    let remainingNeeded = amountNeeded;
    let totalToContribPool = 0;

    // Couche 1: Caution
    const cautionAmount = member.adjusted_deposit || member.initial_deposit;
    const amountFromCaution = Math.min(cautionAmount, remainingNeeded);
    
    t.update(escrowDocRef, { balance: escrow!.balance - amountFromCaution });
    totalToContribPool += amountFromCaution;
    
    const txRef1 = doc(collection(db, 'transactions'));
    t.set(txRef1, {
      type: 'DEPOSIT_SEIZURE',
      amount: amountFromCaution,
      currency: 'XOF',
      from_wallet_id: escrowDocRef.id,
      to_wallet_id: contribPoolDocRef.id,
      user_id: member.user_id,
      group_id: groupDoc.id,
      member_id: memberId,
      status: 'SUCCESS',
      description: `Saisie caution (Défaut) - Groupe ${group.name}`,
      created_at: Timestamp.now()
    });

    remainingNeeded -= amountFromCaution;

    // Couche 2: Mini-fonds
    if (remainingNeeded > 0) {
      const amountFromMiniFund = Math.min(miniFund!.balance, remainingNeeded);
      t.update(miniFundDocRef, { balance: miniFund!.balance - amountFromMiniFund });
      totalToContribPool += amountFromMiniFund;
      
      const txRef2 = doc(collection(db, 'transactions'));
      t.set(txRef2, {
        type: 'MINI_FUND_CONTRIB',
        amount: amountFromMiniFund,
        currency: 'XOF',
        from_wallet_id: miniFundDocRef.id,
        to_wallet_id: contribPoolDocRef.id,
        user_id: null,
        group_id: groupDoc.id,
        member_id: null,
        status: 'SUCCESS',
        description: `Mobilisation Mini-fonds (Défaut) - Groupe ${group.name}`,
        created_at: Timestamp.now()
      });

      remainingNeeded -= amountFromMiniFund;
    }

    // Couche 3: Fonds Global
    if (remainingNeeded > 0) {
      const amountFromGlobalFund = Math.min(globalFund!.balance, remainingNeeded);
      t.update(globalFundDocRef, { balance: globalFund!.balance - amountFromGlobalFund });
      totalToContribPool += amountFromGlobalFund;
      
      const txRef3 = doc(collection(db, 'transactions'));
      t.set(txRef3, {
        type: 'GLOBAL_FUND_USAGE',
        amount: amountFromGlobalFund,
        currency: 'XOF',
        from_wallet_id: globalFundDocRef.id,
        to_wallet_id: contribPoolDocRef.id,
        user_id: null,
        group_id: groupDoc.id,
        member_id: null,
        status: 'SUCCESS',
        description: `Mobilisation Fonds Global (Défaut) - Groupe ${group.name}`,
        created_at: Timestamp.now()
      });

      remainingNeeded -= amountFromGlobalFund;
    }

    // Mise à jour finale du pool de contribution
    t.update(contribPoolDocRef, { balance: contribPool!.balance + totalToContribPool });

    if (remainingNeeded > 0) {
      throw new Error('Échec critique: Fonds insuffisants pour couvrir le défaut');
    }

    const newStatus = member.status === 'RESTRICTED' ? 'BANNED' : 'RESTRICTED';
    t.update(memberRef, {
      status: newStatus,
      cycles_defaulted: (member.cycles_defaulted || 0) + 1
    });

    if (newStatus === 'BANNED') {
      await update_score_afiya(member.user_id, 'GLOBAL_FUND_USED', t);
    } else {
      await update_score_afiya(member.user_id, 'DEFAULT_DECLARED', t);
    }

    return { success: true };
  });
};

export const restore_member_account = async (memberId: string) => {
  const memberRef = doc(db, 'tontine_members', memberId);
  const memberDocSnap = await getDoc(memberRef);
  if (!memberDocSnap.exists()) throw new Error('Member not found');
  const memberData = memberDocSnap.data();

  const groupRef = doc(db, 'tontine_groups', memberData.group_id);
  const groupDocSnap = await getDoc(groupRef);
  if (!groupDocSnap.exists()) throw new Error('Group not found');
  const groupData = groupDocSnap.data();

  const walletsRef = collection(db, 'wallets');
  
  const userWalletQuery = query(walletsRef, where('owner_id', '==', memberData.user_id), where('wallet_type', '==', 'USER_MAIN'), limit(1));
  const userWalletSnapshot = await getDocs(userWalletQuery);
  if (userWalletSnapshot.empty) throw new Error('User main wallet not found');
  const userWalletDocRef = userWalletSnapshot.docs[0].ref;

  const escrowQuery = query(walletsRef, where('group_id', '==', groupData.id), where('wallet_type', '==', 'ESCROW_CONSTITUTION'), limit(1));
  const escrowSnapshot = await getDocs(escrowQuery);
  if (escrowSnapshot.empty) throw new Error('Escrow constitution not found');
  const escrowDocRef = escrowSnapshot.docs[0].ref;

  const contribPoolQuery = query(walletsRef, where('group_id', '==', groupData.id), where('wallet_type', '==', 'CONTRIBUTION_POOL'), limit(1));
  const contribPoolSnapshot = await getDocs(contribPoolQuery);
  if (contribPoolSnapshot.empty) throw new Error('Contribution pool not found');
  const contribPoolDocRef = contribPoolSnapshot.docs[0].ref;

  const globalFundDocRef = await getOrCreateGlobalFund();

  const miniFundQuery = query(walletsRef, where('group_id', '==', groupData.id), where('wallet_type', '==', 'GROUP_MINI_FUND'), limit(1));
  const miniFundSnapshot = await getDocs(miniFundQuery);
  if (miniFundSnapshot.empty) throw new Error('Group mini fund not found');
  const miniFundDocRef = miniFundSnapshot.docs[0].ref;

  return await runTransaction(db, async (t) => {
    const memberDoc = await t.get(memberRef);
    if (!memberDoc.exists()) throw new Error('Member not found');
    const member = memberDoc.data();

    const groupDoc = await t.get(groupRef);
    if (!groupDoc.exists()) throw new Error('Group not found');
    const group = groupDoc.data();

    const userWalletDoc = await t.get(userWalletDocRef);
    const userWallet = userWalletDoc.data();

    const escrowDoc = await t.get(escrowDocRef);
    const escrow = escrowDoc.data();

    const contribPoolDoc = await t.get(contribPoolDocRef);
    const contribPool = contribPoolDoc.data();

    const globalFundDoc = await t.get(globalFundDocRef);
    const globalFund = globalFundDoc.data();

    const miniFundDoc = await t.get(miniFundDocRef);
    const miniFund = miniFundDoc.data();

    const cautionAmount = member.adjusted_deposit || member.initial_deposit;
    const contributionAmount = group.contribution_amount;
    const penaltyAmount = Math.round(contributionAmount * 0.05);
    const totalToPay = cautionAmount + contributionAmount + penaltyAmount;

    const miniAmount = Math.round(contributionAmount * 0.01);
    const globalAmount = Math.round(contributionAmount * 0.03);
    const contribAmount = contributionAmount - miniAmount - globalAmount;

    if (!userWallet || userWallet.balance < totalToPay) throw new Error("Solde insuffisant pour le rétablissement");

    t.update(userWalletDocRef, { balance: userWallet.balance - totalToPay });
    t.update(escrowDocRef, { balance: escrow!.balance + cautionAmount });
    t.update(contribPoolDocRef, { balance: contribPool!.balance + contribAmount });
    t.update(miniFundDocRef, { balance: miniFund!.balance + miniAmount });
    t.update(globalFundDocRef, { balance: globalFund!.balance + penaltyAmount + globalAmount });

    const txRef1 = doc(collection(db, 'transactions'));
    t.set(txRef1, {
      type: 'CAUTION',
      amount: cautionAmount,
      currency: 'XOF',
      from_wallet_id: userWalletDocRef.id,
      to_wallet_id: escrowDocRef.id,
      user_id: member.user_id,
      group_id: groupDoc.id,
      member_id: memberId,
      status: 'SUCCESS',
      description: `Reconstitution caution - Groupe ${group.name}`,
      created_at: Timestamp.now()
    });

    const txRef2 = doc(collection(db, 'transactions'));
    t.set(txRef2, {
      type: 'CONTRIBUTION',
      amount: contribAmount,
      currency: 'XOF',
      from_wallet_id: userWalletDocRef.id,
      to_wallet_id: contribPoolDocRef.id,
      user_id: member.user_id,
      group_id: groupDoc.id,
      member_id: memberId,
      status: 'SUCCESS',
      description: `Paiement cotisation en retard - Groupe ${group.name}`,
      created_at: Timestamp.now()
    });

    const txRefMini = doc(collection(db, 'transactions'));
    t.set(txRefMini, {
      type: 'MINI_FUND_CONTRIB',
      amount: miniAmount,
      currency: 'XOF',
      from_wallet_id: userWalletDocRef.id,
      to_wallet_id: miniFundDocRef.id,
      user_id: member.user_id,
      group_id: groupDoc.id,
      member_id: memberId,
      status: 'SUCCESS',
      description: `Cotisation en retard (Mini-fonds) - Groupe ${group.name}`,
      created_at: Timestamp.now()
    });

    const txRefGlobalContrib = doc(collection(db, 'transactions'));
    t.set(txRefGlobalContrib, {
      type: 'GLOBAL_FUND_CONTRIB',
      amount: globalAmount,
      currency: 'XOF',
      from_wallet_id: userWalletDocRef.id,
      to_wallet_id: globalFundDocRef.id,
      user_id: member.user_id,
      group_id: groupDoc.id,
      member_id: memberId,
      status: 'SUCCESS',
      description: `Cotisation en retard (Fonds Global) - Groupe ${group.name}`,
      created_at: Timestamp.now()
    });

    const txRef3 = doc(collection(db, 'transactions'));
    t.set(txRef3, {
      type: 'PENALTY',
      amount: penaltyAmount,
      currency: 'XOF',
      from_wallet_id: userWalletDocRef.id,
      to_wallet_id: globalFundDocRef.id,
      user_id: member.user_id,
      group_id: groupDoc.id,
      member_id: memberId,
      status: 'SUCCESS',
      description: `Pénalité de retard (5%) - Groupe ${group.name}`,
      created_at: Timestamp.now()
    });

    t.update(memberRef, {
      status: 'ACTIVE'
    });

    await update_score_afiya(member.user_id, 'ACCOUNT_RESTORED', t);

    return { success: true };
  });
};

/**
 * Déposer des fonds dans un pool d'épargne
 */
export async function deposit_to_pool(userId: string, poolId: string, amount: number) {
  return runTransaction(db, async (t) => {
    const userWalletQuery = query(collection(db, 'wallets'), where('owner_id', '==', userId), where('wallet_type', '==', 'USER_MAIN'));
    const userWalletSnap = await getDocs(userWalletQuery);
    if (userWalletSnap.empty) throw new Error("Portefeuille principal introuvable");
    const userWalletDoc = userWalletSnap.docs[0];
    const userWallet = userWalletDoc.data();

    if (userWallet.balance < amount) throw new Error("Solde insuffisant");

    const poolRef = doc(db, 'savings_pools', poolId);
    const poolSnap = await t.get(poolRef);
    if (!poolSnap.exists()) throw new Error("Pool introuvable");
    const pool = poolSnap.data();

    // Update balances
    t.update(userWalletDoc.ref, { balance: userWallet.balance - amount });
    t.update(poolRef, { current_amount: (pool.current_amount || 0) + amount });

    // Create transaction
    const txRef = doc(collection(db, 'transactions'));
    t.set(txRef, {
      type: 'DEPOSIT',
      amount: amount,
      currency: 'XOF',
      from_wallet_id: userWalletDoc.id,
      to_wallet_id: poolId,
      user_id: userId,
      status: 'SUCCESS',
      description: `Dépôt dans le pool : ${pool.name}`,
      created_at: Timestamp.now()
    });

    return { success: true };
  });
}

/**
 * Créer une notification pour un utilisateur
 */
export async function create_notification(userId: string, title: string, message: string, type: 'PAYMENT_DUE' | 'PAYOUT_RECEIVED' | 'GROUP_START' | 'GROUP_CANCELLED' | 'SYSTEM', t?: any) {
  try {
    const notifRef = doc(collection(db, 'notifications'));
    const data = {
      id: notifRef.id,
      user_id: userId,
      title,
      message,
      type,
      read: false,
      created_at: Timestamp.now()
    };
    if (t) {
      t.set(notifRef, data);
    } else {
      await setDoc(notifRef, data);
    }
  } catch (error) {
    console.error("Error creating notification:", error);
  }
}

export const transfer_cercles_to_main = async (
  userId: string,
  amount: number
): Promise<{ success: boolean }> => {
  return runTransaction(db, async (t) => {

    const walletsRef = collection(db, 'wallets');

    const cerclesQuery = query(
      walletsRef,
      where('owner_id', '==', userId),
      where('wallet_type', '==', 'USER_CERCLES'),
      limit(1)
    );
    const cerclesSnap = await getDocs(cerclesQuery);
    if (cerclesSnap.empty)
      throw new Error('Wallet Cercles introuvable');
    const cerclesRef = cerclesSnap.docs[0].ref;

    const mainQuery = query(
      walletsRef,
      where('owner_id', '==', userId),
      where('wallet_type', '==', 'USER_MAIN'),
      limit(1)
    );
    const mainSnap = await getDocs(mainQuery);
    if (mainSnap.empty)
      throw new Error('Wallet principal introuvable');
    const mainRef = mainSnap.docs[0].ref;

    const cerclesDoc = await t.get(cerclesRef);
    const mainDoc = await t.get(mainRef);

    const cercles = cerclesDoc.data();
    const main = mainDoc.data();

    if (!cercles || cercles.balance < amount)
      throw new Error('Solde Cercles insuffisant');

    t.update(cerclesRef, {
      balance: cercles.balance - amount
    });
    t.update(mainRef, {
      balance: main!.balance + amount
    });

    const txRef = doc(collection(db, 'transactions'));
    t.set(txRef, {
      id: txRef.id,
      type: 'WITHDRAWAL',
      amount,
      currency: 'XOF',
      from_wallet_id: cerclesSnap.docs[0].id,
      to_wallet_id: mainSnap.docs[0].id,
      user_id: userId,
      group_id: null,
      member_id: null,
      status: 'SUCCESS',
      description: 'Virement Cercles → Wallet principal',
      created_at: Timestamp.now()
    });

    return { success: true };
  });
};

export const transfer_main_to_cercles = async (
  userId: string,
  amount: number
): Promise<{ success: boolean }> => {
  return runTransaction(db, async (t) => {
    const walletsRef = collection(db, 'wallets');

    const mainQuery = query(walletsRef, where('owner_id', '==', userId), where('wallet_type', '==', 'USER_MAIN'), limit(1));
    const mainSnap = await getDocs(mainQuery);
    if (mainSnap.empty) throw new Error('Wallet principal introuvable');
    const mainRef = mainSnap.docs[0].ref;

    const cerclesQuery = query(walletsRef, where('owner_id', '==', userId), where('wallet_type', '==', 'USER_CERCLES'), limit(1));
    const cerclesSnap = await getDocs(cerclesQuery);
    if (cerclesSnap.empty) throw new Error('Wallet Cercles introuvable');
    const cerclesRef = cerclesSnap.docs[0].ref;

    const mainDoc = await t.get(mainRef);
    const cerclesDoc = await t.get(cerclesRef);
    const main = mainDoc.data();
    const cercles = cerclesDoc.data();

    if (!main || main.balance < amount) throw new Error('Solde Principal insuffisant');

    t.update(mainRef, { balance: main.balance - amount, updated_at: Timestamp.now() });
    t.update(cerclesRef, { balance: cercles!.balance + amount, updated_at: Timestamp.now() });

    const txRef = doc(collection(db, 'transactions'));
    t.set(txRef, {
      id: txRef.id,
      type: 'TRANSFER',
      amount,
      currency: 'XOF',
      from_wallet_id: mainSnap.docs[0].id,
      to_wallet_id: cerclesSnap.docs[0].id,
      user_id: userId,
      group_id: null,
      member_id: null,
      status: 'SUCCESS',
      description: 'Virement Principal → Cercles',
      created_at: Timestamp.now()
    });

    return { success: true };
  });
};

export const leave_group_forming = async (
  memberId: string,
  userId: string
): Promise<{ success: boolean; groupCancelled: boolean }> => {

  // 1. Récupérer le membre
  const memberRef = doc(db, 'tontine_members', memberId);
  const memberSnap = await getDoc(memberRef);
  if (!memberSnap.exists()) throw new Error('Membre introuvable');
  const member = memberSnap.data();

  // 2. Récupérer le groupe
  const groupRef = doc(db, 'tontine_groups', member.group_id);
  const groupSnap = await getDoc(groupRef);
  if (!groupSnap.exists()) throw new Error('Groupe introuvable');
  const group = groupSnap.data();

  // 3. Vérifier que le groupe est bien en FORMING
  if (group.status !== 'FORMING') {
    throw new Error('Impossible de quitter un groupe qui a déjà démarré');
  }

  // 4. Récupérer tous les membres actifs du groupe
  const allMembersSnap = await getDocs(
    query(collection(db, 'tontine_members'),
    where('group_id', '==', member.group_id),
    where('status', '==', 'ACTIVE'))
  );
  const activeMembers = allMembersSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
  const remainingCount = activeMembers.filter(m => m.id !== memberId).length;

  // 5. Récupérer wallets nécessaires
  const walletsRef = collection(db, 'wallets');

  const escrowSnap = await getDocs(
    query(walletsRef, where('group_id', '==', member.group_id),
    where('wallet_type', '==', 'ESCROW_CONSTITUTION'), limit(1))
  );
  if (escrowSnap.empty) throw new Error('Escrow introuvable');
  const escrowRef = escrowSnap.docs[0].ref;

  const userCerclesSnap = await getDocs(
    query(walletsRef, where('owner_id', '==', userId),
    where('wallet_type', '==', 'USER_CERCLES'), limit(1))
  );
  if (userCerclesSnap.empty) throw new Error('Wallet Cercles introuvable');
  const userCerclesRef = userCerclesSnap.docs[0].ref;

  const globalFundRef = await getOrCreateGlobalFund();

  // 6. Calcul des montants
  // Montant total à rembourser depuis escrow = initial_deposit + contribution_amount
  const totalInEscrow = member.initial_deposit + group.contribution_amount;
  // Frais = 1% du remboursé + 5% de la cotisation
  const fraisTransaction = Math.round(totalInEscrow * 0.01);
  const fraisCompensation = Math.round(group.contribution_amount * 0.05);
  const totalFrais = fraisTransaction + fraisCompensation;
  const montantRembourse = totalInEscrow - totalFrais;

  await runTransaction(db, async (t) => {
    const escrowDoc = await t.get(escrowRef);
    const userCerclesDoc = await t.get(userCerclesRef);
    const globalFundDoc = await t.get(globalFundRef);

    const escrow = escrowDoc.data();
    const userCercles = userCerclesDoc.data();
    const globalFund = globalFundDoc.data();

    if (!escrow || escrow.balance < totalInEscrow) {
      throw new Error('Solde escrow insuffisant');
    }

    // Débiter escrow
    t.update(escrowRef, {
      balance: escrow.balance - totalInEscrow,
      updated_at: Timestamp.now()
    });

    // Créditer USER_CERCLES du membre (montant net)
    t.update(userCerclesRef, {
      balance: userCercles!.balance + montantRembourse,
      updated_at: Timestamp.now()
    });

    // Créditer GLOBAL_FUND (frais)
    t.update(globalFundRef, {
      balance: globalFund!.balance + totalFrais,
      updated_at: Timestamp.now()
    });

    // Passer le membre en COMPLETED (sortie propre)
    t.update(memberRef, {
      status: 'COMPLETED',
      left_at: Timestamp.now()
    });

    // Transaction remboursement
    const txRefund = doc(collection(db, 'transactions'));
    t.set(txRefund, {
      id: txRefund.id,
      type: 'REFUND',
      amount: montantRembourse,
      currency: 'XOF',
      from_wallet_id: escrowSnap.docs[0].id,
      to_wallet_id: userCerclesSnap.docs[0].id,
      user_id: userId,
      group_id: member.group_id,
      member_id: memberId,
      status: 'SUCCESS',
      description: `Remboursement sortie - ${group.name}`,
      created_at: Timestamp.now()
    });

    // Transaction frais
    const txFrais = doc(collection(db, 'transactions'));
    t.set(txFrais, {
      id: txFrais.id,
      type: 'GLOBAL_FUND_CONTRIB',
      amount: totalFrais,
      currency: 'XOF',
      from_wallet_id: escrowSnap.docs[0].id,
      to_wallet_id: 'global_fund_main',
      user_id: userId,
      group_id: member.group_id,
      member_id: memberId,
      status: 'SUCCESS',
      description: `Frais sortie groupe - ${group.name}`,
      created_at: Timestamp.now()
    });

    // Transfert admin si nécessaire
    if (member.is_admin && remainingCount >= 4) {
      const nextAdmin = activeMembers
        .filter(m => m.id !== memberId)
        .sort((a, b) => (b.score_at_join || 0) - (a.score_at_join || 0))[0];
      if (nextAdmin) {
        const nextAdminRef = doc(db, 'tontine_members', nextAdmin.id);
        t.update(nextAdminRef, { is_admin: true });
        t.update(groupRef, {
          admin_id: nextAdmin.user_id,
          updated_at: Timestamp.now()
        });
      }
    }
  });

  // Si moins de 4 membres restants → annuler le groupe
  if (remainingCount < 4) {
    await cancel_group(member.group_id, 'INSUFFICIENT_MEMBERS');
    return { success: true, groupCancelled: true };
  }

  return { success: true, groupCancelled: false };
};

type CancelReason = 'ADMIN_REQUEST' | 'INSUFFICIENT_MEMBERS' | 'DEADLINE_NOT_MET';

export const cancel_group = async (
  groupId: string,
  reason: CancelReason
): Promise<{ success: boolean }> => {

  // 1. Récupérer le groupe
  const groupRef = doc(db, 'tontine_groups', groupId);
  const groupSnap = await getDoc(groupRef);
  if (!groupSnap.exists()) throw new Error('Groupe introuvable');
  const group = groupSnap.data();

  if (group.status !== 'FORMING' && group.status !== 'WAITING_VOTE') {
    throw new Error('Impossible d\'annuler un groupe déjà actif ou terminé');
  }

  // 2. Récupérer tous les membres actifs
  const membersSnap = await getDocs(
    query(collection(db, 'tontine_members'),
    where('group_id', '==', groupId),
    where('status', '==', 'ACTIVE'))
  );
  const members = membersSnap.docs.map(d => ({ ref: d.ref, ...d.data() })) as any[];

  // 3. Récupérer escrow
  const escrowSnap = await getDocs(
    query(collection(db, 'wallets'),
    where('group_id', '==', groupId),
    where('wallet_type', '==', 'ESCROW_CONSTITUTION'), limit(1))
  );
  if (escrowSnap.empty) throw new Error('Escrow introuvable');
  const escrowRef = escrowSnap.docs[0].ref;

  // 4. Pour chaque membre : récupérer son wallet USER_CERCLES
  const memberWallets: { memberId: string; userId: string; amount: number; walletRef: any }[] = [];

  for (const member of members) {
    const walletSnap = await getDocs(
      query(collection(db, 'wallets'),
      where('owner_id', '==', member.user_id),
      where('wallet_type', '==', 'USER_CERCLES'), limit(1))
    );
    if (!walletSnap.empty) {
      const amount = member.initial_deposit + group.contribution_amount;
      memberWallets.push({
        memberId: member.id,
        userId: member.user_id,
        amount,
        walletRef: walletSnap.docs[0].ref
      });
    }
  }

  // 5. Tout dans une runTransaction
  // Note: Firestore limite à 500 opérations par transaction
  // Pour les groupes de taille normale (max 30 membres) c'est largement suffisant
  await runTransaction(db, async (t) => {
    const escrowDoc = await t.get(escrowRef);
    const escrow = escrowDoc.data();

    // Rembourser chaque membre
    for (const mw of memberWallets) {
      const walletDoc = await t.get(mw.walletRef);
      const wallet = walletDoc.data();

      t.update(mw.walletRef, {
        balance: wallet!.balance + mw.amount,
        updated_at: Timestamp.now()
      });

      // Passer le membre en COMPLETED
      const memberRef = doc(db, 'tontine_members', mw.memberId);
      t.update(memberRef, {
        status: 'COMPLETED',
        left_at: Timestamp.now()
      });

      // Transaction REFUND par membre
      const txRef = doc(collection(db, 'transactions'));
      t.set(txRef, {
        id: txRef.id,
        type: 'REFUND',
        amount: mw.amount,
        currency: 'XOF',
        from_wallet_id: escrowSnap.docs[0].id,
        to_wallet_id: null,
        user_id: mw.userId,
        group_id: groupId,
        member_id: mw.memberId,
        status: 'SUCCESS',
        description: `Remboursement annulation cercle - ${group.name}`,
        created_at: Timestamp.now()
      });
    }

    // Vider l'escrow
    t.update(escrowRef, {
      balance: 0,
      updated_at: Timestamp.now()
    });

    // Passer le groupe en CANCELLED
    t.update(groupRef, {
      status: 'CANCELLED',
      cancelled_at: Timestamp.now(),
      cancel_reason: reason,
      updated_at: Timestamp.now()
    });
  });

  return { success: true };
};

export const trigger_waiting_vote = async (
  groupId: string
): Promise<{ success: boolean }> => {
  const groupRef = doc(db, 'tontine_groups', groupId);
  const groupSnap = await getDoc(groupRef);
  if (!groupSnap.exists()) throw new Error('Groupe introuvable');
  const group = groupSnap.data();

  if (group.status !== 'FORMING') {
    throw new Error('Le groupe n\'est pas en phase de constitution');
  }

  // Vérifier qu'il y a au moins 4 membres actifs
  const membersSnap = await getDocs(
    query(collection(db, 'tontine_members'),
    where('group_id', '==', groupId),
    where('status', '==', 'ACTIVE'))
  );
  if (membersSnap.size < 4) {
    // Pas assez de membres → annulation directe
    await cancel_group(groupId, 'DEADLINE_NOT_MET');
    return { success: false };
  }

  const voteDeadline = new Date();
  voteDeadline.setHours(voteDeadline.getHours() + 48);

  await runTransaction(db, async (t) => {
    t.update(groupRef, {
      status: 'WAITING_VOTE',
      vote_started_at: Timestamp.now(),
      vote_deadline: Timestamp.fromDate(voteDeadline),
      updated_at: Timestamp.now()
    });
  });

  return { success: true };
};

export const set_member_vote = async (
  memberId: string,
  userId: string,
  wantsToContinue: boolean
): Promise<{ success: boolean }> => {
  const memberRef = doc(db, 'tontine_members', memberId);
  const memberSnap = await getDoc(memberRef);
  if (!memberSnap.exists()) throw new Error('Membre introuvable');
  const member = memberSnap.data();

  // Vérifier que le groupe est bien en WAITING_VOTE
  const groupSnap = await getDoc(doc(db, 'tontine_groups', member.group_id));
  if (!groupSnap.exists()) throw new Error('Groupe introuvable');
  const group = groupSnap.data();

  if (group.status !== 'WAITING_VOTE') {
    throw new Error('Le vote n\'est plus actif');
  }

  // Vérifier que le délai n'est pas dépassé
  if (group.vote_deadline) {
    const deadline = group.vote_deadline.toDate ? group.vote_deadline.toDate() : new Date(group.vote_deadline);
    if (new Date() > deadline) {
      throw new Error('Le délai de vote est dépassé');
    }
  }

  await runTransaction(db, async (t) => {
    t.update(memberRef, {
      wants_to_continue: wantsToContinue,
      voted_at: Timestamp.now()
    });
  });

  return { success: true };
};

export const resolve_waiting_vote = async (
  groupId: string
): Promise<{ success: boolean; started: boolean; cancelled: boolean }> => {
  const groupRef = doc(db, 'tontine_groups', groupId);
  const groupSnap = await getDoc(groupRef);
  if (!groupSnap.exists()) throw new Error('Groupe introuvable');
  const group = groupSnap.data();

  if (group.status !== 'WAITING_VOTE') {
    throw new Error('Le groupe n\'est pas en attente de vote');
  }

  // Récupérer tous les membres actifs
  const membersSnap = await getDocs(
    query(collection(db, 'tontine_members'),
    where('group_id', '==', groupId),
    where('status', '==', 'ACTIVE'))
  );
  const members = membersSnap.docs.map(d => ({ id: d.id, ref: d.ref, ...d.data() })) as any[];

  // Séparer OUI et NON/non-répondants
  // wants_to_continue === true → reste
  // wants_to_continue === false OU null/undefined → part (sans frais car c'est le groupe qui n'a pas rempli)
  const staying = members.filter(m => m.wants_to_continue === true);
  const leaving = members.filter(m => m.wants_to_continue !== true);

  // Si moins de 4 membres veulent rester → annulation totale
  if (staying.length < 4) {
    await cancel_group(groupId, 'DEADLINE_NOT_MET');
    return { success: true, started: false, cancelled: true };
  }

  // Rembourser ceux qui partent — SANS frais (c'est le groupe qui n'était pas complet)
  const escrowSnap = await getDocs(
    query(collection(db, 'wallets'),
    where('group_id', '==', groupId),
    where('wallet_type', '==', 'ESCROW_CONSTITUTION'), limit(1))
  );
  if (escrowSnap.empty) throw new Error('Escrow introuvable');
  const escrowRef = escrowSnap.docs[0].ref;

  for (const member of leaving) {
    const walletSnap = await getDocs(
      query(collection(db, 'wallets'),
      where('owner_id', '==', member.user_id),
      where('wallet_type', '==', 'USER_CERCLES'), limit(1))
    );
    if (walletSnap.empty) continue;

    const amount = member.initial_deposit + group.contribution_amount;

    await runTransaction(db, async (t) => {
      const escrowDoc = await t.get(escrowRef);
      const walletDoc = await t.get(walletSnap.docs[0].ref);
      const escrow = escrowDoc.data();
      const wallet = walletDoc.data();

      t.update(escrowRef, {
        balance: escrow!.balance - amount,
        updated_at: Timestamp.now()
      });
      t.update(walletSnap.docs[0].ref, {
        balance: wallet!.balance + amount,
        updated_at: Timestamp.now()
      });
      t.update(member.ref, {
        status: 'COMPLETED',
        left_at: Timestamp.now()
      });

      const txRef = doc(collection(db, 'transactions'));
      t.set(txRef, {
        id: txRef.id,
        type: 'REFUND',
        amount,
        currency: 'XOF',
        from_wallet_id: escrowSnap.docs[0].id,
        to_wallet_id: walletSnap.docs[0].id,
        user_id: member.user_id,
        group_id: groupId,
        member_id: member.id,
        status: 'SUCCESS',
        description: `Remboursement vote - groupe incomplet`,
        created_at: Timestamp.now()
      });
    });
  }

  // Remettre le groupe en FORMING avec le nouveau nombre de membres cible
  // puis déclencher le démarrage
  await runTransaction(db, async (t) => {
    t.update(groupRef, {
      status: 'FORMING',
      target_members: staying.length,
      total_cycles: staying.length,
      updated_at: Timestamp.now()
    });
  });

  // Démarrer le groupe avec les membres restants
  await start_tontine_group(groupId);

  return { success: true, started: true, cancelled: false };
};

