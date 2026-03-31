import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { signInWithEmail, getUserProfile } from '../../services/userService';

export function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
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
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col font-sans">
      
      {/* 1. BOUTON RETOUR */}
      <div className="pt-[52px] px-[24px]">
        <button 
          onClick={() => navigate('/welcome')} 
          className="w-9 h-9 bg-white rounded-xl flex items-center justify-center transition-opacity active:opacity-80"
        >
          <ArrowLeft size={18} strokeWidth={1.5} color="#6B6B6B" />
        </button>
      </div>
      
      {/* 2. HEADER */}
      <div className="px-[28px] pb-[28px] border-b border-[#F0EFED] mb-[32px] relative mt-[24px]">
        <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-[#047857] rounded-r-[4px]" />
        <div className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#047857] mb-3">
          AFIYA
        </div>
        <h1 className="text-[26px] font-extrabold text-[#1A1A1A] tracking-tight leading-tight mb-1.5">
          Bon retour.
        </h1>
        <p className="text-[13px] font-normal text-[#A39887]">
          Connectez-vous pour accéder à votre espace.
        </p>
      </div>

      {/* 3. FORMULAIRE */}
      <div className="px-[28px] flex-1 flex flex-col justify-between">
        
        {/* CHAMPS */}
        <div>
          <div className="mb-5">
            <label className="block text-[11px] font-bold uppercase tracking-widest text-[#A39887] mb-2">
              ADRESSE EMAIL
            </label>
            <input 
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(null); }}
              placeholder="fifame.dossou@gmail.com"
              className="w-full bg-[#FAFAF8] border-2 border-transparent rounded-[14px] px-4 py-[14px] text-[15px] font-semibold text-[#1A1A1A] outline-none placeholder:text-[#C4B8AC] placeholder:font-normal"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-[#A39887] mb-2">
              MOT DE PASSE
            </label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(null); }}
                placeholder="••••••••"
                className="w-full bg-[#FAFAF8] border-2 border-transparent rounded-[14px] pl-4 pr-12 py-[14px] text-[15px] font-semibold text-[#1A1A1A] outline-none placeholder:text-[#C4B8AC] placeholder:font-normal"
              />
              <button 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center transition-opacity active:opacity-80"
              >
                {showPassword ? (
                  <EyeOff size={20} strokeWidth={1.5} color="#C4B8AC" />
                ) : (
                  <Eye size={20} strokeWidth={1.5} color="#C4B8AC" />
                )}
              </button>
            </div>
            <p className="text-right text-[12px] font-semibold text-[#047857] mt-1.5 cursor-pointer transition-opacity active:opacity-80">
              Mot de passe oublié ?
            </p>
          </div>
        </div>

        {/* BLOC BAS */}
        <div className="pb-[40px] mt-8">
          {error && (
            <div className="bg-[#FAFAF8] rounded-[14px] p-3 text-[12px] font-semibold text-[#1A1A1A] mb-4 text-center">
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading || !email || !password}
            className={`w-full rounded-[16px] py-4 text-[15px] font-bold mb-2.5 transition-opacity ${
              loading || !email || !password
                ? 'bg-[#E8E6E3] text-[#C4B8AC] cursor-not-allowed'
                : 'bg-[#047857] text-white active:opacity-80'
            }`}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>

          <p className="text-[13px] text-[#A39887] text-center mt-4">
            Pas encore de compte ?{' '}
            <button 
              onClick={() => navigate('/signup')}
              className="text-[#047857] font-bold transition-opacity active:opacity-80"
            >
              S'inscrire
            </button>
          </p>
        </div>
        
      </div>
    </div>
  );
}