import React, { useState, useEffect, useRef } from 'react';
import { ArrowUpRight, ArrowDownLeft, Plus, Shield, Globe, Users, Award, MinusCircle, RotateCcw, ChevronRight, ArrowUp, ArrowDown, QrCode, Eye, EyeOff } from 'lucide-react';
import { cn, formatXOF } from '../../lib/utils';
import { auth } from '../../lib/firebase';
import { getUserProfile, UserProfile } from '../../services/userService';
import { subscribeToCollection, getDocument } from '../../lib/firestore';
import { where, orderBy, limit } from 'firebase/firestore';
import { motion } from 'motion/react';

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
  const [showBalance, setShowBalance] = useState(true);
  
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

    setLoading(true);

    // Load profile
    getUserProfile(user.uid).then((p) => {
      setProfile(p);
      setLoading(false);
    });

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
    // La largeur d'une carte (320px) + le gap (16px) = 336px. 
    const cardWidth = 336; 
    const newIndex = Math.round(scrollPosition / cardWidth);
    
    if (newIndex !== activeWalletIndex && newIndex >= 0 && newIndex < 3) {
      setActiveWalletIndex(newIndex);
    }
  };

  const getTxIcon = (type: string) => {
    switch (type) {
      case 'DEPOSIT': case 'PAYOUT': case 'REFUND': 
        return <ArrowDownLeft size={20} strokeWidth={2} className="text-[#047857]" />;
      case 'WITHDRAWAL': case 'CONTRIBUTION': case 'MINI_FUND_CONTRIB': case 'GLOBAL_FUND_CONTRIB': case 'PENALTY':
        return <ArrowUpRight size={20} strokeWidth={2} className="text-[#1A1A1A]" />;
      default: 
        return <ArrowDownLeft size={20} strokeWidth={2} className="text-[#047857]" />;
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

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'BRONZE': return 'from-[#CD7F32] to-[#A05A1A]';
      case 'SILVER': return 'from-[#9CA3AF] to-[#6B7280]';
      case 'GOLD': return 'from-[#F59E0B] to-[#D97706]';
      case 'PLATINUM': return 'from-[#1A1A1A] to-[#374151]';
      default: return 'from-[#047857] to-[#065F46]';
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
      futureAmount: null,
      isPositive: true,
      theme: 'primary' // Vert Afiya
    },
    {
      id: 'cercles',
      title: 'COMPTE CERCLES',
      balance: wallets['USER_CERCLES'].balance,
      label: 'FCFA disponibles',
      futureAmount: null, 
      isPositive: true,
      theme: 'tier' // Couleur du Tier
    },
    {
      id: 'capital',
      title: 'AFIYA CAPITAL',
      balance: wallets['USER_CAPITAL'].balance,
      label: 'FCFA investis',
      futureAmount: 4200, // Hardcodé temporairement pour le design V1
      isPositive: true,
      theme: 'dark' // Noir/Gris foncé
    }
  ];

  if (loading || !profile) {
    return (
      <div className="flex-1 bg-[#FAFAF8] min-h-screen flex flex-col overflow-y-auto pb-24 font-sans px-6 pt-[60px]">
        <div className="flex justify-between items-start mb-6">
          <div className="flex flex-col gap-2">
            <div className="h-4 w-20 bg-[#E8E6E3] rounded-full animate-pulse" />
            <div className="h-8 w-32 bg-[#E8E6E3] rounded-full animate-pulse" />
            <div className="h-4 w-40 bg-[#E8E6E3] rounded-full animate-pulse" />
          </div>
          <div className="w-14 h-14 bg-[#E8E6E3] rounded-[16px] animate-pulse" />
        </div>
        <div className="w-full h-[190px] bg-[#E8E6E3] rounded-[24px] animate-pulse mb-8" />
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="h-[100px] bg-[#E8E6E3] rounded-[20px] animate-pulse" />
          <div className="h-[100px] bg-[#E8E6E3] rounded-[20px] animate-pulse" />
          <div className="h-[100px] bg-[#E8E6E3] rounded-[20px] animate-pulse" />
        </div>
        <div className="h-[200px] w-full bg-[#E8E6E3] rounded-[24px] animate-pulse" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex-1 bg-[#FAFAF8] min-h-screen flex flex-col overflow-y-auto pb-24 font-sans"
    >
      
      {/* HEADER */}
      <div className="pt-[60px] px-6 mb-6 flex justify-between items-start">
        <div className="flex flex-col">
          <p className="text-[14px] font-medium text-[#A39887] mb-1">{greeting},</p>
          <h1 className="font-display text-[28px] font-bold text-[#1A1A1A] tracking-tight mb-2 leading-none">{firstName}</h1>
          <div className="flex items-center gap-2.5">
            <span className="text-[13px] font-semibold text-[#A39887]">{dateStr}</span>
            <div className="w-1 h-1 bg-[#D1D5DB] rounded-full" />
            <span className="text-[13px] font-bold text-[#047857]">{profile?.score_afiya || 0} pts</span>
            <div className="w-1 h-1 bg-[#D1D5DB] rounded-full" />
            <span className="text-[13px] font-bold text-[#A39887]">{profile?.tier || 'BRONZE'}</span>
          </div>
        </div>
        
        <div className="relative">
          <div className="w-14 h-14 bg-white border border-[#F0EFED] rounded-[16px] flex items-center justify-center text-[18px] font-display font-bold text-[#1A1A1A] shadow-sm">
            {getInitials()}
          </div>
          {/* Indicateur de notification (simulé actif) */}
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#EF4444] rounded-full border-[3px] border-[#FAFAF8]" />
        </div>
      </div>

      {/* WALLETS SWIPEABLES (CARTES DIGITALES) */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex gap-4 pl-6 pb-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {walletCards.map((wallet, index) => {
          
          let cardBgClass = '';
          let textColorClass = 'text-white';
          let labelColorClass = 'text-white/70';
          let iconColorClass = 'text-white/50';
          
          if (wallet.theme === 'primary') {
            cardBgClass = 'bg-gradient-to-br from-[#047857] to-[#065F46]';
          } else if (wallet.theme === 'tier') {
            cardBgClass = `bg-gradient-to-br ${getTierColor(profile?.tier || 'BRONZE')}`;
          } else if (wallet.theme === 'dark') {
            cardBgClass = 'bg-gradient-to-br from-[#1A1A1A] to-[#374151]';
          }

          return (
            <div 
              key={wallet.id} 
              className={cn(
                "relative min-w-[320px] w-[320px] h-[190px] rounded-[24px] p-6 flex-shrink-0 cursor-pointer transition-transform active:scale-[0.98] snap-center overflow-hidden shadow-[0_12px_30px_rgba(0,0,0,0.08)]",
                cardBgClass,
                index === walletCards.length - 1 && "mr-6"
              )}
            >
              {/* Motif identitaire en filigrane */}
              <div 
                className="absolute inset-0 opacity-[0.05] pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                  backgroundSize: '16px 16px'
                }}
              />
              
              {/* Puce de carte simulée */}
              <div className="absolute top-6 right-6 w-10 h-7 rounded-[6px] bg-white/20 backdrop-blur-sm border border-white/10 flex items-center justify-center overflow-hidden">
                <div className="w-full h-[1px] bg-white/20 absolute top-1/2" />
                <div className="w-[1px] h-full bg-white/20 absolute left-1/3" />
                <div className="w-[1px] h-full bg-white/20 absolute right-1/3" />
              </div>

              <div className="relative z-10 h-full flex flex-col justify-between">
                <div className="flex justify-between items-center">
                  <div className={cn("text-[11px] font-bold tracking-[0.15em] uppercase", labelColorClass)}>
                    {wallet.title}
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className={cn("font-display text-[36px] font-extrabold tracking-tight leading-none", textColorClass)}>
                      {showBalance ? formatXOF(wallet.balance).replace(' FCFA', '') : '••••••'}
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setShowBalance(!showBalance); }}
                      className={cn("p-1.5 rounded-full transition-colors", iconColorClass, "hover:bg-white/10")}
                    >
                      {showBalance ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  
                  <div className={cn("text-[13px] font-medium", labelColorClass)}>
                    {wallet.label}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* PAGINATION DOTS */}
      <div className="flex justify-center gap-2 mb-8 mt-2">
        {walletCards.map((_, index) => (
          <div 
            key={index}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              activeWalletIndex === index ? "bg-[#047857] w-6" : "bg-[#E8E6E3] w-2"
            )}
          />
        ))}
      </div>

      {/* ACTIONS GLOBALES */}
      <div className="grid grid-cols-3 gap-3 mx-6 mb-8">
        <button className="bg-white rounded-[20px] flex flex-col items-center gap-2.5 py-4 transition-transform active:scale-[0.98] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#F0EFED]">
          <div className="w-11 h-11 rounded-[14px] bg-[#047857] flex items-center justify-center shadow-[0_4px_12px_rgba(4,120,87,0.2)]">
            <ArrowUpRight size={22} strokeWidth={2} color="white" />
          </div>
          <span className="text-[13px] font-bold text-[#1A1A1A]">Envoyer</span>
        </button>
        
        <button className="bg-white rounded-[20px] flex flex-col items-center gap-2.5 py-4 transition-transform active:scale-[0.98] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#F0EFED]">
          <div className="w-11 h-11 rounded-[14px] bg-[#F0FDF4] flex items-center justify-center">
            <ArrowDownLeft size={22} strokeWidth={2} color="#047857" />
          </div>
          <span className="text-[13px] font-bold text-[#1A1A1A]">Retirer</span>
        </button>
        
        <button className="bg-white rounded-[20px] flex flex-col items-center gap-2.5 py-4 transition-transform active:scale-[0.98] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#F0EFED]">
          <div className="w-11 h-11 rounded-[14px] bg-[#F0FDF4] flex items-center justify-center">
            <QrCode size={22} strokeWidth={2} color="#047857" />
          </div>
          <span className="text-[13px] font-bold text-[#1A1A1A]">Recevoir</span>
        </button>
      </div>

      {/* TRANSACTIONS RÉCENTES */}
      <div className="mx-6 mb-6">
        <div className="flex justify-between items-end mb-4 px-1">
          <h3 className="font-display text-[18px] font-bold text-[#1A1A1A]">Transactions récentes</h3>
          <button className="text-[13px] font-bold text-[#047857] transition-opacity active:opacity-80 mb-0.5">
            Voir tout
          </button>
        </div>

        <div className="bg-white rounded-[24px] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-[#F0EFED]">
          {transactions.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="py-10 text-center px-4"
            >
              <p className="text-[14px] font-medium text-[#A39887]">Aucune transaction récente</p>
            </motion.div>
          ) : (
            transactions.map((tx, index) => {
              const isCredit = tx.type === 'DEPOSIT' || tx.type === 'PAYOUT' || tx.type === 'REFUND';
              const date = tx.created_at?.toDate ? tx.created_at.toDate() : new Date(tx.created_at);
              
              const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
              const dateStr = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });
              const displayDate = `${dateStr.charAt(0).toUpperCase() + dateStr.slice(1)} • ${timeStr}`;

              return (
                <motion.div 
                  key={tx.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <div className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[#FAFAF8] cursor-pointer">
                    <div className={cn("w-12 h-12 rounded-[16px] flex items-center justify-center shrink-0", getTxBg(tx.type))}>
                      {getTxIcon(tx.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                      <p className="text-[14px] font-bold text-[#1A1A1A] truncate leading-tight">
                        {tx.description}
                      </p>
                      <p className="text-[12px] font-medium text-[#A39887] leading-tight">
                        {displayDate}
                      </p>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <p className={cn("font-display text-[16px] font-bold", getTxColor(tx.type))}>
                        {isCredit ? '+' : '-'}{formatXOF(tx.amount).replace(' FCFA', '')}
                      </p>
                    </div>
                  </div>
                  {index !== transactions.length - 1 && (
                    <div className="h-[1px] bg-[#F0EFED] mx-5" />
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      </div>
      
    </motion.div>
  );
}