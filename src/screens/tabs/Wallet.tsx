import React, { useState, useEffect, useRef } from 'react';
import { ArrowUpRight, ArrowDownLeft, Plus, Shield, Globe, Users, Award, MinusCircle, RotateCcw, ChevronRight, ArrowUp, ArrowDown, QrCode } from 'lucide-react';
import { cn, formatXOF } from '../../lib/utils';
import { auth } from '../../lib/firebase';
import { getUserProfile, UserProfile } from '../../services/userService';
import { subscribeToCollection, getDocument } from '../../lib/firestore';
import { where, orderBy, limit } from 'firebase/firestore';

// Types pour les Wallets
interface WalletData {
  id: string;
  wallet_type: string;
  balance: number;
}

export function Wallet() {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  
  // États pour les 3 wallets
  const [wallets, setWallets] = useState<Record<string, WalletData>>({
    'USER_MAIN': { id: 'main', wallet_type: 'USER_MAIN', balance: 0 },
    'USER_CERCLES': { id: 'cercles', wallet_type: 'USER_CERCLES', balance: 0 },
    'USER_CAPITAL': { id: 'capital', wallet_type: 'USER_CAPITAL', balance: 0 },
  });

  // Gestion du swipe et de la pagination
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeWalletIndex, setActiveWalletIndex] = useState(0);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Load profile
    getUserProfile(user.uid).then(setProfile);

    // Subscribe to all wallets for the user
    const unsubscribeWallets = subscribeToCollection('wallets', [
      where('user_id', '==', user.uid)
    ], (walletData: WalletData[]) => {
      const newWallets = { ...wallets };
      walletData.forEach(w => {
        if (w.wallet_type === 'USER_MAIN' || w.wallet_type === 'USER_CERCLES' || w.wallet_type === 'USER_CAPITAL') {
          newWallets[w.wallet_type] = w;
        }
      });
      setWallets(newWallets);
    });

    // Subscribe to recent transactions
    const unsubscribeTxs = subscribeToCollection('transactions', [
      where('user_id', '==', user.uid),
      orderBy('created_at', 'desc'),
      limit(5) // Limité à 5 pour l'écran d'accueil
    ], setTransactions);

    return () => {
      unsubscribeWallets();
      unsubscribeTxs();
    };
  }, []);

  // Détecter le scroll pour mettre à jour les points de pagination
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const scrollPosition = container.scrollLeft;
    // La largeur d'une carte (292px) + le gap (12px) = 304px. 
    // On divise pour trouver l'index approximatif.
    const cardWidth = 304; 
    const newIndex = Math.round(scrollPosition / cardWidth);
    
    if (newIndex !== activeWalletIndex && newIndex >= 0 && newIndex < 3) {
      setActiveWalletIndex(newIndex);
    }
  };

  const getTxIcon = (type: string) => {
    switch (type) {
      case 'DEPOSIT': case 'PAYOUT': case 'REFUND': 
        return <ArrowDown size={18} strokeWidth={2} className="text-[#047857]" />;
      case 'WITHDRAWAL': case 'CONTRIBUTION': case 'MINI_FUND_CONTRIB': case 'GLOBAL_FUND_CONTRIB': case 'PENALTY':
        return <ArrowUp size={18} strokeWidth={2} className="text-[#6B6B6B]" />;
      default: 
        return <ArrowDown size={18} strokeWidth={2} className="text-[#047857]" />;
    }
  };

  const getTxColor = (type: string) => {
    switch (type) {
      case 'DEPOSIT': case 'PAYOUT': case 'REFUND': return 'text-[#047857]';
      default: return 'text-[#1A1A1A]';
    }
  };

  const getTxBg = (type: string) => {
    switch (type) {
      case 'DEPOSIT': case 'PAYOUT': case 'REFUND': return 'bg-[#F0FDF4]';
      default: return 'bg-[#F5F4F2]';
    }
  };

  const hour = new Date().getHours();
  const greeting = hour >= 18 ? 'Bonsoir' : 'Bonjour';
  const firstName = profile?.full_name?.split(' ')[0] || 'Utilisateur';
  
  // Formatage de la date du jour
  const today = new Date();
  const dateStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}`;

  // Initiales Avatar
  const getInitials = () => {
    if (profile?.full_name) {
      const parts = profile.full_name.split(' ');
      const f = parts[0]?.charAt(0).toUpperCase() || '';
      const l = parts[1]?.charAt(0).toUpperCase() || '';
      return `${f}${l}`;
    }
    return 'U';
  };

  // Les 3 cartes à afficher
  const walletCards = [
    {
      id: 'main',
      title: 'COMPTE PRINCIPAL',
      balance: wallets['USER_MAIN'].balance,
      label: 'FCFA disponibles',
      futureAmount: null, // À calculer selon ta logique
      isPositive: true
    },
    {
      id: 'cercles',
      title: 'COMPTE CERCLES',
      balance: wallets['USER_CERCLES'].balance,
      label: 'FCFA disponibles',
      futureAmount: null, 
      isPositive: true
    },
    {
      id: 'capital',
      title: 'AFIYA CAPITAL',
      balance: wallets['USER_CAPITAL'].balance,
      label: 'FCFA investis',
      futureAmount: 4200, // Hardcodé temporairement pour le design V1
      isPositive: true
    }
  ];

  return (
    <div className="flex-1 bg-[#FAFAF8] min-h-screen flex flex-col overflow-y-auto pb-24 font-sans">
      
      {/* HEADER */}
      <div className="pt-[52px] px-[24px] mb-[16px] flex justify-between items-start">
        <div className="flex flex-col">
          <p className="text-[12px] font-medium text-[#A39887] mb-0.5">{greeting},</p>
          <h1 className="text-[22px] font-extrabold text-[#1A1A1A] tracking-tight mb-1">{firstName}</h1>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold text-[#C4B8AC]">{dateStr}</span>
            <div className="w-[3px] h-[3px] bg-[#C4B8AC] rounded-full" />
            <span className="text-[12px] font-bold text-[#047857]">{profile?.score_afiya || 0} pts</span>
            <div className="w-[3px] h-[3px] bg-[#C4B8AC] rounded-full" />
            <span className="text-[12px] font-semibold text-[#A39887]">{profile?.tier || 'BRONZE'}</span>
          </div>
        </div>
        
        <div className="relative">
          <div className="w-[42px] h-[42px] bg-[#047857] rounded-[14px] flex items-center justify-center text-[13px] font-extrabold text-white">
            {getInitials()}
          </div>
          {/* Indicateur de notification (simulé actif) */}
          <div className="absolute -top-[3px] -right-[3px] w-[10px] h-[10px] bg-[#EF4444] rounded-full border-2 border-[#FAFAF8]" />
        </div>
      </div>

      {/* WALLETS SWIPEABLES */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex gap-3 pl-4 pb-2 overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {walletCards.map((wallet, index) => (
          <div 
            key={wallet.id} 
            className={cn(
              "min-w-[292px] w-[292px] bg-white rounded-[24px] p-[22px] flex-shrink-0 cursor-pointer transition-transform active:scale-[0.98] snap-center",
              index === walletCards.length - 1 && "mr-4"
            )}
          >
            <div className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#A39887] mb-3.5">
              {wallet.title}
            </div>
            
            <div className="text-[34px] font-extrabold text-[#1A1A1A] tracking-[-0.03em] leading-none mb-1">
              {formatXOF(wallet.balance).replace(' FCFA', '')}
            </div>
            
            <div className="text-[12px] font-medium text-[#A39887] mb-4">
              {wallet.label}
            </div>
            
            <div className="bg-[#FAFAF8] rounded-[14px] p-2.5 px-3.5">
              <div className="text-[10px] font-bold tracking-[0.1em] uppercase text-[#C4B8AC] mb-1.5">
                A VENIR
              </div>
              {wallet.futureAmount !== null ? (
                <div className={cn(
                  "text-[15px] font-extrabold",
                  wallet.isPositive ? "text-[#047857]" : "text-[#1A1A1A]"
                )}>
                  {wallet.isPositive ? '+' : '-'}{formatXOF(Math.abs(wallet.futureAmount))}
                </div>
              ) : (
                <div className="text-[11px] italic text-[#C4B8AC]">
                  Aucun mouvement prévu
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* PAGINATION DOTS */}
      <div className="flex justify-center gap-1.5 mb-5 mt-2">
        {walletCards.map((_, index) => (
          <div 
            key={index}
            className={cn(
              "h-1 rounded-full transition-all duration-300",
              activeWalletIndex === index ? "bg-[#047857] w-5" : "bg-[#E8E6E3] w-2"
            )}
          />
        ))}
      </div>

      {/* ACTIONS GLOBALES */}
      <div className="grid grid-cols-3 gap-2.5 mx-4 mb-5">
        <button className="bg-white rounded-[18px] flex flex-col items-center gap-2 py-3.5 transition-opacity active:opacity-80">
          <div className="w-9 h-9 rounded-[12px] bg-[#047857] flex items-center justify-center">
            <ArrowUp size={18} strokeWidth={1.5} color="white" />
          </div>
          <span className="text-[12px] font-bold text-[#1A1A1A]">Envoyer</span>
        </button>
        
        <button className="bg-white rounded-[18px] flex flex-col items-center gap-2 py-3.5 transition-opacity active:opacity-80">
          <div className="w-9 h-9 rounded-[12px] bg-[#F0FDF4] flex items-center justify-center">
            <ArrowDown size={18} strokeWidth={1.5} color="#047857" />
          </div>
          <span className="text-[12px] font-bold text-[#1A1A1A]">Retirer</span>
        </button>
        
        <button className="bg-white rounded-[18px] flex flex-col items-center gap-2 py-3.5 transition-opacity active:opacity-80">
          <div className="w-9 h-9 rounded-[12px] bg-[#F0FDF4] flex items-center justify-center">
            <QrCode size={18} strokeWidth={1.5} color="#047857" />
          </div>
          <span className="text-[12px] font-bold text-[#1A1A1A]">Recevoir</span>
        </button>
      </div>

      {/* TRANSACTIONS RÉCENTES */}
      <div className="mx-4 mb-6">
        <div className="flex justify-between items-center mb-2.5 px-1">
          <h3 className="text-[14px] font-extrabold text-[#1A1A1A]">Transactions récentes</h3>
          <button className="text-[12px] font-semibold text-[#047857] transition-opacity active:opacity-80">
            Voir tout
          </button>
        </div>

        <div className="bg-white rounded-[20px] overflow-hidden">
          {transactions.length === 0 ? (
            <div className="py-8 text-center px-4">
              <p className="text-[13px] font-medium text-[#A39887]">Aucune transaction récente</p>
            </div>
          ) : (
            transactions.map((tx, index) => {
              const isCredit = tx.type === 'DEPOSIT' || tx.type === 'PAYOUT' || tx.type === 'REFUND';
              const date = tx.created_at?.toDate ? tx.created_at.toDate() : new Date(tx.created_at);
              
              // Simplification de la date pour correspondre au design (ex: "Aujourd'hui - 09h14")
              // Note: Une vraie fonction de formatage serait plus robuste, on fait simple ici.
              const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
              const dateStr = date.toLocaleDateString('fr-FR', { weekday: 'long' });
              const displayDate = `${dateStr.charAt(0).toUpperCase() + dateStr.slice(1)} - ${timeStr}`;

              return (
                <div key={tx.id}>
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <div className={cn("w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0", getTxBg(tx.type))}>
                      {getTxIcon(tx.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <p className="text-[13px] font-semibold text-[#1A1A1A] truncate leading-tight mb-0.5">
                        {tx.description}
                      </p>
                      <p className="text-[11px] text-[#A39887] leading-tight">
                        {displayDate}
                      </p>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <p className={cn("text-[14px] font-extrabold", getTxColor(tx.type))}>
                        {isCredit ? '+' : '-'}{formatXOF(tx.amount).replace(' FCFA', '')}
                      </p>
                    </div>
                  </div>
                  {index !== transactions.length - 1 && (
                    <div className="h-px bg-[#F8F7F6] mx-4" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
      
    </div>
  );
}