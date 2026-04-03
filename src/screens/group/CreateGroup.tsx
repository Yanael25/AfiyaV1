import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Info, Check, Clock, Users, Coins, CalendarDays } from 'lucide-react';
import { formatXOF, getTierLimits, getTierCoeff } from '../../lib/utils';
import { auth } from '../../lib/firebase';
import { getUserProfile } from '../../services/userService';
import { createTontineGroup } from '../../services/tontineService';
import { Timestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

export function CreateGroup() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    contribution_amount: 50000,
    frequency: 'MONTHLY',
    target_members: 6,
    constitution_deadline: '',
  });

  useEffect(() => {
    const loadProfile = async () => {
      const user = auth.currentUser;
      if (user) {
        const p = await getUserProfile(user.uid);
        if (p) setProfile(p);
      }
    };
    loadProfile();
  }, []);

  const userTier = profile?.tier || 'BRONZE';
  const limits = getTierLimits(userTier);
  const cautionCoeff = getTierCoeff(userTier);

  const contribution = Number(formData.contribution_amount) || 0;
  const estimatedCaution = contribution * cautionCoeff;
  
  const isAmountError = contribution > 0 && contribution > limits.maxContrib;
  const isAmountTooLow = contribution > 0 && contribution < 5000;
  
  const canContinueToStep2 = 
    formData.name.trim().length >= 3 && 
    contribution >= 5000 && 
    !isAmountError &&
    formData.target_members >= 4 &&
    formData.target_members <= limits.maxMembers &&
    formData.constitution_deadline !== '';

  const handleNextStep = () => {
    setError(null);
    const selectedDate = new Date(formData.constitution_deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((selectedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)); 

    if (diffDays < 3 || diffDays > 30) {
      setError("La date limite doit être comprise entre 3 et 30 jours.");
      return;
    }
    setStep(2);
  };

  const handleCreate = async () => {
    setError(null);
    const user = auth.currentUser;
    if (!user) return;
    
    setLoading(true);
    try {
      const groupId = await createTontineGroup({
        name: formData.name.trim(),
        admin_id: user.uid,
        frequency: formData.frequency as any,
        contribution_amount: contribution,
        target_members: formData.target_members,
        currency: 'XOF',
        constitution_deadline: Timestamp.fromDate(new Date(formData.constitution_deadline)),
      }, user.uid);
      
      navigate(`/group/${groupId}`);
    } catch (e: any) {
      setError(e.message || "Une erreur est survenue");
      setLoading(false);
    }
  };

  const cleanAmount = (val: number) => {
    return formatXOF(val).replace(/\s?FCFA/gi, '').trim();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="min-h-screen bg-[#FAFAF8] font-sans pb-10"
    >
      
      {/* TOP BAR */}
      <div className="pt-[60px] px-6 mb-6 flex items-start gap-4">
        <button 
          onClick={() => step === 2 ? setStep(1) : navigate(-1)}
          className="w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-sm border border-[#F0EFED] transition-transform active:scale-95"
        >
          <ArrowLeft size={20} stroke="#1A1A1A" strokeWidth={1.5} />
        </button>
        <div className="pt-1">
          <h1 className="font-display text-[28px] font-bold text-[#1A1A1A] tracking-tight mb-1 leading-none">Créer un cercle</h1>
          <p className="text-[14px] font-medium text-[#A39887] mt-1.5">
            {step === 1 ? "Définissez les règles" : "Vérifiez et confirmez"}
          </p>
        </div>
      </div>

      {/* TABS */}
      <div className="bg-[#F0EFED]/50 rounded-[16px] p-1.5 mx-6 mb-6 flex gap-1.5">
        <button className="bg-white text-[#1A1A1A] text-[14px] font-bold flex-1 py-3 rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          Cercle privé
        </button>
        <button className="bg-transparent text-[#A39887] text-[14px] font-bold flex-1 py-3 rounded-[12px] cursor-not-allowed flex items-center justify-center transition-colors">
          Cercle public
          <span className="bg-[#E8E6E3] text-[#6B6B6B] text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-[8px] ml-2">Bientôt</span>
        </button>
      </div>

      {/* INDICATEUR 2 ÉTAPES */}
      <div className="flex items-start justify-center mx-6 mb-8">
        <div className="flex flex-col items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold shadow-sm ${step === 2 ? 'bg-[#047857] text-white' : 'bg-[#047857] text-white'}`}>
            {step === 2 ? <Check size={16} strokeWidth={2.5} /> : "1"}
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#047857] mt-2">Règles</span>
        </div>
        <div className={`h-[2px] w-[80px] mt-4 flex-shrink-0 transition-colors duration-300 ${step === 2 ? 'bg-[#047857]' : 'bg-[#F0EFED]'}`} />
        <div className="flex flex-col items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold transition-colors duration-300 ${step === 2 ? 'bg-[#047857] text-white shadow-sm' : 'bg-white border-2 border-[#F0EFED] text-[#C4B8AC]'}`}>
            2
          </div>
          <span className={`text-[11px] font-bold uppercase tracking-wider mt-2 transition-colors duration-300 ${step === 2 ? 'text-[#047857]' : 'text-[#C4B8AC]'}`}>Confirmation</span>
        </div>
      </div>

      {error && (
        <div className="mx-6 mb-6 bg-[#FFF5F5] border border-[#EF4444]/20 rounded-[16px] p-4 text-[13px] font-medium text-[#EF4444] flex items-start gap-3">
          <Info size={18} className="shrink-0 mt-0.5" />
          <p className="leading-relaxed">{error}</p>
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-4 mx-6"
          >
            {/* CARD NOM */}
          <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-[#F0EFED]">
            <label className="block text-[11px] font-bold text-[#A39887] uppercase tracking-[0.1em] mb-3">NOM DU CERCLE</label>
            <input 
              type="text"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="Ex : Famille Dossou, Amis du bureau..."
              className="w-full bg-[#FAFAF8] border border-[#F0EFED] focus:border-[#047857] focus:ring-1 focus:ring-[#047857] rounded-[16px] px-5 py-4 text-[15px] font-semibold text-[#1A1A1A] outline-none transition-all placeholder:text-[#C4B8AC]"
            />
          </div>

          {/* CARD COTISATION & FRÉQUENCE */}
          <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-[#F0EFED]">
            <label className="block text-[11px] font-bold text-[#A39887] uppercase tracking-[0.1em] mb-4">FRÉQUENCE DES PAIEMENTS</label>
            <div className="flex flex-col gap-3 mb-6">
              {[
                { id: 'WEEKLY', title: 'Hebdomadaire', desc: 'Paiement chaque semaine', icon: <Clock size={20} /> },
                { id: 'MONTHLY', title: 'Mensuel', desc: 'Paiement chaque mois', icon: <CalendarDays size={20} /> },
                { id: 'QUARTERLY', title: 'Trimestriel', desc: 'Paiement tous les 3 mois', icon: <Calendar size={20} /> }
              ].map((f) => (
                <div
                  key={f.id}
                  onClick={() => setFormData({...formData, frequency: f.id})}
                  className={`flex items-center gap-4 p-4 rounded-[16px] cursor-pointer transition-all border ${
                    formData.frequency === f.id 
                      ? 'bg-[#F0FDF4] border-[#047857] shadow-[0_4px_12px_rgba(4,120,87,0.05)]' 
                      : 'bg-[#FAFAF8] border-[#F0EFED] hover:border-[#047857]/30'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    formData.frequency === f.id ? 'bg-[#047857] text-white' : 'bg-white text-[#A39887] shadow-sm'
                  }`}>
                    {f.icon}
                  </div>
                  <div className="flex-1">
                    <div className={`text-[15px] font-bold ${formData.frequency === f.id ? 'text-[#047857]' : 'text-[#1A1A1A]'}`}>
                      {f.title}
                    </div>
                    <div className="text-[13px] font-medium text-[#A39887]">{f.desc}</div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    formData.frequency === f.id ? 'border-[#047857]' : 'border-[#D6D0C4]'
                  }`}>
                    {formData.frequency === f.id && <div className="w-2.5 h-2.5 rounded-full bg-[#047857]" />}
                  </div>
                </div>
              ))}
            </div>

            <label className="block text-[11px] font-bold text-[#A39887] uppercase tracking-[0.1em] mb-4">MONTANT DE LA COTISATION</label>
            <div className={`flex flex-col items-center justify-center bg-[#FAFAF8] border rounded-[16px] p-6 mb-4 transition-all ${isAmountError ? 'border-[#EF4444] bg-[#FFF5F5]' : 'border-[#F0EFED]'}`}>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="font-display text-[32px] font-bold text-[#1A1A1A] tracking-tight">
                  {cleanAmount(contribution)}
                </span>
                <span className="text-[14px] font-bold text-[#A39887]">FCFA</span>
              </div>
              <div className="text-[13px] font-medium text-[#A39887]">par membre / {formData.frequency === 'WEEKLY' ? 'semaine' : formData.frequency === 'MONTHLY' ? 'mois' : 'trimestre'}</div>
            </div>
            
            <div className="px-2 mb-2">
              <input 
                type="range" 
                min="5000" 
                max={limits.maxContrib} 
                step="5000"
                value={contribution}
                onChange={(e) => setFormData({...formData, contribution_amount: Number(e.target.value)})}
                className="w-full h-2 bg-[#F0EFED] rounded-lg appearance-none cursor-pointer accent-[#047857]"
              />
              <div className="flex justify-between text-[11px] font-bold text-[#A39887] mt-2">
                <span>5 000</span>
                <span>{cleanAmount(limits.maxContrib)} Max</span>
              </div>
            </div>

            {isAmountError && (
              <p className="text-[12px] font-medium text-[#EF4444] mt-3 flex items-start gap-2">
                <Info size={14} className="shrink-0 mt-0.5" />
                <span>Votre tier {userTier} limite la cotisation à {formatXOF(limits.maxContrib)}.</span>
              </p>
            )}
          </div>

          {/* CARD MEMBRES */}
          <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-[#F0EFED]">
            <label className="block text-[11px] font-bold text-[#A39887] uppercase tracking-[0.1em] mb-4">NOMBRE DE MEMBRES</label>
            
            <div className="flex flex-col items-center justify-center bg-[#FAFAF8] border border-[#F0EFED] rounded-[16px] p-6 mb-4">
              <div className="flex items-center gap-3 mb-1">
                <Users size={24} className="text-[#047857]" strokeWidth={1.5} />
                <span className="font-display text-[32px] font-bold text-[#1A1A1A] tracking-tight">{formData.target_members}</span>
              </div>
              <div className="text-[13px] font-medium text-[#A39887]">participants au total</div>
            </div>

            <div className="px-2 mb-2">
              <input 
                type="range" 
                min="4" 
                max={limits.maxMembers} 
                step="1"
                value={formData.target_members}
                onChange={(e) => setFormData({...formData, target_members: Number(e.target.value)})}
                className="w-full h-2 bg-[#F0EFED] rounded-lg appearance-none cursor-pointer accent-[#047857]"
              />
              <div className="flex justify-between text-[11px] font-bold text-[#A39887] mt-2">
                <span>4 min</span>
                <span>{limits.maxMembers} max</span>
              </div>
            </div>
          </div>

          {/* CARD DATE LIMITE */}
          <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-[#F0EFED]">
            <label className="block text-[11px] font-bold text-[#A39887] uppercase tracking-[0.1em] mb-3">DATE LIMITE DE CONSTITUTION</label>
            <div className="relative flex justify-between items-center bg-[#FAFAF8] rounded-[16px] px-5 py-4 border border-[#F0EFED] focus-within:border-[#047857] focus-within:ring-1 focus-within:ring-[#047857] transition-all cursor-pointer">
              <span className={`text-[15px] font-semibold ${formData.constitution_deadline ? 'text-[#1A1A1A]' : 'text-[#C4B8AC]'}`}>
                {formData.constitution_deadline ? new Date(formData.constitution_deadline).toLocaleDateString('fr-FR') : "Choisir une date"}
              </span>
              <Calendar size={20} className="text-[#A39887]" strokeWidth={1.5} />
              <input 
                type="date" 
                value={formData.constitution_deadline}
                onChange={e => setFormData({...formData, constitution_deadline: e.target.value})}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
            </div>
          </div>

          {/* NOTE TIRAGE */}
          <div className="bg-[#F0FDF4] rounded-[20px] p-5 flex items-start gap-4 border border-[#047857]/10">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
              <Clock size={16} className="text-[#047857]" strokeWidth={2} />
            </div>
            <p className="text-[13px] font-medium text-[#047857] leading-relaxed pt-0.5">
              <strong className="font-bold">Tirage automatique</strong> — Les positions seront tirées au sort dès que tous les membres auront rejoint.
            </p>
          </div>

          <div className="mt-4 mb-8">
            <button
              onClick={handleNextStep}
              disabled={!canContinueToStep2}
              className={`w-full rounded-[20px] py-4.5 text-[15px] font-bold transition-all duration-300 ${canContinueToStep2 ? 'bg-[#047857] text-white shadow-[0_8px_20px_rgba(4,120,87,0.25)] active:scale-[0.98]' : 'bg-[#E8E6E3] text-[#A39887] cursor-not-allowed'}`}
            >
              Continuer
            </button>
          </div>
          </motion.div>
        ) : (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-4 mx-6"
          >
            {/* RÉCAPITULATIF */}
          <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-[#F0EFED]">
            <label className="block text-[11px] font-bold text-[#A39887] uppercase tracking-[0.1em] mb-4">RÉCAPITULATIF</label>
            <div className="flex flex-col gap-4">
              {[
                { l: 'Nom', v: formData.name },
                { l: 'Cotisation', v: `${cleanAmount(contribution)} FCFA / ${formData.frequency === 'WEEKLY' ? 'hebdo' : formData.frequency === 'MONTHLY' ? 'mois' : 'trim'}` },
                { l: 'Membres cible', v: `${formData.target_members} membres` },
                { l: 'Date limite', v: new Date(formData.constitution_deadline).toLocaleDateString('fr-FR') },
                { l: 'Tirage', v: 'Automatique' }
              ].map((row, i) => (
                <div key={i} className="flex justify-between items-center pb-4 border-b border-[#F0EFED] last:border-0 last:pb-0">
                  <span className="text-[14px] font-medium text-[#A39887]">{row.l}</span>
                  <span className="text-[14px] font-bold text-[#1A1A1A]">{row.v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* PAIEMENT */}
          <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-[#F0EFED]">
            <label className="block text-[11px] font-bold text-[#A39887] uppercase tracking-[0.1em] mb-4">PAIEMENT REQUIS AUJOURD'HUI</label>
            
            <div className="flex flex-col gap-3 mb-4">
              <div className="bg-[#FAFAF8] rounded-[16px] p-4 border border-[#F0EFED]">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[13px] font-medium text-[#6B6B6B]">Caution bloquée</span>
                  <span className="font-display text-[16px] font-bold text-[#1A1A1A]">{cleanAmount(estimatedCaution)} <span className="text-[12px] font-bold text-[#A39887] font-sans">FCFA</span></span>
                </div>
                <p className="text-[11px] font-medium text-[#A39887]">Sera ajustée selon votre position de tirage</p>
              </div>
              
              <div className="bg-[#FAFAF8] rounded-[16px] p-4 border border-[#F0EFED] flex justify-between items-center">
                <span className="text-[13px] font-medium text-[#6B6B6B]">1ère cotisation</span>
                <span className="font-display text-[16px] font-bold text-[#1A1A1A]">{cleanAmount(contribution)} <span className="text-[12px] font-bold text-[#A39887] font-sans">FCFA</span></span>
              </div>
            </div>

            <div className="bg-[#F0FDF4] rounded-[20px] p-5 flex justify-between items-center border border-[#047857]/10">
              <span className="text-[15px] font-bold text-[#047857]">Total à payer</span>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-[24px] font-bold text-[#047857] tracking-tight">{cleanAmount(estimatedCaution + contribution)}</span>
                <span className="text-[14px] font-bold text-[#047857]">FCFA</span>
              </div>
            </div>
            
            <p className="text-[12px] font-medium text-[#A39887] text-center mt-4 leading-relaxed px-2">
              Fonds sécurisés en escrow. Restitués intégralement si le cercle ne se forme pas.
            </p>
          </div>

          <div className="mt-4 mb-8">
            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full bg-[#047857] text-white rounded-[20px] py-4.5 text-[15px] font-bold flex items-center justify-center shadow-[0_8px_20px_rgba(4,120,87,0.25)] active:scale-[0.98] transition-all duration-300"
            >
              {loading ? (
                <div className="w-6 h-6 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Payer et créer le cercle"
              )}
            </button>
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}