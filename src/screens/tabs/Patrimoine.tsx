import React from 'react';
import { TrendingUp, Building2, BarChart2, PiggyBank, Briefcase } from 'lucide-react';
import { motion } from 'motion/react';

export function Patrimoine() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -10 }} 
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="bg-[#FAFAF8] min-h-screen pb-[100px] flex flex-col font-sans"
    >
      
      {/* HEADER */}
      <div className="pt-[60px] px-6 mb-2">
        <h1 className="font-display text-[28px] font-bold text-[#1A1A1A] tracking-tight mb-1 leading-none">
          Afiya Capital
        </h1>
        <p className="text-[14px] font-medium text-[#A39887] mt-1.5">
          Faites fructifier votre épargne.
        </p>
      </div>

      {/* CONTENU CENTRÉ */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center mt-8">
        
        {/* Icône principale */}
        <div className="w-24 h-24 bg-[#F0FDF4] rounded-[24px] flex items-center justify-center mx-auto mb-8 shadow-[0_4px_24px_rgba(4,120,87,0.08)] border border-[#047857]/10">
          <TrendingUp size={40} stroke="#047857" strokeWidth={1.5} />
        </div>

        {/* Titre */}
        <h2 className="font-display text-[24px] font-bold text-[#1A1A1A] tracking-tight mb-3">
          Bientôt disponible
        </h2>

        {/* Description */}
        <p className="text-[14px] font-medium text-[#6B6B6B] leading-relaxed max-w-[280px] mx-auto mb-10">
          Investissez dans l'immobilier, la bourse, l'épargne+ et les PME locales. Afiya Capital arrive bientôt.
        </p>

        {/* 4 modules à venir */}
        <div className="grid grid-cols-2 gap-4 w-full mb-10">
          
          {/* Immobilier */}
          <div className="bg-white rounded-[24px] p-5 text-left opacity-60 relative shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-[#F0EFED]">
            <div className="absolute top-4 right-4 bg-[#F5F4F2] text-[#A39887] text-[10px] font-bold uppercase tracking-[0.08em] px-2.5 py-1 rounded-[8px]">
              Bientôt
            </div>
            <div className="w-10 h-10 bg-[#F0FDF4] rounded-[12px] mb-3 flex items-center justify-center border border-[#047857]/10">
              <Building2 size={20} stroke="#047857" strokeWidth={1.5} />
            </div>
            <h3 className="font-display text-[15px] font-bold text-[#1A1A1A] mb-1">Immobilier</h3>
            <p className="text-[12px] font-medium text-[#A39887]">Investissez dans la pierre</p>
          </div>

          {/* Bourse */}
          <div className="bg-white rounded-[24px] p-5 text-left opacity-60 relative shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-[#F0EFED]">
            <div className="absolute top-4 right-4 bg-[#F5F4F2] text-[#A39887] text-[10px] font-bold uppercase tracking-[0.08em] px-2.5 py-1 rounded-[8px]">
              Bientôt
            </div>
            <div className="w-10 h-10 bg-[#F0FDF4] rounded-[12px] mb-3 flex items-center justify-center border border-[#047857]/10">
              <BarChart2 size={20} stroke="#047857" strokeWidth={1.5} />
            </div>
            <h3 className="font-display text-[15px] font-bold text-[#1A1A1A] mb-1">Bourse</h3>
            <p className="text-[12px] font-medium text-[#A39887]">Actions et marchés</p>
          </div>

          {/* Épargne+ */}
          <div className="bg-white rounded-[24px] p-5 text-left opacity-60 relative shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-[#F0EFED]">
            <div className="absolute top-4 right-4 bg-[#F5F4F2] text-[#A39887] text-[10px] font-bold uppercase tracking-[0.08em] px-2.5 py-1 rounded-[8px]">
              Bientôt
            </div>
            <div className="w-10 h-10 bg-[#F0FDF4] rounded-[12px] mb-3 flex items-center justify-center border border-[#047857]/10">
              <PiggyBank size={20} stroke="#047857" strokeWidth={1.5} />
            </div>
            <h3 className="font-display text-[15px] font-bold text-[#1A1A1A] mb-1">Épargne+</h3>
            <p className="text-[12px] font-medium text-[#A39887]">Rendements garantis</p>
          </div>

          {/* PME Locales */}
          <div className="bg-white rounded-[24px] p-5 text-left opacity-60 relative shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-[#F0EFED]">
            <div className="absolute top-4 right-4 bg-[#F5F4F2] text-[#A39887] text-[10px] font-bold uppercase tracking-[0.08em] px-2.5 py-1 rounded-[8px]">
              Bientôt
            </div>
            <div className="w-10 h-10 bg-[#F0FDF4] rounded-[12px] mb-3 flex items-center justify-center border border-[#047857]/10">
              <Briefcase size={20} stroke="#047857" strokeWidth={1.5} />
            </div>
            <h3 className="font-display text-[15px] font-bold text-[#1A1A1A] mb-1">PME Locales</h3>
            <p className="text-[12px] font-medium text-[#A39887]">Financez des entreprises</p>
          </div>

        </div>

        {/* Note bas */}
        <p className="text-[13px] font-medium text-[#C4B8AC] text-center">
          Rejoignez la liste d'attente pour être notifié en premier.
        </p>

      </div>
    </motion.div>
  );
}