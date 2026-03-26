import { Landmark } from 'lucide-react';

export function Patrimoine() {
  return (
    <div className="flex-1 bg-gray-50 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-white px-6 pt-12 pb-6 shadow-sm z-10">
        <h1 className="text-[#111827] text-2xl font-bold">Patrimoine</h1>
        <p className="text-[#4B5563] text-sm mt-1">Gérez vos investissements et épargnes</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
          <Landmark size={48} className="text-[#047857]" />
        </div>
        <h2 className="text-2xl font-bold text-[#111827] mb-3">Bientôt disponible</h2>
        <p className="text-[#4B5563] max-w-xs mx-auto leading-relaxed">
          L'onglet Patrimoine vous permettra de gérer vos investissements et vos pools d'épargne. Cette fonctionnalité est en cours de développement.
        </p>
      </div>
    </div>
  );
}


