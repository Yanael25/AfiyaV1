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
        email: formData.email || user.email || '',
        kyc_status: 'APPROVED',
      });

      navigate('/home');
    } catch (e: any) {
      setError(e.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-[#F5F0E8] flex flex-col h-full">
      <div className="bg-white px-6 pt-12 pb-4 z-10 border-b border-[#E8E0D0]">
        <h1 className="text-2xl font-bold text-[#1C1410]">Complétez votre profil</h1>
        <p className="text-sm text-[#7C6F5E] mt-1">Dernière étape avant de commencer</p>
      </div>

      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Section 1: Identité */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E8E0D0]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-[#ECFDF5] flex items-center justify-center text-[#047857]">
              <User size={18} />
            </div>
            <h2 className="text-sm font-semibold text-[#1C1410]">Identité</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#7C6F5E] mb-1 block">Prénom</label>
              <input 
                value={formData.firstName}
                onChange={e => setFormData({...formData, firstName: e.target.value})}
                className="w-full bg-white border border-[#E8E0D0] rounded-xl h-12 px-4 text-[#1C1410] focus:border-[#047857] outline-none" 
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#7C6F5E] mb-1 block">Nom</label>
              <input 
                value={formData.lastName}
                onChange={e => setFormData({...formData, lastName: e.target.value})}
                className="w-full bg-white border border-[#E8E0D0] rounded-xl h-12 px-4 text-[#1C1410] focus:border-[#047857] outline-none" 
              />
            </div>
          </div>
        </div>

        {/* Section 2: Contact */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E8E0D0]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-[#ECFDF5] flex items-center justify-center text-[#047857]">
              <MapPin size={18} />
            </div>
            <h2 className="text-sm font-semibold text-[#1C1410]">Contact</h2>
          </div>
          <div>
            <label className="text-sm font-medium text-[#7C6F5E] mb-1 block">Email (Optionnel)</label>
            <input 
              type="email"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              placeholder="fifame@exemple.com"
              className="w-full bg-white border border-[#E8E0D0] rounded-xl h-12 px-4 text-[#1C1410] focus:border-[#047857] outline-none" 
            />
          </div>
        </div>

        {/* Section 3: Sécurité */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E8E0D0]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-[#ECFDF5] flex items-center justify-center text-[#047857]">
              <Shield size={18} />
            </div>
            <h2 className="text-sm font-semibold text-[#1C1410]">Sécurité</h2>
          </div>
          <div className="flex items-start gap-3 bg-[#F5F0E8] p-3 rounded-xl">
            <CheckCircle2 size={20} className="text-[#047857] mt-0.5 shrink-0" />
            <p className="text-xs font-normal text-[#7C6F5E] leading-relaxed">
              Vos données sont chiffrées et stockées en toute sécurité. Elles ne seront jamais partagées sans votre consentement.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 bg-white border-t border-[#E8E0D0]">
        <button
          onClick={handleSubmit}
          disabled={loading || !formData.firstName || !formData.lastName}
          className="w-full bg-[#047857] text-white h-14 rounded-2xl font-semibold hover:bg-[#059669] disabled:opacity-50 transition-colors"
        >
          {loading ? 'Création...' : 'Terminer'}
        </button>
      </div>
    </div>
  );
}
