import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatXOF = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' FCFA';
};

export const formatDate = (date: any) => {
  if (!date) return '';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
};

export const formatRelative = (date: any) => {
  if (!date) return '';
  const d = date.toDate ? date.toDate() : new Date(date);
  const diff = d.getTime() - Date.now();
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `dans ${days} jour${days > 1 ? 's' : ''}`;
  const hours = Math.floor(diff / 3600000);
  if (hours > 0) return `dans ${hours}h`;
  return 'maintenant';
};

export const getTierCoeff = (tier: string) => {
  switch(tier) {
    case 'PLATINUM': return 0.25;
    case 'GOLD': return 0.5;
    case 'SILVER': return 0.75;
    default: return 1.0;
  }
};

export const getTierLimits = (tier: string) => {
  switch(tier) {
    case 'PLATINUM': return { maxContrib: Infinity, maxMembers: 30 };
    case 'GOLD': return { maxContrib: 2000000, maxMembers: 30 };
    case 'SILVER': return { maxContrib: 1000000, maxMembers: 20 };
    default: return { maxContrib: 500000, maxMembers: 10 };
  }
};
