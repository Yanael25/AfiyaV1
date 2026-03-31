import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Camera, FileText, CheckCircle2 } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { getUserProfile, updateProfile } from '../../services/userService';

export function Kyc() {
  const navigate = useNavigate();
  const [step, setStep] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  
  const [docUploaded, setDocUploaded] = useState(false);
  const [selfieUploaded, setSelfieUploaded] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const user = auth.currentUser;
      if (user) {
        const profile = await getUserProfile(user.uid);
        if (profile && profile.full_name) {
          const parts = profile.full_name.split(' ');
          setFirstName(parts[0] || '');
          setLastName(parts.slice(1).join(' ') || '');
        }
      }
    };
    loadProfile();
  }, []);

  const getInitials = () => {
    const f = firstName.charAt(0).toUpperCase();
    const l = lastName.charAt(0).toUpperCase();
    return f || l ? `${f}${l}` : '?';
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName) return;
    
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Non connecté");

      await updateProfile(user.uid, {
        full_name: `${firstName} ${lastName}`.trim(),
        kyc_status: 'PENDING',
      });
      setStep(3);
    } catch (e: any) {
      setError(e.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const handleStep3Submit = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Non connecté");

      await updateProfile(user.uid, {
        kyc_status: 'VERIFIED',
      });
      navigate('/home');
    } catch (e: any) {
      setError(e.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/home');
  };

  return (
    <div className="flex-1 bg-[var(--color-bg)] flex flex-col h-full overflow-y-auto">
      <div className="px-6 pt-6 pb-4 flex items-center gap-4">
        <button 
          onClick={() => step === 3 ? setStep(2) : navigate(-1)} 
          className="w-10 h-10 bg-[var(--color-surface)] rounded-[var(--radius-btn)] flex items-center justify-center text-[var(--color-text-primary)] shrink-0"
        >
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
        
        <div className="flex-1 flex items-center gap-1.5 h-1">
          <div className="h-1 rounded-full flex-1 bg-[var(--color-primary)]" />
          <div className={`h-1 rounded-full flex-1 ${step >= 2 ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'} ${step === 2 ? 'opacity-40' : ''}`} />
          <div className={`h-1 rounded-full flex-1 ${step >= 3 ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'} ${step === 3 ? 'opacity-40' : ''}`} />
        </div>
      </div>
      
      <div className="px-6 pt-4 pb-6 relative">
        <div className="absolute left-0 top-4 bottom-6 w-[3px] bg-[var(--color-primary)] rounded-r-[4px]" />
        <div className="pl-4">
          <div className="text-[11px] font-bold tracking-[0.2em] text-[var(--color-primary)] uppercase mb-2">Afiya</div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)] mb-2 leading-tight">
            {step === 2 ? "Faisons connaissance." : "Vérifiez votre identité."}
          </h1>
          <p className="text-[13px] text-[var(--color-text-muted)]">
            {step === 2 
              ? "Votre nom, c'est tout ce dont on a besoin pour commencer." 
              : "Nécessaire pour effectuer des transactions. Vous pouvez le faire plus tard."}
          </p>
        </div>
      </div>

      <div className="h-px bg-[var(--color-divider)] w-full mb-6" />

      {error && (
        <div className="mx-6 mb-6">
          <p className="text-[13px] font-medium text-[var(--color-text-primary)]">{error}</p>
        </div>
      )}

      {step === 2 ? (
        <div className="flex-1 px-6 pb-12 flex flex-col">
          <div className="flex justify-center mb-8">
            <div className="w-14 h-14 bg-[var(--color-primary)] rounded-[var(--radius-avatar)] flex items-center justify-center text-white font-extrabold text-[20px]">
              {getInitials()}
            </div>
          </div>

          <form onSubmit={handleStep2Submit} className="space-y-4 flex-1">
            <div>
              <input 
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="Prénom"
                className="w-full bg-[var(--color-surface-inner)] rounded-[var(--radius-field)] px-4 py-3.5 text-[15px] font-semibold text-[var(--color-text-primary)] placeholder-[var(--color-text-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-colors" 
                required
              />
            </div>

            <div>
              <input 
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Nom de famille"
                className="w-full bg-[var(--color-surface-inner)] rounded-[var(--radius-field)] px-4 py-3.5 text-[15px] font-semibold text-[var(--color-text-primary)] placeholder-[var(--color-text-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-colors" 
                required
              />
            </div>

            <div className="pt-4">
              <div className="bg-[var(--color-primary-light)] rounded-[var(--radius-inner)] p-4 flex items-start gap-2.5 mb-6">
                <div className="w-1.5 h-1.5 bg-[var(--color-primary)] rounded-full mt-1.5 shrink-0" />
                <p className="text-[12px] font-semibold text-[var(--color-primary)]">
                  Vos informations sont protégées et ne seront jamais partagées sans votre consentement.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !firstName || !lastName}
                className="w-full bg-[var(--color-primary)] text-white py-4 rounded-[var(--radius-btn)] text-[15px] font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
              >
                {loading ? 'Enregistrement...' : "C'est parti"}
                {!loading && <ArrowRight size={18} strokeWidth={1.5} />}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="flex-1 px-6 pb-12 flex flex-col">
          <div className="space-y-3 mb-6">
            {/* Document Card */}
            <div className="bg-[var(--color-surface)] rounded-[var(--radius-card)] p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-[var(--color-surface-inner)] rounded-[var(--radius-inner)] flex items-center justify-center shrink-0">
                {docUploaded ? (
                  <CheckCircle2 size={24} strokeWidth={1.5} className="text-[var(--color-primary)]" />
                ) : (
                  <FileText size={24} strokeWidth={1.5} className="text-[var(--color-text-muted)]" />
                )}
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-bold tracking-[0.08em] text-[var(--color-text-muted)] uppercase mb-0.5">
                  Document d'identité
                </div>
                <h3 className={`text-[15px] font-bold ${docUploaded ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-primary)]'}`}>
                  {docUploaded ? 'Document ajouté' : 'Ajouter un document'}
                </h3>
                <p className="text-[12px] font-medium text-[var(--color-text-muted)] mt-0.5">
                  Carte d'identité, passeport, permis de conduire
                </p>
              </div>
              <button 
                onClick={() => setDocUploaded(!docUploaded)}
                className={`text-[13px] font-bold ${docUploaded ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-primary)]'}`}
              >
                {docUploaded ? 'Changer' : '+ Ajouter'}
              </button>
            </div>

            {/* Selfie Card */}
            <div className="bg-[var(--color-surface)] rounded-[var(--radius-card)] p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-[var(--color-surface-inner)] rounded-[var(--radius-inner)] flex items-center justify-center shrink-0">
                {selfieUploaded ? (
                  <CheckCircle2 size={24} strokeWidth={1.5} className="text-[var(--color-primary)]" />
                ) : (
                  <Camera size={24} strokeWidth={1.5} className="text-[var(--color-text-muted)]" />
                )}
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-bold tracking-[0.08em] text-[var(--color-text-muted)] uppercase mb-0.5">
                  Selfie
                </div>
                <h3 className={`text-[15px] font-bold ${selfieUploaded ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-primary)]'}`}>
                  {selfieUploaded ? 'Photo ajoutée' : 'Prendre une photo'}
                </h3>
                <p className="text-[12px] font-medium text-[var(--color-text-muted)] mt-0.5">
                  Visage visible, bonne luminosité
                </p>
              </div>
              <button 
                onClick={() => setSelfieUploaded(!selfieUploaded)}
                className={`text-[13px] font-bold ${selfieUploaded ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-primary)]'}`}
              >
                {selfieUploaded ? 'Changer' : '+ Ajouter'}
              </button>
            </div>
          </div>

          <div className="bg-[var(--color-surface-inner)] rounded-[var(--radius-card)] p-4 flex items-start gap-2.5 mb-8">
            <div className="w-1.5 h-1.5 bg-[var(--color-text-muted)] rounded-full mt-1.5 shrink-0" />
            <p className="text-[12px] font-medium text-[var(--color-text-secondary)]">
              Vos documents sont chiffrés et stockés en toute sécurité. Ils ne seront utilisés que pour vérifier votre identité.
            </p>
          </div>

          <div className="mt-auto flex flex-col gap-3">
            <button
              onClick={handleStep3Submit}
              disabled={loading || !docUploaded || !selfieUploaded}
              className="w-full bg-[var(--color-primary)] text-white py-4 rounded-[var(--radius-btn)] text-[15px] font-bold flex items-center justify-center disabled:opacity-50 transition-opacity"
            >
              {loading ? 'Envoi...' : 'Envoyer pour vérification'}
            </button>
            <button
              onClick={handleSkip}
              className="w-full bg-transparent text-[var(--color-text-muted)] py-4 rounded-[var(--radius-btn)] text-[15px] font-bold flex items-center justify-center transition-opacity"
            >
              Faire ça plus tard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
