import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Shield, ArrowRight } from 'lucide-react';
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
      case 'DRAFT': return <span className="bg-[#E8E0D0] text-[#7C6F5E] px-2 py-1 rounded text-[10px] font-bold">BROUILLON</span>;
      case 'FORMING': return <span className="bg-[#FEF3C7] text-[#92400E] px-2 py-1 rounded text-[10px] font-bold">EN CONSTITUTION</span>;
      case 'ACTIVE': return <span className="bg-[#E8F5E9] text-[#047857] px-2 py-1 rounded text-[10px] font-bold">ACTIF</span>;
      case 'COMPLETED': return <span className="bg-[#E8F5E9] text-[#047857] px-2 py-1 rounded text-[10px] font-bold">TERMINÉ</span>;
      case 'CANCELLED': return <span className="bg-[#FEE2E2] text-[#C84C31] px-2 py-1 rounded text-[10px] font-bold">ANNULÉ</span>;
      case 'WAITING_VOTE': return <span className="bg-[#FEF3C7] text-[#92400E] px-2 py-1 rounded text-[10px] font-bold">VOTE EN COURS</span>;
      case 'PENDING': return <span className="bg-[#FEF3C7] text-[#92400E] px-2 py-1 rounded text-[10px] font-bold">EN ATTENTE</span>;
      default: return null;
    }
  };

  return (
    <div className="flex-1 bg-[#F5F0E8] flex flex-col h-full">
      <div className="bg-white px-6 pt-12 pb-4 border-b border-[#E8E0D0] z-10">
        <h1 className="text-[#1C1410] text-2xl font-semibold mb-4">Mes Cercles</h1>
        
        {/* Toggle */}
        <div className="flex bg-[#F5F0E8] p-1 rounded-xl border border-[#E8E0D0]">
          <button
            onClick={() => setActiveTab('cercle')}
            className={cn(
              "flex-1 py-2 rounded-lg text-sm font-semibold transition-all",
              activeTab === 'cercle' ? "bg-white text-[#047857] border border-[#E8E0D0]" : "text-[#7C6F5E]"
            )}
          >
            Cercles (Privé)
          </button>
          <button
            onClick={() => setActiveTab('pool')}
            className={cn(
              "flex-1 py-2 rounded-lg text-sm font-semibold transition-all",
              activeTab === 'pool' ? "bg-white text-[#047857] border border-[#E8E0D0]" : "text-[#7C6F5E]"
            )}
          >
            Afiya Pools
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'cercle' ? (
          <div className="space-y-4">
            <div className="flex gap-3 mb-6">
              <button 
                onClick={() => navigate('/group/create')}
                className="flex-1 bg-[#047857] text-white rounded-2xl p-4 flex flex-col items-center gap-2 active:bg-[#059669] transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Plus size={20} color="white" />
                </div>
                <span className="font-semibold text-sm">Créer un Cercle</span>
              </button>
              <button 
                onClick={() => navigate('/group/join')}
                className="flex-1 bg-white border border-[#E8E0D0] rounded-2xl p-4 flex flex-col items-center gap-2 active:bg-[#F5F0E8] transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-[#F5F0E8] flex items-center justify-center">
                  <Users size={20} color="#047857" />
                </div>
                <span className="text-sm font-semibold text-[#1C1410]">Rejoindre</span>
              </button>
            </div>

            <h2 className="text-sm font-semibold text-[#1C1410] mb-2">Mes Cercles Actifs</h2>
            
            {loading ? (
              <div className="text-center py-8 text-[#A39887] text-sm">Chargement...</div>
            ) : groups.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-[#7C6F5E]">Aucun cercle actif pour le moment.</p>
              </div>
            ) : (
              <div className="bg-white border border-[#E8E0D0] rounded-2xl overflow-hidden">
                {groups.map((group, index) => (
                  <div 
                    key={group.id}
                    onClick={() => navigate(`/group/${group.id}`)}
                    className={cn(
                      "flex px-4 py-3.5 items-center justify-between active:bg-[#F5F0E8] transition-colors cursor-pointer",
                      index !== groups.length - 1 && "border-b border-[#F0EAE0]"
                    )}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-[#1C1410] font-semibold text-sm">{group.name}</span>
                        {getStatusBadge(group.status)}
                      </div>
                      <span className="text-[#7C6F5E] text-xs mt-0.5">{group.members_count}/{group.target_members} membres</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[#1C1410] font-semibold text-sm">{formatXOF(group.contribution_amount)}</span>
                      <span className="text-[#7C6F5E] text-xs mt-0.5">{group.frequency === 'WEEKLY' ? 'Par semaine' : group.frequency === 'MONTHLY' ? 'Par mois' : 'Par trimestre'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-10">
            <div className="w-16 h-16 bg-[#E8E0D0] rounded-full flex items-center justify-center mb-4">
              <Shield size={32} className="text-[#047857]" />
            </div>
            <h3 className="text-[#1C1410] font-bold text-lg mb-2">Afiya Pools</h3>
            <p className="text-[#7C6F5E] text-sm mb-6 max-w-[250px]">
              Rejoignez des cercles publics sécurisés par Afiya. Bientôt disponible.
            </p>
            <button className="bg-[#E8E0D0] text-[#7C6F5E] px-6 py-3 rounded-xl font-semibold text-sm" disabled>
              Coming Soon
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
