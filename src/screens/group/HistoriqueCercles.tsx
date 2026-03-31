import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, ArrowRight } from 'lucide-react';
import { formatXOF } from '../../lib/utils';
import { auth, db } from '../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getUserGroups, TontineMember, Cycle } from '../../services/tontineService';

type FilterType = 'ALL' | 'ACTIVE' | 'COMPLETED';

export function HistoriqueCercles() {
  const navigate = useNavigate();
  const [groupsData, setGroupsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');

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

      const combinedData = fetchedGroups.map(group => {
        const membership = memberships.find(m => m.group_id === group.id);
        const activeCycle = activeCycles[group.id];
        return {
          ...group,
          userMembership: membership,
          activeCycle
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
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const filteredGroups = groupsData.filter(group => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'ACTIVE') return group.status === 'ACTIVE' || group.status === 'FORMING' || group.status === 'WAITING_VOTE' || group.status === 'DRAFT';
    if (activeFilter === 'COMPLETED') return group.status === 'COMPLETED';
    return true;
  });

  // Group by year
  const groupedByYear = filteredGroups.reduce((acc: Record<string, any[]>, group) => {
    const year = group.created_at?.toDate?.()?.getFullYear() || new Date().getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(group);
    return acc;
  }, {});

  const years = Object.keys(groupedByYear).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="bg-[#FAFAF8] min-h-screen pb-10 font-manrope">
      {/* TOP BAR */}
      <div className="pt-[52px] px-6 mb-5 flex items-center gap-3">
        <button 
          onClick={() => navigate(-1)}
          className="w-9 h-9 bg-white rounded-[12px] flex items-center justify-center shrink-0 shadow-sm"
        >
          <ArrowLeft size={18} stroke="#6B6B6B" strokeWidth={1.5} />
        </button>
        <h1 className="text-[22px] font-extrabold text-[#1A1A1A] tracking-tight">Historique</h1>
      </div>

      {/* FILTRE */}
      <div className="flex gap-2 mx-4 mb-6">
        <button
          onClick={() => setActiveFilter('ALL')}
          className={`px-4 py-2 rounded-[12px] text-[12px] font-bold transition-colors ${
            activeFilter === 'ALL' ? 'bg-[#047857] text-white' : 'bg-white text-[#A39887] shadow-sm'
          }`}
        >
          Tous
        </button>
        <button
          onClick={() => setActiveFilter('ACTIVE')}
          className={`px-4 py-2 rounded-[12px] text-[12px] font-bold transition-colors ${
            activeFilter === 'ACTIVE' ? 'bg-[#047857] text-white' : 'bg-white text-[#A39887] shadow-sm'
          }`}
        >
          Actifs
        </button>
        <button
          onClick={() => setActiveFilter('COMPLETED')}
          className={`px-4 py-2 rounded-[12px] text-[12px] font-bold transition-colors ${
            activeFilter === 'COMPLETED' ? 'bg-[#047857] text-white' : 'bg-white text-[#A39887] shadow-sm'
          }`}
        >
          Terminés
        </button>
      </div>

      {/* CONTENU */}
      {loading ? (
        <div className="text-center py-8 text-sm font-medium text-[#A39887]">Chargement...</div>
      ) : filteredGroups.length === 0 ? (
        <div className="bg-white rounded-[20px] p-8 mx-4 text-center shadow-sm">
          <div className="w-12 h-12 bg-[#F0FDF4] rounded-[16px] mx-auto mb-3.5 flex items-center justify-center">
            <Clock size={24} strokeWidth={1.5} className="text-[#047857]" />
          </div>
          <h3 className="text-[14px] font-bold text-[#1A1A1A] mb-1.5">Aucun cercle pour le moment</h3>
          <p className="text-[12px] text-[#A39887] leading-relaxed">
            Vos cercles passés et en cours apparaîtront ici.
          </p>
        </div>
      ) : (
        years.map(year => (
          <div key={year} className="mb-6">
            <div className="text-[13px] font-bold text-[#A39887] mx-4 mb-3 mt-2">{year}</div>
            <div className="flex flex-col gap-2.5 mx-4">
              {groupedByYear[year].map((groupData) => {
                const { userMembership, activeCycle, members_count } = groupData;
                const isForming = groupData.status === 'FORMING' || groupData.status === 'DRAFT' || groupData.status === 'WAITING_VOTE';
                const isActive = groupData.status === 'ACTIVE';
                const isCompleted = groupData.status === 'COMPLETED';
                
                const isPublic = groupData.is_public === true;
                const privacyText = isPublic ? 'Cercle public' : 'Cercle privé';
                const freqText = groupData.frequency === 'WEEKLY' ? 'semaine' : groupData.frequency === 'MONTHLY' ? 'mois' : 'trimestre';
                
                const totalPot = groupData.contribution_amount * groupData.target_members;

                // Progress calculations
                let progressPercent = 0;
                let progressTextLeft = '';
                let progressTextRight = '';

                if (isForming) {
                  progressPercent = Math.min(100, (members_count / groupData.target_members) * 100);
                  progressTextLeft = `${members_count} / ${groupData.target_members} membres`;
                } else if (isCompleted) {
                  progressPercent = 100;
                  progressTextLeft = `${groupData.total_cycles} / ${groupData.total_cycles} cycles`;
                } else {
                  progressPercent = Math.min(100, (groupData.current_cycle / groupData.total_cycles) * 100);
                  progressTextLeft = `${groupData.current_cycle} / ${groupData.total_cycles} cycles`;
                  if (activeCycle) {
                    progressTextRight = activeCycle.beneficiary_member_id === userMembership?.id ? 'Mon tour' : 'Tour en cours';
                  }
                }

                return (
                  <div 
                    key={groupData.id}
                    onClick={() => navigate(`/group/${groupData.id}`)}
                    className="bg-white rounded-[20px] p-[18px] px-5 cursor-pointer shadow-sm active:scale-[0.98] transition-transform"
                  >
                    {/* CARD TOP */}
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-[15px] font-extrabold text-[#1A1A1A]">{groupData.name}</h3>
                      {isActive ? (
                        <span className="bg-[#F0FDF4] text-[#047857] text-[10px] font-bold uppercase tracking-[0.08em] px-2 py-1 rounded-[8px]">
                          Actif
                        </span>
                      ) : isForming ? (
                        <span className="bg-[#F5F4F2] text-[#6B6B6B] text-[10px] font-bold uppercase tracking-[0.08em] px-2 py-1 rounded-[8px]">
                          Constitution
                        </span>
                      ) : isCompleted ? (
                        <span className="bg-[#F5F4F2] text-[#6B6B6B] text-[10px] font-bold uppercase tracking-[0.08em] px-2 py-1 rounded-[8px]">
                          Terminé
                        </span>
                      ) : (
                        <span className="bg-[#F5F4F2] text-[#6B6B6B] text-[10px] font-bold uppercase tracking-[0.08em] px-2 py-1 rounded-[8px]">
                          Annulé
                        </span>
                      )}
                    </div>

                    {/* META */}
                    <div className="mb-3.5">
                      <p className="text-[12px] font-medium text-[#A39887]">
                        {privacyText} · {members_count} membres · {formatXOF(groupData.contribution_amount)} / {freqText}
                      </p>
                    </div>

                    {/* STATS */}
                    <div className="grid grid-cols-2 gap-2 mb-3.5">
                      {isForming ? (
                        <>
                          <div className="bg-[#FAFAF8] rounded-[12px] p-2.5 px-3">
                            <div className="text-[13px] font-extrabold text-[#1A1A1A]">{members_count}</div>
                            <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#A39887]">Membres rejoints</div>
                          </div>
                          <div className="bg-[#FAFAF8] rounded-[12px] p-2.5 px-3">
                            <div className="text-[13px] font-extrabold text-[#1A1A1A]">{formatShortDate(groupData.constitution_deadline)}</div>
                            <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#A39887]">Date limite</div>
                          </div>
                        </>
                      ) : isCompleted ? (
                        <>
                          <div className="bg-[#FAFAF8] rounded-[12px] p-2.5 px-3">
                            <div className="text-[13px] font-extrabold text-[#1A1A1A]">{formatXOF(totalPot)}</div>
                            <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#A39887]">Cagnotte totale</div>
                          </div>
                          <div className="bg-[#FAFAF8] rounded-[12px] p-2.5 px-3">
                            <div className="text-[13px] font-extrabold text-[#1A1A1A]">{groupData.total_cycles}</div>
                            <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#A39887]">Cycles complétés</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="bg-[#FAFAF8] rounded-[12px] p-2.5 px-3">
                            <div className="text-[13px] font-extrabold text-[#1A1A1A]">{formatXOF(totalPot)}</div>
                            <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#A39887]">Cagnotte totale</div>
                          </div>
                          <div className="bg-[#FAFAF8] rounded-[12px] p-2.5 px-3">
                            <div className="text-[13px] font-extrabold text-[#1A1A1A]">
                              {userMembership?.draw_position ? `${userMembership.draw_position}e` : 'En attente'}
                            </div>
                            <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#A39887]">Mon tirage</div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* BARRE PROGRESSION */}
                    <div className="mb-1.5">
                      <div className="bg-[#F0EFED] h-1 rounded-full overflow-hidden">
                        <div 
                          className="bg-[#047857] h-full rounded-full transition-all duration-500" 
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between text-[11px] font-semibold text-[#A39887] mb-3">
                      <span>{progressTextLeft}</span>
                      {progressTextRight && <span className="text-[#047857] font-bold">{progressTextRight}</span>}
                    </div>

                    {/* STRIP ACTION BAS */}
                    {isForming ? (
                      <div className="bg-[#F5F4F2] rounded-[12px] px-3.5 py-2.5 flex justify-between items-center">
                        <span className="text-[12px] text-[#6B6B6B]">
                          {Math.max(0, groupData.target_members - members_count)} places restantes · Inviter
                        </span>
                        <ArrowRight size={16} strokeWidth={1.5} className="text-[#6B6B6B]" />
                      </div>
                    ) : isCompleted ? (
                      <div className="bg-[#F5F4F2] rounded-[12px] px-3.5 py-2.5 flex justify-between items-center">
                        <span className="text-[12px] text-[#6B6B6B]">
                          Terminé le {formatShortDate(groupData.updated_at || groupData.created_at)}
                        </span>
                      </div>
                    ) : (
                      <div className="bg-[#F0FDF4] rounded-[12px] px-3.5 py-2.5 flex justify-between items-center">
                        <span className="text-[12px] font-semibold text-[#047857]">
                          Prochaine cotisation {activeCycle?.payment_due_date ? `· ${formatShortDate(activeCycle.payment_due_date)}` : ''}
                        </span>
                        <span className="text-[13px] font-extrabold text-[#047857]">
                          -{formatXOF(groupData.contribution_amount)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
