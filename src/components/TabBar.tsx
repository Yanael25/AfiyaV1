import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { CreditCard, Users, TrendingUp, User } from 'lucide-react';

const HIDDEN_ROUTES = ['/group', '/admin', '/kyc', '/login', '/signup', '/splash', '/welcome'];

const tabs = [
  { path: '/home',       icon: CreditCard, label: 'Wallet'  },
  { path: '/tontines',   icon: Users,      label: 'Cercles' },
  { path: '/patrimoine', icon: TrendingUp, label: 'Capital' },
  { path: '/profile',    icon: User,       label: 'Profil'  },
];

interface TabBarProps {
  isSidebar?: boolean;
}

export function TabBar({ isSidebar = false }: TabBarProps) {
  const location = useLocation();

  if (HIDDEN_ROUTES.some((r) => location.pathname.startsWith(r))) return null;

  if (isSidebar) {
    return (
      <nav style={{ fontFamily: 'Manrope, sans-serif' }} className="flex flex-col gap-1 px-3 mt-2">
        {tabs.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 12px',
              borderRadius: 12,
              textDecoration: 'none',
              background: isActive ? 'rgba(4,120,87,0.1)' : 'transparent',
              color: isActive ? '#047857' : '#A39887',
              fontWeight: isActive ? 700 : 500,
              fontSize: 14,
            })}
          >
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2 : 1.5} color={isActive ? '#047857' : '#A39887'} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    );
  }

  return (
    <div
      style={{
        height: 64,
        background: '#FFFFFF',
        borderTop: '0.5px solid #EDECEA',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: 14,
        paddingTop: 10,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-around',
        fontFamily: 'Manrope, sans-serif',
        zIndex: 50,
      }}
    >
      {tabs.map(({ path, icon: Icon, label }) => (
        <NavLink
          key={path}
          to={path}
          style={{ textDecoration: 'none', flex: 1 }}
        >
          {({ isActive }) => (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 44,
                  height: 28,
                  borderRadius: 9,
                  background: isActive ? 'rgba(4,120,87,0.1)' : 'transparent',
                  margin: '0 auto',
                }}
              >
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2 : 1.5}
                  color={isActive ? '#047857' : '#A39887'}
                />
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#047857' : '#A39887',
                  lineHeight: 1,
                }}
              >
                {label}
              </span>
            </div>
          )}
        </NavLink>
      ))}
    </div>
  );
}
