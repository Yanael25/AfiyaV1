import { useState } from 'react';
import { motion } from 'motion/react';
import { Building2, TrendingUp, Shield, Briefcase, Zap, Eye, Users, Check, CheckCircle } from 'lucide-react';

export function Patrimoine() {
  const [email, setEmail] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const toggleInterest = (interest: string) => {
    setInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const cards = [
    { icon: Building2, title: "Afiya Immo", desc: "Immobilier locatif béninois. Loyers versés chaque mois." },
    { icon: TrendingUp, title: "Afiya Bourse", desc: "Actions BRVM sans SGI, sans formulaires." },
    { icon: Shield, title: "Afiya Épargne+", desc: "Obligations du Trésor. Sécurisé et prévisible." },
    { icon: Briefcase, title: "Afiya PME", desc: "Financez des PME locales sélectionnées." }
  ];

  const argumentsList = [
    { icon: Zap, title: "Accessible dès 500 FCFA", desc: "Pas de compte bancaire, pas de SGI, pas de formulaires papier." },
    { icon: Eye, title: "Totalement transparent", desc: "Chaque actif expliqué en FCFA concrets. Pas de jargon financier." },
    { icon: Users, title: "Connecté à vos Cercles", desc: "À la fin d'un cycle tontine, investissez en un tap." }
  ];

  const interestOptions = ["Afiya Immo", "Afiya Bourse", "Afiya Épargne+", "Afiya PME"];

  return (
    <div className="flex-1 bg-[#FAFAFA] flex flex-col h-full overflow-y-auto no-scrollbar">
      <div className="px-4 sm:px-6 max-w-2xl mx-auto w-full pb-8">
        
        {/* SECTION 1 : HEADER */}
        <motion.div 
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0 }}
          className="pt-12 pb-8 bg-gradient-to-b from-[#ECFDF5] to-[#FAFAFA] -mx-4 px-4 sm:-mx-6 sm:px-6 rounded-b-3xl mb-8"
        >
          <motion.div 
            animate={{ opacity: [1, 0.7, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="bg-[#047857] text-white text-xs font-semibold px-4 py-1.5 rounded-full inline-flex items-center gap-1.5 mb-4"
          >
            ✦ Bientôt disponible
          </motion.div>
          
          <h1 className="text-4xl font-extrabold text-[#0F172A] tracking-tight">
            Afiya Capital
          </h1>
          
          <div className="text-xl font-semibold text-[#047857] mt-1">
            <p>Investissez à partir de 500 FCFA</p>
            <p>dans l'économie béninoise.</p>
          </div>
          
          <p className="text-sm text-[#64748B] mt-3 leading-relaxed max-w-sm">
            Immobilier fractionné, Bourse BRVM, Obligations d'État, Financement PME — accessible à tous, depuis votre téléphone.
          </p>
        </motion.div>

        {/* SECTION 2 : CARDS DES 4 COUCHES */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-8"
        >
          <h2 className="text-lg font-bold text-[#0F172A] mb-4">Ce que vous pourrez faire</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {cards.map((card, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ scale: 1.02 }}
                className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-sm flex flex-col"
              >
                <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] flex items-center justify-center mb-3 shrink-0">
                  <card.icon size={20} color="#047857" strokeWidth={2} />
                </div>
                <h3 className="text-sm font-bold text-[#0F172A]">{card.title}</h3>
                <p className="text-xs text-[#64748B] leading-relaxed mt-1 flex-1">{card.desc}</p>
                <div className="mt-2">
                  <span className="text-[10px] font-medium text-[#D97706] bg-[#FEF3C7] px-2 py-0.5 rounded-full inline-block">
                    Bientôt
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* SECTION 3 : 3 ARGUMENTS CLÉS */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-lg font-bold text-[#0F172A] mb-4">Pourquoi Afiya Capital ?</h2>
          <div className="flex flex-col gap-4">
            {argumentsList.map((arg, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#ECFDF5] shrink-0 flex items-center justify-center mt-0.5">
                  <arg.icon size={16} color="#047857" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-sm font-bold text-[#0F172A]">{arg.title}</h3>
                  <p className="text-xs text-[#64748B] leading-relaxed mt-0.5">{arg.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* SECTION 4 : LISTE D'ATTENTE */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <div className="bg-[#0F172A] rounded-2xl p-6 text-white">
            {!submitted ? (
              <>
                <h2 className="text-xl font-bold text-white">Soyez parmi les premiers</h2>
                <p className="text-sm text-[#94A3B8] mt-1">
                  Rejoignez la liste d'attente et accédez en avant-première à Afiya Capital.
                </p>

                <div className="mt-6">
                  <label className="text-xs font-medium text-[#94A3B8] mb-1 block">Votre email</label>
                  <input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/40 text-sm w-full outline-none focus:border-[#047857] focus:ring-1 focus:ring-[#047857] transition-all"
                  />
                </div>

                <div className="mt-4">
                  <label className="text-xs font-medium text-[#94A3B8] mb-2 block">Vos centres d'intérêt</label>
                  <div className="grid grid-cols-2 gap-3">
                    {interestOptions.map((option) => {
                      const isChecked = interests.includes(option);
                      return (
                        <div 
                          key={option} 
                          onClick={() => toggleInterest(option)}
                          className="flex items-center gap-2 cursor-pointer group"
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isChecked ? 'bg-[#047857] border-[#047857]' : 'border-white/30 group-hover:border-white/50'}`}>
                            {isChecked && <Check size={10} strokeWidth={3} color="white" />}
                          </div>
                          <span className="text-xs text-white/80">{option}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    if (email) setSubmitted(true);
                  }}
                  disabled={!email}
                  className="bg-[#047857] text-white w-full py-3.5 rounded-xl font-semibold text-sm mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Rejoindre la liste d'attente
                </motion.button>
                
                <p className="text-xs text-[#D97706] text-center mt-3">
                  🌟 Les membres GOLD et PLATINUM auront un accès prioritaire.
                </p>
              </>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-4 flex flex-col items-center justify-center"
              >
                <CheckCircle size={40} color="#047857" className="mx-auto" />
                <h2 className="text-lg font-bold text-white text-center mt-3">Merci, vous êtes sur la liste !</h2>
                <p className="text-sm text-[#94A3B8] text-center mt-1">
                  Nous vous contacterons en avant-première.
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>

      </div>
    </div>
  );
}


