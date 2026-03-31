import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, ArrowRight } from 'lucide-react';
import { formatXOF } from '../../lib/utils';
import { auth, db } from '../../lib/firebase';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { TontineMember, TontineGroup, Cycle } from '../../services/tontineService';

type FilterType = 'Tous' | 'Actifs' | 'Terminés';

export function HistoriqueCercles() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('Tous');
  const [groupsData, setGroupsData] = useState<any[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);
    try {
      // 1. Fetch user's memberships
      const membershipsQuery = query(
        collection(db, 'tontine_members'),
        where('user_id', '==', user.uid)
      );
      const membershipsSnap = await getDocs(membershipsQuery);
      const memberships = membershipsSnap.docs.map(d => d.data() as TontineMember);

      if (memberships.length === 0) {
        setGroupsData([]);
        setLoading(false);
        return;
      }

      // 2. Fetch all related group details + active cycles
      const enrichedGroups = await Promise.all(
        memberships.map(async (membership) => {
          const groupDoc = await getDoc(doc(db, 'tontine_groups', membership.group_id));
          if (!groupDoc.exists()) return null;
          
          const group = { id: groupDoc.id, ...groupDoc.data() } as any;

          // Fetch current cycle if active
          let activeCycle = null;
          if (group.status === 'ACTIVE') {
            const cyclesQuery = query(
              collection(db, 'cycles'),
              where('group_id', '==', group.id),
              where('status', '==', 'ACTIVE')
            );
            const cyclesSnap = await getDocs(cyclesQuery);
            if (!cyclesSnap.empty) {
              activeCycle = cyclesSnap.docs[0].data() as Cycle;
            }
          }

          return {
            ...group,
            userMembership: membership,
            activeCycle
          };
        })
      );

      const validGroups = enrichedGroups.filter(g => g !== null);

      // Sort by creation date descending
      validGroups.sort((a, b) => {
        const dateA = a.created_at?.toDate?.() || new Date(0);
        const dateB = b.created_at?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      setGroupsData(validGroups);
    } catch (error) {
      console.error("Erreur historique:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredGroups = groupsData.filter(group => {
    if (activeFilter === 'Actifs') return group.status === 'ACTIVE' || group.status === 'FORMING';
    if (activeFilter === 'Terminés') return group.status === 'COMPLETED';
    return true;
  });

  // Grouping logic by year
  const groupedByYear = filteredGroups.reduce((acc: Record<string, any[]>, group) => {
    const date = group.created_at?.toDate?.() || new Date();
    const year = date.getFullYear().toString();
    if (!acc[year]) acc[year] = [];
    acc[year].push(group);
    return acc;
  }, {});

  const years = Object.keys(groupedByYear).sort((a, b) => b.localeCompare(a));

  const formatSimpleDate = (ts: any) => {
    if (!ts) return '--/--/----';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="bg-[#FAFAF8] min-h-screen pb-10 font-sans">
      
      {/* TOP BAR */}
      <div className="pt-[52px] px-6 mb-5 flex items-center gap-3">
        <button 
          onClick={() => navigate(-1)}
          className="w-9 h-9 bg-white rounded-[12px] flex items-center justify-center transition-opacity active:opacity-80"
        >
          <ArrowLeft size={18} stroke="#6B6B6B" strokeWidth={1.5} />
        </button>
        <h1 className="text-[22px] font-extrabold text-[#1A1A1A] tracking-tight">Historique</h1>
      </div>

      {/* FILTRE PILLS */}
      <div className="flex gap-2 mx-4 mb-6">
        {(['Tous', 'Actifs', 'Terminés'] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-4 py-2 rounded-[12px] text-[12px] font-bold transition-all ${
              activeFilter === f ? 'bg-[#047857] text-white' : 'bg-white text-[#A39887]'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* CONTENU LISTE */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-[#047857] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="bg-white rounded-[24px] p-8 mx-4 text-center">
            <div className="w-12 h-12 bg-[#F0FDF4] rounded-[16px] flex items-center justify-center mx-auto mb-3.5">
              <Clock size={24} stroke="#047857" strokeWidth={1.5} />
            </div>
            <h3 className="text-[14px] font-bold text-[#1A1A1A] mb-1.5">Aucun cercle pour le moment</h3>
            <p className="text-[12px] text-[#A39887] leading-relaxed">
              Vos cercles passés et en cours apparaîtront ici.
            </p>
          </div>
        ) : (
          years.map(year => (
            <div key={year} className="mb-6">
              <h2 className="text-[13px] font-bold text-[#A39887] mx-4 mb-3 mt-2 tracking-wide">{year}</h2>
              <div className="flex flex-col gap-2.5 mx-4">
                {groupedByYear[year].map((group) => {
                  const isActif = group.status === 'ACTIVE';
                  const isCompleted = group.status === 'COMPLETED';
                  const progress = isCompleted ? 100 : (group.current_cycle / group.total_cycles) * 100;
                  const totalPot = group.contribution_amount * group.target_members;

                  return (
                    <div 
                      key={group.id}
                      onClick={() => navigate(`/group/${group.id}`)}
                      className="bg-white rounded-[20px] p-[18px] px-5 cursor-pointer transition-transform active:scale-[0.99]"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h2 className="text-[15px] font-extrabold text-[#1A1A1A] truncate max-w-[70%]">{group.name}</h2>
                        <span className={`text-[10px] font-bold uppercase tracking-[0.08em] px-2 py-1 rounded-[8px] ${
                          isActif ? 'bg-[#F0FDF4] text-[#047857]' : isCompleted ? 'bg-[#F5F4F2] text-[#6B6B6B]' : 'bg-[#F5F4F2] text-[#6B6B6B]'
                        }`}>
                          {isActif ? 'Actif' : isCompleted ? 'Terminé' : 'Constitution'}
                        </span>
                      </div>

                      <div className="mb-3.5 text-[12px] font-medium text-[#A39887]">
                        {group.is_public ? 'Cercle public' : 'Cercle privé'} · {group.target_members} membres · {formatXOF(group.contribution_amount)} / mois
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-3.5">
                        <div className="bg-[#FAFAF8] rounded-[12px] p-2.5 px-3">
                          <div className="text-[13px] font-extrabold text-[#1A1A1A]">
                            {formatXOF(isCompleted ? totalPot : totalPot).replace(' FCFA', '')}
                          </div>
                          <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#A39887]">
                            Cagnotte FCFA
                          </div>
                        </div>
                        <div className="bg-[#FAFAF8] rounded-[12px] p-2.5 px-3">
                          <div className="text-[13px] font-extrabold text-[#1A1A1A]">
                            {isCompleted ? `${group.total_cycles}/${group.total_cycles}` : `#${group.userMembership?.draw_position || '?'}`}
                          </div>
                          <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#A39887]">
                            {isCompleted ? 'Cycles' : 'Mon tirage'}
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
                          <span>
                            {isActif ? `${group.current_cycle} / ${group.total_cycles} cycles` : isCompleted ? 'Cercle complété' : 'En constitution'}
                          </span>
                        </div>
                      </div>

                      {/* ACTION STRIP */}
                      {isCompleted ? (
                        <div className="bg-[#F5F4F2] rounded-[12px] px-3.5 py-2.5">
                          <span className="text-[12px] font-semibold text-[#6B6B6B]">
                            Terminé le {formatSimpleDate(group.updated_at)}
                          </span>
                        </div>
                      ) : isActif ? (
                        <div className="bg-[#F0FDF4] rounded-[12px] px-3.5 py-2.5 flex justify-between items-center">
                          <span className="text-[12px] font-semibold text-[#047857]">Cercle en cours</span>
                          <ArrowRight size={14} className="text-[#047857]" />
                        </div>
                      ) : (
                        <div className="bg-[#F5F4F2] rounded-[12px] px-3.5 py-2.5 flex justify-between items-center">
                          <span className="text-[12px] font-semibold text-[#6B6B6B]">Phase de constitution</span>
                          <ArrowRight size={14} className="text-[#6B6B6B]" />
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
    </div>
  );
}