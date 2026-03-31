import React from 'react';
import { TrendingUp, Building2, BarChart2, PiggyBank, Briefcase } from 'lucide-react';

export function Patrimoine() {
  return (
    <div className="bg-[#FAFAF8] min-h-screen pb-[80px] flex flex-col font-sans">
      
      {/* HEADER */}
      <div className="pt-[52px] px-[24px] mb-0">
        <h1 className="text-[26px] font-extrabold text-[#1A1A1A] tracking-tight mb-1">
          Afiya Capital
        </h1>
        <p className="text-[13px] font-medium text-[#A39887]">
          Faites fructifier votre épargne.
        </p>
      </div>

      {/* CONTENU CENTRÉ */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        
        {/* Icône principale */}
        <div className="w-20 h-20 bg-[#F0FDF4] rounded-[28px] flex items-center justify-center mx-auto mb-6">
          <TrendingUp size={36} stroke="#047857" strokeWidth={1.5} />
        </div>

        {/* Titre */}
        <h2 className="text-[22px] font-extrabold text-[#1A1A1A] tracking-tight mb-3">
          Bientôt disponible
        </h2>

        {/* Description */}
        <p className="text-[14px] font-normal text-[#6B6B6B] leading-relaxed max-w-[260px] mx-auto mb-8">
          Investissez dans l'immobilier, la bourse, l'épargne+ et les PME locales. Afiya Capital arrive bientôt.
        </p>

        {/* 4 modules à venir */}
        <div className="grid grid-cols-2 gap-3 w-full mb-8">
          
          {/* Immobilier */}
          <div className="bg-white rounded-[20px] p-4 text-left opacity-60 relative">
            <div className="absolute top-3 right-3 bg-[#F5F4F2] text-[#A39887] text-[9px] font-bold uppercase tracking-[0.08em] px-2 py-0.5 rounded-[6px]">
              Bientôt
            </div>
            <div className="w-8 h-8 bg-[#F0FDF4] rounded-[10px] mb-2.5 flex items-center justify-center">
              <Building2 size={20} stroke="#047857" strokeWidth={1.5} />
            </div>
            <h3 className="text-[13px] font-bold text-[#1A1A1A] mb-1">Immobilier</h3>
            <p className="text-[11px] text-[#A39887]">Investissez dans la pierre</p>
          </div>

          {/* Bourse */}
          <div className="bg-white rounded-[20px] p-4 text-left opacity-60 relative">
            <div className="absolute top-3 right-3 bg-[#F5F4F2] text-[#A39887] text-[9px] font-bold uppercase tracking-[0.08em] px-2 py-0.5 rounded-[6px]">
              Bientôt
            </div>
            <div className="w-8 h-8 bg-[#F0FDF4] rounded-[10px] mb-2.5 flex items-center justify-center">
              <BarChart2 size={20} stroke="#047857" strokeWidth={1.5} />
            </div>
            <h3 className="text-[13px] font-bold text-[#1A1A1A] mb-1">Bourse</h3>
            <p className="text-[11px] text-[#A39887]">Actions et marchés</p>
          </div>

          {/* Épargne+ */}
          <div className="bg-white rounded-[20px] p-4 text-left opacity-60 relative">
            <div className="absolute top-3 right-3 bg-[#F5F4F2] text-[#A39887] text-[9px] font-bold uppercase tracking-[0.08em] px-2 py-0.5 rounded-[6px]">
              Bientôt
            </div>
            <div className="w-8 h-8 bg-[#F0FDF4] rounded-[10px] mb-2.5 flex items-center justify-center">
              <PiggyBank size={20} stroke="#047857" strokeWidth={1.5} />
            </div>
            <h3 className="text-[13px] font-bold text-[#1A1A1A] mb-1">Épargne+</h3>
            <p className="text-[11px] text-[#A39887]">Rendements garantis</p>
          </div>

          {/* PME Locales */}
          <div className="bg-white rounded-[20px] p-4 text-left opacity-60 relative">
            <div className="absolute top-3 right-3 bg-[#F5F4F2] text-[#A39887] text-[9px] font-bold uppercase tracking-[0.08em] px-2 py-0.5 rounded-[6px]">
              Bientôt
            </div>
            <div className="w-8 h-8 bg-[#F0FDF4] rounded-[10px] mb-2.5 flex items-center justify-center">
              <Briefcase size={20} stroke="#047857" strokeWidth={1.5} />
            </div>
            <h3 className="text-[13px] font-bold text-[#1A1A1A] mb-1">PME Locales</h3>
            <p className="text-[11px] text-[#A39887]">Financez des entreprises</p>
          </div>

        </div>

        {/* Note bas */}
        <p className="text-[12px] text-[#C4B8AC] text-center">
          Rejoignez la liste d'attente pour être notifié en premier.
        </p>

      </div>
    </div>
  );
}