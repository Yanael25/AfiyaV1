import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Info, Clock, ArrowRight, MessageCircle, X } from 'lucide-react';
import { formatXOF } from '../../lib/utils';
import { auth } from '../../lib/firebase';
import { getUserProfile } from '../../services/userService';
import { subscribeToDocument, subscribeToCollection } from '../../lib/firestore';
import { where } from 'firebase/firestore';
import { 
  subscribeToGroupMessages, 
  sendGroupMessage,
  updateMember,
  payDepositDifferential,
  getActiveCycle,
  getMemberPayment,
  Message,
  TontineGroup,
  TontineMember,
  Cycle,
  Payment
} from '../../services/tontineService';
import { start_tontine_group, process_contribution_payment } from '../../lib/businessLogic';

export function GroupDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [group, setGroup] = useState<any>(null);
  const [memberInfo, setMemberInfo] = useState<any>(null);
  const [membersList, setMembersList] = useState<any[]>([]);
  const [activeCycle, setActiveCycle] = useState<Cycle | null>(null);
  const [userPayment, setUserPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (!id) return;
    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);

    const unsubGroup = subscribeToDocument<TontineGroup>('tontine_groups', id, (g) => {
      if (!g) {
        navigate('/tontines');
        return;
      }
      setGroup(prev => ({
        ...prev,
        ...g,
        is_admin: g.admin_id === user.uid
      }));
    });

    const unsubMembers = subscribeToCollection<TontineMember>('tontine_members', [where('group_id', '==', id)], async (members) => {
      const currentMember = members.find(m => m.user_id === user.uid);
      
      if (currentMember) {
        setMemberInfo(currentMember);
      }

      const enrichedMembers = await Promise.all(members.map(async (m) => {
        let name = m.member_name;
        let tier = m.member_tier || m.tier_at_join || 'BRONZE';
        
        if (!name) {
          try {
            const profile = await getUserProfile(m.user_id);
            if (profile) {
              name = profile.full_name || profile.email || 'Utilisateur';
              tier = profile.tier;
            }
          } catch (e) {
            console.error('Error fetching profile for member', m.user_id, e);
          }
        }

        return {
          ...m,
          name: name || 'Utilisateur',
          tier: tier,
          role: m.is_admin ? 'Admin' : 'Membre'
        };
      }));
      setMembersList(enrichedMembers);
      setLoading(false);
    });

    const unsubMessages = subscribeToGroupMessages(id, (msgs) => {
      setMessages(msgs);
    });

    return () => {
      unsubGroup();
      unsubMembers();
      unsubMessages();
    };
  }, [id, navigate]);

  const fetchCycleData = async () => {
    if (!group || !memberInfo) return;
    try {
      const cycle = await getActiveCycle(group.id);
      setActiveCycle(cycle);
      if (cycle) {
        const payment = await getMemberPayment(cycle.id, memberInfo.id);
        setUserPayment(payment);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (group?.status === 'ACTIVE' && memberInfo) {
      fetchCycleData();
    }
  }, [group?.status, memberInfo?.id]);

  // Auto-start group if full and in FORMING status
  useEffect(() => {
    if (group?.status === 'FORMING' && membersList.length > 0 && membersList.length >= group.target_members) {
      const autoStart = async () => {
        try {
          await start_tontine_group(group.id);
        } catch (e) {
          console.error('Auto-start failed:', e);
        }
      };
      autoStart();
    }
  }, [group?.status, membersList.length, group?.target_members, group?.id]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !id) return;
    const user = auth.currentUser;
    if (!user) return;

    try {
      await sendGroupMessage(id, user.uid, newMessage.trim());
      setNewMessage('');
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartGroup = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      await start_tontine_group(id);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Erreur lors du démarrage du groupe');
    } finally {
      setLoading(false);
    }
  };

  const handlePayDifferential = async () => {
    if (!memberInfo || !auth.currentUser) return;
    setLoading(true);
    setError(null);
    try {
      await payDepositDifferential(memberInfo.id, auth.currentUser.uid);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Erreur lors du paiement du différentiel');
    } finally {
      setLoading(false);
    }
  };

  const handlePayContribution = async () => {
    if (!memberInfo || !activeCycle || !userPayment || !auth.currentUser) return;
    setLoading(true);
    setError(null);
    try {
      await process_contribution_payment(memberInfo.id, activeCycle.id);
      await fetchCycleData();
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Erreur lors du paiement de la cotisation');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !group) {
    return <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center font-manrope text-[#A39887] text-[14px] font-medium">Chargement...</div>;
  }

  if (!group) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'FORMING': return 'EN CONSTITUTION';
      case 'ACTIVE': return 'ACTIF';
      case 'COMPLETED': return 'TERMINÉ';
      case 'CANCELLED': return 'ANNULÉ';
      case 'WAITING_VOTE': return 'VOTE EN COURS';
      default: return status;
    }
  };

  const totalPot = group.contribution_amount * group.target_members;
  const assurance = totalPot * 0.01;
  const fraisGestion = totalPot * 0.03;
  const cagnotteDisponible = totalPot * 0.96;
  
  // Calculate retention (Avance cotisation suivante)
  let retention = 0;
  if (memberInfo?.draw_position) {
    let tauxBase = 0;
    if (memberInfo.draw_position <= 2) tauxBase = 1;
    else if (memberInfo.draw_position <= 5) tauxBase = 0.5;
    
    let coeffTier = 1;
    if (memberInfo.tier === 'SILVER') coeffTier = 0.75;
    else if (memberInfo.tier === 'GOLD') coeffTier = 0.5;
    else if (memberInfo.tier === 'PLATINUM') coeffTier = 0.25;

    retention = group.contribution_amount * tauxBase * coeffTier;
  }
  const netRecu = cagnotteDisponible - retention;

  const beneficiary = activeCycle ? membersList.find(m => m.id === activeCycle.beneficiary_member_id) : null;
  const currentCycleNum = group.current_cycle || 1;
  const progressPercent = (currentCycleNum / group.total_cycles) * 100;

  const needsPayment = group.status === 'ACTIVE' && memberInfo && (memberInfo.deposit_differential || 0) > 0 && !memberInfo.deposit_differential_paid;

  return (
    <div className="min-h-screen bg-[#FAFAF8] pb-[88px] font-manrope">
      {/* TOP BAR */}
      <div className="pt-[52px] px-5 mb-5 flex items-start gap-3">
        <button 
          onClick={() => navigate(-1)}
          className="w-9 h-9 bg-white rounded-[12px] flex items-center justify-center shrink-0"
        >
          <ArrowLeft size={18} stroke="#6B6B6B" strokeWidth={1.5} />
        </button>
        <div className="flex-1">
          <h1 className="text-[20px] font-extrabold text-[#1A1A1A] tracking-tight mb-1">{group.name}</h1>
          <p className="text-[12px] text-[#A39887]">
            Cercle privé · {membersList.length}/{group.target_members} membres · {formatXOF(group.contribution_amount)} / {group.frequency === 'WEEKLY' ? 'semaine' : group.frequency === 'MONTHLY' ? 'mois' : 'trimestre'}
          </p>
        </div>
        <div className="bg-[#F0FDF4] text-[#047857] text-[10px] font-bold uppercase tracking-[0.08em] px-2.5 py-1 rounded-[8px] flex-shrink-0 mt-1">
          {getStatusBadge(group.status)}
        </div>
      </div>

      {error && (
        <div className="mx-4 mb-4 bg-white rounded-[12px] p-3 text-[13px] font-medium text-[#1A1A1A] border border-[#FAFAF8]">
          {error}
        </div>
      )}

      {/* RÉSUMÉ */}
      <div className="bg-white rounded-[20px] p-[18px] mx-4 mb-2.5">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#FAFAF8] rounded-[12px] p-2.5 px-3">
            <div className="text-[14px] font-extrabold text-[#1A1A1A]">{formatXOF(totalPot).replace(' FCFA', '')}</div>
            <div className="text-[11px] font-medium text-[#A39887]">Cagnotte</div>
          </div>
          <div className="bg-[#FAFAF8] rounded-[12px] p-2.5 px-3">
            <div className="text-[14px] font-extrabold text-[#1A1A1A]">{currentCycleNum}/{group.total_cycles}</div>
            <div className="text-[11px] font-medium text-[#A39887]">Cycles</div>
          </div>
          <div className="bg-[#FAFAF8] rounded-[12px] p-2.5 px-3">
            <div className="text-[14px] font-extrabold text-[#1A1A1A]">{formatXOF(assurance).replace(' FCFA', '')}</div>
            <div className="text-[11px] font-medium text-[#A39887]">Assurance</div>
          </div>
        </div>
        
        <div className="h-1.5 bg-[#FAFAF8] rounded-full overflow-hidden mt-4 mb-3">
          <div className="h-full bg-[#047857] rounded-full" style={{ width: `${progressPercent}%` }} />
        </div>
        
        <div className="flex items-center justify-between text-[12px] font-semibold text-[#6B6B6B]">
          <span>Ce cycle : {beneficiary ? beneficiary.name : 'En attente'}</span>
        </div>
      </div>

      {/* COMMENT EST RÉPARTIE VOTRE CAGNOTTE ? */}
      <div className="flex justify-between items-center px-5 mb-3 mt-6">
        <h2 className="text-[14px] font-extrabold text-[#1A1A1A]">Comment est répartie la cagnotte ?</h2>
        <Info size={16} stroke="#A39887" strokeWidth={1.5} />
      </div>
      <div className="bg-white rounded-[20px] p-4 mx-4 mb-2.5">
        <div className="space-y-3 mb-3">
          <div className="flex justify-between items-center">
            <span className="text-[13px] font-medium text-[#6B6B6B]">Assurance groupe (1%)</span>
            <span className="text-[13px] font-bold text-[#1A1A1A]">{formatXOF(assurance)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[13px] font-medium text-[#6B6B6B]">Frais de gestion (3%)</span>
            <span className="text-[13px] font-bold text-[#1A1A1A]">{formatXOF(fraisGestion)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[13px] font-medium text-[#6B6B6B]">Cagnotte disponible (96%)</span>
            <span className="text-[13px] font-bold text-[#1A1A1A]">{formatXOF(cagnotteDisponible)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[13px] font-medium text-[#6B6B6B]">Avance cotisation suivante</span>
            <span className="text-[13px] font-bold text-[#1A1A1A]">- {formatXOF(retention)}</span>
          </div>
        </div>
        <div className="pt-3 border-t border-[#FAFAF8] flex justify-between items-center">
          <span className="text-[14px] font-extrabold text-[#1A1A1A]">Vous recevez</span>
          <span className="text-[16px] font-extrabold text-[#047857]">{formatXOF(netRecu)}</span>
        </div>
      </div>

      {/* BANDEAU TIRAGE */}
      <div 
        onClick={() => navigate(`/tirage/${id}`)}
        className="mx-4 mb-6 mt-6 bg-[#1A1A1A] rounded-[16px] p-4 flex items-center justify-between cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <Clock size={20} stroke="#C4B8AC" strokeWidth={1.5} />
          <span className="text-[14px] font-bold text-white">Tirage au sort</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] font-bold text-[#C4B8AC]">Voir l'ordre</span>
          <ArrowRight size={16} stroke="#C4B8AC" strokeWidth={1.5} />
        </div>
      </div>

      {/* MA SITUATION */}
      <h2 className="text-[14px] font-extrabold text-[#1A1A1A] px-5 mb-3">Ma situation</h2>
      <div className="grid grid-cols-2 gap-2.5 mx-4 mb-6">
        <div className="bg-white rounded-[16px] p-4">
          <div className="text-[12px] font-medium text-[#A39887] mb-1">Position de tirage</div>
          <div className="text-[16px] font-extrabold text-[#1A1A1A]">
            {memberInfo?.draw_position ? `${memberInfo.draw_position}${memberInfo.draw_position === 1 ? 'ère' : 'ème'}` : '-'}
          </div>
        </div>
        <div className="bg-white rounded-[16px] p-4 flex flex-col justify-between">
          <div>
            <div className="text-[12px] font-medium text-[#A39887] mb-1">Caution bloquée</div>
            <div className="text-[16px] font-extrabold text-[#1A1A1A]">
              {formatXOF(memberInfo?.initial_deposit || 0)}
            </div>
          </div>
          {needsPayment && (
            <button 
              onClick={handlePayDifferential}
              disabled={loading}
              className="mt-2 w-full bg-[#1A1A1A] text-white py-1.5 rounded-[8px] text-[11px] font-bold disabled:opacity-50"
            >
              Compléter ({formatXOF(memberInfo.deposit_differential)})
            </button>
          )}
        </div>
      </div>

      {/* COTISATION STATUS */}
      {group.status === 'ACTIVE' && (
        <div className="bg-white rounded-[16px] p-4 mx-4 mb-6 flex items-center justify-between">
          <div>
            <div className="text-[14px] font-bold text-[#1A1A1A]">Cotisation du cycle</div>
            <div className="text-[12px] font-medium text-[#A39887]">
              {userPayment?.status === 'COMPLETED' ? 'Payée' : 'En attente'}
            </div>
          </div>
          {userPayment?.status !== 'COMPLETED' && (
            <button 
              onClick={handlePayContribution}
              disabled={loading}
              className="bg-[#1A1A1A] text-white px-4 py-2 rounded-[10px] text-[13px] font-bold disabled:opacity-50"
            >
              {loading ? '...' : 'Payer'}
            </button>
          )}
        </div>
      )}

      {/* MEMBRES */}
      <h2 className="text-[14px] font-extrabold text-[#1A1A1A] px-5 mb-3">Membres ({membersList.length}/{group.target_members})</h2>
      <div className="bg-white rounded-[20px] p-2 mx-4 mb-6">
        {membersList.map((member, index) => {
          const isBeneficiary = activeCycle?.beneficiary_member_id === member.id;
          
          let statusText = "En attente";
          let statusColor = "text-[#A39887]";
          if (isBeneficiary) {
            statusText = "Reçoit";
            statusColor = "text-[#047857]";
          } else if (member.status === 'ACTIVE') {
            statusText = "Actif";
            statusColor = "text-[#1A1A1A]";
          }

          return (
            <div key={member.id} className="flex items-center justify-between p-3 border-b border-[#FAFAF8] last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FAFAF8] rounded-[12px] flex items-center justify-center text-[14px] font-extrabold text-[#1A1A1A]">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-[14px] font-bold text-[#1A1A1A]">{member.name}</div>
                  <div className="text-[12px] font-medium text-[#A39887]">
                    {member.draw_position ? `Position ${member.draw_position}` : 'Non tiré'}
                  </div>
                </div>
              </div>
              <div className={`text-[12px] font-bold ${statusColor}`}>
                {statusText}
              </div>
            </div>
          );
        })}
      </div>

      {/* ADMIN ACTIONS */}
      {group.status === 'FORMING' && group.is_admin && (
        <div className="mx-4 mb-6">
          <button 
            onClick={handleStartGroup}
            disabled={loading || membersList.length < group.target_members}
            className="w-full bg-[#1A1A1A] text-white h-[52px] rounded-[16px] text-[15px] font-extrabold disabled:opacity-50"
          >
            {loading ? 'Démarrage...' : 'Démarrer le cercle'}
          </button>
          {membersList.length < group.target_members && (
            <p className="text-center text-[12px] font-medium text-[#A39887] mt-2">
              En attente de {group.target_members - membersList.length} membre(s)
            </p>
          )}
        </div>
      )}

      {/* CHAT FLOTTANT */}
      <button 
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-[100px] right-4 w-14 h-14 bg-[#1A1A1A] rounded-full flex items-center justify-center shadow-lg z-40"
      >
        <MessageCircle size={24} stroke="white" strokeWidth={1.5} />
      </button>

      {/* CHAT MODAL */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex flex-col justify-end">
          <div className="bg-[#FAFAF8] w-full h-[80vh] rounded-t-[24px] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-[#E5E5E5]">
              <h3 className="text-[16px] font-extrabold text-[#1A1A1A]">Discussion du Cercle</h3>
              <button onClick={() => setIsChatOpen(false)} className="p-2 -mr-2">
                <X size={20} stroke="#1A1A1A" strokeWidth={1.5} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-[#A39887]">
                  <MessageCircle size={32} strokeWidth={1.5} className="mb-2 opacity-50" />
                  <p className="text-[13px] font-medium">Aucun message pour le moment.</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.user_id === memberInfo?.user_id;
                  const sender = membersList.find(m => m.user_id === msg.user_id);
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      {!isMe && <span className="text-[11px] font-medium text-[#A39887] ml-1 mb-1">{sender?.name || 'Membre'}</span>}
                      <div className={`max-w-[80%] p-3 rounded-[16px] text-[13px] font-medium ${isMe ? 'bg-[#1A1A1A] text-white rounded-tr-sm' : 'bg-white text-[#1A1A1A] rounded-tl-sm'}`}>
                        {msg.text}
                      </div>
                      <span className="text-[10px] font-medium text-[#A39887] mt-1 mx-1">
                        {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 bg-white border-t border-[#E5E5E5] flex items-center gap-2">
              <input 
                type="text" 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Écrire un message..."
                className="flex-1 bg-[#FAFAF8] rounded-[12px] h-12 px-4 text-[13px] font-medium text-[#1A1A1A] focus:outline-none"
              />
              <button 
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="w-12 h-12 bg-[#1A1A1A] rounded-[12px] flex items-center justify-center disabled:opacity-50"
              >
                <MessageCircle size={20} stroke="white" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
