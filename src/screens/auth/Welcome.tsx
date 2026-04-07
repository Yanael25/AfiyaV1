import { useNavigate } from 'react-router-dom';

export function Welcome() {
  const navigate = useNavigate();

  return (
    // Conteneur principal avec image de fond
    <div 
      className="min-h-screen w-full relative flex flex-col justify-between font-sans"
      style={{
        backgroundImage: 'url("/welcome-bg.jpg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay uniforme (pas de dégradé) */}
      <div className="absolute inset-0 bg-[rgba(0,0,0,0.40)] z-0" />

      {/* ZONE HAUTE - Contenu textuel */}
      <div className="relative z-10 flex flex-col items-center pt-[80px]">
        {/* Logo */}
        <div className="w-[56px] h-[56px] bg-white rounded-[14px] flex items-center justify-center">
          <span className="text-[#047857] text-[24px] font-[800] leading-none">
            A
          </span>
        </div>
        
        {/* Nom de l'app */}
        <h1 className="text-white text-[32px] font-[800] tracking-[-0.02em] mt-[12px] leading-none">
          Afiya
        </h1>
        
        {/* Tagline */}
        <p className="text-white text-[16px] font-[500] text-center mt-[8px] opacity-90">
          Votre épargne, à votre façon.
        </p>
      </div>

      {/* ZONE BASSE - Boutons */}
      <div className="relative z-10 px-[24px] pb-[48px] w-full">
        <button
          onClick={() => navigate('/signup')}
          className="w-full h-[52px] bg-[#047857] rounded-[16px] text-white text-[15px] font-[700] flex items-center justify-center transition-transform active:scale-95"
        >
          Créer un compte
        </button>
        
        <button
          onClick={() => navigate('/login')}
          className="w-full h-[52px] bg-[rgba(255,255,255,0.15)] border border-[rgba(255,255,255,0.3)] rounded-[16px] text-white text-[15px] font-[700] flex items-center justify-center mt-[12px] transition-transform active:scale-95"
        >
          Se connecter
        </button>
      </div>
      
    </div>
  );
}