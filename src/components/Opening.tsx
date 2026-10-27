"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FOUNDER_LABEL, OPENING_AT, OPENING_LABEL, founderOfferOpen } from "@/lib/event";

const PARTY_HOURS = 3;

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [
    [Math.floor(s / 86400), "dana"],
    [Math.floor((s % 86400) / 3600), "sati"],
    [Math.floor((s % 3600) / 60), "min"],
    [s % 60, "sek"],
  ] as const;
}

// Odbrojavanje do otvaranja i ponuda doživotnog VIP-a za osnivače.
export function Opening() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (now === null) return null;

  const left = new Date(OPENING_AT).getTime() - now;
  const party = left <= 0 && left > -PARTY_HOURS * 3600_000;
  const founders = founderOfferOpen();
  if (left <= -PARTY_HOURS * 3600_000 && !founders) return null;

  return (
    <section className="rounded-3xl bg-gradient-to-br from-amber-700 to-amber-900 p-6 text-amber-50 shadow-xl shadow-amber-900/20 md:p-8">
      <div className="flex flex-wrap items-center gap-6">
        <div className="mr-auto space-y-2">
          {left > 0 && <p className="text-sm uppercase tracking-widest text-amber-200">Svečano otvaranje · {OPENING_LABEL}</p>}
          {party && <p className="text-sm uppercase tracking-widest text-amber-200">Otvaranje je u toku!</p>}
          <h2 className="text-2xl font-bold md:text-3xl">
            {party ? "Kafić je otvoren, svi su za stolovima ☕" : left > 0 ? "Kafić otvara vrata" : "Kafić je otvoren ☕"}
          </h2>
          {founders && (
            <p className="text-amber-100">
              ⭐ <b>Doživotni VIP besplatno</b> za sve koji naprave profil do {FOUNDER_LABEL}
            </p>
          )}
        </div>
        {left > 0 ? (
          <div className="flex gap-2">
            {parts(left).map(([n, label]) => (
              <div key={label} className="w-16 rounded-xl bg-black/20 py-2 text-center">
                <div className="text-2xl font-bold tabular-nums">{String(n).padStart(2, "0")}</div>
                <div className="text-xs text-amber-200">{label}</div>
              </div>
            ))}
          </div>
        ) : (
          <Link href="/kafic" className="rounded-xl bg-amber-50 px-5 py-3 font-semibold text-amber-900 hover:bg-white">Uđi u Kafić</Link>
        )}
      </div>
      {left > 0 && (
        <Link href="/prijava" className="mt-5 inline-block rounded-xl bg-amber-50 px-5 py-3 font-semibold text-amber-900 hover:bg-white">
          Rezerviši mjesto i uzmi VIP
        </Link>
      )}
    </section>
  );
}

// Kratka napomena za stranicu VIP dok traje ponuda za osnivače.
export function FounderNote() {
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(founderOfferOpen()); }, []);
  if (!open) return null;
  return (
    <div className="rounded-2xl bg-amber-700 p-4 text-center text-amber-50">
      ⭐ Do {FOUNDER_LABEL} je VIP <b>besplatan i doživotan</b> za sve koji naprave profil. Ako već imaš profil, već si VIP.
    </div>
  );
}
