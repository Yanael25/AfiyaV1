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
      case 'PLATINUM': return 'bg-[#EDE9FE] text-[#5B21B6]';
      case 'GOLD': return 'bg-[#FDF3DC] text-[#C47820]';
      case 'SILVER': return 'bg-[#F1F5F9] text-[#475569]';
      default: return 'bg-[#F5E6D3] text-[#92400E]';
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
      <div className="flex-1 flex items-center justify-center bg-[#F5F0E8]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#047857]"></div>
      </div>
    );
  }

  const benefits = getTierBenefits(profile.tier);
  const nextThreshold = getNextTierThreshold(profile.tier);
  const pointsToNext = nextThreshold ? nextThreshold - profile.score_afiya : 0;

  return (
    <div className="flex-1 bg-[#F5F0E8] flex flex-col h-full pb-24">
      {/* Bloc 1 — Identité */}
      <div className="bg-white px-6 pt-12 pb-6 shadow-sm">
        <div className="max-w-2xl mx-auto w-full">
          <h1 className="text-[#1C1410] text-2xl font-bold mb-6">Profil</h1>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#047857] flex items-center justify-center">
              <span className="text-white text-2xl font-bold">
                {(profile.full_name || profile.email || '?').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
              </span>
            </div>
            <div>
              <h2 className="text-[#1C1410] font-bold text-lg">{profile.full_name || 'Utilisateur'}</h2>
              <p className="text-[#7C6F5E] text-sm">{profile.email}</p>
              <div className={`${getTierColor(profile.tier)} px-2 py-0.5 rounded text-[10px] font-bold inline-block mt-1`}>
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
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E8E0D0]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[#1C1410] font-semibold">Score Afiya</h3>
              <span className="text-[#047857] font-bold text-sm">Niveau {profile.tier}</span>
            </div>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-3xl font-bold text-[#047857]">{profile.score_afiya}</span>
              <span className="text-[#A39887] text-sm mb-1">/ 100</span>
            </div>
            <div className="w-full bg-[#E8E0D0] h-2 rounded-full overflow-hidden">
              <div className="bg-[#047857] h-full rounded-full transition-all duration-500" style={{ width: `${profile.score_afiya}%` }} />
            </div>
            
            {nextThreshold && (
              <p className="text-xs text-[#7C6F5E] mt-3">
                Plus que <span className="font-bold text-[#047857]">{pointsToNext} points</span> pour atteindre le tier suivant.
              </p>
            )}
            
            <div className="mt-4 pt-4 border-t border-[#E8E0D0]">
              <p className="text-xs font-semibold text-[#1C1410] mb-2">Avantages actuels :</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#F5F0E8] p-2 rounded-lg">
                  <p className="text-[10px] text-[#7C6F5E] uppercase">Caution réduite</p>
                  <p className="text-xs font-bold text-[#1C1410]">Caution × {benefits.caution}</p>
                </div>
                <div className="bg-[#F5F0E8] p-2 rounded-lg">
                  <p className="text-[10px] text-[#7C6F5E] uppercase">Frais Afiya</p>
                  <p className="text-xs font-bold text-[#1C1410]">{benefits.frais} sur réception</p>
                </div>
                <div className="bg-[#F5F0E8] p-2 rounded-lg">
                  <p className="text-[10px] text-[#7C6F5E] uppercase">Cotisation max</p>
                  <p className="text-xs font-bold text-[#1C1410]">{benefits.max}</p>
                </div>
                <div className="bg-[#F5F0E8] p-2 rounded-lg">
                  <p className="text-[10px] text-[#7C6F5E] uppercase">Membres max</p>
                  <p className="text-xs font-bold text-[#1C1410]">{benefits.members} membres</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bloc 3 — Menu */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#E8E0D0] overflow-hidden">
            {auth.currentUser?.email === 'jespere20000@gmail.com' && (
              <button 
                onClick={() => navigate('/admin')}
                className="w-full flex items-center justify-between p-4 border-b border-[#E8E0D0] bg-[#F5F0E8] hover:bg-[#E8E0D0] active:bg-[#DED2BE] transition-colors"
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
              <button key={i} className="w-full flex items-center justify-between p-4 border-b border-[#E8E0D0] last:border-0 hover:bg-[#F5F0E8] active:bg-[#E8E0D0] transition-colors">
                <div className="flex items-center gap-3">
                  <item.icon size={20} className="text-[#7C6F5E]" />
                  <span className="text-[#1C1410] font-medium">{item.label}</span>
                </div>
                <ChevronRight size={20} className="text-[#7C6F5E]" />
              </button>
            ))}
          </div>

          <button 
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 p-4 text-[#C84C31] font-semibold bg-white rounded-2xl shadow-sm border border-[#E8E0D0] hover:bg-[#F5F0E8] active:bg-[#E8E0D0] transition-colors"
          >
            <LogOut size={20} />
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  );
}
