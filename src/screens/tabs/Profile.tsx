import React, { useState, useEffect } from 'react';
import { 
  User, Shield, Bell, Globe, MessageCircle, FileText, 
  LogOut, Share2, ChevronRight, HelpCircle, Users, ArrowUpRight, Lock 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../lib/firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { motion } from 'framer-motion';
import { getUserProfile } from '../../services/userService';

// Types & Helpers
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

export function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
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
          created_at: null
        });
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

  // --- LOGIQUE METIER TIERS ---
  const getTierBenefits = (tier: string) => {
    switch (tier) {
      case 'PLATINUM': return { frais: '1,5%', members: '30', max: 'Illimitée', caution: '0,25×' };
      case 'GOLD': return { frais: '2%', members: '30', max: '2 000 000 FCFA', caution: '0,5×' };
      case 'SILVER': return { frais: '2,5%', members: '20', max: '1 000 000 FCFA', caution: '0,75×' };
      default: return { frais: '3%', members: '10', max: '500 000 FCFA', caution: '1×' };
    }
  };

  const getTierBadgeProps = (tier: string) => {
    switch(tier) {
      case 'PLATINUM': return { bg: 'bg-[#F8FAFC]', text: 'text-[#334155]', border: 'border-[0.5px] border-[#CBD5E1]' };
      case 'GOLD': return { bg: 'bg-[#FEF9C3]', text: 'text-[#A16207]', border: '' };
      case 'SILVER': return { bg: 'bg-[#F1F5F9]', text: 'text-[#475569]', border: '' };
      default: return { bg: 'bg-[#FEF3C7]', text: 'text-[#92400E]', border: '' };
    }
  };

  const getNextTierInfo = (tier: string) => {
    switch (tier) {
      case 'BRONZE': return { current: 'BRONZE', next: 'SILVER', currentMin: 0, nextMin: 60 };
      case 'SILVER': return { current: 'SILVER', next: 'GOLD', currentMin: 60, nextMin: 75 };
      case 'GOLD': return { current: 'GOLD', next: 'PLATINUM', currentMin: 75, nextMin: 90 };
      default: return null; // PLATINUM
    }
  };

  // --- FORMATTERS ---
  const initials = profile?.full_name ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : 'U';
  const tier = profile?.tier || 'BRONZE';
  const score = profile?.score_afiya || 50;
  const benefits = getTierBenefits(tier);
  const badgeProps = getTierBadgeProps(tier);
  const progression = getNextTierInfo(tier);
  
  let memberSince = "Récemment";
  if (profile?.created_at) {
    const d = profile.created_at.toDate ? profile.created_at.toDate() : new Date(profile.created_at);
    memberSince = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }

  // Calcul du % pour la barre (relatif au palier actuel)
  let progressPercent = 100;
  if (progression) {
    const range = progression.nextMin - progression.currentMin;
    const currentPoints = score - progression.currentMin;
    progressPercent = Math.min(100, Math.max(0, (currentPoints / range) * 100));
  }

  if (loading) {
    return <div className="min-h-screen bg-[#F5F4F0] pt-[52px]" />; // Simple loader pour éviter le flash
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-[#F5F4F0] pt-[52px] pb-[80px] font-sans"
    >
      
      {/* 1. HEADER */}
      <div className="px-6 mb-6">
        <h1 className="text-[26px] font-[800] text-[#1A1A1A] tracking-[-0.02em]">Profil</h1>
      </div>

      {/* 2. BLOC IDENTITÉ */}
      <div className="px-6 mb-6">
        <div className="bg-white rounded-[20px] border-[0.5px] border-[#EDECEA] p-[20px] flex items-center gap-4">
          <div className="w-[56px] h-[56px] bg-[#047857] rounded-[16px] flex items-center justify-center shrink-0">
            <span className="text-[20px] font-[800] text-white tracking-[-0.02em]">{initials}</span>
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <h2 className="text-[17px] font-[800] text-[#1A1A1A] tracking-[-0.01em] truncate">
              {profile?.full_name || 'Utilisateur'}
            </h2>
            <p className="text-[12px] font-[500] text-[#A39887] mt-[3px] truncate">
              {profile?.email}
            </p>
            <p className="text-[11px] font-[500] text-[#C4B8AC] mt-[4px]">
              Membre depuis {memberSince}
            </p>
          </div>
        </div>
      </div>

      {/* 3. BLOC SCORE AFIYA */}
      <div className="px-6 mb-8">
        <div className="bg-white rounded-[20px] border-[0.5px] border-[#EDECEA] p-[20px]">
          
          {/* Header row */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-[8px] font-[700] uppercase text-[#A39887] tracking-[0.1em] mb-1">SCORE AFIYA</p>
              <div className="flex items-baseline gap-1">
                <span className="text-[48px] font-[800] text-[#1A1A1A] tracking-[-0.04em] leading-none">
                  {score}
                </span>
                <span className="text-[16px] font-[500] text-[#A39887]">/100</span>
              </div>
            </div>
            <div className={`px-2 py-1 rounded-[6px] text-[10px] font-[700] uppercase tracking-wider ${badgeProps.bg} ${badgeProps.text} ${badgeProps.border}`}>
              {tier}
            </div>
          </div>

          {/* Barre de progression */}
          <div className="mb-6">
            {progression ? (
              <>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[11px] font-[600] text-[#A39887]">{progression.current} {progression.currentMin}</span>
                  <span className="text-[11px] font-[600] text-[#A39887]">{progression.next} {progression.nextMin}</span>
                </div>
                <div className="w-full h-[6px] rounded-[3px] bg-[#F0EFED] overflow-hidden mb-2">
                  <div className="h-full bg-[#047857]" style={{ width: `${progressPercent}%` }} />
                </div>
                <p className="text-[12px] font-[500] text-[#A39887]">
                  Plus que <span className="text-[#047857] font-[700]">{progression.nextMin - score} pts</span> pour atteindre {progression.next}
                </p>
              </>
            ) : (
              <p className="text-[12px] font-[500] text-[#A39887]">
                <span className="text-[#047857] font-[700]">Vous bénéficiez des meilleurs avantages Afiya</span>
              </p>
            )}
          </div>

          <div className="h-[0.5px] bg-[#F0EFED] w-full mb-4" />

          {/* Avantages */}
          <p className="text-[8px] font-[700] uppercase text-[#A39887] tracking-[0.1em] mb-3">AVANTAGES {tier}</p>
          <div className="flex flex-col">
            <AdvantageRow icon={ArrowUpRight} label="Frais de gestion" value={benefits.frais} />
            <AdvantageRow icon={Users} label="Membres max." value={benefits.members} />
            <AdvantageRow icon={Shield} label="Caution requise" value={benefits.caution} isLast />
          </div>

          <div className="h-[0.5px] bg-[#F0EFED] w-full mt-2 mb-4" />

          {/* Comment est calculé le score */}
          <div className="bg-[#F5F4F0] rounded-[14px] p-[14px] flex items-center gap-3 cursor-pointer active:opacity-70 transition-opacity">
            <div className="w-[34px] h-[34px] bg-white border border-[#EDECEA] rounded-[10px] flex items-center justify-center shrink-0">
              <HelpCircle size={16} className="text-[#047857]" strokeWidth={2} />
            </div>
            <div className="flex flex-col flex-1">
              <span className="text-[13px] font-[700] text-[#1A1A1A]">Comment est calculé votre score ?</span>
              <span className="text-[11px] font-[500] text-[#A39887]">Transparence sur les règles de calcul</span>
            </div>
            <ChevronRight size={16} className="text-[#C4B8AC]" strokeWidth={2} />
          </div>

        </div>
      </div>

      {/* 4. MENUS */}
      <div className="px-6 mb-8">
        
        <p className="text-[10px] font-[700] uppercase text-[#A39887] tracking-[0.1em] px-4 mb-2">COMPTE</p>
        <div className="bg-white rounded-[20px] border-[0.5px] border-[#EDECEA] overflow-hidden mb-5">
          <MenuItem icon={User} label="Informations personnelles" />
          <MenuItem icon={Lock} label="Sécurité & Mot de passe" isLast />
        </div>

        <p className="text-[10px] font-[700] uppercase text-[#A39887] tracking-[0.1em] px-4 mb-2">PRÉFÉRENCES</p>
        <div className="bg-white rounded-[20px] border-[0.5px] border-[#EDECEA] overflow-hidden mb-5">
          <MenuItem icon={Bell} label="Notifications" />
          <MenuItem icon={Globe} label="Langue" sublabel="Français" isLast />
        </div>

        <p className="text-[10px] font-[700] uppercase text-[#A39887] tracking-[0.1em] px-4 mb-2">SUPPORT</p>
        <div className="bg-white rounded-[20px] border-[0.5px] border-[#EDECEA] overflow-hidden mb-5">
          <MenuItem icon={HelpCircle} label="Aide & FAQ" />
          <MenuItem icon={MessageCircle} label="Nous contacter" />
          <MenuItem icon={FileText} label="Mentions légales" isLast />
        </div>

      </div>

      {/* 5. BOUTONS BAS */}
      <div className="px-6 flex flex-col gap-3">
        <button className="w-full h-[52px] bg-white border-[1.5px] border-[#047857] rounded-[16px] flex items-center justify-center gap-2 active:scale-95 transition-transform">
          <Share2 size={18} className="text-[#047857]" strokeWidth={2} />
          <span className="text-[15px] font-[700] text-[#047857]">Partager Afiya</span>
        </button>
        <button 
          onClick={handleSignOut}
          className="w-full h-[52px] bg-white border-[0.5px] border-[#EDECEA] rounded-[16px] flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <LogOut size={18} className="text-[#6B6B6B]" strokeWidth={2} />
          <span className="text-[15px] font-[700] text-[#6B6B6B]">Se déconnecter</span>
        </button>
      </div>

      {/* 6. VERSION */}
      <div className="py-[20px] text-center">
        <span className="text-[12px] font-[500] text-[#C4B8AC]">Afiya v1.0.0</span>
      </div>

    </motion.div>
  );
}

// --- SOUS COMPOSANTS ---

function AdvantageRow({ icon: Icon, label, value, isLast = false }: { icon: any, label: string, value: string, isLast?: boolean }) {
  return (
    <div className={`flex items-center py-2.5 ${!isLast ? 'border-b-[0.5px] border-[#F5F4F0]' : ''}`}>
      <div className="w-[32px] h-[32px] bg-[#F0FDF4] rounded-[9px] flex items-center justify-center shrink-0 mr-3">
        <Icon size={15} className="text-[#047857]" strokeWidth={2} />
      </div>
      <span className="text-[13px] font-[600] text-[#1A1A1A] flex-1">{label}</span>
      <span className="text-[12px] font-[700] text-[#047857]">{value}</span>
    </div>
  );
}

function MenuItem({ icon: Icon, label, sublabel, isLast = false }: { icon: any, label: string, sublabel?: string, isLast?: boolean }) {
  return (
    <div className={`flex items-center px-[16px] py-[14px] active:bg-[#F5F4F0] cursor-pointer transition-colors ${!isLast ? 'border-b-[0.5px] border-[#F5F4F0]' : ''}`}>
      <div className="w-[36px] h-[36px] bg-[#F5F4F0] rounded-[10px] flex items-center justify-center shrink-0 mr-3">
        <Icon size={17} className="text-[#6B6B6B]" strokeWidth={2} />
      </div>
      <div className="flex flex-col flex-1">
        <span className="text-[14px] font-[600] text-[#1A1A1A]">{label}</span>
        {sublabel && <span className="text-[11px] font-[500] text-[#A39887]">{sublabel}</span>}
      </div>
      <ChevronRight size={16} className="text-[#C4B8AC]" strokeWidth={2} />
    </div>
  );
}