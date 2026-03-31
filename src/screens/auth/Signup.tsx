import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Eye, EyeOff } from 'lucide-react';
import { signUpWithEmail } from '../../services/userService';

export function Signup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSignup = async () => {
    if (!email || !password) return;
    
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await signUpWithEmail(email.trim(), password);
      navigate('/kyc');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError("Cet email est déjà utilisé.");
      } else {
        setError("Une erreur est survenue lors de l'inscription.");
      }
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
          <ChevronLeft size={18} strokeWidth={1.5} color="#6B6B6B" />
        </button>
      </div>
      
      {/* 2. HEADER */}
      <div className="px-[28px] pb-[28px] border-b border-[#F0EFED] mb-[32px] relative mt-[24px]">
        <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-[#047857] rounded-r-[4px]" />
        <div className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#047857] mb-3">
          AFIYA
        </div>
        <h1 className="text-[26px] font-extrabold text-[#1A1A1A] tracking-tight leading-tight mb-1.5">
          Créons votre compte.
        </h1>
        <p className="text-[13px] font-normal text-[#A39887]">
          Ça prend moins de 2 minutes.
        </p>
      </div>

      {/* 3. INDICATEUR DE PROGRESSION */}
      <div className="px-[28px] mb-[32px] flex gap-1.5">
        <div className="flex-1 h-1 rounded-full bg-[#047857]" />
        <div className="flex-1 h-1 rounded-full bg-[#E8E6E3]" />
      </div>

      {/* 4. FORMULAIRE */}
      <div className="px-[28px] flex-1">
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
          <p className="text-[11px] text-[#C4B8AC] mt-1.5">
            8 caractères minimum
          </p>
        </div>
      </div>

      {/* 5. BLOC BAS */}
      <div className="px-[28px] mt-auto pb-[40px]">
        {error && (
          <div className="bg-[#FAFAF8] rounded-[14px] p-3 text-[12px] font-semibold text-[#1A1A1A] mb-4 text-center">
            {error}
          </div>
        )}

        <button
          onClick={handleSignup}
          disabled={loading || !email || !password || password.length < 8}
          className={`w-full rounded-[16px] py-4 text-[15px] font-bold mb-2.5 transition-opacity ${
            loading || !email || !password || password.length < 8
              ? 'bg-[#E8E6E3] text-[#C4B8AC] cursor-not-allowed'
              : 'bg-[#047857] text-white active:opacity-80'
          }`}
        >
          {loading ? 'Création...' : 'Continuer →'}
        </button>

        <p className="text-[13px] text-[#A39887] text-center mt-4">
          Déjà membre ?{' '}
          <button 
            onClick={() => navigate('/login')}
            className="text-[#047857] font-bold transition-opacity active:opacity-80"
          >
            Se connecter
          </button>
        </p>
      </div>
      
    </div>
  );
}