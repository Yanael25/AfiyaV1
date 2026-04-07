import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Lock, AlertCircle } from 'lucide-react';
import { formatXOF, getTierCoeff } from '../../lib/utils';
import { auth } from '../../lib/firebase';
import { getUserProfile } from '../../services/userService';
import { getGroupByCode, joinTontineGroup, getGroupMembers } from '../../services/tontineService';

export function JoinGroup() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groupInfo, setGroupInfo] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  const cleanAmount = (val: number) => formatXOF(val).replace(/\s?FCFA/gi, '').trim();

  const handleSearch = async () => {
    if (code.length < 3) return;
    setLoading(true);
    setError(null);
    try {
      const group = await getGroupByCode(code.toUpperCase());
      if (!group) throw new Error("Code invalide ou cercle introuvable.");
      if (group.status !== 'FORMING') throw new Error("Ce cercle n'accepte plus de nouveaux membres.");

      const user = auth.currentUser;
      if (!user) throw new Error("Non connecté");

      const profile = await getUserProfile(user.uid);
      setUserProfile(profile);
      
      const members = await getGroupMembers(group.id);
      if (members.length >= group.target_members) throw new Error("Ce cercle est déjà complet.");

      setGroupInfo({
        ...group,
        members_count: members.length,
        caution: group.contribution_amount * getTierCoeff(profile?.tier || 'BRONZE'),
      });
    } catch (e: any) {
      setError(e.message);
      setGroupInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!groupInfo || !auth.currentUser) return;
    setLoading(true);
    try {
      await joinTontineGroup(groupInfo.id, auth.currentUser.uid);
      navigate(`/group/${groupInfo.id}`);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  };

  const getTierBadgeProps = (tier: string) => {
    switch(tier) {
      case 'PLATINUM': return { bg: 'bg-[#F8FAFC]', text: 'text-[#334155]', border: 'border-[0.5px] border-[#CBD5E1]' };
      case 'GOLD': return { bg: 'bg-[#FEF9C3]', text: 'text-[#A16207]', border: '' };
      case 'SILVER': return { bg: 'bg-[#F1F5F9]', text: 'text-[#475569]', border: '' };
      default: return { bg: 'bg-[#FEF3C7]', text: 'text-[#92400E]', border: '' };
    }
  };

  const tierProps = getTierBadgeProps(userProfile?.tier || 'BRONZE');
  const feePercent = userProfile?.tier === 'BRONZE' ? 3 : userProfile?.tier === 'SILVER' ? 2.5 : userProfile?.tier === 'GOLD' ? 2 : 1.5;

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
          <h1 className="text-[15px] font-[800] text-[#1A1A1A] leading-tight">Rejoindre un cercle</h1>
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
          <span className="text-[10px] font-[700] mt-[4px] text-[#047857]">Code</span>
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
          <div className="bg-[#F5F4F0] border-l-[2px] border-[#92400E] rounded-r-[10px] py-[8px] px-[12px] flex items-center gap-2 mb-[16px]">
            <AlertCircle size={14} className="text-[#92400E] shrink-0" strokeWidth={2.5} />
            <span className="text-[11px] font-[600] text-[#92400E] leading-snug">{error}</span>
          </div>
        )}

        {step === 1 ? (
          // --- ÉTAPE 1 ---
          <>
            <div className="bg-white rounded-[16px] border-[0.5px] border-[#EDECEA] p-[14px] flex flex-col shadow-sm">
              <label className="block text-[8px] font-[700] uppercase text-[#A39887] tracking-[0.1em] mb-[8px]">
                CODE D'INVITATION
              </label>
              <input 
                type="text"
                value={code}
                onChange={(e) => { 
                  setCode(e.target.value.toUpperCase()); 
                  setGroupInfo(null); 
                  setError(null); 
                }}
                onBlur={handleSearch}
                placeholder="EX: AFY-1234"
                className={`w-full h-[52px] bg-[#F5F4F0] border-[1px] rounded-[13px] px-[16px] text-[16px] font-[800] text-[#1A1A1A] tracking-[0.1em] uppercase focus:outline-none transition-all ${groupInfo ? 'border-[#047857] bg-white focus:border-[#047857]' : 'border-[#EDECEA] focus:border-[#047857] focus:bg-white focus:shadow-[0_0_0_3px_rgba(4,120,87,0.08)]'}`}
              />
              <p className="text-[9px] font-[500] text-[#A39887] mt-[6px]">
                Fourni par l'administrateur du cercle
              </p>

              {/* Aperçu si validé */}
              {groupInfo && (
                <div className="mt-[16px] bg-[#F0FDF4] rounded-[12px] border-[0.5px] border-[#D1FAE5] p-[12px] flex flex-col gap-2">
                  <h3 className="text-[14px] font-[800] text-[#1A1A1A]">{groupInfo.name}</h3>
                  <div className="flex justify-between">
                    <span className="text-[10px] font-[500] text-[#6B6B6B]">Cotisation</span>
                    <span className="text-[10px] font-[700] text-[#1A1A1A]">{cleanAmount(groupInfo.contribution_amount)} FCFA</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] font-[500] text-[#6B6B6B]">Membres actuels</span>
                    <span className="text-[10px] font-[700] text-[#1A1A1A]">{groupInfo.members_count} / {groupInfo.target_members}</span>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!groupInfo || loading}
              className="w-full h-[48px] bg-[#047857] text-white rounded-[14px] text-[14px] font-[700] mt-auto active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center"
            >
              Continuer
            </button>
          </>
        ) : (
          // --- ÉTAPE 2 ---
          <>
            <div className="flex flex-col gap-4">
              
              {/* Card Cercle */}
              <div className="bg-white rounded-[16px] border-[0.5px] border-[#EDECEA] p-[14px] flex flex-col shadow-sm">
                <div className="flex justify-between items-center py-[10px] border-b-[0.5px] border-[#F5F4F0]">
                  <span className="text-[11px] font-[500] text-[#6B6B6B]">Nom du cercle</span>
                  <span className="text-[11px] font-[700] text-[#1A1A1A]">{groupInfo?.name}</span>
                </div>
                <div className="flex justify-between items-center py-[10px] border-b-[0.5px] border-[#F5F4F0]">
                  <span className="text-[11px] font-[500] text-[#6B6B6B]">Cotisation</span>
                  <span className="text-[11px] font-[700] text-[#1A1A1A]">{cleanAmount(groupInfo?.contribution_amount)} FCFA</span>
                </div>
                <div className="flex justify-between items-center py-[10px] border-b-[0.5px] border-[#F5F4F0]">
                  <span className="text-[11px] font-[500] text-[#6B6B6B]">Membres cible</span>
                  <span className="text-[11px] font-[700] text-[#1A1A1A]">{groupInfo?.target_members}</span>
                </div>
                <div className="flex justify-between items-center py-[10px] border-b-[0.5px] border-[#F5F4F0]">
                  <span className="text-[11px] font-[500] text-[#6B6B6B]">Cagnotte potentielle</span>
                  <span className="text-[11px] font-[700] text-[#047857]">{cleanAmount(groupInfo?.contribution_amount * groupInfo?.target_members)} FCFA</span>
                </div>
                <div className="flex justify-between items-center pt-[10px]">
                  <span className="text-[11px] font-[500] text-[#6B6B6B]">Frais appliqués</span>
                  <span className="text-[11px] font-[700] text-[#1A1A1A]">{feePercent}%</span>
                </div>
              </div>

              {/* Card Situation & Paiement */}
              <div className="bg-white rounded-[16px] border-[0.5px] border-[#EDECEA] p-[14px] flex flex-col shadow-sm">
                
                <div className="flex justify-between items-center mb-[14px]">
                  <div className={`px-2 py-1 rounded-[6px] text-[10px] font-[700] uppercase tracking-wider ${tierProps.bg} ${tierProps.text} ${tierProps.border}`}>
                    Tier {userProfile?.tier || 'BRONZE'}
                  </div>
                  <span className="text-[11px] font-[500] text-[#6B6B6B]">Coefficient caution {getTierCoeff(userProfile?.tier || 'BRONZE')}×</span>
                </div>

                <p className="text-[8px] font-[700] uppercase text-[#A39887] tracking-[0.1em] mb-[12px]">PAIEMENT REQUIS POUR REJOINDRE</p>
                
                <div className="bg-[#F5F4F0] rounded-[11px] p-[12px] flex flex-col mb-[12px]">
                  <div className="flex justify-between items-center mb-[8px]">
                    <span className="text-[11px] font-[500] text-[#6B6B6B]">Caution (restituée)</span>
                    <span className="text-[11px] font-[700] text-[#1A1A1A]">{cleanAmount(groupInfo?.caution)} FCFA</span>
                  </div>
                  <div className="flex justify-between items-center mb-[10px]">
                    <span className="text-[11px] font-[500] text-[#6B6B6B]">Cotisation M1</span>
                    <span className="text-[11px] font-[700] text-[#1A1A1A]">{cleanAmount(groupInfo?.contribution_amount)} FCFA</span>
                  </div>
                  <div className="w-full h-[1px] bg-[#EDECEA] mb-[10px]" />
                  <div className="flex justify-between items-center">
                    <span className="text-[12px] font-[700] text-[#1A1A1A]">Total à payer</span>
                    <span className="text-[14px] font-[800] text-[#047857]">{cleanAmount((groupInfo?.caution || 0) + (groupInfo?.contribution_amount || 0))} FCFA</span>
                  </div>
                </div>

                <div className="bg-[#F5F4F0] rounded-[10px] p-[10px] flex items-start gap-[8px]">
                  <Lock size={14} className="text-[#047857] shrink-0 mt-[2px]" strokeWidth={2.5} />
                  <p className="text-[10px] font-[500] text-[#6B6B6B] leading-snug">
                    La caution de {cleanAmount(groupInfo?.caution)} FCFA vous est restituée intégralement à la fin du cycle.
                  </p>
                </div>
              </div>

            </div>

            <button
              onClick={handleJoin}
              disabled={loading}
              className="w-full h-[48px] bg-[#047857] text-white rounded-[14px] text-[14px] font-[700] mt-auto active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center"
            >
              {loading ? 'Connexion au cercle...' : 'Rejoindre et payer'}
            </button>
          </>
        )}
      </div>

    </div>
  );
}