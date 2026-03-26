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
    <div className="flex-1 bg-white flex flex-col h-full">
      <div className="p-4 flex items-center">
        <button onClick={() => navigate('/tontines')} className="p-2 -ml-2 text-[#4B5563] hover:bg-gray-100 rounded-full transition-colors">
          <X size={24} />
        </button>
      </div>
      
      <div className="flex-1 px-6 pt-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-6">
            {error}
          </div>
        )}

        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
          <Key size={32} className="text-blue-600" />
        </div>
        
        <h1 className="text-[#111827] text-3xl font-bold mb-2">Rejoindre un Cercle</h1>
        <p className="text-[#4B5563] text-base mb-8">
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
            className="w-full border-2 border-[#E5E7EB] rounded-xl h-14 px-4 text-[#111827] font-bold text-center text-xl tracking-widest focus:border-[#047857] outline-none uppercase"
            autoFocus
          />
        </div>

        {groupInfo && (
          <div className="mt-8 bg-gray-50 p-5 rounded-2xl border border-[#E5E7EB] space-y-4">
            <h3 className="font-bold text-[#111827] text-lg">{groupInfo.name}</h3>
            <div className="flex justify-between text-sm">
              <span className="text-[#4B5563]">Membres actuels</span>
              <span className="font-medium">{groupInfo.members_count}/{groupInfo.target_members}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#4B5563]">Cotisation</span>
              <span className="font-medium">{formatXOF(groupInfo.contribution_amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#4B5563]">Caution estimée ({groupInfo.userTier})</span>
              <span className="font-medium">{formatXOF(groupInfo.caution)}</span>
            </div>
            <div className="pt-3 border-t border-[#E5E7EB] flex justify-between">
              <span className="font-bold text-[#111827]">Total à payer</span>
              <span className="font-bold text-[#047857]">{formatXOF(groupInfo.contribution_amount + groupInfo.caution)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 pb-12">
        {!groupInfo ? (
          <button
            onClick={handleSearch}
            disabled={code.length < 6 || loading}
            className="w-full bg-[#047857] text-white h-14 rounded-xl font-semibold text-lg disabled:opacity-50 flex items-center justify-center transition-colors"
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
            className="w-full bg-[#047857] text-white h-14 rounded-xl font-semibold text-lg disabled:opacity-50 flex items-center justify-center transition-colors"
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
