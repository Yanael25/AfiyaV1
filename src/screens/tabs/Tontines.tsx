import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LogIn, Search, Users, Clock } from 'lucide-react';
import { formatXOF } from '../../lib/utils';
import { auth, db } from '../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getUserGroups, TontineMember, Cycle } from '../../services/tontineService';
import { getUserProfile } from '../../services/userService';

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

      // 1. Fetch user's memberships
      const membershipsQuery = query(
        collection(db, 'tontine_members'),
        where('user_id', '==', user.uid)
      );
      const membershipsSnap = await getDocs(membershipsQuery);
      const memberships = membershipsSnap.docs.map(doc => doc.data() as TontineMember);

      if (memberships.length === 0) {
        setGroupsData([]);
        return;
      }

      // 2. Fetch groups
      const fetchedGroups = await getUserGroups(user.uid);
      const groupIds = fetchedGroups.map(g => g.id);

      // 3. Fetch active cycles
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

      // 4. Fetch beneficiaries names
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
    <div className="bg-[#FAFAF8] min-h-screen pb-[80px] flex flex-col font-sans">
      
      {/* HEADER */}
      <div className="pt-[52px] px-[24px] mb-[20px] flex justify-between items-start">
        <div>
          <h1 className="text-[26px] font-extrabold text-[#1A1A1A] tracking-tight mb-1">Mes Cercles</h1>
          <p className="text-[13px] font-medium text-[#A39887]">
            {activeGroupsCount} cercle{activeGroupsCount > 1 ? 's' : ''} actif{activeGroupsCount > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2 items-start mt-1.5">
          <button className="w-9 h-9 bg-white rounded-[12px] flex items-center justify-center transition-opacity active:opacity-80">
            <Search size={17} strokeWidth={1.5} color="#6B6B6B" />
          </button>
          <button 
            onClick={() => navigate('/cercles/historique')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white rounded-[12px] transition-opacity active:opacity-80"
          >
            <Clock size={14} strokeWidth={1.5} color="#6B6B6B" />
            <span className="text-[12px] font-bold text-[#6B6B6B]">Historique</span>
          </button>
        </div>
      </div>

      {/* CTAs */}
      <div className="grid grid-cols-2 gap-2.5 mx-4 mb-7">
        <button 
          onClick={() => navigate('/group/create')}
          className="bg-[#047857] text-white rounded-[18px] py-3.5 px-4 flex items-center gap-2.5 font-bold text-[13px] transition-opacity active:opacity-80"
        >
          <div className="bg-white/20 w-7 h-7 rounded-[9px] flex items-center justify-center">
            <Plus size={18} color="white" strokeWidth={2.5} />
          </div>
          Créer un cercle
        </button>
        <button 
          onClick={() => navigate('/group/join')}
          className="bg-white text-[#1A1A1A] rounded-[18px] py-3.5 px-4 flex items-center gap-2.5 font-bold text-[13px] transition-opacity active:opacity-80"
        >
          <div className="bg-[#F0FDF4] w-7 h-7 rounded-[9px] flex items-center justify-center">
            <LogIn size={18} color="#047857" strokeWidth={1.5} />
          </div>
          Rejoindre
        </button>
      </div>

      {/* LISTE CERCLES */}
      <div className="flex flex-col gap-2.5 mx-4">
        {loading ? (
          <div className="text-center py-8 text-[13px] font-medium text-[#A39887]">Chargement...</div>
        ) : groupsData.length === 0 ? (
          <div className="bg-white rounded-[20px] p-8 text-center">
            <div className="w-12 h-12 bg-[#F0FDF4] rounded-[16px] flex items-center justify-center mx-auto mb-3.5">
              <Users size={24} color="#047857" />
            </div>
            <h3 className="text-[14px] font-bold text-[#1A1A1A] mb-1.5">Pas encore de cercle</h3>
            <p className="text-[12px] text-[#A39887] leading-relaxed">
              Créez votre premier cercle ou rejoignez-en un via un code d'invitation.
            </p>
          </div>
        ) : (
          groupsData.map((group) => {
            const isForming = group.status === 'FORMING' || group.status === 'DRAFT' || group.status === 'WAITING_VOTE';
            const isActive = group.status === 'ACTIVE';
            const membersCount = group.members_count || 1;
            const progress = isForming 
              ? (membersCount / group.target_members) * 100 
              : (group.current_cycle / group.total_cycles) * 100;

            return (
              <div 
                key={group.id}
                onClick={() => navigate(`/group/${group.id}`)}
                className="bg-white rounded-[20px] p-[18px] px-5 cursor-pointer transition-transform active:scale-[0.99]"
              >
                <div className="flex justify-between items-start mb-1">
                  <h2 className="text-[15px] font-extrabold text-[#1A1A1A] truncate">{group.name}</h2>
                  <span className={`text-[10px] font-bold uppercase tracking-[0.08em] px-2 py-1 rounded-[8px] ${
                    isActive ? 'bg-[#F0FDF4] text-[#047857]' : 'bg-[#F5F4F2] text-[#6B6B6B]'
                  }`}>
                    {isActive ? 'Actif' : 'Constitution'}
                  </span>
                </div>

                <div className="text-[12px] font-medium text-[#A39887] mb-3.5">
                  {group.is_public ? 'Cercle public' : 'Cercle privé'} · {group.target_members} membres · {formatXOF(group.contribution_amount)} / mois
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3.5">
                  <div className="bg-[#FAFAF8] rounded-[12px] p-2.5 px-3">
                    <div className="text-[13px] font-extrabold text-[#1A1A1A]">
                      {isForming ? `${membersCount} / ${group.target_members}` : formatXOF(group.contribution_amount * group.target_members).replace(' FCFA', '')}
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#A39887]">
                      {isForming ? 'Membres rejoints' : 'Cagnotte FCFA'}
                    </div>
                  </div>
                  <div className="bg-[#FAFAF8] rounded-[12px] p-2.5 px-3">
                    <div className="text-[13px] font-extrabold text-[#1A1A1A]">
                      {isForming ? `${getDaysLeft(group.constitution_deadline)} jours` : `#${group.userMembership?.draw_position || '?'}`}
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#A39887]">
                      {isForming ? 'Deadline' : 'Mon tirage'}
                    </div>
                  </div>
                </div>

                <div className="w-full mb-3">
                  <div className="bg-[#F0EFED] h-1 rounded-full overflow-hidden mb-1.5">
                    <div 
                      className="bg-[#047857] h-full rounded-full transition-all duration-500" 
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-semibold text-[#A39887]">
                    <span>{isForming ? `${membersCount} / ${group.target_members} membres` : `${group.current_cycle} / ${group.total_cycles} cycles`}</span>
                    {isActive && (
                      <span className="text-[#047857] font-bold">Bénéficiaire : {group.beneficiaryName || '...'}</span>
                    )}
                  </div>
                </div>

                {isActive ? (
                  <div className="bg-[#F0FDF4] rounded-[12px] px-3.5 py-2.5 flex justify-between items-center">
                    <span className="text-[12px] font-semibold text-[#047857]">
                      Prochaine cotisation {group.activeCycle?.payment_due_date ? `· ${formatShortDate(group.activeCycle.payment_due_date)}` : ''}
                    </span>
                    <span className="text-[13px] font-extrabold text-[#047857]">
                      -{formatXOF(group.contribution_amount).replace(' FCFA', '')}
                    </span>
                  </div>
                ) : (
                  <div className="bg-[#F5F4F2] rounded-[12px] px-3.5 py-2.5 flex justify-between items-center">
                    <span className="text-[12px] font-semibold text-[#6B6B6B]">
                      {group.target_members - membersCount} places restantes · Inviter
                    </span>
                    <span className="text-[#6B6B6B] font-bold">→</span>
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