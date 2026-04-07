import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CreditCard, Users, LineChart, User } from 'lucide-react';

export function TabBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { id: 'wallet', path: '/home', icon: CreditCard, label: 'Wallet' },
    { id: 'cercles', path: '/tontines', icon: Users, label: 'Cercles' },
    { id: 'capital', path: '/patrimoine', icon: LineChart, label: 'Capital' },
    { id: 'profil', path: '/profile', icon: User, label: 'Profil' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[80px] bg-[#FAFAF8]/85 backdrop-blur-xl border-t border-white/60 flex items-center justify-around pb-4 pt-2 px-2 z-50 font-sans shadow-[0_-4px_24px_rgba(0,0,0,0.02)]">
      {tabs.map((tab) => {
        // Détecte si la route actuelle correspond à l'onglet
        const isActive = location.pathname.startsWith(tab.path);
        const Icon = tab.icon;
        
        return (
          <div
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className="flex flex-col items-center justify-center gap-1.5 flex-1 h-full cursor-pointer transition-all duration-300 active:scale-95"
          >
            <div className={`relative flex items-center justify-center w-12 h-8 rounded-full transition-colors duration-300 ${isActive ? 'bg-[#047857]/10' : 'bg-transparent'}`}>
              <Icon
                size={22}
                strokeWidth={isActive ? 2 : 1.5}
                color={isActive ? '#047857' : '#A39887'}
                className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-100'}`}
              />
            </div>
            <span
              className={`text-[10px] font-bold tracking-wide transition-colors duration-300 ${
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