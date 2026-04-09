import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { transfer_main_to_cercles, transfer_cercles_to_main } from '../../lib/businessLogic';
import { subscribeToUserWallet, subscribeToUserCerclesWallet } from '../../services/tontineService';

type Direction = 'MAIN_TO_CERCLES' | 'CERCLES_TO_MAIN';

export function Transfer() {
  const navigate = useNavigate();

  const [direction, setDirection] = useState<Direction>('MAIN_TO_CERCLES');
  const [amount, setAmount] = useState('');
  const [balanceMain, setBalanceMain] = useState<number | null>(null);
  const [balanceCercles, setBalanceCercles] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const unsubMain = subscribeToUserWallet(uid, (wallet) => {
      setBalanceMain(wallet ? wallet.balance : null);
    });

    const unsubCercles = subscribeToUserCerclesWallet(uid, (wallet) => {
      setBalanceCercles(wallet ? wallet.balance : null);
    });

    return () => {
      unsubMain();
      unsubCercles();
    };
  }, []);

  const handleTransfer = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !amount) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Montant invalide');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      if (direction === 'MAIN_TO_CERCLES') {
        await transfer_main_to_cercles(uid, numAmount);
      } else {
        await transfer_cercles_to_main(uid, numAmount);
      }
      setSuccess(true);
      setAmount('');
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
        <h1 className="text-lg font-bold text-gray-900">Transférer</h1>
      </div>

      {/* Soldes */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Principal</p>
          <p className="text-base font-semibold text-gray-900">{formatBalance(balanceMain)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Cercles</p>
          <p className="text-base font-semibold text-gray-900">{formatBalance(balanceCercles)}</p>
        </div>
      </div>

      {/* Sélecteur de direction */}
      <div className="bg-white rounded-xl border border-gray-200 p-1 flex mb-4">
        <button
          onClick={() => { setDirection('MAIN_TO_CERCLES'); setError(null); setSuccess(false); }}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            direction === 'MAIN_TO_CERCLES'
              ? 'bg-gray-900 text-white'
              : 'text-gray-500'
          }`}
        >
          Principal → Cercles
        </button>
        <button
          onClick={() => { setDirection('CERCLES_TO_MAIN'); setError(null); setSuccess(false); }}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            direction === 'CERCLES_TO_MAIN'
              ? 'bg-gray-900 text-white'
              : 'text-gray-500'
          }`}
        >
          Cercles → Principal
        </button>
      </div>

      {/* Champ montant */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
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

      {/* Erreur */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
          {error}
        </div>
      )}

      {/* Succès */}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 font-medium">
          Transfert effectué avec succès.
        </div>
      )}

      {/* Bouton */}
      <button
        onClick={handleTransfer}
        disabled={!amount || loading}
        className="w-full py-4 bg-gray-900 text-white rounded-xl text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
      >
        {loading ? 'Transfert en cours...' : 'Confirmer le transfert'}
      </button>

    </div>
  );
}
