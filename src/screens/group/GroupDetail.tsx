import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Info, Clock, MessageCircle, X, ChevronRight } from 'lucide-react';
import { formatXOF } from '../../lib/utils';
import { auth } from '../../lib/firebase';
import { getUserProfile } from '../../services/userService';
import { subscribeToDocument, subscribeToCollection } from '../../lib/firestore';
import { where } from 'firebase/firestore';
import { 
  subscribeToGroupMessages, 
  sendGroupMessage,
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
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    if (!id) return;
    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);

    const unsubGroup = subscribeToDocument<TontineGroup>('tontine_groups', id, (g) => {
      if (!g) { navigate('/tontines'); return; }
      setGroup(prev => ({ ...prev, ...g, is_admin: g.admin_id === user.uid }));
    });

    const unsubMembers = subscribeToCollection<TontineMember>('tontine_members', [where('group_id', '==', id)], async (members) => {
      const currentMember = members.find(m => m.user_id === user.uid);
      if (currentMember) setMemberInfo(currentMember);

      const enrichedMembers = await Promise.all(members.map(async (m) => {
        let name = m.member_name;
        let tier = m.member_tier || m.tier_at_join || 'BRONZE';
        if (!name) {
          const profile = await getUserProfile(m.user_id);
          if (profile) {
            name = profile.full_name || profile.email || 'Utilisateur';
            tier = profile.tier;
          }
        }
        return { ...m, name: name || 'Utilisateur', tier, role: m.is_admin ? 'Admin' : 'Membre' };
      }));
      setMembersList(enrichedMembers);
      setLoading(false);
    });

    const unsubMessages = subscribeToGroupMessages(id, setMessages);

    return () => { unsubGroup(); unsubMembers(); unsubMessages(); };
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
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (group?.status === 'ACTIVE' && memberInfo) fetchCycleData();
  }, [group?.status, memberInfo?.id]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !id || !auth.currentUser) return;
    try {
      await sendGroupMessage(id, auth.currentUser.uid, newMessage.trim());
      setNewMessage('');
    } catch (e) { console.error(e); }
  };

  const handlePayDifferential = async () => {
    if (!memberInfo || !auth.currentUser) return;
    setLoading(true);
    try { await payDepositDifferential(memberInfo.id, auth.currentUser.uid); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handlePayContribution = async () => {
    if (!memberInfo || !activeCycle || !auth.currentUser) return;
    setLoading(true);
    try {
      await process_contribution_payment(memberInfo.id, activeCycle.id);
      await fetchCycleData();
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  if (loading && !group) return <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center font-sans text-[#A39887]">Chargement...</div>;
  if (!group) return null;

  // LOGIQUE FINANCIÈRE
  const totalPot = group.contribution_amount * group.target_members;
  const assurance = totalPot * 0.01;
  const fraisGestion = totalPot * 0.03;
  const cagnotteDisponible = totalPot * 0.96;
  
  let retention = 0;
  if (memberInfo?.draw_position) {
    const tauxBase = memberInfo.draw_position <= 2 ? 1 : (memberInfo.draw_position <= 5 ? 0.5 : 0);
    const coeffs: Record<string, number> = { 'BRONZE': 1, 'SILVER': 0.75, 'GOLD': 0.5, 'PLATINUM': 0.25 };
    retention = group.contribution_amount * tauxBase * (coeffs[memberInfo.tier] || 1);
  }
  const netRecu = cagnotteDisponible - retention;

  const beneficiary = activeCycle ? membersList.find(m => m.id === activeCycle.beneficiary_member_id) : null;
  const currentCycleNum = group.current_cycle || 1;
  const progressPercent = (currentCycleNum / (group.total_cycles || 1)) * 100;
  const isForming = group.status === 'FORMING';

  return (
    <div className="min-h-screen bg-[#FAFAF8] pb-[88px] font-sans">
      
      {/* TOP BAR */}
      <div className="pt-[52px] px-[20px] mb-[20px] flex items-start gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 bg-white rounded-[12px] flex items-center justify-center transition-opacity active:opacity-80">
          <ArrowLeft size={18} stroke="#6B6B6B" strokeWidth={1.5} />
        </button>
        <div className="flex-1">
          <h1 className="text-[20px] font-extrabold text-[#1A1A1A] tracking-tight mb-1 leading-tight">{group.name}</h1>
          <p className="text-[12px] text-[#A39887]">
            {group.is_public ? 'Cercle public' : 'Cercle privé'} · {group.target_members} membres · {formatXOF(group.contribution_amount)} / mois
          </p>
        </div>
        <div className="bg-[#F0FDF4] text-[#047857] text-[10px] font-bold uppercase tracking-[0.08em] px-2.5 py-1 rounded-[8px] flex-shrink-0 mt-1">
          {group.status === 'ACTIVE' ? 'Actif' : 'Constitution'}
        </div>
      </div>

      {/* RÉSUMÉ */}
      <div className="bg-white rounded-[20px] p-[18px] mx-4 mb-2.5">
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          <div className="bg-[#FAFAF8] rounded-[12px] p-2.5 px-3">
            <div className="text-[15px] font-extrabold text-[#1A1A1A]">{formatXOF(totalPot).replace(' FCFA', '')}</div>
            <div className="text-[10px] font-bold text-[#A39887] uppercase tracking-[0.06em]">Cagnotte FCFA</div>
          </div>
          <div className="bg-[#FAFAF8] rounded-[12px] p-2.5 px-3">
            <div className="text-[15px] font-extrabold text-[#1A1A1A]">{currentCycleNum}/{group.total_cycles}</div>
            <div className="text-[10px] font-bold text-[#A39887] uppercase tracking-[0.06em]">Cycles</div>
          </div>
          <div className="bg-[#FAFAF8] rounded-[12px] p-2.5 px-3">
            <div className="text-[15px] font-extrabold text-[#1A1A1A]">{formatXOF(assurance).replace(' FCFA', '')}</div>
            <div className="text-[10px] font-bold text-[#A39887] uppercase tracking-[0.06em]">Assurance</div>
          </div>
        </div>
        
        <div className="bg-[#F0EFED] h-1 rounded-full overflow-hidden mb-1.5">
          <div className="bg-[#047857] h-full rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="flex justify-between text-[11px] font-semibold text-[#A39887]">
          <span>Cycle {currentCycleNum} / {group.total_cycles}</span>
          <span className="text-[#047857] font-bold">{beneficiary ? `${beneficiary.name} reçoit ce cycle` : 'Tirage en attente'}</span>
        </div>
      </div>

      {/* RÉPARTITION */}
      <div className="bg-white rounded-[20px] overflow-hidden mx-4 mb-2.5">
        <div className="px-5 pt-4 pb-3 border-b border-[#F5F4F2]">
          <h2 className="text-[13px] font-extrabold text-[#1A1A1A] mb-0.5">Comment est répartie votre cagnotte ?</h2>
          <p className="text-[11px] text-[#A39887]">Pour {formatXOF(totalPot)} collectés ce cycle</p>
        </div>
        <div className="px-5 py-4 bg-[#FAFAF8]">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[12px] font-medium text-[#6B6B6B]">Assurance groupe (1%)</span>
            <span className="text-[13px] font-bold text-[#A39887]">{formatXOF(assurance)}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[12px] font-medium text-[#6B6B6B]">Frais de gestion (3%)</span>
            <span className="text-[13px] font-bold text-[#A39887]">{formatXOF(fraisGestion)}</span>
          </div>
          <div className="h-px bg-[#EDECEA] my-2" />
          <div className="flex justify-between items-center mb-2">
            <span className="text-[12px] font-medium text-[#6B6B6B]">Cagnotte disponible</span>
            <span className="text-[13px] font-bold text-[#A39887]">{formatXOF(cagnotteDisponible)}</span>
          </div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-[12px] font-medium text-[#6B6B6B]">Avance cotisation suivante</span>
            <span className="text-[13px] font-bold text-[#A39887]">{retention > 0 ? `-${formatXOF(retention)}` : '0 FCFA'}</span>
          </div>
          <div className="bg-[#F0FDF4] rounded-[12px] px-3.5 py-3 flex justify-between items-center">
            <span className="text-[13px] font-bold text-[#047857]">{beneficiary?.id === memberInfo?.id ? 'Vous recevez' : `${beneficiary?.name || 'Le membre'} reçoit`}</span>
            <span className="text-[16px] font-extrabold text-[#047857]">{formatXOF(netRecu)}</span>
          </div>
        </div>
      </div>

      {/* STRIP TIRAGE */}
      <div onClick={() => navigate(`/tirage/${id}`)} className="bg-white rounded-[20px] mx-4 mb-2.5 flex items-center gap-3 p-4 cursor-pointer active:opacity-80 transition-opacity">
        <div className="w-9 h-9 bg-[#F0FDF4] rounded-[12px] flex items-center justify-center shrink-0">
          <Clock size={18} stroke="#047857" strokeWidth={1.5} />
        </div>
        <div className="flex-1">
          <h3 className="text-[14px] font-bold text-[#1A1A1A]">Tirage des positions</h3>
          <p className="text-[12px] text-[#A39887]">
            {isForming ? "Aura lieu dès que le groupe est complet" : (memberInfo?.draw_position ? `Effectué · Vous êtes en position #${memberInfo.draw_position}` : "En attente du tirage")}
          </p>
        </div>
        <ChevronRight size={18} className="text-[#C4B8AC]" />
      </div>

      {/* MA SITUATION */}
      <div className="bg-white rounded-[20px] overflow-hidden mx-4 mb-2.5 pb-4">
        <div className="px-5 pt-4 pb-3.5 text-[11px] font-bold uppercase tracking-widest text-[#A39887]">MA SITUATION</div>
        
        <div className="bg-[#FAFAF8] rounded-[14px] px-4 py-2.5 mx-5 mb-3 flex items-center gap-2.5">
          <span className="text-[20px] font-extrabold text-[#1A1A1A]">{memberInfo?.draw_position ? `#${memberInfo.draw_position}` : '—'}</span>
          <span className="text-[12px] font-semibold text-[#A39887]">{memberInfo?.draw_position ? "Position de tirage" : "Position non encore tirée"}</span>
        </div>

        <div className="mx-5 flex flex-col gap-2">
          {/* Bloc Caution */}
          <div className="bg-[#FAFAF8] rounded-[14px] p-3 px-3.5">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[12px] font-semibold text-[#6B6B6B]">Caution bloquée</span>
              <span className="bg-[#F0FDF4] text-[#047857] text-[10px] font-bold px-2.5 py-1 rounded-[8px]">Validée</span>
            </div>
            <div className="text-[15px] font-extrabold text-[#1A1A1A]">{formatXOF(memberInfo?.initial_deposit || 0)}</div>
            {memberInfo?.deposit_differential > 0 && !memberInfo?.deposit_differential_paid && (
              <>
                <div className="h-px bg-[#EDECEA] my-2.5" />
                <div className="flex justify-between items-start gap-2.5">
                  <div className="flex-1">
                    <div className="text-[12px] font-semibold text-[#6B6B6B]">Complément requis</div>
                    <div className="text-[10px] italic text-[#C4B8AC]">Selon votre position de tirage</div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <div className="text-[14px] font-extrabold text-[#1A1A1A]">+{formatXOF(memberInfo.deposit_differential)}</div>
                    <button onClick={handlePayDifferential} className="bg-[#047857] text-white text-[11px] font-bold px-4 py-2 rounded-[12px] active:opacity-80 transition-opacity">Compléter</button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Bloc Cotisation */}
          <div className="bg-[#FAFAF8] rounded-[14px] p-3 px-3.5 flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[12px] font-semibold text-[#6B6B6B]">Cotisation ce cycle</span>
                <span className="text-[11px] font-semibold text-[#A39887]">{activeCycle?.payment_due_date ? formatXOF(activeCycle.payment_due_date) : '--/--'}</span>
              </div>
              <div className="text-[15px] font-extrabold text-[#1A1A1A]">{formatXOF(group.contribution_amount)}</div>
            </div>
            {userPayment?.status === 'COMPLETED' ? (
              <span className="bg-[#F0FDF4] text-[#047857] text-[10px] font-bold px-2.5 py-1 rounded-[8px]">Payée</span>
            ) : (
              <button onClick={handlePayContribution} className="bg-[#047857] text-white text-[12px] font-bold px-4 py-2 rounded-[12px] active:opacity-80 transition-opacity">Payer</button>
            )}
          </div>
        </div>
      </div>

      {/* MEMBRES */}
      <div className="bg-white rounded-[20px] p-[18px] px-5 mx-4 mb-2.5">
        <div className="text-[11px] font-bold uppercase tracking-widest text-[#A39887] mb-3.5">MEMBRES · CYCLE EN COURS</div>
        <div className="flex flex-col">
          {membersList.map((member) => (
            <div key={member.id} className="flex items-center gap-3 py-2.5 border-b border-[#F8F7F6] last:border-0">
              <div className={`w-9 h-9 rounded-[12px] flex items-center justify-center text-[12px] font-extrabold shrink-0 ${member.user_id === auth.currentUser?.uid ? 'bg-[#047857] text-white' : 'bg-[#F0FDF4] text-[#047857]'}`}>
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-[#1A1A1A] truncate">{member.name} {member.user_id === auth.currentUser?.uid ? '(Moi)' : ''}</div>
                <div className="text-[11px] text-[#A39887]">Position {member.draw_position || '?'}</div>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-[8px] ${activeCycle?.beneficiary_member_id === member.id ? 'bg-[#EFF6FF] text-[#3B82F6]' : 'bg-[#F0FDF4] text-[#047857]'}`}>
                {activeCycle?.beneficiary_member_id === member.id ? 'Reçoit' : 'Payé'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* BOUTON FLOTTANT CHAT */}
      <button onClick={() => setIsChatOpen(true)} className="fixed bottom-4 right-5 w-12 h-12 bg-[#047857] rounded-[16px] flex items-center justify-center shadow-[0_8px_24px_rgba(4,120,87,0.3)] z-40 active:opacity-80 transition-all">
        <MessageCircle size={20} stroke="white" strokeWidth={1.5} />
        {messages.length > 0 && <div className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-[#EF4444] rounded-full border-2 border-[#FAFAF8] text-[9px] font-extrabold text-white flex items-center justify-center">1</div>}
      </button>

    </div>
  );
}