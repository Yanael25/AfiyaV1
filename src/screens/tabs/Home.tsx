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
      <div className="px-5 pt-12 pb-6 flex justify-between items-center bg-[#F5F0E8]">
        <div>
          <p className="text-xs font-normal text-[#7C6F5E]">Bonjour,</p>
          <p className="text-2xl font-bold text-[#1C1410]">{firstName}</p>
        </div>
        
        {/* Pill Score & Tier */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/profile')}
          className="bg-white border border-[#E8E0D0] rounded-full pl-2 pr-3 py-1.5 flex items-center gap-2 shadow-sm"
        >
          <div className="w-6 h-6 rounded-full bg-[#047857] flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">{profile?.score_afiya || 50}</span>
          </div>
          <span className="text-xs font-medium text-[#1C1410]">
            {profile?.tier || 'BRONZE'}
          </span>
        </motion.button>
      </div>

      {/* ── BLOC 2 : CARDS SWIPEABLES ── */}
      <div className="mt-5 pl-5 overflow-hidden">
        <div
          className="pl-5 overflow-visible"
          style={{ paddingRight: 0 }}
        >
          <motion.div
            className="flex"
            style={{ gap: 12 }}
            animate={{
              x: -activeCard * ((typeof window !== 'undefined' ? window.innerWidth * 0.85 : 300) + 12)
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 35 }}
            drag="x"
            dragConstraints={{
              left: -2 * ((typeof window !== 'undefined' ? window.innerWidth * 0.85 : 300) + 12),
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
              className="shrink-0 bg-[#047857] rounded-3xl
                         p-5 text-white relative overflow-hidden
                         flex flex-col justify-between"
              style={{ width: typeof window !== 'undefined' ? window.innerWidth * 0.85 : 300, height: 200 }}
            >
              {/* ÉLÉMENT DÉCORATIF — cercle en arrière-plan */}
              <div className="absolute -bottom-8 -right-8
                               w-40 h-40 rounded-full
                               bg-white/5 pointer-events-none" />
              <div className="absolute -top-6 -left-6
                               w-28 h-28 rounded-full
                               bg-white/5 pointer-events-none" />

              {/* Row 1 : label + œil */}
              <div className="flex justify-between items-center relative z-10">
                <p className="text-[10px] font-semibold uppercase
                               tracking-[0.15em] text-emerald-300">
                  Solde disponible
                </p>
                <button
                  onPointerDown={e => e.stopPropagation()}
                  onClick={() => setBalanceVisible(v => !v)}
                  className="p-1 touch-none"
                >
                  {balanceVisible
                    ? <EyeOff size={14} className="text-emerald-300" />
                    : <Eye size={14} className="text-emerald-300" />
                  }
                </button>
              </div>

              {/* Row 2 : montant — hauteur fixe pour éviter layout shift */}
              <div className="relative z-10" style={{ height: 56 }}>
                {balance === null ? (
                  <div className="h-10 w-36 bg-white/20
                                   animate-pulse rounded-lg mt-2" />
                ) : balanceVisible ? (
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-4xl font-extrabold
                                      text-white tracking-tight leading-none">
                      {new Intl.NumberFormat('fr-FR').format(balance)}
                    </span>
                    <span className="text-base font-semibold text-emerald-300">
                      FCFA
                    </span>
                  </div>
                ) : (
                  <p className="text-3xl font-bold text-emerald-300
                                 tracking-[0.3em] mt-2">
                    ••••••
                  </p>
                )}
              </div>

              {/* Row 3 : compte numéro ou indicateur discret */}
              <div className="flex justify-between items-center relative z-10">
                <p className="text-[10px] text-emerald-300/70 font-medium">
                  Compte principal
                </p>
                <p className="text-[10px] text-emerald-300/70 font-medium">
                  1 / 3
                </p>
              </div>
            </div>

            {/* Card 1 — Cercles */}
            <div
              className="shrink-0 bg-[#1C1410] rounded-3xl
                         p-5 text-white relative overflow-hidden
                         flex flex-col justify-between"
              style={{ width: typeof window !== 'undefined' ? window.innerWidth * 0.85 : 300, height: 200 }}
            >
              <div className="absolute -bottom-8 -right-8
                               w-40 h-40 rounded-full
                               bg-white/5 pointer-events-none" />

              <p className="text-[10px] font-semibold uppercase
                             tracking-[0.15em] text-[#A39887]">
                Mes Cercles
              </p>

              <div className="bg-white/10 rounded-2xl px-4 py-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-normal text-[#A39887]">
                      Caution bloquée
                    </p>
                    <p className="text-[10px] font-normal text-[#A39887] mt-0.5">
                      Fonds de garantie
                    </p>
                  </div>
                  <p className="text-4xl font-extrabold text-white">
                    {new Intl.NumberFormat('fr-FR').format(cautionBloquee)}
                  </p>
                </div>
              </div>

              {groups.length === 0 ? (
                <div className="text-center">
                  <p className="text-xs font-normal text-[#A39887] mb-2">
                    Aucun Cercle actif
                  </p>
                  <button
                    onPointerDown={e => e.stopPropagation()}
                    onClick={() => navigate('/tontines')}
                    className="bg-white text-[#1C1410] rounded-xl
                                px-4 py-2 text-xs font-bold"
                  >
                    Créer ou rejoindre
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-white">
                    {groups.length} Cercle{groups.length > 1 ? 's' : ''} actif{groups.length > 1 ? 's' : ''}
                  </p>
                  <p className="text-[10px] font-normal text-[#A39887] mt-0.5">
                    Appuyez pour voir le détail →
                  </p>
                </div>
              )}
            </div>

            {/* Card 2 — Capital */}
            <div
              className="shrink-0 bg-[#064E3B] rounded-3xl
                         p-5 text-white relative overflow-hidden
                         flex flex-col justify-between"
              style={{ width: typeof window !== 'undefined' ? window.innerWidth * 0.85 : 300, height: 200 }}
            >
              <div className="absolute -bottom-6 -right-6
                               w-32 h-32 rounded-full
                               bg-[#047857]/30 pointer-events-none" />

              <div className="flex items-center gap-2">
                <p className="text-[10px] font-semibold uppercase
                               tracking-[0.15em] text-emerald-300">
                  Afiya Capital
                </p>
                <span className="bg-[#047857]/30 text-emerald-300
                                  text-[8px] font-bold
                                  px-2 py-0.5 rounded-full uppercase">
                  Nouveau
                </span>
              </div>

              <p className="text-xl font-bold text-white leading-snug relative z-10">
                Faites fructifier<br />votre épargne.
              </p>

              <div className="grid grid-cols-2 gap-2 relative z-10">
                <div className="bg-white/8 rounded-xl p-2.5">
                  <p className="text-xs font-semibold text-white">Afiya Immo</p>
                  <p className="text-[10px] text-emerald-400/60 mt-0.5">
                    Dès 5 000 FCFA
                  </p>
                </div>
                <div className="bg-white/8 rounded-xl p-2.5">
                  <p className="text-xs font-semibold text-white">Afiya Bourse</p>
                  <p className="text-[10px] text-emerald-400/60 mt-0.5">
                    Dès 1 000 FCFA
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Indicateurs de position */}
        <div className="flex justify-center gap-1.5 mt-4 px-5">
          {[0, 1, 2].map(i => (
            <button key={i} onClick={() => setActiveCard(i)}>
              <motion.div
                animate={{
                  width: i === activeCard ? 20 : 6,
                  backgroundColor: i === activeCard ? '#047857' : '#CBD5E1'
                }}
                className="h-1.5 rounded-full"
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
              className="flex-1 bg-white rounded-2xl py-3
                         flex flex-col items-center gap-1.5
                         border border-[#E8E0D0]"
            >
              <div className="w-8 h-8 rounded-xl bg-[#ECFDF5]
                               flex items-center justify-center">
                <Icon size={14} className="text-[#047857]" />
              </div>
              <span className="text-xs font-medium text-[#1C1410]">
                {label}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── BLOC 4 : MES CERCLES ── */}
      <div className="px-5 mt-8">
        <div className="flex justify-between items-center mb-3">
          <p className="text-2xl font-bold text-[#1C1410]">
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
            <p className="text-sm font-medium text-[#1C1410] mb-3">
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
                  <p className="text-sm font-medium
                                 text-[#1C1410]">
                    {g.name}
                  </p>
                  <p className="text-xs font-normal text-[#7C6F5E] mt-0.5">
                    {formatXOF(g.contribution_amount)} / cycle
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold uppercase tracking-[0.15em]
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
          <p className="text-2xl font-bold text-[#1C1410]">
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
            <p className="text-sm font-medium text-[#1C1410]">
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
                  <p className="text-xs font-normal text-[#7C6F5E] mt-0.5">
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
          className="bg-[#047857] rounded-3xl p-5
                      flex justify-between items-center
                      cursor-pointer relative overflow-hidden"
        >
          <div className="absolute top-0 right-0
                           -mt-6 -mr-6 w-24 h-24
                           bg-[#047857]/15 rounded-full
                           blur-xl pointer-events-none" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em]
                           text-[#7C6F5E] mb-1">
              Afiya Capital
            </p>
            <p className="text-sm font-bold text-white">
              Investissez dès 500 FCFA
            </p>
            <p className="text-xs font-normal text-[#7C6F5E] mt-0.5">
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
