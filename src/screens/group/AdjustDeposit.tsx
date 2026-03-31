import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { formatXOF } from '../../lib/utils';
import { auth } from '../../lib/firebase';
import { getGroupMembers, payDepositDifferential, getTontineGroup, repositionMember } from '../../services/tontineService';
import { getUserProfile } from '../../services/userService';

export function AdjustDeposit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memberInfo, setMemberInfo] = useState<any>(null);
  const [groupInfo, setGroupInfo] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const user = auth.currentUser;
      if (!user || !id) return;

      const [members, group, profile] = await Promise.all([
        getGroupMembers(id),
        getTontineGroup(id),
        getUserProfile(user.uid)
      ]);

      const currentMember = members?.find((m: any) => m.user_id === user.uid);
      
      if (currentMember) setMemberInfo(currentMember);
      if (group) setGroupInfo(group);
      if (profile) setUserProfile(profile);
      
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

  const handleRefuse = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Utilisateur non connecté");

      // Logique de repositionnement dans la seconde moitié
      await repositionMember(memberInfo.id, groupInfo.target_members);
      navigate(-1);
    } catch (e: any) {
      setError(e.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  if (!memberInfo || !groupInfo || !userProfile) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#047857] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const initials = userProfile.full_name
    ? userProfile.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  return (
    <div className="min-h-screen bg-[#FAFAF8] font-sans pb-10">
      
      {/* TOP BAR */}
      <div className="pt-[52px] px-[24px] mb-[20px] flex items-start gap-3">
        <button 
          onClick={() => navigate(-1)}
          className="w-9 h-9 bg-white rounded-[12px] flex items-center justify-center shrink-0 transition-opacity active:opacity-80"
        >
          <ArrowLeft size={18} stroke="#6B6B6B" strokeWidth={1.5} />
        </button>
        <div>
          <h1 className="text-[22px] font-extrabold text-[#1A1A1A] tracking-tight mb-1">Compléter ma caution</h1>
          <p className="text-[13px] text-[#A39887]">{groupInfo.name}</p>
        </div>
      </div>

      {error && (
        <div className="mx-4 mb-4 bg-[#FFF5F5] border border-[#EDECEA] rounded-[14px] p-3 text-[12px] font-semibold text-[#6B6B6B] text-center">
          {error}
        </div>
      )}

      {/* CONTEXTE MEMBRE */}
      <div className="bg-white rounded-[20px] p-4 px-5 mx-4 mb-2.5 flex items-center gap-3.5">
        <div className="w-11 h-11 bg-[#047857] rounded-[14px] flex items-center justify-center text-[14px] font-extrabold text-white shrink-0">
          {initials}
        </div>
        <div>
          <h2 className="text-[16px] font-extrabold text-[#1A1A1A] mb-0.5">Moi · Position #{memberInfo.draw_position}</h2>
          <p className="text-[12px] text-[#A39887]">{groupInfo.name} · Tier {userProfile.tier}</p>
        </div>
      </div>

      {/* BLOC CAUTION */}
      <div className="bg-white rounded-[20px] overflow-hidden mx-4 mb-2.5">
        <div className="px-5 pt-4 mb-3">
          <label className="text-[11px] font-bold uppercase tracking-widest text-[#A39887]">CAUTION BLOQUÉE</label>
        </div>
        
        <div className="mx-5 mb-4 flex flex-col gap-2">
          {/* BLOC 1 — caution initiale */}
          <div className="bg-[#FAFAF8] rounded-[14px] p-3 px-3.5">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[12px] font-semibold text-[#6B6B6B]">Caution initiale versée</span>
              <span className="bg-[#F0FDF4] text-[#047857] text-[10px] font-bold px-2.5 py-1 rounded-[8px]">Validée</span>
            </div>
            <div className="text-[15px] font-extrabold text-[#1A1A1A]">{formatXOF(memberInfo.initial_deposit)}</div>
          </div>

          {/* BLOC 2 — caution cible + complément */}
          <div className="bg-[#FAFAF8] rounded-[14px] p-3 px-3.5">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[12px] font-semibold text-[#6B6B6B]">Caution cible · position {memberInfo.draw_position}</span>
              <span className="bg-[#F5F4F2] text-[#6B6B6B] text-[10px] font-bold px-2.5 py-1 rounded-[8px]">À compléter</span>
            </div>
            <div className="text-[15px] font-extrabold text-[#1A1A1A]">{formatXOF(memberInfo.adjusted_deposit)}</div>
            
            <div className="h-px bg-[#EDECEA] my-2.5" />
            
            <div className="flex justify-between items-start gap-2.5">
              <div>
                <p className="text-[12px] font-semibold text-[#6B6B6B] mb-0.5">Complément requis</p>
                <p className="text-[10px] italic text-[#C4B8AC]">Selon votre position de tirage</p>
              </div>
              <span className="text-[14px] font-extrabold text-[#1A1A1A]">+{formatXOF(memberInfo.deposit_differential)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* NOTE DÉLAI */}
      <div className="bg-[#FAFAF8] rounded-[16px] mx-4 mb-2.5 p-3.5 flex items-start gap-2.5">
        <div className="w-1.5 h-1.5 bg-[#A39887] rounded-full flex-shrink-0 mt-1.5" />
        <p className="text-[12px] font-medium text-[#6B6B6B] leading-relaxed">
          Vous avez <span className="font-bold text-[#1A1A1A]">48h</span> pour compléter. Sans paiement, votre position sera automatiquement déplacée dans la seconde moitié du groupe, sans pénalité.
        </p>
      </div>

      {/* TOTAL À PAYER */}
      <div className="bg-[#F0FDF4] rounded-[12px] mx-4 mb-2.5 px-4 py-3.5 flex justify-between items-center">
        <span className="text-[13px] font-bold text-[#047857]">À payer maintenant</span>
        <span className="text-[18px] font-extrabold text-[#047857] tracking-tight">{formatXOF(memberInfo.deposit_differential)}</span>
      </div>

      {/* NOTE SÉCURITÉ */}
      <div className="bg-[#F0FDF4] rounded-[16px] mx-4 mb-5 p-3.5 flex items-start gap-2.5">
        <div className="w-1.5 h-1.5 bg-[#047857] rounded-full flex-shrink-0 mt-1.5" />
        <p className="text-[12px] font-medium text-[#047857] leading-relaxed">
          Ce complément est bloqué comme votre caution initiale. Restitué intégralement en fin de cercle si aucun incident.
        </p>
      </div>

      {/* CTAs */}
      <div className="mx-4 mt-2 space-y-2.5">
        <button
          onClick={handlePayDifferential}
          disabled={loading || memberInfo.deposit_differential_paid}
          className="w-full bg-[#047857] text-white rounded-[16px] py-4 text-[15px] font-bold flex items-center justify-center active:opacity-80 transition-opacity disabled:opacity-50"
        >
          {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : `Payer ${formatXOF(memberInfo.deposit_differential)}`}
        </button>
        
        {!memberInfo.deposit_differential_paid && (
          <button
            onClick={handleRefuse}
            disabled={loading}
            className="w-full bg-white text-[#1A1A1A] rounded-[16px] py-4 text-[15px] font-bold active:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Refuser et être repositionné
          </button>
        )}
      </div>

    </div>
  );
}