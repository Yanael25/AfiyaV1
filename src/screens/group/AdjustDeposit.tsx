import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trophy, Lock, Clock } from 'lucide-react';
import { formatXOF } from '../../lib/utils';
import { auth } from '../../lib/firebase';
import { getGroupMembers, payDepositDifferential, getTontineGroup, repositionMember } from '../../services/tontineService';

// Helper pour formater les montants
const cleanAmount = (val: number) => formatXOF(val).replace(/\s?FCFA/gi, '').trim();

export function AdjustDeposit() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memberInfo, setMemberInfo] = useState<any>(null);
  const [groupInfo, setGroupInfo] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const user = auth.currentUser;
        if (!user || !id) return;

        const [members, group] = await Promise.all([
          getGroupMembers(id),
          getTontineGroup(id)
        ]);

        const currentMember = members?.find((m: any) => m.user_id === user.uid);
        
        if (currentMember) setMemberInfo(currentMember);
        if (group) setGroupInfo(group);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingData(false);
      }
    };
    loadData();
  }, [id]);

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

  const handleRefuse = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Utilisateur non connecté");

      await repositionMember(memberInfo.id, groupInfo.target_members);
      navigate(-1);
    } catch (e: any) {
      setError(e.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  // Loader initial
  if (loadingData) {
    return <div className="min-h-screen bg-[#F5F4F0] pt-[52px]" />;
  }

  // Protection
  if (!memberInfo || !groupInfo) {
    return null;
  }

  // Calcul du différentiel de manière sécurisée (fallback à 0)
  const diffAmount = memberInfo.deposit_differential || 0;
  // Approximation du mois de réception (à des fins de démo UI si non calculé)
  const payoutMonth = "quelques mois";

  return (
    <div className="min-h-screen bg-[#F5F4F0] font-sans pt-[52px] pb-[24px] flex flex-col">
      
      {/* HEADER */}
      <div className="px-6 flex items-center gap-3 mb-6">
        <button 
          onClick={() => navigate(-1)}
          className="w-[36px] h-[36px] bg-white rounded-[11px] border-[0.5px] border-[#EDECEA] flex items-center justify-center active:scale-95 transition-transform shrink-0"
        >
          <ArrowLeft size={16} className="text-[#6B6B6B]" strokeWidth={2} />
        </button>
        <div className="flex flex-col">
          <h1 className="text-[15px] font-[800] text-[#1A1A1A] leading-tight">Complément de caution</h1>
          <p className="text-[10px] font-[500] text-[#A39887] leading-tight mt-[2px]">
            {groupInfo.name}
          </p>
        </div>
      </div>

      {error && (
        <div className="mx-4 mb-4 bg-[#F5F4F0] border-l-[2px] border-[#92400E] p-[10px] rounded-r-[10px] flex items-center gap-2">
          <span className="text-[11px] font-[600] text-[#92400E]">{error}</span>
        </div>
      )}

      {/* BLOC CONTEXTE */}
      <div className="bg-[#F0FDF4] border-[0.5px] border-[#D1FAE5] rounded-[16px] p-[14px] mx-[16px] mb-[8px] flex items-start gap-3 shadow-sm">
        <div className="w-[36px] h-[36px] bg-white rounded-[10px] border-[0.5px] border-[#D1FAE5] flex items-center justify-center shrink-0 mt-0.5">
          <Trophy size={16} className="text-[#047857]" strokeWidth={2} />
        </div>
        <div className="flex flex-col">
          <span className="text-[13px] font-[700] text-[#1A1A1A] mb-[2px]">Vous êtes en position #{memberInfo.draw_position}</span>
          <span className="text-[11px] font-[500] text-[#6B6B6B] leading-[1.5]">
            Vous recevrez votre cagnotte en {payoutMonth}. Votre caution est ajustée pour couvrir les cycles avant votre tour.
          </span>
        </div>
      </div>

      {/* CARD BREAKDOWN */}
      <div className="bg-white rounded-[16px] border-[0.5px] border-[#EDECEA] p-[14px] mx-[16px] mb-[8px] flex flex-col shadow-sm">
        <label className="text-[8px] font-[700] uppercase text-[#A39887] tracking-[0.1em] mb-[12px]">
          AJUSTEMENT DE CAUTION
        </label>
        
        <div className="bg-[#F5F4F0] rounded-[12px] p-[12px] flex flex-col">
          <div className="flex justify-between items-center mb-[8px]">
            <span className="text-[11px] font-[500] text-[#6B6B6B]">Caution initiale payée</span>
            <span className="text-[11px] font-[600] text-[#1A1A1A]">{cleanAmount(memberInfo.initial_deposit || 0)} FCFA</span>
          </div>
          <div className="flex justify-between items-center mb-[10px]">
            <span className="text-[11px] font-[500] text-[#6B6B6B]">Caution requise · Position #{memberInfo.draw_position}</span>
            <span className="text-[11px] font-[600] text-[#1A1A1A]">{cleanAmount(memberInfo.adjusted_deposit || 0)} FCFA</span>
          </div>
          
          <div className="w-full h-[0.5px] bg-[#EDECEA] mb-[10px]" />
          
          <div className="flex justify-between items-center">
            <span className="text-[12px] font-[700] text-[#1A1A1A]">Complément requis</span>
            <span className="text-[14px] font-[800] text-[#047857]">+{cleanAmount(diffAmount)} FCFA</span>
          </div>
        </div>

        <div className="bg-[#F0FDF4] rounded-[10px] p-[10px] mt-[8px] flex items-start gap-2">
          <Lock size={12} className="text-[#047857] shrink-0 mt-[2px]" strokeWidth={2.5} />
          <p className="text-[10px] font-[500] text-[#065F46] leading-snug">
            Ce complément est restitué intégralement à la fin du cycle, comme votre caution initiale.
          </p>
        </div>
      </div>

      {/* CARD DÉLAI */}
      <div className="bg-[#F5F4F0] rounded-[14px] p-[12px] mx-[16px] mb-[auto] flex items-start gap-2">
        <Clock size={14} className="text-[#A39887] shrink-0 mt-[2px]" strokeWidth={2} />
        <p className="text-[11px] font-[500] text-[#6B6B6B] leading-[1.5]">
          Vous avez 48h pour compléter. Si vous ne souhaitez pas, vous serez repositionné automatiquement en seconde moitié de groupe, sans pénalité.
        </p>
      </div>

      {/* BOUTONS */}
      <div className="px-[14px] flex flex-col gap-[8px] mt-[24px]">
        <button
          onClick={handlePayDifferential}
          disabled={loading || memberInfo.deposit_differential_paid || diffAmount <= 0}
          className="w-full h-[48px] bg-[#047857] text-white rounded-[14px] text-[14px] font-[700] active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center"
        >
          {loading ? 'Traitement...' : `Payer ${cleanAmount(diffAmount)} FCFA`}
        </button>
        
        {!memberInfo.deposit_differential_paid && (
          <button
            onClick={handleRefuse}
            disabled={loading}
            className="w-full h-[48px] bg-white border-[0.5px] border-[#EDECEA] text-[#6B6B6B] rounded-[14px] text-[13px] font-[600] active:bg-[#F5F4F0] transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            Refuser et être repositionné
          </button>
        )}
      </div>

    </div>
  );
}