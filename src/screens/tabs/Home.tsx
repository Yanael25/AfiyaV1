import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowUp, ArrowDown, Download
} from 'lucide-react';
import { formatXOF } from '../../lib/utils';
import { auth } from '../../lib/firebase';
import { getUserProfile, UserProfile } from '../../services/userService';
import {
  subscribeToUserWallet,
  subscribeToUserCerclesWallet,
  subscribeToUserCapitalWallet,
  subscribeToUserCaution,
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
  const [cautionBloquee, setCautionBloquee] = useState<number>(0);
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

    const unsubCaution = subscribeToUserCaution(
      user.uid, setCautionBloquee
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
        limit(5)
      ],
      setTransactions
    );

    return () => {
      unsubWallet();
      unsubCercles();
      unsubCapital();
      unsubCaution();
      unsubTx();
    };
  }, [navigate]);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const scrollLeft = scrollContainerRef.current.scrollLeft;
      const cardWidth = 292 + 12; // width + gap
      const newActiveCard = Math.round(scrollLeft / cardWidth);
      setActiveCard(newActiveCard);
    }
  };

  const firstName = profile?.full_name?.split(' ')[0] || '';
  const initial = firstName ? firstName.charAt(0).toUpperCase() : '';

  const greeting = (() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return 'Bonjour';
    if (h >= 12 && h < 18) return 'Bon après-midi';
    if (h >= 18 && h < 22) return 'Bonsoir';
    return 'Bonne nuit';
  })();

  const isCredit = (type: string) =>
    ['DEPOSIT','PAYOUT','REFUND'].includes(type);

  const formatDate = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    // e.g. "Aujourd'hui · 09h14" or "Hier · 17h32"
    const now = new Date();
    const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth() && d.getFullYear() === yesterday.getFullYear();
    
    const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
    
    if (isToday) return `Aujourd'hui · ${time}`;
    if (isYesterday) return `Hier · ${time}`;
    
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    return `${days[d.getDay()]} · ${time}`;
  };

  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

  return (
    <div className="bg-[#FAFAF8] min-h-screen flex flex-col pb-[100px] font-manrope">
      {/* HEADER */}
      <div className="pt-[52px] px-[24px] pb-[20px] flex justify-between items-start">
        <div>
          <div className="text-[12px] font-medium text-[#A39887] mb-[3px]">{greeting},</div>
          <div className="text-[22px] font-extrabold text-[#1A1A1A] tracking-[-0.01em] mb-[5px]">{firstName}</div>
          <div className="flex items-center gap-[7px]">
            <div className="text-[12px] font-semibold text-[#C4B8AC]">{today}</div>
            <div className="w-[3px] h-[3px] bg-[#C4B8AC] rounded-full"></div>
            <div className="text-[12px] font-bold text-[#047857]">{profile?.score_afiya || 50} pts</div>
            <div className="w-[3px] h-[3px] bg-[#C4B8AC] rounded-full"></div>
            <div className="text-[12px] font-semibold text-[#A39887]">{profile?.tier || 'BRONZE'}</div>
          </div>
        </div>
        
        <div className="relative w-[42px] h-[42px] rounded-[14px] bg-[#047857] flex items-center justify-center text-[13px] font-extrabold text-white shrink-0 mt-[4px] cursor-pointer" onClick={() => navigate('/profile')}>
          {initial}
          <div className="absolute -top-[3px] -right-[3px] w-[10px] h-[10px] bg-[#EF4444] rounded-full border-2 border-[#FAFAF8]"></div>
        </div>
      </div>

      {/* CARDS SWIPEABLES */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="pl-[16px] overflow-x-auto flex gap-[12px] no-scrollbar mb-[10px] snap-x snap-mandatory"
      >
        {/* Card Principal */}
        <div className="min-w-[292px] w-[292px] bg-white rounded-[24px] p-[22px_20px] shrink-0 flex flex-col snap-center">
          <div className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#A39887] mb-[14px]">Compte Principal</div>
          <div className="text-[34px] font-extrabold text-[#1A1A1A] tracking-[-0.03em] leading-none mb-[3px]">
            {balance === null ? '...' : new Intl.NumberFormat('fr-FR').format(balance)}
          </div>
          <div className="text-[12px] font-medium text-[#A39887] mb-[16px]">FCFA disponibles</div>
          <div className="bg-[#FAFAF8] rounded-[14px] p-[10px_14px] h-[52px] flex flex-col justify-center">
            <div className="text-[10px] font-bold tracking-[0.1em] uppercase text-[#C4B8AC] mb-[5px]">A venir</div>
            <div className="text-[11px] font-normal text-[#C4B8AC] italic">Aucun mouvement prévu</div>
          </div>
        </div>

        {/* Card Cercles */}
        <div className="min-w-[292px] w-[292px] bg-white rounded-[24px] p-[22px_20px] shrink-0 flex flex-col snap-center">
          <div className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#A39887] mb-[14px]">Compte Cercles</div>
          <div className="text-[34px] font-extrabold text-[#1A1A1A] tracking-[-0.03em] leading-none mb-[3px]">
            {balanceCercles === null ? '...' : new Intl.NumberFormat('fr-FR').format(balanceCercles)}
          </div>
          <div className="text-[12px] font-medium text-[#A39887] mb-[16px]">FCFA disponibles</div>
          <div className="bg-[#FAFAF8] rounded-[14px] p-[10px_14px] h-[52px] flex flex-col justify-center">
            <div className="text-[10px] font-bold tracking-[0.1em] uppercase text-[#C4B8AC] mb-[5px]">A venir</div>
            {cycleInfo ? (
              <div className={`text-[15px] font-extrabold ${cycleInfo.type === 'À recevoir' ? 'text-[#047857]' : 'text-[#1A1A1A]'}`}>
                {cycleInfo.type === 'À recevoir' ? '+' : '-'}{new Intl.NumberFormat('fr-FR').format(cycleInfo.amount)} FCFA
              </div>
            ) : (
              <div className="text-[11px] font-normal text-[#C4B8AC] italic">Aucun mouvement prévu</div>
            )}
          </div>
        </div>

        {/* Card Capital */}
        <div className="min-w-[292px] w-[292px] bg-white rounded-[24px] p-[22px_20px] shrink-0 flex flex-col snap-center mr-[16px]">
          <div className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#A39887] mb-[14px]">Afiya Capital</div>
          <div className="text-[34px] font-extrabold text-[#1A1A1A] tracking-[-0.03em] leading-none mb-[3px]">
            {balanceCapital === null ? '...' : new Intl.NumberFormat('fr-FR').format(balanceCapital)}
          </div>
          <div className="text-[12px] font-medium text-[#A39887] mb-[16px]">FCFA investis</div>
          <div className="bg-[#FAFAF8] rounded-[14px] p-[10px_14px] h-[52px] flex flex-col justify-center">
            <div className="text-[10px] font-bold tracking-[0.1em] uppercase text-[#C4B8AC] mb-[5px]">A venir</div>
            <div className="text-[11px] font-normal text-[#C4B8AC] italic">Aucun mouvement prévu</div>
          </div>
        </div>
      </div>

      {/* INDICATEURS PAGINATION */}
      <div className="flex justify-center gap-[5px] mb-[20px]">
        {[0, 1, 2].map((i) => (
          <div 
            key={i} 
            className={`h-[4px] rounded-full transition-all duration-300 ${activeCard === i ? 'w-[20px] bg-[#047857]' : 'w-[8px] bg-[#E8E6E3]'}`}
          />
        ))}
      </div>

      {/* ACTIONS GLOBALES */}
      <div className="mx-[16px] mb-[20px] grid grid-cols-3 gap-[10px]">
        <motion.button whileTap={{ scale: 0.95 }} className="bg-white rounded-[18px] p-[14px_8px] flex flex-col items-center gap-[8px]">
          <div className="w-[36px] h-[36px] rounded-[12px] bg-[#047857] flex items-center justify-center">
            <ArrowUp size={18} strokeWidth={1.5} className="text-white" />
          </div>
          <span className="text-[12px] font-bold text-[#1A1A1A]">Envoyer</span>
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} className="bg-white rounded-[18px] p-[14px_8px] flex flex-col items-center gap-[8px]">
          <div className="w-[36px] h-[36px] rounded-[12px] bg-[#F0FDF4] flex items-center justify-center">
            <ArrowDown size={18} strokeWidth={1.5} className="text-[#047857]" />
          </div>
          <span className="text-[12px] font-bold text-[#1A1A1A]">Retirer</span>
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} className="bg-white rounded-[18px] p-[14px_8px] flex flex-col items-center gap-[8px]">
          <div className="w-[36px] h-[36px] rounded-[12px] bg-[#F0FDF4] flex items-center justify-center">
            <Download size={18} strokeWidth={1.5} className="text-[#047857]" />
          </div>
          <span className="text-[12px] font-bold text-[#1A1A1A]">Recevoir</span>
        </motion.button>
      </div>

      {/* TRANSACTIONS */}
      <div className="mx-[16px]">
        <div className="flex justify-between items-center mb-[10px]">
          <div className="text-[14px] font-extrabold text-[#1A1A1A]">Transactions récentes</div>
          <div className="text-[12px] font-semibold text-[#047857] cursor-pointer">Voir tout</div>
        </div>
        
        <div className="bg-white rounded-[20px] overflow-hidden">
          {transactions.length === 0 ? (
            <div className="p-6 text-center text-[13px] font-medium text-[#A39887]">
              Aucune transaction pour l'instant.
            </div>
          ) : (
            transactions.map((tx, idx) => (
              <div key={tx.id || idx}>
                <div className="flex items-center gap-[12px] p-[13px_16px]">
                  <div className={`w-[36px] h-[36px] rounded-[12px] shrink-0 flex items-center justify-center ${isCredit(tx.type) ? 'bg-[#F0FDF4]' : 'bg-[#F5F4F2]'}`}>
                    {isCredit(tx.type) ? (
                      <ArrowDown size={16} strokeWidth={1.5} className="text-[#047857]" />
                    ) : (
                      <ArrowUp size={16} strokeWidth={1.5} className="text-[#6B6B6B]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-[#1A1A1A] mb-[2px] truncate">{tx.description || tx.type}</div>
                    <div className="text-[11px] font-normal text-[#A39887]">{formatDate(tx.created_at)}</div>
                  </div>
                  <div className={`text-[14px] font-extrabold whitespace-nowrap ${isCredit(tx.type) ? 'text-[#047857]' : 'text-[#1A1A1A]'}`}>
                    {isCredit(tx.type) ? '+' : '-'}{formatXOF(tx.amount)}
                  </div>
                </div>
                {idx < transactions.length - 1 && <div className="h-[1px] bg-[#F8F7F6] mx-[16px]" />}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

