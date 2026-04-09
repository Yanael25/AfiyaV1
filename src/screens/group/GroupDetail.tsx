import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, MessageCircle, Info, Shield, Lock,
  ArrowUpDown, Check, Send, X, Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatXOF } from '../../lib/utils';
import { auth, db } from '../../lib/firebase';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { getUserProfile } from '../../services/userService';
import { subscribeToDocument, subscribeToCollection } from '../../lib/firestore';
import {
  subscribeToGroupMessages,
  sendGroupMessage,
  getActiveCycle,
  getMemberPayment,
  Message,
  TontineGroup,
  TontineMember,
  Cycle,
  Payment,
} from '../../services/tontineService';
import { process_contribution_payment, leave_group_forming, set_member_vote } from '../../lib/businessLogic';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ca(val: number) {
  return formatXOF(val).replace(/\s?FCFA/gi, '').trim();
}

function sd(ts: any) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function initials(name: string) {
  return name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
}

const FREQ: Record<string, string> = {
  WEEKLY: 'Hebdomadaire', MONTHLY: 'Mensuel', QUARTERLY: 'Trimestriel',
};

function isDeadlineClose(ts: any) {
  if (!ts) return false;
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return (d.getTime() - Date.now()) < 7 * 24 * 60 * 60 * 1000;
}

