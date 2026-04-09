import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { auth, db } from '../../lib/firebase';
import { collection, query, where, limit, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { subscribeToCollection } from '../../lib/firestore';

type Filter = 'ALL' | 'MAIN' | 'CERCLES';

interface Transaction {
  id: string;
  type: string;
  description: string;
  amount: number;
  currency: string;
  from_wallet_id: string | null;
  to_wallet_id: string | null;
  user_id: string;
  status: string;
  created_at: Timestamp;
}

const INCOMING_TYPES = new Set(['DEPOSIT', 'PAYOUT', 'REFUND', 'CAUTION_REFUND']);

const TYPE_LABELS: Record<string, string> = {
  DEPOSIT: 'Recharge',
  WITHDRAWAL: 'Retrait',
  TRANSFER: 'Virement',
  PAYOUT: 'Versement tontine',
  REFUND: 'Remboursement',
  CAUTION_REFUND: 'Restitution caution',
  CONTRIBUTION: 'Cotisation',
  CAUTION: 'Caution',
};

function toDate(ts: Timestamp): Date {
  return ts?.toDate ? ts.toDate() : new Date(ts as any);
}

function groupLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (d.getTime() === today.getTime()) return "AUJOURD'HUI";
  if (d.getTime() === yesterday.getTime()) return 'HIER';
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function groupByDate(txs: Transaction[]): { label: string; items: Transaction[] }[] {
  const groups: Map<string, Transaction[]> = new Map();

  for (const tx of txs) {
    const date = toDate(tx.created_at);
    const label = groupLabel(date);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(tx);
  }

  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

export function AllTransactions() {
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [walletMainId, setWalletMainId] = useState<string | null>(null);
  const [walletCerclesId, setWalletCerclesId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const walletsRef = collection(db, 'wallets');

    // Récupère les IDs des wallets une seule fois
    const fetchWalletIds = async () => {
      const [mainSnap, cerclesSnap] = await Promise.all([
        getDocs(query(walletsRef, where('owner_id', '==', uid), where('wallet_type', '==', 'USER_MAIN'), limit(1))),
        getDocs(query(walletsRef, where('owner_id', '==', uid), where('wallet_type', '==', 'USER_CERCLES'), limit(1))),
      ]);
      if (!mainSnap.empty) setWalletMainId(mainSnap.docs[0].id);
      if (!cerclesSnap.empty) setWalletCerclesId(cerclesSnap.docs[0].id);
    };

    fetchWalletIds();

    // Abonnement temps réel aux transactions
    const unsub = subscribeToCollection<Transaction>(
      'transactions',
      [where('user_id', '==', uid), orderBy('created_at', 'desc')],
      (data) => {
        setTransactions(data);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const uid = auth.currentUser?.uid ?? '';

  const isIncoming = (tx: Transaction): boolean => {
    if (INCOMING_TYPES.has(tx.type)) return true;
    if (tx.type === 'TRANSFER' && tx.to_wallet_id && (tx.to_wallet_id === walletMainId || tx.to_wallet_id === walletCerclesId)) return true;
    return false;
  };

  const filtered = transactions.filter((tx) => {
    if (filter === 'ALL') return true;
    if (filter === 'MAIN') return tx.from_wallet_id === walletMainId || tx.to_wallet_id === walletMainId;
    if (filter === 'CERCLES') return tx.from_wallet_id === walletCerclesId || tx.to_wallet_id === walletCerclesId;
    return true;
  });

  const groups = groupByDate(filtered);

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
        <h1 className="text-lg font-bold text-gray-900">Transactions</h1>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl border border-gray-200 p-1 flex mb-4 gap-1">
        {(['ALL', 'MAIN', 'CERCLES'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f ? 'bg-gray-900 text-white' : 'text-gray-500'
            }`}
          >
            {f === 'ALL' ? 'Tout' : f === 'MAIN' ? 'Principal' : 'Cercles'}
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <p className="text-sm text-gray-400 text-center mt-12">Chargement...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center mt-12">Aucune transaction</p>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map(({ label, items }) => (
            <div key={label}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
                {label}
              </p>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {items.map((tx, i) => {
                  const incoming = isIncoming(tx);
                  const date = toDate(tx.created_at);
                  const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div
                      key={tx.id}
                      className={`flex items-center justify-between px-4 py-3 ${
                        i < items.length - 1 ? 'border-b border-gray-100' : ''
                      }`}
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {TYPE_LABELS[tx.type] ?? tx.type}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{tx.description}</p>
                        <p className="text-xs text-gray-300">{timeStr}</p>
                      </div>
                      <p className={`text-sm font-bold ml-4 shrink-0 ${incoming ? 'text-green-600' : 'text-gray-900'}`}>
                        {incoming ? '+' : ''}{tx.amount.toLocaleString('fr-FR')} {tx.currency}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
