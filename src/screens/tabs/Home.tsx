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
  subscribeToUserCaution,
  getUserGroups
} from '../../services/tontineService';
import { subscribeToCollection } from '../../lib/firestore';
import { where, orderBy, limit } from 'firebase/firestore';

export function Home() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [cautionBloquee, setCautionBloquee] = useState<number>(0);
  const [groups, setGroups] = useState<any[]>([]);
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

    const unsubCaution = subscribeToUserCaution(
      user.uid, setCautionBloquee
    );

    getUserGroups(user.uid).then(data => {
      setGroups(
        data
          .filter(g =>
            g.status === 'ACTIVE' ||
            g.status === 'FORMING' ||
            g.status === 'WAITING_VOTE'
          )
          .slice(0, 5)
      );
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

    return () => { unsubWallet(); unsubCaution(); unsubTx(); };
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

  return (
    <div className="flex-1 bg-[#F5F0E8] overflow-y-auto pb-28">

      {/* ── BLOC 1 : HEADER ── */}
      <div className="px-5 pt-12 pb-2">
        <p className="text-xs text-[#7C6F5E] font-normal">
          {greeting},
        </p>
        <p className="text-2xl font-bold text-[#1C1410] mt-0.5">
          {firstName}
        </p>
        {profile && (
          <p className="text-xs text-[#7C6F5E] mt-1 font-normal">
            Score Afiya&nbsp;·&nbsp;
            {profile.score_afiya}/100&nbsp;·&nbsp;
            {profile.tier}
          </p>
        )}
      </div>

      {/* ── BLOC 2 : CARDS SWIPEABLES ── */}
      <div className="mt-5 px-5">

        {/* Conteneur carte — hauteur fixe absolue */}
        <div className="relative h-[220px] overflow-hidden rounded-3xl">
          <AnimatePresence initial={false} custom={dragDirection}>
            {activeCard === 0 && (
              <motion.div
                key="card-wallet"
                custom={dragDirection}
                variants={{
                  enter: (d) => ({
                    x: d > 0 ? '100%' : '-100%',
                    opacity: 0
                  }),
                  center: { x: 0, opacity: 1 },
                  exit: (d) => ({
                    x: d > 0 ? '-100%' : '100%',
                    opacity: 0
                  })
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: 'spring', stiffness: 300, damping: 30 },
                  opacity: { duration: 0.15 }
                }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.08}
                onDragEnd={handleDragEnd}
                className="absolute inset-0 bg-[#047857]
                           rounded-3xl p-6 text-white
                           flex flex-col justify-between
                           cursor-grab active:cursor-grabbing
                           select-none"
              >
                {/* Row 1: label + eye */}
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-semibold
                                 text-emerald-300 uppercase
                                 tracking-[0.15em]">
                    Solde disponible
                  </p>
                  <button
                    onPointerDown={e => e.stopPropagation()}
                    onClick={() =>
                      setBalanceVisible(v => !v)
                    }
                    className="p-1 -mr-1 touch-none"
                  >
                    {balanceVisible
                      ? <EyeOff size={15}
                          className="text-emerald-300" />
                      : <Eye size={15}
                          className="text-emerald-300" />
                    }
                  </button>
                </div>

                {/* Row 2: montant — hauteur FIXE */}
                <div className="h-14 flex items-center">
                  {balance === null ? (
                    <div className="h-9 w-40 bg-white/20
                                     animate-pulse rounded-lg" />
                  ) : balanceVisible ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-extrabold
                                        text-white tracking-tight
                                        leading-none">
                        {formatXOF(balance).replace(' FCFA','')}
                      </span>
                      <span className="text-base font-semibold
                                        text-emerald-200">
                        FCFA
                      </span>
                    </div>
                  ) : (
                    <span className="text-3xl font-bold
                                      text-emerald-300
                                      tracking-[0.3em]">
                      ••••••
                    </span>
                  )}
                </div>

                {/* Row 3: lien détail */}
                <p className="text-[11px] text-emerald-300
                               font-medium text-right">
                  Carte 1 / 3 — glissez pour voir les autres →
                </p>
              </motion.div>
            )}

            {activeCard === 1 && (
              <motion.div
                key="card-cercles"
                custom={dragDirection}
                variants={{
                  enter: (d) => ({
                    x: d > 0 ? '100%' : '-100%', opacity: 0
                  }),
                  center: { x: 0, opacity: 1 },
                  exit: (d) => ({
                    x: d > 0 ? '-100%' : '100%', opacity: 0
                  })
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: 'spring', stiffness: 300, damping: 30 },
                  opacity: { duration: 0.15 }
                }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.08}
                onDragEnd={handleDragEnd}
                className="absolute inset-0 bg-[#047857]
                           rounded-3xl p-6 text-white
                           flex flex-col justify-between
                           cursor-grab active:cursor-grabbing
                           select-none"
              >
                <p className="text-[10px] font-semibold
                               text-emerald-300 uppercase
                               tracking-[0.15em]">
                  Mes Cercles
                </p>

                {/* Caution bloquée */}
                <div className="bg-white/10 rounded-2xl px-4 py-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs font-medium
                                     text-emerald-200">
                        Caution bloquée
                      </p>
                      <p className="text-[10px] text-emerald-300 mt-0.5">
                        Fonds de garantie de vos Cercles
                      </p>
                    </div>
                    <p className="text-base font-bold text-white">
                      {formatXOF(cautionBloquee)}
                    </p>
                  </div>
                </div>

                {/* Résumé groupes */}
                {groups.length === 0 ? (
                  <div className="text-center">
                    <p className="text-sm text-emerald-200 mb-2">
                      Aucun Cercle actif
                    </p>
                    <button
                      onPointerDown={e => e.stopPropagation()}
                      onClick={() => navigate('/tontines')}
                      className="bg-white text-[#047857]
                                  rounded-xl px-4 py-2
                                  text-xs font-bold"
                    >
                      Créer ou rejoindre un Cercle
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {groups.slice(0, 2).map(g => (
                      <div
                        key={g.id}
                        className="bg-white/10 rounded-xl
                                    px-3 py-2.5
                                    flex justify-between
                                    items-center"
                        onPointerDown={e => e.stopPropagation()}
                        onClick={() => navigate(`/group/${g.id}`)}
                      >
                        <div>
                          <p className="text-sm font-semibold
                                         text-white truncate
                                         max-w-[160px]">
                            {g.name}
                          </p>
                          <p className="text-[10px]
                                         text-emerald-300 mt-0.5">
                            {formatXOF(g.contribution_amount)}
                          </p>
                        </div>
                        <span className="text-[10px] font-semibold
                                          px-2 py-0.5 rounded-full
                                          bg-emerald-400/30
                                          text-emerald-100">
                          {g.status === 'ACTIVE'
                            ? 'Actif'
                            : g.status === 'FORMING'
                            ? 'Formation'
                            : 'Vote'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeCard === 2 && (
              <motion.div
                key="card-capital"
                custom={dragDirection}
                variants={{
                  enter: (d) => ({
                    x: d > 0 ? '100%' : '-100%', opacity: 0
                  }),
                  center: { x: 0, opacity: 1 },
                  exit: (d) => ({
                    x: d > 0 ? '-100%' : '100%', opacity: 0
                  })
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: 'spring', stiffness: 300, damping: 30 },
                  opacity: { duration: 0.15 }
                }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.08}
                onDragEnd={handleDragEnd}
                className="absolute inset-0 bg-[#1C1410]
                           rounded-3xl p-6 text-white
                           flex flex-col justify-between
                           cursor-grab active:cursor-grabbing
                           select-none overflow-hidden"
              >
                <div className="absolute top-0 right-0
                                 -mt-8 -mr-8 w-32 h-32
                                 bg-[#047857]/20 rounded-full
                                 blur-xl pointer-events-none" />

                <div>
                  <span className="text-[10px] font-semibold
                                    text-[#7C6F5E] uppercase
                                    tracking-[0.15em]">
                    Afiya Capital
                  </span>
                  <span className="ml-2 text-[10px] font-semibold
                                    text-emerald-400
                                    bg-[#047857]/20
                                    px-2 py-0.5 rounded-full">
                    Bientôt
                  </span>
                </div>

                <p className="text-xl font-bold text-white
                               leading-snug">
                  Investissez dans<br />
                  l'économie béninoise.
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/5 rounded-xl p-3">
                    <Building2 size={14}
                      className="text-[#047857] mb-1.5" />
                    <p className="text-xs font-semibold text-white">
                      Afiya Immo
                    </p>
                    <p className="text-[10px] text-[#7C6F5E] mt-0.5">
                      Immobilier fractionné
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3">
                    <Landmark size={14}
                      className="text-[#047857] mb-1.5" />
                    <p className="text-xs font-semibold text-white">
                      Afiya Bourse
                    </p>
                    <p className="text-[10px] text-[#7C6F5E] mt-0.5">
                      Actions BRVM
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Indicateurs de position */}
        <div className="flex justify-center gap-1.5 mt-4">
          {[0, 1, 2].map(i => (
            <button
              key={i}
              onClick={() => goToCard(i)}
              className="transition-all duration-300"
            >
              <motion.div
                animate={{
                  width: i === activeCard ? 20 : 6,
                  backgroundColor:
                    i === activeCard ? '#047857' : '#CBD5E1'
                }}
                className="h-1.5 rounded-full"
              />
            </button>
          ))}
        </div>
      </div>

      {/* ── BLOC 3 : ACTIONS RAPIDES ── */}
      <div className="px-5 mt-6">
        <div className="flex gap-3">
          {[
            {
              icon: ArrowDownLeft,
              label: 'Dépôt',
              action: () => {}
            },
            {
              icon: ArrowUpRight,
              label: 'Retrait',
              action: () => {}
            },
            {
              icon: ArrowRight,
              label: 'Envoyer',
              action: () => {}
            }
          ].map(({ icon: Icon, label, action }) => (
            <motion.button
              key={label}
              whileTap={{ scale: 0.95 }}
              onClick={action}
              className="flex-1 bg-white rounded-2xl
                          py-4 flex flex-col items-center
                          gap-2 border border-[#E8E0D0]
                          shadow-sm"
            >
              <div className="w-9 h-9 rounded-xl
                               bg-[#ECFDF5]
                               flex items-center justify-center">
                <Icon size={16} className="text-[#047857]" />
              </div>
              <span className="text-xs font-semibold
                                text-[#1C1410]">
                {label}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── BLOC 4 : MES CERCLES ── */}
      <div className="px-5 mt-8">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm font-bold text-[#1C1410]">
            Mes Cercles
          </p>
          <button
            onClick={() => navigate('/tontines')}
            className="text-xs font-medium text-[#047857]
                        flex items-center gap-0.5"
          >
            Voir tout
            <ChevronRight size={12} />
          </button>
        </div>

        {groups.length === 0 ? (
          <div className="bg-white rounded-2xl
                           border border-[#E8E0D0]
                           p-5 text-center">
            <CircleDot size={22}
              className="text-[#A39887] mx-auto mb-2" />
            <p className="text-sm text-[#7C6F5E] mb-3">
              Vous n'avez pas encore de Cercle actif.
            </p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/tontines')}
              className="bg-[#047857] text-white
                          rounded-xl px-5 py-2.5
                          text-xs font-bold"
            >
              Créer ou rejoindre un Cercle
            </motion.button>
          </div>
        ) : (
          <div className="space-y-2">
            {groups.slice(0, 3).map(g => (
              <motion.div
                key={g.id}
                whileTap={{ scale: 0.99 }}
                onClick={() => navigate(`/group/${g.id}`)}
                className="bg-white rounded-2xl
                            border border-[#E8E0D0]
                            px-4 py-3.5
                            flex justify-between
                            items-center cursor-pointer"
              >
                <div>
                  <p className="text-sm font-semibold
                                 text-[#1C1410]">
                    {g.name}
                  </p>
                  <p className="text-xs text-[#7C6F5E] mt-0.5">
                    {formatXOF(g.contribution_amount)} / cycle
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold
                                     px-2 py-0.5 rounded-full
                    ${g.status === 'ACTIVE'
                      ? 'bg-[#ECFDF5] text-[#047857]'
                      : g.status === 'FORMING'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-blue-50 text-blue-700'
                    }`}>
                    {g.status === 'ACTIVE' ? 'Actif'
                      : g.status === 'FORMING' ? 'Formation'
                      : 'Vote'}
                  </span>
                  <ChevronRight size={14}
                    className="text-[#A39887]" />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ── BLOC 5 : ACTIVITÉ RÉCENTE ── */}
      <div className="px-5 mt-8">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm font-bold text-[#1C1410]">
            Activité récente
          </p>
          <button
            onClick={() => {}}
            className="text-xs font-medium text-[#047857]
                        flex items-center gap-0.5"
          >
            Voir tout
            <ChevronRight size={12} />
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="bg-white rounded-2xl
                           border border-[#E8E0D0] p-5
                           text-center">
            <p className="text-sm text-[#7C6F5E]">
              Aucune transaction pour l'instant.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl
                           border border-[#E8E0D0]
                           overflow-hidden">
            {transactions.map((tx, idx) => (
              <div
                key={tx.id || idx}
                className={`flex items-center gap-3
                             px-4 py-3.5
                    ${idx < transactions.length - 1
                      ? 'border-b border-[#F0EAE0]'
                      : ''
                    }`}
              >
                <div className={`w-8 h-8 rounded-xl shrink-0
                                  flex items-center justify-center
                    ${isCredit(tx.type)
                      ? 'bg-[#ECFDF5]'
                      : 'bg-[#F5F0E8]'
                    }`}>
                  {isCredit(tx.type)
                    ? <ArrowDownLeft size={13}
                        className="text-[#047857]" />
                    : <ArrowUpRight size={13}
                        className="text-[#7C6F5E]" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium
                                 text-[#1C1410] truncate">
                    {tx.description || tx.type}
                  </p>
                  <p className="text-[11px] text-[#7C6F5E] mt-0.5">
                    {formatDate(tx.created_at)}
                  </p>
                </div>
                <p className={`text-sm font-bold shrink-0
                  ${isCredit(tx.type)
                    ? 'text-[#047857]'
                    : 'text-[#1C1410]'
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
        <motion.div
          whileTap={{ scale: 0.99 }}
          onClick={() => navigate('/patrimoine')}
          className="bg-[#1C1410] rounded-3xl p-5
                      flex justify-between items-center
                      cursor-pointer relative overflow-hidden"
        >
          <div className="absolute top-0 right-0
                           -mt-6 -mr-6 w-24 h-24
                           bg-[#047857]/15 rounded-full
                           blur-xl pointer-events-none" />
          <div>
            <p className="text-[10px] font-semibold
                           text-[#7C6F5E] uppercase
                           tracking-[0.12em] mb-1">
              Afiya Capital
            </p>
            <p className="text-sm font-bold text-white">
              Investissez dès 500 FCFA
            </p>
            <p className="text-xs text-[#7C6F5E] mt-0.5">
              Immobilier · Bourse · Obligations · PME
            </p>
          </div>
          <div className="bg-[#047857] rounded-xl
                           px-3 py-2 shrink-0">
            <ChevronRight size={16} className="text-white" />
          </div>
        </motion.div>
      </div>

    </div>
  );
}
