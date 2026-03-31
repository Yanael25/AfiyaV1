import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Key } from 'lucide-react';
import { formatXOF, getTierCoeff } from '../../lib/utils';
import { auth } from '../../lib/firebase';
import { getUserProfile } from '../../services/userService';
import { getGroupByCode, joinTontineGroup, getGroupMembers } from '../../services/tontineService';

export function JoinGroup() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groupInfo, setGroupInfo] = useState<any>(null);

  const handleSearch = async () => {
    if (code.length < 6) return;
    setLoading(true);
    setError(null);
    try {
      const group = await getGroupByCode(code);
      
      if (!group) {
        throw new Error("Groupe introuvable ou déjà actif.");
      }

      const user = auth.currentUser;
      if (!user) throw new Error("Non connecté");

      const profile = await getUserProfile(user.uid);
      if (!profile) throw new Error("Profil introuvable");
      
      const members = await getGroupMembers(group.id);

      const caution = group.contribution_amount * getTierCoeff(profile.tier);

      setGroupInfo({
        ...group,
        members_count: members.length,
        caution,
        userTier: profile.tier
      });
    } catch (e: any) {
      setError(e.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Utilisateur non connecté");

      const memberId = await joinTontineGroup(groupInfo.id, user.uid);
      
      // Navigate to group detail
      navigate(`/group/${groupInfo.id}`);
    } catch (e: any) {
      setError(e.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-[var(--color-bg)] flex flex-col h-full">
      <div className="p-4 flex items-center">
        <button onClick={() => navigate('/tontines')} className="p-2 -ml-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-inner)] rounded-[var(--radius-btn)] transition-colors">
          <X size={24} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto px-6 pt-4">
        {error && (
          <div className="bg-[var(--color-surface-inner)] rounded-[var(--radius-inner)] px-4 py-3 text-sm font-normal text-[var(--color-text-primary)] mb-6">
            {error}
          </div>
        )}

        <div className="w-16 h-16 bg-[var(--color-primary-light)] rounded-[var(--radius-card)] flex items-center justify-center mb-6">
          <Key size={32} className="text-[var(--color-primary)]" />
        </div>
        
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)] tracking-tight mb-2">Rejoindre un Cercle</h1>
        <p className="text-[var(--color-text-secondary)] text-base mb-8">
          Entrez le code d'invitation fourni par l'administrateur du Cercle.
        </p>

        <div className="space-y-4">
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setGroupInfo(null);
            }}
            placeholder="EX: AFY-123456"
            className="w-full rounded-[var(--radius-field)] h-14 px-4 text-[var(--color-text-primary)] font-bold text-center text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 uppercase bg-[var(--color-bg)]"
            autoFocus
          />
        </div>

        {groupInfo && (
          <div className="mt-8 bg-[var(--color-surface)] p-5 rounded-[var(--radius-card)] space-y-4">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{groupInfo.name}</h3>
            <div className="flex justify-between text-sm font-normal">
              <span className="text-[var(--color-text-secondary)]">Membres actuels</span>
              <span className="font-medium text-[var(--color-text-primary)]">{groupInfo.members_count}/{groupInfo.target_members}</span>
            </div>
            <div className="flex justify-between text-sm font-normal">
              <span className="text-[var(--color-text-secondary)]">Cotisation</span>
              <span className="font-medium text-[var(--color-text-primary)]">{formatXOF(groupInfo.contribution_amount)}</span>
            </div>
            <div className="flex justify-between text-sm font-normal">
              <span className="text-[var(--color-text-secondary)]">Caution estimée ({groupInfo.userTier})</span>
              <span className="font-medium text-[var(--color-text-primary)]">{formatXOF(groupInfo.caution)}</span>
            </div>
            <div className="pt-3 border-t border-[var(--color-divider)] flex justify-between">
              <span className="font-bold text-[var(--color-text-primary)]">Total à payer</span>
              <span className="font-bold text-[var(--color-primary)]">{formatXOF(groupInfo.contribution_amount + groupInfo.caution)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 pb-12 bg-[var(--color-surface)]">
        {!groupInfo ? (
          <button
            onClick={handleSearch}
            disabled={code.length < 6 || loading}
            className="w-full bg-[var(--color-primary)] hover:opacity-90 text-white h-14 rounded-[var(--radius-btn)] font-semibold text-lg disabled:opacity-50 flex items-center justify-center transition-opacity"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Rechercher'
            )}
          </button>
        ) : (
          <button
            onClick={handleJoin}
            disabled={loading}
            className="w-full bg-[var(--color-primary)] hover:opacity-90 text-white h-14 rounded-[var(--radius-btn)] font-semibold text-lg disabled:opacity-50 flex items-center justify-center transition-opacity"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Payer et Rejoindre'
            )}
          </button>
        )}
      </div>
    </div>
  );
}
