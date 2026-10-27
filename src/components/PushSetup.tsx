"use client";

import { useEffect, useState } from "react";
import { isInstalled, pushState, startPush, stopPush, type PushState } from "@/lib/push";

// Kartica za uključivanje obavještenja i instalaciju aplikacije.
export function PushSetup({ userId }: { userId: string }) {
  const [state, setState] = useState<PushState>("loading");
  const [installable, setInstallable] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    pushState().then(setState).catch(() => setState("unsupported"));
    const check = () => setInstallable(!!window.kaficInstall && !isInstalled());
    check();
    window.addEventListener("kafic:installable", check);
    return () => window.removeEventListener("kafic:installable", check);
  }, []);

  async function enable() {
    setError("");
    try {
      setState(await startPush(userId));
    } catch {
      setError("Nije uspjelo. Pokušaj ponovo ili osvježi stranicu.");
    }
  }

  async function disable() {
    await stopPush();
    setState("off");
  }

  async function install() {
    await window.kaficInstall?.prompt();
    window.kaficInstall = undefined;
    setInstallable(false);
  }

  if (state === "loading" || (state === "unsupported" && !installable) || (state === "on" && !installable)) {
    return state === "on" ? (
      <p className="text-sm text-stone-500">
        🔔 Obavještenja su uključena na ovom uređaju. <button className="underline" onClick={disable}>Isključi</button>
      </p>
    ) : null;
  }

  return (
    <div className="space-y-2 rounded-xl bg-amber-50 p-4 text-sm dark:bg-stone-800">
      {state === "off" && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="mr-auto">🔔 Neka ti telefon javi kad stigne nova poruka, i kad je sajt zatvoren. Ime i tekst poruke se ne prikazuju.</span>
          <button className="btn" onClick={enable}>Uključi obavještenja</button>
        </div>
      )}
      {state === "ios-install" && (
        <p>
          📲 Na iPhoneu obavještenja rade kad dodaš Kafić na početni ekran: dodirni <b>Dijeli</b> (kvadrat sa strelicom) pa
          <b> Dodaj na početni ekran</b>. Zatim otvori Kafić s početnog ekrana i ovdje uključi obavještenja.
        </p>
      )}
      {state === "denied" && (
        <p>🔕 Obavještenja su blokirana za ovaj sajt. Uključi ih u postavkama preglednika (ikona lokota pored adrese &gt; Obavještenja).</p>
      )}
      {installable && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="mr-auto">📲 Instaliraj Kafić kao aplikaciju na telefon, bez Play Storea.</span>
          <button className="btn-light" onClick={install}>Instaliraj</button>
        </div>
      )}
      {error && <p className="text-red-600">{error}</p>}
    </div>
  );
}
