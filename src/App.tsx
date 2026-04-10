/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, doc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { apply_score_decay } from './lib/businessLogic';
import { Splash } from './screens/auth/Splash';
import { Welcome } from './screens/auth/Welcome';
import { Login } from './screens/auth/Login';
import { Signup } from './screens/auth/Signup';
import { Kyc } from './screens/auth/Kyc';
import { KycStep3 } from './screens/auth/KycStep3';
import { Home } from './screens/tabs/Home';
import { Tontines } from './screens/tabs/Tontines';
import { Patrimoine } from './screens/tabs/Patrimoine';
import { Profile } from './screens/tabs/Profile';
import { GroupDetail } from './screens/group/GroupDetail';
import { CreateGroup } from './screens/group/CreateGroup';
import { JoinGroup } from './screens/group/JoinGroup';
import { AdjustDeposit } from './screens/group/AdjustDeposit';
import { TirageAuSort } from './screens/group/TirageAuSort';
import { HistoriqueCercles } from './screens/group/HistoriqueCercles';
import { AdminDashboard } from './screens/admin/AdminDashboard';
import { Transfer } from './screens/wallet/Transfer';
import { Receive } from './screens/wallet/Receive';
import { Recharge } from './screens/wallet/Recharge';
import { Withdraw } from './screens/wallet/Withdraw';
import { AllTransactions } from './screens/wallet/AllTransactions';
import { TabBar } from './components/TabBar';

import { StatusBar } from './components/StatusBar';

function AuthContainer() {
  return (
    <div className="min-h-[100dvh] bg-[var(--color-bg)] flex justify-center antialiased">
      <div className="w-full max-w-md h-[100dvh] bg-[var(--color-bg)] overflow-hidden relative flex flex-col">
        {/* StatusBar fixée en haut, opaque, qui masque tout ce qui passe dessous */}
        <div className="md:hidden absolute top-0 left-0 right-0 z-[999] bg-[var(--color-bg)]">
          <StatusBar />
        </div>
        {/* Suppression du pt-10 pour laisser les écrans gérer leur propre padding */}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function AppContainer() {
  return (
    <div className="min-h-[100dvh] bg-[var(--color-bg)] flex justify-center antialiased">
      <div className="w-full h-[100dvh] bg-[var(--color-bg)] overflow-hidden relative flex flex-col">
        {/* StatusBar fixée en haut, opaque, qui masque tout ce qui passe dessous */}
        <div className="md:hidden absolute top-0 left-0 right-0 z-[999] bg-[var(--color-bg)]">
          <StatusBar />
        </div>
        {/* Suppression du pt-10 pour laisser les écrans gérer leur propre padding */}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function TabLayout() {
  return (
    <div className="flex flex-col lg:flex-row h-full bg-[var(--color-bg)] relative w-full max-w-[1200px] mx-auto">
      {/* Sidebar for PC */}
      <div className="hidden lg:flex w-64 border-r border-[var(--color-border)] bg-[var(--color-surface)] h-full flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--color-primary)] rounded-[var(--radius-card)] flex items-center justify-center">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <span className="text-xl font-bold text-[var(--color-text-primary)]">Afiya</span>
        </div>
        <TabBar isSidebar={true} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pb-24 lg:pb-0">
        <Outlet />
      </div>

      {/* Bottom Nav for Mobile/Tablet */}
      <div className="lg:hidden absolute bottom-0 left-0 right-0 z-50">
        <TabBar isSidebar={false} />
      </div>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      // Appliquer la décroissance du score à chaque connexion
      apply_score_decay(user.uid).catch(console.error);

      // Only attempt initialization if the user is the primary admin
      if (user.email !== "jespere20000@gmail.com") return;

      try {
        const walletsRef = collection(db, 'wallets');
        const q = query(walletsRef, where('wallet_type', '==', 'GLOBAL_FUND'));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          console.log('Initializing Global Fund Wallet...');
          const globalFundRef = doc(db, 'wallets', 'global_fund_main');
          await setDoc(globalFundRef, {
            id: 'global_fund_main',
            owner_id: 'SYSTEM',
            group_id: null,
            wallet_type: 'GLOBAL_FUND',
            balance: 0,
            currency: 'XOF',
            created_at: new Date()
          });
        }
      } catch (error) {
        console.error('Error initializing Global Fund:', error);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Flow */}
        <Route element={<AuthContainer />}>
          <Route path="/" element={<Navigate to="/splash" replace />} />
          <Route path="/splash" element={<Splash />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/kyc" element={<Kyc />} />
          <Route path="/kyc-step-3" element={<KycStep3 />} />
        </Route>

        {/* App Flow */}
        <Route element={<AppContainer />}>
          {/* Tab Flow */}
          <Route element={<TabLayout />}>
            <Route path="/home" element={<Home />} />
            <Route path="/tontines" element={<Tontines />} />
            <Route path="/patrimoine" element={<Patrimoine />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          {/* Sub-pages */}
          <Route path="/cercles/historique" element={<HistoriqueCercles />} />

          {/* Group Flow */}
          <Route path="/group/:id" element={<GroupDetail />} />
          <Route path="/group/:id/adjust-deposit" element={<AdjustDeposit />} />
          <Route path="/tirage/:groupId" element={<TirageAuSort />} />
          <Route path="/group/create" element={<CreateGroup />} />
          <Route path="/group/join" element={<JoinGroup />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/wallet/transfer" element={<Transfer />} />
          <Route path="/wallet/receive" element={<Receive />} />
          <Route path="/wallet/recharge" element={<Recharge />} />
          <Route path="/wallet/withdraw" element={<Withdraw />} />
          <Route path="/wallet/transactions" element={<AllTransactions />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}