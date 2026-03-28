import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';

export function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 bg-[#F5F0E8] flex flex-col h-full">
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full max-w-sm"
        >
          <div className="w-16 h-16 bg-[#047857] rounded-xl flex items-center justify-center mb-8">
            <span className="text-white text-2xl font-bold">A</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1C1410] mb-4 leading-tight">
            Votre épargne,<br />à votre façon.
          </h1>
          <p className="text-sm text-[#7C6F5E] mb-12">
            Rejoignez des Cercles de confiance ou épargnez dans les Afiya Pools en toute sécurité.
          </p>
        </motion.div>
      </div>
      
      <div className="p-6 pb-12">
        <button
          onClick={() => navigate('/login')}
          className="w-full bg-[#047857] text-white h-14 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-[#059669] transition-colors"
        >
          Commencer
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}
