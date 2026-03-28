import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Calendar, Coins, Clock } from 'lucide-react';
import { formatXOF, getTierLimits, getTierCoeff } from '../../lib/utils';
import { auth } from '../../lib/firebase';
import { getUserProfile } from '../../services/userService';
import { createTontineGroup } from '../../services/tontineService';
import { Timestamp } from 'firebase/firestore';

export function CreateGroup() {
  const navigate = useNavigate();
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
    target_members: '10',
    constitution_deadline: defaultDeadlineStr,
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const user = auth.currentUser;
    if (user) {
      const p = await getUserProfile(user.uid);
      if (p) setProfile(p);
    }
  };

  const userTier = profile?.tier || 'BRONZE';
  
  const limits = getTierLimits(userTier);
  const cautionCoeff = getTierCoeff(userTier);

  const contribution = parseInt(formData.contribution_amount) || 0;
  const estimatedCaution = contribution * cautionCoeff;

  const handleCreate = async () => {
    setError(null);
    const user = auth.currentUser;
    if (!user) return;
    
    // Validation
    if (contribution < 5000) {
      setError("Montant minimum 5 000 FCFA");
      return;
    }
    if (contribution > limits.maxContrib) {
      setError(`Votre tier ${userTier} limite la cotisation à ${formatXOF(limits.maxContrib)}`);
      return;
    }
    const members = parseInt(formData.target_members);
    if (members < 4) {
      setError("Minimum 4 membres");
      return;
    }
    if (members > limits.maxMembers) {
      setError(`Votre tier ${userTier} limite le groupe à ${limits.maxMembers} membres`);
      return;
    }
    if (formData.name.length < 3) {
      setError("Le nom doit contenir au moins 3 caractères");
      return;
    }

    // Validate deadline (between J+3 and J+30)
    const selectedDate = new Date(formData.constitution_deadline);
    const today = new Date();
    const diffTime = Math.abs(selectedDate.getTime() - today.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    if (diffDays < 3 || diffDays > 30) {
      setError("La date limite doit être comprise entre 3 et 30 jours.");
      return;
    }

    setLoading(true);
    try {
      const selectedDate = new Date(formData.constitution_deadline);
      const groupId = await createTontineGroup({
        name: formData.name,
        admin_id: user.uid,
        frequency: formData.frequency as any,
        contribution_amount: contribution,
        target_members: members,
        currency: 'XOF',
        constitution_deadline: Timestamp.fromDate(new Date(formData.constitution_deadline)),
      }, user.uid);
      
      // Navigate to group detail
      navigate(`/group/${groupId}`);
    } catch (e: any) {
      setError(e.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-[#F5F0E8] flex flex-col h-full">
      <div className="bg-white px-4 pt-4 pb-4 shadow-sm flex items-center gap-4 z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-[#111827]">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-[#111827] text-xl font-bold">Créer un Cercle</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E5E7EB]">
          <div className="space-y-5">
            <div>
              <label className="text-sm font-medium text-[#4B5563] mb-1.5 block">Nom du Cercle</label>
              <input 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Ex: Famille Dossou"
                className="w-full border border-[#E5E7EB] rounded-xl h-12 px-4 text-[#111827] focus:border-[#047857] outline-none font-medium" 
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#4B5563] mb-1.5 flex justify-between">
                <span>Cotisation (FCFA)</span>
                <span className="text-xs text-[#9CA3AF]">Max: {limits.maxContrib === Infinity ? 'Illimité' : formatXOF(limits.maxContrib)}</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Coins size={20} className="text-[#9CA3AF]" />
                </div>
                <input 
                  type="number"
                  value={formData.contribution_amount}
                  onChange={e => setFormData({...formData, contribution_amount: e.target.value})}
                  onWheel={e => (e.target as HTMLInputElement).blur()}
                  placeholder="10000"
                  className="w-full border border-[#E5E7EB] rounded-xl h-12 pl-11 pr-4 text-[#111827] focus:border-[#047857] outline-none font-bold" 
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[#4B5563] mb-1.5 block">Fréquence</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Calendar size={20} className="text-[#9CA3AF]" />
                </div>
                <select 
                  value={formData.frequency}
                  onChange={e => setFormData({...formData, frequency: e.target.value})}
                  className="w-full border border-[#E5E7EB] rounded-xl h-12 pl-11 pr-4 text-[#111827] focus:border-[#047857] outline-none font-medium appearance-none bg-white"
                >
                  <option value="WEEKLY">Hebdomadaire</option>
                  <option value="MONTHLY">Mensuelle</option>
                  <option value="QUARTERLY">Trimestrielle</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[#4B5563] mb-1.5 flex justify-between">
                <span>Nombre de membres</span>
                <span className="text-xs text-[#9CA3AF]">Max: {limits.maxMembers}</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Users size={20} className="text-[#9CA3AF]" />
                </div>
                <input 
                  type="number"
                  value={formData.target_members}
                  onChange={e => setFormData({...formData, target_members: e.target.value})}
                  className="w-full border border-[#E5E7EB] rounded-xl h-12 pl-11 pr-4 text-[#111827] focus:border-[#047857] outline-none font-medium" 
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[#4B5563] mb-1.5 flex justify-between">
                <span>Date limite d'inscription</span>
                <span className="text-xs text-[#9CA3AF]">J+3 à J+30</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Clock size={20} className="text-[#9CA3AF]" />
                </div>
                <input 
                  type="date"
                  value={formData.constitution_deadline}
                  onChange={e => setFormData({...formData, constitution_deadline: e.target.value})}
                  className="w-full border border-[#E5E7EB] rounded-xl h-12 pl-11 pr-4 text-[#111827] focus:border-[#047857] outline-none font-medium bg-white" 
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-[#E8F0E8] p-4 rounded-xl border border-[#047857]/20">
          <p className="text-sm text-[#064E3B] leading-relaxed mb-2">
            En tant qu'administrateur, vous devrez payer une caution (calculée selon votre tier) pour activer le Cercle.
          </p>
          {contribution > 0 && (
            <div className="bg-white/60 rounded-lg p-3 mt-2">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#064E3B]">Caution estimée ({userTier}) :</span>
                <span className="font-bold text-[#064E3B]">{formatXOF(estimatedCaution)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#064E3B]">Total à l'activation :</span>
                <span className="font-bold text-[#064E3B]">{formatXOF(estimatedCaution + contribution)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 bg-white border-t border-[#E5E7EB]">
        <button
          onClick={handleCreate}
          disabled={loading || !formData.name || !formData.contribution_amount}
          className="w-full bg-[#047857] text-white h-14 rounded-xl font-semibold text-lg disabled:opacity-50 flex items-center justify-center transition-colors"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            'Créer et activer le Cercle'
          )}
        </button>
      </div>
    </div>
  );
}
