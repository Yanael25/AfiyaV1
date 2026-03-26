import { NavLink } from 'react-router-dom';
import { Wallet, Users, Briefcase, User } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { auth } from '@/src/lib/firebase';

export function TabBar({ isSidebar = false }: { isSidebar?: boolean }) {
  const tabs = [
    { to: '/wallet', icon: Wallet, label: 'Wallet' },
    { to: '/tontines', icon: Users, label: 'Tontines' },
    { to: '/patrimoine', icon: Briefcase, label: 'Patrimoine' },
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
                  ? "bg-[#047857]/10 text-[#047857] font-semibold" 
                  : "text-[#6B7280] hover:bg-gray-50 hover:text-[#374151] font-medium"
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
    <div className="h-24 bg-white/90 backdrop-blur-xl border-t border-[#E5E7EB]/50 flex items-start justify-around px-2 pt-3 pb-8">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center w-16 gap-1.5 transition-all duration-200",
              isActive ? "text-[#047857]" : "text-[#9CA3AF] hover:text-[#4B5563]"
            )
          }
        >
          {({ isActive }) => (
            <>
              <div className="relative">
                <tab.icon size={26} strokeWidth={isActive ? 2.5 : 1.5} className={cn("transition-transform duration-200", isActive && "scale-110")} />
                {isActive && (
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#047857] rounded-full" />
                )}
              </div>
              <span className={cn("text-[10px] tracking-wide", isActive ? "font-semibold" : "font-medium")}>
                {tab.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
}
