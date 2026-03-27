import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X, Users, Calendar, Info, Share2, AlertCircle, Send, MessageCircle, Clock } from 'lucide-react';
import { formatXOF } from '../../lib/utils';
import { auth } from '../../lib/firebase';
import { getUserProfile } from '../../services/userService';
import { 
  getTontineGroup, 
  getGroupMembers, 
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

function DrawReveal({ member, group, onComplete }: { member: any, group: any, onComplete: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 2000);
    const t2 = setTimeout(() => setStep(2), 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="absolute inset-0 z-50 bg-gray-900 text-white flex flex-col items-center justify-center p-6 text-center">
      {step === 0 && (
        <div className="animate-pulse">
          <div className="w-24 h-24 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold mb-2">Tirage au sort en cours...</h2>
          <p className="text-gray-400">Attribution des positions pour le groupe {group.name}</p>
        </div>
      )}
      
      {step === 1 && (
        <div className="animate-bounce">
          <div className="w-32 h-32 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/50">
            <span className="text-6xl font-black">{member.draw_position}</span>
          </div>
          <h2 className="text-3xl font-bold mb-2">Position {member.draw_position} !</h2>
          <p className="text-emerald-300">C'est votre ordre de réception de la cagnotte.</p>
        </div>
      )}

      {step === 2 && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-sm">
          <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/50">
            <span className="text-5xl font-black">{member.draw_position}</span>
          </div>
          <h2 className="text-2xl font-bold mb-4">Position {member.draw_position}</h2>
          
          <div className="bg-gray-800 rounded-2xl p-5 mb-8 text-left border border-gray-700">
            <h3 className="font-bold text-gray-300 mb-4 text-sm uppercase tracking-wider">Ajustement de Caution</h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Caution initiale</span>
                <span className="font-bold">{formatXOF(member.initial_deposit || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Caution ajustée (Position {member.draw_position})</span>
                <span className="font-bold text-emerald-400">{formatXOF(member.adjusted_deposit || 0)}</span>
              </div>
              <div className="h-px bg-gray-700 my-2"></div>
              <div className="flex justify-between text-base">
                <span className="text-gray-300 font-bold">Différentiel à payer</span>
                <span className="font-bold text-orange-400">{formatXOF(member.deposit_differential || 0)}</span>
              </div>
            </div>
            
            {(member.deposit_differential || 0) > 0 && (
              <p className="text-xs text-gray-400 mt-4 leading-relaxed">
                Vous avez 48h pour régler ce différentiel. En cas de non-paiement, votre position sera réattribuée.
              </p>
            )}
          </div>

          <button 
            onClick={onComplete}
            className="w-full bg-emerald-500 text-white h-14 rounded-xl font-bold text-lg hover:bg-emerald-600 transition-colors"
          >
            Continuer
          </button>
        </div>
      )}
    </div>
  );
}

export function GroupDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [group, setGroup] = useState<any>(null);
  const [memberInfo, setMemberInfo] = useState<any>(null);
  const [membersList, setMembersList] = useState<any[]>([]);
  const [activeCycle, setActiveCycle] = useState<Cycle | null>(null);
  const [userPayment, setUserPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat'>('dashboard');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (id) {
      loadGroupDetails();
      const unsubscribe = subscribeToGroupMessages(id, (msgs) => {
        setMessages(msgs);
      });
      return () => unsubscribe();
    }
  }, [id]);

  const loadGroupDetails = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      const g = await getTontineGroup(id);
      if (!g) {
        navigate('/tontines');
        return;
      }

      const members = await getGroupMembers(id);
      const currentMember = members.find(m => m.user_id === user.uid);
      
      setGroup({
        ...g,
        members_count: members.length,
        is_admin: g.admin_id === user.uid
      });

      if (currentMember) {
        setMemberInfo(currentMember);
        
        if (g.status === 'ACTIVE') {
          const cycle = await getActiveCycle(id);
          setActiveCycle(cycle);
          if (cycle) {
            const payment = await getMemberPayment(cycle.id, currentMember.id);
            setUserPayment(payment);
          }
        }
      }

      const enrichedMembers = members.map((m) => {
        return {
          ...m,
          name: m.member_name || 'Utilisateur',
          tier: m.member_tier || m.tier_at_join || 'BRONZE',
          role: m.is_admin ? 'Admin' : 'Membre'
        };
      });
      setMembersList(enrichedMembers);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'FORMING': return <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide">EN CONSTITUTION</span>;
      case 'ACTIVE': return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide">ACTIF</span>;
      case 'COMPLETED': return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide">TERMINÉ</span>;
      case 'CANCELLED': return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide">ANNULÉ</span>;
      case 'WAITING_VOTE': return <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide">VOTE EN COURS</span>;
      default: return null;
    }
  };

  const handleStartGroup = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      await start_tontine_group(id);
      await loadGroupDetails();
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Erreur lors du démarrage du groupe');
    } finally {
      setLoading(false);
    }
  };

  const handleDrawSeen = async () => {
    if (!memberInfo) return;
    try {
      await updateMember(memberInfo.id, { has_seen_draw: true });
      setMemberInfo({ ...memberInfo, has_seen_draw: true });
    } catch (e) {
      console.error(e);
    }
  };

  const handlePayDifferential = async () => {
    if (!memberInfo || !auth.currentUser) return;
    setLoading(true);
    setError(null);
    try {
      await payDepositDifferential(memberInfo.id, auth.currentUser.uid);
      await loadGroupDetails();
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
      await loadGroupDetails();
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Erreur lors du paiement de la cotisation');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !group) {
    return <div className="flex-1 bg-gray-50 flex items-center justify-center">Chargement...</div>;
  }

  if (!group) return null;

  const needsReveal = group.status === 'ACTIVE' && memberInfo && memberInfo.has_seen_draw === false;
  const needsPayment = group.status === 'ACTIVE' && memberInfo && (memberInfo.deposit_differential || 0) > 0 && !memberInfo.deposit_differential_paid;

  let timeLeftStr = '';
  if (needsPayment && group.started_at) {
    const startedAt = group.started_at.toDate ? group.started_at.toDate() : new Date(group.started_at);
    const deadline = new Date(startedAt.getTime() + 48 * 60 * 60 * 1000);
    const diff = deadline.getTime() - new Date().getTime();
    if (diff > 0) {
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      timeLeftStr = `${h}h ${m}m`;
    } else {
      timeLeftStr = 'Expiré';
    }
  }

  return (
    <div className="flex-1 bg-gray-50 flex flex-col h-full relative">
      {needsReveal && (
        <DrawReveal member={memberInfo} group={group} onComplete={handleDrawSeen} />
      )}

      {/* Clean Premium Header */}
      <div className="bg-white px-4 pt-4 pb-0 shadow-sm z-20 border-b border-[#E5E7EB]">
        <div className="max-w-4xl mx-auto w-full">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/tontines')} className="p-2 -ml-2 text-[#4B5563] hover:bg-gray-100 rounded-full transition-colors">
                <X size={24} />
              </button>
              <div>
                <h1 className="text-[#111827] text-lg font-bold leading-tight">{group.name}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  {getStatusBadge(group.status)}
                  <span className="text-[#9CA3AF] text-xs flex items-center gap-1">
                    <Users size={12} /> {group.members_count}/{group.target_members}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs Toggle */}
          <div className="flex gap-6 px-2">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`pb-3 text-sm font-semibold transition-colors relative ${activeTab === 'dashboard' ? 'text-[#047857]' : 'text-[#9CA3AF]'}`}
            >
              Tableau de bord
              {activeTab === 'dashboard' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#047857] rounded-t-full" />}
            </button>
            <button 
              onClick={() => setActiveTab('chat')}
              className={`pb-3 text-sm font-semibold transition-colors relative flex items-center gap-1.5 ${activeTab === 'chat' ? 'text-[#047857]' : 'text-[#9CA3AF]'}`}
            >
              Discussion
              {activeTab === 'chat' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#047857] rounded-t-full" />}
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto relative z-10 flex flex-col">
        <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
          {error && (
            <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mx-4 mt-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
              {successMessage}
            </div>
          )}

          {needsPayment && activeTab === 'dashboard' && !needsReveal && (
            <div className="bg-orange-50 border-b border-orange-200 p-4">
              <div className="flex gap-3">
                <AlertCircle className="text-orange-600 shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                  <h3 className="text-orange-800 font-bold text-sm mb-1">Action requise : Ajustement de caution</h3>
                  <p className="text-orange-700 text-xs mb-3 leading-relaxed">
                    Suite au tirage au sort, vous avez obtenu la position {memberInfo.draw_position}. 
                    Votre caution doit être ajustée pour sécuriser le groupe.
                  </p>
                  <div className="flex items-center justify-between bg-white/60 rounded-lg p-2 mb-3">
                    <span className="text-orange-800 text-xs font-medium">Montant à régler</span>
                    <span className="text-orange-900 font-bold">{formatXOF(memberInfo.deposit_differential)}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-3 text-orange-600 text-xs font-medium">
                    <Clock size={14} />
                    <span>Temps restant : {timeLeftStr}</span>
                  </div>
                  <button 
                    onClick={handlePayDifferential}
                    disabled={loading}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold py-2.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Traitement...' : 'Payer l\'ajustement'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'dashboard' ? (
            <div className="p-6 space-y-6 flex-1">
              {/* Info Cards */}
              <div className="flex gap-4">
                <div className="flex-1 bg-white p-4 rounded-2xl shadow-sm border border-[#E5E7EB]">
                  <div className="flex items-center gap-2 text-[#4B5563] mb-2">
                    <Calendar size={16} />
                    <span className="text-xs font-medium">Fréquence</span>
                  </div>
                  <p className="text-[#111827] font-bold">{group.frequency === 'WEEKLY' ? 'Hebdomadaire' : group.frequency === 'MONTHLY' ? 'Mensuelle' : 'Trimestrielle'}</p>
                </div>
                <div className="flex-1 bg-white p-4 rounded-2xl shadow-sm border border-[#E5E7EB]">
                  <div className="flex items-center gap-2 text-[#4B5563] mb-2">
                    <Info size={16} />
                    <span className="text-xs font-medium">Cotisation</span>
                  </div>
                  <p className="text-[#111827] font-bold">{formatXOF(group.contribution_amount)}</p>
                </div>
              </div>

              {/* Mon Statut */}
              {memberInfo && (
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E5E7EB]">
                  <h2 className="text-[#111827] font-semibold text-lg mb-4">Mon statut</h2>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#4B5563]">Position de tirage</span>
                      <span className="font-bold text-[#111827]">{memberInfo.draw_position || 'Non tiré'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#4B5563]">Caution payée</span>
                      <span className="font-bold text-[#111827]">{formatXOF(memberInfo.initial_deposit)}</span>
                    </div>
                    {memberInfo.adjusted_deposit && (
                      <div className="flex justify-between text-sm">
                        <span className="text-[#4B5563]">Caution ajustée</span>
                        <span className="font-bold text-[#111827]">{formatXOF(memberInfo.adjusted_deposit)}</span>
                      </div>
                    )}
                    {memberInfo.deposit_differential > 0 && !memberInfo.deposit_differential_paid && (
                      <div className="mt-3 bg-orange-50 p-3 rounded-xl border border-orange-100 flex items-start gap-3">
                        <AlertCircle size={20} className="text-orange-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-orange-800 mb-1">Différentiel à payer : {formatXOF(memberInfo.deposit_differential)}</p>
                          <p className="text-xs text-orange-700">Veuillez régler ce montant via la bannière ci-dessus.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Invitation Code (Admin only) */}
              {group.is_admin && group.status === 'FORMING' && (
                <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 flex items-center justify-between">
                  <div>
                    <p className="text-blue-800 text-xs font-medium mb-1">Code d'invitation</p>
                    <p className="text-blue-900 font-bold text-xl tracking-widest">{group.invitation_code}</p>
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(group.invitation_code);
                      setSuccessMessage('Code copié !');
                    }}
                    className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-blue-600 active:bg-blue-50"
                  >
                    <Share2 size={20} />
                  </button>
                </div>
              )}

              {/* Members List */}
              <div>
                <h2 className="text-[#111827] font-semibold text-lg mb-4">Membres ({group.members_count})</h2>
                <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden">
                  {membersList.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border-b border-[#E5E7EB] last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <span className="text-[#4B5563] font-bold">{member.name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="text-[#111827] font-medium text-sm flex items-center gap-2">
                            {member.name}
                            {member.is_admin && (
                              <span className="bg-yellow-100 text-yellow-800 text-[10px] px-1.5 py-0.5 rounded font-bold">ADMIN</span>
                            )}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-bold text-[#D97706]">{member.tier}</span>
                            <span className="text-[#9CA3AF] text-xs">• {member.status === 'ACTIVE' ? 'Actif' : member.status}</span>
                          </div>
                        </div>
                      </div>
                      {member.draw_position && (
                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center border border-[#E5E7EB]">
                          <span className="text-xs font-bold text-[#4B5563]">{member.draw_position}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col flex-1 bg-[#F3F4F6]">
              {/* Chat Messages Area */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-[#9CA3AF]">
                    <MessageCircle size={48} className="mb-4 opacity-50" />
                    <p className="text-sm">Aucun message pour le moment.</p>
                    <p className="text-xs mt-1">Commencez à discuter avec votre Cercle !</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.user_id === memberInfo?.user_id;
                    const sender = membersList.find(m => m.user_id === msg.user_id);
                    return (
                      <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        {!isMe && <span className="text-[10px] text-[#6B7280] ml-1 mb-1">{sender?.name || 'Membre'}</span>}
                        <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${isMe ? 'bg-[#047857] text-white rounded-tr-sm' : 'bg-white text-[#111827] border border-[#E5E7EB] rounded-tl-sm'}`}>
                          {msg.text}
                        </div>
                        <span className="text-[10px] text-[#9CA3AF] mt-1 mx-1">
                          {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
              
              {/* Chat Input */}
              <div className="bg-white p-4 border-t border-[#E5E7EB] flex items-center gap-3">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Écrire un message..."
                  className="flex-1 bg-gray-100 rounded-full h-10 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#047857]/20"
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="w-10 h-10 bg-[#047857] rounded-full flex items-center justify-center text-white disabled:opacity-50 transition-opacity"
                >
                  <Send size={18} className="ml-0.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons (Only visible on dashboard tab) */}
      {activeTab === 'dashboard' && group.is_admin && group.status === 'FORMING' && (
        <div className="p-6 bg-white border-t border-[#E5E7EB] z-20">
          <div className="max-w-4xl mx-auto w-full">
            <button
              onClick={handleStartGroup}
              className="w-full bg-[#047857] text-white h-14 rounded-xl font-semibold text-lg disabled:opacity-50 transition-colors"
              disabled={group.members_count < group.target_members || loading}
            >
              {loading ? 'Démarrage...' : 'Démarrer le Cercle'}
            </button>
            {group.members_count < group.target_members && (
              <p className="text-center text-xs text-[#9CA3AF] mt-3">
                En attente de {group.target_members - group.members_count} membres pour démarrer
              </p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'dashboard' && group.status === 'ACTIVE' && memberInfo && activeCycle && (
        <div className="p-6 bg-white border-t border-[#E5E7EB] z-20">
          <div className="max-w-4xl mx-auto w-full">
            {userPayment?.status === 'PENDING' ? (
              <button
                className="w-full bg-[#047857] text-white h-14 rounded-xl font-semibold text-lg disabled:opacity-50 transition-colors"
                onClick={handlePayContribution}
                disabled={loading}
              >
                {loading ? 'Traitement...' : `Payer ma cotisation (${formatXOF(group.contribution_amount)})`}
              </button>
            ) : (
              <div className="w-full bg-emerald-50 text-emerald-700 h-14 rounded-xl font-semibold text-lg flex items-center justify-center border border-emerald-100">
                Cotisation payée pour ce cycle
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
