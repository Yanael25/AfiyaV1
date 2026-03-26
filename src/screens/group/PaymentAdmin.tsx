import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X, ShieldCheck } from 'lucide-react';
import { formatXOF, getTierCoeff } from '@/src/lib/utils';
import { auth } from '@/src/lib/firebase';
import { getUserProfile } from '@/src/services/userService';
import { getTontineGroup, activateTontineGroup } from '@/src/services/tontineService';

export function PaymentAdmin() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [group, setGroup] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const user = auth.currentUser;
      if (!user || !id) return;

      const [g, p] = await Promise.all([
        getTontineGroup(id),
        getUserProfile(user.uid)
      ]);
      
      setGroup(g);
      setProfile(p);
    } catch (e) {
      console.error(e);
    }
  };

  const contribution = group?.contribution_amount || 0;
  const cautionCoeff = profile ? getTierCoeff(profile.tier) : 1.0;
  const caution = contribution * cautionCoeff;
  const total = contribution + caution;

  const handlePayment = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = auth.currentUser;
      if (!user || !id) throw new Error("Utilisateur non connecté");

      await activateTontineGroup(id, user.uid);
      
      navigate(`/group/${id}`);
    } catch (e: any) {
      setError(e.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  if (!group || !profile) {
    return <div className="flex-1 bg-gray-50 flex items-center justify-center">Chargement...</div>;
  }

  return (
    <div className="flex-1 bg-gray-50 flex flex-col h-full">
      <div className="bg-white px-4 pt-4 pb-4 shadow-sm flex items-center gap-4 z-10">
        <button onClick={() => navigate('/tontines')} className="p-2 -ml-2 text-[#4B5563] hover:bg-gray-100 rounded-full transition-colors">
          <X size={24} />
        </button>
        <h1 className="text-[#111827] text-xl font-bold">Paiement Admin</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-col items-center justify-center py-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <ShieldCheck size={32} className="text-[#047857]" />
          </div>
          <h2 className="text-[#111827] font-bold text-2xl mb-1">Activation du Cercle</h2>
          <p className="text-[#4B5563] text-center text-sm px-4">
            Pour activer le Cercle et générer le code d'invitation, vous devez régler votre première cotisation et votre caution.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E5E7EB] space-y-4">
          <div className="flex justify-between items-center pb-4 border-b border-[#E5E7EB]">
            <span className="text-[#4B5563]">1ère Cotisation</span>
            <span className="text-[#111827] font-semibold">{formatXOF(contribution)}</span>
          </div>
          <div className="flex justify-between items-center pb-4 border-b border-[#E5E7EB]">
            <span className="text-[#4B5563]">Caution (Tier {profile.tier})</span>
            <span className="text-[#111827] font-semibold">{formatXOF(caution)}</span>
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="text-[#111827] font-bold text-lg">Total à payer</span>
            <span className="text-[#047857] font-bold text-xl">{formatXOF(total)}</span>
          </div>
        </div>
      </div>

      <div className="p-6 bg-white border-t border-[#E5E7EB]">
        <button
          onClick={handlePayment}
          disabled={loading}
          className="w-full bg-[#047857] text-white h-14 rounded-xl font-semibold text-lg disabled:opacity-50 flex items-center justify-center transition-colors"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            'Payer et Activer'
          )}
        </button>
      </div>
    </div>
  );
}
