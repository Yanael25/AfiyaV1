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
      case 'DRAFT': return <span className="bg-gray-200 text-gray-800 px-2 py-1 rounded text-[10px] font-bold">BROUILLON</span>;
      case 'FORMING': return <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-[10px] font-bold">EN CONSTITUTION</span>;
      case 'ACTIVE': return <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-[10px] font-bold">ACTIF</span>;
      case 'COMPLETED': return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-[10px] font-bold">TERMINÉ</span>;
      case 'CANCELLED': return <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-[10px] font-bold">ANNULÉ</span>;
      case 'WAITING_VOTE': return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-[10px] font-bold">VOTE EN COURS</span>;
      case 'PENDING': return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-[10px] font-bold">EN ATTENTE</span>;
      default: return null;
    }
  };

  return (
    <div className="flex-1 bg-gray-50 flex flex-col h-full">
      <div className="bg-white px-6 pt-12 pb-4 shadow-sm z-10">
        <h1 className="text-[#111827] text-2xl font-bold mb-4">Mes Tontines</h1>
        
        {/* Toggle */}
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('cercle')}
            className={cn(
              "flex-1 py-2 rounded-lg text-sm font-semibold transition-all",
              activeTab === 'cercle' ? "bg-white text-[#047857] shadow-sm" : "text-[#4B5563]"
            )}
          >
            Cercles (Privé)
          </button>
          <button
            onClick={() => setActiveTab('pool')}
            className={cn(
              "flex-1 py-2 rounded-lg text-sm font-semibold transition-all",
              activeTab === 'pool' ? "bg-white text-[#047857] shadow-sm" : "text-[#4B5563]"
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
                className="flex-1 bg-[#047857] text-white p-4 rounded-2xl flex flex-col items-center justify-center gap-2 active:bg-[#059669] transition-colors"
              >
                <Plus size={24} />
                <span className="font-semibold text-sm">Créer un Cercle</span>
              </button>
              <button 
                onClick={() => navigate('/group/join')}
                className="flex-1 bg-white border-2 border-[#E5E7EB] text-[#047857] p-4 rounded-2xl flex flex-col items-center justify-center gap-2 active:bg-gray-50 transition-colors"
              >
                <Users size={24} />
                <span className="font-semibold text-sm">Rejoindre</span>
              </button>
            </div>

            <h2 className="text-[#111827] font-semibold text-lg mb-2">Mes Cercles Actifs</h2>
            
            {loading ? (
              <div className="text-center py-8 text-[#9CA3AF] text-sm">Chargement...</div>
            ) : groups.length === 0 ? (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E5E7EB] text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users size={32} className="text-[#9CA3AF]" />
                </div>
                <h3 className="text-[#111827] font-bold mb-2">Aucun cercle</h3>
                <p className="text-[#4B5563] text-sm">Créez ou rejoignez un cercle pour commencer à épargner avec vos proches.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.map((group) => (
                  <div 
                    key={group.id}
                    onClick={() => navigate(`/group/${group.id}`)}
                    className="bg-white p-5 rounded-2xl shadow-sm border border-[#E5E7EB] hover:shadow-md active:bg-gray-50 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-[#111827] font-bold text-lg mb-1">{group.name}</h3>
                        <p className="text-[#4B5563] text-sm">{group.members_count}/{group.target_members} membres</p>
                      </div>
                      {getStatusBadge(group.status)}
                    </div>
                    
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[#9CA3AF] text-xs mb-1">Cotisation</p>
                        <p className="text-[#111827] font-bold">{formatXOF(group.contribution_amount)} <span className="text-[#4B5563] text-xs font-normal">/ {group.frequency === 'WEEKLY' ? 'semaine' : group.frequency === 'MONTHLY' ? 'mois' : 'trimestre'}</span></p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-gray-100 transition-colors">
                        <ArrowRight size={16} className="text-[#4B5563]" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-10">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Shield size={32} className="text-[#047857]" />
            </div>
            <h3 className="text-[#111827] font-bold text-lg mb-2">Afiya Pools</h3>
            <p className="text-[#4B5563] text-sm mb-6 max-w-[250px]">
              Rejoignez des tontines publiques sécurisées par Afiya. Bientôt disponible.
            </p>
            <button className="bg-gray-100 text-[#4B5563] px-6 py-3 rounded-xl font-semibold text-sm" disabled>
              Coming Soon
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
