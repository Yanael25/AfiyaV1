import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';

export function Login() {
  const navigate = useNavigate();
  
  // States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Validation basique
  const isFormValid = email.trim() !== '' && password !== '';

  const handleLogin = async () => {
    if (!isFormValid) return;
    
    setLoading(true);
    setError(null);
    setMessage(null);
    
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      navigate('/home');
    } catch (err: any) {
      setError("Email ou mot de passe incorrect");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError("Veuillez entrer votre adresse email pour réinitialiser le mot de passe.");
      return;
    }
    
    setLoading(true);
    setError(null);
    setMessage(null);
    
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMessage("Un email de réinitialisation a été envoyé.");
    } catch (err: any) {
      setError("Erreur lors de l'envoi de l'email de réinitialisation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F4F0] pt-[52px] flex flex-col font-sans px-6">
      
      {/* HEADER */}
      <header>
        <button 
          onClick={() => navigate('/welcome')}
          className="w-[36px] h-[36px] bg-white rounded-[11px] border-[0.5px] border-[#EDECEA] flex items-center justify-center transition-transform active:scale-95"
        >
          <ArrowLeft size={14} className="text-[#6B6B6B]" strokeWidth={2} />
        </button>
        
        <h1 className="text-[26px] font-[800] text-[#1A1A1A] mt-[20px] leading-tight">
          Bon retour
        </h1>
        <p className="text-[14px] font-[500] text-[#A39887] mt-[6px]">
          Connectez-vous à votre compte
        </p>
      </header>

      {/* FORMULAIRE */}
      <div className="bg-white rounded-[20px] border-[0.5px] border-[#EDECEA] p-[20px] mt-[24px] flex flex-col gap-4">
        
        {/* Email */}
        <div className="flex flex-col">
          <label className="text-[9px] font-[700] uppercase text-[#A39887] tracking-[0.1em] mb-[6px]">
            EMAIL
          </label>
          <input 
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null); setMessage(null); }}
            placeholder="fifame.dossou@email.com"
            className="h-[48px] bg-[#F5F4F0] border border-[#EDECEA] rounded-[13px] px-[14px] text-[14px] font-[600] text-[#1A1A1A] placeholder:text-[#C4B8AC] placeholder:font-[500] focus:outline-none focus:bg-white focus:border-[#047857] focus:ring-[3px] focus:ring-[#047857]/10 transition-all"
          />
        </div>

        {/* Mot de passe */}
        <div className="flex flex-col">
          <div className="flex justify-between items-center mb-[6px]">
            <label className="text-[9px] font-[700] uppercase text-[#A39887] tracking-[0.1em]">
              MOT DE PASSE
            </label>
            <button 
              onClick={handleForgotPassword}
              className="text-[11px] font-[600] text-[#047857] active:opacity-70 transition-opacity"
            >
              Mot de passe oublié ?
            </button>
          </div>
          
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              placeholder="••••••••"
              className="w-full h-[48px] bg-[#F5F4F0] border border-[#EDECEA] rounded-[13px] pl-[14px] pr-[44px] text-[14px] font-[600] text-[#1A1A1A] placeholder:text-[#C4B8AC] placeholder:font-[500] focus:outline-none focus:bg-white focus:border-[#047857] focus:ring-[3px] focus:ring-[#047857]/10 transition-all"
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-0 top-0 bottom-0 px-[14px] flex items-center justify-center"
            >
              {showPassword ? (
                <EyeOff size={18} className="text-[#A39887]" />
              ) : (
                <Eye size={18} className="text-[#A39887]" />
              )}
            </button>
          </div>
        </div>

        {/* MESSAGE ERREUR */}
        {error && (
          <div className="bg-[#F5F4F0] border-l-[2px] border-[#92400E] rounded-r-[10px] py-[10px] px-[12px] flex items-center gap-2 mt-[4px]">
            <AlertCircle size={14} className="text-[#92400E] shrink-0" strokeWidth={2.5} />
            <span className="text-[12px] font-[600] text-[#92400E]">{error}</span>
          </div>
        )}

        {/* MESSAGE SUCCÈS (Réinitialisation) */}
        {message && (
          <div className="bg-[#F0FDF4] border-[0.5px] border-[#D1FAE5] rounded-[12px] py-[10px] px-[12px] flex items-center gap-2 mt-[4px]">
            <CheckCircle2 size={14} className="text-[#047857] shrink-0" strokeWidth={2.5} />
            <span className="text-[12px] font-[600] text-[#047857]">{message}</span>
          </div>
        )}

        {/* BOUTON SE CONNECTER */}
        <button
          onClick={handleLogin}
          disabled={!isFormValid || loading}
          className="w-full h-[52px] bg-[#047857] text-white rounded-[16px] text-[15px] font-[700] mt-[8px] flex items-center justify-center transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100"
        >
          {loading ? 'Connexion en cours...' : 'Se connecter'}
        </button>

      </div>

      {/* LIEN BAS */}
      <div className="mt-auto pb-[24px] text-center pt-8">
        <p className="text-[13px] font-[500] text-[#A39887]">
          Pas encore de compte ?{' '}
          <button 
            onClick={() => navigate('/signup')}
            className="text-[#047857] font-[700] active:opacity-70 transition-opacity"
          >
            S'inscrire
          </button>
        </p>
      </div>

    </div>
  );
}