import { useState, useEffect } from 'react';
import { Wifi, Battery, Signal } from 'lucide-react';

export function StatusBar() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-12 w-full flex items-center justify-between px-6 text-[#111827] z-50 bg-transparent absolute top-0 left-0 right-0 pointer-events-none">
      <div className="text-[15px] font-semibold tracking-tight w-14 text-center">
        {time}
      </div>
      <div className="flex items-center gap-2">
        <Signal size={16} strokeWidth={2.5} />
        <Wifi size={16} strokeWidth={2.5} />
        <Battery size={24} strokeWidth={2} className="opacity-90" />
      </div>
    </div>
  );
}
