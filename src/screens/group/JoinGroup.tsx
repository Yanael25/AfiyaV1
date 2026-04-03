import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, QrCode, Camera, ChevronDown, Search, Info } from 'lucide-react';
import { formatXOF, getTierCoeff } from '../../lib/utils';
import { auth, db } from '../../lib/firebase';
import { getUserProfile } from '../../services/userService';
import { getGroupByCode, joinTontineGroup, getGroupMembers } from '../../services/tontineService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

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

  const cleanAmount = (val: number) => {
    return formatXOF(val).replace(/\s?FCFA/gi, '').trim();
  };

  const getFrequencyLabel = (freq: string) => {
    switch (freq) {
      case 'WEEKLY': return 'Hebdomadaire';
      case 'MONTHLY': return 'Mensuel';
      case 'QUARTERLY': return 'Trimestriel';
      default: return freq;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="min-h-screen bg-[#FAFAF8] font-sans pb-10"
    >
      
      {/* TOP BAR */}
      <div className="pt-[60px] px-6 mb-6 flex items-start gap-4">
        <button 
          onClick={() => navigate(-1)} 
          className="w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-sm border border-[#F0EFED] transition-transform active:scale-95"
        >
          <ArrowLeft size={20} stroke="#1A1A1A" strokeWidth={1.5} />
        </button>
        <div className="pt-1">
          <h1 className="font-display text-[28px] font-bold text-[#1A1A1A] tracking-tight mb-1 leading-none">Rejoindre un cercle</h1>
          <p className="text-[14px] font-medium text-[#A39887] mt-1.5">
            {activeTab === 'PRIVATE' ? "Saisissez votre code d'invitation" : "Explorez les pools ouverts à tous"}
          </p>
        </div>
      </div>

      {/* TABS */}
      <div className="bg-[#F0EFED]/50 rounded-[16px] p-1.5 mx-6 mb-6 flex gap-1.5">
        <button 
          onClick={() => setActiveTab('PRIVATE')} 
          className={`text-[14px] font-bold flex-1 py-3 rounded-[12px] transition-all duration-300 ${activeTab === 'PRIVATE' ? 'bg-white text-[#1A1A1A] shadow-[0_2px_8px_rgba(0,0,0,0.04)]' : 'bg-transparent text-[#A39887]'}`}
        >
          Cercle privé
        </button>
        <button 
          onClick={() => setActiveTab('PUBLIC')} 
          className={`text-[14px] font-bold flex-1 py-3 rounded-[12px] transition-all duration-300 ${activeTab === 'PUBLIC' ? 'bg-white text-[#1A1A1A] shadow-[0_2px_8px_rgba(0,0,0,0.04)]' : 'bg-transparent text-[#A39887]'}`}
        >
          Cercle public
        </button>
      </div>

      {error && (
        <div className="mx-6 mb-6 bg-[#FFF5F5] border border-[#EF4444]/20 rounded-[16px] p-4 text-[13px] font-medium text-[#EF4444] flex items-start gap-3">
          <Info size={18} className="shrink-0 mt-0.5" />
          <p className="leading-relaxed">{error}</p>
        </div>
      )}

      <AnimatePresence mode="wait">
        {activeTab === 'PRIVATE' ? (
          <motion.div 
            key="private"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-4 mx-6"
          >
            {/* CARD CODE */}
          <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-[#F0EFED]">
            <label className="block text-[11px] font-bold text-[#A39887] uppercase tracking-[0.1em] mb-3">CODE D'INVITATION</label>
            <div className="flex gap-3 items-center">
              <input 
                type="text"
                value={code}
                onChange={(e) => { setCode(e.target.value.toUpperCase()); setGroupInfo(null); setError(null); }}
                placeholder="Ex : AFY-2024-XK9"
                className={`flex-1 border rounded-[16px] px-5 py-4 font-display text-[18px] font-bold text-[#1A1A1A] uppercase tracking-widest outline-none transition-all placeholder:text-[#C4B8AC] placeholder:font-sans placeholder:text-[15px] placeholder:tracking-normal ${groupInfo ? 'border-[#047857] bg-[#F0FDF4]' : 'border-[#F0EFED] bg-[#FAFAF8] focus:border-[#047857] focus:ring-1 focus:ring-[#047857]'}`}
              />
              <button 
                onClick={handleSearch}
                disabled={code.length < 3 || loading}
                className={`w-14 h-14 rounded-[16px] flex items-center justify-center flex-shrink-0 transition-all duration-300 ${groupInfo ? 'bg-[#F0FDF4] border border-[#047857]/20' : 'bg-[#047857] shadow-[0_4px_12px_rgba(4,120,87,0.2)] active:scale-95 disabled:opacity-50 disabled:shadow-none'}`}
              >
                {loading ? (
                  <div className="w-6 h-6 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
                ) : groupInfo ? (
                  <Check size={24} stroke="#047857" strokeWidth={2.5} />
                ) : (
                  <ArrowRight size={24} stroke="white" strokeWidth={2} />
                )}
              </button>
            </div>
          </div>

          {!groupInfo ? (
            <div className="animate-in fade-in duration-500">
              <div className="flex items-center gap-4 my-6">
                <div className="h-px bg-[#F0EFED] flex-1" />
                <span className="text-[11px] font-bold text-[#C4B8AC] uppercase tracking-[0.1em]">ou</span>
                <div className="h-px bg-[#F0EFED] flex-1" />
              </div>
              <div className="bg-white rounded-[24px] p-8 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-[#F0EFED] flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-[#FAFAF8] rounded-[20px] flex items-center justify-center mb-5 border border-[#F0EFED]">
                  <QrCode size={36} className="text-[#1A1A1A] opacity-40" strokeWidth={1.5} />
                </div>
                <h3 className="text-[16px] font-bold text-[#1A1A1A] mb-2">Scanner un QR Code</h3>
                <p className="text-[14px] font-medium text-[#A39887] leading-relaxed mb-6 max-w-[240px]">
                  Demandez à l'organisateur de partager son QR code ou lien d'invitation
                </p>
                <button className="w-full bg-[#FAFAF8] text-[#1A1A1A] border border-[#F0EFED] rounded-[16px] py-4 flex items-center justify-center gap-2.5 text-[15px] font-bold active:bg-[#F0EFED]/50 transition-colors">
                  <Camera size={18} strokeWidth={2} /> Ouvrir la caméra
                </button>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-4">
              {/* APERÇU CERCLE */}
              <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-[#F0EFED]">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-display text-[20px] font-bold text-[#1A1A1A] tracking-tight">{groupInfo.name}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-[8px] bg-[#F5F4F2] text-[#6B6B6B]">Privé</span>
                </div>
                <div className="text-[13px] font-medium text-[#A39887] mb-5">
                  {groupInfo.target_members} membres max · {cleanAmount(groupInfo.contribution_amount)} FCFA / {groupInfo.frequency === 'WEEKLY' ? 'hebdo' : groupInfo.frequency === 'MONTHLY' ? 'mois' : 'trim'}
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-[#FAFAF8] rounded-[16px] p-4 border border-[#F0EFED]">
                    <div className="font-display text-[20px] font-bold text-[#1A1A1A] mb-1">{groupInfo.members_count} <span className="text-[14px] text-[#A39887] font-sans">/ {groupInfo.target_members}</span></div>
                    <div className="text-[11px] font-bold text-[#A39887] uppercase tracking-wider">Membres</div>
                  </div>
                  <div className="bg-[#FAFAF8] rounded-[16px] p-4 border border-[#F0EFED]">
                    <div className="font-display text-[20px] font-bold text-[#1A1A1A] mb-1">14 <span className="text-[14px] text-[#A39887] font-sans">jours</span></div>
                    <div className="text-[11px] font-bold text-[#A39887] uppercase tracking-wider">Deadline</div>
                  </div>
                </div>
                
                <div className="bg-[#F0EFED] h-1.5 rounded-full overflow-hidden mb-2">
                  <div className="bg-[#047857] h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${(groupInfo.members_count / groupInfo.target_members) * 100}%` }} />
                </div>
                <div className="flex justify-between text-[12px] font-medium">
                  <span className="text-[#A39887]">{groupInfo.members_count} inscrits</span>
                  <span className="text-[#047857] font-bold">{groupInfo.target_members - groupInfo.members_count} places restantes</span>
                </div>
              </div>

              {/* CARD PAIEMENT */}
              <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-[#F0EFED]">
                <label className="block text-[11px] font-bold text-[#A39887] uppercase tracking-[0.1em] mb-4">PAIEMENT REQUIS POUR REJOINDRE</label>
                
                <div className="flex flex-col gap-3 mb-4">
                  <div className="bg-[#FAFAF8] rounded-[16px] p-4 border border-[#F0EFED] flex justify-between items-center">
                    <span className="text-[13px] font-medium text-[#6B6B6B]">Caution bloquée</span>
                    <span className="font-display text-[16px] font-bold text-[#1A1A1A]">{cleanAmount(groupInfo.caution)} <span className="text-[12px] font-bold text-[#A39887] font-sans">FCFA</span></span>
                  </div>
                  <div className="bg-[#FAFAF8] rounded-[16px] p-4 border border-[#F0EFED] flex justify-between items-center">
                    <span className="text-[13px] font-medium text-[#6B6B6B]">1ère cotisation</span>
                    <span className="font-display text-[16px] font-bold text-[#1A1A1A]">{cleanAmount(groupInfo.contribution_amount)} <span className="text-[12px] font-bold text-[#A39887] font-sans">FCFA</span></span>
                  </div>
                </div>

                <div className="bg-[#F0FDF4] rounded-[20px] p-5 flex justify-between items-center border border-[#047857]/10 mb-4">
                  <span className="text-[15px] font-bold text-[#047857]">Total à payer</span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-[24px] font-bold text-[#047857] tracking-tight">{cleanAmount(groupInfo.caution + groupInfo.contribution_amount)}</span>
                    <span className="text-[14px] font-bold text-[#047857]">FCFA</span>
                  </div>
                </div>
                
                <p className="text-[12px] font-medium text-[#A39887] text-center leading-relaxed px-2">
                  Fonds sécurisés en escrow. Restitués si le cercle ne se forme pas.
                </p>
              </div>

              <div className="mt-2 mb-8">
                <button 
                  onClick={handleJoin} 
                  disabled={loading} 
                  className="w-full bg-[#047857] text-white rounded-[20px] py-4.5 text-[15px] font-bold flex items-center justify-center shadow-[0_8px_20px_rgba(4,120,87,0.25)] active:scale-[0.98] transition-all duration-300"
                >
                  {loading ? <div className="w-6 h-6 border-[3px] border-white/30 border-t-white rounded-full animate-spin" /> : 'Payer et rejoindre le cercle'}
                </button>
              </div>
            </div>
          )}
          </motion.div>
        ) : (
          <motion.div 
            key="public"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* FILTRES */}
          <div className="flex gap-3 mx-6 mb-6">
            <div className="flex-1 bg-white rounded-[16px] px-4 py-3.5 flex justify-between items-center cursor-pointer border border-[#F0EFED] hover:border-[#047857] transition-colors group">
              <span className="text-[13px] font-bold text-[#1A1A1A]">Cotisation</span>
              <ChevronDown size={16} className="text-[#A39887] group-hover:text-[#047857] transition-colors" />
            </div>
            <div className="flex-1 bg-white rounded-[16px] px-4 py-3.5 flex justify-between items-center cursor-pointer border border-[#F0EFED] hover:border-[#047857] transition-colors group">
              <span className="text-[13px] font-bold text-[#1A1A1A]">Fréquence</span>
              <ChevronDown size={16} className="text-[#A39887] group-hover:text-[#047857] transition-colors" />
            </div>
          </div>

          {loadingPublic ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-[3px] border-[#047857] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : publicGroups.length > 0 ? (
            <div className="flex flex-col gap-4 mx-6">
              {publicGroups.map(pool => (
                <div key={pool.id} className="bg-white rounded-[24px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-[#F0EFED] active:scale-[0.98] transition-transform cursor-pointer">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 min-w-0 pr-4">
                      <h3 className="font-display text-[18px] font-bold text-[#1A1A1A] mb-1 truncate">{pool.name}</h3>
                      <p className="text-[13px] font-medium text-[#A39887]">
                        {cleanAmount(pool.contribution_amount)} FCFA / {getFrequencyLabel(pool.frequency).toLowerCase()}
                      </p>
                    </div>
                    <span className="bg-[#F0FDF4] text-[#047857] text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-[8px] flex-shrink-0">
                      {pool.target_members - (pool.members_count || 0)} places
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 bg-[#FAFAF8] rounded-[16px] p-3 border border-[#F0EFED]">
                    <div>
                      <div className="font-display text-[16px] font-bold text-[#1A1A1A] mb-0.5">{pool.members_count || 0}<span className="text-[12px] text-[#A39887] font-sans">/{pool.target_members}</span></div>
                      <div className="text-[10px] font-bold text-[#A39887] uppercase tracking-wider">Membres</div>
                    </div>
                    <div>
                      <div className="font-display text-[16px] font-bold text-[#1A1A1A] mb-0.5">{cleanAmount(pool.contribution_amount * pool.target_members)}</div>
                      <div className="text-[10px] font-bold text-[#A39887] uppercase tracking-wider">Cagnotte</div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-[16px] font-bold text-[#1A1A1A] mb-0.5">{pool.status === 'FORMING' ? 'Const.' : 'Actif'}</div>
                      <div className="text-[10px] font-bold text-[#A39887] uppercase tracking-wider">Statut</div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="bg-white rounded-[20px] mt-2 p-5 flex flex-col items-center text-center border border-[#F0EFED] shadow-sm">
                <p className="text-[14px] font-medium text-[#6B6B6B] mb-4">Aucun pool ne vous convient ? <span className="text-[#1A1A1A] font-bold">Démarrez le vôtre.</span></p>
                <button onClick={() => navigate('/group/create')} className="w-full bg-[#FAFAF8] text-[#1A1A1A] border border-[#F0EFED] text-[14px] font-bold py-3.5 rounded-[16px] active:bg-[#F0EFED]/50 transition-colors">
                  Créer un pool
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[24px] p-8 mx-6 text-center shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-[#F0EFED]">
              <div className="w-16 h-16 bg-[#F0FDF4] rounded-[20px] mx-auto mb-5 flex items-center justify-center border border-[#047857]/10">
                <Search size={28} className="text-[#047857]" strokeWidth={1.5} />
              </div>
              <h3 className="font-display text-[20px] font-bold text-[#1A1A1A] mb-2">Aucun pool disponible</h3>
              <p className="text-[14px] font-medium text-[#A39887] mb-8 leading-relaxed">Il n'y a actuellement aucun pool public ouvert aux inscriptions.</p>
              <button onClick={() => navigate('/group/create')} className="w-full bg-[#047857] text-white rounded-[16px] py-4 text-[15px] font-bold shadow-[0_4px_12px_rgba(4,120,87,0.2)] active:scale-[0.98] transition-all">
                Créer un pool public
              </button>
            </div>
          )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}