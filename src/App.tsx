/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, doc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { Splash } from './screens/auth/Splash';
import { Welcome } from './screens/auth/Welcome';
import { Login } from './screens/auth/Login';
import { Signup } from './screens/auth/Signup';
import { Kyc } from './screens/auth/Kyc';
import { Home } from './screens/tabs/Home';
import { Wallet } from './screens/tabs/Wallet';
import { Tontines } from './screens/tabs/Tontines';
import { Patrimoine } from './screens/tabs/Patrimoine';
import { Profile } from './screens/tabs/Profile';
import { GroupDetail } from './screens/group/GroupDetail';
import { CreateGroup } from './screens/group/CreateGroup';
import { JoinGroup } from './screens/group/JoinGroup';
import { AdjustDeposit } from './screens/group/AdjustDeposit';
import { AdminDashboard } from './screens/admin/AdminDashboard';
import { TabBar } from './components/TabBar';

import { StatusBar } from './components/StatusBar';

function AuthContainer() {
  return (
    <div className="min-h-[100dvh] bg-[#F5F0E8] flex justify-center antialiased">
      <div className="w-full max-w-md h-[100dvh] bg-[#F5F0E8] sm:shadow-2xl overflow-hidden relative flex flex-col">
        <div className="md:hidden">
          <StatusBar />
        </div>
        <div className="flex-1 overflow-hidden flex flex-col pt-10 md:pt-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function AppContainer() {
  return (
    <div className="min-h-[100dvh] bg-[#F5F0E8] flex justify-center antialiased">
      <div className="w-full h-[100dvh] bg-[#F5F0E8] overflow-hidden relative flex flex-col">
        <div className="md:hidden">
          <StatusBar />
        </div>
        <div className="flex-1 overflow-hidden flex flex-col pt-10 md:pt-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function TabLayout() {
  return (
    <div className="flex flex-col lg:flex-row h-full bg-[#F5F0E8] relative w-full max-w-[1200px] mx-auto">
      {/* Sidebar for PC */}
      <div className="hidden lg:flex w-64 border-r border-[#E5E7EB] bg-[#F5F0E8] h-full flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#064E3B] rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <span className="text-xl font-bold text-[#111827]">Afiya</span>
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
          <Route path="/wallet" element={<Wallet />} />

          {/* Group Flow */}
          <Route path="/group/:id" element={<GroupDetail />} />
          <Route path="/group/:id/adjust-deposit" element={<AdjustDeposit />} />
          <Route path="/group/create" element={<CreateGroup />} />
          <Route path="/group/join" element={<JoinGroup />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
