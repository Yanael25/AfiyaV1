import { useNavigate } from 'react-router-dom';

export function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#FAFAF8] relative font-sans">
      {/* Texture background (Gradient points simulés) */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.08]"
        style={{
          backgroundImage: 'radial-gradient(#047857 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* ZONE 1 - Contenu textuel */}
      <div className="flex-1 flex flex-col justify-center px-[28px] relative z-10">
        <div className="w-[10px] h-[10px] bg-[#047857] rounded-full mb-[16px]" />
        
        <h1 className="text-[48px] font-[800] text-[#1A1A1A] tracking-[-0.03em] leading-none">
          Afiya
        </h1>
        
        <p className="text-[15px] font-[500] text-[#6B6B6B] mt-[8px]">
          Votre épargne, à votre façon.
        </p>
        
        <div className="w-[40px] h-[2px] bg-[#047857] my-[24px]" />
        
        <p className="text-[13px] font-[400] text-[#A39887] leading-[1.6]">
          La tontine que vous connaissez, portée par la confiance et la technologie.
        </p>
      </div>

      {/* ZONE 2 - Boutons et actions */}
      <div className="px-[28px] pb-[48px] relative z-10">
        <button
          onClick={() => navigate('/signup')}
          className="w-full bg-[#047857] text-[#FFFFFF] rounded-[16px] p-[16px] text-[15px] font-[700] mb-[10px] transition-opacity active:opacity-80"
        >
          Créer un compte
        </button>
        
        <button
          onClick={() => navigate('/login')}
          className="w-full bg-[#FFFFFF] text-[#1A1A1A] rounded-[16px] p-[16px] text-[15px] font-[700] mb-[16px] transition-opacity active:opacity-80"
        >
          Se connecter
        </button>
        
        <p className="text-center text-[12px] text-[#A39887]">
          Rejoindre un cercle existant ?{' '}
          <button 
            onClick={() => navigate('/group/join')}
            className="text-[#047857] font-[700] transition-opacity active:opacity-80"
          >
            Par invitation
          </button>
        </p>
      </div>
    </div>
  );
}