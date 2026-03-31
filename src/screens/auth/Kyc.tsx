import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { getUserProfile, updateProfile } from '../../services/userService';

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
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col font-sans">
      
      {/* 1. BOUTON RETOUR */}
      <div className="pt-[48px] px-[24px]">
        <button 
          onClick={() => navigate(-1)} 
          className="w-9 h-9 bg-white rounded-xl flex items-center justify-center transition-opacity active:opacity-80"
        >
          <ArrowLeft size={18} stroke="#6B6B6B" strokeWidth={1.5} />
        </button>
      </div>
      
      {/* 2. HEADER */}
      <div className="relative px-[28px] pb-[28px] border-b border-[#F0EFED] mb-[28px] mt-[24px]">
        <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-[#047857] rounded-r-[4px]" />
        <div className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#047857] mb-3">
          AFIYA
        </div>
        <h1 className="text-[26px] font-extrabold text-[#1A1A1A] tracking-tight leading-tight mb-1.5">
          Faisons connaissance.
        </h1>
        <p className="text-[13px] text-[#A39887]">
          Votre nom, c'est tout ce dont on a besoin pour commencer.
        </p>
      </div>

      {/* 3. INDICATEUR DE PROGRESSION */}
      <div className="px-[28px] mb-[28px]">
        <div className="flex gap-1.5">
          <div className="flex-1 h-1 rounded-full bg-[#047857]" />
          <div className="flex-1 h-1 rounded-full bg-[#047857] opacity-40" />
          <div className="flex-1 h-1 rounded-full bg-[#E8E6E3]" />
        </div>
      </div>

      {/* 4. AVATAR PREVIEW */}
      <div className="px-[28px] mb-[24px] flex flex-col items-center">
        <div className="w-14 h-14 bg-[#047857] rounded-[18px] flex items-center justify-center">
          <span className={`text-[20px] font-extrabold ${getInitials() === '?' ? 'text-[#C4B8AC]' : 'text-white'}`}>
            {getInitials()}
          </span>
        </div>
        <p className="text-[11px] text-[#C4B8AC] mt-2 italic text-center">
          Votre avatar se génère automatiquement
        </p>
      </div>

      {/* 5. FORMULAIRE */}
      <div className="px-[28px] flex-1 flex flex-col justify-between pb-[32px]">
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-[#A39887] mb-2 block">
              PRÉNOM
            </label>
            <input 
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="Fifamè"
              className="w-full bg-[#FFFFFF] border-none rounded-[14px] px-4 py-[14px] text-[15px] font-semibold text-[#1A1A1A] outline-none placeholder:text-[#C4B8AC] placeholder:font-normal" 
            />
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-[#A39887] mb-2 block">
              NOM DE FAMILLE
            </label>
            <input 
              type="text"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              placeholder="Dossou"
              className="w-full bg-[#FFFFFF] border-none rounded-[14px] px-4 py-[14px] text-[15px] font-semibold text-[#1A1A1A] outline-none placeholder:text-[#C4B8AC] placeholder:font-normal" 
            />
          </div>
        </div>

        <div className="mt-8">
          {error && (
            <div className="bg-[#FAFAF8] rounded-[14px] p-3 text-[12px] font-semibold text-[#1A1A1A] mb-4 text-center">
              {error}
            </div>
          )}

          <div className="bg-[#F0FDF4] rounded-[14px] p-3 flex items-start gap-2 mb-4">
            <div className="w-1.5 h-1.5 bg-[#047857] rounded-full mt-1 flex-shrink-0" />
            <p className="text-[11px] font-medium text-[#047857] leading-relaxed">
              Vos informations sont protégées et ne seront jamais partagées sans votre accord.
            </p>
          </div>

          <button
            onClick={handleKyc}
            disabled={loading || !firstName || !lastName}
            className={`w-full rounded-[16px] py-4 text-[15px] font-bold transition-opacity ${
              !firstName || !lastName || loading
                ? 'bg-[#E8E6E3] text-[#C4B8AC] cursor-not-allowed'
                : 'bg-[#047857] text-white active:opacity-80'
            }`}
          >
            {loading ? 'Enregistrement...' : "C'est parti →"}
          </button>
        </div>
      </div>
      
    </div>
  );
}