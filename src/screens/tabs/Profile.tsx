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
      case 'PLATINUM': return 'bg-[var(--color-primary-light)] text-[var(--color-primary)]';
      case 'GOLD': return 'bg-[var(--color-primary-light)] text-[var(--color-primary)]';
      case 'SILVER': return 'bg-[var(--color-surface-inner)] text-[var(--color-text-secondary)]';
      default: return 'bg-[var(--color-surface-inner)] text-[var(--color-text-secondary)]';
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
      <div className="flex-1 flex items-center justify-center bg-[var(--color-bg)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    );
  }

  const benefits = getTierBenefits(profile.tier);
  const nextThreshold = getNextTierThreshold(profile.tier);
  const pointsToNext = nextThreshold ? nextThreshold - profile.score_afiya : 0;

  return (
    <div className="flex-1 bg-[var(--color-bg)] flex flex-col h-full pb-24">
      {/* Bloc 1 — Identité */}
      <div className="bg-[var(--color-surface)] px-6 pt-12 pb-6">
        <div className="max-w-2xl mx-auto w-full">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)] mb-6">Profil</h1>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-[var(--radius-avatar)] bg-[var(--color-primary)] flex items-center justify-center">
              <span className="text-white text-2xl font-bold">
                {(profile.full_name || profile.email || '?').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{profile.full_name || 'Utilisateur'}</h2>
              <p className="text-sm font-normal text-[var(--color-text-secondary)]">{profile.email}</p>
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
            <div className="bg-[var(--color-primary-light)] p-5 rounded-[var(--radius-inner)] flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-[var(--radius-avatar)] bg-white flex items-center justify-center shrink-0">
                  <User size={20} className="text-[var(--color-primary)]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--color-primary)]">Profil incomplet</h3>
                  <p className="text-xs font-normal text-[var(--color-text-secondary)] mt-0.5">Veuillez compléter votre KYC pour accéder à toutes les fonctionnalités d'Afiya.</p>
                </div>
              </div>
              <button 
                onClick={() => navigate('/kyc')}
                className="w-full bg-[var(--color-primary)] text-white py-2.5 rounded-[var(--radius-btn)] font-bold text-sm active:scale-[0.98] transition-transform"
              >
                Compléter mon profil
              </button>
            </div>
          )}

          {/* Bloc 2 — Score Afiya */}
          <div className="bg-[var(--color-surface)] p-5 rounded-[var(--radius-card)]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Score Afiya</h3>
              <span className="text-sm font-bold text-[var(--color-primary)]">Niveau {profile.tier}</span>
            </div>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-3xl font-bold text-[var(--color-primary)]">{profile.score_afiya}</span>
              <span className="text-sm font-normal text-[var(--color-text-secondary)] mb-1">/ 100</span>
            </div>
            <div className="w-full bg-[var(--color-border)] h-2 rounded-[var(--radius-badge)] overflow-hidden">
              <div className="bg-[var(--color-primary)] h-full rounded-[var(--radius-badge)] transition-all duration-500" style={{ width: `${profile.score_afiya}%` }} />
            </div>
            
            {nextThreshold && (
              <p className="text-xs font-normal text-[var(--color-text-secondary)] mt-3">
                Plus que <span className="font-bold text-[var(--color-primary)]">{pointsToNext} points</span> pour atteindre le tier suivant.
              </p>
            )}
            
            <div className="mt-4 pt-4">
              <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">Avantages actuels :</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[var(--color-bg)] p-2 rounded-[var(--radius-inner)]">
                  <p className="text-[10px] text-[var(--color-text-secondary)] uppercase">Caution réduite</p>
                  <p className="text-sm font-bold text-[var(--color-text-primary)]">Caution × {benefits.caution}</p>
                </div>
                <div className="bg-[var(--color-bg)] p-2 rounded-[var(--radius-inner)]">
                  <p className="text-[10px] text-[var(--color-text-secondary)] uppercase">Frais Afiya</p>
                  <p className="text-sm font-bold text-[var(--color-text-primary)]">{benefits.frais} sur réception</p>
                </div>
                <div className="bg-[var(--color-bg)] p-2 rounded-[var(--radius-inner)]">
                  <p className="text-[10px] text-[var(--color-text-secondary)] uppercase">Cotisation max</p>
                  <p className="text-sm font-bold text-[var(--color-text-primary)]">{benefits.max}</p>
                </div>
                <div className="bg-[var(--color-bg)] p-2 rounded-[var(--radius-inner)]">
                  <p className="text-[10px] text-[var(--color-text-secondary)] uppercase">Membres max</p>
                  <p className="text-sm font-bold text-[var(--color-text-primary)]">{benefits.members} membres</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bloc 3 — Menu */}
          <div className="bg-[var(--color-surface)] rounded-[var(--radius-card)] overflow-hidden">
            {auth.currentUser?.email === 'jespere20000@gmail.com' && (
              <button 
                onClick={() => navigate('/admin')}
                className="w-full flex items-center justify-between px-4 py-3.5 bg-[var(--color-bg)] active:bg-[var(--color-surface-inner)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Shield size={20} className="text-[var(--color-primary)]" />
                  <span className="text-sm font-bold text-[var(--color-primary)]">Dashboard Admin</span>
                </div>
                <ChevronRight size={20} className="text-[var(--color-primary)]" />
              </button>
            )}
            {[
              { icon: User, label: 'Informations personnelles' },
              { icon: Shield, label: 'Sécurité & Mot de passe' },
              { icon: HelpCircle, label: 'Aide & Support' },
            ].map((item, i) => (
              <button key={i} className="w-full flex items-center justify-between px-4 py-3.5 active:bg-[var(--color-surface-inner)] transition-colors">
                <div className="flex items-center gap-3">
                  <item.icon size={20} className="text-[var(--color-text-secondary)]" />
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">{item.label}</span>
                </div>
                <ChevronRight size={20} className="text-[var(--color-text-secondary)]" />
              </button>
            ))}
          </div>

          <button 
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 p-4 text-[var(--color-text-primary)] font-semibold bg-[var(--color-surface)] rounded-[var(--radius-btn)] active:bg-[var(--color-surface-inner)] transition-colors"
          >
            <LogOut size={20} />
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  );
}
