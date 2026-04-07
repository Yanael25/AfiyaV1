import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LogIn, Search, Users, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatXOF } from '../../lib/utils';
import { auth, db } from '../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getUserGroups, TontineMember, Cycle } from '../../services/tontineService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cleanAmount(val: number) {
  return formatXOF(val).replace(/\s?FCFA/gi, '').trim();
}

function shortDate(ts: any) {
  if (!ts) return '--';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

type GroupStatus = 'ACTIVE' | 'FORMING' | 'COMPLETED';

function normalizeStatus(status: string): GroupStatus {
  if (status === 'ACTIVE') return 'ACTIVE';
  if (status === 'COMPLETED' || status === 'CANCELLED') return 'COMPLETED';
  return 'FORMING';
}

function statusLabel(s: GroupStatus) {
  if (s === 'ACTIVE') return 'Actif';
  if (s === 'FORMING') return 'En formation';
  return 'Complété';
}

function statusBadgeClass(s: GroupStatus) {
  if (s === 'ACTIVE') return { bg: '#D1FAE5', text: '#065F46' };
  if (s === 'FORMING') return { bg: '#F5F4F0', text: '#6B6B6B' };
  return { bg: '#F5F4F0', text: '#A39887' };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Tontines() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'cercles' | 'pools'>('cercles');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [fabOpen, setFabOpen] = useState(false);
  const [groupsData, setGroupsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Memberships
      const membershipsSnap = await getDocs(
        query(collection(db, 'tontine_members'), where('user_id', '==', user.uid))
      );
      const memberships = membershipsSnap.docs.map((d: any) => d.data() as TontineMember);

      if (memberships.length === 0) { setGroupsData([]); return; }

      const fetchedGroups = await getUserGroups(user.uid);
      const groupIds = fetchedGroups.map(g => g.id);

      // Active cycles (chunked by 10)
      const activeCycles: Record<string, Cycle> = {};
      for (let i = 0; i < groupIds.length; i += 10) {
        const chunk = groupIds.slice(i, i + 10);
        const snap = await getDocs(
          query(collection(db, 'cycles'), where('group_id', 'in', chunk), where('status', '==', 'ACTIVE'))
        );
        snap.docs.forEach((d: any) => {
          const c = d.data() as Cycle;
          activeCycles[c.group_id] = c;
        });
      }

      // Members count per group
      const membersCount: Record<string, number> = {};
      for (let i = 0; i < groupIds.length; i += 10) {
        const chunk = groupIds.slice(i, i + 10);
        const snap = await getDocs(
          query(collection(db, 'tontine_members'), where('group_id', 'in', chunk))
        );
        snap.docs.forEach((d: any) => {
          const m = d.data();
          membersCount[m.group_id] = (membersCount[m.group_id] || 0) + 1;
        });
      }

      const combined = fetchedGroups.map(group => {
        const membership = memberships.find((m: any) => m.group_id === group.id) ?? null;
        const activeCycle = activeCycles[group.id] ?? null;
        const count = membersCount[group.id] ?? 1;
        const isLate = membership
          ? (membership.cycles_defaulted > 0 || membership.status === 'RESTRICTED')
          : false;
        const isBeneficiary = activeCycle
          ? activeCycle.beneficiary_member_id === membership?.id
          : false;
        return { ...group, membership, activeCycle, membersCount: count, isLate, isBeneficiary };
      });

      combined.sort((a, b) => {
        const order: Record<string, number> = { ACTIVE: 0, FORMING: 1, COMPLETED: 2 };
        const sa = order[normalizeStatus(a.status)] ?? 3;
        const sb = order[normalizeStatus(b.status)] ?? 3;
        return sa !== sb ? sa - sb : 0;
      });

      setGroupsData(combined);
    } catch (e: any) {
      console.error('loadGroups error', e);
    } finally {
      setLoading(false);
    }
  };

  // ── Summary computations ────────────────────────────────────────────────────
  const activeCount = groupsData.filter((g: any) => g.status === 'ACTIVE').length;

  const nextPayout = groupsData
    .filter((g: any) => g.isBeneficiary && g.activeCycle)
    .sort((a: any, b: any) => {
      const da = a.activeCycle.payout_date?.toDate?.() ?? new Date(0);
      const db2 = b.activeCycle.payout_date?.toDate?.() ?? new Date(0);
      return da.getTime() - db2.getTime();
    })[0] ?? null;

  const nextPayment = groupsData
    .filter((g: any) => g.activeCycle?.payment_due_date)
    .sort((a: any, b: any) => {
      const da = a.activeCycle.payment_due_date?.toDate?.() ?? new Date(0);
      const db2 = b.activeCycle.payment_due_date?.toDate?.() ?? new Date(0);
      return da.getTime() - db2.getTime();
    })[0] ?? null;

  // ── Group list by status ────────────────────────────────────────────────────
  const filtered = searchQuery
    ? groupsData.filter((g: any) => g.name?.toLowerCase().includes(searchQuery.toLowerCase()))
    : groupsData;

  const sections = [
    { key: 'ACTIVE' as GroupStatus,    label: 'ACTIFS',        items: filtered.filter((g: any) => normalizeStatus(g.status) === 'ACTIVE') },
    { key: 'FORMING' as GroupStatus,   label: 'EN FORMATION',  items: filtered.filter((g: any) => normalizeStatus(g.status) === 'FORMING') },
    { key: 'COMPLETED' as GroupStatus, label: 'COMPLÉTÉS',     items: filtered.filter((g: any) => normalizeStatus(g.status) === 'COMPLETED') },
  ].filter(s => s.items.length > 0);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="bg-[#F5F4F0] min-h-screen flex flex-col font-sans pb-20 selection:bg-[#047857]/20">

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="pt-[52px] px-4 pb-3 flex items-center justify-between gap-3">
        <AnimatePresence mode="wait">
          {searchOpen ? (
            <motion.div
              key="search"
              initial={{ opacity: 0, width: '40px' }}
              animate={{ opacity: 1, width: '100%' }}
              exit={{ opacity: 0, width: '40px' }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex items-center gap-2 bg-white border border-[#EDECEA] rounded-[10px] px-3 h-9"
            >
              <Search size={14} style={{ color: '#6B6B6B' }} />
              <input
                ref={searchRef}
                value={searchQuery}
                onChange={(e: any) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un cercle…"
                className="flex-1 bg-transparent text-[13px] font-medium text-[#1A1A1A] placeholder-[#C4B8AC] outline-none"
              />
              <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }}>
                <X size={14} style={{ color: '#A39887' }} />
              </button>
            </motion.div>
          ) : (
            <motion.h1
              key="title"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="text-[26px] font-extrabold text-[#1A1A1A]"
              style={{ letterSpacing: '-0.02em' }}
            >
              Cercles
            </motion.h1>
          )}
        </AnimatePresence>

        {!searchOpen && (
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center justify-center shrink-0"
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: '#FFFFFF', border: '0.5px solid #EDECEA',
            }}
          >
            <Search size={16} style={{ color: '#6B6B6B' }} />
          </button>
        )}
      </div>

      {/* ── SOUS-ONGLETS ────────────────────────────────────────────────── */}
      <div className="flex px-4" style={{ borderBottom: '1px solid #EDECEA' }}>
        {(['cercles', 'pools'] as const).map(tab => {
          const active = activeTab === tab;
          const label = tab === 'cercles' ? 'Mes cercles' : 'Afiya Pools';
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="mr-6 pb-3 text-[14px] font-bold transition-colors"
              style={{
                color: active ? '#047857' : '#A39887',
                borderBottom: active ? '2px solid #047857' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── MES CERCLES ─────────────────────────────────────────────────── */}
      {activeTab === 'cercles' && (
        <div className="flex flex-col px-4 pt-4">

          {/* Summary card */}
          {!loading && groupsData.length > 0 && (
            <div
              className="flex mb-4"
              style={{
                background: '#FFFFFF', borderRadius: 16,
                border: '0.5px solid #EDECEA', padding: 14,
              }}
            >
              {/* Col 1 — Cercles actifs */}
              <div className="flex-1 flex flex-col items-center justify-center text-center"
                   style={{ borderRight: '0.5px solid #F5F4F0' }}>
                <span className="text-[17px] font-extrabold text-[#1A1A1A] leading-tight">{activeCount}</span>
                <span className="text-[10px] font-semibold text-[#A39887] mt-0.5">Cercles actifs</span>
              </div>

              {/* Col 2 — Prochaine cagnotte */}
              <div className="flex-1 flex flex-col items-center justify-center text-center"
                   style={{ borderRight: '0.5px solid #F5F4F0' }}>
                {nextPayout ? (
                  <>
                    <span className="text-[12px] font-bold text-[#047857] leading-tight">
                      {cleanAmount(nextPayout.activeCycle.expected_total)} FCFA
                    </span>
                    <span className="text-[10px] text-[#A39887] mt-0.5">
                      {shortDate(nextPayout.activeCycle.payout_date)}
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] font-semibold text-[#A39887]">—</span>
                )}
                <span className="text-[10px] font-semibold text-[#A39887] mt-0.5">Prochaine cagnotte</span>
              </div>

              {/* Col 3 — Prochain paiement */}
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                {nextPayment ? (
                  <>
                    <span className="text-[12px] font-bold text-[#1A1A1A] leading-tight">
                      {cleanAmount(nextPayment.contribution_amount)} FCFA
                    </span>
                    <span className="text-[10px] text-[#A39887] mt-0.5">
                      {shortDate(nextPayment.activeCycle.payment_due_date)}
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] font-semibold text-[#A39887]">—</span>
                )}
                <span className="text-[10px] font-semibold text-[#A39887] mt-0.5">Prochain paiement</span>
              </div>
            </div>
          )}

          {/* Group list */}
          {loading ? (
            <div className="flex flex-col gap-3 mt-2">
              {[0, 1].map(i => (
                <div key={i} className="h-[130px] bg-[#E8E6E3] rounded-[18px] animate-pulse" />
              ))}
            </div>
          ) : groupsData.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center pt-16 pb-8">
              <div
                className="flex items-center justify-center mb-4"
                style={{ width: 52, height: 52, borderRadius: 16, background: '#F0EFED' }}
              >
                <Users size={22} strokeWidth={1.5} style={{ color: '#A39887' }} />
              </div>
              <p className="text-[15px] font-bold text-[#1A1A1A] mb-1">Aucun cercle actif</p>
              <p className="text-[13px] text-[#A39887] text-center mb-6 max-w-[220px]">
                Créez ou rejoignez un cercle pour commencer à épargner ensemble.
              </p>
              <button
                onClick={() => navigate('/group/create')}
                className="flex items-center justify-center gap-2 text-white text-[13px] font-bold transition-transform active:scale-95"
                style={{
                  height: 44, paddingLeft: 24, paddingRight: 24,
                  background: '#047857', borderRadius: 12,
                }}
              >
                <Plus size={16} strokeWidth={2} />
                Créer un cercle
              </button>
            </div>
          ) : (
            <div className="flex flex-col">
              {sections.map(({ key, label, items }) => (
                <div key={key} className="mb-2">
                  <p
                    className="text-[10px] font-bold uppercase tracking-widest text-[#A39887] mb-2 mt-2"
                  >
                    {label}
                  </p>
                  {items.map((group: any, idx: number) => {
                    const s = normalizeStatus(group.status);
                    const badge = statusBadgeClass(s);
                    const count = group.membersCount ?? 1;
                    const progress = s === 'ACTIVE'
                      ? Math.min((group.current_cycle / Math.max(group.total_cycles, 1)) * 100, 100)
                      : s === 'FORMING'
                        ? Math.min((count / Math.max(group.target_members, 1)) * 100, 100)
                        : 100;

                    return (
                      <motion.div
                        key={group.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        onClick={() => navigate(`/group/${group.id}`)}
                        className="cursor-pointer active:scale-[0.99] transition-transform mb-2"
                        style={{
                          background: '#FFFFFF',
                          borderRadius: 18,
                          border: '0.5px solid #EDECEA',
                          borderLeft: group.isLate ? '2px solid #92400E' : '0.5px solid #EDECEA',
                          padding: 14,
                        }}
                      >
                        {/* Line 1: name + badge */}
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className="text-[14px] font-bold text-[#1A1A1A] truncate"
                            style={{ maxWidth: '65%' }}
                          >
                            {group.name}
                          </span>
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0"
                            style={{ background: badge.bg, color: badge.text }}
                          >
                            {statusLabel(s)}
                          </span>
                        </div>

                        {/* Line 2: 3 meta columns */}
                        <div className="flex items-center mb-3">
                          <div
                            className="flex-1 flex flex-col items-start"
                            style={{ borderRight: '0.5px solid #F0EFED', paddingRight: 10 }}
                          >
                            <span className="text-[12px] font-semibold text-[#1A1A1A]">
                              {cleanAmount(group.contribution_amount)}
                            </span>
                            <span className="text-[9px] font-medium text-[#A39887]">FCFA / cycle</span>
                          </div>
                          <div
                            className="flex-1 flex flex-col items-center"
                            style={{ borderRight: '0.5px solid #F0EFED', paddingLeft: 10, paddingRight: 10 }}
                          >
                            <span className="text-[12px] font-semibold text-[#1A1A1A]">
                              {count} / {group.target_members}
                            </span>
                            <span className="text-[9px] font-medium text-[#A39887]">membres</span>
                          </div>
                          <div
                            className="flex-1 flex flex-col items-end"
                            style={{ paddingLeft: 10 }}
                          >
                            <span className="text-[12px] font-semibold text-[#1A1A1A]">
                              {s === 'ACTIVE' && group.membership?.draw_position
                                ? `#${group.membership.draw_position}`
                                : group.membership?.is_admin
                                  ? 'Admin'
                                  : '—'}
                            </span>
                            <span className="text-[9px] font-medium text-[#A39887]">position</span>
                          </div>
                        </div>

                        {/* Action block */}
                        {s === 'ACTIVE' && (
                          <div
                            className="flex items-center justify-between mb-3"
                            style={{
                              background: '#F5F4F0', borderRadius: 10,
                              padding: '8px 11px',
                            }}
                          >
                            {group.isBeneficiary ? (
                              <>
                                <span className="text-[11px] font-medium text-[#1A1A1A]">Cagnotte à venir</span>
                                <span className="text-[12px] font-bold text-[#047857]">
                                  +{cleanAmount(group.activeCycle?.expected_total ?? 0)} FCFA
                                </span>
                              </>
                            ) : (
                              <>
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-medium text-[#1A1A1A]">Cotisation due</span>
                                  {group.activeCycle?.payment_due_date && (
                                    <span className="text-[10px] text-[#A39887]">
                                      {shortDate(group.activeCycle.payment_due_date)}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[12px] font-bold text-[#1A1A1A]">
                                  {cleanAmount(group.contribution_amount)} FCFA
                                </span>
                              </>
                            )}
                          </div>
                        )}

                        {s === 'FORMING' && (
                          <div
                            className="flex items-center justify-between mb-3"
                            style={{
                              background: '#F5F4F0', borderRadius: 10,
                              padding: '8px 11px',
                            }}
                          >
                            <span className="text-[11px] font-medium text-[#1A1A1A]">En attente de membres</span>
                            <span className="text-[11px] font-semibold text-[#A39887]">
                              {group.target_members - count} restants
                            </span>
                          </div>
                        )}

                        {/* Progress bar */}
                        <div
                          className="w-full overflow-hidden"
                          style={{ height: 4, borderRadius: 2, background: '#E8E6E3' }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${progress}%`,
                              borderRadius: 2,
                              background: s === 'COMPLETED' ? '#A39887' : '#047857',
                              transition: 'width 0.4s ease',
                            }}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── AFIYA POOLS ─────────────────────────────────────────────────── */}
      {activeTab === 'pools' && (
        <div className="flex flex-col px-4 pt-4">
          {/* Join button */}
          <button
            className="w-full flex items-center justify-center text-white text-[12px] font-bold mb-6 transition-transform active:scale-95"
            style={{ height: 36, background: '#047857', borderRadius: 10 }}
          >
            Rejoindre un pool
          </button>

          {/* Placeholder */}
          <div className="flex flex-col items-center justify-center pt-12">
            <div
              className="flex items-center justify-center mb-4"
              style={{ width: 52, height: 52, borderRadius: 16, background: '#F0EFED' }}
            >
              <Users size={22} strokeWidth={1.5} style={{ color: '#A39887' }} />
            </div>
            <p className="text-[15px] font-bold text-[#1A1A1A] mb-2">Afiya Pools arrive bientôt</p>
            <p
              className="text-[12px] text-[#A39887] text-center mb-4"
              style={{ maxWidth: 200 }}
            >
              Des pools d'épargne collectifs gérés par Afiya, ouverts à tous.
            </p>
            <span
              className="text-[11px] font-bold text-[#A39887]"
              style={{
                background: '#F5F4F0', borderRadius: 8,
                padding: '5px 12px',
              }}
            >
              Disponible prochainement
            </span>
          </div>
        </div>
      )}

      {/* ── FAB ─────────────────────────────────────────────────────────── */}
      {activeTab === 'cercles' && (
        <div style={{ position: 'fixed', bottom: 88, right: 16, zIndex: 50 }}>
          <AnimatePresence>
            {fabOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="mb-2"
                style={{
                  background: '#FFFFFF',
                  borderRadius: 16,
                  border: '0.5px solid #EDECEA',
                  overflow: 'hidden',
                  minWidth: 180,
                }}
              >
                <button
                  onClick={() => { setFabOpen(false); navigate('/group/create'); }}
                  className="w-full flex items-center gap-3 px-4 py-3 transition-colors active:bg-[#F5F4F0]"
                >
                  <Plus size={16} style={{ color: '#047857' }} strokeWidth={2} />
                  <span className="text-[13px] font-semibold text-[#1A1A1A]">Créer un cercle</span>
                </button>
                <div style={{ height: '0.5px', background: '#EDECEA' }} />
                <button
                  onClick={() => { setFabOpen(false); navigate('/group/join'); }}
                  className="w-full flex items-center gap-3 px-4 py-3 transition-colors active:bg-[#F5F4F0]"
                >
                  <LogIn size={16} style={{ color: '#6B6B6B' }} strokeWidth={2} />
                  <span className="text-[13px] font-semibold text-[#1A1A1A]">Rejoindre un cercle</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setFabOpen((o: boolean) => !o)}
            className="flex items-center justify-center transition-transform active:scale-90"
            style={{
              width: 48, height: 48,
              borderRadius: 14,
              background: '#047857',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AnimatePresence mode="wait">
              {fabOpen ? (
                <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <X size={20} strokeWidth={2.5} style={{ color: '#FFFFFF' }} />
                </motion.span>
              ) : (
                <motion.span key="plus" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <Plus size={20} strokeWidth={2.5} style={{ color: '#FFFFFF' }} />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      )}

    </div>
  );
}
