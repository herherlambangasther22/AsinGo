import React, { useEffect, useState } from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';

interface LoadingScreenProps {
  isLoading: boolean;
  logoUrl?: string;
  loadingLogoUrl?: string;
  storeName?: string;
  tagline?: string;
  onFinished?: () => void;
  statusText?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  isLoading,
  logoUrl,
  loadingLogoUrl,
  storeName = 'AsinGo',
  tagline = 'Pusat Aneka Ikan Asin Pilihan Segar & Higienis',
  onFinished,
  statusText,
}) => {
  const [progress, setProgress] = useState(15);
  const [isExiting, setIsExiting] = useState(false);
  const [isCompletelyHidden, setIsCompletelyHidden] = useState(false);
  const [stageMessage, setStageMessage] = useState('Menghubungkan ke Server Real-Time...');

  const activeLogo = loadingLogoUrl || logoUrl || '/logo.png';

  useEffect(() => {
    if (!isLoading) {
      setProgress(100);
      setStageMessage('Sistem Siap Digunakan');
      setIsExiting(true);
      const exitTimer = setTimeout(() => {
        setIsCompletelyHidden(true);
        if (onFinished) onFinished();
      }, 500);
      return () => clearTimeout(exitTimer);
    }

    // Reset visibility if loading is re-triggered (e.g. admin live preview)
    setIsCompletelyHidden(false);
    setIsExiting(false);

    // Realistic progressive loading bar progression
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 40) {
          setStageMessage('Memuat Katalog 10 Jenis Ikan Asin...');
          return prev + 12;
        }
        if (prev < 75) {
          setStageMessage('Menyelaraskan Stok & Harga Kasir...');
          return prev + 8;
        }
        if (prev < 92) {
          setStageMessage('Memverifikasi Keamanan & Integritas Data...');
          return prev + 4;
        }
        return prev;
      });
    }, 180);

    return () => clearInterval(interval);
  }, [isLoading, onFinished]);

  if (isCompletelyHidden) {
    return null;
  }

  return (
    <div
      id="app-loading-screen"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-white text-[#1B2E25] select-none p-6 transition-all duration-500 ease-in-out ${
        isExiting ? 'opacity-0 scale-98 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Subtle decorative background texture circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#EBF3EE] blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-[#EBF3EE] blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-sm w-full text-center">
        {/* Logo Frame: Pure White Background with Green Border & Subtle Glow */}
        <div className="relative mb-6">
          {/* Outer subtle glow ring */}
          <div className="absolute -inset-1.5 rounded-3xl bg-gradient-to-tr from-[#2D4B3E]/20 via-[#34D399]/20 to-[#2D4B3E]/30 blur-xs animate-pulse" />

          {/* Main Logo Container with signature green border */}
          <div
            id="loading-screen-logo-container"
            className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-white border-[3px] border-[#2D4B3E] shadow-xl shadow-[#1B2E25]/10 flex items-center justify-center p-3.5 overflow-hidden group"
          >
            <img
              src={activeLogo}
              alt={storeName}
              className="w-full h-full object-contain filter drop-shadow-xs"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.endsWith('/logo.png')) {
                  target.src = '/logo.png';
                }
              }}
            />
          </div>
        </div>

        {/* Store Name & Tagline */}
        <div className="mb-8 space-y-1.5 animate-in fade-in duration-300">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1B2E25]">
            {storeName}
          </h1>
          <p className="text-xs sm:text-sm font-medium text-[#2D4B3E]/80 max-w-xs mx-auto leading-relaxed">
            {tagline}
          </p>
        </div>

        {/* Green Loading Progress Bar */}
        <div className="w-full max-w-[260px] space-y-3">
          {/* Outer track: Clean light green/gray container */}
          <div className="relative w-full h-2.5 bg-[#E8F0EC] rounded-full overflow-hidden border border-[#2D4B3E]/20 p-0.5">
            {/* Inner progress fill: Signature green with smooth transition */}
            <div
              id="loading-screen-progress-bar"
              className="h-full rounded-full bg-gradient-to-r from-[#1B2E25] via-[#2D4B3E] to-[#34D399] transition-all duration-200 ease-out shadow-xs"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Status text & percentage */}
          <div className="flex items-center justify-between text-[11px] font-semibold text-[#2D4B3E]/90 px-0.5">
            <span className="flex items-center gap-1.5 truncate max-w-[200px]">
              {progress === 100 ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
              )}
              <span className="truncate">{statusText || stageMessage}</span>
            </span>
            <span className="font-mono font-bold text-[#1B2E25] shrink-0">
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        {/* Bottom Security / Trust Badge */}
        <div className="mt-12 flex items-center gap-1.5 text-[11px] text-[#2D4B3E]/60 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <span>Sistem Kasir &amp; Manajemen Stok Terenkripsi</span>
        </div>
      </div>
    </div>
  );
};
