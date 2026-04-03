import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

export function Welcome() {
  const navigate = useNavigate();

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="min-h-screen w-full flex flex-col relative font-sans overflow-hidden"
    >
      {/* Image de fond (Placeholder haute qualité) */}
      <div 
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{
          backgroundImage: 'url("/welcome-bg.jpg")',
        }}
      />
      
      {/* Dégradé sombre pour la lisibilité */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-[#1A1A1A]/60 to-transparent z-0" />

      {/* ZONE 1 - Contenu textuel */}
      <div className="flex-1 flex flex-col justify-end px-8 relative z-10 pb-12">
        <div className="w-12 h-1 bg-[#047857] rounded-full mb-6" />
        
        <h1 className="font-display text-[56px] font-extrabold text-white tracking-tight leading-[1.1] mb-4">
          Afiya
        </h1>
        
        <p className="text-[18px] font-medium text-white/90 mb-6">
          Votre épargne, à votre façon.
        </p>
        
        <p className="text-[14px] font-normal text-white/70 leading-relaxed max-w-[280px]">
          La tontine que vous connaissez, portée par la confiance et la technologie.
        </p>
      </div>

      {/* ZONE 2 - Boutons et actions */}
      <div className="px-8 pb-12 relative z-10">
        <button
          onClick={() => navigate('/signup')}
          className="w-full bg-[#047857] text-white rounded-[16px] p-4 text-[15px] font-bold mb-3 transition-transform active:scale-[0.98] shadow-[0_8px_20px_rgba(4,120,87,0.3)]"
        >
          Créer un compte
        </button>
        
        <button
          onClick={() => navigate('/login')}
          className="w-full bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-[16px] p-4 text-[15px] font-bold mb-6 transition-transform active:scale-[0.98]"
        >
          Se connecter
        </button>
        
        <p className="text-center text-[13px] text-white/60">
          Rejoindre un cercle existant ?{' '}
          <button 
            onClick={() => navigate('/group/join')}
            className="text-white font-bold transition-opacity active:opacity-80 underline decoration-white/30 underline-offset-4"
          >
            Par invitation
          </button>
        </p>
      </div>
    </motion.div>
  );
}