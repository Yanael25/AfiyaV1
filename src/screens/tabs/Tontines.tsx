import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LogIn, Search, Users, Clock, ArrowRight, ShieldCheck, Coins, RefreshCw, User } from 'lucide-react';
import { motion } from 'motion/react';
import { formatXOF } from '../../lib/utils';
import { auth, db } from '../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getUserGroups, TontineMember, Cycle } from '../../services/tontineService';

export function Tontines() {
  const navigate = useNavigate();
  const [groupsData, setGroupsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      const membershipsQuery = query(
        collection(db, 'tontine_members'),
        where('user_id', '==', user.uid)
      );
      const membershipsSnap = await getDocs(membershipsQuery);
      const memberships = membershipsSnap.docs.map(doc => doc.data() as TontineMember);

      if (memberships.length === 0) {
        setGroupsData([]);
        setLoading(false);
        return;
      }

      const fetchedGroups = await getUserGroups(user.uid);
      const groupIds = fetchedGroups.map(g => g.id);

      const activeCycles: Record<string, Cycle> = {};
      if (groupIds.length > 0) {
        for (let i = 0; i < groupIds.length; i += 10) {
          const chunk = groupIds.slice(i, i + 10);
          const cyclesQuery = query(
            collection(db, 'cycles'),
            where('group_id', 'in', chunk),
            where('status', '==', 'ACTIVE')
          );
          const cyclesSnap = await getDocs(cyclesQuery);
          cyclesSnap.docs.forEach(doc => {
            const cycle = doc.data() as Cycle;
            activeCycles[cycle.group_id] = cycle;
          });
        }
      }

      const beneficiaryIds = Object.values(activeCycles).map(c => c.beneficiary_member_id);
      const beneficiaries: Record<string, string> = {};
      
      if (beneficiaryIds.length > 0) {
        for (let i = 0; i < beneficiaryIds.length; i += 10) {
          const chunk = beneficiaryIds.slice(i, i + 10);
          const membersQuery = query(
            collection(db, 'tontine_members'),
            where('id', 'in', chunk)
          );
          const membersSnap = await getDocs(membersQuery);
          
          const userIdsToFetch: string[] = [];
          const memberToUserMap: Record<string, string> = {};
          
          membersSnap.docs.forEach(doc => {
            const m = doc.data();
            userIdsToFetch.push(m.user_id);
            memberToUserMap[m.id] = m.user_id;
          });

          if (userIdsToFetch.length > 0) {
            const profilesQuery = query(
              collection(db, 'profiles'),
              where('id', 'in', userIdsToFetch)
            );
            const profilesSnap = await getDocs(profilesQuery);
            const userProfiles: Record<string, any> = {};
            profilesSnap.docs.forEach(doc => {
              userProfiles[doc.data().id] = doc.data();
            });

            Object.entries(memberToUserMap).forEach(([memberId, userId]) => {
              beneficiaries[memberId] = userProfiles[userId]?.full_name?.split(' ')[0] || 'Membre';
            });
          }
        }
      }

      const combinedData = fetchedGroups.map(group => {
        const membership = memberships.find(m => m.group_id === group.id);
        const activeCycle = activeCycles[group.id];
        const beneficiaryName = activeCycle ? beneficiaries[activeCycle.beneficiary_member_id] : null;
        
        return {
          ...group,
          userMembership: membership,
          activeCycle,
          beneficiaryName
        };
      });

      combinedData.sort((a, b) => {
        const dateA = a.created_at?.toDate?.() || new Date(0);
        const dateB = b.created_at?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      setGroupsData(combinedData);
    } catch (error) {
      console.error("Error loading groups:", error);
    } finally {
      setLoading(false);
    }
  };

  const cleanAmount = (val: number) => {
    return formatXOF(val).replace(/\s?FCFA/gi, '').trim();
  };

  const formatShortDate = (timestamp: any) => {
    if (!timestamp) return '--/--';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  };

  const getDaysLeft = (timestamp: any) => {
    if (!timestamp) return 0;
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffDays = Math.ceil((date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const activeGroupsCount = groupsData.filter(g => g.status === 'ACTIVE').length;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="bg-[#FAFAF8] min-h-screen pb-[120px] flex flex-col font-sans selection:bg-[#047857]/20"
    >
      
      {/* HEADER */}
      <div className="pt-[60px] px-6 mb-6 flex justify-between items-start">
        <div className="pt-1">
          <h1 className="font-display text-[32px] font-extrabold text-[#1A1A1A] tracking-tight mb-1 leading-none">Mes Cercles</h1>
          <p className="text-[14px] font-medium text-[#A39887] mt-2">
            {activeGroupsCount} cercle{activeGroupsCount > 1 ? 's' : ''} actif{activeGroupsCount > 1 ? 's' : ''}
          </p>
        </div>
        
        {/* Actions secondaires alignées */}
        <div className="flex gap-2.5 items-center">
          <button className="w-11 h-11 bg-white rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-sm border border-[#F0EFED]">
            <Search size={20} strokeWidth={1.5} className="text-[#1A1A1A]" />
          </button>
          <button 
            onClick={() => navigate('/cercles/historique')}
            className="flex items-center gap-2 px-4 h-11 bg-white rounded-full transition-transform active:scale-95 shadow-sm border border-[#F0EFED]"
          >
            <Clock size={18} strokeWidth={1.5} className="text-[#1A1A1A]" />
            <span className="text-[14px] font-bold text-[#1A1A1A]">Historique</span>
          </button>
        </div>
      </div>

      {/* CTAs Principaux (Créer / Rejoindre) figés en grille */}
      <div className="grid grid-cols-2 gap-3 mx-6 mb-8">
        <button 
          onClick={() => navigate('/group/create')}
          className="bg-[#047857] text-white rounded-[20px] py-4 flex items-center justify-center gap-2.5 transition-transform active:scale-[0.98] shadow-[0_8px_20px_rgba(4,120,87,0.25)]"
        >
          <Plus size={20} strokeWidth={2} />
          <span className="text-[14px] font-bold">Créer un cercle</span>
        </button>
        <button 
          onClick={() => navigate('/group/join')}
          className="bg-white text-[#1A1A1A] rounded-[20px] py-4 flex items-center justify-center gap-2.5 transition-transform active:scale-[0.98] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#F0EFED]"
        >
          <LogIn size={20} strokeWidth={2} />
          <span className="text-[14px] font-bold">Rejoindre</span>
        </button>
      </div>

      {/* CONTENU (Liste ou État Vide) */}
      <div className="flex flex-col gap-4 mx-6 flex-1">
        {loading ? (
          <div className="flex flex-col gap-4">
            <div className="h-[280px] w-full bg-[#E8E6E3] rounded-[24px] animate-pulse" />
            <div className="h-[280px] w-full bg-[#E8E6E3] rounded-[24px] animate-pulse" />
          </div>
        ) : groupsData.length === 0 ? (
          
          /* ÉTAT VIDE : "COMMENT ÇA MARCHE" */
          <div className="flex flex-col flex-1 justify-center pb-10 mt-2">
            <div className="bg-white rounded-[24px] p-8 flex flex-col gap-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-[#F0EFED]">
              
              <div className="flex items-center gap-4 mb-2">
                 <div className="w-12 h-12 bg-[#F0FDF4] rounded-[16px] flex items-center justify-center shrink-0">
                   <Users size={24} className="text-[#047857]" strokeWidth={1.5} />
                 </div>
                 <div>
                   <h3 className="font-display text-[20px] font-bold text-[#1A1A1A] tracking-tight mb-0.5">Comment ça marche ?</h3>
                   <p className="text-[13px] font-medium text-[#A39887]">Le principe de la tontine Afiya</p>
                 </div>
              </div>

              <div className="h-[1px] w-full bg-[#F0EFED]" />

              <div className="flex flex-col gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#FAFAF8] flex items-center justify-center shrink-0 mt-0.5 text-[14px] font-bold text-[#047857]">
                    1
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-[#1A1A1A] mb-1">Formez un groupe</p>
                    <p className="text-[14px] text-[#A39887] leading-relaxed">Invitez vos proches ou rejoignez un cercle public de confiance.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#FAFAF8] flex items-center justify-center shrink-0 mt-0.5 text-[14px] font-bold text-[#047857]">
                    2
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-[#1A1A1A] mb-1">Épargnez ensemble</p>
                    <p className="text-[14px] text-[#A39887] leading-relaxed">Chaque membre verse sa cotisation au rythme défini (hebdo/mensuel).</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#FAFAF8] flex items-center justify-center shrink-0 mt-0.5 text-[14px] font-bold text-[#047857]">
                    3
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-[#1A1A1A] mb-1">Recevez la cagnotte</p>
                    <p className="text-[14px] text-[#A39887] leading-relaxed">À tour de rôle, un membre récupère l'intégralité des fonds du cycle.</p>
                  </div>
                </div>
              </div>
              
            </div>
          </div>

        ) : (
          groupsData.map((group, idx) => {
            const isForming = group.status === 'FORMING' || group.status === 'DRAFT' || group.status === 'WAITING_VOTE';
            const isActive = group.status === 'ACTIVE';
            const membersCount = group.members_count || 1;
            const progress = isForming 
              ? (membersCount / group.target_members) * 100 
              : (group.current_cycle / group.total_cycles) * 100;

            const totalPot = group.contribution_amount * group.target_members;

            return (
              <motion.div 
                key={group.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => navigate(`/group/${group.id}`)}
                className="bg-white rounded-[24px] p-6 cursor-pointer transition-transform active:scale-[0.98] shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-[#F0EFED]"
              >
                {/* En-tête de la carte */}
                <div className="flex justify-between items-start mb-2">
                  <h2 className="font-display text-[20px] font-bold text-[#1A1A1A] truncate max-w-[70%]">{group.name}</h2>
                  <span className={`text-[10px] font-bold uppercase tracking-[0.08em] px-2.5 py-1 rounded-[8px] shrink-0 ${
                    isActive ? 'bg-[#F0FDF4] text-[#047857] border border-[#047857]/10' : 'bg-[#FFF8F1] text-[#E65100] border border-[#E65100]/10'
                  }`}>
                    {isActive ? 'Actif' : 'En attente'}
                  </span>
                </div>

                <div className="text-[14px] font-medium text-[#A39887] mb-6">
                  {group.is_public ? 'Cercle public' : 'Cercle privé'} • {group.target_members} membres
                </div>

                {/* Blocs Statistiques avec Typo Ajustée */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-[#FAFAF8] rounded-[16px] p-4 flex flex-col justify-center">
                    <div className="flex items-baseline gap-1 mb-1.5">
                      <span className="font-display text-[22px] font-bold text-[#1A1A1A] tracking-tight">
                        {isForming ? `${membersCount} / ${group.target_members}` : cleanAmount(totalPot)}
                      </span>
                      {!isForming && <span className="text-[13px] font-bold text-[#A39887]">FCFA</span>}
                    </div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#A39887]">
                      {isForming ? 'Membres rejoints' : 'Cagnotte totale'}
                    </div>
                  </div>
                  
                  <div className="bg-[#FAFAF8] rounded-[16px] p-4 flex flex-col justify-center">
                    <div className="font-display text-[22px] font-bold text-[#1A1A1A] tracking-tight mb-1.5">
                      {isForming ? `${getDaysLeft(group.constitution_deadline)} jours` : `#${group.userMembership?.draw_position || '?'}`}
                    </div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#A39887]">
                      {isForming ? 'Restants' : 'Mon tirage'}
                    </div>
                  </div>
                </div>

                {/* Face Piles & Barre de progression */}
                <div className="w-full mb-5">
                  <div className="flex items-center justify-between mb-3">
                    {/* Face Pile */}
                    <div className="flex items-center">
                      {[...Array(Math.min(membersCount, 4))].map((_, i) => (
                        <div key={i} className={`w-8 h-8 rounded-full border-2 border-white bg-[#E8E6E3] flex items-center justify-center text-[#6B6B6B] ${i > 0 ? '-ml-3' : ''}`} style={{ zIndex: 10 - i }}>
                          <User size={14} strokeWidth={2} />
                        </div>
                      ))}
                      {membersCount > 4 && (
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-[#FAFAF8] flex items-center justify-center text-[11px] font-bold text-[#1A1A1A] -ml-3 z-0">
                          +{membersCount - 4}
                        </div>
                      )}
                      {isForming && [...Array(Math.min(group.target_members - membersCount, 3))].map((_, i) => (
                        <div key={`empty-${i}`} className="w-8 h-8 rounded-full border-2 border-white border-dashed border-[#C4B8AC] bg-transparent -ml-3" style={{ zIndex: -1 - i }} />
                      ))}
                    </div>
                    
                    <span className="text-[13px] font-semibold text-[#A39887]">
                      {isForming ? `${membersCount}/${group.target_members} membres` : `${group.current_cycle}/${group.total_cycles} cycles`}
                    </span>
                  </div>

                  <div className="bg-[#F0EFED] h-1.5 rounded-full overflow-hidden mb-2">
                    <div 
                      className="bg-[#047857] h-full rounded-full transition-all duration-500" 
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  
                  {isActive && (
                    <div className="flex justify-end">
                      <span className="text-[12px] text-[#047857] font-bold">Tour de {group.beneficiaryName || '...'}</span>
                    </div>
                  )}
                </div>

                {/* Strip Action Bas */}
                {isActive ? (
                  <div className="bg-[#F0FDF4] rounded-[16px] px-5 py-4 flex justify-between items-center mt-2">
                    <span className="text-[13px] font-bold text-[#047857]">
                      Cotisation {group.activeCycle?.payment_due_date ? `• ${formatShortDate(group.activeCycle.payment_due_date)}` : ''}
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="font-display text-[16px] font-bold text-[#047857]">
                        -{cleanAmount(group.contribution_amount)}
                      </span>
                      <span className="text-[12px] font-bold text-[#047857]">FCFA</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#FAFAF8] rounded-[16px] px-5 py-4 flex justify-between items-center mt-2 group-active:bg-[#F0EFED] transition-colors border border-[#F0EFED]">
                    <span className="text-[13px] font-bold text-[#1A1A1A]">
                      {group.target_members - membersCount} places restantes • Inviter
                    </span>
                    <ArrowRight size={18} strokeWidth={1.5} className="text-[#1A1A1A]" />
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>
      
    </motion.div>
  );
}