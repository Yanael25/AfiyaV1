import { NavLink } from 'react-router-dom';
import { Wallet, CircleDot, Landmark, User } from 'lucide-react';

export function TabBar({ isSidebar = false }: { isSidebar?: boolean }) {
  const tabs = [
    { to: '/home', icon: Wallet, label: 'Wallet' },
    { to: '/tontines', icon: CircleDot, label: 'Cercles' },
    { to: '/patrimoine', icon: Landmark, label: 'Capital' },
    { to: '/profile', icon: User, label: 'Profil' },
  ];

  if (isSidebar) {
    return (
      <div className="flex flex-col gap-2 px-4 py-6 bg-[var(--color-surface)] h-full">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `flex items-center gap-4 px-4 py-2.5 transition-all duration-200 ${
                isActive
                  ? "text-[var(--color-primary)] font-semibold"
                  : "text-[var(--color-text-muted)] font-normal hover:bg-[var(--color-surface-inner)] rounded-[var(--radius-btn)]"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <tab.icon 
                  size={24} 
                  strokeWidth={1.5} 
                  className={isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'} 
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
    <div className="fixed bottom-0 left-0 right-0 h-[72px] bg-[var(--color-surface)] border-t border-[var(--color-divider)] px-2 pb-[10px] flex items-center justify-around z-50">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className="flex flex-col items-center justify-center gap-1 w-full h-full"
        >
          {({ isActive }) => (
            <>
              <tab.icon
                size={22}
                strokeWidth={1.5}
                className={isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-placeholder)]'}
              />
              <span className={`text-[10px] ${isActive ? 'font-bold text-[var(--color-primary)]' : 'font-medium text-[var(--color-text-placeholder)]'}`}>
                {tab.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
}
