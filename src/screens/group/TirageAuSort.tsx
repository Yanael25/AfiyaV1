import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Info, AlertTriangle, Check, ChevronRight } from 'lucide-react';
import { formatXOF } from '../../lib/utils';
import { auth } from '../../lib/firebase';
import { getTontineGroup, getGroupMembers, repositionMember } from '../../services/tontineService';
import { motion } from 'motion/react';

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

  const cleanAmount = (val: number) => {
    return formatXOF(val).replace(/\s?FCFA/gi, '').trim();
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
  
  // Calcul du différentiel
  const deposit_differential = myMember.initial_deposit;

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-[#022C22] font-sans flex flex-col selection:bg-[#047857]/20 relative"
    >
      
      {/* HEADER FIXE V3 */}
      <div className="pt-[52px] px-6 pb-4 flex items-center gap-4 bg-[#022C22] sticky top-0 z-50 border-b border-white/10">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 border border-white/10"
        >
          <ArrowLeft size={20} className="text-white" strokeWidth={1.5} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-[22px] font-extrabold text-white tracking-tight truncate">
            {isDrawn ? "Résultat du tirage" : "Tirage au sort"}
          </h1>
          <p className="text-[12px] font-medium text-white/60 truncate">
            {group.name}
          </p>
        </div>
      </div>

      {/* CONTENU SCROLLABLE */}
      <div className={`flex-1 overflow-y-auto px-6 pt-6 ${isCaseC && !myMember.deposit_differential_paid ? 'pb-[220px]' : 'pb-[120px]'}`}>
        
        {error && (
          <div className="mb-6 bg-[#FEF2F2] border border-[#FCA5A5] rounded-[16px] p-4 text-[13px] font-semibold text-[#DC2626] flex items-center gap-3">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* CAS A — AVANT LE TIRAGE */}
        {!isDrawn ? (
          <div className="bg-white/5 border border-white/10 rounded-[24px] p-8 flex flex-col items-center text-center mt-4 backdrop-blur-sm">
            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <Clock size={32} stroke="#10B981" strokeWidth={1.5} />
            </div>
            <h2 className="font-display text-[24px] font-extrabold text-white tracking-tight mb-2">Tirage en attente</h2>
            <p className="text-[13px] text-white/60 leading-relaxed max-w-[260px] mb-8">
              L'ordre de réception sera généré automatiquement dès que le cercle sera complet.
            </p>
            
            <div className="w-full bg-white/5 rounded-[16px] p-5 border border-white/10">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[12px] font-semibold text-white/60">Membres rejoints</span>
                <span className="font-display text-[16px] font-extrabold text-white">{members.length} / {group.target_members}</span>
              </div>
              <div className="bg-white/10 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-[#10B981] h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                  style={{ width: `${(members.length / group.target_members) * 100}%` }} 
                />
              </div>
            </div>
          </div>
        ) : (
          /* CAS B & C — APRÈS LE TIRAGE */
          <div className="flex flex-col">
            
            {/* HERO POSITION : LE GRAND ANNEAU VERT */}
            <div className="bg-gradient-to-b from-[#064E3B] to-[#022C22] rounded-[32px] pt-10 pb-8 px-6 mb-5 flex flex-col items-center relative overflow-hidden shadow-2xl border border-white/10">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/60 mb-8">Votre tour de réception</p>
              
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
                className="relative w-44 h-44 flex items-center justify-center mb-8"
              >
                {/* SVG Ring pour un rendu parfait (pas de bordures CSS basiques) */}
                <svg className="absolute inset-0 w-full h-full transform -rotate-90 drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="47" stroke="rgba(255,255,255,0.1)" strokeWidth="4" fill="none" />
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="47" 
                    stroke="#10B981" 
                    strokeWidth="4" 
                    fill="none" 
                    strokeDasharray="295" 
                    strokeDashoffset="0" 
                    strokeLinecap="round"
                  />
                </svg>
                
                {/* Centre de l'anneau */}
                <div className="bg-[#022C22] w-[150px] h-[150px] rounded-full flex flex-col items-center justify-center shadow-[inset_0_4px_20px_rgba(0,0,0,0.5)] border border-white/5">
                  <span className="text-[12px] font-bold text-white/60 uppercase tracking-[0.1em] mb-1">Position</span>
                  <span className="font-display text-[64px] font-black text-white leading-none tracking-tighter -mr-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                    <span className="text-[32px] text-white/50">#</span>{myMember.draw_position}
                  </span>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
                className="text-center"
              >
                <p className="font-display text-[18px] font-extrabold text-white mb-2">
                  Vous recevez au cycle {myMember.draw_position}
                </p>
                <p className="text-[13px] font-medium text-white/70 max-w-[260px] mx-auto leading-relaxed">
                  {isCaseC 
                    ? "Excellente position ! Un complément de caution est requis pour confirmer." 
                    : "Votre position est validée. Aucune action n'est requise de votre part."}
                </p>
              </motion.div>
            </div>

            {/* LISTE DE L'ORDRE DE RÉCEPTION */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="bg-white/5 backdrop-blur-sm rounded-[24px] p-6 mb-5 shadow-sm border border-white/10"
            >
              <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/60 mb-5">Ordre de réception · {group.target_members} Cycles</h3>
              <div className="flex flex-col gap-2">
                {members.map((m) => {
                  const isMe = m.user_id === auth.currentUser?.uid;
                  const isPriority = m.draw_position !== null && m.draw_position <= top30Threshold;
                  const needsDiff = isPriority && !m.deposit_differential_paid;

                  return (
                    <div key={m.id} className={`flex items-center gap-3 p-3 rounded-[16px] transition-colors ${isMe ? 'bg-white/10 border border-white/20' : 'bg-transparent border border-transparent'}`}>
                      <div className={`w-11 h-11 rounded-[14px] flex items-center justify-center text-[14px] font-black shrink-0 shadow-sm ${
                        isMe ? 'bg-[#10B981] text-white' : 'bg-white/5 text-white border border-white/10'
                      }`}>
                        {m.draw_position}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-display text-[16px] font-bold text-white truncate">{m.member_name || 'Membre'}</p>
                        </div>
                        <p className="text-[12px] font-medium text-white/60">Cycle {m.draw_position}</p>
                      </div>
                      <div className="shrink-0">
                        {isMe ? (
                          <span className={`text-[10px] font-bold uppercase tracking-[0.05em] px-3 py-1.5 rounded-[8px] shadow-sm ${needsDiff ? 'bg-[#FFF3E0] text-[#E65100]' : 'bg-[#10B981] text-white'}`}>
                            {needsDiff ? 'Complément requis' : 'Moi'}
                          </span>
                        ) : needsDiff ? (
                          <span className="text-[11px] font-bold text-white/40">En attente</span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

          </div>
        )}
      </div>

      {/* CALL TO ACTIONS FLOTTANTS */}
      
      {/* Action 1 : Si l'utilisateur doit payer un complément (Cas C) */}
      {isDrawn && isCaseC && !myMember.deposit_differential_paid ? (
        <div className="fixed bottom-0 left-0 right-0 px-6 pb-8 pt-12 bg-gradient-to-t from-[#022C22] via-[#022C22] to-transparent z-40 pointer-events-none">
          <div className="flex flex-col gap-3 pointer-events-auto">
            {/* Bouton Principal (Payer) */}
            <button 
              onClick={() => navigate(`/group/${groupId}/adjust-deposit`)} 
              className="w-full bg-white text-[#022C22] rounded-[24px] p-4 flex items-center justify-between shadow-[0_12px_24px_rgba(0,0,0,0.5)] active:scale-[0.98] transition-transform"
            >
              <div className="flex flex-col items-start text-left ml-2">
                <span className="text-[12px] font-medium text-[#022C22]/70">Complément de caution</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-display text-[24px] font-extrabold tracking-tight">{cleanAmount(deposit_differential)}</span>
                  <span className="text-[12px] font-bold text-[#022C22]/70">FCFA</span>
                </div>
              </div>
              <div className="bg-[#10B981] text-white text-[13px] font-bold px-6 py-3 rounded-[14px]">
                Compléter
              </div>
            </button>
            
            {/* Bouton Secondaire (Refuser) */}
            <button 
              onClick={handleRefuse} 
              disabled={loading}
              className="w-full bg-transparent text-white border border-white/20 rounded-[24px] py-4 text-[14px] font-bold active:bg-white/5 transition-colors shadow-sm"
            >
              Refuser et céder la position
            </button>
          </div>
        </div>
      ) : (
        /* Action 2 : Simple retour (Pour tous les autres cas) */
        <div className="fixed bottom-0 left-0 right-0 px-6 pb-8 pt-12 bg-gradient-to-t from-[#022C22] via-[#022C22] to-transparent z-40 pointer-events-none">
          <button 
            onClick={() => navigate(-1)} 
            className="w-full bg-[#10B981] text-white rounded-[24px] py-4 text-[15px] font-bold active:scale-[0.98] transition-transform shadow-[0_12px_24px_rgba(16,185,129,0.3)] pointer-events-auto"
          >
            Retour au cercle
          </button>
        </div>
      )}

    </motion.div>
  );
}