import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export function Receive() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const uid = auth.currentUser?.uid ?? '';
  const payLink = `https://afiya.app/pay/${uid}`;

  useEffect(() => {
    if (!uid) return;

    const fetchProfile = async () => {
      try {
        const snap = await getDoc(doc(db, 'profiles', uid));
        if (snap.exists()) {
          setFullName(snap.data().full_name ?? '');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [uid]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(payLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Recevoir</h1>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 text-center mt-12">Chargement...</p>
      ) : (
        <div className="flex flex-col gap-4">

          {/* Nom */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Nom</p>
            <p className="text-base font-semibold text-gray-900">{fullName || '—'}</p>
          </div>

          {/* UID / futur QR code */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-2">Identifiant (QR code en V2)</p>
            <p className="text-xs font-mono text-gray-700 break-all">{uid}</p>
          </div>

          {/* Lien de paiement */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-2">Lien de paiement</p>
            <p className="text-xs font-mono text-gray-700 break-all">{payLink}</p>
          </div>

          {/* Bouton copier */}
          <button
            onClick={handleCopy}
            className="w-full py-4 bg-gray-900 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-opacity active:opacity-70"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Lien copié !' : 'Copier le lien'}
          </button>

          {/* Note */}
          <p className="text-xs text-gray-400 text-center">
            Partagez ce lien pour recevoir un paiement
          </p>

        </div>
      )}

    </div>
  );
}
