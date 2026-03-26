import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, User, MapPin, Shield } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { getUserProfile, updateProfile } from '../../services/userService';

export function Kyc() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });

  useEffect(() => {
    const loadProfile = async () => {
      const user = auth.currentUser;
      if (user) {
        const profile = await getUserProfile(user.uid);
        if (profile && profile.full_name) {
          const parts = profile.full_name.split(' ');
          setFormData({
            firstName: parts[0] || '',
            lastName: parts.slice(1).join(' ') || '',
            email: profile.email || user.email || '',
          });
        } else if (user.displayName) {
          const parts = user.displayName.split(' ');
          setFormData({
            firstName: parts[0] || '',
            lastName: parts.slice(1).join(' ') || '',
            email: user.email || '',
          });
        }
      }
    };
    loadProfile();
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Non connecté");

      await updateProfile(user.uid, {
        full_name: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        kyc_status: 'APPROVED'
      });

      navigate('/wallet');
    } catch (e: any) {
      setError(e.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-gray-50 flex flex-col h-full">
      <div className="bg-white px-6 pt-12 pb-4 shadow-sm z-10">
        <h1 className="text-[#111827] text-2xl font-bold">Complétez votre profil</h1>
        <p className="text-[#4B5563] text-sm mt-1">Dernière étape avant de commencer</p>
      </div>

      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Section 1: Identité */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E5E7EB]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <User size={18} />
            </div>
            <h2 className="text-[#111827] font-semibold">Identité</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-[#4B5563] mb-1 block">Prénom</label>
              <input 
                value={formData.firstName}
                onChange={e => setFormData({...formData, firstName: e.target.value})}
                className="w-full border border-[#E5E7EB] rounded-xl h-12 px-4 text-[#111827] focus:border-[#047857] outline-none" 
              />
            </div>
            <div>
              <label className="text-sm text-[#4B5563] mb-1 block">Nom</label>
              <input 
                value={formData.lastName}
                onChange={e => setFormData({...formData, lastName: e.target.value})}
                className="w-full border border-[#E5E7EB] rounded-xl h-12 px-4 text-[#111827] focus:border-[#047857] outline-none" 
              />
            </div>
          </div>
        </div>

        {/* Section 2: Contact */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E5E7EB]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
              <MapPin size={18} />
            </div>
            <h2 className="text-[#111827] font-semibold">Contact</h2>
          </div>
          <div>
            <label className="text-sm text-[#4B5563] mb-1 block">Email (Optionnel)</label>
            <input 
              type="email"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              placeholder="fifame@exemple.com"
              className="w-full border border-[#E5E7EB] rounded-xl h-12 px-4 text-[#111827] focus:border-[#047857] outline-none" 
            />
          </div>
        </div>

        {/* Section 3: Sécurité */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E5E7EB]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
              <Shield size={18} />
            </div>
            <h2 className="text-[#111827] font-semibold">Sécurité</h2>
          </div>
          <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-xl">
            <CheckCircle2 size={20} className="text-[#047857] mt-0.5 shrink-0" />
            <p className="text-xs text-[#4B5563] leading-relaxed">
              Vos données sont chiffrées et stockées en toute sécurité. Elles ne seront jamais partagées sans votre consentement.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 bg-white border-t border-[#E5E7EB]">
        <button
          onClick={handleSubmit}
          disabled={loading || !formData.firstName || !formData.lastName}
          className="w-full bg-[#047857] text-white h-14 rounded-xl font-semibold text-lg disabled:opacity-50 transition-colors"
        >
          {loading ? 'Création...' : 'Terminer'}
        </button>
      </div>
    </div>
  );
}
