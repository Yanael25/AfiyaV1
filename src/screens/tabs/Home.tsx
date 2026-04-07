import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  QrCode, 
  Inbox, 
  ArrowLeftRight, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Users, 
  TrendingUp,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatXOF } from '../../lib/utils';
import { auth } from '../../lib/firebase';
import { getUserProfile, UserProfile } from '../../services/userService';
import {
  subscribeToUserWallet,
  subscribeToUserCerclesWallet,
  subscribeToUserCapitalWallet,
  getUserGroups,
  getUpcomingCycleInfo
} from '../../services/tontineService';
import { subscribeToCollection } from '../../lib/firestore';
import { where, orderBy, limit } from 'firebase/firestore';

// --- TYPES & HELPERS ---
type WalletType = 0 | 1 | 2; // 0: Principal, 1: Cercles, 2: Capital

interface Transaction {
  id: string;
  type: string;
  description?: string;
  amount: number;
  created_at: any;
}

export function Home() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  const [balanceMain, setBalanceMain] = useState<number | null>(null);
  const [balanceCercles, setBalanceCercles] = useState<number | null>(null);
  const [balanceCapital, setBalanceCapital] = useState<number | null>(null);
  
  const [cycleInfo, setCycleInfo] = useState<{
    groupName: string;
    type: 'À payer' | 'À recevoir';
    amount: number;
    dueDate: Date;
  } | null>(null);
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userGroups, setUserGroups] = useState<any[]>([]);
  const [activeCard, setActiveCard] = useState<WalletType>(0);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) { navigate('/welcome'); return; }

    getUserProfile(user.uid).then(setProfile);

    const unsubMain = subscribeToUserWallet(user.uid, w => {
      if (w) setBalanceMain(w.balance);
    });

    const unsubCercles = subscribeToUserCerclesWallet(user.uid, w => {
      if (w) setBalanceCercles(w.balance);
    });

    const unsubCapital = subscribeToUserCapitalWallet(user.uid, w => {
      if (w) setBalanceCapital(w.balance);
    });

    getUserGroups(user.uid).then(async data => {
      setUserGroups(data);
      const filtered = data.filter(g =>
        g.status === 'ACTIVE' ||
        g.status === 'FORMING' ||
        g.status === 'WAITING_VOTE'
      );
      const info = await getUpcomingCycleInfo(user.uid, filtered);
      setCycleInfo(info);
    });

    const unsubTx = subscribeToCollection(
      'transactions',
      [
        where('user_id', '==', user.uid),
        orderBy('created_at', 'desc'),
        limit(5)
      ],
      setTransactions
    );

    return () => {
      unsubMain();
      unsubCercles();
      unsubCapital();
      unsubTx();
    };
  }, [navigate]);

  // --- LOGIQUE SCROLL & UI ---
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const scrollLeft = scrollContainerRef.current.scrollLeft;
      const cardWidth = window.innerWidth * 0.85 > 320 ? 320 + 16 : (window.innerWidth * 0.85) + 16; 
      const newActiveCard = Math.round(scrollLeft / cardWidth);
      if (newActiveCard !== activeCard && newActiveCard >= 0 && newActiveCard <= 2) {
        setActiveCard(newActiveCard as WalletType);
      }
    }
  };

  const cleanAmount = (val: number | null) => {
    if (val === null) return '...';
    return formatXOF(val).replace(/\s?FCFA/gi, '').trim();
  };

  const isCredit = (type: string) => ['DEPOSIT','PAYOUT','REFUND'].includes(type);

  // --- FORMATTERS ---
  const firstName = profile?.full_name?.split(' ')[0] || '';
  const initial = firstName ? firstName.charAt(0).toUpperCase() : 'U';

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bon matin';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  })();

  const todayStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

  const getTierBadgeProps = (tier?: string) => {
    switch(tier?.toUpperCase()) {
      case 'PLATINUM': return { bg: 'bg-[#F8FAFC]', text: 'text-[#334155]', border: 'border-[0.5px] border-[#CBD5E1]' };
      case 'GOLD': return { bg: 'bg-[#FEF9C3]', text: 'text-[#A16207]', border: '' };
      case 'SILVER': return { bg: 'bg-[#F1F5F9]', text: 'text-[#475569]', border: '' };
      default: return { bg: 'bg-[#FEF3C7]', text: 'text-[#92400E]', border: '' }; // BRONZE
    }
  };
  const tierProps = getTierBadgeProps(profile?.tier);

  // --- GROUPING TRANSACTIONS ---
  const groupTransactionsByDate = () => {
    const groups: { label: string, txs: Transaction[] }[] = [];
    
    transactions.forEach(tx => {
      if (!tx.created_at) return;
      const d = tx.created_at.toDate ? tx.created_at.toDate() : new Date(tx.created_at);
      const now = new Date();
      
      let label = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).toUpperCase();
      
      if (d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
        label = "AUJOURD'HUI";
      } else {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth() && d.getFullYear() === yesterday.getFullYear()) {
          label = "HIER";
        }
      }

      const existingGroup = groups.find(g => g.label === label);
      if (existingGroup) existingGroup.txs.push(tx);
      else groups.push({ label, txs: [tx] });
    });
    
    return groups;
  };

  const txGroups = groupTransactionsByDate();

  // --- ACTIONS CONTEXTUELLES ---
  const getContextualActions = () => {
    switch (activeCard) {
      case 0:
        return [
          { label: 'Transférer', icon: ArrowLeftRight, isPrimary: true },
          { label: 'Recevoir', icon: QrCode, isPrimary: false },
          { label: 'Recharger', icon: ArrowDownToLine, isPrimary: false },
          { label: 'Retirer', icon: ArrowUpFromLine, isPrimary: false },
        ];
      case 1:
        return [
          { label: 'Transférer', icon: ArrowLeftRight, isPrimary: false },
          { label: 'Recevoir', icon: QrCode, isPrimary: false },
          { label: 'Cotiser', icon: Users, isPrimary: true },
          { label: 'Mes cercles', icon: Users, isPrimary: false },
        ];
      case 2:
        return [
          { label: 'Transférer', icon: ArrowLeftRight, isPrimary: false },
          { label: 'Recevoir', icon: QrCode, isPrimary: false },
          { label: 'Explorer', icon: TrendingUp, isPrimary: false },
        ];
      default: return [];
    }
  };

  // --- REPARTITION CALCULS ---
  const totalBalance = (balanceMain || 0) + (balanceCercles || 0) + (balanceCapital || 0);
  const pMain = totalBalance ? ((balanceMain || 0) / totalBalance) * 100 : 0;
  const pCercles = totalBalance ? ((balanceCercles || 0) / totalBalance) * 100 : 0;
  const pCapital = totalBalance ? ((balanceCapital || 0) / totalBalance) * 100 : 0;

  return (
    <div className="bg-[#F5F4F0] min-h-screen flex flex-col font-sans pb-20">
      
      {/* 1. HEADER */}
      <div className="pt-[52px] px-6 pb-6 flex justify-between items-start">
        <div>
          <p className="text-[13px] font-[500] text-[#A39887] mb-0.5">{greeting},</p>
          <h1 className="text-[24px] font-[800] text-[#1A1A1A] tracking-[-0.02em] leading-tight mb-2">
            {firstName}
          </h1>
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-[500] text-[#A39887]">{todayStr}</span>
            <span className="text-[#C4B8AC]">·</span>
            <span className="text-[12px] font-[700] text-[#047857]">{profile?.score_afiya || 50} pts</span>
            <span className="text-[#C4B8AC]">·</span>
            <span className={`px-1.5 py-0.5 rounded-[4px] text-[10px] font-[700] uppercase tracking-wider ${tierProps.bg} ${tierProps.text} ${tierProps.border}`}>
              {profile?.tier || 'BRONZE'}
            </span>
          </div>
        </div>
        
        <div 
          onClick={() => navigate('/profile')}
          className="w-[42px] h-[42px] rounded-[13px] bg-[#047857] flex items-center justify-center text-[17px] font-[800] text-white cursor-pointer"
        >
          {initial}
        </div>
      </div>

      {/* 2. CARDS SWIPEABLES */}
      <div className="relative mb-6">
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="pl-6 pr-6 overflow-x-auto flex gap-4 snap-x snap-mandatory hide-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* CARD 1 - PRINCIPAL */}
          <div className="w-[85vw] max-w-[320px] h-[160px] bg-white rounded-[20px] border-[0.5px] border-[#EDECEA] p-[18px] shrink-0 snap-center flex flex-col">
            <div className="flex justify-between items-start mb-1">
              <span className="text-[9px] font-[700] uppercase text-[#A39887] tracking-[0.1em]">Compte Principal</span>
            </div>
            <div className="flex items-baseline gap-1 mb-0.5">
              <span className="text-[30px] font-[800] text-[#1A1A1A] leading-none">
                {cleanAmount(balanceMain)}
              </span>
            </div>
            <p className="text-[11px] font-[500] text-[#A39887] mb-auto">Fonds disponibles</p>
            
            <div className="bg-[#F5F4F0] rounded-[10px] p-[10px]">
              <p className="text-[12px] font-[600] text-[#1A1A1A]">Aucun mouvement prévu</p>
            </div>
          </div>

          {/* CARD 2 - CERCLES */}
          <div className="w-[85vw] max-w-[320px] h-[160px] bg-white rounded-[20px] border-[0.5px] border-[#EDECEA] p-[18px] shrink-0 snap-center flex flex-col">
            <div className="flex justify-between items-start mb-1">
              <span className="text-[9px] font-[700] uppercase text-[#A39887] tracking-[0.1em]">Compte Cercles</span>
            </div>
            <div className="flex items-baseline gap-1 mb-0.5">
              <span className="text-[30px] font-[800] text-[#1A1A1A] leading-none">
                {cleanAmount(balanceCercles)}
              </span>
            </div>
            <p className="text-[11px] font-[500] text-[#A39887] mb-auto">Fonds des cercles</p>
            
            <div className="bg-[#F5F4F0] rounded-[10px] p-[10px]">
              {cycleInfo ? (
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-[500] text-[#6B6B6B] truncate pr-2">{cycleInfo.groupName}</span>
                  <span className={`text-[12px] font-[700] ${cycleInfo.type === 'À recevoir' ? 'text-[#047857]' : 'text-[#1A1A1A]'}`}>
                    {cycleInfo.type === 'À recevoir' ? '+' : '-'}{cleanAmount(cycleInfo.amount)}
                  </span>
                </div>
              ) : (
                <p className="text-[12px] font-[600] text-[#1A1A1A]">Aucune cotisation active</p>
              )}
            </div>
          </div>

          {/* CARD 3 - CAPITAL */}
          <div className="w-[85vw] max-w-[320px] h-[160px] bg-white rounded-[20px] border-[0.5px] border-[#EDECEA] p-[18px] shrink-0 snap-center flex flex-col mr-6">
            <div className="flex justify-between items-start mb-1">
              <span className="text-[9px] font-[700] uppercase text-[#A39887] tracking-[0.1em]">Afiya Capital</span>
            </div>
            <div className="flex items-baseline gap-1 mb-0.5">
              <span className="text-[30px] font-[800] text-[#1A1A1A] leading-none">
                {cleanAmount(balanceCapital)}
              </span>
            </div>
            <p className="text-[11px] font-[500] text-[#A39887] mb-auto">Compte capital</p>
            
            <div className="bg-[#F5F4F0] rounded-[10px] p-[10px]">
              <p className="text-[12px] font-[600] text-[#C4B8AC]">Bientôt disponible</p>
            </div>
          </div>
        </div>

        {/* DOTS PAGINATION */}
        <div className="flex justify-center gap-1.5 mt-4">
          {[0, 1, 2].map((i) => (
            <div 
              key={i} 
              className={`transition-all duration-300 ${
                activeCard === i 
                  ? 'w-[18px] h-[5px] bg-[#047857] rounded-full' 
                  : 'w-[5px] h-[5px] bg-[#D1D0CD] rounded-full'
              }`}
            />
          ))}
        </div>
      </div>

      {/* 3. ACTIONS RAPIDES CONTEXTUELLES */}
      <div className="px-6 mb-8">
        <AnimatePresence mode="wait">
          <motion.div 
            key={activeCard}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className={`grid gap-3 ${activeCard === 2 ? 'grid-cols-3' : 'grid-cols-4'}`}
          >
            {getContextualActions().map((action, idx) => (
              <button key={idx} className="flex flex-col items-center gap-1.5 group">
                <div className={`w-[50px] h-[50px] rounded-[15px] flex items-center justify-center transition-transform active:scale-95 ${
                  action.isPrimary ? 'bg-[#ECFDF5]' : 'bg-[#F5F4F0]'
                }`}>
                  <action.icon className={`w-[20px] h-[20px] ${action.isPrimary ? 'text-[#047857]' : 'text-[#6B6B6B]'}`} strokeWidth={2} />
                </div>
                <span className="text-[11px] font-[700] text-[#1A1A1A]">{action.label}</span>
              </button>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 4. SECTION RÉPARTITION */}
      <div className="px-6 mb-8">
        <div className="bg-white rounded-[20px] border-[0.5px] border-[#EDECEA] p-[14px]">
          <div className="flex justify-between items-end mb-3">
            <span className="text-[8px] font-[700] uppercase text-[#A39887] tracking-[0.1em]">Répartition</span>
            <span className="text-[14px] font-[800] text-[#1A1A1A]">{cleanAmount(totalBalance)} FCFA</span>
          </div>
          
          <div className="flex w-full h-[4px] rounded-full overflow-hidden mb-4 bg-[#F5F4F0]">
            {totalBalance > 0 ? (
              <>
                <div style={{ width: `${pMain}%` }} className="bg-[#047857] h-full" />
                <div style={{ width: `${pCercles}%` }} className="bg-[#34D399] h-full" />
                <div style={{ width: `${pCapital}%` }} className="bg-[#E8E6E3] h-full" />
              </>
            ) : (
              <div className="w-full bg-[#E8E6E3] h-full" />
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            {/* Ligne Principal */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#047857]" />
                <span className="text-[12px] font-[600] text-[#1A1A1A]">Principal</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[12px] font-[700] ${balanceMain === 0 ? 'text-[#C4B8AC]' : 'text-[#1A1A1A]'}`}>
                  {cleanAmount(balanceMain)}
                </span>
                <span className={`text-[11px] font-[600] w-8 text-right ${balanceMain === 0 ? 'text-[#C4B8AC]' : 'text-[#A39887]'}`}>
                  {pMain.toFixed(0)}%
                </span>
              </div>
            </div>
            
            {/* Ligne Cercles */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#34D399]" />
                <span className="text-[12px] font-[600] text-[#1A1A1A]">Cercles</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[12px] font-[700] ${balanceCercles === 0 ? 'text-[#C4B8AC]' : 'text-[#1A1A1A]'}`}>
                  {cleanAmount(balanceCercles)}
                </span>
                <span className={`text-[11px] font-[600] w-8 text-right ${balanceCercles === 0 ? 'text-[#C4B8AC]' : 'text-[#A39887]'}`}>
                  {pCercles.toFixed(0)}%
                </span>
              </div>
            </div>

            {/* Ligne Capital */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#E8E6E3]" />
                <span className="text-[12px] font-[600] text-[#1A1A1A]">Capital</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[12px] font-[700] ${balanceCapital === 0 ? 'text-[#C4B8AC]' : 'text-[#1A1A1A]'}`}>
                  {cleanAmount(balanceCapital)}
                </span>
                <span className={`text-[11px] font-[600] w-8 text-right ${balanceCapital === 0 ? 'text-[#C4B8AC]' : 'text-[#A39887]'}`}>
                  {pCapital.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. TRANSACTIONS RÉCENTES */}
      <div className="px-6 mb-8">
        <div className="flex justify-between items-baseline mb-4">
          <h2 className="text-[16px] font-[700] text-[#1A1A1A]">Transactions récentes</h2>
          {transactions.length > 0 && (
            <button className="text-[13px] font-[700] text-[#047857]">Voir tout</button>
          )}
        </div>

        {transactions.length === 0 ? (
          <div className="bg-white rounded-[20px] p-6 text-center flex flex-col items-center justify-center border-[0.5px] border-[#EDECEA]">
            <div className="w-12 h-12 bg-[#F5F4F0] rounded-[14px] flex items-center justify-center mb-3">
              <Inbox size={20} strokeWidth={1.5} className="text-[#C4B8AC]" />
            </div>
            <p className="text-[14px] font-[600] text-[#1A1A1A] mb-1">Aucune transaction</p>
            <p className="text-[12px] font-[500] text-[#A39887]">Vos mouvements apparaîtront ici.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {txGroups.map((group, gIdx) => (
              <div key={gIdx}>
                <h3 className="text-[9px] font-[700] uppercase text-[#A39887] tracking-[0.1em] mb-2.5">
                  {group.label}
                </h3>
                <div className="flex flex-col gap-3">
                  {group.txs.map((tx, tIdx) => {
                    const credit = isCredit(tx.type);
                    const txTime = tx.created_at?.toDate ? tx.created_at.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h') : '';
                    
                    return (
                      <div key={tIdx} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-[40px] h-[40px] rounded-[12px] flex items-center justify-center shrink-0 ${
                            credit ? 'bg-[#D1FAE5]' : 'bg-[#F5F4F0]'
                          }`}>
                            {credit ? (
                              <ArrowDownLeft size={18} strokeWidth={2} className="text-[#047857]" />
                            ) : (
                              <ArrowUpRight size={18} strokeWidth={2} className="text-[#6B6B6B]" />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[14px] font-[600] text-[#1A1A1A] mb-0.5">{tx.description || (credit ? 'Dépôt' : 'Paiement')}</span>
                            <span className="text-[12px] font-[500] text-[#A39887]">{txTime} · Principal</span>
                          </div>
                        </div>
                        <span className={`text-[14px] font-[700] ${credit ? 'text-[#047857]' : 'text-[#1A1A1A]'}`}>
                          {credit ? '+' : '−'}{cleanAmount(tx.amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. POUR VOUS */}
      <div className="px-6 mb-4 flex-1 flex flex-col justify-end">
        <h2 className="text-[16px] font-[700] text-[#1A1A1A] mb-3">Pour vous</h2>
        
        {userGroups.length === 0 ? (
          <div 
            onClick={() => navigate('/tontines')}
            className="bg-white rounded-[20px] p-[16px] border-[0.5px] border-[#EDECEA] flex items-center gap-3 active:scale-[0.98] transition-transform cursor-pointer"
          >
            <div className="w-[42px] h-[42px] bg-[#ECFDF5] rounded-[12px] flex items-center justify-center shrink-0">
              <Users size={20} strokeWidth={2} className="text-[#047857]" />
            </div>
            <div>
              <p className="text-[14px] font-[700] text-[#1A1A1A] mb-0.5">Premier cercle</p>
              <p className="text-[12px] font-[500] text-[#A39887]">Créez ou rejoignez votre premier cercle</p>
            </div>
          </div>
        ) : (
          <div className="bg-[#F5F4F0] border-[0.5px] border-[#EDECEA] rounded-[20px] p-[16px] flex items-center gap-3">
             <div className="w-[42px] h-[42px] bg-white rounded-[12px] flex items-center justify-center shrink-0">
              <TrendingUp size={20} strokeWidth={2} className="text-[#C4B8AC]" />
            </div>
            <div>
              <p className="text-[14px] font-[700] text-[#C4B8AC] mb-0.5">Nouveautés à venir</p>
              <p className="text-[12px] font-[500] text-[#C4B8AC]">Restez à l'affût des prochaines offres.</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}