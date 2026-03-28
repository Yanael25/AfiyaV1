import { NavLink } from 'react-router-dom';
import { Home, CircleDot, Landmark, User } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export function TabBar({ isSidebar = false }: { isSidebar?: boolean }) {
  const tabs = [
    { to: '/home', icon: Home, label: 'Home' },
    { to: '/tontines', icon: CircleDot, label: 'Cercles' },
    { to: '/patrimoine', icon: Landmark, label: 'Capital' },
    { to: '/profile', icon: User, label: 'Profil' },
  ];

  if (isSidebar) {
    return (
      <div className="flex flex-col gap-2 px-4 py-6">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-200",
                isActive 
                  ? "bg-[#064E3B] text-white font-semibold" 
                  : "text-[#7C6F5E] hover:bg-[#F5F0E8] font-medium"
              )
            }
          >
            {({ isActive }) => (
              <>
                <tab.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-base">{tab.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    );
  }

  return (
    <div className="h-20 bg-white border-t border-[#E8E0D0] flex items-center justify-around px-4 pb-5 pt-2 relative z-50">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className="flex flex-col items-center gap-1 relative w-16 pt-1.5 pb-3"
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.div
                  layoutId="activePill"
                  className="absolute inset-x-0 top-0 bottom-3 bg-[#064E3B] rounded-2xl z-0"
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />
              )}
              <tab.icon 
                size={22} 
                strokeWidth={isActive ? 2 : 1.5} 
                color={isActive ? "#FFFFFF" : "#7C6F5E"} 
                className="z-10"
              />
              <span className={cn(
                "text-[10px] z-10", 
                isActive ? "font-semibold text-white" : "font-medium text-[#7C6F5E]"
              )}>
                {tab.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
}
