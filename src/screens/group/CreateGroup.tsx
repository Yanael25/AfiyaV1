import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Check } from 'lucide-react';
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
  
  // Calculate default deadline (14 days from now)
  const defaultDeadline = new Date();
  defaultDeadline.setDate(defaultDeadline.getDate() + 14);
  const defaultDeadlineStr = defaultDeadline.toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    name: '',
    contribution_amount: '',
    frequency: 'MONTHLY',
    target_members: 10,
    constitution_deadline: defaultDeadlineStr,
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const user = auth.currentUser;
    if (user) {
      const p = await getUserProfile(user.uid);
      if (p) {
        setProfile(p);
        const limits = getTierLimits(p.tier);
        setFormData(prev => ({
          ...prev,
          target_members: Math.min(10, limits.maxMembers)
        }));
      }
    }
  };

  const userTier = profile?.tier || 'BRONZE';
  const limits = getTierLimits(userTier);
  const cautionCoeff = getTierCoeff(userTier);

  const contribution = parseInt(formData.contribution_amount) || 0;
  const estimatedCaution = contribution * cautionCoeff;
  
  const isAmountError = contribution > 0 && contribution > limits.maxContrib;
  const isAmountTooLow = contribution > 0 && contribution < 5000;
  const amountErrorMessage = isAmountError 
    ? `Votre tier ${userTier} limite la cotisation à ${formatXOF(limits.maxContrib)}`
    : isAmountTooLow ? "Montant minimum 5 000 FCFA" : null;

  const canContinueToStep2 = 
    formData.name.trim().length >= 3 && 
    contribution >= 5000 && 
    !isAmountError &&
    formData.target_members >= 4 &&
    formData.target_members <= limits.maxMembers;

  const handleNextStep = () => {
    setError(null);
    
    // Validate deadline (between J+3 and J+30)
    const selectedDate = new Date(formData.constitution_deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = selectedDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

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

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "Sélectionner une date";
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getFrequencyLabel = (freq: string) => {
    switch(freq) {
      case 'WEEKLY': return 'Hebdomadaire';
      case 'MONTHLY': return 'Mensuelle';
      case 'QUARTERLY': return 'Trimestrielle';
      default: return freq;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] font-manrope pb-8">
      {/* TOP BAR */}
      <div className="pt-[52px] px-6 mb-5 flex items-start gap-3">
        <button 
          onClick={() => step === 2 ? setStep(1) : navigate(-1)}
          className="w-9 h-9 bg-white rounded-[12px] flex items-center justify-center shrink-0"
        >
          <ArrowLeft size={18} stroke="#1A1A1A" strokeWidth={1.5} />
        </button>
        <div>
          <h1 className="text-[22px] font-extrabold text-[#1A1A1A] tracking-tight mb-1">Créer un cercle</h1>
          <p className="text-[13px] font-medium text-[#A39887]">
            {step === 1 ? "Définissez les règles" : "Vérifiez et confirmez"}
          </p>
        </div>
      </div>

      {/* TABS */}
      <div className="bg-white rounded-[16px] p-1 mx-4 mb-5 flex gap-1">
        <div className="bg-[#047857] text-white text-[13px] font-bold flex-1 py-2.5 rounded-[12px] text-center cursor-default">
          Cercle privé
        </div>
        <div className="bg-transparent text-[#C4B8AC] text-[13px] font-bold flex-1 py-2.5 rounded-[12px] text-center flex items-center justify-center cursor-not-allowed">
          Cercle public
          <span className="bg-[#F5F4F2] text-[#A39887] text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-[6px] ml-1.5">
            Bientôt
          </span>
        </div>
      </div>

      {/* INDICATEUR 2 ÉTAPES */}
      <div className="flex items-start justify-center mx-6 mb-6">
        <div className="flex flex-col items-center">
          <div className="w-6 h-6 rounded-full bg-[#047857] text-white text-[11px] font-extrabold flex items-center justify-center">
            {step === 2 ? <Check size={14} strokeWidth={2.5} /> : "1"}
          </div>
          <span className="text-[10px] font-semibold text-[#047857] mt-1.5">Règles</span>
        </div>
        
        <div className={`h-0.5 w-[60px] mt-3 flex-shrink-0 ${step === 2 ? 'bg-[#047857]' : 'bg-[#F0EFED]'}`} />
        
        <div className="flex flex-col items-center">
          <div className={`w-6 h-6 rounded-full text-[11px] font-extrabold flex items-center justify-center ${step === 2 ? 'bg-[#047857] text-white' : 'bg-[#F0EFED] text-[#A39887]'}`}>
            2
          </div>
          <span className={`text-[10px] font-semibold mt-1.5 ${step === 2 ? 'text-[#047857]' : 'text-[#C4B8AC]'}`}>Confirmation</span>
        </div>
      </div>

      {error && (
        <div className="mx-4 mb-4 bg-[#FFF5F5] border border-[#EF4444] rounded-[12px] p-3 text-[13px] font-medium text-[#EF4444]">
          {error}
        </div>
      )}

      {step === 1 && (
        <>
          {/* CARD NOM */}
          <div className="bg-white rounded-[20px] p-[18px] mx-4 mb-2.5">
            <div className="uppercase text-[11px] font-bold text-[#A39887] mb-2.5">NOM DU CERCLE</div>
            <input 
              type="text"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="Ex : Famille Dossou, Amis du bureau..."
              className="w-full bg-[#FAFAF8] border-2 border-transparent rounded-[14px] px-4 py-3.5 text-[15px] font-semibold text-[#1A1A1A] outline-none focus:border-[#047857]/20 transition-colors"
            />
          </div>

          {/* CARD COTISATION & FRÉQUENCE */}
          <div className="bg-white rounded-[20px] p-[18px] mx-4 mb-2.5">
            <div className="uppercase text-[11px] font-bold text-[#A39887] mb-2.5">COTISATION & FRÉQUENCE</div>
            <div className="flex items-center gap-2.5">
              <div className={`flex flex-1 items-center gap-1.5 bg-[#FAFAF8] border-2 rounded-[14px] px-3.5 py-3 transition-colors ${amountErrorMessage ? 'border-[#EF4444] bg-[#FFF5F5]' : 'border-transparent focus-within:border-[#047857]/20'}`}>
                <input 
                  type="number"
                  value={formData.contribution_amount}
                  onChange={e => setFormData({...formData, contribution_amount: e.target.value})}
                  placeholder="50 000"
                  className="w-[70px] bg-transparent border-none text-[15px] font-bold text-[#1A1A1A] outline-none"
                />
                <span className="text-[12px] font-bold text-[#A39887]">FCFA</span>
              </div>
              
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <div 
                  onClick={() => setFormData({...formData, frequency: 'WEEKLY'})}
                  className={`px-3 py-2 rounded-[10px] text-[12px] font-bold cursor-pointer text-center ${formData.frequency === 'WEEKLY' ? 'bg-[#047857] text-white' : 'bg-[#FAFAF8] text-[#A39887]'}`}
                >
                  Hebdo
                </div>
                <div 
                  onClick={() => setFormData({...formData, frequency: 'MONTHLY'})}
                  className={`px-3 py-2 rounded-[10px] text-[12px] font-bold cursor-pointer text-center ${formData.frequency === 'MONTHLY' ? 'bg-[#047857] text-white' : 'bg-[#FAFAF8] text-[#A39887]'}`}
                >
                  Mensuel
                </div>
                <div 
                  onClick={() => setFormData({...formData, frequency: 'QUARTERLY'})}
                  className={`px-3 py-2 rounded-[10px] text-[12px] font-bold cursor-pointer text-center ${formData.frequency === 'QUARTERLY' ? 'bg-[#047857] text-white' : 'bg-[#FAFAF8] text-[#A39887]'}`}
                >
                  Trimestr.
                </div>
              </div>
            </div>
            {amountErrorMessage && (
              <div className="text-[11px] font-semibold text-[#EF4444] mt-2">
                {amountErrorMessage}
              </div>
            )}
          </div>

          {/* CARD MEMBRES */}
          <div className="bg-white rounded-[20px] p-[18px] mx-4 mb-2.5">
            <div className="uppercase text-[11px] font-bold text-[#A39887] mb-2.5">NOMBRE DE MEMBRES</div>
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setFormData(prev => ({...prev, target_members: Math.max(4, prev.target_members - 1)}))}
                className="w-9 h-9 bg-[#FAFAF8] rounded-[12px] text-[20px] text-[#1A1A1A] flex items-center justify-center"
              >
                -
              </button>
              <div className="text-[24px] font-extrabold text-[#1A1A1A] tracking-tight">
                {formData.target_members}
              </div>
              <button 
                onClick={() => setFormData(prev => ({...prev, target_members: Math.min(limits.maxMembers, prev.target_members + 1)}))}
                className="w-9 h-9 bg-[#FAFAF8] rounded-[12px] text-[20px] text-[#1A1A1A] flex items-center justify-center"
              >
                +
              </button>
            </div>
            <div className="text-[11px] italic text-[#C4B8AC] text-center mt-1.5">
              Maximum {limits.maxMembers} pour votre tier actuel
            </div>
          </div>

          {/* CARD DATE LIMITE */}
          <div className="bg-white rounded-[20px] p-[18px] mx-4 mb-2.5">
            <div className="uppercase text-[11px] font-bold text-[#A39887] mb-2.5">DATE LIMITE DE CONSTITUTION</div>
            <div className="relative flex justify-between items-center bg-[#FAFAF8] rounded-[14px] px-4 py-3.5 cursor-pointer">
              <input 
                type="date" 
                value={formData.constitution_deadline}
                onChange={e => setFormData({...formData, constitution_deadline: e.target.value})}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <span className={`text-[14px] font-semibold ${formData.constitution_deadline ? 'text-[#1A1A1A]' : 'text-[#C4B8AC]'}`}>
                {formatDateDisplay(formData.constitution_deadline)}
              </span>
              <Calendar size={18} stroke="#C4B8AC" strokeWidth={1.5} />
            </div>
          </div>

          {/* NOTE TIRAGE */}
          <div className="bg-white rounded-[16px] mx-4 mb-2.5 p-3.5 flex items-start gap-2.5">
            <div className="w-5 h-5 bg-[#F0FDF4] rounded-full flex items-center justify-center shrink-0 mt-0.5">
              <Clock size={12} stroke="#047857" strokeWidth={2} />
            </div>
            <div className="text-[12px] font-medium text-[#6B6B6B] leading-relaxed">
              <strong className="text-[#1A1A1A]">Tirage des positions</strong> — Tiré au sort automatiquement dès que tous les membres ont rejoint.
            </div>
          </div>

          {/* CTA ÉTAPE 1 */}
          <div className="mx-4 mt-2 mb-6">
            <button
              onClick={handleNextStep}
              disabled={!canContinueToStep2}
              className={`w-full rounded-[16px] py-4 text-[15px] font-bold transition-colors ${canContinueToStep2 ? 'bg-[#047857] text-white' : 'bg-[#E8E6E3] text-[#C4B8AC] cursor-not-allowed'}`}
            >
              Continuer →
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          {/* RÉCAPITULATIF */}
          <div className="bg-white rounded-[20px] p-[18px] mx-4 mb-2.5">
            <div className="uppercase text-[11px] font-bold text-[#A39887] mb-2.5">RÉCAPITULATIF</div>
            
            <div className="flex justify-between items-center py-2.5 border-b border-[#F8F7F6]">
              <span className="text-[13px] font-medium text-[#6B6B6B]">Nom</span>
              <span className="text-[13px] font-bold text-[#1A1A1A]">{formData.name}</span>
            </div>
            
            <div className="flex justify-between items-center py-2.5 border-b border-[#F8F7F6]">
              <span className="text-[13px] font-medium text-[#6B6B6B]">Cotisation</span>
              <span className="text-[13px] font-bold text-[#1A1A1A]">{formatXOF(contribution)} / {getFrequencyLabel(formData.frequency).toLowerCase()}</span>
            </div>
            
            <div className="flex justify-between items-center py-2.5 border-b border-[#F8F7F6]">
              <span className="text-[13px] font-medium text-[#6B6B6B]">Membres cible</span>
              <span className="text-[13px] font-bold text-[#1A1A1A]">{formData.target_members} membres</span>
            </div>
            
            <div className="flex justify-between items-center py-2.5 border-b border-[#F8F7F6]">
              <span className="text-[13px] font-medium text-[#6B6B6B]">Date limite de constitution</span>
              <span className="text-[13px] font-bold text-[#1A1A1A]">{formatDateDisplay(formData.constitution_deadline)}</span>
            </div>
            
            <div className="flex justify-between items-center py-2.5">
              <span className="text-[13px] font-medium text-[#6B6B6B]">Tirage des positions</span>
              <span className="text-[13px] font-bold text-[#1A1A1A]">Automatique</span>
            </div>
          </div>

          {/* PAIEMENT */}
          <div className="bg-white rounded-[20px] p-[18px] mx-4 mb-2.5">
            <div className="uppercase text-[11px] font-bold text-[#A39887] mb-2.5">PAIEMENT REQUIS AUJOURD'HUI</div>
            
            <div className="bg-[#FAFAF8] rounded-[12px] p-3 px-3.5 mb-2">
              <div className="flex justify-between items-center">
                <span className="text-[12px] font-medium text-[#6B6B6B]">Caution bloquée</span>
                <span className="text-[14px] font-extrabold text-[#1A1A1A]">{formatXOF(estimatedCaution)}</span>
              </div>
              <div className="text-[10px] italic text-[#C4B8AC] mt-1">
                Sera ajustée selon votre position de tirage après le lancement
              </div>
            </div>
            
            <div className="bg-[#FAFAF8] rounded-[12px] p-3 px-3.5 mb-2.5 flex justify-between items-center">
              <span className="text-[12px] font-medium text-[#6B6B6B]">1ère cotisation</span>
              <span className="text-[14px] font-extrabold text-[#1A1A1A]">{formatXOF(contribution)}</span>
            </div>
            
            <div className="bg-[#F0FDF4] rounded-[12px] px-4 py-3.5 flex justify-between items-center">
              <span className="text-[13px] font-bold text-[#047857]">Total à payer</span>
              <span className="text-[18px] font-extrabold text-[#047857] tracking-tight">{formatXOF(estimatedCaution + contribution)}</span>
            </div>
            
            <div className="text-[11px] italic text-[#A39887] text-center mt-2.5 leading-relaxed">
              Fonds sécurisés en escrow. Restitués intégralement si le cercle ne se forme pas.
            </div>
          </div>

          {/* CTA ÉTAPE 2 */}
          <div className="mx-4 mt-2 mb-6">
            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full bg-[#047857] text-white rounded-[16px] py-4 text-[15px] font-bold disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Payer et créer le cercle'
              )}
            </button>
          </div>
        </>
      )}

    </div>
  );
}
