import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, User } from 'lucide-react';
import { signUpWithEmail } from '../../services/userService';

export function Signup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSignup = async (e: any) => {
    e.preventDefault();
    if (!email || !password) return;
    
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await signUpWithEmail(email, password);
      navigate('/kyc');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError("Cet email est déjà utilisé");
      } else {
        setError("Une erreur est survenue lors de l'inscription");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-white flex flex-col h-full">
      <div className="p-4 flex items-center">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-[#111827]">
          <ArrowLeft size={24} />
        </button>
      </div>
      
      <div className="flex-1 px-6 pt-4">
        <div className="w-16 h-16 bg-[#047857] rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-emerald-100">
          <span className="text-white font-bold text-3xl">A</span>
        </div>
        
        <h1 className="text-[#111827] text-3xl font-bold mb-2">
          Créer un compte
        </h1>
        <p className="text-[#4B5563] text-base mb-8">
          Rejoignez Afiya et commencez à épargner avec votre communauté.
        </p>

        {error && (
          <div className="w-full bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[#4B5563] mb-1.5 block">Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail size={20} className="text-[#9CA3AF]" />
              </div>
              <input 
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="w-full border border-[#E5E7EB] rounded-xl h-12 pl-11 pr-4 text-[#111827] focus:border-[#047857] outline-none font-medium" 
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-[#4B5563] mb-1.5 block">Mot de passe</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock size={20} className="text-[#9CA3AF]" />
              </div>
              <input 
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-[#E5E7EB] rounded-xl h-12 pl-11 pr-12 text-[#111827] focus:border-[#047857] outline-none font-medium" 
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#9CA3AF]"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <p className="text-xs text-[#9CA3AF] mt-1.5">
              Minimum 6 caractères
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full bg-[#047857] text-white h-14 rounded-xl font-semibold text-lg hover:bg-[#059669] transition-colors disabled:opacity-50 mt-4"
          >
            {loading ? 'Création...' : "S'inscrire"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-[#4B5563]">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-[#047857] font-bold">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
