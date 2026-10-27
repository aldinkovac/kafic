"use client";

import { useEffect } from "react";

type InstallEvent = Event & { prompt: () => Promise<void> };
declare global {
  interface Window { kaficInstall?: InstallEvent }
}

// Registruje service worker i pamti ponudu za instalaciju (Android i Chrome na računaru).
export function AppSetup() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    const onPrompt = (e: Event) => {
      e.preventDefault();
      window.kaficInstall = e as InstallEvent;
      window.dispatchEvent(new Event("kafic:installable"));
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);
  return null;
}
