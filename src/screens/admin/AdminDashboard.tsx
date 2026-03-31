import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { orderBy, limit } from 'firebase/firestore';
import { 
  ArrowLeft, Activity, Users, Wallet, Repeat, ArrowRightLeft, 
  Search, ChevronDown, ChevronUp, Shield, Clock
} from 'lucide-react';
import { auth } from '../../lib/firebase';
import { subscribeToCollection } from '../../lib/firestore';
import { formatXOF } from '../../lib/utils';

// Types
interface Profile {
  id: string;
  full_name: string;
  email: string;
  score_afiya: number;
  tier: string;
  kyc_status: string;
  created_at: any;
}

interface WalletData {
  id: string;
  owner_id: string;
  group_id: string | null;
  wallet_type: string;
  balance: number;
  updated_at?: any;
}

interface TontineGroup {
  id: string;
  name: string;
  status: string;
  contribution_amount: number;
  frequency: string;
  target_members: number;
  current_cycle: number;
  total_cycles: number;
  invitation_code: string | null;
  created_at: any;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  from_wallet_id: string | null;
  to_wallet_id: string | null;
  created_at: any;
}

interface TontineMember {
  id: string;
  group_id: string;
  user_id: string;
  draw_position: number | null;
  status: string;
  initial_deposit: number;
}

interface Cycle {
  id: string;
  group_id: string;
  status: string;
  payment_due_date: any;
  expected_total: number;
  actual_total: number | null;
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('synthèse');
  
  // Data states
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [groups, setGroups] = useState<TontineGroup[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [members, setMembers] = useState<TontineMember[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);

  // UI states
  const [searchUser, setSearchUser] = useState('');
  const [txFilter, setTxFilter] = useState('Tous');
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  // Auth check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/welcome');
      } else if (user.email !== 'jespere20000@gmail.com') {
        navigate('/home');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Subscriptions
  useEffect(() => {
    const unsubProfiles = subscribeToCollection<Profile>('profiles', [orderBy('created_at', 'desc')], setProfiles);
    const unsubWallets = subscribeToCollection<WalletData>('wallets', [], setWallets);
    const unsubGroups = subscribeToCollection<TontineGroup>('tontine_groups', [orderBy('created_at', 'desc')], setGroups);
    const unsubTx = subscribeToCollection<Transaction>('transactions', [orderBy('created_at', 'desc'), limit(50)], setTransactions);
    const unsubMembers = subscribeToCollection<TontineMember>('tontine_members', [], setMembers);
    const unsubCycles = subscribeToCollection<Cycle>('cycles', [], setCycles);

    return () => {
      unsubProfiles();
      unsubWallets();
      unsubGroups();
      unsubTx();
      unsubMembers();
      unsubCycles();
    };
  }, []);

  // Formatters & Helpers
  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('fr-FR', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    }).format(date);
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  // Derived Data
  const totalUsers = profiles.length;
  const userMainWallets = wallets.filter(w => w.wallet_type === 'USER_MAIN');
  const totalUserMainBalance = userMainWallets.reduce((acc, w) => acc + w.balance, 0);
  const globalFundBalance = wallets.find(w => w.id === 'global_fund_main')?.balance || 0;
  const totalEscrow = wallets.filter(w => w.wallet_type === 'ESCROW_CONSTITUTION').reduce((acc, w) => acc + w.balance, 0);
  const totalContribPool = wallets.filter(w => w.wallet_type === 'CONTRIBUTION_POOL').reduce((acc, w) => acc + w.balance, 0);
  const totalMiniFund = wallets.filter(w => w.wallet_type === 'GROUP_MINI_FUND').reduce((acc, w) => acc + w.balance, 0);

  const groupsForming = groups.filter(g => g.status === 'FORMING').length;
  const groupsActive = groups.filter(g => g.status === 'ACTIVE').length;
  const groupsCompleted = groups.filter(g => g.status === 'COMPLETED').length;
  const groupsCancelled = groups.filter(g => g.status === 'CANCELLED').length;

