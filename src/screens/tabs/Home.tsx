import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  QrCode, Users, ArrowLeftRight, ArrowDownToLine, ArrowUpFromLine,
  TrendingUp, ArrowDownLeft, ArrowUpRight, Inbox, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatXOF } from '../../lib/utils';
import { auth } from '../../lib/firebase';
import { getUserProfile, UserProfile } from '../../services/userService';
import {
  subscribeToUserWallet,
  subscribeToUserCerclesWallet,
  subscribeToUserCapitalWallet,
  getUserGroups,
  getUpcomingCycleInfo
} from '../../services/tontineService';
import { subscribeToCollection } from '../../lib/firestore';
import { where, orderBy, limit } from 'firebase/firestore';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bon matin';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

function cleanAmount(val: number | null): string {
  if (val === null) return '…';
  return formatXOF(val).replace(/\s?FCFA/gi, '').trim();
}

function isCredit(type: string) {
  return ['DEPOSIT', 'PAYOUT', 'REFUND'].includes(type);
}

function txDateKey(ts: any): string {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toISOString().slice(0, 10);
}

function txDateLabel(ts: any): string {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const yest = new Date(now);
  yest.setDate(yest.getDate() - 1);
  const yesterdayStr = yest.toISOString().slice(0, 10);
  const dStr = d.toISOString().slice(0, 10);
  if (dStr === todayStr) return "AUJOURD'HUI";
  if (dStr === yesterdayStr) return 'HIER';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).toUpperCase();
}

function txTimeMeta(ts: any): string {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
}

function tierColors(tier: string) {
  switch (tier) {
    case 'PLATINUM': return { bg: '#ECFDF5', text: '#047857' };
    case 'GOLD':     return { bg: '#FFFBEB', text: '#B45309' };
    case 'SILVER':   return { bg: '#F3F4F6', text: '#4B5563' };
    default:         return { bg: '#FEF3C7', text: '#92400E' };
  }
}

// ─── Actions config ───────────────────────────────────────────────────────────

const ACTION_SETS = [
  [
    { key: 'transfer', label: 'Transférer', Icon: ArrowLeftRight, bg: '#ECFDF5', color: '#047857' },
    { key: 'receive',  label: 'Recevoir',   Icon: QrCode,          bg: '#F5F4F0', color: '#6B6B6B' },
    { key: 'topup',    label: 'Recharger',  Icon: ArrowDownToLine, bg: '#F5F4F0', color: '#6B6B6B' },
    { key: 'withdraw', label: 'Retirer',    Icon: ArrowUpFromLine, bg: '#F5F4F0', color: '#6B6B6B' },
  ],
  [
    { key: 'transfer', label: 'Transférer',  Icon: ArrowLeftRight, bg: '#ECFDF5', color: '#047857' },
    { key: 'receive',  label: 'Recevoir',    Icon: QrCode,          bg: '#F5F4F0', color: '#6B6B6B' },
    { key: 'cotiser',  label: 'Cotiser',     Icon: Users,           bg: '#ECFDF5', color: '#047857' },
    { key: 'circles',  label: 'Mes cercles', Icon: Users,           bg: '#F5F4F0', color: '#6B6B6B' },
  ],
  [
    { key: 'transfer', label: 'Transférer', Icon: ArrowLeftRight, bg: '#ECFDF5', color: '#047857' },
    { key: 'receive',  label: 'Recevoir',   Icon: QrCode,          bg: '#F5F4F0', color: '#6B6B6B' },
    { key: 'explore',  label: 'Explorer',   Icon: TrendingUp,      bg: '#F5F4F0', color: '#6B6B6B' },
  ],
];

// ─── Component ────────────────────────────────────────────────────────────────

