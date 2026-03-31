import { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, TrendingUp, Building2, ArrowRight, CheckCircle2 } from 'lucide-react';

export function Patrimoine() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const assets = [
    {
      title: "Obligations d'État",
      desc: "Rendement garanti, risque nul.",
      yield: "6-7%",
      icon: Shield
    },
    {
      title: "BRVM Actions",
      desc: "Participez à la croissance des leaders régionaux.",
      yield: "Variable",
      icon: TrendingUp
    },
    {
      title: "Immobilier Fractionné",
      desc: "Des loyers mensuels, sans gestion.",
      yield: "8-10%",
      icon: Building2
    }
  ];

  const steps = [
    { num: "01", text: "Terminez un cycle de tontine." },
    { num: "02", text: "Transférez votre cagnotte en un clic." },
    { num: "03", text: "Percevez vos dividendes directement sur votre Wallet." }
  ];

  return (
    <div className="flex-1 bg-[var(--color-bg)] flex flex-col h-full overflow-y-auto no-scrollbar pb-24">
      <div className="px-6 max-w-2xl mx-auto w-full pt-16 pb-8">
        
        {/* Header & Assets */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-14 bg-[var(--color-primary)] rounded-[var(--radius-card)] p-6 text-white"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[var(--radius-badge)] bg-white/20 text-white mb-6">
            <span className="text-xs font-medium">Bientôt disponible</span>
          </div>
          
          <h1 className="text-5xl font-extrabold text-white tracking-tight mb-4">
            Afiya Capital.
          </h1>
          
          <p className="text-lg text-white/80 font-light leading-relaxed max-w-sm mb-8">
            L'accès exclusif aux marchés financiers béninois et régionaux.
          </p>

          <div className="flex flex-col gap-4">
            {assets.map((asset, idx) => (
              <div 
                key={idx}
                className="bg-[var(--color-surface)] rounded-[var(--radius-inner)] p-5 flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-[var(--radius-avatar)] bg-[var(--color-bg)] flex items-center justify-center shrink-0">
                  <asset.icon size={20} className="text-[var(--color-primary)]" strokeWidth={1.5} />
                </div>
                <div className="flex-1 pt-1">
                  <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">{asset.title}</h3>
                  <p className="text-sm font-normal text-[var(--color-text-secondary)] leading-relaxed mb-3">{asset.desc}</p>
                  <div className="inline-flex items-center gap-2 bg-[var(--color-bg)] px-3 py-1.5 rounded-[var(--radius-badge)]">
                    <span className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wider">Rendement estimé</span>
                    <span className="text-xs font-semibold text-[var(--color-text-primary)]">{asset.yield}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Comment ça marche ? */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          className="mb-16"
        >
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-8">Comment ça marche ?</h2>
          <div className="flex flex-col gap-6">
            {steps.map((step, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <span className="text-2xl font-extrabold text-[var(--color-primary)]">{step.num}.</span>
                <p className="text-sm font-normal text-[var(--color-text-secondary)]">{step.text}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
          className="bg-[var(--color-primary)] rounded-[var(--radius-card)] p-6 sm:p-8"
        >
          {submitted ? (
            <div className="flex flex-col items-center text-center py-4">
              <div className="w-16 h-16 rounded-[var(--radius-avatar)] bg-white/10 flex items-center justify-center mb-4">
                <CheckCircle2 size={32} className="text-white" />
              </div>
              <h3 className="text-white font-bold text-xl mb-2">Demande enregistrée</h3>
              <p className="text-sm font-normal text-white/80">
                Vous êtes sur la liste d'attente VIP. Nous vous contacterons prochainement.
              </p>
            </div>
          ) : (
            <>
              <h3 className="text-white font-bold text-xl mb-2">Rejoindre la liste d'attente</h3>
              <p className="text-sm font-normal text-white/80 mb-6">
                Les places sont limitées pour le lancement de la version bêta privée.
              </p>
              
              <div className="flex flex-col gap-4">
                <input 
                  type="email" 
                  placeholder="Votre adresse email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/10 rounded-[var(--radius-field)] px-4 py-3.5 text-white placeholder:text-white/50 focus:outline-none focus:bg-white/20 transition-colors"
                />
                <button 
                  onClick={() => {
                    if (email) setSubmitted(true);
                  }}
                  className="w-full bg-[var(--color-surface)] text-[var(--color-primary)] font-bold py-3.5 rounded-[var(--radius-btn)] flex items-center justify-center gap-2 transition-colors"
                >
                  Demander un accès
                  <ArrowRight size={18} />
                </button>
              </div>
            </>
          )}
        </motion.div>

      </div>
    </div>
  );
}
