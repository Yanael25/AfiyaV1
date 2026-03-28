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
    <div className="flex-1 bg-[#064E3B] flex flex-col items-center justify-center h-full">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center"
      >
        <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-lg">
          <span className="text-[#064E3B] text-4xl font-bold">A</span>
        </div>
        <h1 className="text-white text-3xl font-bold tracking-tight">Afiya</h1>
      </motion.div>
    </div>
  );
}
