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
    <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-amber-500 via-amber-600 to-amber-800 p-6 text-white shadow-2xl shadow-amber-600/20 md:p-10">
      <div className="flex flex-wrap items-center gap-6">
        <div className="mr-auto space-y-2">
          {left > 0 && <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">Svečano otvaranje · {OPENING_LABEL}</p>}
          {party && <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">Otvaranje je u toku!</p>}
          <h2 className="text-3xl font-extrabold md:text-4xl">
            {party ? "Kafić je otvoren, svi su za stolovima ☕" : left > 0 ? "Kafić otvara vrata" : "Kafić je otvoren ☕"}
          </h2>
          {founders && (
            <p className="text-white/90">
              ⭐ <b>Doživotni VIP besplatno</b> za sve koji naprave profil do {FOUNDER_LABEL}
            </p>
          )}
        </div>
        {left > 0 ? (
          <div className="flex gap-2">
            {parts(left).map(([n, label]) => (
              <div key={label} className="w-16 rounded-2xl bg-white/15 py-2.5 backdrop-blur md:w-20 text-center">
                <div className="text-2xl font-extrabold tabular-nums md:text-3xl">{String(n).padStart(2, "0")}</div>
                <div className="text-xs text-white/75">{label}</div>
              </div>
            ))}
          </div>
        ) : (
          <Link href="/kafic" className="rounded-full bg-white px-6 py-3 font-semibold text-stone-950 transition hover:bg-stone-100">Uđi u Kafić</Link>
        )}
      </div>
      {left > 0 && (
        <Link href="/prijava" className="mt-5 inline-block rounded-full bg-white px-6 py-3 font-semibold text-stone-950 transition hover:bg-stone-100">
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
    <div className="rounded-2xl bg-amber-600 p-4 text-center text-white">
      ⭐ Do {FOUNDER_LABEL} je VIP <b>besplatan i doživotan</b> za sve koji naprave profil. Ako već imaš profil, već si VIP.
    </div>
  );
}
