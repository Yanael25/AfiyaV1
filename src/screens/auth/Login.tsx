import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { signInWithEmail, getUserProfile } from '../../services/userService';
import { auth } from '../../lib/firebase';

export function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    setError(null);
    try {
      const user = await signInWithEmail(email.trim(), password);
      const profile = await getUserProfile(user.uid);
      if (profile && !profile.full_name) {
        navigate('/kyc');
      } else {
        navigate('/home');
      }
    } catch (err: any) {
      setError("Email ou mot de passe incorrect");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-[var(--color-bg)] flex flex-col h-full overflow-y-auto">
      <div className="px-6 pt-6 pb-4">
        <button 
          onClick={() => navigate(-1)} 
          className="w-10 h-10 bg-[var(--color-surface)] rounded-[var(--radius-btn)] flex items-center justify-center text-[var(--color-text-primary)]"
        >
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
      </div>
      
      <div className="px-6 pt-4 pb-6 relative">
        <div className="absolute left-0 top-4 bottom-6 w-[3px] bg-[var(--color-primary)] rounded-r-[4px]" />
        <div className="pl-4">
          <div className="text-[11px] font-bold tracking-[0.2em] text-[var(--color-primary)] uppercase mb-2">Afiya</div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)] mb-2 leading-tight">
            Bon retour.
          </h1>
          <p className="text-[13px] text-[var(--color-text-muted)]">
            Connectez-vous pour accéder à votre espace.
          </p>
        </div>
      </div>

      <div className="h-px bg-[var(--color-divider)] w-full mb-6" />

      <div className="flex-1 px-6 pb-12">
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input 
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(null); }}
              placeholder="Adresse email"
              className={`w-full bg-[var(--color-surface-inner)] rounded-[var(--radius-field)] px-4 py-3.5 text-[15px] font-semibold text-[var(--color-text-primary)] placeholder-[var(--color-text-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-colors ${error ? 'ring-2 ring-[var(--color-text-primary)]' : ''}`} 
              required
            />
          </div>

          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={e => { setPassword(e.target.value); setError(null); }}
              placeholder="Mot de passe"
              className={`w-full bg-[var(--color-surface-inner)] rounded-[var(--radius-field)] pl-4 pr-12 py-3.5 text-[15px] font-semibold text-[var(--color-text-primary)] placeholder-[var(--color-text-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-colors ${error ? 'ring-2 ring-[var(--color-text-primary)]' : ''}`} 
              required
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-[var(--color-text-muted)]"
            >
              {showPassword ? <EyeOff size={20} strokeWidth={1.5} /> : <Eye size={20} strokeWidth={1.5} />}
            </button>
          </div>

          <div className="flex justify-end pt-1">
            <button type="button" className="text-[12px] font-bold text-[var(--color-primary)]">
              Mot de passe oublié ?
            </button>
          </div>

          {error && (
            <p className="text-[13px] font-medium text-[var(--color-text-primary)] mt-2">{error}</p>
          )}

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-[var(--color-primary)] text-white py-4 rounded-[var(--radius-btn)] text-[15px] font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center">
          <p className="text-[13px] font-medium text-[var(--color-text-secondary)]">
            Pas encore de compte ?{' '}
            <Link to="/signup" className="text-[var(--color-primary)] font-bold">
              S'inscrire
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