  const filteredUsers = profiles.filter(p => 
    p.full_name?.toLowerCase().includes(searchUser.toLowerCase()) || 
    p.email?.toLowerCase().includes(searchUser.toLowerCase())
  );

  const filteredTx = txFilter === 'Tous' ? transactions : transactions.filter(t => t.type === txFilter);

  const walletGroups = useMemo(() => {
    const order = ['GLOBAL_FUND', 'ESCROW_CONSTITUTION', 'CONTRIBUTION_POOL', 'GROUP_MINI_FUND', 'USER_MAIN'];
    const grouped: Record<string, WalletData[]> = {};
    wallets.forEach(w => {
      if (!grouped[w.wallet_type]) grouped[w.wallet_type] = [];
      grouped[w.wallet_type].push(w);
    });
    return order.map(type => ({
      type,
      wallets: grouped[type] || [],
      total: (grouped[type] || []).reduce((acc, w) => acc + w.balance, 0)
    }));
  }, [wallets]);

  // Renderers
  const renderSynthese = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      <div className="bg-[var(--color-surface)] p-4 rounded-[var(--radius-card)]">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-[var(--color-primary-light)] rounded-[var(--radius-inner)]"><Users className="w-5 h-5 text-[var(--color-primary)]" strokeWidth={1.5} /></div>
          <h3 className="text-sm font-semibold text-[var(--color-text-secondary)]">Total Utilisateurs</h3>
        </div>
        <p className="text-2xl font-bold text-[var(--color-text-primary)]">{totalUsers}</p>
      </div>
      <div className="bg-[var(--color-surface)] p-4 rounded-[var(--radius-card)]">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-[var(--color-primary-light)] rounded-[var(--radius-inner)]"><Wallet className="w-5 h-5 text-[var(--color-primary)]" strokeWidth={1.5} /></div>
          <h3 className="text-sm font-semibold text-[var(--color-text-secondary)]">Total USER_MAIN</h3>
        </div>
        <p className="text-2xl font-bold text-[var(--color-text-primary)]">{formatXOF(totalUserMainBalance)}</p>
      </div>
      <div className="bg-[var(--color-surface)] p-4 rounded-[var(--radius-card)]">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-[var(--color-bg)] rounded-[var(--radius-inner)]"><Shield className="w-5 h-5 text-[var(--color-text-primary)]" strokeWidth={1.5} /></div>
          <h3 className="text-sm font-semibold text-[var(--color-text-secondary)]">Solde GLOBAL_FUND</h3>
        </div>
        <p className="text-2xl font-bold text-[var(--color-text-primary)]">{formatXOF(globalFundBalance)}</p>
      </div>
      <div className="bg-[var(--color-surface)] p-4 rounded-[var(--radius-card)]">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-[var(--color-bg)] rounded-[var(--radius-inner)]"><Clock className="w-5 h-5 text-[var(--color-text-primary)]" strokeWidth={1.5} /></div>
          <h3 className="text-sm font-semibold text-[var(--color-text-secondary)]">Total ESCROW_CONSTITUTION</h3>
        </div>
        <p className="text-2xl font-bold text-[var(--color-text-primary)]">{formatXOF(totalEscrow)}</p>
      </div>
      <div className="bg-[var(--color-surface)] p-4 rounded-[var(--radius-card)]">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-[var(--color-bg)] rounded-[var(--radius-inner)]"><Repeat className="w-5 h-5 text-[var(--color-text-primary)]" strokeWidth={1.5} /></div>
          <h3 className="text-sm font-semibold text-[var(--color-text-secondary)]">Total CONTRIBUTION_POOL</h3>
        </div>
        <p className="text-2xl font-bold text-[var(--color-text-primary)]">{formatXOF(totalContribPool)}</p>
      </div>
      <div className="bg-[var(--color-surface)] p-4 rounded-[var(--radius-card)]">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-[var(--color-bg)] rounded-[var(--radius-inner)]"><Activity className="w-5 h-5 text-[var(--color-text-primary)]" strokeWidth={1.5} /></div>
          <h3 className="text-sm font-semibold text-[var(--color-text-secondary)]">Total GROUP_MINI_FUND</h3>
        </div>
        <p className="text-2xl font-bold text-[var(--color-text-primary)]">{formatXOF(totalMiniFund)}</p>
      </div>
      <div className="bg-[var(--color-surface)] p-4 rounded-[var(--radius-card)] md:col-span-2 lg:col-span-3">
        <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-4">Statut des Cercles</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[120px] p-3 bg-[var(--color-bg)] rounded-[var(--radius-inner)]">
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">FORMING</p>
            <p className="text-xl font-bold text-[var(--color-text-primary)]">{groupsForming}</p>
          </div>
          <div className="flex-1 min-w-[120px] p-3 bg-[var(--color-primary-light)] rounded-[var(--radius-inner)]">
            <p className="text-sm font-medium text-[var(--color-primary)]">ACTIVE</p>
            <p className="text-xl font-bold text-[var(--color-primary)]">{groupsActive}</p>
          </div>
          <div className="flex-1 min-w-[120px] p-3 bg-[var(--color-bg)] rounded-[var(--radius-inner)]">
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">COMPLETED</p>
            <p className="text-xl font-bold text-[var(--color-text-primary)]">{groupsCompleted}</p>
          </div>
          <div className="flex-1 min-w-[120px] p-3 bg-[var(--color-surface-inner)] rounded-[var(--radius-inner)]">
            <p className="text-sm font-medium text-[var(--color-text-muted)]">CANCELLED</p>
            <p className="text-xl font-bold text-[var(--color-text-muted)]">{groupsCancelled}</p>
          </div>
        </div>
      </div>
      <div className="bg-[var(--color-surface)] p-4 rounded-[var(--radius-card)] lg:col-span-3">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-[var(--color-bg)] rounded-[var(--radius-inner)]"><ArrowRightLeft className="w-5 h-5 text-[var(--color-text-secondary)]" strokeWidth={1.5} /></div>
          <h3 className="text-sm font-semibold text-[var(--color-text-secondary)]">Transactions (50 dernières)</h3>
        </div>
        <p className="text-2xl font-bold text-[var(--color-text-primary)]">{transactions.length}</p>
      </div>
    </div>
  );

  const renderUtilisateurs = () => (
    <div className="p-4">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" strokeWidth={1.5} />
        <input 
          type="text" 
          placeholder="Rechercher par nom ou email..." 
          value={searchUser}
          onChange={(e) => setSearchUser(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-[var(--radius-field)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
        />
      </div>
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-card)] overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[var(--color-bg)] border-b border-[var(--color-divider)] text-sm font-normal text-[var(--color-text-secondary)]">
              <th className="p-4 font-medium">Utilisateur</th>
              <th className="p-4 font-medium">Tier</th>
              <th className="p-4 font-medium">Score Afiya</th>
              <th className="p-4 font-medium">KYC</th>
              <th className="p-4 font-medium">Solde USER_MAIN</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => {
              const userWallet = wallets.find(w => w.owner_id === user.id && w.wallet_type === 'USER_MAIN');
              return (
                <tr key={user.id} className="border-b border-[var(--color-bg)] hover:bg-[var(--color-surface-inner)]">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[var(--radius-avatar)] bg-[var(--color-primary)] text-white flex items-center justify-center text-sm font-bold shrink-0">
                        {getInitials(user.full_name)}
                      </div>
                      <div>
                        <p className="font-medium text-[var(--color-text-primary)]">{user.full_name}</p>
                        <p className="text-xs font-normal text-[var(--color-text-secondary)]">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-[var(--radius-badge)] text-xs font-medium ${
                      user.tier === 'PLATINUM' ? 'bg-[var(--color-bg)] text-[var(--color-text-primary)]' :
                      user.tier === 'GOLD' ? 'bg-[var(--color-bg)] text-[var(--color-text-primary)]' :
                      user.tier === 'SILVER' ? 'bg-[var(--color-bg)] text-[var(--color-text-secondary)]' :
                      'bg-[var(--color-bg)] text-[var(--color-text-muted)]'
                    }`}>
                      {user.tier || 'BRONZE'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{user.score_afiya || 50}/100</span>
                      <div className="w-24 h-2 bg-[var(--color-bg)] rounded-[var(--radius-badge)] overflow-hidden">
                        <div 
                          className="h-full bg-[var(--color-primary)]" 
                          style={{ width: `${user.score_afiya || 50}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-[var(--radius-badge)] text-xs font-medium ${
                      user.kyc_status === 'APPROVED' ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]' :
                      user.kyc_status === 'REJECTED' ? 'bg-[var(--color-surface-inner)] text-[var(--color-text-muted)]' :
                      'bg-[var(--color-bg)] text-[var(--color-text-secondary)]'
                    }`}>
                      {user.kyc_status || 'PENDING'}
                    </span>
                  </td>
                  <td className="p-4 font-medium text-[var(--color-text-primary)]">
                    {formatXOF(userWallet?.balance || 0)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderWallets = () => (
    <div className="p-4 space-y-6">
      {walletGroups.map(group => (
        <div key={group.type} className="bg-[var(--color-surface)] rounded-[var(--radius-card)] overflow-hidden">
          <div className="bg-[var(--color-bg)] p-4 border-b border-[var(--color-divider)] flex justify-between items-center">
            <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{group.type}</h3>
            <span className="font-bold text-[var(--color-primary)]">{formatXOF(group.total)}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-normal">
              <thead>
                <tr className="text-[var(--color-text-secondary)] border-b border-[var(--color-bg)]">
                  <th className="p-3 font-medium">ID</th>
                  <th className="p-3 font-medium">Group ID</th>
                  <th className="p-3 font-medium">Balance</th>
                  <th className="p-3 font-medium">Updated At</th>
                </tr>
              </thead>
              <tbody>
                {group.wallets.map(w => (
                  <tr key={w.id} className="border-b border-[var(--color-bg)] hover:bg-[var(--color-surface-inner)]">
                    <td className="p-3 font-mono text-xs font-normal text-[var(--color-text-secondary)]">{w.id.substring(0, 8)}...</td>
                    <td className="p-3 font-mono text-xs font-normal text-[var(--color-text-secondary)]">{w.group_id ? `${w.group_id.substring(0, 8)}...` : '-'}</td>
                    <td className="p-3 font-medium text-[var(--color-text-primary)]">{formatXOF(w.balance)}</td>
                    <td className="p-3 text-[var(--color-text-secondary)]">{formatDate(w.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );

  const renderCercles = () => (
    <div className="p-4 space-y-4">
      {groups.map(group => {
        const isExpanded = expandedGroups.includes(group.id);
        const groupMembers = members.filter(m => m.group_id === group.id);
        const activeCycle = cycles.find(c => c.group_id === group.id && c.status === 'ACTIVE');
        
        return (
          <div key={group.id} className="bg-[var(--color-surface)] rounded-[var(--radius-card)] overflow-hidden">
            <div 
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-[var(--color-surface-inner)]"
              onClick={() => toggleGroup(group.id)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{group.name}</h3>
                  <span className={`px-2 py-0.5 rounded-[var(--radius-badge)] text-xs font-medium ${
                    group.status === 'ACTIVE' ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]' :
                    group.status === 'FORMING' ? 'bg-[var(--color-bg)] text-[var(--color-text-secondary)]' :
                    group.status === 'COMPLETED' ? 'bg-[var(--color-surface-inner)] text-[var(--color-text-primary)]' :
                    group.status === 'CANCELLED' ? 'bg-[var(--color-surface-inner)] text-[var(--color-text-muted)]' :
                    'bg-[var(--color-bg)] text-[var(--color-text-secondary)]'
                  }`}>
                    {group.status}
                  </span>
                  {group.status === 'FORMING' && group.invitation_code && (
                    <span className="px-2 py-0.5 bg-[var(--color-bg)] text-[var(--color-text-secondary)] rounded text-xs font-mono font-normal">
                      Code: {group.invitation_code}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm font-normal text-[var(--color-text-secondary)]">
                  <span>{formatXOF(group.contribution_amount)}</span>
                  <span>•</span>
                  <span>{group.frequency === 'WEEKLY' ? 'Hebdo' : group.frequency === 'MONTHLY' ? 'Mensuel' : 'Trimestriel'}</span>
                  <span>•</span>
                  <span>{groupMembers.length} / {group.target_members} membres</span>
                  <span>•</span>
                  <span>Cycle {group.current_cycle || 0} / {group.total_cycles}</span>
                </div>
              </div>
              {isExpanded ? <ChevronUp className="w-5 h-5 text-[var(--color-text-muted)]" strokeWidth={1.5} /> : <ChevronDown className="w-5 h-5 text-[var(--color-text-muted)]" strokeWidth={1.5} />}
            </div>
            
            {isExpanded && (
              <div className="p-4 bg-[var(--color-bg)] border-t border-[var(--color-divider)]">
                {activeCycle && (
                  <div className="mb-4 p-3 bg-[var(--color-surface)] rounded-[var(--radius-card)]">
                    <h4 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">Cycle Actif</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm font-normal">
                      <div>
                        <p className="text-[var(--color-text-secondary)]">Échéance</p>
                        <p className="font-medium text-[var(--color-text-primary)]">{formatDate(activeCycle.payment_due_date)}</p>
                      </div>
                      <div>
                        <p className="text-[var(--color-text-secondary)]">Attendu</p>
                        <p className="font-medium text-[var(--color-text-primary)]">{formatXOF(activeCycle.expected_total)}</p>
                      </div>
                      <div>
                        <p className="text-[var(--color-text-secondary)]">Récolté</p>
                        <p className="font-medium text-[var(--color-primary)]">{formatXOF(activeCycle.actual_total || 0)}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <h4 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">Membres ({groupMembers.length})</h4>
                <div className="bg-[var(--color-surface)] rounded-[var(--radius-card)] overflow-hidden">
                  <table className="w-full text-left text-sm font-normal">
                    <thead>
                      <tr className="bg-[var(--color-bg)] border-b border-[var(--color-divider)] text-[var(--color-text-secondary)]">
                        <th className="p-2 font-medium">User ID</th>
                        <th className="p-2 font-medium">Position</th>
                        <th className="p-2 font-medium">Statut</th>
                        <th className="p-2 font-medium">Caution Initiale</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupMembers.map(m => (
                        <tr key={m.id} className="border-b border-[var(--color-bg)] last:border-0">
                          <td className="p-2 font-mono text-xs font-normal text-[var(--color-text-secondary)]">{m.user_id.substring(0, 8)}...</td>
                          <td className="p-2 text-[var(--color-text-primary)]">{m.draw_position || '-'}</td>
                          <td className="p-2">
                            <span className={`px-2 py-0.5 rounded-[var(--radius-badge)] text-xs ${
                              m.status === 'ACTIVE' ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]' :
                              m.status === 'PENDING_PAYMENT' ? 'bg-[var(--color-bg)] text-[var(--color-text-secondary)]' :
                              'bg-[var(--color-surface-inner)] text-[var(--color-text-muted)]'
                            }`}>
                              {m.status}
                            </span>
                          </td>
                          <td className="p-2 text-[var(--color-text-primary)]">{formatXOF(m.initial_deposit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderTransactions = () => {
    const types = ['Tous', 'DEPOSIT', 'WITHDRAWAL', 'CONTRIBUTION', 'PAYOUT', 'CAUTION', 'PENALTY', 'REFUND', 'MINI_FUND_CONTRIB', 'GLOBAL_FUND_CONTRIB', 'GLOBAL_FUND_USAGE', 'DEPOSIT_SEIZURE'];
    
    const getTypeColor = (type: string) => {
      switch(type) {
        case 'DEPOSIT': return 'bg-[var(--color-primary-light)] text-[var(--color-primary)]';
        case 'WITHDRAWAL': return 'bg-[var(--color-bg)] text-[var(--color-text-secondary)]';
        case 'CONTRIBUTION': return 'bg-[var(--color-primary-light)] text-[var(--color-primary)]';
        case 'PAYOUT': return 'bg-[var(--color-primary-light)] text-[var(--color-primary)]';
        case 'CAUTION': return 'bg-[var(--color-bg)] text-[var(--color-text-secondary)]';
        case 'PENALTY': return 'bg-[var(--color-surface-inner)] text-[var(--color-text-muted)]';
        case 'REFUND': return 'bg-[var(--color-bg)] text-[var(--color-text-primary)]';
        case 'MINI_FUND_CONTRIB': return 'bg-[var(--color-bg)] text-[var(--color-text-secondary)]';
        case 'GLOBAL_FUND_CONTRIB': return 'bg-[var(--color-bg)] text-[var(--color-text-secondary)]';
        case 'GLOBAL_FUND_USAGE': return 'bg-[var(--color-surface-inner)] text-[var(--color-text-muted)]';
        case 'DEPOSIT_SEIZURE': return 'bg-[var(--color-surface-inner)] text-[var(--color-text-muted)]';
        default: return 'bg-[var(--color-bg)] text-[var(--color-text-secondary)]';
      }
    };

    return (
      <div className="p-4">
        <div className="mb-4">
          <select 
            value={txFilter} 
            onChange={(e) => setTxFilter(e.target.value)}
            className="w-full md:w-auto px-4 py-2 rounded-[var(--radius-field)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 bg-[var(--color-surface)]"
          >
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-card)] overflow-x-auto">
          <table className="w-full text-left text-sm font-normal">
            <thead>
              <tr className="bg-[var(--color-bg)] border-b border-[var(--color-divider)] text-[var(--color-text-secondary)]">
                <th className="p-4 font-medium">Type</th>
                <th className="p-4 font-medium">Montant</th>
                <th className="p-4 font-medium">Description</th>
                <th className="p-4 font-medium">Trajet (From → To)</th>
                <th className="p-4 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredTx.map(tx => (
                <tr key={tx.id} className="border-b border-[var(--color-bg)] hover:bg-[var(--color-surface-inner)]">
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-[var(--radius-badge)] text-xs font-medium whitespace-nowrap ${getTypeColor(tx.type)}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="p-4 font-medium text-[var(--color-text-primary)] whitespace-nowrap">
                    {formatXOF(tx.amount)}
                  </td>
                  <td className="p-4 text-[var(--color-text-secondary)] max-w-xs truncate" title={tx.description}>
                    {tx.description}
                  </td>
                  <td className="p-4 font-mono text-xs font-normal text-[var(--color-text-secondary)] whitespace-nowrap">
                    {tx.from_wallet_id ? tx.from_wallet_id.substring(0, 8) : 'SYSTEM'} 
                    {' → '} 
                    {tx.to_wallet_id ? tx.to_wallet_id.substring(0, 8) : 'SYSTEM'}
                  </td>
                  <td className="p-4 text-[var(--color-text-secondary)] whitespace-nowrap">
                    {formatDate(tx.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-[var(--color-bg)]">
      {/* Header */}
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/home')}
            className="p-2 hover:bg-[var(--color-bg)] rounded-[var(--radius-btn)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--color-text-secondary)]" strokeWidth={1.5} />
          </button>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Dashboard Admin</h1>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-[var(--color-primary-light)] rounded-[var(--radius-badge)]">
          <div className="w-2 h-2 bg-[var(--color-primary)] rounded-[var(--radius-badge)] animate-pulse" />
          <span className="text-xs font-bold text-[var(--color-primary)] tracking-wide">LIVE</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] shrink-0 overflow-x-auto hide-scrollbar">
        <div className="flex px-2 min-w-max">
          {['synthèse', 'utilisateurs', 'wallets', 'cercles', 'transactions'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab 
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]' 
                  : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'synthèse' && renderSynthese()}
        {activeTab === 'utilisateurs' && renderUtilisateurs()}
        {activeTab === 'wallets' && renderWallets()}
        {activeTab === 'cercles' && renderCercles()}
        {activeTab === 'transactions' && renderTransactions()}
      </div>
    </div>
  );
}
