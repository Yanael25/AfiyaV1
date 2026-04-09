import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Lock, AlertCircle } from 'lucide-react';
import { formatXOF, getTierLimits, getTierCoeff } from '../../lib/utils';
import { auth } from '../../lib/firebase';
import { getUserProfile } from '../../services/userService';
import { createTontineGroup } from '../../services/tontineService';
import { Timestamp } from 'firebase/firestore';

export function CreateGroup() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  
  const defaultDeadline = new Date();
  defaultDeadline.setDate(defaultDeadline.getDate() + 14);
  const defaultDeadlineStr = defaultDeadline.toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    name: '',
    contribution_amount: 50000,
    frequency: 'MONTHLY',
    target_members: 6,
    constitution_deadline: defaultDeadlineStr,
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
  
  // Calcul du % de frais selon le tier
  const feePercent = userTier === 'BRONZE' ? 3 : userTier === 'SILVER' ? 2.5 : userTier === 'GOLD' ? 2 : 1.5;

  const contribution = Number(formData.contribution_amount) || 0;
  const estimatedCaution = contribution * cautionCoeff;
  const totalCagnotte = contribution * formData.target_members;
  
  const isAmountError = contribution > 0 && contribution > limits.maxContrib;
  const isAmountTooLow = contribution > 0 && contribution < 5000;
  const isMembersError = formData.target_members < 4 || formData.target_members > limits.maxMembers;
  
  const canContinueToStep2 = 
    formData.name.trim().length >= 3 && 
    contribution >= 5000 && 
    !isAmountError &&
    !isMembersError;

  const handleCreate = async () => {
    setError(null);
    const user = auth.currentUser;
    if (!user) return;
    
    setLoading(true);
    try {
      const deadlineDate = new Date(formData.constitution_deadline);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const minDate = new Date(today);
      minDate.setDate(minDate.getDate() + 3);
      const maxDate = new Date(today);
      maxDate.setDate(maxDate.getDate() + 30);

      if (deadlineDate < minDate || deadlineDate > maxDate) {
        setError('La date limite doit être entre J+3 et J+30');
        setLoading(false);
        return;
      }

      const groupId = await createTontineGroup({
        name: formData.name.trim(),
        admin_id: user.uid,
        frequency: formData.frequency as any,
        contribution_amount: contribution,
        target_members: formData.target_members,
        currency: 'XOF',
        constitution_deadline: Timestamp.fromDate(deadlineDate),
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
    <div className="min-h-screen bg-[#F5F4F0] font-sans pt-[52px] pb-[40px] flex flex-col">
      
      {/* HEADER */}
      <div className="px-6 flex items-center gap-3 mb-6">
        <button 
          onClick={() => step === 2 ? setStep(1) : navigate(-1)}
          className="w-[36px] h-[36px] bg-white rounded-[11px] border-[0.5px] border-[#EDECEA] flex items-center justify-center active:scale-95 transition-transform shrink-0"
        >
          <ArrowLeft size={16} className="text-[#6B6B6B]" strokeWidth={2} />
        </button>
        <div className="flex flex-col">
          <h1 className="text-[15px] font-[800] text-[#1A1A1A] leading-tight">Créer un cercle</h1>
          <p className="text-[10px] font-[500] text-[#A39887] leading-tight">
            Étape {step} sur 2
          </p>
        </div>
      </div>

      {/* STEPPER VISUEL */}
      <div className="mx-[16px] mb-6 flex items-center justify-center">
        {/* Step 1 */}
        <div className="flex flex-col items-center">
          <div className={`w-[24px] h-[24px] rounded-full flex items-center justify-center text-[11px] font-[700] transition-colors ${step === 1 ? 'bg-[#047857] text-white' : 'bg-[#D1FAE5] text-[#047857]'}`}>
            {step === 1 ? '1' : <Check size={12} strokeWidth={3} />}
          </div>
          <span className="text-[10px] font-[700] mt-[4px] text-[#047857]">Paramètres</span>
        </div>
        
        {/* Connecteur */}
        <div className={`h-[1px] w-[50px] mx-2 -mt-[14px] transition-colors ${step === 2 ? 'bg-[#047857]' : 'bg-[#EDECEA]'}`} />
        
        {/* Step 2 */}
        <div className="flex flex-col items-center">
          <div className={`w-[24px] h-[24px] rounded-full flex items-center justify-center text-[11px] font-[700] transition-colors ${step === 2 ? 'bg-[#047857] text-white' : 'bg-[#F0EFED] text-[#A39887]'}`}>
            2
          </div>
          <span className={`text-[10px] font-[700] mt-[4px] transition-colors ${step === 2 ? 'text-[#047857]' : 'text-[#A39887]'}`}>Confirmation</span>
        </div>
      </div>

      {/* CONTENU */}
      <div className="px-6 flex-1 flex flex-col">
        {error && (
          <div className="bg-[#F5F4F0] border-l-[2px] border-[#92400E] rounded-r-[10px] py-[10px] px-[12px] flex items-center gap-2 mb-[16px]">
            <AlertCircle size={14} className="text-[#92400E] shrink-0" strokeWidth={2.5} />
            <span className="text-[11px] font-[600] text-[#92400E] leading-snug">{error}</span>
          </div>
        )}

        {step === 1 ? (
          // --- ÉTAPE 1 ---
          <>
            <div className="bg-white rounded-[16px] border-[0.5px] border-[#EDECEA] p-[14px] flex flex-col gap-5 shadow-sm">
              
              {/* Nom */}
              <div className="flex flex-col">
                <label className="text-[9px] font-[700] uppercase text-[#A39887] tracking-[0.1em] mb-[6px]">
                  NOM DU CERCLE
                </label>
                <input 
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Ex : Projet Vacances..."
                  className="h-[48px] bg-[#F5F4F0] border border-[#EDECEA] rounded-[13px] px-[14px] text-[14px] font-[600] text-[#1A1A1A] placeholder:text-[#C4B8AC] placeholder:font-[500] focus:outline-none focus:bg-white focus:border-[#047857] focus:shadow-[0_0_0_3px_rgba(4,120,87,0.08)] transition-all"
                />
              </div>

              {/* Cotisation */}
              <div className="flex flex-col">
                <label className="text-[9px] font-[700] uppercase text-[#A39887] tracking-[0.1em] mb-[6px]">
                  COTISATION PAR MEMBRE
                </label>
                <div className="relative flex items-center">
                  <input 
                    type="number"
                    value={formData.contribution_amount || ''}
                    onChange={e => setFormData({...formData, contribution_amount: Number(e.target.value)})}
                    className="w-full h-[48px] bg-[#F5F4F0] border border-[#EDECEA] rounded-[13px] pl-[14px] pr-[50px] text-[14px] font-[600] text-[#1A1A1A] focus:outline-none focus:bg-white focus:border-[#047857] focus:shadow-[0_0_0_3px_rgba(4,120,87,0.08)] transition-all"
                  />
                  <span className="absolute right-[14px] text-[14px] font-[600] text-[#A39887]">FCFA</span>
                </div>
                <p className="text-[9px] font-[500] text-[#A39887] mt-[4px]">
                  Maximum autorisé · {cleanAmount(limits.maxContrib)} FCFA · Tier {userTier}
                </p>
              </div>

              {/* Fréquence */}
              <div className="flex flex-col">
                <label className="text-[9px] font-[700] uppercase text-[#A39887] tracking-[0.1em] mb-[6px]">
                  FRÉQUENCE
                </label>
                <div className="flex gap-[6px]">
                  {[
                    { id: 'WEEKLY', label: 'Hebdo' },
                    { id: 'BIWEEKLY', label: 'Bimensuel' },
                    { id: 'MONTHLY', label: 'Mensuel' }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFormData({...formData, frequency: f.id})}
                      className={`flex-1 h-[36px] rounded-[10px] text-[11px] font-[700] border-[1px] transition-colors ${
                        formData.frequency === f.id 
                          ? 'bg-[#047857] text-white border-[#047857]' 
                          : 'bg-[#F5F4F0] text-[#A39887] border-[#EDECEA]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Membres */}
              <div className="flex flex-col">
                <label className="text-[9px] font-[700] uppercase text-[#A39887] tracking-[0.1em] mb-[6px]">
                  NOMBRE DE MEMBRES
                </label>
                <input
                  type="number"
                  value={formData.target_members || ''}
                  onChange={e => setFormData({...formData, target_members: Number(e.target.value)})}
                  className="h-[48px] bg-[#F5F4F0] border border-[#EDECEA] rounded-[13px] px-[14px] text-[14px] font-[600] text-[#1A1A1A] focus:outline-none focus:bg-white focus:border-[#047857] focus:shadow-[0_0_0_3px_rgba(4,120,87,0.08)] transition-all"
                />
                <p className="text-[9px] font-[500] text-[#A39887] mt-[4px]">
                  Maximum autorisé · {limits.maxMembers} membres · Tier {userTier}
                </p>
              </div>

              {/* Date limite de constitution */}
              <div className="flex flex-col">
                <label className="text-[9px] font-[700] uppercase text-[#A39887] tracking-[0.1em] mb-[6px]">
                  DATE LIMITE DE CONSTITUTION
                </label>
                <input
                  type="date"
                  value={formData.constitution_deadline}
                  onChange={e => setFormData({...formData, constitution_deadline: e.target.value})}
                  min={new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]}
                  max={new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]}
                  className="h-[48px] bg-[#F5F4F0] border border-[#EDECEA] rounded-[13px] px-[14px] text-[14px] font-[600] text-[#1A1A1A] focus:outline-none focus:bg-white focus:border-[#047857] focus:shadow-[0_0_0_3px_rgba(4,120,87,0.08)] transition-all"
                />
                <p className="text-[9px] font-[500] text-[#A39887] mt-[4px]">
                  Entre J+3 et J+30 à partir d'aujourd'hui
                </p>
              </div>

            </div>

            <button
              onClick={() => { setError(null); setStep(2); }}
              disabled={!canContinueToStep2}
              className="w-full h-[48px] bg-[#047857] text-white rounded-[14px] text-[14px] font-[700] mt-auto active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100"
            >
              Continuer
            </button>
          </>
        ) : (
          // --- ÉTAPE 2 ---
          <>
            <div className="flex flex-col gap-4">
              
              {/* Card Récap */}
              <div className="bg-white rounded-[16px] border-[0.5px] border-[#EDECEA] p-[14px] flex flex-col shadow-sm">
                <div className="flex justify-between items-center py-[10px] border-b-[0.5px] border-[#F5F4F0]">
                  <span className="text-[11px] font-[500] text-[#6B6B6B]">Nom</span>
                  <span className="text-[11px] font-[700] text-[#1A1A1A]">{formData.name}</span>
                </div>
                <div className="flex justify-between items-center py-[10px] border-b-[0.5px] border-[#F5F4F0]">
                  <span className="text-[11px] font-[500] text-[#6B6B6B]">Cotisation</span>
                  <span className="text-[11px] font-[700] text-[#1A1A1A]">{cleanAmount(contribution)} FCFA / {formData.frequency === 'WEEKLY' ? 'hebdo' : formData.frequency === 'BIWEEKLY' ? 'bimensuel' : 'mois'}</span>
                </div>
                <div className="flex justify-between items-center py-[10px] border-b-[0.5px] border-[#F5F4F0]">
                  <span className="text-[11px] font-[500] text-[#6B6B6B]">Membres cible</span>
                  <span className="text-[11px] font-[700] text-[#1A1A1A]">{formData.target_members}</span>
                </div>
                <div className="flex justify-between items-center py-[10px] border-b-[0.5px] border-[#F5F4F0]">
                  <span className="text-[11px] font-[500] text-[#6B6B6B]">Cagnotte potentielle</span>
                  <span className="text-[11px] font-[700] text-[#047857]">{cleanAmount(totalCagnotte)} FCFA</span>
                </div>
                <div className="flex justify-between items-center pt-[10px]">
                  <span className="text-[11px] font-[500] text-[#6B6B6B]">Frais de gestion</span>
                  <span className="text-[11px] font-[700] text-[#1A1A1A]">{feePercent}%</span>
                </div>
              </div>

              {/* Card Paiement */}
              <div className="bg-white rounded-[16px] border-[0.5px] border-[#EDECEA] p-[14px] flex flex-col shadow-sm">
                <p className="text-[8px] font-[700] uppercase text-[#A39887] tracking-[0.1em] mb-[12px]">PAIEMENT REQUIS POUR DÉMARRER</p>
                
                <div className="bg-[#F5F4F0] rounded-[11px] p-[12px] flex flex-col mb-[12px]">
                  <div className="flex justify-between items-center mb-[8px]">
                    <span className="text-[11px] font-[500] text-[#6B6B6B]">Caution (restituée)</span>
                    <span className="text-[11px] font-[700] text-[#1A1A1A]">{cleanAmount(estimatedCaution)} FCFA</span>
                  </div>
                  <div className="flex justify-between items-center mb-[10px]">
                    <span className="text-[11px] font-[500] text-[#6B6B6B]">Cotisation M1</span>
                    <span className="text-[11px] font-[700] text-[#1A1A1A]">{cleanAmount(contribution)} FCFA</span>
                  </div>
                  <div className="w-full h-[1px] bg-[#EDECEA] mb-[10px]" />
                  <div className="flex justify-between items-center">
                    <span className="text-[12px] font-[700] text-[#1A1A1A]">Total à payer</span>
                    <span className="text-[14px] font-[800] text-[#047857]">{cleanAmount(estimatedCaution + contribution)} FCFA</span>
                  </div>
                </div>

                <div className="bg-[#F5F4F0] rounded-[10px] p-[10px] flex items-start gap-[8px]">
                  <Lock size={14} className="text-[#047857] shrink-0 mt-[2px]" strokeWidth={2.5} />
                  <p className="text-[10px] font-[500] text-[#6B6B6B] leading-snug">
                    La caution de {cleanAmount(estimatedCaution)} FCFA vous est restituée intégralement à la fin du cycle.
                  </p>
                </div>
              </div>

            </div>

            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full h-[48px] bg-[#047857] text-white rounded-[14px] text-[14px] font-[700] mt-auto active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center"
            >
              {loading ? 'Création en cours...' : 'Créer le cercle'}
            </button>
          </>
        )}
      </div>

    </div>
  );
}