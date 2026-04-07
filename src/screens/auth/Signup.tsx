import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const db = getFirestore();

export function Signup() {
  const navigate = useNavigate();
  
  // States
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Vérification si le formulaire est rempli
  const isFormValid = firstName.trim() !== '' && lastName.trim() !== '' && email.trim() !== '' && password !== '';

  // Logique de force du mot de passe
  const getPasswordStrength = () => {
    if (!password) return 0;
    if (password.length < 8) return 1; // Faible
    if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) return 3; // Fort
    return 2; // Moyen
  };

  const strength = getPasswordStrength();

  // Logique de création de compte
  const handleSignup = async () => {
    if (!isFormValid) return;
    
    setLoading(true);
    setError(null);

    try {
      // 1. Création utilisateur Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // 2. Création du profil Firestore (snake_case obligatoire)
      await setDoc(doc(db, 'profiles', user.uid), {
        full_name: `${firstName.trim()} ${lastName.trim()}`,
        email: email.trim(),
        score_afiya: 50,
        tier: 'BRONZE',
        kyc_status: 'PENDING',
        created_at: serverTimestamp()
      });

      // 3. Création des 3 wallets avec balance à 0
      const walletTypes = ['USER_MAIN', 'USER_CERCLES', 'USER_CAPITAL'];
      
      // On utilise Promise.all pour exécuter les créations en parallèle
      await Promise.all(
        walletTypes.map(type => 
          setDoc(doc(db, 'wallets', `${user.uid}_${type}`), {
            user_id: user.uid,
            wallet_type: type,
            balance: 0,
            created_at: serverTimestamp()
          })
        )
      );

      // 4. Navigation vers /home après succès
      navigate('/home');

    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError("Cet email est déjà utilisé.");
      } else if (err.code === 'auth/invalid-email') {
        setError("Format d'email invalide.");
      } else {
        setError("Une erreur est survenue lors de l'inscription.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F4F0] pt-[52px] pb-[24px] px-6 font-sans flex flex-col">
      
      {/* HEADER */}
      <header>
        <button 
          onClick={() => navigate('/welcome')}
          className="w-[36px] h-[36px] rounded-[11px] bg-white border-[0.5px] border-[#EDECEA] flex items-center justify-center active:scale-95 transition-transform"
        >
          <ArrowLeft size={14} className="text-[#6B6B6B]" />
        </button>
        
        <h1 className="text-[26px] font-[800] text-[#1A1A1A] mt-[20px] leading-tight">
          Créer un compte
        </h1>
        <p className="text-[14px] font-[500] text-[#A39887] mt-[6px]">
          Rejoignez la communauté Afiya
        </p>
      </header>

      {/* Message d'erreur éventuel */}
      {error && (
        <div className="mt-4 p-3 bg-[#FEF2F2] border-l-2 border-[#92400E] text-[#92400E] text-[13px] font-[600] rounded-r-[8px]">
          {error}
        </div>
      )}

      {/* FORMULAIRE */}
      <div className="bg-white rounded-[20px] border-[0.5px] border-[#EDECEA] p-[20px] mt-[24px] flex flex-col gap-4 shadow-sm">
        
        {/* Prénom */}
        <div className="flex flex-col">
          <label className="text-[9px] font-[700] uppercase text-[#A39887] tracking-[0.1em] mb-[6px]">
            PRÉNOM
          </label>
          <input 
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Ex: Fifamè"
            className="h-[48px] bg-[#F5F4F0] border border-[#EDECEA] rounded-[13px] px-[14px] text-[14px] font-[600] text-[#1A1A1A] placeholder:text-[#C4B8AC] placeholder:font-[500] focus:outline-none focus:bg-white focus:border-[#047857] focus:ring-[3px] focus:ring-[#047857]/10 transition-all"
          />
        </div>

        {/* Nom de famille */}
        <div className="flex flex-col">
          <label className="text-[9px] font-[700] uppercase text-[#A39887] tracking-[0.1em] mb-[6px]">
            NOM DE FAMILLE
          </label>
          <input 
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Ex: Dossou"
            className="h-[48px] bg-[#F5F4F0] border border-[#EDECEA] rounded-[13px] px-[14px] text-[14px] font-[600] text-[#1A1A1A] placeholder:text-[#C4B8AC] placeholder:font-[500] focus:outline-none focus:bg-white focus:border-[#047857] focus:ring-[3px] focus:ring-[#047857]/10 transition-all"
          />
        </div>

        {/* Email */}
        <div className="flex flex-col">
          <label className="text-[9px] font-[700] uppercase text-[#A39887] tracking-[0.1em] mb-[6px]">
            EMAIL
          </label>
          <input 
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="fifame.dossou@email.com"
            className="h-[48px] bg-[#F5F4F0] border border-[#EDECEA] rounded-[13px] px-[14px] text-[14px] font-[600] text-[#1A1A1A] placeholder:text-[#C4B8AC] placeholder:font-[500] focus:outline-none focus:bg-white focus:border-[#047857] focus:ring-[3px] focus:ring-[#047857]/10 transition-all"
          />
        </div>

        {/* Mot de passe */}
        <div className="flex flex-col">
          <label className="text-[9px] font-[700] uppercase text-[#A39887] tracking-[0.1em] mb-[6px]">
            MOT DE PASSE
          </label>
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
          
          {/* Indicateur de force */}
          <div className="flex gap-[4px] mt-[8px]">
            <div className={`h-[4px] flex-1 rounded-[2px] transition-colors duration-300 ${strength >= 1 ? (strength === 1 ? 'bg-[#EF4444]' : strength === 2 ? 'bg-[#F59E0B]' : 'bg-[#047857]') : 'bg-[#EDECEA]'}`} />
            <div className={`h-[4px] flex-1 rounded-[2px] transition-colors duration-300 ${strength >= 2 ? (strength === 2 ? 'bg-[#F59E0B]' : 'bg-[#047857]') : 'bg-[#EDECEA]'}`} />
            <div className={`h-[4px] flex-1 rounded-[2px] transition-colors duration-300 ${strength >= 3 ? 'bg-[#047857]' : 'bg-[#EDECEA]'}`} />
          </div>
        </div>

        {/* Bouton de soumission */}
        <button
          onClick={handleSignup}
          disabled={!isFormValid || loading}
          className="w-full h-[52px] bg-[#047857] text-white rounded-[16px] text-[15px] font-[700] mt-[8px] transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center"
        >
          {loading ? 'Création en cours...' : 'Créer mon compte'}
        </button>

      </div>

      {/* LIEN BAS */}
      <div className="mt-auto pt-6 text-center">
        <p className="text-[13px] font-[500] text-[#A39887]">
          Déjà un compte ?{' '}
          <button 
            onClick={() => navigate('/login')}
            className="text-[#047857] font-[700] active:opacity-70 transition-opacity"
          >
            Se connecter
          </button>
        </p>
      </div>

    </div>
  );
}