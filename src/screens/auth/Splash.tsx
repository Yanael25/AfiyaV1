import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { auth } from '../../lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

export function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Petit délai pour laisser l'animation du splash screen se jouer
      setTimeout(async () => {
        if (user) {
          // Déconnexion forcée pour éviter la connexion automatique demandée par l'utilisateur
          await signOut(auth);
        }
        navigate('/welcome', { replace: true });
      }, 2000);
    });

    return () => unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen w-full bg-[#047857] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Cercles décoratifs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-white/5 blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-black/10 blur-3xl" />

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center relative z-10"
      >
        <div className="w-24 h-24 bg-white rounded-[24px] flex items-center justify-center mb-6 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
          <span className="text-[#047857] font-display text-[48px] font-extrabold leading-none">A</span>
        </div>
        <h1 className="font-display text-[40px] font-extrabold tracking-tight text-white">Afiya</h1>
      </motion.div>
    </div>
  );
}
