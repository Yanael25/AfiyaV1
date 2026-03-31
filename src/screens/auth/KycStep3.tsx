import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Check, User, Clock } from 'lucide-react';
import { auth, storage } from '../../lib/firebase';
import { ref, uploadBytes } from 'firebase/storage';
import { updateProfile } from '../../services/userService';

export function KycStep3() {
  const navigate = useNavigate();
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const docInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setDocumentFile(e.target.files[0]);
    }
  };

  const handleSelfieChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelfieFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!documentFile || !selfieFile) return;
    
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Non connecté");

      // Upload Document
      const docRef = ref(storage, `kyc/${user.uid}/document_${Date.now()}`);
      await uploadBytes(docRef, documentFile);

      // Upload Selfie
      const selfieRef = ref(storage, `kyc/${user.uid}/selfie_${Date.now()}`);
      await uploadBytes(selfieRef, selfieFile);

      // Update Profile
      await updateProfile(user.uid, {
        kyc_status: 'PENDING',
      });

      setIsSubmitted(true);
    } catch (error) {
      console.error("Erreur lors de l'envoi des documents KYC:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/home');
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex flex-col font-sans px-[28px] justify-center">
        <div className="w-[72px] h-[72px] bg-[#F0FDF4] rounded-full mx-auto mb-4 flex items-center justify-center">
          <Clock size={32} stroke="#047857" strokeWidth={1.5} />
        </div>
        
        <h1 className="text-[24px] font-extrabold text-[#1A1A1A] text-center tracking-tight mb-2">
          Vérification en cours.
        </h1>
        <p className="text-[13px] text-[#A39887] text-center leading-relaxed max-w-[240px] mx-auto">
          Vous recevrez une notification dès que votre identité est confirmée.
        </p>

        <div className="bg-white rounded-[20px] p-5 mt-6">
          <div className="text-[11px] font-bold tracking-widest uppercase text-[#A39887] mb-4">
            EN ATTENDANT
          </div>
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-[#047857] rounded-full flex-shrink-0" />
              <span className="text-[13px] font-semibold text-[#1A1A1A]">Explorer l'app librement</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-[#047857] rounded-full flex-shrink-0" />
              <span className="text-[13px] font-semibold text-[#1A1A1A]">Rejoindre et créer des cercles</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-[#E8E6E3] rounded-full flex-shrink-0" />
              <span className="text-[13px] font-medium text-[#C4B8AC]">Transactions activées après vérification</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/home')}
          className="mt-10 w-full bg-[#047857] text-white rounded-[16px] py-4 text-[15px] font-bold transition-opacity active:opacity-80"
        >
          Accéder à Afiya
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col font-sans">
      
      {/* 1. BOUTON RETOUR */}
      <div className="pt-[48px] px-[24px]">
        <button 
          onClick={() => navigate(-1)} 
          className="w-9 h-9 bg-white rounded-xl flex items-center justify-center transition-opacity active:opacity-80"
        >
          <ArrowLeft size={18} stroke="#6B6B6B" strokeWidth={1.5} />
        </button>
      </div>
      
      {/* 2. HEADER */}
      <div className="relative px-[28px] pb-[28px] border-b border-[#F0EFED] mb-[28px] mt-[24px]">
        <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-[#047857] rounded-r-[4px]" />
        <div className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#047857] mb-3">
          AFIYA
        </div>
        <h1 className="text-[26px] font-extrabold text-[#1A1A1A] tracking-tight leading-tight mb-1.5">
          Vérifiez votre identité.
        </h1>
        <p className="text-[13px] text-[#A39887]">
          Nécessaire pour effectuer des transactions. Vous pouvez le faire plus tard.
        </p>
      </div>

      {/* 3. INDICATEUR DE PROGRESSION */}
      <div className="px-[28px] mb-[28px]">
        <div className="flex gap-1.5">
          <div className="flex-1 h-1 rounded-full bg-[#047857]" />
          <div className="flex-1 h-1 rounded-full bg-[#047857]" />
          <div className="flex-1 h-1 rounded-full bg-[#047857] opacity-40" />
        </div>
      </div>

      {/* 4. UPLOAD CARDS */}
      <div className="px-[28px] flex flex-col gap-2.5">
        {/* Document Card */}
        <div 
          onClick={() => docInputRef.current?.click()}
          className="bg-white rounded-[20px] p-[18px] flex items-center gap-3.5 cursor-pointer transition-opacity active:opacity-80"
        >
          <div className={`w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 ${documentFile ? 'bg-[#F0FDF4]' : 'bg-[#FAFAF8]'}`}>
            {documentFile ? (
              <Check size={20} stroke="#047857" strokeWidth={1.5} />
            ) : (
              <FileText size={20} stroke="#A39887" strokeWidth={1.5} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-widest text-[#A39887] mb-0.5">
              DOCUMENT D'IDENTITÉ
            </div>
            <div className={`text-[14px] font-bold truncate ${documentFile ? 'text-[#047857]' : 'text-[#1A1A1A]'}`}>
              {documentFile ? 'Document ajouté' : 'Ajouter un document'}
            </div>
            <div className={`text-[11px] truncate mt-0.5 ${documentFile ? 'text-[#047857] font-semibold' : 'text-[#A39887]'}`}>
              {documentFile ? documentFile.name : "Carte d'identité, passeport, permis"}
            </div>
          </div>
          <div className={documentFile ? 'text-[12px] font-semibold text-[#A39887] shrink-0' : 'text-[12px] font-bold text-[#047857] shrink-0'}>
            {documentFile ? 'Changer' : '+ Ajouter'}
          </div>
          <input 
            type="file" 
            className="hidden" 
            ref={docInputRef} 
            onChange={handleDocChange} 
            accept="image/*,application/pdf"
          />
        </div>

        {/* Selfie Card */}
        <div 
          onClick={() => selfieInputRef.current?.click()}
          className="bg-white rounded-[20px] p-[18px] flex items-center gap-3.5 cursor-pointer transition-opacity active:opacity-80"
        >
          <div className={`w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 ${selfieFile ? 'bg-[#F0FDF4]' : 'bg-[#FAFAF8]'}`}>
            {selfieFile ? (
              <Check size={20} stroke="#047857" strokeWidth={1.5} />
            ) : (
              <User size={20} stroke="#A39887" strokeWidth={1.5} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-widest text-[#A39887] mb-0.5">
              SELFIE
            </div>
            <div className={`text-[14px] font-bold truncate ${selfieFile ? 'text-[#047857]' : 'text-[#1A1A1A]'}`}>
              {selfieFile ? 'Photo ajoutée' : 'Prendre une photo'}
            </div>
            <div className={`text-[11px] truncate mt-0.5 ${selfieFile ? 'text-[#047857] font-semibold' : 'text-[#A39887]'}`}>
              {selfieFile ? selfieFile.name : "Visage visible, bonne luminosité"}
            </div>
          </div>
          <div className={selfieFile ? 'text-[12px] font-semibold text-[#A39887] shrink-0' : 'text-[12px] font-bold text-[#047857] shrink-0'}>
            {selfieFile ? 'Changer' : '+ Ajouter'}
          </div>
          <input 
            type="file" 
            accept="image/*" 
            capture="user" 
            className="hidden" 
            ref={selfieInputRef} 
            onChange={handleSelfieChange} 
          />
        </div>
      </div>

      {/* 5. NOTE CONFIDENTIALITÉ */}
      <div className="px-[28px] mt-[10px]">
        <div className="bg-[#FAFAF8] rounded-[14px] p-3 flex items-start gap-2">
          <div className="w-1.5 h-1.5 bg-[#A39887] rounded-full mt-1 flex-shrink-0" />
          <p className="text-[11px] font-medium text-[#A39887] leading-relaxed">
            Vos documents sont chiffrés et utilisés uniquement pour la vérification.
          </p>
        </div>
      </div>

      {/* 6. BLOC BAS */}
      <div className="px-[28px] pb-[40px] mt-auto flex flex-col">
        <button
          onClick={handleSubmit}
          disabled={!documentFile || !selfieFile || loading}
          className={`w-full rounded-[16px] py-4 text-[15px] font-bold mb-2.5 transition-opacity ${
            !documentFile || !selfieFile || loading
              ? 'bg-[#E8E6E3] text-[#C4B8AC] cursor-not-allowed'
              : 'bg-[#047857] text-white active:opacity-80'
          }`}
        >
          {loading ? 'Envoi...' : 'Envoyer pour vérification'}
        </button>
        <button
          onClick={handleSkip}
          className="w-full bg-transparent border-none text-[13px] font-semibold text-[#A39887] py-3 transition-opacity active:opacity-80"
        >
          Faire ça plus tard
        </button>
      </div>
      
    </div>
  );
}