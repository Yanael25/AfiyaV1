import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { getTontineGroup, getGroupMembers } from '../../services/tontineService';
import { motion } from 'framer-motion';

export function TirageAuSort() {
  const navigate = useNavigate();
  const { groupId } = useParams();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [myMember, setMyMember] = useState<any>(null);
  
  // État pour gérer la transition entre l'écran d'attente et la révélation
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const user = auth.currentUser;
        if (!user || !groupId) return;

        const [groupData, membersData] = await Promise.all([
          getTontineGroup(groupId),
          getGroupMembers(groupId)
        ]);

        if (!groupData) throw new Error("Cercle introuvable");

        const currentMember = membersData.find((m: any) => m.user_id === user.uid);
        if (!currentMember) throw new Error("Vous n'êtes pas membre de ce cercle");

        // Tri par position (nulls à la fin si non tiré)
        const sortedMembers = [...membersData].sort((a, b) => {
          if (a.draw_position === null && b.draw_position === null) return 0;
          if (a.draw_position === null) return 1;
          if (b.draw_position === null) return -1;
          return a.draw_position - b.draw_position;
        });

        setGroup(groupData);
        setMembers(sortedMembers);
        setMyMember(currentMember);

        // Si le tirage a été fait, on affiche une animation d'attente de 2s puis on révèle
        if (currentMember.draw_position !== null) {
          setTimeout(() => setIsRevealed(true), 2000);
        }

      } catch (e: any) {
        setError(e.message || "Une erreur est survenue");
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [groupId]);

  // Fonction pour extraire les initiales
  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
  };

  // Calcul de la date de réception estimée
  const getEstimatedDate = (position: number) => {
    const date = new Date();
    // Approximation basique basée sur le mois actuel + la position
    date.setMonth(date.getMonth() + position);
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  if (loading) {
    return <div className="min-h-screen bg-[#047857] pt-[52px]" />;
  }

  const isDrawn = myMember?.draw_position !== null;
  const threshold60 = Math.ceil((group?.target_members || 0) * 0.6);
  const requiresComplement = isDrawn && myMember.draw_position <= threshold60;

  return (
    <div className="min-h-screen bg-[#047857] font-sans flex flex-col relative overflow-hidden">
      
      {/* HEADER */}
      <div className="pt-[52px] px-6 pb-6 flex flex-col items-center relative shrink-0">
        <button 
          onClick={() => navigate(-1)}
          className="absolute left-6 top-[52px] w-[36px] h-[36px] rounded-[11px] bg-[rgba(255,255,255,0.15)] flex items-center justify-center active:scale-95 transition-transform"
        >
          <ArrowLeft size={16} className="text-white" strokeWidth={2} />
        </button>
        
        <h1 className="text-[18px] font-[800] text-white text-center leading-tight">
          Tirage au sort
        </h1>
        <p className="text-[12px] font-[500] text-[rgba(255,255,255,0.7)] text-center mt-1">
          {group?.name}
        </p>
      </div>

      {error && (
        <div className="mx-6 mb-4 bg-[#F5F4F0] border-l-[2px] border-[#92400E] p-[10px] rounded-r-[10px] flex items-center gap-2">
          <span className="text-[11px] font-[600] text-[#92400E]">{error}</span>
        </div>
      )}

      {/* ZONE PRINCIPALE */}
      <div className={`flex-1 flex flex-col ${isRevealed ? 'overflow-y-auto pb-[260px]' : 'justify-center items-center pb-20'}`}>
        
        {!isRevealed ? (
          // AVANT RÉVÉLATION (ou en cours de calcul)
          <div className="flex flex-col items-center px-6">
            <motion.div 
              animate={{ rotate: 360 }} 
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
              className="mb-6 opacity-80"
            >
              <Users size={48} className="text-white" strokeWidth={1.5} />
            </motion.div>
            <h2 className="text-[16px] font-[600] text-white text-center mb-2">
              {isDrawn ? 'Préparation des résultats...' : 'Tirage en attente...'}
            </h2>
            <p className="text-[12px] font-[500] text-[rgba(255,255,255,0.7)] text-center max-w-[280px] leading-relaxed">
              {isDrawn 
                ? "Afiya génère l'affichage de votre ordre de réception."
                : "Les positions sont attribuées de façon aléatoire et impartiale par Afiya une fois le cercle complet."}
            </p>
          </div>
        ) : (
          // APRÈS RÉVÉLATION — Liste des membres
          <div className="flex flex-col">
            {members.map((m, index) => {
              const isMe = m.user_id === auth.currentUser?.uid;
              
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.3 }}
                  className={`mx-[24px] mb-[8px] rounded-[14px] p-[14px] flex items-center gap-4 transition-colors ${
                    isMe 
                      ? 'bg-[rgba(255,255,255,0.25)] border-[1px] border-[rgba(255,255,255,0.4)]' 
                      : 'bg-[rgba(255,255,255,0.12)]'
                  }`}
                >
                  <span className="text-[20px] font-[800] text-white w-[30px]">
                    #{m.draw_position}
                  </span>
                  
                  <div className="w-[36px] h-[36px] rounded-[10px] bg-[rgba(255,255,255,0.2)] flex items-center justify-center shrink-0">
                    <span className="text-white text-[14px] font-[700]">
                      {getInitials(m.member_name)}
                    </span>
                  </div>
                  
                  <span className="text-[14px] font-[600] text-white flex-1 truncate">
                    {m.member_name}
                  </span>
                  
                  {isMe && (
                    <div className="bg-white text-[#047857] text-[10px] font-[700] px-2 py-1 rounded-[6px] uppercase tracking-wider shrink-0">
                      Vous
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* VOTRE POSITION (Sticky Footer) */}
      {isRevealed && isDrawn && myMember && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: members.length * 0.3 + 0.2 }}
          className="fixed bottom-0 left-0 right-0 pb-[24px] px-[16px] bg-gradient-to-t from-[#047857] via-[#047857] to-transparent pt-8"
        >
          <div className="bg-white rounded-[20px] p-[20px] border-[0.5px] border-[#EDECEA] flex flex-col shadow-lg">
            <span className="text-[10px] font-[700] uppercase text-[#A39887] tracking-[0.1em] mb-1">
              Votre position
            </span>
            <span className="text-[32px] font-[800] text-[#1A1A1A] leading-none tracking-tight">
              #{myMember.draw_position} <span className="text-[16px] font-[600] text-[#A39887]">sur {group.target_members} membres</span>
            </span>
            <span className="text-[13px] font-[500] text-[#A39887] mt-[4px]">
              Réception estimée · <span className="capitalize">{getEstimatedDate(myMember.draw_position)}</span>
            </span>

            {requiresComplement ? (
              <>
                <div className="bg-[#FEF3C7] rounded-[8px] p-[10px] flex items-start gap-2 mt-[16px]">
                  <AlertCircle size={14} className="text-[#92400E] shrink-0 mt-[1px]" strokeWidth={2.5} />
                  <span className="text-[12px] font-[600] text-[#92400E] leading-snug">
                    Un complément de caution est requis pour confirmer votre place.
                  </span>
                </div>
                <button
                  onClick={() => navigate(`/group/${groupId}/adjust-deposit`)}
                  className="w-full h-[48px] bg-[#047857] text-white rounded-[14px] text-[14px] font-[700] mt-[12px] active:scale-95 transition-transform flex items-center justify-center"
                >
                  Compléter
                </button>
              </>
            ) : (
              <>
                <div className="bg-[#F0FDF4] rounded-[8px] p-[10px] flex items-start gap-2 mt-[16px]">
                  <CheckCircle2 size={14} className="text-[#047857] shrink-0 mt-[1px]" strokeWidth={2.5} />
                  <span className="text-[12px] font-[600] text-[#047857] leading-snug">
                    Aucun complément requis. Votre position est confirmée.
                  </span>
                </div>
                <button
                  onClick={() => navigate(`/group/${groupId}`)}
                  className="w-full h-[48px] bg-[#047857] text-white rounded-[14px] text-[14px] font-[700] mt-[12px] active:scale-95 transition-transform flex items-center justify-center"
                >
                  Accéder au cercle
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}

    </div>
  );
}