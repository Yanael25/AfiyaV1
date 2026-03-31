import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Info, Check, ChevronRight } from 'lucide-react';
import { formatXOF } from '../../lib/utils';
import { auth } from '../../lib/firebase';
import { getTontineGroup, getGroupMembers, repositionMember } from '../../services/tontineService';

export function TirageAuSort() {
  const navigate = useNavigate();
  const { groupId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [myMember, setMyMember] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [groupId]);

  const loadData = async () => {
    try {
      const user = auth.currentUser;
      if (!user || !groupId) return;

      const [groupData, membersData] = await Promise.all([
        getTontineGroup(groupId),
        getGroupMembers(groupId)
      ]);

      if (!groupData) throw new Error("Groupe introuvable");

      const currentMember = membersData.find((m: any) => m.user_id === user.uid);
      if (!currentMember) throw new Error("Vous n'êtes pas membre de ce groupe");

      // Tri par position (nulls à la fin)
      const sortedMembers = [...membersData].sort((a, b) => {
        if (a.draw_position === null && b.draw_position === null) return 0;
        if (a.draw_position === null) return 1;
        if (b.draw_position === null) return -1;
        return a.draw_position - b.draw_position;
      });

      setGroup(groupData);
      setMembers(sortedMembers);
      setMyMember(currentMember);
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
      if (!myMember || !group) return;
      await repositionMember(myMember.id, group.target_members);
      navigate(-1);
    } catch (e: any) {
      setError(e.message || "Erreur lors du repositionnement");
      setLoading(false);
    }
  };

  if (loading || !group || !myMember) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#047857] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isDrawn = myMember.draw_position !== null;
  const top30Threshold = Math.floor(group.target_members * 0.3);
  const isCaseC = isDrawn && myMember.draw_position <= top30Threshold;
  
  // Calcul du différentiel (x2 si position prioritaires)
  const deposit_differential = myMember.initial_deposit; // Car adjusted = initial * 2

  return (
    <div className="min-h-screen bg-[#FAFAF8] font-sans flex flex-col overflow-y-auto pb-10">
      
      {/* TOP BAR */}
      <div className="pt-[52px] px-[24px] mb-[24px] flex items-center gap-3">
        <button 
          onClick={() => navigate(-1)}
          className="w-9 h-9 bg-white rounded-[12px] flex items-center justify-center shrink-0 transition-opacity active:opacity-80"
        >
          <ArrowLeft size={18} stroke="#6B6B6B" strokeWidth={1.5} />
        </button>
        <div className="flex-1">
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#A39887] mb-0.5">{group.name}</div>
          <h1 className="text-[24px] font-extrabold text-[#1A1A1A] tracking-tight leading-tight">
            {isDrawn ? "Le tirage a eu lieu." : "Tirage au sort"}
          </h1>
        </div>
      </div>

      {error && (
        <div className="mx-4 mb-4 bg-[#FFF5F5] border border-[#EDECEA] rounded-[14px] p-3 text-[12px] font-semibold text-[#6B6B6B] text-center">
          {error}
        </div>
      )}

      {/* CAS A — AVANT LE TIRAGE */}
      {!isDrawn ? (
        <div className="flex flex-col items-center px-8 text-center mt-8 gap-4">
          <div className="w-16 h-16 bg-[#F0FDF4] rounded-full flex items-center justify-center mx-auto">
            <Clock size={28} stroke="#047857" />
          </div>
          <h2 className="text-[18px] font-extrabold text-[#1A1A1A]">Tirage en attente</h2>
          <p className="text-[13px] text-[#A39887] leading-relaxed max-w-[240px]">
            Le tirage aura lieu automatiquement dès que tous les membres auront rejoint le cercle.
          </p>
          
          <div className="bg-white border border-[#F5F4F2] rounded-[20px] p-4 w-full mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[12px] font-semibold text-[#6B6B6B]">Membres rejoints</span>
              <span className="text-[13px] font-extrabold text-[#1A1A1A]">{members.length} / {group.target_members}</span>
            </div>
            <div className="bg-[#E8E6E3] h-1 rounded-full overflow-hidden">
              <div 
                className="bg-[#047857] h-full rounded-full transition-all duration-700" 
                style={{ width: `${(members.length / group.target_members) * 100}%` }} 
              />
            </div>
          </div>
          
          <button 
            onClick={() => navigate(-1)} 
            className="w-full bg-[#047857] text-white rounded-[16px] py-4 text-[15px] font-bold mt-8 active:opacity-90 transition-opacity"
          >
            Retour au cercle
          </button>
        </div>
      ) : (
        /* CAS B & C — APRÈS LE TIRAGE */
        <div className="flex flex-col flex-1">
          
          {/* HERO POSITION */}
          <div className="flex flex-col items-center mb-7">
            <p className="text-[12px] font-semibold text-[#A39887] mb-4 tracking-[0.02em]">Votre position de tirage</p>
            <div className="relative w-[130px] h-[130px]">
              <div className="border-4 border-[#047857] rounded-full w-full h-full absolute" />
              <div className="absolute inset-[8px] rounded-full bg-[#F0FDF4]" />
              <div className="absolute inset-0 flex items-center justify-center text-[56px] font-extrabold text-[#047857] tracking-[-0.04em] leading-none z-10">
                #{myMember.draw_position}
              </div>
            </div>
            <p className="text-[15px] font-bold text-[#1A1A1A] mb-1.5 mt-5">Position {myMember.draw_position} sur {group.target_members}</p>
            <p className="text-[13px] font-normal text-[#A39887] text-center leading-relaxed max-w-[240px]">
              Vous recevrez la cagnotte au {myMember.draw_position}{myMember.draw_position === 1 ? 'er' : 'ème'} cycle. {isCaseC ? "Un complément de caution est requis." : "Aucune action requise."}
            </p>
          </div>

          {/* NOTE INFORMATIVE (CAS C) */}
          {isCaseC && !myMember.deposit_differential_paid && (
            <div className="bg-[#F0FDF4] rounded-[14px] mx-4 mb-4 p-3.5 flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-[#047857] rounded-full flex-shrink-0 mt-1.5" />
              <p className="text-[12px] font-medium text-[#047857] leading-relaxed">
                Un complément de <span className="font-bold">{formatXOF(deposit_differential)}</span> est requis sous 48h. Sans régularisation, votre position sera automatiquement déplacée dans la seconde moitié du groupe, sans pénalité.
              </p>
            </div>
          )}

          {/* LISTE POSITIONS */}
          <div className="bg-white rounded-[20px] p-4 px-[18px] mx-4 mb-5">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#A39887] mb-3">ORDRE DE RÉCEPTION</h3>
            <div className="flex flex-col">
              {members.map((m) => {
                const isMe = m.user_id === auth.currentUser?.uid;
                const isPriority = m.draw_position !== null && m.draw_position <= top30Threshold;
                const needsDiff = isPriority && !m.deposit_differential_paid;

                return (
                  <div key={m.id} className="flex items-center gap-3 py-2.5 border-b border-[#F8F7F6] last:border-0">
                    <div className={`w-7 h-7 rounded-[9px] text-[12px] font-extrabold flex items-center justify-center flex-shrink-0 ${isMe ? 'bg-[#047857] text-white' : 'bg-[#FAFAF8] text-[#A39887]'}`}>
                      {m.draw_position}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#1A1A1A] mb-0.5 truncate">{m.member_name || 'Membre'} {isMe && '(Moi)'}</p>
                      <p className="text-[11px] text-[#A39887]">Cycle {m.draw_position}</p>
                    </div>
                    <div className={`px-2 py-1 rounded-[6px] text-[10px] font-bold ${isMe ? 'bg-[#F0FDF4] text-[#047857]' : needsDiff ? 'bg-[#F5F4F2] text-[#6B6B6B]' : 'bg-transparent text-[#A39887]'}`}>
                      {isMe ? (needsDiff ? 'À compléter' : 'Moi') : needsDiff ? 'Attente caution' : '—'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CTAs */}
          <div className="px-4 flex flex-col gap-2.5 mt-auto">
            {isCaseC && !myMember.deposit_differential_paid ? (
              <>
                <button 
                  onClick={() => navigate(`/group/${groupId}/adjust-deposit`)} 
                  className="w-full bg-[#047857] text-white rounded-[16px] py-4 text-[15px] font-bold active:opacity-90 transition-opacity"
                >
                  Compléter ma caution · {formatXOF(deposit_differential)}
                </button>
                <button 
                  onClick={handleRefuse} 
                  disabled={loading}
                  className="w-full bg-white text-[#1A1A1A] rounded-[16px] py-4 text-[15px] font-bold active:bg-gray-50 transition-colors"
                >
                  Refuser et être repositionné
                </button>
              </>
            ) : (
              <button 
                onClick={() => navigate(-1)} 
                className="w-full bg-[#047857] text-white rounded-[16px] py-4 text-[15px] font-bold active:opacity-90 transition-opacity"
              >
                Retour au cercle
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}