import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { auth, db } from '../../lib/firebase';
import {
  runTransaction,
  doc,
  collection,
  query,
  where,
  limit,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { subscribeToUserWallet } from '../../services/tontineService';

export function Withdraw() {
  const navigate = useNavigate();

  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [balanceMain, setBalanceMain] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const unsub = subscribeToUserWallet(uid, (wallet) => {
      setBalanceMain(wallet ? wallet.balance : null);
    });

    return () => unsub();
  }, []);

  const isFormValid = amount.trim() !== '' && phoneNumber.trim() !== '';

  const handleWithdraw = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !isFormValid) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Montant invalide');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const walletsRef = collection(db, 'wallets');
      const walletQuery = query(
        walletsRef,
        where('owner_id', '==', uid),
        where('wallet_type', '==', 'USER_MAIN'),
        limit(1)
      );
      const walletSnap = await getDocs(walletQuery);
      if (walletSnap.empty) throw new Error('Portefeuille principal introuvable');

      const walletDoc = walletSnap.docs[0];
      const walletRef = walletDoc.ref;
      const walletId = walletDoc.id;

      await runTransaction(db, async (t) => {
        const walletLive = await t.get(walletRef);
        const wallet = walletLive.data();
        if (!wallet) throw new Error('Portefeuille introuvable');
        if (wallet.balance < numAmount) throw new Error('Solde insuffisant');

        const txRef = doc(collection(db, 'transactions'));

        t.update(walletRef, {
          balance: wallet.balance - numAmount,
          updated_at: Timestamp.now(),
        });

        t.set(txRef, {
          id: txRef.id,
          type: 'WITHDRAWAL',
          amount: numAmount,
          currency: 'XOF',
          from_wallet_id: walletId,
          to_wallet_id: null,
          user_id: uid,
          group_id: null,
          member_id: null,
          status: 'SUCCESS',
          description: 'Retrait Mobile Money',
          created_at: Timestamp.now(),
        });
      });

      setSuccess(true);
      setAmount('');
      setPhoneNumber('');
    } catch (err: any) {
      setError(err.message ?? 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const formatBalance = (bal: number | null) =>
    bal === null ? '...' : `${bal.toLocaleString('fr-FR')} XOF`;

  return (
    <div className="min-h-screen bg-gray-50 p-4">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Retirer</h1>
      </div>

      <div className="flex flex-col gap-4">

        {/* Solde disponible */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Solde disponible (Principal)</p>
          <p className="text-xl font-bold text-gray-900">{formatBalance(balanceMain)}</p>
        </div>

        {/* Champ montant */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Montant (XOF)
          </label>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setError(null); setSuccess(false); }}
            placeholder="0"
            className="w-full text-2xl font-bold text-gray-900 bg-transparent outline-none placeholder:text-gray-300"
          />
        </div>

        {/* Champ numéro */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Numéro Mobile Money
          </label>
          <input
            type="tel"
            inputMode="tel"
            value={phoneNumber}
            onChange={(e) => { setPhoneNumber(e.target.value); setError(null); setSuccess(false); }}
            placeholder="Ex : +229 97 00 00 00"
            className="w-full text-base font-semibold text-gray-900 bg-transparent outline-none placeholder:text-gray-400"
          />
        </div>

        {/* Erreur */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
            {error}
          </div>
        )}

        {/* Succès */}
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 font-medium">
            Retrait effectué avec succès.
          </div>
        )}

        {/* Bouton */}
        <button
          onClick={handleWithdraw}
          disabled={!isFormValid || loading}
          className="w-full py-4 bg-gray-900 text-white rounded-xl text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-opacity active:opacity-70"
        >
          {loading ? 'Retrait en cours...' : 'Retirer'}
        </button>

      </div>
    </div>
  );
}
