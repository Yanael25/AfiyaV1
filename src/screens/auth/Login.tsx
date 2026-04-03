import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { signInWithEmail, getUserProfile } from '../../services/userService';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { motion } from 'motion/react';

export function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return;
    
    setLoading(true);
    setError(null);
    setMessage(null);
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

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Veuillez entrer votre adresse email pour réinitialiser le mot de passe.");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMessage("Un email de réinitialisation a été envoyé à votre adresse.");
    } catch (err: any) {
      setError("Erreur lors de l'envoi de l'email de réinitialisation.");
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
          <ArrowLeft size={18} strokeWidth={1.5} color="#6B6B6B" />
        </button>
      </div>
      
      {/* 2. HEADER */}
      <div className="px-[28px] pb-[28px] border-b border-[#F0EFED] mb-[32px] relative mt-[24px]">
        <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-[#047857] rounded-r-[4px]" />
        <div className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#047857] mb-3">
          AFIYA
        </div>
        <h1 className="font-display text-[32px] font-extrabold text-[#1A1A1A] tracking-tight leading-tight mb-2">
          Bon retour.
        </h1>
        <p className="text-[14px] font-medium text-[#A39887]">
          Connectez-vous pour accéder à votre espace.
        </p>
      </div>

      {/* 3. FORMULAIRE */}
      <div className="px-[28px] flex-1 flex flex-col justify-between">
        
        {/* CHAMPS */}
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
            <p 
              onClick={handleForgotPassword}
              className="text-right text-[13px] font-bold text-[#047857] mt-3 cursor-pointer transition-opacity active:opacity-80"
            >
              Mot de passe oublié ?
            </p>
          </div>
        </div>

        {/* BLOC BAS */}
        <div className="pb-[40px] mt-8">
          {error && (
            <div className="bg-[#FFF5F5] border border-[#FCA5A5] rounded-[16px] p-4 text-[13px] font-semibold text-[#DC2626] mb-5 text-center shadow-sm">
              {error}
            </div>
          )}
          {message && (
            <div className="bg-[#F0FDF4] border border-[#86EFAC] rounded-[16px] p-4 text-[13px] font-semibold text-[#047857] mb-5 text-center shadow-sm">
              {message}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading || !email || !password}
            className={`w-full rounded-[16px] py-[18px] text-[16px] font-bold mb-4 transition-all ${
              loading || !email || !password
                ? 'bg-[#E8E6E3] text-[#A39887] cursor-not-allowed'
                : 'bg-[#047857] text-white active:scale-[0.98] shadow-[0_8px_20px_rgba(4,120,87,0.25)]'
            }`}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>

          <p className="text-[14px] text-[#A39887] text-center mt-6">
            Pas encore de compte ?{' '}
            <button 
              onClick={() => navigate('/signup')}
              className="text-[#1A1A1A] font-bold transition-opacity active:opacity-80 underline decoration-[#F0EFED] underline-offset-4"
            >
              S'inscrire
            </button>
          </p>
        </div>
        
      </div>
    </motion.div>
  );
}