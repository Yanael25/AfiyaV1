import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { signInWithEmail, getUserProfile } from '../../services/userService';
import { auth } from '../../lib/firebase';

export function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: any) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    setError(null);
    try {
      const user = await signInWithEmail(email, password);
      const profile = await getUserProfile(user.uid);
      if (profile && !profile.full_name) {
        navigate('/kyc');
      } else {
        navigate('/home');
      }
    } catch (err: any) {
      setError("Email ou mot de passe incorrect");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-[#F5F0E8] flex flex-col h-full overflow-y-auto">
      <div className="p-4 flex items-center">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-[#1C1410]">
          <ArrowLeft size={24} />
        </button>
      </div>
      
      <div className="flex-1 px-6 pt-4 pb-12">
        <div className="w-16 h-16 bg-[#047857] rounded-2xl flex items-center justify-center mb-8 shadow-sm">
          <span className="text-white font-bold text-3xl">A</span>
        </div>
        
        <h1 className="text-2xl font-bold text-[#1C1410] mb-2">
          Connexion
        </h1>
        <p className="text-sm text-[#7C6F5E] mb-8">
          Heureux de vous revoir ! Connectez-vous pour accéder à vos Cercles.
        </p>

        {error && (
          <div className="w-full bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[#7C6F5E] mb-1.5 block">Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail size={20} className="text-[#A39887]" />
              </div>
              <input 
                type="text"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="votre@email.com ou numéro (ex: 0100000000)"
                className="w-full bg-white border border-[#E8E0D0] rounded-xl h-12 pl-11 pr-4 text-[#1C1410] focus:border-[#047857] outline-none font-medium" 
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-[#7C6F5E] mb-1.5 block">Mot de passe</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock size={20} className="text-[#A39887]" />
              </div>
              <input 
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white border border-[#E8E0D0] rounded-xl h-12 pl-11 pr-12 text-[#1C1410] focus:border-[#047857] outline-none font-medium" 
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#A39887]"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="button" className="text-sm font-medium text-[#047857]">
              Mot de passe oublié ?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full bg-[#047857] text-white h-14 rounded-2xl font-semibold hover:bg-[#059669] transition-colors disabled:opacity-50 mt-4"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-[#7C6F5E]">
            Pas encore de compte ?{' '}
            <Link to="/signup" className="text-[#047857] font-bold">
              S'inscrire
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
