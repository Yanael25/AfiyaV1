import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowDownLeft, QrCode, Inbox, CreditCard, Users, LineChart, ChevronRight, Compass, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
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

export function Home() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceCercles, setBalanceCercles] = useState<number | null>(null);
  const [balanceCapital, setBalanceCapital] = useState<number | null>(null);
  const [cycleInfo, setCycleInfo] = useState<{
    groupName: string;
    type: 'À payer' | 'À recevoir';
    amount: number;
    dueDate: Date;
  } | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activeCard, setActiveCard] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) { navigate('/welcome'); return; }

    getUserProfile(user.uid).then(setProfile);

    const unsubWallet = subscribeToUserWallet(user.uid, w => {
      if (w) setBalance(w.balance);
    });

    const unsubCercles = subscribeToUserCerclesWallet(
      user.uid, w => { if (w) setBalanceCercles(w.balance); }
    );

    const unsubCapital = subscribeToUserCapitalWallet(
      user.uid, w => { if (w) setBalanceCapital(w.balance); }
    );

    getUserGroups(user.uid).then(async data => {
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
        limit(3) // Limité à 3 pour ne pas pousser la section suggestion trop bas
      ],
      setTransactions
    );

    return () => {
      unsubWallet();
      unsubCercles();
      unsubCapital();
      unsubTx();
    };
  }, [navigate]);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const scrollLeft = scrollContainerRef.current.scrollLeft;
      const cardNode = scrollContainerRef.current.firstChild as HTMLElement;
      const cardWidth = cardNode ? cardNode.offsetWidth + 16 : 316;
      const newActiveCard = Math.round(scrollLeft / cardWidth);
      if (newActiveCard !== activeCard && newActiveCard >= 0 && newActiveCard <= 2) {
        setActiveCard(newActiveCard);
      }
    }
  };

  const scrollToCard = (index: number) => {
    if (scrollContainerRef.current) {
      const cardWidth = 300 + 16;
      scrollContainerRef.current.scrollTo({
        left: index * cardWidth,
        behavior: 'smooth'
      });
      setActiveCard(index);
    }
  };

  const cleanAmount = (val: number | null) => {
    if (val === null) return '...';
    return formatXOF(val).replace(/\s?FCFA/gi, '').trim();
  };

  const firstName = profile?.full_name?.split(' ')[0] || '';
  const initial = firstName ? firstName.charAt(0).toUpperCase() : 'U';

  const greeting = (() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return 'Bonjour';
    if (h >= 12 && h < 18) return 'Bon après-midi';
    if (h >= 18 && h < 22) return 'Bonsoir';
    return 'Bonne nuit';
  })();

  const isCredit = (type: string) => ['DEPOSIT','PAYOUT','REFUND'].includes(type);

  const formatDate = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const now = new Date();
    const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth() && d.getFullYear() === yesterday.getFullYear();
    
    const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
    
    if (isToday) return `Aujourd'hui · ${time}`;
    if (isYesterday) return `Hier · ${time}`;
    return `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} · ${time}`;
  };

  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  const tabs = ['Principal', 'Cercles', 'Capital'];

  // Skeleton Loader
  if (balance === null && !profile) {
    return (
      <div className="bg-[#FAFAF8] min-h-screen flex flex-col pb-[100px] font-sans px-6 pt-[52px]">
        <div className="h-4 w-24 bg-[#E8E6E3] rounded-full animate-pulse mb-2" />
        <div className="h-8 w-48 bg-[#E8E6E3] rounded-full animate-pulse mb-4" />
        <div className="flex gap-2 mb-8">
          <div className="h-3 w-12 bg-[#E8E6E3] rounded-full animate-pulse" />
          <div className="h-3 w-16 bg-[#E8E6E3] rounded-full animate-pulse" />
        </div>
        <div className="h-4 w-64 bg-[#E8E6E3] rounded-full animate-pulse mb-6" />
        <div className="h-[220px] w-full bg-[#E8E6E3] rounded-[24px] animate-pulse mb-8" />
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="h-[88px] bg-[#E8E6E3] rounded-[20px] animate-pulse" />
          <div className="h-[88px] bg-[#E8E6E3] rounded-[20px] animate-pulse" />
          <div className="h-[88px] bg-[#E8E6E3] rounded-[20px] animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="bg-[#FAFAF8] min-h-screen flex flex-col pb-[100px] font-sans selection:bg-[#047857]/20"
    >
      
      {/* HEADER */}
      <div className="pt-[52px] px-6 pb-6 flex justify-between items-start">
        <div>
          <p className="text-[13px] font-medium text-[#A39887] mb-1">{greeting},</p>
          <h1 className="font-display text-[28px] font-extrabold text-[#1A1A1A] tracking-tight mb-2 leading-none">{firstName}</h1>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold text-[#A39887]">{today}</span>
            <div className="w-1 h-1 bg-[#C4B8AC] rounded-full" />
            <span className="text-[12px] font-bold text-[#047857]">{profile?.score_afiya || 0} pts</span>
            <div className="w-1 h-1 bg-[#C4B8AC] rounded-full" />
            <span className="text-[12px] font-semibold text-[#A39887]">{profile?.tier || 'BRONZE'}</span>
          </div>
        </div>
        
        <button 
          className="w-[48px] h-[48px] rounded-[16px] bg-[#047857] flex items-center justify-center font-display text-[20px] font-extrabold text-white shrink-0 transition-transform active:scale-95 shadow-[0_4px_12px_rgba(4,120,87,0.2)]" 
          onClick={() => navigate('/profile')}
        >
          {initial}
        </button>
      </div>

      {/* MENU TEXTUEL PAGINATION */}
      <div className="flex gap-6 px-6 mb-4">
        {tabs.map((tab, idx) => (
          <button 
            key={tab}
            onClick={() => scrollToCard(idx)}
            className={`text-[14px] transition-colors duration-300 ${
              activeCard === idx 
                ? 'font-extrabold text-[#1A1A1A]' 
                : 'font-semibold text-[#C4B8AC] hover:text-[#A39887]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* CARDS SWIPEABLES */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="pl-6 overflow-x-auto flex gap-4 pb-2 snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Card Principal */}
        <div className="min-w-[85vw] max-w-[320px] bg-white rounded-[24px] p-6 shrink-0 flex flex-col snap-center relative overflow-hidden">
          <CreditCard className="absolute -right-4 -bottom-4 text-[#F0EFED] w-32 h-32 opacity-50 pointer-events-none" strokeWidth={1} />
          <div className="relative z-10">
            <h2 className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#A39887] mb-4">Compte Principal</h2>
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="font-display text-[40px] font-extrabold text-[#1A1A1A] tracking-tighter leading-none">
                {cleanAmount(balance)}
              </span>
              <span className="text-[14px] font-bold text-[#A39887]">FCFA</span>
            </div>
            <p className="text-[13px] font-medium text-[#A39887] mb-8">Fonds disponibles</p>
            
            <div className="bg-[#FAFAF8] rounded-[16px] p-4 mt-auto">
              <p className="text-[10px] font-bold tracking-widest uppercase text-[#C4B8AC] mb-1.5">À venir</p>
              <p className="text-[13px] font-semibold text-[#1A1A1A]">Aucun mouvement prévu</p>
            </div>
          </div>
        </div>

        {/* Card Cercles */}
        <div className="min-w-[85vw] max-w-[320px] bg-white rounded-[24px] p-6 shrink-0 flex flex-col snap-center relative overflow-hidden">
          <Users className="absolute -right-4 -bottom-4 text-[#F0EFED] w-32 h-32 opacity-50 pointer-events-none" strokeWidth={1} />
          <div className="relative z-10">
            <h2 className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#A39887] mb-4">Compte Cercles</h2>
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="font-display text-[40px] font-extrabold text-[#1A1A1A] tracking-tighter leading-none">
                {cleanAmount(balanceCercles)}
              </span>
              <span className="text-[14px] font-bold text-[#A39887]">FCFA</span>
            </div>
            <p className="text-[13px] font-medium text-[#A39887] mb-8">Fonds des cercles</p>
            
            <div className="bg-[#FAFAF8] rounded-[16px] p-4 mt-auto min-h-[76px] flex flex-col justify-center">
              <p className="text-[10px] font-bold tracking-widest uppercase text-[#C4B8AC] mb-1.5">À venir · {cycleInfo?.groupName || 'Ce mois'}</p>
              {cycleInfo ? (
                <div className="flex items-baseline gap-1">
                  <span className={`font-display text-[16px] font-extrabold ${cycleInfo.type === 'À recevoir' ? 'text-[#047857]' : 'text-[#1A1A1A]'}`}>
                    {cycleInfo.type === 'À recevoir' ? '+' : '-'}{cleanAmount(cycleInfo.amount)}
                  </span>
                  <span className={`text-[12px] font-bold ${cycleInfo.type === 'À recevoir' ? 'text-[#047857]' : 'text-[#1A1A1A]'}`}>FCFA</span>
                </div>
              ) : (
                <p className="text-[13px] font-semibold text-[#1A1A1A]">Aucun mouvement prévu</p>
              )}
            </div>
          </div>
        </div>

        {/* Card Capital */}
        <div className="min-w-[85vw] max-w-[320px] bg-white rounded-[24px] p-6 shrink-0 flex flex-col snap-center mr-6 relative overflow-hidden">
          <LineChart className="absolute -right-4 -bottom-4 text-[#F0EFED] w-32 h-32 opacity-50 pointer-events-none" strokeWidth={1} />
          <div className="relative z-10">
            <h2 className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#A39887] mb-4">Afiya Capital</h2>
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="font-display text-[40px] font-extrabold text-[#1A1A1A] tracking-tighter leading-none">
                {cleanAmount(balanceCapital)}
              </span>
              <span className="text-[14px] font-bold text-[#A39887]">FCFA</span>
            </div>
            <p className="text-[13px] font-medium text-[#A39887] mb-8">Fonds investis</p>
            
            <div className="bg-[#FAFAF8] rounded-[16px] p-4 mt-auto">
              <p className="text-[10px] font-bold tracking-widest uppercase text-[#C4B8AC] mb-1.5">À venir</p>
              <p className="text-[13px] font-semibold text-[#1A1A1A]">Bientôt disponible</p>
            </div>
          </div>
        </div>
      </div>

      {/* INDICATEURS PAGINATION */}
      <div className="flex justify-center gap-1.5 mt-4 mb-6">
        {[0, 1, 2].map((i) => (
          <div 
            key={i} 
            className={`h-1.5 rounded-full transition-all duration-300 ${activeCard === i ? 'w-5 bg-[#047857]' : 'w-1.5 bg-[#E8E6E3]'}`}
          />
        ))}
      </div>

      {/* ACTIONS UNIFORMISÉES */}
      <div className="mx-6 mb-8 grid grid-cols-3 gap-3">
        <button className="bg-white rounded-[20px] py-4 flex flex-col items-center justify-center gap-2.5 transition-transform active:scale-95 group">
          <div className="w-10 h-10 rounded-full bg-[#F0FDF4] flex items-center justify-center">
            <ArrowUpRight size={20} strokeWidth={2} className="text-[#047857]" />
          </div>
          <span className="text-[12px] font-bold text-[#1A1A1A]">Envoyer</span>
        </button>
        
        <button className="bg-white rounded-[20px] py-4 flex flex-col items-center justify-center gap-2.5 transition-transform active:scale-95 group">
          <div className="w-10 h-10 rounded-full bg-[#FAFAF8] flex items-center justify-center">
            <ArrowDownLeft size={20} strokeWidth={2} className="text-[#1A1A1A]" />
          </div>
          <span className="text-[12px] font-bold text-[#1A1A1A]">Retirer</span>
        </button>
        
        <button className="bg-white rounded-[20px] py-4 flex flex-col items-center justify-center gap-2.5 transition-transform active:scale-95 group">
          <div className="w-10 h-10 rounded-full bg-[#FAFAF8] flex items-center justify-center">
            <QrCode size={20} strokeWidth={2} className="text-[#1A1A1A]" />
          </div>
          <span className="text-[12px] font-bold text-[#1A1A1A]">Recevoir</span>
        </button>
      </div>

      {/* TRANSACTIONS */}
      <div className="mx-6 mb-8">
        <div className="flex justify-between items-end mb-4">
          <h2 className="font-display text-[18px] font-extrabold text-[#1A1A1A]">Transactions récentes</h2>
          {transactions.length > 0 && (
            <button className="text-[13px] font-bold text-[#047857] active:opacity-70 transition-opacity pb-0.5">
              Voir tout
            </button>
          )}
        </div>
        
        <div className="flex flex-col gap-2">
          {transactions.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-white rounded-[20px] p-6 text-center flex flex-col items-center justify-center"
            >
              <div className="w-12 h-12 bg-[#FAFAF8] rounded-[16px] flex items-center justify-center mb-3">
                <Inbox size={20} strokeWidth={1.5} className="text-[#C4B8AC]" />
              </div>
              <p className="text-[14px] font-bold text-[#1A1A1A] mb-1">Aucune transaction</p>
              <p className="text-[12px] text-[#A39887]">Vos mouvements apparaîtront ici.</p>
            </motion.div>
          ) : (
            transactions.map((tx, idx) => (
              <motion.div 
                key={tx.id || idx} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-[20px] p-4 flex items-center gap-4 active:scale-[0.99] transition-transform cursor-pointer"
              >
                <div className={`w-12 h-12 rounded-[14px] shrink-0 flex items-center justify-center ${isCredit(tx.type) ? 'bg-[#F0FDF4]' : 'bg-[#FAFAF8]'}`}>
                  {isCredit(tx.type) ? (
                    <ArrowDownLeft size={20} strokeWidth={1.5} className="text-[#047857]" />
                  ) : (
                    <ArrowUpRight size={20} strokeWidth={1.5} className="text-[#1A1A1A]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-[#1A1A1A] mb-0.5 truncate">{tx.description || tx.type}</p>
                  <p className="text-[12px] font-medium text-[#A39887]">{formatDate(tx.created_at)}</p>
                </div>
                <div className="flex items-baseline gap-1 shrink-0">
                  <span className={`font-display text-[16px] font-extrabold ${isCredit(tx.type) ? 'text-[#047857]' : 'text-[#1A1A1A]'}`}>
                    {isCredit(tx.type) ? '+' : '-'}{cleanAmount(tx.amount)}
                  </span>
                  <span className={`text-[11px] font-bold ${isCredit(tx.type) ? 'text-[#047857]' : 'text-[#A39887]'}`}>
                    FCFA
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* SECTION: POUR VOUS (Remplissage intelligent du vide) */}
      <div className="mx-6 flex-1 flex flex-col justify-end">
        <h2 className="font-display text-[18px] font-extrabold text-[#1A1A1A] mb-4">Pour vous</h2>
        
        <div 
          onClick={() => navigate('/group/join')}
          className="bg-white rounded-[20px] p-4 flex items-center gap-4 active:scale-[0.99] transition-transform cursor-pointer mb-3"
        >
          <div className="w-12 h-12 rounded-[14px] shrink-0 flex items-center justify-center bg-[#F0FDF4]">
            <Compass size={22} strokeWidth={1.5} className="text-[#047857]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold text-[#1A1A1A] mb-0.5">Cercles publics</p>
            <p className="text-[12px] font-medium text-[#A39887]">Rejoignez une communauté d'épargne.</p>
          </div>
          <ChevronRight size={18} className="text-[#C4B8AC]" />
        </div>

        {profile?.kyc_status !== 'VERIFIED' && (
          <div 
            onClick={() => navigate('/profile')}
            className="bg-white rounded-[20px] p-4 flex items-center gap-4 active:scale-[0.99] transition-transform cursor-pointer"
          >
            <div className="w-12 h-12 rounded-[14px] shrink-0 flex items-center justify-center bg-[#FAFAF8]">
              <ShieldCheck size={22} strokeWidth={1.5} className="text-[#1A1A1A]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold text-[#1A1A1A] mb-0.5">Sécurisez votre compte</p>
              <p className="text-[12px] font-medium text-[#A39887]">Vérifiez votre identité à 100%.</p>
            </div>
            <ChevronRight size={18} className="text-[#C4B8AC]" />
          </div>
        )}
      </div>
      
    </motion.div>
  );
}