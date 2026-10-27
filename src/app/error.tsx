"use client";

import { useEffect } from "react";

// Umjesto bijelog ekrana s greškom korisnik vidi poruku i dugme za ponovno učitavanje.
export default function Error({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error(error);
    // Nakon nove verzije sajta stari dijelovi stranice više ne postoje. Jedno osvježavanje to riješi.
    if (/ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module/i.test(error.message)) {
      window.location.reload();
    }
  }, [error]);

  return (
    <div className="space-y-4 py-12 text-center">
      <h1 className="text-2xl font-semibold">Ups, nešto je zapelo.</h1>
      <p className="text-stone-600 dark:text-stone-400">Probaj ponovo učitati stranicu.</p>
      <button className="btn" onClick={() => window.location.reload()}>Učitaj ponovo</button>
      {/* Tehnički opis greške, da se lakše popravi kad korisnik pošalje screenshot. */}
      <p className="mx-auto max-w-xl break-words font-mono text-xs text-stone-400">{error.message}{error.digest ? ` (${error.digest})` : ""}</p>
    </div>
  );
}
