import { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownLeft, Plus, ArrowDownCircle, ArrowUpCircle, Users, Award, Shield, Globe, MinusCircle, RotateCcw } from 'lucide-react';
import { cn, formatXOF } from '../../lib/utils';
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
      case 'DEPOSIT': return <ArrowDownLeft size={20} className="text-[#047857]" />;
      case 'WITHDRAWAL': return <ArrowUpRight size={20} className="text-[#1C1410]" />;
      case 'CONTRIBUTION': return <Users size={20} className="text-[#1C1410]" />;
      case 'PAYOUT': return <Award size={20} className="text-[#047857]" />;
      case 'MINI_FUND_CONTRIB': return <Shield size={20} className="text-[#1C1410]" />;
      case 'GLOBAL_FUND_CONTRIB': return <Globe size={20} className="text-[#1C1410]" />;
      case 'PENALTY': return <MinusCircle size={20} className="text-[#1C1410]" />;
      case 'REFUND': return <RotateCcw size={20} className="text-[#047857]" />;
      default: return <ArrowDownLeft size={20} className="text-[#047857]" />;
    }
  };

  const getTxColor = (type: string) => {
    switch (type) {
      case 'DEPOSIT': case 'PAYOUT': case 'REFUND': return 'text-[#047857]';
      case 'WITHDRAWAL': case 'CONTRIBUTION': case 'MINI_FUND_CONTRIB': case 'GLOBAL_FUND_CONTRIB': case 'PENALTY': return 'text-[#1C1410]';
      default: return 'text-[#1C1410]';
    }
  };

  const getTxBg = (type: string) => {
    switch (type) {
      case 'DEPOSIT': case 'PAYOUT': case 'REFUND': return 'bg-[#ECFDF5]';
      case 'WITHDRAWAL': case 'CONTRIBUTION': case 'MINI_FUND_CONTRIB': case 'GLOBAL_FUND_CONTRIB': case 'PENALTY': return 'bg-[#F5F0E8]';
      default: return 'bg-[#F5F0E8]';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'PLATINUM': return 'bg-[#EDE9FE] text-[#5B21B6]';
      case 'GOLD': return 'bg-[#FDF3DC] text-[#C47820]';
      case 'SILVER': return 'bg-[#F1F5F9] text-[#475569]';
      default: return 'bg-[#F5E6D3] text-[#92400E]';
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
    <div className="flex-1 bg-[#F5F0E8] h-full flex flex-col overflow-y-auto pb-24 lg:pb-6">
      {/* Top Header Section */}
      <div className="px-6 md:px-8 lg:px-10 pt-6 pb-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center border border-[#E8E0D0] shadow-sm">
            <span className="text-[#1C1410] font-bold text-lg">{firstName.charAt(0)}</span>
          </div>
          <div>
            <p className="text-[#7C6F5E] text-sm">{greeting},</p>
            <p className="text-[#1C1410] font-bold text-lg">{firstName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleAddDevFunds}
            disabled={loading}
            className="bg-[#D4AF37] text-[#1C1410] text-xs font-bold px-3 py-1.5 rounded-full shadow-sm hover:bg-[#E5C158] transition-colors disabled:opacity-50"
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
          <div className="relative overflow-hidden bg-[#047857] rounded-3xl p-6 md:p-8 lg:p-10 text-white flex flex-col lg:flex-row lg:items-center lg:justify-between transition-all duration-300">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-32 h-32 bg-white/8 rounded-full blur-xl pointer-events-none"></div>

            {/* Section Informations du Solde */}
            <div className="relative z-10">
              <p className="text-white/80 text-sm font-medium mb-1">
                Solde disponible
              </p>
              <div className="flex items-baseline gap-2">
                {displayBalance === null ? (
                  <div className="h-10 md:h-12 lg:h-14 w-48 bg-white/20 animate-pulse rounded-lg mt-1 mb-2"></div>
                ) : (
                  <>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-light tracking-tighter text-white">
                      {formatXOF(displayBalance).replace(' FCFA', '')}
                    </h2>
                    <span className="text-xl md:text-2xl font-light text-white/70">
                      FCFA
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button className="flex-1 bg-white border border-[#E8E0D0] rounded-2xl py-3 flex flex-col items-center gap-2 active:bg-[#F5F0E8] transition-colors">
              <div className="w-10 h-10 rounded-full bg-[#ECFDF5] flex items-center justify-center">
                <ArrowDownLeft size={20} className="text-[#047857]" />
              </div>
              <span className="text-xs font-semibold text-[#1C1410]">Dépôt</span>
            </button>
            <button className="flex-1 bg-white border border-[#E8E0D0] rounded-2xl py-3 flex flex-col items-center gap-2 active:bg-[#F5F0E8] transition-colors">
              <div className="w-10 h-10 rounded-full bg-[#F5F0E8] flex items-center justify-center">
                <ArrowUpRight size={20} className="text-[#1C1410]" />
              </div>
              <span className="text-xs font-semibold text-[#1C1410]">Retrait</span>
            </button>
            <button className="flex-1 bg-white border border-[#E8E0D0] rounded-2xl py-3 flex flex-col items-center gap-2 active:bg-[#F5F0E8] transition-colors">
              <div className="w-10 h-10 rounded-full bg-[#F5F0E8] flex items-center justify-center">
                <ArrowUpRight size={20} className="text-[#1C1410]" />
              </div>
              <span className="text-xs font-semibold text-[#1C1410]">Envoyer</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Caution Bloquée */}
            <div className="bg-white rounded-2xl p-5 md:p-6 border border-[#E8E0D0] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#F5E6D3] flex items-center justify-center">
                  <Shield size={24} className="text-[#92400E]" />
                </div>
                <div>
                  <p className="text-[#7C6F5E] text-sm font-medium">Caution bloquée</p>
                  <p className="text-xs text-[#A39887]">Sécurisée dans vos Cercles</p>
                </div>
              </div>
              <span className="text-[#1C1410] text-lg font-bold">
                {cautionBloquee === null ? (
                  <div className="h-6 w-24 bg-[#E8E0D0] animate-pulse rounded"></div>
                ) : (
                  formatXOF(cautionBloquee)
                )}
              </span>
            </div>
            
            {/* Desktop Only: Quick Stats / Chart Placeholder */}
            <div className="hidden lg:flex flex-col bg-white rounded-2xl p-6 border border-[#E8E0D0]">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="text-[#1C1410] font-semibold text-sm">Score Afiya</h3>
                 <span className="text-sm font-bold text-[#047857] bg-[#F5F0E8] px-3 py-1 rounded-full">{profile?.score_afiya || 50}/100</span>
               </div>
               <div className="flex-1 flex items-center justify-center bg-[#F5F0E8] rounded-xl border border-dashed border-[#E8E0D0] min-h-[80px]">
                 <p className="text-[#A39887] text-sm font-medium">Graphique (Bientôt disponible)</p>
               </div>
            </div>
          </div>

        </div>

        {/* Right Column (Transactions) */}
        <div className="flex flex-col h-fit lg:col-span-1">
          <div className="flex justify-between items-center mb-4 px-2">
            <h2 className="text-sm font-semibold text-[#1C1410]">Transactions récentes</h2>
            <button className="text-[#047857] text-sm font-semibold hover:underline">Voir tout</button>
          </div>

          <div className="bg-white border border-[#E8E0D0] rounded-2xl overflow-hidden">
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-[#A39887] text-sm">
                Aucune transaction pour le moment.
              </div>
            ) : (
              transactions.map((tx, index) => {
                const isCredit = tx.type === 'DEPOSIT' || tx.type === 'PAYOUT' || tx.type === 'REFUND';
                const date = tx.created_at?.toDate ? tx.created_at.toDate() : new Date(tx.created_at);
                return (
                  <div key={tx.id} className={cn(
                    "flex px-4 py-3.5 items-center justify-between active:bg-[#F5F0E8] transition-colors cursor-pointer",
                    index !== transactions.length - 1 && "border-b border-[#F0EAE0]"
                  )}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getTxBg(tx.type)}`}>
                        {getTxIcon(tx.type)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[#1C1410] font-semibold text-sm">{tx.description || tx.type}</span>
                        <span className="text-[#7C6F5E] text-xs mt-0.5">{date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    <span className={`font-semibold text-sm ${getTxColor(tx.type)}`}>
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