function calcRetention(memberInfo: any, group: any) {
  if (!memberInfo?.draw_position) return 0;
  const tauxBase = memberInfo.draw_position <= 2 ? 1 : memberInfo.draw_position <= 5 ? 0.5 : 0;
  const coeffs: Record<string, number> = { BRONZE: 1, SILVER: 0.75, GOLD: 0.5, PLATINUM: 0.25 };
  return group.contribution_amount * tauxBase * (coeffs[memberInfo.tier_at_join] ?? 1);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function GroupDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [group, setGroup]               = useState<any>(null);
  const [memberInfo, setMemberInfo]     = useState<any>(null);
  const [membersList, setMembersList]   = useState<any[]>([]);
  const [allCycles, setAllCycles]       = useState<Cycle[]>([]);
  const [activeCycle, setActiveCycle]   = useState<Cycle | null>(null);
  const [userPayment, setUserPayment]   = useState<Payment | null>(null);
  const [cyclePayments, setCyclePayments] = useState<any[]>([]);
  const [miniFund, setMiniFund]         = useState<number>(0);
  const [messages, setMessages]         = useState<Message[]>([]);
  const [loading, setLoading]           = useState(true);
  const [activeTab, setActiveTab]       = useState<'details' | 'positions' | 'cycles'>('details');
  const [chatOpen, setChatOpen]         = useState(false);
  const [chatInput, setChatInput]       = useState('');
  const [copied, setCopied]             = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [voteLoading, setVoteLoading]   = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Data subscriptions ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const user = auth.currentUser;
    if (!user) { navigate('/welcome'); return; }

    const unsubGroup = subscribeToDocument<TontineGroup>('tontine_groups', id, (g) => {
      if (!g) { navigate('/tontines'); return; }
      setGroup(g);
      setLoading(false);
    });

    const unsubMembers = subscribeToCollection<TontineMember>(
      'tontine_members',
      [where('group_id', '==', id)],
      async (members) => {
        const me = members.find((m: any) => m.user_id === user.uid);
        if (me) setMemberInfo(me);
        const enriched = await Promise.all(members.map(async (m: any) => {
          let name = m.member_name;
          if (!name) {
            const p = await getUserProfile(m.user_id);
            name = p?.full_name || 'Membre';
          }
          return { ...m, name };
        }));
        setMembersList(enriched);
      }
    );

    const unsubCycles = subscribeToCollection<Cycle>(
      'cycles',
      [where('group_id', '==', id), orderBy('cycle_number', 'asc')],
      (cycles) => setAllCycles(cycles)
    );

    const unsubMessages = subscribeToGroupMessages(id, setMessages);

    // Mini fund wallet
    const unsubMini = subscribeToCollection<any>(
      'wallets',
      [where('group_id', '==', id), where('wallet_type', '==', 'GROUP_MINI_FUND')],
      (wallets) => { if (wallets.length > 0) setMiniFund(wallets[0].balance ?? 0); }
    );

    return () => { unsubGroup(); unsubMembers(); unsubCycles(); unsubMessages(); unsubMini(); };
  }, [id, navigate]);

  // ── Fetch cycle payment data when active ────────────────────────────────────
  useEffect(() => {
    if (!group || group.status !== 'ACTIVE' || !memberInfo || !id) return;
    (async () => {
      const cycle = await getActiveCycle(id);
      setActiveCycle(cycle);
      if (cycle) {
        const payment = await getMemberPayment(cycle.id, memberInfo.id);
        setUserPayment(payment);
        const snap = await getDocs(query(collection(db, 'payments'), where('cycle_id', '==', cycle.id)));
        setCyclePayments(snap.docs.map((d: any) => d.data()));
      }
    })();
  }, [group?.status, memberInfo?.id]);

  // ── Auto-scroll chat ────────────────────────────────────────────────────────
  useEffect(() => {
    if (chatOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatOpen]);

  if (loading || !group) return (
    <div className="min-h-screen bg-[#F5F4F0] pt-[52px] px-4 font-sans">
      <div className="h-9 w-40 bg-[#E8E6E3] rounded-[11px] animate-pulse mb-4" />
      <div className="h-[160px] bg-[#E8E6E3] rounded-[16px] animate-pulse mb-3" />
      <div className="h-[200px] bg-[#E8E6E3] rounded-[16px] animate-pulse mb-3" />
    </div>
  );

  // ── Derived ─────────────────────────────────────────────────────────────────
  const user = auth.currentUser!;
  const isForming = ['FORMING', 'DRAFT', 'WAITING_VOTE'].includes(group.status);
  const isActive  = group.status === 'ACTIVE';
  const isCompleted = group.status === 'COMPLETED';

  const totalPot    = group.contribution_amount * group.target_members;
  const fraisGestion = totalPot * 0.03;
  const assurance   = totalPot * 0.01;
  const netCagnotte = totalPot - fraisGestion - assurance;
  const retention   = calcRetention(memberInfo, group);
  const netReceived = netCagnotte - retention;

  const freqLabel   = FREQ[group.frequency] ?? group.frequency;
  const count       = membersList.length;
  const subtitle    = `${ca(group.contribution_amount)} FCFA · ${freqLabel} · ${count}/${group.target_members}`;

  const drawDone = membersList.some((m: any) => m.draw_position != null);
  const sortedByPos = [...membersList].sort((a: any, b: any) =>
    (a.draw_position ?? 999) - (b.draw_position ?? 999)
  );

  const beneficiaryMember = activeCycle
    ? membersList.find((m: any) => m.id === activeCycle.beneficiary_member_id)
    : null;

  const paidCount = cyclePayments.filter((p: any) => p.status === 'SUCCESS').length;
  const myPaymentDone = userPayment?.status === 'SUCCESS';

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !id) return;
    await sendGroupMessage(id, user.uid, chatInput.trim());
    setChatInput('');
  };

  const handlePayContribution = async () => {
    if (!memberInfo || !activeCycle) return;
    try { await process_contribution_payment(memberInfo.id, activeCycle.id); }
    catch (e: any) { console.error(e); }
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(group.invitation_code ?? '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeaveGroup = async () => {
    if (!memberInfo || !auth.currentUser) return;
    const confirmed = window.confirm(
      'Êtes-vous sûr de vouloir quitter ce cercle ? Des frais de sortie s\'appliquent.'
    );
    if (!confirmed) return;
    setLeaveLoading(true);
    try {
      const result = await leave_group_forming(memberInfo.id, auth.currentUser.uid);
      if (result.groupCancelled) {
        navigate('/tontines');
      } else {
        navigate('/tontines');
      }
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la sortie du groupe');
    } finally {
      setLeaveLoading(false);
    }
  };

  const handleVote = async (wantsToContinue: boolean) => {
    if (!memberInfo || !auth.currentUser) return;
    setVoteLoading(true);
    try {
      await set_member_vote(memberInfo.id, auth.currentUser.uid, wantsToContinue);
    } catch (e: any) {
      setError(e.message || 'Erreur lors du vote');
    } finally {
      setVoteLoading(false);
    }
  };

  // Cycle timeline items (all cycles 1..total_cycles)
  const cycleItems = Array.from({ length: group.total_cycles ?? 0 }, (_, i) => {
    const num = i + 1;
    const fetched = allCycles.find((c: any) => c.cycle_number === num) ?? null;
    const bMember = fetched?.beneficiary_member_id
      ? membersList.find((m: any) => m.id === fetched.beneficiary_member_id)
      : null;
    const isMe = bMember?.user_id === user.uid;
    const expectedByPos = membersList.find((m: any) => m.draw_position === num);
    const isMeByPos = expectedByPos?.user_id === user.uid;
    return { num, fetched, bMember, isMe, isMeByPos };
  });


  // ── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F5F4F0] pb-[88px] font-sans selection:bg-[#047857]/20 relative">

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-40 bg-[#F5F4F0] pt-[52px] px-4 pb-3"
        style={{ borderBottom: '1px solid #EDECEA' }}
      >
        <div className="flex items-center gap-3">
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="shrink-0 flex items-center justify-center active:scale-95 transition-transform"
            style={{ width: 36, height: 36, borderRadius: 11, background: '#FFFFFF', border: '0.5px solid #EDECEA' }}
          >
            <ArrowLeft size={14} style={{ color: '#6B6B6B' }} strokeWidth={2} />
          </button>

          {/* Title + subtitle */}
          <div className="flex-1 min-w-0">
            <h1
              className="text-[15px] font-extrabold text-[#1A1A1A] truncate leading-tight"
              style={{ letterSpacing: '-0.01em' }}
            >
              {group.name}
            </h1>
            <p className="text-[10px] font-medium text-[#A39887] truncate">{subtitle}</p>
          </div>

          {/* Status badge */}
          <span
            className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-md"
            style={isActive
              ? { background: '#D1FAE5', color: '#065F46' }
              : { background: '#F5F4F0', color: '#6B6B6B' }}
          >
            {isActive ? 'Actif' : isCompleted ? 'Complété' : 'En formation'}
          </span>
        </div>

        {/* Sub-tabs */}
        <div className="flex mt-3 gap-6">
          {(['details', 'positions', 'cycles'] as const).map(tab => {
            const labels = { details: 'Détails', positions: 'Positions', cycles: 'Cycles' };
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="pb-2 text-[13px] font-bold transition-colors"
                style={{
                  color: active ? '#047857' : '#A39887',
                  borderBottom: active ? '2px solid #047857' : '2px solid transparent',
                  marginBottom: -1,
                }}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ══════════════════ ONGLET DÉTAILS ══════════════════════════════════ */}
      {activeTab === 'details' && (
        <div className="px-4 pt-4 flex flex-col gap-3">

          {/* ─── EN FORMATION ─── */}
          {isForming && (
            <>
              {/* Bloc Membres */}
              <div style={{ background: '#FFFFFF', borderRadius: 16, border: '0.5px solid #EDECEA', padding: 14 }}>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-[18px] font-extrabold text-[#1A1A1A]">{count} / {group.target_members}</span>
                  <span className="text-[9px] text-[#A39887] ml-1">membres</span>
                </div>
                <div className="w-full overflow-hidden mb-2" style={{ height: 5, borderRadius: 3, background: '#E8E6E3' }}>
                  <div style={{
                    height: '100%', borderRadius: 3, background: '#047857',
                    width: `${Math.min((count / group.target_members) * 100, 100)}%`,
                    transition: 'width 0.4s ease',
                  }} />
                </div>
                {group.constitution_deadline && (
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-[#A39887]">Deadline constitution</span>
                    <span className="text-[9px] font-bold" style={{ color: isDeadlineClose(group.constitution_deadline) ? '#92400E' : '#A39887' }}>
                      {sd(group.constitution_deadline)}
                    </span>
                  </div>
                )}
              </div>

              {/* Bloc Invitation */}
              <div style={{ background: '#FFFFFF', borderRadius: 16, border: '0.5px solid #EDECEA', padding: 14 }}>
                <p className="text-[8px] font-bold uppercase tracking-widest text-[#A39887] mb-3">Inviter des membres</p>
                <div
                  className="flex items-center justify-center mb-3"
                  style={{ background: '#F5F4F0', borderRadius: 9, padding: '10px 14px' }}
                >
                  <span
                    className="text-[13px] font-extrabold text-[#1A1A1A]"
                    style={{ letterSpacing: '0.1em' }}
                  >
                    AFY-{group.invitation_code ?? '------'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyCode}
                    className="flex-1 flex items-center justify-center gap-1.5 text-white text-[11px] font-bold active:scale-95 transition-transform"
                    style={{ height: 32, borderRadius: 9, background: '#047857' }}
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? 'Copié !' : 'Copier le code'}
                  </button>
                  <button
                    className="flex-1 flex items-center justify-center text-[11px] font-bold text-[#1A1A1A] active:scale-95 transition-transform"
                    style={{ height: 32, borderRadius: 9, background: '#FFFFFF', border: '0.5px solid #EDECEA' }}
                    onClick={() => {
                      if (navigator.share) navigator.share({ title: group.name, text: `Rejoins mon cercle avec le code AFY-${group.invitation_code}` });
                    }}
                  >
                    Partager le lien
                  </button>
                </div>
              </div>

              {/* Bloc Règles */}
              <div style={{ background: '#FFFFFF', borderRadius: 16, border: '0.5px solid #EDECEA', padding: 14 }}>
                <p className="text-[8px] font-bold uppercase tracking-widest text-[#A39887] mb-3">Règles du cercle</p>
                {[
                  { label: `Cotisation ${freqLabel.toLowerCase()}`, value: `${ca(group.contribution_amount)} FCFA` },
                  { label: 'Membres maximum', value: String(group.target_members) },
                  { label: 'Frais de gestion', value: '3%' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center py-2" style={{ borderBottom: '0.5px solid #F5F4F0' }}>
                    <span className="text-[10px] font-medium text-[#6B6B6B]">{label}</span>
                    <span className="text-[10px] font-bold text-[#1A1A1A]">{value}</span>
                  </div>
                ))}
                <div className="flex items-start gap-2 mt-3" style={{ background: '#F5F4F0', borderRadius: 9, padding: 9 }}>
                  <Info size={12} style={{ color: '#047857', marginTop: 1, flexShrink: 0 }} />
                  <p className="text-[10px] font-medium text-[#6B6B6B]">
                    Le tirage est géré par Afiya, aléatoire et impartial, dès que le groupe est au complet.
                  </p>
                </div>
              </div>

              {/* ─── QUITTER LE CERCLE (FORMING uniquement) ─── */}
              {group.status === 'FORMING' && (
                <div style={{ background: '#FFFFFF', borderRadius: 16, border: '0.5px solid #EDECEA', padding: 14 }}>
                  {error && (
                    <p className="text-[11px] font-semibold text-[#92400E] mb-3">{error}</p>
                  )}
                  <button
                    onClick={handleLeaveGroup}
                    disabled={leaveLoading}
                    className="w-full text-[12px] font-bold text-[#92400E] active:scale-95 transition-transform disabled:opacity-50"
                    style={{ height: 40, borderRadius: 10, background: '#FEF3C7', border: '0.5px solid #F59E0B' }}
                  >
                    {leaveLoading ? 'Sortie en cours...' : 'Quitter le cercle'}
                  </button>
                  <p className="text-[9px] text-[#A39887] text-center mt-2">
                    Des frais de sortie s'appliquent (1% + 5% de la cotisation)
                  </p>
                </div>
              )}

              {/* ─── VOTE 48H (WAITING_VOTE uniquement) ─── */}
              {group.status === 'WAITING_VOTE' && (
                <div style={{ background: '#FFFFFF', borderRadius: 16, border: '0.5px solid #EDECEA', padding: 14 }}>
                  <p className="text-[8px] font-bold uppercase tracking-widest text-[#A39887] mb-3">Vote de continuation</p>
                  <p className="text-[12px] font-semibold text-[#1A1A1A] mb-3">
                    Le cercle n'est pas complet. Souhaitez-vous continuer avec les membres présents ?
                  </p>

                  {/* Stats */}
                  <div className="flex gap-2 mb-3">
                    <div className="flex-1 text-center" style={{ background: '#D1FAE5', borderRadius: 9, padding: '8px 4px' }}>
                      <span className="text-[18px] font-extrabold text-[#047857] block">
                        {membersList.filter((m: any) => m.wants_to_continue === true).length}
                      </span>
                      <span className="text-[9px] text-[#047857]">Veulent continuer</span>
                    </div>
                    <div className="flex-1 text-center" style={{ background: '#F5F4F0', borderRadius: 9, padding: '8px 4px' }}>
                      <span className="text-[18px] font-extrabold text-[#6B6B6B] block">
                        {membersList.filter((m: any) => m.wants_to_continue === undefined || m.wants_to_continue === null).length}
                      </span>
                      <span className="text-[9px] text-[#A39887]">N'ont pas répondu</span>
                    </div>
                  </div>

                  {/* Deadline */}
                  {group.vote_deadline && (
                    <p className="text-[10px] text-[#A39887] mb-3">
                      Décision avant le <span className="font-bold text-[#1A1A1A]">{sd(group.vote_deadline)}</span>
                    </p>
                  )}

                  {/* Vote actuel */}
                  {memberInfo?.wants_to_continue !== undefined && memberInfo?.wants_to_continue !== null && (
                    <div className="mb-3" style={{ background: '#F5F4F0', borderRadius: 9, padding: 9 }}>
                      <p className="text-[10px] text-[#6B6B6B]">
                        Votre vote actuel :{' '}
                        <span className="font-bold" style={{ color: memberInfo.wants_to_continue ? '#047857' : '#92400E' }}>
                          {memberInfo.wants_to_continue ? 'Je veux continuer' : 'Je préfère me retirer'}
                        </span>
                      </p>
                    </div>
                  )}

                  {error && (
                    <p className="text-[11px] font-semibold text-[#92400E] mb-3">{error}</p>
                  )}

                  {/* Boutons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleVote(true)}
                      disabled={voteLoading}
                      className="flex-1 text-[11px] font-bold text-white active:scale-95 transition-transform disabled:opacity-50"
                      style={{ height: 40, borderRadius: 10, background: '#047857' }}
                    >
                      Je veux continuer
                    </button>
                    <button
                      onClick={() => handleVote(false)}
                      disabled={voteLoading}
                      className="flex-1 text-[11px] font-bold text-[#92400E] active:scale-95 transition-transform disabled:opacity-50"
                      style={{ height: 40, borderRadius: 10, background: '#FEF3C7', border: '0.5px solid #F59E0B' }}
                    >
                      Je préfère me retirer
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ─── ACTIF ─── */}
          {isActive && (
            <>
              {/* Bloc Cagnotte */}
              <div style={{ background: '#FFFFFF', borderRadius: 18, border: '0.5px solid #EDECEA', padding: 16 }}>
                <p className="text-[8px] font-bold uppercase tracking-widest text-[#A39887] mb-2">
                  Cagnotte · Cycle {group.current_cycle ?? 1} / {group.total_cycles}
                </p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-[28px] font-extrabold text-[#1A1A1A] leading-none">{ca(totalPot)}</span>
                  <span className="text-[13px] text-[#A39887] font-medium">FCFA</span>
                </div>
                <p className="text-[10px] text-[#A39887] mb-3">
                  {group.target_members} membres × {ca(group.contribution_amount)} FCFA
                </p>

                {/* Grid 2 cols */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div style={{ background: '#F5F4F0', borderRadius: 10, padding: '10px 12px' }}>
                    <span className="text-[13px] font-bold text-[#1A1A1A] block">{paidCount} / {group.target_members}</span>
                    <span className="text-[9px] text-[#A39887]">{group.target_members - paidCount} en attente</span>
                    <p className="text-[9px] text-[#A39887] mt-1">Cotisations reçues</p>
                  </div>
                  <div style={{ background: '#F5F4F0', borderRadius: 10, padding: '10px 12px' }}>
                    <span className="text-[13px] font-bold block" style={{ color: '#047857' }}>{ca(memberInfo?.initial_deposit ?? 0)} FCFA</span>
                    <span className="text-[9px] text-[#A39887]">Restituée à la fin</span>
                    <p className="text-[9px] text-[#A39887] mt-1">Caution bloquée</p>
                  </div>
                </div>

                {/* Mini fund */}
                <div className="flex items-start gap-2" style={{ background: '#F0FDF4', borderRadius: 8, padding: 9 }}>
                  <Shield size={13} style={{ color: '#047857', flexShrink: 0, marginTop: 1 }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-[#065F46]">Fonds d'assurance groupe</span>
                      <span className="text-[12px] font-extrabold text-[#047857]">{ca(miniFund)} FCFA</span>
                    </div>
                    <p className="text-[8px] text-[#A39887] mt-0.5">Appartient au groupe · Non distribué</p>
                  </div>
                </div>
              </div>

              {/* Bloc Ma situation */}
              <div style={{ background: '#FFFFFF', borderRadius: 16, border: '0.5px solid #EDECEA', padding: 14 }}>
                <p className="text-[8px] font-bold uppercase tracking-widest text-[#A39887] mb-3">Ma situation</p>

                {/* Position row */}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="shrink-0 flex items-center justify-center text-white font-extrabold text-[18px]"
                    style={{ width: 42, height: 42, borderRadius: 13, background: '#047857' }}
                  >
                    {memberInfo?.draw_position ?? '?'}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-[#1A1A1A]">
                      Position #{memberInfo?.draw_position ?? '—'} sur {group.total_cycles}
                    </p>
                    <p className="text-[10px] text-[#A39887]">
                      {memberInfo?.draw_position
                        ? `Cycle estimé : cycle ${memberInfo.draw_position}`
                        : 'Position non attribuée'}
                    </p>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="flex flex-col gap-2 mb-3" style={{ background: '#F5F4F0', borderRadius: 11, padding: 11 }}>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-[#6B6B6B]">Cagnotte brute</span>
                    <span className="text-[11px] font-semibold text-[#1A1A1A]">{ca(totalPot)} FCFA</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-[#6B6B6B]">Frais de gestion 3%</span>
                    <span className="text-[11px] font-semibold text-[#A39887]">-{ca(fraisGestion)} FCFA</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-[#6B6B6B]">Assurance groupe 1%</span>
                    <span className="text-[11px] font-semibold text-[#A39887]">-{ca(assurance)} FCFA</span>
                  </div>
                  <div style={{ height: '0.5px', background: '#EDECEA', margin: '2px 0' }} />
                  <div className="flex justify-between items-center">
                    <span className="text-[12px] font-bold text-[#1A1A1A]">Versement net</span>
                    <span className="text-[14px] font-extrabold" style={{ color: '#047857' }}>{ca(netCagnotte)} FCFA</span>
                  </div>
                </div>

                {/* Caution bloc */}
                <div className="flex items-start gap-2 mb-2" style={{ background: '#F5F4F0', borderRadius: 10, padding: '10px 12px' }}>
                  <Lock size={12} style={{ color: '#6B6B6B', flexShrink: 0, marginTop: 1 }} />
                  <p className="text-[11px] font-medium text-[#6B6B6B]">
                    Caution · {ca(memberInfo?.initial_deposit ?? 0)} FCFA bloqués — restitués intégralement à la fin du cycle.
                  </p>
                </div>

                {/* Avance bloc — show only if retention > 0 */}
                {retention > 0 && (
                  <div className="flex items-start gap-2" style={{ background: '#F0FDF4', borderRadius: 10, border: '0.5px solid #D1FAE5', padding: '10px 12px' }}>
                    <Shield size={12} style={{ color: '#047857', flexShrink: 0, marginTop: 1 }} />
                    <p className="text-[11px] font-medium text-[#065F46]">
                      Bonne nouvelle — une partie de votre cagnotte est déjà mise de côté pour votre prochaine cotisation. Vous n'avez rien à débourser immédiatement.
                    </p>
                  </div>
                )}
              </div>

              {/* Bloc Cotisation */}
              <div style={{ background: '#FFFFFF', borderRadius: 16, border: '0.5px solid #EDECEA', padding: 14 }}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-[#A39887] mb-1">Cotisation</p>
                    <p className="text-[12px] font-bold text-[#1A1A1A]">Cotisation {freqLabel.toLowerCase()}</p>
                    {activeCycle?.payment_due_date && (
                      <p className="text-[9px] text-[#A39887]">Avant le {sd(activeCycle.payment_due_date)}</p>
                    )}
                  </div>
                  <span className="text-[14px] font-extrabold text-[#1A1A1A]">{ca(group.contribution_amount)} FCFA</span>
                </div>

                {myPaymentDone ? (
                  <div
                    className="w-full flex items-center justify-center gap-2 text-[13px] font-bold"
                    style={{ height: 44, borderRadius: 13, background: '#F0FDF4', color: '#047857' }}
                  >
                    <Check size={15} strokeWidth={2.5} />
                    Cotisation payée
                  </div>
                ) : (
                  <button
                    onClick={handlePayContribution}
                    className="w-full text-white text-[13px] font-bold active:scale-95 transition-transform"
                    style={{ height: 44, borderRadius: 13, background: '#047857' }}
                  >
                    Cotiser maintenant
                  </button>
                )}
              </div>
            </>
          )}

          {/* ─── COMPLÉTÉ ─── */}
          {isCompleted && (
            <div
              className="flex flex-col items-center justify-center py-10 text-center"
              style={{ background: '#FFFFFF', borderRadius: 16, border: '0.5px solid #EDECEA', padding: 20 }}
            >
              <Check size={28} style={{ color: '#047857' }} strokeWidth={2} className="mb-3" />
              <p className="text-[15px] font-bold text-[#1A1A1A] mb-1">Cercle complété</p>
              <p className="text-[12px] text-[#A39887]">Tous les cycles ont été effectués avec succès.</p>
            </div>
          )}
        </div>
      )}


      {/* ══════════════════ ONGLET POSITIONS ════════════════════════════════ */}
      {activeTab === 'positions' && (
        <div className="px-4 pt-4 flex flex-col gap-3">

          {!drawDone ? (
            /* Before draw */
            <>
              <div className="flex flex-col items-center pt-6 pb-2 text-center">
                <div
                  className="flex items-center justify-center mb-3"
                  style={{ width: 44, height: 44, borderRadius: 13, background: '#F0FDF4' }}
                >
                  <ArrowUpDown size={18} style={{ color: '#047857' }} strokeWidth={2} />
                </div>
                <p className="text-[13px] font-bold text-[#1A1A1A] mb-1">Tirage en attente</p>
                <p className="text-[11px] text-[#A39887]">Les positions seront attribuées une fois le groupe complet.</p>
              </div>

              <div style={{ background: '#FFFFFF', borderRadius: 16, border: '0.5px solid #EDECEA', padding: 14 }}>
                <p className="text-[8px] font-bold uppercase tracking-widest text-[#A39887] mb-3">Membres ({count})</p>
                {membersList.map((m: any) => (
                  <div key={m.id} className="flex items-center gap-3 py-2" style={{ borderBottom: '0.5px solid #F5F4F0' }}>
                    <div
                      className="shrink-0 flex items-center justify-center text-white text-[11px] font-extrabold"
                      style={{ width: 30, height: 30, borderRadius: 9, background: '#047857' }}
                    >
                      {initials(m.name)}
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] font-bold text-[#1A1A1A]">{m.user_id === user.uid ? 'Vous' : m.name}</p>
                      <p className="text-[9px] text-[#A39887]">Position à attribuer</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* After draw */
            <>
              <div style={{ background: '#FFFFFF', borderRadius: 16, border: '0.5px solid #EDECEA', padding: 14 }}>
                <p className="text-[8px] font-bold uppercase tracking-widest text-[#A39887] mb-3">
                  Cycle {group.current_cycle ?? 1} · {count} membres
                </p>

                {sortedByPos.map((m: any) => {
                  const isMe = m.user_id === user.uid;
                  const memberCyclePayment = cyclePayments.find((p: any) => p.member_id === m.id);
                  const paid = memberCyclePayment?.status === 'SUCCESS';
                  const late = m.cycles_defaulted > 0 || m.status === 'RESTRICTED';
                  const statusLabel = paid ? 'Payé' : late ? 'En retard' : 'En attente';
                  const statusColor = paid ? '#047857' : late ? '#92400E' : '#A39887';

                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 py-2"
                      style={{
                        borderBottom: '0.5px solid #F5F4F0',
                        borderLeft: late ? '2px solid #92400E' : 'none',
                        paddingLeft: late ? 8 : 0,
                        background: isMe ? '#F5F4F0' : 'transparent',
                        borderRadius: isMe ? 8 : 0,
                        padding: isMe ? 6 : undefined,
                      }}
                    >
                      <div
                        className="shrink-0 flex items-center justify-center text-white text-[11px] font-extrabold"
                        style={{ width: 34, height: 34, borderRadius: 10, background: '#047857' }}
                      >
                        {initials(m.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-[#1A1A1A] truncate">
                          {isMe ? 'Vous' : m.name}
                        </p>
                        <p className="text-[10px] text-[#A39887]">#{m.draw_position}</p>
                      </div>
                      <span className="text-[10px] font-semibold" style={{ color: statusColor }}>{statusLabel}</span>
                    </div>
                  );
                })}
              </div>

              {/* Bloc échange */}
              {isActive && memberInfo?.draw_position && (
                <div style={{ background: '#FFFFFF', borderRadius: 16, border: '0.5px solid #EDECEA', padding: 14 }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="shrink-0 flex items-center justify-center"
                      style={{ width: 36, height: 36, borderRadius: 10, background: '#F0FDF4' }}
                    >
                      <ArrowUpDown size={16} style={{ color: '#047857' }} strokeWidth={2} />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-[#1A1A1A]">Changer de position</p>
                      <p className="text-[11px] text-[#A39887]">Échangez votre position avec un autre membre.</p>
                    </div>
                  </div>

                  <div className="mb-3" style={{ background: '#F5F4F0', borderRadius: 10, padding: '8px 12px' }}>
                    <p className="text-[11px] font-medium text-[#6B6B6B]">
                      Position actuelle : #{memberInfo.draw_position} · Bonus max 25% de la cagnotte · Délai de traitement 72h.
                    </p>
                  </div>

                  <button
                    className="w-full text-[13px] font-bold active:scale-95 transition-transform"
                    style={{
                      height: 44, borderRadius: 13,
                      background: '#FFFFFF', border: '1.5px solid #047857', color: '#047857',
                    }}
                  >
                    Demander un échange de position
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════════════ ONGLET CYCLES ════════════════════════════════════ */}
      {activeTab === 'cycles' && (
        <div className="px-4 pt-4 pb-4">
          <div style={{ padding: 8 }}>
            {cycleItems.map(({ num, fetched, bMember, isMe, isMeByPos }) => {
              const isPast    = fetched?.status === 'COMPLETED';
              const isCurrent = fetched?.status === 'ACTIVE';
              const hasCycle  = !!fetched;
              const netAmount = Math.round(totalPot * 0.96);

              return (
                <div key={num} className="flex gap-3" style={{ paddingBottom: 14 }}>
                  {/* Left: dot + connector */}
                  <div className="flex flex-col items-center" style={{ width: 20, flexShrink: 0 }}>
                    <div
                      className="relative flex items-center justify-center"
                      style={{ width: 9, height: 9, marginTop: 6 }}
                    >
                      {isCurrent && (
                        <div
                          className="absolute"
                          style={{
                            width: 16, height: 16, borderRadius: '50%',
                            background: 'rgba(4,120,87,0.18)',
                            top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                          }}
                        />
                      )}
                      <div style={{
                        width: 9, height: 9, borderRadius: '50%',
                        background: (isPast || isCurrent) ? '#047857' : '#E8E6E3',
                        border: (!isPast && !isCurrent) ? '1.5px solid #D1D0CD' : 'none',
                        flexShrink: 0,
                      }} />
                    </div>
                    {num < (group.total_cycles ?? 0) && (
                      <div style={{ width: 1, flex: 1, background: '#EDECEA', minHeight: 20, marginTop: 3 }} />
                    )}
                  </div>

                  {/* Right: content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[8px] font-bold uppercase tracking-widest text-[#A39887] mb-1.5">
                      Cycle {num}
                    </p>

                    {isPast && fetched && (
                      <div style={{ background: '#FFFFFF', borderRadius: 10, border: '0.5px solid #EDECEA', padding: '10px 12px' }}>
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-bold text-[#1A1A1A]">
                            {bMember?.user_id === user.uid ? 'Vous' : (bMember?.name ?? 'Membre')}
                          </span>
                          <span className="text-[11px] font-bold text-[#047857]">{ca(netAmount)} FCFA</span>
                        </div>
                        <p className="text-[9px] text-[#A39887] mt-0.5">{sd(fetched.payout_date)}</p>
                      </div>
                    )}

                    {isCurrent && fetched && (
                      <div style={{ background: '#F0FDF4', borderRadius: 10, border: '0.5px solid #D1FAE5', padding: '10px 12px' }}>
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                            style={{ background: '#D1FAE5', color: '#065F46' }}
                          >
                            En cours
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-bold text-[#1A1A1A]">
                            {bMember?.user_id === user.uid ? 'Vous' : (bMember?.name ?? 'Membre')}
                          </span>
                          <span className="text-[11px] font-bold text-[#047857]">{ca(netAmount)} FCFA</span>
                        </div>
                        <p className="text-[9px] text-[#A39887] mt-0.5">{sd(fetched.payout_date)}</p>
                      </div>
                    )}

                    {!hasCycle && (
                      <div style={{ background: '#FFFFFF', borderRadius: 10, border: '0.5px solid #EDECEA', padding: '10px 12px', opacity: 0.55 }}>
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-bold" style={{ color: isMeByPos ? '#047857' : '#1A1A1A' }}>
                            {isMeByPos ? 'Vous' : drawDone ? (sortedByPos.find((m: any) => m.draw_position === num)?.name ?? 'À déterminer') : 'À déterminer'}
                          </span>
                          <span className="text-[11px] text-[#A39887]">{ca(netAmount)} FCFA</span>
                        </div>
                        <p className="text-[9px] text-[#A39887] mt-0.5">Date estimée</p>
                      </div>
                    )}

                    {hasCycle && fetched.status === 'PENDING' && (
                      <div style={{ background: '#FFFFFF', borderRadius: 10, border: '0.5px solid #EDECEA', padding: '10px 12px', opacity: 0.55 }}>
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-bold" style={{ color: bMember?.user_id === user.uid ? '#047857' : '#1A1A1A' }}>
                            {bMember?.user_id === user.uid ? 'Vous' : (bMember?.name ?? 'À déterminer')}
                          </span>
                          <span className="text-[11px] text-[#A39887]">{ca(netAmount)} FCFA</span>
                        </div>
                        <p className="text-[9px] text-[#A39887] mt-0.5">{sd(fetched.payment_due_date)}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── FAB CHAT ────────────────────────────────────────────────────── */}
      <button
        onClick={() => setChatOpen(true)}
        className="flex items-center justify-center active:scale-90 transition-transform"
        style={{
          position: 'fixed', bottom: 88, right: 14, zIndex: 40,
          width: 42, height: 42, borderRadius: 13, background: '#047857',
        }}
      >
        <MessageCircle size={18} strokeWidth={2} style={{ color: '#FFFFFF' }} />
      </button>

      {/* ── CHAT MODAL ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {chatOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setChatOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 z-50 flex flex-col"
              style={{ height: '70vh', background: '#FFFFFF', borderRadius: '20px 20px 0 0' }}
            >
              {/* Chat header */}
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '0.5px solid #EDECEA' }}>
                <p className="text-[14px] font-bold text-[#1A1A1A]">{group.name}</p>
                <button
                  onClick={() => setChatOpen(false)}
                  className="flex items-center justify-center"
                  style={{ width: 28, height: 28, borderRadius: 8, background: '#F5F4F0' }}
                >
                  <X size={14} style={{ color: '#6B6B6B' }} />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
                {messages.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-[12px] text-[#A39887]">Aucun message pour l'instant.</p>
                  </div>
                ) : (
                  messages.map((msg: any) => {
                    const isOwn = msg.user_id === user.uid;
                    const sender = membersList.find((m: any) => m.user_id === msg.user_id);
                    const ts = msg.created_at?.toDate ? msg.created_at.toDate() : new Date();
                    return (
                      <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                        {!isOwn && (
                          <p className="text-[9px] text-[#A39887] mb-0.5 px-1">
                            {sender?.name ?? 'Membre'}
                          </p>
                        )}
                        <div
                          className="max-w-[75%] px-3 py-2"
                          style={{
                            borderRadius: isOwn ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                            background: isOwn ? '#047857' : '#F5F4F0',
                          }}
                        >
                          <p className="text-[13px]" style={{ color: isOwn ? '#FFFFFF' : '#1A1A1A' }}>
                            {msg.text}
                          </p>
                        </div>
                        <p className="text-[9px] text-[#A39887] mt-0.5 px-1">
                          {ts.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="flex items-center gap-2 px-4 py-3" style={{ borderTop: '0.5px solid #EDECEA' }}>
                <input
                  value={chatInput}
                  onChange={(e: any) => setChatInput(e.target.value)}
                  onKeyDown={(e: any) => { if (e.key === 'Enter') handleSendMessage(); }}
                  placeholder="Écrire un message…"
                  className="flex-1 bg-[#F5F4F0] rounded-[12px] px-3 py-2 text-[13px] text-[#1A1A1A] placeholder-[#C4B8AC] outline-none"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim()}
                  className="flex items-center justify-center transition-transform active:scale-90"
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: chatInput.trim() ? '#047857' : '#E8E6E3',
                  }}
                >
                  <Send size={14} style={{ color: chatInput.trim() ? '#FFFFFF' : '#A39887' }} />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
