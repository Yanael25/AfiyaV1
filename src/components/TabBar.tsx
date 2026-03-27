import { NavLink } from 'react-router-dom';
import { Wallet, Users, TrendingUp, User } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export function TabBar({ isSidebar = false }: { isSidebar?: boolean }) {
  const tabs = [
    { to: '/wallet', icon: Wallet, label: 'Wallet' },
    { to: '/tontines', icon: Users, label: 'Cercles' },
    { to: '/patrimoine', icon: TrendingUp, label: 'Capital' },
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
                "flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200",
                isActive 
                  ? "bg-[#ECFDF5] text-[#047857] font-semibold" 
                  : "text-[#64748B] hover:bg-[#F8FAFC] font-medium"
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
    <div className="h-20 bg-white/95 backdrop-blur-xl border-t border-[#E2E8F0] flex items-start justify-around px-2 pt-3 pb-5 relative z-50">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className="flex flex-col items-center w-16 gap-1 relative"
        >
          {({ isActive }) => (
            <>
              <div className="relative flex items-center justify-center w-10 h-8">
                {isActive && (
                  <motion.div
                    layoutId="tabPill"
                    className="absolute inset-0 bg-[#ECFDF5] rounded-xl z-0"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <motion.div
                  animate={{ scale: isActive ? 1.05 : 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="relative z-10 flex items-center justify-center"
                >
                  <tab.icon 
                    size={24} 
                    strokeWidth={isActive ? 2.5 : 1.5} 
                    color={isActive ? "#047857" : "#94A3B8"} 
                  />
                </motion.div>
              </div>
              <span className={cn(
                "text-[10px] tracking-wide", 
                isActive ? "font-semibold text-[#047857]" : "font-medium text-[#94A3B8]"
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
