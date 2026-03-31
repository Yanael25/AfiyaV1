import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LogIn, Search, Users, ArrowRight, History } from 'lucide-react';
import { formatXOF } from '../../lib/utils';
import { auth, db } from '../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getUserGroups, TontineMember, Cycle } from '../../services/tontineService';
import { getUserProfile } from '../../services/userService';

export function Tontines() {
  const navigate = useNavigate();
  const [groupsData, setGroupsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      const profile = await getUserProfile(user.uid);
      setUserProfile(profile);

      // 1. Fetch user's memberships
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

      // 2. Fetch groups
      const fetchedGroups = await getUserGroups(user.uid);
      const groupIds = fetchedGroups.map(g => g.id);

      // 3. Fetch active cycles for these groups
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

      // 4. Fetch beneficiaries names for active cycles
      const beneficiaryIds = Object.values(activeCycles).map(c => c.beneficiary_member_id);
      const beneficiaries: Record<string, string> = {};
      
      if (beneficiaryIds.length > 0) {
        // We need to fetch the actual user profiles for these members
        // To keep it simple, we'll just use a placeholder if we can't fetch easily,
        // but let's try to fetch the member docs first to get the user_id
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
              beneficiaries[memberId] = userProfiles[userId]?.full_name?.split(' ')[0] || 'Un membre';
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

      // Sort by created_at desc
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

  const formatShortDate = (timestamp: any) => {
    if (!timestamp) return '--/--';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  };

  const getDaysLeft = (timestamp: any) => {
    if (!timestamp) return 0;
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const activeGroupsCount = groupsData.filter(g => g.status === 'ACTIVE').length;

  return (
    <div className="bg-[#FAFAF8] min-h-screen pb-[80px] flex flex-col font-manrope">
      {/* HEADER */}
      <div className="pt-[52px] px-[24px] pb-[24px] flex justify-between items-start">
        <div>
          <div className="text-[26px] font-extrabold text-[#1A1A1A] tracking-[-0.02em] mb-[3px]">Mes Cercles</div>
          <div className="text-[13px] font-medium text-[#A39887]">
            {activeGroupsCount} cercle{activeGroupsCount !== 1 ? 's' : ''} actif{activeGroupsCount !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="flex gap-[8px] mt-[6px]">
          <button className="w-[36px] h-[36px] bg-white rounded-[12px] flex items-center justify-center shrink-0 border-none cursor-pointer">
            <Search size={17} strokeWidth={1.5} className="text-[#6B6B6B]" />
          </button>
          <button 
            onClick={() => navigate('/cercles/historique')}
            className="flex items-center gap-[6px] px-[14px] py-[8px] bg-white rounded-[12px] text-[12px] font-bold text-[#6B6B6B] border-none cursor-pointer"
          >
            <History size={14} strokeWidth={1.5} />
            Historique
          </button>
        </div>
      </div>

      {/* CTAs */}
      <div className="px-[16px] grid grid-cols-2 gap-[10px] mb-[28px]">
        <button 
          onClick={() => navigate('/group/create')}
          className="bg-[#047857] text-white rounded-[18px] p-[14px_16px] flex items-center gap-[10px] text-[13px] font-bold border-none cursor-pointer"
        >
          <div className="w-[28px] h-[28px] rounded-[9px] bg-white/20 flex items-center justify-center shrink-0">
            <Plus size={14} strokeWidth={2} className="text-white" />
          </div>
          Créer un cercle
        </button>
        <button 
          onClick={() => navigate('/group/join')}
          className="bg-white text-[#1A1A1A] rounded-[18px] p-[14px_16px] flex items-center gap-[10px] text-[13px] font-bold border-none cursor-pointer"
        >
          <div className="w-[28px] h-[28px] rounded-[9px] bg-[#F0FDF4] flex items-center justify-center shrink-0">
            <LogIn size={14} strokeWidth={1.5} className="text-[#047857]" />
          </div>
          Rejoindre
        </button>
      </div>

      {/* LISTE CERCLES */}
      <div className="flex flex-col">
        {loading ? (
          <div className="text-center py-8 text-[13px] font-medium text-[#A39887]">Chargement...</div>
        ) : groupsData.length === 0 ? (
          <div className="bg-white rounded-[20px] p-[36px_20px] mx-[16px] text-center">
            <div className="w-[48px] h-[48px] bg-[#F0FDF4] rounded-[16px] mx-auto mb-[14px] flex items-center justify-center">
              <Users size={22} strokeWidth={1.5} className="text-[#047857]" />
            </div>
            <div className="text-[14px] font-bold text-[#1A1A1A] mb-[6px]">Pas encore de cercle</div>
            <div className="text-[12px] font-normal text-[#A39887] leading-[1.6]">
              Créez votre premier cercle ou rejoignez-en un via un code d'invitation.
            </div>
          </div>
        ) : (
          groupsData.map((groupData) => {
            const { userMembership, activeCycle, beneficiaryName } = groupData;
            // Default to target_members if members_count is not available
            const membersCount = groupData.members_count || 1; 
            const isForming = groupData.status === 'FORMING' || groupData.status === 'DRAFT' || groupData.status === 'WAITING_VOTE';
            const isActive = groupData.status === 'ACTIVE';
            
            const isPublic = groupData.is_public === true;
            const privacyText = isPublic ? 'Cercle public' : 'Cercle privé';
            const freqText = groupData.frequency === 'WEEKLY' ? 'semaine' : groupData.frequency === 'MONTHLY' ? 'mois' : 'trimestre';
            
            const totalPot = groupData.contribution_amount * groupData.target_members;
            const daysLeft = getDaysLeft(groupData.constitution_deadline);

            // Progress calculations
            let progressPercent = 0;
            let progressTextLeft = '';
            let progressTextRight = '';
            let isCurrentUserBeneficiary = false;

            if (isForming) {
              progressPercent = Math.min(100, (membersCount / groupData.target_members) * 100);
              progressTextLeft = `${membersCount} / ${groupData.target_members} membres`;
              progressTextRight = `Deadline ${formatShortDate(groupData.constitution_deadline)}`;
            } else {
              progressPercent = Math.min(100, (groupData.current_cycle / groupData.total_cycles) * 100);
              progressTextLeft = `${groupData.current_cycle} / ${groupData.total_cycles} cycles`;
              if (activeCycle) {
                isCurrentUserBeneficiary = activeCycle.beneficiary_member_id === userMembership?.id;
                progressTextRight = isCurrentUserBeneficiary ? 'Vous recevez ce cycle' : `${beneficiaryName || 'Un membre'} reçoit ce cycle`;
              }
            }

            return (
              <div 
                key={groupData.id}
                onClick={() => navigate(`/group/${groupData.id}`)}
                className="bg-white rounded-[20px] p-[18px_20px] mx-[16px] mb-[10px] cursor-pointer"
              >
                {/* CARD TOP */}
                <div className="flex justify-between items-start mb-[3px]">
                  <div className="text-[15px] font-extrabold text-[#1A1A1A]">{groupData.name}</div>
                  {isActive ? (
                    <div className="text-[10px] font-bold tracking-[0.08em] uppercase px-[10px] py-[4px] rounded-[8px] whitespace-nowrap shrink-0 ml-[10px] mt-[1px] bg-[#F0FDF4] text-[#047857]">
                      Actif
                    </div>
                  ) : isForming ? (
                    <div className="text-[10px] font-bold tracking-[0.08em] uppercase px-[10px] py-[4px] rounded-[8px] whitespace-nowrap shrink-0 ml-[10px] mt-[1px] bg-[#F5F4F2] text-[#6B6B6B]">
                      Constitution
                    </div>
                  ) : (
                    <div className="text-[10px] font-bold tracking-[0.08em] uppercase px-[10px] py-[4px] rounded-[8px] whitespace-nowrap shrink-0 ml-[10px] mt-[1px] bg-[#F5F4F2] text-[#6B6B6B]">
                      {groupData.status === 'COMPLETED' ? 'Terminé' : 'Annulé'}
                    </div>
                  )}
                </div>

                {/* META */}
                <div className="text-[12px] font-medium text-[#A39887] mb-[14px]">
                  {privacyText} · {isForming ? `${groupData.target_members} membres max` : `${groupData.target_members} membres`} · {formatXOF(groupData.contribution_amount)} / {freqText}
                </div>

                {/* STATS */}
                <div className="grid grid-cols-2 gap-[8px] mb-[14px]">
                  {isForming ? (
                    <>
                      <div className="bg-[#FAFAF8] rounded-[12px] p-[10px_12px]">
                        <div className="text-[14px] font-extrabold text-[#1A1A1A] mb-[2px]">{membersCount} / {groupData.target_members}</div>
                        <div className="text-[10px] font-semibold text-[#A39887] uppercase tracking-[0.06em]">Membres rejoints</div>
                      </div>
                      <div className="bg-[#FAFAF8] rounded-[12px] p-[10px_12px]">
                        <div className="text-[14px] font-extrabold text-[#1A1A1A] mb-[2px]">{daysLeft} jours</div>
                        <div className="text-[10px] font-semibold text-[#A39887] uppercase tracking-[0.06em]">Deadline</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-[#FAFAF8] rounded-[12px] p-[10px_12px]">
                        <div className="text-[14px] font-extrabold text-[#1A1A1A] mb-[2px]">{formatXOF(totalPot)}</div>
                        <div className="text-[10px] font-semibold text-[#A39887] uppercase tracking-[0.06em]">Cagnotte</div>
                      </div>
                      <div className="bg-[#FAFAF8] rounded-[12px] p-[10px_12px]">
                        <div className="text-[14px] font-extrabold text-[#1A1A1A] mb-[2px]">
                          {userMembership?.draw_position ? `Position ${userMembership.draw_position}` : 'En attente'}
                        </div>
                        <div className="text-[10px] font-semibold text-[#A39887] uppercase tracking-[0.06em]">Mon tirage</div>
                      </div>
                    </>
                  )}
                </div>

                {/* BARRE PROGRESSION */}
                <div className="mb-[12px]">
                  <div className="h-[4px] bg-[#F0EFED] rounded-full overflow-hidden mb-[6px]">
                    <div 
                      className={`h-full rounded-full ${isForming ? 'bg-[#C4B8AC]' : 'bg-[#047857]'}`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="text-[11px] font-semibold text-[#A39887] flex justify-between">
                    <span>{progressTextLeft}</span>
                    <span className={isActive ? "text-[#047857] font-bold" : ""}>{progressTextRight}</span>
                  </div>
                </div>

                {/* NEXT ACTION */}
                {isForming ? (
                  <div className="flex justify-between items-center rounded-[12px] p-[10px_14px] bg-[#F5F4F2]">
                    <div className="text-[12px] font-semibold text-[#6B6B6B]">
                      {Math.max(0, groupData.target_members - membersCount)} places restantes · Inviter des membres
                    </div>
                    <div className="text-[13px] font-extrabold text-[#6B6B6B]">→</div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center rounded-[12px] p-[10px_14px] bg-[#F0FDF4]">
                    <div className="text-[12px] font-semibold text-[#047857]">
                      Prochaine cotisation {activeCycle?.payment_due_date ? `· ${formatShortDate(activeCycle.payment_due_date)}` : ''}
                    </div>
                    <div className="text-[13px] font-extrabold text-[#047857]">
                      -{formatXOF(groupData.contribution_amount)}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

