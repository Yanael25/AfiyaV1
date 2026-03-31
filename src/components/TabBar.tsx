import { useNavigate, useLocation } from 'react-router-dom';
import { Wallet, Users, TrendingUp, User } from 'lucide-react';

export function TabBar({ isSidebar = false }: { isSidebar?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { id: 'wallet', path: '/home', icon: Wallet, label: 'Wallet' },
    { id: 'cercles', path: '/tontines', icon: Users, label: 'Cercles' },
    { id: 'capital', path: '/patrimoine', icon: TrendingUp, label: 'Capital' },
    { id: 'profil', path: '/profile', icon: User, label: 'Profil' },
  ];

  if (isSidebar) {
    return (
      <div className="flex flex-col gap-2 px-4 py-6 bg-white h-full font-['Manrope',_sans-serif]">
        {tabs.map((tab) => {
          const isActive = location.pathname.startsWith(tab.path);
          const Icon = tab.icon;
          return (
            <div
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`flex items-center gap-4 px-4 py-2.5 cursor-pointer transition-colors duration-200 ${
                isActive ? "text-[#047857] font-semibold" : "text-[#A39887] font-normal hover:bg-gray-50 rounded-xl"
              }`}
            >
              <Icon 
                size={24} 
                strokeWidth={1.5} 
                color={isActive ? '#047857' : '#A39887'} 
              />
              <span className="text-base">{tab.label}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[72px] bg-white flex items-center justify-around pb-2.5 px-2 z-50 font-['Manrope',_sans-serif] border-t border-gray-100">
      {tabs.map((tab) => {
        const isActive = location.pathname.startsWith(tab.path);
        const Icon = tab.icon;
        return (
          <div
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className="flex flex-col items-center gap-1 flex-1 cursor-pointer py-2"
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
