import { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownLeft, Plus, ArrowDownCircle, ArrowUpCircle, Users, Award, Shield, Globe, MinusCircle, RotateCcw } from 'lucide-react';
import { formatXOF } from '../../lib/utils';
import { auth } from '../../lib/firebase';
import { getUserProfile, UserProfile } from '../../services/userService';
import { subscribeToUserWallet, subscribeToUserCaution, Wallet as WalletType, add_dev_funds } from '../../services/tontineService';
import { subscribeToCollection } from '../../lib/firestore';
import { where, orderBy, limit } from 'firebase/firestore';

export function Wallet() {
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [cautionBloquee, setCautionBloquee] = useState<number | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Load profile
    getUserProfile(user.uid).then(setProfile);

    // Subscribe to wallet
    const unsubscribeWallet = subscribeToUserWallet(user.uid, (wallet) => {
      if (wallet) setBalance(wallet.balance);
    });

    // Subscribe to caution
    const unsubscribeCaution = subscribeToUserCaution(user.uid, (total) => {
      setCautionBloquee(total);
    });

    // Subscribe to transactions
    const unsubscribeTxs = subscribeToCollection('transactions', [
      where('user_id', '==', user.uid),
      orderBy('created_at', 'desc'),
      limit(10)
    ], setTransactions);

    return () => {
      unsubscribeWallet();
      unsubscribeCaution();
      unsubscribeTxs();
    };
  }, []);

  // Use balance from wallet subscription
  const displayBalance = balance;

  const getTxIcon = (type: string) => {
    switch (type) {
      case 'DEPOSIT': return <ArrowDownCircle size={20} className="text-[#059669]" />;
      case 'WITHDRAWAL': return <ArrowUpCircle size={20} className="text-[#4B5563]" />;
      case 'CONTRIBUTION': return <Users size={20} className="text-blue-600" />;
      case 'PAYOUT': return <Award size={20} className="text-[#064E3B]" />;
      case 'MINI_FUND_CONTRIB': return <Shield size={20} className="text-purple-600" />;
      case 'GLOBAL_FUND_CONTRIB': return <Globe size={20} className="text-red-600" />;
      case 'PENALTY': return <MinusCircle size={20} className="text-red-600" />;
      case 'REFUND': return <RotateCcw size={20} className="text-[#059669]" />;
      default: return <ArrowDownLeft size={20} className="text-[#059669]" />;
    }
  };

  const getTxColor = (type: string) => {
    switch (type) {
      case 'DEPOSIT': case 'PAYOUT': case 'REFUND': return 'text-[#059669]';
      case 'WITHDRAWAL': case 'CONTRIBUTION': case 'MINI_FUND_CONTRIB': case 'GLOBAL_FUND_CONTRIB': case 'PENALTY': return 'text-[#111827]';
      default: return 'text-[#111827]';
    }
  };

  const getTxBg = (type: string) => {
    switch (type) {
      case 'DEPOSIT': case 'PAYOUT': case 'REFUND': return 'bg-green-100';
      case 'WITHDRAWAL': return 'bg-gray-100';
      case 'CONTRIBUTION': return 'bg-blue-100';
      case 'MINI_FUND_CONTRIB': return 'bg-purple-100';
      case 'GLOBAL_FUND_CONTRIB': case 'PENALTY': return 'bg-red-100';
      default: return 'bg-gray-100';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'PLATINUM': return 'bg-[#7C3AED] text-white';
      case 'GOLD': return 'bg-[#D97706] text-white';
      case 'SILVER': return 'bg-[#6B7280] text-white';
      default: return 'bg-[#B45309] text-white';
    }
  };

  const hour = new Date().getHours();
  const greeting = hour >= 18 ? 'Bonsoir' : 'Bonjour';
  const firstName = profile?.full_name?.split(' ')[0] || 'Utilisateur';

  const handleAddDevFunds = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setLoading(true);
    try {
      await add_dev_funds(user.uid, 100000);
    } catch (error) {
      console.error('Error adding dev funds:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-[#F8F9FA] h-full flex flex-col overflow-y-auto pb-24 lg:pb-6">
      {/* Top Header Section */}
      <div className="px-6 md:px-8 lg:px-10 pt-6 pb-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center border border-gray-200 shadow-sm">
            <span className="text-[#111827] font-bold text-lg">{firstName.charAt(0)}</span>
          </div>
          <div>
            <p className="text-[#4B5563] text-sm">{greeting},</p>
            <p className="text-[#111827] font-bold text-lg">{firstName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleAddDevFunds}
            disabled={loading}
            className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm hover:bg-yellow-500 transition-colors disabled:opacity-50"
          >
            +100K (DEV)
          </button>
          <div className={`${getTierColor(profile?.tier || 'BRONZE')} px-3 py-1.5 rounded-full flex items-center gap-1 shadow-sm`}>
            <span className="text-xs font-bold tracking-wide">{profile?.tier || 'BRONZE'}</span>
          </div>
        </div>
      </div>

      {/* Responsive Grid Container */}
      <div className="px-6 md:px-8 lg:px-10 flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        
        {/* Left Column (Balance & Caution) */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          
          {/* Green Card (Balance & Actions) */}
          <div className="relative overflow-hidden bg-[#1A8754] rounded-[24px] p-6 md:p-8 lg:p-10 text-white shadow-xl flex flex-col lg:flex-row lg:items-center lg:justify-between transition-all duration-300">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-32 h-32 bg-black opacity-10 rounded-full blur-xl pointer-events-none"></div>

            {/* Section Informations du Solde */}
            <div className="relative z-10 mb-8 lg:mb-0">
              <p className="text-emerald-100 text-sm md:text-base font-medium mb-2 uppercase tracking-wider">
                Solde disponible
              </p>
              <div className="flex items-baseline gap-2">
                {displayBalance === null ? (
                  <div className="h-10 md:h-12 lg:h-14 w-48 bg-white/20 animate-pulse rounded-lg mt-1 mb-2"></div>
                ) : (
                  <>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                      {formatXOF(displayBalance).replace(' FCFA', '')}
                    </h2>
                    <span className="text-xl md:text-2xl font-medium text-emerald-200">
                      FCFA
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Section Boutons d'Action */}
            <div className="relative z-10 grid grid-cols-3 gap-3 md:flex md:gap-4 lg:flex-col xl:flex-row">
              <button className="flex flex-col lg:flex-row items-center justify-center gap-2 bg-white/20 hover:bg-white/30 transition-colors rounded-2xl p-3 md:px-6 md:py-3 backdrop-blur-sm">
                <div className="bg-white text-[#1A8754] p-2 rounded-xl">
                  <Plus size={20} className="md:w-6 md:h-6" />
                </div>
                <span className="text-xs md:text-sm font-semibold mt-1 lg:mt-0">Dépôt</span>
              </button>
              <button className="flex flex-col lg:flex-row items-center justify-center gap-2 bg-white/20 hover:bg-white/30 transition-colors rounded-2xl p-3 md:px-6 md:py-3 backdrop-blur-sm">
                <div className="bg-white text-[#1A8754] p-2 rounded-xl">
                  <ArrowUpRight size={20} className="md:w-6 md:h-6" />
                </div>
                <span className="text-xs md:text-sm font-semibold mt-1 lg:mt-0">Retrait</span>
              </button>
              <button className="flex flex-col lg:flex-row items-center justify-center gap-2 bg-white/20 hover:bg-white/30 transition-colors rounded-2xl p-3 md:px-6 md:py-3 backdrop-blur-sm">
                <div className="bg-white text-[#1A8754] p-2 rounded-xl">
                  <ArrowDownLeft size={20} className="md:w-6 md:h-6" />
                </div>
                <span className="text-xs md:text-sm font-semibold mt-1 lg:mt-0">Envoyer</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Caution Bloquée */}
            <div className="bg-white rounded-[24px] p-5 md:p-6 shadow-sm border border-[#E5E7EB] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <Shield size={24} className="text-orange-600" />
                </div>
                <div>
                  <p className="text-[#4B5563] text-sm font-medium">Caution bloquée</p>
                  <p className="text-xs text-[#9CA3AF]">Sécurisée dans vos Cercles</p>
                </div>
              </div>
              <span className="text-[#111827] text-lg font-bold">
                {cautionBloquee === null ? (
                  <div className="h-6 w-24 bg-gray-200 animate-pulse rounded"></div>
                ) : (
                  formatXOF(cautionBloquee)
                )}
              </span>
            </div>
            
            {/* Desktop Only: Quick Stats / Chart Placeholder */}
            <div className="hidden lg:flex flex-col bg-white rounded-[24px] p-6 shadow-sm border border-[#E5E7EB]">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="text-[#111827] font-semibold text-base">Score Afiya</h3>
                 <span className="text-sm font-medium text-[#1A8754] bg-emerald-50 px-3 py-1 rounded-full">{profile?.score_afiya || 50}/100</span>
               </div>
               <div className="flex-1 flex items-center justify-center bg-[#F8F9FA] rounded-xl border border-dashed border-gray-200 min-h-[80px]">
                 <p className="text-gray-400 text-sm font-medium">Graphique (Bientôt disponible)</p>
               </div>
            </div>
          </div>

        </div>

        {/* Right Column (Transactions) */}
        <div className="flex flex-col bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] p-6 h-fit lg:col-span-1">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[#111827] font-semibold text-lg">Transactions récentes</h2>
            <button className="text-[#1A8754] text-sm font-medium hover:underline">Voir tout</button>
          </div>

          <div className="space-y-5">
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-[#9CA3AF] text-sm">
                Aucune transaction pour le moment.
              </div>
            ) : (
              transactions.map((tx) => {
                const isCredit = tx.type === 'DEPOSIT' || tx.type === 'PAYOUT' || tx.type === 'REFUND';
                const date = tx.created_at?.toDate ? tx.created_at.toDate() : new Date(tx.created_at);
                return (
                  <div key={tx.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${getTxBg(tx.type)}`}>
                        {getTxIcon(tx.type)}
                      </div>
                      <div>
                        <p className="text-[#111827] font-medium text-sm">{tx.description || tx.type}</p>
                        <p className="text-[#9CA3AF] text-xs mt-0.5">{date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                    <span className={`font-bold ${getTxColor(tx.type)}`}>
                      {isCredit ? '+' : '-'}{formatXOF(tx.amount)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
