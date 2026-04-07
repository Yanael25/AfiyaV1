import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const db = getFirestore();
const storage = getStorage();

const DOC_TYPES = ['CNI', 'Passeport', 'Permis de conduire'];

export function Kyc() {
  const navigate = useNavigate();
  
  // States
  const [docType, setDocType] = useState<string>(DOC_TYPES[0]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gérer la sélection du fichier
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      // Vérification basique de la taille (max 5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError("Le fichier est trop volumineux (Max 5MB).");
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  // Soumission
  const handleSubmit = async () => {
    if (!file) return;
    
    const user = auth.currentUser;
    if (!user) {
      setError("Vous devez être connecté.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Upload vers Firebase Storage
      const fileExtension = file.name.split('.').pop();
      const storageRef = ref(storage, `kyc/${user.uid}/identity_document.${fileExtension}`);
      
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);

      // 2. Mise à jour du profil Firestore
      await updateDoc(doc(db, 'profiles', user.uid), {
        kyc_status: 'PENDING',
        kyc_document_url: downloadUrl,
        kyc_document_type: docType
      });

      // 3. Redirection
      navigate('/home');

    } catch (err: any) {
      setError("Une erreur est survenue lors de l'envoi de votre document.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F4F0] pt-[52px] flex flex-col font-sans px-6">
      
      {/* HEADER */}
      <header>
        <button 
          onClick={() => navigate(-1)}
          className="w-[36px] h-[36px] bg-white rounded-[11px] border-[0.5px] border-[#EDECEA] flex items-center justify-center transition-transform active:scale-95"
        >
          <ArrowLeft size={14} className="text-[#6B6B6B]" strokeWidth={2} />
        </button>
        
        <h1 className="text-[26px] font-[800] text-[#1A1A1A] mt-[20px] leading-tight">
          Vérifier mon identité
        </h1>
        <p className="text-[14px] font-[500] text-[#A39887] mt-[6px]">
          Nécessaire pour effectuer des transactions
        </p>
      </header>

      {/* BLOC INFO */}
      <div className="bg-[#F0FDF4] border-[0.5px] border-[#D1FAE5] rounded-[16px] p-[16px] mt-[24px] flex items-start gap-3">
        <Shield size={18} className="text-[#047857] shrink-0 mt-0.5" strokeWidth={2} />
        <p className="text-[13px] font-[500] text-[#065F46] leading-snug">
          Votre identité sera vérifiée dans les 24-48h. En attendant, vous pouvez explorer l'app librement.
        </p>
      </div>

      {/* ERREUR */}
      {error && (
        <div className="bg-[#F5F4F0] border-l-[2px] border-[#92400E] rounded-r-[10px] py-[10px] px-[12px] flex items-center gap-2 mt-[16px]">
          <AlertCircle size={14} className="text-[#92400E] shrink-0" strokeWidth={2.5} />
          <span className="text-[12px] font-[600] text-[#92400E]">{error}</span>
        </div>
      )}

      {/* ÉTAPE UNIQUE — Upload */}
      <div className="bg-white rounded-[20px] border-[0.5px] border-[#EDECEA] p-[20px] mt-[16px]">
        <label className="block text-[9px] font-[700] uppercase text-[#A39887] tracking-[0.1em] mb-[12px]">
          PIÈCE D'IDENTITÉ
        </label>

        {/* Input caché */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange}
          accept=".jpg,.jpeg,.png,.pdf"
          className="hidden"
        />

        {/* Zone cliquable */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-[1.5px] border-dashed border-[#EDECEA] rounded-[14px] p-[32px] flex flex-col items-center justify-center bg-[#F5F4F0] cursor-pointer active:opacity-70 transition-opacity"
        >
          {file ? (
            <>
              <CheckCircle2 size={28} className="text-[#047857] mb-[12px]" strokeWidth={2} />
              <p className="text-[13px] font-[600] text-[#1A1A1A] text-center px-4 truncate w-full">
                {file.name}
              </p>
              <p className="text-[11px] font-[500] text-[#047857] mt-[4px]">
                Fichier sélectionné
              </p>
            </>
          ) : (
            <>
              <Upload size={24} className="text-[#A39887] mb-[12px]" strokeWidth={2} />
              <p className="text-[13px] font-[600] text-[#6B6B6B] text-center">
                Appuyez pour ajouter votre pièce d'identité
              </p>
              <p className="text-[11px] font-[500] text-[#A39887] mt-[4px]">
                JPG, PNG ou PDF · Max 5MB
              </p>
            </>
          )}
        </div>

        {/* Pills de types de documents */}
        <div className="flex gap-2 mt-[16px] overflow-x-auto hide-scrollbar" style={{ scrollbarWidth: 'none' }}>
          {DOC_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setDocType(type)}
              className={`h-[32px] px-4 rounded-[8px] text-[12px] font-[600] whitespace-nowrap transition-colors flex items-center justify-center border-[0.5px] ${
                docType === type 
                  ? 'bg-[#047857] text-white border-[#047857]' 
                  : 'bg-[#F5F4F0] text-[#A39887] border-[#EDECEA]'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* BOUTON SOUMETTRE */}
      <div className="mt-auto pt-[24px] pb-[24px]">
        <button
          onClick={handleSubmit}
          disabled={!file || loading}
          className="w-full h-[52px] bg-[#047857] text-white rounded-[16px] text-[15px] font-[700] flex items-center justify-center transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100"
        >
          {loading ? 'Envoi en cours...' : 'Soumettre ma pièce'}
        </button>
      </div>

    </div>
  );
}