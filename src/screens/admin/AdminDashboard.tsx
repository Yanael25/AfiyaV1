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
        navigate('/wallet');
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
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-50 rounded-lg"><Users className="w-5 h-5 text-blue-600" /></div>
          <h3 className="text-gray-500 font-medium">Total Utilisateurs</h3>
        </div>
        <p className="text-2xl font-bold text-gray-900">{totalUsers}</p>
      </div>
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-emerald-50 rounded-lg"><Wallet className="w-5 h-5 text-emerald-600" /></div>
          <h3 className="text-gray-500 font-medium">Total USER_MAIN</h3>
        </div>
        <p className="text-2xl font-bold text-gray-900">{formatXOF(totalUserMainBalance)}</p>
      </div>
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-purple-50 rounded-lg"><Shield className="w-5 h-5 text-purple-600" /></div>
          <h3 className="text-gray-500 font-medium">Solde GLOBAL_FUND</h3>
        </div>
        <p className="text-2xl font-bold text-gray-900">{formatXOF(globalFundBalance)}</p>
      </div>
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-orange-50 rounded-lg"><Clock className="w-5 h-5 text-orange-600" /></div>
          <h3 className="text-gray-500 font-medium">Total ESCROW_CONSTITUTION</h3>
        </div>
        <p className="text-2xl font-bold text-gray-900">{formatXOF(totalEscrow)}</p>
      </div>
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-50 rounded-lg"><Repeat className="w-5 h-5 text-indigo-600" /></div>
          <h3 className="text-gray-500 font-medium">Total CONTRIBUTION_POOL</h3>
        </div>
        <p className="text-2xl font-bold text-gray-900">{formatXOF(totalContribPool)}</p>
      </div>
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-teal-50 rounded-lg"><Activity className="w-5 h-5 text-teal-600" /></div>
          <h3 className="text-gray-500 font-medium">Total GROUP_MINI_FUND</h3>
        </div>
        <p className="text-2xl font-bold text-gray-900">{formatXOF(totalMiniFund)}</p>
      </div>
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 md:col-span-2 lg:col-span-3">
        <h3 className="text-gray-500 font-medium mb-4">Statut des Cercles</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[120px] p-3 bg-orange-50 rounded-lg border border-orange-100">
            <p className="text-sm text-orange-600 font-medium">FORMING</p>
            <p className="text-xl font-bold text-orange-900">{groupsForming}</p>
          </div>
          <div className="flex-1 min-w-[120px] p-3 bg-green-50 rounded-lg border border-green-100">
            <p className="text-sm text-green-600 font-medium">ACTIVE</p>
            <p className="text-xl font-bold text-green-900">{groupsActive}</p>
          </div>
          <div className="flex-1 min-w-[120px] p-3 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-sm text-blue-600 font-medium">COMPLETED</p>
            <p className="text-xl font-bold text-blue-900">{groupsCompleted}</p>
          </div>
          <div className="flex-1 min-w-[120px] p-3 bg-red-50 rounded-lg border border-red-100">
            <p className="text-sm text-red-600 font-medium">CANCELLED</p>
            <p className="text-xl font-bold text-red-900">{groupsCancelled}</p>
          </div>
        </div>
      </div>
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 lg:col-span-3">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gray-50 rounded-lg"><ArrowRightLeft className="w-5 h-5 text-gray-600" /></div>
          <h3 className="text-gray-500 font-medium">Transactions (50 dernières)</h3>
        </div>
        <p className="text-2xl font-bold text-gray-900">{transactions.length}</p>
      </div>
    </div>
  );

  const renderUtilisateurs = () => (
    <div className="p-4">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input 
          type="text" 
          placeholder="Rechercher par nom ou email..." 
          value={searchUser}
          onChange={(e) => setSearchUser(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#047857]"
        />
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500">
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
                <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#047857] text-white flex items-center justify-center font-bold text-sm shrink-0">
                        {getInitials(user.full_name)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.full_name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.tier === 'PLATINUM' ? 'bg-cyan-100 text-cyan-800' :
                      user.tier === 'GOLD' ? 'bg-yellow-100 text-yellow-800' :
                      user.tier === 'SILVER' ? 'bg-gray-200 text-gray-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {user.tier || 'BRONZE'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{user.score_afiya || 50}/100</span>
                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#047857]" 
                          style={{ width: `${user.score_afiya || 50}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.kyc_status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                      user.kyc_status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {user.kyc_status || 'PENDING'}
                    </span>
                  </td>
                  <td className="p-4 font-medium text-gray-900">
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
        <div key={group.type} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-gray-900">{group.type}</h3>
            <span className="font-bold text-[#047857]">{formatXOF(group.total)}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-50">
                  <th className="p-3 font-medium">ID</th>
                  <th className="p-3 font-medium">Group ID</th>
                  <th className="p-3 font-medium">Balance</th>
                  <th className="p-3 font-medium">Updated At</th>
                </tr>
              </thead>
              <tbody>
                {group.wallets.map(w => (
                  <tr key={w.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="p-3 font-mono text-xs text-gray-600">{w.id.substring(0, 8)}...</td>
                    <td className="p-3 font-mono text-xs text-gray-500">{w.group_id ? `${w.group_id.substring(0, 8)}...` : '-'}</td>
                    <td className="p-3 font-medium text-gray-900">{formatXOF(w.balance)}</td>
                    <td className="p-3 text-gray-500">{formatDate(w.updated_at)}</td>
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
          <div key={group.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div 
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
              onClick={() => toggleGroup(group.id)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-bold text-gray-900">{group.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    group.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                    group.status === 'FORMING' ? 'bg-orange-100 text-orange-800' :
                    group.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                    group.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {group.status}
                  </span>
                  {group.status === 'FORMING' && group.invitation_code && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-mono">
                      Code: {group.invitation_code}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{formatXOF(group.contribution_amount)}</span>
                  <span>•</span>
                  <span>{group.frequency === 'WEEKLY' ? 'Hebdo' : group.frequency === 'MONTHLY' ? 'Mensuel' : 'Trimestriel'}</span>
                  <span>•</span>
                  <span>{groupMembers.length} / {group.target_members} membres</span>
                  <span>•</span>
                  <span>Cycle {group.current_cycle || 0} / {group.total_cycles}</span>
                </div>
              </div>
              {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </div>
            
            {isExpanded && (
              <div className="p-4 bg-gray-50 border-t border-gray-100">
                {activeCycle && (
                  <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Cycle Actif</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Échéance</p>
                        <p className="font-medium">{formatDate(activeCycle.payment_due_date)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Attendu</p>
                        <p className="font-medium">{formatXOF(activeCycle.expected_total)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Récolté</p>
                        <p className="font-medium text-[#047857]">{formatXOF(activeCycle.actual_total || 0)}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Membres ({groupMembers.length})</h4>
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-gray-500">
                        <th className="p-2 font-medium">User ID</th>
                        <th className="p-2 font-medium">Position</th>
                        <th className="p-2 font-medium">Statut</th>
                        <th className="p-2 font-medium">Caution Initiale</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupMembers.map(m => (
                        <tr key={m.id} className="border-b border-gray-50 last:border-0">
                          <td className="p-2 font-mono text-xs">{m.user_id.substring(0, 8)}...</td>
                          <td className="p-2">{m.draw_position || '-'}</td>
                          <td className="p-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              m.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                              m.status === 'PENDING_PAYMENT' ? 'bg-orange-100 text-orange-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {m.status}
                            </span>
                          </td>
                          <td className="p-2">{formatXOF(m.initial_deposit)}</td>
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
        case 'DEPOSIT': return 'bg-green-100 text-green-800';
        case 'WITHDRAWAL': return 'bg-gray-100 text-gray-800';
        case 'CONTRIBUTION': return 'bg-blue-100 text-blue-800';
        case 'PAYOUT': return 'bg-emerald-100 text-emerald-800';
        case 'CAUTION': return 'bg-orange-100 text-orange-800';
        case 'PENALTY': return 'bg-red-100 text-red-800';
        case 'REFUND': return 'bg-purple-100 text-purple-800';
        case 'MINI_FUND_CONTRIB': return 'bg-indigo-100 text-indigo-800';
        case 'GLOBAL_FUND_CONTRIB': return 'bg-pink-100 text-pink-800';
        case 'GLOBAL_FUND_USAGE': return 'bg-red-900 text-white';
        case 'DEPOSIT_SEIZURE': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };

    return (
      <div className="p-4">
        <div className="mb-4">
          <select 
            value={txFilter} 
            onChange={(e) => setTxFilter(e.target.value)}
            className="w-full md:w-auto px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#047857] bg-white"
          >
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500">
                <th className="p-4 font-medium">Type</th>
                <th className="p-4 font-medium">Montant</th>
                <th className="p-4 font-medium">Description</th>
                <th className="p-4 font-medium">Trajet (From → To)</th>
                <th className="p-4 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredTx.map(tx => (
                <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getTypeColor(tx.type)}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="p-4 font-medium text-gray-900 whitespace-nowrap">
                    {formatXOF(tx.amount)}
                  </td>
                  <td className="p-4 text-gray-600 max-w-xs truncate" title={tx.description}>
                    {tx.description}
                  </td>
                  <td className="p-4 font-mono text-xs text-gray-500 whitespace-nowrap">
                    {tx.from_wallet_id ? tx.from_wallet_id.substring(0, 8) : 'SYSTEM'} 
                    {' → '} 
                    {tx.to_wallet_id ? tx.to_wallet_id.substring(0, 8) : 'SYSTEM'}
                  </td>
                  <td className="p-4 text-gray-500 whitespace-nowrap">
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
    <div className="flex flex-col h-[100dvh] bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/wallet')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Dashboard Admin</h1>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 rounded-full">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs font-bold text-green-700 tracking-wide">LIVE</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 shrink-0 overflow-x-auto hide-scrollbar">
        <div className="flex px-2 min-w-max">
          {['synthèse', 'utilisateurs', 'wallets', 'cercles', 'transactions'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab 
                  ? 'border-[#047857] text-[#047857]' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
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
