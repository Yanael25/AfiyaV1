import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Eye, EyeOff,
  ArrowDownLeft, ArrowUpRight, ArrowRight,
  CircleDot, Building2, Landmark,
  ChevronRight
} from 'lucide-react';
import { formatXOF } from '../../lib/utils';
import { auth } from '../../lib/firebase';
import { getUserProfile, UserProfile } from '../../services/userService';
import {
  subscribeToUserWallet,
  subscribeToUserCerclesWallet,
  subscribeToUserCapitalWallet,
  subscribeToUserCaution,
  getUserGroups,
  getUpcomingCycleInfo
} from '../../services/tontineService';
import { subscribeToCollection } from '../../lib/firestore';
import { where, orderBy, limit } from 'firebase/firestore';

export function Home() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceCercles, setBalanceCercles] = useState<number | null>(null);
  const [balanceCapital, setBalanceCapital] = useState<number | null>(null);
  const [cautionBloquee, setCautionBloquee] = useState<number>(0);
  const [groups, setGroups] = useState<any[]>([]);
  const [cycleInfo, setCycleInfo] = useState<{
    groupName: string;
    type: 'À payer' | 'À recevoir';
    amount: number;
    dueDate: Date;
  } | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [activeCard, setActiveCard] = useState(0);
  const [dragDirection, setDragDirection] = useState(1);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) { navigate('/welcome'); return; }

    getUserProfile(user.uid).then(setProfile);

    const unsubWallet = subscribeToUserWallet(user.uid, w => {
      if (w) setBalance(w.balance);
    });

    const unsubCercles = subscribeToUserCerclesWallet(
      user.uid, w => { if (w) setBalanceCercles(w.balance); }
    );

    const unsubCapital = subscribeToUserCapitalWallet(
      user.uid, w => { if (w) setBalanceCapital(w.balance); }
    );

    const unsubCaution = subscribeToUserCaution(
      user.uid, setCautionBloquee
    );

    getUserGroups(user.uid).then(async data => {
      const filtered = data
          .filter(g =>
            g.status === 'ACTIVE' ||
            g.status === 'FORMING' ||
            g.status === 'WAITING_VOTE'
          )
          .slice(0, 5);
      setGroups(filtered);

      const info = await getUpcomingCycleInfo(user.uid, filtered);
      setCycleInfo(info);
    });

    const unsubTx = subscribeToCollection(
      'transactions',
      [
        where('user_id', '==', user.uid),
        orderBy('created_at', 'desc'),
        limit(3)
      ],
      setTransactions
    );

    return () => {
      unsubWallet();
      unsubCercles();
      unsubCapital();
      unsubCaution();
      unsubTx();
    };
  }, [navigate]);

  const goToCard = (index: number) => {
    setDragDirection(index > activeCard ? 1 : -1);
    setActiveCard(index);
  };

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x < -50 && activeCard < 2) {
      setDragDirection(1);
      setActiveCard(prev => prev + 1);
    }
    if (info.offset.x > 50 && activeCard > 0) {
      setDragDirection(-1);
      setActiveCard(prev => prev - 1);
    }
  };

  const firstName =
    profile?.full_name?.split(' ')[0] || '';

  const greeting = (() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return 'Bonjour';
    if (h >= 12 && h < 18) return 'Bon après-midi';
    if (h >= 18 && h < 22) return 'Bonsoir';
    return 'Bonne nuit';
  })();

  const isCredit = (type: string) =>
    ['DEPOSIT','PAYOUT','REFUND'].includes(type);

  const formatDate = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short'
    });
  };

  const cardWidth = typeof window !== 'undefined' ? window.innerWidth * 0.72 : 300;
  const cardGap = 12;

  return (
    <div className="flex-1 bg-[var(--color-bg)] overflow-y-auto pb-28">
      {/* ── BLOC 1 : HEADER ── */}
      <div className="flex justify-between items-center px-5 pt-12 pb-4">
        <div>
          <p className="text-xs font-normal text-[var(--color-text-secondary)]">{greeting},</p>
          <p className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">{firstName}</p>
        </div>
        
        {/* Pill Score & Tier */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate('/profile')}
          className="bg-[var(--color-surface)] rounded-[var(--radius-badge)] px-3 py-1.5 flex items-center gap-2"
        >
          <span className="text-xs font-bold text-[var(--color-text-primary)]">
            {profile?.score_afiya || 50}/100
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-[var(--radius-badge)] ${
            profile?.tier === 'PLATINUM' ? 'bg-[var(--color-text-primary)] text-[var(--color-surface)]' :
            profile?.tier === 'GOLD' ? 'bg-[var(--color-text-secondary)] text-[var(--color-surface)]' :
            profile?.tier === 'SILVER' ? 'bg-[var(--color-border)] text-[var(--color-text-primary)]' :
            'bg-[var(--color-surface-inner)] text-[var(--color-text-primary)]'
          }`}>
            {profile?.tier || 'BRONZE'}
          </span>
          <ChevronRight size={12} className="text-[var(--color-text-muted)]" />
        </motion.button>
      </div>

      {/* ── BLOC 2 : CARDS SWIPEABLES ── */}
      <div className="mt-5 pl-5 overflow-hidden">
        <div className="overflow-visible">
          <motion.div
            className="flex"
            style={{ gap: cardGap }}
            animate={{ x: -activeCard * (cardWidth + cardGap) }}
            transition={{ type: 'spring', stiffness: 300, damping: 35 }}
            drag="x"
            dragConstraints={{
              left: -2 * (cardWidth + cardGap),
              right: 0
            }}
            dragElastic={0.05}
            onDragEnd={(_, info) => {
              if (info.offset.x < -50 && activeCard < 2)
                setActiveCard(prev => prev + 1);
              if (info.offset.x > 50 && activeCard > 0)
                setActiveCard(prev => prev - 1);
            }}
          >
            {/* Card 0 — Solde */}
            <div
              className="shrink-0 bg-[var(--color-primary)] rounded-[var(--radius-card)] p-5 text-white relative overflow-hidden flex flex-col"
              style={{ width: cardWidth, height: 200 }}
            >
              <div className="absolute -bottom-8 -right-8 w-40 h-40 rounded-full bg-white/[0.04] pointer-events-none" />
              <div className="absolute -top-6 -left-6 w-28 h-28 rounded-full bg-white/[0.04] pointer-events-none" />

              <div className="flex justify-between items-center relative z-10">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-primary-light)]">
                  COMPTE PRINCIPAL
                </p>
                <button
                  onPointerDown={e => e.stopPropagation()}
                  onClick={() => setBalanceVisible(v => !v)}
                  className="p-1 touch-none"
                >
                  {balanceVisible
                    ? <EyeOff size={14} className="text-[var(--color-primary-light)]" />
                    : <Eye size={14} className="text-[var(--color-primary-light)]" />
                  }
                </button>
              </div>

              <p className="text-[10px] font-normal text-white/50 mt-3 relative z-10">
                Solde disponible
              </p>

              <div className="relative z-10">
                {balance === null ? (
                  <div className="h-8 w-36 bg-white/20 animate-pulse rounded-[var(--radius-inner)]" />
                ) : balanceVisible ? (
                  <div className="flex items-baseline">
                    <span className="text-3xl font-semibold text-white tracking-tight">
                      {new Intl.NumberFormat('fr-FR').format(balance)}
                    </span>
                    <span className="text-sm font-normal text-white/60 ml-1.5">
                      FCFA
                    </span>
                  </div>
                ) : (
                  <p className="text-2xl font-normal text-white/40 tracking-[0.2em]">
                    ••••••
                  </p>
                )}
              </div>

              <div className="flex justify-between items-center mt-auto relative z-10">
                <p className="text-[10px] text-white/40 font-normal">
                  {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
                <p className="text-[10px] text-white/40 font-normal">
                  1 / 3
                </p>
              </div>
            </div>

            {/* Card 1 — Cercles */}
            <div
              className="shrink-0 bg-[var(--color-primary)] rounded-[var(--radius-card)] p-5 text-white relative overflow-hidden flex flex-col"
              style={{ width: cardWidth, height: 200 }}
            >
              <div className="absolute -bottom-8 -right-8 w-40 h-40 rounded-full bg-white/[0.04] pointer-events-none" />

              <div className="relative z-10">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-primary-light)]">
                  COMPTE CERCLES
                </p>
              </div>

              <p className="text-[10px] font-normal text-white/50 mt-3 relative z-10">
                Solde Cercles
              </p>

              <div className="relative z-10">
                {balanceCercles === null ? (
                  <div className="h-8 w-36 bg-white/20 animate-pulse rounded-[var(--radius-inner)]" />
                ) : (
                  <div className="flex items-baseline">
                    <span className="text-3xl font-semibold text-white tracking-tight">
                      {new Intl.NumberFormat('fr-FR').format(balanceCercles)}
                    </span>
                    <span className="text-sm font-normal text-white/60 ml-1.5">
                      FCFA
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-3 space-y-1 relative z-10">
                <p className="text-[10px] font-normal text-white/50">
                  Caution bloquée · {new Intl.NumberFormat('fr-FR').format(cautionBloquee)} FCFA
                </p>
                {cycleInfo ? (
                  <p className="text-[10px] font-normal text-white/50">
                    {cycleInfo.type} · {new Intl.NumberFormat('fr-FR').format(cycleInfo.amount)} FCFA · {cycleInfo.dueDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                  </p>
                ) : groups.length === 0 ? (
                  <p className="text-[10px] font-normal text-white/40">
                    Aucun Cercle actif
                  </p>
                ) : null}
              </div>

              <div className="flex justify-end mt-auto relative z-10">
                <p className="text-[10px] text-white/40 font-normal">
                  2 / 3
                </p>
              </div>
            </div>

            {/* Card 2 — Capital */}
            <div
              className="shrink-0 bg-[var(--color-primary)] rounded-[var(--radius-card)] p-5 text-white relative overflow-hidden flex flex-col"
              style={{ width: cardWidth, height: 200 }}
            >
              <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full bg-white/[0.04] pointer-events-none" />

              <div className="relative z-10">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-primary-light)]">
                  AFIYA CAPITAL
                </p>
              </div>

              <p className="text-[10px] font-normal text-white/50 mt-3 relative z-10">
                Solde Capital
              </p>

              <div className="relative z-10">
                {balanceCapital === null ? (
                  <div className="h-8 w-36 bg-white/20 animate-pulse rounded-[var(--radius-inner)]" />
                ) : (
                  <div className="flex items-baseline">
                    <span className="text-3xl font-semibold text-white tracking-tight">
                      {new Intl.NumberFormat('fr-FR').format(balanceCapital)}
                    </span>
                    <span className="text-sm font-normal text-white/60 ml-1.5">
                      FCFA
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-3 relative z-10">
                <p className="text-[10px] font-normal text-white/50">
                  Immo · Bourse · Obligations · PME
                </p>
              </div>

              <div className="flex justify-between items-center mt-auto relative z-10">
                <p className="text-[10px] text-white/40 font-normal">
                  Bientôt disponible
                </p>
                <p className="text-[10px] text-white/40 font-normal">
                  3 / 3
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Indicateurs de position */}
        <div className="flex justify-center gap-1.5 mt-4">
          {[0, 1, 2].map(i => (
            <button key={i} onClick={() => setActiveCard(i)}>
              <motion.div
                animate={{
                  width: i === activeCard ? 20 : 6,
                  backgroundColor: i === activeCard ? 'var(--color-primary)' : 'var(--color-text-placeholder)'
                }}
                className="h-1.5 rounded-[var(--radius-badge)]"
              />
            </button>
          ))}
        </div>
      </div>

      {/* ── BLOC 3 : ACTIONS RAPIDES ── */}
      <div className="px-5 mt-5">
        <div className="flex gap-2">
          {[
            { icon: ArrowDownLeft, label: 'Dépôt' },
            { icon: ArrowUpRight,  label: 'Retrait' },
            { icon: ArrowRight,    label: 'Envoyer' },
          ].map(({ icon: Icon, label }) => (
            <motion.button
              key={label}
              whileTap={{ scale: 0.94 }}
              className="flex-1 bg-[var(--color-surface)] rounded-[var(--radius-inner)] py-2.5
                         flex flex-col items-center gap-1.5"
            >
              <div className="w-7 h-7 rounded-[var(--radius-inner)] bg-[var(--color-primary-light)]
                               flex items-center justify-center">
                <Icon size={13} strokeWidth={1.5} className="text-[var(--color-primary)]" />
              </div>
              <span className="text-[11px] font-normal text-[var(--color-text-secondary)]">
                {label}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── BLOC 4 : MES CERCLES ── */}
      <div className="px-5 mt-8">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Mes Cercles
          </h2>
          <button
            onClick={() => navigate('/tontines')}
            className="text-xs font-medium text-[var(--color-primary)]
                        flex items-center gap-0.5"
          >
            Voir tout
            <ChevronRight size={12} />
          </button>
        </div>

        {groups.length === 0 ? (
          <div className="bg-[var(--color-surface)] rounded-[var(--radius-card)]
                           p-5 text-center">
            <CircleDot size={22}
              className="text-[var(--color-text-muted)] mx-auto mb-2" />
            <p className="text-sm font-medium text-[var(--color-text-primary)] mb-3">
              Vous n'avez pas encore de Cercle actif.
            </p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/tontines')}
              className="bg-transparent text-[var(--color-primary)] text-xs font-medium underline underline-offset-2"
            >
              Créer ou rejoindre →
            </motion.button>
          </div>
        ) : (
          <div className="space-y-2">
            {groups.slice(0, 3).map(g => (
              <motion.div
                key={g.id}
                whileTap={{ scale: 0.99 }}
                onClick={() => navigate(`/group/${g.id}`)}
                className="bg-[var(--color-surface)] rounded-[var(--radius-inner)]
                            px-4 py-3.5
                            flex justify-between
                            items-center cursor-pointer"
              >
                <div>
                  <p className="text-sm font-medium
                                 text-[var(--color-text-primary)]">
                    {g.name}
                  </p>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)] mt-0.5">
                    {formatXOF(g.contribution_amount)} <span className="text-xs font-normal text-[var(--color-text-secondary)]">/ cycle</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold uppercase tracking-[0.15em]
                                     px-2 py-0.5 rounded-[var(--radius-badge)]
                    ${g.status === 'ACTIVE'
                      ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                      : g.status === 'FORMING'
                      ? 'bg-[var(--color-surface-inner)] text-[var(--color-text-primary)]'
                      : 'bg-[var(--color-surface-inner)] text-[var(--color-text-primary)]'
                    }`}>
                    {g.status === 'ACTIVE' ? 'Actif'
                      : g.status === 'FORMING' ? 'Formation'
                      : 'Vote'}
                  </span>
                  <ChevronRight size={14}
                    className="text-[var(--color-text-muted)]" />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ── BLOC 5 : ACTIVITÉ RÉCENTE ── */}
      <div className="px-5 mt-8">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Activité récente
          </h2>
          <button
            onClick={() => {}}
            className="text-xs font-medium text-[var(--color-primary)]
                        flex items-center gap-0.5"
          >
            Voir tout
            <ChevronRight size={12} />
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="bg-[var(--color-surface)] rounded-[var(--radius-card)]
                           p-5
                           text-center">
            <p className="text-sm font-medium text-[var(--color-text-primary)]">
              Aucune transaction pour l'instant.
            </p>
          </div>
        ) : (
          <div className="bg-[var(--color-surface)] rounded-[var(--radius-card)]
                           overflow-hidden">
            {transactions.map((tx, idx) => (
              <div
                key={tx.id || idx}
                className={`flex items-center gap-2
                             px-3 py-3.5
                    ${idx < transactions.length - 1
                      ? 'border-b border-[var(--color-divider)]'
                      : ''
                    }`}
              >
                <div className={`w-8 h-8 rounded-[var(--radius-inner)] shrink-0
                                  flex items-center justify-center
                    ${isCredit(tx.type)
                      ? 'bg-[var(--color-primary-light)]'
                      : 'bg-[var(--color-bg)]'
                    }`}>
                  {isCredit(tx.type)
                    ? <ArrowDownLeft size={13}
                        className="text-[var(--color-primary)]" />
                    : <ArrowUpRight size={13}
                        className="text-[var(--color-text-secondary)]" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium
                                 text-[var(--color-text-primary)] truncate max-w-[160px]">
                    {tx.description || tx.type}
                  </p>
                  <p className="text-xs font-normal text-[var(--color-text-secondary)] mt-0.5">
                    {formatDate(tx.created_at)}
                  </p>
                </div>
                <p className={`text-sm font-semibold shrink-0
                  ${isCredit(tx.type)
                    ? 'text-[var(--color-primary)]'
                    : 'text-[var(--color-text-primary)]'
                  }`}>
                  {isCredit(tx.type) ? '+' : '-'}
                  {formatXOF(tx.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── BLOC 6 : AFIYA CAPITAL TEASER ── */}
      <div className="px-5 mt-8">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Afiya Capital
          </h2>
          <button
            onClick={() => navigate('/patrimoine')}
            className="text-xs font-medium text-[var(--color-primary)]
                        flex items-center gap-0.5"
          >
            Découvrir
            <ChevronRight size={12} />
          </button>
        </div>

        <div className="bg-[var(--color-surface)] rounded-[var(--radius-card)] p-4 flex justify-between items-center">
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              Investissez dès 500 FCFA
            </p>
            <p className="text-xs font-normal text-[var(--color-text-secondary)] mt-0.5">
              Immobilier · Bourse · Obligations · PME
            </p>
          </div>
          <span className="bg-[var(--color-primary-light)] text-[var(--color-primary)] text-[10px] font-medium px-2 py-0.5 rounded-[var(--radius-badge)] shrink-0 ml-2">
            Bientôt disponible
          </span>
        </div>
      </div>

    </div>
  );
}
