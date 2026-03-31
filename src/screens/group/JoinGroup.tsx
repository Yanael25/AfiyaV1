import { useState, useEffect } from 'react';
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

  // Fetch public groups when tab changes
  useEffect(() => {
    if (activeTab === 'PUBLIC') {
      fetchPublicGroups();
    }
  }, [activeTab]);

  const fetchPublicGroups = async () => {
    setLoadingPublic(true);
    try {
      // In a real app, this would query for is_public == true
      // For now, we'll just fetch some active/forming groups as a placeholder
      const q = query(
        collection(db, 'tontine_groups'),
        where('status', 'in', ['FORMING', 'ACTIVE'])
      );
      const snapshot = await getDocs(q);
      const groups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter out groups the user is already in (simplified for UI demo)
      setPublicGroups(groups.slice(0, 5)); // Just show a few for the demo
    } catch (err) {
      console.error("Error fetching public groups:", err);
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
      
      if (!group) {
        throw new Error("Code invalide ou cercle introuvable.");
      }

      if (group.status !== 'FORMING') {
        throw new Error("Ce cercle n'accepte plus de nouveaux membres.");
      }

      const user = auth.currentUser;
      if (!user) throw new Error("Non connecté");

      const profile = await getUserProfile(user.uid);
      if (!profile) throw new Error("Profil introuvable");
      
      const members = await getGroupMembers(group.id);
      
      if (members.length >= group.target_members) {
        throw new Error("Ce cercle est déjà complet.");
      }

      const caution = group.contribution_amount * getTierCoeff(profile.tier);

      setGroupInfo({
        ...group,
        members_count: members.length,
        caution,
        userTier: profile.tier
      });
    } catch (e: any) {
      setError(e.message || "Une erreur est survenue");
      setGroupInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!groupInfo) return;
    setLoading(true);
    setError(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Utilisateur non connecté");

      await joinTontineGroup(groupInfo.id, user.uid);
      
      // Navigate to group detail
      navigate(`/group/${groupInfo.id}`);
    } catch (e: any) {
      setError(e.message || "Une erreur est survenue");
      setLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const getFrequencyLabel = (freq: string) => {
    switch(freq) {
      case 'WEEKLY': return 'Hebdo';
      case 'MONTHLY': return 'Mensuel';
      case 'QUARTERLY': return 'Trimestr.';
      default: return freq;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] font-manrope pb-10">
      {/* TOP BAR */}
      <div className="pt-[52px] px-6 mb-5 flex items-start gap-3">
        <button 
          onClick={() => navigate(-1)}
          className="w-9 h-9 bg-white rounded-[12px] flex items-center justify-center shrink-0"
        >
          <ArrowLeft size={18} stroke="#6B6B6B" strokeWidth={1.5} />
        </button>
        <div>
          <h1 className="text-[22px] font-extrabold text-[#1A1A1A] tracking-tight mb-1">Rejoindre un cercle</h1>
          <p className="text-[13px] font-medium text-[#A39887]">
            {activeTab === 'PRIVATE' ? "Via un code d'invitation" : "Découvrez les pools ouverts"}
          </p>
        </div>
      </div>

      {/* TABS */}
      <div className="bg-white rounded-[16px] p-1 mx-4 mb-5 flex gap-1">
        <button
          onClick={() => setActiveTab('PRIVATE')}
          className={`text-[13px] font-bold flex-1 py-2.5 rounded-[12px] transition-colors ${
            activeTab === 'PRIVATE' ? 'bg-[#047857] text-white' : 'bg-transparent text-[#A39887]'
          }`}
        >
          Cercle privé
        </button>
        <button
          onClick={() => setActiveTab('PUBLIC')}
          className={`text-[13px] font-bold flex-1 py-2.5 rounded-[12px] transition-colors ${
            activeTab === 'PUBLIC' ? 'bg-[#047857] text-white' : 'bg-transparent text-[#A39887]'
          }`}
        >
          Cercle public
        </button>
      </div>

      {error && (
        <div className="mx-4 mb-4 bg-[#FFF5F5] border border-[#EF4444] rounded-[12px] p-3 text-[13px] font-medium text-[#EF4444]">
          {error}
        </div>
      )}

      {/* TAB CERCLE PRIVÉ */}
      {activeTab === 'PRIVATE' && (
        <>
          {/* CARD CODE */}
          <div className="bg-white rounded-[20px] p-[18px] mx-4 mb-2.5">
            <div className="uppercase text-[11px] font-bold text-[#A39887] mb-2.5">CODE D'INVITATION</div>
            <div className="flex gap-2 items-center">
              <input 
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setGroupInfo(null);
                  setError(null);
                }}
                placeholder="Ex : AFY-2024-XK9"
                className={`flex-1 border-2 rounded-[14px] px-4 py-3.5 text-[15px] font-bold text-[#1A1A1A] uppercase tracking-[0.08em] outline-none transition-colors ${
                  groupInfo ? 'border-[#047857] bg-[#F0FDF4]' : 'border-transparent bg-[#FAFAF8] focus:border-[#047857]/20'
                }`}
              />
              <button 
                onClick={handleSearch}
                disabled={code.length < 3 || loading}
                className={`w-12 h-12 rounded-[14px] flex items-center justify-center flex-shrink-0 transition-colors ${
                  groupInfo 
                    ? 'bg-[#F0FDF4]' 
                    : 'bg-[#047857] disabled:opacity-50'
                }`}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : groupInfo ? (
                  <Check size={18} stroke="#047857" strokeWidth={2.5} />
                ) : (
                  <ArrowRight size={18} stroke="white" strokeWidth={2} />
                )}
              </button>
            </div>
          </div>

          {!groupInfo ? (
            <>
              {/* SÉPARATEUR */}
              <div className="flex items-center gap-3 mx-4 mb-2.5">
                <div className="h-px bg-[#E8E6E3] flex-1" />
                <span className="text-[11px] font-semibold text-[#C4B8AC] uppercase tracking-[0.08em]">ou</span>
                <div className="h-px bg-[#E8E6E3] flex-1" />
              </div>

              {/* ZONE QR */}
              <div className="bg-white rounded-[20px] p-5 mx-4 mb-2.5 flex flex-col items-center gap-3">
                <div className="uppercase text-[11px] font-bold text-[#A39887] w-full text-left">SCANNER UN QR CODE</div>
                
                <div className="w-[120px] h-[120px] bg-[#FAFAF8] rounded-[16px] flex items-center justify-center mt-2">
                  <QrCode size={44} stroke="#1A1A1A" strokeWidth={1} className="opacity-25" />
                </div>
                
                <p className="text-[12px] font-medium text-[#A39887] text-center leading-relaxed max-w-[220px]">
                  Demandez à l'administrateur de vous montrer le QR code du cercle.
                </p>
                
                <button className="w-full bg-[#047857] text-white rounded-[14px] py-3.5 flex items-center justify-center gap-2 text-[13px] font-bold mt-2">
                  <Camera size={16} stroke="white" strokeWidth={2} />
                  Ouvrir la caméra
                </button>
              </div>
            </>
          ) : (
            <>
              {/* APERÇU CERCLE */}
              <div className="bg-white rounded-[20px] p-[18px] px-5 mx-4 mb-2.5">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-[16px] font-extrabold text-[#1A1A1A] tracking-tight">{groupInfo.name}</h3>
                  <div className="flex gap-1.5">
                    <span className="bg-[#F5F4F2] text-[#6B6B6B] text-[10px] font-bold uppercase tracking-[0.08em] px-2 py-1 rounded-[6px]">
                      Privé
                    </span>
                    <span className="bg-[#FFF8E6] text-[#D97706] text-[10px] font-bold uppercase tracking-[0.08em] px-2 py-1 rounded-[6px]">
                      Constitution
                    </span>
                  </div>
                </div>
                
                <p className="text-[12px] font-medium text-[#A39887] mb-4">
                  {groupInfo.target_members} membres max · {formatXOF(groupInfo.contribution_amount)} / {getFrequencyLabel(groupInfo.frequency).toLowerCase()}
                </p>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-[#FAFAF8] rounded-[12px] p-3">
                    <div className="text-[11px] font-semibold text-[#A39887] mb-0.5">Membres rejoints</div>
                    <div className="text-[14px] font-extrabold text-[#1A1A1A]">{groupInfo.members_count} <span className="text-[#A39887] text-[12px] font-medium">/ {groupInfo.target_members}</span></div>
                  </div>
                  <div className="bg-[#FAFAF8] rounded-[12px] p-3">
                    <div className="text-[11px] font-semibold text-[#A39887] mb-0.5">Date limite</div>
                    <div className="text-[14px] font-extrabold text-[#1A1A1A]">{formatDate(groupInfo.constitution_deadline)}</div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-bold mb-2">
                    <span className="text-[#047857]">Remplissage</span>
                    <span className="text-[#1A1A1A]">{Math.round((groupInfo.members_count / groupInfo.target_members) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-[#F0EFED] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#047857] rounded-full transition-all duration-500"
                      style={{ width: `${(groupInfo.members_count / groupInfo.target_members) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* CARD PAIEMENT */}
              <div className="bg-white rounded-[20px] p-[18px] mx-4 mb-2.5">
                <div className="uppercase text-[11px] font-bold text-[#A39887] mb-2.5">PAIEMENT REQUIS AUJOURD'HUI</div>
                
                <div className="bg-[#FAFAF8] rounded-[12px] p-3 px-3.5 mb-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[12px] font-medium text-[#6B6B6B]">Caution bloquée</span>
                    <span className="text-[14px] font-extrabold text-[#1A1A1A]">{formatXOF(groupInfo.caution)}</span>
                  </div>
                  <div className="text-[10px] italic text-[#C4B8AC] mt-1">
                    Sera ajustée selon votre position de tirage après le lancement
                  </div>
                </div>
                
                <div className="bg-[#FAFAF8] rounded-[12px] p-3 px-3.5 mb-2.5 flex justify-between items-center">
                  <span className="text-[12px] font-medium text-[#6B6B6B]">1ère cotisation</span>
                  <span className="text-[14px] font-extrabold text-[#1A1A1A]">{formatXOF(groupInfo.contribution_amount)}</span>
                </div>
                
                <div className="bg-[#F0FDF4] rounded-[12px] px-4 py-3.5 flex justify-between items-center">
                  <span className="text-[13px] font-bold text-[#047857]">Total à payer</span>
                  <span className="text-[18px] font-extrabold text-[#047857] tracking-tight">{formatXOF(groupInfo.caution + groupInfo.contribution_amount)}</span>
                </div>
                
                <div className="text-[11px] italic text-[#A39887] text-center mt-2.5 leading-relaxed">
                  Fonds sécurisés en escrow. Restitués intégralement si le cercle ne se forme pas.
                </div>
              </div>

              {/* CTA */}
              <div className="mx-4 mt-2 mb-6">
                <button
                  onClick={handleJoin}
                  disabled={loading}
                  className="w-full bg-[#047857] text-white rounded-[16px] py-4 text-[15px] font-bold disabled:opacity-50 flex items-center justify-center"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Payer et rejoindre le cercle'
                  )}
                </button>
              </div>
            </>
          )}
        </>
      )}

      {/* TAB CERCLE PUBLIC */}
      {activeTab === 'PUBLIC' && (
        <>
          {/* FILTRES */}
          <div className="flex gap-2 mx-4 mb-4">
            <div className="flex-1 bg-white rounded-[12px] px-3.5 py-2.5 flex justify-between items-center cursor-pointer">
              <span className="text-[12px] font-bold text-[#A39887]">Cotisation</span>
              <ChevronDown size={14} stroke="#A39887" strokeWidth={2} />
            </div>
            <div className="flex-1 bg-white rounded-[12px] px-3.5 py-2.5 flex justify-between items-center cursor-pointer">
              <span className="text-[12px] font-bold text-[#A39887]">Fréquence</span>
              <ChevronDown size={14} stroke="#A39887" strokeWidth={2} />
            </div>
          </div>

          {loadingPublic ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-[#047857] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : publicGroups.length > 0 ? (
            <>
              {/* LISTE POOLS */}
              <div className="flex flex-col gap-2.5 mx-4">
                {publicGroups.map(pool => (
                  <div key={pool.id} className="bg-white rounded-[20px] p-4 px-[18px] cursor-pointer hover:shadow-sm transition-shadow">
                    <div className="flex justify-between items-start mb-2.5">
                      <div>
                        <h3 className="text-[14px] font-extrabold text-[#1A1A1A] mb-0.5">{pool.name}</h3>
                        <p className="text-[11px] text-[#A39887]">Pool public · {getFrequencyLabel(pool.frequency)}</p>
                      </div>
                      <div className="bg-[#F0FDF4] text-[#047857] text-[10px] font-bold uppercase px-2 py-0.5 rounded-[7px] ml-2 flex-shrink-0">
                        {pool.target_members - (pool.members_count || 0)} places
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 bg-[#FAFAF8] rounded-[10px] p-2 px-2.5">
                      <div>
                        <div className="text-[10px] font-semibold text-[#A39887] mb-0.5">Membres</div>
                        <div className="text-[12px] font-extrabold text-[#1A1A1A]">{pool.members_count || 0}/{pool.target_members}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold text-[#A39887] mb-0.5">Cagnotte</div>
                        <div className="text-[12px] font-extrabold text-[#1A1A1A]">{formatXOF(pool.contribution_amount * pool.target_members)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold text-[#A39887] mb-0.5">Statut</div>
                        <div className="text-[12px] font-extrabold text-[#D97706]">Ouvert</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* HINT BAS */}
              <div className="bg-white rounded-[16px] mx-4 mt-3 p-4 flex justify-between items-center">
                <div>
                  <p className="text-[12px] font-semibold text-[#6B6B6B]">Aucun pool ne vous convient ?</p>
                  <p className="text-[12px] font-bold text-[#1A1A1A]">Démarrez le vôtre.</p>
                </div>
                <button 
                  onClick={() => navigate('/group/create')}
                  className="bg-[#047857] text-white text-[12px] font-bold px-3.5 py-2.5 rounded-[12px] flex-shrink-0 ml-3"
                >
                  Créer un pool
                </button>
              </div>
            </>
          ) : (
            /* ÉTAT VIDE */
            <div className="bg-white rounded-[20px] p-8 mx-4 text-center mt-2">
              <div className="w-12 h-12 bg-[#F0FDF4] rounded-[16px] mx-auto mb-3.5 flex items-center justify-center">
                <Search size={24} stroke="#047857" strokeWidth={1.5} />
              </div>
              <h3 className="text-[14px] font-bold text-[#1A1A1A] mb-1.5">Aucun pool disponible</h3>
              <p className="text-[12px] text-[#A39887] mb-4.5 leading-relaxed">
                Il n'y a actuellement aucun pool public ouvert aux inscriptions.
              </p>
              <button 
                onClick={() => navigate('/group/create')}
                className="w-full bg-[#047857] text-white rounded-[14px] py-3.5 text-[13px] font-bold"
              >
                Créer un pool public
              </button>
            </div>
          )}
        </>
      )}

    </div>
  );
}
