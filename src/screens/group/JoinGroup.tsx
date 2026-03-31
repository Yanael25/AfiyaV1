import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, QrCode, Camera, ChevronDown, Search } from 'lucide-react';
import { formatXOF, getTierCoeff } from '../../lib/utils';
import { auth, db } from '../../lib/firebase';
import { getUserProfile } from '../../services/userService';
import { getGroupByCode, joinTontineGroup, getGroupMembers } from '../../services/tontineService';
import { collection, query, where, getDocs } from 'firebase/firestore';

export function JoinGroup() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'PRIVATE' | 'PUBLIC'>('PRIVATE');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groupInfo, setGroupInfo] = useState<any>(null);
  const [publicGroups, setPublicGroups] = useState<any[]>([]);
  const [loadingPublic, setLoadingPublic] = useState(false);

  useEffect(() => {
    if (activeTab === 'PUBLIC') fetchPublicGroups();
  }, [activeTab]);

  const fetchPublicGroups = async () => {
    setLoadingPublic(true);
    try {
      const q = query(collection(db, 'tontine_groups'), where('status', 'in', ['FORMING', 'ACTIVE']));
      const snapshot = await getDocs(q);
      const groups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPublicGroups(groups.slice(0, 5));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPublic(false);
    }
  };

  const handleSearch = async () => {
    if (code.length < 3) return;
    setLoading(true);
    setError(null);
    try {
      const group = await getGroupByCode(code);
      if (!group) throw new Error("Code invalide ou cercle introuvable.");
      if (group.status !== 'FORMING') throw new Error("Ce cercle n'accepte plus de nouveaux membres.");

      const user = auth.currentUser;
      if (!user) throw new Error("Non connecté");

      const profile = await getUserProfile(user.uid);
      const members = await getGroupMembers(group.id);
      
      if (members.length >= group.target_members) throw new Error("Ce cercle est déjà complet.");

      setGroupInfo({
        ...group,
        members_count: members.length,
        caution: group.contribution_amount * getTierCoeff(profile?.tier || 'BRONZE'),
      });
    } catch (e: any) {
      setError(e.message);
      setGroupInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!groupInfo || !auth.currentUser) return;
    setLoading(true);
    try {
      await joinTontineGroup(groupInfo.id, auth.currentUser.uid);
      navigate(`/group/${groupInfo.id}`);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  };

  const getFrequencyLabel = (freq: string) => {
    const labels: Record<string, string> = { 'WEEKLY': 'Hebdo', 'MONTHLY': 'Mensuel', 'QUARTERLY': 'Trimestr.' };
    return labels[freq] || freq;
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] font-sans pb-10">
      
      {/* TOP BAR */}
      <div className="pt-[52px] px-[24px] mb-[20px] flex items-start gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 bg-white rounded-[12px] flex items-center justify-center transition-opacity active:opacity-80">
          <ArrowLeft size={18} stroke="#6B6B6B" strokeWidth={1.5} />
        </button>
        <div>
          <h1 className="text-[22px] font-extrabold text-[#1A1A1A] tracking-tight mb-1">Rejoindre un cercle</h1>
          <p className="text-[13px] text-[#A39887]">
            {activeTab === 'PRIVATE' ? "Saisissez votre code d'invitation" : "Explorez les pools ouverts à tous"}
          </p>
        </div>
      </div>

      {/* TABS */}
      <div className="bg-white rounded-[16px] p-1 mx-4 mb-5 flex gap-1">
        <button onClick={() => setActiveTab('PRIVATE')} className={`text-[13px] font-bold flex-1 py-2.5 rounded-[12px] transition-all ${activeTab === 'PRIVATE' ? 'bg-[#047857] text-white' : 'bg-transparent text-[#A39887]'}`}>
          Cercle privé
        </button>
        <button onClick={() => setActiveTab('PUBLIC')} className={`text-[13px] font-bold flex-1 py-2.5 rounded-[12px] transition-all ${activeTab === 'PUBLIC' ? 'bg-[#047857] text-white' : 'bg-transparent text-[#A39887]'}`}>
          Cercle public
        </button>
      </div>

      {error && (
        <div className="mx-4 mb-4 bg-[#FFF5F5] border border-[#EF4444] rounded-[14px] p-3 text-[12px] font-semibold text-[#EF4444] text-center">{error}</div>
      )}

      {activeTab === 'PRIVATE' ? (
        <>
          {/* CARD CODE */}
          <div className="bg-white rounded-[20px] p-[18px] mx-4 mb-2.5">
            <label className="block text-[11px] font-bold text-[#A39887] uppercase tracking-widest mb-2.5">CODE D'INVITATION</label>
            <div className="flex gap-2 items-center">
              <input 
                type="text"
                value={code}
                onChange={(e) => { setCode(e.target.value.toUpperCase()); setGroupInfo(null); setError(null); }}
                placeholder="Ex : AFY-2024-XK9"
                className={`flex-1 border-2 rounded-[14px] px-4 py-3.5 text-[15px] font-bold text-[#1A1A1A] uppercase tracking-[0.08em] outline-none transition-all ${groupInfo ? 'border-[#047857] bg-[#F0FDF4]' : 'border-transparent bg-[#FAFAF8]'}`}
              />
              <button 
                onClick={handleSearch}
                disabled={code.length < 3 || loading}
                className={`w-12 h-12 rounded-[14px] flex items-center justify-center flex-shrink-0 transition-all ${groupInfo ? 'bg-[#F0FDF4]' : 'bg-[#047857] active:opacity-80 disabled:opacity-50'}`}
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : groupInfo ? <Check size={18} stroke="#047857" /> : <ArrowRight size={18} stroke="white" />}
              </button>
            </div>
          </div>

          {!groupInfo ? (
            <>
              <div className="flex items-center gap-3 mx-4 mb-2.5 py-4">
                <div className="h-px bg-[#E8E6E3] flex-1" />
                <span className="text-[11px] font-semibold text-[#C4B8AC] uppercase tracking-[0.08em]">ou</span>
                <div className="h-px bg-[#E8E6E3] flex-1" />
              </div>
              <div className="bg-white rounded-[20px] p-5 mx-4 mb-2.5 flex flex-col items-center gap-3 text-center">
                <label className="text-[11px] font-bold text-[#A39887] uppercase tracking-widest w-full text-left">SCANNER UN QR CODE</label>
                <div className="w-[120px] h-[120px] bg-[#FAFAF8] rounded-[16px] flex items-center justify-center my-2">
                  <QrCode size={44} stroke="#1A1A1A" className="opacity-25" />
                </div>
                <p className="text-[12px] font-medium text-[#A39887] leading-relaxed max-w-[220px]">Demandez à l'organisateur de partager son QR code ou lien d'invitation</p>
                <button className="w-full bg-[#047857] text-white rounded-[14px] py-3.5 flex items-center justify-center gap-2 text-[13px] font-bold active:opacity-80 transition-opacity">
                  <Camera size={16} /> Ouvrir la caméra
                </button>
              </div>
            </>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* APERÇU CERCLE */}
              <div className="bg-white rounded-[20px] p-[18px] px-5 mx-4 mb-2.5">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-[15px] font-extrabold text-[#1A1A1A]">{groupInfo.name}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-[0.08em] px-2 py-1 rounded-[8px] bg-[#F5F4F2] text-[#6B6B6B]">Privé</span>
                </div>
                <div className="text-[12px] font-medium text-[#A39887] mb-3.5">
                  Cercle privé · {groupInfo.target_members} membres max · {formatXOF(groupInfo.contribution_amount)} / mois
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3.5">
                  <div className="bg-[#FAFAF8] rounded-[12px] p-2.5 px-3">
                    <div className="text-[13px] font-extrabold text-[#1A1A1A]">{groupInfo.members_count} / {groupInfo.target_members}</div>
                    <div className="text-[10px] font-semibold text-[#A39887] uppercase">Membres rejoints</div>
                  </div>
                  <div className="bg-[#FAFAF8] rounded-[12px] p-2.5 px-3">
                    <div className="text-[13px] font-extrabold text-[#1A1A1A]">14 jours</div>
                    <div className="text-[10px] font-semibold text-[#A39887] uppercase">Deadline</div>
                  </div>
                </div>
                <div className="bg-[#F0EFED] h-1 rounded-full overflow-hidden mb-1.5">
                  <div className="bg-[#047857] h-full rounded-full transition-all" style={{ width: `${(groupInfo.members_count / groupInfo.target_members) * 100}%` }} />
                </div>
                <div className="flex justify-between text-[11px] font-semibold text-[#A39887]">
                  <span>{groupInfo.members_count} / {groupInfo.target_members} membres</span>
                  <span className="text-[#047857] font-bold">{groupInfo.target_members - groupInfo.members_count} places restantes</span>
                </div>
              </div>

              {/* CARD PAIEMENT */}
              <div className="bg-white rounded-[20px] p-[18px] mx-4 mb-2.5">
                <label className="block text-[11px] font-bold text-[#A39887] uppercase tracking-widest mb-3">PAIEMENT REQUIS POUR REJOINDRE</label>
                <div className="bg-[#FAFAF8] rounded-[12px] p-3 px-3.5 mb-2 flex justify-between items-center">
                  <span className="text-[12px] font-medium text-[#6B6B6B]">Caution bloquée</span>
                  <span className="text-[14px] font-extrabold text-[#1A1A1A]">{formatXOF(groupInfo.caution)}</span>
                </div>
                <div className="bg-[#FAFAF8] rounded-[12px] p-3 px-3.5 mb-2.5 flex justify-between items-center">
                  <span className="text-[12px] font-medium text-[#6B6B6B]">1ère cotisation</span>
                  <span className="text-[14px] font-extrabold text-[#1A1A1A]">{formatXOF(groupInfo.contribution_amount)}</span>
                </div>
                <div className="bg-[#F0FDF4] rounded-[12px] px-4 py-3.5 flex justify-between items-center mb-2">
                  <span className="text-[13px] font-bold text-[#047857]">Total à payer</span>
                  <span className="text-[18px] font-extrabold text-[#047857] tracking-tight">{formatXOF(groupInfo.caution + groupInfo.contribution_amount)}</span>
                </div>
                <p className="text-[11px] italic text-[#A39887] text-center">Fonds sécurisés en escrow. Restitués si le cercle ne se forme pas.</p>
              </div>

              <div className="mx-4 mt-6">
                <button onClick={handleJoin} disabled={loading} className="w-full bg-[#047857] text-white rounded-[16px] py-4 text-[15px] font-bold flex items-center justify-center active:opacity-80 transition-opacity">
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Payer et rejoindre le cercle'}
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="animate-in fade-in duration-300">
          {/* FILTRES */}
          <div className="flex gap-2 mx-4 mb-4">
            <div className="flex-1 bg-white rounded-[12px] px-3.5 py-2.5 flex justify-between items-center cursor-pointer active:bg-[#047857] group transition-colors">
              <span className="text-[12px] font-bold text-[#1A1A1A] group-active:text-white">Cotisation</span>
              <ChevronDown size={14} className="text-[#A39887] group-active:text-white" />
            </div>
            <div className="flex-1 bg-white rounded-[12px] px-3.5 py-2.5 flex justify-between items-center cursor-pointer active:bg-[#047857] group transition-colors">
              <span className="text-[12px] font-bold text-[#1A1A1A] group-active:text-white">Fréquence</span>
              <ChevronDown size={14} className="text-[#A39887] group-active:text-white" />
            </div>
          </div>

          {loadingPublic ? (
            <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-[#047857] border-t-transparent rounded-full animate-spin" /></div>
          ) : publicGroups.length > 0 ? (
            <div className="flex flex-col gap-2.5 mx-4">
              {publicGroups.map(pool => (
                <div key={pool.id} className="bg-white rounded-[20px] p-4 px-[18px] active:scale-[0.99] transition-transform">
                  <div className="flex justify-between items-start mb-2.5">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[14px] font-extrabold text-[#1A1A1A] mb-0.5 truncate">{pool.name}</h3>
                      <p className="text-[11px] text-[#A39887]">{formatXOF(pool.contribution_amount)} / {getFrequencyLabel(pool.frequency).toLowerCase()}</p>
                    </div>
                    <span className="bg-[#F0FDF4] text-[#047857] text-[10px] font-bold uppercase px-2 py-0.5 rounded-[7px] ml-2 flex-shrink-0">
                      {pool.target_members - (pool.members_count || 0)} places
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 bg-[#FAFAF8] rounded-[10px] p-2 px-2.5">
                    <div>
                      <div className="text-[13px] font-extrabold text-[#1A1A1A]">{pool.members_count || 0}/{pool.target_members}</div>
                      <div className="text-[10px] font-semibold text-[#A39887] uppercase">Membres</div>
                    </div>
                    <div>
                      <div className="text-[13px] font-extrabold text-[#1A1A1A]">{formatXOF(pool.contribution_amount * pool.target_members).replace(' FCFA', '')}</div>
                      <div className="text-[10px] font-semibold text-[#A39887] uppercase">Cagnotte</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[13px] font-extrabold text-[#1A1A1A]">{pool.status === 'FORMING' ? 'Constitution' : 'Actif'}</div>
                      <div className="text-[10px] font-semibold text-[#A39887] uppercase">Statut</div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="bg-white rounded-[16px] mt-1 p-4 flex justify-between items-center">
                <p className="text-[12px] font-semibold text-[#6B6B6B]">Aucun pool ne vous convient ? <span className="text-[#1A1A1A] font-bold block">Démarrez le vôtre.</span></p>
                <button onClick={() => navigate('/group/create')} className="bg-[#047857] text-white text-[12px] font-bold px-3.5 py-2.5 rounded-[12px] active:opacity-80 transition-opacity">Créer un pool</button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[20px] p-8 mx-4 text-center">
              <div className="w-12 h-12 bg-[#F0FDF4] rounded-[16px] mx-auto mb-3.5 flex items-center justify-center">
                <Search size={24} stroke="#047857" />
              </div>
              <h3 className="text-[14px] font-bold text-[#1A1A1A] mb-1.5">Aucun pool disponible</h3>
              <p className="text-[12px] text-[#A39887] mb-6 leading-relaxed">Il n'y a actuellement aucun pool public ouvert aux inscriptions.</p>
              <button onClick={() => navigate('/group/create')} className="w-full bg-[#047857] text-white rounded-[14px] py-3.5 font-bold">Créer un pool public</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}