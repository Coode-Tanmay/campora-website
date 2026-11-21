import { useEffect, useState } from 'react';
import { Download, Monitor, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    deferredCamporaInstallPrompt?: BeforeInstallPromptEvent;
  }
}

export function PWAInstallPrompt() {
  const [isDesktop, setIsDesktop] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)').matches &&
      !/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    setIsDesktop(desktop);
    setIsInstalled(standalone);
    setDismissed(sessionStorage.getItem('campora-install-dismissed') === '1');

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      window.deferredCamporaInstallPrompt = event as BeforeInstallPromptEvent;
      setCanPrompt(true);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setCanPrompt(false);
      window.deferredCamporaInstallPrompt = undefined;
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    const promptEvent = window.deferredCamporaInstallPrompt;
    if (!promptEvent) {
      setShowInstructions(true);
      return;
    }
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === 'accepted') setIsInstalled(true);
    window.deferredCamporaInstallPrompt = undefined;
    setCanPrompt(false);
  };

  const dismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('campora-install-dismissed', '1');
  };

  if (!isDesktop || isInstalled || dismissed) return null;

  return (
    <aside className="fixed bottom-5 left-5 z-[70] w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-[#D4A72C]/40 bg-[#111111]/95 p-4 text-white shadow-2xl backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#D4A72C]/30 bg-[#D4A72C]/10 text-[#E6BD50]">
          <Monitor className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Get CAMPORA on your PC</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">Install the desktop app for quick access from your computer.</p>
        </div>
        <button onClick={dismiss} aria-label="Dismiss install prompt" className="rounded-lg p-1 text-zinc-500 transition hover:bg-white/10 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
      {showInstructions && (
        <p className="mt-3 rounded-lg bg-white/5 p-3 text-xs leading-relaxed text-zinc-300">
          In Chrome or Edge, open the browser menu and choose <strong>Install CAMPORA</strong> or <strong>Apps → Install this site as an app</strong>.
        </p>
      )}
      <button onClick={install} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#D4A72C] px-4 py-2.5 text-xs font-extrabold text-black transition hover:bg-[#E8C45A]">
        <Download className="h-4 w-4" />
        Install CAMPORA
      </button>
    </aside>
  );
}