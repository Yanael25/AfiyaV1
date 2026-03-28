import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X, Users, Calendar, Info, Share2, AlertCircle, Send, MessageCircle, Clock } from 'lucide-react';
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

function DrawReveal({ member, group, onComplete }: { member: any, group: any, onComplete: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 2000);
    const t2 = setTimeout(() => setStep(2), 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="absolute inset-0 z-50 bg-[#141414] text-white flex flex-col items-center justify-center p-6 text-center">
      {step === 0 && (
        <div className="animate-pulse">
          <div className="w-24 h-24 border-4 border-[#047857] border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold mb-2">Tirage au sort en cours...</h2>
          <p className="text-[#A39887]">Attribution des positions pour le groupe {group.name}</p>
        </div>
      )}
      
      {step === 1 && (
        <div className="animate-bounce">
          <div className="w-32 h-32 bg-[#047857] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#047857]/50">
            <span className="text-6xl font-black">{member.draw_position}</span>
          </div>
          <h2 className="text-3xl font-bold mb-2">Position {member.draw_position} !</h2>
          <p className="text-[#86EFAC]">C'est votre ordre de réception de la cagnotte.</p>
        </div>
      )}

      {step === 2 && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-sm">
          <div className="w-24 h-24 bg-[#047857] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#047857]/50">
            <span className="text-5xl font-black">{member.draw_position}</span>
          </div>
          <h2 className="text-2xl font-bold mb-4">Position {member.draw_position}</h2>
          
          <div className="bg-[#1F1F1F] rounded-2xl p-5 mb-8 text-left border border-[#333333]">
            <h3 className="font-bold text-[#E8E0D0] mb-4 text-sm uppercase tracking-wider">Ajustement de Caution</h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[#A39887]">Caution initiale</span>
                <span className="font-bold">{formatXOF(member.initial_deposit || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A39887]">Caution ajustée (Position {member.draw_position})</span>
                <span className="font-bold text-[#86EFAC]">{formatXOF(member.adjusted_deposit || 0)}</span>
              </div>
              <div className="h-px bg-[#333333] my-2"></div>
              <div className="flex justify-between text-base">
                <span className="text-[#E8E0D0] font-bold">Différentiel à payer</span>
                <span className="font-bold text-[#D4AF37]">{formatXOF(member.deposit_differential || 0)}</span>
              </div>
            </div>
            
            {(member.deposit_differential || 0) > 0 && (
              <p className="text-xs text-[#A39887] mt-4 leading-relaxed">
                Vous avez 48h pour régler ce différentiel. En cas de non-paiement, votre position sera réattribuée.
              </p>
            )}
          </div>

          <button 
            onClick={onComplete}
            className="w-full bg-[#047857] text-white h-14 rounded-xl font-bold text-lg hover:bg-[#059669] transition-colors"
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
  }, [id]);

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'FORMING': return <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide">EN CONSTITUTION</span>;
      case 'ACTIVE': return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide">ACTIF</span>;
      case 'COMPLETED': return <span className="bg-[#ECFDF5] text-[#047857] px-2 py-0.5 rounded text-[10px] font-bold tracking-wide">TERMINÉ</span>;
      case 'CANCELLED': return <span className="bg-[#FEE2E2] text-[#C84C31] px-2 py-0.5 rounded text-[10px] font-bold tracking-wide">ANNULÉ</span>;
      case 'WAITING_VOTE': return <span className="bg-[#FEF3C7] text-[#92400E] px-2 py-0.5 rounded text-[10px] font-bold tracking-wide">VOTE EN COURS</span>;
      default: return null;
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
    return <div className="flex-1 bg-[#F5F0E8] flex items-center justify-center">Chargement...</div>;
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
    <div className="flex-1 bg-[#F5F0E8] flex flex-col h-full relative">
      {needsReveal && (
        <DrawReveal member={memberInfo} group={group} onComplete={handleDrawSeen} />
      )}

      {/* Clean Premium Header */}
      <div className="bg-white px-4 pt-4 pb-0 shadow-sm z-20 border-b border-[#E8E0D0]">
        <div className="max-w-4xl mx-auto w-full">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/tontines')} className="p-2 -ml-2 text-[#7C6F5E] hover:bg-[#F5F0E8] rounded-full transition-colors">
                <X size={24} />
              </button>
              <div>
                <h1 className="text-[#1C1410] text-lg font-bold leading-tight">{group.name}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  {getStatusBadge(group.status)}
                  <span className="text-[#A39887] text-xs flex items-center gap-1">
                    <Users size={12} /> {membersList.length}/{group.target_members}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs Toggle */}
          <div className="flex gap-6 px-2">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`pb-3 text-sm font-semibold transition-colors relative ${activeTab === 'dashboard' ? 'text-[#047857]' : 'text-[#A39887]'}`}
            >
              Tableau de bord
              {activeTab === 'dashboard' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#047857] rounded-t-full" />}
            </button>
            <button 
              onClick={() => setActiveTab('chat')}
              className={`pb-3 text-sm font-semibold transition-colors relative flex items-center gap-1.5 ${activeTab === 'chat' ? 'text-[#047857]' : 'text-[#A39887]'}`}
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
            <div className="mx-4 mt-4 bg-[#FEE2E2] border border-[#FCA5A5] rounded-xl px-4 py-3 text-sm text-[#C84C31]">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mx-4 mt-4 bg-[#ECFDF5] border border-[#E8E0D0] rounded-xl px-4 py-3 text-sm text-[#047857]">
              {successMessage}
            </div>
          )}

          {needsPayment && activeTab === 'dashboard' && !needsReveal && (
            <div className="bg-[#FEF3C7] border-b border-[#FDE68A] p-4">
              <div className="flex gap-3">
                <AlertCircle className="text-[#92400E] shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                  <h3 className="text-[#92400E] font-bold text-sm mb-1">Action requise : Ajustement de caution</h3>
                  <p className="text-[#92400E] text-xs mb-3 leading-relaxed">
                    Suite au tirage au sort, vous avez obtenu la position {memberInfo.draw_position}. 
                    Votre caution doit être ajustée pour sécuriser le groupe.
                  </p>
                  <div className="flex items-center justify-between bg-white/60 rounded-lg p-2 mb-3">
                    <span className="text-[#92400E] text-xs font-medium">Montant à régler</span>
                    <span className="text-[#92400E] font-bold">{formatXOF(memberInfo.deposit_differential)}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-3 text-[#D97706] text-xs font-medium">
                    <Clock size={14} />
                    <span>Temps restant : {timeLeftStr}</span>
                  </div>
                  <button 
                    onClick={handlePayDifferential}
                    disabled={loading}
                    className="w-full bg-[#D97706] hover:bg-[#B45309] text-white text-sm font-bold py-2.5 rounded-lg transition-colors disabled:opacity-50"
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
                <div className="flex-1 bg-white p-4 rounded-2xl shadow-sm border border-[#E8E0D0]">
                  <div className="flex items-center gap-2 text-[#7C6F5E] mb-2">
                    <Calendar size={16} />
                    <span className="text-xs font-medium">Fréquence</span>
                  </div>
                  <p className="text-[#1C1410] font-bold">{group.frequency === 'WEEKLY' ? 'Hebdomadaire' : group.frequency === 'MONTHLY' ? 'Mensuelle' : 'Trimestrielle'}</p>
                </div>
                <div className="flex-1 bg-white p-4 rounded-2xl shadow-sm border border-[#E8E0D0]">
                  <div className="flex items-center gap-2 text-[#7C6F5E] mb-2">
                    <Info size={16} />
                    <span className="text-xs font-medium">Cotisation</span>
                  </div>
                  <p className="text-[#1C1410] font-bold">{formatXOF(group.contribution_amount)}</p>
                </div>
              </div>

              {/* Mon Statut */}
              {memberInfo && (
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E8E0D0]">
                  <h2 className="text-[#1C1410] font-semibold text-lg mb-4">Mon statut</h2>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#7C6F5E]">Position de tirage</span>
                      <span className="font-bold text-[#1C1410]">{memberInfo.draw_position || 'Non tiré'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#7C6F5E]">Caution payée</span>
                      <span className="font-bold text-[#1C1410]">{formatXOF(memberInfo.initial_deposit)}</span>
                    </div>
                    {memberInfo.adjusted_deposit && (
                      <div className="flex justify-between text-sm">
                        <span className="text-[#7C6F5E]">Caution ajustée</span>
                        <span className="font-bold text-[#1C1410]">{formatXOF(memberInfo.adjusted_deposit)}</span>
                      </div>
                    )}
                    {memberInfo.deposit_differential > 0 && !memberInfo.deposit_differential_paid && (
                      <div className="mt-3 bg-[#FEF3C7] p-3 rounded-xl border border-[#FDE68A] flex items-start gap-3">
                        <AlertCircle size={20} className="text-[#92400E] shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-[#92400E] mb-1">Différentiel à payer : {formatXOF(memberInfo.deposit_differential)}</p>
                          <p className="text-xs text-[#92400E]">Veuillez régler ce montant via la bannière ci-dessus.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Invitation Code (Admin only) */}
              {group.is_admin && group.status === 'FORMING' && (
                <div className="bg-[#ECFDF5] p-5 rounded-2xl border border-[#E8E0D0] flex items-center justify-between">
                  <div>
                    <p className="text-[#047857] text-xs font-medium mb-1">Code d'invitation</p>
                    <p className="text-[#047857] font-bold text-xl tracking-widest">{group.invitation_code}</p>
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(group.invitation_code);
                      setSuccessMessage('Code copié !');
                    }}
                    className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-[#047857] active:bg-[#ECFDF5]"
                  >
                    <Share2 size={20} />
                  </button>
                </div>
              )}

              {/* Members List */}
              <div>
                <h2 className="text-[#1C1410] font-semibold text-lg mb-4">Membres ({membersList.length})</h2>
                <div className="bg-white rounded-2xl shadow-sm border border-[#E8E0D0] overflow-hidden">
                  {membersList.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border-b border-[#E8E0D0] last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#F5F0E8] flex items-center justify-center">
                          <span className="text-[#7C6F5E] font-bold">{member.name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="text-[#1C1410] font-medium text-sm flex items-center gap-2">
                            {member.name}
                            {member.is_admin && (
                              <span className="bg-[#FDF3DC] text-[#C47820] text-[10px] px-1.5 py-0.5 rounded font-bold">ADMIN</span>
                            )}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-bold text-[#D4AF37]">{member.tier}</span>
                            <span className="text-[#A39887] text-xs">• {member.status === 'ACTIVE' ? 'Actif' : member.status}</span>
                          </div>
                        </div>
                      </div>
                      {member.draw_position && (
                        <div className="w-8 h-8 rounded-full bg-[#F5F0E8] flex items-center justify-center border border-[#E8E0D0]">
                          <span className="text-xs font-bold text-[#7C6F5E]">{member.draw_position}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col flex-1 bg-[#F5F0E8]">
              {/* Chat Messages Area */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-[#A39887]">
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
                        {!isMe && <span className="text-[10px] text-[#7C6F5E] ml-1 mb-1">{sender?.name || 'Membre'}</span>}
                        <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${isMe ? 'bg-[#047857] text-white rounded-tr-sm' : 'bg-white text-[#1C1410] border border-[#E8E0D0] rounded-tl-sm'}`}>
                          {msg.text}
                        </div>
                        <span className="text-[10px] text-[#A39887] mt-1 mx-1">
                          {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
              
              {/* Chat Input */}
              <div className="bg-white p-4 border-t border-[#E8E0D0] flex items-center gap-3">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Écrire un message..."
                  className="flex-1 bg-[#F5F0E8] rounded-full h-10 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#047857]/20"
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
        <div className="p-6 bg-white border-t border-[#E8E0D0] z-20">
          <div className="max-w-4xl mx-auto w-full">
            <button
              onClick={handleStartGroup}
              className="w-full bg-[#047857] hover:bg-[#059669] text-white h-14 rounded-xl font-semibold text-lg disabled:opacity-50 transition-colors"
              disabled={membersList.length < group.target_members || loading}
            >
              {loading ? 'Démarrage...' : 'Démarrer le Cercle'}
            </button>
            {membersList.length < group.target_members && (
              <p className="text-center text-xs text-[#A39887] mt-3">
                En attente de {group.target_members - membersList.length} membres pour démarrer
              </p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'dashboard' && group.status === 'ACTIVE' && memberInfo && activeCycle && (
        <div className="p-6 bg-white border-t border-[#E8E0D0] z-20">
          <div className="max-w-4xl mx-auto w-full">
            {userPayment?.status === 'PENDING' ? (
              <button
                className="w-full bg-[#047857] hover:bg-[#059669] text-white h-14 rounded-xl font-semibold text-lg disabled:opacity-50 transition-colors"
                onClick={handlePayContribution}
                disabled={loading}
              >
                {loading ? 'Traitement...' : `Payer ma cotisation (${formatXOF(group.contribution_amount)})`}
              </button>
            ) : (
              <div className="w-full bg-[#ECFDF5] text-[#047857] h-14 rounded-xl font-semibold text-lg flex items-center justify-center border border-[#E8E0D0]">
                Cotisation payée pour ce cycle
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
