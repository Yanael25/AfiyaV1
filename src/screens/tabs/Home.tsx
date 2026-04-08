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
  ChevronRight,
  Trophy,
  RotateCcw,
  Unlock,
  Shield,
  Globe,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

// --- UTILITAIRE DE FORMATAGE ---
const formatAmount = (n: number): string => {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);
};

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
      const cardWidth = window.innerWidth * 0.75 > 260 ? 260 + 16 : (window.innerWidth * 0.75) + 16; 
      const newActiveCard = Math.round(scrollLeft / cardWidth);
      if (newActiveCard !== activeCard && newActiveCard >= 0 && newActiveCard <= 2) {
        setActiveCard(newActiveCard as WalletType);
      }
    }
  };

  const safeFormat = (n: number | null) => n !== null ? formatAmount(n) : '...';
  const isCredit = (type: string) => ['DEPOSIT','PAYOUT','REFUND'].includes(type);

  // Vérifie si la date est dans les 7 prochains jours
  const isWithin7Days = (date?: Date) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(date);
    eventDate.setHours(0, 0, 0, 0);
    const diffDays = (eventDate.getTime() - today.getTime()) / (1000 * 3600 * 24);
    return diffDays >= 0 && diffDays <= 7;
  };

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

  // --- ICÔNES TRANSACTIONS ---
  const getTransactionIcon = (type: string, credit: boolean) => {
    switch (type) {
      case 'DEPOSIT': 
        return { Icon: ArrowDownToLine, bgColor: 'bg-[#D1FAE5]', iconColor: 'text-[#047857]' };
      case 'PAYOUT': 
        return { Icon: Trophy, bgColor: 'bg-[#D1FAE5]', iconColor: 'text-[#047857]' };
      case 'REFUND': 
        return { Icon: RotateCcw, bgColor: 'bg-[#D1FAE5]', iconColor: 'text-[#047857]' };
      case 'CAUTION_REFUND': 
        return { Icon: Unlock, bgColor: 'bg-[#D1FAE5]', iconColor: 'text-[#047857]' };
      case 'WITHDRAWAL': 
        return { Icon: ArrowUpFromLine, bgColor: 'bg-[#F5F4F0]', iconColor: 'text-[#6B6B6B]' };
      case 'CONTRIBUTION': 
        return { Icon: Users, bgColor: 'bg-[#F5F4F0]', iconColor: 'text-[#6B6B6B]' };
      case 'MINI_FUND_CONTRIB': 
        return { Icon: Shield, bgColor: 'bg-[#F5F4F0]', iconColor: 'text-[#6B6B6B]' };
      case 'GLOBAL_FUND_CONTRIB': 
        return { Icon: Globe, bgColor: 'bg-[#F5F4F0]', iconColor: 'text-[#6B6B6B]' };
      case 'CAUTION': 
        return { Icon: Lock, bgColor: 'bg-[#F5F4F0]', iconColor: 'text-[#6B6B6B]' };
      case 'TRANSFER': 
        return credit 
          ? { Icon: ArrowLeftRight, bgColor: 'bg-[#D1FAE5]', iconColor: 'text-[#047857]' }
          : { Icon: ArrowLeftRight, bgColor: 'bg-[#F5F4F0]', iconColor: 'text-[#6B6B6B]' };
      default: 
        return credit 
          ? { Icon: ArrowDownLeft, bgColor: 'bg-[#D1FAE5]', iconColor: 'text-[#047857]' }
          : { Icon: ArrowUpRight, bgColor: 'bg-[#F5F4F0]', iconColor: 'text-[#6B6B6B]' };
    }
  };

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
          { label: 'Transférer', icon: ArrowLeftRight },
          { label: 'Recevoir', icon: QrCode },
          { label: 'Recharger', icon: ArrowDownToLine },
          { label: 'Retirer', icon: ArrowUpFromLine },
        ];
      case 1:
        return [
          { label: 'Transférer', icon: ArrowLeftRight },
          { label: 'Recevoir', icon: QrCode },
          { label: 'Cotiser', icon: Users },
          { label: 'Mes cercles', icon: Users },
        ];
      case 2:
        return [
          { label: 'Transférer', icon: ArrowLeftRight },
          { label: 'Recevoir', icon: QrCode },
          { label: 'Explorer', icon: TrendingUp },
        ];
      default: return [];
    }
  };

  const totalBalance = (balanceMain || 0) + (balanceCercles || 0) + (balanceCapital || 0);

  return (
    <div className="bg-[#F5F4F0] min-h-screen flex flex-col font-sans pb-20">
      
      {/* 1. HEADER */}
      <div className="pt-[52px] px-6 pb-6 flex justify-between items-start shrink-0">
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
            <span className="bg-[#F8FAFC] text-[#334155] border-[0.5px] border-[#CBD5E1] rounded-[6px] px-[8px] py-[2px] text-[10px] font-[700] uppercase tracking-wider">
              {profile?.tier || 'BRONZE'}
            </span>
          </div>
        </div>
        
        <div 
          onClick={() => navigate('/profile')}
          className="w-[42px] h-[42px] rounded-[13px] bg-[#047857] flex items-center justify-center text-[17px] font-[800] text-white cursor-pointer active:scale-95 transition-transform"
        >
          {initial}
        </div>
      </div>

      {/* 2. CARDS SWIPEABLES */}
      <div className="relative mb-4 shrink-0">
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="pl-6 pr-[32px] overflow-x-auto flex gap-4 snap-x snap-mandatory hide-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* CARD 1 - PRINCIPAL */}
          <div className="w-[75vw] max-w-[260px] h-[110px] bg-white rounded-[20px] border-[0.5px] border-[#EDECEA] p-[16px] shrink-0 snap-center flex flex-col justify-center">
            <span className="text-[9px] font-[700] uppercase text-[#A39887] tracking-[0.1em] mb-1">Compte Principal</span>
            <div className="flex items-baseline mb-0.5">
              <span className="text-[28px] font-[800] text-[#1A1A1A] tracking-[-0.03em] leading-none">
                {safeFormat(balanceMain)}
              </span>
              <span className="text-[13px] font-[600] text-[#A39887] ml-1 align-baseline">FCFA</span>
            </div>
            <p className="text-[11px] font-[500] text-[#A39887]">Fonds disponibles</p>
          </div>

          {/* CARD 2 - CERCLES */}
          <div className="w-[75vw] max-w-[260px] h-[110px] bg-white rounded-[20px] border-[0.5px] border-[#EDECEA] p-[16px] shrink-0 snap-center flex flex-col justify-center">
            <span className="text-[9px] font-[700] uppercase text-[#A39887] tracking-[0.1em] mb-1">Compte Cercles</span>
            <div className="flex items-baseline mb-0.5">
              <span className="text-[28px] font-[800] text-[#1A1A1A] tracking-[-0.03em] leading-none">
                {safeFormat(balanceCercles)}
              </span>
              <span className="text-[13px] font-[600] text-[#A39887] ml-1 align-baseline">FCFA</span>
            </div>
            <p className="text-[11px] font-[500] text-[#A39887]">Fonds des cercles</p>
            
            {/* Bloc À venir (Conditionnel - 7 jours) */}
            {cycleInfo && isWithin7Days(cycleInfo.dueDate) && (
              <div className="bg-[#F5F4F0] rounded-[10px] p-[10px] mt-2">
                <p className="text-[11px] font-[600] text-[#A39887] mb-1 truncate">{cycleInfo.groupName}</p>
                <p className="text-[13px] font-[700] text-[#1A1A1A]">
                  {cycleInfo.type === 'À recevoir' ? '+' : '−'}{formatAmount(cycleInfo.amount)} FCFA · {cycleInfo.dueDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                </p>
              </div>
            )}
          </div>

          {/* CARD 3 - CAPITAL */}
          <div className="w-[75vw] max-w-[260px] h-[110px] bg-white rounded-[20px] border-[0.5px] border-[#EDECEA] p-[16px] shrink-0 snap-center flex flex-col justify-center">
            <span className="text-[9px] font-[700] uppercase text-[#A39887] tracking-[0.1em] mb-1">Afiya Capital</span>
            <div className="flex items-baseline mb-0.5">
              <span className="text-[28px] font-[800] text-[#1A1A1A] tracking-[-0.03em] leading-none">
                {safeFormat(balanceCapital)}
              </span>
              <span className="text-[13px] font-[600] text-[#A39887] ml-1 align-baseline">FCFA</span>
            </div>
            <p className="text-[11px] font-[500] text-[#A39887]">Compte capital</p>
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

      {/* RÈGLE TYPE A : ACTIONS RAPIDES CONTEXTUELLES */}
      <div className="bg-white rounded-[20px] border-[0.5px] border-[#EDECEA] p-[16px] mx-[16px] mb-[8px] shrink-0">
        <span className="text-[8px] font-[700] uppercase text-[#A39887] tracking-[0.12em] mb-[12px] block">ACTIONS</span>
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
              <button key={idx} className="flex flex-col items-center gap-1.5 group active:scale-95 transition-transform">
                <div className="w-[48px] h-[48px] rounded-[14px] bg-[#F5F4F0] flex items-center justify-center">
                  <action.icon className="w-[20px] h-[20px] text-[#6B6B6B]" strokeWidth={2} />
                </div>
                <span className="text-[11px] font-[700] text-[#1A1A1A]">{action.label}</span>
              </button>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* RÈGLE TYPE A : TRANSACTIONS RÉCENTES */}
      <div className="bg-white rounded-[20px] border-[0.5px] border-[#EDECEA] p-[16px] mx-[16px] mb-[8px] shrink-0">
        <div className="flex justify-between items-baseline mb-[12px]">
          <span className="text-[8px] font-[700] uppercase text-[#A39887] tracking-[0.12em]">TRANSACTIONS RÉCENTES</span>
          {transactions.length > 0 && (
            <button className="text-[13px] font-[700] text-[#047857] active:opacity-70">Voir tout</button>
          )}
        </div>

        {transactions.length === 0 ? (
          <div className="text-center flex flex-col items-center justify-center py-4">
            <div className="w-12 h-12 bg-[#F5F4F0] rounded-[14px] flex items-center justify-center mb-3">
              <Inbox size={20} strokeWidth={1.5} className="text-[#C4B8AC]" />
            </div>
            <p className="text-[14px] font-[600] text-[#1A1A1A] mb-1">Aucune transaction</p>
            <p className="text-[12px] font-[500] text-[#A39887]">Vos mouvements apparaîtront ici.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {txGroups.map((group, gIdx) => (
              <div key={gIdx}>
                <h3 className="text-[9px] font-[700] uppercase text-[#A39887] tracking-[0.1em] mb-3">
                  {group.label}
                </h3>
                <div className="flex flex-col gap-3">
                  {group.txs.map((tx, tIdx) => {
                    const credit = isCredit(tx.type);
                    const txTime = tx.created_at?.toDate ? tx.created_at.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h') : '';
                    
                    const { Icon, bgColor, iconColor } = getTransactionIcon(tx.type, credit);

                    return (
                      <div key={tIdx} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-[40px] h-[40px] rounded-[12px] flex items-center justify-center shrink-0 ${bgColor}`}>
                            <Icon size={18} strokeWidth={2} className={iconColor} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[14px] font-[600] text-[#1A1A1A] mb-0.5">{tx.description || (credit ? 'Dépôt' : 'Paiement')}</span>
                            <span className="text-[12px] font-[500] text-[#A39887]">{txTime}</span>
                          </div>
                        </div>
                        <span className={`text-[14px] font-[700] whitespace-nowrap ${credit ? 'text-[#047857]' : 'text-[#1A1A1A]'}`}>
                          {credit ? '+' : '−'}{formatAmount(tx.amount)} FCFA
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

      {/* RÈGLE TYPE B : POUR VOUS (Éditorial) */}
      <div className="shrink-0 mb-[8px]">
        <h2 className="text-[11px] font-[700] text-[#1A1A1A] px-[24px] mt-[8px] mb-[8px] uppercase">POUR VOUS</h2>
        
        {userGroups.length === 0 ? (
          <div 
            onClick={() => navigate('/tontines')}
            className="bg-white rounded-[16px] border-[0.5px] border-[#EDECEA] p-[16px] mx-[16px] flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
          >
            <div className="w-[40px] h-[40px] bg-[#F0FDF4] rounded-[12px] flex items-center justify-center shrink-0">
              <Users size={20} strokeWidth={2} className="text-[#047857]" />
            </div>
            <div className="flex flex-col flex-1">
              <span className="text-[13px] font-[700] text-[#1A1A1A]">Créez ou rejoignez votre premier cercle</span>
              <span className="text-[11px] font-[500] text-[#A39887]">Commencez à épargner avec vos proches</span>
            </div>
            <ChevronRight size={16} className="text-[#C4B8AC]" strokeWidth={2} />
          </div>
        ) : (
          <div className="bg-white border-[0.5px] border-[#EDECEA] rounded-[16px] p-[16px] mx-[16px] flex items-center gap-3">
             <div className="w-[40px] h-[40px] bg-[#F5F4F0] rounded-[12px] flex items-center justify-center shrink-0 border-[0.5px] border-[#EDECEA]">
              <TrendingUp size={20} strokeWidth={2} className="text-[#C4B8AC]" />
            </div>
            <div className="flex flex-col flex-1">
              <span className="text-[13px] font-[700] text-[#C4B8AC]">Nouveautés à venir</span>
              <span className="text-[11px] font-[500] text-[#C4B8AC]">Restez à l'affût des prochaines offres.</span>
            </div>
          </div>
        )}
      </div>

      {/* RÈGLE TYPE A : SOLDE TOTAL */}
      <div className="bg-white rounded-[20px] border-[0.5px] border-[#EDECEA] p-[16px] mx-[16px] mb-[8px] shrink-0">
        <div className="flex justify-between items-baseline mb-[12px]">
          <span className="text-[8px] font-[700] uppercase text-[#A39887] tracking-[0.12em]">SOLDE TOTAL</span>
          <span className="text-[13px] font-[800] text-[#1A1A1A]">{formatAmount(totalBalance)} FCFA</span>
        </div>
        
        <div className="grid grid-cols-3 gap-[8px]">
          {/* Mini-Card Principal */}
          <div className="bg-[#F5F4F0] rounded-[12px] p-[10px] flex flex-col">
            <div className={`w-[7px] h-[7px] rounded-full ${balanceMain === 0 ? 'bg-[#E8E6E3]' : 'bg-[#047857]'}`} />
            <span className="text-[9px] font-[600] text-[#A39887] mt-[6px] mb-[2px]">Principal</span>
            <span className={`text-[13px] font-[800] ${balanceMain === 0 ? 'text-[#C4B8AC]' : 'text-[#1A1A1A]'}`}>
              {safeFormat(balanceMain)}
            </span>
            <span className="text-[9px] font-[600] text-[#A39887] mt-[1px]">FCFA</span>
          </div>

          {/* Mini-Card Cercles */}
          <div className="bg-[#F5F4F0] rounded-[12px] p-[10px] flex flex-col">
            <div className={`w-[7px] h-[7px] rounded-full ${balanceCercles === 0 ? 'bg-[#E8E6E3]' : 'bg-[#34D399]'}`} />
            <span className="text-[9px] font-[600] text-[#A39887] mt-[6px] mb-[2px]">Cercles</span>
            <span className={`text-[13px] font-[800] ${balanceCercles === 0 ? 'text-[#C4B8AC]' : 'text-[#1A1A1A]'}`}>
              {safeFormat(balanceCercles)}
            </span>
            <span className="text-[9px] font-[600] text-[#A39887] mt-[1px]">FCFA</span>
          </div>

          {/* Mini-Card Capital */}
          <div className="bg-[#F5F4F0] rounded-[12px] p-[10px] flex flex-col">
            <div className={`w-[7px] h-[7px] rounded-full bg-[#E8E6E3]`} />
            <span className="text-[9px] font-[600] text-[#A39887] mt-[6px] mb-[2px]">Capital</span>
            <span className={`text-[13px] font-[800] ${balanceCapital === 0 ? 'text-[#C4B8AC]' : 'text-[#1A1A1A]'}`}>
              {safeFormat(balanceCapital)}
            </span>
            <span className="text-[9px] font-[600] text-[#A39887] mt-[1px]">FCFA</span>
          </div>
        </div>
      </div>

    </div>
  );
}