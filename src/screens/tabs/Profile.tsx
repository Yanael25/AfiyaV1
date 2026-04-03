import React, { useState, useEffect } from 'react';
import { 
  User, Shield, Bell, Globe, MessageCircle, FileText, 
  LogOut, Share2, Lock, ChevronRight 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../lib/firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { motion } from 'motion/react';
import { getUserProfile } from '../../services/userService';
import { formatXOF } from '../../lib/utils';

export function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [wallets, setWallets] = useState({
    main: 0,
    cercles: 0,
    capital: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async (uid: string) => {
      try {
        setLoading(true);
        const p = await getUserProfile(uid);
        setProfile(p || { 
          email: auth.currentUser?.email || '', 
          full_name: '', 
          score_afiya: 50, 
          tier: 'BRONZE',
          status: 'PENDING_REVIEW',
          kyc_status: 'PENDING'
        });

        const walletsQuery = query(
          collection(db, 'wallets'),
          where('owner_id', '==', uid)
        );
        const walletsSnap = await getDocs(walletsQuery);
        let main = 0, cercles = 0, capital = 0;
        
        walletsSnap.docs.forEach(doc => {
          const data = doc.data();
          if (data.wallet_type === 'USER_MAIN') main = data.balance || 0;
          if (data.wallet_type === 'USER_CERCLES') cercles = data.balance || 0;
          if (data.wallet_type === 'USER_CAPITAL') capital = data.balance || 0;
        });

        setWallets({ main, cercles, capital });
      } catch (error) {
        console.error("Error loading profile data:", error);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        loadData(user.uid);
      } else {
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/welcome');
  };

  const getTierBenefits = (tier: string) => {
    switch (tier) {
      case 'PLATINUM': return { caution: '0.25×', frais: '1.5%', max: 'Illimitée', members: '30' };
      case 'GOLD': return { caution: '0.5×', frais: '2%', max: '2 000 000 FCFA', members: '30' };
      case 'SILVER': return { caution: '0.75×', frais: '2.5%', max: '1 000 000 FCFA', members: '20' };
      default: return { caution: '1.0×', frais: '3%', max: '500 000 FCFA', members: '10' };
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'PLATINUM': return '#0F172A'; // Slate 900
      case 'GOLD': return '#D97706'; // Amber 600
      case 'SILVER': return '#64748B'; // Slate 500
      default: return '#B45309'; // Bronze
    }
  };

  const getTierBadgeStyle = (tier: string) => {
    switch (tier) {
      case 'PLATINUM': return 'bg-slate-900 text-white border-slate-800 shadow-[0_4px_12px_rgba(15,23,42,0.2)]';
      case 'GOLD': return 'bg-amber-50 text-amber-700 border-amber-200 shadow-[0_4px_12px_rgba(217,119,6,0.15)]';
      case 'SILVER': return 'bg-slate-50 text-slate-700 border-slate-200 shadow-[0_4px_12px_rgba(100,116,139,0.1)]';
      default: return 'bg-orange-50 text-orange-800 border-orange-200 shadow-[0_4px_12px_rgba(180,83,9,0.1)]';
    }
  };

  const getNextTierInfo = (tier: string, score: number) => {
    switch (tier) {
      case 'BRONZE': return { name: 'SILVER', threshold: 60, points: 60 - score };
      case 'SILVER': return { name: 'GOLD', threshold: 75, points: 75 - score };
      case 'GOLD': return { name: 'PLATINUM', threshold: 90, points: 90 - score };
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="bg-[#FAFAF8] min-h-screen flex flex-col pb-[100px] font-sans px-6 pt-[60px]">
        <div className="h-8 w-48 bg-[#E8E6E3] rounded-full animate-pulse mb-6" />
        <div className="h-[112px] w-full bg-[#E8E6E3] rounded-[24px] animate-pulse mb-4" />
        <div className="h-[340px] w-full bg-[#E8E6E3] rounded-[24px] animate-pulse mb-4" />
        <div className="h-[200px] w-full bg-[#E8E6E3] rounded-[24px] animate-pulse mb-4" />
      </div>
    );
  }

  const benefits = getTierBenefits(profile?.tier || 'BRONZE');
  const nextTier = getNextTierInfo(profile?.tier || 'BRONZE', profile?.score_afiya || 50);
  const totalPatrimoine = wallets.main + wallets.cercles + wallets.capital;
  const initials = profile?.full_name ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : 'U';

  const cleanAmount = (val: number) => {
    return formatXOF(val).replace(/\s?FCFA/gi, '').trim();
  };

  // Donut Chart Calculations
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const pMain = totalPatrimoine ? (wallets.main / totalPatrimoine) * circumference : 0;
  const pCercles = totalPatrimoine ? (wallets.cercles / totalPatrimoine) * circumference : 0;
  const pCapital = totalPatrimoine ? (wallets.capital / totalPatrimoine) * circumference : 0;

  const offsetCercles = circumference - pMain;
  const offsetCapital = offsetCercles - pCercles;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="bg-[#FAFAF8] min-h-screen pb-[100px] flex flex-col font-sans"
    >
      
      {/* HEADER */}
      <div className="pt-[60px] px-6 mb-2">
        <h1 className="font-display text-[28px] font-bold text-[#1A1A1A] tracking-tight">Mon profil</h1>
      </div>

      {/* CARD IDENTITÉ */}
      <div className="bg-white rounded-[24px] p-6 mx-6 mt-4 mb-4 flex items-center gap-5 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-[#F0EFED]">
        <div className="w-[64px] h-[64px] bg-[#047857] rounded-[20px] flex items-center justify-center text-[22px] font-display font-bold text-white flex-shrink-0 shadow-[0_4px_12px_rgba(4,120,87,0.2)]">
          {initials}
        </div>
        <div className="flex-1">
          <h2 className="font-display text-[20px] font-bold text-[#1A1A1A] tracking-tight mb-1 leading-none">
            {profile?.full_name || 'Utilisateur'}
          </h2>
          <p className="text-[13px] font-medium text-[#A39887] mb-2.5">{profile?.email}</p>
          <div className={`inline-flex items-center gap-1.5 rounded-[8px] px-2.5 py-1 border ${
            profile?.tier === 'PLATINUM' ? 'bg-slate-900 border-slate-800' :
            profile?.tier === 'GOLD' ? 'bg-amber-50 border-amber-200' :
            profile?.tier === 'SILVER' ? 'bg-slate-50 border-slate-200' :
            'bg-orange-50 border-orange-200'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${
              profile?.tier === 'PLATINUM' ? 'bg-white' :
              profile?.tier === 'GOLD' ? 'bg-amber-600' :
              profile?.tier === 'SILVER' ? 'bg-slate-500' :
              'bg-orange-600'
            }`} />
            <span className={`text-[11px] font-bold uppercase tracking-[0.08em] ${
              profile?.tier === 'PLATINUM' ? 'text-white' :
              profile?.tier === 'GOLD' ? 'text-amber-700' :
              profile?.tier === 'SILVER' ? 'text-slate-700' :
              'text-orange-800'
            }`}>
              Tier {profile?.tier || 'BRONZE'}
            </span>
          </div>
        </div>
      </div>

      {/* BANNIÈRE KYC */}
      {profile?.kyc_status !== 'VERIFIED' && (
        <div 
          onClick={() => navigate('/kyc-step3')}
          className="bg-white border border-[#F0EFED] rounded-[24px] mx-6 mb-4 p-5 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-all shadow-[0_4px_24px_rgba(0,0,0,0.02)]"
        >
          <div className="w-10 h-10 bg-[#FAFAF8] rounded-[12px] flex items-center justify-center flex-shrink-0 border border-[#F0EFED]">
            <Lock size={18} strokeWidth={1.5} className="text-[#1A1A1A]" />
          </div>
          <div className="flex-1">
            <h3 className="text-[14px] font-bold text-[#1A1A1A] mb-0.5">Vérification d'identité requise</h3>
            <p className="text-[12px] font-medium text-[#A39887] leading-tight">Complétez votre KYC pour activer les transactions</p>
          </div>
          <ChevronRight size={20} strokeWidth={1.5} className="text-[#047857] flex-shrink-0" />
        </div>
      )}

      {/* SCORE AFIYA */}
      <div className="bg-white rounded-[24px] p-6 mx-6 mb-4 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-[#F0EFED] relative overflow-hidden">
        
        {/* Jauge Semi-circulaire */}
        <div className="relative flex flex-col items-center mb-6 mt-2">
          <div className="w-[220px] relative">
            <svg viewBox="0 0 200 110" className="w-full h-auto drop-shadow-sm">
              <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#F0EFED" strokeWidth="16" strokeLinecap="round" />
              <path 
                d="M 20 100 A 80 80 0 0 1 180 100" 
                fill="none" 
                stroke={getTierColor(profile?.tier || 'BRONZE')} 
                strokeWidth="16" 
                strokeLinecap="round" 
                strokeDasharray="251.2" 
                strokeDashoffset={251.2 - (251.2 * (profile?.score_afiya || 50)) / 100} 
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-end pb-1">
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#A39887] mb-1">SCORE AFIYA</span>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-[48px] font-black text-[#1A1A1A] tracking-tight leading-none">
                  {profile?.score_afiya || 50}
                </span>
                <span className="text-[16px] font-bold text-[#A39887]">/ 100</span>
              </div>
            </div>
          </div>
        </div>

        {/* Badges Premium pour le Tier */}
        <div className="flex justify-center mb-8">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${getTierBadgeStyle(profile?.tier || 'BRONZE')}`}>
            <Shield size={16} strokeWidth={2} />
            <span className="text-[13px] font-bold uppercase tracking-wider">Tier {profile?.tier || 'BRONZE'}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-[#FAFAF8] rounded-[16px] p-3.5 border border-[#F0EFED]">
            <div className="font-display text-[15px] font-bold text-[#1A1A1A] mb-1">{benefits.max}</div>
            <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#A39887]">Cotisation max</div>
          </div>
          <div className="bg-[#FAFAF8] rounded-[16px] p-3.5 border border-[#F0EFED]">
            <div className="font-display text-[15px] font-bold text-[#1A1A1A] mb-1">{benefits.members}</div>
            <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#A39887]">Membres max</div>
          </div>
          <div className="bg-[#FAFAF8] rounded-[16px] p-3.5 border border-[#F0EFED]">
            <div className="font-display text-[15px] font-bold text-[#1A1A1A] mb-1">{benefits.caution}</div>
            <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#A39887]">Coeff. caution</div>
          </div>
          <div className="bg-[#FAFAF8] rounded-[16px] p-3.5 border border-[#F0EFED]">
            <div className="font-display text-[15px] font-bold text-[#1A1A1A] mb-1">{benefits.frais}</div>
            <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#A39887]">Frais de gestion</div>
          </div>
        </div>

        {nextTier && (
          <div className="bg-[#FAFAF8] rounded-[16px] px-4 py-3.5 flex justify-between items-center border border-[#F0EFED]">
            <span className="text-[13px] font-bold text-[#6B6B6B]">Prochain palier : <span className="text-[#1A1A1A]">{nextTier.name}</span></span>
            <span className="font-display text-[15px] font-bold text-[#047857]">+ {nextTier.points} pts</span>
          </div>
        )}
      </div>

      {/* PATRIMOINE TOTAL */}
      <div className="bg-white rounded-[24px] p-6 mx-6 mb-4 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-[#F0EFED]">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#A39887] mb-4">PATRIMOINE TOTAL</h3>
        
        <div className="flex items-center gap-6 mb-6">
          {/* Donut Chart SVG */}
          <div className="w-[100px] h-[100px] relative shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              {/* Background Circle */}
              <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#F0EFED" strokeWidth="12" />
              
              {totalPatrimoine > 0 && (
                <>
                  {/* Main Wallet */}
                  <circle 
                    cx="50" cy="50" r={radius} fill="transparent" stroke="#047857" strokeWidth="12"
                    strokeDasharray={`${pMain} ${circumference}`}
                    strokeDashoffset={0}
                    className="transition-all duration-1000 ease-out"
                  />
                  {/* Cercles Wallet */}
                  <circle 
                    cx="50" cy="50" r={radius} fill="transparent" stroke="#34D399" strokeWidth="12"
                    strokeDasharray={`${pCercles} ${circumference}`}
                    strokeDashoffset={-pMain}
                    className="transition-all duration-1000 ease-out"
                  />
                  {/* Capital Wallet */}
                  <circle 
                    cx="50" cy="50" r={radius} fill="transparent" stroke="#FBBF24" strokeWidth="12"
                    strokeDasharray={`${pCapital} ${circumference}`}
                    strokeDashoffset={-(pMain + pCercles)}
                    className="transition-all duration-1000 ease-out"
                  />
                </>
              )}
            </svg>
          </div>

          <div className="flex-1">
            <div className="flex items-baseline gap-1 mb-1">
              <span className="font-display text-[28px] font-bold text-[#1A1A1A] tracking-tight leading-none">
                {cleanAmount(totalPatrimoine)}
              </span>
              <span className="text-[14px] font-bold text-[#A39887]">FCFA</span>
            </div>
            <p className="text-[12px] font-medium text-[#A39887]">Tous comptes confondus</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center bg-[#FAFAF8] p-3 rounded-[12px] border border-[#F0EFED]">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-[#047857] rounded-full" />
              <span className="text-[13px] font-medium text-[#6B6B6B]">Compte Principal</span>
            </div>
            <span className="font-display text-[15px] font-bold text-[#1A1A1A]">{cleanAmount(wallets.main)} <span className="text-[11px] font-bold text-[#A39887] font-sans">FCFA</span></span>
          </div>
          <div className="flex justify-between items-center bg-[#FAFAF8] p-3 rounded-[12px] border border-[#F0EFED]">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-[#34D399] rounded-full" />
              <span className="text-[13px] font-medium text-[#6B6B6B]">Compte Cercles</span>
            </div>
            <span className="font-display text-[15px] font-bold text-[#1A1A1A]">{cleanAmount(wallets.cercles)} <span className="text-[11px] font-bold text-[#A39887] font-sans">FCFA</span></span>
          </div>
          <div className="flex justify-between items-center bg-[#FAFAF8] p-3 rounded-[12px] border border-[#F0EFED]">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-[#FBBF24] rounded-full" />
              <span className="text-[13px] font-medium text-[#6B6B6B]">Afiya Capital</span>
            </div>
            <span className="font-display text-[15px] font-bold text-[#1A1A1A]">{cleanAmount(wallets.capital)} <span className="text-[11px] font-bold text-[#A39887] font-sans">FCFA</span></span>
          </div>
        </div>
      </div>

      {/* MENU SECTIONS */}
      <div className="mt-2">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#A39887] mx-8 mb-3">MON COMPTE</h3>
        <div className="bg-white rounded-[24px] overflow-hidden mx-6 mb-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-[#F0EFED]">
          <div className="flex items-center gap-4 px-5 py-4 border-b border-[#F0EFED] cursor-pointer active:bg-[#FAFAF8] transition-colors group">
            <div className="w-10 h-10 rounded-[12px] bg-[#FAFAF8] flex items-center justify-center border border-[#F0EFED] group-hover:border-[#047857]/30 transition-colors">
              <User size={18} strokeWidth={1.5} className="text-[#1A1A1A]" />
            </div>
            <span className="text-[15px] font-bold text-[#1A1A1A]">Informations personnelles</span>
            <ChevronRight size={20} strokeWidth={1.5} className="text-[#A39887] ml-auto" />
          </div>
          <div className="flex items-center gap-4 px-5 py-4 border-b border-[#F0EFED] cursor-pointer active:bg-[#FAFAF8] transition-colors group">
            <div className="w-10 h-10 rounded-[12px] bg-[#FAFAF8] flex items-center justify-center border border-[#F0EFED] group-hover:border-[#047857]/30 transition-colors">
              <Lock size={18} strokeWidth={1.5} className="text-[#1A1A1A]" />
            </div>
            <span className="text-[15px] font-bold text-[#1A1A1A]">Vérification d'identité</span>
            <div className="ml-auto flex items-center gap-3">
              {profile?.kyc_status === 'VERIFIED' && (
                <span className="bg-[#F0FDF4] text-[#047857] text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-[8px] border border-[#047857]/10">Vérifié</span>
              )}
              <ChevronRight size={20} strokeWidth={1.5} className="text-[#A39887]" />
            </div>
          </div>
          <div className="flex items-center gap-4 px-5 py-4 cursor-pointer active:bg-[#FAFAF8] transition-colors group">
            <div className="w-10 h-10 rounded-[12px] bg-[#FAFAF8] flex items-center justify-center border border-[#F0EFED] group-hover:border-[#047857]/30 transition-colors">
              <Shield size={18} strokeWidth={1.5} className="text-[#1A1A1A]" />
            </div>
            <span className="text-[15px] font-bold text-[#1A1A1A]">Sécurité & Mot de passe</span>
            <ChevronRight size={20} strokeWidth={1.5} className="text-[#A39887] ml-auto" />
          </div>
        </div>

        <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#A39887] mx-8 mb-3">PRÉFÉRENCES</h3>
        <div className="bg-white rounded-[24px] overflow-hidden mx-6 mb-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-[#F0EFED]">
          <div className="flex items-center gap-4 px-5 py-4 border-b border-[#F0EFED] cursor-pointer active:bg-[#FAFAF8] transition-colors group">
            <div className="w-10 h-10 rounded-[12px] bg-[#FAFAF8] flex items-center justify-center border border-[#F0EFED] group-hover:border-[#047857]/30 transition-colors">
              <Bell size={18} strokeWidth={1.5} className="text-[#1A1A1A]" />
            </div>
            <span className="text-[15px] font-bold text-[#1A1A1A]">Notifications</span>
            <ChevronRight size={20} strokeWidth={1.5} className="text-[#A39887] ml-auto" />
          </div>
          <div className="flex items-center gap-4 px-5 py-4 cursor-pointer active:bg-[#FAFAF8] transition-colors group">
            <div className="w-10 h-10 rounded-[12px] bg-[#FAFAF8] flex items-center justify-center border border-[#F0EFED] group-hover:border-[#047857]/30 transition-colors">
              <Globe size={18} strokeWidth={1.5} className="text-[#1A1A1A]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[15px] font-bold text-[#1A1A1A]">Langue</span>
              <span className="text-[12px] font-medium text-[#A39887]">Français</span>
            </div>
            <ChevronRight size={20} strokeWidth={1.5} className="text-[#A39887] ml-auto" />
          </div>
        </div>

        <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#A39887] mx-8 mb-3">SUPPORT</h3>
        <div className="bg-white rounded-[24px] overflow-hidden mx-6 mb-8 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-[#F0EFED]">
          <div className="flex items-center gap-4 px-5 py-4 border-b border-[#F0EFED] cursor-pointer active:bg-[#FAFAF8] transition-colors group">
            <div className="w-10 h-10 rounded-[12px] bg-[#FAFAF8] flex items-center justify-center border border-[#F0EFED] group-hover:border-[#047857]/30 transition-colors">
              <MessageCircle size={18} strokeWidth={1.5} className="text-[#1A1A1A]" />
            </div>
            <span className="text-[15px] font-bold text-[#1A1A1A]">Nous contacter</span>
            <ChevronRight size={20} strokeWidth={1.5} className="text-[#A39887] ml-auto" />
          </div>
          <div className="flex items-center gap-4 px-5 py-4 cursor-pointer active:bg-[#FAFAF8] transition-colors group">
            <div className="w-10 h-10 rounded-[12px] bg-[#FAFAF8] flex items-center justify-center border border-[#F0EFED] group-hover:border-[#047857]/30 transition-colors">
              <FileText size={18} strokeWidth={1.5} className="text-[#1A1A1A]" />
            </div>
            <span className="text-[15px] font-bold text-[#1A1A1A]">Mentions légales</span>
            <ChevronRight size={20} strokeWidth={1.5} className="text-[#A39887] ml-auto" />
          </div>
        </div>
      </div>

      {/* BOUTONS BAS */}
      <div className="mx-6 mt-2 space-y-3">
        <button className="w-full bg-white border border-[#047857]/20 rounded-[20px] py-4.5 flex items-center justify-center gap-3 text-[15px] font-bold text-[#047857] active:bg-[#F0FDF4] transition-colors shadow-[0_4px_12px_rgba(4,120,87,0.05)]">
          <Share2 size={18} strokeWidth={2} className="text-[#047857]" />
          Partager Afiya
        </button>
        <button 
          onClick={handleSignOut}
          className="w-full bg-white border border-[#F0EFED] rounded-[20px] py-4.5 flex items-center justify-center gap-3 text-[15px] font-bold text-[#6B6B6B] active:bg-[#FAFAF8] transition-colors shadow-sm"
        >
          <LogOut size={18} strokeWidth={2} className="text-[#6B6B6B]" />
          Se déconnecter
        </button>
      </div>

      {/* VERSION */}
      <div className="text-[12px] font-medium text-[#C4B8AC] text-center py-8">
        Afiya v1.0.0
      </div>
    </motion.div>
  );
}