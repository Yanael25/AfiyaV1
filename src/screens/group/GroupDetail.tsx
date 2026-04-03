import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MessageCircle, ChevronRight, Check, Info, X, Shield } from 'lucide-react';
import { formatXOF } from '../../lib/utils';
import { auth } from '../../lib/firebase';
import { getUserProfile } from '../../services/userService';
import { subscribeToDocument, subscribeToCollection } from '../../lib/firestore';
import { where } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
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
import { process_contribution_payment } from '../../lib/businessLogic';

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
  const [showPedagogy, setShowPedagogy] = useState(false);

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

  const cleanAmount = (val: number) => {
    return formatXOF(val).replace(/\s?FCFA/gi, '').trim();
  };

  const formatShortDate = (timestamp: any) => {
    if (!timestamp) return '--/--';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  };

  if (loading && !group) return (
    <div className="min-h-screen bg-[#FAFAF8] pb-[140px] font-sans px-6 pt-[60px]">
      <div className="h-8 w-48 bg-[#E8E6E3] rounded-full animate-pulse mb-6" />
      <div className="h-[200px] w-full bg-[#E8E6E3] rounded-[24px] animate-pulse mb-4" />
      <div className="h-[300px] w-full bg-[#E8E6E3] rounded-[24px] animate-pulse mb-4" />
      <div className="h-[200px] w-full bg-[#E8E6E3] rounded-[24px] animate-pulse mb-4" />
    </div>
  );
  
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
  const isMeBeneficiary = beneficiary?.id === memberInfo?.id;
  const beneficiaryDisplay = isMeBeneficiary ? 'Moi' : (beneficiary?.name || 'Le membre');
  
  const currentCycleNum = group.current_cycle || 1;
  const progressPercent = (currentCycleNum / (group.total_cycles || 1)) * 100;
  const isForming = group.status === 'FORMING' || group.status === 'DRAFT' || group.status === 'WAITING_VOTE';

  const sortedMembers = [...membersList].sort((a, b) => {
    if (a.id === memberInfo?.id) return -1;
    if (b.id === memberInfo?.id) return 1;
    if (a.id === beneficiary?.id) return -1;
    if (b.id === beneficiary?.id) return 1;
    return (a.draw_position || 99) - (b.draw_position || 99);
  });

  const mustPay = userPayment?.status !== 'COMPLETED' && !isForming;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="min-h-screen bg-[#FAFAF8] pb-[140px] font-sans selection:bg-[#047857]/20 relative"
    >
      
      {/* TOP BAR FIXE */}
      <div className="pt-[60px] px-6 pb-4 flex items-center gap-4 bg-[#FAFAF8] sticky top-0 z-50">
        <button onClick={() => navigate(-1)} className="w-11 h-11 bg-white rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-sm border border-[#F0EFED]">
          <ArrowLeft size={20} className="text-[#1A1A1A]" strokeWidth={1.5} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-[24px] font-bold text-[#1A1A1A] tracking-tight truncate">{group.name}</h1>
          <p className="text-[13px] font-medium text-[#A39887] truncate mt-0.5">
            {group.is_public ? 'Cercle public' : 'Cercle privé'} • {group.target_members} membres
          </p>
        </div>
        <div className={`text-[11px] font-bold uppercase tracking-[0.1em] px-3 py-1.5 rounded-[10px] shrink-0 ${
          !isForming ? 'bg-[#F0FDF4] text-[#047857]' : 'bg-[#E8E6E3] text-[#6B6B6B]'
        }`}>
          {!isForming ? 'Actif' : 'Constitution'}
        </div>
      </div>

      <div className="flex flex-col gap-5 px-6 mt-2">
        
        {/* BLOC 1 : LE TABLEAU DE BORD (Global + Situation) */}
        <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-[#F0EFED]">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#A39887] mb-1.5">Cagnotte Totale</div>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-[32px] font-bold text-[#1A1A1A] tracking-tight">{cleanAmount(totalPot)}</span>
                <span className="text-[14px] font-bold text-[#A39887]">FCFA</span>
              </div>
            </div>
            
            {/* SVG Progress Ring */}
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="16" stroke="#F0EFED" strokeWidth="3" fill="none" />
                <circle 
                  cx="18" 
                  cy="18" 
                  r="16" 
                  stroke="#047857" 
                  strokeWidth="3" 
                  fill="none" 
                  strokeDasharray="100" 
                  strokeDashoffset={100 - progressPercent} 
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="flex flex-col items-center justify-center">
                <span className="font-display text-[16px] font-bold text-[#1A1A1A] leading-none">{currentCycleNum}</span>
                <span className="text-[9px] font-bold text-[#A39887] uppercase mt-0.5">/{group.total_cycles}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center text-[13px] font-medium text-[#A39887] bg-[#FAFAF8] p-4 rounded-[16px]">
            <span className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isForming ? 'bg-[#F59E0B]' : 'bg-[#047857]'}`} />
              {isForming ? 'En attente de membres' : 'Cycle en cours'}
            </span>
            <span className="text-[#1A1A1A] font-bold">{isForming ? '—' : `${beneficiaryDisplay} reçoit`}</span>
          </div>

          <div className="h-[1px] bg-[#F0EFED] my-6" />

          <div className="flex flex-col gap-2">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#A39887] mb-2">Ma situation</h3>
            
            <div 
              onClick={() => navigate(`/tirage/${id}`)}
              className="flex justify-between items-center py-3 active:opacity-70 cursor-pointer transition-opacity group"
            >
              <span className="text-[14px] font-semibold text-[#1A1A1A]">Ordre de réception</span>
              <div className="flex items-center gap-2">
                <span className="font-display text-[16px] font-bold text-[#047857] bg-[#F0FDF4] px-3 py-1 rounded-[10px]">
                  {memberInfo?.draw_position ? `#${memberInfo.draw_position}` : '—'}
                </span>
                <ChevronRight size={18} className="text-[#C4B8AC] group-active:translate-x-1 transition-transform" />
              </div>
            </div>

            <div className="flex justify-between items-center py-3">
              <span className="text-[14px] font-semibold text-[#1A1A1A]">Caution bloquée</span>
              <span className="font-display text-[16px] font-bold text-[#1A1A1A]">{cleanAmount(memberInfo?.initial_deposit || 0)} <span className="text-[12px] font-bold text-[#A39887] font-sans">FCFA</span></span>
            </div>

            <div className="flex justify-between items-center py-3">
              <div className="flex flex-col">
                <span className="text-[14px] font-semibold text-[#1A1A1A]">Ma cotisation</span>
                <span className="text-[12px] text-[#A39887] mt-0.5">{activeCycle?.payment_due_date ? `Avant le ${formatShortDate(activeCycle.payment_due_date)}` : 'En attente'}</span>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className="font-display text-[16px] font-bold text-[#1A1A1A]">{cleanAmount(group.contribution_amount)} <span className="text-[12px] font-bold text-[#A39887] font-sans">FCFA</span></span>
                {userPayment?.status === 'COMPLETED' ? (
                  <div className="flex items-center gap-1 bg-[#F0FDF4] text-[#047857] px-2.5 py-1 rounded-[8px]">
                    <Check size={12} strokeWidth={3} />
                    <span className="text-[10px] font-bold uppercase tracking-[0.05em]">Payée</span>
                  </div>
                ) : (
                  <span className="bg-[#FFF3E0] text-[#E65100] text-[10px] font-bold uppercase tracking-[0.05em] px-2.5 py-1 rounded-[8px]">À régler</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* BLOC 2 : RÉPARTITION (Design "Reçu officiel") */}
        <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-[#F0EFED] relative overflow-hidden">
          {/* Effet bordure ticket */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxjaXJjbGUgY3g9IjQiIGN5PSI0IiByPSIyIiBmaWxsPSIjRjBFRkVEIi8+PC9zdmc+')] repeat-x"></div>
          
          <div className="flex justify-between items-start mt-2 mb-1">
            <h2 className="font-display text-[18px] font-bold text-[#1A1A1A]">Répartition de la cagnotte</h2>
            <button 
              onClick={() => setShowPedagogy(true)}
              className="w-8 h-8 rounded-full bg-[#FAFAF8] flex items-center justify-center text-[#A39887] hover:bg-[#F0EFED] transition-colors"
            >
              <Info size={16} />
            </button>
          </div>
          <p className="text-[13px] font-medium text-[#A39887] mb-6">Sur un total de {cleanAmount(totalPot)} FCFA</p>
          
          <div className="flex flex-col gap-4 font-mono text-[13px]">
            <div className="flex justify-between items-center">
              <span className="text-[#6B6B6B]">Assurance (1%)</span>
              <span className="font-bold text-[#A39887]">{cleanAmount(assurance)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#6B6B6B]">Frais de gestion (3%)</span>
              <span className="font-bold text-[#A39887]">{cleanAmount(fraisGestion)}</span>
            </div>
            
            <div className="border-t-2 border-dashed border-[#F0EFED] my-2" />
            
            <div className="flex justify-between items-center">
              <span className="font-bold text-[#1A1A1A] font-sans text-[14px]">Cagnotte disponible</span>
              <span className="font-bold text-[#1A1A1A]">{cleanAmount(cagnotteDisponible)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#6B6B6B]">Avance cycle suivant</span>
              <span className="font-bold text-[#A39887]">{retention > 0 ? `-${cleanAmount(retention)}` : '0'}</span>
            </div>
            
            <div className="border-t-2 border-dashed border-[#F0EFED] my-2" />

            <div className="bg-[#FAFAF8] rounded-[16px] p-5 mt-1 flex justify-between items-center border border-[#F0EFED]">
              <span className="text-[14px] font-bold text-[#1A1A1A] font-sans">
                {isMeBeneficiary ? 'Je reçois' : `${beneficiaryDisplay} reçoit`}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-[24px] font-bold text-[#1A1A1A] tracking-tight">{cleanAmount(netRecu)}</span>
                <span className="text-[13px] font-bold text-[#A39887] font-sans">FCFA</span>
              </div>
            </div>
          </div>
        </div>

        {/* BLOC 3 : MEMBRES */}
        <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-[#F0EFED]">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#A39887]">Membres du cercle</h3>
            <span className="text-[12px] font-bold text-[#1A1A1A] bg-[#FAFAF8] px-3 py-1 rounded-[10px]">
              {membersList.length}/{group.target_members}
            </span>
          </div>
          
          <div className="flex flex-col gap-3">
            {sortedMembers.map((member) => {
              const isThisBeneficiary = activeCycle?.beneficiary_member_id === member.id;
              const isMe = member.user_id === auth.currentUser?.uid;

              return (
                <div key={member.id} className={`flex items-center gap-4 p-3.5 rounded-[16px] transition-colors ${isThisBeneficiary ? 'bg-[#F0FDF4] border border-[#047857]/10' : 'bg-[#FAFAF8] border border-transparent'}`}>
                  <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center text-[15px] font-bold shrink-0 shadow-sm ${
                    isMe ? 'bg-[#047857] text-white' : 'bg-white text-[#1A1A1A] border border-[#F0EFED]'
                  }`}>
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[15px] font-bold text-[#1A1A1A] truncate">{isMe ? 'Moi' : member.name}</span>
                    </div>
                    <div className="text-[13px] font-medium text-[#A39887]">Position {member.draw_position || '—'}</div>
                  </div>
                  {isThisBeneficiary ? (
                    <span className="text-[10px] font-bold uppercase tracking-[0.05em] px-3 py-1.5 rounded-[8px] bg-[#047857] text-white shadow-sm">
                      Reçoit
                    </span>
                  ) : (
                    <span className="text-[12px] font-bold text-[#C4B8AC]">
                      En attente
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* CALL TO ACTION PREMIUM & SUBTIL */}
      {mustPay && (
        <div className="fixed bottom-0 left-0 right-0 px-6 pb-8 pt-12 bg-gradient-to-t from-[#FAFAF8] via-[#FAFAF8] to-transparent z-40 pointer-events-none">
          <button 
            onClick={handlePayContribution} 
            className="w-full bg-[#047857] text-white rounded-[24px] p-4 flex items-center justify-between shadow-[0_12px_24px_rgba(4,120,87,0.25)] active:scale-[0.98] transition-transform pointer-events-auto"
          >
            <div className="flex flex-col items-start text-left ml-2">
              <span className="text-[13px] font-medium text-white/80">Cotisation requise</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="font-display text-[22px] font-bold tracking-tight">{cleanAmount(group.contribution_amount)}</span>
                <span className="text-[13px] font-bold text-white/80">FCFA</span>
              </div>
            </div>
            <div className="bg-white text-[#047857] text-[14px] font-bold px-6 py-3.5 rounded-[16px]">
              Payer
            </div>
          </button>
        </div>
      )}

      {/* BOUTON FLOTTANT CHAT (Ajusté pour ne pas gêner le paiement) */}
      <button 
        onClick={() => setIsChatOpen(true)} 
        className={`fixed right-6 w-14 h-14 bg-[#1A1A1A] text-white rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(26,26,26,0.25)] z-30 active:scale-95 transition-all duration-300 ${
          mustPay ? 'bottom-[120px]' : 'bottom-6'
        }`}
      >
        <MessageCircle size={24} strokeWidth={2} />
        {messages.length > 0 && (
          <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-[#EF4444] border-2 border-[#1A1A1A] rounded-full" />
        )}
      </button>

      {/* BOTTOM SHEET PÉDAGOGIQUE */}
      <AnimatePresence>
        {showPedagogy && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPedagogy(false)}
              className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] p-6 z-50 shadow-[0_-8px_32px_rgba(0,0,0,0.08)]"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-display text-[20px] font-bold text-[#1A1A1A]">Comprendre la répartition</h3>
                <button onClick={() => setShowPedagogy(false)} className="w-8 h-8 bg-[#FAFAF8] rounded-full flex items-center justify-center text-[#A39887]">
                  <X size={18} />
                </button>
              </div>
              
              <div className="flex flex-col gap-6 font-sans">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#F0FDF4] flex items-center justify-center shrink-0 text-[#047857]">
                    <Shield size={20} />
                  </div>
                  <div>
                    <h4 className="text-[15px] font-bold text-[#1A1A1A] mb-1">Assurance groupe (1%)</h4>
                    <p className="text-[13px] text-[#6B6B6B] leading-relaxed">
                      Ce fonds appartient à votre cercle. Il sert de protection en cas de retard. S'il n'est pas utilisé, il vous est redistribué à la fin.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#FAFAF8] flex items-center justify-center shrink-0 text-[#1A1A1A]">
                    <Info size={20} />
                  </div>
                  <div>
                    <h4 className="text-[15px] font-bold text-[#1A1A1A] mb-1">Frais de gestion (3%)</h4>
                    <p className="text-[13px] text-[#6B6B6B] leading-relaxed">
                      Ces frais permettent à Afiya de sécuriser vos fonds, d'automatiser les prélèvements et de garantir le paiement du bénéficiaire à J+4.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#FFFBEB] flex items-center justify-center shrink-0 text-[#F59E0B]">
                    <Check size={20} />
                  </div>
                  <div>
                    <h4 className="text-[15px] font-bold text-[#1A1A1A] mb-1">Avance cycle suivant</h4>
                    <p className="text-[13px] text-[#6B6B6B] leading-relaxed">
                      Une retenue dynamique est appliquée selon votre position de tirage et votre Tier. Elle sert de garantie pour vos prochaines cotisations.
                    </p>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setShowPedagogy(false)}
                className="w-full mt-8 bg-[#1A1A1A] text-white font-bold text-[15px] py-4 rounded-[16px] active:scale-[0.98] transition-transform"
              >
                J'ai compris
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </motion.div>
  );
}