export function Home() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceCercles, setBalanceCercles] = useState<number | null>(null);
  const [balanceCapital, setBalanceCapital] = useState<number | null>(null);
  const [cycleInfo, setCycleInfo] = useState<{
    groupName: string;
    type: 'À payer' | 'À recevoir';
    amount: number;
    dueDate: Date;
  } | null>(null);
  const [hasGroups, setHasGroups] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activeCard, setActiveCard] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) { navigate('/welcome'); return; }

    getUserProfile(user.uid).then(setProfile);

    const unsubWallet   = subscribeToUserWallet(user.uid, w => { if (w) setBalance(w.balance); });
    const unsubCercles  = subscribeToUserCerclesWallet(user.uid, w => { if (w) setBalanceCercles(w.balance); });
    const unsubCapital  = subscribeToUserCapitalWallet(user.uid, w => { if (w) setBalanceCapital(w.balance); });

    getUserGroups(user.uid).then(async groups => {
      const active = groups.filter(g =>
        g.status === 'ACTIVE' || g.status === 'FORMING' || g.status === 'WAITING_VOTE'
      );
      setHasGroups(active.length > 0);
      const info = await getUpcomingCycleInfo(user.uid, active);
      setCycleInfo(info);
    });

    const unsubTx = subscribeToCollection(
      'transactions',
      [where('user_id', '==', user.uid), orderBy('created_at', 'desc'), limit(5)],
      setTransactions
    );

    return () => { unsubWallet(); unsubCercles(); unsubCapital(); unsubTx(); };
  }, [navigate]);

  // ── Scroll handler ──────────────────────────────────────────────────────────
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const card = el.firstChild as HTMLElement;
    const cardW = card ? card.offsetWidth + 16 : 316;
    const idx = Math.round(el.scrollLeft / cardW);
    if (idx !== activeCard && idx >= 0 && idx <= 2) setActiveCard(idx);
  };

  const scrollToCard = (idx: number) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ left: idx * (300 + 16), behavior: 'smooth' });
    setActiveCard(idx);
  };

  // ── Derived ─────────────────────────────────────────────────────────────────
  const firstName = profile?.full_name?.split(' ')[0] ?? '';
  const initial   = firstName ? firstName.charAt(0).toUpperCase() : 'U';
  const greeting  = getGreeting();
  const today     = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  const tc        = tierColors(profile?.tier ?? 'BRONZE');

  const b   = balance ?? 0;
  const bc  = balanceCercles ?? 0;
  const bcp = balanceCapital ?? 0;
  const total = b + bc + bcp;
  const pct = (v: number) => total > 0 ? Math.round((v / total) * 100) : 0;

  // ── Group transactions by date ──────────────────────────────────────────────
  type TxGroup = { label: string; items: any[] };
  const txGroups: TxGroup[] = [];
  for (const tx of transactions) {
    const label = txDateLabel(tx.created_at);
    const last = txGroups[txGroups.length - 1];
    if (last && last.label === label) {
      last.items.push(tx);
    } else {
      txGroups.push({ label, items: [tx] });
    }
  }

  // ── Skeleton ────────────────────────────────────────────────────────────────
  if (balance === null && !profile) {
    return (
      <div className="bg-[#FAFAF8] min-h-screen flex flex-col pb-20 font-sans px-6 pt-[52px]">
        <div className="h-3.5 w-20 bg-[#E8E6E3] rounded-full animate-pulse mb-2" />
        <div className="h-7 w-44 bg-[#E8E6E3] rounded-full animate-pulse mb-3" />
        <div className="flex gap-2 mb-8">
          <div className="h-3 w-10 bg-[#E8E6E3] rounded-full animate-pulse" />
          <div className="h-3 w-14 bg-[#E8E6E3] rounded-full animate-pulse" />
          <div className="h-3 w-12 bg-[#E8E6E3] rounded-full animate-pulse" />
        </div>
        <div className="h-[160px] w-full bg-[#E8E6E3] rounded-[20px] animate-pulse mb-6" />
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[0,1,2,3].map(i => <div key={i} className="h-20 bg-[#E8E6E3] rounded-[15px] animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="bg-[#FAFAF8] min-h-screen flex flex-col pb-20 font-sans selection:bg-[#047857]/20"
    >

      {/* ── 1. HEADER ─────────────────────────────────────────────────────── */}
      <div className="pt-[52px] px-6 pb-5 flex justify-between items-start">
        <div>
          <p className="text-[13px] font-medium text-[#A39887] mb-1">{greeting}</p>
          <h1
            className="text-[24px] font-extrabold text-[#1A1A1A] leading-tight mb-2"
            style={{ letterSpacing: '-0.02em' }}
          >
            {firstName}
          </h1>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[12px] font-medium text-[#A39887]">{today}</span>
            <span className="text-[#D1D0CD]">·</span>
            <span className="text-[12px] font-bold text-[#047857]">{profile?.score_afiya ?? 0} pts</span>
            <span className="text-[#D1D0CD]">·</span>
            <span
              className="text-[11px] font-bold px-1.5 py-0.5 rounded-md"
              style={{ background: tc.bg, color: tc.text }}
            >
              {profile?.tier ?? 'BRONZE'}
            </span>
          </div>
        </div>
        <button
          onClick={() => navigate('/profile')}
          className="shrink-0 flex items-center justify-center font-extrabold text-white text-[17px] transition-transform active:scale-95"
          style={{
            width: 42, height: 42,
            borderRadius: 13,
            background: '#047857',
            boxShadow: '0 4px 12px rgba(4,120,87,0.2)',
          }}
        >
          {initial}
        </button>
      </div>

      {/* ── 2. CARDS SWIPEABLES ───────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="pl-6 overflow-x-auto flex gap-4 pb-1 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as never}
      >
        {/* Card 1 — Principal */}
        <div
          className="shrink-0 snap-center flex flex-col justify-between"
          style={{
            minWidth: '85vw', maxWidth: 320, height: 160,
            background: '#FFFFFF', borderRadius: 20,
            border: '0.5px solid #EDECEA', padding: 18,
          }}
        >
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#A39887] mb-2">Compte Principal</p>
            <div className="flex items-baseline gap-1">
              <span className="text-[30px] font-extrabold text-[#1A1A1A] leading-none">{cleanAmount(balance)}</span>
              <span className="text-[12px] font-bold text-[#A39887]">FCFA</span>
            </div>
            <p className="text-[11px] text-[#A39887] mt-0.5">Fonds disponibles</p>
          </div>
          <div style={{ background: '#F5F4F0', borderRadius: 10, padding: 10 }}>
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#C4B8AC] mb-1">À venir</p>
            <p className="text-[12px] font-semibold text-[#1A1A1A]">Aucun mouvement prévu</p>
          </div>
        </div>

        {/* Card 2 — Cercles */}
        <div
          className="shrink-0 snap-center flex flex-col justify-between"
          style={{
            minWidth: '85vw', maxWidth: 320, height: 160,
            background: '#FFFFFF', borderRadius: 20,
            border: '0.5px solid #EDECEA', padding: 18,
          }}
        >
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#A39887] mb-2">Compte Cercles</p>
            <div className="flex items-baseline gap-1">
              <span className="text-[30px] font-extrabold text-[#1A1A1A] leading-none">{cleanAmount(balanceCercles)}</span>
              <span className="text-[12px] font-bold text-[#A39887]">FCFA</span>
            </div>
            <p className="text-[11px] text-[#A39887] mt-0.5">Fonds des cercles</p>
          </div>
          <div style={{ background: '#F5F4F0', borderRadius: 10, padding: 10 }}>
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#C4B8AC] mb-1">
              À venir{cycleInfo ? ` · ${cycleInfo.groupName}` : ''}
            </p>
            {cycleInfo ? (
              <div className="flex items-baseline gap-1">
                <span className={`text-[14px] font-extrabold ${cycleInfo.type === 'À recevoir' ? 'text-[#047857]' : 'text-[#1A1A1A]'}`}>
                  {cycleInfo.type === 'À recevoir' ? '+' : '-'}{cleanAmount(cycleInfo.amount)}
                </span>
                <span className={`text-[11px] font-bold ${cycleInfo.type === 'À recevoir' ? 'text-[#047857]' : 'text-[#1A1A1A]'}`}>FCFA</span>
              </div>
            ) : (
              <p className="text-[12px] font-semibold text-[#1A1A1A]">Aucun mouvement prévu</p>
            )}
          </div>
        </div>

        {/* Card 3 — Capital */}
        <div
          className="shrink-0 snap-center flex flex-col justify-between mr-6"
          style={{
            minWidth: '85vw', maxWidth: 320, height: 160,
            background: '#FFFFFF', borderRadius: 20,
            border: '0.5px solid #EDECEA', padding: 18,
          }}
        >
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#A39887] mb-2">Afiya Capital</p>
            <div className="flex items-baseline gap-1">
              <span className="text-[30px] font-extrabold text-[#1A1A1A] leading-none">{cleanAmount(balanceCapital)}</span>
              <span className="text-[12px] font-bold text-[#A39887]">FCFA</span>
            </div>
            <p className="text-[11px] text-[#A39887] mt-0.5">Compte capital</p>
          </div>
          <div style={{ background: '#F5F4F0', borderRadius: 10, padding: 10 }}>
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#C4B8AC] mb-1">À venir</p>
            <p className="text-[12px] font-semibold text-[#C4B8AC]">Bientôt disponible</p>
          </div>
        </div>
      </div>

      {/* Pagination dots */}
      <div className="flex justify-center items-center gap-1.5 mt-4 mb-5">
        {[0, 1, 2].map(i => (
          <button
            key={i}
            onClick={() => scrollToCard(i)}
            style={{
              width: activeCard === i ? 18 : 5,
              height: 5,
              borderRadius: 999,
              background: activeCard === i ? '#047857' : '#D1D0CD',
              transition: 'all 0.25s ease',
              border: 'none',
              padding: 0,
            }}
          />
        ))}
      </div>

      {/* ── 3. ACTIONS RAPIDES ────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeCard}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="mx-6 mb-6 flex gap-3 justify-between"
        >
          {ACTION_SETS[activeCard].map(({ key, label, Icon, bg, color }) => (
            <button
              key={key}
              className="flex flex-col items-center gap-2 transition-transform active:scale-95"
              style={{ flex: 1 }}
            >
              <div
                className="flex items-center justify-center"
                style={{ width: 50, height: 50, borderRadius: 15, background: bg }}
              >
                <Icon size={20} strokeWidth={2} style={{ color }} />
              </div>
              <span className="text-[11px] font-bold text-[#1A1A1A] text-center leading-tight">{label}</span>
            </button>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* ── 4. RÉPARTITION ───────────────────────────────────────────────── */}
      <div
        className="mx-6 mb-6"
        style={{ background: '#FFFFFF', borderRadius: 20, border: '0.5px solid #EDECEA', padding: 14 }}
      >
        <div className="flex justify-between items-center mb-3">
          <span className="text-[8px] font-bold uppercase tracking-widest text-[#A39887]">Répartition</span>
          <span className="text-[14px] font-extrabold text-[#1A1A1A]">
            {cleanAmount(total)} <span className="text-[11px] font-bold text-[#A39887]">FCFA</span>
          </span>
        </div>

        {/* Proportional bar */}
        <div className="flex h-1 rounded-full overflow-hidden mb-3" style={{ gap: 1 }}>
          <div style={{ flex: b, background: '#047857', minWidth: b > 0 ? 4 : 0 }} />
          <div style={{ flex: bc, background: '#34D399', minWidth: bc > 0 ? 4 : 0 }} />
          <div style={{ flex: bcp > 0 ? bcp : total > 0 ? 0 : 1, background: '#E8E6E3', minWidth: total === 0 ? '100%' : bcp > 0 ? 4 : 0 }} />
        </div>

        <div className="flex flex-col gap-2">
          {[
            { dot: '#047857', name: 'Principal', val: b   },
            { dot: '#34D399', name: 'Cercles',   val: bc  },
            { dot: '#E8E6E3', name: 'Capital',   val: bcp },
          ].map(({ dot, name, val }) => (
            <div key={name} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />
              <span className="text-[12px] font-medium text-[#1A1A1A] flex-1">{name}</span>
              <span
                className="text-[12px] font-semibold mr-2"
                style={{ color: val === 0 ? '#C4B8AC' : '#1A1A1A' }}
              >
                {cleanAmount(val)} FCFA
              </span>
              <span className="text-[11px] font-medium" style={{ color: val === 0 ? '#C4B8AC' : '#A39887' }}>
                {pct(val)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 5. TRANSACTIONS RÉCENTES ──────────────────────────────────────── */}
      <div className="mx-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[16px] font-bold text-[#1A1A1A]">Transactions récentes</h2>
          {transactions.length > 0 && (
            <button className="text-[13px] font-bold text-[#047857] active:opacity-70 transition-opacity">
              Voir tout
            </button>
          )}
        </div>

        {transactions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-8"
            style={{ background: '#FFFFFF', borderRadius: 20, border: '0.5px solid #EDECEA' }}
          >
            <div
              className="flex items-center justify-center mb-3"
              style={{ width: 40, height: 40, borderRadius: 12, background: '#F5F4F0' }}
            >
              <Inbox size={18} strokeWidth={1.5} className="text-[#C4B8AC]" />
            </div>
            <p className="text-[14px] font-bold text-[#1A1A1A] mb-1">Aucune transaction</p>
            <p className="text-[12px] text-[#A39887]">Vos mouvements apparaîtront ici.</p>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-4">
            {txGroups.map(({ label, items }) => (
              <div key={label}>
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#A39887] mb-2 px-1">{label}</p>
                <div className="flex flex-col gap-2">
                  {items.map((tx, idx) => {
                    const credit = isCredit(tx.type);
                    return (
                      <motion.div
                        key={tx.id ?? idx}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className="flex items-center gap-3 cursor-pointer active:scale-[0.99] transition-transform"
                        style={{ background: '#FFFFFF', borderRadius: 16, border: '0.5px solid #EDECEA', padding: '10px 12px' }}
                      >
                        <div
                          className="shrink-0 flex items-center justify-center"
                          style={{ width: 40, height: 40, borderRadius: 12, background: credit ? '#D1FAE5' : '#F5F4F0' }}
                        >
                          {credit
                            ? <ArrowDownLeft size={18} strokeWidth={1.5} style={{ color: '#047857' }} />
                            : <ArrowUpRight  size={18} strokeWidth={1.5} style={{ color: '#6B6B6B' }} />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-[#1A1A1A] truncate">{tx.description || tx.type}</p>
                          <p className="text-[12px] font-medium text-[#A39887]">{txTimeMeta(tx.created_at)}</p>
                        </div>
                        <div className="flex items-baseline gap-0.5 shrink-0">
                          <span
                            className="text-[14px] font-bold"
                            style={{ color: credit ? '#047857' : '#1A1A1A' }}
                          >
                            {credit ? '+' : '-'}{cleanAmount(tx.amount)}
                          </span>
                          <span className="text-[11px] font-medium text-[#A39887]"> FCFA</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 6. POUR VOUS ──────────────────────────────────────────────────── */}
      <div className="mx-6 mb-6">
        <h2 className="text-[16px] font-bold text-[#1A1A1A] mb-3">Pour vous</h2>
        {!hasGroups ? (
          <button
            onClick={() => navigate('/tontines')}
            className="w-full flex items-center gap-3 active:scale-[0.99] transition-transform"
            style={{ background: '#FFFFFF', borderRadius: 20, border: '0.5px solid #EDECEA', padding: 14 }}
          >
            <div
              className="shrink-0 flex items-center justify-center"
              style={{ width: 44, height: 44, borderRadius: 13, background: '#ECFDF5' }}
            >
              <Users size={20} strokeWidth={1.5} style={{ color: '#047857' }} />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-[14px] font-bold text-[#1A1A1A] mb-0.5">Créez ou rejoignez votre premier cercle</p>
              <p className="text-[12px] font-medium text-[#A39887]">Épargnez ensemble, en confiance.</p>
            </div>
            <ChevronRight size={16} style={{ color: '#C4B8AC' }} className="shrink-0" />
          </button>
        ) : (
          <div
            style={{ background: '#FFFFFF', borderRadius: 20, border: '0.5px solid #EDECEA', padding: 14 }}
          >
            <p className="text-[13px] font-medium text-[#A39887] text-center py-2">Bientôt, des suggestions pour vous.</p>
          </div>
        )}
      </div>

    </motion.div>
  );
}
