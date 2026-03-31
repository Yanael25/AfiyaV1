import { useState, useEffect } from 'react';
import { User, Shield, Bell, Globe, MessageCircle, FileText, LogOut, Share2, Lock, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../lib/firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
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
        // 1. Load Profile
        const p = await getUserProfile(uid);
        setProfile(p || { 
          email: auth.currentUser?.email || '', 
          full_name: '', 
          score_afiya: 50, 
          tier: 'BRONZE',
          status: 'PENDING_REVIEW',
          kyc_status: 'PENDING'
        });

        // 2. Load Wallets
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
      <div className="flex-1 flex items-center justify-center bg-[#FAFAF8]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#047857]"></div>
      </div>
    );
  }

  const benefits = getTierBenefits(profile?.tier || 'BRONZE');
  const nextTier = getNextTierInfo(profile?.tier || 'BRONZE', profile?.score_afiya || 50);
  const totalPatrimoine = wallets.main + wallets.cercles + wallets.capital;

  return (
    <div className="bg-[#FAFAF8] min-h-screen pb-[80px] flex flex-col">
      {/* HEADER */}
      <div className="pt-[52px] px-6 mb-0">
        <h1 className="text-[26px] font-extrabold text-[#1A1A1A] tracking-tight">Mon profil</h1>
      </div>

      {/* CARD IDENTITÉ */}
      <div className="bg-white rounded-[24px] p-5 mx-4 mt-5 mb-2.5 flex items-center gap-4 shadow-sm">
        <div className="w-[60px] h-[60px] bg-[#047857] rounded-[20px] flex items-center justify-center text-[20px] font-extrabold text-white flex-shrink-0">
          {(profile?.full_name || profile?.email || '?').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
        </div>
        <div className="flex-1">
          <h2 className="text-[18px] font-extrabold text-[#1A1A1A] tracking-tight mb-1">
            {profile?.full_name || 'Utilisateur'}
          </h2>
          <p className="text-[12px] font-medium text-[#A39887] mb-2">{profile?.email}</p>
          <div className="inline-flex items-center gap-1.5 bg-[#F0FDF4] rounded-[8px] px-2.5 py-1">
            <div className="w-1.5 h-1.5 bg-[#047857] rounded-full" />
            <span className="text-[11px] font-bold text-[#047857] uppercase tracking-[0.08em]">
              Tier {profile?.tier || 'BRONZE'}
            </span>
          </div>
        </div>
      </div>

      {/* BANNIÈRE KYC */}
      {profile?.kyc_status !== 'VERIFIED' && (
        <div 
          onClick={() => navigate('/kyc-step3')}
          className="bg-white border border-[#E8E6E3] rounded-[20px] mx-4 mb-2.5 p-4 flex items-center gap-3 cursor-pointer shadow-sm active:scale-[0.98] transition-transform"
        >
          <div className="w-[38px] h-[38px] bg-[#F5F4F2] rounded-[12px] flex items-center justify-center flex-shrink-0">
            <Lock size={18} strokeWidth={1.5} className="text-[#1A1A1A]" />
          </div>
          <div className="flex-1">
            <h3 className="text-[13px] font-bold text-[#1A1A1A]">Vérification d'identité requise</h3>
            <p className="text-[11px] text-[#A39887] leading-tight mt-0.5">Complétez votre KYC pour activer les transactions</p>
          </div>
          <span className="text-[12px] font-bold text-[#047857] flex-shrink-0">Compléter →</span>
        </div>
      )}

      {/* SCORE AFIYA */}
      <div className="bg-white rounded-[24px] p-5 mx-4 mb-2.5 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#A39887] mb-1.5">SCORE AFIYA</h3>
            <div className="flex items-baseline gap-1">
              <span className="text-[40px] font-extrabold text-[#1A1A1A] tracking-[-0.03em] leading-none">
                {profile?.score_afiya || 50}
              </span>
              <span className="text-[16px] font-semibold text-[#C4B8AC]">/ 100</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[16px] font-extrabold text-[#047857]">{profile?.tier || 'BRONZE'}</div>
            <div className="text-[11px] text-[#A39887]">Tier actuel</div>
          </div>
        </div>

        <div className="mb-4">
          <div className="bg-[#F0EFED] h-1.5 rounded-full overflow-hidden mb-1.5">
            <div 
              className="bg-[#047857] h-full rounded-full transition-all duration-500" 
              style={{ width: `${profile?.score_afiya || 50}%` }} 
            />
          </div>
          <div className="flex justify-between text-[10px] font-semibold">
            <span className="text-[#C4B8AC]">0</span>
            {nextTier && (
              <span className="text-[#047857]">
                {nextTier.name} à {nextTier.threshold} pts · encore {nextTier.points} pts
              </span>
            )}
            <span className="text-[#C4B8AC]">100</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-[#FAFAF8] rounded-[12px] p-2.5 px-3">
            <div className="text-[13px] font-extrabold text-[#1A1A1A] mb-0.5">{benefits.max}</div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#A39887]">Cotisation max</div>
          </div>
          <div className="bg-[#FAFAF8] rounded-[12px] p-2.5 px-3">
            <div className="text-[13px] font-extrabold text-[#1A1A1A] mb-0.5">{benefits.members}</div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#A39887]">Membres max</div>
          </div>
          <div className="bg-[#FAFAF8] rounded-[12px] p-2.5 px-3">
            <div className="text-[13px] font-extrabold text-[#1A1A1A] mb-0.5">{benefits.caution}</div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#A39887]">Coeff. caution</div>
          </div>
          <div className="bg-[#FAFAF8] rounded-[12px] p-2.5 px-3">
            <div className="text-[13px] font-extrabold text-[#1A1A1A] mb-0.5">{benefits.frais}</div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#A39887]">Frais de gestion</div>
          </div>
        </div>

        {nextTier && (
          <div className="bg-[#F0FDF4] rounded-[12px] px-3.5 py-2.5 flex justify-between items-center">
            <span className="text-[12px] font-semibold text-[#047857]">Prochaine palier — {nextTier.name}</span>
            <span className="text-[13px] font-extrabold text-[#047857]">+ {nextTier.points} pts</span>
          </div>
        )}
      </div>

      {/* PATRIMOINE TOTAL */}
      <div className="bg-white rounded-[20px] p-5 mx-4 mb-2.5 shadow-sm">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#A39887] mb-1.5">PATRIMOINE TOTAL</h3>
        <div className="text-[28px] font-extrabold text-[#1A1A1A] tracking-tight mb-1">
          {formatXOF(totalPatrimoine)}
        </div>
        <p className="text-[12px] text-[#A39887] mb-4">Tous comptes confondus</p>

        <div className="flex justify-between items-center mb-2.5">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-[#047857] rounded-full opacity-100" />
            <span className="text-[12px] font-medium text-[#6B6B6B]">Compte Principal</span>
          </div>
          <span className="text-[13px] font-bold text-[#1A1A1A]">{formatXOF(wallets.main)}</span>
        </div>
        <div className="flex justify-between items-center mb-2.5">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-[#047857] rounded-full opacity-70" />
            <span className="text-[12px] font-medium text-[#6B6B6B]">Compte Cercles</span>
          </div>
          <span className="text-[13px] font-bold text-[#1A1A1A]">{formatXOF(wallets.cercles)}</span>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-[#047857] rounded-full opacity-40" />
            <span className="text-[12px] font-medium text-[#6B6B6B]">Afiya Capital</span>
          </div>
          <span className="text-[13px] font-bold text-[#1A1A1A]">{formatXOF(wallets.capital)}</span>
        </div>
      </div>

      {/* MENU SECTIONS */}
      <div className="mt-4">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#A39887] mx-4 mb-2">MON COMPTE</h3>
        <div className="bg-white rounded-[20px] overflow-hidden mx-4 mb-5 shadow-sm">
          <div className="flex items-center gap-3.5 px-[18px] py-[15px] border-b border-[#F8F7F6] cursor-pointer active:bg-gray-50">
            <div className="w-[34px] h-[34px] rounded-[11px] bg-[#F5F4F2] flex items-center justify-center">
              <User size={18} strokeWidth={1.5} className="text-[#1A1A1A]" />
            </div>
            <span className="text-[14px] font-semibold text-[#1A1A1A]">Informations personnelles</span>
            <ChevronRight size={18} strokeWidth={1.5} className="text-[#C4B8AC] ml-auto" />
          </div>
          <div className="flex items-center gap-3.5 px-[18px] py-[15px] border-b border-[#F8F7F6] cursor-pointer active:bg-gray-50">
            <div className="w-[34px] h-[34px] rounded-[11px] bg-[#F5F4F2] flex items-center justify-center">
              <Lock size={18} strokeWidth={1.5} className="text-[#1A1A1A]" />
            </div>
            <span className="text-[14px] font-semibold text-[#1A1A1A]">Vérification d'identité</span>
            <div className="ml-auto flex items-center">
              {profile?.kyc_status === 'VERIFIED' && (
                <span className="bg-[#F5F4F2] text-[#6B6B6B] text-[10px] font-bold px-2 py-0.5 rounded-[6px] mr-1">Vérifié</span>
              )}
              <ChevronRight size={18} strokeWidth={1.5} className="text-[#C4B8AC]" />
            </div>
          </div>
          <div className="flex items-center gap-3.5 px-[18px] py-[15px] cursor-pointer active:bg-gray-50">
            <div className="w-[34px] h-[34px] rounded-[11px] bg-[#F5F4F2] flex items-center justify-center">
              <Shield size={18} strokeWidth={1.5} className="text-[#1A1A1A]" />
            </div>
            <span className="text-[14px] font-semibold text-[#1A1A1A]">Sécurité & Mot de passe</span>
            <ChevronRight size={18} strokeWidth={1.5} className="text-[#C4B8AC] ml-auto" />
          </div>
        </div>

        <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#A39887] mx-4 mb-2">PRÉFÉRENCES</h3>
        <div className="bg-white rounded-[20px] overflow-hidden mx-4 mb-5 shadow-sm">
          <div className="flex items-center gap-3.5 px-[18px] py-[15px] border-b border-[#F8F7F6] cursor-pointer active:bg-gray-50">
            <div className="w-[34px] h-[34px] rounded-[11px] bg-[#F0FDF4] flex items-center justify-center">
              <Bell size={18} strokeWidth={1.5} className="text-[#047857]" />
            </div>
            <span className="text-[14px] font-semibold text-[#1A1A1A]">Notifications</span>
            <ChevronRight size={18} strokeWidth={1.5} className="text-[#C4B8AC] ml-auto" />
          </div>
          <div className="flex items-center gap-3.5 px-[18px] py-[15px] cursor-pointer active:bg-gray-50">
            <div className="w-[34px] h-[34px] rounded-[11px] bg-[#F5F4F2] flex items-center justify-center">
              <Globe size={18} strokeWidth={1.5} className="text-[#1A1A1A]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[14px] font-semibold text-[#1A1A1A]">Langue</span>
              <span className="text-[11px] text-[#A39887]">Français</span>
            </div>
            <ChevronRight size={18} strokeWidth={1.5} className="text-[#C4B8AC] ml-auto" />
          </div>
        </div>

        <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#A39887] mx-4 mb-2">SUPPORT</h3>
        <div className="bg-white rounded-[20px] overflow-hidden mx-4 mb-6 shadow-sm">
          <div className="flex items-center gap-3.5 px-[18px] py-[15px] border-b border-[#F8F7F6] cursor-pointer active:bg-gray-50">
            <div className="w-[34px] h-[34px] rounded-[11px] bg-[#F5F4F2] flex items-center justify-center">
              <MessageCircle size={18} strokeWidth={1.5} className="text-[#1A1A1A]" />
            </div>
            <span className="text-[14px] font-semibold text-[#1A1A1A]">Nous contacter</span>
            <ChevronRight size={18} strokeWidth={1.5} className="text-[#C4B8AC] ml-auto" />
          </div>
          <div className="flex items-center gap-3.5 px-[18px] py-[15px] cursor-pointer active:bg-gray-50">
            <div className="w-[34px] h-[34px] rounded-[11px] bg-[#F5F4F2] flex items-center justify-center">
              <FileText size={18} strokeWidth={1.5} className="text-[#1A1A1A]" />
            </div>
            <span className="text-[14px] font-semibold text-[#1A1A1A]">Mentions légales</span>
            <ChevronRight size={18} strokeWidth={1.5} className="text-[#C4B8AC] ml-auto" />
          </div>
        </div>
      </div>

      {/* BOUTONS BAS */}
      <div className="mx-4 mt-1">
        <button className="w-full bg-white rounded-[16px] py-3.5 flex items-center justify-center gap-2.5 text-[14px] font-bold text-[#047857] mb-2 shadow-sm active:scale-[0.98] transition-transform">
          <Share2 size={18} strokeWidth={2} className="text-[#047857]" />
          Partager Afiya
        </button>
        <button 
          onClick={handleSignOut}
          className="w-full bg-white rounded-[16px] py-3.5 flex items-center justify-center gap-2.5 text-[14px] font-bold text-[#A39887] mb-2 shadow-sm active:scale-[0.98] transition-transform"
        >
          <LogOut size={18} strokeWidth={2} className="text-[#A39887]" />
          Se déconnecter
        </button>
      </div>

      {/* VERSION */}
      <div className="text-[11px] text-[#C4B8AC] text-center py-2 mt-2">
        Afiya v1.0.0
      </div>
    </div>
  );
}

