import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { auth } from '../../lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

export function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Délai strict de 2 secondes pour le splash screen
      setTimeout(async () => {
        if (user) {
          // Déconnexion forcée pour éviter la connexion automatique demandée
          await signOut(auth);
        }
        navigate('/welcome', { replace: true });
      }, 2000);
    });

    return () => unsubscribe();
  }, [navigate]);

  return (
    // Fond plein écran #047857 strict, centré verticalement et horizontalement
    <div className="min-h-screen w-full bg-[#047857] flex flex-col items-center justify-center font-sans">
      
      {/* Animation : fade in 0.6s au montage */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center"
      >
        {/* Logo : carré blanc 80x80px / radius 20px */}
        <div className="w-[80px] h-[80px] bg-white rounded-[20px] flex items-center justify-center">
          {/* Lettre "A" en #047857 / 36px / 800 */}
          <span className="text-[#047857] text-[36px] font-[800] leading-none">
            A
          </span>
        </div>
        
        {/* Nom "Afiya" : white / 28px / 800 / letter-spacing -0.02em / margin-top 16px */}
        <h1 className="text-white text-[28px] font-[800] tracking-[-0.02em] mt-[16px] leading-none">
          Afiya
        </h1>
      </motion.div>
    </div>
  );
}