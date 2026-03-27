import { useState, useEffect } from 'react';
import { User, Shield, Settings, HelpCircle, LogOut, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../lib/firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { getUserProfile } from '../../services/userService';

export function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async (uid: string) => {
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
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        loadProfile(user.uid);
      } else {
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'PLATINUM': return 'bg-[#7C3AED]';
      case 'GOLD': return 'bg-[#D97706]';
      case 'SILVER': return 'bg-[#6B7280]';
      default: return 'bg-[#B45309]';
    }
  };

  const getTierBenefits = (tier: string) => {
    switch (tier) {
      case 'PLATINUM': return { caution: '0.25×', frais: '1.5%', max: 'Illimitée', members: '30' };
      case 'GOLD': return { caution: '0.5×', frais: '2%', max: '2 000 000 FCFA', members: '30' };
      case 'SILVER': return { caution: '0.75×', frais: '2.5%', max: '1 000 000 FCFA', members: '20' };
      default: return { caution: '1.0×', frais: '3%', max: '500 000 FCFA', members: '10' };
    }
  };

  const getNextTierThreshold = (tier: string) => {
    switch (tier) {
      case 'BRONZE': return 60;
      case 'SILVER': return 75;
      case 'GOLD': return 90;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#047857]"></div>
      </div>
    );
  }

  const benefits = getTierBenefits(profile.tier);
  const nextThreshold = getNextTierThreshold(profile.tier);
  const pointsToNext = nextThreshold ? nextThreshold - profile.score_afiya : 0;

  return (
    <div className="flex-1 bg-gray-50 flex flex-col h-full pb-24">
      {/* Bloc 1 — Identité */}
      <div className="bg-white px-6 pt-12 pb-6 shadow-sm">
        <div className="max-w-2xl mx-auto w-full">
          <h1 className="text-[#111827] text-2xl font-bold mb-6">Profil</h1>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#047857] flex items-center justify-center">
              <span className="text-white text-2xl font-bold">
                {(profile.full_name || profile.email || '?').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
              </span>
            </div>
            <div>
              <h2 className="text-[#111827] font-bold text-lg">{profile.full_name || 'Utilisateur'}</h2>
              <p className="text-[#4B5563] text-sm">{profile.email}</p>
              <div className={`${getTierColor(profile.tier)} text-white px-2 py-0.5 rounded text-[10px] font-bold inline-block mt-1`}>
                {profile.tier}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto w-full space-y-6">
          {/* Bannière Profil Incomplet */}
          {(!profile.full_name || profile.kyc_status === 'PENDING') && (
            <div className="bg-orange-50 border border-orange-200 p-5 rounded-2xl shadow-sm flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                  <User size={20} className="text-orange-600" />
                </div>
                <div>
                  <h3 className="text-orange-900 font-bold text-sm">Profil incomplet</h3>
                  <p className="text-orange-700 text-xs mt-0.5">Veuillez compléter votre KYC pour accéder à toutes les fonctionnalités d'Afiya.</p>
                </div>
              </div>
              <button 
                onClick={() => navigate('/kyc')}
                className="w-full bg-orange-600 text-white py-2.5 rounded-xl font-bold text-sm shadow-sm active:scale-[0.98] transition-transform"
              >
                Compléter mon profil
              </button>
            </div>
          )}

          {/* Bloc 2 — Score Afiya */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E5E7EB]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[#111827] font-semibold">Score Afiya</h3>
              <span className="text-[#047857] font-bold text-sm">Niveau {profile.tier}</span>
            </div>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-3xl font-bold text-[#047857]">{profile.score_afiya}</span>
              <span className="text-[#9CA3AF] text-sm mb-1">/ 100</span>
            </div>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div className="bg-[#047857] h-full rounded-full transition-all duration-500" style={{ width: `${profile.score_afiya}%` }} />
            </div>
            
            {nextThreshold && (
              <p className="text-xs text-[#4B5563] mt-3">
                Plus que <span className="font-bold text-[#047857]">{pointsToNext} points</span> pour atteindre le tier suivant.
              </p>
            )}
            
            <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
              <p className="text-xs font-semibold text-[#111827] mb-2">Avantages actuels :</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-2 rounded-lg">
                  <p className="text-[10px] text-[#6B7280] uppercase">Caution réduite</p>
                  <p className="text-xs font-bold text-[#111827]">Caution × {benefits.caution}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg">
                  <p className="text-[10px] text-[#6B7280] uppercase">Frais Afiya</p>
                  <p className="text-xs font-bold text-[#111827]">{benefits.frais} sur réception</p>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg">
                  <p className="text-[10px] text-[#6B7280] uppercase">Cotisation max</p>
                  <p className="text-xs font-bold text-[#111827]">{benefits.max}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg">
                  <p className="text-[10px] text-[#6B7280] uppercase">Membres max</p>
                  <p className="text-xs font-bold text-[#111827]">{benefits.members} membres</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bloc 3 — Menu */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden">
            {auth.currentUser?.email === 'jespere20000@gmail.com' && (
              <button 
                onClick={() => navigate('/admin')}
                className="w-full flex items-center justify-between p-4 border-b border-[#E5E7EB] bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Shield size={20} className="text-[#047857]" />
                  <span className="text-[#047857] font-bold">Dashboard Admin</span>
                </div>
                <ChevronRight size={20} className="text-[#047857]" />
              </button>
            )}
            {[
              { icon: User, label: 'Informations personnelles' },
              { icon: Shield, label: 'Sécurité & Mot de passe' },
              { icon: HelpCircle, label: 'Aide & Support' },
            ].map((item, i) => (
              <button key={i} className="w-full flex items-center justify-between p-4 border-b border-[#E5E7EB] last:border-0 hover:bg-gray-50 active:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <item.icon size={20} className="text-[#4B5563]" />
                  <span className="text-[#111827] font-medium">{item.label}</span>
                </div>
                <ChevronRight size={20} className="text-[#9CA3AF]" />
              </button>
            ))}
          </div>

          <button 
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 p-4 text-red-600 font-semibold bg-white rounded-2xl shadow-sm border border-[#E5E7EB] hover:bg-red-50 active:bg-red-100 transition-colors"
          >
            <LogOut size={20} />
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  );
}
