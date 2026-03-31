import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Wallet, Users, TrendingUp, User } from 'lucide-react';

export function TabBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { id: 'wallet', path: '/home', icon: Wallet, label: 'Wallet' },
    { id: 'cercles', path: '/tontines', icon: Users, label: 'Cercles' },
    { id: 'capital', path: '/patrimoine', icon: TrendingUp, label: 'Capital' },
    { id: 'profil', path: '/profile', icon: User, label: 'Profil' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[72px] bg-white flex items-center justify-around pb-2.5 px-2 z-50 font-sans">
      {tabs.map((tab) => {
        // Détecte si la route actuelle correspond à l'onglet
        const isActive = location.pathname.startsWith(tab.path);
        const Icon = tab.icon;
        
        return (
          <div
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className="flex flex-col items-center gap-1 flex-1 cursor-pointer py-2 transition-opacity active:opacity-80"
          >
            <Icon
              size={22}
              strokeWidth={1.5}
              color={isActive ? '#047857' : '#A39887'}
            />
            <span
              className={`text-[10px] font-semibold ${
                isActive ? 'text-[#047857]' : 'text-[#A39887]'
              }`}
            >
              {tab.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}