import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Shield, ArrowRight, CircleDot, ChevronRight } from 'lucide-react';
import { cn, formatXOF } from '../../lib/utils';
import { auth } from '../../lib/firebase';
import { getUserGroups } from '../../services/tontineService';

export function Tontines() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'cercle' | 'pool'>('cercle');
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setLoading(true);
    const user = auth.currentUser;
    if (user) {
      const userGroups = await getUserGroups(user.uid);
      setGroups(userGroups);
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT': return <span className="bg-[#ECECEA] text-[#7C6F5E] px-2 py-0.5 rounded-full text-[10px] font-semibold">BROUILLON</span>;
      case 'FORMING': return <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-semibold">EN CONSTITUTION</span>;
      case 'ACTIVE': return <span className="bg-[#ECFDF5] text-[#047857] px-2 py-0.5 rounded-full text-[10px] font-semibold">ACTIF</span>;
      case 'COMPLETED': return <span className="bg-[#ECFDF5] text-[#047857] px-2 py-0.5 rounded-full text-[10px] font-semibold">TERMINÉ</span>;
      case 'CANCELLED': return <span className="bg-[#FEE2E2] text-[#C84C31] px-2 py-0.5 rounded-full text-[10px] font-semibold">ANNULÉ</span>;
      case 'WAITING_VOTE': return <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-semibold">VOTE EN COURS</span>;
      case 'PENDING': return <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-semibold">EN ATTENTE</span>;
      default: return null;
    }
  };

  return (
    <div className="flex-1 bg-[#FAFAF8] flex flex-col h-full">
      <div className="bg-white px-6 pt-12 pb-4 border-b border-[#ECECEA] z-10">
        <h1 className="text-xl font-semibold text-[#1C1410] mb-4">Mes Cercles</h1>
        
        {/* Toggle */}
        <div className="flex bg-[#ECECEA] rounded-2xl p-1 gap-1">
          <button
            onClick={() => setActiveTab('cercle')}
            className={cn(
              "flex-1 transition-all",
              activeTab === 'cercle' ? "bg-white rounded-xl px-4 py-2 text-sm font-semibold text-[#1C1410] shadow-sm" : "px-4 py-2 text-sm font-medium text-[#7C6F5E]"
            )}
          >
            Cercles
          </button>
          <button
            onClick={() => setActiveTab('pool')}
            className={cn(
              "flex-1 transition-all",
              activeTab === 'pool' ? "bg-white rounded-xl px-4 py-2 text-sm font-semibold text-[#1C1410] shadow-sm" : "px-4 py-2 text-sm font-medium text-[#7C6F5E]"
            )}
          >
            Afiya Pools
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'cercle' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button 
                onClick={() => navigate('/group/create')}
                className="bg-[#047857] text-white rounded-2xl flex flex-col items-center justify-center gap-2 p-5 h-32 active:bg-[#059669] transition-colors"
              >
                <Plus size={24} strokeWidth={1.5} color="white" />
                <span className="font-semibold text-sm">Créer un Cercle</span>
              </button>
              <button 
                onClick={() => navigate('/group/join')}
                className="bg-white border border-[#ECECEA] text-[#1C1410] rounded-2xl flex flex-col items-center justify-center gap-2 p-5 h-32 active:bg-[#FAFAF8] transition-colors"
              >
                <Users size={24} strokeWidth={1.5} color="#047857" />
                <span className="font-semibold text-sm">Rejoindre</span>
              </button>
            </div>

            <h2 className="text-sm font-semibold text-[#1C1410] mb-2">Actifs</h2>
            
            {loading ? (
              <div className="text-center py-8 text-[#A39887] text-sm">Chargement...</div>
            ) : groups.length === 0 ? (
              <div className="bg-white border border-[#ECECEA] rounded-2xl p-6 text-center">
                <CircleDot size={20} className="text-[#A39887] mx-auto mb-3" />
                <p className="text-sm font-medium text-[#1C1410] mb-1">Aucun Cercle actif pour le moment.</p>
                <p className="text-xs font-normal text-[#7C6F5E] leading-relaxed">
                  Créez votre premier Cercle ou rejoignez-en un avec un code d'invitation.
                </p>
              </div>
            ) : (
              <div className="bg-white border border-[#ECECEA] rounded-2xl overflow-hidden">
                {groups.map((group, index) => (
                  <div 
                    key={group.id}
                    onClick={() => navigate(`/group/${group.id}`)}
                    className={cn(
                      "flex items-center justify-between px-4 py-3.5 active:bg-[#FAFAF8] transition-colors cursor-pointer",
                      index !== groups.length - 1 && "border-b border-[#F2F2F0]"
                    )}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#1C1410]">{group.name}</span>
                        {getStatusBadge(group.status)}
                      </div>
                      <span className="text-xs font-normal text-[#7C6F5E] mt-0.5">
                        {formatXOF(group.contribution_amount)} • {group.members_count}/{group.target_members} membres
                      </span>
                    </div>
                    <ChevronRight size={14} className="text-[#A39887]" />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-10">
            <div className="w-16 h-16 bg-[#ECECEA] rounded-full flex items-center justify-center mb-4">
              <Shield size={32} className="text-[#047857]" />
            </div>
            <h3 className="text-[#1C1410] font-bold text-lg mb-2">Afiya Pools</h3>
            <p className="text-[#7C6F5E] text-sm mb-6 max-w-[250px]">
              Rejoignez des cercles publics sécurisés par Afiya. Bientôt disponible.
            </p>
            <button className="bg-[#ECECEA] text-[#7C6F5E] px-6 py-3 rounded-xl font-semibold text-sm" disabled>
              Coming Soon
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
