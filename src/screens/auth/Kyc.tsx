import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { getUserProfile, updateProfile } from '../../services/userService';
import { motion } from 'motion/react';

export function Kyc() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      const user = auth.currentUser;
      if (user) {
        const profile = await getUserProfile(user.uid);
        if (profile && profile.full_name) {
          const parts = profile.full_name.split(' ');
          setFirstName(parts[0] || '');
          setLastName(parts.slice(1).join(' ') || '');
        }
      }
    };
    loadProfile();
  }, []);

  const getInitials = () => {
    const f = firstName.charAt(0).toUpperCase();
    const l = lastName.charAt(0).toUpperCase();
    return f || l ? `${f}${l}` : '?';
  };

  const handleKyc = async () => {
    if (!firstName || !lastName) return;
    
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Non connecté");

      await updateProfile(user.uid, {
        full_name: `${firstName} ${lastName}`.trim(),
        kyc_status: 'PENDING',
      });
      navigate('/home'); // Modifié selon les consignes du prompt (au lieu de /kyc-step-3)
    } catch (e: any) {
      setError(e.message || "Une erreur est survenue");
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
      <div className="pt-[48px] px-[24px]">
        <button 
          onClick={() => navigate(-1)} 
          className="w-9 h-9 bg-white rounded-xl flex items-center justify-center transition-opacity active:opacity-80 shadow-sm border border-[#F0EFED]"
        >
          <ArrowLeft size={18} stroke="#1A1A1A" strokeWidth={1.5} />
        </button>
      </div>
      
      {/* 2. HEADER */}
      <div className="relative px-[28px] pb-[28px] border-b border-[#F0EFED] mb-[28px] mt-[24px]">
        <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-[#047857] rounded-r-[4px]" />
        <div className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#047857] mb-3">
          AFIYA
        </div>
        <h1 className="font-display text-[32px] font-extrabold text-[#1A1A1A] tracking-tight leading-tight mb-2">
          Faisons connaissance.
        </h1>
        <p className="text-[14px] font-medium text-[#A39887]">
          Votre nom, c'est tout ce dont on a besoin pour commencer.
        </p>
      </div>

      {/* 3. INDICATEUR DE PROGRESSION */}
      <div className="px-[28px] mb-[32px]">
        <div className="flex gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-[#047857]" />
          <div className="flex-1 h-1.5 rounded-full bg-[#047857] opacity-40" />
          <div className="flex-1 h-1.5 rounded-full bg-[#E8E6E3]" />
        </div>
      </div>

      {/* 4. AVATAR PREVIEW */}
      <div className="px-[28px] mb-[32px] flex flex-col items-center">
        <div className="w-16 h-16 bg-[#047857] rounded-[20px] flex items-center justify-center shadow-[0_8px_20px_rgba(4,120,87,0.25)]">
          <span className={`text-[24px] font-extrabold ${getInitials() === '?' ? 'text-white/50' : 'text-white'}`}>
            {getInitials()}
          </span>
        </div>
        <p className="text-[12px] font-medium text-[#A39887] mt-3 text-center">
          Votre avatar se génère automatiquement
        </p>
      </div>

      {/* 5. FORMULAIRE */}
      <div className="px-[28px] flex-1 flex flex-col justify-between pb-[40px]">
        <div className="space-y-6">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-[#A39887] mb-2.5 ml-1">
              PRÉNOM
            </label>
            <input 
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="Fifamè"
              className="w-full bg-white border border-[#F0EFED] rounded-[16px] px-5 py-[18px] text-[15px] font-semibold text-[#1A1A1A] outline-none placeholder:text-[#C4B8AC] placeholder:font-normal focus:border-[#047857] focus:ring-4 focus:ring-[#047857]/10 transition-all shadow-sm" 
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-[#A39887] mb-2.5 ml-1">
              NOM DE FAMILLE
            </label>
            <input 
              type="text"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              placeholder="Dossou"
              className="w-full bg-white border border-[#F0EFED] rounded-[16px] px-5 py-[18px] text-[15px] font-semibold text-[#1A1A1A] outline-none placeholder:text-[#C4B8AC] placeholder:font-normal focus:border-[#047857] focus:ring-4 focus:ring-[#047857]/10 transition-all shadow-sm" 
            />
          </div>
        </div>

        <div className="mt-8">
          {error && (
            <div className="bg-[#FFF5F5] border border-[#FCA5A5] rounded-[16px] p-4 text-[13px] font-semibold text-[#DC2626] mb-5 text-center shadow-sm">
              {error}
            </div>
          )}

          <div className="flex items-center gap-2 mb-6 ml-1">
            <ShieldCheck size={16} className="text-[#047857]" />
            <p className="text-[12px] font-medium text-[#047857]">
              Vos données sont chiffrées selon les standards bancaires.
            </p>
          </div>

          <button
            onClick={handleKyc}
            disabled={loading || !firstName || !lastName}
            className={`w-full rounded-[16px] py-[18px] text-[16px] font-bold transition-all ${
              !firstName || !lastName || loading
                ? 'bg-[#E8E6E3] text-[#A39887] cursor-not-allowed'
                : 'bg-[#047857] text-white active:scale-[0.98] shadow-[0_8px_20px_rgba(4,120,87,0.25)]'
            }`}
          >
            {loading ? 'Enregistrement...' : "C'est parti"}
          </button>
        </div>
      </div>
      
    </motion.div>
  );
}