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
      case 'DRAFT': return <span className="bg-[var(--color-border)] text-[var(--color-text-secondary)] px-2 py-1 rounded text-[10px] font-bold">BROUILLON</span>;
      case 'FORMING': return <span className="bg-[var(--color-surface-inner)] text-[var(--color-text-primary)] px-2 py-1 rounded-[var(--radius-badge)] text-[10px] font-bold">EN CONSTITUTION</span>;
      case 'ACTIVE': return <span className="bg-[var(--color-primary-light)] text-[var(--color-primary)] px-2 py-1 rounded text-[10px] font-bold">ACTIF</span>;
      case 'COMPLETED': return <span className="bg-[var(--color-primary-light)] text-[var(--color-primary)] px-2 py-1 rounded text-[10px] font-bold">TERMINÉ</span>;
      case 'CANCELLED': return <span className="bg-[var(--color-border)] text-[var(--color-text-secondary)] px-2 py-1 rounded text-[10px] font-bold">ANNULÉ</span>;
      case 'WAITING_VOTE': return <span className="bg-[var(--color-surface-inner)] text-[var(--color-text-primary)] px-2 py-1 rounded-[var(--radius-badge)] text-[10px] font-bold">VOTE EN COURS</span>;
      case 'PENDING': return <span className="bg-[var(--color-surface-inner)] text-[var(--color-text-primary)] px-2 py-1 rounded-[var(--radius-badge)] text-[10px] font-bold">EN ATTENTE</span>;
      default: return null;
    }
  };

  return (
    <div className="flex-1 bg-[var(--color-bg)] flex flex-col h-full">
      <div className="bg-[var(--color-surface)] px-6 pt-12 pb-4 z-10">
        <h1 className="text-[var(--color-text-primary)] text-2xl font-extrabold tracking-tight mb-4">Mes Cercles</h1>
        
        {/* Toggle */}
        <div className="flex bg-[var(--color-bg)] p-1 rounded-[var(--radius-inner)]">
          <button
            onClick={() => setActiveTab('cercle')}
            className={cn(
              "flex-1 py-2 rounded-[var(--radius-inner)] text-sm font-medium transition-all",
              activeTab === 'cercle' ? "bg-[var(--color-surface)] text-[var(--color-primary)]" : "text-[var(--color-text-secondary)]"
            )}
          >
            Cercles (Privé)
          </button>
          <button
            onClick={() => setActiveTab('pool')}
            className={cn(
              "flex-1 py-2 rounded-[var(--radius-inner)] text-sm font-medium transition-all",
              activeTab === 'pool' ? "bg-[var(--color-surface)] text-[var(--color-primary)]" : "text-[var(--color-text-secondary)]"
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
                className="flex-1 bg-[var(--color-primary)] text-white rounded-[var(--radius-inner)] p-4 flex flex-col items-center gap-2 active:opacity-90 transition-colors"
              >
                <div className="w-10 h-10 rounded-[var(--radius-avatar)] bg-white/20 flex items-center justify-center">
                  <Plus size={20} color="white" />
                </div>
                <span className="text-sm font-medium">Créer un Cercle</span>
              </button>
              <button 
                onClick={() => navigate('/group/join')}
                className="flex-1 bg-[var(--color-surface)] rounded-[var(--radius-inner)] p-4 flex flex-col items-center gap-2 active:bg-[var(--color-surface-inner)] transition-colors"
              >
                <div className="w-10 h-10 rounded-[var(--radius-avatar)] bg-[var(--color-bg)] flex items-center justify-center">
                  <Users size={20} className="text-[var(--color-primary)]" />
                </div>
                <span className="text-sm font-medium text-[var(--color-text-primary)]">Rejoindre</span>
              </button>
            </div>

            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Mes Cercles Actifs</h2>
            
            {loading ? (
              <div className="text-center py-8 text-sm font-medium text-[var(--color-text-primary)]">Chargement...</div>
            ) : groups.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">Aucun cercle actif pour le moment.</p>
              </div>
            ) : (
              <div className="bg-[var(--color-surface)] rounded-[var(--radius-card)] overflow-hidden">
                {groups.map((group, index) => (
                  <div 
                    key={group.id}
                    onClick={() => navigate(`/group/${group.id}`)}
                    className={cn(
                      "flex px-4 py-3.5 items-center justify-between active:bg-[var(--color-surface-inner)] transition-colors cursor-pointer",
                      index !== groups.length - 1 && "border-b border-[var(--color-divider)]"
                    )}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">{group.name}</span>
                        {getStatusBadge(group.status)}
                      </div>
                      <span className="text-xs font-normal text-[var(--color-text-secondary)] mt-0.5">{group.members_count}/{group.target_members} membres</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-semibold text-[var(--color-text-primary)]">{formatXOF(group.contribution_amount)}</span>
                      <span className="text-xs font-normal text-[var(--color-text-secondary)] mt-0.5">{group.frequency === 'WEEKLY' ? 'Par semaine' : group.frequency === 'MONTHLY' ? 'Par mois' : 'Par trimestre'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-10">
            <div className="w-16 h-16 bg-[var(--color-border)] rounded-[var(--radius-avatar)] flex items-center justify-center mb-4">
              <Shield size={32} className="text-[var(--color-primary)]" />
            </div>
            <h3 className="text-[var(--color-text-primary)] font-bold text-lg mb-2">Afiya Pools</h3>
            <p className="text-sm font-normal text-[var(--color-text-secondary)] mb-6 max-w-[250px]">
              Rejoignez des cercles publics sécurisés par Afiya. Bientôt disponible.
            </p>
            <button className="bg-[var(--color-border)] text-[var(--color-text-secondary)] px-6 py-3 rounded-[var(--radius-btn)] text-sm font-bold" disabled>
              Coming Soon
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
