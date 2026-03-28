import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { formatXOF } from '../../lib/utils';
import { auth } from '../../lib/firebase';
import { getGroupMembers, payDepositDifferential } from '../../services/tontineService';

export function AdjustDeposit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memberInfo, setMemberInfo] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const user = auth.currentUser;
      if (!user || !id) return;

      const members = await getGroupMembers(id);
      const currentMember = members?.find((m: any) => m.user_id === user.uid);
      
      if (currentMember) {
        setMemberInfo(currentMember);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePayDifferential = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Utilisateur non connecté");

      await payDepositDifferential(memberInfo.id, user.uid);

      navigate(`/group/${id}`);
    } catch (e: any) {
      setError(e.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  if (!memberInfo) {
    return <div className="flex-1 bg-[#F5F0E8] flex items-center justify-center">Chargement...</div>;
  }

  return (
    <div className="flex-1 bg-[#F5F0E8] flex flex-col h-full">
      <div className="bg-white px-4 pt-4 pb-4 shadow-sm flex items-center gap-4 z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-[#111827]">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-[#111827] text-xl font-bold">Ajustement Caution</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-col items-center justify-center py-4">
          <div className="w-16 h-16 bg-[#D4AF37]/20 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle size={32} className="text-[#D4AF37]" />
          </div>
          <h2 className="text-[#111827] font-bold text-2xl mb-1">Position {memberInfo.draw_position}</h2>
          <p className="text-[#4B5563] text-center text-sm px-4">
            Le tirage au sort vous a attribué une position avantageuse. Un ajustement de votre caution est requis.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E5E7EB] space-y-4">
          <div className="flex justify-between items-center pb-4 border-b border-[#E5E7EB]">
            <span className="text-[#4B5563]">Caution initiale payée</span>
            <span className="text-[#111827] font-semibold">{formatXOF(memberInfo.initial_deposit)}</span>
          </div>
          <div className="flex justify-between items-center pb-4 border-b border-[#E5E7EB]">
            <span className="text-[#4B5563]">Caution ajustée requise</span>
            <span className="text-[#111827] font-semibold">{formatXOF(memberInfo.adjusted_deposit)}</span>
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="text-[#111827] font-bold text-lg">Différentiel à payer</span>
            <span className="text-[#D4AF37] font-bold text-xl">{formatXOF(memberInfo.deposit_differential)}</span>
          </div>
        </div>

        <div className="bg-red-50 p-4 rounded-xl border border-red-100">
          <p className="text-sm text-red-800 leading-relaxed font-medium text-center">
            Vous avez 48h pour régler ce montant. Passé ce délai, vous serez repositionné automatiquement.
          </p>
        </div>
      </div>

      <div className="p-6 bg-[#F5F0E8] border-t border-[#E5E7EB]">
        <button
          onClick={handlePayDifferential}
          disabled={loading || memberInfo.deposit_differential_paid}
          className="w-full bg-[#047857] text-white h-14 rounded-xl font-semibold text-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : memberInfo.deposit_differential_paid ? (
            'Déjà payé'
          ) : (
            'Payer le différentiel'
          )}
        </button>
      </div>
    </div>
  );
}
