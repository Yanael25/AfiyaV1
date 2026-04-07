import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Clock, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { auth, db } from '../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { formatXOF } from '../../lib/utils';

export function Patrimoine() {
  const [capitalBalance, setCapitalBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCapitalWallet = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const q = query(
          collection(db, 'wallets'),
          where('owner_id', '==', user.uid),
          where('wallet_type', '==', 'USER_CAPITAL')
        );
        
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setCapitalBalance(snapshot.docs[0].data().balance || 0);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération du wallet capital:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCapitalWallet();
  }, []);

  const cleanAmount = (val: number) => {
    return formatXOF(val).replace(/\s?FCFA/gi, '').trim();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.3 }}
      className="bg-[#F5F4F0] min-h-screen pt-[52px] pb-[80px] font-sans flex flex-col"
    >
      
      {/* HEADER */}
      <div className="px-6 mb-6">
        <h1 className="text-[26px] font-[800] text-[#1A1A1A] tracking-[-0.02em] leading-none">
          Capital
        </h1>
      </div>

      <div className="px-6 flex flex-col gap-6">
        
        {/* 1. BLOC SOLDE CAPITAL */}
        <div className="bg-white rounded-[20px] border-[0.5px] border-[#EDECEA] p-[20px] shadow-sm">
          <p className="text-[9px] font-[700] uppercase text-[#A39887] tracking-[0.1em] mb-[8px]">
            AFIYA CAPITAL
          </p>
          <div className="flex items-baseline gap-[4px]">
            {loading ? (
              <div className="h-[28px] w-[120px] bg-[#F5F4F0] rounded animate-pulse" />
            ) : (
              <>
                <span className="text-[28px] font-[800] text-[#1A1A1A] leading-none">
                  {cleanAmount(capitalBalance)}
                </span>
                <span className="text-[13px] font-[700] text-[#A39887]">FCFA</span>
              </>
            )}
          </div>
          <p className="text-[11px] font-[500] text-[#A39887] mt-[4px]">
            Compte capital
          </p>
          <button className="w-full h-[44px] bg-white border-[1.5px] border-[#047857] rounded-[13px] text-[#047857] text-[13px] font-[700] mt-[14px] active:scale-95 transition-transform">
            Déposer des fonds
          </button>
        </div>

        {/* 2. BLOC PERFORMANCE PLACEHOLDER */}
        <div className="bg-white rounded-[20px] border-[0.5px] border-[#EDECEA] p-[20px] shadow-sm">
          <p className="text-[9px] font-[700] uppercase text-[#A39887] tracking-[0.1em] mb-[12px]">
            PERFORMANCE
          </p>
          <div className="bg-[#F5F4F0] rounded-[12px] p-[20px] min-h-[90px] flex flex-col items-center justify-center">
            <TrendingUp size={28} className="text-[#C4B8AC]" strokeWidth={2} />
            <p className="text-[12px] font-[600] text-[#A39887] mt-[8px] text-center max-w-[200px] leading-snug">
              Vos rendements apparaîtront ici dès votre premier investissement
            </p>
          </div>
        </div>

        {/* 3. BLOC PRODUITS */}
        <div className="bg-white rounded-[20px] border-[0.5px] border-[#EDECEA] p-[14px] shadow-sm">
          <p className="text-[9px] font-[700] uppercase text-[#A39887] tracking-[0.1em] mb-[12px] px-[2px]">
            PRODUITS DISPONIBLES BIENTÔT
          </p>

          <div className="flex flex-col gap-[8px]">
            {/* Produit 1 */}
            <div className="bg-[#F5F4F0] rounded-[14px] border-[0.5px] border-[#EDECEA] p-[14px] opacity-60 flex items-center gap-[12px]">
              <div className="w-[38px] h-[38px] bg-[#EDECEA] rounded-[11px] flex items-center justify-center shrink-0">
                <DollarSign size={20} className="text-[#6B6B6B]" strokeWidth={2} />
              </div>
              <div className="flex flex-col flex-1">
                <span className="text-[13px] font-[700] text-[#1A1A1A]">Épargne programmée</span>
                <span className="text-[10px] font-[500] text-[#A39887]">Versements automatiques · Rendement garanti</span>
              </div>
              <div className="bg-[#F0EFED] text-[#A39887] text-[9px] font-[700] uppercase px-[6px] py-[3px] rounded-[5px] ml-auto shrink-0">
                Bientôt
              </div>
            </div>

            {/* Produit 2 */}
            <div className="bg-[#F5F4F0] rounded-[14px] border-[0.5px] border-[#EDECEA] p-[14px] opacity-60 flex items-center gap-[12px]">
              <div className="w-[38px] h-[38px] bg-[#EDECEA] rounded-[11px] flex items-center justify-center shrink-0">
                <Clock size={20} className="text-[#6B6B6B]" strokeWidth={2} />
              </div>
              <div className="flex flex-col flex-1">
                <span className="text-[13px] font-[700] text-[#1A1A1A]">Investissement court terme</span>
                <span className="text-[10px] font-[500] text-[#A39887]">3 à 12 mois · Rendement variable</span>
              </div>
              <div className="bg-[#F0EFED] text-[#A39887] text-[9px] font-[700] uppercase px-[6px] py-[3px] rounded-[5px] ml-auto shrink-0">
                Bientôt
              </div>
            </div>

            {/* Produit 3 */}
            <div className="bg-[#F5F4F0] rounded-[14px] border-[0.5px] border-[#EDECEA] p-[14px] opacity-60 flex items-center gap-[12px]">
              <div className="w-[38px] h-[38px] bg-[#EDECEA] rounded-[11px] flex items-center justify-center shrink-0">
                <Shield size={20} className="text-[#6B6B6B]" strokeWidth={2} />
              </div>
              <div className="flex flex-col flex-1">
                <span className="text-[13px] font-[700] text-[#1A1A1A]">Investissement long terme</span>
                <span className="text-[10px] font-[500] text-[#A39887]">12 mois et plus · Rendement optimisé</span>
              </div>
              <div className="bg-[#F0EFED] text-[#A39887] text-[9px] font-[700] uppercase px-[6px] py-[3px] rounded-[5px] ml-auto shrink-0">
                Bientôt
              </div>
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}