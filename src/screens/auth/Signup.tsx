import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Eye, EyeOff } from 'lucide-react';
import { signUpWithEmail } from '../../services/userService';
import { motion } from 'motion/react';

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
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: -20 }} 
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="min-h-screen bg-[#FAFAF8] flex flex-col font-sans"
    >
      
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
        <h1 className="font-display text-[32px] font-extrabold text-[#1A1A1A] tracking-tight leading-tight mb-2">
          Créons votre compte.
        </h1>
        <p className="text-[14px] font-medium text-[#A39887]">
          Ça prend moins de 2 minutes.
        </p>
      </div>

      {/* 3. INDICATEUR DE PROGRESSION */}
      <div className="px-[28px] mb-[32px] flex gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-[#047857]" />
        <div className="flex-1 h-1.5 rounded-full bg-[#E8E6E3]" />
      </div>

      {/* 4. FORMULAIRE */}
      <div className="px-[28px] flex-1 flex flex-col justify-between">
        <div>
          <div className="mb-6">
            <label className="block text-[11px] font-bold uppercase tracking-widest text-[#A39887] mb-2.5 ml-1">
              ADRESSE EMAIL
            </label>
            <input 
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(null); }}
              placeholder="fifame.dossou@gmail.com"
              className="w-full bg-white border border-[#F0EFED] rounded-[16px] px-5 py-[18px] text-[15px] font-semibold text-[#1A1A1A] outline-none placeholder:text-[#C4B8AC] placeholder:font-normal focus:border-[#047857] focus:ring-4 focus:ring-[#047857]/10 transition-all shadow-sm"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-[#A39887] mb-2.5 ml-1">
              MOT DE PASSE
            </label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(null); }}
                placeholder="••••••••"
                className="w-full bg-white border border-[#F0EFED] rounded-[16px] pl-5 pr-14 py-[18px] text-[15px] font-semibold text-[#1A1A1A] outline-none placeholder:text-[#C4B8AC] placeholder:font-normal focus:border-[#047857] focus:ring-4 focus:ring-[#047857]/10 transition-all shadow-sm"
              />
              <button 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-5 flex items-center transition-opacity active:opacity-80"
              >
                {showPassword ? (
                  <EyeOff size={20} strokeWidth={1.5} color="#A39887" />
                ) : (
                  <Eye size={20} strokeWidth={1.5} color="#A39887" />
                )}
              </button>
            </div>
            <p className="text-[12px] font-medium text-[#A39887] mt-3 ml-1">
              8 caractères minimum
            </p>
          </div>
        </div>

        {/* 5. BLOC BAS */}
        <div className="mt-auto pb-[40px] pt-8">
          {error && (
            <div className="bg-[#FFF5F5] border border-[#FCA5A5] rounded-[16px] p-4 text-[13px] font-semibold text-[#DC2626] mb-5 text-center shadow-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleSignup}
            disabled={loading || !email || !password || password.length < 8}
            className={`w-full rounded-[16px] py-[18px] text-[16px] font-bold mb-4 transition-all ${
              loading || !email || !password || password.length < 8
                ? 'bg-[#E8E6E3] text-[#A39887] cursor-not-allowed'
                : 'bg-[#047857] text-white active:scale-[0.98] shadow-[0_8px_20px_rgba(4,120,87,0.25)]'
            }`}
          >
            {loading ? 'Création...' : 'Continuer'}
          </button>

          <p className="text-[14px] text-[#A39887] text-center mt-6">
            Déjà membre ?{' '}
            <button 
              onClick={() => navigate('/login')}
              className="text-[#1A1A1A] font-bold transition-opacity active:opacity-80 underline decoration-[#F0EFED] underline-offset-4"
            >
              Se connecter
            </button>
          </p>
        </div>
      </div>
      
    </motion.div>
  );
}