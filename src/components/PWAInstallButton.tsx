import React, { useState } from 'react';
import { Download, WifiOff, Check } from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (isInstallable) {
            install();
          } else {
            setShowModal(true);
          }
        }}
        className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-[#111621] border border-slate-800 rounded-md hover:border-slate-700 transition-colors whitespace-nowrap shrink-0"
        title="Install OsmoLab as a standalone Desktop/Mobile PWA"
        aria-label="Install PWA"
      >
        <Download className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span className="hidden xl:inline">Install </span>
        <span className="hidden sm:inline">PWA</span>
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
        >
          <div className="w-full max-w-md rounded-lg bg-[#111621] border border-slate-800 p-6 text-slate-100">
            <h3 id="pwa-install-title" className="text-base font-semibold text-white">
              Install OsmoLab Standalone Workspace
            </h3>
            <p className="mt-2 text-xs text-slate-300 leading-relaxed">
              {isIOS
                ? 'On iPhone or iPad Safari: Tap the Share button in the browser bar, then select "Add to Home Screen" for full offline access to your formulas and raw material organ.'
                : 'OsmoLab is configured with a Web App Manifest and Workbox offline cache. Use your browser address bar "Install OsmoLab" icon (or Chrome Menu → Save and Share → Install page as app) to launch as a standalone laboratory window.'}
            </p>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Check className="w-3.5 h-3.5" /> Offline Cache Active
              </span>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-md font-medium transition-colors whitespace-nowrap shrink-0"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC<{ pendingMutationsCount?: number }> = ({
  pendingMutationsCount = 0,
}) => {
  const isOnline = useOnlineStatus();

  if (isOnline && pendingMutationsCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-md bg-amber-950/95 border border-amber-700/60 px-3 py-2 text-xs font-medium text-amber-200">
      <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <span>
        {!isOnline
          ? `Offline Mode — Local laboratory cache active${
              pendingMutationsCount > 0
                ? ` (${pendingMutationsCount} queued edits)`
                : ''
            }`
          : `Synchronizing ${pendingMutationsCount} queued edits...`}
      </span>
    </div>
  );
};
