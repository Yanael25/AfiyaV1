import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Wallet as WalletIcon, Users, ArrowUpRight, ArrowDownLeft, Plus, Shield, Activity, ArrowDownCircle, ArrowUpCircle, Award, Globe, MinusCircle, RotateCcw } from 'lucide-react';
import { formatXOF } from '../../lib/utils';
import { auth } from '../../lib/firebase';
import { getUserProfile, UserProfile } from '../../services/userService';
import { subscribeToUserWallet, getUserGroups } from '../../services/tontineService';
import { subscribeToCollection } from '../../lib/firestore';
import { where, orderBy, limit } from 'firebase/firestore';

export function Home() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Load profile
    getUserProfile(user.uid).then(setProfile);

    // Subscribe to wallet
    const unsubscribeWallet = subscribeToUserWallet(user.uid, (wallet) => {
      if (wallet) setBalance(wallet.balance);
    });

    // Subscribe to transactions
    const unsubscribeTxs = subscribeToCollection('transactions', [
      where('user_id', '==', user.uid),
      orderBy('created_at', 'desc'),
      limit(5)
    ], setTransactions);

    // Load groups
    getUserGroups(user.uid).then(userGroups => {
      // Show active or forming groups on home page
      setGroups(userGroups.filter(g => g.status === 'ACTIVE' || g.status === 'FORMING' || g.status === 'WAITING_VOTE').slice(0, 3));
      setLoadingGroups(false);
    });

    return () => {
      unsubscribeWallet();
      unsubscribeTxs();
    };
  }, []);

  const hour = new Date().getHours();
  const greeting = hour >= 18 ? 'Bonsoir' : 'Bonjour';
  const firstName = profile?.full_name?.split(' ')[0] || 'Utilisateur';

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'PLATINUM': return 'bg-[#EDE9FE] text-[#5B21B6]';
      case 'GOLD': return 'bg-[#FDF3DC] text-[#C47820]';
      case 'SILVER': return 'bg-[#F1F5F9] text-[#475569]';
      default: return 'bg-[#F5E6D3] text-[#92400E]';
    }
  };

  const getTxIcon = (type: string) => {
    switch (type) {
      case 'DEPOSIT': return <ArrowDownCircle size={20} className="text-[#064E3B]" />;
      case 'WITHDRAWAL': return <ArrowUpCircle size={20} className="text-[#7C6F5E]" />;
      case 'CONTRIBUTION': return <Users size={20} className="text-[#064E3B]" />;
      case 'PAYOUT': return <Award size={20} className="text-[#064E3B]" />;
      case 'MINI_FUND_CONTRIB': return <Shield size={20} className="text-[#7C6F5E]" />;
      case 'GLOBAL_FUND_CONTRIB': return <Globe size={20} className="text-[#7C6F5E]" />;
      case 'PENALTY': return <MinusCircle size={20} className="text-[#92400E]" />;
      case 'REFUND': return <RotateCcw size={20} className="text-[#064E3B]" />;
      default: return <ArrowDownLeft size={20} className="text-[#064E3B]" />;
    }
  };

  const getTxColor = (type: string) => {
    switch (type) {
      case 'DEPOSIT': case 'PAYOUT': case 'REFUND': return 'text-[#064E3B]';
      case 'WITHDRAWAL': case 'CONTRIBUTION': case 'MINI_FUND_CONTRIB': case 'GLOBAL_FUND_CONTRIB': case 'PENALTY': return 'text-[#141414]';
      default: return 'text-[#141414]';
    }
  };

  const getTxBg = (type: string) => {
    switch (type) {
      case 'DEPOSIT': case 'PAYOUT': case 'REFUND': return 'bg-[#E8E0D0]';
      case 'WITHDRAWAL': return 'bg-[#F5F0E8]';
      case 'CONTRIBUTION': return 'bg-[#E8E0D0]';
      case 'MINI_FUND_CONTRIB': return 'bg-[#F5F0E8]';
      case 'GLOBAL_FUND_CONTRIB': case 'PENALTY': return 'bg-[#F5E6D3]';
      default: return 'bg-[#F5F0E8]';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'FORMING': return <span className="bg-[#FEF3C7] text-[#92400E] px-2 py-1 rounded text-[10px] font-bold">EN CONSTITUTION</span>;
      case 'ACTIVE': return <span className="bg-[#E8F5E9] text-[#064E3B] px-2 py-1 rounded text-[10px] font-bold">ACTIF</span>;
      case 'WAITING_VOTE': return <span className="bg-[#FEF3C7] text-[#92400E] px-2 py-1 rounded text-[10px] font-bold">VOTE EN COURS</span>;
      default: return null;
    }
  };

  return (
    <div className="flex-1 bg-[#F5F0E8] h-full flex flex-col overflow-y-auto pb-24 lg:pb-6">
      {/* Top Header Section */}
      <div className="px-6 md:px-8 lg:px-10 pt-6 pb-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center border border-[#E8E0D0] shadow-sm">
            <span className="text-[#141414] font-bold text-lg">{firstName.charAt(0)}</span>
          </div>
          <div>
            <p className="text-[#7C6F5E] text-sm">{greeting},</p>
            <p className="text-[#141414] font-bold text-lg">{firstName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`${getTierColor(profile?.tier || 'BRONZE')} px-3 py-1.5 rounded-full flex items-center gap-1 shadow-sm`}>
            <span className="text-xs font-bold tracking-wide">{profile?.tier || 'BRONZE'}</span>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-8 lg:px-10 flex-1 flex flex-col gap-8">
        
        {/* Main Wallet Card */}
        <div className="relative overflow-hidden bg-[#064E3B] rounded-[24px] p-6 md:p-8 text-white shadow-xl flex flex-col transition-all duration-300">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-32 h-32 bg-white/8 rounded-full blur-xl pointer-events-none"></div>

          <div className="relative z-10 flex justify-between items-start mb-6">
            <div>
              <p className="text-emerald-300 text-sm font-medium mb-1 uppercase tracking-wider">
                Solde disponible
              </p>
              <div className="flex items-baseline gap-2">
                {balance === null ? (
                  <div className="h-10 w-32 bg-white/20 animate-pulse rounded-lg mt-1"></div>
                ) : (
                  <>
                    <h2 className="text-4xl font-extrabold text-white tracking-tight">
                      {formatXOF(balance).replace(' FCFA', '')}
                    </h2>
                    <span className="text-xl font-medium text-emerald-200">
                      FCFA
                    </span>
                  </>
                )}
              </div>
            </div>
            <button 
              onClick={() => navigate('/wallet')}
              className="bg-white/10 hover:bg-white/20 p-3 rounded-xl backdrop-blur-sm transition-colors"
            >
              <WalletIcon size={24} className="text-white" />
            </button>
          </div>

          <div className="relative z-10 grid grid-cols-2 gap-3">
            <button 
              onClick={() => navigate('/wallet')}
              className="flex items-center justify-center gap-2 bg-white text-[#064E3B] hover:bg-gray-50 transition-colors rounded-xl py-3 font-semibold text-sm shadow-sm"
            >
              <ArrowUpRight size={18} />
              <span>Dépôt / Retrait</span>
            </button>
            <button 
              onClick={() => navigate('/tontines')}
              className="flex items-center justify-center gap-2 bg-[#047857] text-white hover:bg-[#0369a1] transition-colors rounded-xl py-3 font-semibold text-sm shadow-sm"
            >
              <Users size={18} />
              <span>Mes Cercles</span>
            </button>
          </div>
        </div>

        {/* Active Groups Section */}
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-[#141414] font-semibold text-lg">Mes Cercles</h2>
            <button onClick={() => navigate('/tontines')} className="text-[#064E3B] text-sm font-medium hover:underline">Voir tout</button>
          </div>
          
          {loadingGroups ? (
            <div className="text-center py-4 text-[#A39887] text-sm">Chargement...</div>
          ) : groups.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E8E0D0] text-center">
              <div className="w-12 h-12 bg-[#F5F0E8] rounded-full flex items-center justify-center mx-auto mb-3">
                <Users size={24} className="text-[#A39887]" />
              </div>
              <p className="text-[#7C6F5E] text-sm mb-4">Vous n'avez pas encore de cercle actif.</p>
              <button 
                onClick={() => navigate('/group/create')}
                className="bg-[#064E3B] text-white px-4 py-2 rounded-xl text-sm font-semibold"
              >
                Créer un cercle
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((group) => (
                <div 
                  key={group.id}
                  onClick={() => navigate(`/group/${group.id}`)}
                  className="bg-white p-5 rounded-2xl shadow-sm border border-[#E8E0D0] hover:shadow-md active:bg-[#F5F0E8] transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-[#141414] font-bold text-base mb-1">{group.name}</h3>
                      <p className="text-[#7C6F5E] text-xs">{group.members_count}/{group.target_members} membres</p>
                    </div>
                    {getStatusBadge(group.status)}
                  </div>
                  
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[#A39887] text-[10px] mb-0.5 uppercase tracking-wider font-semibold">Cotisation</p>
                      <p className="text-[#141414] font-bold text-sm">{formatXOF(group.contribution_amount)}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#F5F0E8] flex items-center justify-center group-hover:bg-[#E8E0D0] transition-colors">
                      <ArrowRight size={16} className="text-[#7C6F5E]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Transactions Section */}
        <div className="flex flex-col bg-white rounded-[24px] shadow-sm border border-[#E8E0D0] p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[#141414] font-semibold text-lg">Activité récente</h2>
            <button onClick={() => navigate('/wallet')} className="text-[#064E3B] text-sm font-medium hover:underline">Voir tout</button>
          </div>

          <div className="space-y-5">
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-[#A39887] text-sm">
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
                        <p className="text-[#141414] font-medium text-sm">{tx.description || tx.type}</p>
                        <p className="text-[#A39887] text-xs mt-0.5">{date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
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
