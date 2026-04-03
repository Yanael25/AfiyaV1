import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { formatXOF } from '../../lib/utils';
import { auth } from '../../lib/firebase';
import { getGroupMembers, payDepositDifferential, getTontineGroup, repositionMember } from '../../services/tontineService';
import { getUserProfile } from '../../services/userService';
import { motion } from 'motion/react';

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
          onClick={() => navigate(-1)}
          className="w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-sm border border-[#F0EFED] transition-transform active:scale-95"
        >
          <ArrowLeft size={20} stroke="#1A1A1A" strokeWidth={1.5} />
        </button>
        <div className="pt-1">
          <h1 className="font-display text-[28px] font-bold text-[#1A1A1A] tracking-tight mb-1 leading-none">Compléter ma caution</h1>
          <p className="text-[14px] font-medium text-[#A39887] mt-1.5">{groupInfo.name}</p>
        </div>
      </div>

      {error && (
        <div className="mx-6 mb-6 bg-[#FFF5F5] border border-[#EF4444]/20 rounded-[16px] p-4 text-[13px] font-medium text-[#EF4444] flex items-start gap-3">
          <p className="leading-relaxed">{error}</p>
        </div>
      )}

      <div className="flex flex-col gap-4 mx-6">
        {/* CONTEXTE MEMBRE */}
        <div className="bg-white rounded-[24px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-[#F0EFED] flex items-center gap-4">
          <div className="w-14 h-14 bg-[#047857] rounded-[16px] flex items-center justify-center text-[18px] font-display font-bold text-white shrink-0 shadow-[0_4px_12px_rgba(4,120,87,0.2)]">
            {initials}
          </div>
          <div>
            <h2 className="font-display text-[18px] font-bold text-[#1A1A1A] mb-1">Moi · Position #{memberInfo.draw_position}</h2>
            <p className="text-[13px] font-medium text-[#A39887]">{groupInfo.name} · Tier {userProfile.tier}</p>
          </div>
        </div>

        {/* BLOC CAUTION */}
        <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-[#F0EFED]">
          <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-[#A39887] mb-4">CAUTION BLOQUÉE</label>
          
          <div className="flex flex-col gap-3">
            {/* BLOC 1 — caution initiale */}
            <div className="bg-[#FAFAF8] rounded-[16px] p-4 border border-[#F0EFED]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[13px] font-medium text-[#6B6B6B]">Caution initiale versée</span>
                <span className="bg-[#F0FDF4] text-[#047857] text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-[8px]">Validée</span>
              </div>
              <div className="font-display text-[18px] font-bold text-[#1A1A1A]">{cleanAmount(memberInfo.initial_deposit)} <span className="text-[14px] font-bold text-[#A39887] font-sans">FCFA</span></div>
            </div>

            {/* BLOC 2 — caution cible + complément */}
            <div className="bg-[#FAFAF8] rounded-[16px] p-4 border border-[#F0EFED]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[13px] font-medium text-[#6B6B6B]">Caution cible · position {memberInfo.draw_position}</span>
                <span className="bg-[#F5F4F2] text-[#6B6B6B] text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-[8px]">À compléter</span>
              </div>
              <div className="font-display text-[18px] font-bold text-[#1A1A1A]">{cleanAmount(memberInfo.adjusted_deposit)} <span className="text-[14px] font-bold text-[#A39887] font-sans">FCFA</span></div>
              
              <div className="h-px bg-[#F0EFED] my-4" />
              
              <div className="flex justify-between items-start gap-3">
                <div>
                  <p className="text-[13px] font-medium text-[#6B6B6B] mb-1">Complément requis</p>
                  <p className="text-[11px] font-medium text-[#A39887]">Selon votre position de tirage</p>
                </div>
                <span className="font-display text-[18px] font-bold text-[#1A1A1A]">+{cleanAmount(memberInfo.deposit_differential)} <span className="text-[14px] font-bold text-[#A39887] font-sans">FCFA</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* NOTE DÉLAI */}
        <div className="bg-[#FAFAF8] rounded-[20px] p-5 flex items-start gap-4 border border-[#F0EFED]">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border border-[#F0EFED]">
            <div className="w-2 h-2 bg-[#A39887] rounded-full" />
          </div>
          <p className="text-[13px] font-medium text-[#6B6B6B] leading-relaxed pt-1">
            Vous avez <span className="font-bold text-[#1A1A1A]">48h</span> pour compléter. Sans paiement, votre position sera automatiquement déplacée dans la seconde moitié du groupe, sans pénalité.
          </p>
        </div>

        {/* TOTAL À PAYER */}
        <div className="bg-[#F0FDF4] rounded-[20px] p-5 flex justify-between items-center border border-[#047857]/10">
          <span className="text-[15px] font-bold text-[#047857]">À payer maintenant</span>
          <div className="flex items-baseline gap-1">
            <span className="font-display text-[24px] font-bold text-[#047857] tracking-tight">{cleanAmount(memberInfo.deposit_differential)}</span>
            <span className="text-[14px] font-bold text-[#047857]">FCFA</span>
          </div>
        </div>

        {/* NOTE SÉCURITÉ */}
        <div className="bg-[#F0FDF4] rounded-[20px] p-5 flex items-start gap-4 border border-[#047857]/10">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
            <div className="w-2 h-2 bg-[#047857] rounded-full" />
          </div>
          <p className="text-[13px] font-medium text-[#047857] leading-relaxed pt-1">
            Ce complément est bloqué comme votre caution initiale. Restitué intégralement en fin de cercle si aucun incident.
          </p>
        </div>

        {/* CTAs */}
        <div className="mt-4 mb-8 space-y-3">
          <button
            onClick={handlePayDifferential}
            disabled={loading || memberInfo.deposit_differential_paid}
            className="w-full bg-[#047857] text-white rounded-[20px] py-4.5 text-[15px] font-bold flex items-center justify-center shadow-[0_8px_20px_rgba(4,120,87,0.25)] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:shadow-none"
          >
            {loading ? <div className="w-6 h-6 border-[3px] border-white/30 border-t-white rounded-full animate-spin" /> : `Payer ${cleanAmount(memberInfo.deposit_differential)} FCFA`}
          </button>
          
          {!memberInfo.deposit_differential_paid && (
            <button
              onClick={handleRefuse}
              disabled={loading}
              className="w-full bg-white text-[#1A1A1A] border border-[#F0EFED] rounded-[20px] py-4.5 text-[15px] font-bold active:bg-[#FAFAF8] transition-colors disabled:opacity-50"
            >
              Refuser et être repositionné
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}