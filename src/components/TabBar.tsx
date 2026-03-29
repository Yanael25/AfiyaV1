import { NavLink } from 'react-router-dom';
import { Home, CircleDot, Landmark, User } from 'lucide-react';

export function TabBar({ isSidebar = false }: { isSidebar?: boolean }) {
  const tabs = [
    { to: '/home', icon: Home, label: 'Home' },
    { to: '/tontines', icon: CircleDot, label: 'Cercles' },
    { to: '/patrimoine', icon: Landmark, label: 'Capital' },
    { to: '/profile', icon: User, label: 'Profil' },
  ];

  if (isSidebar) {
    return (
      <div className="flex flex-col gap-2 px-4 py-6 bg-[#1C1410] h-full">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `flex items-center gap-4 px-4 py-2.5 transition-all duration-200 ${
                isActive
                  ? "text-[#047857] font-semibold"
                  : "text-[#7C6F5E] font-normal hover:bg-[#2C2018] rounded-xl"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <tab.icon 
                  size={24} 
                  strokeWidth={isActive ? 2 : 1.5} 
                  color={isActive ? '#047857' : '#7C6F5E'} 
                />
                <span className="text-base">{tab.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-[#1C1410] border-t border-[#2C2018]
                     flex items-center justify-around
                     px-4 py-3 pb-5">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className="flex flex-col items-center gap-1"
        >
          {({ isActive }) => (
            <>
              <tab.icon
                size={22}
                strokeWidth={isActive ? 2 : 1.5}
                color={isActive ? '#047857' : '#7C6F5E'}
              />
              <span className={`text-[10px] tracking-wide
                ${isActive
                  ? 'font-semibold text-[#047857]'
                  : 'font-normal text-[#7C6F5E]'
                }`}>
                {tab.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
}
